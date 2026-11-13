// The paladin's body and harness. A skinned mail under-layer bends at the joints; every plate is
// a rigid piece bound to one bone. Pieces are authored for the left side (+X) in bone-local space
// (origin at the joint, limb running down -Y) and mirrored for the right.
import * as THREE from "three";
import {
  bead,
  box,
  capsule,
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
import type { MatKey, PaladinMaterials } from "./materials";
import { B, BONE_NAMES, REST, type BoneName, type Rig } from "./rig";

type Slot = "body" | "head";

const PI = Math.PI;

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
    const r = REST[bone];
    g.translate(r.x, r.y, r.z);
    this.add(slot, mat, rigid(g, B[bone]));
  }

  /** Rigid piece authored for a left-side bone, placed on both sides. */
  pair(slot: Slot, mat: MatKey, boneL: BoneName, g: THREE.BufferGeometry): void {
    const other = mirrorX(g);
    this.put(slot, mat, boneL, g);
    this.put(slot, mat, BONE_NAMES[MIRROR[B[boneL]]], other);
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

/** Mail and padding worn under the plate: one smooth-skinned surface from neck to ankle. */
function underLayer(P: Pieces): void {
  // Torso.
  const torso = loft(
    [
      { y: 0.86, rx: 0.15, rf: 0.1, rb: 0.11 },
      { y: 0.95, rx: 0.162, rf: 0.11, rb: 0.12 },
      { y: 1.05, rx: 0.142, rf: 0.1, rb: 0.1 },
      { y: 1.15, rx: 0.146, rf: 0.108, rb: 0.104 },
      { y: 1.28, rx: 0.158, rf: 0.122, rb: 0.114 },
      { y: 1.4, rx: 0.16, rf: 0.115, rb: 0.118 },
      { y: 1.47, rx: 0.13, rf: 0.088, rb: 0.098 },
      { y: 1.52, rx: 0.064, rf: 0.06, rb: 0.064 },
      { y: 1.6, rx: 0.056, rf: 0.058, rb: 0.06 },
    ],
    { seg: 24, capBottom: true }
  );
  P.add(
    "body",
    "mail",
    weighted(torso, (p) =>
      chain(p.y, [B.hips, B.spine, B.chest, B.neck, B.head], [
        [1.03, 1.12],
        [1.15, 1.25],
        [1.49, 1.54],
        [1.56, 1.6],
      ])
    )
  );

  // Mail skirt: follows the thighs so a raised knee lifts it instead of poking through.
  const skirt = loft(
    [
      { y: 0.77, rx: 0.186, rf: 0.132, rb: 0.14, n: 2.2 },
      { y: 0.86, rx: 0.178, rf: 0.128, rb: 0.134, n: 2.2 },
      { y: 0.96, rx: 0.164, rf: 0.118, rb: 0.124, n: 2.2 },
      { y: 1.02, rx: 0.152, rf: 0.11, rb: 0.114, n: 2.2 },
    ],
    { seg: 28 }
  );
  P.add(
    "body",
    "mail",
    weighted(skirt, (p) => {
      const leg = smooth(0.98, 0.8, p.y) * 0.7;
      const left = smooth(-0.06, 0.06, p.x);
      return [
        [B.hips, 1 - leg],
        [B.thighL, leg * left],
        [B.thighR, leg * (1 - left)],
      ];
    })
  );

  // Arm (left): wrist to shoulder.
  const ax = REST.upperArmL.x;
  const elbow = REST.foreArmL.y;
  const arm = loft(
    [
      { y: 0.885, x: ax, rx: 0.033, rf: 0.033 },
      { y: 0.95, x: ax, rx: 0.038, rf: 0.038 },
      { y: 1.05, x: ax, rx: 0.043, rf: 0.043 },
      { y: 1.12, x: ax, rx: 0.045, rf: 0.045 },
      { y: 1.15, x: ax, rx: 0.046, rf: 0.047 },
      { y: 1.18, x: ax, rx: 0.047, rf: 0.047 },
      { y: 1.3, x: ax, rx: 0.053, rf: 0.053 },
      { y: 1.42, x: ax, rx: 0.058, rf: 0.058 },
      { y: 1.475, x: ax, rx: 0.046, rf: 0.046 },
    ],
    { seg: 14, capTop: true }
  );
  P.pairWeighted("body", "mail", arm, (p) => chain(p.y, [B.foreArmL, B.upperArmL], [[elbow - 0.04, elbow + 0.04]]));

  // Leg (left): ankle to hip.
  const lx = REST.thighL.x;
  const knee = REST.shinL.y;
  const leg = loft(
    [
      { y: 0.1, x: lx, rx: 0.039, rf: 0.04 },
      { y: 0.2, x: lx, rx: 0.045, rf: 0.045, rb: 0.05 },
      { y: 0.36, x: lx, rx: 0.055, rf: 0.054, rb: 0.064 },
      { y: 0.45, x: lx, rx: 0.055, rf: 0.056, rb: 0.056 },
      { y: 0.5, x: lx, rx: 0.057, rf: 0.06, rb: 0.056 },
      { y: 0.55, x: lx, rx: 0.06, rf: 0.062, rb: 0.06 },
      { y: 0.66, x: lx, rx: 0.07, rf: 0.07, rb: 0.072 },
      { y: 0.8, x: lx, rx: 0.082, rf: 0.082, rb: 0.084 },
      { y: 0.92, x: lx, rx: 0.086, rf: 0.086, rb: 0.09 },
      { y: 0.975, x: lx, rx: 0.07, rf: 0.07, rb: 0.075 },
    ],
    { seg: 16, capTop: true }
  );
  P.pairWeighted("body", "mail", leg, (p) => {
    if (p.y > 0.86) {
      const h = smooth(0.86, 0.975, p.y) * 0.65;
      return [
        [B.thighL, 1 - h],
        [B.hips, h],
      ];
    }
    return chain(p.y, [B.shinL, B.thighL], [[knee - 0.045, knee + 0.045]]);
  });

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
    "head",
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
  P.put("body", "steel", "chest", loft(cuirass, { seg: 32, thick: 0.005 }));
  P.put("body", "gold", "chest", bead(grow(cuirass[0], 0.001), 0.006, { seg: 32 }));
  // Medial ridge down the breastplate.
  P.put(
    "body",
    "steel",
    "chest",
    loft(
      cuirass.slice(0, 5).map((r) => grow(r, 0.0035)),
      { seg: 4, arc: [-0.07, 0.07] }
    )
  );
  // Sun-cross device on the breast.
  P.put("body", "gold", "chest", cyl(0.036, 0.036, 0.008, { r: [PI / 2, 0, 0], p: [0, 0.112, 0.152] }, 20));
  P.put("body", "gold", "chest", box(0.016, 0.104, 0.008, 0.003, { p: [0, 0.106, 0.155] }));
  P.put("body", "gold", "chest", box(0.07, 0.016, 0.008, 0.003, { p: [0, 0.122, 0.154] }));
  // Cape clasps on the shoulders.
  for (const s of [-1, 1]) P.put("body", "gold", "chest", sphere(0.019, { p: [s * 0.118, 0.212, 0.1], s: [1, 1, 0.55] }));

  // Gorget (hidden in first person with the helm).
  const gorget: Ring[] = [
    { y: 0.228, rx: 0.108, rf: 0.1, rb: 0.102 },
    { y: 0.272, rx: 0.084, rf: 0.082, rb: 0.082 },
    { y: 0.305, rx: 0.08, rf: 0.08, rb: 0.08 },
  ];
  P.put("head", "steel", "chest", loft(gorget, { seg: 24, thick: 0.004 }));
  P.put("head", "gold", "chest", bead(gorget[2], 0.005, { seg: 24 }));

  // Plackart over the waist, riding on the spine so the torso can bend.
  const plackart: Ring[] = [
    { y: -0.072, rx: 0.15, rf: 0.112, rb: 0.108, n },
    { y: -0.01, rx: 0.152, rf: 0.121, rb: 0.11, n },
    { y: 0.056, rx: 0.154, rf: 0.129, rb: 0.113, n },
  ];
  P.put("body", "steel", "spine", loft(plackart, { seg: 28, thick: 0.005 }));

  // Belt and fauld on the hips.
  const belt: Ring[] = [
    { y: 0.018, rx: 0.157, rf: 0.121, rb: 0.115, n },
    { y: 0.056, rx: 0.157, rf: 0.123, rb: 0.115, n },
  ];
  P.put("body", "leather", "hips", loft(belt, { seg: 28, thick: 0.006 }));
  P.put("body", "gold", "hips", box(0.05, 0.044, 0.014, 0.004, { p: [0, 0.037, 0.126] }));
  for (let k = 0; k < 3; k++) {
    const top = 0.024 - k * 0.045;
    const lame: Ring[] = [
      { y: top - 0.062, rx: 0.168 + 0.012 * k, rf: 0.128 + 0.012 * k, rb: 0.124 + 0.014 * k, n },
      { y: top, rx: 0.157 + 0.012 * k, rf: 0.118 + 0.012 * k, rb: 0.114 + 0.014 * k, n },
    ];
    P.put("body", "steel", "hips", loft(lame, { seg: 28, thick: 0.004 }));
    P.put("body", k === 2 ? "gold" : "steel", "hips", bead(lame[0], k === 2 ? 0.0055 : 0.004, { seg: 28 }));
  }
  // Empty scabbard on the left hip, belt pouch on the right.
  const scabbard = loft(
    [
      { y: -0.8, rx: 0.005, rf: 0.012 },
      { y: -0.76, rx: 0.009, rf: 0.021 },
      { y: 0, rx: 0.012, rf: 0.031 },
    ],
    { seg: 10, capBottom: true }
  );
  P.put("body", "leather", "hips", tf(scabbard, { r: [0.3, 0, 0.1], p: [0.196, 0.03, -0.01] }));
  for (const y of [-0.01, -0.12, -0.74]) {
    const k = 1 + y / 2.4;
    P.put("body", "gold", "hips", tf(bead({ y, rx: 0.013 * k, rf: 0.032 * k }, 0.004, { seg: 10 }), { r: [0.3, 0, 0.1], p: [0.196, 0.03, -0.01] }));
  }
  P.put("body", "leather", "hips", box(0.075, 0.085, 0.045, 0.014, { p: [-0.168, -0.02, -0.06], r: [0, 0.5, 0] }));
  P.put("body", "gold", "hips", sphere(0.008, { p: [-0.19, -0.015, -0.034] }));
}

function armPlate(P: Pieces): void {
  // Pauldron: a domed cap and two sliding lames.
  P.pair("body", "steel", "pauldronL", sphere(0.108, { s: [1.08, 0.9, 1.16], r: [0, 0, -0.5], p: [0.012, 0.016, 0] }, 22, 12, 0, PI * 0.56));
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
    P.pair("body", "steel", "pauldronL", loft(lames[k], { seg: 16, arc: outer, thick: 0.004 }));
    P.pair("body", k === 1 ? "gold" : "steel", "pauldronL", bead(lames[k][0], 0.0045, { seg: 16, arc: outer }));
  }

  // Rerebrace and couter on the upper arm.
  const rere: Ring[] = [
    { y: -0.265, rx: 0.054, rf: 0.054 },
    { y: -0.2, rx: 0.058, rf: 0.058 },
    { y: -0.12, rx: 0.062, rf: 0.062 },
    { y: -0.075, rx: 0.064, rf: 0.064 },
  ];
  P.pair("body", "steel", "upperArmL", loft(rere, { seg: 16, thick: 0.004 }));
  P.pair("body", "steel", "upperArmL", bead(rere[0], 0.0045, { seg: 16 }));
  P.pair("body", "steel", "upperArmL", bead(rere[3], 0.0045, { seg: 16 }));
  P.pair("body", "steel", "upperArmL", sphere(0.058, { s: [1, 1.1, 1.12], p: [0, -0.3, -0.008] }));
  P.pair("body", "steel", "upperArmL", sphere(0.05, { s: [0.3, 1.25, 1.25], p: [0.052, -0.3, 0] }));
  P.pair("body", "gold", "upperArmL", sphere(0.012, { p: [0.068, -0.3, 0] }));

  // Vambrace.
  const vam: Ring[] = [
    { y: -0.245, rx: 0.037, rf: 0.035 },
    { y: -0.17, rx: 0.046, rf: 0.045 },
    { y: -0.09, rx: 0.053, rf: 0.053 },
    { y: -0.035, rx: 0.054, rf: 0.055 },
  ];
  P.pair("body", "steel", "foreArmL", loft(vam, { seg: 16, thick: 0.004 }));
  P.pair("body", "steel", "foreArmL", bead(vam[3], 0.0045, { seg: 16 }));
  P.pair("body", "gold", "foreArmL", bead(vam[0], 0.004, { seg: 16 }));

  // Gauntlet, closed into a fist (the palm faces the body, the grip runs along Z).
  const cuff: Ring[] = [
    { y: -0.012, rx: 0.036, rf: 0.042 },
    { y: 0.03, rx: 0.043, rf: 0.048 },
    { y: 0.078, rx: 0.053, rf: 0.058 },
  ];
  P.pair("body", "steel", "handL", loft(cuff, { seg: 14, thick: 0.003 }));
  P.pair("body", "gold", "handL", bead(cuff[2], 0.004, { seg: 14 }));
  // Back-of-hand plate, then three finger lames curling round the grip, a thumb and a leather palm.
  P.pair("body", "steel", "handL", box(0.03, 0.096, 0.098, 0.012, { p: [0.012, -0.048, 0] }));
  P.pair("body", "steel", "handL", box(0.032, 0.044, 0.102, 0.013, { p: [0.012, -0.11, 0], r: [0, 0, -0.28] }));
  P.pair("body", "steel", "handL", box(0.05, 0.03, 0.1, 0.012, { p: [-0.014, -0.138, 0], r: [0, 0, 0.12] }));
  P.pair("body", "steel", "handL", box(0.028, 0.04, 0.098, 0.011, { p: [-0.044, -0.118, 0], r: [0, 0, 0.22] }));
  P.pair("body", "gold", "handL", capsule(0.008, 0.082, { r: [PI / 2, 0, 0], p: [0.026, -0.094, 0] }));
  P.pair("body", "leather", "handL", box(0.03, 0.074, 0.088, 0.01, { p: [-0.02, -0.058, 0] }));
  P.pair("body", "steel", "handL", capsule(0.014, 0.036, { r: [0.25, 0, 0.95], p: [-0.03, -0.086, 0.054] }));
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
  P.pair("body", "steel", "tassetL", loft(tasset, { seg: 14, arc: tArc, thick: 0.004 }));
  P.pair("body", "gold", "tassetL", bead(tasset[0], 0.005, { seg: 14, arc: tArc }));
  P.pair("body", "steel", "tassetL", bead({ y: -0.075, x: tx, z: tz, rx: 0.1035, rf: 0.112 }, 0.0035, { seg: 14, arc: tArc }));
  P.pair("body", "steel", "tassetL", bead({ y: -0.15, x: tx, z: tz, rx: 0.103, rf: 0.111 }, 0.0035, { seg: 14, arc: tArc }));

  // Cuisse: front and outside of the thigh.
  const cuisse: Ring[] = [
    { y: -0.375, rx: 0.068, rf: 0.07 },
    { y: -0.24, rx: 0.078, rf: 0.08 },
    { y: -0.1, rx: 0.089, rf: 0.091 },
  ];
  const cArc: [number, number] = [-1.75, 2.35];
  P.pair("body", "steel", "thighL", loft(cuisse, { seg: 18, arc: cArc, thick: 0.004 }));
  P.pair("body", "steel", "thighL", bead(cuisse[0], 0.0045, { seg: 18, arc: cArc }));

  // Poleyn with a side wing, plus a lame above and below.
  P.pair("body", "steel", "shinL", sphere(0.067, { s: [1, 0.92, 1.16], r: [PI / 2, 0, 0], p: [0, 0.004, 0.012] }, 18, 12, 0, PI * 0.6));
  P.pair("body", "steel", "shinL", sphere(0.046, { s: [0.3, 1.2, 1.2], p: [0.06, 0, 0] }));
  P.pair("body", "gold", "shinL", sphere(0.011, { p: [0.075, 0, 0] }));
  const kArc: [number, number] = [-1.35, 1.35];
  P.pair(
    "body",
    "steel",
    "shinL",
    loft(
      [
        { y: 0.04, rx: 0.067, rf: 0.071 },
        { y: 0.09, rx: 0.071, rf: 0.075 },
      ],
      { seg: 12, arc: kArc, thick: 0.004 }
    )
  );
  P.pair(
    "body",
    "steel",
    "shinL",
    loft(
      [
        { y: -0.088, rx: 0.061, rf: 0.065 },
        { y: -0.04, rx: 0.065, rf: 0.069 },
      ],
      { seg: 12, arc: kArc, thick: 0.004 }
    )
  );

  // Greave.
  const greave: Ring[] = [
    { y: -0.402, rx: 0.045, rf: 0.051, rb: 0.044, n: 2.2 },
    { y: -0.355, rx: 0.041, rf: 0.043, rb: 0.042, n: 2.2 },
    { y: -0.25, rx: 0.05, rf: 0.05, rb: 0.056, n: 2.2 },
    { y: -0.13, rx: 0.059, rf: 0.057, rb: 0.07, n: 2.2 },
    { y: -0.05, rx: 0.057, rf: 0.06, rb: 0.058, n: 2.2 },
  ];
  P.pair("body", "steel", "shinL", loft(greave, { seg: 18, thick: 0.004 }));
  P.pair("body", "steel", "shinL", bead(greave[0], 0.004, { seg: 18 }));

  // Sabaton and toe cap (lofted along the foot, then laid flat).
  const sab = loft(
    [
      { y: -0.074, z: 0.047, rx: 0.026, rf: 0.03, rb: 0.03, n: 2.4 },
      { y: -0.05, z: 0.045, rx: 0.04, rf: 0.04, rb: 0.06, n: 2.4 },
      { y: 0.0, z: 0.045, rx: 0.046, rf: 0.04, rb: 0.092, n: 2.4 },
      { y: 0.06, z: 0.045, rx: 0.05, rf: 0.04, rb: 0.058, n: 2.4 },
      { y: 0.134, z: 0.045, rx: 0.052, rf: 0.04, rb: 0.041, n: 2.4 },
    ],
    { seg: 16, capBottom: true }
  );
  P.pair("body", "steel", "footL", tf(sab, { r: [PI / 2, 0, 0] }));
  const toe = loft(
    [
      { y: -0.004, z: -0.02, rx: 0.053, rf: 0.04, rb: 0.042, n: 2.4 },
      { y: 0.05, z: -0.02, rx: 0.047, rf: 0.04, rb: 0.034, n: 2.4 },
      { y: 0.09, z: -0.016, rx: 0.034, rf: 0.036, rb: 0.024, n: 2.2 },
      { y: 0.12, z: -0.006, rx: 0.01, rf: 0.026, rb: 0.008 },
    ],
    { seg: 16, capTop: true }
  );
  P.pair("body", "steel", "toeL", tf(toe, { r: [PI / 2, 0, 0] }));
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
  P.put("head", "steel", "head", loft(shell, { seg: 32, capTop: true }));
  P.put("head", "gold", "head", bead(shell[0], 0.006, { seg: 32 }));
  // Eye slits, a gilt brow band and a nasal bar: the cross on the face of the helm.
  const eye = (y: number): Ring => grow({ ...shell[2], y }, 0.0015);
  for (const s of [-1, 1]) {
    const arc: [number, number] = s > 0 ? [0.15, 1.02] : [-1.02, -0.15];
    P.put("head", "dark", "head", loft([eye(0.09), eye(0.107)], { seg: 10, arc }));
  }
  const band = (y: number): Ring => grow({ ...shell[2], y }, 0.003);
  P.put("head", "gold", "head", loft([band(0.113), band(0.134)], { seg: 20, arc: [-1.3, 1.3] }));
  P.put(
    "head",
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
      P.put("head", "dark", "head", sphere(0.0055, { p: [p.x, p.y, p.z], s: [1, 1, 0.5] }, 8, 6));
    }
  }
  P.put("head", "gold", "head", sphere(0.016, { p: [0, 0.268, 0] }));
}

export interface PaladinModel {
  body: THREE.SkinnedMesh[];
  head: THREE.SkinnedMesh[];
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

function buildShield(mats: PaladinMaterials): THREE.Group {
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
  const straps = new THREE.Mesh(
    merge([
      torus(0.058, 0.008, { r: [0, PI / 2, 0], p: [0.07, 0.06, -0.078] }),
      torus(0.052, 0.008, { r: [0, PI / 2, 0], p: [-0.05, 0.06, -0.074] }),
      box(0.018, 0.13, 0.014, 0.005, { p: [-0.14, 0.06, -0.05] }),
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

export function buildPaladinModel(rig: Rig, mats: PaladinMaterials): PaladinModel {
  const P = new Pieces();
  underLayer(P);
  torsoPlate(P);
  armPlate(P);
  legPlate(P);
  helm(P);
  return {
    body: P.build("body", mats, rig),
    head: P.build("head", mats, rig),
    sword: buildSword(mats),
    shield: buildShield(mats),
  };
}
