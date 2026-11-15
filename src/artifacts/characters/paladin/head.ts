// The head: one dense, smooth surface sculpted from a FaceSpec. The skull is a stack of
// superellipse sections; brow, sockets, nose, lips, chin, cheekbones and jaw are displacements on
// top of it. Eyelids drape over real eyeballs and open onto them, so the eyes sit in the head
// instead of being painted on it. All coordinates are in head-bone space (y up from the base of
// the skull, z forward, +x the character's left).
import * as THREE from "three";
import { merge } from "./geo";
import { clamp01, curve, gauss, gauss2, gridMesh, mix, pushOut, spaced, sstep, superR } from "./sculpt";
import type { FaceSpec, HumanSpec } from "./spec";

export const HEAD_BOTTOM = -0.052;
export const HEAD_TOP = 0.2235;
export const EYE_Y = 0.1;
const EYE_R = 0.0121;
const LID = 0.0012;

const W_KEYS: Array<[number, number]> = [
  [-0.075, 0.058],
  [-0.045, 0.057],
  [-0.022, 0.054],
  [-0.008, 0.05],
  [0.004, 0.055],
  [0.02, 0.0625],
  [0.04, 0.067],
  [0.06, 0.07],
  [0.08, 0.0725],
  [0.1, 0.0745],
  [0.125, 0.0765],
  [0.155, 0.0775],
  [0.18, 0.073],
  [0.2, 0.06],
  [0.213, 0.04],
  [0.2205, 0.019],
  [HEAD_TOP, 0],
];
const F_KEYS: Array<[number, number]> = [
  [-0.075, 0.05],
  [-0.05, 0.046],
  [-0.032, 0.047],
  [-0.022, 0.052],
  [-0.015, 0.074],
  [-0.007, 0.0885],
  [0.004, 0.0925],
  [0.016, 0.0885],
  [0.027, 0.0912],
  [0.036, 0.0905],
  [0.045, 0.0932],
  [0.054, 0.092],
  [0.07, 0.0925],
  [0.09, 0.093],
  [0.105, 0.0945],
  [0.117, 0.1],
  [0.135, 0.1022],
  [0.16, 0.1],
  [0.185, 0.088],
  [0.203, 0.068],
  [0.215, 0.044],
  [0.2205, 0.021],
  [HEAD_TOP, 0],
];
const B_KEYS: Array<[number, number]> = [
  [-0.075, 0.05],
  [-0.04, 0.053],
  [-0.01, 0.058],
  [0.015, 0.072],
  [0.04, 0.088],
  [0.07, 0.097],
  [0.11, 0.0995],
  [0.15, 0.097],
  [0.18, 0.086],
  [0.2, 0.068],
  [0.214, 0.042],
  [0.2205, 0.02],
  [HEAD_TOP, 0],
];
const N_KEYS: Array<[number, number]> = [
  [-0.075, 2.0],
  [-0.02, 2.05],
  [0.0, 1.85],
  [0.03, 2.0],
  [0.07, 2.25],
  [0.12, 2.3],
  [0.2, 2.1],
];
const NOSE_H: Array<[number, number]> = [
  [0.047, 0],
  [0.0505, 0.009],
  [0.0548, 0.0235],
  [0.06, 0.0312],
  [0.066, 0.0285],
  [0.076, 0.0205],
  [0.088, 0.0118],
  [0.098, 0.0052],
  [0.106, 0.0014],
  [0.113, 0],
];
const NOSE_W: Array<[number, number]> = [
  [0.05, 0.0124],
  [0.058, 0.012],
  [0.066, 0.0104],
  [0.08, 0.009],
  [0.095, 0.0082],
  [0.11, 0.009],
];
/** Height of the hairline above the head joint, by angle from the front. */
const HAIRLINE: Array<[number, number]> = [
  [0, 0.171],
  [0.45, 0.176],
  [0.85, 0.167],
  [1.12, 0.132],
  [1.28, 0.094],
  [1.42, 0.106],
  [1.6, 0.121],
  [1.95, 0.112],
  [2.2, 0.052],
  [2.6, 0.022],
  [Math.PI, 0.016],
];

/** Height of the lower border of the jaw at an angle from the front. */
export const jawBorder = (at: number): number => mix(-0.012, 0.014, Math.pow(sstep(0.15, 1.4, at), 1.3));

const smax = (a: number, b: number, k: number): number => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));

export interface RowProfile {
  w: number;
  f: number;
  b: number;
  n: number;
  az: number;
}

export interface LidShape {
  /** Signed distance inside the eye opening (metres, positive = open). */
  inside: number;
  /** Upper and lower lid margins relative to the corner line. */
  up: number;
  low: number;
  /** Height above the corner line, and position across the eye (-1 inner corner .. 1 outer). */
  v: number;
  un: number;
}

export class HeadShape {
  readonly face: FaceSpec;
  readonly eyeX: number;
  readonly eyeZ: number;
  private readonly cw = curve(W_KEYS);
  private readonly cf = curve(F_KEYS);
  private readonly cb = curve(B_KEYS);
  private readonly cn = curve(N_KEYS);
  private readonly noseH = curve(NOSE_H);
  private readonly noseW = curve(NOSE_W);
  private readonly hairlineY = curve(HAIRLINE);
  private readonly age: number;
  private readonly lid: LidShape = { inside: -1, up: 0, low: 0, v: 0, un: 0 };
  /** Radius of the torso's neck about the same axis, so the head's neck lands exactly on it. */
  private readonly neck: ((theta: number, y: number) => number) | null;

  constructor(spec: HumanSpec, neck: ((theta: number, y: number) => number) | null = null) {
    this.face = spec.face;
    this.age = spec.age;
    this.neck = neck;
    this.eyeX = 0.0307 * (1 + 0.07 * spec.face.eyeSpacing);
    this.eyeZ = 0.0675 - 0.002 * spec.face.eyeDepth;
  }

  profile(y: number): RowProfile {
    const f = this.face;
    const jaw = gauss(y - 0.012, 0.03);
    const skull = sstep(0.07, 0.12, y);
    const lower = 1 - sstep(0.03, 0.09, y);
    return {
      w: this.cw(y) * (1 + 0.075 * f.jawWidth * jaw + 0.045 * f.skullWidth * skull + 0.02 * f.jawWidth * lower),
      f: this.cf(y),
      b: this.cb(y),
      n: this.cn(y) + 0.35 * f.jawSquare * jaw,
      az: mix(-0.01, -0.006, sstep(-0.05, 0, y)),
    };
  }

  /** Lid geometry at a point (u across the eye toward the temple, v up), both in metres. */
  lids(u: number, vRaw: number): LidShape {
    const f = this.face;
    const L = this.lid;
    const hw = 0.0142 * (1 + 0.12 * f.eyeSize);
    const un = u / hw;
    const v = vRaw - (0.07 + 0.1 * f.eyeTilt) * u;
    L.un = un;
    L.v = v;
    if (Math.abs(un) >= 1) {
      L.up = 0;
      L.low = 0;
      L.inside = -(Math.abs(un) - 1) * hw - 0.0001;
      return L;
    }
    const a = un + 0.14 * (1 - un * un);
    const b = un - 0.12 * (1 - un * un);
    L.up = 0.005 * (1 + 0.16 * f.eyeSize) * (1 - 0.4 * f.hooded) * Math.pow(Math.max(0, 1 - a * a), 0.62);
    L.low = -0.0034 * (1 + 0.16 * f.eyeSize) * Math.pow(Math.max(0, 1 - b * b), 0.8);
    L.inside = Math.min(L.up - v, v - L.low);
    return L;
  }

  /**
   * Lid geometry at a grid position, measured on the lid itself (the same point the sculpt uses),
   * or null away from the eyes. Painting uses this so lash lines sit on the lid margins.
   */
  lidAt(theta: number, y: number, p: RowProfile): LidShape | null {
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    if (c <= 0.4 || Math.abs(y - EYE_Y) >= EYE_R + LID) return null;
    const side = s >= 0 ? 1 : -1;
    const oy = y - EYE_Y;
    const oz = this.eyeZ - p.az;
    const b = s * side * this.eyeX + c * oz;
    const rl = EYE_R + LID;
    const disc = b * b - (this.eyeX * this.eyeX + oy * oy + oz * oz - rl * rl);
    if (disc <= 0) return null;
    return this.lids(side * (b + Math.sqrt(disc)) * s - this.eyeX, oy);
  }

  /** Eyebrow coverage 0..1 at a point on the face (x across, y up). */
  brow(ax: number, y: number, thickness: number): number {
    const t = clamp01((ax - 0.009) / 0.046);
    const yb = 0.1148 + 0.0052 * Math.sin(Math.pow(t, 0.8) * Math.PI * 0.82) + 0.0014 * this.face.brow;
    const th = mix(0.0044, 0.0014, Math.pow(t, 1.3)) * thickness;
    return sstep(th, th * 0.45, Math.abs(y - yb)) * sstep(0.0065, 0.011, ax) * (1 - sstep(0.051, 0.057, ax));
  }

  /** Lip coverage 0..1 (the red of the lips). */
  lips(ax: number, y: number): number {
    const f = this.face;
    const mw = 0.0245 * (1 + 0.14 * f.mouthWidth);
    const full = 1 + 0.45 * f.lips;
    const ux = clamp01(ax / mw);
    if (ux >= 1) return 0;
    const line = 0.0362 - 0.0012 * ux * ux;
    const top = line + (0.0072 * full + 0.0012 * gauss(ax - 0.006, 0.005) - 0.001 * gauss(ax, 0.003)) * Math.pow(1 - Math.pow(ux, 2.2), 0.7);
    const bot = line - 0.0088 * full * Math.pow(Math.max(0, 1 - Math.pow(ux / 0.88, 2)), 0.6);
    return sstep(top + 0.0006, top - 0.0008, y) * sstep(bot - 0.0006, bot + 0.0008, y);
  }

  /** 0..1: how far inside the hair-covered scalp a point is. */
  scalp(theta: number, y: number): number {
    const ragged = 0.5 * Math.sin(theta * 23) + 0.3 * Math.sin(theta * 57 + 1) + 0.2 * Math.sin(theta * 131 + 2);
    return sstep(-0.004, 0.013, y - this.hairlineY(Math.abs(theta)) + ragged * 0.0035);
  }

  /** 0..1: beard-growing area (jaw, chin, upper lip, under the jaw). */
  beard(theta: number, ax: number, y: number): number {
    const at = Math.abs(theta);
    // Upper edge runs from the sideburn down the cheek to the corner of the mouth.
    const ragged = 0.5 * Math.sin(theta * 31 + y * 400) + 0.5 * Math.sin(theta * 73 + 1.3);
    const edge = mix(0.044, 0.092, Math.pow(sstep(0.5, 1.3, at), 1.5)) - 0.01 * gauss(at - 0.5, 0.25) + ragged * 0.0025;
    let m = sstep(edge + 0.012, edge - 0.01, y) * (1 - sstep(1.08, 1.45, at)) * sstep(-0.048, -0.012, y);
    // Moustache between nose and lip.
    m = Math.max(m, 0.8 * sstep(0.053, 0.048, y) * sstep(0.04, 0.043, y) * (1 - sstep(0.02, 0.032, ax)) * (1 - 0.5 * gauss(ax, 0.003)));
    return m * (1 - this.lips(ax, y)) * (1 - 0.7 * gauss2(ax, 0.008, y - 0.0235, 0.003));
  }

  private nose(x: number, y: number): number {
    const f = this.face;
    const ax = Math.abs(x);
    const proj = 1 + 0.16 * f.noseSize;
    const nw = 1 + 0.16 * f.noseWidth;
    let h = this.noseH(y) * proj;
    h *= 1 + 0.4 * f.noseBridge * gauss(y - 0.084, 0.014);
    h += 0.003 * f.noseTip * gauss(y - 0.059, 0.005) - 0.002 * f.noseTip * gauss(y - 0.071, 0.008);
    const sigma = this.noseW(y) * (1 + 0.12 * f.noseWidth * (1 - sstep(0.06, 0.085, y)));
    let v = h * Math.exp(-Math.pow(ax / sigma, 1.75));
    v += 0.0112 * proj * gauss2(ax - 0.0128 * nw, 0.0056, y - 0.0572, 0.0058) * sstep(0.0472, 0.052, y);
    v -= 0.0034 * gauss2(ax - 0.0072 * nw, 0.0036, y - 0.0518, 0.0028);
    return v;
  }

  /** Distance of the skin from the head's axis in direction theta at height y. */
  radius(theta: number, y: number, p: RowProfile = this.profile(y)): number {
    const f = this.face;
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    const at = Math.abs(theta);
    let r = superR(theta, p.w, p.f, p.b, p.n);
    const x = r * s;
    const ax = Math.abs(x);
    const front = sstep(0.05, 0.55, c);
    let d = 0;

    if (front > 0) {
      // Eye sockets, brow ridge and the bridge between the brows.
      d -= (0.0086 + 0.0025 * f.eyeDepth) * gauss2(ax - this.eyeX, 0.0175, y - (EYE_Y + 0.001), 0.012);
      const browY = 0.1168 + 0.0025 * Math.sin(clamp01((ax - 0.008) / 0.045) * Math.PI);
      d += (0.0038 + 0.0022 * f.brow) * gauss(y - browY, 0.0062) * sstep(0.002, 0.014, ax) * (1 - sstep(0.048, 0.064, ax));
      d += (0.0012 + 0.001 * f.brow) * gauss2(x, 0.012, y - 0.113, 0.008);
      d += this.nose(x, y);

      // Mouth: two lips, the line between them, the corners, the philtrum above.
      const mw = 0.0245 * (1 + 0.14 * f.mouthWidth);
      const full = 1 + 0.45 * f.lips;
      const ux = clamp01(ax / mw);
      const taper = Math.max(0, 1 - Math.pow(ux, 2.4));
      const line = 0.0362 - 0.0012 * ux * ux;
      const upY = 0.0412 + 0.0012 * gauss(ax - 0.006, 0.005) - 0.001 * ux;
      d += 0.0028 * full * gauss(y - upY, 0.004 * Math.sqrt(full)) * Math.pow(taper, 0.8);
      d += 0.0031 * full * gauss(y - 0.0308, 0.0046 * Math.sqrt(full)) * Math.pow(Math.max(0, 1 - Math.pow(ax / (mw * 0.86), 2.2)), 1.1);
      d -= 0.0036 * gauss(y - line, 0.0013) * Math.pow(taper, 0.35);
      d -= 0.0022 * gauss2(ax - mw, 0.0045, y - 0.0355, 0.0045);
      d -= 0.0011 * gauss(x, 0.0032) * sstep(0.043, 0.046, y) * (1 - sstep(0.052, 0.055, y));
      d -= 0.0022 * gauss2(x, 0.017, y - 0.0195, 0.0052);
      d += (0.0036 + 0.0028 * f.chin) * gauss2(x, 0.0145 * (1 + 0.25 * f.chinWidth), y - 0.003, 0.0105);
      d += 0.0035 * gauss2(x, 0.0085, y + 0.047, 0.009);

      // Folds that deepen with age: nose-to-mouth lines and the hollows under the eyes.
      if (this.age > 0.2) {
        const t = clamp01((0.056 - y) / 0.024);
        const foldX = mix(0.0165, 0.0315, t);
        d -= 0.0016 * this.age * gauss(ax - foldX, 0.0028) * sstep(0.03, 0.036, y) * (1 - sstep(0.054, 0.058, y));
        d -= 0.0012 * this.age * gauss2(ax - this.eyeX, 0.012, y - 0.0885, 0.004);
      }
      d *= front;
    }

    // Cheekbones, the hollow under them, the angle of the jaw, temples, neck cords.
    d += (0.0042 + 0.003 * f.cheekbones) * gauss2(at - 0.92, 0.3, y - 0.079, 0.0165);
    d += 0.0022 * gauss2(at - 0.45, 0.22, y - 0.066, 0.016);
    d -= (0.0012 + 0.003 * f.cheekHollow) * gauss2(at - 0.85, 0.28, y - 0.04, 0.02);
    d += (0.0025 + 0.004 * f.jawSquare) * gauss2(at - 1.42, 0.24, y - 0.012, 0.014);
    d -= 0.0018 * gauss2(at - 1.15, 0.24, y - 0.125, 0.02);
    // Jawline: the border of the jaw rises from the chin to the ear, with the neck tucked in under it.
    const jb = jawBorder(at);
    const jawSide = sstep(0.25, 0.7, at) * (1 - sstep(1.45, 1.75, at));
    d -= (0.0065 + 0.002 * f.jawSquare) * gauss(y - (jb - 0.013), 0.009) * jawSide;
    d += 0.0018 * gauss(y - jb, 0.005) * jawSide;
    d += 0.002 * gauss2(at - 0.75, 0.22, y + 0.05, 0.03);
    r += d;

    // Eyelids: skin draped over the eyeball, then parted along the lid margins.
    if (c > 0.4 && Math.abs(y - EYE_Y) < EYE_R + LID) {
      const side = s >= 0 ? 1 : -1;
      const oy = y - EYE_Y;
      const oz = this.eyeZ - p.az;
      const b = s * side * this.eyeX + c * oz;
      const cc = this.eyeX * this.eyeX + oy * oy + oz * oz;
      const rl = EYE_R + LID;
      const disc = b * b - (cc - rl * rl);
      if (disc > 0) {
        const tl = b + Math.sqrt(disc);
        r = smax(r, tl, 0.0016);
        const L = this.lids(side * tl * s - this.eyeX, oy);
        // The fold above the upper lid.
        if (Math.abs(L.un) < 1) r -= 0.001 * gauss(L.v - (L.up + 0.0034), 0.0011) * (1 - L.un * L.un);
        if (L.inside > 0) {
          const rb = EYE_R - 0.0035;
          const back = b + Math.sqrt(Math.max(0, b * b - (cc - rb * rb)));
          r = mix(r, back, sstep(0, 0.0009, L.inside));
        }
      }
    }

    // Lower neck: land exactly on the torso's neck so the two skins meet without a step.
    if (this.neck && y < -0.014) {
      const yModel = y + 1.58;
      const target = this.neck(theta, yModel) + 0.0012;
      r = mix(target, r, sstep(-0.044, -0.016, y));
    }
    return r;
  }

  point(theta: number, y: number, out: THREE.Vector3, p: RowProfile = this.profile(y)): THREE.Vector3 {
    const r = this.radius(theta, y, p);
    return out.set(r * Math.sin(theta), y, p.az + r * Math.cos(theta));
  }
}

export interface HeadGrid {
  geo: THREE.BufferGeometry;
  /** Sample lines of the grid: texture u follows `thetas`, v follows `ys`. */
  thetas: number[];
  ys: number[];
}

/** The skin of the head, densest around the eyes, nose and mouth. */
export function buildHeadSkin(shape: HeadShape): HeadGrid {
  const ys = spaced(HEAD_BOTTOM, HEAD_TOP, (y) => {
    let d = 230;
    d += 190 * sstep(-0.025, -0.01, y) * (1 - sstep(0.125, 0.14, y));
    d += 620 * gauss(y - EYE_Y, 0.0105);
    d += 380 * gauss(y - 0.0365, 0.008);
    d += 300 * gauss(y - 0.054, 0.007);
    d += 500 * sstep(0.215, HEAD_TOP, y);
    return d;
  });
  const thetas = spaced(-Math.PI, Math.PI, (t) => {
    const a = Math.abs(t);
    let d = 11;
    d += 22 * (1 - sstep(0.9, 1.7, a));
    d += 62 * gauss(a - 0.36, 0.2);
    d += 30 * gauss(a, 0.13);
    return d;
  });
  const P: THREE.Vector3[][] = [];
  for (let i = 0; i < ys.length; i++) {
    const prof = shape.profile(ys[i]);
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < thetas.length; j++) row.push(shape.point(thetas[j], ys[i], new THREE.Vector3(), prof));
    P.push(row);
  }
  const geo = gridMesh(P, (i, j) => [j / (thetas.length - 1), i / (ys.length - 1)], { wrap: true });
  return { geo, thetas, ys };
}

/** Eyeball: a sphere whose texture is centred on the pupil, looking straight ahead. */
export function buildEye(shape: HeadShape, side: 1 | -1): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(EYE_R, 28, 20);
  g.rotateX(Math.PI / 2);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, 0.5 + pos.getX(i) / (EYE_R * 2.2), 0.5 + pos.getY(i) / (EYE_R * 2.2));
  }
  g.translate(side * shape.eyeX, EYE_Y, shape.eyeZ);
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

/**
 * Ear: a thin shell with the real landmarks (rolled helix, antihelix ridge, concha bowl, tragus,
 * soft lobe), hinged at its front edge so the back stands off the skull.
 */
export function buildEar(shape: HeadShape, side: 1 | -1): THREE.BufferGeometry {
  const size = 1 + 0.14 * shape.face.earSize;
  const RINGS = 12;
  const SPOKES = 36;
  const halfA = 0.0162 * size;
  const halfB = 0.0318 * size;
  const build = (front: boolean): THREE.BufferGeometry => {
    const P: THREE.Vector3[][] = [];
    for (let i = 0; i <= RINGS; i++) {
      const rho = i / RINGS;
      const row: THREE.Vector3[] = [];
      for (let j = 0; j <= SPOKES; j++) {
        const phi = (j / SPOKES) * Math.PI * 2;
        const ca = Math.cos(phi);
        const sb = Math.sin(phi);
        // Outline: an egg, narrower toward the lobe.
        const narrow = 1 - 0.34 * sstep(-0.2, -1, sb);
        const a = halfA + ca * halfA * narrow * rho;
        const b = sb * halfB * rho;
        const lobe = sstep(-0.45, -0.9, sb);
        const top = sstep(-0.35, 0.2, sb);
        let h: number;
        if (front) {
          h = 0.0036 * gauss(rho - 0.88, 0.11) * (1 - lobe) * (1 - 0.6 * gauss(phi - Math.PI, 0.5) * (1 - top));
          h += 0.0014 * lobe * (1 - rho * rho);
          h += 0.0028 * gauss(rho - 0.52, 0.12) * sstep(-0.5, 0.1, ca + 0.5 * sb) * (1 - lobe);
          h -= 0.0062 * gauss2(ca * rho + 0.2, 0.3, sb * rho + 0.12, 0.34);
          h += 0.0042 * gauss2(ca * rho + 0.72, 0.2, sb * rho + 0.06, 0.2);
        } else {
          h = -0.0034 * Math.sqrt(Math.max(0, 1 - rho * rho));
        }
        row.push(new THREE.Vector3(a, b, h * size));
      }
      P.push(row);
    }
    return gridMesh(P, (i, j) => [j / SPOKES, i / RINGS], { wrap: true, flip: !front });
  };
  const fg = build(true);
  const bg = build(false);
  // Plate axes in head space: `a` runs front to back and outward, `b` up and a little back.
  const ax = new THREE.Vector3(side * 0.44, 0, -0.9).normalize();
  const bx = new THREE.Vector3(0, 0.985, -0.17).normalize();
  const nx = new THREE.Vector3().crossVectors(ax, bx).multiplyScalar(side).normalize();
  const root = shape.point(side * 1.66, 0.086, new THREE.Vector3());
  const m = new THREE.Matrix4().makeBasis(ax, bx, nx).setPosition(root.x - side * 0.0035, root.y, root.z + 0.004);
  const out: THREE.BufferGeometry[] = [];
  for (const g of [fg, bg]) {
    g.applyMatrix4(m);
    if (side < 0) flipWinding(g);
    out.push(g);
  }
  return merge(out);
}

function flipWinding(g: THREE.BufferGeometry): void {
  for (const name of Object.keys(g.attributes)) {
    const at = g.getAttribute(name) as THREE.BufferAttribute;
    const arr = at.array as unknown as number[];
    const n = at.itemSize;
    for (let t = 0; t + 2 < at.count; t += 3) {
      for (let k = 0; k < n; k++) {
        const a = (t + 1) * n + k;
        const b = (t + 2) * n + k;
        const tmp = arr[a];
        arr[a] = arr[b];
        arr[b] = tmp;
      }
    }
  }
}

export interface ShellSet {
  /** One geometry per layer, innermost first. */
  layers: THREE.BufferGeometry[];
}

/**
 * Hair and beard as stacked shells: each layer sits a little further off the skin and shows fewer
 * strands (alpha in the strand texture times the vertex alpha written here), which reads as
 * volume with a soft outline instead of a painted cap.
 */
export function buildShells(
  shape: HeadShape,
  layers: number,
  cover: (theta: number, y: number, x: number) => number,
  length: (theta: number, y: number) => number,
  lean: THREE.Vector3 | null,
  yRange: [number, number]
): THREE.BufferGeometry[] {
  const ys: number[] = [];
  const ROWS = 54;
  for (let i = 0; i <= ROWS; i++) ys.push(mix(yRange[0], yRange[1], i / ROWS));
  const COLS = 120;
  const thetas: number[] = [];
  for (let j = 0; j <= COLS; j++) thetas.push(-Math.PI + (j / COLS) * Math.PI * 2);
  const base: THREE.Vector3[][] = [];
  const mask: number[][] = [];
  const len: number[][] = [];
  for (let i = 0; i < ys.length; i++) {
    const prof = shape.profile(ys[i]);
    const row: THREE.Vector3[] = [];
    const mrow: number[] = [];
    const lrow: number[] = [];
    for (let j = 0; j < thetas.length; j++) {
      const p = shape.point(thetas[j], ys[i], new THREE.Vector3(), prof);
      row.push(p);
      mrow.push(cover(thetas[j], ys[i], p.x));
      lrow.push(length(thetas[j], ys[i]));
    }
    base.push(row);
    mask.push(mrow);
    len.push(lrow);
  }
  const out: THREE.BufferGeometry[] = [];
  for (let k = 0; k < layers; k++) {
    const t = layers > 1 ? k / (layers - 1) : 0;
    const P = base.map((row) => row.map((p) => p.clone()));
    pushOut(P, (i, j) => len[i][j] * (0.12 + 0.88 * t), true);
    if (lean) {
      for (let i = 0; i < P.length; i++) for (let j = 0; j < P[i].length; j++) P[i][j].addScaledVector(lean, len[i][j] * t * t);
    }
    const shade = 0.5 + 0.5 * t;
    out.push(
      gridMesh(P, (i, j) => [(thetas[j] / (Math.PI * 2)) * 9, (HEAD_TOP - ys[i]) * 15.6], {
        wrap: true,
        // Outer layers keep only the densest strands.
        color: (i, j) => [shade, shade, shade, mask[i][j] * (1 - 0.45 * t)],
        keep: (i, j) => mask[i][j] + mask[i][j + 1] + mask[i + 1][j] + mask[i + 1][j + 1] > 0.02,
      })
    );
  }
  return out;
}
