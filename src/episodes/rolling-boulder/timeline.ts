import type { CameraPose, Vec3 } from "../../engine/types";

/**
 * Episode 2: The Rolling Boulder Hallway Evolution
 * Shared timeline constants, frame beats, and kinematic math.
 */

export const DURATION = 2480;

export const SLOPE_ANGLE = 0.242; // ~13.86 degrees
export const TAN_SLOPE = Math.tan(SLOPE_ANGLE);

/** Compute floor Y coordinate along the corridor at any X */
export const yFloor = (x: number): number => 1.5 + x * TAN_SLOPE;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

export const BEATS = {
  // Stage 1: Tripwire Boulder
  goblinEnter: [40, 140],
  goblinTrip: 145,
  boulderRoll1: 155,
  goblinSquash: 192,
  goblinSink: 310,
  rogue1Run: [250, 310],
  rogue1Spot: 315,
  boulderRoll1b: 330,
  rogue1Leap: [340, 375],
  rogue1Exit: [385, 435],

  // Stage 2: Wide Boulder + Slime Slick
  wideBoulderSpawn: 410,
  slimeSpawn: 535,
  rogue2Run: [565, 615],
  rogue2Leap: [615, 638],
  rogue2Slip: [640, 670],
  boulderRoll2: 635,
  rogue2Squash: 662,
  rogue2Sink: 780,
  paladinEnter: [725, 785],
  paladinBrace: 795,
  boulderRoll2b: 795,
  paladinSmash: 840,
  shatterDebris: [840, 930],

  // Stage 3: Magnetic Spiked Iron Core
  spikeSpawn: 940,
  magnetReveal: 1010,
  paladinStep: [1080, 1140],
  magnetActive: 1155,
  ironBoulderRoll3: 1160,
  paladinMagnetDrag: [1165, 1205],
  paladinSpikeHit: 1205,
  paladinSink3: 1300,
  mageEnter: [1260, 1295],
  mageLevitate: 1303,
  partyFloatUp: [1310, 1345],
  ironBoulderRoll3b: 1335,
  partyFloating: [1345, 1470],

  // Stage 4: Hydraulic Ceiling Crushers
  pistonsReveal: 1470,
  pistonSlam: 1625,
  mageSwatted: [1627, 1648],
  mageSprawl: 1648,
  mageSink4: 1780,

  // Stage 5: Halfpipe Ramp + Gelatinous Cube
  cubeTrapReveal: 1800,
  partyFleeLeft: [1790, 1925],
  doorSlam: 1932,
  rampDeploy: 2020,
  boulderRollFinal: 2095,
  partyAtRamp: 2135,
  launchStart: 2155,
  launchMid: 2185,
  cubeSplash: 2210,
  cubeWobble: [2210, 2480],
  skeletonsFloat: 2240,
  stamp: 2430,
} as const;

/**
 * Parabolic flight trajectory for actors launched off the half-pipe ramp
 * Ramp launches from x = -7.4 upward in an arc landing into the cube at x = 4.2, y = 7.0
 */
export const launchTrajectory = (
  frame: number,
  startFrame: number = BEATS.launchStart,
  landFrame: number = BEATS.cubeSplash,
  offsetZ: number = 0
): { position: Vec3; rotation: Vec3 } => {
  const t = clamp01((frame - startFrame) / (landFrame - startFrame));
  const easeT = easeInOut(t);

  const startX = -7.4;
  const startY = yFloor(startX) + 0.8;
  const targetX = 4.0;
  const targetY = yFloor(targetX) + 4.2;

  // Arc height peaks high above the rafters
  const arcPeak = 6.2 * Math.sin(Math.PI * t);

  const x = lerp(startX, targetX, t);
  const y = lerp(startY, targetY, easeT) + arcPeak;
  const z = -0.6 + offsetZ + Math.sin(t * Math.PI) * 0.4;

  // Tumbling roll during launch flight
  const tumbleRot = t * Math.PI * 4;

  return {
    position: [x, y, z],
    rotation: [0.2 * Math.sin(tumbleRot), 0.4, tumbleRot],
  };
};

/**
 * Camera flight tracker following the party as they fly through the air into the Gelatinous Cube
 */
export const launchCameraTrack = (frame: number): CameraPose => {
  const traj = launchTrajectory(frame);
  return {
    position: [traj.position[0] - 2.5, traj.position[1] + 1.2, 9.5],
    lookAt: [traj.position[0] + 0.8, traj.position[1], -0.6],
  };
};
