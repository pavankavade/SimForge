import type React from "react";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, RIG, flat, onSphere, vinyl, type AdventurerClass } from "../characters/hero";

interface SkeletonProps {
  /** Keeps the victim's headgear so you can tell who it was. */
  variant: AdventurerClass;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  animFrame?: number;
}

const BONE = "#f1e7cc";
const BONE_DARK = "#d6c69f";
const SOCKET = "#1f1418";

const bone = () => vinyl(BONE, "bone");
const boneDark = () => vinyl(BONE_DARK, "bone");

/** Two-segment bone limb with knobbly joints; `foot` adds a boot-sized foot bone. */
const Limb: React.FC<{ position: Vec3; rotation: Vec3; upper: number; lower: number; bend: number; foot?: boolean }> = ({
  position,
  rotation,
  upper,
  lower,
  bend,
  foot,
}) => (
  <group position={position} rotation={rotation}>
    <Part geo={G.sphere(0.055)} mat={boneDark()} ink={INK_THIN} />
    <Part geo={G.capsule(0.034, upper)} mat={bone()} position={[0, -upper / 2, 0]} ink={INK_THIN} />
    <group position={[0, -upper, 0]} rotation={[bend, 0, 0]}>
      <Part geo={G.sphere(0.05)} mat={boneDark()} ink={INK_THIN} />
      {[-0.02, 0.02].map((dx) => (
        <Part key={dx} geo={G.capsule(0.02, lower)} mat={bone()} position={[dx, -lower / 2, 0]} ink={INK_THIN} />
      ))}
      {foot ? (
        <Part geo={G.box(0.11, 0.06, 0.2, 0.025)} mat={boneDark()} position={[0, -lower - 0.02, 0.05]} ink={INK_THIN} />
      ) : (
        <Part geo={G.sphere(0.05)} mat={boneDark()} position={[0, -lower - 0.02, 0]} scale={[0.9, 1.1, 0.7]} ink={INK_THIN} />
      )}
    </group>
  </group>
);

const Headgear: React.FC<{ variant: AdventurerClass; r: number; sway: number }> = ({ variant, r, sway }) => {
  switch (variant) {
    case "goblin":
      return (
        <group position={[0, 0.06, 0]} rotation={[-0.2, 0, 0.25]}>
          <Part geo={G.sphere(r * 1.08, 0, Math.PI * 0.4)} inkGeo={G.sphere(r * 1.08, 0, Math.PI * 0.4)} mat={vinyl("#9c6a44", "metal")} />
          <Part
            geo={G.torus(r * 1.08 * Math.sin(Math.PI * 0.4), 0.026)}
            mat={vinyl("#7d5536", "metal")}
            position={[0, r * 1.08 * Math.cos(Math.PI * 0.4), 0]}
            rotation={[Math.PI / 2, 0, 0]}
            ink={INK_THIN}
          />
        </group>
      );
    case "rogue":
      return (
        <Part
          geo={G.sphere(r + 0.035, 0, Math.PI * 0.55, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8)}
          inkGeo={G.sphere(r + 0.035, 0, Math.PI * 0.55)}
          mat={vinyl("#2f6f62", "cloth")}
          position={[0, 0.02, -0.01]}
        />
      );
    case "mage":
      return (
        <group position={[0, 0.14, -0.01]} rotation={[-0.15 + sway * 0.4, 0, 0.12]}>
          <Part geo={G.cyl(0.38, 0.4, 0.035, 36)} mat={vinyl("#383ba8", "cloth")} />
          <Part geo={G.cyl(0.19, 0.24, 0.24, 28)} mat={vinyl("#4b4fd1", "cloth")} position={[0, 0.12, 0]} />
          <group position={[0, 0.24, 0]} rotation={[-0.6, 0, 0]}>
            <Part geo={G.cone(0.19, 0.36, 24)} mat={vinyl("#4b4fd1", "cloth")} position={[0, 0.16, 0]} />
          </group>
        </group>
      );
    case "paladin":
      return (
        <group position={[0, 0.02, -0.005]} rotation={[0.15, 0, -0.1]}>
          <Part
            geo={G.sphere(r + 0.03, 0, Math.PI * 0.55, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5)}
            inkGeo={G.sphere(r + 0.03, 0, Math.PI * 0.55)}
            mat={vinyl("#d9e1ec", "metal")}
          />
          {[0, 1, 2].map((i) => (
            <Part key={i} geo={G.sphere(0.08 - i * 0.015)} mat={vinyl("#e84a44", "cloth")} position={[0, r + 0.06 - i * 0.07, -0.06 - i * 0.11]} scale={[0.7, 1, 1.15]} />
          ))}
        </group>
      );
  }
};

/**
 * Cartoon skeleton on the hero rig proportions (feet at the origin, facing +z)
 * so a digested character can be swapped in place. Keeps the victim's
 * headgear so the audience can tell who it was.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ variant, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, animFrame = 0 }) => {
  const sway = Math.sin(animFrame * 0.08) * 0.12;
  const jaw = 0.15 + 0.12 * Math.max(0, Math.sin(animFrame * 0.21));
  const r = 0.23;
  const s = variant === "goblin" ? 0.82 : variant === "paladin" ? 1.06 : 1;
  return (
    <group position={position} rotation={rotation} scale={scale * s}>
      {/* Pelvis + spine */}
      <Part geo={G.torus(0.11, 0.04)} mat={bone()} position={[0, RIG.hipY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.2, 0.8, 1]} ink={INK_THIN} />
      {Array.from({ length: 6 }, (_, i) => (
        <Part key={i} geo={G.cyl(0.036, 0.036, 0.05, 12)} mat={i % 2 ? boneDark() : bone()} position={[0, 0.67 + i * 0.075, -0.05]} ink={INK_THIN} />
      ))}
      {/* Ribcage */}
      {[0, 1, 2].map((i) => (
        <Part
          key={i}
          geo={G.torus(0.17 - i * 0.015, 0.022, Math.PI * 1.55)}
          mat={bone()}
          position={[0, 1.02 - i * 0.09, -0.02]}
          rotation={[Math.PI / 2, 0, Math.PI / 2 + Math.PI * 0.225]}
          scale={[1, 0.8, 1]}
          ink={INK_THIN}
        />
      ))}
      <Part geo={G.box(0.05, 0.24, 0.04, 0.015)} mat={bone()} position={[0, 0.94, 0.12]} ink={INK_THIN} />
      <Part geo={G.capsule(0.025, 0.56)} mat={bone()} position={[0, 1.07, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />

      {/* Skull */}
      <group position={[0, RIG.headY, 0]} rotation={[0.1 + sway * 0.3, 0, sway * 0.6]}>
        <Part geo={G.sphere(r)} mat={bone()} scale={[1, 0.98, 1]} />
        <Part geo={G.sphere(r * 0.72)} mat={bone()} position={[0, -0.1, 0.06]} scale={[0.95, 0.75, 0.9]} />
        {([-1, 1] as const).map((side) => (
          <mesh key={side} geometry={G.sphere(0.062)} material={flat(SOCKET)} position={onSphere(r - 0.035, side * 0.36, 0.06)} scale={[1, 1.12, 0.5]} />
        ))}
        <mesh geometry={G.cone(0.03, 0.05, 3)} material={flat(SOCKET)} position={onSphere(r - 0.004, 0, 0.3)} rotation={[0, 0, Math.PI]} />
        <group position={[0, -0.12, 0.02]} rotation={[jaw, 0, 0]}>
          <Part geo={G.box(0.24, 0.07, 0.17, 0.03)} mat={bone()} position={[0, -0.05, 0.08]} />
          {[-0.06, -0.02, 0.02, 0.06].map((dx) => (
            <mesh key={dx} geometry={G.box(0.03, 0.035, 0.02, 0.008)} material={vinyl("#fffaf0", "gloss")} position={[dx, -0.01, 0.165]} />
          ))}
        </group>
        <Headgear variant={variant} r={r} sway={sway} />
      </group>

      {/* Arms + legs */}
      <Limb position={[-RIG.shoulderX, RIG.shoulderY, 0]} rotation={[-0.5 + sway, 0, -0.6]} upper={0.2} lower={0.19} bend={-0.6} />
      <Limb position={[RIG.shoulderX, RIG.shoulderY, 0]} rotation={[-0.4 - sway, 0, 0.65]} upper={0.2} lower={0.19} bend={-0.5} />
      <Limb position={[-RIG.hipX, RIG.hipY, 0]} rotation={[0.3 + sway * 0.5, 0, -0.12]} upper={RIG.thigh} lower={RIG.shin} bend={0.5} foot />
      <Limb position={[RIG.hipX, RIG.hipY, 0]} rotation={[-0.2 - sway * 0.5, 0, 0.12]} upper={RIG.thigh} lower={RIG.shin} bend={0.35} foot />
    </group>
  );
};
