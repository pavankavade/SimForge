import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import { BEATS, DURATION, FLIGHT_END, flightCamera } from "./timeline";

const sfx = (name: string, frame: number, volume = 1, extra: Partial<SfxCue> = {}): SfxCue => ({
  src: `episodes/dungeon-trap/sfx/${name}.wav`,
  frame,
  volume,
  ...extra,
});

/** Pendulum passes through the bottom of its arc (until it winds down). */
const pendulumPasses = [1667, 1687, 1707, 1726, 1746];

const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.45),
  ...[84, BEATS.trapdoorSpawn, 994, 1452, BEATS.chamberReveal + 1].map((f) => sfx("sparkle", f, 0.3)),

  // Stage 1
  sfx("clank", BEATS.spikeSpawn, 0.45),
  sfx("whoosh", BEATS.goblinFall, 0.55),
  sfx("spike", BEATS.goblinLand, 0.9),
  sfx("whoosh", BEATS.rogue1Leap[0], 0.5),
  sfx("thud", BEATS.rogue1Leap[1], 0.45),

  // Stage 2
  sfx("whoosh_big", BEATS.trapdoorSpawn, 0.45),
  sfx("thud", BEATS.trapdoorSpawn + 16, 0.8),
  sfx("clank", BEATS.trapdoorSpawn + 16, 0.35),
  sfx("pop", BEATS.plateSpawn, 0.6),
  sfx("chain", BEATS.chestSpawn, 0.55),
  sfx("click", BEATS.plateClick, 1),
  sfx("trap_open", BEATS.trapdoorOpen - 4, 0.9),
  sfx("whoosh", BEATS.rogue2Fall[0], 0.45),
  sfx("spike", BEATS.rogue2Fall[1], 0.9),
  sfx("trap_close", BEATS.trapdoorClose, 0.75),

  // Stage 3
  sfx("ice", BEATS.iceCast, 0.8),
  ...[0, 16, 32, 48].map((d) => sfx("clank", BEATS.flamerSpawn + d, 0.4)),
  sfx("thud", BEATS.flamerSpawn + 95, 0.6),
  sfx("ignite", BEATS.fireStart, 0.85),
  sfx("fire_loop", BEATS.fireStart + 3, 0.5, { durationInFrames: 150 }),
  sfx("fire_loop", BEATS.fireStart + 145, 0.5, { durationInFrames: 130, fadeOutFrames: 20 }),
  sfx("sizzle", BEATS.mageFall[0], 0.8),
  sfx("trap_open", BEATS.trapdoorOpen3 - 4, 0.75),
  sfx("spike", BEATS.mageFall[1], 0.9),
  sfx("trap_close", BEATS.trapdoorClose3, 0.7),

  // Stage 4
  sfx("clank", 1335, 0.55),
  sfx("whoosh_big", BEATS.pendulumSpawn, 0.45),
  sfx("chain", BEATS.pendulumSpawn + 4, 0.55),
  sfx("clank", BEATS.pendulumSpawn + 20, 0.7),
  sfx("ratchet", BEATS.cockStart, 0.65, { durationInFrames: BEATS.release - BEATS.cockStart, fadeOutFrames: 4 }),
  sfx("whoosh", BEATS.release, 0.8),
  sfx("clang", BEATS.bladeHit, 1),
  sfx("trap_open", BEATS.trapdoorOpen4 - 2, 0.6),
  sfx("spike", BEATS.paladinLand, 1),
  ...pendulumPasses.map((f, i) => sfx("whoosh", f - 8, 0.42 * (1 - i * 0.12))),
  sfx("trap_close", BEATS.trapdoorClose4, 0.7),

  // Stage 5
  sfx("rumble", BEATS.chamberReveal - 12, 0.9),
  sfx("dust", BEATS.chamberReveal, 0.8),
  ...[0, 1, 2, 3].map((i) =>
    sfx("pop", Math.round(BEATS.catapultBuild[0] + (i * (BEATS.catapultBuild[1] - BEATS.catapultBuild[0])) / 4), 0.7)
  ),
  sfx("pop", BEATS.mimicSpawn, 0.55),
  sfx("growl", BEATS.mimicOpen - 14, 0.75),
  sfx("launch", BEATS.launch, 1),
  sfx("whoosh_big", BEATS.launch + 18, 0.55),
  sfx("chomp", BEATS.chomp, 1),
  sfx("chew", BEATS.chomp + 8, 0.8),
  sfx("burp", BEATS.burp, 0.9),
  sfx("helmet", BEATS.helmetLand, 0.85),
  sfx("ignite", BEATS.finaleFire[0], 0.7),
  sfx("fire_loop", BEATS.finaleFire[0] + 3, 0.4, { durationInFrames: DURATION - BEATS.finaleFire[0] - 3 }),
  sfx("thud", BEATS.slabReset + 22, 0.55),
  sfx("stamp", BEATS.stamp, 1),
  sfx("boom", BEATS.stamp, 0.6),
];

export const config: EpisodeConfig = {
  id: "DungeonTrap",
  title: "Evolution of a Dungeon Trap",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [-5.2, 1.9, 6.2],
    waypoints: [
      // Stage 1: close on the goblin, tilt down after him, then the rogue.
      { frame: 0, position: [-5.2, 1.9, 6.2], lookAt: [-5.4, 0.9, -0.6] },
      { frame: 85, position: [-2.6, 2.4, 6.4], lookAt: [-2.6, 0.8, -0.6] },
      { frame: 110, position: [-1.6, 3.6, 6.4], lookAt: [-1.2, -1.6, -0.6] },
      { frame: 140, position: [-1.0, 3.0, 6.6], lookAt: [-1.0, -2.6, -0.6] },
      { frame: 178, position: [-1.0, 3.0, 6.8], lookAt: [-1.0, -2.4, -0.6] },
      { frame: 205, position: [-4.6, 2.4, 8.4], lookAt: [-4.4, 0.9, -0.6] },
      { frame: 285, position: [-1.8, 2.8, 8.6], lookAt: [-1.4, 0.6, -0.6] },
      { frame: 318, position: [-1.2, 2.8, 9.6], lookAt: [-0.6, 0.6, -0.6] },
      { frame: 340, position: [0.3, 3.0, 11.0], lookAt: [0.3, 0.8, -0.6] },
      { frame: 420, position: [2.2, 2.6, 9.6], lookAt: [2.6, 0.8, -0.6] },
      // Stage 2: trapdoor + bait install, rogue greed, floor drops.
      { frame: 455, position: [0.4, 3.4, 10.5], lookAt: [0.4, 0.9, -0.6] },
      { frame: 525, position: [0.8, 3.2, 9.8], lookAt: [0.8, 1.4, -0.6] },
      { frame: 560, position: [-3.6, 2.6, 8.8], lookAt: [-3.4, 0.9, -0.6] },
      { frame: 620, position: [-1.2, 2.8, 8.8], lookAt: [-0.8, 0.9, -0.6] },
      { frame: 650, position: [0.6, 2.6, 7.4], lookAt: [0.8, 1.0, -0.6] },
      { frame: 672, position: [1.0, 2.2, 6.2], lookAt: [1.0, 0.6, -0.6] },
      { frame: 686, position: [0.9, 3.6, 6.6], lookAt: [0.9, -1.6, -0.6] },
      { frame: 712, position: [0.9, 3.0, 6.8], lookAt: [0.9, -2.6, -0.6] },
      { frame: 735, position: [0.9, 3.0, 7.0], lookAt: [0.9, -2.0, -0.6] },
      // Stage 3: mage, ice bridge, flamers.
      { frame: 758, position: [-4.8, 2.5, 8.4], lookAt: [-5.2, 0.9, -0.6] },
      { frame: 865, position: [-2.8, 2.5, 7.8], lookAt: [-2.5, 1.0, -0.6] },
      { frame: 935, position: [-2.2, 2.5, 7.6], lookAt: [-2.0, 0.9, -0.6] },
      { frame: 1005, position: [1.6, 2.7, 7.8], lookAt: [1.6, 1.0, -0.6] },
      { frame: 1060, position: [1.4, 2.8, 8.0], lookAt: [1.0, 1.2, -0.8] },
      { frame: 1110, position: [0.9, 2.9, 7.8], lookAt: [0.8, 1.0, -0.8] },
      { frame: 1170, position: [1.0, 3.3, 8.0], lookAt: [1.0, -1.2, -0.6] },
      { frame: 1230, position: [0.6, 2.8, 8.2], lookAt: [0.5, 0.2, -0.8] },
      // Stage 4: paladin shields through, pendulum mounts and swats.
      { frame: 1258, position: [-5.6, 2.6, 8.4], lookAt: [-5.8, 0.9, -0.6] },
      { frame: 1335, position: [-3.6, 2.7, 8.0], lookAt: [-3.4, 1.0, -0.6] },
      { frame: 1400, position: [-1.6, 2.8, 8.4], lookAt: [-1.2, 1.1, -0.6] },
      { frame: 1452, position: [-1.6, 3.4, 10.5], lookAt: [-1.6, 2.4, -0.6] },
      { frame: 1546, position: [-1.6, 3.4, 10.5], lookAt: [-1.6, 2.3, -0.6] },
      { frame: 1636, position: [-1.4, 3.1, 9.4], lookAt: [-1.4, 2.0, -0.6] },
      { frame: 1652, position: [-1.2, 3.1, 9.2], lookAt: [-1.0, 1.6, -0.6] },
      { frame: 1672, position: [-0.6, 3.4, 8.4], lookAt: [-0.4, -1.2, -0.6] },
      { frame: 1702, position: [-0.3, 3.0, 7.4], lookAt: [-0.2, -2.6, -0.6] },
      { frame: 1722, position: [-0.3, 3.0, 7.6], lookAt: [-0.2, -2.4, -0.6] },
      // Stage 5: party, chamber reveal, huddle, launch, mimic.
      { frame: 1745, position: [-7.4, 2.4, 8.6], lookAt: [-7.6, 1.0, -0.6] },
      { frame: 1826, position: [-7.6, 2.3, 8.2], lookAt: [-7.6, 1.0, -0.6] },
      { frame: 1850, position: [-6.1, 0.4, 16.0], lookAt: [-6.1, -0.6, -0.6] },
      { frame: 1965, position: [-6.1, 0.6, 15.4], lookAt: [-6.1, -0.5, -0.6] },
      { frame: 1992, position: [-7.8, 2.0, 7.4], lookAt: [-7.9, 0.9, -0.6] },
      { frame: 2060, position: [-7.8, 2.0, 7.6], lookAt: [-7.9, 0.9, -0.6] },
      { frame: 2078, position: [-6.6, 2.4, 11.0], lookAt: [-6.6, 0.8, -0.6] },
      { frame: 2150, position: [6.2, 2.4, 8.0], lookAt: [6.9, 1.0, -0.6] },
      { frame: 2200, position: [6.4, 2.2, 6.9], lookAt: [6.9, 1.0, -0.6] },
      { frame: 2225, position: [6.0, 2.0, 7.4], lookAt: [6.2, 0.8, -0.6] },
      { frame: 2300, position: [2.4, 0.9, 26.5], lookAt: [2.4, 0.2, -0.6] },
    ],
    tracks: [
      { start: 2072, end: Math.min(FLIGHT_END + 16, 2178), blend: 12, fn: flightCamera },
    ],
    shake: [
      { at: BEATS.goblinLand, strength: 0.16, spread: 6 },
      { at: BEATS.trapdoorOpen, strength: 0.14, spread: 6 },
      { at: BEATS.rogue2Fall[1], strength: 0.16, spread: 6 },
      { at: BEATS.mageFall[1], strength: 0.14, spread: 6 },
      { at: BEATS.bladeHit, strength: 0.32, spread: 9 },
      { at: BEATS.paladinLand, strength: 0.2, spread: 7 },
      { at: BEATS.launch, strength: 0.36, spread: 10 },
      { at: BEATS.chomp, strength: 0.26, spread: 8 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
    ],
    rumbles: [
      { start: BEATS.chamberReveal - 12, end: BEATS.chamberReveal + 30, strength: 0.05 },
      { start: BEATS.launch, end: BEATS.launch + 20, strength: 0.03 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/dungeon-trap/narration_v2.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/dungeon-trap/score_v2.mp3",
    volume: 1,
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
