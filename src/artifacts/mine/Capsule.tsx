import type React from "react";
import * as THREE from "three";

/**
 * The Fenix 2 rescue capsule: a 53 cm steel tube about 3.9 m long, painted in Chile's colours.
 * Oxygen bay at the bottom with its escape hatch underneath, the cabin cage in the middle (cut open
 * toward the camera so the rider shows, with a cage door at the front), and the top section with
 * the cable eye. Sprung wheels at both ends roll on the shaft walls. Local: bottom at y = 0.
 */

export const CAPSULE = {
  len: 3.9,
  r: 0.265,
  cabin0: 1.05,
  cabin1: 2.95,
  wheel: 0.06,
};

export interface CapsuleProps {
  /** Height of the bottom (world y of the group's origin is handled by the parent); used to spin the wheels. */
  travel: number;
  /** Escape hatch open 0..1, cage door open 0..1. */
  hatch: number;
  door: number;
  /** Call-outs: wheels and oxygen tanks glow 0..1 on their words. */
  wheelGlow?: number;
  oxygenGlow?: number;
  /** Which way the cage door faces (radians about +Y; 0 = +z, toward the camera). */
  doorYaw?: number;
}

const WHITE = "#eef0ee";
const RED = "#d52b1e";
const BLUE = "#1d3f9a";

const Shell: React.FC<{
  y0: number;
  y1: number;
  color: string;
  open?: number;
}> = ({ y0, y1, color, open = 0 }) => (
  // `open` cuts a window (radians) out of the front (+z).
  <mesh position={[0, (y0 + y1) / 2, 0]} castShadow receiveShadow>
    <cylinderGeometry
      args={[
        CAPSULE.r,
        CAPSULE.r,
        y1 - y0,
        28,
        1,
        open > 0,
        open / 2,
        Math.PI * 2 - open,
      ]}
    />
    <meshStandardMaterial
      color={color}
      roughness={0.35}
      metalness={0.25}
      side={THREE.DoubleSide}
    />
  </mesh>
);

const Ring: React.FC<{ y: number; color?: string; r?: number }> = ({
  y,
  color = "#9aa0a6",
  r = CAPSULE.r + 0.008,
}) => (
  <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
    <torusGeometry args={[r, 0.018, 8, 32]} />
    <meshStandardMaterial color={color} roughness={0.35} metalness={0.7} />
  </mesh>
);

const Wheels: React.FC<{ y: number; spin: number; glow: number }> = ({
  y,
  spin,
  glow,
}) => (
  <>
    {[0.25, 0.75, 1.25, 1.75].map((k) => {
      const a = k * Math.PI;
      const x = Math.sin(a) * (CAPSULE.r + 0.03);
      const z = Math.cos(a) * (CAPSULE.r + 0.03);
      return (
        <group key={k} position={[x, y, z]} rotation={[0, a, 0]}>
          {/* Spring arm and the wheel, axle across the arm. */}
          <mesh position={[0, 0.07, -0.015]}>
            <boxGeometry args={[0.03, 0.16, 0.03]} />
            <meshStandardMaterial
              color="#555b62"
              roughness={0.4}
              metalness={0.7}
            />
          </mesh>
          <mesh
            position={[0, 0, CAPSULE.wheel * 0.55]}
            rotation={[spin, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry
              args={[CAPSULE.wheel, CAPSULE.wheel, 0.035, 14]}
            />
            <meshStandardMaterial
              color="#202224"
              emissive="#ffd84d"
              emissiveIntensity={glow * 1.6}
              roughness={0.7}
            />
          </mesh>
        </group>
      );
    })}
  </>
);

export const Capsule: React.FC<CapsuleProps> = ({
  travel,
  hatch,
  door,
  wheelGlow = 0,
  oxygenGlow = 0,
  doorYaw = 0,
}) => {
  const { r, cabin0, cabin1, len } = CAPSULE;
  const spin = -travel / CAPSULE.wheel;
  const bars = 14;
  return (
    <group>
      {/* Oxygen bay with a window onto the tanks. */}
      <Shell y0={0.08} y1={cabin0} color={WHITE} open={1.4} />
      {/* Oxygen bottles round the wall, leaving the middle clear for the hatch. */}
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={x} position={[x, 0.55, i === 1 ? -0.16 : -0.07]} castShadow>
          <capsuleGeometry args={[0.055, 0.6, 4, 12]} />
          <meshStandardMaterial
            color={i === 1 ? "#2e8b4a" : "#3a9a57"}
            emissive="#7dffa0"
            emissiveIntensity={oxygenGlow * 0.9}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
      ))}
      {/* Escape hatch: a disc hinged at the back edge of the floor. */}
      <group position={[0, 0.08, -r]} rotation={[-hatch * 1.7, 0, 0]}>
        <mesh
          position={[0, -0.01, r]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[r - 0.01, r - 0.01, 0.025, 24]} />
          <meshStandardMaterial
            color="#8c9298"
            roughness={0.4}
            metalness={0.7}
          />
        </mesh>
      </group>
      <Ring y={0.08} />
      <Ring y={cabin0} color={RED} r={r + 0.012} />
      {/* Cabin floor and the cage: bars round the back, a hinged door of bars at the front. */}
      <mesh position={[0, cabin0 + 0.01, 0]}>
        <cylinderGeometry args={[r - 0.01, r - 0.01, 0.02, 24]} />
        <meshStandardMaterial color="#5a6066" roughness={0.6} metalness={0.5} />
      </mesh>
      {Array.from({ length: bars }, (_, k) => {
        const a = (k / bars) * Math.PI * 2;
        if (Math.cos(a - doorYaw) > 0.55) return null;
        return (
          <mesh
            key={k}
            position={[Math.sin(a) * r, (cabin0 + cabin1) / 2, Math.cos(a) * r]}
            castShadow
          >
            <cylinderGeometry args={[0.012, 0.012, cabin1 - cabin0, 6]} />
            <meshStandardMaterial
              color="#c8ccd0"
              roughness={0.35}
              metalness={0.7}
            />
          </mesh>
        );
      })}
      {/* Door: three bars on a hinge at one side of the opening. */}
      <group rotation={[0, doorYaw, 0]}>
        <group
          position={[Math.sin(0.99) * r, 0, Math.cos(0.99) * r]}
          rotation={[0, door * 1.9, 0]}
        >
          {[-0.18, 0, 0.18].map((dx, i) => {
            const a = dx * 2.6;
            return (
              <mesh
                key={i}
                position={[
                  Math.sin(a) * r - Math.sin(0.99) * r,
                  (cabin0 + cabin1) / 2,
                  Math.cos(a) * r - Math.cos(0.99) * r,
                ]}
                castShadow
              >
                <cylinderGeometry args={[0.012, 0.012, cabin1 - cabin0, 6]} />
                <meshStandardMaterial
                  color="#c8ccd0"
                  roughness={0.35}
                  metalness={0.7}
                />
              </mesh>
            );
          })}
        </group>
      </group>
      <Ring y={(cabin0 + cabin1) / 2} color={BLUE} />
      <Ring y={cabin1} color={BLUE} r={r + 0.012} />
      {/* Top section, cone cap, cable eye. */}
      <Shell y0={cabin1} y1={len - 0.22} color={WHITE} />
      <mesh position={[0, cabin1 + 0.25, 0]}>
        <cylinderGeometry args={[r + 0.004, r + 0.004, 0.14, 28, 1, true]} />
        <meshStandardMaterial
          color={RED}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, len - 0.11, 0]} castShadow>
        <coneGeometry args={[r, 0.22, 28]} />
        <meshStandardMaterial color={WHITE} roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, len + 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.05, 0.014, 8, 16]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.8} />
      </mesh>
      <Wheels y={0.3} spin={spin} glow={wheelGlow} />
      <Wheels y={len - 0.45} spin={spin} glow={wheelGlow} />
    </group>
  );
};
