import type { PaladinInput } from "../../artifacts/characters/paladin";
import { createCues, easeInOut, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Priest Hole (9:16 short): "How a staircase becomes a priest hole". Beats, the house's layout,
 * shots and every bit of motion shared by Scene.tsx, actors.ts, camera.ts, config.ts and the HUD.
 * Pure functions of the frame; every beat is `w(line, word) ± n` from the voiced narration
 * (scripts/priest-hole-audio.py).
 *
 * One house, cut open like a doll's house: the front wall is removed at z = 0 and we look in from
 * +z. x runs left to right along the hall, y is up (ground floor 0, upper floor FLOOR2). The
 * staircase climbs along the back wall from the hall up to the landing; the hide is the space
 * under its high end, with a second, real chamber under the landing behind it. The thick stone
 * stone column in the middle of the house is the old garderobe (toilet) shaft, from the roof down
 * into the earth, cut open at the front; the kitchen is on the right (the reference's plan).
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";

export type V3 = [number, number, number];

// ---------------------------------------------------------------------------
// The house
// ---------------------------------------------------------------------------
/** Inside faces of the side walls, and the back wall. The front is cut away at z = 0. */
export const X_L = -6.2;
export const X_R = 5.4;
export const BACK = -2.6;
/** Outer faces (stone side walls 0.5 thick). */
export const X_L_OUT = -6.7;
export const X_R_OUT = 5.9;
export const BACK_OUT = -2.9;
/** Upper floor (top of the boards), the ground floor's ceiling, the eaves and the ridge. */
export const FLOOR2 = 3.0;
export const CEIL1 = 2.8;
export const EAVES = 5.6;
export const RIDGE = 7.9;

/** The front door, in the back wall of the entrance hall (hinged on its left edge). */
export const DOOR = { x: -5.45, w: 1.0, h: 2.15 };

/** The staircase: 15 risers along the back wall, from the hall up to the landing. */
export const STAIR = { x0: -2.6, rise: 0.2, going: 0.27, n: 15, z0: BACK, z1: -1.6 };
export const STAIR_TOP_X = STAIR.x0 + STAIR.n * STAIR.going;
/** Middle of the stair's width, where people walk. */
export const STAIR_Z = (STAIR.z0 + STAIR.z1) / 2;
/** The trick step: the loose one, then hinged and bolted flush (0-based from the bottom). */
export const HATCH_K = 7;
export const HATCH_X0 = STAIR.x0 + HATCH_K * STAIR.going;
export const HATCH_X1 = HATCH_X0 + STAIR.going;
export const HATCH_Y = (HATCH_K + 1) * STAIR.rise;
/** The crooked step everyone trips on, low on the flight (built that way on purpose). */
export const CROOK_K = 3;
export const CROOK_X = STAIR.x0 + (CROOK_K + 0.5) * STAIR.going;
export const CROOK_Y = (CROOK_K + 1) * STAIR.rise;
/** Height of the tread at x (a step function), and a smooth ramp for feet that walk up it. */
export const treadY = (x: number): number => {
  const k = Math.floor((x - STAIR.x0) / STAIR.going);
  if (k < 0) return 0;
  return Math.min(STAIR.n, k + 1) * STAIR.rise;
};
export const stairFoot = (x: number): number => Math.max(0, Math.min(FLOOR2, ((x - STAIR.x0) / STAIR.going) * STAIR.rise + 0.06));
/** Underside of the stairs (the hide's sloping ceiling). */
export const soffitY = (x: number): number => ((x - STAIR.x0) / STAIR.going) * STAIR.rise - 0.24;

/** The stone column in the middle of the house (the stairs end against it), and the shaft inside. */
export const COLUMN = { x0: STAIR_TOP_X, x1: STAIR_TOP_X + 0.95, z1: -0.75, top: RIDGE + 0.5, bottom: -1.6 };
export const SHAFT = { x0: COLUMN.x0 + 0.17, x1: COLUMN.x1 - 0.17, z0: -2.3, z1: COLUMN.z1, pit: -1.4, niche: FLOOR2 + 2.0 };
export const SHAFT_X = (SHAFT.x0 + SHAFT.x1) / 2;
export const SHAFT_Z = -1.5;
/** The hide under the stairs (later the decoy), and the real hide behind its back end: the foot of the shaft. */
export const HIDE = { x0: -0.75, x1: STAIR_TOP_X, z0: BACK, z1: STAIR.z1 };
export const REAL = { x0: COLUMN.x0, x1: COLUMN.x1, z0: SHAFT.z0, z1: STAIR.z1 };
/** The small door through the column's wall from the hide into the shaft (in the x = REAL.x0 plane). */
export const SECRET_DOOR = { z0: -2.2, z1: -1.72, h: 1.0 };

/** The kitchen: the table, two benches and the window in the back wall. */
export const TABLE = { x: 3.85, z: -1.35, w: 0.8, d: 0.9, h: 0.76 };
export const BENCH_H = 0.46;
export const KITCHEN_WINDOW = { x: 3.2, y0: 1.25, y1: 2.25, w: 0.8 };
/** The kitchen hearth against the right wall. */
export const HEARTH = { x0: 4.7, x1: X_R };
/** Wainscot panels in the upstairs room (over the entrance hall) that the hunters tear off. */
export const PANELS = [-5.95, -5.15, -4.35, -3.55].map((x) => ({ x0: x, x1: x + 0.75, y0: FLOOR2 + 0.12, y1: FLOOR2 + 0.8, floor: FLOOR2 }));
/** The same panelling downstairs in the hall, left alone. */
export const HALL_PANELS = [-4.85, -4.3, -3.75, -3.2].map((x) => ({ x0: x, x1: x + 0.5, y0: 0.12, y1: 1.15, floor: 0 }));

/** Hall lane: where people walk on the ground floor (in front of the stairs). */
export const LANE = -0.9;

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // l1: the hook, the gap under the stairs, the loose step
  pounding: w("l1a", "pounding"),
  door: w("l1a", "door"),
  thirty: w("l1a", "thirty"),
  vanish: w("l1a", "vanish"),
  squeeze: w("l1b", "squeeze"),
  under: w("l1b", "under"),
  but1: w("l1b", "But"),
  rattles: w("l1b", "rattles"),
  boot: w("l1b", "boot"),
  // l2: hinge and bolt; the tapping
  hang: w("l2a", "hang"),
  hidden: w("l2a", "hidden"),
  hinge: w("l2a", "hinge"),
  bolt: w("l2a", "bolt"),
  below: w("l2a", "below"),
  hunters: w("l2b", "hunters"),
  tap: w("l2b", "tap"),
  every: w("l2b", "every"),
  panel: w("l2b", "panel"),
  listening: w("l2b", "listening"),
  hollow: w("l2b", "hollow"),
  // l3: brick; the rope
  wall: w("l3a", "wall"),
  brick: w("l3a", "brick"),
  knock: w("l3a", "knock"),
  thuds: w("l3a", "thuds"),
  measure: w("l3b", "measure"),
  rope: w("l3b", "rope"),
  sixty: w("l3b", "Sixty"),
  outside: w("l3b", "outside"),
  fiftyFive: w("l3b", "Fifty-five"),
  inside: w("l3b", "inside"),
  // l4: the shaft; the week; the reed
  climb: w("l4a", "climb"),
  nobody: w("l4a", "nobody"),
  toilet: w("l4a", "toilet"),
  shaft: w("l4a", "shaft"),
  leave: w("l4b", "leave"),
  camp: w("l4b", "camp"),
  kitchen: w("l4b", "kitchen"),
  week: w("l4b", "week"),
  starve: w("l4b", "starve"),
  friend: w("l4c", "friend"),
  pours: w("l4c", "pours"),
  soup: w("l4c", "soup"),
  reed: w("l4c", "reed"),
  floor: w("l4c", "floor"),
  tastes: w("l4c", "tastes"),
  likeReed: w("l4c", "reed", 1),
  but4: w("l4c", "But"),
  hot: w("l4c", "hot"),
  // l5: the panels; the double hide; the search
  tearing: w("l5a", "tearing"),
  panels: w("l5a", "panels"),
  walls: w("l5a", "walls"),
  give: w("l5b", "give"),
  empty: w("l5b", "empty"),
  real: w("l5b", "real"),
  secretDoor: w("l5b", "door"),
  back: w("l5b", "back"),
  double: w("l5b", "double"),
  findIt: w("l5c", "find"),
  cheer: w("l5c", "cheer"),
  nothing: w("l5c", "nothing"),
  cobwebs: w("l5c", "cobwebs"),
  thump: w("l5c", "thump"),
  march: w("l5c", "march"),
  candlestick: w("l5c", "candlestick"),
  // l6: the crooked step; the cat; the candle
  crooked: w("l6a", "crooked"),
  trips: w("l6a", "trips"),
  mistake: w("l6a", "mistake"),
  nobodySuspects: w("l6a", "Nobody"),
  staircase: w("l6a", "staircase"),
  cat: w("l6b", "cat"),
  cushion: w("l6b", "cushion"),
  light: w("l6b", "light"),
  candle: w("l6b", "candle"),
  quiet: w("l6b", "quiet"),
  // The stamp
  congrats: w("end", "Congratulations"),
};
const B = BEATS;

// ---------------------------------------------------------------------------
// Shots: each starts on a hard cut (camera.ts has the moves inside them).
// ---------------------------------------------------------------------------
export const SHOTS = {
  open: 0,
  /** Up the stairs, in under them. */
  stairs: lineStart("l1b") - 6,
  /** The door bursts in, the hunter crosses the hall. */
  burst: 0,
  /** Close on the step as the boot lands. */
  step: 0,
  hinge: lineStart("l2a") - 8,
  tap: lineStart("l2b") - 6,
  brick: lineStart("l3a") - 8,
  measure: lineStart("l3b") - 8,
  shaft: lineStart("l4a") - 10,
  kitchen: lineStart("l4b") - 8,
  /** The priest alone in the shaft as the week drags on (the kitchen shot never shows him). */
  starve: 0,
  reed: lineStart("l4c") - 10,
  drink: 0,
  /** Inside the hide, looking up at the step's underside as the bolt goes home. */
  boltShot: 0,
  tear: lineStart("l5a") - 10,
  decoy: lineStart("l5b") - 8,
  peek: 0,
  twoRooms: 0,
  search: lineStart("l5c") - 10,
  thumpShot: 0,
  exit: 0,
  crooked: lineStart("l6a") - 10,
  catShot: lineStart("l6b") - 10,
  candleShot: 0,
  end: lineStart("end") - 10,
};
// ---------------------------------------------------------------------------
// Props keyed to the beats
// ---------------------------------------------------------------------------
/** Fists on the door: four blows on "pounding", two more on "thirty". */
export const POUNDS = [B.pounding, B.pounding + 8, B.pounding + 17, B.pounding + 25, B.thirty - 6, B.thirty + 2];
/** The priest's run, the lift of the loose step, the drop in. */
export const P_RUN = B.vanish + 2;
export const P_ON_STEP = B.squeeze - 2;
export const LIFT1: [number, number] = [P_ON_STEP, P_ON_STEP + 8];
export const DROP1: [number, number] = [P_ON_STEP + 6, P_ON_STEP + 22];
export const CLOSE1: [number, number] = [DROP1[1] + 1, DROP1[1] + 6];
/** The hunter's climb and the step under his boot. */
export const H1_ON_STEP = B.rattles - 1;
/** The hinge goes on (step off, hinge in, step back), then the demonstration and the bolt. */
export const HINGE_ON: [number, number] = [B.hang - 2, B.hidden + 4];
export const LIFT2: [number, number] = [B.hinge, B.hinge + 8];
export const DROP2: [number, number] = [B.hinge + 6, B.hinge + 22];
export const CLOSE2: [number, number] = [DROP2[1] + 2, DROP2[1] + 9];
export const BOLT: [number, number] = [Math.max(CLOSE2[1] + 2, B.bolt - 2), Math.max(CLOSE2[1] + 8, B.bolt + 4)];
/** Knocks on the panel: hollow (l2b), then solid (l3a). */
export const KNOCKS_HOLLOW = [B.tap, B.every, B.panel, B.listening, B.hollow];
export const KNOCKS_SOLID = [B.knock - 4, B.knock + 6, B.thuds];
/** The brick lining: courses go up from "wall" to just after "brick". */
export const BRICKS: [number, number] = [B.wall - 4, B.brick + 26];
/** The ropes: outside on "rope" to "Sixty", inside on "outside" to "Fifty-five". */
export const ROPE_OUT: [number, number] = [B.rope - 6, B.sixty];
export const ROPE_IN: [number, number] = [B.outside + 6, B.fiftyFive];
/** Into the shaft and down it. */
export const SHAFT_IN = B.climb;
export const SHAFT_DOWN: [number, number] = [B.climb + 10, B.nobody + 14];
/** A week of days: the window goes round three times; the candles burn down. */
export const WEEK: [number, number] = [B.week - 6, lineEnd("l4b") + 14];
export const daylight = (f: number): number => {
  if (f < WEEK[0] || f > WEEK[1]) return 1;
  const t = progress(f, WEEK);
  return 0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 3);
};
/** The reed slides down, the soup goes down it, the drink. */
export const REED_IN: [number, number] = [B.friend + 6, B.pours + 4];
export const POUR: [number, number] = [B.soup - 4, B.floor + 18];
/** Panels torn off (each on a sword's pry). */
export const H1_PRY = [B.tearing - 2, B.walls - 4];
export const H2_PRY = [B.panels - 6, B.walls + 8];
/** Contact comes ~12 frames after a swing starts (the rig's windup + strike). */
export const SWING_HIT = 12;
export const PANEL_OFF = [H1_PRY[0] + SWING_HIT, H2_PRY[0] + SWING_HIT, H1_PRY[1] + SWING_HIT, H2_PRY[1] + SWING_HIT];
/** The secret door opening on "door", shut again before "double". */
export const SECRET_OPEN: [number, number] = [B.secretDoor - 6, B.back - 4];
export const SECRET_SHUT: [number, number] = [B.back + 8, B.back + 18];
/** The search: the hatch forced, the cheer, into the decoy, the thump, the candlestick out the door. */
export const FORCE = B.findIt + 2;
export const THUMP_HIT = B.thump + 3;
export const GRAB = B.march - 16;
export const OUT_DOOR = B.candlestick + 18;
/** The trip on the crooked step. */
export const TRIP = B.trips;
/** The cushion pops in under the cat; the candle lights. */
export const CUSHION_IN = B.cushion - 2;
export const CANDLE_LIT = B.candle - 2;

// ---------------------------------------------------------------------------
// Shot boundaries that depend on the props
// ---------------------------------------------------------------------------
/** The door bursts as the priest's hatch closes; the hunter needs ~60 frames to reach the step. */
export const BURST = B.rattles - 62;
SHOTS.burst = Math.max(CLOSE1[1], BURST - 2);
SHOTS.step = B.rattles - 22;
SHOTS.drink = B.tastes - 22;
SHOTS.starve = w("l4b", "waiting") - 4;
SHOTS.boltShot = CLOSE2[0] - 2;
SHOTS.peek = B.real - 10;
SHOTS.twoRooms = B.double - 10;
SHOTS.thumpShot = B.thump - 20;
SHOTS.exit = B.march - 22;
SHOTS.candleShot = B.light - 6;

/** Camera cuts in order (the humans' simulation may restart on each). */
export const CUTS: number[] = Object.keys(SHOTS)
  .map((k) => SHOTS[k as keyof typeof SHOTS])
  .filter((f) => f > 0)
  .sort((a, b) => a - b);
export const shotEnd = (start: number): number => {
  for (const c of CUTS) if (c > start) return c;
  return DURATION;
};

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------
export interface Key {
  f: number;
  x: number;
  y?: number;
  z: number;
  /** Jump straight to the next key (a cut) instead of moving to it. */
  cut?: boolean;
}

export interface Mover {
  pos: (f: number) => V3;
  yaw: (f: number) => number;
}

const angleLerp = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Keyed path (eased in and out at each key) and keyed facing (turns over the 8 frames before a key). */
export const mover = (keys: Key[], yaws: Array<[number, number]>): Mover => ({
  pos: (f) => {
    let k = 0;
    while (k + 1 < keys.length && keys[k + 1].f <= f) k++;
    const a = keys[k];
    const b = keys[k + 1];
    if (!b || a.cut || f < a.f) return [a.x, a.y ?? 0, a.z];
    const t = progress(f, [a.f, b.f]);
    const len = b.f - a.f;
    const e = Math.min(0.5, 8 / Math.max(1, len));
    const u = t < e ? (t * t) / (2 * e * (1 - e)) : t > 1 - e ? 1 - ((1 - t) * (1 - t)) / (2 * e * (1 - e)) : (t - e / 2) / (1 - e);
    return [lerp(a.x, b.x, u), lerp(a.y ?? 0, b.y ?? 0, u), lerp(a.z, b.z, u)];
  },
  yaw: (f) => {
    let k = 0;
    while (k + 1 < yaws.length && yaws[k + 1][0] <= f) k++;
    const a = yaws[k];
    const b = yaws[k + 1];
    if (!b || f < a[0]) return a[1];
    return angleLerp(a[1], b[1], easeInOut(progress(f, [b[0] - 8, b[0]])));
  },
});

/** Step function of acting inputs; the animator eases between them. */
export const acting = (steps: Array<[number, Partial<PaladinInput>]>, relaxed = true) => (f: number): Partial<PaladinInput> => {
  let cur: Partial<PaladinInput> = {};
  for (const [at, s] of steps) if (f >= at) cur = s;
  return { relaxed, ...cur };
};

/** Facing: 0 = toward the camera (+z), PI = toward the back wall, +PI/2 = toward +x. */
export const FACE_TO = { camera: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
