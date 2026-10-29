import { createCues, easeInOut, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Teleport (long-form, 1920x1080): "What if you could teleport, but kept your
 * momentum?" Beats, shots, the story clocks and every bit of motion shared by
 * Scene.tsx, config.ts and the HUD. Pure functions of the frame; every beat is
 * `w(line, word) ± n` from the voiced narration (scripts/teleport-audio.py).
 *
 * The physics (checked in the audio script): landing speed is the difference
 * between the ground velocity where you leave and where you land.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
/** Action plane: travel runs along +x (north on the hops); actors stand on z = Z. */
export const Z = 0.9;
/** One world unit is a metre; 1 mph = 0.447 m/s = 0.0149 m per frame. */
export const MPH = 0.0149;

/** Where the story happens, as [lat, lon]. */
export const PLACES = {
  home: [41.3, -72.4],
  vermont: [44.47, -72.4],
  queulat: [-44.42, -72.4],
  pole: [90, -72.4],
  london: [51.5, -0.1],
} as const;

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open
  teleportWord: w("a1", "teleport"),
  anywhere: w("a1", "Anywhere"),
  blinkWord: w("a1", "blink"),
  catch: w("a2", "catch"),
  momentum: w("a2", "momentum"),
  arriveWord: w("a2", "arrive"),
  swing: w("a3", "swing"),
  /** The swing passes the bottom and Kit blinks off it, onto the porch. */
  leave: w("a3", "on") - 2,
  porch: w("a3", "porch"),
  twelve: w("a3", "twelve"),
  hedge: w("a4", "hedge"),
  // The spinning ground
  worse: w("b1", "worse"),
  standing: w("b1", "standing", 1),
  spins: w("b2", "spins"),
  equator: w("b2", "equator"),
  thousand: w("b2", "thousand"),
  connecticut: w("b3", "Connecticut"),
  eighty: w("b3", "eighty"),
  pole: w("b3", "Pole"),
  zero: w("b3", "zero"),
  feel: w("b4", "feel"),
  ground: w("b4", "ground"),
  house: w("b4", "house"),
  hedge2: w("b4", "hedge"),
  sun: w("b5", "Sun"),
  sixtySeven: w("b5", "sixty"),
  together: w("b5", "together"),
  cancels: w("b5", "cancels"),
  spinNot: w("b6", "spin"),
  far: w("b6", "far"),
  differentSpeed: w("b6", "different"),
  direction: w("b6", "direction"),
  rule: w("b7", "rule"),
  mile: w("b7", "mile"),
  quarter: w("b7", "quarter"),
  // The problem
  july: w("c1", "July"),
  tess: w("c1", "Tess"),
  nine: w("c1", "nine"),
  candles: w("c2", "candles"),
  four: w("c2", "four"),
  snowball: w("c2", "snowball"),
  ninety: w("c3", "ninety"),
  twentyPast: w("c3", "twenty"),
  easy: w("c4", "Easy"),
  northPole: w("c4", "Pole"),
  grabs: w("c5", "grabs"),
  maps: w("c5", "maps"),
  poleStill: w("c6", "move"),
  jumpThere: w("c6", "Jump"),
  ice: w("c6", "ice"),
  sevenEighty: w("c6", "seven"),
  // The ladder
  gentle: w("d1", "gentle"),
  ten: w("d2", "Ten"),
  land2: w("d2", "land"),
  escalator: w("d2", "escalator"),
  climbs: w("d3", "climbs"),
  map: w("d3", "map"),
  holding: w("d3", "holding"),
  hop1: w("d4", "Hop", 0),
  cornfield: w("d4", "cornfield"),
  hop2: w("d4", "Hop", 1),
  pasture: w("d4", "pasture"),
  hop3: w("d4", "Hop", 2),
  dock: w("d4", "dock"),
  math: w("d5", "math"),
  fortyHops: w("d5", "forty"),
  halfMinute: w("d5", "half"),
  threeHours: w("d5", "hours"),
  andBack: w("d5", "back"),
  thirtyFive: w("d6", "thirty"),
  // The big hop
  bigger: w("e1", "bigger"),
  fifty: w("e1", "fifty"),
  once: w("e1", "once"),
  /** Blink off the dock; arrive in the hayfield at 27 mph. */
  bigJump: w("e2", "land") - 2,
  vermont: w("e2", "Vermont"),
  twentySeven: w("e2", "twenty"),
  bales: w("e3", "bales"),
  soGrandpa: w("e3", "Grandpa"),
  // The axis
  lying: w("f1", "Lying"),
  pocketGlobe: w("f1", "globe"),
  spinsIt: w("f1", "spins"),
  axis: w("f2", "axis"),
  parallel: w("f3", "parallel"),
  through: w("f3", "through"),
  exactly: w("f3", "exactly"),
  longitude: w("f4", "longitude"),
  latitude: w("f4", "latitude"),
  south: w("f4", "south"),
  winter: w("f5", "winter"),
  // Patagonia
  hand: w("g1", "hand"),
  axisJump: w("g1", "Five") - 4,
  throughEarth: w("g1", "Earth"),
  zero2: w("g2", "zero"),
  step: w("g3", "step"),
  patagonia: w("g3", "Patagonia"),
  glacier: w("g3", "glacier"),
  sunSpot: w("g4", "sun"),
  colder: w("g4", "colder"),
  jacket: w("g5", "jacket"),
  pack: w("g5", "pack"),
  biggest: w("g5", "biggest"),
  // The run home
  jumpBack: w("h1", "back"),
  stepBack: w("h1", "step"),
  holdingSnow: w("h1", "snowball"),
  twentyTwo: w("h2", "Twenty"),
  eleven: w("h2", "Eleven"),
  hopSouth: w("h3", "hop"),
  barns: w("h3", "Barns"),
  rivers: w("h3", "Rivers"),
  backyards: w("h3", "Backyards"),
  drips: w("h3", "drips"),
  twoMin: w("h4", "Two"),
  oneMin: w("h4", "One"),
  lastHop: w("h4", "hop"),
  walking: w("h4", "walking"),
  // Payoff
  breath: w("k1", "breath"),
  holdOut: w("k2", "hold"),
  smaller: w("k2", "smaller"),
  blows: w("k3", "blows"),
  grabsIt: w("k3", "grabs"),
  hits: w("k3", "hits"),
  face: w("k3", "face"),
  // Hook
  night: w("m1", "night"),
  spinsAgain: w("m1", "spins"),
  stops: w("m1", "stops"),
  equator2: w("m1", "equator"),
  arrive: w("m2", "arrive"),
  aThousand: w("m2", "thousand"),
  grins: w("m2", "grins"),
  crash: w("m2", "crash"),
  launch: w("m2", "launch"),
  comments: w("end", "comments"),
  subscribe: w("end", "subscribe"),
} as const;

// ---------------------------------------------------------------------------
// Shots: which set is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "yard"
  | "porch"
  | "spin"
  | "still"
  | "orbit"
  | "rule"
  | "party"
  | "polePlan"
  | "ladder"
  | "corn"
  | "pasture"
  | "dock"
  | "hayCrash"
  | "hayTalk"
  | "axis"
  | "handJump"
  | "chord"
  | "patagonia"
  | "hayReturn"
  | "barns"
  | "rivers"
  | "backyards"
  | "corn2"
  | "pasture2"
  | "arrive"
  | "payoff"
  | "night"
  | "launchGlobe";

export const SHOT_STARTS: [ShotId, number][] = [
  ["yard", 0],
  ["porch", BEATS.leave],
  ["spin", lineStart("b2") - 6],
  ["still", lineStart("b4") - 6],
  ["orbit", lineStart("b5") - 6],
  ["rule", lineStart("b6") - 6],
  ["party", lineStart("c1") - 8],
  ["polePlan", lineStart("c6") - 6],
  ["ladder", lineStart("d1") - 8],
  ["corn", BEATS.hop1 - 2],
  ["pasture", BEATS.hop2 - 2],
  ["dock", BEATS.hop3 - 2],
  ["hayCrash", BEATS.bigJump],
  ["hayTalk", lineStart("f1") - 6],
  ["axis", lineStart("f2") - 6],
  ["handJump", lineStart("g1") - 8],
  ["chord", BEATS.axisJump],
  ["patagonia", lineStart("g3") - 6],
  ["hayReturn", lineStart("h1") - 6],
  ["barns", BEATS.barns - 4],
  ["rivers", BEATS.rivers - 4],
  ["backyards", BEATS.backyards - 4],
  ["corn2", BEATS.twoMin - 4],
  ["pasture2", BEATS.oneMin - 4],
  ["arrive", BEATS.lastHop - 4],
  ["payoff", lineStart("k1") - 8],
  ["night", lineStart("m1") - 8],
  ["launchGlobe", lineStart("m2") - 6],
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

/** Shots set in space around the globe. */
export const GLOBE_SHOTS: ShotId[] = ["spin", "orbit", "rule", "polePlan", "axis", "chord", "launchGlobe"];

// ---------------------------------------------------------------------------
// Story HUD: the candle countdown and the jump readout.
// ---------------------------------------------------------------------------
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

/** Minutes until the 4:00 candles (shown from "twenty past three" until she blows them out). */
const CLOCK_KEYS: [number, number][] = [
  [BEATS.twentyPast, 40],
  [BEATS.maps, 38],
  [BEATS.hop1, 37],
  [BEATS.thirtyFive, 35],
  [BEATS.bigJump, 34],
  [BEATS.winter, 31],
  [BEATS.zero2, 30],
  [BEATS.biggest, 14],
  [BEATS.eleven, 11],
  [BEATS.drips, 6],
  [BEATS.twoMin, 2],
  [BEATS.oneMin, 1],
  [BEATS.walking, 0.5],
  [BEATS.blows, 0],
];
export const minutesLeft = (frame: number) => keyed(CLOCK_KEYS, frame, false);
export const CLOCK_FROM = BEATS.twentyPast;
export const CLOCK_TO = BEATS.blows + 40;

export interface JumpReadout {
  from: number;
  to: number;
  /** Straight-line distance jumped, in miles (null = not a distance jump). */
  miles: number | null;
  /** Landing speed relative to the ground, mph. */
  mph: number;
  label: string;
}

/** The jump card: distance in, landing speed out. Numbers match the audio script's maths. */
export const JUMPS: JumpReadout[] = [
  { from: BEATS.leave - 10, to: BEATS.hedge + 30, miles: null, mph: 12, label: "SWING" },
  { from: BEATS.jumpThere - 6, to: shotEnd("polePlan"), miles: 3380, mph: 779, label: "TO THE POLE" },
  { from: BEATS.ten - 4, to: BEATS.climbs - 10, miles: 10, mph: 1.7, label: "ONE HOP NORTH" },
  { from: BEATS.hop1 - 2, to: BEATS.math - 10, miles: 10, mph: 1.7, label: "HOP" },
  { from: BEATS.fifty - 4, to: BEATS.bales + 20, miles: 150, mph: 27, label: "BIG HOP" },
  { from: BEATS.axisJump, to: lineEnd("g2") + 20, miles: 5550, mph: 0, label: "THROUGH THE EARTH" },
  { from: BEATS.jumpBack - 6, to: BEATS.twentyTwo - 6, miles: 5550, mph: 0, label: "THROUGH THE EARTH" },
  { from: BEATS.hopSouth - 4, to: BEATS.walking + 30, miles: 10, mph: 1.7, label: "HOP" },
];
export const jumpAt = (frame: number) => JUMPS.filter((j) => frame >= j.from && frame < j.to)[0];

// ---------------------------------------------------------------------------
// Kinematics
// ---------------------------------------------------------------------------
/** Swing: chain 2 m, period ~2.8 s; at `leave` the seat passes the bottom moving +x at 12 mph. */
export const SWING_PERIOD = 84;
export const SWING_AMP = 1.2;
/** Amplitude builds from the moment Kit sits on the swing. */
export const SIT_ON_SWING = BEATS.momentum - 10;
export const swingAngle = (frame: number) => {
  const build = easeInOut(progress(frame, [SIT_ON_SWING, BEATS.swing]));
  const decay = frame > BEATS.leave ? Math.exp(-(frame - BEATS.leave) / 160) : 1;
  return SWING_AMP * lerp(0.15, 1, build) * decay * Math.sin(((frame - BEATS.leave) / SWING_PERIOD) * Math.PI * 2);
};
/** Seat speed at the bottom: amplitude × ω × chain, in m per frame (12 mph = 0.18). */
export const SWING_V = SWING_AMP * ((Math.PI * 2) / SWING_PERIOD) * 2;

/** Porch: Kit arrives at swing speed and stumble-runs, slowing (τ), into the hedge on "hedge". */
export const HEDGE_X = 12;
export const RUN_TAU = 140;
const runDist = (t: number) => SWING_V * RUN_TAU * (1 - Math.exp(-t / RUN_TAU));
/** Kit's chest meets the hedge face (hedge is 1 m deep, centred on HEDGE_X). */
export const ARRIVE_X = HEDGE_X - 0.75 - runDist(BEATS.hedge - BEATS.leave);
export const kitRunX = (frame: number) => ARRIVE_X + runDist(Math.max(0, Math.min(frame, BEATS.hedge) - BEATS.leave));
export const runSpeed = (frame: number) => (frame < BEATS.hedge ? SWING_V * Math.exp(-(frame - BEATS.leave) / RUN_TAU) : 0);

/** Big hop: arrive at 27 mph, tumble through the stubble (τ) into the bales on "bales". */
export const HAY_V = 27 * MPH;
export const HAY_TAU = 110;
const hayDist = (t: number) => HAY_V * HAY_TAU * (1 - Math.exp(-t / HAY_TAU));
export const HAY_ARRIVE_X = -hayDist(BEATS.bales - BEATS.bigJump);
/** The pair's x along the hayfield; they stop at x = 0 in the bales. */
export const hayX = (frame: number) => HAY_ARRIVE_X + hayDist(Math.max(0, Math.min(frame, BEATS.bales) - BEATS.bigJump));
/** Tumble angle (rolls like a 0.5 m wheel). */
export const hayRoll = (frame: number) => (hayX(frame) - HAY_ARRIVE_X) / 0.55;
