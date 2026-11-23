import type { CameraPose, CameraTrack, Vec3 } from "../../engine/types";
import { chainTracks } from "../../kit";
import { SCRIPTS } from "./actors";
import { BEATS, CROOK_X, CROOK_Y, DURATION, FLOOR2, HATCH_X0, HATCH_X1, HATCH_Y, REAL, SHAFT_DOWN, SHAFT_X, SHOTS, SECRET_DOOR, STAIR, TABLE, easeInOut, lerp, progress, shotEnd } from "./timeline";

/**
 * The camera: one track per shot, hard cuts between them (chained so nothing drifts), and
 * `camPose(frame)`, the pose without shake (the HUD projects the measuring ropes' labels with it).
 * 9:16 at fov 40: at distance d the frame is ~0.41·d wide and ~0.73·d tall. The floor sits a
 * quarter of the way up the frame (centre ≈ 0.25 × height above it), clear of the subtitles.
 */

const B = BEATS;
const S = SHOTS;

const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const mixPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
});
const ease = (f: number, a: number, b: number) => easeInOut(progress(f, [a, b]));
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Looking at (x, y) on the action plane (z = -1.3) from d in front of it, `rise` above. */
const ACTION_Z = -1.3;
const side = (x: number, y: number, d: number, rise = 0.35, z = ACTION_Z): CameraPose => pose([x, y + rise, z + d], [x, y, z]);
/** Framed so the floor sits a quarter of the way up: centre height from the distance. */
const floorShot = (x: number, d: number, floorY = 0, rise = 0.35): CameraPose => side(x, floorY + 0.25 * 0.73 * d, d, rise);
const push = (start: number, end: number, a: CameraPose, b: CameraPose = a): CameraTrack => track(start, end, (f) => mixPose(a, b, ease(f, start, end)));
const shot = (start: number, a: CameraPose, b: CameraPose = a): CameraTrack => push(start, shotEnd(start), a, b);

// --- The hook: the hall, the door, the priest; the title card sits over the upper floor.
export const OPENING = floorShot(-3.9, 10.6);
const open = shot(S.open, OPENING, floorShot(-3.7, 9.4));
// --- Up the stairs and in under them.
const stairs = shot(S.stairs, floorShot(-2.0, 7.6), floorShot(-1.0, 6.8));
// --- The door bursts in; the hunter crosses the hall to the stairs.
const burst = shot(S.burst, floorShot(-4.0, 9.4), floorShot(-3.4, 9.0));
// --- Close on the step and the hide as the boot lands.
const STEP_X = (HATCH_X0 + HATCH_X1) / 2 + 0.2;
const step = shot(S.step, side(STEP_X + 0.15, 1.55, 7.6, 1.3), side(STEP_X + 0.2, 1.55, 7.1, 1.2));
// --- The hinge goes on; the drop; the bolt.
const hinge = shot(S.hinge, side(-0.45, 1.65, 6.6, 1.3), side(-0.35, 1.6, 6.0, 1.2));
// --- Inside the hide, looking up at the underside of the step: the bolt slides home.
const BOLT_AT: Vec3 = [HATCH_X0 - 0.12, HATCH_Y - STAIR.rise - 0.08, -2.08];
const boltShot = shot(S.boltShot, pose([0.35, 0.75, -1.72], BOLT_AT), pose([0.2, 0.8, -1.75], BOLT_AT));
// --- The knocks along the panel, then the brick.
const tap = shot(S.tap, floorShot(-0.75, 7.4, 0, 0.7), floorShot(-0.65, 7.0, 0, 0.7));
const brick = shot(S.brick, floorShot(-0.3, 6.8, 0, 0.7), floorShot(-0.25, 6.2, 0, 0.7));
// --- The whole house from outside, the ropes.
/** Wide shots put the ground higher (38% up) so the subtitles sit on the earth below it. */
const wideShot = (x: number, d: number): CameraPose => side(x, 0.12 * 0.73 * d, d, 0.8);
export const WIDE = wideShot(-0.4, 34);
const measure = shot(S.measure, wideShot(0.1, 42), wideShot(0.1, 40));
// --- Upstairs to the garderobe and down the shaft (the frame sinks with him).
const SHAFT_HIGH = side(2.45, 3.15, 7.0, 0.35);
const SHAFT_LOW = floorShot(2.1, 7.0);
const shaft = track(S.shaft, shotEnd(S.shaft), (f) => mixPose(SHAFT_HIGH, SHAFT_LOW, ease(f, SHAFT_DOWN[0] - 4, SHAFT_DOWN[1] + 6)));
// --- The kitchen and the shaft beside it, all week.
/** The guards' room only: the shaft with the priest in it stays out of this frame. */
const kitchen = shot(S.kitchen, floorShot(TABLE.x - 0.05, 6.4), floorShot(TABLE.x, 6.0));
const starve = shot(S.starve, side(SHAFT_X, 1.05, 3.8, 0.3), side(SHAFT_X, 1.0, 3.3, 0.3));
// --- The owner upstairs feeding the reed down; then close on the drink.
const reed = shot(S.reed, floorShot(2.35, 8.6), floorShot(2.35, 8.0));
const drink = shot(S.drink, side(SHAFT_X, 1.5, 2.8, 0.15), side(SHAFT_X, 1.52, 2.5, 0.15));
// --- The panels torn off in the hall.
const tear = shot(S.tear, floorShot(-4.4, 7.4, FLOOR2), floorShot(-4.35, 6.9, FLOOR2));
// --- The empty decoy; the peek through the secret door; both rooms.
const decoy = shot(S.decoy, floorShot(0.25, 5.2), floorShot(0.3, 4.6));
const DOOR_AT: Vec3 = [REAL.x0, 0.55, (SECRET_DOOR.z0 + SECRET_DOOR.z1) / 2];
/** From inside the decoy, looking straight at its far end: the brick-faced door, and who is behind it. */
const peek = shot(S.peek, pose([-0.55, 0.72, DOOR_AT[2]], DOOR_AT), pose([-0.3, 0.7, DOOR_AT[2]], DOOR_AT));
const twoRooms = shot(S.twoRooms, floorShot(0.85, 6.4), floorShot(0.85, 6.0));
// --- The search: forced, cheered, into the decoy, the thump; out with the candlestick.
const search = shot(S.search, floorShot(-0.75, 7.6, 0, 1.1), floorShot(-0.6, 7.2, 0, 1.0));
const thump = shot(S.thumpShot, floorShot(1.15, 5.0), floorShot(1.2, 4.6));
const exit = track(S.exit, shotEnd(S.exit), (f) => {
  const x = Math.max(-4.9, Math.min(-2.4, SCRIPTS.h2.pos(f)[0]));
  return floorShot(x, 7.6);
});
// --- The crooked step, the trip, the whole staircase.
const CROOK = CROOK_X;
/** Level with the step and close, so its tilt against the treads either side reads from the front. */
const STEP_CLOSE = side(CROOK + 0.05, CROOK_Y + 0.15, 2.3, 0.2);
const STAIRS_WIDE = floorShot((STAIR.x0 + STAIR.x0 + STAIR.n * STAIR.going) / 2, 10.5);
const crooked = track(S.crooked, shotEnd(S.crooked), (f) => {
  if (f < B.nobodySuspects - 6) return STEP_CLOSE;
  return mixPose(STEP_CLOSE, STAIRS_WIDE, ease(f, B.nobodySuspects - 6, B.nobodySuspects + 30));
});
// --- The cat on her step; the candle in the real chamber.
const CAT_X = STAIR.x0 + 12.5 * STAIR.going;
const CAT_Y = 13 * STAIR.rise;
const catShot = shot(S.catShot, side(CAT_X, CAT_Y + 0.3, 2.7, 0.3, -2.15), side(CAT_X, CAT_Y + 0.28, 2.3, 0.25, -2.15));
const candleShot = shot(S.candleShot, floorShot((REAL.x0 + REAL.x1) / 2, 3.7), floorShot((REAL.x0 + REAL.x1) / 2, 3.2));
// --- Out to the whole house for the stamp.
const end = push(S.end, DURATION, WIDE, wideShot(-0.4, 32));

export const TRACKS: CameraTrack[] = chainTracks([
  open,
  stairs,
  burst,
  step,
  hinge,
  boltShot,
  tap,
  brick,
  measure,
  shaft,
  kitchen,
  starve,
  reed,
  drink,
  tear,
  decoy,
  peek,
  twoRooms,
  search,
  thump,
  exit,
  crooked,
  catShot,
  candleShot,
  end,
]);

/** The camera's pose on a frame, without shake (later tracks win, as in the rig). */
export const camPose = (f: number): CameraPose => {
  let p: CameraPose = OPENING;
  for (const t of TRACKS) if (f >= t.start && f <= t.end) p = t.fn(f);
  return p;
};
