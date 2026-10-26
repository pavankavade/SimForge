import type React from "react";
import { useCurrentFrame } from "remotion";
import { easeOutBack, progress } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface MirrorPanelsProps {
  /** Pop-in frame of each of the five panels: left low, right low, left high, right high, ceiling. */
  pops: number[];
  inner: number;
  /** Bounce frames and the side hit (+1 right wall, -1 left wall). */
  flashes?: { at: number; side: number }[];
  z?: number;
  ceilingY?: number;
}

const SLOTS = [
  { side: -1, y: 0.9 },
  { side: 1, y: 0.9 },
  { side: -1, y: 2.05 },
  { side: 1, y: 2.05 },
  { side: 0, y: 0 },
] as const;

/** Hexagonal arcane deflection mirrors riding the walls' inner faces (and one under the ceiling). */
export const MirrorPanels: React.FC<MirrorPanelsProps> = ({ pops, inner, flashes = [], z = -0.6, ceilingY = 3.2 }) => {
  const frame = useCurrentFrame();
  const flash = (side: number) =>
    flashes.reduce((s, f) => (f.side === side && frame >= f.at && frame < f.at + 5 ? Math.max(s, 1 - (frame - f.at) / 5) : s), 0);
  return (
    <group>
      {SLOTS.map((slot, i) => {
        const at = pops[i];
        if (at === undefined || frame < at) return null;
        const k = easeOutBack(progress(frame, [at, at + 8]));
        const shine = 0.35 + 0.15 * Math.sin(frame * 0.2 + i) + (slot.side !== 0 ? flash(slot.side) * 0.65 : 0);
        const ceiling = slot.side === 0;
        const position: [number, number, number] = ceiling ? [0.95, ceilingY - 0.03, z] : [slot.side * (inner - 0.08), slot.y, z];
        // Hex disc facing into the room (x for walls, down for the ceiling).
        const rotation: [number, number, number] = ceiling ? [0, Math.PI / 6, 0] : [Math.PI / 6, 0, Math.PI / 2];
        return (
          <group key={i} position={position} scale={k}>
            <mesh rotation={rotation}>
              <cylinderGeometry args={[0.42, 0.42, 0.05, 6]} />
              <meshStandardMaterial color="#d6c4ff" emissive="#9a6aff" emissiveIntensity={shine} metalness={0.6} roughness={0.08} />
            </mesh>
            <mesh rotation={rotation}>
              <cylinderGeometry args={[0.48, 0.48, 0.035, 6]} />
              <meshStandardMaterial color="#e9c46a" roughness={0.35} metalness={0.3} />
            </mesh>
            <GlowSprite position={[ceiling ? 0 : -slot.side * 0.1, ceiling ? -0.1 : 0, 0.5]} color="#b58aff" size={0.9} opacity={0.18 + shine * 0.3} />
          </group>
        );
      })}
    </group>
  );
};
