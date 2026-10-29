import type React from "react";
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as THREE from "three";
import { G, INK_THIN, Part, vinyl } from "../../../artifacts/characters/hero";
import { CloudPuff } from "../../../artifacts/sky/CloudPuff";
import {
  DIG,
  FLOOD,
  GATE_Z,
  GROUND_Z1,
  MOAT_X0,
  MOAT_X1,
  PILE_H,
  PILE_SINK,
  PILE_UP,
  PILE_W,
  WALL_Z0,
  WALL_Z1,
  moatFloor,
  progress,
  waterLevel,
} from "../timeline";

const BACK_Z = -48;
const GRASS = "#78bf4f";
const EARTH = "#8d5c38";

/** Afternoon sky: a gradient dome, a warm sun from the front-left, soft sky fill. */
export const Sky: React.FC = () => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.environmentIntensity = 0.45;
    scene.fog = new THREE.Fog("#cfe6f7", 60, 160);
  }, [scene]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vPos; void main(){ float h = max(vPos.y, 0.0);
          vec3 c = mix(vec3(0.84,0.93,0.99), vec3(0.30,0.60,0.92), smoothstep(0.0, 0.55, h));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    [],
  );
  return (
    <>
      <mesh material={mat} scale={170} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <directionalLight
        position={[-12, 20, 16]}
        intensity={2.5}
        color="#fff3dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={["#bfe0ff", "#6a8a4a", 1.0]} />
      <directionalLight position={[10, 6, -14]} intensity={0.5} color="#ffe2b8" />
      {[
        [-14, 16, -40, 3.2, 1],
        [6, 19, -46, 3.8, 2],
        [22, 15, -38, 2.8, 3],
        [-30, 13, -34, 2.6, 4],
      ].map(([x, y, z, s, seed]) => (
        <CloudPuff key={seed} position={[x, y, z]} scale={s} seed={seed} />
      ))}
    </>
  );
};

/** A slab with grass on top and earth on its sides (its cut face toward the camera shows the soil). */
const Slab: React.FC<{ x: [number, number]; top: number; grass?: string }> = ({ x, top, grass = GRASS }) => {
  const h = top + 14;
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: EARTH, roughness: 1 });
    const up = new THREE.MeshStandardMaterial({ color: grass, roughness: 1 });
    return [side, side, up, side, side, side];
  }, [grass]);
  return (
    <mesh position={[(x[0] + x[1]) / 2, top - h / 2, (BACK_Z + GROUND_Z1) / 2]} material={mats} receiveShadow>
      <boxGeometry args={[x[1] - x[0], h, GROUND_Z1 - BACK_Z]} />
    </mesh>
  );
};

/** Ground on both sides of the moat line; the trench floor sinks for the dig and water fills it. */
const Ground: React.FC<{ frame: number }> = ({ frame }) => {
  const floor = moatFloor(frame);
  const dug = progress(frame, DIG);
  const flood = progress(frame, FLOOD);
  const wl = waterLevel(frame);
  const swell = 0.03 * Math.sin(frame * 0.12);
  return (
    <>
      <Slab x={[-60, MOAT_X0]} top={0} />
      <Slab x={[MOAT_X1, 60]} top={0} />
      <Slab x={[MOAT_X0, MOAT_X1]} top={floor} grass={dug > 0.02 ? "#6b4a2e" : GRASS} />
      {/* Soil band visible in the trench walls once it is dug */}
      {flood > 0 ? (
        <mesh position={[(MOAT_X0 + MOAT_X1) / 2, (floor + wl) / 2 + swell / 2, (BACK_Z + GROUND_Z1) / 2]} renderOrder={2}>
          <boxGeometry args={[MOAT_X1 - MOAT_X0 - 0.01, wl - floor + swell, GROUND_Z1 - BACK_Z - 0.01]} />
          <meshStandardMaterial color="#3d86c0" roughness={0.15} metalness={0.1} transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ) : null}
      {flood > 0.6
        ? [0, 1, 2].map((k) => (
            <mesh key={k} position={[MOAT_X0 + 0.5 + k * 1.0 + 0.3 * Math.sin(frame * 0.05 + k), wl + swell + 0.01, GROUND_Z1 - 1.2 - k * 2.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.24, 24]} />
              <meshBasicMaterial color="#d8f0ff" transparent opacity={0.45} depthWrite={false} />
            </mesh>
          ))
        : null}
    </>
  );
};

/** Thatched cottages, a fence and a well: the village the wall protects. */
const Cottage: React.FC<{ at: [number, number]; yaw?: number; wall?: string; roof?: string }> = ({ at, yaw = 0, wall = "#f1e6cf", roof = "#c79a4a" }) => (
  <group position={[at[0], 0, at[1]]} rotation={[0, yaw, 0]}>
    <Part geo={G.box(2.4, 1.7, 2.0, 0.08)} mat={vinyl(wall, "cloth")} position={[0, 0.85, 0]} />
    <Part geo={G.box(0.5, 0.9, 0.05, 0.03)} mat={vinyl("#7a4a2a", "wood")} position={[0.4, 0.45, 1.02]} ink={INK_THIN} />
    <Part geo={G.box(0.4, 0.4, 0.05, 0.03)} mat={vinyl("#ffd98a", "gloss")} position={[-0.6, 1.0, 1.02]} ink={INK_THIN} />
    <group position={[0, 1.7, 0]} rotation={[0, 0, 0]}>
      <Part geo={G.cyl(1.35, 1.35, 2.7, 3)} mat={vinyl(roof, "hair")} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[1, 1, 0.62]} />
    </group>
  </group>
);

const Tree: React.FC<{ at: [number, number]; s?: number; seed: number }> = ({ at, s = 1, seed }) => (
  <group position={[at[0], 0, at[1]]} scale={s}>
    <Part geo={G.cyl(0.14, 0.2, 1.4)} mat={vinyl("#7a5230", "wood")} position={[0, 0.7, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.95)} mat={vinyl(seed % 2 ? "#4f9a3e" : "#5aa845", "cloth")} position={[0, 2.0, 0]} />
    <Part geo={G.sphere(0.7)} mat={vinyl("#62b04c", "cloth")} position={[0.45, 2.45, 0.2]} />
  </group>
);

const Scenery: React.FC = () => (
  <>
    <Cottage at={[-7.2, -1.6]} yaw={0.15} />
    <Cottage at={[-10.8, -4.6]} yaw={-0.2} wall="#efe0c4" roof="#b8873e" />
    <Cottage at={[-6.8, -8.2]} yaw={0.4} />
    <Cottage at={[-12.5, 0.2]} yaw={0.1} wall="#f4ead8" />
    <Cottage at={[-14.5, -9]} yaw={-0.3} roof="#b8873e" />
    {/* Fence round the sheep pen */}
    {Array.from({ length: 9 }, (_, k) => (
      <Part key={k} geo={G.box(0.1, 0.7, 0.1, 0.02)} mat={vinyl("#8a5a32", "wood")} position={[-8.2 + k * 0.75, 0.35, 1.6]} ink={INK_THIN} />
    ))}
    <Part geo={G.box(6.1, 0.08, 0.06, 0.02)} mat={vinyl("#8a5a32", "wood")} position={[-5.2, 0.55, 1.6]} ink={INK_THIN} />
    {[
      [16, -7, 1.1],
      [13.5, -10, 1.3],
      [17, -3.5, 1.0],
      [11, -16, 1.4],
      [21, -13, 1.2],
      [7.5, -21, 1.3],
      [-17, -14, 1.3],
      [-20, -4, 1.1],
      [26, -6, 1.2],
    ].map(([x, z, s], k) => (
      <Tree key={k} at={[x, z]} s={s} seed={k} />
    ))}
    {/* Rolling hills */}
    {[
      [-34, -60, 18, "#6aae4c"],
      [-6, -70, 22, "#5d9f45"],
      [26, -62, 20, "#6aae4c"],
      [50, -75, 24, "#5d9f45"],
    ].map(([x, z, r, c], k) => (
      <mesh key={k} position={[x as number, -(r as number) * 0.72, z as number]} scale={[2, 1, 1]}>
        <sphereGeometry args={[r as number, 32, 18]} />
        <meshStandardMaterial color={c as string} roughness={1} />
      </mesh>
    ))}
  </>
);

/** Level one: loose stones dropped along the wall line into a mound, later sinking as the courses rise. */
const PILE_SLOTS = (() => {
  const out: { x: number; y: number; z: number; r: number; seed: string }[] = [];
  const layout = [
    [-0.85, 0.28, 0.36],
    [0, 0.3, 0.42],
    [0.85, 0.28, 0.36],
    [-0.42, 0.72, 0.36],
    [0.42, 0.72, 0.36],
    [0, 1.0 * PILE_H - 0.12, 0.3],
  ];
  for (let z = WALL_Z1 - 0.3; z > -9; z -= 0.62) {
    layout.forEach(([x, y, r], k) => {
      const seed = `pile-${z.toFixed(2)}-${k}`;
      out.push({ x: x + (random(seed) - 0.5) * 0.2, y, z: z + (random(`${seed}z`) - 0.5) * 0.2, r: r * (0.85 + random(`${seed}r`) * 0.3), seed });
    });
  }
  return out;
})();
const STONE_COLS = ["#a49d93", "#8f887e", "#b7afa2", "#9b9488"];

export const Pile: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < PILE_UP[0] || frame > PILE_SINK[1]) return null;
  const sink = progress(frame, PILE_SINK);
  return (
    <>
      {PILE_SLOTS.map((s, k) => {
        const start = PILE_UP[0] + random(`${s.seed}t`) * (PILE_UP[1] - PILE_UP[0] - 10);
        const t = progress(frame, [start, start + 10]);
        if (t <= 0) return null;
        const y = s.y + (1 - t * t) * 4 - sink * 1.5;
        return <Part key={k} geo={G.sphere(s.r)} mat={vinyl(STONE_COLS[k % 4], "bone")} position={[s.x, y, s.z]} rotation={[k, k * 1.7, 0]} scale={[1.15, 0.8, 1]} ink={INK_THIN} />;
      })}
      {/* The rest of the ring, further along, as a smooth mound */}
      {progress(frame, PILE_UP) > 0.3 ? (
        <mesh position={[0, -0.25 - sink * 1.5, (WALL_Z0 - 9) / 2]} scale={[PILE_W / 2, PILE_H + 0.2, (-9 - WALL_Z0) / 2]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#9f988c" roughness={1} flatShading />
        </mesh>
      ) : null}
    </>
  );
};

export const Valley: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Sky />
    <Ground frame={frame} />
    <Scenery />
    {/* A fixed plank path to the gate before the drawbridge exists is the drawbridge itself (Wall). */}
    <mesh position={[MOAT_X1 + 4, 0.005, GATE_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[8, 1.8]} />
      <meshStandardMaterial color="#b89a6a" roughness={1} />
    </mesh>
  </>
);
