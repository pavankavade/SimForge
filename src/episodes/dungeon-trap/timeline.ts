import type { CameraPose, Vec3 } from "../../engine/types";

/**
 * Beat frames and motion math shared by the Scene (what moves) and the config
 * (camera tracks, SFX cues), so picture and sound stay locked together.
 */

export const DURATION = 2370;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const BEATS = {
  // Stage 1 – spike pit
  spikeSpawn: 50,
  goblinFall: 95,
  goblinLand: 125,
  rogue1Run: [200, 285],
  rogue1Leap: [318, 350],
  rogue1Exit: [380, 440],
  // Stage 2 – false floor, bait and pressure plate
  trapdoorSpawn: 463,
  plateSpawn: 484,
  chestSpawn: 516,
  rogue2Run: [560, 620],
  rogue2Jump: [620, 650],
  plateClick: 672,
  trapdoorOpen: 678,
  rogue2Fall: [680, 712],
  trapdoorClose: 745,
  // Stage 3 – mage, ice bridge and flamers
  iceCast: 890,
  flamerSpawn: 1010,
  fireStart: 1125,
  mageFall: [1145, 1195],
  trapdoorOpen3: 1145,
  trapdoorClose3: 1240,
  fireEnd: 1400,
  // Stage 4 – pendulum
  paladinWalk: [1240, 1400],
  pendulumSpawn: 1455,
  cockStart: 1546,
  release: 1638,
  bladeHit: 1650,
  trapdoorOpen4: 1650,
  paladinLand: 1700,
  trapdoorClose4: 1760,
  // Stage 5 – catapult and mimic
  partyEnter: [1735, 1800],
  shieldUp: 1790,
  chamberReveal: 1850,
  catapultBuild: [1855, 1930],
  mimicSpawn: 1935,
  huddle: [1985, 2058],
  launch: 2085,
  mimicOpen: 2100,
  chomp: 2166,
  burp: 2205,
  helmetLand: 2222,
  pullBack: [2225, 2300],
  finaleFire: [2230, DURATION],
  slabReset: 2230,
  stamp: 2262,
} as const;

// ---------------------------------------------------------------------------
// Pendulum
// ---------------------------------------------------------------------------
export const PENDULUM_AMPLITUDE = 1.1;
const PENDULUM_OMEGA = 0.16;

export const pendulumAngle = (frame: number) => {
  if (frame < BEATS.cockStart) return 0;
  if (frame < BEATS.release) {
    const t = clamp01((frame - BEATS.cockStart) / (BEATS.release - BEATS.cockStart - 6));
    // Ratchets back in small notches instead of a smooth slide.
    const notches = 11;
    const stepped = (Math.floor(t * notches) + easeOutCubic((t * notches) % 1)) / notches;
    return -PENDULUM_AMPLITUDE * Math.min(1, stepped);
  }
  // After the paladin it winds down so it never crosses the catapult flight.
  const settle =
    frame < BEATS.trapdoorClose4
      ? 1
      : 0.1 + 0.9 * Math.exp(-(frame - BEATS.trapdoorClose4) / 45);
  return -PENDULUM_AMPLITUDE * settle * Math.cos(PENDULUM_OMEGA * (frame - BEATS.release));
};

// ---------------------------------------------------------------------------
// Catapult slab: hinged at its right edge, flips clockwise on launch.
// ---------------------------------------------------------------------------
export const SLAB_PIVOT: Vec3 = [-5.385, 0, -0.6];
export const SLAB_LENGTH = 4.33;
export const SLAB_MAX_ANGLE = -0.95;
const SLAB_FLIP_FRAMES = 7;

export const slabAngle = (frame: number) => {
  if (frame < BEATS.launch) return 0;
  if (frame < BEATS.slabReset) {
    return SLAB_MAX_ANGLE * easeOutCubic(clamp01((frame - BEATS.launch) / SLAB_FLIP_FRAMES));
  }
  return SLAB_MAX_ANGLE * (1 - easeInOutCubic(clamp01((frame - BEATS.slabReset) / 24)));
};

/** World position of a point riding on the slab (x relative to the pivot). */
export const slabPoint = (localX: number, localY: number, z: number, frame: number): Vec3 => {
  const a = slabAngle(frame);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    SLAB_PIVOT[0] + localX * c - localY * s,
    SLAB_PIVOT[1] + localX * s + localY * c,
    z,
  ];
};

// ---------------------------------------------------------------------------
// Party: entrance, huddle and catapult flight into the mimic.
// ---------------------------------------------------------------------------
export type PartyClass = "rogue" | "mage" | "paladin";

export interface PartyMember {
  classType: PartyClass;
  enterDelay: number;
  lineX: number;
  huddle: [number, number];
  /** Facing (rotation.y) while huddled. */
  huddleFacing: number;
  flightFrames: number;
  apex: number;
}

export const PARTY: PartyMember[] = [
  {
    classType: "rogue",
    enterDelay: 0,
    lineX: -6.6,
    huddle: [-7.0, -0.35],
    huddleFacing: -Math.PI / 2 - 0.5,
    flightFrames: 66,
    apex: 3.4,
  },
  {
    classType: "mage",
    enterDelay: 14,
    lineX: -7.6,
    huddle: [-7.9, -1.0],
    huddleFacing: 0,
    flightFrames: 70,
    apex: 3.8,
  },
  {
    classType: "paladin",
    enterDelay: 28,
    lineX: -8.6,
    huddle: [-8.7, -0.3],
    huddleFacing: Math.PI / 2 + 0.5,
    flightFrames: 74,
    apex: 4.2,
  },
];

export const MIMIC_POSITION: Vec3 = [7.0, 0, -0.6];
export const MIMIC_MOUTH: Vec3 = [7.0, 1.1, -0.55];
export const FLIGHT_START = BEATS.launch + 3;
const ENTRY_X = -10.4;

/** Slow-motion remap: fast launch, lingering apex, fast arrival. */
const slowMo = (u: number) => u + (0.6 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);

export interface PartyState {
  position: Vec3;
  /** Normalised flight progress, -1 before launch. */
  flight: number;
  visible: boolean;
  phase: "enter" | "line" | "huddle" | "ride" | "flight" | "gone";
  scale: number;
  /** Extra tumble rotation while airborne. */
  spin: Vec3;
}

export const partyState = (member: PartyMember, frame: number): PartyState => {
  const [enterStart, enterEnd] = BEATS.partyEnter;
  const enterFrom = enterStart + member.enterDelay;
  const enterTo = enterEnd - 28 + member.enterDelay;
  const huddleStart = BEATS.huddle[0] + member.enterDelay * 0.5;

  const base = { visible: frame >= enterStart, scale: 1, spin: [0, 0, 0] as Vec3, flight: -1 };

  if (frame < enterTo) {
    const t = clamp01((frame - enterFrom) / (enterTo - enterFrom));
    return {
      ...base,
      phase: "enter",
      position: [lerp(ENTRY_X, member.lineX, t), 0, -0.6],
    };
  }
  if (frame < huddleStart) {
    return { ...base, phase: "line", position: [member.lineX, 0, -0.6] };
  }
  if (frame < BEATS.launch) {
    const t = easeInOutCubic(clamp01((frame - huddleStart) / 22));
    return {
      ...base,
      phase: "huddle",
      position: [lerp(member.lineX, member.huddle[0], t), 0, lerp(-0.6, member.huddle[1], t)],
    };
  }

  const localX = member.huddle[0] - SLAB_PIVOT[0];
  if (frame < FLIGHT_START) {
    return { ...base, phase: "ride", position: slabPoint(localX, 0, member.huddle[1], frame) };
  }

  const u = clamp01((frame - FLIGHT_START) / member.flightFrames);
  if (u >= 1) {
    return { ...base, visible: false, phase: "gone", position: MIMIC_MOUTH, flight: 1 };
  }
  const from = slabPoint(localX, 0, member.huddle[1], FLIGHT_START);
  const s = slowMo(u);
  const lift = member.apex - (from[1] + MIMIC_MOUTH[1]) / 2;
  const position: Vec3 = [
    lerp(from[0], MIMIC_MOUTH[0], s),
    lerp(from[1], MIMIC_MOUTH[1], s) + lift * 4 * s * (1 - s),
    lerp(from[2], MIMIC_MOUTH[2], s) + 1.6 * Math.sin(Math.PI * s),
  ];
  return {
    ...base,
    phase: "flight",
    flight: u,
    position,
    scale: u < 0.86 ? 1 : lerp(1, 0.25, (u - 0.86) / 0.14),
    spin: [Math.sin(s * 9) * 0.4, s * 1.5, -s * Math.PI * 3.2],
  };
};

export const FLIGHT_END = FLIGHT_START + Math.max(...PARTY.map((m) => m.flightFrames));

/** Camera that rides alongside the airborne party. */
export const flightCamera = (frame: number): CameraPose => {
  const points = PARTY.map((m) => partyState(m, Math.min(frame, FLIGHT_END - 1)).position);
  const c = points.reduce<Vec3>(
    (acc, p) => [acc[0] + p[0] / points.length, acc[1] + p[1] / points.length, acc[2] + p[2] / points.length],
    [0, 0, 0]
  );
  return {
    position: [c[0] - 0.4, c[1] + 0.9, c[2] + 11.5],
    lookAt: [c[0] + 0.6, c[1] + 0.1, c[2]],
  };
};
