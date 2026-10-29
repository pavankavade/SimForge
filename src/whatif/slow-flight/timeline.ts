import { createCues, easeInOut, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Slow Flight (long-form, 1920x1080): beats, shots, geometry and motion shared
 * by Scene.tsx, config.ts and the HUD. Pure functions of the frame. Every beat
 * is `w(line, word) ± n` from the voiced narration (scripts/slow-flight-audio.py).
 *
 * The world is built around the actors: in flight shots the pair stays near
 * the origin and the ground scrolls and sinks beneath them, so the sky,
 * shadows and camera never leave the set.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
/** Action plane: the road runs along x (toward town = +x); actors stand on the near lane. */
export const Z = 0.9;
/** Hover height of Kit's feet when showing off. */
export const HOVER_Y = 1.0;
/** Bus on the far shoulder after it dies; front toward town. */
export const BUS_X = -1.6;
export const BUS_Z = -2.8;
export const WINDSOCK_X = 2.2;
export const WINDSOCK_Z = -1.2;
/** Walking pace through the air in world units per frame (3 mph ≈ 1.34 m/s ≈ 0.045 m per frame). */
export const AIR = 0.045;
/** Scrolling ground in flight shots: world units per frame per mph of ground speed. */
export const MPH = 0.032;

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open
  catStrolls: w("a3", "strolls"),
  catBeats: w("a3", "beats"),
  flap: w("a4", "flap"),
  noHelp: w("a4", "help"),
  // Rules
  throughAir: w("b1", "air"),
  plusWind: w("b2", "wind"),
  gust: w("b3", "gust"),
  twenty: w("b3", "twenty"),
  intoWind: w("b4", "into"),
  nowhere: w("b4", "nowhere"),
  passenger: w("b5", "passenger"),
  onBackDemo: w("b5", "back"),
  // Problem
  bus: w("c1", "bus"),
  sunflower: w("c2", "sunflower"),
  piano: w("c2", "piano"),
  coughs: w("c3", "coughs"),
  dies: w("c3", "dies"),
  seven: w("c4", "seven"),
  thirteen: w("c5", "thirteen"),
  sky: w("c6", "sky"),
  // Windsock and plains
  cane: w("d1", "cane"),
  fiveStripes: w("d2", "five"),
  allFull: w("d3", "full"),
  towardTown: w("d3", "town"),
  onBack: w("d4", "back"),
  step: w("d4", "step"),
  airStill: w("d5", "three"),
  ground20: w("d5", "twenty"),
  smoother: w("d6", "smoother"),
  cropDuster: w("d7", "duster"),
  salutes: w("d7", "salutes"),
  // Headwind
  bends: w("e1", "bends"),
  inFace: w("e2", "face"),
  nowhere2: w("e3", "nowhere"),
  cow: w("e3", "cow"),
  hawk: w("e4", "hawk"),
  stillWings: w("e4", "still"),
  // Thermal, too high
  thermal: w("f1", "thermal"),
  rises: w("f1", "rises"),
  spiral: w("f2", "spiral"),
  twoK: w("f3", "Two"),
  fiveK: w("f3", "Five"),
  nineK: w("f3", "Nine"),
  cold: w("f4", "cold"),
  frost: w("f5", "Frost"),
  thermos: w("f5", "thermos"),
  jet: w("f6", "jet"),
  freeze: w("f6", "freeze"),
  // Ridge lift
  mountains: w("g1", "mountains"),
  paraglider: w("g1", "paraglider"),
  ridgeLift: w("g2", "lift"),
  slideIn: w("g3", "slide"),
  escalator: w("g3", "escalator"),
  // Stall
  quiet: w("h1", "quiet"),
  stops: w("h1", "stops"),
  fortyOne: w("h2", "Forty"),
  threeHours: w("h2", "hours"),
  landRock: w("h3", "land"),
  shaking: w("h3", "shaking"),
  sitsDown: w("h4", "sits"),
  sunflowerField: w("h4", "sunflower"),
  licks: w("h5", "licks"),
  holdsUp: w("h5", "holds"),
  waitForIt: w("h5", "wait"),
  // Flip
  sunTouches: w("i1", "touches"),
  heavier: w("i2", "heavier"),
  turns: w("i3", "turns"),
  pours: w("i3", "pours"),
  tailwind: w("i4", "tailwind"),
  // Run
  grab: w("j1", "grab"),
  jump: w("j1", "jump"),
  plus22: w("j2", "twenty"),
  rooftops: w("j2", "rooftops"),
  sixFiftyEight: w("j3", "Six"),
  sixFiftyNine: w("j3", "Six", 1),
  land: w("j3", "land"),
  // Payoff
  slides: w("k1", "slides"),
  curtain: w("k1", "curtain"),
  opens: w("k1", "opens"),
  grins: w("k2", "grins"),
  hovering: w("k3", "hovering"),
  // Hook
  vane: w("m1", "vane"),
  jetStream: w("m1", "jet"),
  imagine: w("m2", "Imagine"),
  comments: w("end", "comments"),
  subscribe: w("end", "subscribe"),
} as const;

// ---------------------------------------------------------------------------
// Shots: which set is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "yard"
  | "rules"
  | "carry"
  | "busRide"
  | "preview"
  | "bus"
  | "windsock"
  | "takeoff"
  | "cruise"
  | "headwind"
  | "climb"
  | "high"
  | "ridge"
  | "stall"
  | "flip"
  | "valley"
  | "school"
  | "stage"
  | "night";

export const SHOT_STARTS: [ShotId, number][] = [
  ["yard", 0],
  ["rules", lineStart("b1") - 6],
  ["carry", lineStart("b5") - 4],
  ["busRide", lineStart("c1") - 6],
  ["preview", w("c2", "Tess") - 4],
  ["bus", lineStart("c3") - 6],
  ["windsock", lineStart("d1") - 4],
  ["takeoff", lineStart("d4") - 4],
  ["cruise", lineStart("d5") - 6],
  ["headwind", lineStart("e1") - 4],
  ["climb", lineStart("f1") - 6],
  ["high", lineStart("f4") - 6],
  ["ridge", lineStart("g1") - 6],
  ["stall", lineStart("h1") - 6],
  ["flip", lineStart("i1") - 6],
  ["valley", lineStart("j1") - 6],
  ["school", w("j3", "Six") - 6],
  ["stage", lineStart("k1") - 6],
  ["night", lineStart("m1") - 6],
];

export const shotAt = (frame: number): ShotId => {
  let id: ShotId = "yard";
  for (const [s, f] of SHOT_STARTS) if (frame >= f) id = s;
  return id;
};
export const shotStart = (id: ShotId) => SHOT_STARTS.filter((s) => s[0] === id)[0][1];
export const shotEnd = (id: ShotId) => {
  const i = SHOT_STARTS.map((s) => s[0]).indexOf(id);
  return i + 1 < SHOT_STARTS.length ? SHOT_STARTS[i + 1][1] : DURATION;
};
export const inShot = (frame: number) => frame - shotStart(shotAt(frame));

// ---------------------------------------------------------------------------
// Time of day: 0 afternoon, ~0.45 late afternoon, 1 sunset, 1.6 dusk, 2 night.
// ---------------------------------------------------------------------------
const TOD_KEYS: [number, number][] = [
  [0, 0],
  [shotStart("ridge"), 0.1],
  [shotStart("stall"), 0.3],
  [BEATS.sunTouches - 30, 0.55],
  [BEATS.sunTouches + 20, 1],
  [shotStart("school"), 1.5],
  [shotStart("stage"), 1.65],
  [shotStart("night") - 1, 1.65],
  [shotStart("night"), 2],
];

const keyed = (keys: [number, number][], frame: number, ease = true) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i][0]) {
      const [f0, v0] = keys[i - 1];
      const [f1, v1] = keys[i];
      if (f1 === f0) return v1;
      const t = (frame - f0) / (f1 - f0);
      return lerp(v0, v1, ease ? easeInOut(t) : t);
    }
  }
  return keys[keys.length - 1][1];
};

export const timeOfDay = (frame: number) => keyed(TOD_KEYS, frame);

// ---------------------------------------------------------------------------
// Story HUD: ground speed = 3 (air) + wind, and the countdown to the 7:00 curtain.
// ---------------------------------------------------------------------------
/** [frame, wind mph] keys (negative = headwind). */
const WIND_KEYS: [number, number][] = [
  [0, 0],
  [BEATS.gust - 2, 0],
  [BEATS.twenty, 17],
  [BEATS.intoWind - 2, 17],
  [BEATS.intoWind + 8, -3],
  [shotStart("carry") - 1, -3],
  [shotStart("carry"), 0],
  [BEATS.step, 0],
  [BEATS.airStill, 17],
  [BEATS.bends - 2, 17],
  [BEATS.inFace, -3],
  [BEATS.hawk, -3],
  [shotStart("climb"), 0],
  [shotStart("ridge"), 0],
  [BEATS.slideIn, 6],
  [BEATS.quiet, 6],
  [BEATS.stops, 0],
  [BEATS.turns, 0],
  [BEATS.tailwind, 22],
  [BEATS.land - 10, 22],
  [BEATS.land, 0],
];
export const windMph = (frame: number) => Math.round(keyed(WIND_KEYS, frame));

/** Is Kit in the air (airspeed 3)? */
export const flying = (frame: number) => {
  const s = shotAt(frame);
  if (s === "bus" || s === "windsock" || s === "busRide" || s === "preview" || s === "stage") return false;
  if (s === "takeoff") return frame >= BEATS.step;
  if (s === "stall") return frame < BEATS.landRock;
  if (s === "flip") return frame >= BEATS.tailwind;
  if (s === "school") return frame < BEATS.land;
  return true;
};

/** The speed card shows during the rules and from takeoff to landing. */
export const showSpeed = (frame: number) =>
  (frame >= shotStart("rules") && frame < shotStart("busRide")) || (frame >= shotStart("takeoff") && frame < shotStart("stage"));

/** Minutes until the 7:00 curtain, keyed to beats (shown from "seven" until the curtain). */
const CLOCK_KEYS: [number, number][] = [
  [BEATS.seven, 230],
  [BEATS.cane, 224],
  [BEATS.step, 216],
  [BEATS.bends, 172],
  [BEATS.cow, 160],
  [BEATS.thermal, 148],
  [BEATS.nineK, 118],
  [BEATS.mountains, 84],
  [BEATS.quiet, 48],
  [BEATS.fortyOne, 41],
  [BEATS.waitForIt, 34],
  [BEATS.turns, 26],
  [BEATS.jump, 16],
  [BEATS.rooftops, 4],
  [BEATS.sixFiftyEight, 2],
  [BEATS.sixFiftyNine, 1],
  [BEATS.curtain, 1],
  [BEATS.opens, 0],
];
export const minutesLeft = (frame: number) => keyed(CLOCK_KEYS, frame, false);
export const CLOCK_FROM = BEATS.seven;
export const CLOCK_TO = BEATS.opens + 40;

// ---------------------------------------------------------------------------
// Kinematics
// ---------------------------------------------------------------------------
/** Cold open: Kit hovers along the fence at walking pace; the cat overtakes on "beats". */
export const KIT_YARD_X0 = -2.2;
export const kitYardX = (frame: number) => KIT_YARD_X0 + frame * AIR * 0.5;
export const CAT_SPEED = 0.03;
export const catX = (frame: number) => kitYardX(BEATS.catBeats) + 1.2 + (frame - BEATS.catBeats) * CAT_SPEED;

/** Rules: Kit hovers; the gust flings them right; flying into the wind they stall in place. */
export const kitRulesX = (frame: number) => {
  const s = shotStart("rules");
  const base = (frame - s) * AIR * 0.35;
  if (frame < BEATS.gust) return base;
  const t = Math.min(frame, BEATS.intoWind) - BEATS.gust;
  return base + 0.004 * t * t;
};
/** Frame the rules shot resets to a headwind demo (same spot, wind reversed). */
export const HEADWIND_DEMO = BEATS.intoWind;

/** Bus ride: the bus drives along the road until it coughs and rolls to a stop on "dies". */
export const BUS_SPEED = 0.35;
export const busX = (frame: number) => {
  const s = shotStart("busRide");
  if (frame < BEATS.coughs) return -12 + (frame - s) * BUS_SPEED;
  // Coasting to a stop at BUS_X on "dies".
  const t = progress(frame, [BEATS.coughs, BEATS.dies + 10]);
  return lerp(BUS_X - 6, BUS_X, 1 - (1 - t) * (1 - t));
};

/** Takeoff: the pair rises and leans into the wind after "step". */
export const TAKEOFF: [number, number] = [BEATS.step, shotEnd("takeoff")];
export const takeoffLift = (frame: number) => easeInOut(progress(frame, TAKEOFF));

/** Thermal climb: spiral from "spiral" to the end of the climb shot. */
export const SPIRAL: [number, number] = [BEATS.spiral - 6, shotEnd("climb")];
export const climbDrop = (frame: number) => lerp(0, 70, easeInOut(progress(frame, [shotStart("climb"), shotEnd("climb")])));

/** Stall: the pair lands on the perch rock on "land". */
export const PERCH_LAND: [number, number] = [BEATS.landRock - 40, BEATS.landRock];

/** Run: from the perch the pair jumps on "jump" and accelerates down the valley. */
export const SCHOOL_STEPS_X = 1.2;
export const LANDING: [number, number] = [shotStart("school"), BEATS.land];
