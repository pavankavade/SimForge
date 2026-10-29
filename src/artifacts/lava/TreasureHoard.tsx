import type React from "react";
import { random, useCurrentFrame } from "remotion";
import { G, INK_THIN, Part, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";

/**
 * The treasure at the end of every Season 2 hallway: heaped gold mounds,
 * chests spilling coins, a pedestal with a glowing gem, all in the ink &
 * vinyl style so it pops against the dark wall. Coins twinkle on a loop;
 * `splashAt` throws a fountain of coins (someone dived in).
 */
export interface TreasureHoardProps {
  x: number;
  z?: number;
  splashAt?: number;
  splashX?: number;
}

const GOLD = "#f2c14e";
const GOLD_DEEP = "#d9a02a";

const Chest: React.FC<{ position: [number, number, number]; rotation?: number; open?: boolean }> = ({ position, rotation = 0, open = true }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <Part geo={G.box(0.7, 0.42, 0.46, 0.05)} mat={vinyl("#7a4a28", "wood")} position={[0, 0.21, 0]} />
    {[-0.26, 0.26].map((dx) => (
      <Part key={dx} geo={G.box(0.06, 0.44, 0.48, 0.015)} mat={vinyl(GOLD, "gloss")} position={[dx, 0.21, 0]} ink={INK_THIN} />
    ))}
    <Part geo={G.sphere(0.2)} mat={vinyl(GOLD, "gloss")} position={[0, 0.4, 0]} scale={[1.5, 0.45, 0.95]} ink={false} />
    <group position={[0, 0.42, -0.23]} rotation={[open ? -1.9 : 0, 0, 0]}>
      <Part geo={G.box(0.7, 0.12, 0.46, 0.05)} mat={vinyl("#7a4a28", "wood")} position={[0, 0.06, 0.23]} />
    </group>
    <Part geo={G.box(0.1, 0.12, 0.03, 0.01)} mat={vinyl(GOLD, "gloss")} position={[0, 0.34, 0.24]} ink={INK_THIN} />
  </group>
);

export const TreasureHoard: React.FC<TreasureHoardProps> = ({ x, z = -0.6, splashAt, splashX }) => {
  const frame = useCurrentFrame();
  const sparkles = Array.from({ length: 9 }, (_, i) => {
    const period = 40 + Math.floor(random(`tw-p-${i}`) * 30);
    const t = ((frame + Math.floor(random(`tw-o-${i}`) * period)) % period) / period;
    return {
      p: [x - 2 + random(`tw-x-${i}`) * 4, 0.3 + random(`tw-y-${i}`) * 1.0, z + 0.3 + random(`tw-z-${i}`) * 0.6] as [number, number, number],
      s: t < 0.25 ? Math.sin((t / 0.25) * Math.PI) : 0,
      key: `tw-${i}`,
    };
  });
  const coins =
    splashAt !== undefined && frame >= splashAt && frame < splashAt + 40
      ? Array.from({ length: 22 }, (_, i) => {
          const t = frame - splashAt;
          const vx = (random(`cs-x-${i}`) - 0.5) * 0.12;
          const vy = 0.12 + random(`cs-y-${i}`) * 0.12;
          const vz = (random(`cs-z-${i}`) - 0.2) * 0.06;
          const y = 0.8 + vy * t - 0.008 * t * t;
          return { p: [(splashX ?? x) + vx * t, y, z + vz * t] as [number, number, number], r: t * 0.4 + i, key: `cs-${i}`, on: y > 0 };
        }).filter((c) => c.on)
      : [];
  return (
    <group>
      {/* Gold mounds */}
      {(
        [
          [-0.9, 0.6, 0.8],
          [0.3, 0.8, 0.95],
          [1.4, 0.5, 0.7],
          [-1.8, 0.4, 0.6],
        ] as const
      ).map(([dx, h, r], i) => (
        <group key={i} position={[x + dx, 0, z - 0.45 + (i % 2) * 0.25]}>
          <Part geo={G.sphere(r)} mat={vinyl(i % 2 ? GOLD : GOLD_DEEP, "gloss")} scale={[1, h / r, 0.7]} />
          {Array.from({ length: 6 }, (_, k) => (
            <mesh
              key={k}
              geometry={G.cyl(0.07, 0.07, 0.02, 12)}
              material={vinyl("#ffe08a", "gloss")}
              position={[(random(`cn-x-${i}-${k}`) - 0.5) * r * 1.4, 0.3 + random(`cn-y-${i}-${k}`) * h * 0.6, r * 0.55]}
              rotation={[1.2 + random(`cn-r-${i}-${k}`), 0, random(`cn-a-${i}-${k}`)]}
            />
          ))}
        </group>
      ))}
      <Chest position={[x - 2.6, 0, z + 0.25]} rotation={0.4} />
      <Chest position={[x + 2.2, 0, z + 0.1]} rotation={-0.5} />
      {/* Gem on a pedestal */}
      <group position={[x + 0.2, 0, z - 1.0]}>
        <Part geo={G.cyl(0.3, 0.38, 1.6, 16)} mat={vinyl("#6b6474", "cloth")} position={[0, 0.8, 0]} />
        <Part geo={G.cyl(0.42, 0.42, 0.1, 16)} mat={vinyl(GOLD, "gloss")} position={[0, 1.62, 0]} ink={INK_THIN} />
        <mesh geometry={G.sphere(0.24)} material={glow("#ff3a6a", 2.6)} position={[0, 1.95 + 0.04 * Math.sin(frame * 0.1), 0]} scale={[1, 1.3, 1]} />
        <GlowSprite position={[0, 1.95, 0.3]} color="#ff5a8a" size={1.8} opacity={0.6} />
      </group>
      {sparkles.map((s) => (s.s > 0 ? <GlowSprite key={s.key} position={s.p} color="#fff2b0" size={0.5 * s.s} opacity={0.9} /> : null))}
      {coins.map((c) => (
        <mesh key={c.key} geometry={G.cyl(0.07, 0.07, 0.02, 12)} material={vinyl("#ffe08a", "gloss")} position={c.p} rotation={[c.r, c.r * 0.7, 0]} />
      ))}
      <GlowSprite position={[x, 1.0, z + 0.4]} color="#ffcf5a" size={5.5} opacity={0.32} />
      <pointLight position={[x, 2.2, z + 1.6]} color="#ffd27a" intensity={5} distance={8} decay={2} />
    </group>
  );
};
