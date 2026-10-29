import type React from "react";
import { useCurrentFrame } from "remotion";
import { Burst } from "../../artifacts/dungeon/Fx";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, bezier3, dust, lying, magic, sparks, type Actor } from "../../kit";
import type { AdventurerClass, AdventurerPose, Expression } from "../../artifacts/characters/hero";
import type { Vec3 } from "../../engine/types";
import { Ladder, Ram, Rock, Sheep } from "./components/Props";
import { Pile, Valley } from "./components/Valley";
import { Wall } from "./components/Wall";
import {
  BACK_UP,
  BEATS,
  CHAINS_IN,
  CHARGE_GO,
  CLIMB,
  CLIMBER_IN,
  CLIMBER_RUN,
  CLIMBER_X,
  CLIMBER_Z,
  CLIMB_JUMP,
  CLIMB_SLIDE,
  CLIMB_TOP,
  DAD_ON_TOWER,
  DAD_TOWER_SPOT,
  DAD_TO_TOWER,
  DIG,
  FLOOD,
  GATE_CHARGE,
  GATE_CREW_IN,
  GATE_CREW_STOP,
  GATE_RUN,
  GATE_Z,
  GETUP,
  HIDE_X,
  HIDE_ZS,
  JUMP5,
  JUMP5_X,
  LADDER_CARRY_X,
  LADDER_FOOT,
  LADDER_IN,
  LADDER_LAG,
  LADDER_LEN,
  LADDER_LEAN,
  LADDER_WALK,
  LADDER_ZS,
  LAY,
  LIFT,
  MERLONS_UP,
  MOAT_X0,
  MOAT_X1,
  PATCH,
  PILE_UP,
  PORTCULLIS_DROP,
  RAM_IN,
  RAM_SLOTS,
  RECOIL,
  RETREAT,
  SHEEP,
  TEETER,
  THIEF_EDGE,
  THIEF_GRAB,
  THIEF_HOP,
  THIEF_HOP2,
  THIEF_IN,
  THROW,
  TOPPLE,
  TOPPLE_X,
  TOWER_RISE,
  TOWER_TOP,
  TOWER_ZS,
  WADE,
  WALL_BUILD,
  WALL_H,
  WALL_IN,
  WALL_OUT,
  WATER_Y,
  Z,
  arc,
  carrierY,
  clamp01,
  drift,
  easeInOut,
  fallFrame,
  floatDepth,
  gateCrewX,
  heightOf,
  ladderAngle,
  ladderLanded,
  ladderPoint,
  lerp,
  lineStart,
  progress,
  pushAt,
  ramTip,
  splashFrame,
  thiefX,
  thiefY,
  towerRise,
} from "./timeline";

const AWAY = FACE_CAMERA + Math.PI;
const GOB_H = heightOf("goblin");

/** Water splash: white spray plus a few blue drops. */
const splash = (at: number, position: Vec3, seed: string, scale = 1) => (
  <group key={`splash-${seed}`}>
    <Burst at={at} position={position} count={Math.round(30 * scale)} size={0.15 * scale} duration={28} speed={0.11 * scale} direction={[0, 0.16, 0]} gravity={-0.014} spread={[0.5, 0.15, 0.5]} color="#eef9ff" opacity={0.95} seed={`${seed}-w`} />
    <Burst at={at} position={position} count={Math.round(14 * scale)} size={0.11 * scale} duration={26} speed={0.09 * scale} direction={[0, 0.13, 0]} gravity={-0.012} spread={[0.4, 0.1, 0.4]} color="#7cc4f0" opacity={0.9} seed={`${seed}-b`} />
  </group>
);

/** A body floating in the moat: bobbing, slowly drifting away from the camera. */
const floating = (c: AdventurerClass, x: number, z: number, frame: number, since: number, expression: Expression = "dazed"): Actor => ({
  pose: "float",
  expression,
  position: [x, floatDepth(c) + 0.04 * Math.sin(frame * 0.12 + x), z + drift(frame, since + 20)],
  yaw: FACE_CAMERA + 0.4 * Math.sin(frame * 0.03 + x),
  weapon: "none",
});

// ---------------------------------------------------------------------------
// You (dad): in the village for levels 1-2, patches the hole, then lives on
// the walkway and finally the first tower.
// ---------------------------------------------------------------------------
const DAD_HOME: Vec3 = [-3.6, 0, 0.2];
const DAD_WALL: Vec3 = [-2.3, 0, Z];
const DAD_PATCH: Vec3 = [WALL_IN - 0.55, 0, Z];
const DAD_UP = lineStart("l3b") - 8;
const DAD_TOP: Vec3 = [0.05, WALL_H, Z];
const DAD_HIDE_Z = Z - 0.6;

const dadActor = (frame: number): Actor => {
  const pose = (p: AdventurerPose, expression: Expression, position: Vec3, yaw: number, speed?: number): Actor => ({ pose: p, expression, position, yaw, speed });
  // L1-L2 on the ground
  if (frame < lineStart("l2a") - 20) {
    if (frame >= THIEF_GRAB[0]) return pose("point", "angry", DAD_HOME, FACE_RIGHT + 0.5);
    if (frame >= BEATS.raiders1) return pose(frame >= BEATS.scramble ? "cower" : "idle", "shock", DAD_HOME, FACE_RIGHT + 0.6);
    if (frame >= BEATS.village + 10) return pose(frame < BEATS.village + 40 ? "cheer" : "idle", "happy", DAD_HOME, FACE_CAMERA + 0.5);
    if (frame >= BEATS.pile - 4) return pose("cast", "focus", DAD_HOME, FACE_RIGHT + 0.3);
    return pose("idle", "angry", DAD_HOME, FACE_CAMERA + 0.4);
  }
  if (frame < lineStart("l2a") + 16) {
    const t = easeInOut(progress(frame, [lineStart("l2a") - 20, lineStart("l2a") + 16]));
    return pose("walk", "neutral", [lerp(DAD_HOME[0], DAD_WALL[0], t), 0, lerp(DAD_HOME[2], DAD_WALL[2], t)], FACE_RIGHT);
  }
  if (frame < DAD_UP) {
    if (frame >= PATCH[0] - 2) return pose(frame < PATCH[1] + 10 ? "cast" : "cheer", frame < PATCH[1] + 10 ? "focus" : "happy", DAD_PATCH, FACE_RIGHT);
    if (frame >= BEATS.smash + 30) {
      const t = easeInOut(progress(frame, [BEATS.smash + 30, PATCH[0] - 4]));
      return pose("walk", "angry", [lerp(DAD_WALL[0], DAD_PATCH[0], t), 0, Z], FACE_RIGHT);
    }
    if (frame >= BEATS.smash - 4) return pose("cower", "scared", DAD_WALL, FACE_RIGHT + 0.6);
    if (frame >= BEATS.bring) return pose("idle", "shock", DAD_WALL, FACE_RIGHT + 0.5);
    if (frame >= BEATS.climb2 - 14) return pose("point", "smug", DAD_WALL, FACE_CAMERA + 0.5);
    if (frame >= BEATS.wall2) return pose(frame < BEATS.wall2 + 36 ? "cheer" : "idle", "happy", DAD_WALL, FACE_CAMERA + 0.4);
    return pose("idle", "shock", DAD_WALL, FACE_RIGHT + 0.6);
  }
  // L3-L5 on the walkway
  if (frame < lineStart("l4a")) {
    if (frame >= BEATS.water) return pose(frame < BEATS.water + 40 ? "cheer" : "idle", "happy", DAD_TOP, FACE_CAMERA + 0.6);
    if (frame >= BEATS.reach - 6) return pose("point", "smug", DAD_TOP, FACE_RIGHT + 0.4);
    return pose("idle", "smug", DAD_TOP, FACE_RIGHT + 0.5);
  }
  if (frame < DAD_TO_TOWER[0]) {
    const p = pushAt(0);
    if (frame >= lineStart("l5a")) return pose(frame >= BEATS.cantSee - 6 ? "idle" : "point", frame >= BEATS.cantSee - 6 ? "dazed" : "focus", DAD_TOP, FACE_RIGHT + (frame >= BEATS.cantSee - 6 ? 0.9 : 0.2));
    if (frame >= p + PUSH_DONE) return pose(frame < p + PUSH_DONE + 40 ? "cheer" : "idle", "smug", DAD_TOP, FACE_CAMERA + 0.5);
    if (frame >= p) return pose("cast", "angry", DAD_TOP, FACE_RIGHT);
    if (frame >= p - 8) {
      const t = easeInOut(progress(frame, [p - 8, p]));
      return pose("walk", "angry", [DAD_TOP[0], WALL_H, lerp(DAD_HIDE_Z, Z, t)], FACE_CAMERA);
    }
    if (frame >= BEATS.hide - 6) return pose("cower", "scared", [DAD_TOP[0] - 0.1, WALL_H, DAD_HIDE_Z], FACE_RIGHT + 0.4);
    if (frame >= BEATS.battlements) return pose("point", "happy", [DAD_TOP[0], WALL_H, DAD_HIDE_Z], FACE_CAMERA + 0.6);
    if (frame >= BEATS.climb4) return pose("cower", "scared", DAD_TOP, FACE_RIGHT + 0.4);
    return pose("idle", "shock", DAD_TOP, FACE_RIGHT + 0.4);
  }
  if (frame < TOWER_RISE[0]) {
    const t = easeInOut(progress(frame, DAD_TO_TOWER));
    return pose(t > 0 && t < 1 ? "walk" : "idle", "focus", [DAD_TOP[0], WALL_H, lerp(Z, TOWER_ZS[0], t)], t < 1 ? AWAY : FACE_CAMERA);
  }
  const y = WALL_H + (TOWER_TOP - WALL_H) * towerRise(frame, 0);
  if (frame < DAD_ON_TOWER[0]) return pose("cower", "shock", [DAD_TOP[0], y, TOWER_ZS[0]], FACE_CAMERA);
  const tw = easeInOut(progress(frame, DAD_ON_TOWER));
  const at: Vec3 = [lerp(DAD_TOP[0], DAD_TOWER_SPOT[0], tw), TOWER_TOP, lerp(TOWER_ZS[0], DAD_TOWER_SPOT[1], tw)];
  if (frame < DAD_ON_TOWER[1]) return pose("walk", "happy", at, FACE_CAMERA + 0.6);
  if (frame >= BEATS.congrats) return pose("cheer", "happy", at, FACE_CAMERA + 0.3);
  if (frame >= LIFT[1]) return pose(frame < LIFT[1] + 40 ? "cheer" : "idle", "smug", at, FACE_CAMERA + 0.6);
  if (frame >= BEATS.hiding) return pose(frame < BEATS.hiding + 40 ? "cheer" : "idle", "smug", at, FACE_CAMERA + 0.3);
  if (frame >= THROW[0]) return pose("smash", "angry", at, FACE_CAMERA + 0.25);
  if (frame >= THROW[0] - 14) return pose("windup", "focus", at, FACE_CAMERA + 0.25);
  if (frame >= BEATS.see - 6) return pose("point", "smug", at, FACE_CAMERA + 0.2);
  return pose("idle", "happy", at, FACE_CAMERA + 0.5);
};
const PUSH_DONE = 26;

/** Dad's throwing hand while he holds the rock. */
const dadHand = (): Vec3 => [DAD_TOWER_SPOT[0] + 0.25, TOWER_TOP + 1.75, DAD_TOWER_SPOT[1] + 0.35];

// ---------------------------------------------------------------------------
// Mom: tends the sheep, then holds the second crenel, then the gate winch.
// ---------------------------------------------------------------------------
const MOM_HOME: Vec3 = [-5.9, 0, -1.4];
const MOM_UP = lineStart("l4a") - 10;
const MOM_Z = LADDER_ZS[1];
const MOM_HIDE_Z = MOM_Z + 0.6;
const MOM_TO_GATE = [lineStart("l5a") + 6, lineStart("l5a") + 76] as const;
const MOM_GATE_Z = GATE_Z + 1.95;

const momActor = (frame: number): Actor => {
  const pose = (p: AdventurerPose, expression: Expression, position: Vec3, yaw: number): Actor => ({ pose: p, expression, position, yaw });
  if (frame < MOM_UP) {
    if (frame >= BEATS.water) return pose("idle", "happy", MOM_HOME, FACE_CAMERA + 0.4);
    if (frame >= BEATS.smash) return pose(frame < BEATS.smash + 30 ? "cower" : "idle", "shock", MOM_HOME, FACE_RIGHT + 0.6);
    if (frame >= BEATS.wall2) return pose(frame < BEATS.wall2 + 36 ? "cheer" : "idle", "happy", MOM_HOME, FACE_CAMERA + 0.4);
    if (frame >= BEATS.raiders1) return pose(frame < THIEF_HOP2[1] + 20 ? "cower" : "idle", "shock", MOM_HOME, FACE_RIGHT + 0.6);
    return pose("idle", "happy", MOM_HOME, FACE_CAMERA + 0.3);
  }
  if (frame < lineStart("l5a")) {
    const p = pushAt(1);
    if (frame >= p + PUSH_DONE) return pose(frame < p + PUSH_DONE + 40 ? "cheer" : "idle", "happy", [0, WALL_H, MOM_Z], FACE_CAMERA + 0.5);
    if (frame >= p) return pose("cast", "angry", [0, WALL_H, MOM_Z], FACE_RIGHT);
    if (frame >= p - 8) return pose("walk", "angry", [0, WALL_H, lerp(MOM_HIDE_Z, MOM_Z, easeInOut(progress(frame, [p - 8, p])))], AWAY);
    if (frame >= BEATS.hide - 4) return pose("cower", "scared", [-0.1, WALL_H, MOM_HIDE_Z], FACE_RIGHT + 0.4);
    if (frame >= BEATS.climb4) return pose("cower", "scared", [0, WALL_H, MOM_Z], FACE_RIGHT + 0.4);
    return pose("idle", "shock", [0, WALL_H, MOM_Z], FACE_RIGHT + 0.5);
  }
  if (frame < MOM_TO_GATE[1]) {
    const t = progress(frame, MOM_TO_GATE);
    return pose(t > 0 ? "walk" : "idle", "focus", [0, WALL_H, lerp(MOM_Z, MOM_GATE_Z, t)], t > 0 ? AWAY : FACE_CAMERA);
  }
  const at: Vec3 = [-0.1, WALL_H, MOM_GATE_Z];
  if (frame >= BEATS.congrats) return pose("cheer", "happy", at, FACE_CAMERA + 0.5);
  if (frame >= PORTCULLIS_DROP[0]) return pose("point", "smug", at, FACE_CAMERA + 0.8);
  if (frame >= LIFT[1]) return pose(frame < LIFT[1] + 30 ? "cheer" : "idle", "happy", at, FACE_CAMERA + 0.6);
  if (frame >= LIFT[0] - 4) return pose("cast", "focus", at, FACE_RIGHT + 0.3);
  if (frame >= lineStart("l6a")) return pose("idle", "shock", at, FACE_RIGHT + 0.5);
  return pose("idle", "happy", at, FACE_CAMERA + 0.6);
};

// ---------------------------------------------------------------------------
// Raider 1: the sheep thief (L1), back to try climbing the new wall (L2).
// ---------------------------------------------------------------------------
const thiefActor = (frame: number): Actor | null => {
  if (frame < THIEF_IN) return null;
  if (frame < CLIMBER_IN) {
    const x = thiefX(frame);
    if (x > 16) return null;
    const p: Vec3 = [x, thiefY(frame), Z];
    if (frame < THIEF_HOP[0]) return { pose: "run", expression: "smug", position: p, yaw: FACE_LEFT, speed: 2, weapon: "none" };
    if (frame < THIEF_HOP[1]) return { pose: "jump", expression: "yell", position: p, yaw: FACE_LEFT, weapon: "none" };
    if (frame < THIEF_HOP2[0]) return { pose: frame >= THIEF_GRAB[0] ? "cheer" : "walk", expression: "happy", position: p, yaw: frame >= THIEF_GRAB[0] ? FACE_CAMERA : FACE_LEFT, weapon: "none" };
    if (frame < THIEF_HOP2[1]) return { pose: "jump", expression: "happy", position: p, yaw: FACE_RIGHT, weapon: "none" };
    return { pose: "run", expression: "happy", position: p, yaw: FACE_RIGHT, speed: 2.3, weapon: "none" };
  }
  // The climber: runs at the new wall, jumps, slides down, flees.
  if (frame < CLIMB_JUMP[0]) {
    const x = CLIMBER_X + 0.15 * (CLIMB_JUMP[0] - frame);
    return x > 16 ? null : { pose: "run", expression: "smug", position: [x, 0, CLIMBER_Z], yaw: FACE_LEFT, speed: 2 };
  }
  if (frame < CLIMB_JUMP[1]) {
    const t = progress(frame, CLIMB_JUMP);
    return { pose: "jump", expression: "yell", position: [lerp(CLIMBER_X, WALL_OUT + 0.3, t), 1.7 * Math.sin((t * Math.PI) / 2), CLIMBER_Z], yaw: FACE_LEFT };
  }
  if (frame < CLIMB_SLIDE[1]) {
    const t = progress(frame, CLIMB_SLIDE);
    return { pose: "slip", expression: "shock", position: [WALL_OUT + 0.3 + 0.2 * t, 1.7 * (1 - t * t), CLIMBER_Z], yaw: FACE_LEFT };
  }
  if (frame < CLIMBER_RUN) return lying({ classType: "goblin", x: WALL_OUT + 1.1, z: CLIMBER_Z, frame, since: CLIMB_SLIDE[1], facing: "left", expression: "dazed" });
  const x = WALL_OUT + 1.1 + 0.2 * (frame - CLIMBER_RUN);
  return x > 16 ? null : { pose: "run", expression: "scared", position: [x, 0, CLIMBER_Z], yaw: FACE_RIGHT, speed: 2.4 };
};

/** Sheep 0: grazing, then grabbed and carried off upside down. */
const sheep0 = (frame: number): { position: Vec3; tilt: number; kick: number } | null => {
  const home: Vec3 = [SHEEP[0][0], 0, SHEEP[0][1]];
  if (frame < THIEF_GRAB[0]) return { position: home, tilt: 0, kick: 0 };
  const held: Vec3 = [thiefX(frame) - 0.35, thiefY(frame) + GOB_H + 0.62, Z];
  if (held[0] > 16.3) return null;
  const t = easeInOut(progress(frame, THIEF_GRAB));
  return { position: [lerp(home[0], held[0], t), lerp(0, held[1], t), Z], tilt: Math.PI * t, kick: t };
};

// ---------------------------------------------------------------------------
// The ram crew (L2-L3): two goblins and a barbarian behind the ram.
// ---------------------------------------------------------------------------
const RAM_CREW: { cls: AdventurerClass; slot: number }[] = [
  { cls: "goblin", slot: 0 },
  { cls: "goblin", slot: 1 },
  { cls: "barbarian", slot: 2 },
];

const ramCrewActor = (frame: number, k: number): Actor | null => {
  if (frame < RAM_IN) return null;
  const { cls, slot } = RAM_CREW[k];
  const off = RAM_SLOTS[slot];
  const x = ramTip(frame) + off;
  if (x > 17) return null;
  const splashAt = splashFrame(off, cls);
  if (frame >= splashAt) return floating(cls, Math.min(x, MOAT_X1 - 0.4), Z, frame, splashAt, frame < splashAt + 30 ? "shock" : "dazed");
  const p: Vec3 = [x, carrierY(frame, off, cls), Z];
  const base = { position: p, weapon: "none" as const };
  if (frame >= fallFrame(off)) return { ...base, pose: "fall", expression: "shock", yaw: FACE_LEFT };
  if (frame >= CHARGE_GO) return { ...base, pose: "run", expression: "yell", yaw: FACE_LEFT, speed: 2.6 };
  if (frame >= BACK_UP[0]) return { ...base, pose: frame < BACK_UP[1] ? "walk" : "idle", expression: "angry", yaw: FACE_LEFT, speed: 0.8 };
  if (frame >= TEETER[0]) return { ...base, pose: "idle", expression: frame >= BEATS.reach - 10 ? "shock" : "focus", yaw: FACE_LEFT };
  if (frame >= RETREAT[0]) return { ...base, pose: frame < RETREAT[1] ? "walk" : "idle", expression: "smug", yaw: FACE_LEFT, speed: 0.7 };
  if (frame >= BEATS.hole) return { ...base, pose: "cheer", expression: "happy", yaw: FACE_CAMERA + 0.6 };
  if (frame >= RECOIL[0]) return { ...base, pose: "idle", expression: "yell", yaw: FACE_LEFT };
  return { ...base, pose: "run", expression: "yell", yaw: FACE_LEFT, speed: 2 };
};

const RAM_Y = 0.95;
const ramState = (frame: number): { position: Vec3; pitch: number } | null => {
  if (frame < RAM_IN) return null;
  const tip = ramTip(frame);
  if (tip > 17) return null;
  const sinkY = carrierY(frame, RAM_SLOTS[1], "goblin");
  const y = Math.max(WATER_Y + 0.08, RAM_Y + sinkY);
  const floated = splashFrame(RAM_SLOTS[1], "goblin");
  const z = Z + 0.3 + (frame >= floated ? drift(frame, floated + 20) : 0);
  const pitch = frame >= CHARGE_GO ? 0.25 * clamp01((frame - fallFrame(RAM_SLOTS[0])) / 6) * (1 - clamp01((frame - floated) / 10)) : 0;
  return { position: [tip, y + 0.03 * Math.sin(frame * 0.1) * (frame >= floated ? 1 : 0), z], pitch };
};

// ---------------------------------------------------------------------------
// The ladder crew (L4-L5): carry ladders in, lay them across, climb, get
// pushed off; then wade across and hide at the foot of the wall.
// ---------------------------------------------------------------------------
const ladderLag = (i: number) => i * LADDER_LAG * 0.5;
const ladderFootX = (frame: number, i: number) =>
  Math.max(LADDER_FOOT, 15 - 0.45 - LADDER_WALK * (frame - LADDER_IN - ladderLag(i)));

const ladderActor = (frame: number, i: number): Actor | null => {
  const lag = ladderLag(i);
  if (frame < LADDER_IN + lag) return null;
  const z = LADDER_ZS[i];
  const landed = ladderLanded(i);
  const landX = ladderPoint(landed, i, CLIMB_TOP)[0];
  if (frame < LAY[0] + lag) return { pose: "walk", expression: "smug", position: [ladderFootX(frame, i) + 0.45, 0, z], yaw: FACE_LEFT, weapon: "none" };
  if (frame < CLIMB[0] + lag) return { pose: frame < LAY[1] + lag ? "cast" : "idle", expression: "smug", position: [LADDER_CARRY_X, 0, z], yaw: FACE_LEFT, weapon: "none" };
  if (frame < pushAt(i)) {
    const s = lerp(0.35, CLIMB_TOP, progress(frame, [CLIMB[0] + lag, CLIMB[1] + lag]));
    const climbing = frame < CLIMB[1] + lag;
    return { pose: climbing ? "walk" : "idle", expression: climbing ? "focus" : frame >= BEATS.hide ? "happy" : "smug", position: ladderPoint(frame, i, s, 0.12), yaw: FACE_LEFT, weapon: "none", speed: 1.3 };
  }
  if (frame < landed) {
    const tilt = Math.max(-1.5, Math.min(0, ladderAngle(frame, i) - LADDER_LEAN));
    return { pose: frame < pushAt(i) + 10 ? "cower" : "fall", expression: "shock", position: ladderPoint(frame, i, CLIMB_TOP, 0.12), yaw: FACE_LEFT, tilt: -tilt, pivot: 0.7, weapon: "none" };
  }
  if (frame < GETUP + i * 4) return lying({ classType: "goblin", x: landX, z, frame, since: landed, facing: "right", expression: "dazed" });
  // Get up, jog to the moat, wade across, hide at the wall foot.
  const hideZ = HIDE_ZS[i];
  if (frame < WADE[0]) {
    const t = progress(frame, [GETUP + i * 4 + 10, WADE[0]]);
    return { pose: t > 0 ? "run" : "idle", expression: "focus", position: [lerp(landX, MOAT_X1 + 0.1, t), 0, z], yaw: FACE_LEFT, speed: 1.8, weapon: "none" };
  }
  if (frame < BEATS.foot) {
    const t = progress(frame, [WADE[0], WADE[1]]);
    const x = frame < WADE[1] ? lerp(MOAT_X1 + 0.1, MOAT_X0 - 0.1, t) : lerp(MOAT_X0 - 0.1, HIDE_X, progress(frame, [WADE[1], BEATS.foot]));
    const down = progress(frame, [WADE[0], WADE[0] + 6]);
    const up = progress(frame, [WADE[1] - 6, WADE[1]]);
    const y = -0.95 * (down - up);
    return { pose: "walk", expression: "focus", position: [x, y, lerp(z, hideZ, t)], yaw: FACE_LEFT, speed: 0.8, weapon: "none" };
  }
  const hide: Vec3 = [HIDE_X, 0, hideZ];
  if (i === 0) {
    if (frame >= TOPPLE[1]) return floating("goblin", TOPPLE_X, hideZ, frame, TOPPLE[1]);
    if (frame >= TOPPLE[0]) {
      const t = progress(frame, TOPPLE);
      return { pose: "fall", expression: "dazed", position: [lerp(HIDE_X, TOPPLE_X, t), lerp(0, floatDepth("goblin"), t * t) + arc(t, 0.5), hideZ], yaw: FACE_RIGHT, tilt: -1.2 * t, pivot: 0.7, weapon: "none" };
    }
    if (frame >= BEATS.hiding) return { pose: "idle", expression: "dazed", position: hide, yaw: FACE_CAMERA + 0.5, weapon: "none" };
  } else {
    if (frame >= JUMP5[1]) return floating("goblin", JUMP5_X, hideZ, frame, JUMP5[1], "scared");
    if (frame >= JUMP5[0]) {
      const t = progress(frame, JUMP5);
      return { pose: "jump", expression: "scared", position: [lerp(HIDE_X, JUMP5_X, t), lerp(0, floatDepth("goblin"), t * t) + arc(t, 1.0), hideZ], yaw: FACE_RIGHT, weapon: "none" };
    }
    if (frame >= BEATS.hiding) return { pose: "cower", expression: "scared", position: hide, yaw: FACE_CAMERA + 0.6, weapon: "none" };
  }
  if (frame >= BEATS.see) return { pose: "cower", expression: "shock", position: hide, yaw: FACE_CAMERA + 0.3, weapon: "none" };
  return { pose: "cower", expression: "smug", position: hide, yaw: FACE_CAMERA + 0.6, weapon: "none" };
};

const ladderState = (frame: number, i: number): { position: Vec3; angle: number } | null => {
  if (frame < LADDER_IN + ladderLag(i)) return null;
  const x = frame < LAY[0] + ladderLag(i) ? ladderFootX(frame, i) : LADDER_FOOT;
  return { position: [x, 0, LADDER_ZS[i] + (frame < LAY[0] + ladderLag(i) ? 0.38 : 0)], angle: ladderAngle(frame, i) };
};

/** The rock dad drops from the tower onto the hider's head, then bounces onto the berm. */
const rockState = (frame: number): Vec3 | null => {
  if (frame < THROW[0] - 14) return null;
  const hand = dadHand();
  if (frame < THROW[0]) return hand;
  const head: Vec3 = [HIDE_X, GOB_H * 0.8, HIDE_ZS[0]];
  if (frame < THROW[1]) {
    const t = progress(frame, THROW);
    return bezier3(hand, [hand[0] + 0.4, hand[1] + 1.2, hand[2] + 1.0], [head[0] + 0.3, head[1] + 2.2, head[2] - 0.6], head, t * t);
  }
  const t = progress(frame, [THROW[1], THROW[1] + 12]);
  return [lerp(head[0], WALL_OUT + 0.5, t), lerp(head[1], 0.2, t) + arc(t, 0.6), lerp(head[2], HIDE_ZS[0] + 0.6, t)];
};

// ---------------------------------------------------------------------------
// The gate crew (L6): march on the gate, charge as the drawbridge lifts.
// ---------------------------------------------------------------------------
const GATE_CREW: { cls: AdventurerClass; dx: number; dz: number }[] = [
  { cls: "barbarian", dx: 0, dz: 0.55 },
  { cls: "goblin", dx: 0.9, dz: -0.6 },
];
const gateFall = (dx: number) => GATE_CHARGE + (GATE_CREW_STOP + dx - MOAT_X1) / GATE_RUN;
const gateCrewActor = (frame: number, k: number): Actor | null => {
  if (frame < GATE_CREW_IN) return null;
  const { cls, dx, dz } = GATE_CREW[k];
  const x0 = gateCrewX(frame) + dx;
  const z = GATE_Z + dz;
  const fe = gateFall(dx);
  const bottom = floatDepth(cls);
  const landAt = fe + Math.sqrt((2 * -bottom) / 0.055);
  const x = Math.max(MOAT_X1 - 1.3 + dx * 0.4, x0);
  if (frame >= landAt) return { ...floating(cls, x, z, frame, landAt, frame < landAt + 30 ? "shock" : "dazed"), position: [x, bottom + 0.04 * Math.sin(frame * 0.12 + k), z] };
  if (frame >= fe) return { pose: "fall", expression: "shock", position: [x, -0.5 * 0.055 * (frame - fe) ** 2, z], yaw: FACE_LEFT };
  if (frame >= GATE_CHARGE) return { pose: "run", expression: "yell", position: [x, 0, z], yaw: FACE_LEFT, speed: 2.6 };
  const stopped = x0 <= GATE_CREW_STOP + dx + 1e-3;
  if (stopped && k === 0 && frame >= BEATS.gate - 6) return { pose: "point", expression: "smug", position: [x, 0, z], yaw: FACE_LEFT + 0.5 };
  return { pose: stopped ? "idle" : "walk", expression: "smug", position: [x, 0, z], yaw: FACE_LEFT, speed: 1 };
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const s0 = sheep0(frame);
  const ram = ramState(frame);
  const rock = rockState(frame);
  const ladderTops = [0, 1].map((i) => ladderPoint(LAY[1] + ladderLag(i), i, LADDER_LEN, 0));
  return (
    <>
      <Valley frame={frame} />
      <Pile frame={frame} />
      <Wall frame={frame} />

      {s0 ? <Sheep position={s0.position} frame={frame} seed={0} tilt={s0.tilt} kick={s0.kick} yaw={0} /> : null}
      {SHEEP.slice(1).map(([x, z], k) => (
        <Sheep key={k} position={[x, 0, z]} yaw={0.6 + k * 1.3} frame={frame} seed={k + 1} />
      ))}
      {ram ? <Ram position={ram.position} pitch={ram.pitch} /> : null}
      {[0, 1].map((i) => {
        const l = ladderState(frame, i);
        return l ? <Ladder key={i} position={l.position} angle={l.angle} /> : null;
      })}
      {rock ? <Rock position={rock} spin={frame * 0.3} /> : null}

      <ActorView classType="dad" actor={dadActor} frame={frame} />
      <ActorView classType="mom" actor={momActor} frame={frame} />
      <ActorView classType="goblin" actor={thiefActor} frame={frame} weapon="none" />
      {RAM_CREW.map((c, k) => (
        <ActorView key={`ram${k}`} classType={c.cls} actor={(f) => ramCrewActor(f, k)} frame={frame} />
      ))}
      {[0, 1].map((i) => (
        <ActorView key={`lad${i}`} classType="goblin" actor={(f) => ladderActor(f, i)} frame={frame} />
      ))}
      {GATE_CREW.map((c, k) => (
        <ActorView key={`gate${k}`} classType={c.cls} actor={(f) => gateCrewActor(f, k)} frame={frame} />
      ))}

      {/* L1: stones thud into the pile; the thief lands either side of it */}
      {dust(PILE_UP[0] + 14, [0, 0.2, Z], "pile-a", 1.2)}
      {dust(PILE_UP[1] - 6, [0, 0.2, Z - 2], "pile-b", 1.2)}
      {dust(THIEF_HOP[1], [-THIEF_EDGE, 0.05, Z], "thief-in", 0.6)}
      {dust(THIEF_HOP2[1], [THIEF_EDGE, 0.05, Z], "thief-out", 0.6)}

      {/* L2: the wall goes up; mortar; the slide; the smash */}
      {dust(WALL_BUILD[0] + 12, [0, 0.2, Z + 0.4], "wall-a", 1.6)}
      {dust(WALL_BUILD[1], [0, WALL_H, Z + 0.4], "wall-b", 1.2)}
      {magic(BEATS.mortar, [WALL_OUT + 0.05, 1.6, Z], "mortar-a", "#ffffff", 30)}
      {magic(BEATS.mortar + 4, [WALL_IN - 0.05, 2.4, Z - 2.5], "mortar-b", "#ffffff", 30)}
      {dust(CLIMB_SLIDE[1], [WALL_OUT + 1.0, 0.05, CLIMBER_Z], "climber", 0.7)}
      {dust(BEATS.smash, [WALL_OUT, 1.2, Z], "smash-dust", 2.2)}
      {sparks(BEATS.smash, [WALL_OUT + 0.05, 1.0, Z + 0.3], "smash-sparks")}
      {dust(PATCH[1], [WALL_IN - 0.1, 1.2, Z], "patch", 1.4)}

      {/* L3: the dig and the flood; the charge into the water */}
      {dust(DIG[0] + 6, [(MOAT_X0 + MOAT_X1) / 2, -0.2, Z + 0.8], "dig-a", 2)}
      {dust(DIG[1] - 6, [(MOAT_X0 + MOAT_X1) / 2, -0.8, Z - 1.5], "dig-b", 2)}
      {splash(FLOOD[0] + 6, [(MOAT_X0 + MOAT_X1) / 2, -1.0, Z + 0.8], "flood", 1.2)}
      {RAM_CREW.map((c) => splash(splashFrame(RAM_SLOTS[c.slot], c.cls), [Math.min(MOAT_X1 - 0.4, ramTip(splashFrame(RAM_SLOTS[c.slot], c.cls)) + RAM_SLOTS[c.slot]), WATER_Y, Z], `ram-${c.slot}`, c.cls === "barbarian" ? 1.5 : 1))}

      {/* L4: ladders clatter onto the wall, battlements pop up, climbers hit the grass */}
      {[0, 1].map((i) => dust(LAY[1] + ladderLag(i), ladderTops[i], `lay-${i}`, 0.6))}
      {dust(MERLONS_UP[0] + 6, [WALL_OUT, WALL_H + 0.3, Z + 0.6], "merlons", 1.2)}
      {[0, 1].map((i) => dust(ladderLanded(i), [ladderPoint(ladderLanded(i), i, CLIMB_TOP)[0], 0.05, LADDER_ZS[i]], `land-${i}`, 1.2))}

      {/* L5: wade, towers, the rock */}
      {splash(WADE[0] + 2, [MOAT_X1 - 0.2, WATER_Y, Z], "wade", 0.7)}
      {TOWER_ZS.map((z, i) => dust(TOWER_RISE[0] + i * 14 + 4, [2.2, 0.1, z + 1.6], `tower-${i}`, 2.5))}
      {sparks(BEATS.hiding, [HIDE_X, GOB_H * 0.8 + 0.2, HIDE_ZS[0]], "bonk", "#ffffff", 24)}
      {splash(TOPPLE[1], [TOPPLE_X, WATER_Y, HIDE_ZS[0]], "topple")}
      {splash(JUMP5[1], [JUMP5_X, WATER_Y, HIDE_ZS[1]], "jump5")}

      {/* L6: chains, the drawbridge slams up, the gate crew splashes, the portcullis drops */}
      {sparks(CHAINS_IN[1], [WALL_OUT + 0.2, WALL_H + 0.6, GATE_Z], "chains")}
      {dust(LIFT[1], [WALL_OUT + 0.4, 2.0, GATE_Z], "lifted", 1.6)}
      {GATE_CREW.map((c, k) => splash(gateFall(c.dx) + Math.sqrt((2 * -floatDepth(c.cls)) / 0.055), [MOAT_X1 - 1.0, WATER_Y, GATE_Z + c.dz], `gate-${k}`, c.cls === "barbarian" ? 1.5 : 1))}
      {sparks(PORTCULLIS_DROP[1], [WALL_IN + 0.38, 0.1, GATE_Z], "portcullis")}
      {dust(PORTCULLIS_DROP[1], [WALL_IN + 0.2, 0.1, GATE_Z], "portcullis-dust", 1.2)}
    </>
  );
};
