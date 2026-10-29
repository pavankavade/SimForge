import type { CameraPose, Vec3 } from "../../../../engine/types";
import { arc, clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../../../kit";
import { segmentCues, segmentLength } from "../../timeline";

/**
 * Act I, the Entrance: Ep1's spike pit rebuilt on the kit and re-timed to the
 * campaign narration (lines e1a-e5a, local frames of the "entrance" segment).
 * Same props and set as the short; the Rogue now survives level 1 and goes
 * back for the bait ("She jumps for it"), every corpse stays in the pit, and
 * the catapult floor throws the last party down a floor chute (the Mimic waits
 * in its lair, shown in the next bridge).
 */

export const { w, wEnd, lineStart, lineEnd } = segmentCues("entrance");
export const DURATION = segmentLength("entrance");
export { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../../../kit";

// ---------------------------------------------------------------------------
// Geometry (the DungeonDiorama set and Ep1 props)
// ---------------------------------------------------------------------------
export const Z = -0.6;
export const ENTRY_X = -10.4;
/** Pit opening (the trapdoor covers it) and the spike bed's resting height. */
export const PIT: [number, number] = [-2.35, 2.35];
export const SPIKE_TOPS_Y = -3.55;
export const EDGE_X = PIT[0] - 0.55;
export const PLATE_X = 1.1;
export const CHEST_X = 1.2;
export const RIGHT_LEDGE_X = 3.0;
export const PALADIN_X = -0.9;
/** Where each victim comes to rest on the spikes (spread so every body reads). */
export const LIE_X = { goblin: -1.55, rogue: 1.15, mage: 0.15, paladin: -0.7 } as const;
/** Floor hatch of the disposal chute (where the Mimic sat in the short). */
export const CHUTE_X = 7.0;
export const CHUTE_MOUTH: Vec3 = [CHUTE_X, 0.35, Z];

export const WALK = 0.09;
export const JOG = 0.14;

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Level 1 - spike pit; goblin walks right in
  spikeSpawn: w("e1a", "spike"),
  goblinFall: w("e1a", "in") - 4,
  goblinLand: w("e1a", "in") + 22,
  // Counter: the rogue spots the gap and leaps it, then stays to gloat
  rogueSpots: w("e1b", "spots"),
  rogueLeap: [w("e1b", "leaps") - 2, w("e1b", "leaps") + 24] as const,
  // Level 2 - hinged false floor, bait chest, hidden plate
  trapdoorSpawn: w("e2a", "hinged"),
  plateSpawn: w("e2a", "floor") + 6,
  chestSpawn: w("e2a", "chest"),
  rogueJump: [w("e2a", "jumps"), w("e2a", "lands") + 2] as const,
  plateClick: w("e2a", "plate"),
  trapdoorOpen: w("e2a", "plate") + 4,
  rogueFall: [w("e2a", "plate") + 6, w("e2a", "plate") + 34] as const,
  trapdoorClose: w("e2a", "plate") + 46,
  // Counter: the mage freezes the trapdoor solid
  mageArrive: w("e2b", "arrives") + 8,
  iceCast: w("e2b", "freezes"),
  // Level 3 - copper pipes, oil tank, the ice becomes a frying pan
  flamerSpawn: w("e3a", "copper"),
  mageCross: [w("e3a", "pipes"), w("e3a", "becomes") - 6] as const,
  fireStart: w("e3a", "becomes"),
  mageFall: [w("e3a", "pan"), w("e3a", "pan") + 30] as const,
  trapdoorOpen3: w("e3a", "pan"),
  trapdoorClose3: w("e3a", "pan") + 44,
  // Counter: the paladin shields through the flames
  paladinWalk: [w("e3a", "pan") + 50, w("e3b", "shield") + 2] as const,
  fireEnd: w("e3b", "shield") + 24,
  // Level 4 - pendulum, timed to the spot where a shield-bearer stands
  pendulumSpawn: w("e4a", "pendulum"),
  cockStart: w("e4a", "timed"),
  release: w("e4a", "spot") - 12,
  bladeHit: w("e4a", "spot"),
  trapdoorOpen4: w("e4a", "spot"),
  paladinLand: w("e4a", "spot") + 34,
  trapdoorClose4: w("e4a", "spot") + 52,
  // Level 5 - the party refuses to step; catapult floor; down the chute
  partyEnter: [lineStart("e5a") - 30, w("e5a", "refuses")] as const,
  shieldUp: w("e5a", "single"),
  chamberReveal: w("e5a", "counterweight"),
  catapultBuild: [w("e5a", "catapult"), w("e5a", "entrance")] as const,
  huddle: [w("e5a", "moment"), w("e5a", "plan")] as const,
  chuteInstall: w("e5a", "floor") - 30,
  chuteOpen: w("e5a", "throws") - 6,
  launch: w("e5a", "throws"),
  gulp: w("e5a", "chute"),
  slabReset: w("e5a", "chute") + 12,
} as const;

export const STAGE_STARTS = [lineStart("e1a"), lineStart("e2a"), lineStart("e3a"), lineStart("e4a"), lineStart("e5a")] as const;

/** Walk window that arrives at `x1` on `arrive`, starting at `x0`. */
export const walkWindow = (arrive: number, x0: number, x1: number, speed: number): [number, number] => [
  Math.round(arrive - Math.abs(x1 - x0) / speed),
  arrive,
];
export const GOBLIN_WALK = walkWindow(BEATS.goblinFall, ENTRY_X + 0.6, EDGE_X + 0.75, WALK);
export const ROGUE_RUN = walkWindow(BEATS.rogueSpots - 2, ENTRY_X, EDGE_X, JOG);
export const MAGE_WALK = walkWindow(BEATS.mageArrive, ENTRY_X, EDGE_X, WALK);

// ---------------------------------------------------------------------------
// Trapdoor (one schedule for door and plate)
// ---------------------------------------------------------------------------
export const TRAPDOOR_EVENTS = [
  { frame: BEATS.trapdoorOpen, open: true },
  { frame: BEATS.trapdoorClose, open: false },
  { frame: BEATS.trapdoorOpen3, open: true },
  { frame: BEATS.trapdoorClose3, open: false },
  { frame: BEATS.trapdoorOpen4, open: true },
  { frame: BEATS.trapdoorClose4, open: false },
];

// ---------------------------------------------------------------------------
// Pendulum: ratchets back on "timed", released so it hits on "spot"
// ---------------------------------------------------------------------------
export const PENDULUM_AMPLITUDE = 1.1;
const PENDULUM_OMEGA = 0.16;

export const pendulumAngle = (frame: number) => {
  if (frame < BEATS.cockStart) return 0;
  if (frame < BEATS.release) {
    const t = clamp01((frame - BEATS.cockStart) / (BEATS.release - BEATS.cockStart - 6));
    const notches = 11;
    const stepped = (Math.floor(t * notches) + easeOutCubic((t * notches) % 1)) / notches;
    return -PENDULUM_AMPLITUDE * Math.min(1, stepped);
  }
  // After the paladin it winds down so it never crosses the catapult flight.
  const settle = frame < BEATS.trapdoorClose4 ? 1 : 0.1 + 0.9 * Math.exp(-(frame - BEATS.trapdoorClose4) / 45);
  return -PENDULUM_AMPLITUDE * settle * Math.cos(PENDULUM_OMEGA * (frame - BEATS.release));
};

// ---------------------------------------------------------------------------
// Catapult slab: hinged at its right edge, flips clockwise on launch
// ---------------------------------------------------------------------------
export const SLAB_PIVOT: Vec3 = [-5.385, 0, -0.6];
export const SLAB_LENGTH = 4.33;
const SLAB_MAX_ANGLE = -0.95;
const SLAB_FLIP_FRAMES = 7;

export const slabAngle = (frame: number) => {
  if (frame < BEATS.launch) return 0;
  if (frame < BEATS.slabReset) return SLAB_MAX_ANGLE * easeOutCubic(clamp01((frame - BEATS.launch) / SLAB_FLIP_FRAMES));
  return SLAB_MAX_ANGLE * (1 - easeInOut(clamp01((frame - BEATS.slabReset) / 24)));
};

/** World position of a point riding on the slab (x relative to the pivot). */
export const slabPoint = (localX: number, localY: number, z: number, frame: number): Vec3 => {
  const a = slabAngle(frame);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [SLAB_PIVOT[0] + localX * c - localY * s, SLAB_PIVOT[1] + localX * s + localY * c, z];
};

// ---------------------------------------------------------------------------
// Party: enter, refuse, huddle, launched down the chute
// ---------------------------------------------------------------------------
export type PartyClass = "rogue" | "mage" | "paladin";

export interface PartyMember {
  classType: PartyClass;
  delay: number;
  lineX: number;
  huddle: [number, number];
  huddleFacing: number;
  flightFrames: number;
  apex: number;
}

export const PARTY: PartyMember[] = [
  { classType: "rogue", delay: 0, lineX: -6.6, huddle: [-7.0, -0.35], huddleFacing: -Math.PI / 2 - 0.5, flightFrames: 30, apex: 4.4 },
  { classType: "mage", delay: 8, lineX: -7.6, huddle: [-7.9, -1.0], huddleFacing: 0, flightFrames: 34, apex: 4.9 },
  { classType: "paladin", delay: 16, lineX: -8.6, huddle: [-8.7, -0.3], huddleFacing: Math.PI / 2 + 0.5, flightFrames: 38, apex: 5.3 },
];

export const FLIGHT_START = BEATS.launch + 3;
/** Each lands in the hatch one after the other, the first on "chute". */
export const landFrame = (m: PartyMember) => FLIGHT_START + m.flightFrames;
export const FLIGHT_END = Math.max(...PARTY.map(landFrame));

export interface PartyState {
  position: Vec3;
  phase: "enter" | "line" | "huddle" | "ride" | "flight" | "gone";
  /** 0..1 flight progress. */
  t: number;
}

export const partyState = (m: PartyMember, frame: number): PartyState => {
  const [enterStart, enterEnd] = BEATS.partyEnter;
  const from = enterStart + m.delay;
  const to = enterEnd + m.delay * 0.5;
  const huddleStart = BEATS.huddle[0] + m.delay * 0.5;
  if (frame < to) {
    return { phase: "enter", position: [lerp(ENTRY_X, m.lineX, progress(frame, [from, to])), 0, Z], t: 0 };
  }
  if (frame < huddleStart) return { phase: "line", position: [m.lineX, 0, Z], t: 0 };
  if (frame < BEATS.launch) {
    const t = easeInOut(progress(frame, [huddleStart, huddleStart + 22]));
    return { phase: "huddle", position: [lerp(m.lineX, m.huddle[0], t), 0, lerp(Z, m.huddle[1], t)], t: 0 };
  }
  const localX = m.huddle[0] - SLAB_PIVOT[0];
  if (frame < FLIGHT_START) return { phase: "ride", position: slabPoint(localX, 0, m.huddle[1], frame), t: 0 };
  const u = progress(frame, [FLIGHT_START, landFrame(m)]);
  if (u >= 1) return { phase: "gone", position: CHUTE_MOUTH, t: 1 };
  const p0 = slabPoint(localX, 0, m.huddle[1], FLIGHT_START);
  const lift = m.apex - (p0[1] + CHUTE_MOUTH[1]) / 2;
  return {
    phase: "flight",
    position: [lerp(p0[0], CHUTE_MOUTH[0], u), lerp(p0[1], CHUTE_MOUTH[1], u) + arc(u, lift), lerp(p0[2], CHUTE_MOUTH[2], u)],
    t: u,
  };
};

/** Rides alongside the airborne party. */
export const flightCamera = (frame: number): CameraPose => {
  const pts = PARTY.map((m) => partyState(m, Math.min(frame, FLIGHT_END - 1)).position);
  const c = pts.reduce<Vec3>((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  const y = Math.min(c[1], 3.4);
  return { position: [c[0] - 0.4, y + 0.9, Z + 12], lookAt: [c[0] + 0.6, y + 0.1, Z] };
};
