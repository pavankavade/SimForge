import type React from "react";
import { random, useCurrentFrame } from "remotion";

/**
 * Someone punches through the ceiling from the floor above: at `at` a ragged
 * hole opens (dark, with a shaft of light from above) and stone chunks rain
 * down, bouncing once on the floor and settling.
 */
export interface CeilingBreachProps {
  x: number;
  at: number;
  ceilingY: number;
  z?: number;
}

export const CeilingBreach: React.FC<CeilingBreachProps> = ({ x, at, ceilingY, z = -0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const t = frame - at;
  const chunks = Array.from({ length: 9 }, (_, i) => {
    const dx = (random(`cb-x-${i}`) - 0.5) * 1.6;
    const dz = -0.55 - random(`cb-z-${i}`) * 0.9;
    const delay = random(`cb-d-${i}`) * 6;
    const s = 0.14 + random(`cb-s-${i}`) * 0.2;
    const tt = Math.max(0, t - delay);
    const fallT = Math.sqrt((2 * (ceilingY - s)) / 0.018);
    const y = tt < fallT ? ceilingY - 0.009 * tt * tt : s / 2 + 0.25 * Math.max(0, Math.sin(Math.PI * Math.min(1, (tt - fallT) / 8)));
    return { p: [x + dx * (1 + Math.min(tt, fallT) * 0.02), Math.max(s / 2, y), z + dz] as [number, number, number], s, r: tt < fallT ? tt * 0.2 : fallT * 0.2, key: `cb-${i}` };
  });
  return (
    <group>
      <mesh position={[x, ceilingY - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 9]} />
        <meshBasicMaterial color="#0b0a0d" />
      </mesh>
      <mesh position={[x, ceilingY - 1.6, z]}>
        <cylinderGeometry args={[0.7, 1.1, 3.2, 12, 1, true]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.06 * Math.min(1, t / 6) * Math.max(0, 1 - (t - 40) / 30)} depthWrite={false} side={2} />
      </mesh>
      {chunks.map((c) => (
        <mesh key={c.key} position={c.p} rotation={[c.r, c.r * 0.6, 0]} castShadow>
          <dodecahedronGeometry args={[c.s, 0]} />
          <meshStandardMaterial color="#5a5862" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};
