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

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  initialPosition: Vec3;
  waypoints: CameraWaypoint[];
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

export interface SubtitleConfig {
  title?: string;
  segments: SubtitleSegment[];
  bottomOffset?: number;
  activeColor?: string;
  textColor?: string;
  fontFamily?: string;
}

export interface OverlayConfig {
  grade?: string;
  vignette?: boolean | string;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  backgroundColor?: string;
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
  subtitles?: SubtitleConfig;
  overlays?: OverlayConfig;
  OverlayComponent?: React.FC;
}

export interface EpisodeDefinition {
  config: EpisodeConfig;
  Scene: React.FC;
  Video: React.FC;
}
