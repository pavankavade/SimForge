import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G } from "../characters/hero";

/**
 * Small valley town at dusk: gabled houses with warm windows, street lamps,
 * and the school (a brick hall with a clock gable, steps and lit doors).
 */

const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const lit = (color: string, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });

const HOUSE_COLORS = ["#e8d7b6", "#9cc0d8", "#e7a77a", "#b8d0a2", "#d9c3e0", "#f0e2a0"];

const gableGeo = (w: number, h: number, d: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.15, 0);
  s.lineTo(0, h);
  s.lineTo(w / 2 + 0.15, 0);
  s.lineTo(-w / 2 - 0.15, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.3, bevelEnabled: false });
  g.translate(0, 0, -(d + 0.3) / 2);
  return g;
};

export const House: React.FC<{ position: Vec3; rotationY?: number; color: string; glow: number; seed: number }> = ({
  position,
  rotationY = 0,
  color,
  glow,
  seed,
}) => {
  const w = 3 + random(`hw${seed}`) * 1.4;
  const h = 2.4 + random(`hh${seed}`) * 0.8;
  const d = 3 + random(`hd${seed}`) * 1.2;
  const roof = useMemo(() => gableGeo(w, 1.5, d), [w, d]);
  const win = glow > 0.05 ? lit("#ffcf7a", 1.4 * glow) : std("#3a4660", 0.3);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={G.box(w, h, d, 0.08)} material={std(color)} position={[0, h / 2, 0]} castShadow receiveShadow />
      <mesh geometry={roof} material={std("#7a4a40", 0.7)} position={[0, h, 0]} castShadow />
      {[-w * 0.25, w * 0.25].map((x) => (
        <mesh key={x} geometry={G.box(0.6, 0.7, 0.05, 0.02)} material={win} position={[x, h * 0.55, d / 2 + 0.01]} />
      ))}
      <mesh geometry={G.box(0.7, 1.2, 0.05, 0.02)} material={std("#5a3a2a")} position={[0, 0.6, d / 2 + 0.01]} />
    </group>
  );
};

export const StreetLamp: React.FC<{ position: Vec3; on: number }> = ({ position, on }) => (
  <group position={position}>
    <mesh geometry={G.cyl(0.05, 0.07, 3.2, 8)} material={std("#2e3442", 0.5)} position={[0, 1.6, 0]} />
    <mesh geometry={G.sphere(0.2)} material={on > 0.05 ? lit("#ffe0a0", 2.5 * on) : std("#d8d8d0")} position={[0, 3.25, 0]} />
  </group>
);

/** The school: wide brick hall facing +z, steps up to double doors, clock gable, warm windows. */
export const School: React.FC<{ position: Vec3; glow: number; rotationY?: number }> = ({ position, glow, rotationY = 0 }) => {
  const W = 14;
  const H = 5.2;
  const D = 8;
  const roof = useMemo(() => gableGeo(4.4, 2.2, 1.2), []);
  const win = glow > 0.05 ? lit("#ffd28a", 1.5 * glow) : std("#3a4660", 0.3);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Brick hall and trim */}
      <mesh geometry={G.box(W, H, D, 0.1)} material={std("#b8553f")} position={[0, H / 2 + 0.6, -D / 2]} castShadow receiveShadow />
      <mesh geometry={G.box(W + 0.3, 0.3, D + 0.3, 0.08)} material={std("#efe6d6")} position={[0, H + 0.6, -D / 2]} />
      <mesh geometry={G.box(W + 0.2, 0.6, D + 0.2, 0.05)} material={std("#9a948a")} position={[0, 0.3, -D / 2]} receiveShadow />
      {/* Clock gable over the doors */}
      <mesh geometry={G.box(4.4, 1.6, 1.2, 0.06)} material={std("#b8553f")} position={[0, H + 1.4, -0.2]} castShadow />
      <mesh geometry={roof} material={std("#4f5568", 0.7)} position={[0, H + 2.2, -0.2]} castShadow />
      <mesh geometry={G.cyl(0.55, 0.55, 0.08, 32)} material={std("#f6f0e2", 0.5)} position={[0, H + 1.5, 0.42]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Hands at 6:59: hour hand near 7, minute hand near 12 */}
      <mesh geometry={G.box(0.05, 0.32, 0.02, 0.01)} material={std("#2a2a2a")} position={[-0.07, H + 1.38, 0.47]} rotation={[0, 0, 2.6 - Math.PI]} />
      <mesh geometry={G.box(0.04, 0.45, 0.02, 0.01)} material={std("#2a2a2a")} position={[-0.01, H + 1.7, 0.47]} rotation={[0, 0, 0.1]} />
      {/* Windows */}
      {[-5.4, -3.6, 3.6, 5.4].map((x) =>
        [2.0, 4.1].map((y) => <mesh key={`${x}${y}`} geometry={G.box(1.1, 1.3, 0.06, 0.03)} material={win} position={[x, y + 0.6, 0.02]} />)
      )}
      {/* Doors, lit from inside, and the steps */}
      <mesh geometry={G.box(2.4, 2.8, 0.08, 0.05)} material={std("#efe6d6")} position={[0, 2.0, 0.02]} />
      <mesh geometry={G.box(2.0, 2.5, 0.06, 0.04)} material={win} position={[0, 1.95, 0.06]} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={G.box(4.4 - i * 0.4, 0.2, 0.7, 0.04)} material={std("#cfc8bc")} position={[0, 0.1 + i * 0.2, 1.9 - i * 0.6]} receiveShadow castShadow />
      ))}
      {/* Name board */}
      <mesh geometry={G.box(3.4, 0.5, 0.08, 0.04)} material={std("#2d3f69", 0.6)} position={[0, 3.75, 0.06]} />
    </group>
  );
};

/** A loose grid of houses and lamps along a main street running along x. */
export const TownBlock: React.FC<{ position: Vec3; glow: number; count?: number; seed?: number }> = ({ position, glow, count = 18, seed = 1 }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      const x = Math.floor(i / 2) * 6.5 + random(`tx${seed}${i}`) * 1.2;
      const z = side * (7 + random(`tz${seed}${i}`) * 3);
      return (
        <House
          key={i}
          position={[x, 0, z]}
          rotationY={side > 0 ? Math.PI : 0}
          color={HOUSE_COLORS[i % HOUSE_COLORS.length]}
          glow={glow * (random(`tg${seed}${i}`) > 0.25 ? 1 : 0)}
          seed={seed * 100 + i}
        />
      );
    })}
    {Array.from({ length: Math.ceil(count / 2) }, (_, i) => (
      <StreetLamp key={`l${i}`} position={[i * 6.5 + 3, 0, (i % 2 ? 1 : -1) * 3.6]} on={glow} />
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(count / 2) * 3.25, 0.02, 0]} receiveShadow>
      <planeGeometry args={[count * 3.5 + 20, 5]} />
      <meshStandardMaterial color="#5a5e6a" roughness={0.9} />
    </mesh>
  </group>
);
