import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { FlightHUD } from "./FlightHUD";
import { KIT_BACK_OF_HALL, LAND, THERMAL, climbPair, schoolPair, takeoffPair } from "./Scene";
import {
  BEATS,
  BUS_Z,
  DURATION,
  SCHOOL_STEPS_X,
  SPIRAL,
  TAKEOFF,
  Z,
  busX,
  easeInOut,
  kitRulesX,
  kitYardX,
  lerp,
  progress,
  shotEnd,
  shotStart,
} from "./timeline";

const cue = sfxFor("slow-flight", "whatif");
/** Effects sit about 6 dB under their first-mix levels so the voice leads. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  sfx("stamp", 8, 0.4),
  // Cold open and rules
  sfx("pop", BEATS.catBeats, 0.2),
  sfx("whoosh", BEATS.flap, 0.25),
  sfx("whoosh", BEATS.flap + 10, 0.2),
  sfx("gust", BEATS.gust - 8, 0.6),
  sfx("whoosh", BEATS.gust + 6, 0.4),
  loopCue(sfx("wind_bed", BEATS.gust, 0.22), shotEnd("rules") - 2, 8),
  sfx("pop", BEATS.passenger, 0.25),
  // Bus, the show, the breakdown
  loopCue(sfx("rumble", shotStart("busRide"), 0.18), BEATS.dies + 6, 10),
  sfx("piano", shotStart("preview") + 6, 0.35),
  sfx("clunk", BEATS.coughs, 0.6),
  sfx("clunk", BEATS.dies, 0.45),
  loopCue(sfx("steam", BEATS.dies, 0.22), shotEnd("bus") - 2, 10),
  sfx("pop", BEATS.thirteen, 0.25),
  // Windsock and takeoff
  loopCue(sfx("wind_bed", shotStart("windsock"), 0.16), shotEnd("takeoff"), 8),
  sfx("pop", BEATS.allFull, 0.25),
  sfx("pop", BEATS.onBack, 0.3),
  sfx("whoosh", TAKEOFF[0], 0.45),
  sfx("thud", TAKEOFF[0] + 2, 0.3),
  // Cruise: the air around them is calm (3 mph), so the wind bed stays soft.
  loopCue(sfx("wind_bed", shotStart("cruise"), 0.14), shotEnd("cruise"), 10),
  loopCue(sfx("gears", BEATS.cropDuster - 40, 0.12), BEATS.cropDuster + 70, 20),
  // Headwind
  loopCue(sfx("wind_bed", shotStart("headwind"), 0.3), shotEnd("headwind"), 10),
  sfx("gust", BEATS.inFace - 6, 0.5),
  sfx("hawk", BEATS.hawk, 0.4),
  // Thermal and altitude
  loopCue(sfx("wind_bed", shotStart("climb"), 0.12), shotEnd("high"), 10),
  sfx("pop", BEATS.thermal, 0.25),
  sfx("hawk", SPIRAL[0] + 50, 0.3),
  sfx("sparkle", BEATS.frost, 0.3),
  sfx("steam", BEATS.thermos, 0.18, { durationInFrames: 50, fadeOutFrames: 15 }),
  loopCue(sfx("rumble", BEATS.jet - 30, 0.12), BEATS.freeze, 20),
  // Ridge lift, stall, flip
  loopCue(sfx("wind_bed", shotStart("ridge"), 0.2), BEATS.stops, 30),
  sfx("pop", BEATS.ridgeLift, 0.25),
  sfx("thud", BEATS.landRock, 0.4),
  sfx("gust", BEATS.turns - 4, 0.55),
  loopCue(sfx("wind_bed", BEATS.turns, 0.28), shotEnd("valley"), 12),
  sfx("pop", BEATS.pours, 0.25),
  // Run, landing, the show
  sfx("whoosh", BEATS.jump, 0.5),
  sfx("whoosh", shotStart("school") + 4, 0.35),
  sfx("thud", BEATS.land, 0.5),
  sfx("pop", BEATS.sixFiftyNine, 0.25),
  sfx("curtain", BEATS.curtain, 0.5),
  sfx("piano", BEATS.opens, 0.55),
  sfx("applause", BEATS.opens + 12, 0.35, { durationInFrames: shotEnd("stage") - BEATS.opens, fadeOutFrames: 24 }),
  // Hook
  sfx("gust", BEATS.vane, 0.35),
  sfx("sparkle", BEATS.imagine, 0.25),
  sfx("stamp", BEATS.subscribe, 0.5),
  sfx("boom", BEATS.subscribe, 0.25),
];

// ---------------------------------------------------------------------------
// Camera: one track per shot, hard cuts between shots (chained so no drift).
// 16:9 at fov 40: at distance d the frame is ~1.3·d wide and ~0.73·d tall.
// ---------------------------------------------------------------------------
const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const mixPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
});
const ease = (f: number, a: number, b: number) => easeInOut(progress(f, [a, b]));
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Eased move from pose a to pose b over [m0, m1] inside [start, end]. */
const moveTrack = (start: number, end: number, a: CameraPose, b: CameraPose, m0 = start, m1 = end): CameraTrack =>
  track(start, end, (f) => mixPose(a, b, ease(f, m0, m1)));

const yardCam = (f: number) => {
  const x = kitYardX(f);
  return pose([x + 0.6, 2.0, Z + 6.8], [x + 0.9, 1.3, Z - 0.5]);
};

const rulesCam = (f: number) => {
  if (f >= BEATS.intoWind) return pose([0.6, 1.9, Z + 6.2], [0.4, 1.5, Z]);
  const x = kitRulesX(Math.min(f, BEATS.gust + 4));
  const chase = f > BEATS.gust ? kitRulesX(f) - kitRulesX(BEATS.gust) : 0;
  const cx = x + chase * 0.92;
  return pose([cx - 0.3, 2.0, Z + 7.2], [cx + (f > BEATS.gust ? 0.8 : 0.3), 1.4, Z]);
};

const busRideCam = (f: number) => {
  const bx = busX(f);
  return pose([bx + 0.5, 2.0, 9.5], [bx + 1.2, 1.5, -1.2]);
};

const busCam = (f: number) => {
  const wide = pose([-0.6, 2.1, Z + 9.6], [-0.4, 1.4, BUS_Z + 1.4]);
  const teo = pose([0.6, 1.5, Z + 4.6], [0.6, 1.4, Z - 0.3]);
  return mixPose(wide, teo, ease(f, BEATS.sky - 6, BEATS.sky + 24));
};

const takeoffCam = (f: number): CameraPose => {
  const p = takeoffPair(f);
  return pose([p.position[0] - 0.4, 2.0 + p.position[1] * 0.85, Z + 7.6], [p.position[0] + 0.8, 1.4 + p.position[1], Z]);
};

const cruiseCam = (f: number) => {
  const near = pose([0.2, 2.0, Z + 6.8], [0.7, 0.3, Z]);
  const wide = pose([1.0, 1.2, Z + 11.5], [1.5, -2.6, Z - 3]);
  return mixPose(near, wide, ease(f, BEATS.cropDuster - 50, BEATS.cropDuster - 20));
};

const headwindCam = (f: number) => {
  const near = pose([0.2, 1.6, Z + 7], [0.8, 0.6, Z]);
  const cow = pose([2.6, -2.6, Z + 13], [1.8, -2.4, Z - 1.5]);
  const hawk = pose([0.6, 1.8, Z + 9], [3.4, 1.6, Z - 3]);
  if (f < BEATS.cow - 40) return near;
  if (f < BEATS.hawk - 12) return mixPose(near, cow, ease(f, BEATS.cow - 40, BEATS.cow - 10));
  return mixPose(cow, hawk, ease(f, BEATS.hawk - 12, BEATS.hawk + 10));
};

const climbCam = (f: number) => {
  if (f < SPIRAL[0]) {
    const p = climbPair(f).position;
    return pose([p[0] - 0.6, 1.8, p[2] + 7.5], [p[0] + 1.6, 0.9, p[2] - 1]);
  }
  const k = ease(f, SPIRAL[0], shotEnd("climb"));
  const a = lerp(-0.2, 0.35, k);
  const d = lerp(8.5, 10, k);
  return pose([THERMAL[0] + Math.sin(a) * d, lerp(1.8, 4.0, k), THERMAL[2] + Math.cos(a) * d], [THERMAL[0], lerp(0.9, -0.6, k), THERMAL[2]]);
};

const highCam = (f: number) => {
  const pair = pose([1.0, 1.5, Z + 5.6], [0.3, 1.25, Z]);
  const jet = pose([2.0, 0.4, Z + 7], [-4, 5.5, -10]);
  if (f < BEATS.jet - 10) return pose([1.2, 1.7, Z + 6.2], [0.3, 1.2, Z]);
  if (f < BEATS.freeze - 10) return jet;
  return pair;
};

const ridgeCam = (f: number) => {
  const a = pose([-1.8, 2.6, Z + 11.5], [-1.4, 1.4, Z - 2]);
  const b = pose([0.0, 2.6, Z + 11.5], [0.2, 1.6, Z - 2]);
  return mixPose(a, b, ease(f, BEATS.slideIn - 10, BEATS.slideIn + 40));
};

const stallCam = (f: number) => {
  const wide = pose([-0.6, 2.2, Z + 8.2], [-0.2, 1.0, Z - 1.5]);
  const two = pose([0.05, 1.45, Z + 4.4], [0.05, 0.95, Z]);
  if (f < BEATS.landRock + 10) return wide;
  return mixPose(wide, two, ease(f, BEATS.landRock + 10, BEATS.sitsDown + 10));
};

const flipCam = (f: number) => mixPose(pose([-2.6, 2.4, Z + 9], [0.6, 0.4, Z - 2]), pose([-1.6, 1.9, Z + 7.2], [0.6, 0.8, Z - 1]), ease(f, shotStart("flip"), shotEnd("flip")));

const valleyCam = (f: number) => {
  const perch = pose([-1.2, 1.9, Z + 6.6], [0.2, 1.2, Z]);
  const side = pose([-0.4, 2.0, Z + 7.4], [0.8, 1.15, Z]);
  const ahead = pose([-4.2, 2.3, Z + 4.2], [1.5, 1.0, Z - 0.6]);
  if (f < BEATS.jump + 4) return perch;
  if (f < BEATS.rooftops - 30) return mixPose(perch, side, ease(f, BEATS.jump + 4, BEATS.jump + 30));
  return mixPose(side, ahead, ease(f, BEATS.rooftops - 30, BEATS.rooftops + 10));
};

const schoolCam = (f: number): CameraPose => {
  const wide = pose([SCHOOL_STEPS_X - 1.2, 2.8, LAND[2] + 11], [SCHOOL_STEPS_X - 1.2, 2.6, LAND[2] - 3]);
  const near = pose([LAND[0] - 0.4, 1.8, LAND[2] + 5.6], [LAND[0] + 0.4, 1.2, LAND[2] - 1]);
  if (f < BEATS.land - 8) {
    const p = schoolPair(f).position;
    return pose([p[0] + 1.5, 2.4 + p[1] * 0.5, LAND[2] + 9.5], [p[0] + 1.8, 1.6 + p[1] * 0.7, LAND[2] - 2]);
  }
  return mixPose(wide, near, ease(f, BEATS.land + 24, BEATS.land + 54));
};

const stageCam = (f: number) => {
  if (f >= BEATS.hovering - 20) {
    const k = KIT_BACK_OF_HALL;
    return pose([k[0] + 0.9, k[1] + 1.1, k[2] + 3.4], [0.6, 1.7, -1.2]);
  }
  if (f < BEATS.opens - 4) return pose([-1.8, 2.2, 6.6], [-1.6, 1.85, -0.6]);
  return mixPose(pose([-0.8, 2.3, 7.6], [-0.8, 1.9, -1]), pose([-0.6, 2.2, 6.8], [-0.6, 1.95, -1]), ease(f, BEATS.opens - 4, BEATS.hovering - 20));
};

const TRACKS: CameraTrack[] = chainTracks([
  track(0, shotEnd("yard"), yardCam),
  track(shotStart("rules"), shotEnd("rules"), rulesCam),
  moveTrack(shotStart("carry"), shotEnd("carry"), pose([2.6, 2.0, Z + 6.6], [3.0, 1.6, Z]), pose([3.6, 1.9, Z + 5.8], [3.7, 1.6, Z])),
  track(shotStart("busRide"), shotEnd("busRide"), busRideCam),
  moveTrack(shotStart("preview"), shotEnd("preview"), pose([-0.9, 2.3, 7.4], [-0.9, 1.9, -1]), pose([-0.9, 2.2, 6.6], [-0.9, 1.9, -1])),
  track(shotStart("bus"), shotEnd("bus"), busCam),
  moveTrack(shotStart("windsock"), shotEnd("windsock"), pose([1.4, 1.4, Z + 9.4], [1.6, 2.1, Z - 1]), pose([1.5, 1.4, Z + 8.6], [1.6, 2.15, Z - 1])),
  track(shotStart("takeoff"), shotEnd("takeoff"), takeoffCam),
  track(shotStart("cruise"), shotEnd("cruise"), cruiseCam),
  track(shotStart("headwind"), shotEnd("headwind"), headwindCam),
  track(shotStart("climb"), shotEnd("climb"), climbCam),
  track(shotStart("high"), shotEnd("high"), highCam),
  track(shotStart("ridge"), shotEnd("ridge"), ridgeCam),
  track(shotStart("stall"), shotEnd("stall"), stallCam),
  track(shotStart("flip"), shotEnd("flip"), flipCam),
  track(shotStart("valley"), shotEnd("valley"), valleyCam),
  track(shotStart("school"), shotEnd("school"), schoolCam),
  track(shotStart("stage"), shotEnd("stage"), stageCam),
  moveTrack(shotStart("night"), DURATION, pose([0.2, 0.9, Z + 7.6], [0.2, 2.9, Z - 1]), pose([0.2, 0.8, Z + 6.6], [0.2, 3.1, Z - 1])),
]);

const wp = (frame: number, p: CameraPose) => ({ frame: Math.round(frame), ...p });

export const config: EpisodeConfig = {
  id: "SlowFlight",
  title: "What if you could fly at walking speed?",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 3000,
    initialPosition: yardCam(0).position,
    waypoints: [wp(0, yardCam(0)), wp(DURATION, yardCam(0))],
    tracks: TRACKS,
    shake: [
      { at: BEATS.coughs, strength: 0.1, spread: 6 },
      { at: BEATS.dies, strength: 0.12, spread: 6 },
      { at: TAKEOFF[0] + 2, strength: 0.1, spread: 6 },
      { at: BEATS.landRock, strength: 0.1, spread: 6 },
      { at: BEATS.land, strength: 0.18, spread: 7 },
    ],
    rumbles: [
      { start: BEATS.inFace, end: BEATS.inFace + 40, strength: 0.02 },
      { start: BEATS.turns, end: BEATS.turns + 40, strength: 0.025 },
    ],
  },
  audio: { src: "whatif/slow-flight/narration_v2.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/slow-flight/score_v2.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 70,
  },
  overlays: {
    grade: "saturate(1.08) contrast(1.03)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.2) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 30,
    backgroundColor: "#a5d2f0",
    postfx: { aoIntensity: 1.3, bloomIntensity: 0.32, bloomThreshold: 0.88, grain: 0.006 },
  },
  OverlayComponent: FlightHUD,
};
