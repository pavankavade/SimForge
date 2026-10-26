import type React from "react";
import { useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";
import { clamp01, easeOutBack } from "../../kit";

interface DungeonPressurePlateProps {
  position: Vec3;
  spawnFrame: number;
  /** [down, up] frames while someone (or something) stands on it. */
  pressWindows: ReadonlyArray<readonly [number, number]>;
  size?: number;
}

/**
 * Bronze pressure plate in a stone collar. Pops up out of the floor when
 * installed, sinks and lights its rune while pressed.
 */
export const DungeonPressurePlate: React.FC<DungeonPressurePlateProps> = ({ position, spawnFrame, pressWindows, size = 0.9 }) => {
  const frame = useCurrentFrame();
  if (frame < spawnFrame) return null;
  const pop = easeOutBack(clamp01((frame - spawnFrame) / 14), 2.2);
  const pressed = pressWindows.some(([a, b]) => frame >= a && frame < b);
  const justPressed = pressWindows.some(([a]) => frame >= a && frame < a + 10);
  const sink = pressed ? 0.035 : 0;
  return (
    <group position={position} scale={[pop, Math.max(0.01, pop), pop]}>
      <Part geo={G.box(size + 0.2, 0.06, size + 0.2, 0.025)} mat={vinyl("#3d404d", "cloth")} position={[0, 0.03, 0]} ink={INK_THIN} />
      <Part geo={G.box(size, 0.06, size, 0.03)} mat={vinyl(pressed ? "#e09a3c" : "#b8823e", "leather")} position={[0, 0.06 - sink, 0]} ink={INK_THIN} />
      {/* Engraved skull rune on top */}
      <mesh geometry={G.disc(size * 0.22)} material={pressed ? glow("#ff6a3d", 2.2) : flat("#5b3a1c")} position={[0, 0.093 - sink, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={G.disc(size * 0.05)} material={flat("#2a1a0e")} position={[s * size * 0.08, 0.095 - sink, -size * 0.03]} rotation={[-Math.PI / 2, 0, 0]} />
      ))}
      {justPressed ? <GlowSprite position={[0, 0.2, 0]} size={1.3} color="#ff8a3d" opacity={0.7} /> : null}
    </group>
  );
};
