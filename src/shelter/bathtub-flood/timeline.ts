import { random } from "remotion";
import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit/motion";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress };

// ---------------------------------------------------------------------------
// Geometry. Three sets side by side on x, each seen side-on from +z:
//  - the HOUSE (x ≈ 0): a cutaway bathroom with the tub, the hallway on the
//    left, the driveway and the car on the right;
//  - the FLOOD (x ≈ FLOOD_X): open floodwater over a drowned street, rooftops
//    poking out, a hill road rising out of the water on the right;
//  - the INSIDE of the pod (x ≈ INT_X): a dry cutaway of the hull, for the
//    shots where we need to see Dad and the kid inside it.
// The action plane is Z. Floors are at y = 0 (house) / water level (flood).
// ---------------------------------------------------------------------------

export const Z = 0.4;
export const LAWN_Y = -0.35;

// House: the bathroom spans [-ROOM_HALF, ROOM_HALF], the hallway to its left.
export const ROOM_HALF = 2.4;
export const HALL_X0 = -5.4;
export const BACK_Z = -1.9;
export const FRONT_Z = 1.7;
export const WALL_H = 3.0;
/** The bathroom door is in the left partition, around the action lane. */
export const DOOR_Z0 = -0.05;
export const DOOR_Z1 = 1.15;
export const DOOR_H = 2.2;

// The tub (and later the pod): hull bottom at the group origin, long axis on x.
export const TUB_L = 3.0;
export const TUB_W = 1.3;
export const TUB_H = 0.9;
export const TUB_WALL = 0.12;
export const TUB_FLOOR = 0.14;
export const LID_H = 0.8;
/** Where the hull floats below the waterline. */
export const DRAFT = 0.42;
export const TUB_X = 0.35;
export const TUB_Z = -0.1;
/** In the house the tub stands on little feet. */
export const TUB_FEET = 0.12;

// Driveway (right of the house) and the car.
export const PORCH_X = 3.9;
export const CAR_X = 7.4;
export const CAR_Z = -0.2;

// The flood: open water at y = 0, centred on FLOOD_X. The hill road starts at
// HILL_X0 and climbs to a plateau at HILL_TOP.
export const FLOOD_X = 60;
export const POD_X = FLOOD_X;
export const POD_Z = Z;
export const HILL_X0 = FLOOD_X + 3.6;
export const HILL_X1 = FLOOD_X + 8.6;
export const HILL_TOP = 2.2;
/** Where the slope meets the lake bed, under the water. */
export const HILL_FOOT = -0.6;
/** Ground height of the hill road at x (water is at 0). */
export const hillY = (x: number) => lerp(HILL_FOOT, HILL_TOP, progress(x, [HILL_X0, HILL_X1]));

// The inside of the pod: a dry copy of the hull far off on its own.
export const INT_X = -60;
export const INT_Y = 0;

/** Dad and the kid share every attempt. Seats along the hull. */
export type Member = "dad" | "kid";
export const CREW: Member[] = ["dad", "kid"];
export const SEAT_DX: Record<Member, number> = { dad: -0.62, kid: 0.62 };

// ---------------------------------------------------------------------------
// Beats, all from the voice.
// ---------------------------------------------------------------------------

export const BEATS = {
  // L1: hide in the tub; the water pours in under the door and fills it
  flood1: w("l1a", "flood"),
  hide: w("l1a", "hide"),
  bathtub1: w("l1a", "bathtub"),
  tornado: w("l1a", "tornado"),
  water1: w("l1b", "water"),
  pours: w("l1b", "pours"),
  door1: w("l1b", "door"),
  tub1: w("l1b", "tub"),
  fills: w("l1b", "fills"),
  it1: w("l1b", "it"),
  // L2: the car myth; the tub floats; the wave tips it
  drive: w("l2a", "drive"),
  dont: w("l2a", "don't"),
  foot: w("l2a", "foot"),
  moving: w("l2a", "moving"),
  carry: w("l2a", "carry"),
  car: w("l2a", "car"),
  pull: w("l2b", "pull"),
  free: w("l2b", "free"),
  ride: w("l2b", "ride"),
  boat2: w("l2b", "boat"),
  floats: w("l2c", "floats"),
  wave2: w("l2c", "wave"),
  tips: w("l2c", "tips"),
  over2: w("l2c", "over"),
  // L3: the lid and gasket; rolled over, stuck upside down
  seal: w("l3a", "seal"),
  lid: w("l3a", "lid"),
  gasket: w("l3a", "gasket"),
  drop: w("l3a", "drop"),
  wave3: w("l3b", "wave"),
  rolls: w("l3b", "rolls"),
  stays: w("l3b", "stays"),
  upside: w("l3b", "upside"),
  // L4: the keel; the log; the seats and belts
  bolt: w("l4a", "bolt"),
  weight: w("l4a", "weight"),
  bottom: w("l4a", "bottom"),
  keel: w("l4a", "keel"),
  flips: w("l4a", "flips"),
  every: w("l4a", "every"),
  log: w("l4b", "log"),
  slams: w("l4b", "slams"),
  bounce: w("l4b", "bounce"),
  pinball: w("l4b", "pinball"),
  padded: w("l4c", "padded"),
  seats: w("l4c", "seats"),
  belts: w("l4c", "belts"),
  // L5: the air; the vents and valves; yellow and the helicopter
  sealed: w("l5a", "sealed"),
  air5: w("l5a", "air"),
  running: w("l5a", "running"),
  vents: w("l5b", "vents"),
  top: w("l5b", "top"),
  valves: w("l5b", "valves"),
  airIn: w("l5b", "air", 1),
  water5: w("l5b", "water"),
  paint: w("l5c", "paint"),
  yellow: w("l5c", "yellow"),
  helicopter: w("l5c", "helicopter"),
  spot: w("l5c", "spot"),
  // L6: the real pods; higher ground; evacuate
  pods: w("l6a", "pods"),
  built: w("l6a", "built"),
  higher: w("l6b", "higher"),
  ground: w("l6b", "ground"),
  evacuate: w("l6b", "evacuate"),
  go: w("l6b", "go"),
  congrats: w("end", "congratulations"),
  shelter: w("end", "shelter"),
  unless: w("cta", "unless"),
  prove: w("cta", "prove"),
};

/** Hard scene resets between attempts (camera cuts hide them). */
export const L2_START = lineStart("l2a") - 6;
export const L2B_START = lineStart("l2b") - 6;
export const L3_START = lineStart("l3a") - 6;
export const L4_START = lineStart("l4a") - 6;
export const L5_START = lineStart("l5a") - 6;
export const L6B_START = lineStart("l6b") - 6;

// ---------------------------------------------------------------------------
// Rain and storm light 0..1 (the finale clears up).
// ---------------------------------------------------------------------------

const STORM_KEYS: Array<[number, number]> = [
  [0, 0.8],
  [L2B_START, 0.8],
  [L5_START, 0.65],
  [lineStart("l6a"), 0.45],
  [L6B_START, 0.25],
  [BEATS.congrats, 0],
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
// L1: from the hallway into the tub; water under the door; the tub fills.
// ---------------------------------------------------------------------------

export const HALL_START: Record<Member, number> = { dad: -3.6, kid: -4.4 };
export const TUB_SPOT: Record<Member, number> = { dad: TUB_X + SEAT_DX.dad, kid: TUB_X + SEAT_DX.kid };
const LAG: Record<Member, number> = { dad: 0, kid: 6 };
/** Walk to the tub's side, then step over the rim into it. */
export const walk1 = (m: Member) => [BEATS.flood1 + 6 + LAG[m], BEATS.hide + 8 + LAG[m]] as const;
export const step1 = (m: Member) => [walk1(m)[1], walk1(m)[1] + 12] as const;
export const DOOR_SHUT = [BEATS.bathtub1 + 4, BEATS.bathtub1 + 14] as const;

/** The sheet of water that slides in under the door on "pours". */
export const GUSH = [BEATS.pours - 2, BEATS.pours + 18] as const;
/** Water level in the hallway (it floods first, behind the door). */
export const hallLevel = (f: number) => {
  if (f >= L2_START) return -1;
  return lerp(-0.4, 0.5, easeInOut(progress(f, [BEATS.water1 - 24, BEATS.pours])));
};
/** Water level in the bathroom: rises to the rim, spills in, then over their chins. */
export const RIM_Y = TUB_FEET + TUB_H;
export const ROOM_FULL = 1.12;
export const SPILL = [BEATS.fills - 8, BEATS.fills + 6] as const;
export const roomLevel = (f: number) => {
  if (f >= L2_START || f < GUSH[0]) return -1;
  if (f < SPILL[0]) return lerp(0.02, RIM_Y - 0.02, easeInOut(progress(f, [GUSH[1] - 6, SPILL[0]])));
  if (f < SPILL[1]) return RIM_Y - 0.02;
  return lerp(RIM_Y - 0.02, ROOM_FULL, easeOutCubic(progress(f, [SPILL[1], BEATS.it1 + 6])));
};
/** Water inside the tub: dry until the room water reaches the rim, then it pours in. */
export const tubLevel = (f: number) => {
  if (f >= L2_START || f < SPILL[0]) return -1;
  if (f < SPILL[1]) return lerp(TUB_FEET + TUB_FLOOR, RIM_Y - 0.03, easeInOut(progress(f, SPILL)));
  return roomLevel(f);
};

// ---------------------------------------------------------------------------
// L2a: the car myth. Dad on the porch with the keys; the car floats away.
// ---------------------------------------------------------------------------

export const X_SLAM = BEATS.dont;
/** Driveway water: ankle deep, then one foot on "foot", when the car lifts. */
export const driveLevel = (f: number) => {
  if (f < L2_START || f >= L2B_START) return -1;
  return LAWN_Y + lerp(0.08, 0.34, easeInOut(progress(f, [BEATS.foot - 10, BEATS.moving + 4])));
};
export const CAR_LIFT = [BEATS.moving, BEATS.carry] as const;
export const CAR_GONE = [BEATS.carry, BEATS.car + 40] as const;
/** The car: lifts on the water, then drifts off to the right, turning. */
export const carPose = (f: number) => {
  const lift = 0.22 * easeInOut(progress(f, CAR_LIFT));
  const p = progress(f, CAR_GONE);
  const bob = f >= CAR_LIFT[0] ? 0.05 * Math.sin(f * 0.25) : 0;
  return {
    x: CAR_X + 5.5 * p * p,
    y: LAWN_Y + lift + bob,
    yaw: 0.9 * p * p,
    roll: f >= CAR_LIFT[0] ? 0.05 * Math.sin(f * 0.19) : 0,
  };
};

// ---------------------------------------------------------------------------
// Waves on the open flood. A swell everywhere, plus authored crests that run
// in from the left and hit the hull on a beat.
// ---------------------------------------------------------------------------

/** Crests: the frame each reaches POD_X. */
export const CRESTS = [BEATS.wave2 + 12, BEATS.rolls - 2, BEATS.flips - 2, BEATS.every, BEATS.water5 - 6] as const;
const CREST_SPEED = 0.32;
const CREST_H = 1.15;
const CREST_W = 1.6;
export const waveY = (x: number, z: number, f: number) => {
  let y = 0.06 * Math.sin(x * 0.9 + f * 0.11) + 0.05 * Math.sin(z * 1.3 - f * 0.08 + x * 0.3);
  for (const at of CRESTS) {
    const cx = POD_X + (f - at) * CREST_SPEED;
    const d = (x - cx) / CREST_W;
    if (Math.abs(d) < 4) y += CREST_H * Math.exp(-d * d) * clamp01((10 - Math.abs(f - at) / 3) / 4);
  }
  return y;
};

// ---------------------------------------------------------------------------
// The hull on the flood: which build, where it sits and how it rolls.
// ---------------------------------------------------------------------------

/** Hull on the open water from "free" on (before that, the tub is in the house). */
export const POP_UP = [BEATS.free - 4, BEATS.free + 8] as const;
export const TIP = [BEATS.tips - 4, BEATS.tips + 8] as const;
export const LID_IN = [BEATS.lid - 6, BEATS.lid + 6] as const;
export const GASKET_FLASH = [BEATS.gasket - 2, BEATS.gasket + 18] as const;
export const SPLASH3 = BEATS.drop + 2;
export const ROLL3 = [BEATS.rolls - 2, BEATS.rolls + 12] as const;
export const KEEL_IN = [BEATS.weight - 6, BEATS.weight + 6] as const;
export const boltAt = (k: number) => BEATS.bottom - 6 + k * 6;
/** Two self-righting rolls: over to ~150°, then the weight swings it back. */
export const RIGHTS = [
  [BEATS.flips - 2, BEATS.flips + 30],
  [BEATS.every, BEATS.every + 26],
] as const;
export const LOG_HIT = BEATS.slams;
export const VENT_IN = [BEATS.vents - 4, BEATS.vents + 6] as const;
export const VALVE_SHUT = [CRESTS[4] - 4, CRESTS[4] + 14] as const;
export const AIR_PUFFS = [BEATS.airIn, BEATS.airIn + 10, VALVE_SHUT[1] + 2] as const;
export const PAINT = [BEATS.paint, BEATS.yellow + 6] as const;

/** Has the hull got its lid / keel / vents / paint at f (the builds stack up). */
export const hasLid = (f: number) => (f >= L3_START ? progress(f, LID_IN) : 0);
export const hasKeel = (f: number) => (f >= L4_START ? progress(f, KEEL_IN) : 0);
export const hasVents = (f: number) => (f >= L5_START ? easeOutBack(progress(f, VENT_IN)) : 0);
export const paintAt = (f: number) => (f >= L5_START ? easeInOut(progress(f, PAINT)) : 0);

/** A damped swing back upright after a roll to `peak` (radians). */
const righting = (f: number, [a, b]: readonly [number, number], peak: number) => {
  if (f < a || f >= b) return 0;
  const t = f - a;
  const up = 9;
  if (t < up) return peak * easeOutCubic(t / up);
  const s = t - up;
  return peak * Math.cos(s * 0.17) * Math.exp(-s * 0.09);
};

/** Roll of the hull (about z, so the camera sees it go over). */
export const hullRoll = (f: number) => {
  if (f < POP_UP[0]) return 0;
  const swell = 0.06 * Math.sin(f * 0.13) + 0.03 * Math.sin(f * 0.31);
  if (f < L3_START) return f < TIP[0] ? swell : -Math.PI * easeInOut(progress(f, TIP)) + swell * 0.5;
  if (f < L4_START) return f < ROLL3[0] ? swell : -Math.PI * easeInOut(progress(f, ROLL3)) + swell * 0.5;
  let r = swell;
  r += righting(f, RIGHTS[0], -2.6);
  r += righting(f, RIGHTS[1], -2.2);
  if (f >= LOG_HIT && f < LOG_HIT + 24) r += 0.35 * Math.sin((f - LOG_HIT) * 0.5) * Math.exp(-(f - LOG_HIT) * 0.12);
  return r;
};

/** Hull bottom height: floats at its draft, rides the waves, bobs up on "free". */
export const hullY = (f: number) => {
  const ride = waveY(POD_X, POD_Z, f);
  const base = ride - DRAFT;
  if (f < POP_UP[0]) return -4;
  if (f < POP_UP[1]) return lerp(-2.2, base + 0.25, easeOutBack(progress(f, POP_UP)));
  return base;
};
/** Small drift and a shove on the log hit. */
export const hullX = (f: number) => POD_X + 0.08 * Math.sin(f * 0.05) + (f >= LOG_HIT && f < L5_START ? 0.5 * easeOutCubic(progress(f, [LOG_HIT, LOG_HIT + 10])) : 0);
/** Pivot height of the roll above the hull bottom (the waterline for the open tub). */
export const hullPivot = (f: number) => (f < L3_START ? DRAFT : (TUB_H + LID_H) * 0.45);

/** The log: drifts in fast from the left and stops against the hull on "slams". */
export const LOG_LEN = 3.2;
export const logX = (f: number) => {
  const hit = hullX(LOG_HIT) - TUB_L / 2 - LOG_LEN / 2 - 0.05;
  if (f < LOG_HIT) return hit - (LOG_HIT - f) * 0.22;
  return hit - 0.7 * easeOutCubic(progress(f, [LOG_HIT, LOG_HIT + 16]));
};
export const LOG_SHOWN = [LOG_HIT - 40, L5_START] as const;

// ---------------------------------------------------------------------------
// L2c: thrown out of the tipping tub; they bob up next to it.
// ---------------------------------------------------------------------------

export const THROW = (m: Member) => [TIP[0] + 3 + LAG[m] / 3, TIP[0] + 17 + LAG[m] / 3] as const;
export const BOB_X: Record<Member, number> = { dad: POD_X - 1.75, kid: POD_X + 1.8 };

// ---------------------------------------------------------------------------
// Inside the pod (INT set): upside down (L3b), the pinball (L4b), seats and
// belts (L4c), the air running out (L5a).
// ---------------------------------------------------------------------------

export const INT_ON: Array<readonly [number, number]> = [
  [BEATS.upside - 6, L4_START],
  [BEATS.bounce - 6, L5_START + 0],
  [L5_START, lineStart("l5b") - 6],
];
export const intShown = (f: number) => INT_ON.some(([a, b]) => f >= a && f < b);
/** The inside rolls with the hull (upside down in L3b, rocks on the bumps). */
export const intRoll = (f: number) => {
  if (f < L4_START) return Math.PI;
  if (f >= LOG_HIT - 2 && f < BEATS.padded - 6) return 0.22 * Math.sin((f - LOG_HIT) * 0.42);
  if (f >= BEATS.belts + 14 && f < BEATS.belts + 40) return 0.28 * Math.sin((f - BEATS.belts - 14) * 0.45) * Math.exp(-(f - BEATS.belts - 14) * 0.06);
  return 0;
};
export const SEATS_IN = [BEATS.seats - 6, BEATS.seats + 6] as const;
export const BELTS_IN = [BEATS.belts - 2, BEATS.belts + 4] as const;
export const BUMP4 = BEATS.belts + 14;
/** The pinball: each member's bounces off the walls (local x, y, tilt). */
export const PINBALL = [BEATS.bounce - 2, BEATS.padded - 8] as const;
export const pinball = (m: Member, f: number) => {
  const t = f - PINBALL[0];
  const seed = m === "dad" ? 1 : 2;
  const px = Math.sin(t * (0.21 + seed * 0.03) + seed) * (TUB_L / 2 - 0.55);
  const py = Math.abs(Math.sin(t * (0.27 + seed * 0.04) + seed * 2)) * 0.16 + 0.02;
  // Always well over on their side, so a tumbling body never pokes through the ceiling.
  const side = Math.sin(t * 0.33 + seed);
  const tilt = (side >= 0 ? 1 : -1) * (1.15 + 0.35 * Math.abs(side)) + (random(`pin-${m}-${Math.floor(t / 6)}`) - 0.5) * 0.3;
  return { x: px, y: py, tilt };
};
/** Air left in the pod, 1 (fresh) to 0 (stale). */
export const AIR_DROP = [BEATS.air5 - 4, BEATS.running + 16] as const;
export const air = (f: number) => (f < L5_START ? 1 : f < lineStart("l5b") ? 1 - easeInOut(progress(f, AIR_DROP)) * 0.85 : 1);

// ---------------------------------------------------------------------------
// L5c: the helicopter. L6b: up the hill road.
// ---------------------------------------------------------------------------

export const HELI_IN = [BEATS.paint, BEATS.spot] as const;
export const HELI_Y = 7.5;
export const heliPos = (f: number): [number, number, number] => {
  const p = easeOutCubic(progress(f, HELI_IN));
  const hover = 0.12 * Math.sin(f * 0.07);
  return [lerp(POD_X + 22, POD_X + 1.6, p), HELI_Y + hover + (1 - p) * 2, POD_Z - 2.5];
};
export const SPOT_ON = BEATS.spot - 2;

export const HILL_START: Record<Member, number> = { dad: HILL_X0 + 1.4, kid: HILL_X0 + 0.9 };
export const HILL_END: Record<Member, number> = { dad: HILL_X1 + 0.9, kid: HILL_X1 + 0.3 };
export const climb = (m: Member) => [L6B_START + 8 + LAG[m], BEATS.go + 14 + LAG[m]] as const;
/** Where each climber is on the road at f. */
export const climbX = (m: Member, f: number) => lerp(HILL_START[m], HILL_END[m], easeInOut(progress(f, climb(m))));
/** The neighbours waiting on the hilltop. */
export const TOP_CROWD = [HILL_X1 + 1.7, HILL_X1 + 2.4] as const;
