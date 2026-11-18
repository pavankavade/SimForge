import { BOARD_H, CURB_X, KICK_H, KICK_L, QP_R, qpPoint } from "../../artifacts/heal";
import { bezier3, createCues, easeInOut, easeOutCubic, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Heal (long-form, 1920x1080): "What if you healed 100x faster, but you were
 * always starving?" Beats, shots, the energy gauge and every bit of motion
 * shared by Scene.tsx, config.ts and the HUD. Pure functions of the frame;
 * every beat is `w(line, word) ± n` from the voiced narration
 * (scripts/heal-audio.py).
 *
 * The rule the pictures follow: healing glows and costs fuel. The ENERGY
 * gauge drains whenever Kit heals and refills whenever he eats. The numbers
 * (docs/ifkit/heal-100x-script.md) drive the HUD readouts.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
/** Action plane: actors stand on z = Z, the camera looks from +z. */
export const Z = 0;

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
export const BEATS = {
  // The paper cut
  healed: w("a1", "healed"),
  hundred: w("a1", "hundred"),
  brokenBone: w("a1", "broken"),
  catchWord: w("a2", "catch"),
  hungry: w("a2", "hungry"),
  monday: w("a3", "Monday"),
  slice: w("a3", "slice"),
  thumb: w("a3", "thumb"),
  threeDays: w("a4", "three"),
  fortyMin: w("a4", "forty"),
  edges: w("a5", "edges"),
  eat: w("a5", "eat"),
  eatAgain: w("a5", "eat", 1),
  firstBowl: w("a6", "first"),
  second: w("a6", "second"),
  third: w("a6", "third"),
  stares: w("a7", "stares"),
  bus: w("a8", "bus"),
  cutGone: w("a8", "gone"),
  hungryAgain: w("a8", "hungry"),
  // Healing is building
  why: w("b1", "why"),
  building: w("b1", "building"),
  skin: w("b2", "skin"),
  vessels: w("b2", "vessels"),
  bone: w("b2", "bone"),
  eatB2: w("b2", "eat"),
  protein: w("b2", "Protein"),
  bricks: w("b2", "bricks"),
  calories: w("b2", "calories"),
  spread: w("b3", "spread"),
  everyMeal: w("b3", "meal"),
  neverNotice: w("b3", "notice"),
  billOnce: w("b4", "bill"),
  atOnce: w("b4", "once"),
  foodSlow: w("b5", "slow"),
  digest: w("b5", "digest"),
  savings: w("b5", "savings"),
  fat: w("b6", "fat"),
  muscle: w("b6", "muscle"),
  // Always hungry
  rules: w("c1", "rules"),
  knee: w("c2", "knee"),
  twoWeeks: w("c2", "two"),
  threeHours: w("c2", "three"),
  candy: w("c2", "candy"),
  bruise: w("c3", "bruise"),
  lunch: w("c3", "lunch", 1),
  friends: w("c3", "friend's"),
  snacks: w("c4", "snacks"),
  granola: w("c4", "Granola"),
  peanut: w("c4", "Peanut"),
  grandpaBill: w("c5", "bill"),
  horse: w("c5", "horse"),
  warm: w("c6", "warm"),
  heat: w("c6", "heat"),
  bike: w("c7", "bike"),
  radiator: w("c7", "radiator"),
  sweating: w("c7", "sweating"),
  // The broken arm
  saturday: w("d1", "Saturday"),
  dares: w("d1", "dares"),
  bigRamp: w("d1", "ramp"),
  worst: w("d2", "worst"),
  iHeal: w("d2", "heal"),
  dropIn: w("d3", "drop"),
  lip: w("d3", "lip"),
  arm: w("d3", "arm"),
  crack: w("d4", "Crack"),
  sixWeeks: w("d5", "six"),
  tenHours: w("d5", "ten"),
  remembers: w("d6", "remembers"),
  shape: w("d6", "shape"),
  doctorWait: w("d7", "doctor"),
  knitting: w("d7", "knitting"),
  straight: w("d8", "straight"),
  crooked: w("d8", "crooked"),
  drives: w("d9", "drives"),
  straightens: w("d10", "straightens"),
  cast: w("d10", "cast"),
  seeSix: w("d10", "six"),
  tomorrow: w("d10", "tomorrow"),
  night: w("d11", "night"),
  billNight: w("d11", "bill"),
  tenThousand: w("d12", "ten"),
  oneNight: w("d12", "night"),
  marathon: w("d13", "marathon"),
  bed: w("d13", "bed"),
  fever: w("d14", "fever"),
  midnight: w("d14", "midnight"),
  two: w("d14", "two"),
  four: w("d14", "four"),
  pancakes: w("d15", "pancakes"),
  batter: w("d15", "batter"),
  runsOut: w("d15", "out"),
  morning: w("d16", "morning"),
  whole: w("d16", "whole"),
  jeans: w("d16", "jeans"),
  kilo: w("d16", "kilo"),
  rampAgain: w("d17", "ramp"),
  free: w("d17", "free"),
  // The wagon
  thanksgiving: w("e1", "Thanksgiving"),
  steepest: w("e1", "steepest"),
  rabbit: w("e2", "rabbit"),
  wagon: w("e2", "wagon"),
  letsGo: w("e3", "lets"),
  oneSecond: w("e3", "second"),
  rolls: w("e4", "rolls"),
  faster: w("e4", "faster"),
  downHill: w("e4", "hill"),
  cars: w("e4", "cars"),
  tessRunning: w("e5", "running"),
  math: w("e6", "math"),
  tessHurt: w("e7", "hurt"),
  weeks: w("e7", "Weeks"),
  months: w("e7", "months"),
  youHurt: w("e8", "hurt"),
  dinner: w("e8", "dinner"),
  sprint: w("e9", "sprint"),
  grab: w("e9", "grab"),
  heels: w("e9", "heels"),
  drags: w("e9", "drags"),
  slams: w("e9", "slams"),
  curb: w("e9", "curb"),
  ribs: w("e10", "ribs"),
  stops: w("e10", "stops"),
  road: w("e10", "road"),
  hugsRabbit: w("e11", "hugs"),
  hugsYou: w("e11", "hugs", 1),
  alreadyHealing: w("e11", "healing"),
  starving: w("e11", "starving"),
  // Healing is a budget
  atDinner: w("f1", "dinner"),
  turkeyLeg: w("f1", "leg"),
  secondOne: w("f1", "second"),
  slides: w("f2", "slides"),
  potatoes: w("f2", "potatoes"),
  lazy: w("f3", "lazy"),
  budget: w("f3", "budget"),
  littleTime: w("f4", "little"),
  allAtOnce: w("f4", "once"),
  pie: w("f5", "pie"),
  // Hook
  deal: w("end", "deal"),
  overnight: w("end", "overnight"),
  weekFood: w("end", "week"),
  comments: w("end", "comments"),
  subscribe: w("end", "subscribe"),
} as const;

// ---------------------------------------------------------------------------
// Shots: which set is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "kitchen"
  | "body"
  | "scrape"
  | "lunch"
  | "pantry"
  | "radiator"
  | "skate"
  | "xray"
  | "drive"
  | "clinic"
  | "bedNight"
  | "pancakes"
  | "morning"
  | "skate2"
  | "hill"
  | "dinner"
  | "outro";

export const SHOT_STARTS: [ShotId, number][] = [
  ["kitchen", 0],
  ["body", lineStart("b1") - 8],
  ["scrape", lineStart("c1") - 8],
  ["lunch", lineStart("c3") - 6],
  ["pantry", lineStart("c4") - 6],
  ["radiator", lineStart("c6") - 6],
  ["skate", lineStart("d1") - 8],
  ["xray", lineStart("d5") - 6],
  ["drive", lineStart("d9") - 6],
  ["clinic", lineStart("d10") - 6],
  ["bedNight", lineStart("d11") - 8],
  ["pancakes", lineStart("d15") - 6],
  ["morning", lineStart("d16") - 6],
  ["skate2", lineStart("d17") - 6],
  ["hill", lineStart("e1") - 8],
  ["dinner", lineStart("f1") - 8],
  ["outro", lineStart("end") - 6],
];

export const shotAt = (frame: number): ShotId => {
  let id: ShotId = "kitchen";
  for (const [s, f] of SHOT_STARTS) if (frame >= f) id = s;
  return id;
};
export const shotStart = (id: ShotId) => SHOT_STARTS.filter((s) => s[0] === id)[0][1];
export const shotEnd = (id: ShotId) => {
  const i = SHOT_STARTS.map((s) => s[0]).indexOf(id);
  return i + 1 < SHOT_STARTS.length ? SHOT_STARTS[i + 1][1] : DURATION;
};

// ---------------------------------------------------------------------------
// Story curves
// ---------------------------------------------------------------------------
/** Piecewise curve through [frame, value] keys (eased by default). */
export const keyed = (keys: [number, number][], frame: number, ease = true) => {
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

/**
 * The ENERGY gauge (0..1): it drains while Kit heals and refills while he
 * eats. A pure function of the frame, keyed to the story beats.
 */
export const energy = (frame: number) =>
  keyed(
    [
      [0, 0.82],
      [BEATS.slice, 0.82],
      [BEATS.edges, 0.62],
      [BEATS.firstBowl, 0.6],
      [BEATS.third + 20, 0.9],
      [BEATS.cutGone, 0.72],
      [BEATS.hungryAgain, 0.68],
      // The scrape, the bruise, the lunches, the snacks
      [BEATS.knee, 0.68],
      [BEATS.threeHours, 0.5],
      [BEATS.candy + 15, 0.62],
      [BEATS.bruise, 0.62],
      [BEATS.lunch, 0.5],
      [BEATS.friends + 15, 0.74],
      [BEATS.granola, 0.78],
      [BEATS.bike, 0.78],
      [BEATS.sweating, 0.55],
      // The broken arm: the night empties the tank, the pancakes refill it
      [BEATS.crack, 0.8],
      [BEATS.tomorrow, 0.72],
      [BEATS.billNight, 0.7],
      [BEATS.oneNight, 0.42],
      [BEATS.marathon, 0.3],
      [BEATS.midnight, 0.12],
      [BEATS.four, 0.05],
      [BEATS.pancakes, 0.05],
      [BEATS.runsOut, 0.45],
      [BEATS.whole, 0.38],
      // Thanksgiving: the curb, the healing, the dinner
      [BEATS.thanksgiving, 0.7],
      [BEATS.curb, 0.7],
      [BEATS.alreadyHealing, 0.4],
      [BEATS.starving, 0.18],
      [BEATS.turkeyLeg, 0.3],
      [BEATS.potatoes, 0.6],
      [BEATS.pie, 0.86],
    ],
    frame,
  );

/** Healing glow (0..1) on Kit while a wound is closing. */
export const healGlow = (frame: number) => {
  const pulse = (a: number, b: number) => (frame >= a && frame < b ? Math.sin(Math.PI * progress(frame, [a, b])) : 0);
  return Math.max(
    pulse(BEATS.edges - 10, BEATS.cutGone + 10) * 0.6,
    pulse(BEATS.knee, BEATS.candy + 10) * 0.6,
    pulse(BEATS.bruise - 6, BEATS.lunch + 10) * 0.5,
    Math.min(1, 2.5 * pulse(BEATS.warm - 6, lineEnd("c7") + 20)),
    pulse(BEATS.billNight, BEATS.whole) * 1.0,
    pulse(BEATS.ribs - 4, BEATS.starving + 30) * 0.8,
  );
};

/** A wound healing 0 (fresh) .. 1 (gone), for the HUD's magnifier bubble. */
export const WOUNDS = {
  cut: { from: BEATS.slice, to: BEATS.cutGone },
  knee: { from: BEATS.knee, to: BEATS.candy },
  bruise: { from: BEATS.bruise - 4, to: BEATS.lunch },
  bone: { from: BEATS.crack, to: BEATS.whole },
};

// ---------------------------------------------------------------------------
// The skate park: Kit drops into the quarter pipe, rolls across the flat,
// hits the kicker, the board catches the lip and he flies off onto his arm.
// ---------------------------------------------------------------------------
/** The bottom of the quarter pipe's transition (it rises toward -x), the kicker's low end, the landing spot. */
export const QP_X = -3.4;
export const KICK_X = 1.0;
export const LIP: [number, number] = [KICK_X + KICK_L, KICK_H];
export const LAND_X = LIP[0] + 1.7;
/** Path lengths: the transition arc, the flat, the kicker slope. */
const ARC = (QP_R * Math.PI) / 2;
const FLAT = KICK_X - QP_X;
const KICK_LEN = Math.hypot(KICK_L, KICK_H);
const PATH = ARC + FLAT + KICK_LEN;
/** Drop in on "drop", hit the lip on "lip", land on "arm". */
export const SKATE = { stand: shotStart("skate"), drop: BEATS.dropIn, lip: BEATS.lip, land: BEATS.arm };

/** Kit's board on the run: ground point under the board and the surface angle (radians, positive = nose up). */
export const boardAt = (frame: number): { x: number; y: number; angle: number } => {
  if (frame < SKATE.drop) return { x: QP_X - QP_R - 0.4, y: QP_R, angle: 0 };
  const t = progress(frame, [SKATE.drop, SKATE.lip]);
  // Gravity does the work on the way down: slow off the coping, fast at the bottom.
  const s = PATH * (0.45 * t * t + 0.55 * t);
  if (s < ARC) {
    const phi = Math.PI / 2 - s / QP_R;
    const [px, py] = qpPoint(phi);
    return { x: QP_X + px, y: py, angle: -phi };
  }
  if (s < ARC + FLAT) return { x: QP_X + (s - ARC), y: 0, angle: 0 };
  const u = (s - ARC - FLAT) / KICK_LEN;
  return { x: KICK_X + KICK_L * u, y: KICK_H * u, angle: Math.atan2(KICK_H, KICK_L) };
};

/** Kit's flight off the lip (0..1 from the lip to the ground) as hip point and forward rotation. */
export const flightAt = (frame: number): { hip: [number, number]; tilt: number } => {
  const t = progress(frame, [SKATE.lip, SKATE.land]);
  const [hx, hy] = bezier3([LIP[0], LIP[1] + BOARD_H + 0.6, 0], [LIP[0] + 0.6, 1.5, 0], [LAND_X - 0.4, 1.0, 0], [LAND_X, 0.3, 0], t);
  return { hip: [hx, hy], tilt: -lerp(0.2, 1.5, easeOutCubic(t)) };
};

// ---------------------------------------------------------------------------
// The hill: everything keyed along x (downhill = +x). The world slows to a
// crawl while Kit does the math (e6..e8), then real time again for the sprint.
// ---------------------------------------------------------------------------
/** Where things start: the wagon at the top of the slope, Tess on the handle, Kit by the porch. */
export const WAGON0 = 0.7;
export const TESS0 = -0.15;
export const KIT0 = -2.2;
/** Kit's back hits the curb; the wagon stops against him. */
export const KIT_STOP = CURB_X - 0.22;
export const WAGON_STOP = KIT_STOP - 0.72;
export const GRAB_X = 6.6;

export const wagonX = (frame: number) =>
  keyed(
    [
      [BEATS.letsGo, WAGON0],
      [BEATS.rolls, WAGON0 + 0.08],
      [BEATS.tessRunning, WAGON0 + 2.0],
      [BEATS.math, WAGON0 + 3.0],
      [BEATS.sprint, WAGON0 + 3.5],
      [BEATS.grab, GRAB_X],
      [BEATS.curb, WAGON_STOP],
    ],
    frame,
  );
/** Kit: still until "sprint", catches the wagon from its downhill side on "grab", dragged to the curb on "curb". */
export const kitHillX = (frame: number) => {
  if (frame < BEATS.sprint) return KIT0;
  if (frame < BEATS.grab) return lerp(KIT0, GRAB_X + 0.72, easeInOut(progress(frame, [BEATS.sprint, BEATS.grab])));
  return lerp(GRAB_X + 0.72, KIT_STOP, easeOutCubic(progress(frame, [BEATS.grab, BEATS.curb])));
};
export const tessHillX = (frame: number) =>
  keyed(
    [
      [BEATS.letsGo, TESS0],
      [BEATS.tessRunning - 10, TESS0 + 0.2],
      [BEATS.math, TESS0 + 1.6],
      [BEATS.sprint, TESS0 + 2.0],
      [BEATS.curb, TESS0 + 4.0],
      [BEATS.hugsRabbit - 4, KIT_STOP - 1.3],
    ],
    frame,
  );
/** The wagon's speed (units/frame) for wheel spin and the rattle. */
export const wagonSpeed = (frame: number) => Math.abs(wagonX(frame + 1) - wagonX(frame));
