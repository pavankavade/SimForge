import type React from "react";

export type Vec3 = [number, number, number];

export interface CameraWaypoint {
  frame: number;
  position: Vec3;
  lookAt: Vec3;
}

export interface CameraShakeBurst {
  at: number;
  strength: number;
  spread?: number;
}

export interface CameraRumble {
  start: number;
  end: number;
  strength: number;
}

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
}

/**
 * Procedural camera move (e.g. following a projectile). Between `start` and
 * `end` the waypoint pose is blended toward `fn(frame)`, easing in and out
 * over `blend` frames.
 */
export interface CameraTrack {
  start: number;
  end: number;
  blend?: number;
  fn: (frame: number) => CameraPose;
}

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  initialPosition: Vec3;
  waypoints: CameraWaypoint[];
  tracks?: CameraTrack[];
  shake?: CameraShakeBurst[];
  rumbles?: CameraRumble[];
}

export interface GroundTextureConfig {
  base: string;
  patchA: string;
  patchB: string;
  crack: string;
  repeat: [number, number];
  patches?: number;
  cracks?: number;
}

export interface HillDefinition {
  position: Vec3;
  scale: Vec3;
  color: string;
}

export interface CloudDefinition {
  position: Vec3;
  size: number;
  opacity: number;
}

export interface EnvironmentConfig {
  sky: {
    top: string;
    mid: string;
    bottom: string;
  };
  fog?: {
    color: string;
    near: number;
    far: number;
  };
  ground: {
    color: string;
    texture?: GroundTextureConfig | null;
    hidden?: boolean;
  };
  hills: HillDefinition[];
  clouds: CloudDefinition[];
  lights: {
    key: {
      position: Vec3;
      intensity: number;
      color: string;
    };
    fill: {
      position: Vec3;
      intensity: number;
      color: string;
    };
    rim: {
      position: Vec3;
      intensity: number;
      color: string;
    };
    ambient: {
      intensity: number;
      color: string;
    };
    shadows?: boolean;
  };
}

export interface SubtitleWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleSegment {
  startFrame: number;
  endFrame: number;
  text?: string;
  words: SubtitleWord[];
}

export interface AudioConfig {
  src: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}

export interface SfxCue {
  src: string;
  frame: number;
  volume?: number;
  /** Trim the clip (frames). Defaults to the full file. */
  durationInFrames?: number;
  /** Fade-out at the end of a trimmed clip (frames). */
  fadeOutFrames?: number;
  /** Repeat the clip until durationInFrames (beds shorter than their cue). */
  loop?: boolean;
}

export interface SubtitleConfig {
  title?: string;
  segments: SubtitleSegment[];
  bottomOffset?: number;
  activeColor?: string;
  textColor?: string;
  fontFamily?: string;
  /** "chunks" (default): 4-5 word lines at the bottom. "word": one big word at a time. */
  mode?: "chunks" | "word";
  /** Word mode: distance of the word's centre from the top of the frame (px). */
  wordTop?: number;
}

export interface PostFXConfig {
  enabled?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  aoIntensity?: number;
  aoRadius?: number;
  exposure?: number;
  grain?: number;
}

export interface OverlayConfig {
  grade?: string;
  vignette?: boolean | string;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  backgroundColor?: string;
  postfx?: PostFXConfig;
}

export interface EpisodeConfig {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  camera: CameraConfig;
  environment?: EnvironmentConfig;
  audio?: AudioConfig;
  music?: AudioConfig;
  sfx?: SfxCue[];
  subtitles?: SubtitleConfig;
  overlays?: OverlayConfig;
  OverlayComponent?: React.FC;
}

/**
 * A production whose picture is pre-rendered footage (e.g. a Blender image
 * sequence encoded to mp4) instead of a live three.js scene. Audio, SFX,
 * subtitles and the HUD work exactly like an EpisodeConfig.
 */
export interface FootageConfig extends Omit<EpisodeConfig, "camera" | "environment"> {
  footage: {
    src: string;
    /** Last frame present in the file; later frames hold on it. */
    lastFrame: number;
  };
}

/** Story beats by name (frame, or list of frames). Exposed for review tooling. */
export type EpisodeBeats = Record<string, number | readonly number[]>;

export interface EpisodeDefinition {
  config: EpisodeConfig;
  Scene: React.FC;
  Video: React.FC<{ beats?: EpisodeBeats }>;
  /** Passed to the composition as defaultProps so `scripts/review.mjs --beats` can find them. */
  beats?: EpisodeBeats;
}
