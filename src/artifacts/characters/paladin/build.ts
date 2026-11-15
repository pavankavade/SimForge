// The paladin's harness on the imported body. Every plate is a rigid piece bound to one bone of the
// logical rig; pieces are authored for the left side (+X) in bone-local space (origin at the joint,
// limb running down -Y) and mirrored for the right. The skin, the soft layers and the mail shirt
// come from body.ts and are skinned to the imported skeleton instead.
import * as THREE from "three";
import {
  bead,
  box,
  cyl,
  loft,
  merge,
  mirrorX,
  rigid,
  ringPoint,
  smooth,
  sphere,
  tf,
  torus,
  tube,
  weighted,
  type Influence,
  type Ring,
} from "./geo";
import type { BodyBuild } from "./body";
import { warpTorso } from "./fit";
import { fitRing, fitRings, type BodyFit } from "./measure";
import { buildClassicHead } from "./human";
import type { HumanSpec } from "./spec";
import type { HumanMaterials, MatKey, PaladinMaterials } from "./materials";
import type { BodyRig } from "./retarget";
import { AUTHOR, B, BONE_NAMES, DIM, REST, type BoneName, type Rig } from "./rig";

export const SLOTS = [
  "body",
  "hands",
  "feet",
  "head",
  "braies",
  "doublet",
  "shoes",
  "mail",
  "helm",
  "gorget",
  "cuirass",
  "pauldrons",
  "arms",
  "gauntlets",
  "waist",
  "cuisses",
  "greaves",
  "sabatons",
] as const;

export type Slot = (typeof SLOTS)[number];

const PI = Math.PI;

const LIMB = /^(clav|upperArm|foreArm|hand|pauldron|thigh|shin|foot|toe)/;

/**
 * Where a piece authored in `bone`'s local frame sits at rest. The torso plates keep the heights
 * they were authored at (the imported spine joints sit lower than the old ones); limb plates keep
 * their authored height but follow the imported limb's line (x, z).
 */
export function authorAnchor(bone: BoneName): THREE.Vector3 {
  const a = AUTHOR[bone];
  return LIMB.test(bone) ? new THREE.Vector3(REST[bone].x, a.y, REST[bone].z) : a.clone();
}

/** Bone-local offset authored against the old joints, moved onto the live rest pose. */
export function authorLocal(bone: BoneName, v: [number, number, number]): [number, number, number] {
  const d = authorAnchor(bone).sub(REST[bone]);
  return [v[0] + d.x, v[1] + d.y, v[2] + d.z];
}

/** Bone index of the opposite side (L <-> R). */
const MIRROR: number[] = BONE_NAMES.map((n) => {
  const last = n.charAt(n.length - 1);
  if (last === "L") return B[(n.slice(0, -1) + "R") as BoneName];
  if (last === "R") return B[(n.slice(0, -1) + "L") as BoneName];
  return B[n];
});

class Pieces {
  private readonly lists: Record<string, THREE.BufferGeometry[]> = {};

  add(slot: Slot, mat: MatKey, g: THREE.BufferGeometry): void {
    const key = `${slot}:${mat}`;
    if (!this.lists[key]) this.lists[key] = [];
    this.lists[key].push(g);
  }

  /** Rigid piece authored in the local frame of `bone`. */
  put(slot: Slot, mat: MatKey, bone: BoneName, g: THREE.BufferGeometry): void {
    const r = authorAnchor(bone);
    g.translate(r.x, r.y, r.z);
    this.add(slot, mat, rigid(g, B[bone]));
  }

  /** Rigid piece authored for a left-side bone, placed on both sides. */
  pair(slot: Slot, mat: MatKey, boneL: BoneName, g: THREE.BufferGeometry): void {
    const other = mirrorX(g);
    this.put(slot, mat, boneL, g);
    this.put(slot, mat, BONE_NAMES[MIRROR[B[boneL]]], other);
  }

  /** Rigid piece in the local frame of the live rest joint (pieces fitted to the measured body). */
  fit(slot: Slot, mat: MatKey, bone: BoneName, g: THREE.BufferGeometry): void {
    const r = REST[bone];
    g.translate(r.x, r.y, r.z);
    this.add(slot, mat, rigid(g, B[bone]));
  }

  /** `fit` for a left-side bone and its mirror on the right. */
  fitPair(slot: Slot, mat: MatKey, boneL: BoneName, g: THREE.BufferGeometry): void {
    const other = mirrorX(g);
    this.fit(slot, mat, boneL, g);
    this.fit(slot, mat, BONE_NAMES[MIRROR[B[boneL]]], other);
  }

  /** Smooth-skinned piece authored in model space for the left side, mirrored to the right. */
  pairWeighted(slot: Slot, mat: MatKey, g: THREE.BufferGeometry, fn: (p: THREE.Vector3) => Influence): void {
    weighted(g, fn);
    const other = mirrorX(g);
    const idx = other.getAttribute("skinIndex") as THREE.BufferAttribute;
    for (let i = 0; i < idx.count * 4; i++) (idx.array as Uint16Array)[i] = MIRROR[(idx.array as Uint16Array)[i]];
    this.add(slot, mat, g);
    this.add(slot, mat, other);
  }

  /**
   * Move vertices (model space) through `fn`, which returns the local x/z scale it applied, for
   * every piece and vertex `take` accepts (by slot, material and dominant bone).
   */
  warp(fn: (p: THREE.Vector3) => [number, number], take: (slot: Slot, mat: MatKey, bone: number) => boolean): void {
    const p = new THREE.Vector3();
    for (const key of Object.keys(this.lists)) {
      const [slot, mat] = key.split(":") as [Slot, MatKey];
      for (const g of this.lists[key]) {
        const pos = g.getAttribute("position") as THREE.BufferAttribute;
        const nor = g.getAttribute("normal") as THREE.BufferAttribute;
        const si = g.getAttribute("skinIndex") as THREE.BufferAttribute;
        const sw = g.getAttribute("skinWeight") as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let best = 0;
          for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
          if (!take(slot, mat, si.getComponent(i, best))) continue;
          const [sx, sz] = fn(p.fromBufferAttribute(pos, i));
          pos.setXYZ(i, p.x, p.y, p.z);
          if (nor) {
            p.set(nor.getX(i) / sx, nor.getY(i), nor.getZ(i) / sz).normalize();
            nor.setXYZ(i, p.x, p.y, p.z);
          }
        }
      }
    }
  }

  build(slot: Slot, mats: PaladinMaterials, rig: Rig): THREE.SkinnedMesh[] {
    const out: THREE.SkinnedMesh[] = [];
    for (const key of Object.keys(this.lists)) {
      const [s, mat] = key.split(":") as [Slot, MatKey];
      if (s !== slot) continue;
      const mesh = new THREE.SkinnedMesh(merge(this.lists[key]), mats.skinned[mat]);
      mesh.name = `paladin-${slot}-${mat}`;
      mesh.bind(rig.skeleton, new THREE.Matrix4());
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      out.push(mesh);
    }
    return out;
  }
}

/** Blend along a chain of bones: cut k fades bones[k] into bones[k+1] across [a, b] of `t`. */
function chain(t: number, bones: number[], cuts: Array<[number, number]>): Influence {
  for (let k = 0; k < cuts.length; k++) {
    const f = smooth(cuts[k][0], cuts[k][1], t);
    if (f <= 0) return [[bones[k], 1]];
    if (f < 1) return [
      [bones[k], 1 - f],
      [bones[k + 1], f],
    ];
  }
  return [[bones[bones.length - 1], 1]];
}

const grow = (r: Ring, d: number): Ring => ({ ...r, rx: r.rx + d, rf: r.rf + d, rb: (r.rb ?? r.rf) + d });

/** Mail that hangs off the helm rather than lying on the body (the shirt itself is a skin shell). */
function underLayer(P: Pieces): void {
  // Aventail: mail falling from the helm over the collar (hidden in first person).
  const aventail = loft(
    [
      { y: 1.452, rx: 0.152, rf: 0.128, rb: 0.134 },
      { y: 1.5, rx: 0.126, rf: 0.12, rb: 0.122 },
      { y: 1.548, rx: 0.106, rf: 0.122, rb: 0.117 },
    ],
    { seg: 24 }
  );
  P.add(
    "helm",
    "mail",
    weighted(aventail, (p) =>
      chain(p.y, [B.chest, B.neck, B.head], [
        [1.46, 1.5],
        [1.515, 1.548],
      ])
    )
  );
}

function torsoPlate(P: Pieces): void {
  const n = 2.3;
  const cuirass: Ring[] = [
    { y: -0.115, rx: 0.156, rf: 0.118, rb: 0.11, n },
    { y: -0.06, rx: 0.16, rf: 0.136, rb: 0.116, n },
    { y: 0.03, rx: 0.17, rf: 0.157, rb: 0.126, n },
    { y: 0.12, rx: 0.174, rf: 0.151, rb: 0.132, n },
    { y: 0.19, rx: 0.168, rf: 0.127, rb: 0.128, n },
    { y: 0.235, rx: 0.14, rf: 0.1, rb: 0.108, n: 2.2 },
    { y: 0.262, rx: 0.092, rf: 0.082, rb: 0.088 },
  ];
  P.put("cuirass", "steel", "chest", loft(cuirass, { seg: 32, thick: 0.005 }));
  P.put("cuirass", "gold", "chest", bead(grow(cuirass[0], 0.001), 0.006, { seg: 32 }));
  // Medial ridge down the breastplate.
  P.put(
    "cuirass",
    "steel",
    "chest",
    loft(
      cuirass.slice(0, 5).map((r) => grow(r, 0.0035)),
      { seg: 4, arc: [-0.07, 0.07] }
    )
  );
  // Sun-cross device on the breast: a gilt ring round a cross, the bars ending in small flares.
  P.put("cuirass", "gold", "chest", torus(0.034, 0.0042, { p: [0, 0.112, 0.161] }));
  P.put("cuirass", "gold", "chest", box(0.014, 0.112, 0.008, 0.003, { p: [0, 0.106, 0.161] }));
  P.put("cuirass", "gold", "chest", box(0.074, 0.014, 0.008, 0.003, { p: [0, 0.122, 0.16] }));
  for (const [x, y] of [
    [0, 0.165],
    [0, 0.047],
    [0.04, 0.122],
    [-0.04, 0.122],
  ]) {
    P.put("cuirass", "gold", "chest", sphere(0.008, { p: [x, y, 0.16], s: [1, 1, 0.5] }, 10, 8));
  }
  // Cape clasps on the shoulders.
  for (const s of [-1, 1]) P.put("cuirass", "gold", "chest", sphere(0.019, { p: [s * 0.118, 0.212, 0.1], s: [1, 1, 0.55] }));

  // Gorget (hidden in first person with the helm).
  const gorget: Ring[] = [
    { y: 0.228, rx: 0.108, rf: 0.1, rb: 0.102 },
    { y: 0.272, rx: 0.084, rf: 0.082, rb: 0.082 },
    { y: 0.305, rx: 0.08, rf: 0.08, rb: 0.08 },
  ];
  P.put("gorget", "steel", "chest", loft(gorget, { seg: 24, thick: 0.004 }));
  P.put("gorget", "gold", "chest", bead(gorget[2], 0.005, { seg: 24 }));
  P.put("gorget", "steel", "chest", bead(gorget[0], 0.0045, { seg: 24 }));
}

function armPlate(P: Pieces): void {
  // Pauldron: a domed cap and two sliding lames.
  P.pair("pauldrons", "steel", "pauldronL", sphere(0.108, { s: [1.08, 0.9, 1.16], r: [0, 0, -0.5], p: [0.012, 0.016, 0] }, 22, 12, 0, PI * 0.56));
  const lames: Ring[][] = [
    [
      { y: -0.108, rx: 0.084, rf: 0.085 },
      { y: -0.05, rx: 0.089, rf: 0.094 },
    ],
    [
      { y: -0.155, rx: 0.075, rf: 0.076 },
      { y: -0.1, rx: 0.081, rf: 0.083 },
    ],
  ];
  const outer: [number, number] = [-0.5, PI + 0.5];
  for (let k = 0; k < lames.length; k++) {
    P.pair("pauldrons", "steel", "pauldronL", loft(lames[k], { seg: 16, arc: outer, thick: 0.004 }));
    P.pair("pauldrons", k === 1 ? "gold" : "steel", "pauldronL", bead(lames[k][0], 0.0045, { seg: 16, arc: outer }));
  }
}

function legPlate(P: Pieces): void {
  // Tasset hanging from the fauld; it swings on its own bone.
  const tx = REST.thighL.x - REST.tassetL.x;
  const tz = -REST.tassetL.z;
  const tasset: Ring[] = [
    { y: -0.225, x: tx, z: tz, rx: 0.098, rf: 0.104 },
    { y: -0.11, x: tx, z: tz, rx: 0.104, rf: 0.113 },
    { y: 0.0, x: tx, z: tz, rx: 0.1, rf: 0.109 },
  ];
  const tArc: [number, number] = [-0.95, 1.5];
  P.pair("waist", "steel", "tassetL", loft(tasset, { seg: 14, arc: tArc, thick: 0.004 }));
  P.pair("waist", "gold", "tassetL", bead(tasset[0], 0.005, { seg: 14, arc: tArc }));
  P.pair("waist", "steel", "tassetL", bead({ y: -0.075, x: tx, z: tz, rx: 0.1035, rf: 0.112 }, 0.0035, { seg: 14, arc: tArc }));
  P.pair("waist", "steel", "tassetL", bead({ y: -0.15, x: tx, z: tz, rx: 0.103, rf: 0.111 }, 0.0035, { seg: 14, arc: tArc }));
}

// Clearance from the skin to the outside of a limb plate: the mail (5-6 mm), a gap, and the plate.
const ARM_PAD = 0.016;
const LEG_PAD = 0.015;

/**
 * The plates fitted to the measured body (measure.ts): arm and leg harness, the gauntlet cuffs,
 * and the belt and fauld round the hips. Limb pieces are authored in the live rest frame of their
 * bone (origin at the joint, limb down -Y), on the left, and mirrored.
 */
function fittedPlates(P: Pieces, fit: BodyFit): void {
  const UA = fit.limbs.upperArmL;
  const FA = fit.limbs.foreArmL;
  const TH = fit.limbs.thighL;
  const SH = fit.limbs.shinL;
  const LU = DIM.armUpper;
  const LF = DIM.armFore;
  const TL = DIM.legUpper;
  const SL = DIM.legLower;

  // Rerebrace: a closed tube from under the pauldron lames to above the elbow.
  const rere = fitRings(UA, -LU * 0.86, -LU * 0.3, 5, (t) => ARM_PAD + 0.002 * t);
  P.fitPair("arms", "steel", "upperArmL", loft(rere, { seg: 22, thick: 0.004 }));
  P.fitPair("arms", "steel", "upperArmL", bead(rere[0], 0.0045, { seg: 22 }));
  P.fitPair("arms", "steel", "upperArmL", bead(rere[4], 0.0045, { seg: 22 }));
  // Couter cupping the elbow (which points back, -Z), with a fan wing on the outside.
  const el = fitRing(UA, -LU, ARM_PAD + 0.005);
  const er = Math.max(...(el.radial as number[]));
  const ex = el.x ?? 0;
  const ez = el.z ?? 0;
  P.fitPair("arms", "steel", "upperArmL", sphere(er, { s: [1, 1.08, 1.1], p: [ex, -LU, ez - 0.006] }, 22, 14));
  P.fitPair("arms", "steel", "upperArmL", sphere(er * 0.86, { s: [0.28, 1.25, 1.25], p: [ex + el.rx * 0.92, -LU, ez] }, 18, 12));
  P.fitPair("arms", "gold", "upperArmL", sphere(0.0105, { p: [ex + el.rx * 0.92 + er * 0.25, -LU, ez] }, 12, 8));
  // Vambrace: closed round the forearm, gilt at the wrist.
  const vam = fitRings(FA, -LF * 0.93, -LF * 0.12, 5, () => ARM_PAD);
  P.fitPair("arms", "steel", "foreArmL", loft(vam, { seg: 22, thick: 0.004 }));
  P.fitPair("arms", "steel", "foreArmL", bead(vam[4], 0.0045, { seg: 22 }));
  P.fitPair("arms", "gold", "foreArmL", bead(vam[0], 0.004, { seg: 22 }));

  // Gauntlet cuff: flares from the wrist up over the end of the vambrace. (The plates over the
  // hand and fingers are a shell of the hand skin; see body.ts.)
  const w = fitRing(FA, -LF * 0.98, 0);
  const cuffRing = (y: number, pad: number): Ring => ({
    y,
    x: w.x,
    z: w.z,
    rx: w.rx + pad,
    rf: w.rf + pad,
    rb: (w.rb ?? w.rf) + pad,
    radial: (w.radial as number[]).map((r) => r + pad),
  });
  const cuff = [cuffRing(-0.02, 0.011), cuffRing(0.022, 0.021), cuffRing(0.062, 0.032)];
  P.fitPair("gauntlets", "steel", "handL", loft(cuff, { seg: 20, thick: 0.003 }));
  P.fitPair("gauntlets", "gold", "handL", bead(cuff[2], 0.004, { seg: 20 }));
  P.fitPair("gauntlets", "steel", "handL", bead(cuff[0], 0.0035, { seg: 20 }));

  // Cuisse: front and outside of the thigh, gilt along the top.
  const cuisse = fitRings(TH, -TL * 0.84, -TL * 0.12, 5, (t) => LEG_PAD + 0.003 * t);
  const cArc: [number, number] = [-1.7, 2.3];
  P.fitPair("cuisses", "steel", "thighL", loft(cuisse, { seg: 24, arc: cArc, thick: 0.004 }));
  P.fitPair("cuisses", "gold", "thighL", bead(cuisse[4], 0.0045, { seg: 24, arc: cArc }));
  P.fitPair("cuisses", "steel", "thighL", bead(cuisse[0], 0.004, { seg: 24, arc: cArc }));
  // Poleyn: a cup over the knee with a side wing and a lame above and below, sized to the knee.
  const K = fitRing(TH, -TL, LEG_PAD + 0.004);
  const kr = Math.max(K.rx, K.rf);
  const kx = K.x ?? 0;
  const kz = K.z ?? 0;
  const s = kr / 0.067;
  P.fitPair("cuisses", "steel", "shinL", sphere(kr, { s: [1, 0.92, 1.16], r: [PI / 2, 0, 0], p: [kx, 0.004, kz + 0.012 * s] }, 20, 12, 0, PI * 0.6));
  P.fitPair("cuisses", "steel", "shinL", sphere(0.046 * s, { s: [0.3, 1.2, 1.2], p: [kx + 0.06 * s, 0, kz] }));
  P.fitPair("cuisses", "gold", "shinL", sphere(0.011, { p: [kx + 0.075 * s, 0, kz] }));
  const kArc: [number, number] = [-1.35, 1.35];
  const kRing = (y: number, d: number): Ring => ({ y, x: kx, z: kz, rx: (0.067 + d) * s, rf: (0.071 + d) * s });
  // The lame above the knee rides the thigh, the one below the shin, so neither floats off when
  // the knee bends.
  P.fitPair("cuisses", "steel", "thighL", loft([kRing(-TL + 0.035, 0), kRing(-TL + 0.085, 0.004)], { seg: 14, arc: kArc, thick: 0.004 }));
  P.fitPair("cuisses", "steel", "shinL", loft([kRing(-0.088, -0.006), kRing(-0.04, -0.002)], { seg: 14, arc: kArc, thick: 0.004 }));

  // Greave: closed round the shin from below the knee to the ankle.
  const greave = fitRings(SH, -SL * 0.95, -SL * 0.1, 6, (t) => LEG_PAD + 0.004 * (1 - t), 2.2);
  P.fitPair("greaves", "steel", "shinL", loft(greave, { seg: 24, thick: 0.004 }));
  P.fitPair("greaves", "steel", "shinL", bead(greave[0], 0.0045, { seg: 24 }));
  P.fitPair("greaves", "gold", "shinL", bead(greave[5], 0.004, { seg: 24 }));

  // Sabaton: overlapping lames from the instep to the ball of the foot, a toe cap on the toe bone,
  // and a leather sole. The foot is measured along its length (footL-local z); each lame is a loft
  // along the foot, laid flat (loft y -> forward z, ring z -> down).
  const F = fit.foot;
  const [heel, tipZ] = fit.footSpan;
  const ballZ = REST.toeL.z - REST.footL.z;
  const toeDrop = REST.toeL.y - REST.footL.y;
  const footRing = (z: number, padSide: number, padTop: number, padSole: number, dy = 0): Ring => {
    const f = Math.max(0, Math.min(F.minX.length - 1.001, (z - F.y0) / F.step));
    const i = Math.floor(f);
    const k = f - i;
    const at = (a: number[]) => a[i] + (a[i + 1] - a[i]) * k;
    const x0 = at(F.minX);
    const x1 = at(F.maxX);
    const lo = at(F.minZ) - dy;
    const hi = at(F.maxZ) - dy;
    const cy = (lo + hi) / 2;
    return { y: z, x: (x0 + x1) / 2, z: -cy, rx: (x1 - x0) / 2 + padSide, rf: cy - lo + padSole, rb: hi - cy + padTop, n: 2.4 };
  };
  const flat = (g: THREE.BufferGeometry) => tf(g, { r: [PI / 2, 0, 0] });
  const upper: [number, number] = [PI / 2 - 0.45, (3 * PI) / 2 + 0.45];
  const under: [number, number] = [-PI / 2 + 0.45, PI / 2 - 0.45];
  const lames = 4;
  const from = heel + 0.035;
  const len = (ballZ + 0.01 - from) / lames;
  for (let k = 0; k < lames; k++) {
    const z0 = from + k * len;
    const ring0 = footRing(z0, 0.011 + 0.0025 * (lames - k), 0.012 + 0.003 * (lames - k), 0.004);
    const ring1 = footRing(z0 + len + 0.008, 0.01 + 0.0025 * (lames - k), 0.011 + 0.003 * (lames - k), 0.004);
    P.fitPair("sabatons", "steel", "footL", flat(loft([ring0, ring1], { seg: 18, arc: upper, thick: 0.003 })));
    P.fitPair("sabatons", k === 0 ? "gold" : "steel", "footL", flat(bead(ring0, 0.003, { seg: 18, arc: upper })));
  }
  // Heel cup behind the lames.
  const heelRings = [footRing(heel - 0.004, 0.009, 0.006, 0.004), footRing(from + 0.01, 0.014, 0.014, 0.004)];
  P.fitPair("sabatons", "steel", "footL", flat(loft(heelRings, { seg: 18, arc: [PI / 2 + 0.2, (3 * PI) / 2 - 0.2], thick: 0.003, capBottom: false })));
  // Toe cap, closing to a blunt point.
  const toeRings: Ring[] = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    const z = ballZ - 0.006 + (tipZ + 0.008 - ballZ) * t;
    const r = footRing(z, 0.01 * (1 - 0.5 * t), 0.01 * (1 - 0.4 * t), 0.004, toeDrop);
    toeRings.push({ ...r, y: z - ballZ, x: (r.x ?? 0) - (REST.toeL.x - REST.footL.x), rx: r.rx * (1 - 0.35 * t * t), rb: (r.rb ?? r.rf) * (1 - 0.3 * t * t) });
  }
  P.fitPair("sabatons", "steel", "toeL", flat(loft(toeRings, { seg: 18, capTop: true })));
  // Sole under the whole foot.
  const sole = [footRing(heel - 0.004, 0.009, 0.006, 0.006), footRing(ballZ, 0.012, 0.012, 0.006)];
  P.fitPair("sabatons", "leather", "footL", flat(loft(sole, { seg: 10, arc: under, thick: 0.004 })));

  // Belt and fauld (model space, riding the hips): overlapping lames, each a little wider.
  const H = fit.hips;
  const n = 2.3;
  const model = (slot: Slot, mat: MatKey, g: THREE.BufferGeometry, bone = B.hips) => P.add(slot, mat, rigid(g, bone));
  // Plackart over the belly, on the spine so the torso can bend.
  const plackart = [fitRing(H, 1.064, 0.019, n), fitRing(H, 1.11, 0.02, n), fitRing(H, 1.158, 0.022, n)];
  model("cuirass", "steel", loft(plackart, { seg: 32, thick: 0.005 }), B.spine);
  model("cuirass", "steel", bead(plackart[0], 0.0045, { seg: 32 }), B.spine);
  model("cuirass", "gold", bead(plackart[2], 0.0035, { seg: 32, arc: [-1.1, 1.1] }), B.spine);
  // Mail skirt closing the gap under the fauld; it follows the thighs so a raised knee lifts it.
  // (It stops short of the cuisses: the mail chausses already cover the legs.)
  const skirt = [0.85, 0.9, 0.96, 1.02].map((y) => fitRing(H, y, 0.008, 2.2));
  P.add(
    "mail",
    "mail",
    weighted(loft(skirt, { seg: 32 }), (p) => {
      const leg = smooth(0.98, 0.85, p.y) * 0.85;
      const left = smooth(-0.06, 0.06, p.x);
      return [
        [B.hips, 1 - leg],
        [B.thighL, leg * left],
        [B.thighR, leg * (1 - left)],
      ];
    })
  );
  const belt = [fitRing(H, 1.018, 0.018, n), fitRing(H, 1.056, 0.018, n)];
  model("waist", "leather", loft(belt, { seg: 32, thick: 0.006 }));
  model("waist", "gold", box(0.05, 0.044, 0.014, 0.004, { p: [0, 1.037, belt[1].rf + 0.004] }));
  for (let k = 0; k < 3; k++) {
    const top = 1.024 - k * 0.045;
    const lame = [fitRing(H, top - 0.062, 0.022 + 0.008 * k, n), fitRing(H, top, 0.018 + 0.008 * k, n)];
    model("waist", "steel", loft(lame, { seg: 32, thick: 0.004 }));
    model("waist", k === 2 ? "gold" : "steel", bead(lame[0], k === 2 ? 0.0055 : 0.004, { seg: 32 }));
  }
  // Empty scabbard on the left hip, belt pouch on the right.
  const bx = belt[0].rx;
  const scabbard = loft(
    [
      { y: -0.8, rx: 0.005, rf: 0.012 },
      { y: -0.76, rx: 0.009, rf: 0.021 },
      { y: 0, rx: 0.012, rf: 0.031 },
    ],
    { seg: 10, capBottom: true }
  );
  const at: [number, number, number] = [bx + 0.04, 1.03, -0.01];
  model("waist", "leather", tf(scabbard, { r: [0.3, 0, 0.1], p: at }));
  for (const y of [-0.01, -0.12, -0.74]) {
    const k = 1 + y / 2.4;
    model("waist", "gold", tf(bead({ y, rx: 0.013 * k, rf: 0.032 * k }, 0.004, { seg: 10 }), { r: [0.3, 0, 0.1], p: at }));
  }
  model("waist", "leather", box(0.075, 0.085, 0.045, 0.014, { p: [-(bx + 0.012), 0.98, -0.06], r: [0, 0.5, 0] }));
  model("waist", "gold", sphere(0.008, { p: [-(bx + 0.034), 0.985, -0.034] }));
}

function helm(P: Pieces): void {
  const n = 2.2;
  const shell: Ring[] = [
    { y: -0.052, rx: 0.1007, rf: 0.1159, rb: 0.1102, n },
    { y: 0.02, rx: 0.1055, rf: 0.1245, rb: 0.114, n },
    { y: 0.1, rx: 0.1074, rf: 0.1283, rb: 0.1159, n },
    { y: 0.165, rx: 0.1016, rf: 0.1197, rb: 0.1121, n },
    { y: 0.205, rx: 0.0893, rf: 0.1026, rb: 0.0978, n },
    { y: 0.235, rx: 0.0665, rf: 0.075, rb: 0.0722, n },
    { y: 0.254, rx: 0.038, rf: 0.0427, rb: 0.0418, n: 2 },
    { y: 0.262, rx: 0.0114, rf: 0.0123, rb: 0.0123 },
  ];
  P.put("helm", "steel", "head", loft(shell, { seg: 32, capTop: true }));
  P.put("helm", "gold", "head", bead(shell[0], 0.006, { seg: 32 }));
  // Eye slits, a gilt brow band and a nasal bar: the cross on the face of the helm.
  const eye = (y: number): Ring => grow({ ...shell[2], y }, 0.0015);
  for (const s of [-1, 1]) {
    const arc: [number, number] = s > 0 ? [0.15, 1.02] : [-1.02, -0.15];
    P.put("helm", "dark", "head", loft([eye(0.09), eye(0.107)], { seg: 10, arc }));
  }
  const band = (y: number): Ring => grow({ ...shell[2], y }, 0.003);
  P.put("helm", "gold", "head", loft([band(0.113), band(0.134)], { seg: 20, arc: [-1.3, 1.3] }));
  P.put(
    "helm",
    "gold",
    "head",
    loft(
      shell.slice(0, 5).map((r) => grow(r, 0.003)),
      { seg: 4, arc: [-0.1, 0.1] }
    )
  );
  // Breaths.
  const p = new THREE.Vector3();
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const row = k % 2;
      ringPoint({ ...shell[1], y: 0.035 - row * 0.03 }, s * (0.32 + Math.floor(k / 2) * 0.16 + row * 0.08), -0.0008, p);
      P.put("helm", "dark", "head", sphere(0.0055, { p: [p.x, p.y, p.z], s: [1, 1, 0.5] }, 8, 6));
    }
  }
  P.put("helm", "gold", "head", sphere(0.016, { p: [0, 0.268, 0] }));
}

export interface PaladinModel {
  meshes: Record<Slot, THREE.SkinnedMesh[]>;
  sword: THREE.Group;
  shield: THREE.Group;
}

/** Blade runs along +Z from the grip; the flats face ±X and the edges ±Y. */
export const SWORD = { base: 0.09, tip: 0.9 };

function buildSword(mats: PaladinMaterials): THREE.Group {
  const g = new THREE.Group();
  g.name = "paladin-sword";
  const blade = loft(
    [
      { y: 0.065, rx: 0.0036, rf: 0.026, n: 1.25 },
      { y: 0.5, rx: 0.0032, rf: 0.0225, n: 1.25 },
      { y: 0.78, rx: 0.0026, rf: 0.017, n: 1.25 },
      { y: 0.865, rx: 0.0018, rf: 0.0095, n: 1.25 },
      { y: SWORD.tip, rx: 0.0004, rf: 0.0008, n: 1.25 },
    ],
    { seg: 8, flat: true }
  );
  const fuller = box(0.0078, 0.011, 0.5, 0.002, { p: [0, 0, 0.34] });
  const bladeMesh = new THREE.Mesh(merge([tf(blade, { r: [PI / 2, 0, 0] }), fuller]), mats.blade);
  const hilt = merge([
    box(0.02, 0.2, 0.022, 0.008, { p: [0, 0, 0.056] }),
    sphere(0.015, { p: [0, 0.1, 0.056], s: [1, 1.2, 1] }),
    sphere(0.015, { p: [0, -0.1, 0.056], s: [1, 1.2, 1] }),
    cyl(0.027, 0.027, 0.02, { r: [0, 0, PI / 2], p: [0, 0, -0.078] }, 18),
    sphere(0.011, { p: [0, 0, -0.078], s: [1.3, 1, 1] }),
  ]);
  const hiltMesh = new THREE.Mesh(hilt, mats.skinned.gold);
  const grip = merge([
    cyl(0.0145, 0.0165, 0.112, { r: [PI / 2, 0, 0], p: [0, 0, -0.008] }, 12),
    torus(0.0165, 0.003, { p: [0, 0, 0.04] }),
    torus(0.016, 0.003, { p: [0, 0, -0.006] }),
    torus(0.0165, 0.003, { p: [0, 0, -0.055] }),
  ]);
  const gripMesh = new THREE.Mesh(grip, mats.skinned.leather);
  for (const m of [bladeMesh, hiltMesh, gripMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export const SHIELD = { w: 0.5, h: 0.64 };

export interface ShieldMount {
  /** Shield origin in left-forearm space (its axes: shield x up the arm, y = forearm z, z = forearm x). */
  position: THREE.Vector3;
  /** Centre of the closed fist in shield space (where the hand strap goes). */
  fist: THREE.Vector3;
  /** Shield-space x of the two arm straps. */
  arms: [number, number];
}

/** Place the shield on the left forearm so the fist closes on its hand strap, inside the edge. */
export function shieldMount(fistInHand: THREE.Vector3): ShieldMount {
  const fist = new THREE.Vector3(fistInHand.x, fistInHand.y - DIM.armFore, fistInHand.z);
  const position = new THREE.Vector3(fist.x + 0.095, fist.y + 0.19, -0.06);
  const toShield = (v: THREE.Vector3) => new THREE.Vector3(v.y - position.y, v.z - position.z, v.x - position.x);
  return {
    position,
    fist: toShield(fist),
    arms: [-0.07 - position.y, -0.19 - position.y],
  };
}

function buildShield(mats: PaladinMaterials, mount: ShieldMount): THREE.Group {
  const g = new THREE.Group();
  g.name = "paladin-shield";
  const W = SHIELD.w / 2;
  const H = SHIELD.h;
  const half = (v: number) => (v <= 0.34 ? W : W * Math.pow(Math.cos(((v - 0.34) / 0.66) * (PI / 2)), 0.72));
  const curve = (x: number) => -0.85 * x * x;
  const surface = (dz: number, flip: boolean): THREE.BufferGeometry => {
    const cols = 14;
    const rows = 18;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= rows; i++) {
      const v = i / rows;
      for (let j = 0; j <= cols; j++) {
        const x = (j / cols - 0.5) * 2 * half(v);
        pos.push(x, H / 2 - v * H, curve(x) + dz);
        uv.push(x / (2 * W) + 0.5, 1 - v);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j;
        const b = a + 1;
        const c = a + cols + 1;
        const d = c + 1;
        if (flip) idx.push(a, b, c, b, d, c);
        else idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const face = new THREE.Mesh(surface(0.011, false), mats.shieldFace);
  const back = new THREE.Mesh(surface(-0.011, true), mats.shieldBack);
  // Steel rim around the whole outline.
  const path: THREE.Vector3[] = [];
  const edge = (x: number, v: number) => path.push(new THREE.Vector3(x, H / 2 - v * H, curve(x)));
  for (let j = 0; j <= 10; j++) edge(-W + (j / 10) * 2 * W, 0);
  for (let i = 1; i <= 24; i++) edge(half(i / 24), i / 24);
  for (let i = 23; i >= 1; i--) edge(-half(i / 24), i / 24);
  const rim = new THREE.Mesh(tube(path, 0.0135, new THREE.Vector3(0, 0, 1), true, 8), mats.skinned.steel);
  // Rivets, arm straps and the hand grip on the back.
  const studs: THREE.BufferGeometry[] = [];
  for (const [x, v] of [
    [-0.19, 0.06],
    [0, 0.05],
    [0.19, 0.06],
    [-0.2, 0.3],
    [0.2, 0.3],
    [-0.14, 0.56],
    [0.14, 0.56],
    [0, 0.84],
  ]) {
    studs.push(sphere(0.011, { p: [x, H / 2 - v * H, curve(x) + 0.013], s: [1, 1, 0.6] }, 10, 8));
  }
  const studMesh = new THREE.Mesh(merge(studs), mats.skinned.gold);
  // Two arm straps round the forearm, and the hand strap through the closed fist, riveted to the
  // back by two short tabs.
  const armZ = -mount.position.x;
  const armY = -mount.position.z;
  const f = mount.fist;
  const backZ = curve(f.x) - 0.011;
  const tab = Math.max(0.01, backZ - f.z);
  const straps = new THREE.Mesh(
    merge([
      torus(0.052, 0.008, { r: [0, PI / 2, 0], p: [mount.arms[0], armY, armZ] }),
      torus(0.046, 0.008, { r: [0, PI / 2, 0], p: [mount.arms[1], armY, armZ] }),
      box(0.016, 0.12, 0.012, 0.005, { p: [f.x, f.y, f.z] }),
      box(0.016, 0.012, tab, 0.004, { p: [f.x, f.y + 0.055, f.z + tab / 2] }),
      box(0.016, 0.012, tab, 0.004, { p: [f.x, f.y - 0.055, f.z + tab / 2] }),
    ]),
    mats.skinned.leather
  );
  for (const m of [face, back, rim, studMesh, straps]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export interface BodyOptions {
  body: BodyBuild;
  bodyRig: BodyRig;
  /** Show the earlier procedural head instead of the imported one (for comparison). */
  classicHead: boolean;
  shieldMount: ShieldMount;
  /** The body's measured limbs and hips, for fitting the plates. */
  fit: BodyFit;
}

export function buildPaladinModel(rig: Rig, mats: PaladinMaterials, spec: HumanSpec, o: BodyOptions): PaladinModel {
  const P = new Pieces();
  if (o.classicHead) mats.setHeadTextures(buildClassicHead(P, spec).headTextures);
  underLayer(P);
  torsoPlate(P);
  armPlate(P);
  legPlate(P);
  helm(P);
  // Torso plates, fauld, gorget and the hanging mail onto the imported torso.
  const lm = o.body.landmarks;
  const torsoBones = [B.hips, B.spine, B.chest, B.neck, B.tassetL, B.tassetR];
  P.warp(
    (p) => warpTorso(p, lm.torso),
    (slot, mat, bone) => torsoBones.indexOf(bone) >= 0 || (slot === "helm" && mat === "mail")
  );
  fittedPlates(P, o.fit);
  // Belt buckle on the doublet, at the front of the belly the doublet's belt is cut from.
  P.add("doublet", "gold", rigid(box(0.03, 0.036, 0.008, 0.003, { p: [0, lm.waistY + 0.011, lm.beltFrontZ + 0.016] }), B.hips));
  const meshes = {} as Record<Slot, THREE.SkinnedMesh[]>;
  for (const slot of SLOTS) {
    meshes[slot] = P.build(slot, mats, rig);
  }
  for (const piece of o.body.pieces) {
    if (o.classicHead && piece.slot === "head") continue;
    // The imported human's own materials win over the harness set's of the same name (skin, eye).
    const mat = mats.human[piece.mat as keyof HumanMaterials] || (mats.skinned as Record<string, THREE.Material>)[piece.mat];
    const mesh = new THREE.SkinnedMesh(piece.geometry, mat);
    mesh.name = `paladin-${piece.slot}-${piece.mat}`;
    mesh.bind(o.bodyRig.skeleton, new THREE.Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = piece.shadow !== false;
    mesh.receiveShadow = true;
    meshes[piece.slot].push(mesh);
  }
  return {
    meshes,
    sword: buildSword(mats),
    shield: buildShield(mats, o.shieldMount),
  };
}
