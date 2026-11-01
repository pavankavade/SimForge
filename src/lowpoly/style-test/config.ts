import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { LOWPOLY_GRADE, LOWPOLY_POSTFX } from "../Lighting";

// Look-development composition for the clean low-poly style (no audio, no story).
// Three held shots, hard cuts between them: the whole house, a 3/4 close on the
// safe room (the reference demo's angle), and the side-on framing episodes use.

const WIDE: [CameraPose, CameraPose] = [
  { position: [4, 10, 33], lookAt: [0, 2.2, -0.6] },
  { position: [3, 9.5, 31], lookAt: [0, 2.2, -0.6] },
];
const CLOSE: [CameraPose, CameraPose] = [
  { position: [1.9, 3.0, 7.4], lookAt: [-0.2, 1.0, -1.2] },
  { position: [1.7, 2.9, 6.8], lookAt: [-0.2, 1.0, -1.2] },
];
const SIDE: [CameraPose, CameraPose] = [
  { position: [-4.2, 2.8, 12.5], lookAt: [-4.2, 1.5, -0.6] },
  { position: [-4.0, 2.7, 11.6], lookAt: [-4.2, 1.5, -0.6] },
];

const SHOT = 60;
const waypoints = ([] as Array<CameraPose & { frame: number }>).concat(
  ...[WIDE, CLOSE, SIDE].map(([a, b], i) => [
    { frame: i * SHOT, ...a },
    { frame: i * SHOT + SHOT - 1, ...b },
  ])
);

export const config: EpisodeConfig = {
  id: "LowPolyStyleTest",
  title: "Low-poly style test",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: SHOT * 3,
  shadows: "variance",
  camera: {
    fov: 40,
    near: 0.1,
    far: 400,
    initialPosition: WIDE[0].position,
    waypoints,
  },
  overlays: {
    grade: LOWPOLY_GRADE,
    vignette: false,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    backgroundColor: "#c3d6e6",
    postfx: LOWPOLY_POSTFX,
  },
};
