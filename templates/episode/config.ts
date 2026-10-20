import type { EpisodeConfig, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import wordTimestamps from "./data/wordTimestamps.json";

export const config: EpisodeConfig = {
  id: "__COMPOSITION_ID__",
  title: "__TITLE__",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 300,
  camera: {
    fov: 46,
    near: 0.2,
    far: 300,
    initialPosition: [7, 4.8, 13],
    waypoints: [
      { frame: 0, position: [7, 4.8, 13], lookAt: [0, 1.5, 0] },
      { frame: 150, position: [5.8, 4.4, 12], lookAt: [0, 1.6, 0] },
      { frame: 300, position: [7.2, 4.9, 13.4], lookAt: [0, 1.5, 0] },
    ],
  },
  environment: ENVIRONMENT_PRESETS.sunset,
  subtitles: {
    title: "__TITLE__",
    segments: wordTimestamps as SubtitleSegment[],
  },
  overlays: {
    grade: "saturate(1.06) contrast(1.03)",
    vignette: true,
    fadeInFrames: 8,
    fadeOutFrames: 14,
    backgroundColor: "#1f1620",
  },
};
