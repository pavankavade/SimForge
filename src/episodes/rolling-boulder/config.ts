import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import { BEATS, DURATION, launchCameraTrack } from "./timeline";

const sfx = (
  name: string,
  frame: number,
  volume = 1,
  extra: Partial<SfxCue> = {}
): SfxCue => ({
  src: `episodes/rolling-boulder/sfx/${name}.wav`,
  frame,
  volume,
  ...extra,
});

const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.45),
  ...[84, BEATS.wideBoulderSpawn, BEATS.spikeSpawn, BEATS.pistonsReveal, BEATS.cubeTrapReveal].map((f) =>
    sfx("sparkle", f, 0.35)
  ),

  // Stage 1: Tripwire Boulder
  sfx("twang", BEATS.goblinTrip, 0.7),
  sfx("trap_open", BEATS.boulderRoll1 - 4, 0.8),
  sfx("rumble", BEATS.boulderRoll1, 0.6, { durationInFrames: 45 }),
  sfx("thud", BEATS.goblinSquash, 0.9),
  sfx("dust", BEATS.goblinSquash, 0.7),
  sfx("whoosh", BEATS.rogue1Leap[0], 0.55),
  sfx("thud", BEATS.rogue1Leap[1], 0.45),

  // Stage 2: Wide Boulder + Slime Slick + Paladin Smash
  sfx("whoosh_big", BEATS.wideBoulderSpawn, 0.5),
  sfx("sizzle", BEATS.slimeSpawn, 0.7),
  sfx("whoosh", BEATS.rogue2Leap[0], 0.5),
  sfx("whoosh_big", BEATS.rogue2Slip[0], 0.6),
  sfx("thud", BEATS.rogue2Squash, 0.85),
  sfx("clank", BEATS.paladinBrace, 0.65),
  sfx("rumble", BEATS.boulderRoll2b, 0.6, { durationInFrames: 45 }),
  sfx("clang", BEATS.paladinSmash, 1.0),
  sfx("boom", BEATS.paladinSmash, 0.85),
  sfx("dust", BEATS.paladinSmash + 2, 0.7),

  // Stage 3: Magnetic Spikes & Mage Levitate
  sfx("clank", BEATS.spikeSpawn, 0.6),
  sfx("sparkle", BEATS.magnetReveal, 0.5),
  sfx("ratchet", BEATS.magnetActive - 12, 0.6, { durationInFrames: 24 }),
  sfx("chain", BEATS.magnetActive, 0.7),
  sfx("clang", BEATS.paladinSpikeHit, 0.95),
  sfx("thud", BEATS.paladinSpikeHit, 0.8),
  sfx("ice", BEATS.mageLevitate, 0.85),
  sfx("whoosh", BEATS.partyFloatUp[0], 0.6),
  sfx("rumble", BEATS.ironBoulderRoll3b, 0.5, { durationInFrames: 50 }),

  // Stage 4: Hydraulic Ceiling Crushers
  sfx("clank", BEATS.pistonsReveal, 0.65),
  sfx("ratchet", BEATS.pistonsReveal + 8, 0.5, { durationInFrames: 30 }),
  sfx("whoosh_big", BEATS.pistonSlam, 0.75),
  sfx("thud", BEATS.pistonSlam + 4, 1.0),
  sfx("boom", BEATS.pistonSlam + 4, 0.7),
  sfx("dust", BEATS.pistonSlam + 6, 0.8),

  // Stage 5: Halfpipe Ramp, Launch, Gelatinous Cube
  sfx("clank", BEATS.cubeTrapReveal, 0.6),
  sfx("thud", BEATS.doorSlam + 4, 1.0),
  sfx("boom", BEATS.doorSlam + 4, 0.8),
  sfx("ratchet", BEATS.rampDeploy, 0.6, { durationInFrames: 30 }),
  sfx("rumble", BEATS.boulderRollFinal, 0.8, { durationInFrames: 60 }),
  sfx("launch", BEATS.launchStart, 1.0),
  sfx("whoosh_big", BEATS.launchStart + 12, 0.8),
  sfx("chomp", BEATS.cubeSplash, 1.0),
  sfx("burp", BEATS.cubeSplash + 28, 0.85),
  sfx("stamp", BEATS.stamp, 1.0),
  sfx("boom", BEATS.stamp, 0.7),
];

export const config: EpisodeConfig = {
  id: "RollingBoulder",
  title: "The Rolling Boulder Hallway",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [-4.8, 2.5, 7.5],
    waypoints: [
      // Stage 1: Tripwire Boulder
      { frame: 0, position: [-4.8, 2.5, 7.5], lookAt: [-4.2, 0.9, -0.6] },
      { frame: 70, position: [-2.8, 2.8, 7.2], lookAt: [-2.2, 1.0, -0.6] },
      { frame: 145, position: [0.5, 3.8, 9.2], lookAt: [2.0, 2.2, -0.6] },
      { frame: 190, position: [-1.6, 2.6, 6.8], lookAt: [-2.0, 0.9, -0.6] },
      { frame: 250, position: [-4.2, 2.4, 7.6], lookAt: [-3.5, 1.0, -0.6] },
      { frame: 315, position: [-2.5, 2.6, 6.5], lookAt: [-2.5, 1.1, -0.6] },
      { frame: 360, position: [-0.8, 3.4, 8.5], lookAt: [-0.8, 1.8, -0.6] },
      { frame: 400, position: [1.8, 3.0, 7.8], lookAt: [2.2, 1.8, -0.6] },

      // Stage 2: Wide Boulder + Slime Slick + Paladin Smash
      { frame: 420, position: [2.5, 4.2, 9.8], lookAt: [3.2, 2.8, -0.6] },
      { frame: 535, position: [-1.2, 2.2, 6.2], lookAt: [-1.5, 1.2, -0.6] },
      { frame: 615, position: [-1.6, 2.5, 6.8], lookAt: [-1.8, 1.3, -0.6] },
      { frame: 660, position: [-1.8, 2.4, 6.5], lookAt: [-2.0, 1.2, -0.6] },
      { frame: 740, position: [-4.2, 2.6, 9.2], lookAt: [-3.5, 1.2, -0.6] },
      { frame: 800, position: [-2.4, 3.2, 9.4], lookAt: [-2.4, 1.4, -0.6] },
      { frame: 840, position: [-2.2, 3.4, 9.6], lookAt: [-2.3, 1.5, -0.6] },
      { frame: 910, position: [-2.0, 3.2, 9.8], lookAt: [-2.2, 1.4, -0.6] },

      // Stage 3: Magnetic Spikes & Mage Levitate
      { frame: 950, position: [2.0, 4.5, 9.5], lookAt: [2.5, 2.8, -0.6] },
      { frame: 1020, position: [-1.2, 1.8, 6.0], lookAt: [-1.5, 0.8, -0.6] },
      { frame: 1150, position: [-1.3, 2.3, 6.5], lookAt: [-1.3, 1.2, -0.6] },
      { frame: 1210, position: [-1.1, 2.4, 6.2], lookAt: [-1.1, 1.1, -0.6] },
      { frame: 1270, position: [-1.0, 2.4, 7.2], lookAt: [-0.8, 1.4, -0.6] },
      { frame: 1320, position: [-0.8, 4.2, 8.8], lookAt: [-0.8, 3.6, -0.6] },
      { frame: 1380, position: [0.0, 3.8, 11.0], lookAt: [0.0, 2.6, -0.6] },

      // Stage 4: Hydraulic Ceiling Crushers
      { frame: 1480, position: [0.5, 5.8, 8.2], lookAt: [0.0, 5.0, -0.6] },
      { frame: 1615, position: [-0.8, 4.2, 7.8], lookAt: [-0.8, 2.4, -0.6] },
      { frame: 1660, position: [-0.8, 2.4, 6.5], lookAt: [-0.8, 1.4, -0.6] },
      { frame: 1740, position: [-1.5, 2.8, 8.2], lookAt: [-1.5, 1.6, -0.6] },

      // Stage 5: Half-Pipe Ramp, Launch, Gelatinous Cube
      { frame: 1790, position: [-3.2, 2.6, 8.8], lookAt: [-4.0, 1.2, -0.6] },
      { frame: 1925, position: [-6.8, 1.8, 7.2], lookAt: [-7.8, 0.6, -0.6] },
      { frame: 2020, position: [-6.5, 2.0, 7.8], lookAt: [-7.2, 0.8, -0.6] },
      { frame: 2100, position: [-4.2, 2.5, 9.8], lookAt: [-5.0, 1.0, -0.6] },
      { frame: 2150, position: [-6.8, 2.2, 9.0], lookAt: [-6.5, 1.2, -0.6] },
      // Launch tracking flight camera takes over between 2155 and 2210 via tracks!
      { frame: 2210, position: [4.0, 7.2, 11.2], lookAt: [4.0, 6.8, -0.6] },
      { frame: 2260, position: [4.0, 7.0, 10.5], lookAt: [4.0, 6.8, -0.6] },
      { frame: 2340, position: [0.5, 4.8, 17.5], lookAt: [0.0, 2.8, -0.6] },
      { frame: 2480, position: [0.5, 4.8, 17.8], lookAt: [0.0, 2.8, -0.6] },
    ],
    tracks: [
      { start: BEATS.launchStart, end: BEATS.cubeSplash, blend: 6, fn: launchCameraTrack },
    ],
    shake: [
      { at: BEATS.goblinSquash, strength: 0.16, spread: 6 },
      { at: BEATS.rogue2Squash, strength: 0.18, spread: 6 },
      { at: BEATS.paladinSmash, strength: 0.35, spread: 10 },
      { at: BEATS.paladinSpikeHit, strength: 0.22, spread: 7 },
      { at: BEATS.pistonSlam, strength: 0.32, spread: 9 },
      { at: BEATS.doorSlam, strength: 0.36, spread: 9 },
      { at: BEATS.launchStart, strength: 0.25, spread: 8 },
      { at: BEATS.cubeSplash, strength: 0.38, spread: 11 },
      { at: BEATS.stamp, strength: 0.24, spread: 8 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/rolling-boulder/narration.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/rolling-boulder/score.mp3",
    volume: 0.45,
    fadeInFrames: 20,
    fadeOutFrames: 40,
  },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.18) contrast(1.05) brightness(1.05)",
    vignette:
      "linear-gradient(135deg, rgba(255,156,74,0.10) 0%, rgba(255,156,74,0) 38%, rgba(18,31,60,0.18) 100%), radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.24) 100%), linear-gradient(180deg, rgba(4,7,12,0.16) 0%, rgba(4,7,12,0) 20%, rgba(4,7,12,0) 72%, rgba(4,7,12,0.34) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 24,
    backgroundColor: "#20232d",
  },
  OverlayComponent: TrapHUD,
};
