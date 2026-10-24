import cues from "./data/cues.json";
import type { Pose } from "../../toon/Character";
import type { ExpressionName } from "../../toon/Face";
import {
  easeBack,
  easeInOut,
  easeOut,
  lerp,
  lerpVec,
  sampleTrack,
  type Key,
  type Vec,
} from "../../toon/math";

type LineId = keyof typeof cues.lines;

export const w = (line: LineId, nth = 0) => cues.lines[line][nth].start;

export const FPS = 30;
export const DURATION = 150;

export const BEATS = {
  level: w("title", 0),
  present: w("title", 4),
  heavy: w("heavy"),
  simple: w("simple"),
  brutal: w("brutal"),
  ow: w("yelp"),
};

/** The ball rolls off his fingertip just before "Brutal" and lands on his foot inside the word. */
export const SLIP = BEATS.brutal - 6;
export const IMPACT = BEATS.brutal + 3;
export const HURT_AT = IMPACT + 9;

export const ROOT: Vec = [540, 1500];
export const BALL_R = 58;

const IDLE: Pose = {
  hip: [0, -378],
  lean: 0,
  head: 0,
  handB: [-125, -330],
  handF: [140, -420],
  footB: [-60, 0],
  footF: [50, 0],
};
const PRESENT: Pose = {
  hip: [6, -380],
  lean: -5,
  head: 8,
  handB: [-82, -440],
  handF: [205, -650],
  footB: [-60, 0],
  footF: [62, 0],
};
const OVERHEAD: Pose = {
  hip: [0, -330],
  lean: 0,
  head: -4,
  handB: [-62, -900],
  handF: [62, -905],
  footB: [-98, 0],
  footF: [92, 0],
};
const SHOWOFF: Pose = {
  hip: [0, -380],
  lean: 3,
  head: -6,
  handB: [-88, -470],
  handF: [150, -930],
  footB: [-60, 0],
  footF: [55, 0],
};
const FLAIL: Pose = {
  hip: [-10, -372],
  lean: -6,
  head: 10,
  handB: [-215, -760],
  handF: [185, -820],
  footB: [-70, 0],
  footF: [60, 0],
};
const JOLT: Pose = {
  hip: [-10, -425],
  lean: -4,
  head: -10,
  handB: [-235, -870],
  handF: [205, -890],
  footB: [-70, -12],
  footF: [60, 0],
};
const HURT: Pose = {
  hip: [-30, -395],
  lean: -8,
  head: 12,
  handB: [92, -282],
  handF: [150, -268],
  footB: [-62, 0],
  footF: [122, -250],
};

/** Gestures land 3-5 frames before their word, then hold dead still. */
const POSE_KEYS: Key<Pose>[] = [
  { f: 0, v: IDLE },
  { f: BEATS.present - 9, v: IDLE },
  { f: BEATS.present - 3, v: PRESENT, ease: easeBack },
  { f: BEATS.heavy - 12, v: PRESENT },
  { f: BEATS.heavy - 4, v: OVERHEAD, ease: easeOut },
  { f: BEATS.simple - 10, v: OVERHEAD },
  { f: BEATS.simple - 4, v: SHOWOFF, ease: easeBack },
  { f: SLIP, v: SHOWOFF },
  { f: SLIP + 4, v: FLAIL, ease: easeOut },
  { f: IMPACT, v: FLAIL },
  { f: IMPACT + 2, v: JOLT, ease: easeOut },
  { f: HURT_AT, v: HURT, ease: easeBack },
];

export const hop = (f: number) =>
  f > HURT_AT ? Math.abs(Math.sin((Math.PI * (f - HURT_AT)) / 8)) * 44 : 0;

export const poseAt = (f: number): Pose => {
  const p = sampleTrack(POSE_KEYS, f);
  if (f >= BEATS.heavy - 4 && f < BEATS.simple - 10) {
    const tr = Math.sin(f * 2.7) * 3;
    return {
      ...p,
      handB: [p.handB[0] + tr, p.handB[1]],
      handF: [p.handF[0] + tr, p.handF[1]],
      hip: [p.hip[0] + tr * 0.5, p.hip[1]],
    };
  }
  return p;
};

/** Faces swap through a blink: half, closed, new face ~2 frames before the stressed word. */
const FACE_KEYS: { f: number; v: ExpressionName }[] = [
  { f: 0, v: "bored" },
  { f: BEATS.present - 2, v: "smug" },
  { f: BEATS.heavy - 2, v: "strain" },
  { f: BEATS.simple - 2, v: "proud" },
  { f: SLIP + 1, v: "shock" },
  { f: IMPACT + 7, v: "pain" },
];
const EXTRA_BLINKS = [24, 140];

export const faceAt = (f: number) => {
  let cur = FACE_KEYS[0];
  for (const k of FACE_KEYS) if (f >= k.f) cur = k;
  let blink: 0 | 1 | 2 = 0;
  for (const k of FACE_KEYS.slice(1)) {
    if (f === k.f - 2) blink = 1;
    if (f === k.f - 1) blink = 2;
  }
  for (const b of EXTRA_BLINKS) {
    if (f === b || f === b + 2) blink = 1;
    if (f === b + 1) blink = 2;
  }
  return { expr: cur.v, blink, age: f - cur.f };
};

const anchors = (p: Pose) => ({
  waist: [p.handF[0] + 8, p.handF[1] - 60] as Vec,
  two: [
    (p.handB[0] + p.handF[0]) / 2,
    (p.handB[1] + p.handF[1]) / 2 - 48,
  ] as Vec,
  tip: [p.handF[0], p.handF[1] - 76] as Vec,
});

const BALL_ON_FOOT: Vec = [80, -74];
const blendT = (f: number, a: number, b: number) =>
  easeInOut(Math.min(1, Math.max(0, (f - a) / (b - a))));

/** Ball centre relative to ROOT, and its spin in degrees. */
export const ballAt = (f: number): { p: Vec; spin: number; held: boolean } => {
  if (f < SLIP) {
    const a = anchors(poseAt(f));
    let p: Vec;
    if (f < BEATS.heavy - 12) p = a.waist;
    else if (f < BEATS.heavy - 4)
      p = lerpVec(a.waist, a.two, blendT(f, BEATS.heavy - 12, BEATS.heavy - 4));
    else if (f < BEATS.simple - 10) p = a.two;
    else {
      // Ride the front hand while the back hand lets go, so the ball never sinks.
      const hold = poseAt(BEATS.simple - 10);
      const rel = anchors(hold).two;
      const off = lerpVec(
        [rel[0] - hold.handF[0], rel[1] - hold.handF[1]],
        [0, -76],
        blendT(f, BEATS.simple - 10, BEATS.simple - 4),
      );
      p = [a.tip[0] + off[0], a.tip[1] + 76 + off[1]];
    }
    return { p, spin: 0, held: true };
  }
  if (f < IMPACT) {
    const p0 = anchors(poseAt(SLIP)).tip;
    const T = IMPACT - SLIP;
    const t = f - SLIP;
    const vy0 = -10;
    const g = (2 * (BALL_ON_FOOT[1] - p0[1] - vy0 * T)) / (T * T);
    return {
      p: [
        lerp(p0[0], BALL_ON_FOOT[0], t / T),
        p0[1] + vy0 * t + 0.5 * g * t * t,
      ],
      spin: t * 12,
      held: false,
    };
  }
  const t = f - IMPACT;
  const x = BALL_ON_FOOT[0] + 240 * (1 - Math.exp(-t / 12));
  const ground = -BALL_R;
  const settle = Math.min(1, t / 3);
  const y =
    lerp(BALL_ON_FOOT[1], ground, settle) -
    Math.abs(Math.sin((Math.PI * t) / 9)) * 46 * Math.exp(-t / 7);
  return {
    p: [x, y],
    spin: ((x - BALL_ON_FOOT[0]) / BALL_R) * (180 / Math.PI),
    held: false,
  };
};

/** "LEVEL 1" sign: drops in on "Level", settles with a damped swing, is yanked out before "Heavy". */
export const signAt = (f: number) => {
  const inStart = BEATS.level - 4;
  const inEnd = BEATS.level + 4;
  const outStart = BEATS.heavy - 12;
  const outEnd = BEATS.heavy - 4;
  let y = 400;
  if (f < inEnd)
    y = lerp(
      -500,
      400,
      easeBack(Math.min(1, Math.max(0, (f - inStart) / (inEnd - inStart)))),
    );
  if (f > outStart)
    y = lerp(
      400,
      -700,
      easeInOut(Math.min(1, (f - outStart) / (outEnd - outStart))),
    );
  const swing =
    f > inEnd
      ? Math.sin((f - inEnd) * 0.45) * 7 * Math.exp(-(f - inEnd) / 14)
      : 0;
  return { y, swing };
};

export interface Cam {
  fx: number;
  fy: number;
  zoom: number;
  rot: number;
}

const camLerp = (a: Cam, b: Cam, t: number): Cam => ({
  fx: lerp(a.fx, b.fx, t),
  fy: lerp(a.fy, b.fy, t),
  zoom: lerp(a.zoom, b.zoom, t),
  rot: lerp(a.rot, b.rot, t),
});
const span = (f: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (f - a) / (b - a)));

/** The camera never stops: slow creep, a faster move that starts on a word, and 6-frame dissolves. */
export const SHOTS: { from: number; to: number; cam: (f: number) => Cam }[] = [
  {
    from: 0,
    to: BEATS.heavy + 6,
    cam: (f) => {
      const a: Cam = { fx: 560, fy: 1080, zoom: 1.22, rot: 0 };
      const b: Cam = { fx: 565, fy: 1070, zoom: 1.27, rot: 0 };
      const c: Cam = { fx: 625, fy: 1000, zoom: 1.44, rot: 0.8 };
      const d: Cam = { fx: 635, fy: 975, zoom: 1.54, rot: 1.2 };
      if (f < BEATS.present - 4)
        return camLerp(a, b, span(f, 0, BEATS.present - 4));
      if (f < BEATS.present + 5)
        return camLerp(
          b,
          c,
          easeOut(span(f, BEATS.present - 4, BEATS.present + 5)),
        );
      return camLerp(
        c,
        d,
        Math.pow(span(f, BEATS.present + 5, BEATS.heavy + 6), 1.6),
      );
    },
  },
  {
    from: BEATS.heavy,
    to: SLIP + 6,
    cam: (f) =>
      camLerp(
        { fx: 540, fy: 840, zoom: 1.5, rot: -2 },
        { fx: 545, fy: 815, zoom: 1.62, rot: -3.2 },
        span(f, BEATS.heavy, SLIP + 6),
      ),
  },
  {
    from: SLIP,
    to: DURATION,
    cam: (f) => {
      const base = camLerp(
        { fx: 650, fy: 1090, zoom: 1.22, rot: 1.5 },
        { fx: 625, fy: 1070, zoom: 1.34, rot: 0.5 },
        easeOut(span(f, SLIP, DURATION)),
      );
      const punch = f >= IMPACT ? 0.08 * Math.exp(-(f - IMPACT) / 4) : 0;
      return { ...base, zoom: base.zoom + punch };
    },
  },
];

export const DISSOLVE = 6;

export const captionWords = (
  [] as { word: string; start: number; end: number }[]
).concat(...(Object.keys(cues.lines) as LineId[]).map((k) => cues.lines[k]));
