import type { EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  BOULDERS,
  DURATION,
  FLIGHT_END,
  FLIGHT_START,
  PIPE_LIP_FRAME,
  ROGUE_ENTER,
  STAGE_STARTS,
  rogueEntryX,
  boulderById,
  boulderCam,
  enterAfter,
  flightCamera,
  footFrame,
  frameAtX,
  type BoulderSpec,
} from "./timeline";

const sfx = (name: string, frame: number, volume = 1, extra: Partial<SfxCue> = {}): SfxCue => ({
  src: `episodes/rolling-boulder/sfx/${name}.wav`,
  frame: Math.round(frame),
  volume,
  ...extra,
});

/** Last frame a boulder is audible: shatter/launch, or rolling out the left exit. */
const rollEnd = (b: BoulderSpec) => {
  if (b.mode === "shatter") return b.end ?? b.release + 60;
  if (b.mode === "pipe") return PIPE_LIP_FRAME;
  return Math.round(frameAtX(b, -11.5));
};

/** Ledge drop, gate, ramp rumble and a trimmed rolling loop for every boulder. */
const boulderSfx = (b: BoulderSpec): SfxCue[] => {
  const vol = b.kind === "drum" ? 0.35 : b.kind === "spiked" ? 0.32 : 0.28;
  const foot = Math.round(footFrame(b));
  const end = rollEnd(b);
  return [
    sfx("gate", b.release - 2, 0.35),
    sfx("thud", foot, 0.45),
    sfx("roll", b.release + 2, vol, {
      durationInFrames: Math.max(8, Math.min(118, end - b.release - 2)),
      fadeOutFrames: 8,
    }),
  ];
};

const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),
  ...BOULDERS.reduce<SfxCue[]>((all, b) => all.concat(boulderSfx(b)), []),

  // Level 1 – tripwire
  sfx("twang", BEATS.wireSet, 0.3),
  sfx("snap", BEATS.goblinTrip, 0.45),
  sfx("thud", BEATS.goblinTrip + 12, 0.35),
  sfx("squash", BEATS.goblinHit, 0.5),
  sfx("snap", BEATS.rogue1Snap, 0.45),
  sfx("whoosh", BEATS.rogue1Leap[0], 0.35),
  sfx("thud", BEATS.rogue1Leap[1], 0.35),

  // Level 2 – drum + slime
  sfx("hydraulic", BEATS.slimePour[0] - 6, 0.35),
  sfx("squelch", BEATS.slimePour[0] + 8, 0.4),
  sfx("snap", BEATS.rogue2Snap, 0.45),
  sfx("slip", BEATS.rogue2Slip, 0.45),
  sfx("squelch", BEATS.rogue2Slip + 18, 0.35),
  sfx("squash", BEATS.rogue2Hit, 0.5),
  sfx("thud", BEATS.paladinStomp, 0.45),
  sfx("clank", BEATS.paladinStomp, 0.35),
  sfx("whoosh", BEATS.paladinBrace, 0.35),
  sfx("crack", BEATS.smash, 0.55),
  sfx("boom", BEATS.smash, 0.35),

  // Level 3 – spiked iron + electromagnet
  sfx("clank", BEATS.magnetInstall, 0.38),
  sfx("hydraulic", BEATS.magnetInstall + 4, 0.3),
  sfx("zap", BEATS.paladin3Brace + 6, 0.25),
  sfx("zap", BEATS.yank, 0.42),
  sfx("whoosh", BEATS.yank + 2, 0.35),
  sfx("clang", BEATS.yank + 10, 0.35),
  sfx("skewer", BEATS.skewer, 0.5),
  sfx("clang", BEATS.skewer, 0.35),
  sfx("levitate", BEATS.levitate, 0.4),
  sfx("sparkle", BEATS.float[0], 0.22),

  // Level 4 – ceiling crushers
  sfx("chain", BEATS.crusherInstall, 0.35),
  sfx("clank", BEATS.crusherInstall + 12, 0.35),
  sfx("gears", BEATS.gearsStart, 0.28, { durationInFrames: BEATS.swat - BEATS.gearsStart, fadeOutFrames: 6 }),
  sfx("ratchet", BEATS.swat - 30, 0.25, { durationInFrames: 30, fadeOutFrames: 4 }),
  sfx("slam", BEATS.swat, 0.55),
  sfx("clang", BEATS.swat + 1, 0.35),
  sfx("thud", BEATS.swat + 9, 0.35),
  sfx("squash", BEATS.hitRogue4, 0.45),
  sfx("squash", BEATS.hitMage4, 0.45),

  // Level 5 – blast door, half-pipe, cube
  sfx("hydraulic", BEATS.doorDrop, 0.35),
  sfx("slam", BEATS.doorSlam, 0.55),
  sfx("boom", BEATS.doorSlam, 0.3),
  sfx("helmet", BEATS.doorSlam + 2, 0.4),
  sfx("ramp", BEATS.curve[0], 0.4),
  sfx("rumble", BEATS.curve[0], 0.35),
  sfx("jelly", BEATS.cubeSpawn, 0.4),
  sfx("launch", BEATS.launch, 0.5),
  sfx("whoosh_big", BEATS.launch + 6, 0.35),
  sfx("jelly", FLIGHT_START + 12, 0.45),
  sfx("squelch", FLIGHT_START + 16, 0.35),
  sfx("sizzle", BEATS.dissolve, 0.35),
  sfx("bubble", BEATS.dissolve + 20, 0.3),
  sfx("stamp", BEATS.stamp, 0.6),
  sfx("boom", BEATS.stamp, 0.35),
];

/** Floor-impact shake + rumble while each boulder rolls. */
const boulderShakes = BOULDERS.filter((b) => b.mode !== "shatter").map((b) => ({
  at: Math.round(footFrame(b)),
  strength: b.kind === "drum" ? 0.14 : 0.1,
  spread: 6,
}));
const boulderRumbles = BOULDERS.map((b) => ({
  start: Math.round(footFrame(b)),
  end: rollEnd(b),
  strength: b.kind === "drum" ? 0.03 : 0.02,
}));

/** Follows a newcomer walking in linearly from the exit. */
const walkTrack = (start: number, end: number, x0: number, x1: number, dist = 9, blend = 8) => ({
  start,
  end,
  blend,
  fn: (f: number) => {
    const x = x0 + (x1 - x0) * Math.min(1, Math.max(0, (f - start) / (end - start))) + 0.6;
    return { position: [x, 2.3, -0.6 + dist] as Vec3, lookAt: [x + 0.2, 1.0, -0.6] as Vec3 };
  },
});

const b1 = boulderById("b1");
const d1 = boulderById("d1");
const s1 = boulderById("s1");
const b3 = boulderById("b3");
const b4 = boulderById("b4");

export const config: EpisodeConfig = {
  id: "RollingBoulder",
  title: "Evolution of a Boulder Trap",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [8.6, 3.4, 9.0],
    waypoints: [
      // Level 1: boulder drops onto the ledge, goblin trips the wire.
      { frame: 0, position: [9.0, 3.8, 10.4], lookAt: [9.5, 2.9, -0.6] },
      { frame: 62, position: [8.8, 3.6, 11.2], lookAt: [9.3, 2.7, -0.6] },
      { frame: 95, position: [-1.6, 2.1, 7.8], lookAt: [-1.4, 0.8, -0.6] },
      { frame: 128, position: [1.6, 2.0, 7.4], lookAt: [1.8, 0.7, -0.6] },
      { frame: 141, position: [2.0, 2.0, 7.4], lookAt: [2.2, 0.7, -0.6] },
      { frame: 150, position: [4.0, 2.4, 11.5], lookAt: [4.4, 1.0, -0.6] },
      // Rogue sprints in (tracked), snaps the wire early, leaps the boulder.
      { frame: 268, position: [2.25, 2.2, 8.4], lookAt: [2.45, 0.9, -0.6] },
      { frame: 300, position: [1.8, 2.2, 8.6], lookAt: [2.0, 0.9, -0.6] },
      { frame: 330, position: [2.4, 2.8, 11.6], lookAt: [2.4, 1.4, -0.6] },
      { frame: 352, position: [1.4, 2.8, 11.2], lookAt: [1.4, 1.9, -0.6] },
      { frame: 362, position: [1.6, 2.4, 10.0], lookAt: [1.7, 1.3, -0.6] },
      { frame: 380, position: [1.6, 1.9, 6.4], lookAt: [1.8, 1.0, -0.6] },
      // Level 2: drum drops, slime pours, rogue slips into its path.
      { frame: 400, position: [9.2, 3.9, 11.8], lookAt: [9.9, 3.0, -0.6] },
      { frame: 440, position: [9.0, 3.8, 12.2], lookAt: [9.7, 2.9, -0.6] },
      { frame: 462, position: [0.6, 2.8, 9.6], lookAt: [0.6, 1.4, -0.6] },
      { frame: 505, position: [0.8, 2.4, 9.0], lookAt: [0.8, 0.8, -0.6] },
      { frame: 522, position: [1.8, 2.0, 7.6], lookAt: [2.0, 0.8, -0.6] },
      { frame: 556, position: [2.6, 2.6, 11.4], lookAt: [3.0, 1.0, -0.6] },
      { frame: 575, position: [0.6, 2.2, 8.4], lookAt: [0.6, 0.6, -0.6] },
      { frame: 600, position: [0.6, 2.2, 8.4], lookAt: [0.2, 0.6, -0.6] },
      { frame: 612, position: [1.4, 2.4, 10.6], lookAt: [1.4, 1.0, -0.6] },
      // Paladin stomps through the slime and smashes the second drum.
      { frame: 690, position: [-4.2, 2.4, 9.0], lookAt: [-4.2, 1.0, -0.6] },
      { frame: 730, position: [-0.6, 2.4, 8.8], lookAt: [-0.4, 1.0, -0.6] },
      { frame: 776, position: [1.8, 2.4, 9.0], lookAt: [2.2, 1.1, -0.6] },
      { frame: 792, position: [3.2, 2.8, 12.0], lookAt: [3.6, 1.2, -0.6] },
      { frame: 828, position: [3.0, 2.6, 11.0], lookAt: [3.4, 1.2, -0.6] },
      { frame: 845, position: [2.8, 2.6, 11.6], lookAt: [3.0, 1.2, -0.6] },
      { frame: 870, position: [2.2, 2.1, 7.4], lookAt: [2.2, 1.2, -0.6] },
      { frame: 905, position: [2.0, 2.0, 6.8], lookAt: [2.0, 1.2, -0.6] },
      // Level 3: spiked iron on the ledge, magnet in the floor.
      { frame: 930, position: [9.2, 3.9, 11.8], lookAt: [9.9, 3.0, -0.6] },
      { frame: 975, position: [9.0, 3.8, 12.2], lookAt: [9.7, 2.9, -0.6] },
      { frame: 1000, position: [3.0, 1.5, 7.6], lookAt: [3.1, -0.6, -0.6] },
      { frame: 1045, position: [2.9, 1.5, 8.0], lookAt: [3.0, -0.4, -0.6] },
      { frame: 1070, position: [2.2, 2.2, 8.6], lookAt: [2.4, 1.0, -0.6] },
      { frame: 1130, position: [2.6, 2.2, 8.6], lookAt: [2.8, 1.0, -0.6] },
      { frame: 1142, position: [3.2, 2.0, 7.6], lookAt: [3.4, 0.8, -0.6] },
      { frame: 1155, position: [4.4, 2.6, 11.4], lookAt: [4.8, 1.2, -0.6] },
      { frame: 1182, position: [3.8, 2.4, 10.8], lookAt: [3.9, 1.1, -0.6] },
      // Mage and rogue float, the next ball rolls under them.
      { frame: 1250, position: [-6.0, 2.4, 9.4], lookAt: [-5.8, 1.0, -0.6] },
      { frame: 1296, position: [-2.4, 2.4, 9.4], lookAt: [-2.0, 1.2, -0.6] },
      { frame: 1330, position: [-1.6, 2.6, 9.6], lookAt: [-1.4, 1.6, -0.6] },
      { frame: 1395, position: [-1.5, 3.2, 10.2], lookAt: [-1.5, 2.2, -0.6] },
      { frame: 1420, position: [-0.9, 2.9, 13.2], lookAt: [-0.9, 2.0, -0.6] },
      { frame: 1480, position: [-1.3, 2.9, 13.0], lookAt: [-1.3, 2.0, -0.6] },
      // Level 4: crushers mount, gears turn, floaters get swatted.
      { frame: 1510, position: [-1.5, 1.8, 9.6], lookAt: [-1.5, 4.6, -0.6] },
      { frame: 1560, position: [-1.5, 2.0, 9.8], lookAt: [-1.5, 4.4, -0.6] },
      { frame: 1578, position: [-1.4, 3.6, 7.6], lookAt: [-1.4, 4.8, -0.6] },
      { frame: 1592, position: [9.2, 3.9, 11.8], lookAt: [9.9, 3.0, -0.6] },
      { frame: 1608, position: [9.0, 3.8, 12.2], lookAt: [9.7, 2.9, -0.6] },
      { frame: 1626, position: [-1.5, 3.2, 10.6], lookAt: [-1.5, 3.0, -0.6] },
      { frame: 1645, position: [-1.5, 3.0, 10.8], lookAt: [-1.5, 2.6, -0.6] },
      { frame: 1662, position: [-1.4, 2.2, 8.6], lookAt: [-1.4, 0.6, -0.6] },
      { frame: 1680, position: [0.0, 2.4, 10.4], lookAt: [0.2, 0.8, -0.6] },
      // Level 5: party enters, stares, flees, door seals, floor curves.
      { frame: 1745, position: [-8.0, 2.4, 9.6], lookAt: [-7.6, 1.0, -0.6] },
      { frame: 1786, position: [-4.0, 2.2, 8.6], lookAt: [-3.6, 1.0, -0.6] },
      { frame: 1800, position: [-3.6, 2.4, 9.6], lookAt: [-3.4, 1.0, -0.6] },
      { frame: 1822, position: [-6.0, 2.6, 9.8], lookAt: [-6.2, 1.2, -0.6] },
      { frame: 1846, position: [-7.8, 2.8, 10.2], lookAt: [-8.2, 1.6, -0.6] },
      { frame: 1872, position: [-7.6, 2.8, 10.4], lookAt: [-8.0, 1.6, -0.6] },
      { frame: 1892, position: [-6.4, 2.4, 9.6], lookAt: [-6.4, 1.0, -0.6] },
      { frame: 1914, position: [-7.0, 3.2, 15.2], lookAt: [-7.2, 2.5, -0.6] },
      { frame: 1962, position: [-7.0, 3.2, 15.6], lookAt: [-7.2, 2.6, -0.6] },
      { frame: 2032, position: [-6.0, 2.6, 12.6], lookAt: [-6.4, 2.0, -0.6] },
      { frame: 2046, position: [-6.4, 2.8, 12.6], lookAt: [-7.0, 2.4, -0.6] },
      // Party sticks in the cube and dissolves.
      { frame: 2112, position: [-7.2, 4.2, 10.4], lookAt: [-8.0, 4.2, -0.6] },
      { frame: 2190, position: [-7.0, 4.0, 11.0], lookAt: [-7.8, 4.0, -0.6] },
      { frame: 2250, position: [-5.4, 3.2, 21.0], lookAt: [-5.6, 2.4, -0.6] },
      { frame: DURATION, position: [-5.4, 3.2, 22.0], lookAt: [-5.6, 2.4, -0.6] },
    ],
    tracks: [
      { start: Math.round(footFrame(b1)) - 6, end: 226, blend: 8, fn: boulderCam("b1", 10, -0.5) },
      {
        start: ROGUE_ENTER[0],
        end: ROGUE_ENTER[1],
        blend: 2,
        fn: (f) => {
          const x = rogueEntryX(f) + 0.5;
          return { position: [x, 2.2, 8.4], lookAt: [x + 0.2, 0.9, -0.6] };
        },
      },
      { start: 623, end: 678, blend: 8, fn: boulderCam("d1", 11, -0.6) },
      walkTrack(enterAfter("d1"), 728, -10.6, -1.1),
      walkTrack(enterAfter("s1"), BEATS.cast - 14, -10.6, -2.2, 9.6),
      { start: BEATS.skewer, end: 1248, blend: 8, fn: boulderCam("s1", 10, -0.5) },
      { start: BEATS.hitRogue4 - 6, end: Math.round(frameAtX(b3, -11)), blend: 8, fn: boulderCam("b3", 10, -0.5) },
      // Hard cut to the ledge for the release, then ride the boulder to the pipe.
      {
        start: 1964,
        end: 1992,
        blend: 1,
        fn: () => ({ position: [9.2, 3.9, 11.8] as Vec3, lookAt: [9.9, 3.0, -0.6] as Vec3 }),
      },
      { start: 1982, end: 2030, blend: 8, fn: boulderCam("b4", 10, -0.8) },
      { start: FLIGHT_START, end: FLIGHT_END + 12, blend: 10, fn: flightCamera },
    ],
    shake: [
      ...boulderShakes,
      { at: BEATS.goblinHit, strength: 0.18, spread: 6 },
      { at: BEATS.rogue2Hit, strength: 0.2, spread: 6 },
      { at: BEATS.smash, strength: 0.34, spread: 9 },
      { at: BEATS.yank, strength: 0.14, spread: 5 },
      { at: BEATS.skewer, strength: 0.24, spread: 7 },
      { at: BEATS.swat, strength: 0.28, spread: 7 },
      { at: BEATS.hitRogue4, strength: 0.16, spread: 6 },
      { at: BEATS.doorSlam, strength: 0.3, spread: 8 },
      { at: BEATS.launch, strength: 0.32, spread: 9 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
    ],
    rumbles: [
      ...boulderRumbles,
      { start: BEATS.curve[0], end: BEATS.curve[1], strength: 0.04 },
      { start: d1.spawn, end: d1.spawn + 14, strength: 0.03 },
      { start: s1.spawn, end: s1.spawn + 14, strength: 0.02 },
      { start: b4.spawn, end: b4.spawn + 14, strength: 0.02 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/rolling-boulder/narration_v2.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/rolling-boulder/score_v2.mp3",
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
