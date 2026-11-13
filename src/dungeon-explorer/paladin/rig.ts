// Paladin skeleton: a real bone hierarchy (THREE.Bone + Skeleton) with a small model-space FK/IK
// solver on top. Every bone's rest orientation is the identity and limbs hang along -Y, so a pose is
// just one model-space quaternion per bone. The character faces +Z; its left side is +X.
import * as THREE from "three";

export const BONE_NAMES = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "clavL",
  "upperArmL",
  "foreArmL",
  "handL",
  "clavR",
  "upperArmR",
  "foreArmR",
  "handR",
  "thighL",
  "shinL",
  "footL",
  "toeL",
  "thighR",
  "shinR",
  "footR",
  "toeR",
  "pauldronL",
  "pauldronR",
  "tassetL",
  "tassetR",
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

/** Rest position of every joint in model space (metres) and its parent. */
const DEF: Record<BoneName, { parent: BoneName | null; at: [number, number, number] }> = {
  hips: { parent: null, at: [0, 1.0, 0] },
  spine: { parent: "hips", at: [0, 1.1, 0] },
  chest: { parent: "spine", at: [0, 1.24, 0] },
  neck: { parent: "chest", at: [0, 1.5, 0] },
  head: { parent: "neck", at: [0, 1.58, 0.01] },
  clavL: { parent: "chest", at: [0.03, 1.44, 0] },
  upperArmL: { parent: "clavL", at: [0.215, 1.45, 0] },
  foreArmL: { parent: "upperArmL", at: [0.215, 1.15, 0] },
  handL: { parent: "foreArmL", at: [0.215, 0.88, 0] },
  clavR: { parent: "chest", at: [-0.03, 1.44, 0] },
  upperArmR: { parent: "clavR", at: [-0.215, 1.45, 0] },
  foreArmR: { parent: "upperArmR", at: [-0.215, 1.15, 0] },
  handR: { parent: "foreArmR", at: [-0.215, 0.88, 0] },
  thighL: { parent: "hips", at: [0.095, 0.94, 0] },
  shinL: { parent: "thighL", at: [0.095, 0.5, 0] },
  footL: { parent: "shinL", at: [0.095, 0.085, 0] },
  toeL: { parent: "footL", at: [0.095, 0.02, 0.13] },
  thighR: { parent: "hips", at: [-0.095, 0.94, 0] },
  shinR: { parent: "thighR", at: [-0.095, 0.5, 0] },
  footR: { parent: "shinR", at: [-0.095, 0.085, 0] },
  toeR: { parent: "footR", at: [-0.095, 0.02, 0.13] },
  pauldronL: { parent: "clavL", at: [0.215, 1.45, 0] },
  pauldronR: { parent: "clavR", at: [-0.215, 1.45, 0] },
  tassetL: { parent: "hips", at: [0.1, 0.905, 0.07] },
  tassetR: { parent: "hips", at: [-0.1, 0.905, 0.07] },
};

export const B: Record<BoneName, number> = {} as Record<BoneName, number>;
BONE_NAMES.forEach((n, i) => {
  B[n] = i;
});

export const REST: Record<BoneName, THREE.Vector3> = {} as Record<BoneName, THREE.Vector3>;
BONE_NAMES.forEach((n) => {
  REST[n] = new THREE.Vector3(DEF[n].at[0], DEF[n].at[1], DEF[n].at[2]);
});

export const ARM_UPPER = REST.upperArmL.y - REST.foreArmL.y;
export const ARM_FORE = REST.foreArmL.y - REST.handL.y;
export const LEG_UPPER = REST.thighL.y - REST.shinL.y;
export const LEG_LOWER = REST.shinL.y - REST.footL.y;
export const ANKLE_Y = REST.footL.y;
export const HIP_Y = REST.hips.y;
/** Eye point in head-bone space. */
export const EYE_LOCAL = new THREE.Vector3(0, 0.1, 0.085);

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/** Quaternion from three (orthonormal) basis vectors. */
export function basisQuat(out: THREE.Quaternion, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Quaternion {
  _m.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m);
}

export class Rig {
  readonly root = new THREE.Bone();
  readonly bones: THREE.Bone[] = [];
  readonly skeleton: THREE.Skeleton;
  /** Model-space orientation and position of every bone for the current pose. */
  readonly mq: THREE.Quaternion[] = [];
  readonly mp: THREE.Vector3[] = [];
  private readonly parent: number[] = [];
  private readonly offset: THREE.Vector3[] = [];

  constructor() {
    this.root.name = "root";
    BONE_NAMES.forEach((name, i) => {
      const bone = new THREE.Bone();
      bone.name = name;
      const p = DEF[name].parent;
      const pi = p === null ? -1 : B[p];
      const off = REST[name].clone();
      if (p !== null) off.sub(REST[p]);
      bone.position.copy(off);
      (pi < 0 ? this.root : this.bones[pi]).add(bone);
      this.bones.push(bone);
      this.parent.push(pi);
      this.offset.push(off);
      this.mq.push(new THREE.Quaternion());
      this.mp.push(REST[name].clone());
      void i;
    });
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
  }

  bone(name: BoneName): THREE.Bone {
    return this.bones[B[name]];
  }

  /** Reset every bone to the rest orientation. */
  reset(): void {
    for (let i = 0; i < this.bones.length; i++) {
      this.mq[i].identity();
      this.mp[i].copy(REST[BONE_NAMES[i]]);
    }
  }

  /** Model-space position of a bone from its parent's pose. */
  place(name: BoneName): THREE.Vector3 {
    const i = B[name];
    const p = this.parent[i];
    if (p < 0) return this.mp[i];
    return this.mp[i].copy(this.offset[i]).applyQuaternion(this.mq[p]).add(this.mp[p]);
  }

  /** Give a bone its parent's orientation times a local rotation, and place it. */
  setLocal(name: BoneName, local: THREE.Quaternion | null): void {
    const i = B[name];
    const p = this.parent[i];
    if (p >= 0) this.mq[i].copy(this.mq[p]);
    else this.mq[i].identity();
    if (local) this.mq[i].multiply(local);
    this.place(name);
  }

  /** Point in model space from a point in a bone's local frame. */
  toModel(name: BoneName, local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const i = B[name];
    return out.copy(local).applyQuaternion(this.mq[i]).add(this.mp[i]);
  }

  /**
   * Two-bone IK. `pole` is the direction the middle joint (elbow, knee) points. `arm` picks the
   * hinge convention so that the rest pose is the identity for both arms (elbow back) and legs
   * (knee forward). Returns how far the target was beyond reach (0 when reachable).
   */
  solveLimb(
    upper: BoneName,
    fore: BoneName,
    end: BoneName,
    target: THREE.Vector3,
    pole: THREE.Vector3,
    arm: boolean
  ): number {
    const iu = B[upper];
    const ife = B[fore];
    const ie = B[end];
    const l1 = this.offset[ife].length();
    const l2 = this.offset[ie].length();
    const s = this.mp[iu];
    const dir = _a.copy(target).sub(s);
    const len = dir.length();
    const c = Math.max(Math.abs(l1 - l2) + 0.02, Math.min(l1 + l2 - 0.004, len));
    if (len > 1e-6) dir.multiplyScalar(1 / len);
    else dir.set(0, -1, 0);
    const perp = _b.copy(pole).addScaledVector(dir, -pole.dot(dir));
    if (perp.lengthSq() < 1e-8) perp.set(dir.y, dir.z, dir.x).addScaledVector(dir, -(dir.x * dir.y + dir.y * dir.z + dir.z * dir.x));
    perp.normalize();
    const cosA = Math.max(-1, Math.min(1, (l1 * l1 + c * c - l2 * l2) / (2 * l1 * c)));
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const elbow = this.mp[ife].copy(s).addScaledVector(dir, l1 * cosA).addScaledVector(perp, l1 * sinA);
    const hand = this.mp[ie].copy(s).addScaledVector(dir, c);

    if (arm) _x.crossVectors(dir, perp);
    else _x.crossVectors(perp, dir);
    _x.normalize();
    _y.copy(s).sub(elbow).normalize();
    _z.crossVectors(_x, _y);
    basisQuat(this.mq[iu], _x, _y, _z);
    _y.copy(elbow).sub(hand).normalize();
    _z.crossVectors(_x, _y);
    basisQuat(this.mq[ife], _x, _y, _z);
    this.mq[ie].copy(this.mq[ife]);
    return Math.max(0, len - c);
  }

  /** Roll a bone about its own long (Y) axis, e.g. forearm pronation. */
  twist(name: BoneName, angle: number): void {
    _q.setFromAxisAngle(_c.set(0, 1, 0), angle);
    this.mq[B[name]].multiply(_q);
  }

  /** Write the model-space pose into the THREE bones (local transforms). */
  apply(): void {
    for (let i = 0; i < this.bones.length; i++) {
      const p = this.parent[i];
      const bone = this.bones[i];
      if (p < 0) {
        bone.quaternion.copy(this.mq[i]);
        bone.position.copy(this.mp[i]);
      } else {
        bone.quaternion.copy(this.mq[p]).invert().multiply(this.mq[i]);
        // Limb joints are placed by IK; write their true offset so reach clamping never stretches.
        bone.position.copy(this.mp[i]).sub(this.mp[p]).applyQuaternion(_q.copy(this.mq[p]).invert());
      }
    }
  }
}
