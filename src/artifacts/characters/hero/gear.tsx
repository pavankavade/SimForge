import type React from "react";
import type { Vec3 } from "../../../engine/types";
import { G, INK_THIN, glow, vinyl } from "./ink";
import { Part } from "./Part";

/**
 * Hand-held gear. Every item is modelled in "hand space": the grip runs along
 * the y axis through the fist at the origin, the business end points to -y
 * (down when the arm hangs, overhead in a windup).
 */

const STEEL = "#d9e1ec";
const STEEL_DARK = "#8c96a8";
const GOLD = "#f2c14e";
const LEATHER = "#5a3a24";
const WOOD = "#7a4f2c";

export const Sword: React.FC<{ length?: number; tilt?: number }> = ({ length = 0.62, tilt = -0.35 }) => (
  <group rotation={[tilt, 0, 0]}>
    <Part geo={G.cyl(0.026, 0.03, 0.15, 10)} mat={vinyl(LEATHER, "leather")} position={[0, 0.07, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.04)} mat={vinyl(GOLD, "gold")} position={[0, 0.16, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.24, 0.045, 0.07, 0.02)} mat={vinyl(GOLD, "gold")} position={[0, -0.03, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.075, length, 0.026, 0.012)} mat={vinyl(STEEL, "metal")} position={[0, -0.05 - length / 2, 0]} />
    <Part
      geo={G.cone(0.0375, 0.12, 4)}
      mat={vinyl(STEEL, "metal")}
      position={[0, -0.05 - length - 0.05, 0]}
      rotation={[Math.PI, Math.PI / 4, 0]}
      scale={[1, 1, 0.35]}
    />
    <mesh geometry={G.box(0.016, length * 0.85, 0.03, 0.006)} material={vinyl(STEEL_DARK, "metal")} position={[0, -0.05 - length * 0.45, 0]} />
  </group>
);

export const Dagger: React.FC<{ tilt?: number }> = ({ tilt = -0.25 }) => (
  <group rotation={[tilt, 0, 0]}>
    <Part geo={G.cyl(0.022, 0.024, 0.11, 8)} mat={vinyl(LEATHER, "leather")} position={[0, 0.06, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.14, 0.035, 0.05, 0.015)} mat={vinyl(GOLD, "gold")} position={[0, -0.03, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.06, 0.24, 0.022, 0.01)} mat={vinyl(STEEL, "metal")} position={[0, -0.17, 0]} />
    <Part geo={G.cone(0.03, 0.09, 4)} mat={vinyl(STEEL, "metal")} position={[0, -0.33, 0]} rotation={[Math.PI, Math.PI / 4, 0]} scale={[1, 1, 0.35]} />
  </group>
);

export const Warhammer: React.FC = () => (
  <group>
    <Part geo={G.cyl(0.032, 0.036, 0.95, 10)} mat={vinyl(WOOD, "wood")} position={[0, -0.3, 0]} />
    {[0.1, -0.12].map((y) => (
      <Part key={y} geo={G.cyl(0.044, 0.044, 0.05, 10)} mat={vinyl(GOLD, "gold")} position={[0, y, 0]} ink={INK_THIN} />
    ))}
    <Part geo={G.box(0.24, 0.26, 0.5, 0.05)} mat={vinyl(STEEL, "metal")} position={[0, -0.78, 0]} />
    {[-0.22, 0.22].map((z) => (
      <Part key={z} geo={G.box(0.28, 0.3, 0.07, 0.025)} mat={vinyl(GOLD, "gold")} position={[0, -0.78, z]} />
    ))}
    <Part geo={G.cone(0.05, 0.14, 8)} mat={vinyl(STEEL, "metal")} position={[0, -0.98, 0]} rotation={[Math.PI, 0, 0]} />
  </group>
);

/** Double-bitted greataxe: long haft through the fist, blades out front and back. */
export const Greataxe: React.FC = () => (
  <group rotation={[-0.2, 0, 0]}>
    <Part geo={G.cyl(0.034, 0.04, 0.92, 10)} mat={vinyl(WOOD, "wood")} position={[0, -0.26, 0]} />
    {[0.12, -0.1].map((y) => (
      <Part key={y} geo={G.cyl(0.046, 0.046, 0.06, 10)} mat={vinyl(LEATHER, "leather")} position={[0, y, 0]} ink={INK_THIN} />
    ))}
    <Part geo={G.box(0.12, 0.18, 0.14, 0.03)} mat={vinyl("#5c6170", "gloss")} position={[0, -0.6, 0]} />
    {[-1, 1].map((s) => (
      <group key={s} position={[0, -0.6, s * 0.17]}>
        <Part geo={G.sphere(0.21)} mat={vinyl("#c3cad6", "gloss")} scale={[0.16, 1, 0.6]} />
        <mesh geometry={G.box(0.035, 0.32, 0.03, 0.01)} material={vinyl("#eef2f7", "gloss")} position={[0, 0, s * 0.115]} />
      </group>
    ))}
    <Part geo={G.cone(0.035, 0.1, 8)} mat={vinyl("#c3cad6", "gloss")} position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]} />
  </group>
);

export const SpikedClub: React.FC = () => (
  <group rotation={[-0.3, 0, 0]}>
    <Part geo={G.cyl(0.03, 0.035, 0.18, 8)} mat={vinyl("#4a3020", "leather")} position={[0, 0.05, 0]} ink={INK_THIN} />
    <Part geo={G.cyl(0.085, 0.035, 0.48, 12)} mat={vinyl("#8a5a32", "wood")} position={[0, -0.25, 0]} />
    {(
      [
        [0.08, -0.3, 0, 0, 0, -1.57],
        [-0.08, -0.38, 0, 0, 0, 1.57],
        [0, -0.42, 0.08, 1.57, 0, 0],
        [0, -0.24, -0.07, -1.57, 0, 0],
        [0, -0.5, 0, Math.PI, 0, 0],
      ] as const
    ).map(([x, y, z, rx, ry, rz], i) => (
      <Part key={i} geo={G.cone(0.022, 0.07, 6)} mat={vinyl("#cfd3d8", "metal")} position={[x, y, z]} rotation={[rx, ry, rz]} ink={INK_THIN} />
    ))}
  </group>
);

export const Staff: React.FC<{ orb?: string; frame?: number; light?: boolean }> = ({ orb = "#5fe8ff", frame = 0, light = true }) => {
  const pulse = 1 + 0.08 * Math.sin(frame * 0.2);
  return (
    <group position={[0, 0.25, 0.02]} rotation={[0.05, 0, 0]}>
      <Part geo={G.cyl(0.028, 0.036, 1.55, 10)} mat={vinyl(WOOD, "wood")} position={[0, 0.1, 0]} />
      {/* Gnarled claw cradling the orb */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <Part
            key={i}
            geo={G.capsule(0.022, 0.2)}
            mat={vinyl(WOOD, "wood")}
            position={[Math.cos(a) * 0.07, 0.95, Math.sin(a) * 0.07]}
            rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]}
            ink={INK_THIN}
          />
        );
      })}
      <Part geo={G.cyl(0.06, 0.04, 0.06, 12)} mat={vinyl(GOLD, "gold")} position={[0, 0.86, 0]} ink={INK_THIN} />
      <mesh geometry={G.sphere(0.1)} material={glow(orb, 2.4)} position={[0, 1.02, 0]} scale={pulse} />
      {light ? <pointLight position={[0, 1.02, 0]} color={orb} intensity={1.6} distance={3.2} decay={2} /> : null}
    </group>
  );
};

/** Heater shield; the face points to local -x (outward from a left forearm). */
export const HeaterShield: React.FC<{ color?: string; position?: Vec3; rotation?: Vec3; scale?: number }> = ({
  color = "#c43a36",
  position,
  rotation,
  scale = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Wooden body (a metal back reflects the dark set and reads as a black slab) */}
    <Part geo={G.box(0.07, 0.6, 0.5, 0.03)} mat={vinyl("#8a5a36", "wood")} />
    <Part geo={G.cone(0.25, 0.2, 4)} mat={vinyl("#8a5a36", "wood")} position={[0, -0.38, 0]} rotation={[Math.PI, Math.PI / 4, 0]} scale={[0.28, 1, 1.41]} />
    <mesh geometry={G.box(0.02, 0.5, 0.4, 0.008)} material={vinyl(color, "gloss")} position={[-0.033, 0.02, 0]} />
    <mesh geometry={G.cone(0.2, 0.15, 4)} material={vinyl(color, "gloss")} position={[-0.026, -0.3, 0]} rotation={[Math.PI, Math.PI / 4, 0]} scale={[0.1, 1, 1.41]} />
    {/* Gold cross */}
    <mesh geometry={G.box(0.02, 0.46, 0.07, 0.01)} material={vinyl(GOLD, "gold")} position={[-0.045, -0.03, 0]} />
    <mesh geometry={G.box(0.02, 0.07, 0.34, 0.01)} material={vinyl(GOLD, "gold")} position={[-0.045, 0.08, 0]} />
    <Part geo={G.sphere(0.055)} mat={vinyl(GOLD, "gold")} position={[-0.05, 0.08, 0]} scale={[0.6, 1, 1]} ink={INK_THIN} />
  </group>
);

/** Walking cane: crook over the fist, shaft down to the floor (`length` in body units). */
export const Cane: React.FC<{ length?: number }> = ({ length = 0.8 }) => (
  <group position={[0, 0, 0.03]}>
    <Part geo={G.cyl(0.022, 0.026, length, 10)} mat={vinyl(WOOD, "wood")} position={[0, -length / 2 + 0.04, 0]} />
    <Part geo={G.torus(0.06, 0.024, Math.PI)} mat={vinyl(WOOD, "wood")} position={[0, 0.04, 0.06]} rotation={[0, Math.PI / 2, 0]} ink={INK_THIN} />
    <Part geo={G.cyl(0.03, 0.03, 0.03, 10)} mat={vinyl("#2b2b2b", "leather")} position={[0, -length + 0.055, 0]} ink={INK_THIN} />
  </group>
);
