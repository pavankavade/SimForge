import type React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { AdventurerUnit, G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Hop stops between Connecticut and Vermont: a cornfield, a lake with a
 * fishing dock (and its fisherman), and a hayfield of round bales that can be
 * knocked flying. Each set is centred on the landing spot at the origin.
 */

const std = (color: string, roughness = 0.92) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Flat ground of one colour, out to the horizon. */
export const Ground: React.FC<{ color: string; y?: number; size?: number }> = ({ color, y = 0, size = 600 }) => {
  const m = useMemo(() => std(color), [color]);
  return (
    <mesh material={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Cornfield: instanced stalks in rows along x, a clear lane at the origin.
// ---------------------------------------------------------------------------
export const Cornfield: React.FC<{ rows?: number; length?: number; lane?: number }> = ({ rows = 14, length = 60, lane = 1.4 }) => {
  const stalks = useRef<THREE.InstancedMesh>(null);
  const tops = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const out: { x: number; z: number; h: number; rot: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const z = -lane - r * 0.9;
      for (let i = 0; i < length / 0.55; i++) {
        out.push({ x: -length / 2 + i * 0.55 + (random(`cx${r}-${i}`) - 0.5) * 0.2, z: z + (random(`cz${r}-${i}`) - 0.5) * 0.2, h: 1.9 + random(`ch${r}-${i}`) * 0.6, rot: random(`cr${r}-${i}`) * 6 });
      }
    }
    return out;
  }, [rows, length, lane]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    items.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(0, s.rot, 0));
      m.compose(new THREE.Vector3(s.x, s.h / 2, s.z), q, new THREE.Vector3(1, s.h, 1));
      stalks.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(s.x, s.h + 0.12, s.z), q, new THREE.Vector3(1, 1, 1));
      tops.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(s.x, s.h * 0.55, s.z), q, new THREE.Vector3(1, 1, 1));
      leaves.current?.setMatrixAt(i, m);
    });
    [stalks, tops, leaves].forEach((r) => {
      if (r.current) r.current.instanceMatrix.needsUpdate = true;
    });
  }, [items]);
  const leafGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.42, 10, 6);
    g.scale(1, 0.12, 0.28);
    g.rotateZ(0.5);
    return g;
  }, []);
  return (
    <group>
      <instancedMesh ref={stalks} args={[undefined, undefined, items.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.035, 0.05, 1, 6]} />
        <meshStandardMaterial color="#7fa64a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, undefined, items.length]} castShadow>
        <coneGeometry args={[0.09, 0.32, 6]} />
        <meshStandardMaterial color="#e2c46a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, items.length]} castShadow geometry={leafGeo}>
        <meshStandardMaterial color="#6e9a3e" roughness={0.9} />
      </instancedMesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Lake and fishing dock: the dock runs from the shore (-x) out to its end at
// the origin; the water surface is at y = -DOCK_TOP.
// ---------------------------------------------------------------------------
export const DOCK_TOP = 0.0;
export const WATER_Y = -0.55;

export const LakeDock: React.FC<{ frame: number; fisherman?: boolean; startled?: boolean; splashAt?: number }> = ({ frame, fisherman = true, startled }) => {
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4f9fcf", roughness: 0.25, metalness: 0.1 }), []);
  const plank = vinyl("#b98b5a", "wood");
  return (
    <group>
      <mesh material={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
      </mesh>
      {/* Ripples */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} geometry={G.box(1.2 + random(`rip${i}`), 0.01, 0.04, 0.005)} material={flat("#a9d6ef")} position={[(random(`rx${i}`) - 0.5) * 20 + Math.sin(frame * 0.03 + i) * 0.2, WATER_Y + 0.01, -2 - random(`rz${i}`) * 12]} />
      ))}
      {/* Far shore with trees */}
      <mesh material={std("#7aa955")} position={[0, WATER_Y, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 60]} />
      </mesh>
      {/* Dock: planks along x from the shore to the end at x = 0.6 */}
      {Array.from({ length: 22 }, (_, i) => (
        <Part key={i} geo={G.box(0.32, 0.08, 1.6, 0.02)} mat={plank} position={[0.6 - i * 0.36, DOCK_TOP - 0.04, 0]} ink={INK_THIN} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Part key={i} geo={G.cyl(0.08, 0.08, 1.4, 8)} mat={vinyl("#7a5a3a", "wood")} position={[0.5 - i * 1.5, -0.6, i % 2 ? 0.75 : -0.75]} ink={INK_THIN} />
      ))}
      {fisherman ? (
        <group position={[0.2, 0, -0.45]}>
          <AdventurerUnit classType="neighborA" pose={startled ? "cower" : "ride"} weapon="none" expression={startled ? "shock" : "neutral"} position={[0, startled ? 0 : -0.3, 0]} rotation={[0, startled ? -0.9 : Math.PI / 2 - 0.3, 0]} animFrame={frame} />
          {!startled ? (
            <>
              <mesh geometry={G.cyl(0.012, 0.02, 2.2, 6)} material={vinyl("#2e3442", "leather")} position={[0.9, 0.9, 0.1]} rotation={[0, 0, -1.0]} />
              <mesh geometry={G.cyl(0.003, 0.003, 1.6, 4)} material={flat("#ffffff")} position={[1.85, 0.6, 0.1]} />
            </>
          ) : null}
        </group>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Hayfield: stubble ground and round bales. `knock` is the frame of the crash
// at `hitX`; bales near it roll and bounce away afterwards.
// ---------------------------------------------------------------------------
export const BALE_R = 0.62;

const BALES: { x: number; z: number; rot: number }[] = [
  { x: -3.2, z: -2.2, rot: 0.3 },
  { x: 1.2, z: -0.6, rot: 1.4 },
  { x: 2.6, z: 0.6, rot: 0.2 },
  { x: 3.4, z: -1.9, rot: 1.1 },
  { x: 6.5, z: -3.5, rot: 0.6 },
  { x: -6.5, z: -5, rot: 1.8 },
  { x: 9, z: -7, rot: 0.9 },
  { x: -10, z: -9, rot: 0.4 },
  { x: 14, z: -12, rot: 1.2 },
];

export const Hayfield: React.FC<{ frame: number; knock?: number; hitX?: number }> = ({ frame, knock = Infinity, hitX = 1.8 }) => {
  const hay = vinyl("#e2b85a", "cloth");
  const hayEnd = vinyl("#c99a3e", "cloth");
  const t = Math.max(0, frame - knock);
  return (
    <group>
      <Ground color="#d9c27a" />
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} geometry={G.box(40, 0.02, 0.12, 0.01)} material={flat("#c9ad62")} position={[0, 0.01, 2 - i * 1.4]} />
      ))}
      {BALES.map((b, i) => {
        const near = Math.abs(b.x - hitX) < 2.2 && b.z > -2.5;
        const dir = Math.sign(b.x - hitX + 0.4) || 1;
        const roll = near ? Math.min(t, 40) : 0;
        const dx = near ? dir * (1 - Math.exp(-roll / 12)) * 4 : 0;
        const hop = near ? Math.abs(Math.sin(roll * 0.25)) * Math.exp(-roll / 10) * 0.8 : 0;
        return (
          <group key={i} position={[b.x + dx, BALE_R + hop, b.z]} rotation={[0, b.rot, 0]}>
            <group rotation={[0, 0, (dx / BALE_R) * -1]}>
              <Part geo={G.cyl(BALE_R, BALE_R, 1.2, 24)} mat={hay} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
              {([-1, 1] as const).map((s) => (
                <mesh key={s} geometry={G.torus(BALE_R * 0.5, 0.03)} material={hayEnd} position={[0, 0, s * 0.605]} />
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
};

/** Loose hay bursting from a crash: yellow strands flying out from `position` after `at`. */
export const HayBurst: React.FC<{ frame: number; at: number; position: Vec3 }> = ({ frame, at, position }) => {
  const t = frame - at;
  if (t < 0 || t > 50) return null;
  return (
    <group position={position}>
      {Array.from({ length: 34 }, (_, i) => {
        const r = (k: string) => random(`hay${i}${k}`);
        const v: Vec3 = [(r("x") - 0.5) * 0.2, 0.06 + r("y") * 0.1, (r("z") - 0.5) * 0.12];
        const y = v[1] * t - 0.004 * t * t;
        return (
          <mesh
            key={i}
            geometry={G.box(0.02, 0.22, 0.02, 0.005)}
            material={flat(i % 2 ? "#e9c66a" : "#c99a3e")}
            position={[v[0] * t, Math.max(0.02, y), v[2] * t]}
            rotation={[r("a") * 6 + t * 0.2, r("b") * 6, r("c") * 6 + t * 0.15]}
          />
        );
      })}
    </group>
  );
};

/** A red barn for the hop-home montage. */
export const Barn: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const roof = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.6, 0);
    s.lineTo(-1.6, 1.4);
    s.lineTo(0, 2.1);
    s.lineTo(1.6, 1.4);
    s.lineTo(2.6, 0);
    s.lineTo(-2.6, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 6.4, bevelEnabled: false });
    g.translate(0, 0, -3.2);
    return g;
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={G.box(4.8, 3.2, 6, 0.06)} material={std("#c4473a", 0.85)} position={[0, 1.6, 0]} castShadow receiveShadow />
      <mesh geometry={roof} material={std("#5a5f6e", 0.7)} position={[0, 3.2, 0]} castShadow />
      <mesh geometry={G.box(2, 2.4, 0.06, 0.02)} material={std("#f2eadb")} position={[0, 1.2, 3.01]} />
      <mesh geometry={G.box(1.7, 2.1, 0.06, 0.02)} material={std("#c4473a")} position={[0, 1.2, 3.05]} />
      <mesh geometry={G.box(0.1, 2.6, 0.04, 0.01)} material={std("#f2eadb")} position={[0, 1.2, 3.09]} rotation={[0, 0, 0.68]} />
      <mesh geometry={G.box(0.1, 2.6, 0.04, 0.01)} material={std("#f2eadb")} position={[0, 1.2, 3.09]} rotation={[0, 0, -0.68]} />
    </group>
  );
};

/** A small river crossing the set along x, with grassy banks. */
export const River: React.FC<{ z: number; width?: number }> = ({ z, width = 4 }) => {
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: "#58a6d4", roughness: 0.3, metalness: 0.1 }), []);
  return (
    <mesh material={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
      <planeGeometry args={[400, width]} />
    </mesh>
  );
};

/** A paper road map held open (Grandpa's), facing +z. */
export const PaperMap: React.FC<{ position: Vec3; rotation?: Vec3; open?: number }> = ({ position, rotation = [0, 0, 0], open = 1 }) => (
  <group position={position} rotation={rotation} scale={[open, 1, 1]}>
    <mesh geometry={G.box(0.5, 0.36, 0.01, 0.004)} material={vinyl("#f4ead2", "cloth")} />
    <mesh geometry={G.box(0.18, 0.12, 0.012, 0.004)} material={flat("#a8cf8a")} position={[-0.1, 0.06, 0.004]} />
    <mesh geometry={G.box(0.14, 0.2, 0.012, 0.004)} material={flat("#9fcbe8")} position={[0.14, -0.04, 0.004]} />
    <mesh geometry={G.box(0.01, 0.3, 0.014, 0.003)} material={flat("#e94f64")} position={[0.02, 0, 0.006]} />
  </group>
);
