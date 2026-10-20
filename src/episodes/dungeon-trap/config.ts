import type { EpisodeConfig, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { TrapHUD } from "./TrapHUD";
import wordTimestamps from "./data/wordTimestamps.json";

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
  audio: {
    src: "episodes/dungeon-trap/narration.mp3",
    volume: 0.9,
    fadeInFrames: 6,
    fadeOutFrames: 15,
  },
  subtitles: {
    title: "The Evolution of a Dungeon Trap",
    segments: wordTimestamps as SubtitleSegment[],
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
