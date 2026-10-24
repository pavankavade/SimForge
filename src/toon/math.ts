export type Vec = [number, number];

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec = (a: Vec, b: Vec, t: number): Vec => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
/** Overshoots past 1 then settles: the snappy "pose hit" of cartoon timing. */
export const easeBack = (t: number) => {
  const c1 = 2.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Deterministic pseudo-random in [0, 1) for a seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Damped shake offset, `at` is the impact frame. */
export const shake = (
  frame: number,
  at: number,
  strength: number,
  length = 14,
): Vec => {
  const t = frame - at;
  if (t < 0 || t > length) return [0, 0];
  const k = Math.pow(1 - t / length, 2) * strength;
  return [Math.sin(t * 2.9 + 1.3) * k, Math.cos(t * 3.7) * k * 0.8];
};

export interface Key<T> {
  f: number;
  v: T;
  ease?: (t: number) => number;
}

type Numeric = Record<string, number | Vec>;

/** Samples a keyframe track of flat numeric/Vec records. Each key's ease shapes the move INTO it. */
export const sampleTrack = <T extends Numeric>(
  keys: Key<T>[],
  frame: number,
): T => {
  if (frame <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (frame <= b.f) {
      const a = keys[i - 1];
      const t = (b.ease ?? easeInOut)(clamp01((frame - a.f) / (b.f - a.f)));
      const out: Record<string, number | Vec> = {};
      for (const k of Object.keys(a.v)) {
        const va = a.v[k];
        const vb = b.v[k];
        out[k] = Array.isArray(va)
          ? lerpVec(va, vb as Vec, t)
          : lerp(va, vb as number, t);
      }
      return out as T;
    }
  }
  return keys[keys.length - 1].v;
};

/** Step track: returns the value of the last key at or before frame. */
export const stepTrack = <T>(keys: { f: number; v: T }[], frame: number): T => {
  let v = keys[0].v;
  for (const k of keys) if (frame >= k.f) v = k.v;
  return v;
};

/** Quadratic "rubber hose" limb from a to b with natural length len; bends to the side of `bend`. */
export const hosePath = (a: Vec, b: Vec, len: number, bend: number) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  if (d >= len) return `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
  const sag = Math.sqrt((len * len - d * d) / 4) * 0.75 * bend;
  const nx = -dy / d;
  const ny = dx / d;
  const mx = (a[0] + b[0]) / 2 + nx * sag;
  const my = (a[1] + b[1]) / 2 + ny * sag;
  const cx = 2 * mx - (a[0] + b[0]) / 2;
  const cy = 2 * my - (a[1] + b[1]) / 2;
  return `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`;
};

export const rotate = (p: Vec, deg: number): Vec => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
