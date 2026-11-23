import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSurface } from "../../engine/materials";
import { makeFlagstone } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";
import { Atmosphere, Backdrop, Shaft, ThreePoint } from "./common";
import { Embers, FireJet } from "./Fire";
import { useGltf } from "./gltf";

/**
 * Realistic places for the dragon short. No toy vinyl here: plain PBR
 * materials, displaced rock, fog and fire light, so the scanned/painted models
 * (dragon, cow, Komodo) sit in a world that matches them.
 *
 * - DragonLair: a cave with a gold hoard, a heap of rotting plants and two
 *   braziers; the dragon stands at the origin facing +X.
 * - Pasture: a grassy field at evening for the cow (at the origin, facing +X).
 * - Islet: hot sand and rocks for the Komodo dragon.
 * - StoveTop, RocketNozzle: one-shot comparisons (clean blue gas flames).
 * - StaticModel: any static .glb, centred on the floor and sized by length.
 */

// ---------------------------------------------------------------------------
// Rocks
// ---------------------------------------------------------------------------
const boulderGeo = (seed: number) => {
  // Polyhedra are not indexed: merge so the normals come out smooth.
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 6).deleteAttribute("normal").deleteAttribute("uv"));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k =
      1 +
      0.22 * Math.sin(n.x * 3.1 + seed) * Math.sin(n.z * 2.7 + seed * 1.3) +
      0.1 * Math.sin(n.y * 7.3 + seed * 2.1) * Math.cos(n.x * 6.1 + seed) +
      0.04 * Math.sin(n.z * 17 + n.y * 13 + seed);
    v.copy(n).multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};
const BOULDERS = [0, 1, 2, 3].map((s) => (typeof document === "undefined" ? null : boulderGeo(s * 2.3 + 0.7)));
const rockMat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0, flatShading: false });

export const Boulder: React.FC<{ position: Vec3; size?: Vec3 | number; color?: string; seed?: number; yaw?: number }> = ({ position, size = 1, color = "#4a4440", seed = 0, yaw = 0 }) => {
  const mat = useMemo(() => rockMat(color), [color]);
  const g = BOULDERS[seed % 4];
  if (!g) return null;
  const s: Vec3 = typeof size === "number" ? [size, size * 0.7, size] : size;
  return <mesh geometry={g} material={mat} position={position} scale={s} rotation={[0, yaw + seed, 0]} castShadow receiveShadow />;
};

/** A ring of rock wall pieces behind and around the set. */
const CaveWall: React.FC<{ color: string }> = ({ color }) => {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const r = (k: string) => random(`cave-${k}-${i}`);
    const a = Math.PI * (0.05 + 0.9 * (i / 25)) + (r("j") - 0.5) * 0.08;
    const R = 9 + 2.5 * r("R");
    const h = 3 + 4 * r("h");
    return { p: [Math.cos(a) * R * 1.4, h * 0.4, -Math.sin(a) * R * 0.8 - 1.5] as Vec3, s: [2.4 + 2 * r("w"), h, 2 + 1.5 * r("d")] as Vec3, seed: i };
  });
  return (
    <>
      {pieces.map((q) => (
        <Boulder key={q.seed} position={q.p} size={q.s} color={color} seed={q.seed} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Hoard and the heap of rotting plants
// ---------------------------------------------------------------------------
const Hoard: React.FC<{ position: Vec3 }> = ({ position }) => {
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e0a83a", metalness: 1, roughness: 0.32 }), []);
  const coinGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.09, 0.022, 20), []);
  const coins = useMemo(() => {
    const m = new THREE.InstancedMesh(coinGeo, gold, 420);
    const o = new THREE.Object3D();
    for (let i = 0; i < 420; i++) {
      const r = (k: string) => random(`hoard-${k}-${i}`);
      const a = r("a") * Math.PI * 2;
      const d = Math.sqrt(r("d")) * 2.4;
      const mound = Math.max(0, 1.1 * (1 - (d / 2.0) ** 2));
      o.position.set(Math.cos(a) * d, mound + 0.012 + r("y") * 0.05, Math.sin(a) * d * 0.75);
      o.rotation.set((r("rx") - 0.5) * 1.4, r("ry") * 6, (r("rz") - 0.5) * 1.4);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [coinGeo, gold]);
  return (
    <group position={position}>
      <mesh material={gold} position={[0, -0.25, 0]} scale={[2.0, 1.3, 1.5]} receiveShadow>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <primitive object={coins} />
      <mesh position={[0.6, 0.95, 0.2]} rotation={[0.2, 0.5, 0.3]} castShadow material={gold}>
        <cylinderGeometry args={[0.18, 0.12, 0.3, 16]} />
      </mesh>
    </group>
  );
};

/** A heap of rotting plants: leaves, stalks and mush, browning. */
export const RotHeap: React.FC<{ position: Vec3; eaten?: number; scale?: number }> = ({ position, eaten = 0, scale = 1 }) => {
  const leafGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 10, 6);
    g.scale(1, 0.12, 0.45);
    return g;
  }, []);
  const stalkGeo = useMemo(() => new THREE.CylinderGeometry(0.025, 0.035, 1, 6), []);
  // Wet, rotting: dark and a little glossy.
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 }), []);
  const stalkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3e3418", roughness: 0.6 }), []);
  const n = 620;
  const leaves = useMemo(() => {
    const m = new THREE.InstancedMesh(leafGeo, mat, n);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const palette = ["#3b3a18", "#4a4219", "#5b4a20", "#2f2a14", "#57502a", "#3d4418", "#4b3418", "#6b5a2c"];
    for (let i = 0; i < n; i++) {
      const r = (k: string) => random(`rot-${k}-${i}`);
      const a = r("a") * Math.PI * 2;
      const d = Math.sqrt(r("d"));
      const h = 0.8 * (1 - d * d) + 0.04;
      o.position.set(Math.cos(a) * d * 1.35, h * Math.sqrt(r("hy")), Math.sin(a) * d);
      o.rotation.set((r("rx") - 0.5) * 1.2, r("ry") * 6, (r("rz") - 0.5) * 1.2);
      const s = 0.09 + 0.12 * r("s");
      o.scale.set(s, s, s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(palette[Math.floor(r("c") * palette.length)]).multiplyScalar(0.45 + 0.35 * r("cv")));
    }
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [leafGeo, mat]);
  const stalks = Array.from({ length: 16 }, (_, i) => {
    const r = (k: string) => random(`stalk-${k}-${i}`);
    const a = r("a") * Math.PI * 2;
    const d = Math.sqrt(r("d")) * 0.9;
    return { p: [Math.cos(a) * d, 0.35, Math.sin(a) * d * 0.8] as Vec3, rot: [(r("x") - 0.5) * 2.2, 0, (r("z") - 0.5) * 2.2] as Vec3, len: 0.6 + 0.6 * r("l") };
  });
  const k = 1 - 0.85 * eaten;
  return (
    <group position={position} scale={[scale * (1 - 0.4 * eaten), scale * k, scale * (1 - 0.4 * eaten)]}>
      <primitive object={leaves} />
      {stalks.map((s, i) => (
        <mesh key={i} geometry={stalkGeo} material={stalkMat} position={s.p} rotation={s.rot} scale={[1, s.len, 1]} castShadow />
      ))}
      <mesh position={[0, -0.05, 0]} scale={[1.3, 0.55, 1.0]} receiveShadow>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2c2612" roughness={0.6} metalness={0} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7, 32]} />
        <meshStandardMaterial color="#211b10" roughness={1} />
      </mesh>
    </group>
  );
};

/** An iron brazier with a small fire. */
const Brazier: React.FC<{ position: Vec3; seed: string; start: number }> = ({ position, seed, start }) => {
  const frame = useCurrentFrame();
  const iron = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2826", metalness: 0.8, roughness: 0.55 }), []);
  const flick = 0.85 + 0.1 * Math.sin(frame * 0.37 + position[0]) + 0.07 * Math.sin(frame * 0.91);
  return (
    <group position={position}>
      <mesh material={iron} position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 1.1, 10]} />
      </mesh>
      <mesh material={iron} position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.22, 0.32, 18, 1, true]} />
      </mesh>
      <FireJet origin={[0, 1.2, 0]} dir={[0, 1, 0]} power={() => 0.55} start={start - 200} length={1.1} width={0.55} count={110} life={16} seed={seed} lift={0.1} light={false} />
      <pointLight position={[0, 1.8, 0]} color="#ff9440" intensity={26 * flick} distance={12} decay={2} castShadow={false} />
    </group>
  );
};

/**
 * The dragon's cave. `glow` (0..1) brightens the fire light for the flame
 * shots; the heap of plants sits in front of the mouth at `heapAt`.
 */
export const DragonLair: React.FC<{ heapAt?: Vec3; eaten?: number; embers?: number; dim?: number }> = ({ heapAt = [3.4, 0, 0.9], eaten = 0, embers = 1, dim = 0 }) => {
  const floor = useSurface("dragon-lair-floor", () => makeFlagstone({ cells: 4, base: "#3d3631", baseAlt: "#473f38", grout: "#1d1916", seed: 71 }), [7, 5]);
  const k = 1 - 0.6 * dim;
  return (
    <>
      <Atmosphere color="#0c0a0b" near={9} far={34} />
      <Backdrop stops={["#07070a", "#120e0d", "#1c1410"]} z={-22} y={6} />
      <ThreePoint
        key_={{ position: [-3, 9, 7], color: "#c4d0f0", intensity: 2.2 * k }}
        rim={{ position: [6, 5, -7], color: "#ff9a4a", intensity: 3.4 * k }}
        fill={{ color: "#6a7490", ground: "#2a1c14", intensity: 0.6 * k }}
        area={9}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 50]} />
        <meshStandardMaterial map={floor.map} normalMap={floor.normalMap} roughnessMap={floor.roughnessMap} color="#c8beb4" roughness={0.95} />
      </mesh>
      <CaveWall color="#3b3430" />
      <Boulder position={[-6.5, 0.4, 1.5]} size={[1.4, 1.1, 1.2]} color="#463e38" seed={1} />
      <Boulder position={[7.5, 0.5, 2.5]} size={[1.8, 1.3, 1.4]} color="#433b35" seed={2} />
      <Boulder position={[5.6, 0.2, -2.6]} size={0.8} color="#4a423b" seed={3} />
      <Hoard position={[-4.6, 0, -3.2]} />
      {eaten < 0.98 ? <RotHeap position={heapAt} eaten={eaten} scale={1.05} /> : null}
      <Brazier position={[-3.2, 0, 2.6]} seed="brz-a" start={0} />
      <Brazier position={[6.2, 0, -1.4]} seed="brz-b" start={0} />
      <Shaft position={[-1.2, 11, -2.5]} length={12} width={3.4} color="#9fb6ff" opacity={0.08} tilt={0.12} />
      <Embers center={[0, 2.5, 0]} box={[14, 5, 8]} count={70} amount={embers} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Pasture (the cow), islet (the Komodo), stove and rocket inserts
// ---------------------------------------------------------------------------
const Grass: React.FC<{ count?: number; area?: [number, number] }> = ({ count = 6000, area = [14, 9] }) => {
  const frame = useCurrentFrame();
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.012, 0.28, 3);
    g.translate(0, 0.14, 0);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }), []);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, mat, count), [geo, mat, count]);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`grass-${k}-${i}`);
    const x = (r("x") - 0.5) * area[0];
    const z = (r("z") - 0.5) * area[1];
    o.position.set(x, 0, z);
    o.rotation.set(0.15 * Math.sin(frame * 0.05 + x * 0.6) + (r("t") - 0.5) * 0.4, r("y") * 6, (r("tz") - 0.5) * 0.4);
    const s = 0.6 + 0.9 * r("s");
    o.scale.set(s, s, s);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.set(r("dry") < 0.2 ? "#8a8a44" : "#4f7a2c").offsetHSL((r("h") - 0.5) * 0.05, 0, (r("l") - 0.5) * 0.12));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  return <primitive object={mesh} />;
};

export const Pasture: React.FC = () => (
  <>
    <Atmosphere color="#c9a885" near={12} far={46} />
    <Backdrop stops={["#5d7fb4", "#c7a98a", "#e7b27a"]} z={-26} y={8} />
    <ThreePoint
      key_={{ position: [-6, 6, 6], color: "#ffd6a6", intensity: 3.0 }}
      rim={{ position: [6, 4, -6], color: "#ffb070", intensity: 2.2 }}
      fill={{ color: "#a9c0e8", ground: "#4a5a2a", intensity: 0.8 }}
      area={8}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 60]} />
      <meshStandardMaterial color="#4e6b2c" roughness={1} />
    </mesh>
    <Grass />
    {[-4, -2, 0, 2, 4, 6].map((x) => (
      <mesh key={x} position={[x, 0.6, -3.5]} castShadow>
        <boxGeometry args={[0.12, 1.2, 0.12]} />
        <meshStandardMaterial color="#6a5236" roughness={0.9} />
      </mesh>
    ))}
    {[0.45, 0.95].map((y) => (
      <mesh key={y} position={[1, y, -3.5]}>
        <boxGeometry args={[11, 0.08, 0.05]} />
        <meshStandardMaterial color="#7a6040" roughness={0.9} />
      </mesh>
    ))}
  </>
);

/** A candle on a post; `gust` (0..1) leans and shrinks the flame. */
export const Candle: React.FC<{ position: Vec3; gust?: number }> = ({ position, gust = 0 }) => {
  const frame = useCurrentFrame();
  const flick = 1 + 0.06 * Math.sin(frame * 0.8) + 0.04 * Math.sin(frame * 2.1);
  const lean = 0.5 * gust * (0.8 + 0.2 * Math.sin(frame * 1.7));
  const h = 0.16 * flick * (1 - 0.45 * gust);
  return (
    <group position={position}>
      <mesh position={[0, -0.45, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.9, 12]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.6} />
      </mesh>
      <group position={[0, 0.22, 0]} rotation={[0, 0, -lean]}>
        <mesh position={[0, h / 2, 0]} scale={[0.035, h / 2, 0.035]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color={new THREE.Color(2.2, 1.3, 0.45)} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.1, 0]} color="#ffb060" intensity={2.5 * flick * (1 - 0.4 * gust)} distance={3} decay={2} />
      </group>
    </group>
  );
};

export const Islet: React.FC = () => (
  <>
    <Atmosphere color="#d8c7a6" near={10} far={40} />
    <Backdrop stops={["#79a9c9", "#d9cfb2", "#e8d6a8"]} z={-24} y={7} />
    <ThreePoint
      key_={{ position: [-5, 9, 5], color: "#fff0d8", intensity: 3.4 }}
      rim={{ position: [5, 4, -6], color: "#ffe2b0", intensity: 1.6 }}
      fill={{ color: "#b8d0ea", ground: "#8a7450", intensity: 0.9 }}
      area={6}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 50]} />
      <meshStandardMaterial color="#b49a72" roughness={1} />
    </mesh>
    <Boulder position={[-2.4, 0.2, -1.6]} size={[1.2, 0.8, 1]} color="#7b7266" seed={1} />
    <Boulder position={[2.6, 0.15, -2.2]} size={[1.6, 0.9, 1.1]} color="#857a6c" seed={2} />
    <Boulder position={[3.4, 0.05, 1.4]} size={0.5} color="#7b7266" seed={3} />
  </>
);

/** A gas stove burner, close up, with its ring of small blue flame cones. */
export const StoveTop: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d1e21", metalness: 0.9, roughness: 0.35 }), []);
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2b2f", metalness: 0.6, roughness: 0.5 }), []);
  const outer = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.45, 1.6), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const inner = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.9, 2.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const tipMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.35, 1.2), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const cone = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 12, 1, true);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const n = 22;
  const on = frame >= start;
  return (
    <>
      <Atmosphere color="#0a0b0e" near={4} far={20} />
      <ThreePoint key_={{ position: [-2, 4, 3], color: "#e8eeff", intensity: 1.4 }} rim={{ position: [3, 2, -3], color: "#7f9cff", intensity: 1.8 }} fill={{ color: "#405070", ground: "#101010", intensity: 0.45 }} area={3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={steel}>
        <planeGeometry args={[20, 20]} />
      </mesh>
      {/* Pan grate bars. */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[0, 0.2, k * 0.42]} material={steel}>
          <boxGeometry args={[1.4, 0.04, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]} material={cap}>
        <cylinderGeometry args={[0.3, 0.33, 0.1, 40]} />
      </mesh>
      <mesh position={[0, 0.11, 0]} material={steel}>
        <cylinderGeometry args={[0.24, 0.27, 0.04, 40]} />
      </mesh>
      {on
        ? Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            const fl = 1 + 0.12 * Math.sin(frame * 1.3 + i * 2.1) + 0.06 * Math.sin(frame * 2.7 + i);
            const out = 0.55;
            return (
              <group key={i} position={[Math.cos(a) * 0.29, 0.1, Math.sin(a) * 0.29]} rotation={[Math.sin(a) * out, 0, -Math.cos(a) * out]}>
                <mesh geometry={cone} material={outer} scale={[0.022, 0.12 * fl, 0.022]} />
                <mesh geometry={cone} material={inner} scale={[0.012, 0.06 * fl, 0.012]} />
                <mesh geometry={cone} material={tipMat} scale={[0.016, 0.16 * fl, 0.016]} />
              </group>
            );
          })
        : null}
      {on ? <pointLight position={[0, 0.3, 0]} color="#5a7cff" intensity={3} distance={3} decay={2} /> : null}
    </>
  );
};

/** A rocket engine bell firing downward, seen from the side. */
export const RocketNozzle: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8a8c92", metalness: 0.95, roughness: 0.3, side: THREE.DoubleSide }), []);
  const bell = useMemo(() => {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const t = i / 15;
      return new THREE.Vector2(0.28 + 0.75 * t * t, 1.6 - 1.6 * t);
    });
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  const shake = 0.01 * Math.sin(frame * 3.1);
  return (
    <>
      <Atmosphere color="#06070b" near={8} far={40} />
      <Backdrop stops={["#03040a", "#0a0d18", "#1a1418"]} z={-20} y={4} />
      <ThreePoint key_={{ position: [-4, 6, 4], color: "#dfe6ff", intensity: 1.4 }} rim={{ position: [4, 3, -4], color: "#ffb070", intensity: 2 }} fill={{ color: "#3a4060", ground: "#100c0a", intensity: 0.4 }} area={4} />
      <group position={[shake, 3.2, 0]}>
        <mesh geometry={bell} material={metal} castShadow />
        <mesh position={[0, 2.2, 0]} material={metal}>
          <cylinderGeometry args={[0.45, 0.35, 1.3, 32]} />
        </mesh>
      </group>
      <FireJet origin={[shake, 3.2, 0]} dir={[0, -1, 0]} power={() => 1} start={start - 100} length={4.2} width={0.95} count={420} life={12} seed="rocket" lift={-0.05} smoke={false} palette="blue" alpha={0.22} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Static models (cow, Komodo)
// ---------------------------------------------------------------------------
/**
 * A static .glb, centred on the floor at `position`, scaled so its longest
 * horizontal side is `length`. `yaw` turns it after the fit; `bob` is a small
 * breathing/chewing motion (a static scan has no rig).
 */
export const StaticModel: React.FC<{ path: string; position?: Vec3; yaw?: number; length: number; bob?: number; pitch?: number }> = ({ path, position = [0, 0, 0], yaw = 0, length, bob = 0, pitch = 0 }) => {
  const gltf = useGltf(path);
  const fit = useMemo(() => {
    if (!gltf) return null;
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const sz = box.getSize(new THREE.Vector3());
    const s = length / Math.max(sz.x, sz.z);
    const c = box.getCenter(new THREE.Vector3());
    return { root, s, offset: [-c.x, -box.min.y, -c.z] as Vec3 };
  }, [gltf, length]);
  if (!fit) return null;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group scale={fit.s * (1 + 0.01 * bob)} rotation={[pitch, 0, 0]}>
        <primitive object={fit.root} position={fit.offset} />
      </group>
    </group>
  );
};
