import type React from "react";
import * as THREE from "three";
import { useSurface } from "../../../engine/materials";
import { makeCorrugated } from "../../../engine/textures";
import { easeOutBack, progress } from "../../../kit/motion";
import { DOGLEG_SEG, DOGLEG_Y, GROUND_Y, SHAFT_ON, SHAFT_R, SHAFT_X, SHED_X, tubeWallY } from "../timeline";

/**
 * A vertical half-pipe set into the cut face (open side to camera) with a
 * ladder, from y0 up to y1. Grows upward from the bottom with `grow` 0..1.
 */
export const HalfShaft: React.FC<{ x: number; y0: number; y1: number; r?: number; grow?: number; ladder?: boolean }> = ({
  x,
  y0,
  y1,
  r = SHAFT_R,
  grow = 1,
  ladder = true,
}) => {
  const corr = useSurface("nb-corrugated", () => makeCorrugated({}), [1.5, (y1 - y0) / 0.22 / 16]);
  if (grow <= 0) return null;
  const h = (y1 - y0) * Math.min(1, grow);
  const rungs = Math.floor(h / 0.32);
  return (
    <group position={[x, y0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 24, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial {...corr} color="#cfd4da" metalness={0.35} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Rim lips on the cut edges */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * r, h / 2, 0]}>
          <boxGeometry args={[0.05, h, 0.05]} />
          <meshStandardMaterial color="#8d949c" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {ladder ? (
        <group position={[0, 0, -r * 0.55]}>
          {[-0.2, 0.2].map((lx) => (
            <mesh key={lx} position={[lx, h / 2, 0]}>
              <boxGeometry args={[0.045, h, 0.045]} />
              <meshStandardMaterial color="#6a6f76" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          {Array.from({ length: rungs }, (_, i) => (
            <mesh key={i} position={[0, 0.2 + i * 0.32, 0]}>
              <boxGeometry args={[0.4, 0.035, 0.035]} />
              <meshStandardMaterial color="#7a8088" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};

/** A horizontal half-pipe along x at height y (open side to camera), growing from x0 toward x1. */
export const HalfTunnel: React.FC<{ x0: number; x1: number; y: number; r?: number; grow?: number }> = ({ x0, x1, y, r = SHAFT_R, grow = 1 }) => {
  const corr = useSurface("nb-corrugated", () => makeCorrugated({}), [1.5, Math.abs(x1 - x0) / 0.22 / 16]);
  if (grow <= 0) return null;
  const len = Math.abs(x1 - x0) * Math.min(1, grow);
  const dir = Math.sign(x1 - x0);
  return (
    <group position={[x0 + (dir * len) / 2, y, 0]}>
      <mesh rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, len, 24, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial {...corr} color="#cfd4da" metalness={0.35} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * r, 0]}>
          <boxGeometry args={[len, 0.05, 0.05]} />
          <meshStandardMaterial color="#8d949c" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * The bent entrance: down from the shed, along, and down again into the
 * pipe, so rays falling down the first leg hit dirt at the corner. The
 * first leg and the horizontal grow on "once", the last leg on "again".
 */
export const Dogleg: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < DOGLEG_SEG[0]) return null;
  const a = easeOutBack(progress(frame, [DOGLEG_SEG[0], DOGLEG_SEG[0] + 10]), 1.2);
  const b = progress(frame, [DOGLEG_SEG[0] + 4, DOGLEG_SEG[1]]);
  const c = progress(frame, [DOGLEG_SEG[1], DOGLEG_SEG[2]]);
  return (
    <group>
      <HalfShaft x={SHED_X} y0={DOGLEG_Y - SHAFT_R} y1={GROUND_Y + 0.05} grow={a} />
      <HalfTunnel x0={SHED_X} x1={SHAFT_X + SHAFT_R} y={DOGLEG_Y} grow={b} />
      <HalfShaft x={SHAFT_X} y0={tubeWallY(SHAFT_X) - 0.1} y1={DOGLEG_Y + SHAFT_R} grow={c} />
    </group>
  );
};

/** The first entrance: a straight shaft from the lawn down to the pipe's roof. */
export const StraightShaft: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SHAFT_ON || frame >= DOGLEG_SEG[0]) return null;
  const grow = easeOutBack(progress(frame, [SHAFT_ON, SHAFT_ON + 10]), 1.2);
  return <HalfShaft x={SHAFT_X} y0={tubeWallY(SHAFT_X) - 0.1} y1={GROUND_Y + 0.05} grow={grow} />;
};
