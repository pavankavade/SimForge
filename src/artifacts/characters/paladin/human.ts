// The earlier procedural head on a sculpted neck, built from a HumanSpec. The body itself now comes
// from the imported base human (body.ts); this stays only so the two faces can be compared
// (`?head=classic` in the lab) until the imported head is signed off.
import * as THREE from "three";
import type { Slot } from "./build";
import { paintHead, type HeadTextures } from "./facePaint";
import { weighted, type Influence } from "./geo";
import { HEAD_BOTTOM, HEAD_TOP, HeadShape, buildEar, buildEye, buildHeadSkin, buildShells } from "./head";
import type { MatKey } from "./materials";
import { AUTHOR, B, REST, type BoneName } from "./rig";
import { clamp01, curve, gauss, gauss2, mix, sstep, superR, type Surface } from "./sculpt";
import type { HumanSpec } from "./spec";

const PI = Math.PI;

export interface PieceSink {
  add(slot: Slot, mat: MatKey, g: THREE.BufferGeometry): void;
  put(slot: Slot, mat: MatKey, bone: BoneName, g: THREE.BufferGeometry): void;
  pair(slot: Slot, mat: MatKey, boneL: BoneName, g: THREE.BufferGeometry): void;
  pairWeighted(slot: Slot, mat: MatKey, g: THREE.BufferGeometry, fn: (p: THREE.Vector3) => Influence): void;
}

type Keys = Array<[number, number, number, number]>;

/** Split [y, a, b, c] keys into three curves. */
function curves3(keys: Keys): [(y: number) => number, (y: number) => number, (y: number) => number] {
  return [
    curve(keys.map((k): [number, number] => [k[0], k[1]])),
    curve(keys.map((k): [number, number] => [k[0], k[2]])),
    curve(keys.map((k): [number, number] => [k[0], k[3]])),
  ];
}

const TORSO_TOP = 1.6;
const TORSO_BOTTOM = 0.792;
// y, half width, front depth, back depth.
const TORSO: Keys = [
  [TORSO_BOTTOM, 0.0, 0.0, 0.0],
  [0.8, 0.07, 0.05, 0.058],
  [0.815, 0.118, 0.076, 0.088],
  [0.84, 0.158, 0.092, 0.104],
  [0.9, 0.17, 0.1, 0.116],
  [0.96, 0.164, 0.103, 0.11],
  [1.02, 0.152, 0.1, 0.098],
  [1.08, 0.141, 0.097, 0.092],
  [1.15, 0.146, 0.104, 0.097],
  [1.23, 0.157, 0.112, 0.104],
  [1.31, 0.17, 0.122, 0.11],
  [1.385, 0.182, 0.126, 0.114],
  [1.43, 0.192, 0.118, 0.113],
  [1.452, 0.197, 0.11, 0.112],
  [1.468, 0.186, 0.099, 0.107],
  [1.48, 0.152, 0.086, 0.099],
  [1.497, 0.102, 0.069, 0.087],
  [1.515, 0.074, 0.058, 0.075],
  [1.535, 0.063, 0.053, 0.066],
  [1.56, 0.058, 0.051, 0.061],
  [TORSO_TOP, 0.056, 0.05, 0.058],
];
const ARM_TOP = 1.497;
const ARM_BOTTOM = 0.875;
// y, half thickness (x), front (z), back (z).
const ARM: Keys = [
  [ARM_BOTTOM, 0.0205, 0.0285, 0.0285],
  [0.92, 0.024, 0.03, 0.03],
  [0.98, 0.031, 0.035, 0.035],
  [1.04, 0.037, 0.0405, 0.04],
  [1.09, 0.0405, 0.0435, 0.042],
  [1.13, 0.039, 0.041, 0.041],
  [1.15, 0.0385, 0.04, 0.0425],
  [1.18, 0.039, 0.041, 0.042],
  [1.24, 0.043, 0.0465, 0.0455],
  [1.3, 0.0455, 0.05, 0.0485],
  [1.36, 0.047, 0.0505, 0.05],
  [1.41, 0.0535, 0.055, 0.0545],
  [1.452, 0.056, 0.055, 0.054],
  [1.478, 0.044, 0.044, 0.043],
  [1.491, 0.025, 0.025, 0.025],
  [ARM_TOP, 0, 0, 0],
];
const LEG_TOP = 1.0;
const LEG_BOTTOM = 0.045;
const LEG: Keys = [
  [LEG_BOTTOM, 0.03, 0.034, 0.04],
  [0.085, 0.031, 0.034, 0.042],
  [0.14, 0.033, 0.035, 0.041],
  [0.22, 0.041, 0.042, 0.053],
  [0.31, 0.051, 0.047, 0.066],
  [0.37, 0.0535, 0.049, 0.066],
  [0.43, 0.049, 0.05, 0.055],
  [0.47, 0.0485, 0.054, 0.05],
  [0.505, 0.053, 0.059, 0.052],
  [0.54, 0.0555, 0.061, 0.054],
  [0.62, 0.064, 0.069, 0.066],
  [0.72, 0.0755, 0.081, 0.079],
  [0.82, 0.079, 0.086, 0.088],
  [0.9, 0.073, 0.08, 0.086],
  [0.955, 0.064, 0.07, 0.076],
  [0.985, 0.046, 0.05, 0.056],
  [LEG_TOP, 0, 0, 0],
];

function distToSegment(x: number, y: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = clamp01(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy));
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
}

/** The body below the head as three surfaces: torso, left arm, left leg (right side is mirrored). */
export class BodyShape {
  readonly torso: Surface;
  readonly arm: Surface;
  readonly leg: Surface;
  private readonly tw: Array<(y: number) => number>;
  private readonly m: number;
  private readonly bulk: number;

  constructor(spec: HumanSpec) {
    this.m = spec.muscle;
    this.bulk = spec.bulk;
    this.tw = curves3(TORSO);
    const aw = curves3(ARM);
    const lw = curves3(LEG);
    const m = this.m;
    const limb = 1 + 0.06 * spec.bulk + 0.05 * (m - 0.5);

    this.torso = (theta, y, out) => {
      const r = this.torsoRadius(theta, y);
      return out.set(r * Math.sin(theta), y, r * Math.cos(theta));
    };

    const armX = REST.upperArmL.x;
    this.arm = (theta, y, out) => {
      let r = superR(theta, aw[0](y), aw[1](y), aw[2](y), 2.1) * limb;
      const back = PI - Math.abs(theta);
      // Biceps, triceps, the deltoid cap, the forearm's outer belly, the point of the elbow.
      r += (0.003 + 0.007 * m) * gauss2(theta - 0.1, 0.7, y - 1.285, 0.045);
      r += (0.002 + 0.004 * m) * gauss2(back, 0.8, y - 1.31, 0.05);
      r += (0.005 + 0.008 * m) * gauss2(theta - PI / 2, 0.9, y - 1.425, 0.04);
      r += (0.002 + 0.003 * m) * gauss2(theta - 0.6, 0.6, y - 1.085, 0.04);
      r += 0.004 * gauss2(back, 0.5, y - 1.152, 0.012);
      if (y >= ARM_TOP) r = 0;
      return out.set(armX + r * Math.sin(theta), y, r * Math.cos(theta));
    };

    const legX = REST.thighL.x;
    this.leg = (theta, y, out) => {
      let r = superR(theta, lw[0](y), lw[1](y), lw[2](y), 2.1) * (y > 0.2 ? limb : 1);
      const back = PI - Math.abs(theta);
      // Thigh: the three visible heads of the quadriceps and the hamstrings behind.
      r += (0.002 + 0.003 * m) * gauss2(theta, 0.6, y - 0.73, 0.09);
      r += (0.002 + 0.004 * m) * gauss2(theta - 0.9, 0.5, y - 0.66, 0.09);
      r += (0.002 + 0.004 * m) * gauss2(theta + 0.75, 0.45, y - 0.575, 0.04);
      r += (0.002 + 0.003 * m) * gauss2(back, 0.7, y - 0.7, 0.1);
      // Kneecap, the two heads of the calf, the flat of the shin, the ankle bones.
      r += 0.004 * gauss2(theta, 0.4, y - 0.505, 0.022);
      r += (0.003 + 0.003 * m) * gauss2(theta + 2.4, 0.5, y - 0.355, 0.055);
      r += (0.002 + 0.002 * m) * gauss2(theta - 2.5, 0.5, y - 0.37, 0.05);
      r -= 0.002 * gauss2(theta, 0.35, y - 0.28, 0.1);
      r += 0.005 * gauss2(theta + PI / 2, 0.45, y - 0.088, 0.014);
      r += 0.005 * gauss2(theta - PI / 2, 0.45, y - 0.078, 0.014);
      if (y >= LEG_TOP) r = 0;
      return out.set(legX + r * Math.sin(theta), y, r * Math.cos(theta));
    };
  }

  /** Radius of the torso about the body's vertical axis. */
  torsoRadius(theta: number, y: number): number {
    const m = this.m;
    const fat = Math.max(0, this.bulk);
    const scale = 1 + 0.05 * this.bulk * (1 - sstep(1.44, 1.5, y));
    const n = y > 1.5 ? 2.0 : mix(2.7, 2.3, sstep(0.94, 1.06, y));
    let r = superR(theta, this.tw[0](y) * scale, this.tw[1](y) * scale, this.tw[2](y) * scale, n);
    if (y <= TORSO_BOTTOM) return 0;
    const x = r * Math.sin(theta);
    const ax = Math.abs(x);
    const at = Math.abs(theta);
    const c = Math.cos(theta);
    const front = sstep(0, 0.5, c);
    const back = sstep(0, 0.5, -c);
    const win = (a: number, b: number) => sstep(a, a + 0.03, y) * (1 - sstep(b - 0.03, b, y));
    let d = 0;
    if (front > 0) {
      let f = 0;
      // Chest: two slabs with a fold underneath and a furrow between.
      f += (0.009 + 0.011 * m) * gauss2(ax - 0.08, 0.056, y - 1.372, 0.042) * (0.3 + 0.7 * sstep(1.3, 1.328, y));
      f -= (0.002 + 0.003 * m) * gauss2(x, 0.011, y - 1.37, 0.06);
      // Belly: the midline, four rows of muscle, the navel; fat fills it out instead.
      f -= (0.0015 + 0.003 * m) * (1 - 0.8 * fat) * gauss(x, 0.007) * win(1.04, 1.29);
      for (const yc of [1.265, 1.205, 1.145, 1.085]) f += 0.0052 * m * (1 - fat) * gauss2(ax - 0.033, 0.021, y - yc, 0.018);
      f -= 0.006 * gauss2(x, 0.0055, y - 1.068, 0.005);
      f += 0.022 * fat * gauss2(x, 0.1, y - 1.08, 0.085);
      // Collarbones and the notch between them.
      f += 0.0045 * gauss(distToSegment(ax, y, 0.02, 1.468, 0.165, 1.478), 0.006);
      f -= 0.004 * gauss2(x, 0.012, y - 1.462, 0.009);
      d += f * front;
    }
    if (back > 0) {
      let b = 0;
      // Spine furrow, shoulder blades, the neck-to-shoulder slope, the columns beside the spine.
      b -= (0.003 + 0.004 * m) * gauss(x, 0.012) * win(0.98, 1.46);
      b += (0.003 + 0.004 * m) * gauss2(ax - 0.085, 0.045, y - 1.36, 0.055);
      b += (0.004 + 0.004 * m) * gauss2(ax - 0.05, 0.05, y - 1.475, 0.03);
      b += (0.002 + 0.002 * m) * gauss2(ax - 0.03, 0.018, y - 1.1, 0.07);
      // Buttocks and the cleft.
      b += 0.01 * gauss2(ax - 0.075, 0.055, y - 0.895, 0.06);
      b -= 0.012 * gauss(x, 0.011) * sstep(0.97, 0.9, y);
      d += b * back;
    }
    // Sides: the wings of the back, the obliques, the neck cords, and any spare flesh.
    d += (0.003 + 0.005 * m) * gauss2(at - 2.0, 0.35, y - 1.28, 0.07);
    d += 0.003 * m * gauss2(at - 1.0, 0.3, y - 1.03, 0.035);
    d += 0.002 * gauss2(at - 0.6, 0.25, y - 1.53, 0.03);
    d += 0.012 * fat * gauss2(at - 1.5, 0.5, y - 1.02, 0.05);
    r += d;
    return r;
  }
}

/** Blend along a chain of bones: cut k fades bones[k] into bones[k+1] across [a, b] of `t`. */
function chain(t: number, bones: number[], cuts: Array<[number, number]>): Influence {
  for (let k = 0; k < cuts.length; k++) {
    const f = sstep(cuts[k][0], cuts[k][1], t);
    if (f <= 0) return [[bones[k], 1]];
    if (f < 1) return [
      [bones[k], 1 - f],
      [bones[k + 1], f],
    ];
  }
  return [[bones[bones.length - 1], 1]];
}

export interface HumanBuild {
  /** Painted skin for the head, to be put on the face material. */
  headTextures: HeadTextures;
}

/** The earlier procedural head (kept to compare against the imported one; `?head=classic`). */
export function buildClassicHead(P: PieceSink, spec: HumanSpec): HumanBuild {
  const body = new BodyShape(spec);
  const head = new HeadShape(spec, (theta, y) => body.torsoRadius(theta, y));

  // ---- Head ----------------------------------------------------------------------------------
  const grid = buildHeadSkin(head);
  const headTextures = paintHead(spec, head, grid);
  const hr = AUTHOR.head;
  grid.geo.translate(hr.x, hr.y, hr.z);
  P.add(
    "head",
    "faceSkin",
    weighted(grid.geo, (p) =>
      chain(p.y, [B.chest, B.neck, B.head], [
        [1.49, 1.54],
        [1.56, 1.6],
      ])
    )
  );
  for (const side of [1, -1] as const) {
    P.put("head", "eye", "head", buildEye(head, side));
    P.put("head", "skin", "head", buildEar(head, side));
  }

  // Hair and beard shells.
  const style = spec.hair.style;
  if (style !== "bald") {
    const top = (y: number) => sstep(0.12, 0.185, y);
    const length = (theta: number, y: number): number => {
      const frontness = sstep(-0.2, 0.9, Math.cos(theta));
      if (style === "buzz") return 0.0032;
      if (style === "crop") return mix(0.0045, 0.013, top(y)) * (0.8 + 0.2 * frontness);
      return mix(0.007, 0.03, top(y) * (0.55 + 0.45 * frontness));
    };
    const lean = style === "swept" ? new THREE.Vector3(0, 0.12, -0.75) : style === "crop" ? new THREE.Vector3(0, 0.05, -0.18) : null;
    const layers = style === "buzz" ? 3 : style === "crop" ? 5 : 7;
    for (const g of buildShells(head, layers, (theta, y) => head.scalp(theta, y), length, lean, [0.0, HEAD_TOP])) {
      P.put("head", "hair", "head", g);
    }
  }
  if (spec.beard > 0.5) {
    const len = mix(0.003, 0.009, clamp01((spec.beard - 0.5) * 2));
    const shells = buildShells(
      head,
      4,
      (theta, y, x) => head.beard(theta, Math.abs(x), y) * 0.92,
      (theta, y) => len * (0.7 + 0.5 * gauss(y - 0.0, 0.03) * sstep(0.3, 0.9, Math.cos(theta))),
      new THREE.Vector3(0, -0.25, 0.05),
      [HEAD_BOTTOM + 0.02, 0.105]
    );
    for (const g of shells) P.put("head", "hair", "head", g);
  }

  return { headTextures };
}
