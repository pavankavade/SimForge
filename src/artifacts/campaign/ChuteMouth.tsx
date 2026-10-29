import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeMetal } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

interface ChuteMouthProps {
  position: Vec3;
  /**
   * Which way the mouth opens: "down" hangs from a ceiling, "left"/"right"
   * sits in a wall facing that way, "up" is a floor hatch.
   */
  facing?: "down" | "up" | "left" | "right";
  radius?: number;
  /** Frame the chute slides/drops in (overshoot). */
  installFrame: number;
  /** Hatch flaps swing open here and stay open until `closeFrame`. */
  openFrame?: number;
  closeFrame?: number;
  /** Frames a victim is sucked in: the throat flashes and puffs. */
  gulps?: number[];
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ROT: Record<NonNullable<ChuteMouthProps["facing"]>, Vec3> = {
  down: [0, 0, 0],
  up: [0, 0, Math.PI],
  left: [0, 0, -Math.PI / 2],
  right: [0, 0, Math.PI / 2],
};

/**
 * The dungeon's disposal chute: a riveted iron funnel with a hazard-striped
 * rim and two hatch flaps, leading down to the Mimic's lair. Every act's
 * finale sends the last party down one of these. Local frame: the mouth opens
 * toward -y; `facing` rotates it into a ceiling, wall or floor.
 */
export const ChuteMouth: React.FC<ChuteMouthProps> = ({
  position,
  facing = "down",
  radius = 1.1,
  installFrame,
  openFrame = 1e6,
  closeFrame = 1e6,
  gulps = [],
}) => {
  const frame = useCurrentFrame();
  const iron = useSurface("chute-iron", () => makeMetal({ base: "#4a4f5a", seed: 141, roughness: 150 }), [2, 1]);
  if (frame < installFrame) return null;

  const install = interpolate(frame, [installFrame, installFrame + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) });
  const open =
    interpolate(frame, [openFrame, openFrame + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }) *
    interpolate(frame, [closeFrame, closeFrame + 6], [1, 0], clamp);
  const gulp = gulps.reduce((g, at) => Math.max(g, frame >= at ? Math.exp(-(frame - at) / 6) : 0), 0);
  const r = radius;
  const stripes = 16;

  return (
    <group position={position} rotation={ROT[facing]}>
      <group scale={[install, install, install]}>
        {/* Funnel body rising into the ceiling/wall */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[r * 0.72, r, 1.1, 24, 1, true]} />
          <meshStandardMaterial map={iron.map} normalMap={iron.normalMap} color="#8a909c" metalness={0.65} roughness={0.45} side={2} />
        </mesh>
        {/* Throat: dark with a hungry glow */}
        <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r * 0.72, 24]} />
          <meshBasicMaterial color={gulp > 0.05 ? "#3a1a10" : "#07080b"} />
        </mesh>
        <GlowSprite position={[0, 0.7, 0]} color="#ff7a3a" size={r * (1.4 + gulp * 2.2)} opacity={0.18 + gulp * 0.5} />
        {/* Hazard rim */}
        {Array.from({ length: stripes }, (_, i) => {
          const a = (i / stripes) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a, 0]} castShadow>
              <boxGeometry args={[0.16, 0.18, (Math.PI * 2 * r) / stripes + 0.01]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#f2c230" : "#17171b"} roughness={0.6} />
            </mesh>
          );
        })}
        {/* Rivets */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          return (
            <mesh key={`rv-${i}`} position={[Math.cos(a) * r * 0.86, 0.32, Math.sin(a) * r * 0.86]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.35} />
            </mesh>
          );
        })}
        {/* Hatch flaps hinged on the rim, swinging into the throat */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * r * 0.98, 0.02, 0]} rotation={[0, 0, side * open * 1.45]}>
            <mesh position={[-side * r * 0.49, 0, 0]} castShadow>
              <boxGeometry args={[r * 0.98, 0.07, r * 1.7]} />
              <meshStandardMaterial map={iron.map} color="#6c7280" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[-side * r * 0.49, -0.045, 0]}>
              <boxGeometry args={[r * 0.5, 0.02, 0.18]} />
              <meshStandardMaterial color="#f2c230" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
