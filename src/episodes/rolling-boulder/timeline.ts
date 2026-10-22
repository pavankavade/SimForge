import type { CameraPose, Vec3 } from "../../engine/types";
import cues from "./data/narrationCues.json";

/**
 * Beat frames and motion math shared by the Scene (what moves) and the config
 * (camera tracks, SFX cues). Every beat is derived from the voiced narration
 * (narrationCues.json, written by scripts/boulder-audio.py), so re-voicing a
 * line moves the action with it.
 */

type CueWord = { word: string; startFrame: number; endFrame: number };
type LineId = keyof typeof cues.lines;

const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");

/** Start frame of the nth occurrence of `word` in a narration line. */
export const w = (lineId: LineId, word: string, nth = 0): number => {
  const words = cues.lines[lineId].words as CueWord[];
  const hit = words.filter((x) => bare(x.word) === bare(word))[nth];
  if (!hit) throw new Error(`Missing narration cue ${lineId}:${word}#${nth}`);
  return hit.startFrame;
};
export const lineStart = (lineId: LineId) => cues.lines[lineId].startFrame;

export const DURATION = cues.durationFrames + 10;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const progress = (frame: number, [a, b]: readonly [number, number]) =>
  clamp01((frame - a) / (b - a));
export const easeInOut = (t: number) => t * t * (3 - 2 * t);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInCubic = (t: number) => t * t * t;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
export const Z = -0.6;
/** Release ledge (right) and its 45° ramp down to the floor. */
export const EDGE_X = 8.8;
export const LEDGE_Y = 2.4;
export const FOOT_X = EDGE_X - LEDGE_Y;
export const GATE_GAP = 0.12;
export const WIRE_X = 2.2;
export const SLIME_RANGE: [number, number] = [-0.5, 1.5];
export const SLIME_SPOUT_X = 0.5;
export const MAGNET_X = 3.2;
/** Half-pipe: quarter circle that turns the left floor into a wall. */
export const PIPE_CENTER: [number, number] = [-7.0, 2.6];
export const PIPE_R = 2.6;
export const PIPE_WALL_X = PIPE_CENTER[0] - PIPE_R;
export const DOOR_X = -9.85;
export const CEILING_Y = 5.9;
export const CUBE_CENTER: Vec3 = [-8.2, 4.35, -0.6];
export const CUBE_SIZE: Vec3 = [3.4, 3.0, 2.8];
export const CRUSHER_XS = [-2.2, -0.8];

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Level 1 – tripwire boulder
  wireSet: w("l1a", "tripwire") + 2,
  goblinTrip: w("l1a", "into") - 4,
  goblinHit: w("l1a", "flattened") + 3,
  rogue1Snap: w("l1b", "snap") + 8,
  rogue1Leap: [w("l1b", "leap") - 3, w("l1b", "leap") + 21] as const,
  // Level 2 – hall-wide drum + slime
  slimePour: [w("l2a", "pour"), w("l2a", "pour") + 40] as const,
  rogue2Snap: w("l2a", "off") + 4,
  rogue2Slip: w("l2b", "slips"),
  rogue2Hit: w("l2b", "path") - 8,
  paladinStomp: w("l2c", "braces") - 5,
  paladinBrace: w("l2c", "braces"),
  smash: w("l2c", "shatters") + 2,
  slimeGone: lineStart("l3a") - 8,
  // Level 3 – spiked iron + electromagnet
  magnetInstall: w("l3a", "electromagnet"),
  paladin3Brace: w("l3b", "braces"),
  yank: w("l3b", "yanks"),
  skewer: w("l3b", "spikes") - 6,
  cast: w("l3c", "casts"),
  levitate: w("l3c", "levitate"),
  float: [w("l3c", "floats"), w("l3c", "rafters") + 6] as const,
  underneath: w("l3c", "underneath"),
  // Level 4 – ceiling crushers
  crusherInstall: w("l4a", "crushers") - 8,
  gearsStart: w("l4a", "timed"),
  swat: w("l4b", "swatted"),
  hitRogue4: w("l4b", "into") + 4,
  hitMage4: w("l4b", "path") - 1,
  // Level 5 – blast door, half-pipe, gelatinous cube
  turn: w("l5a", "turn"),
  run: w("l5a", "run"),
  doorDrop: w("l5a", "seal"),
  doorSlam: w("l5a", "seal") + 15,
  curve: [w("l5a", "curve"), w("l5a", "half-pipe") + 4] as const,
  cubeSpawn: w("l5a", "half-pipe") + 5,
  chase: w("l5b", "chases"),
  launch: w("l5b", "launches"),
  dissolve: w("l5b", "cube"),
  stamp: w("l5c", "unbeatable"),
} as const;

export const STAGE_STARTS = [
  84,
  lineStart("l2a"),
  lineStart("l3a"),
  lineStart("l4a"),
  lineStart("l5a"),
] as const;

// ---------------------------------------------------------------------------
// Boulder kinematics
// ---------------------------------------------------------------------------
export type BoulderKind = "stone" | "drum" | "spiked";
export type BoulderMode = "exit" | "pipe" | "shatter";

/** Centre x where the ramp offset line meets the floor offset line. */
const kneeX = (r: number) => FOOT_X + r - r * Math.SQRT2;

export const restPosition = (r: number): [number, number] => [EDGE_X + r + GATE_GAP, LEDGE_Y + r];

/** Centre of a boulder of radius r after travelling s along its path. */
export const pathPoint = (s: number, r: number, mode: BoulderMode): [number, number] => {
  const [rx, ry] = restPosition(r);
  const ledge = r + GATE_GAP;
  if (s <= ledge) return [rx - s, ry];
  const arc = (r * Math.PI) / 4;
  if (s <= ledge + arc) {
    const a = Math.PI / 2 + (s - ledge) / r;
    return [EDGE_X + r * Math.cos(a), LEDGE_Y + r * Math.sin(a)];
  }
  const c1: [number, number] = [EDGE_X - r * Math.SQRT1_2, LEDGE_Y + r * Math.SQRT1_2];
  const k: [number, number] = [kneeX(r), r];
  const rampLen = Math.SQRT2 * (c1[0] - k[0]);
  const s1 = ledge + arc + rampLen;
  if (s <= s1) {
    const u = (s - ledge - arc) / Math.SQRT2;
    return [c1[0] - u, c1[1] - u];
  }
  const floorX = k[0] - (s - s1);
  if (mode !== "pipe" || floorX >= PIPE_CENTER[0]) return [floorX, r];
  const into = PIPE_CENTER[0] - floorX;
  const rr = PIPE_R - r;
  const arcLen = (rr * Math.PI) / 2;
  if (into <= arcLen) {
    const phi = into / rr;
    return [PIPE_CENTER[0] - rr * Math.sin(phi), PIPE_CENTER[1] - rr * Math.cos(phi)];
  }
  return [PIPE_CENTER[0] - rr, PIPE_CENTER[1] + (into - arcLen)];
};

/** Path length from the resting spot to the foot of the ramp. */
export const totalRamp = (r: number) => {
  const c1x = EDGE_X - r * Math.SQRT1_2;
  return r + GATE_GAP + (r * Math.PI) / 4 + Math.SQRT2 * (c1x - kneeX(r));
};

/**
 * Release frame -> impact frame solver. The boulder accelerates down the ramp
 * in t1 frames, then rolls on at v = 2·L1/t1. Returns t1 so the centre reaches
 * `hitX` exactly at `impact`.
 */
const solveT1 = (r: number, release: number, impact: number, hitX: number) => {
  const l1 = totalRamp(r);
  const d = kneeX(r) - hitX;
  return (impact - release) / (1 + d / (2 * l1));
};

export interface BoulderSpec {
  id: string;
  kind: BoulderKind;
  r: number;
  spawn: number;
  release: number;
  t1: number;
  mode: BoulderMode;
  /** Frame it stops existing (shatter frame, or launched into the cube). */
  end?: number;
}

const spec = (
  id: string,
  kind: BoulderKind,
  r: number,
  spawn: number,
  release: number,
  impact: number,
  hitX: number,
  mode: BoulderMode = "exit",
  end?: number
): BoulderSpec => ({ id, kind, r, spawn, release, t1: solveT1(r, release, impact, hitX), mode, end });

export const R_STONE = 1.0;
export const R_DRUM = 1.35;
export const R_SPIKED = 1.12;
export const R_FINALE = 0.85;

// Victim x positions at their impact frames (shared with the Scene).
export const GOBLIN_HIT_X = WIRE_X + 0.25;
export const ROGUE1_LEAP_X: [number, number] = [0.7, 1.9];
export const ROGUE2_LIE_X = -0.45;
export const PALADIN_X = 1.95;
export const PALADIN_YANK_X = MAGNET_X + 0.1;
export const FLOAT_X = { mage: -2.2, rogue: -0.8 };

export const BOULDERS: BoulderSpec[] = [
  spec("b1", "stone", R_STONE, w("l1a", "boulder"), BEATS.goblinTrip + 2, BEATS.goblinHit, GOBLIN_HIT_X + 0.65),
  spec("b2", "stone", R_STONE, lineStart("l1b") - 10, BEATS.rogue1Snap + 2, BEATS.rogue1Leap[0] + 12, 1.3),
  spec("d1", "drum", R_DRUM, w("l2a", "boulder"), BEATS.rogue2Snap + 2, BEATS.rogue2Hit, ROGUE2_LIE_X + 0.95),
  spec("d2", "drum", R_DRUM, BEATS.rogue2Hit + 30, BEATS.paladinStomp + 2, BEATS.smash, PALADIN_X + 0.85 + R_DRUM, "shatter", BEATS.smash),
  spec("s1", "spiked", R_SPIKED, w("l3a", "iron"), BEATS.yank - 1, BEATS.skewer, PALADIN_YANK_X + 0.95),
  spec("s2", "spiked", R_SPIKED, BEATS.skewer + 30, BEATS.underneath - 57, BEATS.underneath, -1.5),
  spec("b3", "stone", R_STONE, w("l4a", "boulder"), BEATS.swat + 3, BEATS.hitRogue4, FLOAT_X.rogue + 0.7),
  spec("b4", "stone", R_FINALE, lineStart("l5a") - 12, BEATS.chase - 30, BEATS.launch - 10, PIPE_CENTER[0], "pipe"),
];
export const boulderById = (id: string) => {
  const b = BOULDERS.find((x) => x.id === id);
  if (!b) throw new Error(`boulder ${id}`);
  return b;
};

/** Distance travelled along the path, frames after release. */
export const rollS = (b: BoulderSpec, frame: number) => {
  const t = frame - b.release;
  if (t <= 0) return 0;
  const l1 = totalRamp(b.r);
  if (t < b.t1) return l1 * (t / b.t1) ** 2;
  return l1 + ((2 * l1) / b.t1) * (t - b.t1);
};

/** Frame at which the boulder centre has travelled `s`. */
export const frameAtS = (b: BoulderSpec, s: number) => {
  const l1 = totalRamp(b.r);
  if (s < l1) return b.release + b.t1 * Math.sqrt(s / l1);
  return b.release + b.t1 + ((s - l1) * b.t1) / (2 * l1);
};

/** Frame the boulder centre passes world x on the floor. */
export const frameAtX = (b: BoulderSpec, x: number) =>
  frameAtS(b, totalRamp(b.r) + (kneeX(b.r) - x));

/** Every newcomer walks in through the exit only once the previous boulder has rolled out. */
export const enterAfter = (id: string) => Math.ceil(frameAtX(boulderById(id), -12.6));

/** Level 1 rogue sprints in from the exit to just short of the wire. */
export const ROGUE_ENTER: [number, number] = [enterAfter("b1"), w("l1b", "rogue")];
export const ROGUE_SNAP_X = WIRE_X - 0.45;
export const rogueEntryX = (frame: number) =>
  lerp(-10.6, ROGUE_SNAP_X, 1 - (1 - progress(frame, ROGUE_ENTER)) ** 2);

/** Frame the boulder reaches the foot of the ramp (floor impact rumble). */
export const footFrame = (b: BoulderSpec) => b.release + b.t1;

export interface BoulderState {
  visible: boolean;
  position: Vec3;
  /** Roll angle about +z (CCW while moving left). */
  angle: number;
  /** 0..1 spawn drop progress. */
  spawn: number;
}

/** Launch: B4 leaves the half-pipe lip and sinks slowly into the jelly. */
export const PIPE_LIP_FRAME = (() => {
  const b = BOULDERS[BOULDERS.length - 1];
  const rr = PIPE_R - b.r;
  return frameAtS(b, totalRamp(b.r) + (kneeX(b.r) - PIPE_CENTER[0]) + (rr * Math.PI) / 2);
})();
const FINALE_REST_Y = CUBE_CENTER[1] - 0.05;
const FINALE_RISE_FRAMES = 34;

export const boulderState = (b: BoulderSpec, frame: number): BoulderState => {
  const [rx, ry] = restPosition(b.r);
  const hidden: BoulderState = { visible: false, position: [rx, ry, Z], angle: 0, spawn: 0 };
  if (frame < b.spawn) return hidden;
  if (b.end !== undefined && frame >= b.end) return hidden;
  const spawn = clamp01((frame - b.spawn) / 14);
  if (frame < b.release) {
    // Dropped down the chute onto the ledge with a little bounce.
    const fall = spawn < 0.7 ? (1 - (spawn / 0.7) ** 2) * 4.2 : 0.18 * Math.sin(((spawn - 0.7) / 0.3) * Math.PI);
    return { visible: true, position: [rx, ry + fall, Z], angle: 0, spawn };
  }
  if (b.mode === "pipe" && frame >= PIPE_LIP_FRAME) {
    const x = PIPE_CENTER[0] - (PIPE_R - b.r);
    const u = easeOutCubic(clamp01((frame - PIPE_LIP_FRAME) / FINALE_RISE_FRAMES));
    const sLip = rollS(b, PIPE_LIP_FRAME);
    const wobble = frame > PIPE_LIP_FRAME + FINALE_RISE_FRAMES ? 0.04 * Math.sin((frame - PIPE_LIP_FRAME) * 0.12) : 0;
    return {
      visible: true,
      position: [x, lerp(PIPE_CENTER[1], FINALE_REST_Y, u) + wobble, Z],
      angle: sLip / b.r + u * 2.2,
      spawn: 1,
    };
  }
  const s = rollS(b, frame);
  const [x, y] = pathPoint(s, b.r, b.mode);
  if (x < -13.5) return hidden;
  return { visible: true, position: [x, y, Z], angle: s / b.r, spawn: 1 };
};

// ---------------------------------------------------------------------------
// Gate + tripwire
// ---------------------------------------------------------------------------
/** Gate is up while a boulder waits on the ledge, down once it is released. */
export const gateOpenAmount = (frame: number) => {
  let at = -Infinity;
  let opening = false;
  let everOpened = false;
  for (const b of BOULDERS) {
    if (frame >= b.spawn && b.spawn > at) {
      at = b.spawn;
      opening = false;
    }
    if (frame >= b.release && b.release > at) {
      at = b.release;
      opening = true;
      everOpened = true;
    }
  }
  if (!everOpened) return 0;
  const t = clamp01((frame - at) / (opening ? 5 : 10));
  return opening ? t : 1 - t;
};

/** Each entry: wire strung at `set`, cut/tripped at `cut`. */
export const WIRE_EVENTS = [
  { set: BEATS.wireSet, cut: BEATS.goblinTrip },
  { set: boulderById("b2").spawn + 8, cut: BEATS.rogue1Snap },
  { set: w("l2a", "boulder") + 20, cut: BEATS.rogue2Snap },
  { set: boulderById("d2").spawn + 10, cut: BEATS.paladinStomp },
];
export const WIRE_RETIRE = lineStart("l3a") - 2;

// ---------------------------------------------------------------------------
// Level 5 party: flee, bonk, half-pipe scramble, launch into the cube.
// ---------------------------------------------------------------------------
export type PartyClass = "rogue" | "mage" | "paladin";

export interface PartyMember {
  classType: PartyClass;
  /** Walk-in delay and final x when they stop and stare at the boulder. */
  delay: number;
  stareX: number;
  /** Where they cower once the door has slammed. */
  cowerX: number;
  /** Highest angle reached scrambling up the pipe wall. */
  climbPhi: number;
  /** Pushed ahead of the boulder by this extra angle. */
  lead: number;
  target: Vec3;
  flightFrames: number;
  z: number;
}

export const PARTY: PartyMember[] = [
  { classType: "rogue", delay: 0, stareX: -2.4, cowerX: -4.6, climbPhi: 1.05, lead: 0.62, target: [-8.95, 4.75, -1.1], flightFrames: 50, z: -0.9 },
  { classType: "mage", delay: 10, stareX: -3.4, cowerX: -5.4, climbPhi: 0.78, lead: 0.42, target: [-7.95, 4.15, -0.2], flightFrames: 54, z: -0.5 },
  { classType: "paladin", delay: 20, stareX: -4.4, cowerX: -6.2, climbPhi: 0.48, lead: 0.24, target: [-7.25, 4.85, -1.2], flightFrames: 58, z: -0.2 },
];

/** Party walks in through the exit only once B3 has rolled out past it. */
export const PARTY_ENTER = Math.ceil(frameAtX(boulderById("b3"), -12.6));
const ENTRY_X = -10.6;
export const FLIGHT_START = BEATS.launch;

export type PartyPhase =
  | "enter"
  | "stare"
  | "flee"
  | "bonk"
  | "cower"
  | "look"
  | "scramble"
  | "pinned"
  | "flight"
  | "jelly"
  | "skeleton";

export interface PartyState {
  phase: PartyPhase;
  position: Vec3;
  /** World z roll (half-pipe wall tilt / tumble). */
  tilt: number;
  yaw: number;
  /** 0..1 within the current phase. */
  t: number;
}

const FACE_RIGHT = Math.PI / 2;
const FACE_LEFT = -Math.PI / 2;

/** Feet position on the half-pipe surface at angle phi. */
export const pipeSurface = (phi: number): [number, number] => [
  PIPE_CENTER[0] - PIPE_R * Math.sin(phi),
  PIPE_CENTER[1] - PIPE_R * Math.cos(phi),
];

const finaleBoulder = () => BOULDERS[BOULDERS.length - 1];

/** Angle of the finale boulder centre in the pipe (0 before it arrives). */
export const boulderPhi = (frame: number) => {
  const b = finaleBoulder();
  const into = rollS(b, frame) - (totalRamp(b.r) + (kneeX(b.r) - PIPE_CENTER[0]));
  return into / (PIPE_R - b.r);
};

const slowMo = (u: number) => u + (0.55 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);

export const partyState = (m: PartyMember, frame: number): PartyState => {
  const enterEnd = BEATS.turn - 4 + m.delay * 0.3;
  const runStart = BEATS.run + m.delay * 0.4;
  const doorX = DOOR_X + 0.55;
  const bonkAt = BEATS.doorSlam + 2;
  const fleeEnd = m.classType === "rogue" ? bonkAt : bonkAt + 6 + m.delay * 0.6;
  const fleeTo = m.classType === "rogue" ? doorX : doorX + 1.0 + m.delay * 0.07;
  const cowerStart = bonkAt + 24 + m.delay;
  const cowerEnd = BEATS.curve[0] - 6;
  const lookStart = finaleBoulder().release + 4;
  const scrambleStart = BEATS.chase + 2 + m.delay * 0.3;
  const climbEnd = BEATS.launch - 12;
  const zLane = (t: number) => lerp(Z, m.z, t);

  if (frame < enterEnd) {
    const t = progress(frame, [PARTY_ENTER + m.delay, enterEnd]);
    return { phase: "enter", position: [lerp(ENTRY_X, m.stareX, t), 0, Z], tilt: 0, yaw: FACE_RIGHT, t };
  }
  if (frame < runStart) {
    return { phase: "stare", position: [m.stareX, 0, Z], tilt: 0, yaw: FACE_RIGHT, t: progress(frame, [enterEnd, runStart]) };
  }
  if (frame < fleeEnd) {
    const t = progress(frame, [runStart, fleeEnd]);
    return { phase: "flee", position: [lerp(m.stareX, fleeTo, t), 0, Z], tilt: 0, yaw: FACE_LEFT, t };
  }
  if (frame < cowerStart) {
    const t = progress(frame, [fleeEnd, cowerStart]);
    if (m.classType === "rogue") {
      // Bounces off the door and lands on his back.
      const k = easeOutCubic(Math.min(1, t * 2));
      return {
        phase: "bonk",
        position: [lerp(fleeTo, fleeTo + 1.0, k), 0.5 * Math.sin(Math.PI * Math.min(1, t * 2)), Z],
        tilt: -1.35 * k,
        yaw: FACE_LEFT,
        t,
      };
    }
    return { phase: "bonk", position: [fleeTo, 0, Z], tilt: 0, yaw: FACE_LEFT + 0.6, t };
  }
  if (frame < lookStart) {
    const from = m.classType === "rogue" ? fleeTo + 1.0 : fleeTo;
    const t = progress(frame, [cowerStart, cowerEnd]);
    return {
      phase: "cower",
      position: [lerp(from, m.cowerX, easeInOut(t)), 0, zLane(t)],
      tilt: 0,
      yaw: FACE_LEFT + 0.5,
      t,
    };
  }
  if (frame < scrambleStart) {
    const t = progress(frame, [lookStart, lookStart + 12]);
    return { phase: "look", position: [m.cowerX, 0, m.z], tilt: 0, yaw: lerp(FACE_LEFT + 0.5, FACE_RIGHT - 0.4, easeInOut(t)), t };
  }

  const phiB = boulderPhi(frame);
  const pinnedPhi = Math.min(Math.PI / 2, phiB + m.lead + 0.3);
  if (frame < FLIGHT_START) {
    const t = progress(frame, [scrambleStart, climbEnd]);
    // Run left across the floor, then up the curve.
    const floorRun = m.cowerX - PIPE_CENTER[0];
    const along = Math.min(t * 1.15, 1) * (floorRun + m.climbPhi * PIPE_R);
    const x = m.cowerX - Math.min(along, floorRun);
    let phi = 0;
    if (along > floorRun) {
      // Slips back a little on every scrambling step.
      phi = Math.max(0, (along - floorRun) / PIPE_R - 0.06 * Math.max(0, Math.sin(frame * 0.35)));
    }
    const pinned = phiB + m.lead > phi && phiB > -0.2;
    if (pinned) phi = pinnedPhi;
    if (phi > 0) {
      const [px, py] = pipeSurface(phi);
      return { phase: pinned ? "pinned" : "scramble", position: [px, py, m.z], tilt: -phi, yaw: FACE_LEFT, t };
    }
    return { phase: "scramble", position: [x, 0, m.z], tilt: 0, yaw: FACE_LEFT, t };
  }

  const u = clamp01((frame - FLIGHT_START) / m.flightFrames);
  const [lx, ly] = pipeSurface(Math.PI / 2);
  const from: Vec3 = [lx + 0.3, ly + 0.2, m.z];
  if (u < 1) {
    const s = slowMo(u);
    const c: Vec3 = [from[0] - 0.3, m.target[1] + 1.4, m.z];
    const b = (i: 0 | 1 | 2) => (1 - s) ** 2 * from[i] + 2 * (1 - s) * s * c[i] + s * s * m.target[i];
    return {
      phase: "flight",
      position: [b(0), b(1), b(2)],
      tilt: -Math.PI / 2 - s * Math.PI * (1.6 + m.delay * 0.03),
      yaw: FACE_LEFT + s * 1.2,
      t: u,
    };
  }
  const hang = frame - (FLIGHT_START + m.flightFrames);
  const drift: Vec3 = [
    m.target[0] + 0.05 * Math.sin(hang * 0.05 + m.delay),
    m.target[1] + 0.08 * Math.sin(hang * 0.07 + m.delay) - Math.min(0.25, hang * 0.004),
    m.target[2],
  ];
  const finalTilt = -Math.PI / 2 - Math.PI * (1.6 + m.delay * 0.03);
  return {
    phase: frame >= BEATS.dissolve ? "skeleton" : "jelly",
    position: drift,
    tilt: finalTilt + hang * 0.004,
    yaw: FACE_LEFT + 1.2 + hang * 0.006,
    t: clamp01(hang / 30),
  };
};

export const FLIGHT_END = FLIGHT_START + Math.max(...PARTY.map((m) => m.flightFrames));

// ---------------------------------------------------------------------------
// Camera tracks
// ---------------------------------------------------------------------------
/** Rides alongside a rolling boulder. */
export const boulderCam =
  (id: string, dist = 9.5, lead = -0.8, height = 1.7) =>
  (frame: number): CameraPose => {
    const b = boulderById(id);
    const p = boulderState(b, Math.max(frame, b.release)).position;
    // Stop short of the bright exit and let the boulder roll out of frame.
    const x = Math.max(p[0], -7.6);
    return {
      position: [x + lead, Math.max(1.6, p[1] * 0.6 + height), Z + dist],
      lookAt: [x + lead * 1.3, Math.max(0.9, p[1] * 0.75 + 0.5), Z],
    };
  };

/** Frames the airborne party and the cube. */
export const flightCamera = (frame: number): CameraPose => {
  const pts = PARTY.map((m) => partyState(m, Math.min(frame, FLIGHT_END)).position);
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  return {
    position: [cx + 1.6, cy + 0.3, Z + 11.5],
    lookAt: [cx + 0.9, cy + 0.2, Z],
  };
};
