// Sculpting helpers for organic shapes. A body part is a smooth function "radius around an axis at
// height y", sampled into a grid mesh. Detail goes where it is needed by warping the sample lines.
import * as THREE from "three";

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Gaussian bump of width `s` at distance `d`. */
export const gauss = (d: number, s: number): number => Math.exp(-(d * d) / (s * s));
export const gauss2 = (dx: number, sx: number, dy: number, sy: number): number =>
  Math.exp(-(dx * dx) / (sx * sx) - (dy * dy) / (sy * sy));

/** Smooth curve through keys [x, value] (cubic Hermite, clamped at the ends). */
export function curve(keys: Array<[number, number]>): (x: number) => number {
  const n = keys.length;
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = keys[Math.max(0, i - 1)];
    const b = keys[Math.min(n - 1, i + 1)];
    m.push(b[0] === a[0] ? 0 : (b[1] - a[1]) / (b[0] - a[0]));
  }
  return (x: number) => {
    if (x <= keys[0][0]) return keys[0][1];
    if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (x > keys[i + 1][0]) i++;
    const h = keys[i + 1][0] - keys[i][0];
    const t = (x - keys[i][0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * keys[i][1] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * keys[i + 1][1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

/** Radius of a superellipse cross-section in direction theta (0 = front, +Z; pi/2 = +X). */
export function superR(theta: number, w: number, front: number, back: number, n: number): number {
  const s = Math.abs(Math.sin(theta));
  const c = Math.cos(theta);
  const d = c >= 0 ? front : back;
  return Math.pow(Math.pow(s / Math.max(1e-5, w), n) + Math.pow(Math.abs(c) / Math.max(1e-5, d), n), -1 / n);
}

/** Sample positions over [a, b] spaced by a density function (samples per unit length). */
export function spaced(a: number, b: number, density: (x: number) => number): number[] {
  const STEPS = 2000;
  const cum = new Float64Array(STEPS + 1);
  for (let i = 1; i <= STEPS; i++) {
    const x = a + ((i - 0.5) / STEPS) * (b - a);
    cum[i] = cum[i - 1] + (density(x) * (b - a)) / STEPS;
  }
  const count = Math.max(2, Math.round(cum[STEPS]));
  const out: number[] = [];
  let k = 0;
  for (let j = 0; j <= count; j++) {
    const target = (j / count) * cum[STEPS];
    while (k < STEPS && cum[k + 1] < target) k++;
    const f = cum[k + 1] > cum[k] ? (target - cum[k]) / (cum[k + 1] - cum[k]) : 0;
    out.push(a + ((k + f) / STEPS) * (b - a));
  }
  out[0] = a;
  out[out.length - 1] = b;
  return out;
}

/** Where `x` falls in a sorted sample list, as a fraction 0..1 of its length. */
export function fractionIn(samples: number[], x: number): number {
  const n = samples.length - 1;
  if (x <= samples[0]) return 0;
  if (x >= samples[n]) return 1;
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid] <= x) lo = mid;
    else hi = mid;
  }
  return (lo + (x - samples[lo]) / (samples[hi] - samples[lo])) / n;
}

/** Inverse of `fractionIn`: the sample value at fraction f. */
export function valueAt(samples: number[], f: number): number {
  const n = samples.length - 1;
  const x = clamp01(f) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return samples[i] + (samples[i + 1] - samples[i]) * (x - i);
}

export interface GridOpts {
  /** First and last column are the same line (a closed loop around the part). */
  wrap?: boolean;
  /** Reverse the winding (rows authored top to bottom). */
  flip?: boolean;
  /** Per-vertex RGBA (0..1); adds a `color` attribute. */
  color?: (i: number, j: number) => [number, number, number, number];
  /** Leave out cells where this returns false. */
  keep?: (i: number, j: number) => boolean;
}

const _n = new THREE.Vector3();

/**
 * Smooth-shaded mesh from a grid of points. Seams of a wrapped grid and rows that collapse to a
 * single point (the crown of a head, a fingertip) get welded normals so no crease shows.
 */
export function gridMesh(P: THREE.Vector3[][], uv: (i: number, j: number) => [number, number], opts: GridOpts = {}): THREE.BufferGeometry {
  const rows = P.length;
  const cols = P[0].length;
  const pos = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const col = opts.color ? new Float32Array(rows * cols * 4) : null;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      pos[k * 3] = P[i][j].x;
      pos[k * 3 + 1] = P[i][j].y;
      pos[k * 3 + 2] = P[i][j].z;
      const t = uv(i, j);
      uvs[k * 2] = t[0];
      uvs[k * 2 + 1] = t[1];
      if (col && opts.color) {
        const c = opts.color(i, j);
        col[k * 4] = c[0];
        col[k * 4 + 1] = c[1];
        col[k * 4 + 2] = c[2];
        col[k * 4 + 3] = c[3];
      }
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      if (opts.keep && !opts.keep(i, j)) continue;
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (opts.flip) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  if (opts.wrap) {
    for (let i = 0; i < rows; i++) {
      const a = i * cols;
      const b = a + cols - 1;
      _n.set(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
      nor.setXYZ(a, _n.x, _n.y, _n.z);
      nor.setXYZ(b, _n.x, _n.y, _n.z);
    }
  }
  for (const i of [0, rows - 1]) {
    if (P[i][0].distanceToSquared(P[i][Math.floor(cols / 2)]) > 1e-12) continue;
    _n.set(0, 0, 0);
    for (let j = 0; j < cols; j++) {
      _n.x += nor.getX(i * cols + j);
      _n.y += nor.getY(i * cols + j);
      _n.z += nor.getZ(i * cols + j);
    }
    _n.normalize();
    for (let j = 0; j < cols; j++) nor.setXYZ(i * cols + j, _n.x, _n.y, _n.z);
  }
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

/** A part defined by "radius around a vertical axis": returns the surface point for (theta, y). */
export type Surface = (theta: number, y: number, out: THREE.Vector3) => THREE.Vector3;

/** Mesh a surface over rows of y and columns of theta (a full loop unless thetas stop short). */
export function surfaceMesh(
  surf: Surface,
  ys: number[],
  thetas: number[],
  opts: GridOpts & { offset?: number | ((i: number, j: number) => number); uvScale?: [number, number] } = {}
): THREE.BufferGeometry {
  const P: THREE.Vector3[][] = [];
  for (let i = 0; i < ys.length; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < thetas.length; j++) row.push(surf(thetas[j], ys[i], new THREE.Vector3()));
    P.push(row);
  }
  if (opts.offset) pushOut(P, opts.offset, opts.wrap === true);
  const su = opts.uvScale ? opts.uvScale[0] : 1;
  const sv = opts.uvScale ? opts.uvScale[1] : 1;
  return gridMesh(P, (i, j) => [(j / (thetas.length - 1)) * su, (i / (ys.length - 1)) * sv], opts);
}

/** Move every grid point along its surface normal (clothing layers, hair shells). */
export function pushOut(P: THREE.Vector3[][], dist: number | ((i: number, j: number) => number), wrap: boolean): void {
  const rows = P.length;
  const cols = P[0].length;
  const N: THREE.Vector3[][] = [];
  const du = new THREE.Vector3();
  const dv = new THREE.Vector3();
  for (let i = 0; i < rows; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < cols; j++) {
      const jl = j > 0 ? j - 1 : wrap ? cols - 2 : 0;
      const jr = j < cols - 1 ? j + 1 : wrap ? 1 : cols - 1;
      du.copy(P[i][jr]).sub(P[i][jl]);
      dv.copy(P[Math.min(rows - 1, i + 1)][j]).sub(P[Math.max(0, i - 1)][j]);
      const n = new THREE.Vector3().crossVectors(du, dv);
      if (n.lengthSq() < 1e-16) n.set(0, 1, 0);
      row.push(n.normalize());
    }
    N.push(row);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) P[i][j].addScaledVector(N[i][j], typeof dist === "number" ? dist : dist(i, j));
  }
}

/** Evenly spaced angles for a closed loop (first and last coincide). */
export function ring(count: number): number[] {
  const out: number[] = [];
  for (let j = 0; j <= count; j++) out.push(-Math.PI + (j / count) * Math.PI * 2);
  return out;
}

export function linspace(a: number, b: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= count; i++) out.push(a + ((b - a) * i) / count);
  return out;
}

/** Add a white vertex colour so a piece can merge with tinted ones. */
export function white(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = (g.getAttribute("position") as THREE.BufferAttribute).count;
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 4).fill(1), 4));
  return g;
}
