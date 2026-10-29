import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { clamp01, easeOutCubic, progress } from "../../../kit/motion";
import { BEATS, CLOUD_FADE, CLOUD_GROW, FALLOUT_DECAY, FALLOUT_LAND, FLASH, GROUND_Y } from "../timeline";

/** Where the bomb went off: far behind the yard, up and to the right. */
const BOMB: [number, number, number] = [20, 0, -70];

const SPECKS = 240;
const FALL_SPEED = 0.42;

/**
 * The bomb: a flash on the horizon on "drops", the mushroom cloud on
 * "explosion" with dirt sucked up off the lawn, then glowing fallout that
 * rains back down, settles on the grass and fades as it decays overnight.
 */
export const Blast: React.FC<{ frame: number }> = ({ frame }) => {
  const specks = useMemo(
    () =>
      Array.from({ length: SPECKS }, (_, i) => ({
        x: (random(`fo-x-${i}`) - 0.5) * 22,
        z: -0.3 - random(`fo-z-${i}`) * 16,
        land: FALLOUT_LAND[0] + random(`fo-t-${i}`) * (FALLOUT_LAND[1] - FALLOUT_LAND[0]),
        size: 0.035 + random(`fo-s-${i}`) * 0.035,
      })),
    [],
  );
  const sucked = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (random(`su-x-${i}`) - 0.5) * 14,
        z: -2 - random(`su-z-${i}`) * 12,
        t0: BEATS.explosion + 6 + random(`su-t-${i}`) * 50,
        s: 0.06 + random(`su-s-${i}`) * 0.08,
      })),
    [],
  );

  // Flash: a hot dome on the horizon that blooms and dies.
  const fl = progress(frame, FLASH);
  const flashScale = fl <= 0 || fl >= 1 ? 0 : easeOutCubic(Math.min(1, fl * 5)) * (1 - fl * 0.6);

  // Cloud: stem and cap grow, the cap rolls, then the whole thing thins out.
  const grow = easeOutCubic(progress(frame, CLOUD_GROW));
  const fade = 1 - progress(frame, CLOUD_FADE);
  const cloudOn = frame >= CLOUD_GROW[0] && fade > 0;
  const roll = (frame - CLOUD_GROW[0]) * 0.01;

  const decay = 1 - progress(frame, FALLOUT_DECAY);

  return (
    <group>
      {flashScale > 0 ? (
        <group position={BOMB}>
          <mesh scale={flashScale * 26}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial color="#ffd58a" transparent opacity={0.9 * (1 - fl)} toneMapped={false} />
          </mesh>
          <mesh scale={flashScale * 42}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial color="#ff9a4a" transparent opacity={0.35 * (1 - fl)} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ) : null}

      {cloudOn ? (
        <group position={BOMB} scale={[grow, grow, grow]}>
          {/* Stem */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={`s${i}`} position={[Math.sin(i * 1.7 + roll) * 0.8, 6 + i * 7, 0]} scale={[5 - i * 0.35, 6, 5 - i * 0.35]}>
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial color={i % 2 ? "#a8988a" : "#bcae9e"} roughness={1} transparent opacity={fade} />
            </mesh>
          ))}
          {/* Cap */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 + roll;
            const r = 11 + (i % 3) * 2;
            return (
              <mesh key={`c${i}`} position={[Math.cos(a) * r, 48 + Math.sin(a * 2) * 3, Math.sin(a) * r * 0.6]} scale={9 + (i % 4) * 1.5}>
                <sphereGeometry args={[1, 18, 12]} />
                <meshStandardMaterial color={i % 3 ? "#c7b6a2" : "#a8927c"} roughness={1} transparent opacity={fade} />
              </mesh>
            );
          })}
          <mesh position={[0, 54, 0]} scale={[16, 10, 12]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#d2c2ae" roughness={1} transparent opacity={fade} />
          </mesh>
          {/* Fire glow inside the cap, early on */}
          <mesh position={[0, 46, 6]} scale={14 * (1 - progress(frame, [CLOUD_GROW[0], CLOUD_GROW[1] + 20]))}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color="#ff8a3a" transparent opacity={0.55} toneMapped={false} />
          </mesh>
        </group>
      ) : null}

      {/* Dirt sucked up off the lawn into the sky */}
      {sucked.map((p, i) => {
        const t = frame - p.t0;
        if (t < 0 || t > 60) return null;
        const y = 0.05 + 0.004 * t * t;
        return (
          <mesh key={`su${i}`} position={[p.x + t * 0.06, y, p.z - t * 0.12]} scale={p.s * (1 - t / 80)}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#6a4a30" roughness={1} />
          </mesh>
        );
      })}

      {/* Fallout: falls, lands, glows, decays */}
      {decay > 0
        ? specks.map((p, i) => {
            const yFall = GROUND_Y + 0.03 + (p.land - frame) * FALL_SPEED;
            if (yFall > 16) return null;
            const landed = frame >= p.land;
            const pulse = 0.75 + 0.25 * Math.sin(frame * 0.3 + i);
            return (
              <mesh key={i} position={[p.x, landed ? GROUND_Y + 0.03 : yFall, p.z]} scale={landed ? [p.size * 1.4, p.size * 0.6, p.size * 1.4] : [p.size, p.size * 2.6, p.size]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial
                  color={new THREE.Color("#d8ff4a").multiplyScalar(landed ? pulse * clamp01(decay) * 1.6 : 1.6)}
                  toneMapped={false}
                  transparent
                  opacity={clamp01(decay * 1.4)}
                />
              </mesh>
            );
          })
        : null}
    </group>
  );
};
