import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit/motion";
import { CHAR_SCALE } from "../../kit";
import { CLASS_SCALE, RIG, type AdventurerClass } from "../../artifacts/characters/hero";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress };

// ---------------------------------------------------------------------------
// Geometry. A sunny valley seen side-on: the village (inside) is to the left
// (-x), the raiders' field (outside) to the right (+x). The wall runs along z,
// away from the camera, and is cut off at WALL_Z1 like a diorama so its cross
// section (courses, moat, battlements) reads in profile. Action plane z = Z.
// ---------------------------------------------------------------------------

export const Z = 0.4;
/** Inner and outer faces of the wall; the walkway is its top. */
export const WALL_IN = -0.75;
export const WALL_OUT = 0.75;
export const COURSE = 0.45;
export const COURSES = 8;
export const WALL_H = COURSE * COURSES;
export const WALL_Z0 = -22;
export const WALL_Z1 = 1.8;
/** The ground slab ends a little in front of the wall (its cut face shows the moat). */
export const GROUND_Z1 = 2.6;

/** Level one: a mound of loose stones along the wall line. */
export const PILE_H = 1.1;
export const PILE_W = 2.6;

/** The moat: a berm between wall and water, then the trench. */
export const MOAT_X0 = 1.7;
export const MOAT_X1 = 4.7;
export const MOAT_FLOOR = -1.5;
export const WATER_Y = -0.55;

/** The gate: a passage through the wall under a taller gatehouse. */
export const GATE_Z = -10;
export const GATE_HALF = 1.1;
export const GATE_H = COURSE * 5;
export const GATEHOUSE_TOP = WALL_H + 1.4;

/** Battlements: merlons along the outer edge, crenels (gaps) where the ladders land. */
export const MERLON_PERIOD = 1.2;
export const MERLON_LEN = 0.7;
export const MERLON_H = 0.75;
export const MERLON_T = 0.32;
export const merlonZs = (() => {
  const out: number[] = [];
  for (let z = Z + MERLON_PERIOD / 2; z > WALL_Z0 + 0.4; z -= MERLON_PERIOD) out.push(z);
  return out;
})();

/** Flanking towers (level five): they stick out past the outer face. */
export const TOWER_ZS = [-4.6, -16] as const;
export const TOWER_X = 0.7;
export const TOWER_R = 1.45;
export const TOWER_TOP = WALL_H + 1.8;

/** Ladders lean from the far bank onto the walkway edge. */
export const LADDER_FOOT = MOAT_X1 + 0.35;
export const LADDER_LEN = Math.hypot(LADDER_FOOT - WALL_OUT - 0.05, WALL_H);
export const LADDER_LEAN = Math.PI - Math.atan2(WALL_H, LADDER_FOOT - WALL_OUT - 0.05);
export const LADDER_ZS = [Z, Z - 2 * MERLON_PERIOD] as const;

/** Sheep grazing in the village; sheep 0 gets stolen. */
export const SHEEP = [
  [-2.5, Z],
  [-4.4, -0.9],
  [-3.4, -2.6],
  [-5.6, 0.7],
  [-6.6, -2.2],
] as const;

/** Height of a character (feet to crown) and of its shoulders. */
export const heightOf = (c: AdventurerClass) => RIG.height * CHAR_SCALE * CLASS_SCALE[c];
export const shoulderOf = (c: AdventurerClass) => RIG.shoulderY * CHAR_SCALE * CLASS_SCALE[c];

// ---------------------------------------------------------------------------
// Beats, all from the voice.
// ---------------------------------------------------------------------------

export const BEATS = {
  // L1: sheep stolen, a ring of stones, the raiders scramble over it
  stealing: w("l1a", "stealing"),
  sheep: w("l1a", "sheep"),
  pile: w("l1a", "pile"),
  stones: w("l1a", "stones"),
  village: w("l1a", "village"),
  climb1: w("l1b", "climb"),
  raiders1: w("l1b", "raiders"),
  scramble: w("l1b", "scramble"),
  over: w("l1b", "over"),
  // L2: a tall straight wall; the battering ram
  stack: w("l2a", "stack"),
  tall: w("l2a", "tall"),
  wall2: w("l2a", "wall"),
  mortar: w("l2a", "mortar"),
  together: w("l2a", "together"),
  climb2: w("l2b", "climb"),
  bring: w("l2b", "bring"),
  ram: w("l2b", "ram"),
  smash: w("l2b", "smash"),
  hole: w("l2b", "hole"),
  through: w("l2b", "through"),
  // L3: patch and moat; the ram can't reach, the raiders charge into the water
  patch: w("l3a", "patch"),
  dig: w("l3a", "dig"),
  moat: w("l3a", "moat"),
  ram3: w("l3b", "ram"),
  reach: w("l3b", "reach"),
  wall3: w("l3b", "wall"),
  charge: w("l3b", "charge"),
  water: w("l3b", "water"),
  // L4: ladders; battlements; push them off
  ladders: w("l4a", "ladders"),
  lay: w("l4a", "lay"),
  across: w("l4a", "across"),
  climb4: w("l4a", "climb"),
  battlements: w("l4b", "battlements"),
  top: w("l4b", "top"),
  teeth: w("l4b", "teeth"),
  hide: w("l4b", "hide"),
  push: w("l4b", "push"),
  off: w("l4b", "off"),
  // L5: wade across, hide at the foot; towers, see along it, drop rocks
  wade: w("l5a", "wade"),
  foot: w("l5a", "foot"),
  cantSee: w("l5a", "see"),
  towers: w("l5b", "towers"),
  stick: w("l5b", "stick"),
  see: w("l5b", "see"),
  along: w("l5b", "along"),
  drop: w("l5b", "drop"),
  rocks: w("l5b", "rocks"),
  hiding: w("l5b", "hiding"),
  there: w("l5b", "there"),
  // L6: the wooden gate; drawbridge and portcullis
  weak: w("l6a", "weak"),
  gate: w("l6a", "gate"),
  drawbridge: w("l6b", "drawbridge"),
  lifts: w("l6b", "lifts"),
  reach6: w("l6b", "reach"),
  portcullis: w("l6b", "portcullis"),
  congrats: w("end", "congratulations"),
  castle: w("end", "castle"),
};

// ---------------------------------------------------------------------------
// L1: the stone pile, and the sheep thief.
// ---------------------------------------------------------------------------

export const PILE_UP = [BEATS.pile - 4, BEATS.village + 8] as const;

export const THIEF_JOG = 0.15;
/** Hops over the pile on "scramble ... over", grabs sheep 0, hops back with it. */
export const THIEF_HOP = [BEATS.scramble - 8, BEATS.over + 2] as const;
export const THIEF_GRAB = [THIEF_HOP[1] + 2, THIEF_HOP[1] + 14] as const;
export const THIEF_HOP2 = [THIEF_GRAB[1] + 4, THIEF_GRAB[1] + 30] as const;
export const THIEF_EDGE = PILE_W / 2 + 0.4;
export const THIEF_GRAB_X = SHEEP[0][0] + 0.55;
export const THIEF_START_X = 9.5;
export const THIEF_IN = THIEF_HOP[0] - (THIEF_START_X - THIEF_EDGE) / THIEF_JOG;
export const THIEF_OUT_SPEED = 0.17;
export const thiefX = (f: number) => {
  if (f < THIEF_HOP[0]) return THIEF_EDGE + THIEF_JOG * (THIEF_HOP[0] - f);
  if (f < THIEF_HOP[1]) return lerp(THIEF_EDGE, -THIEF_EDGE, progress(f, THIEF_HOP));
  if (f < THIEF_HOP2[0]) return lerp(-THIEF_EDGE, THIEF_GRAB_X, easeInOut(progress(f, [THIEF_HOP[1], THIEF_GRAB[0]])));
  if (f < THIEF_HOP2[1]) return lerp(THIEF_GRAB_X, THIEF_EDGE, progress(f, THIEF_HOP2));
  return THIEF_EDGE + THIEF_OUT_SPEED * (f - THIEF_HOP2[1]);
};
export const thiefY = (f: number) => {
  if (f >= THIEF_HOP[0] && f < THIEF_HOP[1]) return arc(progress(f, THIEF_HOP), PILE_H + 0.5);
  if (f >= THIEF_HOP2[0] && f < THIEF_HOP2[1]) return arc(progress(f, THIEF_HOP2), PILE_H + 0.5);
  return 0;
};

// ---------------------------------------------------------------------------
// L2: courses rise into the wall; a climber slides off; the ram smashes a hole.
// ---------------------------------------------------------------------------

export const WALL_BUILD = [BEATS.stack - 4, BEATS.wall2 + 6] as const;
const COURSE_DROP = 12;
/** 0..1 drop-in of course i (bottom first). */
export const courseIn = (f: number, i: number) => {
  const step = (WALL_BUILD[1] - WALL_BUILD[0] - COURSE_DROP) / (COURSES - 1);
  const a = WALL_BUILD[0] + i * step;
  return progress(f, [a, a + COURSE_DROP]);
};
export const PILE_SINK = [BEATS.stack - 4, BEATS.wall2] as const;

/** The thief comes back for more and slides down the new wall. */
export const CLIMBER_Z = Z - 1.2;
export const CLIMB_JUMP = [BEATS.climb2 - 10, BEATS.climb2 + 2] as const;
export const CLIMB_SLIDE = [CLIMB_JUMP[1], CLIMB_JUMP[1] + 14] as const;
export const CLIMBER_X = WALL_OUT + 0.45;
export const CLIMBER_IN = CLIMB_JUMP[0] - (9 - CLIMBER_X) / THIEF_JOG;
export const CLIMBER_RUN = CLIMB_SLIDE[1] + 14;

/** Battering ram: tip position along x; carriers walk behind it. */
export const RAM_LEN = 3.2;
export const RAM_SPEED = 0.15;
export const RAM_START_X = 15;
export const RAM_IN = BEATS.smash - (RAM_START_X - WALL_OUT) / RAM_SPEED;
export const RECOIL = [BEATS.smash, BEATS.smash + 8] as const;
export const RETREAT = [lineEnd("l2b") + 8, BEATS.dig - 4] as const;
export const BANK_TIP = MOAT_X1 + 0.6;
export const TEETER = [lineStart("l3b"), BEATS.reach + 6] as const;
export const TEETER_TIP = MOAT_X1 - 0.55;
export const BACK_UP = [BEATS.wall3, BEATS.water - 30] as const;
export const BACK_TIP = 7.6;
export const CHARGE_GO = BEATS.water - 27;
export const CHARGE_SPEED = 0.19;
export const FLOAT_TIP = 2.0;
export const ramTip = (f: number) => {
  if (f < BEATS.smash) return WALL_OUT + RAM_SPEED * (BEATS.smash - f);
  if (f < RETREAT[0]) return WALL_OUT + 0.5 * easeOutCubic(progress(f, RECOIL));
  if (f < TEETER[0]) return lerp(WALL_OUT + 0.5, BANK_TIP, easeInOut(progress(f, RETREAT)));
  if (f < BACK_UP[0]) return lerp(BANK_TIP, TEETER_TIP, easeInOut(progress(f, TEETER)));
  if (f < CHARGE_GO) return lerp(TEETER_TIP, BACK_TIP, easeInOut(progress(f, BACK_UP)));
  return Math.max(FLOAT_TIP, BACK_TIP - CHARGE_SPEED * (f - CHARGE_GO));
};
/** Carrier slots behind the tip (front goblin, middle goblin, barbarian at the back). */
export const RAM_SLOTS = [0.75, 1.6, 2.55] as const;

/** Falling into water: the frame a body at offset `off` from the tip passes the bank edge. */
export const fallFrame = (off: number) => CHARGE_GO + (BACK_TIP + off - MOAT_X1) / CHARGE_SPEED;
const G = 0.055;
/** Height of a ram carrier's feet; they drop into the moat and float there. */
export const floatDepth = (c: AdventurerClass) => WATER_Y - heightOf(c) * 0.62;
export const carrierY = (f: number, off: number, c: AdventurerClass) => {
  const fe = fallFrame(off);
  if (f < fe) return 0;
  const bottom = floatDepth(c);
  const y = -0.5 * G * (f - fe) ** 2;
  return y > bottom ? y : bottom + 0.04 * Math.sin((f - fe) * 0.12 + off * 3);
};
export const splashFrame = (off: number, c: AdventurerClass) => fallFrame(off) + Math.sqrt((2 * -floatDepth(c)) / G);
/** Bodies in the moat drift slowly away from the camera, then stop. */
export const drift = (f: number, since: number, max = 2.4) => -Math.min(max, Math.max(0, f - since) * 0.012);

/** The hole: open from the smash until the patch. */
export const PATCH = [BEATS.patch - 4, BEATS.patch + 10] as const;
export const HOLE_Z = [Z - 0.9, WALL_Z1] as const;
export const HOLE_Y = [COURSE, COURSE * 4] as const;

// ---------------------------------------------------------------------------
// L3: the moat is dug and flooded.
// ---------------------------------------------------------------------------

export const DIG = [BEATS.dig - 2, BEATS.moat + 8] as const;
export const FLOOD = [BEATS.moat + 4, lineEnd("l3a") + 8] as const;
export const moatFloor = (f: number) => lerp(0, MOAT_FLOOR, easeInOut(progress(f, DIG)));
export const waterLevel = (f: number) => lerp(MOAT_FLOOR, WATER_Y, easeOutCubic(progress(f, FLOOD)));

// ---------------------------------------------------------------------------
// L4: ladders laid across the moat, climbed, then pushed off.
// ---------------------------------------------------------------------------

export const LADDER_LAG = 8;
export const LADDER_WALK = 0.12;
export const LAY = [BEATS.lay - 2, BEATS.across + 2] as const;
export const LADDER_CARRY_X = LADDER_FOOT + 0.45;
export const LADDER_IN = LAY[0] - (15 - LADDER_CARRY_X) / LADDER_WALK;
export const CLIMB = [BEATS.climb4 - 2, BEATS.battlements] as const;
export const CLIMB_TOP = LADDER_LEN - 1.25;
export const PUSH_TIP = 12;
export const PUSH_FALL = 14;
export const pushAt = (i: number) => BEATS.push + i * LADDER_LAG;
/** Angle of ladder i from +x (lean = leaning on the wall, 0 = flat on the field). */
export const ladderAngle = (f: number, i: number) => {
  const lag = i * LADDER_LAG * 0.5;
  if (f < LAY[0] + lag) return Math.PI / 2;
  if (f < pushAt(i)) {
    const t = progress(f, [LAY[0] + lag, LAY[1] + lag]);
    return lerp(Math.PI / 2, LADDER_LEAN, t * t) + (t >= 1 ? 0.03 * Math.sin((f - LAY[1] - lag) * 1.1) * Math.exp(-(f - LAY[1] - lag) / 4) : 0);
  }
  const p = pushAt(i);
  if (f < p + PUSH_TIP) return lerp(LADDER_LEAN, Math.PI / 2, easeInOut(progress(f, [p, p + PUSH_TIP])));
  const t = progress(f, [p + PUSH_TIP, p + PUSH_TIP + PUSH_FALL]);
  return lerp(Math.PI / 2, 0, t * t);
};
export const ladderLanded = (i: number) => pushAt(i) + PUSH_TIP + PUSH_FALL;
/** A point s along ladder i (from its foot), lifted off the rails by `up`. */
export const ladderPoint = (f: number, i: number, s: number, up = 0.1): [number, number, number] => {
  const a = ladderAngle(f, i);
  const d = [Math.cos(a), Math.sin(a)];
  const n = [Math.sin(a), -Math.cos(a)];
  const flip = a > Math.PI / 2 ? 1 : -1;
  return [LADDER_FOOT + s * d[0] + n[0] * up * flip, s * d[1] + n[1] * up * flip, LADDER_ZS[i]];
};
/** Where a climber lands when the ladder hits the grass. */
export const LANDED_X = LADDER_FOOT + CLIMB_TOP + 0.4;

export const MERLONS_UP = [BEATS.battlements - 4, BEATS.top + 8] as const;
export const merlonIn = (f: number, z: number) => {
  const k = clamp01((Z + 1 - z) / (Z + 1 - WALL_Z0));
  const a = lerp(MERLONS_UP[0], MERLONS_UP[1] - 10, k);
  return progress(f, [a, a + 10]);
};

// ---------------------------------------------------------------------------
// L5: the climbers wade across and hide; towers rise; a rock is dropped.
// ---------------------------------------------------------------------------

export const GETUP = lineStart("l5a") - 26;
export const WADE = [BEATS.wade - 2, BEATS.foot - 12] as const;
export const HIDE_X = WALL_OUT + 0.38;
export const HIDE_ZS = [Z, Z - 1.1] as const;
export const DAD_TO_TOWER = [lineEnd("l5a") + 4, BEATS.towers - 6] as const;
export const TOWER_RISE = [BEATS.towers - 4, BEATS.stick + 6] as const;
export const TOWER_LAG = 14;
export const towerRise = (f: number, i: number) =>
  easeOutBack(progress(f, [TOWER_RISE[0] + i * TOWER_LAG, TOWER_RISE[1] + i * TOWER_LAG]), 1.25);
export const DAD_TOWER_SPOT = [TOWER_X + 0.75, TOWER_ZS[0] + 0.75] as const;
export const DAD_ON_TOWER = [BEATS.stick + 8, BEATS.see - 8] as const;
export const THROW = [BEATS.drop, BEATS.hiding] as const;
export const TOPPLE = [BEATS.hiding + 2, BEATS.hiding + 16] as const;
export const TOPPLE_X = MOAT_X0 + 0.9;
export const JUMP5 = [BEATS.there - 2, BEATS.there + 12] as const;
export const JUMP5_X = MOAT_X0 + 1.6;

// ---------------------------------------------------------------------------
// L6: the gate crew; the drawbridge lifts, the portcullis drops.
// ---------------------------------------------------------------------------

export const GATE_CREW_STOP = 6.9;
export const GATE_WALK = 0.12;
export const GATE_CREW_START_X = 14;
/** They arrive at the bank, opposite the gate, on "gate". */
export const GATE_CREW_IN = BEATS.gate - (GATE_CREW_START_X - GATE_CREW_STOP) / GATE_WALK;
export const LIFT = [BEATS.lifts - 6, BEATS.lifts + 10] as const;
export const GATE_EDGE_AT = LIFT[1] + 2;
export const GATE_RUN = 0.2;
export const GATE_CHARGE = GATE_EDGE_AT - (GATE_CREW_STOP - MOAT_X1) / GATE_RUN;
export const CHAINS_IN = [BEATS.drawbridge - 4, BEATS.drawbridge + 10] as const;
export const bridgeLift = (f: number) => easeInOut(progress(f, LIFT));
export const PORTCULLIS_DROP = [BEATS.portcullis - 2, BEATS.portcullis + 6] as const;
export const portcullisY = (f: number) => {
  const t = progress(f, PORTCULLIS_DROP);
  return GATE_H * (1 - t * t) + (t >= 1 ? 0.08 * Math.abs(Math.sin((f - PORTCULLIS_DROP[1]) * 0.8)) * Math.exp(-(f - PORTCULLIS_DROP[1]) / 4) : 0);
};
export const gateCrewX = (f: number) => {
  if (f < GATE_CHARGE) return Math.max(GATE_CREW_STOP, GATE_CREW_START_X - GATE_WALK * (f - GATE_CREW_IN));
  return GATE_CREW_STOP - GATE_RUN * (f - GATE_CHARGE);
};
