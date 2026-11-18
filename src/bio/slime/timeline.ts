import { DOOR } from "../../artifacts/bio";
import { arc, clamp01, createCues, easeInCubic, easeInOut, easeOutBack, easeOutCubic, lerp, progress, wobble } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Slime ("How a slime would actually work"), the second fantasy-biology short
 * (1080x1920). Same "so you / but now" chain as the mimic: every fix creates
 * the next problem and every fix is a real animal (scripts/slime-audio.py).
 *
 * Shots, beats and every bit of motion shared by Scene.tsx, config.ts and the
 * HUD. Pure functions of the frame; every beat is `w(line, word) ± n` from the
 * voiced narration, so re-voicing a line moves the pictures with it.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { arc, clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress, wobble } from "../../kit";

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open: it hops at the lens, then gives up and becomes a puddle
  hop0: 12,
  bones: w("h", "bones"),
  brain: w("h", "brain"),
  mouth: w("h", "mouth"),
  real: w("h", "real"),
  neverHop: w("h", "never"),
  hop: w("h", "hop"),
  just: w("h", "just"),
  puddle: w("h", "puddle"),
  // Copy the slime mold
  mold: w("a1", "mold"),
  giant: w("a1", "giant"),
  crawls: w("a1", "crawls"),
  pumping: w("a1", "pumping"),
  back: w("a1", "back"),
  forth: w("a1", "forth"),
  // ...but it is thin and slow
  thin: w("a2", "thin"),
  paint: w("a2", "paint"),
  few: w("a2", "few"),
  hour: w("a2", "hour"),
  // Copy the sea cucumber
  cucumber: w("b1", "cucumber"),
  stiff: w("b1", "stiff"),
  soft: w("b1", "soft"),
  seconds: w("b1", "seconds"),
  standStiff: w("b1", "stiff", 1),
  jelly: w("b1", "jelly"),
  goSoft: w("b1", "soft", 1),
  pour: w("b1", "pour"),
  door: w("b1", "door"),
  // ...but you dry out
  water: w("b2", "water"),
  leaves: w("b2", "leaves"),
  skin: w("b2", "skin"),
  sun: w("b2", "sun"),
  stain: w("b2", "stain"),
  lunch: w("b2", "lunch"),
  // Wrap yourself in mucus, like a slug
  wrap: w("c1", "wrap"),
  mucus: w("c1", "mucus"),
  slug: w("c1", "slug"),
  dark: w("c1", "dark"),
  damp: w("c1", "damp"),
  // No mouth: eat like an amoeba
  noMouth: w("d1", "mouth"),
  amoeba: w("d1", "amoeba"),
  flow: w("d1", "flow"),
  over: w("d1", "over"),
  dinner: w("d1", "dinner"),
  close: w("d1", "close"),
  around: w("d1", "around"),
  // ...but the acid would melt you too
  acid: w("d2", "acid"),
  melts: w("d2", "melts"),
  meltYou: w("d2", "melt"),
  too: w("d2", "too"),
  line: w("d2", "line"),
  lined: w("d2", "mucus"),
  stomach: w("d2", "stomach"),
  rebuilds: w("d2", "rebuilds"),
  days: w("d2", "days"),
  // No single heart or brain: millions of cores
  heart: w("e1", "heart"),
  oneBrain: w("e1", "brain"),
  millions: w("e1", "millions"),
  nuclei: w("e1", "nuclei"),
  cores: w("e1", "cores"),
  spread: w("e1", "spread"),
  body: w("e1", "body"),
  // The clincher
  weakest: w("end", "weakest"),
  cannot: w("end", "cannot"),
  kill: w("end", "kill"),
  sword: w("end", "sword"),
  cut: w("end", "cut") + 2,
  half: w("end", "half"),
  now: w("end", "now"),
  two: w("end", "two"),
  finalLunge: DURATION - 14,
} as const;

// ---------------------------------------------------------------------------
// Shots: which set and staging is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "hook"
  | "mold"
  | "pump"
  | "slow"
  | "cucumber"
  | "stand"
  | "pour"
  | "dry"
  | "coat"
  | "slug"
  | "damp"
  | "nomouth"
  | "amoeba"
  | "engulf"
  | "acid"
  | "line"
  | "stomach"
  | "noheart"
  | "nuclei"
  | "cores"
  | "weakest"
  | "sword"
  | "cut";

export const SHOT_STARTS: [ShotId, number][] = [
  ["hook", 0],
  ["mold", lineStart("a1") - 4],
  ["pump", w("a1", "by") - 6],
  ["slow", lineStart("a2") - 4],
  ["cucumber", lineStart("b1") - 6],
  ["stand", BEATS.standStiff - 6],
  ["pour", BEATS.goSoft - 6],
  ["dry", lineStart("b2") - 4],
  ["coat", lineStart("c1") - 6],
  ["slug", w("c1", "like") - 6],
  ["damp", BEATS.dark - 6],
  ["nomouth", lineStart("d1") - 6],
  ["amoeba", w("d1", "so") - 6],
  ["engulf", w("d1", "you", 2) - 6],
  ["acid", lineStart("d2") - 4],
  ["line", w("d2", "so") - 6],
  ["stomach", w("d2", "like") - 6],
  ["noheart", lineStart("e1") - 6],
  ["nuclei", w("e1", "a") - 6],
  ["cores", w("e1", "tiny") - 6],
  ["weakest", lineStart("end") - 6],
  ["sword", w("end", "is") - 6],
  ["cut", BEATS.cut - 10],
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

/** Squash of a jelly body around a hop that leaves the floor at `up` and lands at `land`. */
const hopSquash = (frame: number, up: number, land: number) => {
  // Anticipation crouch, stretch in the air, splat and wobble on landing.
  const crouch = 0.24 * Math.sin(Math.PI * progress(frame, [up - 6, up]));
  const stretch = frame >= up && frame < land ? -0.16 * Math.sin(Math.PI * progress(frame, [up, land])) : 0;
  return (frame < up ? crouch : 0) + stretch + wobble(frame, land, 0.3, 0.75, 7);
};

// ---------------------------------------------------------------------------
// Cold open
// ---------------------------------------------------------------------------
export const HOOK_SCALE = 1.3;
const HOP_LEN = 12;
/** Landings of the four hops toward the lens, and where each one lands (z). */
export const HOOK_LANDS = [BEATS.hop0, BEATS.bones, BEATS.brain, BEATS.mouth];
const HOOK_Z = [-2.6, -1.5, -0.6, 0.3, 1.1];
export const hookZ = (frame: number) => {
  let z = HOOK_Z[0];
  HOOK_LANDS.forEach((land, i) => {
    z = lerp(z, HOOK_Z[i + 1], progress(frame, [land - HOP_LEN, land]));
  });
  return z;
};
export const hookY = (frame: number) => HOOK_LANDS.reduce((y, land) => y + arc(progress(frame, [land - HOP_LEN, land]), 0.75), 0);
/** The hop that never happens: it crouches on "never hop", strains, and nothing leaves the floor. */
export const STRAIN = [BEATS.neverHop, BEATS.hop + 14] as const;
export const hookSquash = (frame: number) => {
  const hops = HOOK_LANDS.reduce((s, land) => s + hopSquash(frame, land - HOP_LEN, land), 0);
  const strain = frame >= STRAIN[0] && frame < STRAIN[1] ? 0.3 * easeOutCubic(progress(frame, [STRAIN[0], STRAIN[0] + 6])) + 0.03 * Math.sin(frame * 1.7) : 0;
  return hops + strain + wobble(frame, STRAIN[1], -0.12, 0.8, 6);
};
/** 0 = a dome, 1 = a puddle. It lets go on "just" and is flat on "puddle". */
export const hookMelt = (frame: number) => easeInCubic(progress(frame, [BEATS.just, BEATS.puddle + 2]));

// ---------------------------------------------------------------------------
// Slime mold
// ---------------------------------------------------------------------------
/** The mold spreads slowly through its shots. */
export const moldGrow = (frame: number) => lerp(0.45, 1, easeOutCubic(progress(frame, [shotStart("mold"), BEATS.crawls + 20])));
/** Where the pumped pulse sits along the veins (-1 back at the root, +1 out at the tips). */
export const moldFlow = (frame: number) => {
  if (frame < BEATS.pumping) return Math.sin(frame * 0.09);
  return keyed(
    [
      [BEATS.pumping, -1],
      [BEATS.back - 3, 1],
      [BEATS.forth - 2, -1],
      [BEATS.forth + 14, 1],
      [BEATS.forth + 30, -1],
    ],
    frame,
  );
};
/** The snail that overtakes it: x across the stump. */
export const SNAIL_RUN = [w("a2", "and") - 6, shotEnd("slow") + 10] as const;
export const snailX = (frame: number) => lerp(-2.6, 2.2, progress(frame, SNAIL_RUN));
/** The mold's front in the same time: it barely moves. */
export const moldCreep = (frame: number) => 0.05 * progress(frame, [shotStart("slow"), shotEnd("slow")]);
/** Nuclei lighting up in the veins (0..1). */
export const moldNuclei = (frame: number) => easeInOut(progress(frame, [BEATS.millions - 4, BEATS.nuclei + 14]));
/** The counter on "millions of nuclei" (log scale: 1 -> 1,000,000+). */
export const nucleiCount = (frame: number) => Math.round(10 ** (6.3 * easeInOut(progress(frame, [BEATS.millions - 4, BEATS.nuclei + 10]))));

// ---------------------------------------------------------------------------
// Sea cucumber: stiff on "stiff", limp on "soft"
// ---------------------------------------------------------------------------
export const cucumberSoft = (frame: number) =>
  keyed(
    [
      [BEATS.stiff - 5, 0.5],
      [BEATS.stiff, 0],
      [BEATS.soft + 2, 0],
      [BEATS.seconds - 2, 1],
    ],
    frame,
  ) +
  wobble(frame, BEATS.stiff, -0.06, 0.8, 6) +
  0.02 * Math.sin(frame * 0.08);

// ---------------------------------------------------------------------------
// Stand up like jelly, pour under a door
// ---------------------------------------------------------------------------
export const VAULT_SCALE = 1.5;
export const STAND_SCALE = 1.3;
/** Where it stands before the door, and how far behind the door it has to go to be gone. */
export const STAND_Z = 1.5;
export const POUR = [BEATS.pour, BEATS.door + 6] as const;
export const standMelt = (frame: number) => {
  if (frame < BEATS.goSoft) return 1 - easeOutBack(progress(frame, [BEATS.standStiff, BEATS.standStiff + 10]), 2.4);
  return easeInOut(progress(frame, [BEATS.goSoft, BEATS.goSoft + 12]));
};
export const standSquash = (frame: number) => wobble(frame, BEATS.standStiff + 10, -0.14, 0.7, 9) + wobble(frame, BEATS.jelly, 0.12, 0.7, 12);
export const pourZ = (frame: number) => lerp(STAND_Z, DOOR.z - 2.9, easeInOut(progress(frame, POUR)));
/** 0..1: how much it is stretched into a stream (long, and narrow enough for the doorway). */
export const pourStream = (frame: number) => easeInOut(progress(frame, [BEATS.goSoft + 8, POUR[0] + 6]));

// ---------------------------------------------------------------------------
// Drying out in the sun
// ---------------------------------------------------------------------------
/** WATER (1 = full, 0 = a stain). It starts leaving on "leaves" and is gone on "stain". */
export const waterLeft = (frame: number) =>
  keyed(
    [
      [BEATS.water, 1],
      [BEATS.leaves, 0.92],
      [BEATS.skin + 10, 0.6],
      [BEATS.sun, 0.4],
      [BEATS.stain, 0.02],
      [BEATS.stain + 6, 0],
    ],
    frame,
  );
/** The sun from mid-morning to noon across the shot. */
export const sunClimb = (frame: number) => progress(frame, [shotStart("dry"), BEATS.lunch]);
/** Clock for the HUD, in minutes since midnight (8:00 -> 12:00). */
export const clockMinutes = (frame: number) => Math.round(lerp(8 * 60, 12 * 60, sunClimb(frame)) / 5) * 5;

// ---------------------------------------------------------------------------
// Mucus coat, slug, the dark and the damp
// ---------------------------------------------------------------------------
export const coat = (frame: number) => easeInOut(progress(frame, [BEATS.wrap, BEATS.mucus + 6]));
export const SLUG_RUN = [shotStart("slug"), shotEnd("slug") + 20] as const;
export const slugX = (frame: number) => lerp(-0.9, 0.5, progress(frame, SLUG_RUN));

// ---------------------------------------------------------------------------
// No mouth, the amoeba, the engulfing
// ---------------------------------------------------------------------------
/** The slime bumps the drumstick twice and gets nowhere. */
export const NUDGES = [shotStart("nomouth") + 16, shotStart("nomouth") + 34];
export const nudge = (frame: number) => NUDGES.reduce((x, at) => x + 0.22 * Math.sin(Math.PI * progress(frame, [at - 5, at + 6])), 0);
export const HAM_X = 0.95;
/** The amoeba's arms go out around the alga, then meet behind it. */
export const amoebaReach = (frame: number) => easeOutCubic(progress(frame, [shotStart("amoeba") + 4, BEATS.amoeba - 2]));
export const amoebaClose = (frame: number) => easeInOut(progress(frame, [BEATS.amoeba, shotEnd("amoeba") - 4]));

/** The engulfing: the slime creeps up, rears over the rogue on "flow over", comes down on "close around". */
export const PREY_X = 1.15;
export const HUNT_FROM = -1.2;
export const REAR = [BEATS.flow, BEATS.over + 8] as const;
export const SWALLOW = BEATS.close + 8;
export const SETTLE = BEATS.around + 8;
export const engulfX = (frame: number) =>
  keyed(
    [
      [shotStart("engulf"), HUNT_FROM],
      [BEATS.flow, HUNT_FROM + 0.5],
      [REAR[1], PREY_X - 1.2],
      [BEATS.close, PREY_X - 0.95],
      [SWALLOW, PREY_X - 0.15],
      [SETTLE, PREY_X - 0.15],
    ],
    frame,
  );
/** < 0 rears up into a wave, then it flops down wide and wobbles. */
export const engulfSquash = (frame: number) =>
  keyed(
    [
      [BEATS.flow - 6, 0],
      [BEATS.flow, 0.2],
      [REAR[1], -0.55],
      [BEATS.close, -0.62],
      [SWALLOW, 0.22],
      [SETTLE, 0],
    ],
    frame,
  ) + wobble(frame, SWALLOW, 0.14, 0.7, 10);
/** It leans over its dinner as it rears (radians about z). */
export const engulfLean = (frame: number) =>
  keyed(
    [
      [BEATS.flow, 0],
      [BEATS.close, -0.5],
      [SWALLOW, 0],
    ],
    frame,
  );
/** It is bigger with a rogue inside. */
export const FULL_SCALE = 1.95;
export const engulfScale = (frame: number) => lerp(VAULT_SCALE, FULL_SCALE, easeOutBack(progress(frame, [BEATS.close, SETTLE]), 1.4));

// ---------------------------------------------------------------------------
// Acid, the lining, your own stomach
// ---------------------------------------------------------------------------
/** The rogue is a skeleton from here on. */
export const DISSOLVE = BEATS.melts + 6;
/** 0..1: the acid starts on the slime itself ("would melt you too"). */
export const burning = (frame: number) => easeInOut(progress(frame, [BEATS.meltYou - 4, BEATS.too + 4])) * (1 - easeInOut(progress(frame, [BEATS.line, BEATS.lined])));
export const lining = (frame: number) => easeInOut(progress(frame, [BEATS.line, BEATS.lined + 4]));
/** The wave of fresh lining along the stomach wall (0..1 along it, -1 = none). Two passes. */
export const RENEW = [BEATS.rebuilds, BEATS.days + 14] as const;
export const renew = (frame: number) => {
  if (frame < RENEW[0] || frame > RENEW[1]) return -1;
  return (progress(frame, RENEW) * 2) % 1;
};
/** Age of the lining in days for the HUD: counts 1..4, then it is new again. */
export const liningDay = (frame: number) => 1 + Math.floor(clamp01((progress(frame, RENEW) * 2) % 1) * 4);

// ---------------------------------------------------------------------------
// One heart, one brain, millions of cores
// ---------------------------------------------------------------------------
/** The organs it never grows: each pops in on its word and bursts a moment later. */
export const HEART = [BEATS.heart - 2, BEATS.heart + 20] as const;
export const BRAIN = [BEATS.oneBrain - 2, BEATS.oneBrain + 20] as const;
export const organ = (frame: number, [a, b]: readonly [number, number]) => (frame < a || frame >= b ? 0 : easeOutBack(progress(frame, [a, a + 6]), 2.4) * (1 + 0.07 * Math.sin((frame - a) * 0.9)));
/** The one big core breaks up into the many on "cores". */
export const CORE_SPLIT = BEATS.cores;
export const bigCore = (frame: number) => 1 - easeInCubic(progress(frame, [CORE_SPLIT - 8, CORE_SPLIT]));
export const manyCores = (frame: number) => easeOutCubic(progress(frame, [CORE_SPLIT, BEATS.spread + 16]));

// ---------------------------------------------------------------------------
// The clincher: the paladin, the sword, two slimes
// ---------------------------------------------------------------------------
export const END_SCALE = 1.25;
export const HALF_SCALE = 0.95;
export const SLIME_Z = 0.35;
export const KNIGHT = { enter: 4.2, x: 0, z: -1.25 };
export const KNIGHT_ARRIVE = BEATS.weakest + 8;
export const knightX = (frame: number) => lerp(KNIGHT.enter, KNIGHT.x, easeOutCubic(progress(frame, [shotStart("weakest"), KNIGHT_ARRIVE])));
/** The halves fly apart on the cut, then round themselves off on "now". */
export const SPLIT_X = 0.78;
export const splitX = (frame: number) => SPLIT_X * easeOutBack(progress(frame, [BEATS.cut, BEATS.cut + 9]), 1.6);
export const ROUND_UP = BEATS.now;
/** How much each half is still a thin slice (1) rather than a round slime (0). */
export const sliced = (frame: number) => (frame < BEATS.cut ? 0 : 1 - easeOutBack(progress(frame, [ROUND_UP, ROUND_UP + 10]), 2.4));
export const halfSquash = (frame: number) => wobble(frame, BEATS.cut + 9, 0.16, 0.7, 9) + wobble(frame, ROUND_UP + 10, -0.14, 0.7, 10);
/** The last frames: both of them jump him. */
export const lungeT = (frame: number) => progress(frame, [BEATS.finalLunge, BEATS.finalLunge + 9]);
