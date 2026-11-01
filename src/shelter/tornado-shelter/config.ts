import type { CameraPose, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit/sfx";
import { LOWPOLY_GRADE, LOWPOLY_POSTFX } from "../../lowpoly";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  ANCHOR_N,
  BEATS,
  BLOW,
  BOARD_HIT,
  COVER_IN,
  DEBRIS,
  DOOR_OPEN,
  DOWN,
  DURATION,
  FIRE,
  FUNNEL6,
  HIT3,
  L2_START,
  L4C_START,
  LAB_X,
  LAB_Y,
  LAUNCH,
  LAYER_IN,
  LIFT,
  LOAD,
  PEBBLE_HIT,
  ROOF_GAG,
  STEEL_HANG,
  SUPPLY_AT,
  TEAR,
  WINDOW_OPEN,
  X_SLAM,
  Z,
  anchorAt,
  hingeAt,
  lineStart,
  lockAt,
  run1,
} from "./timeline";

const sfx = sfxFor("tornado-shelter", "shelter");

// ---------------------------------------------------------------------------
// Camera: each shot a slow move A -> B over [start, end]; the gap to the next
// shot is a quick whip. fov 40: at distance d the frame is about 0.41·d wide
// and 0.73·d tall. Front shots look along -z into the cutaway.
// ---------------------------------------------------------------------------

const P = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
/** Front-on shot of point (x, y) on the action plane from distance d. */
const front = (x: number, y: number, d: number, rise = 1.0): CameraPose => P([x, y + rise, Z + d], [x, y, Z - 1]);

interface Shot {
  start: number;
  end: number;
  a: CameraPose;
  b: CameraPose;
}

const LAUNCH_END = LAUNCH("kid")[1];

const SHOTS: Shot[] = [
  // L1: the house in the storm; the run to the closet; the wall tears off; the hedge
  { start: 0, end: BEATS.siren + 8, a: P([2.6, 6.4, 31], [2.4, 4.6, -10]), b: P([2.6, 6.0, 28], [2.4, 4.2, -10]) },
  { start: BEATS.siren + 12, end: run1("kid")[1] - 6, a: front(3.0, 1.4, 11), b: front(-3.6, 1.4, 11) },
  { start: lineStart("l1b") - 4, end: TEAR[0] - 3, a: P([-3.4, 2.6, 9.0], [-5.4, 1.3, -0.5]), b: P([-3.6, 2.5, 8.2], [-5.4, 1.3, -0.5]) },
  { start: TEAR[0] - 1, end: L2_START - 2, a: P([-4.4, 3.4, 14], [-6.6, 1.6, -0.5]), b: P([-7.0, 2.8, 12.5], [-8.6, 0.8, -0.2]) },
  // L2: walk into the middle room; the board
  { start: L2_START, end: lineStart("l2b") - 6, a: front(-1.6, 1.4, 14.5, 1.6), b: front(-0.8, 1.4, 12.5, 1.4) },
  { start: lineStart("l2b") - 2, end: BOARD_HIT - 5, a: front(0.0, 1.4, 10.5), b: front(-0.3, 1.4, 9.6) },
  { start: BOARD_HIT - 3, end: lineStart("l3a") - 6, a: P([0.1, 2.4, Z + 8.8], [-0.4, 1.4, -0.4]), b: P([0.1, 2.3, Z + 8.1], [-0.4, 1.4, -0.4]) },
  // L3: the debris stream; the lining; the cannon test
  { start: DEBRIS[0] + 2, end: lineStart("l3b") - 8, a: P([12, 3.4, 17], [1.5, 3.6, -5]), b: P([10.5, 3.6, 15], [1.0, 3.8, -5]) },
  { start: lineStart("l3b") - 4, end: lineStart("l3c") - 8, a: front(0, 1.5, 10.5, 0.9), b: front(-0.1, 1.5, 9.6, 0.8) },
  { start: lineStart("l3c") - 4, end: FIRE - 8, a: P([LAB_X - 0.5, LAB_Y + 2.8, 13.5], [LAB_X - 0.5, LAB_Y + 1.6, -1]), b: P([LAB_X - 0.4, LAB_Y + 2.7, 12.5], [LAB_X - 0.4, LAB_Y + 1.6, -1]) },
  { start: FIRE - 6, end: lineStart("l4a") - 8, a: P([LAB_X + 0.2, LAB_Y + 2.0, 7.6], [LAB_X + 0.2, LAB_Y + 1.2, -1]), b: P([LAB_X + 0.1, LAB_Y + 2.0, 7.0], [LAB_X + 0.1, LAB_Y + 1.2, -1]) },
  // L4: the room lifts; the window gag; slammed down and bolted
  { start: lineStart("l4a") - 4, end: lineStart("l4b") - 6, a: front(0.4, 1.6, 11.5, 1.2), b: front(0.4, 1.7, 10.2, 1.1) },
  { start: lineStart("l4b") - 2, end: BEATS.wind4 - 6, a: P([3.8, 2.2, Z + 6.6], [3.7, 1.7, -3.1]), b: P([3.7, 2.1, Z + 5.6], [3.7, 1.75, -3.1]) },
  { start: BEATS.wind4 - 2, end: L4C_START - 2, a: front(2.6, 2.6, 21, 1.6), b: front(2.4, 3.0, 23, 1.8) },
  { start: L4C_START, end: lineStart("l5a") - 6, a: front(0.4, 1.2, 9.6, 1.4), b: front(0.4, 1.1, 8.8, 1.3) },
  // L5: from the bedroom at the door; the steel door; the vents from behind the house
  { start: lineStart("l5a") - 2, end: lineStart("l5b") - 6, a: P([-5.0, 2.1, 6.4], [-2.3, 1.2, 0.9]), b: P([-4.6, 1.9, 5.4], [-2.3, 1.2, 0.9]) },
  { start: lineStart("l5b") - 2, end: lineStart("l5c") - 6, a: P([-4.5, 1.8, 4.6], [-2.3, 1.2, 0.9]), b: P([-4.2, 1.75, 4.1], [-2.3, 1.2, 0.9]) },
  { start: lineStart("l5c") - 2, end: lineStart("l6a") - 6, a: P([-1.0, 2.4, 0.6], [-1.0, 2.5, -3.0]), b: P([-1.0, 2.4, 0.1], [-1.0, 2.5, -3.0]) },
  // L6: the funnel passes; the room still standing; supplies; the finale
  { start: lineStart("l6a") - 2, end: BEATS.room6 - 8, a: P([3, 9, 33], [0, 2.6, -1]), b: P([2.4, 8.4, 30], [0, 2.4, -1]) },
  { start: BEATS.room6 - 4, end: lineStart("l6b") - 6, a: P([-6.0, 2.8, 8.4], [-1.8, 1.3, -0.2]), b: P([-5.4, 2.6, 7.4], [-1.9, 1.3, -0.2]) },
  { start: lineStart("l6b") - 2, end: lineStart("end") - 6, a: P([0.5, 2.3, 4.2], [0.5, 2.0, -2.9]), b: P([0.5, 2.25, 3.8], [0.5, 2.0, -2.9]) },
  { start: lineStart("end") - 2, end: DURATION, a: P([-1.0, 3.4, 18.8], [-1.0, 1.5, 0]), b: P([-1.0, 4.6, 20.5], [-1.05, 1.9, 0]) },
];

const waypoints: CameraWaypoint[] = ([] as CameraWaypoint[]).concat(
  ...SHOTS.map((s) => [
    { frame: Math.round(s.start), ...s.a },
    { frame: Math.round(s.end), ...s.b },
  ])
);

// ---------------------------------------------------------------------------
// Sound: every cue keyed to a beat.
// ---------------------------------------------------------------------------

const SFX: SfxCue[] = [
  sfx("stamp", 6, 0.45),
  loopCue(sfx("wind", 0, 0.08), L2_START, 12),

  // L1: siren, the run, the tear, the hedge
  sfx("siren", BEATS.siren - 2, 0.16, { durationInFrames: L2_START - BEATS.siren, fadeOutFrames: 20 }),
  sfx("roar", BEATS.tears - 20, 0.4, { durationInFrames: 80, fadeOutFrames: 20 }),
  sfx("crunch", TEAR[0], 0.55),
  sfx("whoosh_big", TEAR[1], 0.5),
  sfx("whoosh", LAUNCH("dad")[0], 0.45),
  sfx("thud", LAUNCH_END, 0.45),

  // L2: walls hold; the board spears in
  loopCue(sfx("wind", L2_START, 0.08), lineStart("l3a") - 6, 10),
  sfx("whoosh", BOARD_HIT - 12, 0.4),
  sfx("splinter", BOARD_HIT, 0.7),
  sfx("twang", BOARD_HIT + 2, 0.14),

  // L3: debris, the layers, the cannon
  sfx("roar", DEBRIS[0], 0.35, { durationInFrames: DEBRIS[1] - DEBRIS[0], fadeOutFrames: 14 }),
  loopCue(sfx("wind", DEBRIS[0], 0.11), DEBRIS[1], 10),
  ...LAYER_IN.map((at, k) => sfx(k === 2 ? "clang" : "thud", at + 8, k === 2 ? 0.22 : 0.4)),
  sfx("ratchet", LOAD[0], 0.35),
  sfx("hydraulic", BEATS.fifteen, 0.3, { durationInFrames: BEATS.hundred - BEATS.fifteen + 10, fadeOutFrames: 8 }),
  sfx("boom", FIRE, 0.24),
  sfx("whoosh", FIRE, 0.4),
  sfx("clang", HIT3, 0.3),
  sfx("clank", HIT3 + 20, 0.2),

  // L4: the lift, the window, the slam and the bolts
  loopCue(sfx("wind", lineStart("l4a") - 4, 0.08), lineStart("l6a") - 6, 12),
  sfx("hydraulic", LIFT[0], 0.35),
  sfx("rumble", LIFT[0], 0.35, { durationInFrames: DOWN[0] - LIFT[0], fadeOutFrames: 10 }),
  sfx("click", WINDOW_OPEN[0], 0.4),
  sfx("ramp", WINDOW_OPEN[0] + 2, 0.25),
  sfx("trap_close", X_SLAM, 0.5),
  sfx("stamp", X_SLAM, 0.3),
  sfx("whoosh_big", BEATS.lets, 0.4),
  sfx("hydraulic", ROOF_GAG[0], 0.35),
  sfx("slam", DOWN[1], 0.65),
  sfx("thud", DOWN[1], 0.45),
  ...Array.from({ length: ANCHOR_N }, (_, i) => sfx("drill", anchorAt(i) - 6, 0.32, { durationInFrames: 10, fadeOutFrames: 4 })),
  ...Array.from({ length: ANCHOR_N }, (_, i) => sfx("clank", anchorAt(i) + 2, 0.16)),

  // L5: the door blows in; the steel door; the vents
  sfx("crack", BLOW[0] - 8, 0.3),
  sfx("splinter", BLOW[0], 0.65),
  sfx("slam", BLOW[1], 0.4),
  sfx("whoosh", STEEL_HANG[0], 0.3),
  sfx("clang", STEEL_HANG[1] - 4, 0.26),
  ...[0, 1, 2].map((k) => sfx("clank", hingeAt(k), 0.2)),
  ...[0, 1, 2].map((k) => sfx("click", lockAt(k) + 1, 0.5)),
  ...[0, 1].map((k) => sfx("pop", COVER_IN[0] + 4 + k * 2, 0.4)),
  sfx("ding", PEBBLE_HIT, 0.13),

  // L6: the pass, the calm, the supplies
  sfx("roar", FUNNEL6[0] - 10, 0.6, { durationInFrames: FUNNEL6[1] - FUNNEL6[0] + 10, fadeOutFrames: 24 }),
  loopCue(sfx("wind", FUNNEL6[0] - 10, 0.14), FUNNEL6[1], 20),
  sfx("crunch", FUNNEL6[0] + 30, 0.45),
  sfx("crunch", FUNNEL6[0] + 46, 0.4),
  sfx("gate", DOOR_OPEN[0], 0.4),
  ...SUPPLY_AT.map((at, i) => sfx("pop", at, 0.3 + (i % 2) * 0.05)),

  // Finale
  sfx("stamp", BEATS.congrats, 0.36),
  sfx("boom", BEATS.congrats + 4, 0.26),
];

export const config: EpisodeConfig = {
  id: "TornadoShelter",
  title: "How a Closet Becomes a Tornado Shelter",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  shadows: "variance",
  camera: {
    fov: 40,
    near: 0.1,
    far: 400,
    initialPosition: SHOTS[0].a.position,
    waypoints,
    shake: [
      { at: TEAR[0], strength: 0.26, spread: 8 },
      { at: LAUNCH_END, strength: 0.12, spread: 6 },
      { at: BOARD_HIT, strength: 0.3, spread: 7 },
      ...LAYER_IN.map((at) => ({ at: at + 8, strength: 0.06, spread: 4 })),
      { at: HIT3, strength: 0.28, spread: 7 },
      { at: LIFT[0] + 4, strength: 0.14, spread: 6 },
      { at: X_SLAM, strength: 0.14, spread: 5 },
      { at: DOWN[1], strength: 0.32, spread: 8 },
      { at: BLOW[0], strength: 0.26, spread: 7 },
      { at: STEEL_HANG[1] - 4, strength: 0.16, spread: 6 },
      { at: BEATS.congrats, strength: 0.16, spread: 8 },
    ],
    rumbles: [
      { start: BEATS.tears - 20, end: TEAR[1] + 30, strength: 0.03 },
      { start: DEBRIS[0], end: DEBRIS[1], strength: 0.02 },
      { start: LIFT[0], end: DOWN[0], strength: 0.025 },
      { start: FUNNEL6[0], end: FUNNEL6[1] - 20, strength: 0.05 },
    ],
  },
  audio: { src: "shelter/tornado-shelter/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/tornado-shelter/score_v1.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  // Same caption style as the other shorts: 4-5 word chunks, active word in yellow.
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: LOWPOLY_GRADE,
    vignette: false,
    fadeInFrames: 6,
    fadeOutFrames: 14,
    backgroundColor: "#c3d6e6",
    postfx: LOWPOLY_POSTFX,
  },
  OverlayComponent: TrapHUD,
};

