import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G } from "../characters/hero";

/**
 * School hall stage, seen from the audience: wooden stage, red curtains that
 * part (`open` 0..1), an upright piano stage-left with its bench, a warm
 * spotlight and a few rows of chairs in silhouette. Stage front edge at z = 0.
 */

export const STAGE_H = 0.9;
export const PIANO_X = -2.6;
export const BENCH = { x: -2.6, z: 0.55, top: STAGE_H + 0.48 } as const;

const std = (color: string, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

export const RecitalStage: React.FC<{ position?: Vec3; open: number; spot: number }> = ({ position = [0, 0, 0], open, spot }) => {
  const m = useMemo(
    () => ({
      wall: std("#4a2f3a", 0.95),
      floor: std("#a8763f", 0.6),
      apron: std("#6b4528", 0.7),
      curtain: std("#b0283a", 0.9),
      curtainDark: std("#8a1e2e", 0.9),
      valance: std("#94202f", 0.9),
      gold: std("#e2b04a", 0.4),
      piano: std("#1e1a1c", 0.35),
      keys: std("#f6f2ea", 0.4),
      chair: std("#2a2430", 0.9),
      hall: std("#3a2a30", 1),
    }),
    []
  );
  const half = 4.8;
  /** Each curtain panel slides from the centre to the wing. */
  const panelW = half;
  const panelX = (s: -1 | 1) => s * (panelW / 2 + open * (panelW * 0.82));
  return (
    <group position={position}>
      {/* Hall walls and floor */}
      <mesh geometry={G.box(30, 12, 0.3, 0.05)} material={m.hall} position={[0, 6, -4.4]} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]} receiveShadow>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#3d3036" roughness={1} />
      </mesh>
      {/* Stage box and back wall */}
      <mesh geometry={G.box(11, STAGE_H, 4.2, 0.04)} material={m.apron} position={[0, STAGE_H / 2, -2.1]} receiveShadow castShadow />
      <mesh geometry={G.box(10.8, 0.04, 4.1, 0.01)} material={m.floor} position={[0, STAGE_H + 0.01, -2.1]} receiveShadow />
      <mesh geometry={G.box(11, 6, 0.2, 0.04)} material={m.wall} position={[0, STAGE_H + 3, -4.2]} receiveShadow />
      {/* Proscenium */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} geometry={G.box(0.6, 6.4, 0.5, 0.08)} material={m.gold} position={[s * 5.5, STAGE_H + 3.0, 0]} castShadow />
      ))}
      <mesh geometry={G.box(11.6, 0.9, 0.6, 0.08)} material={m.valance} position={[0, STAGE_H + 5.6, 0]} />
      <mesh geometry={G.box(11.6, 0.12, 0.62, 0.04)} material={m.gold} position={[0, STAGE_H + 5.12, 0.01]} />
      {/* Curtains: pleated panels */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[panelX(s), STAGE_H + 2.6, -0.15]}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              geometry={G.cyl(0.32, 0.32, 5.2, 12)}
              material={i % 2 ? m.curtain : m.curtainDark}
              position={[(i - 3.5) * (panelW / 8), 0, (i % 2) * 0.06]}
              scale={[1, 1, 0.5]}
              castShadow
            />
          ))}
        </group>
      ))}
      {/* Upright piano stage-left, keyboard facing the bench (toward +x/+z) */}
      <group position={[PIANO_X, STAGE_H, -0.6]} rotation={[0, 0.5, 0]}>
        <mesh geometry={G.box(1.6, 1.3, 0.6, 0.05)} material={m.piano} position={[0, 0.65, -0.1]} castShadow />
        <mesh geometry={G.box(1.5, 0.08, 0.32, 0.02)} material={m.keys} position={[0, 0.78, 0.32]} />
        <mesh geometry={G.box(1.5, 0.1, 0.38, 0.02)} material={m.piano} position={[0, 0.7, 0.3]} />
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} geometry={G.box(0.05, 0.04, 0.18, 0.01)} material={m.piano} position={[-0.66 + i * 0.12, 0.83, 0.26]} />
        ))}
      </group>
      {/* Bench */}
      <mesh geometry={G.box(0.9, 0.08, 0.4, 0.02)} material={m.piano} position={[BENCH.x + 0.35, BENCH.top - 0.04, BENCH.z]} castShadow />
      {([-1, 1] as const).map((s) => (
        <mesh key={s} geometry={G.box(0.06, 0.44, 0.34, 0.01)} material={m.piano} position={[BENCH.x + 0.35 + s * 0.38, STAGE_H + 0.22, BENCH.z]} />
      ))}
      {/* Spotlight on centre stage */}
      <spotLight
        position={[0, STAGE_H + 9, 7]}
        target-position={[0.4, STAGE_H, -1.2]}
        angle={0.28}
        penumbra={0.6}
        intensity={260 * spot}
        color="#ffe6b8"
        castShadow
        distance={30}
        decay={2}
      />
      {/* Audience chairs in silhouette */}
      {[2.4, 3.6].map((z) =>
        Array.from({ length: 9 }, (_, i) => (
          <group key={`${z}${i}`} position={[(i - 4) * 1.1, 0, z]}>
            <mesh geometry={G.box(0.6, 0.08, 0.55, 0.02)} material={m.chair} position={[0, 0.5, 0]} />
            <mesh geometry={G.box(0.6, 0.7, 0.08, 0.02)} material={m.chair} position={[0, 0.85, 0.25]} />
          </group>
        ))
      )}
    </group>
  );
};
