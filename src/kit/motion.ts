import type { Vec3 } from "../engine/types";

/**
 * Pure motion helpers. Everything is a function of the frame: no state, no
 * Date, no Math.random (use `random(seed)` from remotion for noise).
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** 0..1 progress of `frame` through the window [a, b] (clamped). */
export const progress = (frame: number, [a, b]: readonly [number, number]) => clamp01((frame - a) / (b - a));

export const easeInOut = (t: number) => t * t * (3 - 2 * t);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInCubic = (t: number) => t * t * t;
export const easeOutQuad = (t: number) => 1 - (1 - t) ** 2;
/** Overshoots then settles (pop-ins, props snapping into place). */
export const easeOutBack = (t: number, k = 1.7) => 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;

/** Height of a jump/hop arc of peak `h` at progress t (0 at both ends). */
export const arc = (t: number, h: number) => h * 4 * t * (1 - t);

/** Quadratic bezier between a and b through control c (flights, tosses). */
export const bezier = (a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 => {
  const q = (i: 0 | 1 | 2) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i];
  return [q(0), q(1), q(2)];
};

/** Decaying wobble that starts at `at` (impacts, landings): returns an offset. */
export const wobble = (frame: number, at: number, amp = 0.1, freq = 0.9, decay = 6) =>
  frame < at ? 0 : amp * Math.sin((frame - at) * freq) * Math.exp(-(frame - at) / decay);

/** Short hop that peaks mid-way through [at, at+len] (settling bodies, bounces). */
export const bump = (frame: number, at: number, len = 7, h = 0.12) => h * Math.sin(Math.PI * clamp01((frame - at) / len));

/** Linear walk between two x positions over a window (eases in/out by default). */
export const walkX = (frame: number, window: readonly [number, number], x0: number, x1: number, ease: (t: number) => number = (t) => t) =>
  lerp(x0, x1, ease(progress(frame, window)));
