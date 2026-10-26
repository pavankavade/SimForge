import cues from "./data/narrationCues.json";
import {
  arc,
  bezier,
  clamp,
  createCues,
  easeInCubic,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  lerp,
  progress,
} from "../../kit";
import type { Vec3 } from "../../engine/types";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);

// ---------------------------------------------------------------------------
// Geometry. The hall runs along x and is seen side-on; newcomers enter from
// the daylight exit on the left. The crush room sits in the middle of the hall.
// All room x values are room-relative (add roomDX for world x).
// ---------------------------------------------------------------------------
export const Z = -0.6;
export const ENTRY_X = -10.2;
export const WALK = 0.09;
export const JOG = 0.14;
export const SPRINT = 0.2;

/** "inner" = distance from x = 0 to a wall's inner face. */
export const WALL_OPEN = 1.8;
export const WALL_T = 0.6;
export const WALL_OFF = 6.6;
export const CLOSED_INNER = 0.06;
/** Walls glide this high so they pass over the pancakes. */
export const WALL_BOTTOM = 0.16;
export const WALL_TOP = 3.15;
export const WALL_Z: [number, number] = [Z - 1.1, Z + 0.9];
/** Doorway through the left wall (open to the front), closed by a drop gate while the trap runs. */
export const DOOR_Z: [number, number] = [Z - 0.45, Z + 0.9];
export const DOOR_H = 2.25;

export const SLAB_Y: [number, number] = [3.2, 3.45];
export const SLAB_HALF = WALL_OPEN + WALL_T + 0.2;
export const ROOF_Y = SLAB_Y[1];
export const VENT_HALF = 0.45;
export const CHIMNEY_TOP = 4.05;

export const PEDESTAL = { x: 0, z: Z - 0.5, h: 1.0 } as const;
export const COIN_Y = PEDESTAL.h + 0.14;
export const GRAB_X = -0.5;

export const BEAM_L = 2.2;
export const BEAM_Y = 2.45;
export const PRESS = { x0: 2.5, x1: 4.1, y: 2.75, r: 0.5 } as const;
export const CUBE = { size: 0.6, x: 1.15, z: Z + 1.4 } as const;

export const ORB_R = 0.45;
export const ORB_Y = 1.2;

export const TILE_X = 0.3;
export const LUNGE_DX = -3.6;
export const MIMIC = { x: 1.55, y: ROOF_Y, scale: 0.95 } as const;
/** Top of the mimic's open mouth (room-relative), where the party lands. */
export const MIMIC_MOUTH: Vec3 = [MIMIC.x, MIMIC.y + 0.95, Z + 0.1];
export const PARTY = [
  { cls: "paladin", x: -3.2, z: Z },
  { cls: "mage", x: -4.05, z: Z + 0.3 },
  { cls: "rogue", x: -4.9, z: Z + 0.6 },
] as const;

/** Pancake lanes (room-relative), clear of every later walk line. */
export const LANES = {
  goblin: [0.85, Z - 0.75],
  rogue2: [0.75, Z + 0.6],
  mage2: [-0.95, Z - 0.7],
} as const;
export const PANCAKE_SQUASH = 0.08;
export const HALF = { goblin: 0.33, rogue: 0.36, mage: 0.38, paladin: 0.45 } as const;

// ---------------------------------------------------------------------------
// Beats: every one is a spoken word ± a few frames.
// ---------------------------------------------------------------------------
export const BEATS = {
  // L1 install + victim (l1a)
  wallsIn: w("l1a", "sliding"),
  wallsInEnd: w("l1a", "walls") + 8,
  pedestalUp: w("l1a", "loot"),
  wiresGlow: w("l1a", "pedestal") + 6,
  goblinGrab: w("l1a", "grab"),
  coinUp: w("l1a", "coin"),
  l1Close: w("l1a", "and"),
  doubleTake: w("l1a", "pressed"),
  crush1: w("l1a", "pancake"),
  reopen1: w("l1a", "pancake") + 20,
  // L1 counter (l2a)
  rogue1Grab: w("l2a", "immediately"),
  parkour: w("l2a", "parkour"),
  escape: w("l2a", "escape"),
  ventIn: w("l2a", "through"),
  roof: w("l2a", "vent"),
  // L2 install (l2b)
  reopen2: w("l2b", "replace") - 6,
  platesIn: w("l2b", "replace"),
  grease: w("l2b", "grease-coated"),
  platesInEnd: w("l2b", "steel") + 6,
  chimney: w("l2b", "hide"),
  bootDemo: w("l2b", "boot"),
  hatch: w("l2b", "vent"),
  // L2 victim (l2c)
  rogue2Grab: w("l2c", "even") - 4,
  climb2: w("l2c", "climbs"),
  atVent2: w("l2c", "ceiling"),
  punt: w("l2c", "punts"),
  land2: w("l2c", "punts") + 10,
  slam3: w("l2c", "floor"),
  reopen3: w("l2c", "floor") + 20,
  // L2 counter (l3a)
  paladinArrive: w("l3a", "climb"),
  creep3: w("l3a", "climb") + 6,
  wedge: w("l3a", "wedges"),
  stall: w("l3a", "walls"),
  smug: w("l3a", "smugly"),
  // L3 install (l3b)
  pressL: w("l3b", "twin"),
  pressR: w("l3b", "five-hundred-ton"),
  hiss: w("l3b", "hydraulic"),
  electrify: w("l3b", "electrify"),
  // L3 victim (l3c)
  sparkL: w("l3c", "both"),
  sparkR: w("l3c", "sides"),
  arc1: w("l3c", "completes"),
  arc2: w("l3c", "circuit"),
  roast: w("l3c", "roasting"),
  roastEnd: w("l3c", "before"),
  fold: w("l3c", "folding"),
  cubeReopen: w("l3c", "cube") - 12,
  cube: w("l3c", "cube"),
  // L3 counter (l4a)
  mage1Grab: w("l4a", "simply"),
  cast: w("l4a", "cast"),
  blink: w("l4a", "blink"),
  close4End: w("l4a", "wall") - 6,
  // L4 install (l4b)
  reopen4: w("l4b", "so"),
  mirror1: w("l4b", "line"),
  // L4 victim (l4c)
  mage2Grab: w("l4c", "moment"),
  teleport: w("l4c", "teleports"),
  pop: w("l4c", "bounce"),
  reopen5: w("l4c", "bounce") + 20,
  // L4 counter (l5a)
  partyArrive: w("l5a", "outside"),
  poke: w("l5a", "poking"),
  // L5 install + victims (l5b)
  rails: w("l5b", "mount"),
  wheels: w("l5b", "high-speed"),
  booster: w("l5b", "rails"),
  stickIn: w("l5b", "stick"),
  trigger: w("l5b", "touches"),
  lunge: w("l5b", "lunges"),
  portcullis: w("l5b", "swallows"),
  blast: w("l5b", "blasts"),
  launch: w("l5b", "them", 1),
  mimicOpen: w("l5b", "straight") - 4,
  arrive: w("l5b", "into", 1),
  chomp: w("l5b", "mimic"),
  burp: w("end", "congratulations") + 20,
  stamp: w("end", "unbeatable"),
} as const;

export const MIRROR_POPS = [w("l4b", "line"), w("l4b", "room"), w("l4b", "arcane"), w("l4b", "deflection"), w("l4b", "mirrors")];

/** Stage badges pop on the install lines. */
export const STAGE_STARTS = [
  Math.max(84, lineStart("l1a")),
  lineStart("l2b"),
  lineStart("l3b"),
  lineStart("l4b"),
  lineStart("l5b"),
] as const;

export const roomDX = (frame: number) => lerp(0, LUNGE_DX, easeOutBack(progress(frame, [BEATS.lunge, BEATS.lunge + 8])));

// ---------------------------------------------------------------------------
// Wall schedule: one list drives both (mirror-image) walls.
// ---------------------------------------------------------------------------
type Move = { start: number; end: number; to: number; ease: (t: number) => number };
const linear = (t: number) => t;

export const WALL_MOVES: Move[] = [
  { start: BEATS.wallsIn, end: BEATS.wallsInEnd, to: WALL_OPEN, ease: easeOutBack },
  { start: BEATS.l1Close, end: BEATS.crush1, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.reopen1, end: BEATS.reopen1 + 14, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.rogue1Grab + 2, end: BEATS.escape, to: 0.9, ease: easeInOut },
  { start: BEATS.roof - 2, end: BEATS.roof + 6, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.reopen2, end: BEATS.reopen2 + 14, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.rogue2Grab + 2, end: BEATS.slam3, to: 1.0, ease: easeInOut },
  { start: BEATS.slam3, end: BEATS.slam3 + 6, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.reopen3, end: BEATS.reopen3 + 14, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.creep3, end: BEATS.stall, to: BEAM_L / 2, ease: easeInOut },
  { start: BEATS.fold, end: BEATS.fold + 18, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.cubeReopen, end: BEATS.cube, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.mage1Grab + 3, end: BEATS.close4End, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.reopen4, end: BEATS.reopen4 + 14, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.mage2Grab + 3, end: BEATS.pop, to: ORB_R, ease: linear },
  { start: BEATS.pop, end: BEATS.pop + 4, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.reopen5, end: BEATS.reopen5 + 14, to: WALL_OPEN, ease: easeInOut },
  { start: BEATS.blast - 4, end: BEATS.blast + 2, to: CLOSED_INNER, ease: easeInCubic },
  { start: BEATS.chomp + 8, end: BEATS.chomp + 22, to: WALL_OPEN, ease: easeInOut },
];

export const wallInner = (frame: number) => {
  let v = WALL_OFF;
  for (const m of WALL_MOVES) {
    if (frame < m.start) break;
    v = lerp(v, m.to, m.ease(progress(frame, [m.start, m.end])));
    if (frame < m.end) break;
  }
  return v;
};

/** Visual-only shudder of the walls (beam stall, sparks, press hiss). */
export const wallShudder = (frame: number) =>
  [BEATS.stall, BEATS.sparkL, BEATS.sparkR, BEATS.hiss].reduce((s, at) => {
    const t = frame - at;
    return t < 0 ? s : s + 0.03 * Math.sin(t * 2.4) * Math.exp(-t / 8);
  }, 0);

/**
 * While the trap runs, the doorway gate is down and the pedestal sinks into the
 * floor (out of the walls' way). [shut, open] per run.
 */
export const TRAP_RUNS: [number, number][] = [
  [BEATS.goblinGrab + 3, BEATS.reopen1],
  [BEATS.rogue1Grab + 2, BEATS.reopen2],
  [BEATS.rogue2Grab + 2, BEATS.reopen3],
  [BEATS.paladinArrive - 6, BEATS.cubeReopen],
  [BEATS.mage1Grab + 2, BEATS.reopen4],
  [BEATS.mage2Grab + 2, BEATS.reopen5],
  [BEATS.portcullis, DURATION + 100],
];
/** 0 = open/up, 1 = shut/sunk. */
export const trapShut = (frame: number, dropFrames = 5, riseFrames = 12) =>
  TRAP_RUNS.reduce((s, [a, b]) => {
    if (frame < a || frame >= b + riseFrames) return s;
    const down = easeInCubic(progress(frame, [a, a + dropFrames]));
    const up = easeInOut(progress(frame, [b, b + riseFrames]));
    return Math.max(s, down * (1 - up));
  }, 0);

// ---------------------------------------------------------------------------
// Death routine: squeeze -> wafer -> wobble -> pancake (room-relative).
// ---------------------------------------------------------------------------
export type Pressed = { x: number; z: number; squash: number; squashX: number; tilt: number; dead: boolean };
export type PressSpec = { x0: number; z0: number; half: number; crushEnd: number; reopenEnd: number; lane: readonly [number, number] };

export const pressed = (frame: number, o: PressSpec): Pressed => {
  const sx = clamp(wallInner(Math.min(frame, o.crushEnd)) / o.half, 0.12, 1);
  const squeezedX = (o.x0 * (sx - 0.12)) / 0.88;
  const wob = progress(frame, [o.reopenEnd, o.reopenEnd + 10]);
  const fall = easeInOut(progress(frame, [o.reopenEnd + 10, o.reopenEnd + 17]));
  return {
    x: lerp(squeezedX, o.lane[0], fall),
    z: lerp(o.z0, o.lane[1], fall),
    squashX: lerp(sx, 1, fall),
    squash: lerp(1, PANCAKE_SQUASH, fall),
    tilt: wob > 0 && wob < 1 ? Math.sin(wob * Math.PI * 3) * 0.22 * (1 - wob) : 0,
    dead: frame >= o.crushEnd,
  };
};

// ---------------------------------------------------------------------------
// Walkers (solved backwards from their arrival beat).
// ---------------------------------------------------------------------------
export const walkWindow = (arrive: number, fromX: number, toX: number, speed: number): [number, number] => [
  arrive - Math.round(Math.abs(toX - fromX) / speed),
  arrive,
];
/** Frame a walker passes the outer face of the left wall (the doorway). */
export const doorCross = (win: [number, number], fromX: number, toX: number) =>
  Math.round(lerp(win[0], win[1], (-(WALL_OPEN + WALL_T) - fromX) / (toX - fromX)));
/** First frame a walker is clear of the exit glow: cut to them then. */
export const onCamera = (win: [number, number], fromX: number, toX: number) =>
  Math.round(lerp(win[0], win[1], 1.6 / Math.abs(toX - fromX)));
export const walkerX = (frame: number, win: readonly [number, number], fromX: number, toX: number) =>
  lerp(fromX, toX, progress(frame, win));

// L1: goblin
export const GOBLIN_WALK = walkWindow(BEATS.goblinGrab - 4, ENTRY_X, GRAB_X, WALK);
export const GOBLIN_HOP: [number, number] = [BEATS.coinUp + 4, BEATS.coinUp + 14];
export const GOBLIN_PRESS: PressSpec = {
  x0: 0,
  z0: Z,
  half: HALF.goblin,
  crushEnd: BEATS.crush1,
  reopenEnd: BEATS.reopen1 + 14,
  lane: LANES.goblin,
};

// L2: rogue 1 (escapes) and rogue 2 (punted)
export const ROGUE1_WALK = walkWindow(BEATS.rogue1Grab - 4, ENTRY_X, GRAB_X, SPRINT);
export const ROGUE1_ON_CAMERA = onCamera(ROGUE1_WALK, ENTRY_X, GRAB_X);
export const ROGUE1_KICKS = 4;
/** Height of the feet at the top of the wall-jumps: the head reaches into the vent. */
export const CLIMB_TOP = 1.3;
export const kickFrame = (k: number, win: readonly [number, number]) => Math.round(lerp(win[0], win[1], (k + 1) / ROGUE1_KICKS));

/** Wall-jump zig-zag between the closing walls over `win`; ends centred under the vent. */
export const wallJump = (frame: number, win: readonly [number, number], fromX: number) => {
  const t = progress(frame, win);
  const k = Math.min(ROGUE1_KICKS - 1, Math.floor(t * ROGUE1_KICKS));
  const local = t * ROGUE1_KICKS - k;
  const side = k % 2 === 0 ? 1 : -1;
  const reach = Math.max(0.2, wallInner(frame) - HALF.rogue * 0.8);
  const last = k === ROGUE1_KICKS - 1;
  const from = k === 0 ? fromX : -side * Math.max(0.2, wallInner(frame) - HALF.rogue * 0.8);
  const to = last ? 0 : side * reach;
  const x = lerp(from, to, easeInOut(local));
  const y0 = (k / ROGUE1_KICKS) * CLIMB_TOP;
  const y1 = ((k + 1) / ROGUE1_KICKS) * CLIMB_TOP;
  return { x, y: lerp(y0, y1, local) + arc(local, 0.4), side: last ? 0 : side, local };
};
export const ROGUE1_CLIMB: [number, number] = [BEATS.parkour, BEATS.escape];
/** He is off the roof before the plates install (the camera cuts to the wall face then). */
export const ROGUE1_GLOAT_END = Math.min(BEATS.roof + 45, BEATS.platesIn - 16);
export const ROGUE1_ROOF_X = 0.7;
export const ROGUE1_EXIT: [number, number] = [ROGUE1_GLOAT_END, ROGUE1_GLOAT_END + 50];

export const ROGUE2_WALK = walkWindow(BEATS.rogue2Grab, ENTRY_X, GRAB_X, SPRINT);
export const ROGUE2_ON_CAMERA = onCamera(ROGUE2_WALK, ENTRY_X, GRAB_X);
export const ROGUE2_CLIMB: [number, number] = [BEATS.climb2, BEATS.atVent2];
/** Slips on the grease during kicks 1 and 2 (frame windows). */
export const ROGUE2_SLIPS: [number, number][] = [1, 2].map((k) => {
  const a = Math.round(lerp(ROGUE2_CLIMB[0], ROGUE2_CLIMB[1], (k + 0.55) / ROGUE1_KICKS));
  return [a, a + 6] as [number, number];
});
export const ROGUE2_X = 0.15;
export const ROGUE2_PRESS: PressSpec = {
  x0: ROGUE2_X,
  z0: Z,
  half: HALF.rogue,
  crushEnd: BEATS.slam3 + 6,
  reopenEnd: BEATS.reopen3 + 14,
  lane: LANES.rogue2,
};

// L3: paladin 1 and the beam
export const PALADIN1_WALK = walkWindow(BEATS.paladinArrive, ENTRY_X, 0, 0.08);
export const PALADIN1_ON_CAMERA = onCamera(PALADIN1_WALK, ENTRY_X, 0);
export const BEAM_HOLD_Y = 2.15;
export const FOLD_END = BEATS.fold + 18;
/** Where the beam is: centre, height and the half-angle of the buckle (0 = straight). */
export const beamState = (frame: number): { x: number; y: number; half: number; buckle: number; visible: boolean } => {
  const px = walkerX(frame, PALADIN1_WALK, ENTRY_X, 0);
  if (frame < BEATS.paladinArrive) return { x: px + 0.1, y: 1.5, half: BEAM_L / 2, buckle: 0, visible: true };
  if (frame < BEATS.wedge) {
    const t = easeInOut(progress(frame, [BEATS.paladinArrive, BEATS.paladinArrive + 10]));
    return { x: lerp(0.1, 0, t), y: lerp(1.5, 1.0, t), half: BEAM_L / 2, buckle: 0, visible: true };
  }
  if (frame < BEATS.stall - 6) {
    const t = easeOutBack(progress(frame, [BEATS.wedge, BEATS.wedge + 14]));
    return { x: 0, y: lerp(1.0, BEAM_HOLD_Y, t), half: BEAM_L / 2, buckle: 0, visible: true };
  }
  if (frame < BEATS.fold) {
    const t = easeOutCubic(progress(frame, [BEATS.stall - 6, BEATS.stall]));
    return { x: 0, y: lerp(BEAM_HOLD_Y, BEAM_Y, t), half: BEAM_L / 2, buckle: 0, visible: true };
  }
  const inner = wallInner(frame);
  return { x: 0, y: BEAM_Y, half: BEAM_L / 2, buckle: Math.acos(Math.min(1, inner / (BEAM_L / 2))), visible: inner > 0.2 };
};

// L4: mage 1 (blinks out) and mage 2 (pong)
export const MAGE1_WALK = walkWindow(BEATS.mage1Grab, ENTRY_X, GRAB_X, WALK);
export const MAGE1_ON_CAMERA = onCamera(MAGE1_WALK, ENTRY_X, GRAB_X);
export const MAGE1_OUT_X = 3.0;
export const MAGE1_LEAVE: [number, number] = [BEATS.blink + 36, BEATS.blink + 36 + 70];
export const MAGE2_WALK = walkWindow(BEATS.mage2Grab, ENTRY_X, GRAB_X, JOG);
export const MAGE2_ON_CAMERA = onCamera(MAGE2_WALK, ENTRY_X, GRAB_X);
export const MAGE2_PRESS: PressSpec = {
  x0: 0,
  z0: Z,
  half: HALF.mage,
  crushEnd: BEATS.pop + 4,
  reopenEnd: BEATS.reopen5 + 14,
  lane: LANES.mage2,
};

export const ORB_START = BEATS.teleport + 8;
const ORB_XS: number[] = [];
export const BOUNCES: number[] = [];
{
  let x = GRAB_X;
  let dir = 1;
  for (let f = ORB_START; f <= BEATS.pop; f++) {
    const v = lerp(0.12, 0.35, progress(f, [ORB_START, BEATS.pop]));
    const lim = Math.max(0, wallInner(f) - ORB_R);
    x += dir * v;
    if (Math.abs(x) >= lim) {
      x = Math.sign(x || dir) * lim;
      dir = -Math.sign(x || dir);
      BOUNCES.push(f);
    }
    ORB_XS.push(x);
  }
}
export const orbX = (frame: number) => ORB_XS[clamp(Math.round(frame) - ORB_START, 0, ORB_XS.length - 1)];
/** Side of the wall the orb hits at each bounce (+1 right, -1 left). */
export const bounceSide = (f: number) => Math.sign(orbX(f)) || 1;
export const BEEPS = BOUNCES.filter((f, i) => i === 0 || f - BOUNCES[i - 1] >= 3);

// L5: the party, the pole and the flight into the mimic
export const PARTY_WALK = PARTY.map((p) => walkWindow(BEATS.partyArrive, p.x - 7, p.x, WALK));
export const PARTY_ON_CAMERA = onCamera(PARTY_WALK[0], PARTY[0].x - 7, PARTY[0].x);
/** The pole runs at this z (the paladin's right hand), clear of the pedestal and the mage. */
export const POLE_Z = Z - 0.1;
export const POLE_TAPS = [-1.1, -0.75, -0.4, -0.1].map((x, i) => ({ at: BEATS.poke + i * 10, x }));
/** He drops the pole in fright, well before the room lunges. */
export const POLE_DROP = BEATS.trigger + 20;
/** Pole tip (world) while poking: safe taps, a hover while the rails go in, then the fatal tile. */
export const poleTip = (frame: number): Vec3 => {
  const taps = POLE_TAPS;
  for (let i = 0; i < taps.length; i++) {
    if (frame < taps[i].at) {
      const prev = i === 0 ? { at: taps[0].at - 8, x: taps[0].x - 0.3 } : taps[i - 1];
      const t = progress(frame, [prev.at, taps[i].at]);
      const y = i === 0 ? lerp(0.5, 0, easeInCubic(t)) : arc(t, 0.3);
      return [lerp(prev.x, taps[i].x, easeInOut(t)), y, POLE_Z];
    }
  }
  const last = taps[taps.length - 1];
  if (frame < BEATS.stickIn) return [last.x, 0.35 * easeInOut(progress(frame, [last.at + 2, last.at + 10])), POLE_Z];
  const t = progress(frame, [BEATS.stickIn, BEATS.trigger]);
  return [lerp(last.x, TILE_X, easeInOut(t)), 0.35 * (1 - t) + arc(t, 0.2), POLE_Z];
};
/** The paladin's hands on the pole: he leans in for the fatal reach. */
export const poleHand = (frame: number): Vec3 => [
  PARTY[0].x + 0.35 + 0.25 * easeInOut(progress(frame, [BEATS.stickIn, BEATS.trigger])),
  1.05,
  POLE_Z,
];

/** A party member's state after the walls slam (room-relative x). */
export const partyFlight = (frame: number, i: number): { pos: Vec3; phase: "squeeze" | "rise" | "fly" | "gone" } => {
  const p = PARTY[i];
  const relX = p.x - LUNGE_DX;
  const squeezeT = progress(frame, [BEATS.blast - 4, BEATS.blast + 2]);
  const l0 = BEATS.launch + 6 * i;
  const l1 = l0 + 10;
  const a1 = BEATS.arrive + 4 * i;
  if (frame < l0) return { pos: [lerp(relX, 0, easeInCubic(squeezeT)), 0, p.z], phase: "squeeze" };
  if (frame < l1) {
    const t = easeInCubic(progress(frame, [l0, l1]));
    return { pos: [0, lerp(0, CHIMNEY_TOP + 0.3, t), lerp(p.z, Z + (i - 1) * 0.15, t)], phase: "rise" };
  }
  if (frame < a1) {
    const t = progress(frame, [l1, a1]);
    const a: Vec3 = [0, CHIMNEY_TOP + 0.3, Z + (i - 1) * 0.15];
    const c: Vec3 = [MIMIC_MOUTH[0] * 0.4 + (i - 1) * 0.1, CHIMNEY_TOP + 1.4 + 0.3 * i, Z + (i - 1) * 0.15];
    const mouth: Vec3 = [MIMIC_MOUTH[0] + (i - 1) * 0.1, MIMIC_MOUTH[1], MIMIC_MOUTH[2] + (i - 1) * 0.1];
    return { pos: bezier(a, c, mouth, t), phase: "fly" };
  }
  return { pos: MIMIC_MOUTH, phase: "gone" };
};

// ---------------------------------------------------------------------------
// Safety net: fail loudly if a re-voice breaks the order of events.
// ---------------------------------------------------------------------------
const assertBeats = () => {
  const fail = (msg: string) => {
    throw new Error(`[crushing-walls] ${msg}`);
  };
  for (let i = 1; i < WALL_MOVES.length; i++) {
    if (WALL_MOVES[i].start < WALL_MOVES[i - 1].end) fail(`wall move ${i} starts before move ${i - 1} ends`);
  }
  const entries: [string, number, number][] = [
    ["goblin", doorCross(GOBLIN_WALK, ENTRY_X, GRAB_X), BEATS.wallsInEnd],
    ["rogue1", doorCross(ROGUE1_WALK, ENTRY_X, GRAB_X), BEATS.reopen1 + 26],
    ["rogue2", doorCross(ROGUE2_WALK, ENTRY_X, GRAB_X), BEATS.reopen2 + 14],
    ["paladin1", doorCross(PALADIN1_WALK, ENTRY_X, 0), BEATS.reopen3 + 14],
    ["mage1", doorCross(MAGE1_WALK, ENTRY_X, GRAB_X), BEATS.cube],
    ["mage2", doorCross(MAGE2_WALK, ENTRY_X, GRAB_X), BEATS.reopen4 + 14],
  ];
  for (const [who, cross, open] of entries) {
    if (cross < open) fail(`${who} crosses the doorway at ${cross}, walls open at ${open}`);
  }
  if (BEATS.goblinGrab < BEATS.pedestalUp + 14) fail("goblin grabs before the pedestal is up");
  if (BEATS.arrive + 2 * 4 > BEATS.chomp - 6) fail("party arrives after the mimic chomps");
  if (BEATS.partyArrive < BEATS.reopen5 + 14) fail("party arrives before the walls reopen");
  if (BEATS.reopen1 - BEATS.crush1 < 15) fail("goblin wafer not readable for 15 frames");
  if (wallInner(BEATS.blink) + WALL_T > MAGE1_OUT_X - 0.4) fail("mage 1 blinks into the right wall");
  if (MAGE1_WALK[0] < ROGUE1_EXIT[1]) fail("order");
  Object.keys(BEATS).forEach((k) => {
    const f = (BEATS as Record<string, number>)[k];
    if (f >= DURATION) fail(`beat ${k} = ${f} is past DURATION`);
  });
  MIRROR_POPS.forEach((f, i) => {
    if (i > 0 && f <= MIRROR_POPS[i - 1]) fail("mirror pops out of order");
  });
};
assertBeats();
