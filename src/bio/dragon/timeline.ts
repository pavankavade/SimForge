import { createCues, easeInCubic, easeInOut, easeOutCubic, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Dragon ("How a dragon survives its own fire"), the third fantasy-biology short
 * (1080x1920). The script follows the "so you / but now" evolutionary chain:
 * every fix creates the next problem, and every fix is anchored in real animal
 * biology and combustion physics.
 *
 * Shots, beats and kinematics shared by Scene.tsx, config.ts and DragonHUD.
 * Pure functions of the frame; every beat is `w(line, word) ± n` from the
 * voiced narration, so re-voicing a line moves the pictures with it.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Beats (keyed to exact voiced words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Hook: Belly on fire -> cooks from inside
  fire: w("h1", "fire"),
  belly: w("h1", "belly"),
  roast: w("h1", "roast"),
  organs: w("h1", "organs"),
  second: w("h1", "second"),

  // Don't store fire, store fuel
  never: w("h2", "never"),
  store: w("h2", "store"),
  fuel: w("h2", "fuel"),

  // Stomach 1: Rotting vegetation -> methane microbes (like a cow)
  gorge: w("a1", "gorge"),
  rotting: w("a1", "rotting"),
  plants: w("a1", "plants"),
  bacteria: w("a1", "bacteria"),
  ferment: w("a1", "ferment"),
  methane: w("a1", "methane"),
  cow: w("a1", "cow"),

  // Cow burps are too tiny
  burps: w("a2", "burps"),
  candle: w("a2", "candle"),

  // Stomach 2: Muscular pressure chamber
  evolve: w("b1", "evolve"),
  secondStomach: w("b1", "second"),
  stomach: w("b1", "stomach"),
  sealed: w("b1", "sealed"),
  muscle: w("b1", "muscle"),
  pumps: w("b1", "pumps"),
  pressure: w("b1", "pressure"),

  // Danger: Living bomb
  bomb: w("b2", "bomb"),
  spark: w("b2", "spark"),
  detonates: w("b2", "detonates"),

  // Oxygen rule: Anaerobic sealed fuel is completely safe
  oxygen: w("c1", "oxygen"),
  air: w("c1", "air"),
  tank: w("c1", "tank"),
  inert: w("c1", "inert"),
  lips: w("c1", "lips"),

  // Gland trap: chemical gland torches throat
  light: w("d1", "light"),
  gland: w("d1", "gland"),
  touches: w("d1", "touches"),
  incinerates: w("d1", "incinerates"),
  neck: w("d1", "neck"),

  // Komodo iron teeth: flint & steel jaw clash
  armor: w("d2", "armor"),
  teeth: w("d2", "teeth"),
  iron: w("d2", "iron"),
  komodo: w("d2", "komodo"),
  snap: w("d2", "snap"),
  jaws: w("d2", "jaws"),
  flint: w("d2", "flint"),
  sparks: w("d2", "sparks"),
  exit: w("d2", "exit"),

  // Flashback danger: flame races backward
  backwards: w("e1", "backwards"),
  race: w("e1", "race"),
  stream: w("e1", "stream"),
  gullet: w("e1", "gullet"),

  // Gas velocity > flame speed: clench tank hard
  clench: w("e2", "clench"),
  tank2: w("e2", "tank"),
  blast: w("e2", "blast"),
  faster: w("e2", "faster"),
  crawl: w("e2", "crawl"),

  // Rocket engine stove: flame stays outside
  rocket: w("end", "rocket"),
  stove: w("end", "stove"),
  face: w("end", "face"),
  congratulations: w("end", "congratulations"),
  walking: w("end", "walking"),
  flamethrower: w("end", "flamethrower"),
} as const;

// ---------------------------------------------------------------------------
// Shots: camera & staging cuts
// ---------------------------------------------------------------------------
export type ShotId =
  | "hook"
  | "fuel"
  | "cow"
  | "ferment"
  | "burp"
  | "stomach2"
  | "pressure"
  | "bomb"
  | "oxygen"
  | "lips"
  | "gland"
  | "teeth"
  | "strike"
  | "flashback"
  | "clench"
  | "gasblast"
  | "flamethrower"
  | "finale";

export const SHOT_STARTS: [ShotId, number][] = [
  ["hook", 0],
  ["fuel", lineStart("h2") - 4],
  ["cow", lineStart("a1") - 4],
  ["ferment", BEATS.ferment - 8],
  ["burp", lineStart("a2") - 4],
  ["stomach2", lineStart("b1") - 4],
  ["pressure", BEATS.pumps - 6],
  ["bomb", lineStart("b2") - 4],
  ["oxygen", lineStart("c1") - 4],
  ["lips", BEATS.lips - 10],
  ["gland", lineStart("d1") - 4],
  ["teeth", lineStart("d2") - 4],
  ["strike", BEATS.snap - 12],
  ["flashback", lineStart("e1") - 4],
  ["clench", lineStart("e2") - 4],
  ["gasblast", BEATS.blast - 8],
  ["flamethrower", lineStart("end") - 4],
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
// Kinematics & Animation Curves (Pure functions of frame)
// ---------------------------------------------------------------------------

/** Cutaway cross-section opening (0 = solid scales, 1 = fully open diagram) */
export const cutawayAmount = (frame: number): number => {
  const shot = shotAt(frame);
  if (
    shot === "hook" ||
    shot === "ferment" ||
    shot === "stomach2" ||
    shot === "pressure" ||
    shot === "bomb" ||
    shot === "oxygen" ||
    shot === "gland" ||
    shot === "flashback" ||
    shot === "clench"
  ) {
    return 1.0;
  }
  return 0.0;
};

/** Stomach 1 fermentation mulch bubbling activity (0..1) */
export const fermentActivity = (frame: number): number => {
  if (frame < BEATS.gorge) return 0.2;
  if (frame < shotStart("burp")) return 1.0;
  return 0.4;
};

/** Stomach 2 clench / contraction (0 = relaxed, 1 = maximum pressure clench) */
export const stomachClench = (frame: number): number => {
  return keyed(
    [
      [0, 0.0],
      [shotStart("pressure"), 0.0],
      [BEATS.pressure, 0.65],
      [shotStart("clench"), 0.4],
      [BEATS.clench, 1.0],
      [shotStart("finale"), 0.85],
      [DURATION, 0.3],
    ],
    frame,
  );
};

/** Jaw opening angle (0 = shut, 1 = wide roar) */
export const jawOpening = (frame: number): number => {
  // Flint strike on snap beat: windup wide open, snap shut violently
  if (frame >= BEATS.snap - 14 && frame <= BEATS.snap + 10) {
    if (frame < BEATS.snap) {
      return lerp(0.1, 0.85, easeOutCubic(progress(frame, [BEATS.snap - 14, BEATS.snap - 2])));
    }
    // Snap shut hard!
    return lerp(0.85, 0.0, easeInCubic(progress(frame, [BEATS.snap - 2, BEATS.snap])));
  }

  // Flamethrower blast: held open roaring!
  if (frame >= BEATS.blast && frame < BEATS.flamethrower + 90) {
    return 0.75 + 0.08 * Math.sin(frame * 0.4);
  }
  if (frame >= BEATS.congratulations) {
    return 0.8 + 0.06 * Math.sin(frame * 0.3);
  }

  // Idle panting / subtle movement
  return 0.12 + 0.06 * Math.sin(frame * 0.1);
};

/** Sparks burst intensity at jaw strike */
export const sparkIntensity = (frame: number): number => {
  if (frame >= BEATS.snap && frame <= BEATS.snap + 18) {
    return 1 - progress(frame, [BEATS.snap, BEATS.snap + 18]);
  }
  return 0;
};

/** Gas flow through nozzle (0..1) */
export const gasFlow = (frame: number): number => {
  if (frame >= BEATS.blast - 4 && frame < BEATS.blast + 20) {
    return progress(frame, [BEATS.blast - 4, BEATS.blast + 8]);
  }
  if (frame >= BEATS.blast + 20 && frame <= DURATION - 30) {
    return 0.85;
  }
  return 0;
};

/** Flamethrower fire intensity (0..1) */
export const flameIntensity = (frame: number): number => {
  // Small candle flame on burp
  if (frame >= BEATS.burps && frame <= BEATS.candle + 15) {
    return 0.22 * Math.sin(progress(frame, [BEATS.burps, BEATS.candle + 15]) * Math.PI);
  }

  // Full roaring dragon fire
  if (frame >= BEATS.snap + 2) {
    if (frame < BEATS.blast) return 0.45;
    // Massive blast
    return keyed(
      [
        [BEATS.blast, 0.45],
        [BEATS.blast + 8, 1.0],
        [DURATION - 40, 1.0],
        [DURATION, 0.0],
      ],
      frame,
    );
  }
  return 0;
};

/** Goblin adventurer kinematics (he enters, sniffs, cowers, gets charred) */
export const GOBLIN_ENTER = [shotStart("cow"), shotStart("cow") + 45] as const;
export const goblinX = (frame: number): number => {
  if (frame < GOBLIN_ENTER[0]) return 5.0;
  if (frame < GOBLIN_ENTER[1]) {
    return lerp(4.5, 2.6, easeOutCubic(progress(frame, GOBLIN_ENTER)));
  }
  if (frame >= BEATS.snap - 4 && frame < BEATS.blast) {
    // Shuffles back in fear
    return lerp(2.6, 2.9, progress(frame, [BEATS.snap - 4, BEATS.snap + 6]));
  }
  if (frame >= BEATS.blast) {
    // Blown back by flame pressure wave
    return lerp(2.9, 3.8, easeOutCubic(progress(frame, [BEATS.blast, BEATS.blast + 14])));
  }
  return 2.6;
};
