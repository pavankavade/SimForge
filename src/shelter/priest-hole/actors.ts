import type { ArmorEquipment, PaladinInput } from "../../artifacts/characters/paladin";
import type { CastId } from "./cast";
import {
  BEATS,
  BOLT,
  BURST,
  CROOK_X,
  CUTS,
  DOOR,
  DROP1,
  DROP2,
  FACE_TO,
  FLOOR2,
  GRAB,
  H1_ON_STEP,
  H1_PRY,
  H2_PRY,
  HATCH_X0,
  HATCH_X1,
  HATCH_Y,
  KNOCKS_HOLLOW,
  KNOCKS_SOLID,
  LANE,
  LIFT1,
  LIFT2,
  OUT_DOOR,
  P_ON_STEP,
  P_RUN,
  POUR,
  REAL,
  REED_IN,
  SHAFT_DOWN,
  SHAFT_IN,
  SHAFT_X,
  SHAFT_Z,
  SHOTS,
  STAIR,
  STAIR_Z,
  TABLE,
  TRIP,
  THUMP_HIT,
  FORCE,
  acting,
  clamp01,
  easeInOut,
  lerp,
  mover,
  progress,
  stairFoot,
  type Key,
  type V3,
} from "./timeline";

/**
 * The cast's scripts: where each actor's feet are, which way he faces, his lean, what he is doing,
 * and when he is on screen, keyed to BEATS. Walkers on the stairs follow the stair ramp; the
 * priest's drops (through the hatch, down the shaft) give the height explicitly. Scene.tsx plays
 * them and camera.ts frames them.
 */

const B = BEATS;
const S = SHOTS;

export interface ActorScript {
  pos: (f: number) => V3;
  yaw: (f: number) => number;
  act: (f: number) => Partial<PaladinInput>;
  visible: (f: number) => boolean;
  pitch?: (f: number) => number;
  /** Changes to the cast member's kit on a frame (swords put down at the table). */
  equipment?: (f: number) => Partial<ArmorEquipment>;
}

/** Every camera cut, where a still may restart the humans' simulation. */
export const RESETS: number[] = CUTS;

const within = (f: number, ranges: Array<[number, number]>) => ranges.some(([a, b]) => f >= a && f < b);
/** Feet on whatever is under (x, z): the stairs or the ground floor. */
const ground = (x: number, z: number): number => (z < STAIR.z1 + 0.05 && x > STAIR.x0 - 0.1 ? stairFoot(x) : 0);
/** A mover whose keys leave y out: the feet follow the floor and the stairs. */
const walker = (keys: Key[], yaws: Array<[number, number]>) => {
  const m = mover(keys, yaws);
  return {
    yaw: m.yaw,
    pos: (f: number): V3 => {
      const p = m.pos(f);
      return [p[0], ground(p[0], p[2]), p[2]];
    },
  };
};

/** On the step below the hatch, and in the hide. */
const STEP5_X = STAIR.x0 + 5.5 * STAIR.going;
const UNDER_X = (HATCH_X0 + HATCH_X1) / 2;
const SEAT_X = 0.45;
/** Through the hatch: off the step and straight down into the hide. */
const dropPos = (f: number, [a, b]: [number, number]): V3 => {
  const t = progress(f, [a, b]);
  const x = lerp(STEP5_X + 0.22, UNDER_X, easeInOut(clamp01(t * 1.6)));
  const y = HATCH_Y * (1 - t * t);
  return [x, Math.max(0, y), STAIR_Z];
};
/** The hide, the real chamber and the shaft (on the floor, facing out). */
/** The hide's seat sits back against the bricks, knees clear of the low front course. */
const SEAT_Z = -2.22;
const REAL_SEAT: V3 = [(REAL.x0 + REAL.x1) / 2 + 0.05, 0, -2.05];

const sit = (a?: PaladinInput["arms"], aimPitch = 0): Partial<PaladinInput> => ({ stance: "sit", seatY: 0.14, arms: a ?? "knees", aimPitch });
const crouch = (a?: PaladinInput["arms"], aimPitch = 0): Partial<PaladinInput> => ({ stance: "crouch", arms: a, aimPitch });

// ---------------------------------------------------------------------------
// The priest ("you")
// ---------------------------------------------------------------------------
const pRun = walker(
  [
    { f: 0, x: -3.3, z: LANE },
    { f: P_RUN, x: -3.3, z: LANE },
    { f: P_RUN + 14, x: -2.8, z: STAIR_Z },
    { f: P_ON_STEP, x: STEP5_X, z: STAIR_Z },
  ],
  [
    [0, -2.3],
    [B.door, -2.6],
    [P_RUN - 4, -2.6],
    [P_RUN + 6, FACE_TO.right],
  ]
);
/** Shuffle along the hide on hands and knees (crouched), from under the hatch to the seat. */
const shuffle = (f: number, a: number, b: number): V3 => {
  const t = easeInOut(progress(f, [a, b]));
  return [lerp(UNDER_X, SEAT_X, t), 0, lerp(STAIR_Z, SEAT_Z, t)];
};

const priestPos = (f: number): V3 => {
  // The hook and the run up the stairs; the lift; the drop; along to the seat.
  if (f < S.hinge) {
    if (f < LIFT1[0] + 6) return pRun.pos(f);
    if (f < DROP1[1]) return dropPos(f, [LIFT1[0] + 6, DROP1[1]]);
    return shuffle(f, DROP1[1] + 4, DROP1[1] + 36);
  }
  // Shown again from the step: the hinge goes on, the drop, the bolt, along to the seat.
  if (f < S.shaft) {
    if (f < DROP2[0]) return [STEP5_X, stairFoot(STEP5_X), STAIR_Z];
    if (f < DROP2[1]) return dropPos(f, DROP2);
    return shuffle(f, BOLT[1] + 4, BOLT[1] + 30);
  }
  // Upstairs in the store, through the garderobe doorway into the shaft, down it; the soup.
  if (f < S.tear) {
    if (f < SHAFT_IN) return [lerp(3.6, 2.75, easeInOut(progress(f, [S.shaft, SHAFT_IN - 2]))), FLOOR2, SHAFT_Z];
    if (f < SHAFT_DOWN[0]) return [lerp(2.75, SHAFT_X, easeInOut(progress(f, [SHAFT_IN, SHAFT_DOWN[0]]))), FLOOR2, SHAFT_Z];
    const t = easeInOut(progress(f, SHAFT_DOWN));
    return [SHAFT_X, lerp(FLOOR2, 0, t), SHAFT_Z];
  }
  // From the double hide on: the real chamber.
  return REAL_SEAT;
};
const priestYaw = (f: number): number => {
  if (f < LIFT1[0] + 6) return pRun.yaw(f);
  if (f < S.hinge) return f < DROP1[1] + 36 ? FACE_TO.right : FACE_TO.camera;
  if (f < S.shaft) return f < DROP2[0] ? 0.4 : f < BOLT[1] + 30 ? FACE_TO.right : FACE_TO.camera;
  if (f < S.tear) return f < SHAFT_DOWN[0] - 4 ? FACE_TO.left : FACE_TO.camera;
  // Facing the secret door for the peek; turned toward us for the rest.
  if (f >= S.peek && f < S.twoRooms) return FACE_TO.left;
  return -0.55;
};
const priestAct = acting([
  // Listening at the door, then the run.
  [0, { arms: "cross", aimPitch: 0.05 }],
  [B.pounding + 2, { arms: "shade", aimPitch: 0.1 }],
  [P_RUN - 6, {}],
  [LIFT1[0], crouch("reach", 0.2)],
  [DROP1[0] + 4, crouch("cheer", 0.4)],
  [DROP1[1], crouch()],
  [DROP1[1] + 38, sit()],
  // The boot overhead.
  [H1_ON_STEP - 6, sit("cross", 0.75)],
  // On the step for the hinge, watching it go on.
  [S.hinge, { aimPitch: -0.55 }],
  [LIFT2[0] + 2, crouch("reach", 0.1)],
  [DROP2[0] + 4, crouch("cheer", 0.4)],
  [DROP2[1], crouch("reach", 0.95)],
  [BOLT[1] + 4, crouch()],
  [BOLT[1] + 32, sit()],
  // The knocks: shrinking from each, the hollow ones and the dead ones.
  [B.tap - 4, sit("cross", 0.1)],
  [B.hollow - 2, crouch("cross", 0.25)],
  [S.brick, sit()],
  [B.knock - 6, sit("cross", 0.1)],
  [B.thuds + 10, sit("knees", -0.2)],
  // Upstairs and down the shaft.
  [S.shaft, {}],
  [SHAFT_IN - 2, crouch("reach", 0.5)],
  [SHAFT_DOWN[0], { arms: "cheer", aimPitch: 0.7 }],
  [SHAFT_DOWN[1] + 2, { aimPitch: 0.3 }],
  // A week: sinking down the shaft wall.
  [S.kitchen, { aimPitch: -0.1 }],
  [B.starve - 14, crouch("cross", -0.35)],
  // The reed: up to it, the first taste, the pull back, then gulping it down.
  [S.reed, { aimPitch: 0.2 }],
  [REED_IN[1] - 6, { aimPitch: 0.45 }],
  [POUR[0] + 10, { arms: "eat", aimPitch: 0.55 }],
  [B.tastes - 2, { arms: "cross", aimPitch: -0.25 }],
  [B.but4 - 2, { arms: "eat", aimPitch: 0.6 }],
  // The real chamber: on the floor, knees up.
  [S.tear, sit()],
  [S.peek, sit("knees", 0.05)],
  [THUMP_HIT, crouch("cross", 0.1)],
  [THUMP_HIT + 30, sit("cross", 0)],
  [S.catShot, sit()],
  [B.quiet - 4, sit("cross", -0.3)],
]);

// ---------------------------------------------------------------------------
// Hunter 1: the climb, the knocks, the rope, the panels, the search.
// ---------------------------------------------------------------------------
const h1Climb = walker(
  [
    { f: BURST, x: DOOR.x, z: -3.4 },
    { f: BURST + 12, x: DOOR.x + 0.2, z: -2.1 },
    { f: BURST + 30, x: -2.85, z: STAIR_Z },
    { f: H1_ON_STEP, x: UNDER_X - 0.02, z: STAIR_Z },
  ],
  [
    [BURST, FACE_TO.camera],
    [BURST + 14, 0.9],
    [BURST + 28, FACE_TO.right],
  ]
);
/** Along the stair panel, knocking (each knock with the hand out). */
/** Knocks walk along the solid stair panel toward the hide; the last ones land on its end wall. */
export const KNOCK_X = [-1.3, -1.15, -1.02, -0.9, -0.8];
/** Where the dead knocks land (the hide's end wall, now bricked). */
export const SOLID_X = -0.95;
/** Knock height on the panel (it is low at that end of the flight). */
export const KNOCK_Y = 0.92;
const h1Tap = walker(
  ([{ f: S.tap, x: -3.0, z: -0.95 }] as Key[])
    .concat(KNOCKS_HOLLOW.map((k, i) => ({ f: k - 8, x: KNOCK_X[i], z: -0.95 })))
    .concat([
      { f: S.brick, x: SOLID_X, z: -0.95, cut: true },
      { f: B.knock - 14, x: SOLID_X, z: -0.95 },
      { f: B.thuds + 14, x: SOLID_X, z: -0.95 },
      { f: S.measure, x: -2.6, z: -0.8 },
    ]),
  [
    [S.tap, FACE_TO.right],
    [KNOCKS_HOLLOW[0] - 8, FACE_TO.back],
    [S.brick, FACE_TO.back],
    [B.thuds + 6, FACE_TO.back],
    [B.thuds + 16, FACE_TO.left],
  ]
);
const knockArms = (knocks: number[]) => (f: number): Partial<PaladinInput> | null => {
  for (const k of knocks) if (f >= k - 5 && f < k + 4) return { arms: "reach", aimPitch: -0.38 };
  return null;
};
const hollowKnocks = knockArms(KNOCKS_HOLLOW);
const solidKnocks = knockArms(KNOCKS_SOLID);

/** Into the decoy: up to the hatch, the drop, across under the stairs to the partition. */
const h1Search = (f: number): V3 => {
  const drop: [number, number] = [B.nothing - 10, B.nothing + 6];
  if (f < drop[0]) return [STEP5_X - 0.1, stairFoot(STEP5_X - 0.1), STAIR_Z];
  if (f < drop[1]) return dropPos(f, drop);
  return [lerp(UNDER_X, 0.85, easeInOut(progress(f, [drop[1] + 2, B.cobwebs + 4]))), 0, -2.0];
};

const h1Pos = (f: number): V3 => {
  if (f < S.hinge) return h1Climb.pos(f);
  if (f < S.measure) return h1Tap.pos(f);
  if (f < S.shaft) return [-7.25, 0, -0.2];
  if (f < S.search) return [-5.15, FLOOR2, -1.95];
  return h1Search(f);
};
const h1Yaw = (f: number): number => {
  if (f < S.hinge) return h1Climb.yaw(f);
  if (f < S.measure) return h1Tap.yaw(f);
  if (f < S.shaft) return FACE_TO.right;
  if (f < S.search) return FACE_TO.back;
  if (f < B.nothing - 10) return 0.6;
  return f < B.cobwebs + 6 ? FACE_TO.right : f < B.cobwebs + 14 ? 0.3 : FACE_TO.right;
};
const h1Steps = acting([
  [BURST, {}],
  [H1_ON_STEP, { aimPitch: -0.75 }],
  [S.hinge, {}],
  [S.tap, {}],
  [B.hollow + 8, { aimPitch: 0.1 }],
  [S.brick, {}],
  [B.thuds + 6, { arms: "cross", aimPitch: -0.2 }],
  [S.measure, { arms: "hold" }],
  [S.tear, {}],
  [S.search, {}],
  [B.cheer - 6, { arms: "cheer" }],
  [B.nothing - 12, {}],
  [B.nothing + 8, { aimPitch: 0.55 }],
  [B.cobwebs + 10, { aimPitch: 0 }],
]);
const h1Act = (f: number): Partial<PaladinInput> => {
  const knock = f < S.brick ? hollowKnocks(f) : f < S.measure ? solidKnocks(f) : null;
  return { ...h1Steps(f), ...(knock || {}) };
};
/** Swings: the pries at the panels, forcing the hatch, the thump on the partition. */
const H1_SWINGS = [H1_PRY[0], H1_PRY[1], FORCE - 12, THUMP_HIT - 12];

// ---------------------------------------------------------------------------
// Hunter 2: the rope, the kitchen, the panels, the cheer, the candlestick.
// ---------------------------------------------------------------------------
/** The candlestick on the chest by the stairs, and his way out with it. */
export const CHEST: V3 = [-2.25, 0, -0.45];
const h2Out = walker(
  [
    { f: S.search, x: -1.7, z: -0.7 },
    { f: GRAB - 10, x: -1.7, z: -0.7 },
    { f: GRAB, x: CHEST[0] + 0.05, z: CHEST[2] - 0.45 },
    { f: GRAB + 10, x: CHEST[0] + 0.05, z: CHEST[2] - 0.45 },
    { f: OUT_DOOR - 16, x: DOOR.x + 0.15, z: -2.15 },
    { f: OUT_DOOR, x: DOOR.x + 0.15, z: -3.4 },
  ],
  [
    [S.search, FACE_TO.back + 0.5],
    [GRAB - 6, FACE_TO.camera + 0.3],
    [GRAB + 12, FACE_TO.left + 0.3],
    [OUT_DOOR - 14, FACE_TO.back],
  ]
);
export const h2HasCandlestick = (f: number): boolean => f >= GRAB + 4;
const h2Pos = (f: number): V3 => {
  if (f < S.shaft) return [7.45, 0, -0.2];
  if (f < S.reed) return [TABLE.x - 0.73, 0, TABLE.z];
  if (f < S.search) return [-3.6, FLOOR2, -1.95];
  return h2Out.pos(f);
};
const h2Yaw = (f: number): number => {
  if (f < S.shaft) return FACE_TO.left;
  if (f < S.reed) return FACE_TO.right;
  if (f < S.search) return FACE_TO.back;
  return h2Out.yaw(f);
};
const h2Act = acting([
  [0, { arms: "hold" }],
  [S.kitchen, { stance: "sit", seatY: 0.48, arms: "eat", aimPitch: -0.1 }],
  [B.week, { stance: "sit", seatY: 0.48, arms: "cross", aimPitch: -0.2 }],
  [B.starve - 4, { stance: "sit", seatY: 0.48, arms: "eat", aimPitch: 0 }],
  [S.tear, {}],
  [S.search, { aimPitch: 0.2 }],
  [B.cheer - 4, { arms: "cheer" }],
  [B.cheer + 18, {}],
  [GRAB - 4, { arms: "reach", aimPitch: -0.4 }],
  [GRAB + 6, { arms: "hold" }],
]);
const H2_SWINGS = [H2_PRY[0], H2_PRY[1]];

// ---------------------------------------------------------------------------
// Hunter 3: at the kitchen table; later down the stairs and over the crooked step.
// ---------------------------------------------------------------------------
const h3Down = walker(
  [
    { f: S.crooked, x: 1.25, z: STAIR_Z },
    { f: TRIP - 1, x: CROOK_X + 0.2, z: STAIR_Z },
    { f: TRIP + 16, x: CROOK_X - 0.3, z: STAIR_Z },
    { f: TRIP + 70, x: -3.4, z: LANE },
  ],
  [
    [S.crooked, FACE_TO.left],
    [TRIP + 50, FACE_TO.left + 0.5],
  ]
);
const h3Pos = (f: number): V3 => (f < S.crooked ? [TABLE.x + 0.7, 0, TABLE.z] : h3Down.pos(f));
const h3Yaw = (f: number): number => (f < S.crooked ? FACE_TO.left : h3Down.yaw(f));
const h3Act = acting([
  [0, { stance: "sit", seatY: 0.48, arms: "cross" }],
  [B.week + 8, { stance: "sit", seatY: 0.48, arms: "eat" }],
  [S.crooked, {}],
  [TRIP, { arms: "cheer", aimPitch: -0.5 }],
  [TRIP + 14, { aimPitch: -0.3 }],
  [TRIP + 26, {}],
]);
/** The stumble: pitched forward over the step, caught, upright again. */
const h3Pitch = (f: number): number => {
  if (f < TRIP || f > TRIP + 22) return 0;
  const t = progress(f, [TRIP, TRIP + 22]);
  return 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
};

// ---------------------------------------------------------------------------
// The owner, upstairs, feeding the reed down to the shaft.
// ---------------------------------------------------------------------------
/** In the store over the kitchen, kneeling at the garderobe doorway. */
export const OWNER_AT: V3 = [2.85, FLOOR2, -1.45];
const ownerAct = acting([
  [0, crouch("hold", -0.55)],
  [REED_IN[0], crouch("reach", -0.6)],
  [REED_IN[1], crouch("hold", -0.6)],
]);

// ---------------------------------------------------------------------------
// The cast table
// ---------------------------------------------------------------------------
export const SCRIPTS: Record<CastId, ActorScript & { swings?: number[] }> = {
  // The cloak comes off for the drops (through the hatch, down the shaft): a long cloth flung
  // upward by a fast fall reads as a glitch, not a cloak.
  priest: {
    pos: priestPos,
    yaw: priestYaw,
    act: priestAct,
    visible: () => true,
    equipment: (f) => (within(f, [[DROP1[0] - 4, DROP1[1] + 30], [DROP2[0] - 4, S.tap], [SHAFT_DOWN[0] - 4, SHAFT_DOWN[1] + 20]]) ? { cape: false } : {}),
  },
  h1: {
    pos: h1Pos,
    yaw: h1Yaw,
    act: h1Act,
    swings: H1_SWINGS,
    visible: (f) => within(f, [[BURST - 2, S.hinge], [S.tap, S.shaft], [S.tear, S.crooked]]),
  },
  h2: { pos: h2Pos, yaw: h2Yaw, act: h2Act, swings: H2_SWINGS, equipment: (f) => (within(f, [[S.shaft, S.reed]]) ? { sword: false } : {}), visible: (f) => within(f, [[S.measure, S.shaft], [S.kitchen, S.starve], [S.tear, OUT_DOOR + 2]]) },
  h3: { pos: h3Pos, yaw: h3Yaw, act: h3Act, pitch: h3Pitch, equipment: (f) => (f < S.crooked ? { sword: false } : {}), visible: (f) => within(f, [[S.kitchen, S.starve], [S.crooked, S.catShot]]) },
  owner: { pos: () => OWNER_AT, yaw: () => FACE_TO.left, act: ownerAct, visible: (f) => within(f, [[S.reed, S.tear]]) },
};

/** Feet height under an actor on a frame (the gait treats anything above it as a jump). */
export const floorOf = (id: CastId) => (f: number): number => SCRIPTS[id].pos(f)[1];

/** Where the candlestick is carried (in front of hunter 2's chest, his hands). */
export const handsOf = (id: CastId, f: number, reach = 0.36, height = 1.05): V3 => {
  const p = SCRIPTS[id].pos(f);
  const y = SCRIPTS[id].yaw(f);
  return [p[0] + Math.sin(y) * reach, p[1] + height, p[2] + Math.cos(y) * reach];
};
