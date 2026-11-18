import type React from "react";
import * as THREE from "three";
import { GlowSprite } from "../dungeon";
import type { V3 } from "./common";

/**
 * Small props of the mine story: the ration (two spoons of tuna into a lid, a sip of milk, a
 * cracker snapped in two), a paloma supply tube, and the 53 cm ring the capsule has to fit.
 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

export interface RationProps {
  /** Spoon trips done 0..2 (fractional while moving). */
  spoon: number;
  /** Milk poured 0..1. */
  milk: number;
  /** Cracker snapped 0..1. */
  cracker: number;
}

/** Laid out on a crate top (local origin at the top centre). */
export const RationSet: React.FC<RationProps> = ({ spoon, milk, cracker }) => {
  const can: V3 = [-0.12, 0, -0.02];
  const lid: V3 = [0.06, 0, 0.05];
  const trip = spoon % 1;
  const done = Math.floor(spoon);
  // Spoon: dip into the can, arc across, tip into the lid.
  const from = new THREE.Vector3(can[0], 0.11, can[2]);
  const to = new THREE.Vector3(lid[0], 0.07, lid[2]);
  const moving = spoon < 2 && trip > 0;
  const t = moving ? ease(trip) : spoon >= 2 ? 1 : 0;
  const sp = from.clone().lerp(to, t);
  sp.y += Math.sin(Math.PI * t) * 0.08;
  const tilt = moving && trip > 0.75 ? (trip - 0.75) * 4 * 1.1 : 0;
  const dollops = Math.min(2, done + (moving && trip > 0.9 ? 1 : 0));
  return (
    <group>
      {/* Tuna can, open. */}
      <mesh position={[can[0], 0.03, can[2]]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 20, 1, true]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[can[0], 0.045, can[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.048, 20]} />
        <meshStandardMaterial color="#b58a6a" roughness={0.8} />
      </mesh>
      <mesh position={[can[0], 0.028, can[2] + 0.0505]}>
        <planeGeometry args={[0.09, 0.03]} />
        <meshStandardMaterial color="#2f63b0" roughness={0.5} />
      </mesh>
      {/* The lid used as a plate, with the tuna that lands in it. */}
      <mesh position={[lid[0], 0.004, lid[2]]}>
        <cylinderGeometry args={[0.052, 0.052, 0.008, 20]} />
        <meshStandardMaterial color="#d2d5da" roughness={0.3} metalness={0.8} />
      </mesh>
      {Array.from({ length: dollops }, (_, i) => (
        <mesh key={i} position={[lid[0] + (i ? 0.018 : -0.014), 0.014, lid[2] + (i ? -0.01 : 0.008)]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.016, 10, 8]} />
          <meshStandardMaterial color="#b58a6a" roughness={0.8} />
        </mesh>
      ))}
      {/* Spoon. */}
      <group position={[sp.x, sp.y, sp.z]} rotation={[0, -0.6, tilt]}>
        <mesh position={[-0.06, 0.018, 0]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.11, 0.006, 0.012]} />
          <meshStandardMaterial color="#d8dbe0" roughness={0.25} metalness={0.9} />
        </mesh>
        <mesh scale={[1, 0.35, 0.75]}>
          <sphereGeometry args={[0.018, 12, 8]} />
          <meshStandardMaterial color="#d8dbe0" roughness={0.25} metalness={0.9} />
        </mesh>
      </group>
      {/* Milk: a small carton tips a sip into a cup. */}
      <group position={[0.2, 0, -0.08]} rotation={[0, 0, 1.1 * Math.sin(Math.PI * clamp01(milk))]}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <boxGeometry args={[0.05, 0.14, 0.05]} />
          <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.06, 0.0255]}>
          <planeGeometry args={[0.04, 0.05]} />
          <meshStandardMaterial color="#3a7bd5" roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[0.14, 0.025, 0.06]} castShadow>
        <cylinderGeometry args={[0.025, 0.02, 0.05, 16, 1, true]} />
        <meshStandardMaterial color="#e05a3a" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {milk > 0.4 && (
        <mesh position={[0.14, 0.008 + 0.006 * clamp01((milk - 0.4) * 3), 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.021, 14]} />
          <meshStandardMaterial color="#fbfbf6" roughness={0.3} />
        </mesh>
      )}
      {/* The cracker, snapped in two. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.02 + s * (0.013 + 0.03 * ease(cracker)), 0.005, 0.12]} rotation={[0, s * 0.25 * ease(cracker), 0]} castShadow>
          <boxGeometry args={[0.026, 0.008, 0.05]} />
          <meshStandardMaterial color="#e3b86a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

/** A paloma: an orange supply tube about 1.5 m long, with screw caps. Local: along +Y from 0. */
export const PalomaTube: React.FC<{ len?: number }> = ({ len = 1.5 }) => (
  <group>
    <mesh position={[0, len / 2, 0]} castShadow>
      <cylinderGeometry args={[0.055, 0.055, len, 16]} />
      <meshStandardMaterial color="#f07a1a" roughness={0.45} />
    </mesh>
    {[0.02, len - 0.02].map((y) => (
      <mesh key={y} position={[0, y, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.06, 16]} />
        <meshStandardMaterial color="#3a3d42" roughness={0.5} metalness={0.4} />
      </mesh>
    ))}
  </group>
);

/** The 53 cm ring: the width of the capsule, glowing. */
export const FitRing: React.FC<{ position: V3; opacity: number }> = ({ position, opacity }) =>
  opacity <= 0.01 ? null : (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.265, 0.014, 10, 48]} />
        <meshStandardMaterial color="#7de9ff" emissive="#7de9ff" emissiveIntensity={2.2 * opacity} transparent opacity={opacity} toneMapped={false} />
      </mesh>
      <GlowSprite position={[0.265, 0, 0]} color="#7de9ff" size={0.4} opacity={0.6 * opacity} />
      <GlowSprite position={[-0.265, 0, 0]} color="#7de9ff" size={0.4} opacity={0.6 * opacity} />
    </group>
  );
