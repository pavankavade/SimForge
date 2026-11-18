import { CHEST, CHEST_H } from "../../artifacts/bio";
import { clamp01, createCues, easeInCubic, easeInOut, easeOutBack, easeOutCubic, lerp, progress, wobble } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Mimic ("How a mimic would actually work"), the first fantasy-biology short
 * (1080x1920). The script is a "so you / but now" chain: every fix creates the
 * next problem and every fix is a real animal (scripts/mimic-audio.py).
 *
 * Shots, beats and every bit of motion shared by Scene.tsx, config.ts and the
 * HUD. Pure functions of the frame; every beat is `w(line, word) ± n` from the
 * voiced narration, so re-voicing a line moves the pictures with it.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress, wobble } from "../../kit";

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open: the chest lunges at the lens, then plays innocent
  lunge: 4,
  chomp0: 9,
  wood: w("h", "wood"),
  iron: w("h", "iron"),
  realMimic: w("h", "real"),
  never: w("h", "never"),
  // Copy the octopus
  octopus: w("a1", "octopus"),
  skin: w("a1", "skin"),
  sacs: w("a1", "color"),
  muscles: w("a1", "tiny"),
  oneSecond: w("a1", "one"),
  paint: w("a1", "paint"),
  oak: w("a1", "oak"),
  rusty: w("a1", "rusty"),
  painted: wEnd("a1", "iron"),
  // ...but it is a bag of water
  bag: w("a2", "bag"),
  knock: w("a2", "knock"),
  wobbleWord: w("a2", "wobble"),
  // Grow a shell like a giant clam
  shell: w("b1", "shell"),
  clam: w("b1", "giant"),
  hinged: w("b1", "hinged"),
  snaps: w("b1", "snaps"),
  // ...but it weighs three men and takes decades
  weighs: w("b2", "weighs"),
  three: w("b2", "three"),
  men: w("b2", "men"),
  decades: w("b2", "decades"),
  // Steal a chest like a hermit crab
  stop: w("c1", "stop"),
  steal: w("c1", "steal"),
  hermit: w("c1", "hermit"),
  grows: w("c1", "grows"),
  moves: w("c1", "moves"),
  empty: w("c1", "empty"),
  // No bones: pour in
  bones: w("c2", "bones"),
  pour: w("c2", "pour"),
  gap: w("c2", "gap"),
  beak: w("c2", "beak"),
  // ...but dinner comes twice a year
  dinner: w("d1", "dinner"),
  walks: w("d1", "walks"),
  twice: w("d1", "twice"),
  warm: w("d1", "warm"),
  starve: w("d1", "starve"),
  // Run cold like a crocodile
  cold: w("d2", "cold"),
  neverMove: w("d2", "never"),
  crocodile: w("d2", "crocodile"),
  year: w("d2", "year"),
  meal: w("d2", "meal"),
  // One bite: the tongue
  oneBite: w("e1", "one"),
  bite: w("e1", "bite"),
  tongue: w("e1", "tongue"),
  suckers: w("e1", "suckers"),
  sixteen: w("e1", "sixteen"),
  yank: wEnd("e1", "kilos") - 8,
  chomp: wEnd("e1", "kilos") + 2,
  burp: lineStart("end") + 6,
  // The clincher
  neverTurned: w("end", "never"),
  movedIn: w("end", "moved"),
  waiting: w("end", "waiting"),
  allYear: w("end", "year"),
  lift: w("end", "lift"),
  lid: w("end", "lid"),
  finalLunge: DURATION - 14,
} as const;

// ---------------------------------------------------------------------------
// Shots: which set and staging is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "hook"
  | "octopus"
  | "skin"
  | "paint"
  | "knock"
  | "clam"
  | "scale"
  | "steal"
  | "hermit"
  | "pour"
  | "wait"
  | "starve"
  | "cold"
  | "croc"
  | "bite"
  | "suckers"
  | "yank"
  | "end"
  | "inside"
  | "waiting";

export const SHOT_STARTS: [ShotId, number][] = [
  ["hook", 0],
  ["octopus", lineStart("a1") - 4],
  ["skin", BEATS.skin - 6],
  ["paint", w("a1", "so", 1) - 4],
  ["knock", lineStart("a2") - 4],
  ["clam", lineStart("b1") - 6],
  ["scale", lineStart("b2") - 4],
  ["steal", lineStart("c1") - 6],
  ["hermit", w("c1", "A", 1) - 8],
  ["pour", lineStart("c2") - 6],
  ["wait", lineStart("d1") - 6],
  ["starve", BEATS.warm - 6],
  ["cold", lineStart("d2") - 4],
  ["croc", w("d2", "like") - 6],
  ["bite", lineStart("e1") - 6],
  ["suckers", BEATS.suckers - 4],
  ["yank", BEATS.yank - 4],
  ["end", BEATS.neverTurned - 8],
  ["inside", w("end", "It") - 6],
  ["waiting", w("end", "And") - 6],
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
// The hero chest's performance: lid angle, eyes, squash, lean, cobwebs.
// ---------------------------------------------------------------------------
const LID_WIDE = 1.3;

/** Lid angle (radians) across the whole short. */
export const chestLid = (frame: number): number => {
  const sh = shotAt(frame);
  if (sh === "hook") {
    // Lunge at the lens, slam shut, then a careful peek on "real mimic" that snaps shut on "never".
    if (frame < BEATS.chomp0) return lerp(LID_WIDE, 0, easeInCubic(progress(frame, [BEATS.lunge, BEATS.chomp0])));
    if (frame < BEATS.realMimic - 2) return 0;
    if (frame < BEATS.never) return 0.17 * easeOutBack(progress(frame, [BEATS.realMimic - 2, BEATS.realMimic + 8]));
    return 0.17 * (1 - progress(frame, [BEATS.never, BEATS.never + 3]));
  }
  if (sh === "steal") return 1.15;
  if (sh === "pour") return 0;
  if (sh === "wait") {
    // A hopeful peek as each adventurer walks by.
    const peek = (at: number) => 0.13 * Math.sin(Math.PI * progress(frame, [at - 4, at + 26]));
    return Math.max(peek(BEATS.walks), peek(BEATS.twice));
  }
  if (sh === "bite" || sh === "suckers" || sh === "yank") {
    if (frame < BEATS.tongue - 9) return 0;
    // Anticipation twitch, then the jaws fly open.
    if (frame < BEATS.tongue - 2) return 0.1 + 0.06 * Math.sin((frame - BEATS.tongue) * 1.5);
    if (frame < BEATS.chomp - 5) return LID_WIDE * easeOutBack(progress(frame, [BEATS.tongue - 2, BEATS.tongue + 5]), 2.2);
    if (frame < BEATS.chomp) return lerp(LID_WIDE, 0, easeInCubic(progress(frame, [BEATS.chomp - 5, BEATS.chomp])));
    if (frame < BEATS.burp) return frame < BEATS.chomp + 5 ? 0 : 0.2 * Math.abs(Math.sin((frame - BEATS.chomp - 5) * 0.33));
    return keyed(
      [
        [BEATS.burp, 0],
        [BEATS.burp + 3, 0.7],
        [BEATS.burp + 16, 0],
      ],
      frame,
    );
  }
  if (sh === "waiting") {
    if (frame < BEATS.lid) return 0;
    if (frame < BEATS.finalLunge) return 0.16 * easeOutCubic(progress(frame, [BEATS.lid, BEATS.lid + 14])) + 0.012 * Math.sin(frame * 0.4);
    return lerp(0.16, LID_WIDE, easeOutBack(progress(frame, [BEATS.finalLunge, BEATS.finalLunge + 5]), 2.2));
  }
  return 0;
};

/** Eyes glowing in the lid gap (0..1). */
export const chestEyes = (frame: number): number => {
  const sh = shotAt(frame);
  if (sh === "hook") return frame < BEATS.chomp0 ? 1 : frame >= BEATS.realMimic && frame < BEATS.never + 2 ? 1 : 0;
  if (sh === "wait") return chestLid(frame) > 0.04 ? 1 : 0;
  if (sh === "bite" || sh === "suckers" || sh === "yank") return frame >= BEATS.tongue - 9 && frame < BEATS.chomp ? 1 : 0;
  if (sh === "waiting") return frame >= BEATS.lid ? easeOutCubic(progress(frame, [BEATS.lid + 2, BEATS.lid + 10])) : 0;
  return 0;
};

/** Squash on every slam of the lid. */
export const chestSquash = (frame: number): number => {
  const hit = (at: number, amp = 0.16) => (frame >= at ? amp * Math.exp(-(frame - at) / 4) * Math.cos((frame - at) * 0.9) : 0);
  const chew = frame >= BEATS.chomp + 5 && frame < BEATS.burp ? 0.05 * (1 - Math.abs(Math.sin((frame - BEATS.chomp - 5) * 0.33))) : 0;
  const burp = frame >= BEATS.burp ? -0.12 * Math.exp(-(frame - BEATS.burp) / 5) : 0;
  return hit(BEATS.chomp0) + hit(BEATS.never + 3, 0.06) + hit(BEATS.chomp, 0.2) + chew + burp;
};

/** Forward lean (radians): the lunges at the lens. */
export const chestLean = (frame: number): number => {
  const open = frame < BEATS.chomp0 ? 0.3 * (1 - progress(frame, [BEATS.lunge, BEATS.chomp0])) : 0;
  const final = frame >= BEATS.finalLunge ? 0.3 * easeOutCubic(progress(frame, [BEATS.finalLunge, BEATS.finalLunge + 5])) : 0;
  return open + final;
};

/** Cobwebs: they gather over the year of waiting, tear on the bite, gather again. */
export const cobwebs = (frame: number): number =>
  keyed(
    [
      [lineStart("d1"), 0],
      [BEATS.warm, 0.9],
      [BEATS.tongue, 0.9],
      [BEATS.tongue + 4, 0.25],
      [shotStart("waiting"), 0.3],
      [BEATS.lift, 1],
    ],
    frame,
  );

// ---------------------------------------------------------------------------
// Shot curves
// ---------------------------------------------------------------------------
/** Octopus camouflage: it melts into the sand on its name. */
export const camo = (frame: number) => easeInOut(progress(frame, [BEATS.octopus + 2, BEATS.octopus + 18]));
/** Skin macro: pigment sacs open on "color", papillae rise on "tiny muscles". */
export const sacs = (frame: number) => progress(frame, [BEATS.sacs - 4, BEATS.sacs + 26]);
export const bumps = (frame: number) => progress(frame, [BEATS.muscles, BEATS.muscles + 24]);

/** The blob snaps into the shape of a chest in "one second", then the paint sweeps across. */
export const MORPH = BEATS.oneSecond + 8;
export const paint = (frame: number) => easeInOut(progress(frame, [BEATS.paint, BEATS.painted]));
/** Jelly wobble of the soft chest (-1..1): the pop into shape, then the two knocks. */
export const KNOCKS = [BEATS.knock, BEATS.knock + 7];
export const softWobble = (frame: number) =>
  wobble(frame, MORPH, 0.9, 0.8, 7) + wobble(frame, KNOCKS[0], 1.0, 0.75, 16) + wobble(frame, KNOCKS[1], 0.8, 0.75, 18) + wobble(frame, BEATS.wobbleWord, 0.35, 0.75, 12);
/** Height of the gauntlet's knuckles above the lid: it reaches in, raps twice, pulls away. */
export const gauntletLift = (frame: number) => {
  const reach = lerp(2.6, 0.4, easeOutCubic(progress(frame, [BEATS.bag + 14, BEATS.knock - 12])));
  // Each rap: down in 3 frames, knuckles on the lid for 2, back up in 3.
  const rap = (at: number) => 0.4 * Math.min(progress(frame, [at - 3, at]), 1 - progress(frame, [at + 2, at + 5]));
  const leave = 2.6 * easeInOut(progress(frame, [BEATS.knock + 22, BEATS.knock + 40]));
  return Math.max(0, reach - Math.max(rap(KNOCKS[0]), rap(KNOCKS[1]))) + leave;
};

/** Giant clam: gaping, breathing, then shut on "snaps". */
export const clamOpen = (frame: number) => {
  if (frame >= BEATS.snaps) return 0.02 * Math.exp(-(frame - BEATS.snaps) / 3) * Math.abs(Math.cos((frame - BEATS.snaps) * 0.8));
  const pre = 0.12 * progress(frame, [BEATS.snaps - 7, BEATS.snaps - 2]);
  return (0.82 + 0.05 * Math.sin(frame * 0.07) + pre) * (1 - easeInCubic(progress(frame, [BEATS.snaps - 2, BEATS.snaps])));
};

/** The scale: the clam drops on the left pan on "weighs"; three men land one by one and level it. */
export const CLAM_LAND = BEATS.weighs;
export const MEN_LAND = [BEATS.three, BEATS.three + 10, BEATS.men];
const TILT_FULL = 0.22;
export const scaleTilt = (frame: number) => {
  let target = 0;
  let last = 0;
  const steps: [number, number][] = [
    [CLAM_LAND, TILT_FULL],
    [MEN_LAND[0], TILT_FULL * 0.72],
    [MEN_LAND[1], TILT_FULL * 0.4],
    [MEN_LAND[2], 0],
  ];
  let from = 0;
  for (const [at, v] of steps) {
    if (frame >= at) {
      from = target;
      target = v;
      last = at;
    }
  }
  if (last === 0) return 0;
  return lerp(from, target, easeOutCubic(progress(frame, [last, last + 8]))) + wobble(frame, last, 0.035, 0.7, 9);
};
/** Shell age counter for "takes decades to build". */
export const shellAge = (frame: number) => Math.round(lerp(1, 100, easeInOut(progress(frame, [BEATS.decades - 8, lineEnd("b2") + 2]))));

/** Hermit crab: walks in naked, turns, backs into the empty shell on "moves", carries it off. */
export const CRAB = { start: -1.9, stop: -0.2, home: 0.3, scale: 1.0 };
export const CRAB_IN = BEATS.moves + 16;
export const crabX = (frame: number) => {
  if (frame < BEATS.moves) return lerp(CRAB.start, CRAB.stop, easeOutCubic(progress(frame, [shotStart("hermit"), BEATS.grows + 6])));
  if (frame < CRAB_IN) return lerp(CRAB.stop, CRAB.home, easeInOut(progress(frame, [BEATS.moves + 6, CRAB_IN])));
  return CRAB.home - 0.6 * easeInOut(progress(frame, [BEATS.empty + 6, shotEnd("hermit") + 20]));
};
/** Facing: +x on the way in, turned around to back in, toward the camera to show off. */
export const crabYaw = (frame: number) =>
  frame < CRAB_IN + 8 ? Math.PI * easeInOut(progress(frame, [BEATS.moves - 4, BEATS.moves + 6])) : Math.PI * (1 + 0.42 * easeInOut(progress(frame, [CRAB_IN + 8, CRAB_IN + 18])));

/** The pour: 0 = all of the mimic is on the lid, 1 = all of it is inside the chest. */
export const POUR = [BEATS.pour, BEATS.beak + 8] as const;
export const pourT = (frame: number) => easeInOut(progress(frame, POUR));
/** The knot hole in the top of the lid that it pours through. */
export const GAP_Y = CHEST_H;

/** A year in a hallway: the day counter (0..1 through one day) and the month (0..12). */
export const WAIT = [lineStart("d1"), BEATS.warm - 6] as const;
export const month = (frame: number) => 12 * progress(frame, WAIT);
export const dayPhase = (frame: number) => {
  const sh = shotAt(frame);
  if (sh === "wait") return (month(frame) / 3) % 1;
  if (sh === "waiting") return (progress(frame, [shotStart("waiting"), BEATS.lift]) * 2.5) % 1;
  return 0.3;
};
/** Adventurers who walk straight past: [start frame, direction, depth z]. */
export const PASSERS: [number, 1 | -1, number][] = [
  [BEATS.walks - 4, -1, 1.9],
  [BEATS.twice - 2, 1, -1.7],
];
export const PASS_LEN = 26;

/** ENERGY (0..1): a warm body burns through it; a cold one barely touches it. */
export const energy = (frame: number) => {
  const sh = shotAt(frame);
  if (sh === "starve") return 1 - easeInOut(progress(frame, [BEATS.warm + 2, BEATS.starve + 4]));
  if (sh === "cold") return 0.96 - 0.03 * progress(frame, [shotStart("cold"), shotEnd("cold")]);
  return 1;
};
/** 0 = warm-blooded, 1 = running cold. */
export const chill = (frame: number) => easeInOut(progress(frame, [BEATS.cold - 4, BEATS.cold + 26]));
/** The mimic falls asleep on "never move". */
export const asleep = (frame: number) => easeInOut(progress(frame, [BEATS.neverMove, BEATS.neverMove + 12]));

/** Cross-section window (0..1 scale) and its rim colour. */
export const cutaway = (frame: number) => {
  const sh = shotAt(frame);
  const open = (a: number, b: number) => easeOutBack(progress(frame, [a, a + 9]), 1.2) * (1 - progress(frame, [b - 6, b]));
  if (sh === "pour") return open(shotStart("pour") + 2, shotEnd("pour") + 99);
  if (sh === "starve" || sh === "cold") return open(shotStart("starve") + 2, shotEnd("cold") + 99);
  if (sh === "inside" || sh === "waiting") return open(shotStart("inside") + 2, shotStart("waiting") + 10);
  return 0;
};

/** The bite: the rogue sneaks up, the tongue takes him, the lid closes over him. */
export const VICTIM = { enter: 3.3, stand: 1.25 };
export const VICTIM_ARRIVE = BEATS.bite - 4;
export const victimX = (frame: number) => lerp(VICTIM.enter, VICTIM.stand, easeOutCubic(progress(frame, [shotStart("bite"), VICTIM_ARRIVE])));
/** Tongue extension 0..1: lashes out on "tongue", holds, then reels in on the yank. */
export const tongueOut = (frame: number) => {
  if (frame < BEATS.tongue) return 0;
  if (frame < BEATS.yank) return easeOutCubic(progress(frame, [BEATS.tongue, BEATS.tongue + 5]));
  return 1 - easeInCubic(progress(frame, [BEATS.yank, BEATS.chomp - 3]));
};
/** 0..1 how far the victim has been dragged from where he stood into the mouth. */
export const dragged = (frame: number) => easeInOut(progress(frame, [BEATS.yank, BEATS.chomp - 3]));
/** His dagger, spat out on the burp: it lands by the chest and stays there. */
export const DAGGER_LAND = BEATS.burp + 14;
export const DAGGER_AT: [number, number, number] = [CHEST.w / 2 + 0.75, 0.03, 0.75];
export const daggerT = (frame: number) => clamp01((frame - BEATS.burp - 2) / (DAGGER_LAND - BEATS.burp - 2));
