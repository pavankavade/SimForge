import type React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface TriggerTileProps {
  x: number;
  triggerAt: number;
  showAt?: number;
  z?: number;
}

/** A pressure tile with a faint rune that glows red and sinks when touched. */
export const TriggerTile: React.FC<TriggerTileProps> = ({ x, triggerAt, showAt = 0, z = -0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < showAt) return null;
  const on = progress(frame, [triggerAt, triggerAt + 3]);
  const pulse = on > 0 ? 0.7 + 0.3 * Math.sin((frame - triggerAt) * 0.8) : 0;
  return (
    <group position={[x, 0.012 - on * 0.02, z]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.55, 0.03, 0.55]} />
        <meshStandardMaterial color={on > 0 ? "#6a2a24" : "#5e5a56"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.17, 6]} />
        <meshBasicMaterial color={on > 0 ? "#ff3a2a" : "#8a8278"} transparent opacity={on > 0 ? 1 : 0.6} toneMapped={false} />
      </mesh>
      {on > 0 ? <GlowSprite position={[0, 0.12, 0.1]} color="#ff3a2a" size={1.1} opacity={0.6 * pulse} /> : null}
    </group>
  );
};
