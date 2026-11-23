import type { ArmsPose, PaladinInput } from "../../artifacts/characters/paladin";
import { createCues, easeInOut, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Cave Rescue (9:16 short): "18 days inside a mountain", our retelling of the 2018 Tham Luang
 * cave rescue. Beats, the cave's layout, water levels, shots and every bit of motion shared by
 * Scene.tsx, camera.ts, config.ts and the HUD. Pure functions of the frame; every beat is
 * `w(line, word) ± n` from the voiced narration (scripts/cave-rescue-audio.py).
 *
 * One world, cut open like an ant farm: the mountain's face stands at z = FACE and the cave is
 * carved `DEPTH` deep behind it. The cave winds down through the mountain on three levels (the
 * 4 km squeezed into ~90 m of passage so the people still read in the wide shots): the mouth and
 * the dry chamber on level 1, then U-bends (sumps) that flood, ramps down, and the pool and the
 * muddy ledge at the bottom of level 3. Each passage is a floor line with a clear height.
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
  rain: w("a1", "rain"),
  came: w("a1", "came"),
  cave: w("a1", "cave"),
  walked: w("a1", "walked"),
  practice: w("a1", "practice"),
  filling: w("a1", "filling"),
  water: w("a1", "water"),
  behind: w("a1", "behind"),
  twelve: w("a2", "Twelve"),
  coach: w("a2", "coach"),
  climb: w("a2", "climb"),
  deeper: w("a2", "deeper"),
  four: w("a2", "four"),
  kilometers: w("a2", "kilometers"),
  mountain: w("a2", "mountain"),
  muddy: w("a2", "muddy"),
  ledge: w("a2", "ledge"),
  flood: w("a2", "flood"),
  noFood: w("a3", "no"),
  food: w("a3", "food"),
  drink: w("a3", "drink"),
  dripping: w("a3", "dripping"),
  rock: w("a3", "rock"),
  coachTeaches: w("a3", "coach"),
  sit: w("a3", "sit"),
  still: w("a3", "still"),
  breathe: w("a3", "breathe"),
  slowly: w("a3", "slowly"),
  // Found
  outside: w("b1", "Outside"),
  pumps: w("b1", "pumps"),
  day: w("b1", "day"),
  night: w("b1", "night"),
  divers: w("b1", "divers"),
  push: w("b1", "push"),
  murky: w("b1", "muddy"),
  see: w("b1", "see"),
  dayTen: w("b2", "ten"),
  light: w("b2", "light"),
  outOf: w("b2", "out"),
  surface: w("b2", "water"),
  two: w("b2", "Two"),
  british: w("b2", "British"),
  question: w("b2", "question"),
  how: w("b2", "How"),
  ofYou: w("b2", "you"),
  thirteen: w("b3", "Thirteen"),
  all: w("b3", "All"),
  alive: w("b3", "alive"),
  // The way out
  wayOut: w("c1", "way"),
  hours: w("c1", "hours"),
  diving: w("c1", "diving"),
  flooded: w("c1", "flooded"),
  barely: w("c1", "barely"),
  body: w("c1", "body"),
  total: w("c1", "total"),
  darkness: w("c1", "darkness"),
  air: w("c2", "air"),
  thin: w("c2", "thin"),
  volunteer: w("c2", "volunteer"),
  dies: w("c2", "dies"),
  backFrom: w("c2", "back"),
  laying: w("c2", "laying"),
  tanks: w("c2", "tanks"),
  route: w("c2", "route"),
  musk: w("c3", "Musk's"),
  kidSub: w("c3", "submarine"),
  rocket: w("c3", "rocket"),
  fly: w("c3", "fly"),
  practical: w("c3", "practical"),
  used: w("c3", "used"),
  // Out
  doctors: w("d1", "doctors"),
  sleep: w("d1", "sleep"),
  mask: w("d1", "mask"),
  stretcher: w("d1", "stretcher"),
  wrapped: w("d1", "wrapped"),
  pulls: w("d1", "pulls"),
  cargo: w("d1", "cargo"),
  wave1: w("d2", "Four"),
  firstDay: w("d2", "day"),
  wave2: w("d2", "Four", 1),
  second: w("d2", "second"),
  last: w("d2", "last"),
  wave3: w("d2", "four", 2),
  lastCoach: w("d2", "coach"),
  // Afterwards
  caver: w("e1", "caver"),
  stunt: w("e1", "stunt"),
  pedo: w("e1", "pedo"),
  deletes: w("e1", "deletes"),
  apologizes: w("e1", "apologizes"),
  y2019: w("e1", "twenty"),
  jury: w("e1", "jury"),
  defamation: w("e1", "defamation"),
  eighteen: w("end", "Eighteen"),
  endKm: w("end", "kilometers"),
  every: w("end", "every"),
  home: w("end", "home"),
};

// ---------------------------------------------------------------------------
// Shots (each starts on a camera cut or whip; camera.ts has the moves inside them)
// ---------------------------------------------------------------------------
export const SHOTS = {
  /** Outside in the rain, the brown water pouring into the mouth, then the boys inside. */
  open: 0,
  inside: BEATS.cave - 12,
  /** Out to the whole mountain: the way in, and the flood filling the bends behind them. */
  whole: lineStart("a2") - 2,
  /** Into the ledge: the boys come up out of the pool onto the mud. */
  ledge: BEATS.muddy - 16,
  /** Outside: the pumps, day and night. */
  pumps: lineStart("b1") - 4,
  /** Under water with a diver in the first bend. */
  dive: BEATS.divers - 4,
  /** Day 10: the light in the pool, the divers, the question. */
  found: lineStart("b2") - 4,
  /** The way out, from the ledge back up the cave, to the tightest bend. */
  wayOut: lineStart("c1") - 4,
  /** The chamber's air. */
  air: lineStart("c2") - 4,
  /** The volunteer laying tanks. */
  tanks: BEATS.volunteer - 8,
  /** Outside: the kid-sized submarine flown in, and left on its cradle. */
  sub: lineStart("c3") - 4,
  /** Sedated, masked, wrapped on the ledge. */
  sleep: lineStart("d1") - 4,
  /** Towed out through the bottom bend. */
  tow: BEATS.pulls - 14,
  /** Out, in three waves. */
  out: lineStart("d2") - 4,
  /** Afterwards: the submarine by the mouth in the sun, the caver, the tweet, the verdict. */
  after: lineStart("e1") - 4,
  /** The mouth in the sun, and back out to the whole mountain. */
  end: lineStart("end") - 4,
};
export type ShotId = keyof typeof SHOTS;

const SHOT_ORDER = (Object.keys(SHOTS) as ShotId[]).sort((a, b) => SHOTS[a] - SHOTS[b]);
export const shotEnd = (id: ShotId): number => {
  const i = SHOT_ORDER.indexOf(id);
  return i + 1 < SHOT_ORDER.length ? SHOTS[SHOT_ORDER[i + 1]] : DURATION;
};

// ---------------------------------------------------------------------------
// The cave
// ---------------------------------------------------------------------------
/** The cut face (z) and how deep the passages go behind it. */
export const FACE = 1.6;
export const DEPTH = 3.6;
export const BACK = FACE - DEPTH;

/** A passage: floor points (x, y) and the clear height above each (vertical). */
export type Passage = Array<[number, number, number]>;

/** Level 1: the mouth at the cliff (x = MOUTH_X), the dry chamber, the first bend, ramp down. */
export const MOUTH_X = -3.4;
export const P1: Passage = [
  [MOUTH_X, 0, 5.0],
  [2.5, 0, 6.2],
  [9.5, 0, 6.2],
  [11.0, -2.6, 2.2],
  [15.5, -2.6, 2.2],
  [17.0, 0, 2.8],
  [20.0, 0, 3.0],
  [28.0, -8, 3.0],
];
/** Level 2, back the other way: the long tight bend, ramp down. */
export const P2: Passage = [
  [28.6, -8, 3.0],
  [23.0, -8, 3.0],
  [21.5, -10.2, 1.6],
  [16.0, -10.2, 1.15],
  [14.5, -8, 2.4],
  [6.0, -8, 3.0],
  [-4.0, -18, 3.0],
];
/** Level 3: the last bend, the pool, the mud bank and the ledge. */
export const P3: Passage = [
  [-4.6, -18, 3.0],
  [2.5, -17.4, 3.0],
  [4.0, -20, 1.5],
  [7.0, -20, 1.5],
  [8.5, -19.6, 5.0],
  [10.5, -19.6, 5.6],
  [14.0, -17.2, 5.4],
  [20.0, -16.8, 4.6],
  [23.0, -16.8, 3.2],
];
export const PASSAGES = [P1, P2, P3];

/** The mountain's outline above the cut (x, y), left to right; the cliff over the mouth is vertical. */
export const PROFILE: V2[] = [
  [-80, 0],
  [MOUTH_X, 0],
  [MOUTH_X, 7.5],
  [0, 10.5],
  [6, 15],
  [14, 21],
  [22, 24],
  [30, 22],
  [38, 16],
  [48, 8],
  [62, 2],
  [110, 0],
];
export const BOUNDS = { x0: -80, x1: 110, y0: -40, y1: 60 };

/** Floor height of a passage at x (between its first and last point, on the leg that spans x). */
export const floorOf = (p: Passage, x: number, from = 0): number => {
  for (let i = from; i + 1 < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[i + 1];
    if ((x >= x0 && x <= x1) || (x <= x0 && x >= x1)) return lerp(y0, y1, (x - x0) / (x1 - x0 || 1));
  }
  return p[p.length - 1][1];
};
/** Level 3's floor (the ledge chamber), and level 1's. */
export const floor3 = (x: number): number => floorOf(P3, x);
export const floor1 = (x: number): number => (x <= MOUTH_X ? 0 : floorOf(P1, x));

/** Stalactite over the ledge where the drip comes down. */
export const DRIP: V3 = [18.85, -12.3, -1.25];

// ---------------------------------------------------------------------------
// Water: a surge along level 1 in the opening, then each bend fills to its level.
// ---------------------------------------------------------------------------
export interface Water {
  passage: number;
  x0: number;
  x1: number;
  level: number;
  /** 0..1 murk (more opaque) */
  murk: number;
}
/** Where the surge's front is on level 1's floor (x). */
export const surgeFront = (f: number): number => lerp(MOUTH_X - 2, 6.6, Math.pow(progress(f, [BEATS.practice - 10, SHOTS.whole]), 0.6));
export const BASIN = {
  a: { passage: 0, x0: 9.5, x1: 17.0, bottom: -2.6, top: -0.15, span: [BEATS.twelve + 10, BEATS.deeper + 10] as V2 },
  b: { passage: 1, x0: 14.5, x1: 23.0, bottom: -10.2, top: -8.3, span: [BEATS.deeper - 8, BEATS.mountain - 10] as V2 },
  c: { passage: 2, x0: 2.5, x1: 14.0, bottom: -20, top: -18.0, span: [BEATS.mountain - 40, BEATS.flood] as V2 },
};
export type BasinId = keyof typeof BASIN;
export const basinLevel = (id: BasinId, f: number): number => {
  const b = BASIN[id];
  return lerp(b.bottom - 0.05, b.top, easeInOut(progress(f, b.span)));
};
/** Every body of water on this frame. */
export const waters = (f: number): Water[] => {
  const list: Water[] = [];
  const front = surgeFront(f);
  if (front > MOUTH_X) list.push({ passage: 0, x0: MOUTH_X, x1: front, level: 0.42, murk: 0.6 });
  (Object.keys(BASIN) as BasinId[]).forEach((id) => {
    const b = BASIN[id];
    const level = basinLevel(id, f);
    if (level > b.bottom) list.push({ passage: b.passage, x0: b.x0, x1: b.x1, level, murk: id === "a" ? 0.85 : 0.6 });
  });
  return list;
};
/** The waterline on the mud bank (x), with the pool full. */
export const WATERLINE = 10.5 + ((BASIN.c.top + 19.6) / (-17.2 + 19.6)) * 3.5;

// ---------------------------------------------------------------------------
// The route: walking height along every floor, from the mouth to the ledge (camera, dots, trace).
// ---------------------------------------------------------------------------
const ROUTE_PTS: V2[] = ([] as V2[]).concat(
  P1.map(([x, y]) => [x, y] as V2),
  P2.slice(1).map(([x, y]) => [x, y] as V2),
  P3.slice(1, 7).map(([x, y]) => [x, y] as V2),
  [[18.6, floor3(18.6)]]
);
const ROUTE_LEN: number[] = [0];
for (let i = 1; i < ROUTE_PTS.length; i++) ROUTE_LEN.push(ROUTE_LEN[i - 1] + Math.hypot(ROUTE_PTS[i][0] - ROUTE_PTS[i - 1][0], ROUTE_PTS[i][1] - ROUTE_PTS[i - 1][1]));
export const ROUTE_TOTAL = ROUTE_LEN[ROUTE_LEN.length - 1];
/** A point `t` (0 = the mouth, 1 = the ledge) of the way along the route, on the floor. */
export const routeAt = (t: number): V2 => {
  const s = Math.max(0, Math.min(1, t)) * ROUTE_TOTAL;
  let i = 1;
  while (i < ROUTE_LEN.length - 1 && ROUTE_LEN[i] < s) i++;
  const k = (s - ROUTE_LEN[i - 1]) / (ROUTE_LEN[i] - ROUTE_LEN[i - 1] || 1);
  return [lerp(ROUTE_PTS[i - 1][0], ROUTE_PTS[i][0], k), lerp(ROUTE_PTS[i - 1][1], ROUTE_PTS[i][1], k)];
};
/** The route as points (for the trace). */
export const ROUTE: V2[] = ROUTE_PTS;
/** How far along the route a point x on a passage is (by nearest route point). */
export const routeT = (x: number, y: number): number => {
  let best = 0;
  let d = Infinity;
  for (let k = 0; k <= 400; k++) {
    const [px, py] = routeAt(k / 400);
    const dd = Math.hypot(px - x, py - y);
    if (dd < d) {
      d = dd;
      best = k / 400;
    }
  }
  return best;
};

/** The boys' torches running down the route in the wide shot (0..1), from the dry chamber. */
export const TRACE_T0 = routeT(7.0, 0);
export const traceT = (f: number): number => lerp(TRACE_T0, 1, easeInOut(progress(f, [SHOTS.whole + 6, BEATS.muddy - 22])));

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------
/** Outside: 1 = day, 0 = night. The b1 line runs a day and a night of pumping. */
export const daylight = (f: number): number => {
  if (f >= SHOTS.pumps && f < SHOTS.dive) return 1 - 0.85 * easeInOut(progress(f, [BEATS.day + 4, BEATS.night + 6]));
  return 1;
};
/** Rain outside (0..1): the monsoon until the rescue is over. */
export const rainAmount = (f: number): number => (f < SHOTS.after ? 1 : 0);
/** Light inside the cut (the fill that lets us see in): dims for the darkness and the dying lamp. */
export const caveLight = (f: number): number => {
  if (f >= SHOTS.found && f < SHOTS.wayOut) return lerp(0.42, 0.7, easeInOut(progress(f, [BEATS.surface, BEATS.thirteen])));
  if (f >= BEATS.total - 6 && f < SHOTS.air) return 1 - 0.96 * easeInOut(progress(f, [BEATS.total - 6, BEATS.darkness + 4]));
  if (f >= SHOTS.air && f < SHOTS.tanks) return 0.55;
  if (f >= SHOTS.tanks && f < SHOTS.sleep) return lerp(0.6, 0.28, easeInOut(progress(f, [BEATS.dies, BEATS.dies + 24])));
  return 1;
};

// ---------------------------------------------------------------------------
// Divers
// ---------------------------------------------------------------------------
/** The lamp of the volunteer: on, flickers, out on "dies". */
export const volunteerLamp = (f: number): number => {
  if (f < BEATS.dies - 2) return 1;
  if (f > BEATS.dies + 14) return 0;
  const k = f - BEATS.dies + 2;
  return [1, 0.2, 0.9, 0.1, 0.7, 0, 0.5, 0, 0.3, 0, 0, 0.15, 0, 0, 0, 0, 0][k] ?? 0;
};
/** Tanks clipped to the line along the route (x, y), level 2 and 3. */
export const TANKS: V3[] = [
  [22.2, -9.6, -0.2],
  [19.0, -9.75, -0.1],
  [15.6, -9.5, 0],
  [11.0, -7.7, -0.6],
  [5.5, -19.6, -0.4],
  [1.0, -17.0, -0.4],
];
/** The guide line: a rope run along the route at hand height, through the flooded bends. */
export const lineY = 0.75;

// ---------------------------------------------------------------------------
// The rescue: bundles out along the route (the wide shot), three waves.
// ---------------------------------------------------------------------------
const WAVE_ENDS = [BEATS.firstDay + 4, BEATS.second + 4, BEATS.lastCoach + 8];
const WAVE_TRIP = 46;
/** Bundle i (0..12) on this frame: how far out (0 = the ledge, 1 = the mouth), or null. */
export const bundleT = (i: number, f: number): number | null => {
  const wave = Math.min(2, Math.floor(i / 4));
  const k = i - wave * 4;
  const end = WAVE_ENDS[wave] + k * 4 - 12;
  const start = end - WAVE_TRIP;
  if (f < start) return 0;
  if (f > end) return 1;
  return easeInOut(progress(f, [start, end]));
};
export const BUNDLES = 13;
/** Rescued so far (the HUD tally). */
export const rescued = (f: number): number => {
  let n = 0;
  for (let i = 0; i < BUNDLES; i++) if ((bundleT(i, f) ?? 0) >= 1) n++;
  return n;
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
export const toward = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z);
