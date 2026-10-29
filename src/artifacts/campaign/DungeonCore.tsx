import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

interface DungeonCoreProps {
  /** Floor point under the pedestal. */
  position: Vec3;
  /** 0..1 how charged the core is (brightness, spin speed, ring count). */
  energy?: number;
  /** Frames it flares (e.g. every time the Mimic feeds). */
  pulses?: number[];
  scale?: number;
  color?: string;
}

/**
 * The Dungeon Core: the heart of the dungeon, in the centre of the Core
 * Chamber. A faceted crystal floats and turns over a rune-carved pedestal,
 * wrapped in slowly orbiting rings, glowing and lighting the room. `energy`
 * and `pulses` are its state, so later episodes can feed it, drain it or wire
 * new rooms to it.
 */
export const DungeonCore: React.FC<DungeonCoreProps> = ({ position, energy = 0.6, pulses = [], scale = 1, color = "#9b6bff" }) => {
  const frame = useCurrentFrame();
  const stone = useSurface("core-stone", () => makeMasonry({ rows: 3, cols: 6, base: "#4a4c58", baseAlt: "#565866", mortar: "#1c1d24", seed: 201 }), [2, 1]);
  const crystal = useMemo(() => new THREE.OctahedronGeometry(0.62, 0), []);
  const flare = pulses.reduce((f, at) => Math.max(f, frame >= at ? Math.exp(-(frame - at) / 10) : 0), 0);
  const glow = 0.55 + 0.45 * energy + 0.8 * flare;
  const bob = 0.12 * Math.sin(frame * 0.05);
  const spin = frame * (0.012 + 0.02 * energy) + flare * 0.4;
  const breathe = 1 + 0.04 * Math.sin(frame * 0.09) + 0.18 * flare;
  const runeOn = 0.35 + 0.5 * energy + 0.6 * flare;
  const rings = 2 + Math.round(energy * 2);
  return (
    <group position={position} scale={scale}>
      {/* Stepped pedestal with glowing runes */}
      {[
        [1.5, 0.22, 0.11],
        [1.15, 0.22, 0.33],
        [0.8, 0.5, 0.69],
      ].map(([r, h, y], i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r * 0.92, r, h, 8]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#a8aab6" roughness={0.85} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh key={`rune-${i}`} position={[Math.cos(a) * 0.79, 0.69, Math.sin(a) * 0.79]} rotation={[0, -a + Math.PI / 2, 0]}>
            <planeGeometry args={[0.18, 0.26]} />
            <meshBasicMaterial color={color} transparent opacity={Math.min(1, runeOn)} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Cradle prongs */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={`prong-${i}`} position={[Math.cos(a) * 0.55, 1.15, Math.sin(a) * 0.55]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]} castShadow>
            <coneGeometry args={[0.07, 0.6, 6]} />
            <meshStandardMaterial color="#c99a3e" metalness={0.7} roughness={0.35} />
          </mesh>
        );
      })}
      {/* The crystal */}
      <group position={[0, 2.0 + bob, 0]} rotation={[0, spin, 0]} scale={[breathe * 0.85, breathe * 1.35, breathe * 0.85]}>
        <mesh geometry={crystal} castShadow>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2 + 1.6 * glow} roughness={0.15} metalness={0.1} flatShading />
        </mesh>
        <mesh geometry={crystal} scale={0.55}>
          <meshBasicMaterial color="#f2e9ff" toneMapped={false} />
        </mesh>
      </group>
      {/* Orbiting rings */}
      {Array.from({ length: rings }, (_, i) => (
        <mesh key={`ring-${i}`} position={[0, 2.0 + bob, 0]} rotation={[Math.PI / 2 + 0.5 * Math.sin(i * 1.7 + frame * 0.01), frame * (0.02 + i * 0.008) + i, 0.3 * i]}>
          <torusGeometry args={[0.95 + i * 0.18, 0.025, 6, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      <GlowSprite position={[0, 2.0 + bob, 0.2]} color={color} size={3.2 * glow} opacity={0.55} />
      <GlowSprite position={[0, 0.8, 0.3]} color={color} size={2.4 * runeOn} opacity={0.25} />
      <pointLight position={[0, 2.0, 1.0]} color={color} intensity={4 + 6 * glow} distance={12} decay={2} />
    </group>
  );
};
