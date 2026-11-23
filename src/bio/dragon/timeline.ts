import { createCues, easeInCubic, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";
import type { Vec3 } from "../../engine/types";
import cues from "./data/narrationCues.json";

/**
 * Dragon ("How a dragon survives its own fire"), the third fantasy-biology short
 * (1080x1920), rebuilt on a realistic rigged dragon (RealDragon) with an x-ray
 * shell, organs on its bones, particle fire, and real-animal inserts (a cow, a
 * Komodo dragon) plus a stove and a rocket for the comparison.
 *
 * Shots, beats and curves shared by Scene.tsx, config.ts and DragonHUD. Pure
 * functions of the frame; every beat is `w(line, word) ± n` from the voiced
 * narration, so re-voicing a line moves the pictures with it.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Beats (keyed to exact voiced words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Hook: fire in the belly cooks the organs
  fire: w("h1", "fire"),
  belly: w("h1", "belly"),
  roast: w("h1", "roast"),
  organs: w("h1", "organs"),
  second: w("h1", "second"),

  // Don't store fire, store fuel
  never: w("h2", "never"),
  store: w("h2", "store"),
  fuel: w("h2", "fuel"),

  // Gut: rotting plants -> methane (like a cow)
  gorge: w("a1", "gorge"),
  rotting: w("a1", "rotting"),
  plants: w("a1", "plants"),
  bacteria: w("a1", "bacteria"),
  ferment: w("a1", "ferment"),
  methane: w("a1", "methane"),
  cow: w("a1", "cow"),

  // Cow burps are tiny
  burps: w("a2", "burps"),
  candle: w("a2", "candle"),

  // Second stomach: muscular pressure tank
  evolve: w("b1", "evolve"),
  secondStomach: w("b1", "second"),
  stomach: w("b1", "stomach"),
  sealed: w("b1", "sealed"),
  muscle: w("b1", "muscle"),
  pumps: w("b1", "pumps"),
  pressure: w("b1", "pressure"),

  // Living bomb
  bomb: w("b2", "bomb"),
  spark: w("b2", "spark"),
  detonates: w("b2", "detonates"),

  // No oxygen inside: inert
  oxygen: w("c1", "oxygen"),
  air: w("c1", "air"),
  tank: w("c1", "tank"),
  inert: w("c1", "inert"),
  lips: w("c1", "lips"),

  // Chemical gland would burn the neck
  light: w("d1", "light"),
  gland: w("d1", "gland"),
  touches: w("d1", "touches"),
  incinerates: w("d1", "incinerates"),
  neck: w("d1", "neck"),

  // Iron teeth: flint and steel
  armor: w("d2", "armor"),
  teeth: w("d2", "teeth"),
  iron: w("d2", "iron"),
  komodo: w("d2", "komodo"),
  snap: w("d2", "snap"),
  jaws: w("d2", "jaws"),
  flint: w("d2", "flint"),
  sparks: w("d2", "sparks"),
  exit: w("d2", "exit"),

  // Flashback
  backwards: w("e1", "backwards"),
  race: w("e1", "race"),
  stream: w("e1", "stream"),
  gullet: w("e1", "gullet"),

  // Gas faster than flame
  clench: w("e2", "clench"),
  tank2: w("e2", "tank"),
  blast: w("e2", "blast"),
  faster: w("e2", "faster"),
  crawl: w("e2", "crawl"),

  // Rocket, stove, the stamp
  rocket: w("end", "rocket"),
  stove: w("end", "stove"),
  face: w("end", "face"),
  congratulations: w("end", "congratulations"),
  walking: w("end", "walking"),
  flamethrower: w("end", "flamethrower"),
} as const;

// ---------------------------------------------------------------------------
// Shots
// ---------------------------------------------------------------------------
export type ShotId =
  | "hook"
  | "hookXray"
  | "fuel"
  | "gorge"
  | "ferment"
  | "cow"
  | "burp"
  | "stomach2"
  | "pressure"
  | "bomb"
  | "oxygen"
  | "lips"
  | "gland"
  | "teeth"
  | "komodo"
  | "strike"
  | "flashback"
  | "clench"
  | "blast"
  | "rocket"
  | "stove"
  | "face"
  | "finale";

const cut = (...xs: number[]) => Math.max(...xs);
export const SHOT_STARTS: [ShotId, number][] = [
  ["hook", 0],
  ["hookXray", BEATS.belly - 10],
  ["fuel", lineStart("h2") - 4],
  ["gorge", lineStart("a1") - 4],
  ["ferment", BEATS.bacteria - 8],
  ["cow", BEATS.cow - 10],
  ["burp", BEATS.burps - 22],
  ["stomach2", lineStart("b1") - 4],
  ["pressure", BEATS.pumps - 8],
  ["bomb", lineStart("b2") - 4],
  ["oxygen", lineStart("c1") - 4],
  ["lips", BEATS.lips - 14],
  ["gland", lineStart("d1") - 4],
  ["teeth", lineStart("d2") - 4],
  ["komodo", BEATS.komodo - 8],
  ["strike", cut(BEATS.snap - 16, BEATS.komodo + 30)],
  ["flashback", lineStart("e1") - 4],
  ["clench", lineStart("e2") - 4],
  ["blast", BEATS.blast - 10],
  ["rocket", BEATS.rocket - 8],
  ["stove", BEATS.stove - 8],
  ["face", cut(BEATS.face - 26, BEATS.stove + 22)],
  ["finale", BEATS.congratulations - 6],
];

export const shotAt = (frame: number): ShotId => {
  let id: ShotId = "hook";
  for (const [s, f] of SHOT_STARTS) if (frame >= f) id = s;
  return id;
};
export const shotStart = (id: ShotId) => SHOT_STARTS.filter((s) => s[0] === id)[0][1];
export const shotEnd = (id: ShotId) => {
  const i = SHOT_STARTS.map((s) => s[0]).indexOf(id);
  return i + 1 < SHOT_STARTS.length ? SHOT_STARTS[i + 1][1] : DURATION;
};
const inShot = (f: number, ...ids: ShotId[]) => ids.indexOf(shotAt(f)) >= 0;

/** Which place is on screen. */
export type Place = "lair" | "pasture" | "islet" | "rocket" | "stove";
export const placeAt = (f: number): Place => {
  const s = shotAt(f);
  if (s === "cow" || s === "burp") return "pasture";
  if (s === "komodo") return "islet";
  if (s === "rocket") return "rocket";
  if (s === "stove") return "stove";
  return "lair";
};

/** Piecewise curve through [frame, value] keys (eased by default). */
export const keyed = (keys: [number, number][], frame: number, ease: (t: number) => number = easeInOut) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i][0]) {
      const [f0, v0] = keys[i - 1];
      const [f1, v1] = keys[i];
      if (f1 === f0) return v1;
      return lerp(v0, v1, ease((frame - f0) / (f1 - f0)));
    }
  }
  return keys[keys.length - 1][1];
};

// ---------------------------------------------------------------------------
// Geometry: the dragon stands at the origin facing +X; scaled model numbers
// (Idle Stand) measured from the rig, so cameras aim at real body parts.
// ---------------------------------------------------------------------------
export const DRAGON_SCALE = 2.5;
export const FPS = 30;
/** World points of the standing dragon (idle), for the camera. */
export const D = {
  head: [1.1, 1.85, 0] as Vec3,
  mouth: [1.55, 1.5, 0] as Vec3,
  throat: [0.85, 1.45, 0] as Vec3,
  tank: [0.72, 1.12, 0] as Vec3,
  gut: [0.23, 1.04, 0] as Vec3,
  chest: [0.4, 1.1, 0] as Vec3,
};
export const HEAP: Vec3 = [1.95, 0, 0.25];

/** Finale walk: start, direction (toward the camera side), pace. */
export const WALK = { dir: -0.2, speed: 0.022 };
export const walkStart = () => shotStart("finale");
export const dragonPos = (f: number): Vec3 => {
  if (f < walkStart()) return [0, 0, 0];
  const s = Math.max(0, f - walkStart()) * WALK.speed;
  return [Math.cos(WALK.dir) * s, 0, -Math.sin(WALK.dir) * s];
};
export const dragonYaw = (f: number) => (f < walkStart() ? Math.PI / 2 : Math.PI / 2 + WALK.dir * easeInOut(progress(f, [walkStart(), walkStart() + 20])));

// ---------------------------------------------------------------------------
// Dragon performance
// ---------------------------------------------------------------------------
/** Clip weights: idle everywhere, walk in the finale. */
export const clipsAt = (f: number) => {
  if (f >= walkStart()) {
    const k = easeInOut(progress(f, [walkStart(), walkStart() + 12]));
    return { idle: 1 - k, walk: k };
  }
  return { idle: 1 };
};

/** X-ray shell (0 hide, 1 glass). */
export const xrayAt = (f: number) => {
  const s = shotAt(f);
  if (s === "hookXray") return easeInOut(progress(f, [shotStart("hookXray"), BEATS.belly + 4]));
  if (s === "fuel" || s === "ferment" || s === "stomach2" || s === "pressure" || s === "oxygen" || s === "flashback" || s === "clench") return 1;
  if (s === "gland") return easeInOut(progress(f, [BEATS.gland - 8, BEATS.gland + 4]));
  if (s === "bomb") return 0.55;
  if (s === "blast") return 1 - easeInOut(progress(f, [BEATS.blast - 2, BEATS.blast + 8]));
  return 0;
};

/** Fire burning in the gut (hook only). */
export const gutFire = (f: number) => {
  if (!inShot(f, "hook", "hookXray", "fuel")) return 0;
  return keyed(
    [
      [BEATS.fire - 4, 0],
      [BEATS.fire + 6, 0.8],
      [BEATS.roast, 1],
      [BEATS.never, 1],
      [BEATS.never + 10, 0],
    ],
    f,
  );
};
export const charAt = (f: number) => (inShot(f, "hook", "hookXray", "fuel") ? keyed([[BEATS.roast - 6, 0], [BEATS.second, 1], [BEATS.never + 4, 1], [BEATS.store, 0]], f) : 0);

/** Methane in the gut: cyan bubbles. */
export const methaneAt = (f: number) => {
  if (shotAt(f) === "fuel") return easeInOut(progress(f, [BEATS.fuel - 4, BEATS.fuel + 10]));
  return keyed([[BEATS.methane - 6, 0], [BEATS.methane + 8, 1]], f);
};
export const fermentAt = (f: number) => (f >= BEATS.fuel - 4 ? 1 : 0);

/** Second stomach: grows on "stomach", fills, squeezes. */
export const tankAt = (f: number) => (f < BEATS.secondStomach - 4 ? 0 : easeOutBack(progress(f, [BEATS.secondStomach - 4, BEATS.stomach + 10])));
export const fillAt = (f: number) => keyed([[BEATS.pumps - 4, 0.2], [BEATS.pressure + 6, 1]], f);
export const squeezeAt = (f: number) => {
  // Rhythmic pumping on "pumps", a hard clench on "clench".
  if (f >= BEATS.pumps - 4 && f < shotStart("bomb")) return 0.45 * Math.max(0, Math.sin((f - BEATS.pumps + 4) * 0.42)) + 0.25 * progress(f, [BEATS.pumps, BEATS.pressure]);
  if (shotAt(f) === "clench" || shotAt(f) === "blast") return keyed([[BEATS.clench - 6, 0.2], [BEATS.clench + 4, 1], [BEATS.blast + 30, 1], [BEATS.blast + 60, 0.6]], f, easeOutCubic);
  return 0;
};

/** Gas flowing up the duct. */
export const flowAt = (f: number) => {
  if (shotAt(f) === "lips") return 0.6;
  if (inShot(f, "clench", "blast")) return keyed([[BEATS.clench, 0], [BEATS.clench + 10, 1]], f);
  return 0;
};

/** Flame front down the duct: 0 mouth → 1 tank (it reaches the gullet, ~0.75). */
export const flashbackAt = (f: number) => {
  if (inShot(f, "flashback")) return keyed([[BEATS.backwards - 8, 0], [BEATS.gullet + 4, 0.78]], f, easeInCubic);
  if (inShot(f, "clench")) return keyed([[BEATS.clench, 0.78], [shotEnd("clench"), 0]], f);
  return -1;
};
export const flashbackGlow = (f: number) => (inShot(f, "flashback", "clench") ? keyed([[BEATS.backwards - 10, 0], [BEATS.backwards, 1], [shotEnd("clench") - 4, 1], [shotEnd("clench"), 0]], f) : 0);

/** Chemical gland at the throat. */
export const glandAt = (f: number) => (shotAt(f) === "gland" ? easeOutBack(progress(f, [BEATS.gland - 4, BEATS.gland + 8])) : 0);
export const glandBurn = (f: number) => (shotAt(f) === "gland" ? keyed([[BEATS.touches, 0], [BEATS.incinerates, 1]], f, easeInCubic) : 0);
/** Fire inside the neck on "incinerates". */
export const neckFire = (f: number) => (shotAt(f) === "gland" ? keyed([[BEATS.incinerates - 2, 0], [BEATS.incinerates + 4, 1], [shotEnd("gland") - 6, 1], [shotEnd("gland"), 0.3]], f) : 0);

/** Iron teeth. */
export const ironAt = (f: number) => keyed([[BEATS.iron - 6, 0], [BEATS.iron + 10, 1]], f);

/** The three jaw snaps (snap, flint, sparks), each with its spark shower. */
export const SNAPS = [BEATS.snap, BEATS.flint, BEATS.sparks];

/** Jaw: chewing on the heap, pain, the snaps, roaring fire. 0 shut .. 1 wide. */
export const jawAt = (f: number) => {
  const s = shotAt(f);
  if (s === "gorge") {
    if (f < BEATS.rotting) return 0.05;
    return 0.25 + 0.25 * Math.sin((f - BEATS.rotting) * 0.38);
  }
  if (s === "hookXray" && f > BEATS.organs - 4) return keyed([[BEATS.organs - 4, 0], [BEATS.organs + 4, 0.7], [BEATS.second + 10, 0.5]], f, easeOutCubic);
  if (s === "gland" && f > BEATS.incinerates - 4) return keyed([[BEATS.incinerates - 4, 0], [BEATS.incinerates + 4, 0.85], [shotEnd("gland"), 0.6]], f, easeOutCubic);
  if (s === "teeth") return 0.38;
  if (s === "strike") {
    // Windup open → snap shut, three times.
    for (const t of SNAPS) {
      if (f >= t - 12 && f < t) return lerp(0.15, 0.75, easeOutCubic(progress(f, [t - 12, t - 4]))) * (1 - easeInCubic(progress(f, [t - 4, t])));
      if (f >= t && f < t + 4) return 0;
    }
    return 0.12;
  }
  if (s === "lips") return keyed([[BEATS.lips - 8, 0.05], [BEATS.lips, 0.22]], f);
  if (s === "flashback" || s === "clench") return 0.45;
  if (s === "blast" || s === "face" || s === "finale") return keyed([[BEATS.blast - 8, 0.4], [BEATS.blast, 0.75]], f) + 0.04 * Math.sin(f * 0.5);
  return 0.04 + 0.03 * Math.sin(f * 0.07);
};

/** Neck/head bends [pitch down +, turn +]. */
export const neckAt = (f: number): [number, number] => {
  const s = shotAt(f);
  if (s === "gorge") return [0, 0];
  if (s === "gland" && f > BEATS.incinerates - 4) return [-0.35 * easeOutCubic(progress(f, [BEATS.incinerates - 2, BEATS.incinerates + 8])), 0.2];
  if (s === "bomb") return [-0.1, 0.35];
  // Breathing fire: raise the head so the snout points ahead, not at the floor.
  if (s === "blast" || s === "face" || s === "finale") return [-0.5 * easeInOut(progress(f, [BEATS.blast - 14, BEATS.blast])), 0];
  return [0, 0];
};
export const headAt = (f: number): [number, number] => {
  const s = shotAt(f);
  if (s === "gorge") return [0, 0];
  if (s === "hookXray" && f > BEATS.organs - 4) return [-0.25 * easeOutCubic(progress(f, [BEATS.organs - 4, BEATS.organs + 8])), 0];
  if (s === "blast" || s === "face" || s === "finale") return [-0.35 * easeInOut(progress(f, [BEATS.blast - 14, BEATS.blast])), 0];
  return [0, 0];
};

/** Reaching down into the heap: arch the neck and lean the chest, then chew (a small bob). */
const REACH = [1.2, 0.9, 0.4, -0.3, -0.7];
const reachAt = (f: number) => (shotAt(f) === "gorge" ? easeInOut(progress(f, [shotStart("gorge") + 2, BEATS.rotting - 2])) : 0);
export const neckCurveAt = (f: number): number[] => {
  const k = reachAt(f);
  if (k <= 0) return [];
  const chew = f > BEATS.rotting ? 0.06 * Math.sin((f - BEATS.rotting) * 0.38) : 0;
  return REACH.map((v, i) => v * k + (i === REACH.length - 1 ? chew : 0));
};
export const leanAt = (f: number) => 1.2 * reachAt(f);

/** Blinks: a quick lid close on a fixed rhythm (never during the snaps). */
export const blinkAt = (f: number) => {
  const k = f % 97;
  return k < 5 ? Math.sin((k / 5) * Math.PI) : 0;
};

/** The heap shrinks as it is eaten. */
export const eatenAt = (f: number) => keyed([[BEATS.rotting, 0], [BEATS.bacteria, 0.5], [lineStart("b1"), 1]], f);

/** The flame from the mouth (blast onward), and the flame front's distance from the lips. */
export const breathAt = (f: number) => {
  if (inShot(f, "flashback")) return keyed([[BEATS.backwards - 14, 0], [BEATS.backwards - 6, 0.45]], f);
  if (inShot(f, "clench")) return 0.3;
  if (f < BEATS.blast - 2 || inShot(f, "rocket", "stove")) return 0;
  return keyed([[BEATS.blast - 2, 0.2], [BEATS.blast + 6, 1]], f, easeOutCubic);
};
/** Stand-off: the gas jet's speed keeps the flame this far in front of the lips. */
export const standoffAt = (f: number) => (f >= BEATS.blast - 2 ? keyed([[BEATS.blast - 2, 0], [BEATS.faster + 6, 0.22]], f) : 0);

// ---------------------------------------------------------------------------
// Inserts
// ---------------------------------------------------------------------------
/** The cow's burp: a little puff toward the candle. */
export const burpAt = (f: number) => (shotAt(f) === "burp" ? keyed([[BEATS.burps - 2, 0], [BEATS.burps + 4, 1], [BEATS.burps + 22, 0]], f) : 0);
export const candleGust = (f: number) => keyed([[BEATS.burps + 6, 0], [BEATS.burps + 12, 1], [BEATS.candle + 10, 0.2], [BEATS.candle + 30, 0]], f);
/** The cow chews (small whole-body bob: the scan has no rig). */
export const cowBob = (f: number) => Math.sin(f * 0.3);

/** The ember that would set off the bomb. */
export const emberAt = (f: number): Vec3 | null => {
  if (shotAt(f) !== "bomb" || f < BEATS.spark - 18 || f > BEATS.detonates) return null;
  const t = progress(f, [BEATS.spark - 18, BEATS.detonates]);
  return [lerp(-2.6, D.tank[0] - 0.2, t), lerp(2.6, D.tank[1], easeInCubic(t)) + 0.15 * Math.sin(t * 9), lerp(1.4, 0.4, t)];
};
/** The dragon is gone once the fireball covers it. */
export const boomVisible = (f: number) => shotAt(f) === "bomb" && f >= BEATS.detonates + 4;
