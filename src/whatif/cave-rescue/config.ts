import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit";
import { OPENING, TRACKS, camPose } from "./camera";
import { CaveHUD } from "./CaveHUD";
import wordTimestamps from "./data/wordTimestamps.json";
import { BEATS, DURATION, SHOTS } from "./timeline";

const B = BEATS;
const S = SHOTS;

// ---------------------------------------------------------------------------
// Sound: every cue keys to a beat or shot boundary, never a literal frame.
// ---------------------------------------------------------------------------
const cue = sfxFor("cave-rescue", "whatif");
/** Effects sit about 6 dB under the voice, as in the rest of the series. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

export const SFX: SfxCue[] = [
  // Trapped
  loopCue(sfx("rain", S.open, 0.7), S.inside + 14, 14),
  sfx("boom", B.rain + 6, 0.45),
  sfx("rumble", B.rain + 8, 0.3, { durationInFrames: 50, fadeOutFrames: 20 }),
  loopCue(sfx("drip", S.inside, 0.3), S.whole, 10),
  sfx("flood", B.filling - 30, 0.75),
  loopCue(sfx("flood", B.filling + 70, 0.55), S.whole + 40, 20),
  sfx("whoosh", B.behind - 4, 0.25),
  sfx("whoosh_big", S.whole, 0.35),
  sfx("pop", B.twelve, 0.25),
  sfx("bubble", B.twelve + 14, 0.25),
  sfx("bubble", B.deeper, 0.25),
  sfx("bubble", B.mountain, 0.25),
  sfx("pop", B.kilometers, 0.3),
  sfx("whoosh", S.ledge - 16, 0.3),
  loopCue(sfx("drip", S.ledge, 0.45), S.pumps, 12),
  sfx("pop", B.food, 0.3),
  sfx("sparkle", B.dripping, 0.15),
  // Found
  loopCue(sfx("rain", S.pumps, 0.6), S.dive, 10),
  loopCue(sfx("pump", B.pumps - 6, 0.5), S.dive, 8),
  sfx("clank", B.night, 0.25),
  loopCue(sfx("underwater", S.dive, 0.55), S.found, 10),
  loopCue(sfx("scuba", S.dive + 4, 0.5), S.found, 6),
  sfx("pop", B.murky, 0.25),
  loopCue(sfx("drip", S.found, 0.4), S.wayOut, 10),
  sfx("pop", B.dayTen, 0.3),
  sfx("bubble", B.light, 0.35),
  sfx("surface", B.surface - 2, 0.75),
  sfx("surface", B.british + 6, 0.6),
  sfx("ding", B.thirteen, 0.35),
  sfx("sparkle", B.alive, 0.25),
  // The way out
  sfx("whoosh", S.wayOut + 6, 0.3),
  loopCue(sfx("underwater", B.barely - 16, 0.6), S.air, 10),
  loopCue(sfx("scuba", B.barely - 12, 0.5), B.total + 10, 6),
  loopCue(sfx("drip", S.air, 0.35), S.tanks, 8),
  sfx("heart", B.thin - 10, 0.4),
  loopCue(sfx("underwater", S.tanks, 0.55), S.sub, 12),
  loopCue(sfx("scuba", S.tanks + 2, 0.45), B.dies, 4),
  sfx("whoosh", B.laying - 4, 0.2),
  // The submarine
  loopCue(sfx("rain", S.sub, 0.55), S.sleep, 10),
  sfx("pop", B.kidSub, 0.3),
  sfx("whoosh", B.fly - 4, 0.3),
  sfx("pop", B.rocket, 0.25),
  sfx("clank", B.practical, 0.35),
  sfx("thud", B.used, 0.3),
  // Out
  loopCue(sfx("drip", S.sleep, 0.35), S.tow, 8),
  loopCue(sfx("heart", B.sleep - 8, 0.4), S.tow, 8),
  sfx("pop", B.mask, 0.25),
  sfx("rustle", B.stretcher - 2, 0.45),
  loopCue(sfx("underwater", S.tow, 0.55), S.out, 8),
  loopCue(sfx("scuba", S.tow + 2, 0.5), S.out, 4),
  sfx("whoosh_big", S.out, 0.3),
  sfx("pop", B.firstDay + 4, 0.35),
  sfx("pop", B.second + 4, 0.35),
  sfx("pop", B.lastCoach + 8, 0.4),
  sfx("crowd", B.lastCoach + 10, 0.4),
  // Afterwards
  sfx("pop", B.caver, 0.3),
  sfx("pop", B.stunt, 0.3),
  sfx("pop", B.pedo, 0.35),
  sfx("pop", B.deletes, 0.25),
  sfx("stamp", B.jury, 0.4),
  sfx("stamp", B.eighteen, 0.45),
  sfx("whoosh", B.every - 16, 0.3),
  sfx("stamp", B.home, 0.5),
];

const wp = (frame: number, p: { position: [number, number, number]; lookAt: [number, number, number] }) => ({ frame: Math.round(frame), ...p });
const POSTFX = { aoIntensity: 1.25, bloomIntensity: 0.4, bloomThreshold: 0.86, grain: 0.008 };

export const config: EpisodeConfig = {
  id: "CaveRescue",
  title: "18 Days Inside a Mountain",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 900,
    initialPosition: OPENING.position,
    waypoints: [wp(0, OPENING), wp(DURATION, OPENING)],
    tracks: TRACKS,
    shake: [
      { at: B.rain + 6, strength: 0.08, spread: 8 },
      { at: B.surface - 2, strength: 0.05, spread: 5 },
    ],
    rumbles: [{ start: B.filling - 30, end: S.whole, strength: 0.02 }],
  },
  audio: { src: "whatif/cave-rescue/narration_v2.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/cave-rescue/score_v2.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.06) contrast(1.06)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.24) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 30,
    backgroundColor: "#7f8b94",
    postfx: POSTFX,
  },
  OverlayComponent: CaveHUD,
};

// ---------------------------------------------------------------------------
// CaveRescueLab: the cast's kit and acting poses (Lab.tsx).
// ---------------------------------------------------------------------------
export const LAB_DURATION = 240;

export const labConfig: EpisodeConfig = {
  id: "CaveRescueLab",
  title: "Cave Rescue Lab",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: LAB_DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 200,
    initialPosition: [0, 1.6, 7.4],
    waypoints: [
      { frame: 0, position: [0, 1.6, 7.4], lookAt: [0, 0.8, 0] },
      { frame: LAB_DURATION, position: [0, 1.6, 7.4], lookAt: [0, 0.8, 0] },
    ],
  },
  overlays: { fadeInFrames: 0, fadeOutFrames: 0, backgroundColor: "#2a2f3a" },
};

// ---------------------------------------------------------------------------
// CaveWorldLab: the set without the cast. Lab frame i shows the episode on SET_FRAMES[i] with the
// episode's own camera, so every shot's set can be checked in seconds (Lab.tsx).
// ---------------------------------------------------------------------------
export const SET_FRAMES: number[] = [
  0,
  S.inside - 4,
  S.inside + 40,
  B.behind,
  S.whole + 10,
  S.whole + 60,
  B.mountain,
  S.ledge - 4,
  S.ledge + 20,
  B.food,
  B.dripping,
  B.coachTeaches,
  B.breathe,
  S.pumps + 20,
  B.night + 10,
  S.dive + 40,
  S.found + 10,
  B.light,
  B.surface,
  B.two + 40,
  B.how,
  B.thirteen,
  S.wayOut + 40,
  S.wayOut + 100,
  B.barely,
  B.darkness,
  S.air + 20,
  S.tanks + 20,
  B.dies + 10,
  B.route,
  S.sleep + 10,
  B.mask,
  B.wrapped + 10,
  B.kidSub,
  B.used,
  S.after + 20,
  S.tow + 30,
  S.out + 30,
  B.second,
  B.lastCoach,
  S.end + 20,
  B.every + 20,
  DURATION - 2,
];

export const worldLabConfig: EpisodeConfig = {
  id: "CaveWorldLab",
  title: "Cave World Lab",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: SET_FRAMES.length,
  camera: {
    fov: 40,
    near: 0.05,
    far: 900,
    initialPosition: OPENING.position,
    waypoints: SET_FRAMES.map((f, i) => ({ frame: i, ...camPose(f) })),
  },
  overlays: { fadeInFrames: 0, fadeOutFrames: 0, backgroundColor: "#7f8b94", postfx: POSTFX },
};
