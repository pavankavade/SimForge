import type { CameraConfig, EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { SEGMENTS, segmentLength, type SegmentId } from "./timeline";
import wordTimestamps from "./data/wordTimestamps.json";

/** Long-form frame: 16:9, fov 40 (frame is ~1.30·d wide, ~0.73·d tall; see kit `WIDE`). */
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

export const GRADE = "saturate(1.18) contrast(1.05) brightness(1.05)";
export const VIGNETTE =
  "linear-gradient(135deg, rgba(255,156,74,0.10) 0%, rgba(255,156,74,0) 38%, rgba(18,31,60,0.18) 100%), radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.26) 100%), linear-gradient(180deg, rgba(4,7,12,0.14) 0%, rgba(4,7,12,0) 18%, rgba(4,7,12,0) 76%, rgba(4,7,12,0.32) 100%)";
export const SUBTITLE_BOTTOM = 70;

/** Subtitle segments re-based to a segment's local frames (review compositions only). */
const localSubtitles = (id: SegmentId): SubtitleSegment[] => {
  const { start, end } = SEGMENTS[id];
  return (wordTimestamps as SubtitleSegment[])
    .filter((s) => s.endFrame > start && s.startFrame < end)
    .map((s) => ({
      ...s,
      startFrame: s.startFrame - start,
      endFrame: s.endFrame - start,
      words: s.words.map((x) => ({ ...x, startFrame: x.startFrame - start, endFrame: x.endFrame - start })),
    }));
};

/**
 * The config every campaign segment shares. Frames in `camera` and `sfx` are
 * local to the segment. The campaign plays narration, score, subtitles and the
 * HUD once at the top level; a segment's own review composition shows its
 * subtitles so stills can be checked against the words.
 */
export const segmentConfig = (id: SegmentId, title: string, camera: CameraConfig, sfx: SfxCue[]): EpisodeConfig => ({
  id: `Campaign${id.charAt(0).toUpperCase()}${id.slice(1)}`,
  title,
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  durationInFrames: segmentLength(id),
  camera: { fov: 40, near: 0.2, far: 350, ...camera },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  sfx,
  subtitles: {
    segments: localSubtitles(id),
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: SUBTITLE_BOTTOM,
  },
  overlays: {
    grade: GRADE,
    vignette: VIGNETTE,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    backgroundColor: "#20232d",
  },
});
