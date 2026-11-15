import type React from "react";
import { interpolate, Easing } from "remotion";
import { PaladinActor } from "../artifacts/characters/paladin/PaladinActor";
import { DioramaHall } from "../artifacts/sets";
import { EpisodeVideo } from "../engine/EpisodeVideo";
import { ENVIRONMENT_PRESETS } from "../engine/presets";
import type { CameraWaypoint, EpisodeConfig } from "../engine/types";

/**
 * PaladinShowcase: the realistic, rigged paladin of the dungeon game inside the episode pipeline
 * (the shorts' hall, lighting, grade and post FX). He walks in, turns to camera, runs the
 * three-cut combo and raises his shield. It doubles as the check that <PaladinActor> renders
 * the same in Remotion as in the game; copy its use of PaladinActor into any episode Scene.
 */

export const SHOWCASE_DURATION = 240;
const Z = -0.6;
const WALK: [number, number] = [0, 92];
const TURN: [number, number] = [92, 108];
const SWINGS = [116, 125, 134];
const BLOCK: [number, number] = [176, 214];

const walkX = (f: number) =>
  interpolate(f, WALK, [-3.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const facing = (f: number) =>
  interpolate(f, TURN, [Math.PI / 2, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

const ShowcaseScene: React.FC = () => (
  <>
    <DioramaHall exit="none" />
    <PaladinActor
      position={(f) => [walkX(f), 0, Z]}
      yaw={facing}
      swings={SWINGS}
      act={(f) => ({ block: f >= BLOCK[0] && f < BLOCK[1] })}
    />
  </>
);

const waypoints: CameraWaypoint[] = [
  { frame: 0, position: [-2.4, 1.45, 4.6], lookAt: [-2.2, 1.0, Z] },
  { frame: WALK[1], position: [-0.2, 1.4, 4.2], lookAt: [0, 1.05, Z] },
  { frame: SWINGS[0], position: [0.5, 1.35, 3.2], lookAt: [0, 1.1, Z] },
  { frame: SHOWCASE_DURATION, position: [0.9, 1.3, 2.9], lookAt: [0, 1.15, Z] },
];

const config: EpisodeConfig = {
  id: "PaladinShowcase",
  title: "Paladin Showcase",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: SHOWCASE_DURATION,
  camera: { fov: 40, near: 0.1, far: 120, initialPosition: waypoints[0].position, waypoints },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  overlays: { fadeInFrames: 8, fadeOutFrames: 10, backgroundColor: "#20232d" },
};

export const PaladinShowcase: React.FC = () => <EpisodeVideo config={config} Scene={ShowcaseScene} />;
