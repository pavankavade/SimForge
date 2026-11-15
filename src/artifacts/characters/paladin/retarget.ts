// Drives the imported skeleton (MPFB game-engine rig, bound in an A-pose) from the logical rig
// (rig.ts: every bone at identity = standing, limbs straight down). Each mapped bone gets a
// constant C = A * R, where R is its bind orientation and A turns its bind direction onto the
// logical one, so per frame its world rotation is just mq[logical] * C. Positions of mapped joints
// come straight from the logical solve (the logical rest pose is built from the imported joints).
// Unmapped bones follow their parent; fingers add a curl for the current grip.
import * as THREE from "three";
import type { HumanAsset } from "./humanAsset";
import { B, type BoneName, type Rig } from "./rig";

export type GripName = "relaxed" | "sword" | "strap";

const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;

/** Curl per finger joint (radians, toward the palm), thumb first. */
const GRIPS: Record<GripName, number[][]> = {
  relaxed: [
    [0.05, 0.12, 0.15],
    [0.18, 0.28, 0.18],
    [0.24, 0.34, 0.2],
    [0.3, 0.38, 0.22],
    [0.36, 0.42, 0.24],
  ],
  // Closed round the sword grip; the thumb wraps over the index finger.
  sword: [
    [0.35, 0.55, 0.6],
    [1.15, 1.45, 0.85],
    [1.25, 1.5, 0.85],
    [1.32, 1.5, 0.85],
    [1.4, 1.45, 0.85],
  ],
  // Fist round the shield's hand strap.
  strap: [
    [0.3, 0.5, 0.55],
    [1.05, 1.35, 0.8],
    [1.15, 1.4, 0.8],
    [1.22, 1.4, 0.8],
    [1.3, 1.35, 0.8],
  ],
};

type Kind = "root" | "map" | "fore" | "mid" | "follow";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);

/** Angle of the twist about +Y contained in q (swing-twist split). */
export function twistY(q: THREE.Quaternion): number {
  let a = 2 * Math.atan2(q.y, q.w);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Rotation taking the orthonormal frame (x, y, z) onto the world axes. */
function frameToAxes(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Quaternion {
  _m.makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(_m).invert();
}

/** Orthonormal frame with `y` exact and `x` as close to the hint as possible. */
function frameXY(y: THREE.Vector3, xHint: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const yy = y.clone().normalize();
  const xx = xHint.clone().addScaledVector(yy, -xHint.dot(yy)).normalize();
  return [xx, yy, new THREE.Vector3().crossVectors(xx, yy)];
}

/** Orthonormal frame with `y` exact and `z` as close to the hint as possible. */
function frameYZ(y: THREE.Vector3, zHint: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const yy = y.clone().normalize();
  const zz = zHint.clone().addScaledVector(yy, -zHint.dot(yy)).normalize();
  return [new THREE.Vector3().crossVectors(yy, zz), yy, zz];
}

interface Joint {
  kind: Kind;
  parent: number;
  logical: number;
  /** Constant C for mapped bones (world rotation = mq[logical] * C). */
  c: THREE.Quaternion;
  /** Fingers: hand side (0 left, 1 right), finger, segment, and the curl axis in bone space. */
  finger: [number, number, number] | null;
  axis: THREE.Vector3;
  /** Forearm: its upper arm and hand (logical). */
  upper: number;
  hand: number;
}

export class BodyRig {
  readonly bones: THREE.Bone[] = [];
  readonly skeleton: THREE.Skeleton;
  /** Centre of a closed fist's grip in logical hand space (sword / shield strap mounting). */
  readonly grip = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  /** Twist (radians) between the forearm and hand frames in the bind pose, split at rest. */
  readonly wristTwist = { L: 0, R: 0 };
  private readonly J: Joint[] = [];
  private readonly W: THREE.Quaternion[] = [];
  private readonly P: THREE.Vector3[] = [];
  private readonly curl: number[][][] = [GRIPS.relaxed.map((r) => r.slice()), GRIPS.relaxed.map((r) => r.slice())];

  constructor(
    private readonly a: HumanAsset,
    rig: Rig
  ) {
    const { bindPos: P0, bindRot: R0, index } = a;
    const at = (n: string) => P0[index[n]];
    const inverse: Record<string, string> = {};
    Object.keys(a.meta.boneMap).forEach((k) => {
      const l = a.meta.boneMap[k];
      if (l) inverse[l] = k;
    });

    // Bone frames that map bind directions onto the logical rest pose.
    const A: Record<string, THREE.Quaternion> = {};
    for (const [s, side, sgn] of [
      ["l", "L", 1],
      ["r", "R", -1],
    ] as const) {
      const sh = at(`upperarm_${s}`);
      const el = at(`lowerarm_${s}`);
      const wr = at(`hand_${s}`);
      const u = el.clone().sub(sh).normalize();
      const f = wr.clone().sub(el).normalize();
      // Elbow hinge: logical -X for both arms (the elbow points back, the forearm folds forward).
      const hinge = new THREE.Vector3().crossVectors(u, f).normalize();
      const negH = hinge.clone().negate();
      const fu = frameXY(u.clone().negate(), negH);
      A[`upperarm_${s}`] = frameToAxes(fu[0], fu[1], fu[2]);
      const ff = frameXY(f.clone().negate(), negH);
      const af = frameToAxes(ff[0], ff[1], ff[2]);
      // Hand: fingers down (-Y), index side forward (+Z), so the palm faces the thigh.
      const mid = at(`middle_01_${s}`);
      const idx = at(`index_01_${s}`);
      const pinky = at(`pinky_01_${s}`);
      const fh = frameYZ(wr.clone().sub(mid), idx.clone().sub(pinky));
      const ah = frameToAxes(fh[0], fh[1], fh[2]);
      A[`hand_${s}`] = ah;
      // The forearm takes half of the bind twist between elbow and hand, the wrist the rest.
      const tw = twistY(_q.copy(ah).multiply(_q2.copy(af).invert()));
      this.wristTwist[side] = tw;
      A[`lowerarm_${s}`] = new THREE.Quaternion().setFromAxisAngle(Y, tw / 2).multiply(af);
      // Legs: shortest arc from the bind direction to straight down.
      for (const [a0, a1] of [
        [`thigh_${s}`, `calf_${s}`],
        [`calf_${s}`, `foot_${s}`],
      ]) {
        A[a0] = new THREE.Quaternion().setFromUnitVectors(at(a1).clone().sub(at(a0)).normalize(), new THREE.Vector3(0, -1, 0));
      }
      // Grip centre: in front of the knuckles on the palm side, a little toward the fingertips.
      const knuckle = mid.clone().sub(wr).applyQuaternion(ah);
      const palm = new THREE.Vector3(-sgn, 0, 0);
      this.grip[side].copy(knuckle).addScaledVector(palm, 0.024).add(new THREE.Vector3(0, -0.012, 0));
    }

    const palmBind = (s: string): THREE.Vector3 => new THREE.Vector3(s === "l" ? -1 : 1, 0, 0).applyQuaternion(_q3.copy(A[`hand_${s}`]).invert());

    a.joints.forEach((name, j) => {
      const logicalName = a.meta.boneMap[name];
      const joint: Joint = {
        kind: "follow",
        parent: a.parent[j],
        logical: -1,
        c: new THREE.Quaternion(),
        finger: null,
        axis: new THREE.Vector3(1, 0, 0),
        upper: -1,
        hand: -1,
      };
      if (a.parent[j] < 0) joint.kind = "root";
      if (logicalName) {
        joint.kind = name.indexOf("lowerarm") === 0 ? "fore" : "map";
        joint.logical = B[logicalName];
        joint.c.copy(A[name] || new THREE.Quaternion()).multiply(R0[j]);
        if (joint.kind === "fore") {
          const side = logicalName.charAt(logicalName.length - 1);
          joint.upper = B[`upperArm${side}` as BoneName];
          joint.hand = B[`hand${side}` as BoneName];
        }
      } else if (name === "spine_02") {
        joint.kind = "mid";
      }
      const fm = /^(thumb|index|middle|ring|pinky)_0(\d)_(l|r)$/.exec(name);
      if (fm) {
        const s = fm[3];
        const seg = Number(fm[2]) - 1;
        joint.finger = [s === "l" ? 0 : 1, FINGERS.indexOf(fm[1] as (typeof FINGERS)[number]), seg];
        // Curl axis: across the finger, so a positive angle folds it toward the palm.
        const next = index[`${fm[1]}_0${seg + 2}_${s}`];
        const from = seg === 2 ? a.parent[j] : j;
        const to = seg === 2 ? j : next;
        const dir = P0[to].clone().sub(P0[from]).normalize();
        const axisW = new THREE.Vector3().crossVectors(dir, palmBind(s)).normalize();
        joint.axis.copy(axisW.applyQuaternion(_q3.copy(R0[j]).invert()));
      }
      this.J.push(joint);
      this.W.push(new THREE.Quaternion());
      this.P.push(new THREE.Vector3());
      const bone = new THREE.Bone();
      bone.name = `body-${name}`;
      this.bones.push(bone);
    });
    a.joints.forEach((_n, j) => {
      const p = a.parent[j];
      (p < 0 ? rig.root : this.bones[p]).add(this.bones[j]);
    });
    const inverses = a.joints.map((_n, j) => new THREE.Matrix4().compose(P0[j], R0[j], new THREE.Vector3(1, 1, 1)).invert());
    this.skeleton = new THREE.Skeleton(this.bones, inverses);
    this.update(rig, "relaxed", "relaxed", 1);
  }

  /** Pose the imported skeleton from the logical one (call after the animator, every frame). */
  update(rig: Rig, gripL: GripName, gripR: GripName, dt: number): void {
    const { bindPos: P0, bindRot: R0 } = this.a;
    const k = 1 - Math.exp(-dt * 18);
    const targets = [GRIPS[gripL], GRIPS[gripR]];
    for (let h = 0; h < 2; h++) {
      for (let f = 0; f < 5; f++) for (let s = 0; s < 3; s++) this.curl[h][f][s] += (targets[h][f][s] - this.curl[h][f][s]) * k;
    }
    const W = this.W;
    const P = this.P;
    for (const j of this.a.order) {
      const J = this.J[j];
      const p = J.parent;
      // Parent's change from the bind pose.
      const dp = p >= 0 ? _q.copy(W[p]).multiply(_q2.copy(R0[p]).invert()) : _q.identity();
      switch (J.kind) {
        case "root":
          W[j].copy(R0[j]);
          P[j].copy(P0[j]);
          break;
        case "map":
          W[j].copy(rig.mq[J.logical]).multiply(J.c);
          P[j].copy(rig.mp[J.logical]);
          break;
        case "fore": {
          // Untwisted forearm frame, then half of the hand's twist about the forearm.
          const local = _q2.copy(rig.mq[J.upper]).invert().multiply(rig.mq[J.logical]);
          const f0 = _q3.copy(rig.mq[J.logical]).multiply(_q2.setFromAxisAngle(Y, -twistY(local)));
          const handRel = _q2.copy(f0).invert().multiply(rig.mq[J.hand]);
          const half = twistY(handRel) * 0.5;
          W[j].copy(f0).multiply(_q2.setFromAxisAngle(Y, half)).multiply(J.c);
          P[j].copy(rig.mp[J.logical]);
          break;
        }
        case "mid":
          // Between the logical spine and chest.
          W[j].copy(rig.mq[B.spine]).slerp(rig.mq[B.chest], 0.5).multiply(R0[j]);
          P[j].copy(P0[j]).sub(P0[p]).applyQuaternion(dp).add(P[p]);
          break;
        default: {
          W[j].copy(dp).multiply(R0[j]);
          if (J.finger) {
            const [h, f, s] = J.finger;
            W[j].multiply(_q3.setFromAxisAngle(J.axis, this.curl[h][f][s]));
          }
          P[j].copy(P0[j]).sub(P0[p]).applyQuaternion(dp).add(P[p]);
        }
      }
      const bone = this.bones[j];
      if (p < 0) {
        bone.quaternion.copy(W[j]);
        bone.position.copy(P[j]);
      } else {
        _q3.copy(W[p]).invert();
        bone.quaternion.copy(_q3).multiply(W[j]);
        bone.position.copy(_v.copy(P[j]).sub(P[p]).applyQuaternion(_q3));
      }
    }
  }

  dispose(): void {
    this.skeleton.dispose();
    for (const b of this.bones) b.removeFromParent();
  }
}
