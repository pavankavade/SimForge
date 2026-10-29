import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Teleport effects: the blink (a column of light that snaps shut where you
 * leave and blooms open where you arrive, with a ground ring and sparkles),
 * a snowball, and speed lines for anyone still carrying their momentum.
 */

const DUR = 16;

/**
 * Blink at `at`: kind "out" collapses a column of light onto the spot,
 * "in" bursts it open. `height` ~ the person's height.
 */
export const Blink: React.FC<{ frame: number; at: number; position: Vec3; kind: "in" | "out"; height?: number; color?: string; seed?: number }> = ({
  frame,
  at,
  position,
  kind,
  height = 2,
  color = "#7de9ff",
  seed = 0,
}) => {
  const col = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }), [color]);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), []);
  const t = (frame - at) / DUR;
  if (t < -0.3 || t > 1) return null;
  const k = Math.max(0, t);
  // "in": wide flash that narrows; "out": thin column that snaps shut a little before `at`.
  const w = kind === "in" ? 0.5 * (1 - k) + 0.05 : 0.45 * Math.max(0, 1 - Math.abs(t + 0.1) * 3);
  col.opacity = kind === "in" ? 0.85 * (1 - k) : 0.85 * Math.max(0, 1 - Math.abs(t + 0.1) * 2.5);
  ring.opacity = 0.9 * (1 - k);
  return (
    <group position={position}>
      {w > 0.01 ? (
        <mesh material={col} position={[0, height * 0.6, 0]} scale={[w, 1, w]}>
          <cylinderGeometry args={[1, 1, height * 1.4, 20, 1, true]} />
        </mesh>
      ) : null}
      <mesh material={ring} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.2 + k * 1.6}>
        <ringGeometry args={[0.8, 1, 40]} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const r = (s: string) => random(`blink${seed}-${i}-${s}`);
        const a = r("a") * Math.PI * 2;
        const d = 0.2 + k * (0.6 + r("d") * 0.9);
        return (
          <mesh key={i} material={col} position={[Math.cos(a) * d, r("y") * height * 1.1 + k * 0.4, Math.sin(a) * d]} scale={(1 - k) * (0.04 + r("s") * 0.05)}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** A packed snowball of radius `r` (shrinks as it melts). */
export const Snowball: React.FC<{ position: Vec3; r?: number }> = ({ position, r = 0.16 }) => (
  <group position={position}>
    <Part geo={G.sphere(r)} mat={vinyl("#f6f9fd", "cloth")} ink={INK_THIN} />
    <mesh geometry={G.sphere(r * 0.4)} material={vinyl("#e6eef7", "cloth")} position={[r * 0.6, r * 0.5, r * 0.3]} />
  </group>
);

/** Drips falling from a melting snowball. */
export const Drips: React.FC<{ frame: number; position: Vec3 }> = ({ frame, position }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => {
      const t = ((frame + i * 11) % 33) / 33;
      return <mesh key={i} geometry={G.sphere(0.022)} material={flat("#bfe6ff")} position={[(i - 1) * 0.05, -0.12 - t * 0.9, 0]} scale={[1, 1.4, 1]} />;
    })}
  </group>
);

/** Horizontal motion lines trailing anything still carrying its momentum (along +x, `speed` 0..1). */
export const SpeedLines: React.FC<{ frame: number; center: Vec3; speed: number; dir?: 1 | -1; count?: number }> = ({ frame, center, speed, dir = 1, count = 10 }) => {
  if (speed < 0.05) return null;
  return (
    <group position={center}>
      {Array.from({ length: count }, (_, i) => {
        const r = (s: string) => random(`sl${i}${s}`);
        const len = 0.4 + speed * 1.2 * (0.6 + r("l") * 0.6);
        const x = -dir * (0.4 + ((frame * 0.15 + r("x")) % 1) * 0.8);
        return <mesh key={i} geometry={G.box(len, 0.025, 0.025, 0.01)} material={flat("#ffffff")} position={[x - (dir * len) / 2, (r("y") - 0.3) * 1.6, (r("z") - 0.5) * 0.4]} />;
      })}
    </group>
  );
};
