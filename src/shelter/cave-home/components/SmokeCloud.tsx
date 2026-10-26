import React, { useMemo } from "react";
import {
  smokeKinematics,
  campfireKinematics,
  BEATS,
  WALL_X,
  CAVE_HEIGHT,
  FIRE_MID_X,
  FIRE_FRONT_X,
} from "../timeline";

interface SmokeCloudProps {
  frame: number;
}

export const SmokeCloud: React.FC<SmokeCloudProps> = ({ frame }) => {
  const { density, topVentOnly } = smokeKinematics(frame);
  const { isBurning, exists: fireExists } = campfireKinematics(frame);

  // Precomputed deterministic particle cycles
  const risingPuffs = useMemo(() => {
    const list = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      list.push({
        id: `rise-${i}`,
        offset: i / count,
        speed: 0.016 + (i % 3) * 0.003,
        driftZ: (i % 5 - 2) * 0.08,
        scaleSeed: 0.85 + (i % 4) * 0.1,
      });
    }
    return list;
  }, []);

  const ceilingPuffs = useMemo(() => {
    const list = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      list.push({
        id: `ceil-${i}`,
        xNorm: (i + 0.5) / count, // 0 to 1 along cave length
        baseZ: -1.2 + ((i * 3) % 7) * 0.35,
        speed: 0.008 + (i % 3) * 0.004,
        scale: 0.45 + (i % 4) * 0.12,
        phase: i * 0.7,
      });
    }
    return list;
  }, []);

  const ventPuffs = useMemo(() => {
    const list = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      list.push({
        id: `vent-${i}`,
        offset: i / count,
        speed: 0.022 + (i % 3) * 0.004,
        baseZ: -0.8 + ((i * 4) % 6) * 0.3,
        scale: 0.35 + (i % 3) * 0.1,
      });
    }
    return list;
  }, []);

  if (!fireExists || density < 0.01) return null;

  // Active campfire X coordinate
  const currentFireX = frame < BEATS.fireMoveStart ? FIRE_MID_X : FIRE_FRONT_X;

  return (
    <group>
      {/* 1. Vertical Wispy Rising Column from Campfire to Ceiling */}
      {isBurning && (
        <group>
          {risingPuffs.map((p) => {
            const t = (frame * p.speed + p.offset) % 1.0; // 0 (fire) to 1 (ceiling)
            const y = 0.4 + t * (CAVE_HEIGHT - 0.7);
            const x = currentFireX + Math.sin(t * Math.PI + frame * 0.06 + p.offset * 6) * 0.14;
            const z = p.driftZ * t;
            const r = (0.12 + t * 0.44) * p.scaleSeed;

            // Fade in from fire, hold in middle, disperse near ceiling
            let alpha = 0;
            if (t < 0.25) {
              alpha = (t / 0.25) * 0.20;
            } else if (t < 0.75) {
              alpha = 0.20;
            } else {
              alpha = (1 - (t - 0.75) / 0.25) * 0.20;
            }

            return (
              <mesh key={p.id} position={[x, y, z]}>
                <sphereGeometry args={[r, 7, 7]} />
                <meshStandardMaterial
                  color="#e4e2dd"
                  transparent
                  opacity={alpha * Math.min(1, density * 1.5)}
                  roughness={1.0}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 2. Ceiling Smoke Layer (Spreads along the curved roof vault) */}
      <group>
        {ceilingPuffs.map((p) => {
          // In topVentOnly phase, smoke drifts steadily towards the entrance (negative X)
          let x = 0;
          if (topVentOnly) {
            const cycle = ((frame * p.speed + p.xNorm) % 1.0);
            x = (WALL_X + 0.2) + (1 - cycle) * 5.2; // drifts right to left towards vent
          } else {
            x = WALL_X + 0.6 + p.xNorm * 4.8 + Math.sin(frame * 0.03 + p.phase) * 0.2;
          }

          const y = CAVE_HEIGHT - 0.35 + Math.sin(frame * 0.05 + p.phase) * 0.12;
          const z = p.baseZ + Math.cos(frame * 0.04 + p.phase) * 0.15;
          const alpha = topVentOnly ? density * 0.18 : density * 0.24;

          return (
            <mesh key={p.id} position={[x, y, z]}>
              <sphereGeometry args={[p.scale, 7, 7]} />
              <meshStandardMaterial
                color="#dedcd6"
                transparent
                opacity={alpha}
                roughness={1.0}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* 3. Smoke Vent Exhaust Stream (Active plumes flowing through the open transom gap to outside) */}
      {topVentOnly && (
        <group>
          {ventPuffs.map((p) => {
            const t = (frame * p.speed + p.offset) % 1.0;
            // Path: from inside transom (WALL_X + 0.2) to outside in the rain (WALL_X - 1.8)
            const x = (WALL_X + 0.2) - t * 2.0;
            const y = 3.1 + Math.sin(t * Math.PI * 0.5) * 0.25;
            const z = p.baseZ;
            const r = (0.22 + t * 0.38) * p.scale;
            const alpha = (1 - t * 0.85) * 0.22;

            return (
              <mesh key={p.id} position={[x, y, z]}>
                <sphereGeometry args={[r, 6, 6]} />
                <meshStandardMaterial
                  color="#e0ded9"
                  transparent
                  opacity={alpha}
                  roughness={1.0}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};
