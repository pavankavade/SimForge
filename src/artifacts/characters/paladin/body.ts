// A character's body from the imported base human: the skin split into the equipment slots
// (head, body, hands, feet), eyes, brows, lashes and hair, and the soft layers worn on it (braies,
// doublet, hose, shoes, mail) cut as shells from the same skin, so they fit and bend exactly
// like it. Everything here is skinned to the imported skeleton (BodyRig).
import * as THREE from "three";
import type { Slot } from "./build";
import { bakePart, dominantJoints, morphWeights, shell, subset, weldedNormals, type HumanAsset } from "./humanAsset";
import type { HumanMaterials, MatKey } from "./materials";
import type { HumanSpec, RGB } from "./spec";

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

type Region = "head" | "neck" | "neckLow" | "torso" | "arm" | "hand" | "leg" | "foot";

/** How far the coveralls stand off the skin (m): loose, so the suit hides the body's shape. */
export const SUIT = { torso: 0.017, arm: 0.012, leg: 0.016 };

export interface BodyPiece {
  slot: Slot;
  /** A material of the paladin set, or one of the imported human's own. */
  mat: MatKey | keyof HumanMaterials;
  geometry: THREE.BufferGeometry;
  /** Shadow casting (off for thin cards like lashes). */
  shadow?: boolean;
}

/** Torso cross-sections by height: half width, front depth and back depth about x = 0, z = 0. */
export interface TorsoProfile {
  y0: number;
  step: number;
  rx: number[];
  rf: number[];
  rb: number[];
}

/** Body landmarks in model space (bind pose), measured from the skin. */
export interface BodyLandmarks {
  waistY: number;
  hipJointY: number;
  /** Front of the belly at the belt line (z). */
  beltFrontZ: number;
  torso: TorsoProfile;
}

/** Sample a torso profile at height y (linear between bands, clamped at the ends). */
export function profileAt(t: TorsoProfile, y: number): [number, number, number] {
  const f = Math.max(0, Math.min(t.rx.length - 1.001, (y - t.y0) / t.step));
  const i = Math.floor(f);
  const k = f - i;
  const lerp = (a: number[]) => a[i] + (a[i + 1] - a[i]) * k;
  return [lerp(t.rx), lerp(t.rf), lerp(t.rb)];
}

function measureTorso(pos: THREE.BufferAttribute, region: Region[]): TorsoProfile {
  const y0 = 0.74;
  const step = 0.01;
  const count = 92;
  const rx = new Array<number>(count).fill(-1);
  const rf = new Array<number>(count).fill(-1);
  const rb = new Array<number>(count).fill(-1);
  for (let i = 0; i < pos.count; i++) {
    if (region[i] !== "torso" && region[i] !== "neckLow") continue;
    const b = Math.round((pos.getY(i) - y0) / step);
    if (b < 0 || b >= count) continue;
    rx[b] = Math.max(rx[b], Math.abs(pos.getX(i)));
    rf[b] = Math.max(rf[b], pos.getZ(i));
    rb[b] = Math.max(rb[b], -pos.getZ(i));
  }
  // Fill empty bands from their neighbours.
  for (const a of [rx, rf, rb]) {
    for (let i = 0; i < count; i++) if (a[i] < 0) a[i] = i > 0 ? a[i - 1] : -1;
    for (let i = count - 1; i >= 0; i--) if (a[i] < 0) a[i] = i < count - 1 ? a[i + 1] : 0.1;
  }
  return { y0, step, rx, rf, rb };
}

/** Hair painted into the skin texture: a per-vertex density on the body skin. */
export interface SkinPaint {
  mask: Float32Array;
  color: RGB;
  /** Overall opacity and how broken up into strands it is (0 = flat, 1 = sparse). */
  amount: number;
  grain: number;
}

export interface BodyBuild {
  pieces: BodyPiece[];
  landmarks: BodyLandmarks;
  /** The baked body skin (its UVs are what `paint` is laid out on). */
  skin: THREE.BufferGeometry;
  paint: SkinPaint[];
}

function regionOf(name: string): Region {
  if (name === "head") return "head";
  if (name === "neck_01") return "neck";
  if (/^(hand|thumb|index|middle|ring|pinky)_/.test(name)) return "hand";
  if (/^(foot|ball)_/.test(name)) return "foot";
  if (/^(upperarm|lowerarm)_/.test(name)) return "arm";
  if (/^(thigh|calf)_/.test(name)) return "leg";
  return "torso";
}

export function buildBody(a: HumanAsset, spec: HumanSpec): BodyBuild {
  const weights = morphWeights(a, spec);
  const body = bakePart(a.parts.body, weights);
  const pos = body.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  const dom = dominantJoints(body);
  const P = (name: string) => a.bindPos[a.index[name]];
  const neckSplit = (P("neck_01").y + P("head").y) / 2;
  const region: Region[] = [];
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    y[i] = pos.getY(i);
    let r = regionOf(a.joints[dom[i]]);
    if (r === "neck") r = y[i] > neckSplit ? "head" : "neckLow";
    region.push(r);
  }
  const N = weldedNormals(body);
  const pieces: BodyPiece[] = [];

  // ---- Skin, split into the slots that armour and clothes hide ---------------------------------
  const slotOf = (r: Region): Slot => (r === "head" ? "head" : r === "hand" ? "hands" : r === "foot" ? "feet" : "body");
  const vote = (i: number, j: number, k: number): Slot => {
    const s = [slotOf(region[i]), slotOf(region[j]), slotOf(region[k])];
    return s[1] === s[2] ? s[1] : s[0];
  };
  for (const slot of ["head", "hands", "feet", "body"] as Slot[]) {
    pieces.push({ slot, mat: "skin", geometry: subset(body, (i, j, k) => vote(i, j, k) === slot), shadow: true });
  }

  // ---- Eyes, brows, lashes, hair -----------------------------------------------------------------
  pieces.push({ slot: "head", mat: "eye", geometry: bakePart(a.parts.eyes, weights), shadow: false });
  pieces.push({ slot: "head", mat: "brows", geometry: bakePart(a.parts.brows, weights), shadow: false });
  pieces.push({ slot: "head", mat: "lashes", geometry: bakePart(a.parts.lashes, weights), shadow: false });
  const cap = spec.hair.style === "crop" ? "hair_short02" : spec.hair.style === "swept" ? "hair_short04" : null;
  if (cap && a.parts[cap]) pieces.push({ slot: "head", mat: cap === "hair_short02" ? "hairCrop" : "hairSwept", geometry: bakePart(a.parts[cap], weights), shadow: true });

  // Head landmarks (model space): eye line, the tip of the nose, the head's centre front-to-back.
  const head = P("head");
  const eyes = a.parts.eyes.geometry;
  eyes.computeBoundingBox();
  const eyeY = ((eyes.boundingBox as THREE.Box3).min.y + (eyes.boundingBox as THREE.Box3).max.y) / 2;
  let noseZ = -1;
  let noseY = eyeY;
  let backZ = 1;
  for (let i = 0; i < n; i++) {
    if (region[i] !== "head") continue;
    if (Math.abs(pos.getX(i)) < 0.01 && pos.getZ(i) > noseZ && y[i] < eyeY && y[i] > eyeY - 0.07) {
      noseZ = pos.getZ(i);
      noseY = y[i];
    }
    if (y[i] > eyeY) backZ = Math.min(backZ, pos.getZ(i));
  }
  const midZ = (noseZ + backZ) / 2;
  const mouthY = noseY - 0.035;
  // Bottom of the chin: the lowest point on the face's centre line.
  let chinY = eyeY;
  for (let i = 0; i < n; i++) {
    if ((region[i] === "head" || region[i] === "neckLow") && Math.abs(pos.getX(i)) < 0.012 && pos.getZ(i) > midZ + 0.07 && y[i] < chinY) chinY = y[i];
  }

  // Where short hair grows. Scalp: above a hairline that rises toward the forehead, not the ears.
  const scalpCover = (p: THREE.Vector3): number => {
    const front = smooth(-0.01, 0.06, p.z - midZ);
    const line = mix(eyeY - 0.04, eyeY + 0.065, front);
    let k = smooth(line - 0.004, line + 0.014, p.y);
    if (Math.abs(p.x) > 0.064 && p.y < eyeY + 0.02 && p.z - midZ > -0.04) k *= smooth(0.075, 0.064, Math.abs(p.x));
    return k;
  };
  // Beard: below the cheekbones, down the jaw and under the chin; thinner on the cheeks, lips clear.
  const beardCover = (p: THREE.Vector3): number => {
    const front = smooth(-0.03, 0.03, p.z - midZ);
    let k = front * smooth(eyeY - 0.03, eyeY - 0.05, p.y) * smooth(chinY - 0.05, chinY - 0.02, p.y);
    k *= 1 - 0.55 * smooth(0.035, 0.07, Math.abs(p.x)) * smooth(mouthY - 0.01, mouthY + 0.025, p.y);
    const lip = (1 - smooth(0.02, 0.028, Math.abs(p.x))) * (1 - smooth(0.005, 0.011, Math.abs(p.y - mouthY)));
    return k * (1 - lip);
  };
  const coverOf = (f: (p: THREE.Vector3) => number): Float32Array => {
    const c = new Float32Array(n);
    const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) c[i] = region[i] === "head" || region[i] === "neckLow" ? f(p.fromBufferAttribute(pos, i)) : 0;
    return c;
  };

  // A few short, sparse shells over the painted hair give it a soft edge and some volume.
  const shells = (cover: (p: THREE.Vector3) => number, c: Float32Array, layers: number, length: number, alpha: number) => {
    const p = new THREE.Vector3();
    const keep = (i: number, j: number, k: number) => c[i] + c[j] + c[k] > 0.05;
    for (let l = 0; l < layers; l++) {
      const t = layers > 1 ? l / (layers - 1) : 0;
      const g = shell(body, keep, (i) => length * (0.2 + 0.8 * t) * Math.max(0.35, c[i]), N);
      const gp = g.getAttribute("position") as THREE.BufferAttribute;
      const uv = new Float32Array(gp.count * 2);
      const col = new Float32Array(gp.count * 4);
      const shade = 0.55 + 0.45 * t;
      for (let v = 0; v < gp.count; v++) {
        const x = gp.getX(v);
        const vy = gp.getY(v);
        uv[v * 2] = (Math.atan2(x, gp.getZ(v) - midZ) / (Math.PI * 2)) * 14;
        uv[v * 2 + 1] = (head.y + 0.25 - vy) * 30;
        col[v * 4] = shade;
        col[v * 4 + 1] = shade;
        col[v * 4 + 2] = shade;
        col[v * 4 + 3] = cover(p.set(x, vy, gp.getZ(v))) * alpha * (1 - 0.5 * t);
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setAttribute("color", new THREE.BufferAttribute(col, 4));
      pieces.push({ slot: "head", mat: "hair", geometry: g, shadow: false });
    }
  };
  const paint: SkinPaint[] = [];
  const hairColor = spec.hair.color;
  if (spec.hair.style === "buzz") {
    const c = coverOf(scalpCover);
    paint.push({ mask: c, color: hairColor, amount: 0.92, grain: 0.75 });
    shells(scalpCover, c, 2, 0.0025, 0.75);
  }
  if (spec.beard > 0.15) {
    const full = smooth(0.4, 0.85, spec.beard);
    const c = coverOf(beardCover);
    paint.push({ mask: c, color: hairColor, amount: mix(0.55, 0.95, full), grain: mix(0.55, 0.85, full) });
    if (full > 0.2) shells(beardCover, c, 3, mix(0.0015, 0.0055, full), mix(0.35, 0.8, full));
  }
  // ---- Soft layers --------------------------------------------------------------------------------
  const waistY = P("spine_01").y;
  const hipJointY = P("thigh_l").y;
  const is = (...rs: Region[]) => (i: number) => rs.indexOf(region[i]) >= 0;
  const all3 = (f: (i: number) => boolean) => (i: number, j: number, k: number) => f(i) && f(j) && f(k);

  // Linen braies, always under everything: hips and the tops of the thighs.
  const braies = (i: number) => (region[i] === "torso" || region[i] === "leg") && y[i] < waistY && y[i] > hipJointY - 0.25;
  pieces.push({ slot: "braies", mat: "braiesFit", geometry: shell(body, all3(braies), (i) => (region[i] === "leg" ? 0.0045 : 0.006), N) });

  // Arming doublet: quilted coat to the crotch with a flared skirt, sleeves to the wrist, a collar.
  const coat = (i: number) => (region[i] === "torso" && y[i] > hipJointY - 0.09) || region[i] === "arm" || region[i] === "neckLow";
  pieces.push({
    slot: "doublet",
    mat: "quiltFit",
    geometry: shell(body, all3(coat), (i) => (region[i] === "arm" ? 0.0065 : 0.0075 + 0.009 * smooth(waistY - 0.05, hipJointY - 0.08, y[i])), N),
  });
  const belt = (i: number) => region[i] === "torso" && y[i] > waistY - 0.012 && y[i] < waistY + 0.034;
  pieces.push({ slot: "doublet", mat: "leatherFit", geometry: shell(body, all3(belt), () => 0.0125, N) });
  // Hose: both legs and the seat, down to the ankle.
  const hose = (i: number) => region[i] === "leg" || (region[i] === "torso" && y[i] < hipJointY - 0.02);
  pieces.push({ slot: "doublet", mat: "woolFit", geometry: shell(body, all3(hose), () => 0.0035, N) });
  // Ankle shoes.
  const shoe = (i: number) => region[i] === "foot" || (region[i] === "leg" && y[i] < 0.17);
  pieces.push({ slot: "shoes", mat: "leatherFit", geometry: shell(body, all3(shoe), () => 0.0055, N) });
  // Mail: one shirt-and-chausses layer over everything but the head, hands and feet.
  const mail = is("torso", "neckLow", "arm", "leg");
  pieces.push({ slot: "mail", mat: "mailFit", geometry: shell(body, all3(mail), (i) => (region[i] === "leg" ? 0.005 : 0.0062), N) });

  // ---- Workwear (miners) ---------------------------------------------------------------------------
  // Coveralls: one loose suit from the collar to the ankles and the wrists (the reflective tape,
  // pockets and the rest are fitted pieces; see build.ts).
  const suit = is("torso", "neckLow", "arm", "leg");
  const suitPad = (i: number) => (region[i] === "arm" ? SUIT.arm : region[i] === "leg" ? SUIT.leg : SUIT.torso);
  pieces.push({ slot: "coverall", mat: "coverallFit", geometry: shell(body, all3(suit), suitPad, N) });
  // A work belt over it.
  const workBelt = (i: number) => region[i] === "torso" && y[i] > waistY - 0.03 && y[i] < waistY + 0.022;
  pieces.push({ slot: "coverall", mat: "leatherFit", geometry: shell(body, all3(workBelt), () => SUIT.torso + 0.008, N) });
  // Rubber boots to mid-calf.
  const boot = (i: number) => region[i] === "foot" || (region[i] === "leg" && y[i] < 0.3);
  pieces.push({ slot: "boots", mat: "rubber", geometry: shell(body, all3(boot), (i) => (region[i] === "foot" ? 0.009 : SUIT.leg + 0.006), N) });

  // ---- Plate that follows the skin: gauntlets ----------------------------------------------------
  // Gauntlets: steel over the back of the hand and every finger joint, a leather palm. The palm
  // direction comes from the bind-pose hand (fingers, and index to little finger across it).
  const palmOf = (s: "l" | "r"): THREE.Vector3 => {
    const yv = P(`hand_${s}`).clone().sub(P(`middle_01_${s}`)).normalize();
    const zh = P(`index_01_${s}`).clone().sub(P(`pinky_01_${s}`));
    const zv = zh.addScaledVector(yv, -zh.dot(yv)).normalize();
    const xv = new THREE.Vector3().crossVectors(yv, zv);
    return s === "l" ? xv.negate() : xv;
  };
  const palm = { l: palmOf("l"), r: palmOf("r") };
  const palmSide = (i: number, j: number, k: number): boolean => {
    const pv = pos.getX(i) > 0 ? palm.l : palm.r;
    const d = (v: number) => N[v * 3] * pv.x + N[v * 3 + 1] * pv.y + N[v * 3 + 2] * pv.z;
    return (d(i) + d(j) + d(k)) / 3 > 0.35;
  };
  const hand = all3(is("hand"));
  // Plates step down toward the fingertips (a lame every ~2 cm), thicker over the back of the hand.
  const handBack = (i: number) => {
    const s = pos.getX(i) > 0 ? "l" : "r";
    const along = P(`hand_${s}`).y - y[i];
    return 0.0042 + 0.0022 * (1 - smooth(0.05, 0.1, along)) + 0.0012 * ((along * 52) % 1);
  };
  pieces.push({ slot: "gauntlets", mat: "steelFit", geometry: shell(body, (i, j, k) => hand(i, j, k) && !palmSide(i, j, k), handBack, N) });
  pieces.push({ slot: "gauntlets", mat: "leatherFit", geometry: shell(body, (i, j, k) => hand(i, j, k) && palmSide(i, j, k), () => 0.003, N) });

  let beltFrontZ = 0;
  for (let i = 0; i < n; i++) {
    if (region[i] === "torso" && Math.abs(pos.getX(i)) < 0.02 && Math.abs(y[i] - (waistY + 0.012)) < 0.012) beltFrontZ = Math.max(beltFrontZ, pos.getZ(i));
  }
  return { pieces, landmarks: { waistY, hipJointY, beltFrontZ, torso: measureTorso(pos, region) }, skin: body, paint };
}
