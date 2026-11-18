import type { ArmsPose, PaladinInput } from "../../artifacts/characters/paladin";
import { createCues, easeInOut, easeOutCubic, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Mine Rescue (9:16 short): "69 days under a mountain", our retelling of the 2010 San Jose mine
 * rescue. Beats, the world's layout, shots and every bit of motion shared by Scene.tsx, camera.ts,
 * config.ts and the HUD. Pure functions of the frame; every beat is `w(line, word) ± n` from the
 * voiced narration (scripts/mine-rescue-audio.py).
 *
 * One world, cut open like an ant farm: the mountain's face stands at z = WORLD.face and
 * everything underground is carved into it. The shelter is at the bottom (its floor is y = 0),
 * the ramp zig-zags down to it on the right, the camp stands on top at y = WORLD.top, and the
 * boreholes and the rescue shaft run down the face between them. Distances are human scale; the
 * 700 m of rock is squeezed into WORLD.top metres so the people still read in the wide shots.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";

export type V2 = [number, number];
export type V3 = [number, number, number];

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // Trapped
  collapse: w("a1", "came"),
  down: w("a1", "down"),
  between: w("a1", "between"),
  sky: w("a1", "sky"),
  thirtyThree: w("a1", "Thirty-three"),
  shelter: w("a1", "shelter"),
  food: w("a2", "food"),
  twoDays: w("a2", "two"),
  nobody: w("a2", "nobody"),
  alive: w("a2", "alive"),
  tryShaft: w("a3", "try"),
  shaft: w("a3", "shaft"),
  ladders: w("a3", "ladders"),
  never: w("a3", "never"),
  foreman: w("a4", "foreman"),
  splits: w("a4", "splits"),
  everyTwo: w("a4", "Every"),
  spoons: w("a4", "spoons"),
  tuna: w("a4", "tuna"),
  sip: w("a4", "sip"),
  milk: w("a4", "milk"),
  bite: w("a4", "bite"),
  cracker: w("a4", "cracker"),
  // Found
  drills: w("b1", "drills"),
  bore: w("b1", "bore"),
  holes: w("b1", "holes"),
  fist: w("b1", "fist"),
  maps: w("b1", "maps"),
  past: w("b1", "past"),
  again1: w("b1", "Again"),
  again2: w("b1", "again", 1),
  day17: w("b2", "seventeen"),
  grinding: w("b2", "Grinding"),
  wall: w("b2", "wall"),
  bursts: w("b2", "bursts"),
  paint: w("b3", "paint"),
  red: w("b3", "red"),
  tape: w("b3", "tape"),
  note: w("b3", "note"),
  ride: w("b3", "ride"),
  backUp: w("b3", "up"),
  weAreFine: w("b3", "We"),
  noteThirtyThree: w("b3", "thirty-three"),
  // The big hole
  lifeline: w("c1", "lifeline"),
  cFood: w("c1", "Food"),
  water: w("c1", "water"),
  letters: w("c1", "letters"),
  camera: w("c1", "camera"),
  slide: w("c1", "slide"),
  tubes: w("c1", "tubes"),
  person: w("c2", "person"),
  shoulders: w("c2", "shoulders"),
  three: w("c2", "three"),
  race: w("c2", "race"),
  chews: w("c3", "chews"),
  bits: w("c3", "bits"),
  day65: w("c3", "sixty-five"),
  breaks: w("c3", "breaks"),
  fit: w("c4", "fit"),
  capsule: w("c4", "capsule"),
  fiftyThree: w("c4", "fifty-three"),
  wide: w("c4", "wide"),
  // Out
  phoenix: w("d1", "Phoenix"),
  wheels: w("d1", "Wheels"),
  oxygen: w("d1", "oxygen"),
  jams: w("d1", "jams"),
  hatch: w("d1", "hatch"),
  climb: w("d1", "climb"),
  day69: w("d2", "sixty-nine"),
  firstMan: w("d2", "first"),
  rises: w("d2", "rises"),
  ground: w("d2", "ground"),
  sunglasses: w("d2", "sunglasses"),
  dark: w("d2", "dark"),
  sun: w("d2", "sun"),
  eyes: w("d2", "eyes"),
  oneByOne: w("d3", "One"),
  all33: w("d3", "thirty-three"),
  last: w("d3", "Last"),
  foremanUp: w("d3", "foreman"),
  splitTuna: w("d3", "tuna"),
  endDays: w("end", "Sixty-nine"),
  sevenHundred: w("end", "seven"),
  every: w("end", "every"),
  home: w("end", "home"),
};

// ---------------------------------------------------------------------------
// Shots (each starts on a camera cut or whip; camera.ts has the moves inside them)
// ---------------------------------------------------------------------------
export const SHOTS = {
  /** In the ramp as the roof comes down, then out to the whole mountain. */
  open: 0,
  /** The shelter: food, the ventilation shaft, the ration. */
  shelterA: BEATS.thirtyThree - 8,
  /** Up top: the probe rig, down a borehole, and the misses on the mountain's face. */
  drills: lineStart("b1") - 4,
  /** The shelter on day 17: the bit comes through the roof, the paint, the note. */
  found: lineStart("b2") - 4,
  /** Up the hole with the bit. */
  rideUp: BEATS.ride - 2,
  /** The camp reads the note. */
  note: BEATS.weAreFine - 12,
  /** A supply tube goes in at the top, down the hole, and out into the shelter. */
  life: lineStart("c1") - 4,
  /** "As wide as his shoulders". */
  person: BEATS.person - 6,
  /** Three rigs on top, and their race down the mountain. */
  race: BEATS.three - 4,
  /** Down the shaft with Plan B's bit. */
  bits: lineStart("c3") - 4,
  /** The shelter on day 65: the roof breaks, and the measure. */
  breakthrough: BEATS.day65 - 4,
  /** The capsule goes down the shaft. */
  phoenix: lineStart("d1") - 4,
  /** The pithead at night: the first man, then the rest. */
  night: lineStart("d2") - 4,
  /** The camp, and back out to the whole mountain. */
  end: lineStart("end") - 6,
};
export type ShotId = keyof typeof SHOTS;

const SHOT_ORDER = (Object.keys(SHOTS) as ShotId[]).sort((a, b) => SHOTS[a] - SHOTS[b]);
export const shotEnd = (id: ShotId): number => {
  const i = SHOT_ORDER.indexOf(id);
  return i + 1 < SHOT_ORDER.length ? SHOTS[SHOT_ORDER[i + 1]] : DURATION;
};

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
export const WORLD = {
  /** The cut face of the mountain (z), and how deep the openings go behind it. */
  face: 1.9,
  depth: 4.3,
  /** Ground level at the camp (the shelter floor is y = 0). */
  top: 58,
  /** The rock drawn (well past any frame edge). */
  bounds: { x0: -60, x1: 64, y0: -22, y1: 58 },
  /** Ramp: rise per metre along x, and its clear height. */
  slope: 0.6,
  rampH: 3.4,
};
export const FACE = WORLD.face;
export const TOP = WORLD.top;

/** The ramp's floor line (x, y), from just under the camp down to the shelter's mouth. */
export const RAMP: V2[] = [
  [15.7, 53.1],
  [9.2, 49.2],
  [19.2, 43.2],
  [9.2, 37.2],
  [19.2, 31.2],
  [9.2, 25.2],
  [19.2, 19.2],
  [9.2, 13.2],
  [19.2, 7.2],
  [7.2, 0],
];
/** Floor height on the ramp's last leg (and the shelter floor beyond its mouth). */
export const rampY = (x: number): number => Math.max(0, WORLD.slope * (x - 7.2));
/** The stretch of the last leg that came down (x). */
export const FALL = { x0: 14.3, x1: 18.7 };

/** The truck that outruns the fall: down the last leg on the far lane, braking near the mouth. */
export const TRUCK = { z: -0.85, from: 20.4, to: 10.4, start: 20, stop: 94 };
export const truckX = (f: number): number => lerp(TRUCK.from, TRUCK.to, easeOutCubic(progress(f, [TRUCK.start, TRUCK.stop])));

// ---------------------------------------------------------------------------
// Shelter (floor y = 0, the room open toward the camera at z = FACE)
// ---------------------------------------------------------------------------
export const SH = {
  back: FACE - WORLD.depth,
  front: FACE,
  ceil: 3.0,
  left: -11.0,
  right: 7.2,
  cabinet: [-4.7, -1.95] as V2,
  bench: { x0: -3.9, x1: -1.0, z: -1.78, seat: 0.46 },
  crate: [-2.0, 0.35] as V2,
  /** Ventilation shaft (x), its width, and how high it runs. */
  vent: [5.1, -0.9] as V2,
  ventW: 1.1,
  ventTop: 50,
  /** The probe comes down through the roof here, on the cut face. */
  probeAt: [1.55, 3.0, FACE] as V3,
  probeDir: [0, -1, 0] as V3,
  /** How far the bit hangs below the roof. */
  probeOut: 1.5,
  /** Plan B's shaft comes down here (x), also on the cut face. */
  planB: [-2.6, FACE] as V2,
};

// ---------------------------------------------------------------------------
// Boreholes
// ---------------------------------------------------------------------------
/** Probes: where the rig stands on top (x) and where the hole ends. 0-2 miss; 3 hits on day 17. */
export const PROBES: Array<{ top: number; end: V2 }> = [
  { top: -13.6, end: [-12.7, -2.6] },
  { top: -17.5, end: [-14.8, 8] },
  { top: 6.6, end: [6.9, 7.2] },
  { top: SH.probeAt[0], end: [SH.probeAt[0], SH.ceil] },
];
const PROBE_SPANS: Array<[number, number]> = [
  [BEATS.drills - 12, BEATS.past + 4],
  [BEATS.again1 - 14, BEATS.again1 + 24],
  [BEATS.again2 - 8, BEATS.again2 + 20],
  [BEATS.grinding - 30, BEATS.bursts],
];
/** How far down probe k has drilled (0..1), at a steady rate. */
export const probeProgress = (k: number, f: number): number => progress(f, PROBE_SPANS[k]);
/** A point `t` (0..1) of the way down probe k. */
export const probePoint = (k: number, t: number): V2 => [lerp(PROBES[k].top, PROBES[k].end[0], t), lerp(TOP, PROBES[k].end[1], t)];

/**
 * The bit of the probe that hit (y of its tip): down through the mountain, out of the shelter
 * roof on "bursts", and back up to the rig with the note on "ride".
 */
export const BIT_UP = TOP + 1.05;
export const probeTipY = (f: number): number => {
  if (f < BEATS.bursts - 3) return lerp(TOP, SH.ceil + 0.1, probeProgress(3, f));
  if (f < BEATS.ride) return lerp(SH.ceil + 0.1, SH.ceil - SH.probeOut, Math.min(1, (f - BEATS.bursts + 3) / 4));
  const t = progress(f, [BEATS.ride, BEATS.weAreFine - 6]);
  return lerp(SH.ceil - SH.probeOut, BIT_UP, t * t * (3 - 2 * t) * 0.5 + t * 0.5);
};
/** Roof shudder while the bit grinds toward the room. */
export const grindAmount = (f: number): number => progress(f, [BEATS.grinding - 6, BEATS.bursts]) * (f < BEATS.bursts + 4 ? 1 : 0);
/** The red paint on the bit (0..1), and the note taped to it. */
export const paintAmount = (f: number): number => easeInOut(progress(f, [BEATS.paint + 6, BEATS.red + 12]));
export const noteOn = (f: number): boolean => f >= BEATS.note - 4 && f < BEATS.weAreFine + 2;

/**
 * The paloma (supply tube): hung over the hole at the camp, lowered in, down the mountain, and
 * out of the shelter roof into the hero's hands.
 */
export const TUBE_LEN = 1.5;
export const TUBE = {
  show: SHOTS.life,
  lower: BEATS.lifeline - 22,
  drop: BEATS.cFood - 4,
  roof: BEATS.slide - 4,
  out: BEATS.tubes + 2,
  caught: BEATS.tubes + 8,
  gone: SHOTS.person,
};
/** Height of the tube's lower end while it hangs on its line. */
export const tubeY = (f: number): number => {
  if (f < TUBE.drop) return lerp(TOP + 1.0, TOP - 3.0, easeInOut(progress(f, [TUBE.lower, TUBE.drop])));
  if (f < TUBE.roof) return lerp(TOP - 3.0, SH.ceil + 0.6, progress(f, [TUBE.drop, TUBE.roof]));
  return lerp(SH.ceil + 0.6, SH.ceil - TUBE_LEN - 0.12, easeOutCubic(progress(f, [TUBE.roof, TUBE.out])));
};

/** The three big drills (Plans A, B, C): rig on top (x), where each hole ends. B wins. */
export const PLANS: Array<{ top: number; end: V2; reach: number; color: string; name: string }> = [
  { top: -6.6, end: [-7.0, 24], reach: 0.62, color: "#3f8fe0", name: "PLAN A" },
  { top: SH.planB[0], end: [SH.planB[0], SH.ceil], reach: 1, color: "#f0a020", name: "PLAN B" },
  { top: 4.3, end: [3.2, 31.5], reach: 0.48, color: "#e8e6df", name: "PLAN C" },
];
/** Shaft radius (Plan B's is the rescue shaft the capsule rides). */
export const SHAFT_R = 0.36;
/** How far down its own hole each big drill is (0..1). */
export const planFrac = (k: number, f: number): number => {
  const start = BEATS.race - 14;
  const end = [BEATS.breaks + 40, BEATS.breaks, BEATS.breaks + 60][k];
  return easeInOut(progress(f, [start, end]));
};
/** The race as the HUD shows it: share of the way to the shelter. */
export const planProgress = (k: number, f: number): number => PLANS[k].reach * planFrac(k, f);
/** Plan B's bit (y of its face): down the shaft, then through the shelter roof on "breaks". */
export const planBitY = (f: number): number => {
  const y = lerp(TOP, SH.ceil + 0.35, planFrac(1, f));
  return f < BEATS.breaks - 2 ? y : lerp(SH.ceil + 0.35, SH.ceil - 0.5, easeInOut(progress(f, [BEATS.breaks - 2, BEATS.breaks + 8])));
};
/** The rigs arrive on "three giant drills". */
export const rigUp = (k: number, f: number): number => progress(f, [BEATS.three - 2 + k * 7, BEATS.three + 12 + k * 7]);

// ---------------------------------------------------------------------------
// The camp (ground at y = TOP)
// ---------------------------------------------------------------------------
export const SURF = {
  cut: FACE,
  /** The winch stands over Plan B's shaft. */
  winch: SH.planB[0],
  probe: SH.probeAt[0],
};

/** How light it is at the camp (1 = day, 0 = night). */
export const daylight = (f: number): number => {
  if (f < SHOTS.night || f >= SHOTS.end) return 1;
  if (f < BEATS.oneByOne + 10) return 0;
  const up = easeInOut(progress(f, [BEATS.oneByOne + 10, BEATS.all33 + 10]));
  const dusk = easeInOut(progress(f, [BEATS.last - 6, BEATS.foremanUp]));
  return up * (1 - 0.7 * dusk);
};

/** The Fenix capsule: total length, the cabin floor and roof above its bottom, radius. */
export const CAP = { len: 3.9, cabin0: 1.05, cabin1: 2.95, r: 0.27 };
/** Capsule bottom when it has arrived: the cabin floor level with the ground at the collar. */
export const ARRIVE = -CAP.cabin0;
const DEEP = -5.4;

/**
 * Arrival frames at the top (d2/d3): the first man, three more as the night turns to day, and
 * the foreman last. Each later ride drops back down after the previous rider is out.
 */
const A1 = BEATS.oneByOne + 2;
const A2 = A1 + 46;
const A3 = A2 + 46;
export const ARRIVALS = [BEATS.ground + 4, A1, A2, A3, Math.max(BEATS.foremanUp + 6, A3 + 46)];

/** Capsule bottom height above the camp's ground (negative = down the shaft). */
export const capsuleY = (f: number): number => {
  // d1: hanging under the winch, lowered into the shaft, wheels on the walls, and stopped hard
  // ("jams").
  if (f < SHOTS.night) {
    const t = progress(f, [BEATS.phoenix + 8, BEATS.jams]);
    const jolt = f >= BEATS.jams ? 0.05 * Math.exp(-(f - BEATS.jams) / 3) * Math.cos((f - BEATS.jams) * 1.4) : 0;
    return lerp(1.25, -4.6, t * t * (3 - 2 * t) * 0.35 + t * 0.65) + jolt;
  }
  // d2: rising out of the ground with the first man.
  if (f < ARRIVALS[1] - 24) return lerp(DEEP - 1.5, ARRIVE, easeInOut(progress(f, [BEATS.rises - 36, ARRIVALS[0]])));
  // d3: shuttling.
  for (let k = 1; k < ARRIVALS.length; k++) {
    const t = ARRIVALS[k];
    if (f < t - 24) return ARRIVE;
    if (f < t - 12) return lerp(ARRIVE, DEEP, easeInOut(progress(f, [t - 24, t - 12])));
    if (f < t) return lerp(DEEP, ARRIVE, easeInOut(progress(f, [t - 12, t])));
  }
  return ARRIVE;
};
/** Hatch open amount (0..1) for the d1 demonstration. */
export const hatchOpen = (f: number): number => (f < SHOTS.night ? easeInOut(progress(f, [BEATS.hatch - 2, BEATS.hatch + 6])) : 0);
/** The cage door at the cabin front, open after each arrival. */
export const doorOpen = (f: number): number => {
  if (f < SHOTS.night) return 0;
  let o = 0;
  for (const a of ARRIVALS) o = Math.max(o, easeInOut(progress(f, [a, a + 5])) * (1 - easeInOut(progress(f, [a + 18, a + 22]))));
  return o;
};

// ---------------------------------------------------------------------------
// Actors: positions (feet), facing and acting, as keyed paths. A key with `cut` jumps there.
// ---------------------------------------------------------------------------
export interface Key {
  f: number;
  x: number;
  z: number;
  y?: number;
  cut?: boolean;
}
export interface Mover {
  pos: (f: number) => V3;
  yaw: (f: number) => number;
}

const angleLerp = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Eased moves between keys (constant pace through the middle of a long walk), jumps on cuts. */
export const mover = (keys: Key[], yaws: Array<[number, number]>): Mover => ({
  pos: (f) => {
    let k = 0;
    while (k + 1 < keys.length && keys[k + 1].f <= f) k++;
    const a = keys[k];
    const b = keys[k + 1];
    if (!b || b.cut || f < a.f) return [a.x, a.y ?? 0, a.z];
    const t = progress(f, [a.f, b.f]);
    // Walks: ease in and out over the first and last ~12 frames, constant in between.
    const len = b.f - a.f;
    const e = Math.min(0.5, 12 / Math.max(1, len));
    const u = t < e ? (t * t) / (2 * e * (1 - e)) : t > 1 - e ? 1 - ((1 - t) * (1 - t)) / (2 * e * (1 - e)) : (t - e / 2) / (1 - e);
    return [lerp(a.x, b.x, u), lerp(a.y ?? 0, b.y ?? 0, u), lerp(a.z, b.z, u)];
  },
  yaw: (f) => {
    let k = 0;
    while (k + 1 < yaws.length && yaws[k + 1][0] <= f) k++;
    const a = yaws[k];
    const b = yaws[k + 1];
    if (!b || f < a[0]) return a[1];
    // Turn over the last 10 frames before the key.
    return angleLerp(a[1], b[1], easeInOut(progress(f, [b[0] - 10, b[0]])));
  },
});

/** Step function of acting inputs; the animator eases between them. Everything is relaxed. */
export const acting = (steps: Array<[number, Partial<PaladinInput>]>) => (f: number): Partial<PaladinInput> => {
  let cur: Partial<PaladinInput> = {};
  for (const [at, s] of steps) if (f >= at) cur = s;
  return { relaxed: true, ...cur };
};
export const arms = (a: ArmsPose): Partial<PaladinInput> => ({ arms: a });
export const lookUp = (p = 0.65): Partial<PaladinInput> => ({ aimPitch: p });
export const sitOn = (seatY: number, a?: ArmsPose): Partial<PaladinInput> => ({ stance: "sit", seatY, arms: a });

/** Facing: 0 = toward the camera (+z), PI = toward the back wall, +PI/2 = toward +x. */
export const FACE_TO = { camera: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
/** Facing from (x, z) toward a point. */
export const toward = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z);
