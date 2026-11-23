import type { CameraPose, CameraTrack, Vec3 } from "../../engine/types";
import { chainTracks } from "../../kit";
import { actorCentre, HERO_SLEEP } from "./actors";
import { BEATS, DURATION, FACE, SHOTS, easeInOut, floor3, lerp, progress, shotEnd } from "./timeline";

/**
 * The camera: one track per move, hard cuts between them (chained so nothing drifts), and
 * `camPose(frame)`, the pose without shake, which the scene uses to aim its light.
 * 9:16 at fov 40: at distance d the frame is ~0.41·d wide and ~0.73·d tall.
 */

const B = BEATS;
const S = SHOTS;

const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const mixPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
});
/** A zoom between two poses: the distance changes by a constant factor per step, so it reads as one move. */
const zoomPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => {
  const da = a.position[2] - a.lookAt[2];
  const db = b.position[2] - b.lookAt[2];
  if (Math.abs(db - da) < 1e-3) return mixPose(a, b, t);
  const d = Math.exp(lerp(Math.log(da), Math.log(db), t));
  return mixPose(a, b, (d - da) / (db - da));
};
const ease = (f: number, a: number, b: number) => easeInOut(progress(f, [a, b]));
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Looking at (x, y, z) from d in front, `rise` above. */
const side = (x: number, y: number, d: number, rise = 0.4, z = 0): CameraPose => pose([x, y + rise, z + d], [x, y, z]);
const push = (start: number, end: number, a: CameraPose, b: CameraPose = a): CameraTrack => track(start, end, (f) => mixPose(a, b, ease(f, start, end)));
const zoom = (start: number, end: number, a: CameraPose, b: CameraPose): CameraTrack => track(start, end, (f) => zoomPose(a, b, ease(f, start, end)));
/** Consecutive pushes: each entry runs to the next one's start (the last to `end`). */
const cuts = (end: number, list: Array<[number, CameraPose, CameraPose?]>): CameraTrack[] =>
  list.map(([start, a, b], i) => push(start, i + 1 < list.length ? list[i + 1][0] : end, a, b ?? a));

/** The whole mountain: the mouth, the three levels and the ledge (its top under the HUD). */
export const WHOLE = side(10.8, -4.0, 92, 1.5, FACE);

// --- Open: outside in the rain, the water pouring into the mouth; then the boys inside.
const OUT_A = side(-4.0, 1.7, 12.5, 0.5);
const OUT_B = side(-2.8, 1.6, 10, 0.4);
const groupX = (f: number) => lerp(3.0, 3.0 + (S.whole - S.inside) * 0.04, progress(f, [S.inside, S.whole]));
const insideShot = (f: number): CameraPose => {
  const x = groupX(f) - 0.2;
  return pose([x + 0.4, 1.95, 12], [x, 1.4, -0.1]);
};
const open = [push(S.open, S.inside, OUT_A, OUT_B), track(S.inside, S.whole, insideShot)];

// --- Out to the whole mountain while the bends fill behind them, and into the ledge.
const LEDGE_CLIMB_A = side(13.2, -17.1, 12.5, 0.6);
const LEDGE_CLIMB_B = side(16.6, -16.4, 13.2, 0.6);
const whole = [zoom(S.whole, S.whole + 28, insideShot(S.whole), WHOLE), push(S.whole + 28, S.ledge - 16, WHOLE, side(12.2, -5.0, 86, 1.5, FACE)), zoom(S.ledge - 16, S.ledge + 4, side(12.2, -5.0, 86, 1.5, FACE), LEDGE_CLIMB_A)];

// --- The ledge: the climb, no food, the drink, the coach, sitting still.
const SEATED = side(18.0, -16.15, 10.6, 0.6);
const SEATED_IN = side(18.0, -16.15, 9.5, 0.55);
const ledge = cuts(shotEnd("ledge"), [
  [S.ledge + 4, LEDGE_CLIMB_A, LEDGE_CLIMB_B],
  [lineStart_a3() - 4, SEATED, SEATED_IN],
  [B.drink - 2, pose([19.05, -15.75, 2.4], [18.85, -15.45, -1.3]), pose([19.0, -15.7, 2.0], [18.85, -15.45, -1.3])],
  [B.coachTeaches - 6, pose([18.0, -15.95, 4.4], [16.2, -16.35, 0.2]), pose([17.8, -15.95, 4.0], [16.2, -16.35, 0.2])],
  [B.sit - 2, SEATED_IN, side(18.0, -16.2, 8.8, 0.5)],
]);

// --- Outside: the pumps, day into night. Under water: a diver in the first bend.
const pumps = [push(S.pumps, S.dive, side(-4.8, 1.8, 13, 0.7), side(-4.4, 1.7, 11.5, 0.6))];
const dive = [
  track(S.dive, S.found, (f) => {
    const c = actorCentre("d1", Math.max(f, B.divers - 2));
    const x = Math.max(10.0, c[0] + 0.3);
    return pose([x + 0.2, c[1] + 0.35, FACE + 4.2], [x, c[1] + 0.05, 0.2]);
  }),
];

// --- Day 10: the dim ledge, the light in the pool, the divers, the question, the answer.
const POOL = side(11.4, -17.5, 11.5, 0.5);
const found = cuts(shotEnd("found"), [
  [S.found, side(17.8, -16.15, 10.4, 0.6), side(17.4, -16.2, 9.6, 0.6)],
  [B.light - 8, POOL, side(11.3, -17.55, 10.4, 0.5)],
  [B.two + 30, side(12.9, -17.2, 11.5, 0.5), side(12.9, -17.2, 10.6, 0.5)],
  [B.how - 8, pose([13.75, -16.55, 3.0], [12.05, -16.85, 0.3]), pose([13.6, -16.6, 2.6], [12.05, -16.85, 0.3])],
  [B.thirteen - 4, pose([10.55, -16.35, 2.4], [14.6, -16.55, -0.3]), pose([10.75, -16.35, 2.1], [14.6, -16.55, -0.3])],
]);

// --- The way out: back up the cave from the ledge to the tightest bend, a diver squeezing through.
const squeeze = (f: number): CameraPose => {
  const c = actorCentre("d2", f);
  const x = Math.max(16.2, Math.min(20.4, c[0] + 0.2));
  const d = lerp(6.0, 4.4, ease(f, B.barely - 14, B.darkness + 10));
  return pose([x + 0.2, -9.2, FACE + d], [x, -9.55, 0.2]);
};
const wayOut = [zoom(S.wayOut, B.barely - 14, side(13.6, -16.9, 9.5, 0.5), side(12.5, -12.6, 33, 1.0)), track(B.barely - 14, shotEnd("wayOut"), squeeze)];

// --- The air going thin; the volunteer; the tanks along the route.
const air = [push(S.air, shotEnd("air"), side(18.0, -16.15, 10.0, 0.6), side(18.0, -16.2, 8.8, 0.5))];
const TANKS_WIDE = side(13.0, -13.6, 30, 1.0);
const tanks = [
  track(S.tanks, B.dies + 6, (f) => {
    const c = actorCentre("d3", f);
    const x = Math.max(15.6, c[0] + 0.3);
    return pose([x + 0.2, -9.25, FACE + 4.6], [x, -9.55, 0.1]);
  }),
  push(B.dies + 6, B.laying - 4, pose([18.6, -9.25, FACE + 4.6], [18.4, -9.6, 0.1]), pose([18.6, -9.25, FACE + 5.4], [18.4, -9.6, 0.1])),
  zoom(B.laying - 4, shotEnd("tanks"), pose([18.6, -9.25, FACE + 5.4], [18.4, -9.6, 0.1]), TANKS_WIDE),
];

// --- Outside: the submarine rolled up to the mouth; afterwards, left there in the sun.
const SUB_X = -4.1;
const sub = [push(S.sub, B.practical - 8, side(SUB_X - 0.6, 1.05, 8.6, 0.45, 1.0), side(SUB_X - 0.2, 1.0, 7.2, 0.4, 1.0)), push(B.practical - 8, shotEnd("sub"), side(SUB_X, 0.85, 5.6, 0.35, 1.2), side(SUB_X, 0.85, 5.0, 0.3, 1.2))];
const after = [push(S.after, shotEnd("after"), side(SUB_X - 0.4, 1.2, 9.4, 0.5, 0.8), side(SUB_X - 0.2, 1.1, 7.8, 0.45, 0.9))];

// --- Asleep, masked, wrapped; towed out.
const [hx] = HERO_SLEEP;
const hy = floor3(hx);
const BODY = pose([hx - 0.5, hy + 1.6, 4.6], [hx - 0.6, hy + 0.5, 0.6]);
const sleep = cuts(shotEnd("sleep"), [
  [S.sleep, pose([hx - 0.4, hy + 1.9, 5.4], [hx - 0.6, hy + 0.55, 0.6]), BODY],
  [B.mask - 12, pose([hx - 1.2, hy + 1.7, 2.3], [hx - 1.34, hy + 0.2, 0.55]), pose([hx - 1.2, hy + 1.55, 2.0], [hx - 1.34, hy + 0.2, 0.55])],
  [B.stretcher - 8, BODY, pose([hx - 0.5, hy + 1.5, 4.0], [hx - 0.6, hy + 0.45, 0.6])],
]);
const tow = [
  track(S.tow, S.out, (f) => {
    const c = actorCentre("d1", f);
    const x = Math.max(3.4, Math.min(8.8, c[0] - 0.2));
    return pose([x - 0.2, -18.85, FACE + 4.6], [x, -19.15, 0.4]);
  }),
];

// --- Out, three waves, on the whole mountain; then the mouth in the sun, and out again.
const out = [push(S.out, shotEnd("out"), side(12.2, -5.0, 88, 1.5, FACE), WHOLE)];
const SUN_MOUTH = side(-4.4, 1.9, 12.5, 0.6);
const end = [push(S.end, B.every - 16, SUN_MOUTH, side(-4.2, 1.9, 11.2, 0.5)), zoom(B.every - 16, B.home + 4, side(-4.2, 1.9, 11.2, 0.5), side(10.0, -2.0, 96, 1.5, FACE)), push(B.home + 4, DURATION, side(10.0, -2.0, 96, 1.5, FACE), side(10.0, -2.0, 100, 1.5, FACE))];

function lineStart_a3(): number {
  return B.noFood - 12;
}

export const TRACKS: CameraTrack[] = chainTracks(([] as CameraTrack[]).concat(open, whole, ledge, pumps, dive, found, wayOut, air, tanks, sub, sleep, tow, out, after, end));

export const OPENING = OUT_A;

/** The camera's pose on a frame, without shake (later tracks win, as in the rig). */
export const camPose = (f: number): CameraPose => {
  let p: CameraPose = OPENING;
  for (const t of TRACKS) if (f >= t.start && f <= t.end) p = t.fn(f);
  return p;
};
