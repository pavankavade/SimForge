import type { EpisodeConfig, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { TrapHUD } from "./TrapHUD";

// Word-level synced subtitle segments for the 5-stage evolution script
const segments: SubtitleSegment[] = [
  // Beat 1: Basic Spike Pit (Frames 15 - 320)
  {
    startFrame: 15,
    endFrame: 150,
    words: [
      { word: "If", startFrame: 15, endFrame: 22 },
      { word: "you", startFrame: 22, endFrame: 28 },
      { word: "dig", startFrame: 28, endFrame: 38 },
      { word: "a", startFrame: 38, endFrame: 44 },
      { word: "simple", startFrame: 44, endFrame: 58 },
      { word: "spike", startFrame: 58, endFrame: 72 },
      { word: "pit", startFrame: 72, endFrame: 86 },
      { word: "at", startFrame: 86, endFrame: 94 },
      { word: "your", startFrame: 94, endFrame: 104 },
      { word: "dungeon", startFrame: 104, endFrame: 122 },
      { word: "entrance,", startFrame: 122, endFrame: 150 },
    ],
  },
  {
    startFrame: 155,
    endFrame: 320,
    words: [
      { word: "a", startFrame: 155, endFrame: 164 },
      { word: "goblin", startFrame: 164, endFrame: 184 },
      { word: "falls", startFrame: 184, endFrame: 202 },
      { word: "in—", startFrame: 202, endFrame: 218 },
      { word: "but", startFrame: 218, endFrame: 230 },
      { word: "a", startFrame: 230, endFrame: 238 },
      { word: "Rogue", startFrame: 238, endFrame: 256 },
      { word: "easily", startFrame: 256, endFrame: 276 },
      { word: "leaps", startFrame: 276, endFrame: 294 },
      { word: "over.", startFrame: 294, endFrame: 320 },
    ],
  },

  // Beat 2: Greed Bait & False Floor (Frames 335 - 740)
  {
    startFrame: 335,
    endFrame: 510,
    words: [
      { word: "So", startFrame: 335, endFrame: 348 },
      { word: "you", startFrame: 348, endFrame: 358 },
      { word: "cover", startFrame: 358, endFrame: 374 },
      { word: "the", startFrame: 374, endFrame: 384 },
      { word: "gap", startFrame: 384, endFrame: 398 },
      { word: "with", startFrame: 398, endFrame: 412 },
      { word: "a", startFrame: 412, endFrame: 420 },
      { word: "hinged", startFrame: 420, endFrame: 438 },
      { word: "trapdoor", startFrame: 438, endFrame: 462 },
      { word: "and", startFrame: 462, endFrame: 474 },
      { word: "hang", startFrame: 474, endFrame: 488 },
      { word: "gold", startFrame: 488, endFrame: 510 },
    ],
  },
  {
    startFrame: 515,
    endFrame: 740,
    words: [
      { word: "forcing", startFrame: 515, endFrame: 535 },
      { word: "greed", startFrame: 535, endFrame: 555 },
      { word: "onto", startFrame: 555, endFrame: 575 },
      { word: "a", startFrame: 575, endFrame: 585 },
      { word: "hidden", startFrame: 585, endFrame: 610 },
      { word: "pressure", startFrame: 610, endFrame: 638 },
      { word: "plate", startFrame: 638, endFrame: 665 },
      { word: "that", startFrame: 665, endFrame: 680 },
      { word: "drops", startFrame: 680, endFrame: 705 },
      { word: "them.", startFrame: 705, endFrame: 740 },
    ],
  },

  // Beat 3: Countering Mage Ice Spell (Frames 755 - 1220)
  {
    startFrame: 755,
    endFrame: 960,
    words: [
      { word: "When", startFrame: 755, endFrame: 775 },
      { word: "their", startFrame: 775, endFrame: 792 },
      { word: "Mage", startFrame: 792, endFrame: 815 },
      { word: "casts", startFrame: 815, endFrame: 838 },
      { word: "an", startFrame: 838, endFrame: 850 },
      { word: "ice", startFrame: 850, endFrame: 870 },
      { word: "bridge", startFrame: 870, endFrame: 896 },
      { word: "across", startFrame: 896, endFrame: 924 },
      { word: "the", startFrame: 924, endFrame: 938 },
      { word: "pit,", startFrame: 938, endFrame: 960 },
    ],
  },
  {
    startFrame: 965,
    endFrame: 1220,
    words: [
      { word: "you", startFrame: 965, endFrame: 980 },
      { word: "install", startFrame: 980, endFrame: 1010 },
      { word: "copper", startFrame: 1010, endFrame: 1040 },
      { word: "flamethrowers", startFrame: 1040, endFrame: 1095 },
      { word: "that", startFrame: 1095, endFrame: 1115 },
      { word: "melt", startFrame: 1115, endFrame: 1145 },
      { word: "the", startFrame: 1145, endFrame: 1160 },
      { word: "frost", startFrame: 1160, endFrame: 1188 },
      { word: "instantly.", startFrame: 1188, endFrame: 1220 },
    ],
  },

  // Beat 4: Paladin Shield vs Pendulum (Frames 1235 - 1700)
  {
    startFrame: 1235,
    endFrame: 1450,
    words: [
      { word: "To", startFrame: 1235, endFrame: 1250 },
      { word: "stop", startFrame: 1250, endFrame: 1272 },
      { word: "a", startFrame: 1272, endFrame: 1285 },
      { word: "Paladin", startFrame: 1285, endFrame: 1318 },
      { word: "pushing", startFrame: 1318, endFrame: 1350 },
      { word: "through", startFrame: 1350, endFrame: 1378 },
      { word: "with", startFrame: 1378, endFrame: 1398 },
      { word: "a", startFrame: 1398, endFrame: 1410 },
      { word: "tower", startFrame: 1410, endFrame: 1432 },
      { word: "shield,", startFrame: 1432, endFrame: 1450 },
    ],
  },
  {
    startFrame: 1455,
    endFrame: 1700,
    words: [
      { word: "a", startFrame: 1455, endFrame: 1470 },
      { word: "ceiling", startFrame: 1470, endFrame: 1505 },
      { word: "pendulum", startFrame: 1505, endFrame: 1545 },
      { word: "axe", startFrame: 1545, endFrame: 1575 },
      { word: "swings", startFrame: 1575, endFrame: 1612 },
      { word: "down", startFrame: 1612, endFrame: 1638 },
      { word: "and", startFrame: 1638, endFrame: 1655 },
      { word: "smashes", startFrame: 1655, endFrame: 1680 },
      { word: "him.", startFrame: 1680, endFrame: 1700 },
    ],
  },

  // Beat 5: Overkill Catapult & Mimic (Frames 1715 - 2240)
  {
    startFrame: 1715,
    endFrame: 1940,
    words: [
      { word: "Finally,", startFrame: 1715, endFrame: 1745 },
      { word: "for", startFrame: 1745, endFrame: 1765 },
      { word: "parties", startFrame: 1765, endFrame: 1798 },
      { word: "refusing", startFrame: 1798, endFrame: 1832 },
      { word: "to", startFrame: 1832, endFrame: 1848 },
      { word: "move,", startFrame: 1848, endFrame: 1872 },
      { word: "the", startFrame: 1872, endFrame: 1890 },
      { word: "entire", startFrame: 1890, endFrame: 1918 },
      { word: "floor", startFrame: 1918, endFrame: 1940 },
    ],
  },
  {
    startFrame: 1945,
    endFrame: 2240,
    words: [
      { word: "catapults", startFrame: 1945, endFrame: 1985 },
      { word: "them", startFrame: 1985, endFrame: 2010 },
      { word: "directly", startFrame: 2010, endFrame: 2045 },
      { word: "into", startFrame: 2045, endFrame: 2070 },
      { word: "your", startFrame: 2070, endFrame: 2095 },
      { word: "pet", startFrame: 2095, endFrame: 2125 },
      { word: "Mimic—", startFrame: 2125, endFrame: 2160 },
      { word: "unbeatable.", startFrame: 2160, endFrame: 2240 },
    ],
  },
];

export const config: EpisodeConfig = {
  id: "DungeonTrap",
  title: "Evolution of a Dungeon Trap",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 2250,
  camera: {
    fov: 46,
    near: 0.2,
    far: 350,
    initialPosition: [0.0, 3.5, 12.0],
    waypoints: [
      // Beat 1: Goblin and Rogue
      { frame: 0, position: [0.0, 3.5, 12.0], lookAt: [0.0, 0.0, -0.6] },
      { frame: 80, position: [-1.2, 1.2, 9.5], lookAt: [-1.0, -1.0, -0.6] },
      { frame: 180, position: [0.0, 2.2, 10.5], lookAt: [0.0, 0.5, -0.6] },
      { frame: 320, position: [0.5, 2.4, 10.0], lookAt: [0.5, 0.4, -0.6] },

      // Beat 2: Trapdoor, Hanging Chest, and Pressure Plate
      { frame: 350, position: [0.8, 2.0, 8.5], lookAt: [0.8, 1.2, -0.6] },
      { frame: 480, position: [1.1, 0.2, 6.5], lookAt: [0.6, -0.8, -0.6] },
      { frame: 540, position: [0.8, 0.8, 7.5], lookAt: [0.8, -1.5, -0.6] },
      { frame: 720, position: [0.0, 1.5, 9.0], lookAt: [0.0, -0.5, -0.6] },

      // Beat 3: Mage, Ice Bridge, and Flame Jets
      { frame: 760, position: [-1.5, 1.8, 8.2], lookAt: [-1.0, 0.4, -0.6] },
      { frame: 830, position: [0.0, -0.8, 7.2], lookAt: [0.0, -1.6, -1.2] },
      { frame: 880, position: [0.0, 1.2, 8.0], lookAt: [0.0, 0.0, -0.6] },
      { frame: 1200, position: [-0.5, 1.6, 8.8], lookAt: [-0.5, 0.2, -0.6] },

      // Beat 4: Paladin and Swinging Pendulum
      { frame: 1240, position: [-3.5, 1.5, 8.0], lookAt: [-3.0, 0.6, -0.6] },
      { frame: 1280, position: [-2.4, 3.6, 7.8], lookAt: [-2.4, 3.2, -0.6] },
      { frame: 1335, position: [-1.8, 1.2, 8.2], lookAt: [-1.5, 0.2, -0.6] },
      { frame: 1680, position: [-1.2, 1.8, 9.2], lookAt: [-1.2, 0.4, -0.6] },

      // Beat 5: Underground Catapult, Mimic, and Grand Launch
      { frame: 1720, position: [-4.8, -0.6, 8.8], lookAt: [-4.8, -1.4, -0.6] },
      { frame: 1840, position: [0.0, 4.2, 14.5], lookAt: [0.5, 1.2, -0.6] },
      { frame: 1880, position: [3.2, 3.2, 11.0], lookAt: [4.5, 1.2, -0.6] },
      { frame: 2050, position: [0.0, 3.2, 12.0], lookAt: [0.0, 0.5, -0.6] },
      { frame: 2250, position: [0.0, 2.8, 11.2], lookAt: [0.0, 0.4, -0.6] },
    ],
    shake: [
      { at: 522, strength: 0.18, spread: 6 },
      { at: 876, strength: 0.22, spread: 8 },
      { at: 1335, strength: 0.38, spread: 10 },
      { at: 1862, strength: 0.42, spread: 12 },
    ],
    rumbles: [
      { start: 875, end: 920, strength: 0.035 },
      { start: 1860, end: 1890, strength: 0.04 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  subtitles: {
    title: "The Evolution of a Dungeon Trap",
    segments,
    activeColor: "#00eeff",
    textColor: "#ffffff",
    bottomOffset: 240,
  },
  overlays: {
    grade: "saturate(1.08) contrast(1.06)",
    vignette: true,
    fadeInFrames: 10,
    fadeOutFrames: 18,
    backgroundColor: "#0d0e14",
  },
  OverlayComponent: TrapHUD,
};
