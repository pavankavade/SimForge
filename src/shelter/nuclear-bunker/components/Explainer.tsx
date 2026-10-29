import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import { clamp01, easeOutBack, progress } from "../../../kit/motion";
import {
  BEATS,
  DECK_Y,
  DOGLEG_SEG,
  DOGLEG_Y,
  LAYER_COUNT,
  LAYER_X0,
  LAYER_X1,
  SHAFT_X,
  SHED_X,
  layerY,
  lineEnd,
  lineStart,
} from "../timeline";

const RAY_Z = 0.32;
const RAY_LEN = 0.34;
const GLOW = "#e8ff5a";

/** One falling ray: a short glowing streak, then a small flash where it stops. */
const Ray: React.FC<{ x: number; y: number; z?: number; flash?: number }> = ({ x, y, z = RAY_Z, flash = 0 }) => (
  <group position={[x, y, z]}>
    {flash <= 0 ? (
      <mesh position={[0, RAY_LEN / 2, 0]}>
        <boxGeometry args={[0.05, RAY_LEN, 0.05]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
    ) : (
      <mesh scale={0.06 + 0.12 * Math.sin(Math.PI * flash)}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#fff6b0" toneMapped={false} transparent opacity={1 - flash} />
      </mesh>
    )}
  </group>
);

interface Fall {
  x: number;
  spawn: number;
  stopY: number;
}

/** Position of a falling ray at frame f, or null when not on screen. */
const fallAt = (f: number, r: Fall, top: number, speed: number): { y: number; flash: number } | null => {
  const t = f - r.spawn;
  if (t < 0) return null;
  const y = top - t * speed;
  if (y > r.stopY) return { y, flash: 0 };
  const after = (r.stopY - y) / speed;
  return after < 7 ? { y: r.stopY, flash: after / 7 } : null;
};

/**
 * The radiation explainers: dashed half-value layers in the dirt above the
 * pipe with rays dying at each line (half at every line, none reach the
 * steel); rays straight down the open doorway onto Dad; then, after the bend,
 * rays stopping in the dirt at the first corner.
 */
export const Explainer: React.FC<{ frame: number }> = ({ frame }) => {
  // 48 rays: 24 die at the first line, 12 at the second... 1 at the sixth.
  const layerRays = useMemo(() => {
    const stops: number[] = [];
    [24, 12, 6, 3, 2, 1].forEach((n, k) => {
      for (let i = 0; i < n; i++) stops.push(k);
    });
    return stops
      .map((k, i) => ({ k, order: random(`hv-o-${i}`) }))
      .sort((a, b) => a.order - b.order)
      .map(({ k }, i) => ({
        x: LAYER_X0 + 0.08 + random(`hv-x-${i}`) * (LAYER_X1 - LAYER_X0 - 0.16),
        spawn: BEATS.halfRays - 40 + i * 2.3,
        stopY: layerY(k),
      }));
  }, []);
  const doorRays = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        x: SHAFT_X + (random(`dr-x-${i}`) - 0.5) * 0.5,
        spawn: BEATS.doorwayRays + i * 3,
        stopY: DECK_Y + 1.55,
      })),
    [],
  );
  const bendRays = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: SHED_X + (random(`br-x-${i}`) - 0.5) * 0.5,
        spawn: DOGLEG_SEG[2] + 4 + i * 3,
        stopY: DOGLEG_Y - 0.28,
      })),
    [],
  );

  const layersOn = frame >= BEATS.layers && frame < lineStart("l3b") + 10;
  const layersFade = 1 - progress(frame, [lineStart("l3b") - 4, lineStart("l3b") + 10]);

  return (
    <group>
      {layersOn
        ? Array.from({ length: LAYER_COUNT }, (_, k) => {
            const pop = easeOutBack(progress(frame, [BEATS.layers + 6 + k * 8, BEATS.layers + 14 + k * 8]), 1.4);
            if (pop <= 0) return null;
            const dashes = 9;
            const step = (LAYER_X1 - LAYER_X0) / dashes;
            return (
              <group key={k} position={[0, layerY(k), RAY_Z]} scale={[1, pop * layersFade, 1]}>
                {Array.from({ length: dashes }, (_, d) => (
                  <mesh key={d} position={[LAYER_X0 + step * (d + 0.5), 0, 0]}>
                    <boxGeometry args={[step * 0.6, 0.045, 0.03]} />
                    <meshBasicMaterial color="#fff27a" toneMapped={false} transparent opacity={clamp01(layersFade)} />
                  </mesh>
                ))}
              </group>
            );
          })
        : null}
      {layersOn
        ? layerRays.map((r, i) => {
            const s = fallAt(frame, r, 0.15, 0.065);
            return s ? <Ray key={i} x={r.x} y={s.y} flash={s.flash} /> : null;
          })
        : null}

      {frame < DOGLEG_SEG[0] + 4
        ? doorRays.map((r, i) => {
            if (r.spawn > lineEnd("l3b") + 30) return null;
            const s = fallAt(frame, r, 4, 0.3);
            return s ? <Ray key={i} x={r.x} y={s.y} z={-0.15} flash={s.flash} /> : null;
          })
        : null}

      {bendRays.map((r, i) => {
        if (r.spawn > lineEnd("l4a")) return null;
        const s = fallAt(frame, r, 4, 0.3);
        return s ? <Ray key={i} x={r.x} y={s.y} z={-0.15} flash={s.flash} /> : null;
      })}
    </group>
  );
};
