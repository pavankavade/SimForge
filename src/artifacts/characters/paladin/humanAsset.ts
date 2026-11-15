// The imported base human: a MakeHuman body (CC0, exported by scripts/blender/export-human.py)
// with the MPFB game-engine skeleton. This file loads it and turns it into plain data: joints in
// their bind pose, one skinned geometry per part (body, eyes, brows, lashes, hair caps) and the
// face/build morphs. Characters are baked from it at load (`bakePart`); the logical rig drives it
// through `BodyRig` (retarget.ts).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AUTHOR, type BoneName } from "./rig";
import type { HumanSpec } from "./spec";

export const HUMAN_URL = "/assets/characters/human_male.glb";

export interface HumanMeta {
  macro: { muscle: number; weight: number };
  builds: Record<string, Record<string, number>>;
  /** MPFB bone -> logical bone (null: follows its parent). */
  boneMap: Record<string, BoneName | null>;
  /** FaceSpec fields that have morphs `f_<field>_p` / `f_<field>_n`. */
  face: string[];
  textures: Record<string, string>;
}

export interface HumanPart {
  name: string;
  /** Bind-pose geometry: skinIndex points into HumanAsset.joints; relative position morphs. */
  geometry: THREE.BufferGeometry;
  morphs: string[];
}

export interface HumanAsset {
  meta: HumanMeta;
  /** Folder the asset was loaded from (texture paths are relative to it). */
  base: string;
  joints: string[];
  index: Record<string, number>;
  parent: number[];
  /** Joints ordered parents first. */
  order: number[];
  bindPos: THREE.Vector3[];
  bindRot: THREE.Quaternion[];
  parts: Record<string, HumanPart>;
}

const cache: Record<string, Promise<HumanAsset>> = {};

/** Load (once per URL) and unpack the base human. */
export function loadHumanAsset(url = HUMAN_URL): Promise<HumanAsset> {
  if (!cache[url]) cache[url] = load(url);
  return cache[url];
}

async function load(url: string): Promise<HumanAsset> {
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  const [gltf, meta] = await Promise.all([
    new GLTFLoader().loadAsync(url),
    fetch(url.replace(/\.glb$/, ".json")).then((r) => {
      if (!r.ok) throw new Error(`paladin: ${r.status} loading human meta`);
      return r.json() as Promise<HumanMeta>;
    }),
  ]);
  gltf.scene.updateMatrixWorld(true);

  const meshes: THREE.SkinnedMesh[] = [];
  gltf.scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh);
  });
  if (!meshes.length) throw new Error("paladin: no skinned mesh in the human asset");

  // Joints and their bind pose (from the inverse bind matrices, so node layout does not matter).
  const skel = meshes[0].skeleton;
  const joints = skel.bones.map((b) => b.name);
  const index: Record<string, number> = {};
  joints.forEach((n, i) => {
    index[n] = i;
  });
  const parent = skel.bones.map((b) => (b.parent && index[b.parent.name] !== undefined ? index[b.parent.name] : -1));
  const bindPos: THREE.Vector3[] = [];
  const bindRot: THREE.Quaternion[] = [];
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  skel.boneInverses.forEach((inv) => {
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    m.copy(inv).invert().decompose(p, q, s);
    bindPos.push(p);
    bindRot.push(q);
  });
  const order: number[] = [];
  const visit = (i: number) => {
    order.push(i);
    parent.forEach((p, c) => {
      if (p === i) visit(c);
    });
  };
  parent.forEach((p, i) => {
    if (p < 0) visit(i);
  });

  const parts: Record<string, HumanPart> = {};
  const nm = new THREE.Matrix3();
  for (const mesh of meshes) {
    const g = mesh.geometry.clone();
    // Bring everything into bind space (normally the identity).
    g.applyMatrix4(mesh.bindMatrix);
    nm.setFromMatrix4(mesh.bindMatrix);
    const morphPos = g.morphAttributes.position || [];
    for (const attr of morphPos) {
      const a = attr as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        s.fromBufferAttribute(a, i).applyMatrix3(nm);
        a.setXYZ(i, s.x, s.y, s.z);
      }
    }
    // Normals are rebuilt when a character is baked, so morph normals are not exported.
    delete g.morphAttributes.normal;
    // Remap joint indices onto the shared joint list.
    const remap = mesh.skeleton.bones.map((b) => index[b.name]);
    const si = g.getAttribute("skinIndex") as THREE.BufferAttribute;
    for (let i = 0; i < si.count * 4; i++) (si.array as Uint16Array | Uint8Array)[i] = remap[(si.array as Uint16Array | Uint8Array)[i]];
    const dict = mesh.morphTargetDictionary || {};
    const morphs: string[] = [];
    Object.keys(dict).forEach((k) => {
      morphs[dict[k]] = k;
    });
    parts[mesh.name] = { name: mesh.name, geometry: g, morphs };
    mesh.geometry.dispose();
  }
  return { meta, base, joints, index, parent, order, bindPos, bindRot, parts };
}

// ---- Rest pose ---------------------------------------------------------------------------------

/**
 * Logical rest joints from the imported skeleton: the spine, collarbones and feet as bound; arms
 * and legs straightened to hang down -Y at their real lengths (that is the pose every logical bone
 * at identity means). Also returns the eye point in head-bone space.
 */
export function restFromAsset(a: HumanAsset): { joints: Partial<Record<BoneName, THREE.Vector3>>; eye: THREE.Vector3 } {
  const P = (n: string) => a.bindPos[a.index[n]].clone();
  const len = (x: string, y: string) => P(x).distanceTo(P(y));
  const out: Partial<Record<BoneName, THREE.Vector3>> = {
    hips: P("pelvis"),
    spine: P("spine_01"),
    chest: P("spine_03"),
    neck: P("neck_01"),
    head: P("head"),
  };
  for (const [s, side] of [
    ["l", "L"],
    ["r", "R"],
  ] as const) {
    const sh = P(`upperarm_${s}`);
    const el = sh.clone().add(new THREE.Vector3(0, -len(`upperarm_${s}`, `lowerarm_${s}`), 0));
    const wr = el.clone().add(new THREE.Vector3(0, -len(`lowerarm_${s}`, `hand_${s}`), 0));
    const hip = P(`thigh_${s}`);
    const knee = hip.clone().add(new THREE.Vector3(0, -len(`thigh_${s}`, `calf_${s}`), 0));
    const ankle = knee.clone().add(new THREE.Vector3(0, -len(`calf_${s}`, `foot_${s}`), 0));
    const ball = ankle.clone().add(P(`ball_${s}`).sub(P(`foot_${s}`)));
    out[`clav${side}` as BoneName] = P(`clavicle_${s}`);
    out[`upperArm${side}` as BoneName] = sh;
    out[`foreArm${side}` as BoneName] = el;
    out[`hand${side}` as BoneName] = wr;
    out[`pauldron${side}` as BoneName] = sh.clone();
    out[`thigh${side}` as BoneName] = hip;
    out[`shin${side}` as BoneName] = knee;
    out[`foot${side}` as BoneName] = ankle;
    out[`toe${side}` as BoneName] = ball;
    // Tassets hang from the fauld, which is authored in place.
    out[`tasset${side}` as BoneName] = AUTHOR[`tasset${side}` as BoneName].clone();
  }
  const eyes = a.parts.eyes?.geometry;
  const eye = new THREE.Vector3(0, 0.1, 0.085);
  if (eyes) {
    eyes.computeBoundingBox();
    const bb = eyes.boundingBox as THREE.Box3;
    const head = P("head");
    eye.set(0, (bb.min.y + bb.max.y) / 2 - head.y, bb.max.z - head.z);
  }
  return { joints: out, eye };
}

// ---- Characters -------------------------------------------------------------------------------

/** Morph weights for a character: face fields and body build relative to the exported macros. */
export function morphWeights(a: HumanAsset, spec: HumanSpec): Record<string, number> {
  const w: Record<string, number> = {};
  const face = spec.face as unknown as Record<string, number>;
  for (const f of a.meta.face) {
    const v = Math.max(-1.5, Math.min(1.5, face[f] || 0));
    if (v > 0) w[`f_${f}_p`] = v;
    else if (v < 0) w[`f_${f}_n`] = -v;
  }
  const muscleTop = a.meta.builds.b_muscle?.muscle ?? 1;
  const m = (spec.muscle - a.meta.macro.muscle) / Math.max(0.05, muscleTop - a.meta.macro.muscle);
  w.b_muscle = Math.max(-1, Math.min(1, m));
  if (spec.bulk > 0) w.b_heavy = Math.min(1, spec.bulk);
  else if (spec.bulk < 0) w.b_lean = Math.min(1, -spec.bulk);
  return w;
}

/** Key for welding coincident vertices (UV seams split them; normals must not). */
function weldKeys(pos: THREE.BufferAttribute): Int32Array {
  const keys = new Int32Array(pos.count);
  const map: Record<string, number> = {};
  let next = 0;
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    let id = map[k];
    if (id === undefined) {
      id = next++;
      map[k] = id;
    }
    keys[i] = id;
  }
  return keys;
}

/** Area-weighted smooth normals, shared across UV seams. */
export function weldedNormals(g: THREE.BufferGeometry, positions?: Float32Array): Float32Array {
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const P = positions || (pos.array as Float32Array);
  const keys = weldKeys(pos);
  let groups = 0;
  for (let i = 0; i < keys.length; i++) groups = Math.max(groups, keys[i] + 1);
  const acc = new Float32Array(groups * 3);
  const idx = g.getIndex();
  const tri = idx ? idx.count / 3 : pos.count / 3;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.set(P[i0 * 3], P[i0 * 3 + 1], P[i0 * 3 + 2]);
    b.set(P[i1 * 3] - a.x, P[i1 * 3 + 1] - a.y, P[i1 * 3 + 2] - a.z);
    c.set(P[i2 * 3] - a.x, P[i2 * 3 + 1] - a.y, P[i2 * 3 + 2] - a.z);
    b.cross(c);
    for (const i of [i0, i1, i2]) {
      const k = keys[i] * 3;
      acc[k] += b.x;
      acc[k + 1] += b.y;
      acc[k + 2] += b.z;
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = keys[i] * 3;
    const l = Math.hypot(acc[k], acc[k + 1], acc[k + 2]) || 1;
    out[i * 3] = acc[k] / l;
    out[i * 3 + 1] = acc[k + 1] / l;
    out[i * 3 + 2] = acc[k + 2] / l;
  }
  return out;
}

/**
 * One part with a character's morphs baked into its positions. Normals keep the exported (seam
 * free) ones plus the change the morphs make, so nothing tears along UV seams.
 */
export function bakePart(part: HumanPart, weights: Record<string, number>): THREE.BufferGeometry {
  const g = part.geometry.clone();
  g.morphAttributes = {};
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const base = new Float32Array(pos.array as Float32Array);
  const morphs = part.geometry.morphAttributes.position || [];
  let any = false;
  part.morphs.forEach((name, k) => {
    const w = weights[name];
    if (!w || !morphs[k]) return;
    any = true;
    const d = morphs[k].array as Float32Array;
    const p = pos.array as Float32Array;
    for (let i = 0; i < p.length; i++) p[i] += d[i] * w;
  });
  if (!any) return g;
  pos.needsUpdate = true;
  const before = weldedNormals(g, base);
  const after = weldedNormals(g);
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  const n = nor.array as Float32Array;
  for (let i = 0; i < nor.count; i++) {
    const x = n[i * 3] + after[i * 3] - before[i * 3];
    const y = n[i * 3 + 1] + after[i * 3 + 1] - before[i * 3 + 1];
    const z = n[i * 3 + 2] + after[i * 3 + 2] - before[i * 3 + 2];
    const l = Math.hypot(x, y, z) || 1;
    n[i * 3] = x / l;
    n[i * 3 + 1] = y / l;
    n[i * 3 + 2] = z / l;
  }
  nor.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/** The joint with the largest weight on each vertex. */
export function dominantJoints(g: THREE.BufferGeometry): Int32Array {
  const si = g.getAttribute("skinIndex") as THREE.BufferAttribute;
  const sw = g.getAttribute("skinWeight") as THREE.BufferAttribute;
  const out = new Int32Array(si.count);
  for (let i = 0; i < si.count; i++) {
    let best = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
    out[i] = si.getComponent(i, best);
  }
  return out;
}

/** The same vertices with only the triangles `keep` accepts (attributes are shared, not copied). */
export function subset(g: THREE.BufferGeometry, keep: (a: number, b: number, c: number) => boolean): THREE.BufferGeometry {
  const idx = g.getIndex() as THREE.BufferAttribute;
  const out: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    if (keep(a, b, c)) out.push(a, b, c);
  }
  const s = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) s.setAttribute(name, g.getAttribute(name));
  s.setIndex(out);
  s.boundingSphere = g.boundingSphere;
  return s;
}

/**
 * A shell cut from a skin: the triangles `keep` accepts, copied and pushed out along the
 * (seam-welded) normals by `offset(i)` metres. Keeps the skin weights, so it deforms with it.
 */
export function shell(
  g: THREE.BufferGeometry,
  keep: (a: number, b: number, c: number) => boolean,
  offset: (i: number, p: THREE.Vector3) => number,
  normals?: Float32Array
): THREE.BufferGeometry {
  const idx = g.getIndex() as THREE.BufferAttribute;
  const N = normals || weldedNormals(g);
  const used = new Int32Array((g.getAttribute("position") as THREE.BufferAttribute).count).fill(-1);
  const tris: number[] = [];
  const list: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    if (!keep(a, b, c)) continue;
    for (const v of [a, b, c]) {
      if (used[v] < 0) {
        used[v] = list.length;
        list.push(v);
      }
      tris.push(used[v]);
    }
  }
  const s = new THREE.BufferGeometry();
  const p = new THREE.Vector3();
  for (const name of ["position", "normal", "uv", "skinIndex", "skinWeight"]) {
    const src = g.getAttribute(name) as THREE.BufferAttribute;
    if (!src) continue;
    const size = src.itemSize;
    const Arr = src.array.constructor as new (n: number) => Float32Array;
    const dst = new Arr(list.length * size);
    for (let k = 0; k < list.length; k++) for (let c = 0; c < size; c++) dst[k * size + c] = src.getComponent(list[k], c);
    if (name === "position") {
      for (let k = 0; k < list.length; k++) {
        const v = list[k];
        p.set(dst[k * 3], dst[k * 3 + 1], dst[k * 3 + 2]);
        const d = offset(v, p);
        dst[k * 3] += N[v * 3] * d;
        dst[k * 3 + 1] += N[v * 3 + 1] * d;
        dst[k * 3 + 2] += N[v * 3 + 2] * d;
      }
    }
    if (name === "normal") {
      for (let k = 0; k < list.length; k++) {
        const v = list[k];
        dst[k * 3] = N[v * 3];
        dst[k * 3 + 1] = N[v * 3 + 1];
        dst[k * 3 + 2] = N[v * 3 + 2];
      }
    }
    s.setAttribute(name, new THREE.BufferAttribute(dst, size, src.normalized));
  }
  s.setIndex(tris);
  s.computeBoundingSphere();
  return s;
}
