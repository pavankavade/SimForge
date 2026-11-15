// Measuring the imported body for its armour. The skin is posed into the logical rig's rest pose
// (standing, limbs straight down: the frame every plate is authored in) and cut into cross-sections
// along each limb bone and round the hips. Each section keeps its outline (the radius all the way
// round, not just a width and depth: an ellipse through the extremes cuts inside a muscular thigh
// on the diagonals), so plates built from them hug the actual body of each character (build,
// muscle and weight morphs) with a fixed clearance for the mail underneath.
import * as THREE from "three";
import type { Ring } from "./geo";
import { dominantJoints, type HumanAsset } from "./humanAsset";
import type { BodyRig } from "./retarget";
import { REST, type BoneName, type Rig } from "./rig";

/** Angles sampled round each section. */
const SECTORS = 24;

/** Cross-sections along one axis: per band, the extent of the skin in x and z and its outline. */
export interface Sections {
  y0: number;
  step: number;
  minX: number[];
  maxX: number[];
  minZ: number[];
  maxZ: number[];
  /** Outline radii per band about (cx, cz), SECTORS angles from +Z toward +X. */
  cx: number[];
  cz: number[];
  rad: number[][];
}

export interface BodyFit {
  /** Left-side limb sections in each bone's local rest frame (origin at the joint, limb down -Y). */
  limbs: Record<"upperArmL" | "foreArmL" | "thighL" | "shinL", Sections>;
  /** Waist, hips and the tops of the thighs in model space, about x = 0. */
  hips: Sections;
  /**
   * The left foot in footL's rest frame, cut across its length: bands run along +Z (heel to toe)
   * and hold the x extent in minX/maxX and the y extent (sole to instep) in minZ/maxZ.
   */
  foot: Sections;
  /** Heel and toe-tip positions along the foot (footL-local z). */
  footSpan: [number, number];
}

const LIMB_JOINTS: Record<keyof BodyFit["limbs"], string> = {
  upperArmL: "upperarm_l",
  foreArmL: "lowerarm_l",
  thighL: "thigh_l",
  shinL: "calf_l",
};

/**
 * Points collected per band (x, z pairs), turned into Sections by `finish`. Each band takes every
 * vertex within `window` of it: the skin's vertex rows are a couple of centimetres apart, so a thin
 * band alone catches only part of a ring and its centre jumps about.
 */
class Bands {
  readonly pts: number[][];
  constructor(
    readonly y0: number,
    readonly step: number,
    count: number,
    readonly window = 0.022
  ) {
    this.pts = [];
    for (let i = 0; i < count; i++) this.pts.push([]);
  }
  add(x: number, y: number, z: number): void {
    const lo = Math.ceil((y - this.window - this.y0) / this.step);
    const hi = Math.floor((y + this.window - this.y0) / this.step);
    for (let b = Math.max(0, lo); b <= Math.min(this.pts.length - 1, hi); b++) this.pts[b].push(x, z);
  }
  /** First and last bands holding any points. */
  span(): [number, number] {
    let a = 0;
    let b = this.pts.length - 1;
    while (a < b && !this.pts[a].length) a++;
    while (b > a && !this.pts[b].length) b--;
    // Undo the window's reach past the last real vertex.
    return [this.y0 + a * this.step + this.window, this.y0 + b * this.step - this.window];
  }

  /** Extents and outlines; `mirror` makes them symmetric about x = 0 (hips). */
  finish(mirror: boolean): Sections {
    const n = this.pts.length;
    const s: Sections = { y0: this.y0, step: this.step, minX: [], maxX: [], minZ: [], maxZ: [], cx: [], cz: [], rad: [] };
    for (let b = 0; b < n; b++) {
      const p = this.pts[b];
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (let i = 0; i < p.length; i += 2) {
        const x = mirror ? Math.abs(p[i]) : p[i];
        x0 = Math.min(x0, mirror ? -x : x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, p[i + 1]);
        z1 = Math.max(z1, p[i + 1]);
      }
      const cx = mirror ? 0 : (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const rad = new Array<number>(SECTORS).fill(-1);
      for (let i = 0; i < p.length; i += 2) {
        for (const sx of mirror ? [1, -1] : [1]) {
          const dx = p[i] * sx - cx;
          const dz = p[i + 1] - cz;
          let a = Math.atan2(dx, dz);
          if (a < 0) a += Math.PI * 2;
          const k = Math.round((a / (Math.PI * 2)) * SECTORS) % SECTORS;
          rad[k] = Math.max(rad[k], Math.hypot(dx, dz));
        }
      }
      s.minX.push(x0);
      s.maxX.push(x1);
      s.minZ.push(z0);
      s.maxZ.push(z1);
      s.cx.push(cx);
      s.cz.push(cz);
      s.rad.push(rad);
    }
    // Fill empty bands from their neighbours.
    const filled = (b: number) => isFinite(s.minX[b]);
    const copy = (to: number, from: number) => {
      s.minX[to] = s.minX[from];
      s.maxX[to] = s.maxX[from];
      s.minZ[to] = s.minZ[from];
      s.maxZ[to] = s.maxZ[from];
      s.cx[to] = s.cx[from];
      s.cz[to] = s.cz[from];
      s.rad[to] = s.rad[from].slice();
    };
    for (let b = 1; b < n; b++) if (!filled(b) && filled(b - 1)) copy(b, b - 1);
    for (let b = n - 2; b >= 0; b--) if (!filled(b) && filled(b + 1)) copy(b, b + 1);
    for (const r of s.rad) {
      // Empty sectors: interpolate round the ring; then no sector may dip below its neighbours'
      // average (sparse vertices would otherwise leave dents).
      const have: number[] = [];
      for (let k = 0; k < SECTORS; k++) if (r[k] >= 0) have.push(k);
      if (!have.length) r.fill(0.01);
      else {
        for (let k = 0; k < SECTORS; k++) {
          if (r[k] >= 0) continue;
          let lo = k;
          let hi = k;
          while (r[(lo + SECTORS) % SECTORS] < 0) lo--;
          while (r[hi % SECTORS] < 0) hi++;
          const t = (k - lo) / (hi - lo);
          r[k] = r[(lo + SECTORS) % SECTORS] * (1 - t) + r[hi % SECTORS] * t;
        }
      }
      for (let pass = 0; pass < 2; pass++) {
        const c = r.slice();
        for (let k = 0; k < SECTORS; k++) r[k] = Math.max(c[k], (c[(k + SECTORS - 1) % SECTORS] + c[(k + 1) % SECTORS]) / 2);
      }
    }
    // A three-band max along the axis, so a plate never pinches in between two bands.
    const rad = s.rad.map((r) => r.slice());
    for (let b = 0; b < n; b++) {
      for (let k = 0; k < SECTORS; k++) s.rad[b][k] = Math.max(rad[Math.max(0, b - 1)][k], rad[b][k], rad[Math.min(n - 1, b + 1)][k]);
    }
    for (const a of [s.maxX, s.maxZ]) {
      const c = a.slice();
      for (let b = 0; b < n; b++) a[b] = Math.max(c[Math.max(0, b - 1)], c[b], c[Math.min(n - 1, b + 1)]);
    }
    for (const a of [s.minX, s.minZ]) {
      const c = a.slice();
      for (let b = 0; b < n; b++) a[b] = Math.min(c[Math.max(0, b - 1)], c[b], c[Math.min(n - 1, b + 1)]);
    }
    return s;
  }
}

/**
 * Measure the body skin `skin` (skinned to `bodyRig`) with the logical rig at rest. Call right after
 * the BodyRig is built, before any animation has moved the rig.
 */
export function measureBody(a: HumanAsset, skin: THREE.BufferGeometry, bodyRig: BodyRig, rig: Rig): BodyFit {
  const mesh = new THREE.SkinnedMesh(skin);
  mesh.bind(bodyRig.skeleton, new THREE.Matrix4());
  rig.root.updateMatrixWorld(true);
  const dom = dominantJoints(skin);
  const count = (skin.getAttribute("position") as THREE.BufferAttribute).count;

  const limbBands = {} as Record<keyof BodyFit["limbs"], Bands>;
  const jointOf: Record<number, keyof BodyFit["limbs"]> = {};
  for (const k of Object.keys(LIMB_JOINTS) as Array<keyof BodyFit["limbs"]>) {
    limbBands[k] = new Bands(-0.62, 0.01, 72);
    jointOf[a.index[LIMB_JOINTS[k]]] = k;
  }
  // Hips: the pelvis and thighs from the crotch up past the waist.
  const hips = new Bands(0.74, 0.01, 54, 0.015);
  const hipJoints = ["pelvis", "spine_01", "spine_02", "thigh_l", "thigh_r"].map((n) => a.index[n]);
  const foot = new Bands(-0.14, 0.01, 40, 0.012);
  const footJoints = ["foot_l", "ball_l"].map((n) => a.index[n]);

  // A vertex counts for a limb when that limb's bone moves a fair share of it, not only when it is
  // the main one: the outside of the hip, for one, is mostly weighted to the pelvis but is still
  // the thigh's outline that a cuisse has to clear.
  const si = skin.getAttribute("skinIndex") as THREE.BufferAttribute;
  const sw = skin.getAttribute("skinWeight") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const limbsHere: Array<keyof BodyFit["limbs"]> = [];
    for (let k = 0; k < 4; k++) {
      const l = jointOf[si.getComponent(i, k)];
      if (l && sw.getComponent(i, k) >= 0.2 && limbsHere.indexOf(l) < 0) limbsHere.push(l);
    }
    const hip = hipJoints.indexOf(dom[i]) >= 0;
    const ft = footJoints.indexOf(dom[i]) >= 0;
    if (!limbsHere.length && !hip && !ft) continue;
    mesh.getVertexPosition(i, p);
    if (hip) hips.add(p.x, p.y, p.z);
    for (const limb of limbsHere) {
      const r = REST[limb as BoneName];
      limbBands[limb].add(p.x - r.x, p.y - r.y, p.z - r.z);
    }
    if (ft) {
      const r = REST.footL;
      foot.add(p.x - r.x, p.z - r.z, p.y - r.y);
    }
  }
  const limbs = {} as BodyFit["limbs"];
  for (const k of Object.keys(limbBands) as Array<keyof BodyFit["limbs"]>) limbs[k] = limbBands[k].finish(false);
  return { limbs, hips: hips.finish(true), foot: foot.finish(false), footSpan: foot.span() };
}

/** Linear sample of per-band values at `y`. */
function sample(s: Sections, y: number): (a: number[]) => number {
  const f = Math.max(0, Math.min(s.minX.length - 1.001, (y - s.y0) / s.step));
  const i = Math.floor(f);
  const k = f - i;
  return (a: number[]) => a[i] + (a[i + 1] - a[i]) * k;
}

/** A loft ring following the section's outline at `y`, padded out by `pad`. */
export function fitRing(s: Sections, y: number, pad: number, n?: number): Ring {
  const at = sample(s, y);
  const f = Math.max(0, Math.min(s.minX.length - 1.001, (y - s.y0) / s.step));
  const i = Math.floor(f);
  const k = f - i;
  const radial = s.rad[i].map((r, j) => r + (s.rad[i + 1][j] - r) * k + pad);
  const x0 = at(s.minX);
  const x1 = at(s.maxX);
  return {
    y,
    x: at(s.cx),
    z: at(s.cz),
    rx: (x1 - x0) / 2 + pad,
    rf: Math.max(0.01, at(s.maxZ) - at(s.cz)) + pad,
    rb: Math.max(0.01, at(s.cz) - at(s.minZ)) + pad,
    n,
    radial,
  };
}

/** Rings along a section from y = a to y = b (inclusive), `count` of them. */
export function fitRings(s: Sections, a: number, b: number, count: number, pad: (t: number) => number, n?: number): Ring[] {
  const out: Ring[] = [];
  for (let j = 0; j < count; j++) {
    const t = j / (count - 1);
    out.push(fitRing(s, a + (b - a) * t, pad(t), n));
  }
  return out;
}
