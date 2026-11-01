import { random } from "remotion";
import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit/motion";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress };

// ---------------------------------------------------------------------------
// Geometry. A clean low-poly cutaway house seen from the front (+z): bedroom
// (-x, walk-in closet on the outside wall) | bathroom safe room (centre) |
// living room (+x, the window). Floor tops at y = 0, the lawn at LAWN_Y.
// The action plane is Z; doorways in the partitions straddle it.
// ---------------------------------------------------------------------------

export const Z = 0.6;
export const WALL_Z = -3.1;
export const WALL_H = 3.2;
export const HALF = 6.35;
export const FRONT_Z = 2.85;
/** Partitions between the rooms; the safe room is everything between them. */
export const PART_X = 2.1;
export const BED_X = -4.2;
export const LIVING_X = 4.2;
/** The walk-in closet: a nook between the outside wall and CLOSET_X. */
export const CLOSET_X = -4.6;
/** Doorways (closet and the safe-room door, both in walls along z). */
export const DOOR_Z0 = 0.0;
export const DOOR_Z1 = 1.2;
export const DOOR_H = 2.25;
export const EAVE_Y = WALL_H + 0.24;
export const ROOF_H = 2.5;
export const LAWN_Y = -0.5;
/** The living-room window in the back wall. */
export const WIN_X = 3.6;
export const WIN_Y0 = 1.1;
export const WIN_Y1 = 2.5;
/** Lining layers on the safe-room walls: plywood, plywood, steel. */
export const LAYER_T = [0.07, 0.07, 0.05] as const;
/** The crash-test lab, far off to the side of the house (its own set). */
export const LAB_X = 40;
/** The lab floor sits up on its own plinth, clear of the rolling lawn. */
export const LAB_Y = 3;
export const SIREN_X = 9.5;
export const HEDGE_X = -10.4;

/** The family: dad leads, mom, then the kid. Each keeps a lane in z. */
export type Member = "dad" | "mom" | "kid";
export const FAMILY: Member[] = ["dad", "mom", "kid"];
export const LANE: Record<Member, number> = { dad: Z - 0.25, mom: Z + 0.15, kid: Z + 0.45 };

// ---------------------------------------------------------------------------
// Beats, all from the voice.
// ---------------------------------------------------------------------------

export const BEATS = {
  // L1: siren, hide in the closet; the outside wall tears away with them
  siren: w("l1a", "siren"),
  hide: w("l1a", "hide"),
  closet: w("l1a", "closet"),
  outside: w("l1b", "outside"),
  wall1: w("l1b", "wall"),
  tears: w("l1b", "tears"),
  away: w("l1b", "away"),
  go: w("l1b", "go"),
  it: w("l1b", "it"),
  // L2: the middle room; a board through the drywall
  pick: w("l2a", "pick"),
  middle: w("l2a", "middle"),
  lowest: w("l2a", "lowest"),
  windows: w("l2a", "windows"),
  stay: w("l2b", "stay"),
  board: w("l2b", "board"),
  flies: w("l2b", "flies"),
  through: w("l2b", "through"),
  spear: w("l2b", "spear"),
  // L3: debris; plywood, plywood, steel; the cannon test
  injuries: w("l3a", "injuries"),
  debris: w("l3a", "debris"),
  wind3: w("l3a", "wind"),
  line: w("l3b", "line"),
  two: w("l3b", "two"),
  layers: w("l3b", "layers"),
  plywood: w("l3b", "plywood"),
  steel3: w("l3b", "steel"),
  firing: w("l3c", "firing"),
  fifteen: w("l3c", "fifteen"),
  board3: w("l3c", "board"),
  hundred: w("l3c", "hundred"),
  bounces: w("l3c", "bounces"),
  // L4: the room lifts; the window myth; bolted down
  under: w("l4a", "under"),
  lifts: w("l4a", "lifts"),
  floor4: w("l4a", "floor"),
  open: w("l4b", "open"),
  window: w("l4b", "window"),
  pressure: w("l4b", "pressure"),
  dont: w("l4b", "don't"),
  lets: w("l4b", "lets"),
  wind4: w("l4b", "wind"),
  push: w("l4b", "push"),
  below: w("l4b", "below"),
  bolt: w("l4c", "bolt"),
  concrete: w("l4c", "concrete"),
  anchors: w("l4c", "anchors"),
  around: w("l4c", "around"),
  // L5: the door blows in; a steel door; vent covers
  weakest: w("l5a", "weakest"),
  door5: w("l5a", "door"),
  blows: w("l5a", "blows"),
  steelDoor: w("l5b", "steel"),
  hinges: w("l5b", "hinges"),
  locks3: w("l5b", "three", 1),
  locks: w("l5b", "locks"),
  vents: w("l5c", "vents"),
  covers: w("l5c", "covers"),
  fly5: w("l5c", "fly"),
  // L6: the storm passes; the house is gone; supplies
  storm6: w("l6a", "storm"),
  passes: w("l6a", "passes"),
  minute: w("l6a", "minute"),
  house6: w("l6a", "house"),
  gone: w("l6a", "gone"),
  room6: w("l6a", "room"),
  still: w("l6a", "still"),
  standing: w("l6a", "standing"),
  flashlight: w("l6b", "flashlight"),
  water: w("l6b", "water"),
  helmets: w("l6b", "helmets"),
  radio: w("l6b", "radio"),
  congrats: w("end", "congratulations"),
  shelter: w("end", "shelter"),
};

/** Hard scene resets between attempts (camera cuts hide them). */
export const L2_START = lineStart("l2a") - 6;
export const L3B_START = lineStart("l3b") - 6;
export const L4_START = lineStart("l4a") - 6;
export const L4C_START = lineStart("l4c") - 6;
export const L5_START = lineStart("l5a") - 6;
export const L6_START = lineStart("l6a") - 6;
export const LAB_ON = [lineStart("l3c") - 6, L4_START] as const;

// ---------------------------------------------------------------------------
// Storm strength 0..1 (sky, light, wind streaks): piecewise linear over beats.
// ---------------------------------------------------------------------------

const STORM_KEYS: Array<[number, number]> = [
  [0, 0.45],
  [BEATS.siren, 0.55],
  [BEATS.tears - 10, 0.9],
  [BEATS.it + 20, 0.9],
  [L2_START, 0.4],
  [lineStart("l2b"), 0.6],
  [BEATS.through, 0.9],
  [lineStart("l3a") - 6, 0.95],
  [L3B_START, 0.55],
  [L4_START, 0.8],
  [L6_START, 0.85],
  [BEATS.passes, 1],
  [BEATS.house6, 0.6],
  [BEATS.gone + 12, 0],
];
export const storm = (f: number) => {
  for (let i = 1; i < STORM_KEYS.length; i++) {
    const [a, va] = STORM_KEYS[i - 1];
    const [b, vb] = STORM_KEYS[i];
    if (f < b) return lerp(va, vb, easeInOut(progress(f, [a, b])));
  }
  return STORM_KEYS[STORM_KEYS.length - 1][1];
};

// ---------------------------------------------------------------------------
// L1: from the living room to the closet; the wall tears off, the family flies.
// ---------------------------------------------------------------------------

export const START_X: Record<Member, number> = { dad: 3.2, mom: 4.0, kid: 4.7 };
export const CLOSET_SPOT: Record<Member, number> = { dad: -5.75, mom: -5.15, kid: -5.5 };
const RUN_LAG: Record<Member, number> = { dad: 0, mom: 4, kid: 8 };
export const run1 = (m: Member) => [BEATS.siren + 12 + RUN_LAG[m], BEATS.closet + RUN_LAG[m]] as const;

/** The outside wall hinges out on "tears" and flies off; the rest of that end follows. */
export const TEAR = [BEATS.tears, BEATS.tears + 7] as const;
export const TEAR_FLY = TEAR[1];
/** The family is sucked out on "go", over the lawn, into the hedge by "it". */
export const LAUNCH = (m: Member) => [BEATS.go - 4 + RUN_LAG[m] / 2, BEATS.it + 8 + RUN_LAG[m] / 2] as const;
export const HEDGE_SPOT: Record<Member, number> = { dad: HEDGE_X + 0.6, mom: HEDGE_X + 1.6, kid: HEDGE_X - 0.4 };

// ---------------------------------------------------------------------------
// L2: into the middle room; the board.
// ---------------------------------------------------------------------------

export const BED_START: Record<Member, number> = { dad: -3.0, mom: -3.7, kid: -4.3 };
/** Where each stands in the safe room for the rest of the episode. */
export const ROOM_SPOT: Record<Member, number> = { dad: 0.45, mom: 1.4, kid: 0.95 };
export const walk2 = (m: Member) => [L2_START + 10 + RUN_LAG[m], BEATS.lowest + 4 + RUN_LAG[m]] as const;

export const BOARD_HIT = BEATS.through;
export const BOARD_Y = 1.62;
export const BOARD_Z = -0.6;
export const BOARD_LEN = 2.4;
const BOARD_SPEED = 0.75;
/** Tip of the flying board: fast in from the left, through the partition, stuck near dad's head. */
export const boardTip = (f: number) =>
  f < BOARD_HIT ? -PART_X - BOARD_SPEED * (BOARD_HIT - f) : lerp(-PART_X, ROOM_SPOT.dad - 0.45, easeOutCubic(progress(f, [BOARD_HIT, BOARD_HIT + 5])));
export const BOARD_SHOWN = [BOARD_HIT - 18, L3B_START] as const;

// ---------------------------------------------------------------------------
// L3: debris stream; lining layers drop in; the cannon test.
// ---------------------------------------------------------------------------

export const DEBRIS = [lineStart("l3a") - 8, L3B_START] as const;
/** Each lining layer drops into place (10 frames, overshoot). */
export const LAYER_IN = [BEATS.two - 2, BEATS.layers + 4, BEATS.steel3 - 4] as const;
export const layerIn = (f: number, k: number) => (f < L3B_START ? 0 : progress(f, [LAYER_IN[k], LAYER_IN[k] + 10]));

export const LOAD = [BEATS.board3 - 8, BEATS.board3 + 8] as const;
export const GAUGE = [BEATS.fifteen, BEATS.hundred + 6] as const;
export const HIT3 = BEATS.bounces - 1;
export const FIRE = HIT3 - 5;
/** Lab layout (relative to LAB_X): cannon muzzle, panel face. */
export const MUZZLE_DX = -0.9;
export const PANEL_DX = 1.2;
export const TEST_Y = 1.05;
export const TEST_LEN = 1.4;

// ---------------------------------------------------------------------------
// L4: the room lifts and hovers; the window gag; slammed down and bolted.
// ---------------------------------------------------------------------------

export const LIFT = [BEATS.lifts - 2, BEATS.lifts + 12] as const;
export const DOWN = [BEATS.bolt, BEATS.bolt + 4] as const;
export const HOVER_Y = 0.8;
/** Height of the safe-room box above its floor. */
export const roomY = (f: number) => {
  if (f < BEATS.under || f >= DOWN[1] || f < L4_START) return 0;
  const tremble = 0.015 * Math.sin(f * 2.3);
  if (f < LIFT[0]) return tremble;
  if (f < LIFT[1]) return HOVER_Y * easeOutBack(progress(f, LIFT));
  if (f < DOWN[0]) return HOVER_Y + 0.07 * Math.sin((f - LIFT[1]) * 0.25);
  return lerp(HOVER_Y, 0, progress(f, DOWN) ** 2);
};
export const WINDOW_OPEN = [BEATS.open - 2, BEATS.open + 10] as const;
export const X_SLAM = BEATS.dont;
export const ROOF_GAG = [BEATS.push - 2, BEATS.below + 8] as const;
/** Lift of the whole roof in the "push from below" gag (reset at the cut). */
export const roofGag = (f: number) => (f < ROOF_GAG[0] || f >= L4C_START ? 0 : 2.2 * easeOutBack(progress(f, ROOF_GAG)));
export const ANCHOR_N = 8;
export const anchorAt = (i: number) => Math.round(lerp(BEATS.concrete, BEATS.around + 4, i / (ANCHOR_N - 1)));

// ---------------------------------------------------------------------------
// L5: the wooden door blows in; the steel door; vent covers.
// ---------------------------------------------------------------------------

export const DOOR_CLOSE = L4_START;
export const BLOW = [BEATS.blows, BEATS.blows + 18] as const;
export const STEEL_HANG = [BEATS.steelDoor - 4, BEATS.steelDoor + 8] as const;
export const hingeAt = (k: number) => BEATS.hinges - 6 + k * 5;
export const lockAt = (k: number) => BEATS.locks3 + k * 5;
export const COVER_IN = [BEATS.covers - 4, BEATS.covers + 2] as const;
export const VENT_XS = [-1.0, 1.0] as const;
export const VENT_Y = 2.72;
export const PEBBLE_HIT = BEATS.fly5 + 2;

// ---------------------------------------------------------------------------
// L6: the funnel crosses behind the house and takes everything but the room.
// ---------------------------------------------------------------------------

export const FUNNEL6 = [BEATS.storm6 - 6, BEATS.gone + 10] as const;
export const FUNNEL_Z = -7;
const F6_X0 = 16;
const F6_X1 = -30;
export const funnelX = (f: number) => lerp(F6_X0, F6_X1, progress(f, FUNNEL6));
/** The frame the funnel reaches a piece at x (3 units early: the wind leads it). */
export const releaseAt = (x: number) => Math.round(FUNNEL6[0] + ((F6_X0 - (x + 3)) / (F6_X0 - F6_X1)) * (FUNNEL6[1] - FUNNEL6[0]));
/**
 * Before the L6 pass the funnel sits behind the house: it marches in from the
 * horizon through the opening (closest when the wall tears), then hangs back
 * for the middle attempts.
 */
export const APPROACH = [0, BEATS.tears] as const;
export const approachPos = (f: number): [number, number, number] => {
  if (f >= L2_START) return [12, LAWN_Y - 1, -50];
  // Most of the march happens in the opening shot, from a speck on the horizon.
  const seen = BEATS.siren + 8;
  if (f < seen) {
    const p = easeInOut(progress(f, [0, seen]));
    return [lerp(10, 6, p), LAWN_Y - 1, lerp(-240, -80, p)];
  }
  const p = progress(f, [seen, APPROACH[1]]);
  return [lerp(6, 5, p), LAWN_Y - 1, lerp(-80, -34, p)];
};
export const DOOR_OPEN = [BEATS.room6 - 2, BEATS.room6 + 10] as const;
export const OUT_SPOT: Record<Member, [number, number]> = { dad: [-3.3, 2.1], mom: [-2.8, 2.5], kid: [-3.8, 2.7] };
export const walkOut = (m: Member) => [DOOR_OPEN[1] + RUN_LAG[m] * 1.5, DOOR_OPEN[1] + 22 + RUN_LAG[m] * 1.5] as const;
export const SUPPLY_AT = [BEATS.flashlight, BEATS.water - 3, BEATS.water + 3, BEATS.helmets, BEATS.helmets + 4, BEATS.helmets + 8, BEATS.radio] as const;

// ---------------------------------------------------------------------------
// Things torn off by wind: offset and spin from the moment of release.
// ---------------------------------------------------------------------------

export interface FlyState {
  d: [number, number, number];
  r: [number, number, number];
  visible: boolean;
}
const REST: FlyState = { d: [0, 0, 0], r: [0, 0, 0], visible: true };

/**
 * Pose of a piece of the house that the wind rips off at `rel` (gone after
 * about 70 frames). `back` (optional) puts it back at rest, for the attempt
 * reset after L1. Wind blows toward -x and up.
 */
export const flyOff = (f: number, flights: Array<[number, number?]>, seed: string, power = 1): FlyState => {
  for (const [rel, back] of flights) {
    if (f < rel || (back !== undefined && f >= back)) continue;
    const t = f - rel;
    if (t > 75) return { ...REST, visible: false };
    const vx = -(0.25 + 0.25 * random(`${seed}-vx`)) * power;
    const vy = (0.06 + 0.08 * random(`${seed}-vy`)) * power;
    const sp = (random(`${seed}-s`) - 0.5) * 0.14 * power;
    return {
      d: [vx * t - 0.004 * t * t, vy * t + 0.0035 * t * t, (random(`${seed}-vz`) - 0.6) * 0.08 * t],
      r: [sp * t * 0.7, sp * t * 0.4, sp * t + 0.004 * t * t * Math.sign(sp || 1)],
      visible: true,
    };
  }
  return REST;
};
