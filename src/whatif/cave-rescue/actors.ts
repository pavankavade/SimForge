import type { PaladinInput } from "../../artifacts/characters/paladin";
import { CAST, type CastId } from "./cast";
import {
  BEATS,
  FACE_TO,
  SHOTS,
  acting,
  arms,
  easeInOut,
  floor1,
  floor3,
  lerp,
  mover,
  progress,
  sitOn,
  type Key,
  type V3,
} from "./timeline";

/**
 * The cast's scripts: where each actor's feet are, which way he faces, how far he leans over
 * (swimming, lying), what he is doing, and when he is on screen, keyed to BEATS. Walkers keep to
 * the floor of the level they are on; swimmers are given by the centre of the body and turned
 * about it, so a diver can stand up out of the pool. Scene.tsx plays them and camera.ts follows.
 */

const B = BEATS;
const S = SHOTS;

export interface ActorState {
  pos: V3;
  yaw: number;
  pitch: number;
}

/** Every camera cut, where a still may restart the humans' simulation. */
export const RESETS: number[] = [S.inside, S.whole, BEATS.muddy - 22, S.pumps, S.dive, S.found, S.wayOut, S.air, S.tanks, S.sleep, S.tow, S.out, S.end];

// ---------------------------------------------------------------------------
// Swimmers: the body's centre, its facing (+1 = toward +x) and its pitch (PI/2 = flat).
// ---------------------------------------------------------------------------
/** Feet from the body's centre: back along the body axis by half a height. */
const fromCentre = (c: V3, facing: number, pitch: number, scale: number): ActorState => {
  const half = 0.9 * scale;
  const ax = Math.sin(pitch) * Math.sin(facing);
  const ay = Math.cos(pitch);
  const az = Math.sin(pitch) * Math.cos(facing);
  return { pos: [c[0] - ax * half, c[1] - ay * half, c[2] - az * half], yaw: facing, pitch };
};
/** Along a polyline of centres between two frames, flat and nosing up or down with the path. */
const swim = (f: number, f0: number, f1: number, pts: V3[], scale = 1): ActorState => {
  const t = easeInOut(progress(f, [f0, f1])) * 0.25 + progress(f, [f0, f1]) * 0.75;
  const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
  const k = t * (pts.length - 1) - seg;
  const a = pts[seg];
  const b = pts[seg + 1];
  const c: V3 = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const facing = dx >= 0 ? FACE_TO.right : FACE_TO.left;
  const pitch = Math.PI / 2 - Math.atan2(dy, Math.abs(dx)) * 0.8;
  return fromCentre(c, facing, pitch, scale);
};
const SWIM: Partial<PaladinInput> = { relaxed: true, arms: "cheer" };

// ---------------------------------------------------------------------------
// The boys and the coach: walking in on level 1, up the bank, sitting on the ledge.
// ---------------------------------------------------------------------------
type Boy = "hero" | "coach" | "b1" | "b2" | "b3" | "b4" | "b5";
/** Level 1 walk: x at the first frame of the inside shot, and z. Everyone walks at ~1.2 m/s. */
const WALK: Record<Boy, [number, number]> = {
  coach: [5.1, -0.7],
  hero: [4.3, 0.45],
  b1: [3.6, -0.25],
  b2: [2.9, 0.75],
  b3: [2.4, -0.95],
  b4: [3.9, -1.25],
  b5: [1.9, 0.2],
};
const PACE = 0.04;
/** Up out of the pool onto the bank (x, z at the zoom), then the place each sits on the ledge. */
const BANK: Record<Boy, [number, number]> = {
  coach: [13.6, 0.3],
  hero: [13.1, 0.7],
  b1: [12.8, -0.4],
  b2: [12.4, 0.2],
  b3: [12.9, -1.1],
  b4: [12.2, -0.8],
  b5: [12.0, 0.8],
};
const SEAT: Record<Boy, [number, number, number]> = {
  coach: [16.0, 0.2, FACE_TO.right],
  hero: [17.3, 0.6, -1.25],
  b1: [17.9, -0.55, -1.4],
  b2: [18.6, 0.35, -1.3],
  b3: [19.6, -0.9, -1.5],
  b4: [16.9, -0.95, -1.0],
  b5: [19.7, 0.55, -1.65],
};
/** Who comes down to the water's edge when the divers surface, and where they stand. */
const EDGE: Partial<Record<Boy, [number, number]>> = {
  hero: [13.9, 0.55],
  b1: [14.3, -0.45],
  b2: [14.9, 0.25],
  coach: [15.4, -0.9],
};

const BANK_AT = B.muddy - 22;
const SAT = B.flood + 26;

const boyKeys = (id: Boy): Key[] => {
  const [x0, z0] = WALK[id];
  const t0 = S.inside;
  const t1 = S.whole;
  const [bx, bz] = BANK[id];
  const [sx, sz] = SEAT[id];
  const keys: Key[] = [
    { f: t0, x: x0, z: z0 },
    { f: t1, x: x0 + (t1 - t0) * PACE, z: z0 },
    { f: BANK_AT, x: bx, z: bz, cut: true },
    { f: BANK_AT + 1, x: bx, z: bz },
    { f: SAT - 6, x: sx, z: sz },
  ];
  const edge = EDGE[id];
  if (edge) {
    const up = B.two + 14 + (id === "coach" ? 18 : id === "b2" ? 10 : id === "b1" ? 5 : 0);
    keys.push({ f: up, x: sx, z: sz }, { f: up + 44, x: edge[0], z: edge[1] });
  }
  // Back on the ledge for the air going thin.
  keys.push({ f: S.air, x: sx, z: sz, cut: true });
  return keys;
};
const boyYaws = (id: Boy): Array<[number, number]> => {
  const [, , yaw] = SEAT[id];
  const list: Array<[number, number]> = [[0, FACE_TO.right]];
  // The water behind them: a look back over the shoulder, and on.
  if (id === "hero") list.push([B.behind - 2, -2.3], [B.behind + 14, -2.3], [B.behind + 24, FACE_TO.right]);
  if (id === "b2" || id === "b5") list.push([B.behind + 4, -2.6], [B.behind + 16, FACE_TO.right]);
  list.push([BANK_AT, FACE_TO.right + 0.3], [SAT - 4, yaw]);
  if (EDGE[id]) {
    const up = B.two + 14 + (id === "coach" ? 18 : id === "b2" ? 10 : id === "b1" ? 5 : 0);
    list.push([up + 6, FACE_TO.left - 0.2], [up + 50, FACE_TO.left + 0.15]);
  } else {
    // The rest turn to the light in the pool from where they sit.
    list.push([B.light + 10, FACE_TO.left + 0.3]);
  }
  list.push([S.air, yaw]);
  return list;
};
const boyActs = (id: Boy): Array<[number, Partial<PaladinInput>]> => {
  const torch = id === "hero" || id === "coach" || id === "b2";
  const steps: Array<[number, Partial<PaladinInput>]> = [[0, torch ? arms("hold") : {}]];
  steps.push([B.behind - 2, id === "hero" ? { arms: "hold", aimPitch: -0.15 } : torch ? arms("hold") : {}]);
  steps.push([BANK_AT, {}]);
  steps.push([SAT, sitOn(0.06, id === "coach" ? "knees" : id === "b3" || id === "b5" ? "knees" : undefined)]);
  // The drink from the dripping rock: the hero, up under the stalactite.
  if (id === "hero") {
    steps.push([B.drink - 4, {}], [B.dripping - 8, { arms: "eat", aimPitch: 0.55 }], [B.rock + 14, { arms: "eat", aimPitch: 0.1 }], [B.coachTeaches - 4, sitOn(0.06)]);
  }
  // Sit still and breathe slowly: hands on the knees, chins down.
  steps.push([B.sit - 4, sitOn(0.06, "knees")]);
  steps.push([B.breathe, { ...sitOn(0.06, "knees"), aimPitch: -0.25 }]);
  // Day 10: heads up to the light; four come down to the water.
  steps.push([B.light + 6, { ...sitOn(0.06, "knees"), aimPitch: 0.1 }]);
  if (EDGE[id]) {
    const up = B.two + 14 + (id === "coach" ? 18 : id === "b2" ? 10 : id === "b1" ? 5 : 0);
    steps.push([up - 6, {}]);
    steps.push([B.how, { aimPitch: -0.12 }]);
  }
  if (id === "hero") steps.push([B.thirteen + 2, { arms: "wave", aimPitch: -0.1 }], [B.alive - 10, { arms: "cheer" }]);
  if (id === "b1") steps.push([B.alive - 6, { arms: "cheer" }]);
  if (id === "b2") steps.push([B.alive - 2, { arms: "wave" }]);
  // Air running thin: slumped, still.
  steps.push([S.air, { ...sitOn(0.06, "knees"), aimPitch: -0.35 }]);
  steps.push([S.sleep, { ...sitOn(0.06, "knees"), aimPitch: -0.1 }]);
  return steps;
};
const BOY_MOVE = {} as Record<Boy, ReturnType<typeof mover>>;
const BOY_ACT = {} as Record<Boy, (f: number) => Partial<PaladinInput>>;
(["hero", "coach", "b1", "b2", "b3", "b4", "b5"] as Boy[]).forEach((id) => {
  BOY_MOVE[id] = mover(boyKeys(id), boyYaws(id));
  BOY_ACT[id] = acting(boyActs(id));
});

/** The hero's drink: he gets up and stands under the drip, then sits back down. */
const HERO_DRIP: Key[] = [
  { f: B.drink - 4, x: SEAT.hero[0], z: SEAT.hero[1] },
  { f: B.dripping - 8, x: 18.8, z: -1.55 },
  { f: B.rock + 18, x: 18.8, z: -1.55 },
  { f: B.coachTeaches - 2, x: SEAT.hero[0], z: SEAT.hero[1] },
];
const heroDrip = mover(HERO_DRIP, [
  [B.drink - 4, SEAT.hero[2]],
  [B.drink + 6, FACE_TO.right + 0.4],
  [B.dripping - 6, FACE_TO.camera + 0.1],
  [B.rock + 20, FACE_TO.left],
  [B.coachTeaches, SEAT.hero[2]],
]);

/** The sedated hero: on his back on the ledge, then towed out under water by the first diver. */
const SLEEP_AT: V3 = [18.1, 0, 0.55];
const LYING_UP = 0.13;
const TOW_PATH: V3[] = [
  [9.6, -19.0, 0.5],
  [7.4, -19.25, 0.55],
  [4.6, -19.25, 0.55],
  [2.4, -18.7, 0.5],
];

const boyState = (id: Boy, f: number): ActorState => {
  const sc = CAST[id].scale;
  if (id === "hero") {
    if (f >= S.tow && f < S.out) {
      // Beside the diver, a little below and toward us, head first.
      const d = swim(f, S.tow, S.out, TOW_PATH);
      const c: V3 = [d.pos[0] + Math.sin(d.yaw) * 0.9 - 0.1, d.pos[1] - 0.12, d.pos[2] + 0.55];
      return fromCentre(c, FACE_TO.right, -Math.PI / 2, sc);
    }
    if (f >= S.sleep && f < S.tow) {
      // Already on his back when we cut in, with the doctor beside him.
      const x = SLEEP_AT[0];
      return { pos: [x, floor3(x) + LYING_UP, SLEEP_AT[2]], yaw: FACE_TO.right, pitch: -Math.PI / 2 };
    }
    if (f >= B.drink - 4 && f < B.coachTeaches - 2) {
      const p = heroDrip.pos(f);
      return { pos: [p[0], floor3(p[0]), p[2]], yaw: heroDrip.yaw(f), pitch: 0 };
    }
  }
  const p = BOY_MOVE[id].pos(f);
  const onL1 = f < S.whole;
  return { pos: [p[0], onL1 ? floor1(p[0]) : floor3(p[0]), p[2]], yaw: BOY_MOVE[id].yaw(f), pitch: 0 };
};
const boyAct = (id: Boy, f: number): Partial<PaladinInput> => {
  if (id === "hero" && f >= S.sleep) return { relaxed: true };
  return BOY_ACT[id](f);
};
const boyVisible = (id: Boy, f: number): boolean => {
  if (f >= S.whole && f < BANK_AT) return false;
  if (f >= S.pumps && f < S.found) return false;
  if (f >= S.tanks && f < S.sleep) return false;
  if (f >= S.out) return false;
  if (id === "hero" && f >= S.tow) return f < S.out;
  if (f >= S.tow && f < S.out) return false;
  return true;
};

// ---------------------------------------------------------------------------
// The divers.
// ---------------------------------------------------------------------------
/** d1 in the first bend (b1), out of the last bend into the pool (b2), carrying "you" out (d1). */
const D1_DIVE: V3[] = [
  [9.6, -0.9, 0.2],
  [11.4, -1.55, 0.25],
  [15.4, -1.6, 0.3],
];
const D1_POOL: V3[] = [
  [7.4, -19.3, 0.3],
  [9.6, -19.1, 0.3],
];
const D2_POOL: V3[] = [
  [6.6, -19.35, -0.5],
  [8.9, -19.2, -0.5],
];
/** d2 through the tight bend on the way out (c1). */
const D2_SQUEEZE: V3[] = [
  [14.9, -9.0, 0.3],
  [16.6, -9.62, 0.3],
  [21.0, -9.62, 0.3],
];
/** The volunteer on his way back past the tanks he laid (c2). */
const D3_BACK: V3[] = [
  [15.0, -9.62, 0.0],
  [18.6, -9.62, 0.05],
];

/** Swimming up out of the pool: flat, then stood up about the middle of the body, then wading. */
const surface = (f: number, swimTo: number, stand: [number, number], pts: V3[], wade: [number, number], scale = 1): ActorState => {
  if (f < swimTo) return swim(f, swimTo - 26, swimTo, pts, scale);
  const end = pts[pts.length - 1];
  if (f < stand[1]) {
    const k = easeInOut(progress(f, stand));
    const c: V3 = [end[0] + 0.35 * k, lerp(end[1], floor3(end[0] + 0.35) + 0.9, k), end[2]];
    return fromCentre(c, FACE_TO.right, (Math.PI / 2) * (1 - k), scale);
  }
  const x = lerp(end[0] + 0.35, wade[0], easeInOut(progress(f, [stand[1] + 2, stand[1] + 2 + wade[1]])));
  return { pos: [x, floor3(x), end[2]], yaw: FACE_TO.right, pitch: 0 };
};

const D1_SWIM_TO = B.outOf - 8;
const D2_SWIM_TO = B.british - 6;

const diverState = (id: "d1" | "d2" | "d3", f: number): ActorState => {
  if (id === "d1") {
    if (f < S.found) return swim(f, B.divers - 2, S.found, D1_DIVE);
    if (f < S.wayOut) return surface(f, D1_SWIM_TO, [D1_SWIM_TO, B.surface + 2], D1_POOL, [12.0, 30]);
    return swim(f, S.tow, S.out, TOW_PATH);
  }
  if (id === "d2") {
    if (f < S.wayOut) {
      const s = surface(f, D2_SWIM_TO, [D2_SWIM_TO, B.british + 10], D2_POOL, [11.1, 34]);
      // He comes up behind and to the side of the first.
      return { ...s, pos: [s.pos[0], s.pos[1], s.pos[2]] };
    }
    if (f < S.air) return swim(f, B.flooded - 30, B.darkness + 30, D2_SQUEEZE);
    // The doctor, kneeling by "you" on the ledge, on the far side, facing us.
    const x = SLEEP_AT[0] - 0.8;
    return { pos: [x, floor3(x), -0.35], yaw: FACE_TO.camera + 0.2, pitch: 0 };
  }
  return swim(f, S.tanks, B.dies + 6, D3_BACK);
};
const diverAct = (id: "d1" | "d2" | "d3", f: number): Partial<PaladinInput> => {
  if (id === "d1") {
    if (f < S.found) return SWIM;
    if (f < S.wayOut) {
      if (f < D1_SWIM_TO + 4) return SWIM;
      if (f < B.question) return { relaxed: true, aimPitch: 0.2 };
      return { relaxed: true, aimPitch: 0.32, arms: f >= B.thirteen + 8 && f < B.alive + 20 ? "wave" : undefined };
    }
    return { relaxed: true, arms: "reach" };
  }
  if (id === "d2") {
    if (f < S.wayOut) return f < D2_SWIM_TO + 4 ? SWIM : { relaxed: true, aimPitch: 0.25 };
    if (f < S.air) return SWIM;
    return { relaxed: true, stance: "crouch", arms: "reach", aimPitch: -0.5 };
  }
  // The volunteer: swimming, then still.
  return f < B.dies + 6 ? SWIM : { relaxed: true, arms: "hold" };
};
const diverVisible = (id: "d1" | "d2" | "d3", f: number): boolean => {
  if (id === "d1") return (f >= S.dive && f < S.found) || (f >= B.light - 4 && f < S.wayOut) || (f >= S.tow && f < S.out);
  if (id === "d2") return (f >= D2_SWIM_TO - 30 && f < S.wayOut) || (f >= B.flooded - 30 && f < S.air) || (f >= S.sleep && f < S.tow);
  return f >= S.tanks && f < S.sub;
};

/** The volunteer, once his lamp is out: he drifts to a stop and sinks a little. */
const d3Drift = (f: number, s: ActorState): ActorState => {
  if (f < B.dies + 6) return s;
  const k = progress(f, [B.dies + 6, S.sleep]);
  return { ...s, pos: [s.pos[0] + 0.25 * Math.sqrt(k), s.pos[1] - 0.12 * k, s.pos[2]], pitch: s.pitch + 0.12 * k };
};

// ---------------------------------------------------------------------------
// The public face of it.
// ---------------------------------------------------------------------------
export const CAST_ORDER: CastId[] = ["hero", "coach", "b1", "b2", "b3", "b4", "b5", "d1", "d2", "d3"];
const isBoy = (id: CastId): id is Boy => id !== "d1" && id !== "d2" && id !== "d3";

export const actorState = (id: CastId, f: number): ActorState => {
  if (isBoy(id)) return boyState(id, f);
  const s = diverState(id, f);
  return id === "d3" ? d3Drift(f, s) : s;
};
export const actorPos = (id: CastId, f: number): V3 => actorState(id, f).pos;
export const actorYaw = (id: CastId, f: number): number => actorState(id, f).yaw;
export const actorPitch = (id: CastId, f: number): number => actorState(id, f).pitch;
export const actorAct = (id: CastId, f: number): Partial<PaladinInput> => (isBoy(id) ? boyAct(id, f) : diverAct(id, f));
export const actorVisible = (id: CastId, f: number): boolean => (isBoy(id) ? boyVisible(id, f) : diverVisible(id, f));
/** The body's middle (camera targets). */
export const actorCentre = (id: CastId, f: number): V3 => {
  const s = actorState(id, f);
  const half = 0.9 * CAST[id].scale;
  return [s.pos[0] + Math.sin(s.pitch) * Math.sin(s.yaw) * half, s.pos[1] + Math.cos(s.pitch) * half, s.pos[2] + Math.sin(s.pitch) * Math.cos(s.yaw) * half];
};
/** Lamp on: the divers' cap lamps (the volunteer's goes out). */
export const SEATS = SEAT;
export const HERO_SLEEP = SLEEP_AT;
