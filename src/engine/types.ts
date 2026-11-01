import type React from "react";

export type Vec3 = [number, number, number];

/**
 * A key pose of the camera. Between waypoints the camera follows a monotone
 * cubic: it glides through a waypoint that sits between two moves in the same
 * direction and eases in and out of holds, turnarounds and the ends. Two
 * waypoints on the same frame are a hard cut.
 */
export interface CameraWaypoint {
  frame: number;
  position: Vec3;
  lookAt: Vec3;
  /** Field of view override (crash zooms); defaults to the config fov. */
  fov?: number;
  /** Dutch angle in radians (+ rolls the horizon counter-clockwise). */
  roll?: number;
}

/**
 * An impact: nothing before `at`, a jolt on it (the camera dips and punches
 * in), then a smooth rattle that decays over about `spread` frames.
 */
export interface CameraShakeBurst {
  at: number;
  strength: number;
  spread?: number;
  /** Zoom punch on the hit as a fraction of the fov (default strength * 0.1, max 0.05). 0 disables. */
  punch?: number;
}

export interface CameraRumble {
  start: number;
  end: number;
  strength: number;
}

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
  /** Field of view override (crash zooms); defaults to the config fov. */
  fov?: number;
  /** Dutch angle in radians. */
  roll?: number;
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
  /** "aces" (default series look), "neutral" (truer toy colours in daylight), "agx". */
  toneMapping?: "aces" | "neutral" | "agx";
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
  /** Shadow map type. Default PCF soft; "variance" lets a light's shadow.radius blur wide penumbras (src/lowpoly). */
  shadows?: "soft" | "variance";
}

/** Story beats by name (frame, or list of frames). Exposed for review tooling. */
export type EpisodeBeats = Record<string, number | readonly number[]>;

/** Config problems and played assets (see engine/audit.ts); review prints them. */
export interface EpisodeAuditInfo {
  warnings: string[];
  assets: string[];
  narration?: string;
}

export interface EpisodeDefinition {
  config: EpisodeConfig;
  Scene: React.FC;
  Video: React.FC<{ beats?: EpisodeBeats; audit?: EpisodeAuditInfo }>;
  /** Passed to the composition as defaultProps so `scripts/review.mjs --beats` can find them. */
  beats?: EpisodeBeats;
  /** Passed to the composition as defaultProps so review / audit can print it. */
  audit?: EpisodeAuditInfo;
}
