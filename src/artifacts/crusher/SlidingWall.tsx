import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMasonry, makeMetal } from "../../engine/textures";
import { easeOutBack, progress } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface SlidingWallProps {
  /** -1 = left wall, 1 = right wall. */
  side: -1 | 1;
  /** Distance from x = 0 to the wall's inner face. */
  inner: number;
  /** Extra visual x offset (judder). */
  shudder?: number;
  platesFrom?: number;
  platesTo?: number;
  greaseAt?: number;
  electrifyAt?: number;
  /** Doorway cut out of the front of the wall: z range (its far end is the wall front) and height. */
  doorway?: { z: readonly [number, number]; h: number };
  /** Drop gate in the doorway: 0 = up (open), 1 = down (shut). */
  doorShut?: number;
  thickness?: number;
  bottom?: number;
  top?: number;
  z?: readonly [number, number];
}

const STRIPE_N = 9;

type Panel = { z0: number; z1: number; y0: number; y1: number };

/**
 * One of the two crushing walls, seen side-on: a masonry block gliding along x. Steel plates
 * slide down over its inner face and front edge, grease drips down them, copper seams carry the
 * current, and the left wall has a doorway with a drop gate.
 */
export const SlidingWall: React.FC<SlidingWallProps> = ({
  side,
  inner,
  shudder = 0,
  platesFrom,
  platesTo,
  greaseAt,
  electrifyAt,
  doorway,
  doorShut = 0,
  thickness = 0.6,
  bottom = 0.16,
  top = 3.15,
  z = [-1.7, 0.3],
}) => {
  const frame = useCurrentFrame();
  const stone = useSurface(
    `wall-stone-${side}`,
    () => makeMasonry({ rows: 8, cols: 3, base: "#6c707b", baseAlt: "#5b5f6a", mortar: "#22252b", seed: side === 1 ? 91 : 92 }),
    [1, 2]
  );
  const steel = useSurface("wall-steel", () => makeMetal({ base: "#8a909c", seed: 93, roughness: 120 }), [1, 2]);

  const x0 = side * inner + shudder;
  const cx = x0 + (side * thickness) / 2;
  const [z0, z1] = z;
  const d0 = doorway ? doorway.z[0] : z1;
  const doorH = doorway ? doorway.h : 0;

  // Stone mass: one block, or back block + lintel over the doorway.
  const blocks: Panel[] = doorway
    ? [
        { z0, z1: d0, y0: bottom, y1: top },
        { z0: d0, z1, y0: doorH, y1: top },
      ]
    : [{ z0, z1, y0: bottom, y1: top }];

  // Inner-face plates: back part, then the doorway half split in two.
  const dm = (d0 + z1) / 2;
  const plates: Panel[] = [
    { z0, z1: d0 === z1 ? (z0 + z1) / 2 : d0, y0: bottom, y1: top },
    { z0: d0 === z1 ? (z0 + z1) / 2 : d0, z1: d0 === z1 ? z1 : dm, y0: doorway ? doorH : bottom, y1: top },
    ...(d0 === z1 ? [] : [{ z0: dm, z1, y0: doorH, y1: top }]),
  ];
  const plateDrop = (i: number) => {
    if (platesFrom === undefined) return null;
    const start = platesFrom + i * 8;
    const end = Math.max(start + 10, (platesTo ?? start + 12) - (2 - i) * 3);
    if (frame < start) return null;
    return (1 - easeOutBack(progress(frame, [start, end]))) * 3.4;
  };
  const capDrop = plateDrop(2);
  const greaseT = greaseAt === undefined ? 0 : progress(frame, [greaseAt, greaseAt + 20]);
  const live = electrifyAt !== undefined && frame >= electrifyAt;
  const pulse = live ? 0.5 + 0.5 * Math.sin((frame - (electrifyAt ?? 0)) * 0.9) : 0;
  const stripes = platesFrom !== undefined && frame >= platesFrom;
  const faceX = x0 - side * 0.025;
  const frontY0 = doorway ? doorH : bottom;
  const gateBottom = doorH * (1 - doorShut);

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={`b${i}`} position={[cx, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2]} castShadow receiveShadow>
          <boxGeometry args={[thickness, b.y1 - b.y0, b.z1 - b.z0]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} roughnessMap={stone.roughnessMap} color="#b9bcc6" roughness={0.85} />
        </mesh>
      ))}
      {/* Dark doorway reveal so the opening reads */}
      {doorway ? (
        <mesh position={[cx, doorH / 2, d0 + 0.01]}>
          <planeGeometry args={[thickness, doorH]} />
          <meshStandardMaterial color="#1c1d22" roughness={1} />
        </mesh>
      ) : null}

      {/* Drop gate: iron grille that seals the doorway while the trap runs */}
      {doorway && doorShut > 0.001 ? (
        <group position={[cx, 0, 0]}>
          <mesh position={[0, (gateBottom + doorH) / 2, (d0 + z1) / 2]}>
            <boxGeometry args={[thickness * 0.5, doorH - gateBottom, z1 - d0 - 0.02]} />
            <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.3} />
          </mesh>
          {[0.18, 0.5, 0.82].map((t) => (
            <mesh key={t} position={[0, gateBottom + 0.02 + (doorH - gateBottom) * t, z1 + 0.01]}>
              <boxGeometry args={[thickness * 0.9, 0.07, 0.05]} />
              <meshStandardMaterial color="#5a524a" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {Array.from({ length: 4 }, (_, s) => (
            <mesh key={s} position={[(-0.375 + s * 0.25) * thickness, gateBottom + 0.12, z1 + 0.02]}>
              <boxGeometry args={[thickness * 0.24, 0.2, 0.02]} />
              <meshStandardMaterial color={s % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Steel plates over the inner face, sliding down from above */}
      {plates.map((p, i) => {
        const drop = plateDrop(i);
        if (drop === null) return null;
        return (
          <group key={`p${i}`} position={[faceX, drop, 0]}>
            <mesh position={[0, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2]} castShadow>
              <boxGeometry args={[0.05, p.y1 - p.y0 - 0.02, p.z1 - p.z0 - 0.03]} />
              <meshStandardMaterial map={steel.map} roughnessMap={steel.roughnessMap} color="#d4d9e2" metalness={0.15} roughness={0.42} />
            </mesh>
            {[p.y0 + 0.15, p.y1 - 0.15].map((ry) =>
              [p.z0 + 0.1, p.z1 - 0.1].map((rz) => (
                <mesh key={`${ry}-${rz}`} position={[-side * 0.03, ry, rz]}>
                  <sphereGeometry args={[0.035, 8, 6]} />
                  <meshStandardMaterial color="#e8ebf0" metalness={0.6} roughness={0.3} />
                </mesh>
              ))
            )}
            {live ? (
              <mesh position={[-side * 0.03, (p.y0 + p.y1) / 2, p.z1 - 0.02]}>
                <boxGeometry args={[0.02, p.y1 - p.y0 - 0.1, 0.05]} />
                <meshStandardMaterial color="#d98a4a" emissive="#ff7a2a" emissiveIntensity={0.4 + pulse * 0.5} roughness={0.3} />
              </mesh>
            ) : null}
          </group>
        );
      })}

      {/* Steel cap over the front edge (reads side-on) */}
      {capDrop !== null ? (
        <group position={[cx, capDrop, z1 + 0.025]}>
          <mesh position={[0, (frontY0 + top) / 2, 0]} castShadow>
            <boxGeometry args={[thickness + 0.04, top - frontY0, 0.05]} />
            <meshStandardMaterial map={steel.map} roughnessMap={steel.roughnessMap} color="#d4d9e2" metalness={0.15} roughness={0.42} />
          </mesh>
          {[0.25, 0.5, 0.75].map((t) =>
            [-1, 1].map((sx) => (
              <mesh key={`${t}-${sx}`} position={[sx * thickness * 0.36, frontY0 + (top - frontY0) * t, 0.03]}>
                <sphereGeometry args={[0.035, 8, 6]} />
                <meshStandardMaterial color="#e8ebf0" metalness={0.6} roughness={0.3} />
              </mesh>
            ))
          )}
          {/* Copper seams on the front edge */}
          {live
            ? [-1, 1].map((sx) => (
                <mesh key={`cu${sx}`} position={[sx * (thickness / 2 + 0.005), (frontY0 + top) / 2, 0.02]}>
                  <boxGeometry args={[0.05, top - frontY0 - 0.1, 0.03]} />
                  <meshStandardMaterial color="#d98a4a" emissive="#ff7a2a" emissiveIntensity={0.4 + pulse * 0.5} roughness={0.3} />
                </mesh>
              ))
            : null}
          {/* Grease: glossy drips running down the plate */}
          {greaseT > 0
            ? [-0.18, 0.04, 0.2].map((gx, gi) => {
                const len = 0.3 + greaseT * (0.9 + gi * 0.35);
                return (
                  <group key={`g${gi}`} position={[gx * thickness * 1.4, top - 0.05 - len / 2, 0.04]}>
                    <mesh>
                      <capsuleGeometry args={[0.04, len, 4, 8]} />
                      <meshStandardMaterial color="#c8d43a" emissive="#5a6a10" emissiveIntensity={0.3} roughness={0.08} metalness={0.1} />
                    </mesh>
                    <mesh position={[0, -len / 2, 0]}>
                      <sphereGeometry args={[0.065, 10, 8]} />
                      <meshStandardMaterial color="#c8d43a" emissive="#5a6a10" emissiveIntensity={0.3} roughness={0.08} />
                    </mesh>
                  </group>
                );
              })
            : null}
        </group>
      ) : null}

      {/* Grease sheen + drips on the inner face */}
      {greaseT > 0 && capDrop !== null ? (
        <group position={[faceX - side * 0.035, 0, 0]}>
          {[z0 + 0.3, (z0 + z1) / 2, z1 - 0.25].map((gz, gi) => {
            const len = 0.4 + greaseT * (1.2 + gi * 0.3);
            return (
              <mesh key={gz} position={[0, top - 0.05 - len / 2, gz]}>
                <capsuleGeometry args={[0.035, len, 4, 8]} />
                <meshStandardMaterial color="#c8d43a" emissive="#5a6a10" emissiveIntensity={0.3} roughness={0.08} />
              </mesh>
            );
          })}
        </group>
      ) : null}

      {/* Hazard stripes along the inner front corner */}
      {stripes
        ? Array.from({ length: STRIPE_N }, (_, s) => {
            const y = frontY0 + 0.1 + ((top - frontY0 - 0.2) * (s + 0.5)) / STRIPE_N;
            return (
              <mesh key={`s${s}`} position={[x0 + side * 0.07, y, z1 + 0.06]}>
                <boxGeometry args={[0.14, (top - frontY0 - 0.2) / STRIPE_N - 0.01, 0.02]} />
                <meshStandardMaterial color={s % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
              </mesh>
            );
          })
        : null}

      {live ? (
        <GlowSprite position={[x0 - side * 0.1, (bottom + top) / 2, z1 - 0.2]} color="#7fd8ff" size={1.0} opacity={0.12 + pulse * 0.1} />
      ) : null}
    </group>
  );
};
