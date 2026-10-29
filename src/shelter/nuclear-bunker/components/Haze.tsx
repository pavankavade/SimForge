import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import { easeOutCubic, progress } from "../../../kit/motion";
import { DECK_Y, HAZE, HAZE_CLEAR, TUBE_BACK_Z, TUBE_X } from "../timeline";

/** Hot, stale air: soft orange puffs filling the pipe, cleared by the fan. */
export const Haze: React.FC<{ frame: number }> = ({ frame }) => {
  const puffs = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: TUBE_X + (random(`hz-x-${i}`) - 0.5) * 3,
        y: DECK_Y + 1.1 + random(`hz-y-${i}`) * 1.6,
        z: -0.6 + random(`hz-z-${i}`) * (TUBE_BACK_Z + 1.2),
        r: 0.55 + random(`hz-r-${i}`) * 0.5,
        p: random(`hz-p-${i}`) * Math.PI * 2,
      })),
    [],
  );
  const amount = easeOutCubic(progress(frame, HAZE)) * (1 - progress(frame, HAZE_CLEAR));
  if (amount <= 0) return null;
  return (
    <group>
      {puffs.map((h, i) => (
        <mesh key={i} position={[h.x + Math.sin(frame * 0.03 + h.p) * 0.15, h.y + Math.sin(frame * 0.02 + h.p) * 0.08, h.z]} scale={h.r * (0.6 + 0.4 * amount)}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={i % 2 ? "#e0893c" : "#c96a2c"} transparent opacity={0.3 * amount} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};
