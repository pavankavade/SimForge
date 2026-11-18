import type { CameraPose, CameraTrack, Vec3 } from "../../engine/types";
import { chainTracks, crashZoom } from "../../kit";
import { actorPos } from "./actors";
import {
  ARRIVE,
  BEATS,
  DURATION,
  FACE,
  PROBES,
  SH,
  SHOTS,
  SURF,
  TOP,
  TUBE,
  capsuleY,
  easeInOut,
  lerp,
  lineStart,
  planBitY,
  probePoint,
  probeProgress,
  probeTipY,
  progress,
  rampY,
  shotEnd,
  tubeY,
} from "./timeline";

/**
 * The camera: one track per move, hard cuts between them (chained so nothing drifts), and
 * `camPose(frame)`, the pose without shake, which the scene uses to aim its light.
 * 9:16 at fov 40: at distance d the frame is ~0.41·d wide and ~0.73·d tall.
 */

const B = BEATS;
const S = SHOTS;
const W = SURF.winch;
const PX = SURF.probe;
const CUT = SURF.cut;
const T = TOP;

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

/** The whole mountain, from the camp to under the shelter. */
const WHOLE = side(2.5, 28.5, 94, 1.5, FACE);

// --- Open: in the ramp with the hero and the truck, the roof comes down, and out to the mountain.
const rampShot = (f: number): CameraPose => {
  const x = lerp(14.9, 13.0, ease(f, 0, B.collapse));
  return pose([x + 0.7, rampY(x) + 2.5, FACE + lerp(11.4, 9.6, ease(f, 0, B.collapse))], [x, rampY(x) + 1.6, 0.2]);
};
const WHIP_OUT = B.down + 2;
const open = [
  track(S.open, WHIP_OUT, rampShot),
  zoom(WHIP_OUT, B.between + 12, rampShot(WHIP_OUT), WHOLE),
  push(B.between + 12, S.shelterA, WHOLE, side(2.5, 27.5, 88, 1.5, FACE)),
];

// --- The shelter.
const SHELTER_IN = pose([0.6, 3.4, 26], [0.6, 1.5, 0]);
const shelterA = ([] as CameraTrack[]).concat(
  [zoom(S.shelterA, S.shelterA + 16, side(2.5, 27.5, 88, 1.5, FACE), SHELTER_IN), push(S.shelterA + 16, S.shelterA + 60, SHELTER_IN, pose([0.9, 2.9, 16], [0.9, 1.4, 0]))],
  cuts(B.ladders - 6, [
    [S.shelterA + 60, pose([-2.75, 1.65, 2.3], [-4.2, 1.1, -1.4]), pose([-2.85, 1.62, 2.0], [-4.2, 1.1, -1.4])],
    [B.nobody - 4, pose([-3.15, 0.75, 1.5], [-3.8, 1.95, -0.95]), pose([-3.2, 0.7, 1.3], [-3.8, 2.0, -0.95])],
    [lineStart("a3") - 4, side(3.8, 1.8, 7.2, 0.6, -0.4), side(4.2, 1.8, 6.6, 0.6, -0.4)],
  ]),
  // Up the ventilation shaft: brackets, and no ladders.
  [
    track(B.ladders - 6, B.never + 20, (f) => {
      const y = lerp(2.2, 21, ease(f, B.ladders - 2, B.never + 18));
      return pose([SH.vent[0] + 0.5, y + 0.7, FACE + 8.6], [SH.vent[0], y, -0.2]);
    }),
  ],
  cuts(shotEnd("shelterA"), [
    [B.never + 20, pose([4.45, 1.6, 2.5], [4.95, 1.45, -0.6]), pose([4.5, 1.6, 2.2], [4.95, 1.45, -0.6])],
    [lineStart("a4") - 4, pose([-1.9, 3.0, 7.2], [-1.9, 0.8, 0]), pose([-1.9, 2.8, 6.4], [-1.9, 0.8, 0])],
    [B.spoons - 12, pose([-1.86, 1.02, 1.12], [-2.0, 0.53, 0.37]), pose([-1.88, 0.98, 1.0], [-2.0, 0.53, 0.37])],
    [B.cracker + 14, pose([-1.8, 2.2, 5.0], [-2.0, 0.9, -0.3]), pose([-1.8, 2.1, 4.6], [-2.0, 0.9, -0.3])],
  ])
);

// --- Drills: the first rig, down its hole with the bit, and the misses on the mountain's face.
const P0 = PROBES[0].top;
const bit0 = (f: number) => probePoint(0, probeProgress(0, f));
const drills = [
  push(S.drills, B.holes - 6, pose([P0 + 1.6, T + 3.8, FACE + 12], [P0 + 0.3, T + 2.6, FACE - 0.6]), pose([P0 + 1.4, T + 3.3, FACE + 10.4], [P0 + 0.3, T + 2.3, FACE - 0.6])),
  track(B.holes - 6, B.maps - 6, (f) => {
    const [x, y] = bit0(f);
    return pose([x + 0.25, y + 1.0, FACE + 5.0], [x, y + 0.55, FACE]);
  }),
  push(B.maps - 6, shotEnd("drills"), side(-4.5, 14, 62, 2, FACE), side(-4.5, 12, 55, 2, FACE)),
];

// --- Day 17: the bit comes through the roof at the cut face, the paint, the note.
const found = cuts(shotEnd("found"), [
  [S.found, pose([0.9, 2.6, 13.5], [0.9, 1.4, 0.3]), pose([0.9, 2.4, 12], [0.9, 1.4, 0.3])],
  [B.grinding - 6, pose([2.9, 1.5, 8.4], [1.6, 2.5, 1.4]), pose([2.8, 1.5, 7.8], [1.6, 2.55, 1.4])],
  [B.bursts - 2, pose([2.1, 1.9, 6.8], [1.5, 2.1, 1.7])],
  [B.paint - 8, pose([2.0, 1.78, 5.5], [1.25, 1.78, 1.7]), pose([1.95, 1.78, 5.1], [1.25, 1.78, 1.7])],
]);
const rideUp = [
  track(S.rideUp, shotEnd("rideUp"), (f) => {
    const y = probeTipY(f);
    return pose([PX + 0.5, y + 1.3, FACE + 6.4], [PX, y + 0.8, FACE]);
  }),
];
const note = cuts(shotEnd("note"), [
  [S.note, pose([PX + 1.3, T + 2.0, FACE + 5.8], [PX + 0.4, T + 1.4, FACE - 0.7]), pose([PX + 1.2, T + 1.9, FACE + 5.0], [PX + 0.4, T + 1.4, FACE - 0.7])],
  [B.weAreFine + 22, pose([PX + 1.8, T + 1.6, FACE + 2.4], [PX + 1.4, T + 1.45, FACE - 0.4]), pose([PX + 1.75, T + 1.6, FACE + 2.0], [PX + 1.4, T + 1.45, FACE - 0.4])],
]);

// --- The lifeline: a tube goes in at the top, down the hole, and out of the shelter roof.
const life = [
  push(S.life, TUBE.drop - 2, pose([PX + 1.5, T + 2.1, FACE + 5.6], [PX + 0.3, T + 1.3, FACE - 0.4]), pose([PX + 1.4, T + 1.9, FACE + 5.0], [PX + 0.3, T + 1.1, FACE - 0.4])),
  track(TUBE.drop - 2, TUBE.roof - 6, (f) => {
    const y = tubeY(f) + 0.75;
    return pose([PX + 0.3, y + 0.6, FACE + 5.6], [PX, y + 0.2, FACE]);
  }),
  push(TUBE.roof - 6, shotEnd("life"), pose([2.2, 1.9, 6.6], [1.35, 2.0, 1.7]), pose([2.1, 1.85, 6.0], [1.35, 1.95, 1.7])),
];
const person = [push(S.person, shotEnd("person"), side(0.3, 1.2, 3.9, 0.25, 0.55), side(0.3, 1.2, 3.6, 0.2, 0.55))];

// --- Three rigs on top, and their race down the mountain.
const RIGS = pose([-1.2, T + 6.5, FACE + 31], [-1.2, T + 3.6, FACE - 1]);
const RIGS_IN = pose([-1.2, T + 5.6, FACE + 28], [-1.2, T + 3.3, FACE - 1]);
const RACE = side(0.5, 29, 92, 1.5, FACE);
const race = [push(S.race, B.race - 8, RIGS, RIGS_IN), zoom(B.race - 8, B.race + 8, RIGS_IN, RACE), push(B.race + 8, shotEnd("race"), RACE, side(-0.5, 24, 80, 1.5, FACE))];
const bits = [
  track(S.bits, shotEnd("bits"), (f) => {
    const y = planBitY(f);
    return pose([W + 0.7, y + 1.5, FACE + 6.6], [W, y + 0.7, FACE]);
  }),
];

// --- Day 65: the roof breaks, and the measure.
const heroAt = (f: number) => actorPos("hero", f);
const breakthrough = cuts(shotEnd("breakthrough"), [
  [S.breakthrough, pose([-1.7, 1.2, 9.6], [-2.4, 2.0, 1.2]), pose([-1.8, 1.15, 8.8], [-2.4, 2.05, 1.2])],
  [B.breaks - 2, pose([-2.1, 1.3, 7.4], [-2.6, 2.2, 1.6])],
  [B.breaks + 30, pose([4.8, 1.75, 6.2], [4.2, 1.0, 0.9])],
  [B.capsule - 10, side(0.1, 1.2, 3.6, 0.2, 0.95), side(0.1, 1.2, 3.2, 0.15, 0.95)],
]);
const jogFollow = track(B.breaks + 34, B.capsule - 10, (f) => {
  const x = Math.max(0.4, heroAt(f)[0]);
  return pose([x + 0.4, 1.75, 6.2], [x, 1.0, 0.9]);
});

// --- The capsule, and the pithead at night.
const capAt = (f: number) => T + Math.max(capsuleY(f), -4.6);
const phoenix = [
  push(S.phoenix, B.wheels - 8, pose([W + 0.8, T + 3.6, CUT + 9.4], [W, T + 3.2, CUT - 0.4]), pose([W + 0.7, T + 3.5, CUT + 8.6], [W, T + 3.1, CUT - 0.4])),
  track(B.wheels - 8, B.hatch - 8, (f) => pose([W + 0.45, capAt(f) + 2.3, CUT + 5.2], [W, capAt(f) + 1.9, CUT])),
  track(B.hatch - 8, shotEnd("phoenix"), () => pose([W + 0.55, capAt(B.jams) + 0.55, CUT + 3.3], [W, capAt(B.jams) + 0.35, CUT])),
];
const capUp = (f: number) => T + Math.min(capsuleY(f), ARRIVE);
const night = [
  push(S.night, B.rises - 30, pose([W - 0.6, T + 4.6, CUT + 13.4], [W - 0.6, T + 2.0, CUT - 2.6]), pose([W - 0.4, T + 4.2, CUT + 12.0], [W - 0.4, T + 2.0, CUT - 2.6])),
  track(B.rises - 30, B.sunglasses - 6, (f) => pose([W + 0.7, capUp(f) + 2.2, CUT + 5.6], [W + 0.2, capUp(f) + 1.9, CUT])),
  push(B.sunglasses + 34, B.oneByOne - 2, side(W + 1.6, T + 1.3, 6.9, 0.7, 0.4), side(W + 1.6, T + 1.3, 6.3, 0.6, 0.4)),
  push(B.oneByOne - 2, B.last - 4, pose([W + 2.0, T + 3.0, 10.3], [W + 2.2, T + 1.3, 0.3]), pose([W + 2.0, T + 2.8, 9.5], [W + 2.2, T + 1.3, 0.3])),
  push(B.last - 4, shotEnd("night"), pose([W + 1.3, T + 1.8, 5.7], [W + 1.2, T + 1.4, 1.2]), pose([W + 1.35, T + 1.75, 5.1], [W + 1.3, T + 1.45, 1.2])),
];
const sunglassesZoom = crashZoom(B.sunglasses - 6, B.sunglasses + 34, pose([W + 1.35, T + 1.72, CUT + 1.75], [W + 1.1, T + 1.66, CUT - 0.15]), { zoom: 1.6 });

// --- The end: the camp, and back out to the whole mountain.
const CAMP_END = pose([W + 2.2, T + 3.4, CUT + 13], [W + 2.2, T + 1.6, CUT - 1.5]);
const end = [push(S.end, B.sevenHundred - 12, CAMP_END, pose([W + 2.2, T + 3.2, CUT + 12], [W + 2.2, T + 1.6, CUT - 1.5])), zoom(B.sevenHundred - 12, B.every + 6, pose([W + 2.2, T + 3.2, CUT + 12], [W + 2.2, T + 1.6, CUT - 1.5]), WHOLE), push(B.every + 6, DURATION, WHOLE, side(2.5, 28, 98, 1.5, FACE))];

export const TRACKS: CameraTrack[] = chainTracks(
  ([] as CameraTrack[]).concat(open, shelterA, drills, found, rideUp, note, life, person, race, bits, breakthrough, phoenix, night, end)
).concat([jogFollow, sunglassesZoom]);

export const OPENING = rampShot(0);

/** The camera's pose on a frame, without shake (later tracks win, as in the rig). */
export const camPose = (f: number): CameraPose => {
  let p: CameraPose = OPENING;
  for (const t of TRACKS) if (f >= t.start && f <= t.end) p = t.fn(f);
  return p;
};
