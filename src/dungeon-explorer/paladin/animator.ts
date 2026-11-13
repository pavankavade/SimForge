// Procedural animation for the paladin. Nothing is baked: the gait plants feet by IK from the
// actual ground speed, the hands are IK targets in "aim space" (a frame at the eyes that pitches
// with the look direction, so first and third person see the same pose), and the sword arm runs
// through springs so swings carry weight: the blade lags on the way in and overshoots on the stop.
import * as THREE from "three";
import { B, HIP_Y, LEG_LOWER, LEG_UPPER, REST, basisQuat, type BoneName, type Rig } from "./rig";

export interface PaladinInput {
  /** Ground velocity in body space, m/s: x toward the character's left, z forward. */
  moveX: number;
  moveZ: number;
  /** Look pitch in radians, positive up. */
  aimPitch: number;
  /** Yaw speed in rad/s (weapon sway). */
  turnRate: number;
  /** Height above the ground in metres (0 when standing). */
  air: number;
  block: boolean;
  /** True on the frame the attack button went down. */
  attack: boolean;
  firstPerson: boolean;
}

type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number): V3 => new THREE.Vector3(x, y, z);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const ease = (t: number): number => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};
const smooth = (a: number, b: number, x: number): number => ease((x - a) / (b - a));

/** Upper-body pose: everything positional is in aim space (x left, y up, z forward, origin at the eyes). */
interface Pose {
  /** Right wrist. */
  hr: V3;
  /** Blade direction. */
  bd: V3;
  /** Right elbow pole. */
  er: V3;
  /** Left wrist. */
  hl: V3;
  /** Left elbow pole. */
  el: V3;
  /** Direction the shield face should point. */
  sn: V3;
  chestYaw: number;
  hipYaw: number;
  /** Forward lean of the torso (radians). */
  lean: number;
  /** Extra crouch (metres). */
  drop: number;
}

const pose = (p: Pose): Pose => p;
const clonePose = (p: Pose): Pose => ({
  hr: p.hr.clone(),
  bd: p.bd.clone(),
  er: p.er.clone(),
  hl: p.hl.clone(),
  el: p.el.clone(),
  sn: p.sn.clone(),
  chestYaw: p.chestYaw,
  hipYaw: p.hipYaw,
  lean: p.lean,
  drop: p.drop,
});

function copyPose(out: Pose, p: Pose): Pose {
  out.hr.copy(p.hr);
  out.bd.copy(p.bd);
  out.er.copy(p.er);
  out.hl.copy(p.hl);
  out.el.copy(p.el);
  out.sn.copy(p.sn);
  out.chestYaw = p.chestYaw;
  out.hipYaw = p.hipYaw;
  out.lean = p.lean;
  out.drop = p.drop;
  return out;
}

function lerpPose(out: Pose, a: Pose, b: Pose, t: number): Pose {
  out.hr.lerpVectors(a.hr, b.hr, t);
  out.bd.lerpVectors(a.bd, b.bd, t);
  out.er.lerpVectors(a.er, b.er, t);
  out.hl.lerpVectors(a.hl, b.hl, t);
  out.el.lerpVectors(a.el, b.el, t);
  out.sn.lerpVectors(a.sn, b.sn, t);
  out.chestYaw = lerp(a.chestYaw, b.chestYaw, t);
  out.hipYaw = lerp(a.hipYaw, b.hipYaw, t);
  out.lean = lerp(a.lean, b.lean, t);
  out.drop = lerp(a.drop, b.drop, t);
  return out;
}

const SHIELD_LOW = { hl: v(0.1, -0.47, 0.29), el: v(0.8, -0.55, -0.2), sn: v(0.62, 0, 0.78) };

/** Ready stance: sword upright at the right shoulder, shield across the left side. */
const GUARD = pose({
  hr: v(-0.235, -0.37, 0.33),
  bd: v(0.2, 0.87, 0.45),
  er: v(-0.55, -0.75, -0.35),
  hl: v(0.045, -0.41, 0.35),
  el: v(0.8, -0.55, -0.2),
  sn: v(0.5, 0.02, 0.86),
  chestYaw: -0.1,
  hipYaw: -0.22,
  lean: 0.03,
  drop: 0,
});

/** Running carry: weapons lowered and tucked in. */
const CARRY = pose({
  hr: v(-0.27, -0.5, 0.23),
  bd: v(0.08, 0.62, 0.78),
  er: v(-0.55, -0.7, -0.45),
  hl: v(0.1, -0.5, 0.27),
  el: v(0.8, -0.5, -0.3),
  sn: v(0.68, 0, 0.73),
  chestYaw: 0,
  hipYaw: 0,
  lean: 0,
  drop: 0,
});

/** Shield raised across the body, sword drawn back behind it. */
const BLOCK = pose({
  hr: v(-0.3, -0.52, 0.18),
  bd: v(0.22, 0.5, 0.84),
  er: v(-0.55, -0.7, -0.45),
  hl: v(-0.05, -0.25, 0.41),
  el: v(0.72, -0.68, -0.05),
  sn: v(0.1, 0.06, 0.99),
  chestYaw: -0.32,
  hipYaw: -0.3,
  lean: 0.07,
  drop: 0.045,
});

interface Swing {
  windup: number;
  strike: number;
  recover: number;
  chamber: Pose;
  /** Wrist and blade direction halfway through the cut (the arc passes through these). */
  midHand: V3;
  midBlade: V3;
  end: Pose;
}

const SWINGS: Swing[] = [
  // 1. Diagonal cut from the right shoulder down to the left hip.
  {
    windup: 0.28,
    strike: 0.2,
    recover: 0.44,
    chamber: pose({
      hr: v(-0.36, -0.03, 0.07),
      bd: v(-0.3, 0.72, -0.62),
      er: v(-0.8, -0.3, -0.5),
      ...SHIELD_LOW,
      chestYaw: -0.5,
      hipYaw: -0.3,
      lean: -0.02,
      drop: 0.01,
    }),
    midHand: v(-0.1, -0.2, 0.44),
    midBlade: v(-0.25, 0.32, 0.92),
    end: pose({
      hr: v(0.2, -0.5, 0.29),
      bd: v(0.7, -0.4, 0.6),
      er: v(-0.3, -0.9, -0.3),
      ...SHIELD_LOW,
      chestYaw: 0.45,
      hipYaw: 0.15,
      lean: 0.13,
      drop: 0.04,
    }),
  },
  // 2. Backhand cut, left to right at chest height.
  {
    windup: 0.24,
    strike: 0.2,
    recover: 0.44,
    chamber: pose({
      hr: v(0.18, -0.25, 0.19),
      bd: v(0.75, 0.5, -0.43),
      er: v(-0.2, -0.95, -0.2),
      ...SHIELD_LOW,
      chestYaw: 0.5,
      hipYaw: 0.2,
      lean: 0.03,
      drop: 0.02,
    }),
    midHand: v(-0.06, -0.24, 0.46),
    midBlade: v(0.12, 0.1, 0.99),
    end: pose({
      hr: v(-0.42, -0.28, 0.21),
      bd: v(-0.85, 0.12, 0.5),
      er: v(-0.7, -0.5, -0.5),
      ...SHIELD_LOW,
      chestYaw: -0.5,
      hipYaw: -0.3,
      lean: 0.08,
      drop: 0.02,
    }),
  },
  // 3. Overhead chop.
  {
    windup: 0.32,
    strike: 0.18,
    recover: 0.55,
    chamber: pose({
      hr: v(-0.2, 0.14, 0.02),
      bd: v(0.05, 0.55, -0.83),
      er: v(-0.85, -0.2, -0.3),
      ...SHIELD_LOW,
      chestYaw: -0.25,
      hipYaw: -0.2,
      lean: -0.09,
      drop: 0,
    }),
    midHand: v(-0.14, -0.06, 0.43),
    midBlade: v(0.05, 0.72, 0.69),
    end: pose({
      hr: v(-0.08, -0.5, 0.39),
      bd: v(0.08, -0.42, 0.9),
      er: v(-0.5, -0.8, -0.3),
      ...SHIELD_LOW,
      chestYaw: 0.2,
      hipYaw: 0.05,
      lean: 0.22,
      drop: 0.06,
    }),
  },
];

/** Implicit damped spring on a vector: stable at any frame rate. */
class Spring3 {
  readonly x = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  private started = false;

  step(target: V3, omega: number, zeta: number, dt: number): V3 {
    if (!this.started) {
      this.x.copy(target);
      this.started = true;
      return this.x;
    }
    const f = 1 + 2 * dt * zeta * omega;
    const hoo = dt * omega * omega;
    const hhoo = dt * hoo;
    const inv = 1 / (f + hhoo);
    const px = this.x.x;
    const py = this.x.y;
    const pz = this.x.z;
    this.x.set(
      (f * px + dt * this.vel.x + hhoo * target.x) * inv,
      (f * py + dt * this.vel.y + hhoo * target.y) * inv,
      (f * pz + dt * this.vel.z + hhoo * target.z) * inv
    );
    this.vel.set(
      (this.vel.x + hoo * (target.x - px)) * inv,
      (this.vel.y + hoo * (target.y - py)) * inv,
      (this.vel.z + hoo * (target.z - pz)) * inv
    );
    return this.x;
  }
}

interface FootTarget {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export type AttackState = "none" | "windup" | "strike" | "recover";

const _e = new THREE.Euler();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _aim = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _ctl = new THREE.Vector3();
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
const LEG_REACH = (LEG_UPPER + LEG_LOWER) * 0.988;
/** Ankle relative to the ball of the foot, in the foot's frame. */
const BALL_TO_ANKLE = new THREE.Vector3(0, REST.footL.y - REST.toeL.y, REST.footL.z - REST.toeL.z);

function quadThrough(out: V3, a: V3, mid: V3, b: V3, u: number): V3 {
  _ctl.copy(mid).multiplyScalar(2).addScaledVector(a, -0.5).addScaledVector(b, -0.5);
  const k = 1 - u;
  return out.set(0, 0, 0).addScaledVector(a, k * k).addScaledVector(_ctl, 2 * k * u).addScaledVector(b, u * u);
}

export class PaladinAnimator {
  /** Attack readouts for the combat system. */
  state: AttackState = "none";
  swingIndex = -1;
  /** Increments on every new swing, so each one can only hit a target once. */
  swingSerial = 0;
  strikeU = 0;
  /** 0..1 block amount (shield up). */
  blockAmount = 0;
  /** Gait phase 0..1 and how much of the stride is in use (camera bob, footsteps). */
  phase = 0;
  moveAmount = 0;
  /** Set when a foot lands: 1 = left, -1 = right, 0 = none this frame. */
  footfall = 0;

  private time = 0;
  private t = 0;
  private queued = false;
  private comboTimer = 0;
  private hitStop = 0;
  private readonly from = clonePose(GUARD);
  private readonly cur = clonePose(GUARD);
  private readonly rest = clonePose(GUARD);

  private run = 0;
  private dirX = 0;
  private dirZ = 1;
  private stride = 0.5;
  private sf = 0.62;
  private hipY = HIP_Y - 0.025;
  private airBlend = 0;
  private fp = 0;
  private wasAir = false;
  private dip = 0;
  private dipVel = 0;
  private tassetL = 0;
  private tassetR = 0;
  private prevPhase = 0;

  private readonly sHandR = new Spring3();
  private readonly sBlade = new Spring3();
  private readonly sHandL = new Spring3();
  private readonly sSway = new Spring3();
  private readonly handUp = new THREE.Vector3(0, 1, 0);
  private readonly footL: FootTarget = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  private readonly footR: FootTarget = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };

  /** A wall stopped the blade: abort the cut and let the arm rebound. */
  bounce(): void {
    if (this.state !== "strike") return;
    copyPose(this.from, this.cur);
    // Kick the wrist back along the way it came.
    this.from.hr.addScaledVector(this.sHandR.vel, -0.035);
    this.sHandR.vel.multiplyScalar(-0.55);
    this.sBlade.vel.multiplyScalar(-0.7);
    this.state = "recover";
    this.t = 0.06;
    this.queued = false;
  }

  /** Freeze the swing for a moment when the blade bites. */
  stop(seconds: number): void {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  private begin(index: number): void {
    this.swingIndex = index;
    this.swingSerial++;
    this.state = "windup";
    this.t = 0;
    this.queued = false;
    copyPose(this.from, this.cur);
  }

  private advanceAttack(dt: number, input: PaladinInput): void {
    // Where the arms go when not attacking.
    lerpPose(this.rest, GUARD, CARRY, this.run * (1 - this.blockAmount));
    lerpPose(this.rest, this.rest, BLOCK, this.blockAmount);

    if (input.attack) {
      if (this.state === "none") this.begin(this.comboTimer > 0 ? (this.swingIndex + 1) % SWINGS.length : 0);
      else this.queued = true;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.06;
    }
    this.t += dt;
    this.strikeU = 0;

    if (this.state === "none") {
      copyPose(this.cur, this.rest);
      this.comboTimer -= dt;
      return;
    }
    const sw = SWINGS[this.swingIndex];
    if (this.state === "windup") {
      lerpPose(this.cur, this.from, sw.chamber, ease(this.t / sw.windup));
      if (this.t >= sw.windup) {
        this.state = "strike";
        this.t = 0;
      }
      return;
    }
    if (this.state === "strike") {
      const s = clamp01(this.t / sw.strike);
      // Slow off the chamber, fastest through the middle.
      const u = s * s * (3 - 2 * s);
      lerpPose(this.cur, sw.chamber, sw.end, u);
      quadThrough(this.cur.hr, sw.chamber.hr, sw.midHand, sw.end.hr, u);
      quadThrough(this.cur.bd, sw.chamber.bd, sw.midBlade, sw.end.bd, u);
      this.strikeU = Math.max(0.001, u);
      if (this.t >= sw.strike) {
        this.state = "recover";
        this.t = 0;
        copyPose(this.from, sw.end);
      }
      return;
    }
    // Recover: hold the follow-through a beat, then return to guard (or chain the next cut).
    if (this.queued && this.t >= 0.09) {
      this.begin((this.swingIndex + 1) % SWINGS.length);
      return;
    }
    lerpPose(this.cur, this.from, this.rest, ease((this.t - 0.07) / sw.recover));
    if (this.t >= sw.recover + 0.07) {
      this.state = "none";
      this.comboTimer = 0.55;
    }
  }

  private foot(side: 1 | -1, p: number, air: number, out: FootTarget): void {
    const run = this.run;
    const mv = this.moveAmount;
    const S = this.stride;
    const a0 = 0.4 * S;
    const a1 = 0.6 * S;
    const strike = lerp(0.24, 0.1, run);
    const toeOff = lerp(0.55, 0.95, run);
    const liftH = lerp(0.045, 0.13, run);
    let along: number;
    let lift = 0;
    let pitch: number;
    if (p < this.sf) {
      const k = p / this.sf;
      along = a0 - (a0 + a1) * k;
      if (k < 0.18) {
        const h = 1 - k / 0.18;
        pitch = -strike * h;
        lift = 0.19 * Math.sin(strike * h);
      } else {
        pitch = toeOff * smooth(0.5, 1, k);
      }
    } else {
      const k = (p - this.sf) / (1 - this.sf);
      along = -a1 + (a0 + a1) * ease(k);
      pitch = lerp(toeOff, -strike, smooth(0.2, 0.95, k));
      lift = liftH * Math.sin(Math.PI * k) + 0.19 * Math.sin(strike) * smooth(0.75, 1, k);
    }
    const idle = 1 - mv;
    // Fighting stance when still: shield foot forward, sword foot back and turned out.
    out.x = side * (0.1 + 0.04 * idle) + this.dirX * along * mv;
    out.z = REST.toeL.z + side * 0.105 * idle + this.dirZ * along * mv;
    out.y = lift * mv;
    out.pitch = pitch * mv;
    out.yaw = idle * (side > 0 ? 0.16 : -0.45);
    if (this.airBlend > 0) {
      const a = this.airBlend;
      out.x = lerp(out.x, side * 0.105, a);
      out.z = lerp(out.z, REST.toeL.z + (side > 0 ? 0.12 : -0.1), a);
      out.y = lerp(out.y, 0.07 + (side > 0 ? 0.05 : 0) - Math.min(air, 0.25) * 0.2, a);
      out.pitch = lerp(out.pitch, 0.5, a);
    }
  }

  private leg(rig: Rig, side: 1 | -1, f: FootTarget): void {
    const thigh: BoneName = side > 0 ? "thighL" : "thighR";
    const shin: BoneName = side > 0 ? "shinL" : "shinR";
    const foot: BoneName = side > 0 ? "footL" : "footR";
    const toe: BoneName = side > 0 ? "toeL" : "toeR";
    rig.place(thigh);
    _q1.setFromEuler(_e.set(f.pitch, f.yaw, 0, "YXZ"));
    // Ankle from the ball of the foot (the ball stays planted while the heel lifts).
    _a.copy(BALL_TO_ANKLE).applyQuaternion(_q1);
    _a.x += f.x;
    _a.y += f.y + REST.toeL.y;
    _a.z += f.z;
    _b.set(Math.sin(f.yaw) * 0.5 + side * 0.1, 0.05, 1).normalize();
    rig.solveLimb(thigh, shin, foot, _a, _b, false);
    rig.mq[B[foot]].copy(_q1);
    rig.place(toe);
    rig.mq[B[toe]].setFromEuler(_e.set(Math.min(0, f.pitch), f.yaw, 0, "YXZ"));
  }

  private arm(rig: Rig, side: 1 | -1, wrist: V3, pole: V3): void {
    const clav: BoneName = side > 0 ? "clavL" : "clavR";
    const upper: BoneName = side > 0 ? "upperArmL" : "upperArmR";
    const fore: BoneName = side > 0 ? "foreArmL" : "foreArmR";
    const hand: BoneName = side > 0 ? "handL" : "handR";
    const pauldron: BoneName = side > 0 ? "pauldronL" : "pauldronR";
    // The collarbone shrugs and reaches toward the target a little.
    rig.setLocal(clav, null);
    rig.place(upper);
    _a.copy(wrist).sub(rig.mp[B[upper]]).applyQuaternion(_q1.copy(rig.mq[B.chest]).invert());
    const elev = Math.max(-0.08, Math.min(0.32, _a.y * 0.55 + 0.04));
    const prot = Math.max(-0.12, Math.min(0.34, (_a.z - 0.18) * 0.7));
    _q2.setFromEuler(_e.set(0, -side * prot, side * elev, "YXZ"));
    rig.setLocal(clav, _q2);
    rig.place(upper);
    rig.solveLimb(upper, fore, hand, wrist, pole, true);
    // Pauldron follows a third of the upper arm's swing, never its twist.
    _a.copy(rig.mp[B[fore]]).sub(rig.mp[B[upper]]).normalize();
    _b.copy(DOWN).applyQuaternion(rig.mq[B[clav]]);
    _q1.setFromUnitVectors(_b, _a);
    _q2.identity().slerp(_q1, 0.36);
    rig.place(pauldron);
    rig.mq[B[pauldron]].copy(_q2).multiply(rig.mq[B[clav]]);
  }

  update(dt: number, rig: Rig, input: PaladinInput): void {
    this.time += dt;
    const speed = Math.hypot(input.moveX, input.moveZ);
    const k6 = 1 - Math.exp(-dt * 6);
    const k10 = 1 - Math.exp(-dt * 10);

    // --- Locomotion state ---------------------------------------------------------------------
    this.moveAmount += (clamp01(speed / 0.6) - this.moveAmount) * k10;
    this.run += (smooth(2.2, 3.6, speed) - this.run) * k6;
    if (speed > 0.08) {
      const tx = input.moveX / speed;
      const tz = input.moveZ / speed;
      this.dirX += (tx - this.dirX) * k10;
      this.dirZ += (tz - this.dirZ) * k10;
      const l = Math.hypot(this.dirX, this.dirZ) || 1;
      this.dirX /= l;
      this.dirZ /= l;
    }
    this.sf = lerp(0.62, 0.36, this.run);
    const cadenceNominal = lerp(0.8, 1.35, this.run) * (0.72 + 0.28 * clamp01(speed / 1.6));
    const cadence = Math.max(cadenceNominal, (speed * this.sf) / 0.82);
    this.stride = Math.min(0.82, (speed * this.sf) / Math.max(0.2, cadence));
    this.prevPhase = this.phase;
    if (speed > 0.05) this.phase = (this.phase + dt * cadence) % 1;
    const pL = this.phase;
    const pR = (this.phase + 0.5) % 1;
    this.footfall = 0;
    if (this.moveAmount > 0.5 && input.air <= 0.01) {
      if (this.phase < this.prevPhase) this.footfall = 1;
      else if (this.prevPhase < 0.5 && this.phase >= 0.5) this.footfall = -1;
    }

    const inAir = input.air > 0.03;
    this.airBlend += ((inAir ? 1 : 0) - this.airBlend) * (1 - Math.exp(-dt * 14));
    if (this.wasAir && !inAir) this.dipVel -= 1.5;
    this.wasAir = inAir;
    // Landing dip: a damped spring on the hips.
    this.dipVel += (-this.dip * 190 - this.dipVel * 15) * dt;
    this.dip += this.dipVel * dt;
    this.fp += ((input.firstPerson ? 1 : 0) - this.fp) * k10;
    this.blockAmount += ((input.block && this.state === "none" ? 1 : 0) - this.blockAmount) * (1 - Math.exp(-dt * 13));

    this.advanceAttack(dt, input);
    const P = this.cur;
    const striking = this.state === "strike";

    // --- Feet and hips ------------------------------------------------------------------------
    this.foot(1, pL, input.air, this.footL);
    this.foot(-1, pR, input.air, this.footR);
    const forwardness = this.dirZ * this.moveAmount;
    const sway = 0.02 * Math.cos(Math.PI * 2 * (this.phase - this.sf / 2)) * this.moveAmount * (1 - 0.6 * this.run);
    const lunge = striking || this.state === "recover" ? P.lean * 0.35 : 0;
    const hipsX = sway;
    const hipsZ = 0.01 + this.run * 0.03 * forwardness + lunge;
    let hipTarget = HIP_Y - 0.025 - P.drop;
    for (const side of [1, -1]) {
      const f = side > 0 ? this.footL : this.footR;
      _q1.setFromEuler(_e.set(f.pitch, f.yaw, 0, "YXZ"));
      _a.copy(BALL_TO_ANKLE).applyQuaternion(_q1);
      const ax = _a.x + f.x - (hipsX + side * REST.thighL.x);
      const az = _a.z + f.z - hipsZ;
      const ay = _a.y + f.y + REST.toeL.y;
      const reach = ay + Math.sqrt(Math.max(0.04, LEG_REACH * LEG_REACH - ax * ax - az * az)) + (HIP_Y - REST.thighL.y);
      if (reach < hipTarget) hipTarget = reach;
    }
    this.hipY += (hipTarget - this.hipY) * (1 - Math.exp(-dt * 20));
    if (this.hipY > hipTarget + 0.03) this.hipY = hipTarget + 0.03;

    const gaitYaw = -lerp(0.07, 0.15, this.run) * Math.cos(Math.PI * 2 * this.phase) * forwardness;
    const leanMove = (0.03 + 0.12 * this.run) * forwardness;
    const lean = P.lean + leanMove;
    const breath = Math.sin(this.time * 1.7) * 0.012 * (1 - this.moveAmount * 0.6);
    const pitchUp = input.aimPitch;

    rig.mp[B.hips].set(hipsX, this.hipY + this.dip, hipsZ);
    rig.mq[B.hips].setFromEuler(_e.set(lean * 0.35, P.hipYaw + gaitYaw, -this.dirX * this.moveAmount * 0.03, "YXZ"));
    const chestQ = _q2.setFromEuler(_e.set(lean * 0.95 - pitchUp * 0.3 + breath, P.chestYaw - gaitYaw * 0.4, 0, "YXZ"));
    rig.mq[B.spine].copy(rig.mq[B.hips]).slerp(chestQ, 0.5);
    rig.place("spine");
    rig.mq[B.chest].copy(chestQ);
    rig.place("chest");
    const headQ = _q1.setFromEuler(_e.set(-pitchUp * 0.82 + lean * 0.15, 0, 0, "YXZ"));
    rig.mq[B.neck].copy(rig.mq[B.chest]).slerp(headQ, 0.5);
    rig.place("neck");
    rig.mq[B.head].copy(headQ);
    rig.place("head");

    this.leg(rig, 1, this.footL);
    this.leg(rig, -1, this.footR);

    // Tassets ride up on the thigh and swing with a little lag.
    for (const side of [1, -1]) {
      const thigh = side > 0 ? B.thighL : B.thighR;
      const shin = side > 0 ? B.shinL : B.shinR;
      _a.copy(rig.mp[shin]).sub(rig.mp[thigh]).applyQuaternion(_q1.copy(rig.mq[B.hips]).invert());
      const flex = Math.max(0, Math.atan2(_a.z, -_a.y) - 0.04) * 0.9;
      const k = 1 - Math.exp(-dt * 22);
      if (side > 0) this.tassetL += (flex - this.tassetL) * k;
      else this.tassetR += (flex - this.tassetR) * k;
      _q2.setFromAxisAngle(_x.set(1, 0, 0), -(side > 0 ? this.tassetL : this.tassetR));
      rig.setLocal(side > 0 ? "tassetL" : "tassetR", _q2);
    }

    // --- Arms ---------------------------------------------------------------------------------
    // Aim space: origin at the eyes (level head), pitched with the look direction.
    _aim.setFromAxisAngle(_x.set(1, 0, 0), -pitchUp * 0.9);
    const eye = _c.set(0, 0.1, 0.085).add(rig.mp[B.head]);

    // Weapon sway: the arms trail a turn, and bob with the stride.
    const swayT = _a.set(-input.turnRate * 0.014, 0, 0);
    swayT.x = Math.max(-0.07, Math.min(0.07, swayT.x));
    const sw = this.sSway.step(swayT, 9, 0.75, dt);
    const stepBob = Math.abs(Math.sin(Math.PI * 2 * this.phase)) * this.moveAmount;
    const bobY = -stepBob * lerp(0.012, 0.03, this.run) + Math.sin(this.time * 1.7) * 0.005;
    const bobX = Math.sin(Math.PI * 2 * this.phase) * this.moveAmount * 0.01;
    // First person brings the hands up into view; the cuts themselves stay where they are.
    const fpAmt = this.fp * (this.state === "none" ? 1 : 0.3) * (1 - this.blockAmount * 0.6);
    const lift = -this.airBlend * 0.03;

    const stiff = striking ? 60 : this.state === "windup" ? 26 : 17;
    const handT = _a.copy(P.hr);
    handT.x += sw.x + bobX + fpAmt * 0.02;
    handT.y += bobY + lift + fpAmt * 0.16;
    handT.z += fpAmt * 0.08;
    const hr = this.sHandR.step(handT, stiff, striking ? 0.95 : 0.85, dt);
    const bladeT = _b.copy(P.bd).normalize();
    bladeT.x += Math.sin(this.time * 0.9) * 0.015 - sw.x * 1.2;
    bladeT.z += Math.cos(this.time * 1.3) * 0.012;
    // The blade is lighter on the wrist than the arm is on the shoulder: it lags, then overshoots.
    const bd = this.sBlade.step(bladeT, striking ? 34 : 20, striking ? 0.6 : 0.55, dt);
    const handLT = _z.copy(P.hl);
    handLT.x += sw.x * 0.8 - bobX;
    handLT.y += bobY * 0.8 + lift + fpAmt * 0.1;
    handLT.z += fpAmt * 0.05;
    const hl = this.sHandL.step(handLT, 16, 0.85, dt);

    // Right arm, then the sword hand: Z along the blade, Y back up the forearm.
    const wristR = _w.copy(hr).applyQuaternion(_aim).add(eye);
    const poleR = _p.copy(P.er).applyQuaternion(_aim);
    this.arm(rig, -1, wristR, poleR);
    _z.copy(bd).normalize().applyQuaternion(_aim);
    _y.copy(rig.mp[B.foreArmR]).sub(rig.mp[B.handR]).normalize();
    _y.addScaledVector(_z, -_y.dot(_z));
    if (_y.lengthSq() < 0.04) _y.copy(this.handUp).addScaledVector(_z, -this.handUp.dot(_z));
    _y.normalize();
    this.handUp.copy(_y);
    _x.crossVectors(_y, _z);
    basisQuat(rig.mq[B.handR], _x, _y, _z);

    // Left arm: roll the forearm so the strapped shield faces where the pose asks.
    const wristL = _w.copy(hl).applyQuaternion(_aim).add(eye);
    const poleL = _p.copy(P.el).applyQuaternion(_aim);
    this.arm(rig, 1, wristL, poleL);
    const fq = rig.mq[B.foreArmL];
    const want = _c.copy(P.sn).normalize().applyQuaternion(_aim);
    _x.set(1, 0, 0).applyQuaternion(fq);
    _z.set(0, 0, 1).applyQuaternion(fq);
    rig.twist("foreArmL", Math.atan2(-want.dot(_z), want.dot(_x)));
    rig.mq[B.handL].copy(rig.mq[B.foreArmL]);

    rig.apply();
  }
}
