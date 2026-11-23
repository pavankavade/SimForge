import type { CameraPose, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { followTrack } from "../../kit/camera";
import { loopCue, sfxFor } from "../../kit/sfx";
import { LOWPOLY_GRADE, LOWPOLY_POSTFX } from "../../lowpoly";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  BELTS_IN,
  BUMP4,
  CAR_X,
  CRESTS,
  DURATION,
  GUSH,
  INT_X,
  KEEL_IN,
  L2B_START,
  L2_START,
  L3_START,
  L4_START,
  L5_START,
  L6B_START,
  LID_H,
  LID_IN,
  LOG_HIT,
  PINBALL,
  POD_X,
  POP_UP,
  PORCH_X,
  SEATS_IN,
  SPILL,
  SPLASH3,
  THROW,
  TIP,
  TUB_H,
  TUB_X,
  VALVE_SHUT,
  VENT_IN,
  X_SLAM,
  Z,
  boltAt,
  climb,
  climbX,
  hillY,
  lineStart,
  step1,
  walk1,
} from "./timeline";

const sfx = sfxFor("bathtub-flood", "shelter");

// ---------------------------------------------------------------------------
// Camera: each shot a slow move A -> B over [start, end]; the gap to the next
// shot is a quick whip or a cut. fov 40: at distance d the frame is about
// 0.41·d wide and 0.73·d tall. Front shots look along -z.
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

const VENT_TOP = TUB_H + LID_H + 0.3;
const FINALE_X = POD_X + 5.0;

const SHOTS: Shot[] = [
  // L1: the house in the rain; into the tub; the water under the door; the tub fills
  { start: 0, end: walk1("kid")[0] + 10, a: P([-1.4, 3.6, Z + 18], [-1.4, 1.7, -0.5]), b: P([-1.4, 3.2, Z + 16], [-1.4, 1.5, -0.5]) },
  { start: walk1("kid")[0] + 14, end: step1("kid")[1] + 10, a: front(-1.3, 1.2, 11), b: front(-0.2, 1.2, 9.8) },
  { start: lineStart("l1b") - 2, end: GUSH[1] + 4, a: P([-0.2, 1.7, Z + 7.8], [-1.2, 0.7, -0.1]), b: P([-0.3, 1.6, Z + 7.2], [-1.2, 0.7, -0.1]) },
  { start: GUSH[1] + 8, end: L2_START - 2, a: front(TUB_X, 1.1, 7.4), b: front(TUB_X, 1.2, 6.2) },
  // L2a: the car myth
  { start: L2_START, end: X_SLAM - 4, a: front((PORCH_X + CAR_X) / 2, 0.7, 14, 1.2), b: front((PORCH_X + CAR_X) / 2, 0.7, 13, 1.1) },
  { start: X_SLAM - 2, end: BEATS.carry - 4, a: front((PORCH_X + CAR_X) / 2 + 0.3, 0.6, 12.5, 1.0), b: front((PORCH_X + CAR_X) / 2 + 0.3, 0.6, 12.0, 1.0) },
  { start: BEATS.carry - 2, end: L2B_START - 2, a: front(CAR_X + 0.5, 0.5, 13, 1.0), b: front(CAR_X + 2.2, 0.5, 13.5, 1.0) },
  // L2b-c: the tub on the flood; the wave tips it
  { start: L2B_START, end: TIP[0] - 6, a: front(POD_X, 0.8, 11.5), b: front(POD_X, 0.9, 9.6) },
  { start: TIP[0] - 4, end: L3_START - 2, a: front(POD_X, 0.5, 12.5), b: front(POD_X, 0.5, 11.8) },
  // L3: the lid and gasket; the roll; upside down inside
  { start: L3_START, end: BEATS.drop - 6, a: front(POD_X, 1.2, 10.5), b: front(POD_X, 1.1, 8.8) },
  { start: BEATS.drop - 4, end: BEATS.upside - 8, a: front(POD_X, 0.9, 11), b: front(POD_X, 0.9, 10.4) },
  { start: BEATS.upside - 6, end: L4_START - 2, a: front(INT_X, 0.85, 5.6, 0.5), b: front(INT_X, 0.85, 5.1, 0.5) },
  // L4: the keel; the self-righting rolls; the log; the pinball; the seats
  { start: L4_START, end: BEATS.flips - 6, a: front(POD_X, 0.1, 9.2, 0.8), b: front(POD_X, 0.1, 8.2, 0.8) },
  { start: BEATS.flips - 4, end: LOG_HIT - 16, a: front(POD_X, 0.7, 12), b: front(POD_X, 0.7, 11.4) },
  { start: LOG_HIT - 14, end: BEATS.bounce - 8, a: front(POD_X - 1.4, 0.7, 10.4), b: front(POD_X - 1.0, 0.7, 9.6) },
  { start: BEATS.bounce - 6, end: L5_START - 2, a: front(INT_X, 0.85, 5.6, 0.4), b: front(INT_X, 0.85, 5.0, 0.4) },
  // L5: the air; the vents and the valves; yellow and the helicopter
  { start: L5_START, end: lineStart("l5b") - 6, a: front(INT_X, 0.9, 5.0, 0.3), b: front(INT_X, 0.9, 4.4, 0.3) },
  { start: lineStart("l5b") - 4, end: BEATS.valves - 6, a: front(POD_X, 1.4, 8.4), b: front(POD_X, 1.5, 7.6) },
  { start: BEATS.valves - 4, end: lineStart("l5c") - 6, a: P([POD_X - 0.4, VENT_TOP + 0.6, Z + 3.6], [POD_X - 0.75, VENT_TOP, 0]), b: P([POD_X - 0.5, VENT_TOP + 0.5, Z + 3.2], [POD_X - 0.75, VENT_TOP, 0]) },
  { start: lineStart("l5c") - 4, end: BEATS.helicopter - 8, a: front(POD_X, 1.1, 9.5), b: front(POD_X, 1.2, 9.0) },
  { start: BEATS.helicopter - 6, end: lineStart("l6a") - 6, a: front(POD_X + 0.8, 3.4, 17, 1.4), b: front(POD_X + 0.8, 3.6, 16.2, 1.4) },
  // L6: the real thing; higher ground; the finale
  { start: lineStart("l6a") - 4, end: L6B_START - 2, a: P([POD_X + 3, 5.5, Z + 26], [POD_X + 3, 1.6, -3]), b: P([POD_X + 3, 5.0, Z + 23], [POD_X + 3, 1.6, -3]) },
  // Finale: the pod on the water and the family on the hill, centred between them
  { start: lineStart("end") - 2, end: DURATION, a: P([FINALE_X, 5.4, Z + 29], [FINALE_X, 1.6, -1]), b: P([FINALE_X, 5.9, Z + 32], [FINALE_X, 1.7, -1]) },
];

/** L6b: follow the climb up the hill road (a hard cut in from the wide shot). */
const climbMid = (f: number): Vec3 => {
  const x = (climbX("dad", f) + climbX("kid", f)) / 2;
  return [x + 0.5, hillY(x) + 0.4, Z];
};
const TRACKS = [followTrack({ start: L6B_START, end: lineStart("end") - 2, target: climbMid, dist: 11, height: 1.6, minY: -5, z: Z - 1, blend: 1 })];

/** Far apart (another set): hold to the very frame of the next shot, so the change is a hard cut, never a glide across the world. */
const farFrom = (a: CameraPose, b: CameraPose) => Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]) > 15;
const waypoints: CameraWaypoint[] = ([] as CameraWaypoint[]).concat(
  ...SHOTS.map((s, i) => {
    const next = SHOTS[i + 1];
    const end = next && farFrom(s.b, next.a) ? next.start : s.end;
    return [
      { frame: Math.round(s.start), ...s.a },
      { frame: Math.round(end), ...s.b },
    ];
  })
);

// ---------------------------------------------------------------------------
// Sound: every cue keyed to a beat.
// ---------------------------------------------------------------------------

const SFX: SfxCue[] = [
  sfx("stamp", 6, 0.45),
  loopCue(sfx("rain", 0, 0.12), L5_START, 12),
  loopCue(sfx("wind", 0, 0.05), L5_START, 12),
  loopCue(sfx("rain", L5_START, 0.08), lineStart("end"), 30),

  // L1: into the tub; the water under the door; it fills
  ...(["dad", "kid"] as const).map((m) => sfx("thud", step1(m)[1], 0.3)),
  sfx("gate", walk1("dad")[1] + 6, 0.25),
  sfx("water_rush", GUSH[0], 0.45, { durationInFrames: L2_START - GUSH[0], fadeOutFrames: 16 }),
  sfx("splash", SPILL[0], 0.5),
  sfx("glug", BEATS.it1 - 6, 0.4),

  // L2a: keys, "Don't", the car floats away
  sfx("click", BEATS.drive, 0.35),
  sfx("trap_close", X_SLAM, 0.5),
  sfx("stamp", X_SLAM, 0.3),
  sfx("water_rush", BEATS.foot - 10, 0.3, { durationInFrames: L2B_START - BEATS.foot + 10, fadeOutFrames: 12 }),
  sfx("glug", BEATS.carry, 0.3),

  // L2b-c: the tub pops up; the wave; the tip; the splashes
  sfx("splash", POP_UP[1] - 2, 0.55),
  sfx("whoosh", CRESTS[0] - 10, 0.35),
  sfx("splash", TIP[1] - 2, 0.6),
  ...(["dad", "kid"] as const).map((m) => sfx("splash", THROW(m)[1], 0.45)),

  // L3: the lid, the gasket, the wash, the roll
  sfx("whoosh", LID_IN[0], 0.3),
  sfx("clang", BEATS.lid + 2, 0.3),
  sfx("squelch", BEATS.gasket, 0.35),
  sfx("splash", SPLASH3, 0.5),
  sfx("whoosh_big", CRESTS[1] - 8, 0.35),
  sfx("splash", CRESTS[1], 0.5),
  sfx("thud", BEATS.upside - 6, 0.3),

  // L4: the keel and bolts, the rolls back up, the log, the pinball, seats and belts
  sfx("hydraulic", KEEL_IN[0], 0.3),
  sfx("clank", KEEL_IN[1], 0.3),
  ...[0, 1, 2].map((k) => sfx("drill", boltAt(k) - 4, 0.3, { durationInFrames: 8, fadeOutFrames: 3 })),
  sfx("splash", CRESTS[2], 0.45),
  sfx("whoosh", CRESTS[2] + 10, 0.3),
  sfx("splash", CRESTS[3], 0.4),
  sfx("whoosh", CRESTS[3] + 10, 0.28),
  sfx("crunch", LOG_HIT, 0.6),
  sfx("thud", LOG_HIT, 0.5),
  ...[0, 1, 2, 3, 4, 5].map((k) => sfx(k % 2 ? "ding" : "thud", PINBALL[0] + 6 + k * 7, k % 2 ? 0.2 : 0.35)),
  sfx("whoosh", SEATS_IN[0], 0.3),
  sfx("thud", SEATS_IN[1], 0.35),
  sfx("click", BELTS_IN[1], 0.5),
  sfx("click", BELTS_IN[1] + 4, 0.45),
  sfx("thud", BUMP4, 0.4),

  // L5: the air, the vents, the valve, the helicopter
  sfx("glug", BEATS.running, 0.25),
  sfx("pop", VENT_IN[1] - 3, 0.4),
  sfx("pop", VENT_IN[1], 0.4),
  sfx("hiss", BEATS.airIn, 0.35),
  sfx("splash", VALVE_SHUT[0] + 2, 0.45),
  sfx("click", VALVE_SHUT[0] + 6, 0.4),
  sfx("hiss", VALVE_SHUT[1] + 2, 0.3),
  sfx("sparkle", BEATS.yellow, 0.3),
  sfx("heli", BEATS.paint, 0.4, { durationInFrames: lineStart("l6b") - BEATS.paint, fadeOutFrames: 30 }),

  // L6: up the hill; the finale and the dare
  sfx("pop", climb("dad")[1], 0.25),
  sfx("stamp", BEATS.congrats, 0.36),
  sfx("boom", BEATS.congrats + 4, 0.26),
  sfx("crack", BEATS.unless, 0.45),
  sfx("crumble", BEATS.prove, 0.45),
  sfx("stamp", BEATS.prove, 0.3),
];

export const config: EpisodeConfig = {
  id: "BathtubFlood",
  title: "How a Bathtub Becomes a Flood Shelter",
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
    tracks: TRACKS,
    shake: [
      { at: SPILL[0], strength: 0.08, spread: 5 },
      { at: X_SLAM, strength: 0.12, spread: 5 },
      { at: POP_UP[1] - 2, strength: 0.1, spread: 5 },
      { at: TIP[1] - 2, strength: 0.24, spread: 7 },
      { at: BEATS.lid + 2, strength: 0.14, spread: 5 },
      { at: CRESTS[1], strength: 0.2, spread: 7 },
      { at: KEEL_IN[1], strength: 0.12, spread: 5 },
      { at: LOG_HIT, strength: 0.32, spread: 8 },
      { at: SEATS_IN[1], strength: 0.08, spread: 4 },
      { at: BUMP4, strength: 0.18, spread: 6 },
      { at: BEATS.congrats, strength: 0.16, spread: 8 },
      { at: BEATS.prove, strength: 0.12, spread: 6 },
    ],
    rumbles: [
      { start: GUSH[0], end: L2_START, strength: 0.015 },
      { start: PINBALL[0], end: PINBALL[1], strength: 0.04 },
      { start: BEATS.helicopter - 6, end: lineStart("l6a") - 6, strength: 0.012 },
    ],
  },
  audio: { src: "shelter/bathtub-flood/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/bathtub-flood/score_v1.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
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
    backgroundColor: "#a9bac4",
    postfx: LOWPOLY_POSTFX,
  },
  OverlayComponent: TrapHUD,
};

