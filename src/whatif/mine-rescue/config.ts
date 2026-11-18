import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit";
import { OPENING, TRACKS, camPose } from "./camera";
import wordTimestamps from "./data/wordTimestamps.json";
import { MineHUD } from "./MineHUD";
import { ARRIVALS, BEATS, DURATION, SHOTS, TRUCK, TUBE } from "./timeline";

const B = BEATS;
const S = SHOTS;

// ---------------------------------------------------------------------------
// Sound: every cue keys to a beat or shot boundary, never a literal frame.
// ---------------------------------------------------------------------------
const cue = sfxFor("mine-rescue", "whatif");
/** Effects sit about 6 dB under the voice, as in the rest of the series. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

export const SFX: SfxCue[] = [
  // Trapped
  loopCue(sfx("rumble", S.open, 0.5), B.collapse + 20, 10),
  sfx("whoosh_big", TRUCK.start + 14, 0.35),
  sfx("collapse", B.collapse - 2, 1.0),
  sfx("boom", B.collapse, 0.6),
  sfx("whoosh", B.down + 2, 0.4),
  sfx("pop", B.sky - 6, 0.3),
  sfx("whoosh", S.shelterA, 0.3),
  loopCue(sfx("cave", S.shelterA + 10, 0.35), S.drills, 20),
  sfx("clank", B.food + 4, 0.25),
  sfx("whoosh", B.tryShaft, 0.15),
  sfx("pop", B.ladders, 0.3),
  sfx("pop", B.everyTwo, 0.25),
  sfx("clank", B.spoons, 0.2),
  sfx("clank", B.tuna + 10, 0.2),
  sfx("bubble", B.sip, 0.25),
  sfx("snap", B.bite + 1, 0.35),
  // Found
  loopCue(sfx("drill", B.drills - 12, 0.35), B.again2 + 22, 12),
  sfx("pop", B.fist, 0.25),
  sfx("whoosh", B.maps - 6, 0.3),
  sfx("ding", B.past + 4, 0.2),
  loopCue(sfx("cave", S.found, 0.3), S.rideUp, 10),
  sfx("pop", B.day17, 0.3),
  sfx("grind", B.grinding - 6, 0.7, { durationInFrames: B.bursts - B.grinding + 6, fadeOutFrames: 2 }),
  sfx("burst", B.bursts, 0.9),
  sfx("rustle", B.tape, 0.4),
  loopCue(sfx("winch", B.ride - 2, 0.4), B.weAreFine - 6, 4),
  sfx("clank", B.weAreFine - 6, 0.3),
  sfx("rustle", B.weAreFine - 4, 0.35),
  sfx("cheer", B.weAreFine + 6, 0.55),
  // The big hole
  sfx("tube", TUBE.lower + 6, 0.45),
  loopCue(sfx("winch", TUBE.drop, 0.25), TUBE.roof, 4),
  sfx("pop", B.cFood, 0.2),
  sfx("pop", B.water, 0.2),
  sfx("pop", B.letters, 0.2),
  sfx("pop", B.camera, 0.2),
  sfx("tube", TUBE.roof, 0.6),
  sfx("thud", TUBE.caught, 0.3),
  sfx("pop", B.shoulders, 0.25),
  sfx("clank", B.three, 0.3),
  sfx("clank", B.three + 7, 0.3),
  sfx("clank", B.three + 14, 0.3),
  sfx("whoosh", B.race - 8, 0.35),
  loopCue(sfx("drill", B.race - 12, 0.4), S.bits, 8),
  loopCue(sfx("grind", S.bits, 0.5), S.breakthrough, 6),
  sfx("clank", B.chews, 0.5),
  sfx("crack", B.bits, 0.45),
  loopCue(sfx("cave", S.breakthrough, 0.3), S.phoenix, 10),
  sfx("pop", B.day65, 0.3),
  sfx("grind", B.breaks - 40, 0.5, { durationInFrames: 40, fadeOutFrames: 2 }),
  sfx("burst", B.breaks, 0.8),
  sfx("collapse", B.breaks + 2, 0.4),
  sfx("cheer", B.breaks + 12, 0.35),
  sfx("whoosh", B.fiftyThree - 6, 0.25),
  // Out
  sfx("pop", B.phoenix, 0.3),
  loopCue(sfx("winch", B.phoenix + 8, 0.35), B.jams, 4),
  sfx("sparkle", B.wheels, 0.2),
  sfx("sparkle", B.oxygen, 0.2),
  sfx("thud", B.jams, 0.6),
  sfx("hatch", B.hatch - 2, 0.6),
  sfx("pop", B.day69, 0.3),
  loopCue(sfx("winch", B.rises - 36, 0.35), ARRIVALS[0], 4),
  sfx("clank", ARRIVALS[0], 0.4),
  sfx("cheer", ARRIVALS[0] + 6, 0.7),
  ...ARRIVALS.slice(1).map((a) => sfx("winch", a - 24, 0.2, { durationInFrames: 24, fadeOutFrames: 4 })),
  ...ARRIVALS.slice(1).map((a, i) => sfx("cheer", a + 6, i === 3 ? 0.7 : 0.4)),
  sfx("stamp", B.endDays, 0.45),
  sfx("whoosh", B.sevenHundred - 12, 0.3),
  sfx("stamp", B.home, 0.5),
];

const wp = (frame: number, p: { position: [number, number, number]; lookAt: [number, number, number] }) => ({ frame: Math.round(frame), ...p });
const POSTFX = { aoIntensity: 1.3, bloomIntensity: 0.35, bloomThreshold: 0.88, grain: 0.008 };

export const config: EpisodeConfig = {
  id: "MineRescue",
  title: "69 Days Under a Mountain",
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
      { at: B.collapse, strength: 0.36, spread: 10 },
      { at: B.bursts, strength: 0.26, spread: 8 },
      { at: B.breaks, strength: 0.3, spread: 9 },
      { at: B.jams, strength: 0.14, spread: 6 },
      { at: ARRIVALS[0], strength: 0.06, spread: 5 },
    ],
    rumbles: [
      { start: 8, end: B.collapse, strength: 0.03 },
      { start: B.grinding - 6, end: B.bursts, strength: 0.025 },
      { start: S.bits, end: S.breakthrough, strength: 0.02 },
    ],
  },
  audio: { src: "whatif/mine-rescue/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/mine-rescue/score_v3.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.08) contrast(1.06)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.2) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 30,
    backgroundColor: "#8cc3ea",
    postfx: POSTFX,
  },
  OverlayComponent: MineHUD,
};

// ---------------------------------------------------------------------------
// MineRescueLab: the workwear and acting poses (Lab.tsx).
// ---------------------------------------------------------------------------
export const LAB_DURATION = 240;

export const labConfig: EpisodeConfig = {
  id: "MineRescueLab",
  title: "Mine Rescue Lab",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: LAB_DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 200,
    initialPosition: [0, 1.6, 6.2],
    waypoints: [
      { frame: 0, position: [0, 1.6, 6.2], lookAt: [0, 0.9, 0] },
      { frame: 199, position: [0, 1.6, 6.2], lookAt: [0, 0.9, 0] },
      // Close-up on the last two heads (m3, m4), to check the hard hat and sunglasses.
      { frame: 200, position: [2.6, 1.95, 1.7], lookAt: [2.0, 1.78, 0] },
      { frame: LAB_DURATION, position: [2.6, 1.95, 1.7], lookAt: [2.0, 1.78, 0] },
    ],
  },
  overlays: { fadeInFrames: 0, fadeOutFrames: 0, backgroundColor: "#2a2f3a" },
};

// ---------------------------------------------------------------------------
// MineWorldLab: the set without the cast. Lab frame i shows the episode on SET_FRAMES[i] with the
// episode's own camera, so every shot's set can be checked in seconds (Lab.tsx).
// ---------------------------------------------------------------------------
export const SET_FRAMES: number[] = [
  0,
  B.collapse - 20,
  B.collapse + 4,
  B.collapse + 14,
  B.between + 4,
  B.sky + 10,
  S.shelterA + 8,
  S.shelterA + 30,
  S.shelterA + 100,
  B.shaft + 20,
  B.ladders + 16,
  B.never + 10,
  B.spoons,
  S.drills + 20,
  B.holes + 20,
  B.maps + 30,
  B.again2 + 10,
  B.grinding,
  B.bursts + 6,
  B.red + 10,
  B.ride + 20,
  B.weAreFine + 10,
  S.life + 30,
  B.water,
  TUBE.out,
  S.race + 30,
  B.race + 20,
  B.chews + 10,
  B.bits + 10,
  B.breaks + 6,
  B.fiftyThree,
  B.phoenix + 10,
  B.wheels + 20,
  B.hatch + 10,
  B.rises - 40,
  B.ground + 10,
  B.all33,
  B.endDays + 10,
  B.every,
  B.home + 10,
];

export const worldLabConfig: EpisodeConfig = {
  id: "MineWorldLab",
  title: "Mine World Lab",
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
  overlays: { fadeInFrames: 0, fadeOutFrames: 0, backgroundColor: "#8cc3ea", postfx: POSTFX },
};
