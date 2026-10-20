import type { EpisodeConfig, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";

const segments: SubtitleSegment[] = [
  {
    startFrame: 12,
    endFrame: 82,
    words: [
      { word: "This", startFrame: 12, endFrame: 22 },
      { word: "is", startFrame: 22, endFrame: 30 },
      { word: "your", startFrame: 30, endFrame: 40 },
      { word: "reusable", startFrame: 40, endFrame: 52 },
      { word: "topic", startFrame: 52, endFrame: 64 },
      { word: "template.", startFrame: 64, endFrame: 82 },
    ],
  },
  {
    startFrame: 92,
    endFrame: 162,
    words: [
      { word: "Swap", startFrame: 92, endFrame: 102 },
      { word: "the", startFrame: 102, endFrame: 110 },
      { word: "scene,", startFrame: 110, endFrame: 122 },
      { word: "camera,", startFrame: 122, endFrame: 136 },
      { word: "and", startFrame: 136, endFrame: 144 },
      { word: "captions.", startFrame: 144, endFrame: 162 },
    ],
  },
  {
    startFrame: 172,
    endFrame: 232,
    words: [
      { word: "Then", startFrame: 172, endFrame: 182 },
      { word: "render", startFrame: 182, endFrame: 194 },
      { word: "a", startFrame: 194, endFrame: 200 },
      { word: "new", startFrame: 200, endFrame: 210 },
      { word: "vertical", startFrame: 210, endFrame: 222 },
      { word: "video.", startFrame: 222, endFrame: 232 },
    ],
  },
];

export const config: EpisodeConfig = {
  id: "StarterTopic",
  title: "Starter Topic",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 240,
  camera: {
    fov: 46,
    near: 0.2,
    far: 300,
    initialPosition: [7, 4.8, 13],
    waypoints: [
      { frame: 0, position: [7, 4.8, 13], lookAt: [0, 1.5, 0] },
      { frame: 120, position: [5.8, 4.4, 12], lookAt: [0, 1.6, 0] },
      { frame: 240, position: [7.2, 4.9, 13.4], lookAt: [0, 1.5, 0] },
    ],
  },
  environment: ENVIRONMENT_PRESETS.sunset,
  subtitles: {
    title: "Starter Topic Template",
    segments,
  },
  overlays: {
    grade: "saturate(1.08) contrast(1.04)",
    vignette: true,
    fadeInFrames: 8,
    fadeOutFrames: 14,
    backgroundColor: "#1f1620",
  },
};
