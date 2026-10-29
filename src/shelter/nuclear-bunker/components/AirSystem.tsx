import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { clamp01, easeOutBack, easeOutCubic, lerp, progress } from "../../../kit/motion";
import {
  AIR_GROW,
  AIR_R,
  AIR_X,
  BEATS,
  HAZE_CLEAR,
  SHOCK_RUN,
  VALVE_OPEN_AGAIN,
  VALVE_SHUT,
  VALVE_Y,
  lineEnd,
  tubeWallY,
} from "../timeline";

const Z = 0.26;
const TOP = 0.75;
const BOTTOM = tubeWallY(AIR_X) - 0.05;
/** Filter and fan hang from the pipe's roof just inside the open end. */
const FILTER_Y = BOTTOM - 0.45;
const FAN_Y = BOTTOM - 1.05;
const IN_Z = -0.25;
/** Second blast: the ball that hits the closed valve. */
const BLAST2 = [VALVE_SHUT - 6, VALVE_SHUT] as const;

const Ball: React.FC<{ p: [number, number, number]; s?: number }> = ({ p, s = 1 }) => (
  <group position={p}>
    <mesh scale={0.22 * s}>
      <sphereGeometry args={[1, 18, 12]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
    <mesh scale={0.45 * s}>
      <sphereGeometry args={[1, 18, 12]} />
      <meshBasicMaterial color="#cfe8ff" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

/**
 * The air system: a pipe run up to the surface with a mushroom cap, a dust
 * filter and a hand-cranked fan inside, blue air pouring in. Then the
 * shockwave ball shoots down it, and the blast valve (a see-through section so
 * the flap shows) slams shut in front of the next one.
 */
export const AirSystem: React.FC<{ frame: number }> = ({ frame }) => {
  const flow = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({ t0: random(`af-t-${i}`) * 40, side: random(`af-s-${i}`) - 0.5, d: random(`af-d-${i}`) })),
    [],
  );
  if (frame < AIR_GROW[0]) return null;

  const grow = easeOutCubic(progress(frame, AIR_GROW));
  const len = (TOP - BOTTOM) * grow;
  const filter = easeOutBack(progress(frame, [BEATS.filter - 2, BEATS.filter + 8]), 1.6);
  const fan = easeOutBack(progress(frame, [BEATS.fan - 8, BEATS.fan + 2]), 1.6);
  const spin = frame >= BEATS.fan ? (frame - BEATS.fan) * 0.45 : 0;
  const airOn = frame >= HAZE_CLEAR[0] && !(frame >= VALVE_SHUT && frame < VALVE_OPEN_AGAIN);
  const valve = easeOutBack(progress(frame, [BEATS.valve - 4, BEATS.valve + 6]), 1.6);
  // Flap angle: open (edge-on to the flow) -> shut across the pipe in 2 frames.
  const shut = frame >= VALVE_SHUT && frame < VALVE_OPEN_AGAIN ? clamp01((frame - VALVE_SHUT) / 2) : 0;
  // Hinge along z: open = edge-on (vertical line), shut = across the pipe.
  const flapAngle = lerp(Math.PI / 2 - 0.2, 0, shut);
  const gap = valve > 0 ? 0.36 : 0;

  // First shockwave: in from the sky, down the pipe, bursts at the filter.
  const run = progress(frame, SHOCK_RUN);
  let ball: [number, number, number] | null = null;
  if (frame >= SHOCK_RUN[0] && frame < SHOCK_RUN[1]) {
    ball =
      run < 0.4
        ? [lerp(AIR_X + 7, AIR_X, run / 0.4), lerp(9, TOP + 0.4, run / 0.4), lerp(-12, Z, run / 0.4)]
        : [AIR_X, lerp(TOP + 0.4, FILTER_Y, (run - 0.4) / 0.6), Z];
  }
  const b2 = progress(frame, BLAST2);
  const ball2: [number, number, number] | null =
    frame >= BLAST2[0] - 10 && frame < BLAST2[1] ? [AIR_X, lerp(TOP + 2.5, VALVE_Y + 0.35, clamp01(b2)), Z] : null;

  return (
    <group>
      {/* The pipe, up through the dirt and out of the lawn */}
      {/* (split around the valve, so its see-through section shows the flap) */}
      {(gap > 0 && BOTTOM + len > VALVE_Y + gap
        ? [
            [BOTTOM, VALVE_Y - gap],
            [VALVE_Y + gap, BOTTOM + len],
          ]
        : [[BOTTOM, BOTTOM + len]]
      ).map(([y0, y1]) => (
        <mesh key={y0} position={[AIR_X, (y0 + y1) / 2, Z]} castShadow>
          <cylinderGeometry args={[AIR_R, AIR_R, Math.max(0.001, y1 - y0), 18]} />
          <meshStandardMaterial color="#aab1ba" metalness={0.45} roughness={0.4} />
        </mesh>
      ))}
      {grow >= 1 ? (
        <group position={[AIR_X, TOP, Z]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <coneGeometry args={[0.55, 0.3, 20]} />
            <meshStandardMaterial color="#8d949c" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.72, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.1, 20]} />
            <meshStandardMaterial color="#c79a4e" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      ) : null}

      {/* Dust filter: a grille box at the roof of the shelter */}
      {filter > 0 ? (
        <group position={[AIR_X, FILTER_Y, IN_Z]} scale={filter}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.42, 0.5]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.6} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[-0.27 + i * 0.108, 0, 0.26]}>
              <boxGeometry args={[0.04, 0.34, 0.02]} />
              <meshStandardMaterial color="#6a6f76" metalness={0.4} />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Hand-cranked fan: a ring housing, four blades, a crank handle */}
      {fan > 0 ? (
        <group position={[AIR_X, FAN_Y, IN_Z]} scale={fan}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.36, 0.05, 10, 32]} />
            <meshStandardMaterial color="#3f6fb0" metalness={0.3} roughness={0.5} />
          </mesh>
          <group rotation={[0, 0, spin]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0.35, 0, (i * Math.PI) / 2]} position={[Math.cos((i * Math.PI) / 2) * 0.16, Math.sin((i * Math.PI) / 2) * 0.16, 0]}>
                <boxGeometry args={[0.3, 0.12, 0.02]} />
                <meshStandardMaterial color="#d8dce2" metalness={0.5} roughness={0.35} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          </group>
          <group rotation={[0, 0, spin]} position={[0, 0, 0.1]}>
            <mesh position={[0.18, 0, 0]}>
              <boxGeometry args={[0.36, 0.04, 0.04]} />
              <meshStandardMaterial color="#c4463a" />
            </mesh>
            <mesh position={[0.36, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
              <meshStandardMaterial color="#2b2f36" />
            </mesh>
          </group>
        </group>
      ) : null}

      {/* Fresh air pouring in: blue streaks swirling down from the fan */}
      {airOn
        ? flow.map((p, i) => {
            const t = ((frame - HAZE_CLEAR[0] + p.t0) % 40) / 40;
            const a = t * Math.PI * 1.4 + p.side * 2;
            return (
              <mesh
                key={i}
                position={[AIR_X - t * 1.6 + Math.sin(a) * 0.35, FAN_Y - 0.2 - t * 1.6, IN_Z - p.d * 2.4 + Math.cos(a) * 0.2]}
                rotation={[0, 0, 0.8 + a * 0.3]}
                scale={[0.2, 0.035, 0.035]}
              >
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color="#7cc8ff" transparent opacity={0.75 * Math.sin(Math.PI * t)} toneMapped={false} />
              </mesh>
            );
          })
        : null}

      {/* Blast valve: red-ringed see-through section with the flap inside */}
      {valve > 0 ? (
        <group position={[AIR_X, VALVE_Y, Z]} scale={valve}>
          <mesh>
            <cylinderGeometry args={[AIR_R + 0.08, AIR_R + 0.08, 0.7, 24, 1, true]} />
            <meshStandardMaterial color="#d8f0ff" transparent opacity={0.28} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {[-0.33, 0.33].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[AIR_R + 0.1, 0.045, 10, 28]} />
              <meshStandardMaterial color="#d23a2e" roughness={0.5} />
            </mesh>
          ))}
          <mesh rotation={[0.35, 0, flapAngle]}>
            <cylinderGeometry args={[AIR_R + 0.04, AIR_R + 0.04, 0.04, 22]} />
            <meshStandardMaterial color="#f2c14e" metalness={0.3} roughness={0.45} />
          </mesh>
          {airOn ? (
            <mesh>
              <cylinderGeometry args={[AIR_R - 0.02, AIR_R - 0.02, 0.62, 16]} />
              <meshBasicMaterial color="#7cc8ff" transparent opacity={0.45} toneMapped={false} />
            </mesh>
          ) : null}
        </group>
      ) : null}
      {/* Stopwatch: "a few thousandths of a second" */}
      {frame >= BEATS.valveSlams - 6 && frame < lineEnd("l6a") + 6 ? (
        <group position={[AIR_X - 0.62, VALVE_Y + 0.42, 0.7]} scale={easeOutBack(progress(frame, [BEATS.valveSlams - 6, BEATS.valveSlams + 4]), 1.6) * 0.32}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.25, 32]} />
            <meshStandardMaterial color="#f5f5f2" roughness={0.4} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
            <torusGeometry args={[1, 0.1, 10, 32]} />
            <meshStandardMaterial color="#9aa1aa" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.3, 10]} />
            <meshStandardMaterial color="#9aa1aa" metalness={0.6} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.82, Math.cos((i / 12) * Math.PI * 2) * 0.82, 0.14]}>
              <boxGeometry args={[0.05, 0.14, 0.02]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          ))}
          {/* The hand barely moves: a sliver past twelve */}
          <group rotation={[0, 0, -0.04 * clamp01((frame - BEATS.valveSlams) / 4)]} position={[0, 0, 0.16]}>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[0.06, 0.8, 0.02]} />
              <meshBasicMaterial color="#d23a2e" />
            </mesh>
          </group>
        </group>
      ) : null}

      {ball ? <Ball p={ball} /> : null}
      {ball2 ? <Ball p={ball2} s={1.2} /> : null}
    </group>
  );
};

/** Where the first shockwave bursts (inside, at the filter): for Scene bursts. */
export const SHOCK_BURST: [number, number, number] = [AIR_X, FILTER_Y, IN_Z];
/** Where the second one splashes on the shut valve. */
export const VALVE_BURST: [number, number, number] = [AIR_X, VALVE_Y + 0.4, Z];
export const FAN_POS: [number, number, number] = [AIR_X, FAN_Y, IN_Z];
