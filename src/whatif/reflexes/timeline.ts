import { createCues, easeInOut, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Reflexes (long-form, 1920x1080): "What if you could react 10x faster, but
 * your body couldn't?" Beats, shots, the story clocks and every bit of motion
 * shared by Scene.tsx, config.ts and the HUD. Pure functions of the frame;
 * every beat is `w(line, word) ± n` from the voiced narration
 * (scripts/reflexes-audio.py).
 *
 * The rule the pictures follow: the world plays 10x slower on screen whenever
 * we are inside Kit's head, and his own body is just as slow. The numbers
 * (checked in docs/ifkit/reflexes-10x-script.md) drive the HUD readouts.
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
  // The milk glass
  brain: w("a1", "brain"),
  tenTimes: w("a1", "ten"),
  catchWord: w("a2", "catch"),
  bodyNot: w("a2", "body"),
  breakfast: w("a3", "Breakfast"),
  tess: w("a3", "Tess"),
  reaches: w("a3", "reaches"),
  clips: w("a3", "clips"),
  blink: w("a4", "blink"),
  hangs: w("a4", "hangs"),
  edge: w("a4", "edge"),
  thinking: w("a4", "thinking"),
  know: w("a5", "know"),
  catchIt: w("a5", "Catch"),
  decision: w("a5", "decision"),
  tell: w("a6", "tell"),
  move: w("a6", "move"),
  wait: w("a6", "wait"),
  drifts: w("a7", "drifts"),
  honey: w("a7", "honey"),
  tips: w("a7", "tips"),
  pours: w("a7", "pours"),
  ribbon: w("a7", "ribbon"),
  fourSeconds: w("a8", "Four"),
  crawl: w("a8", "crawl"),
  close: w("a9", "close"),
  floor: w("a9", "floor"),
  see: w("a10", "see"),
  snatched: w("a10", "snatched"),
  slowest: w("a11", "slowest"),
  // Why your body can't keep up
  why: w("b1", "why"),
  quarter: w("b1", "quarter"),
  inside: w("b2", "inside"),
  eyes: w("b2", "eyes"),
  brainWorks: w("b2", "brain"),
  decides: w("b2", "decides"),
  nowTen: w("b3", "ten"),
  nerves: w("b4", "nerves"),
  twoHundred: w("b4", "two"),
  car: w("b4", "car"),
  thought: w("b4", "thought"),
  muscle: w("b5", "muscle", 1),
  switchOn: w("b5", "switch"),
  none: w("b6", "None"),
  twoAndHalf: w("b6", "two"),
  race: w("b7", "race"),
  blocks: w("b7", "blocks"),
  gun: w("b7", "gun"),
  line: w("b7", "line"),
  falseStart: w("b7", "false"),
  strange: w("b8", "strange"),
  slower: w("b8", "slower"),
  includingYou: w("b8", "Including"),
  // Life in slow motion
  movies: w("c1", "movies"),
  blinkC: w("c2", "blink"),
  dark: w("c2", "dark"),
  talking: w("c3", "Talking"),
  finish: w("c3", "finish"),
  mouth: w("c3", "mouth"),
  one: w("c3", "one"),
  slow: w("c3", "slow"),
  word: w("c3", "word"),
  aTime: w("c3", "time"),
  sixHour: w("c4", "six"),
  sixty: w("c4", "sixty"),
  math: w("c4", "math"),
  fullDay: w("c4", "full"),
  stub: w("c5", "stub"),
  bedFrame: w("c5", "frame"),
  sting: w("c6", "sting"),
  ache: w("c6", "ache"),
  walkingSpeed: w("c6", "walking"),
  eleven: w("c7", "eleven"),
  coming: w("c7", "coming"),
  arrives: w("c8", "arrives"),
  grandpa: w("c9", "Grandpa"),
  wise: w("c9", "wise"),
  speak: w("c9", "speak"),
  // Dodgeball
  friday: w("d1", "Friday"),
  dodgeball: w("d1", "dodgeball"),
  paysOff: w("d1", "pays"),
  marcus: w("d2", "Marcus"),
  hardest: w("d2", "hardest"),
  forty: w("d2", "Forty"),
  twentyFeet: w("d3", "twenty"),
  thirdSecond: w("d3", "third"),
  threeSeconds: w("d3", "three"),
  plenty: w("d4", "Plenty"),
  leave: w("d4", "leave"),
  seams: w("d4", "seams"),
  stepLeft: w("d4", "left"),
  legsStart: w("d5", "legs"),
  halfway: w("d6", "halfway"),
  sideways: w("d7", "sideways"),
  legsNot: w("d7", "not"),
  watchCome: w("d8", "watch"),
  stomach: w("d8", "stomach"),
  bench: w("d9", "bench"),
  replay: w("d9", "replay"),
  nobody: w("d9", "Nobody"),
  windBack: w("d10", "wind"),
  quarterD: w("d10", "quarter"),
  everyoneElse: w("d11", "Everyone"),
  shoulder: w("d11", "shoulder"),
  nextRound: w("d12", "Next"),
  twists: w("d12", "twists"),
  moving: w("d12", "moving"),
  flies: w("d13", "flies"),
  spot: w("d13", "spot"),
  usedToBe: w("d13", "used"),
  notFaster: w("d14", "faster"),
  earlier: w("d14", "earlier"),
  wins: w("d15", "wins"),
  future: w("d15", "future"),
  shoulders: w("d15", "shoulders"),
  // The ladder
  sunday: w("e1", "Sunday"),
  stepladder: w("e1", "stepladder"),
  gutter: w("e1", "gutter"),
  holdLadder: w("e1", "hold"),
  calls: w("e2", "calls"),
  lemonade: w("e2", "Lemonade"),
  letGo: w("e2", "let"),
  moment: w("e2", "moment"),
  fourSteps: w("e3", "four"),
  leans: w("e3", "leans"),
  tooFar: w("e3", "far"),
  rocks: w("e4", "rocks"),
  oneDegree: w("e4", "One"),
  notice: w("e5", "notice"),
  nothing: w("e5", "nothing"),
  startFall: w("e6", "start"),
  secret: w("e7", "secret"),
  startSlow: w("e7", "slow"),
  barely: w("e8", "barely"),
  fiveDeg: w("e8", "five"),
  speedsUp: w("e8", "speeds"),
  hitsGround: w("e8", "hits"),
  cannotRun: w("e9", "run"),
  secondHalf: w("e9", "half"),
  normalKid: w("e10", "normal"),
  fiveE10: w("e10", "five"),
  startRunning: w("e10", "running"),
  thirdAfter: w("e10", "third"),
  grass: w("e10", "grass"),
  sawIt: w("e11", "saw"),
  oneE11: w("e11", "one"),
  alreadyRunning: w("e12", "already"),
  fourteenSlow: w("e12", "Fourteen"),
  lean: w("e12", "lean", 2),
  rail: w("e13", "rail"),
  fourteen: w("e13", "fourteen"),
  heavyPush: w("e14", "push"),
  shove: w("e15", "shove"),
  thump: w("e15", "thump"),
  grabsGutter: w("e15", "grabs"),
  holds: w("e15", "holds"),
  looksDown: w("e16", "looks"),
  tessE16: w("e16", "Tess"),
  noIdea: w("e16", "idea"),
  // Payoff
  night: w("f1", "night"),
  fastest: w("f1", "fastest"),
  youAreNot: w("f2", "not"),
  everyoneF: w("f2", "everyone"),
  alreadyFall: w("f2", "fall", 1),
  wobble: w("f2", "wobble"),
  atBreakfast: w("f3", "breakfast"),
  clipsAgain: w("f3", "clips"),
  sigh: w("f4", "sigh"),
  journey: w("f4", "journey"),
  table: w("f4", "table"),
  // Hook
  deal: w("end", "deal"),
  sameOld: w("end", "same"),
  comments: w("end", "comments"),
  subscribe: w("end", "subscribe"),
} as const;

// ---------------------------------------------------------------------------
// Shots: which set is on screen (hard cuts on these frames).
// ---------------------------------------------------------------------------
export type ShotId =
  | "kitchen"
  | "replay"
  | "after"
  | "body"
  | "race"
  | "self"
  | "classroom"
  | "bedroom"
  | "porch"
  | "gym"
  | "bench"
  | "gym2"
  | "yard"
  | "graph"
  | "save"
  | "night"
  | "kitchen2"
  | "outro";

export const SHOT_STARTS: [ShotId, number][] = [
  ["kitchen", 0],
  ["replay", BEATS.see - 4],
  ["after", lineStart("a11") - 6],
  ["body", lineStart("b1") - 8],
  ["race", lineStart("b7") - 6],
  ["self", lineStart("b8") - 6],
  ["classroom", lineStart("c1") - 8],
  ["bedroom", lineStart("c5") - 6],
  ["porch", lineStart("c9") - 8],
  ["gym", lineStart("d1") - 8],
  ["bench", lineStart("d9") - 8],
  ["gym2", lineStart("d12") - 6],
  ["yard", lineStart("e1") - 8],
  ["graph", lineStart("e7") - 6],
  ["save", lineStart("e11") - 6],
  ["night", lineStart("f1") - 8],
  ["kitchen2", lineStart("f3") - 6],
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
// Story clocks
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
 * The milk glass, on a "kitchen clock" k (a frame number in the slow version).
 * The slow version runs on the narration; the replay maps 18 frames of real
 * time (0.6 s: the clip, the slide, the fall, the catch) onto the same clock.
 */
export const MILK = {
  clip: BEATS.clips,
  edge: BEATS.edge,
  tips: BEATS.tips,
  move: BEATS.move,
  pours: BEATS.pours,
  close: BEATS.close,
};
export const REPLAY = { start: BEATS.see, len: 18 };
export const kitchenClock = (frame: number) => {
  if (frame < REPLAY.start) return Math.min(frame, MILK.close + (frame - MILK.close) * 0.1);
  if (frame < REPLAY.start + REPLAY.len) return lerp(MILK.clip - 6, MILK.close, (frame - REPLAY.start) / REPLAY.len);
  return MILK.close + (frame - REPLAY.start - REPLAY.len) * 0.1;
};
/** The glass slides from Tess's elbow to the table edge (0..1). */
export const glassSlide = (k: number, clip: number) => easeInOut(progress(k, [clip, clip + 14]));
/** The fall (0 on the edge .. 1 an inch above the floor), accelerating like a real drop. */
export const glassFall = (k: number, tips: number, close: number) => progress(k, [tips, close]) ** 2;
/** Kit's dive (0 in his chair .. 1 hand under the glass): a slow start, then a steady crawl. */
export const kitDive = (k: number, move: number, close: number) => {
  const t = progress(k, [move, close]);
  return t < 0.25 ? 0.5 * (t / 0.25) ** 2 * 0.25 : 0.125 + (t - 0.25) * (0.875 / 0.75);
};

/** Felt seconds since the milk was clipped (real × 10); the HUD runs a stopwatch on it. */
export const FELT = {
  milk: { from: BEATS.clips, to: BEATS.close, real: 0.6 },
  ball: { from: BEATS.leave, to: BEATS.stomach, real: 0.33 },
  ladder: { from: BEATS.oneDegree, to: BEATS.rail, real: 1.5 },
};

// ---------------------------------------------------------------------------
// Dodgeball: the first throw (watch the ball) and the second (watch the shoulder)
// ---------------------------------------------------------------------------
/** Marcus's throwing spot and Kit's spot, 20 ft (6.1 m) apart along x. */
export const MARCUS_X = -3.05;
export const KIT_GYM_X = 3.05;
/** Kit's sidestep (toward -z, "left" as he faces Marcus). */
export const STEP = 0.75;

/** Throw 1: windup before "leave", release on "leave", the stomach on "stomach". */
export const THROW1 = { windup: BEATS.leave - 16, release: BEATS.leave, hit: BEATS.stomach };
/** Kit's first sidestep: starts on "legs", gets about a third of the way before the hit. */
export const STEP1 = { start: BEATS.legsStart, end: BEATS.stomach + 50 };
/** Throw 2: the shoulder twists on "twists", Kit moves on "moving", the ball passes on "spot". */
export const THROW2 = { windup: BEATS.twists, release: BEATS.flies - 6, pass: BEATS.spot + 4 };
export const STEP2 = { start: BEATS.twists + 4, end: BEATS.flies + 2 };

/** Ball flight 0..1 from Marcus's hand to Kit's stomach line. */
export const ballFlight = (frame: number, release: number, arrive: number) => progress(frame, [release, arrive]);

// ---------------------------------------------------------------------------
// The ladder: an inverted pendulum (tau 0.45 s); theta(t) = 1 deg · cosh(t / tau).
// On screen the angle is keyed to the narration so the numbers land on their words.
// ---------------------------------------------------------------------------
export const TAU = 0.45;
export const thetaAt = (t: number) => Math.cosh(t / TAU);
/** Ladder tip in degrees. */
export const ladderDeg = (frame: number) => {
  if (frame < BEATS.rocks) return 0;
  if (frame < BEATS.oneDegree) return progress(frame, [BEATS.rocks, BEATS.oneDegree]);
  if (frame < BEATS.alreadyRunning) return 1 + 0.4 * progress(frame, [BEATS.oneDegree, BEATS.alreadyRunning]);
  if (frame < BEATS.rail) {
    // Felt time over the sprint: 1.4 real seconds stretched across the line, along the cosh curve.
    const t = lerp(0.1, 1.5, progress(frame, [BEATS.alreadyRunning, BEATS.rail]));
    return Math.max(1.4, thetaAt(t));
  }
  if (frame < BEATS.thump) return 14 * (1 - easeInOut(progress(frame, [BEATS.shove, BEATS.thump])));
  return 0;
};

/** The ladder tips toward +x (the porch side); Kit walks off toward the lemonade and sprints back to catch the +x rail. */
export const LADDER_X = 0;
export const KIT_LEMON_X = 3.6;
export const KIT_RAIL_X = LADDER_X + 1.15;
