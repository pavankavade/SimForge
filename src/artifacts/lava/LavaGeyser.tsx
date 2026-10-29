import type React from "react";
import { useCurrentFrame } from "remotion";
import { GlowSprite } from "../dungeon/Fx";

/**
 * A lava geyser vent in the lake: a cracked rock cone that pushes up out of
 * the lava on install (overshoot), smokes, then fires a molten column at each
 * frame in `eruptions`. The column peaks at `height` and falls back.
 */
export interface LavaGeyserProps {
  x: number;
  surfaceY: number;
  installFrame: number;
  eruptions: number[];
  height?: number;
  /** Frames from the first hiss to full height. */
  rise?: number;
  /** Vent stops working (frozen over) from this frame. */
  deadFrom?: number;
  z?: number;
}

const easeOutBack = (t: number, k = 1.7) => 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Column height 0..1 for an eruption starting at `at` (exported so riders can sit on it). */
export const geyserHeight = (frame: number, at: number, rise = 8) => {
  const t = frame - at;
  if (t < 0 || t > rise + 26) return 0;
  if (t < rise) return t / rise;
  return Math.max(0, 1 - ((t - rise) / 26) ** 2);
};

export const LavaGeyser: React.FC<LavaGeyserProps> = ({ x, surfaceY, installFrame, eruptions, height = 2.6, rise = 8, deadFrom = Infinity, z = -0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const up = easeOutBack(clamp01((frame - installFrame) / 14));
  const live = frame < deadFrom;
  const h = live ? Math.max(0, ...eruptions.map((at) => geyserHeight(frame, at, rise))) : 0;
  const col = h * height;
  const wob = 1 + 0.08 * Math.sin(frame * 0.9);
  return (
    <group position={[x, surfaceY, z]}>
      {/* Vent cone */}
      <group position={[0, -0.5 + 0.55 * up, 0]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.55, 0.6, 10]} />
          <meshStandardMaterial color="#3a2622" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshBasicMaterial color={live ? "#ffb347" : "#2a3446"} toneMapped={false} />
        </mesh>
      </group>
      {col > 0.02 ? (
        <group position={[0, 0.05, 0]}>
          <mesh position={[0, col / 2, 0]} scale={[wob, 1, wob]}>
            <cylinderGeometry args={[0.24, 0.34, col, 14, 1, true]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff6a1a" emissiveIntensity={2.2} side={2} />
          </mesh>
          <mesh position={[0, col, 0]} scale={[1.2 * wob, 0.7, 1.2 * wob]}>
            <sphereGeometry args={[0.36, 14, 10]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ff8a2a" emissiveIntensity={2.4} />
          </mesh>
          <GlowSprite position={[0, col * 0.6, 0.3]} color="#ff8a2a" size={2.4 + col * 0.5} opacity={0.55} />
          <pointLight position={[0, col * 0.5, 0.8]} color="#ff8a3a" intensity={6 * h} distance={7} decay={2} />
        </group>
      ) : null}
    </group>
  );
};
