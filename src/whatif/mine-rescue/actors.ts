import type { PaladinInput } from "../../artifacts/characters/paladin";
import type { CastId } from "./cast";
import {
  ARRIVALS,
  BEATS,
  CAP,
  FACE,
  FACE_TO,
  PROBES,
  SH,
  SHOTS,
  SURF,
  TOP,
  TUBE,
  acting,
  arms,
  capsuleY,
  easeInOut,
  lineStart,
  lookUp,
  mover,
  progress,
  rampY,
  sitOn,
  toward,
  type Key,
  type Mover,
  type V3,
} from "./timeline";

/**
 * The cast's scripts: where each actor stands (feet), which way he faces and what he is doing,
 * keyed to BEATS. Positions are world x and z; the height comes from where he is (the shelter
 * floor, the ramp, the camp, the capsule). Scene.tsx plays them and camera.ts follows them.
 */

export type Place = "below" | "camp";

interface Script {
  keys: Key[];
  yaws: Array<[number, number]>;
  act: Array<[number, Partial<PaladinInput>]>;
  /** Underground or at the camp, by frame. */
  place: (f: number) => Place;
  /** Riding the capsule: frames [from, to) during which he stands in its cabin. */
  ride?: Array<[number, number]>;
  hidden?: (f: number) => boolean;
  glasses?: (f: number) => boolean;
}

const S = SHOTS;
const B = BEATS;
const W = SURF.winch;
const PX = SURF.probe;
const CUT = SURF.cut;
const BENCH = SH.bench.z + 0.05;

/** A rider's path at the camp for an arrival: in the capsule, out of the side door (+x), to a spot. */
const rideKeys = (a: number, spot: [number, number], hold = 0): Key[] => [
  { f: a - 30, x: W, z: CUT, cut: true },
  { f: a + 4, x: W, z: CUT },
  { f: a + 16, x: W + 1.1, z: CUT - 0.15 },
  { f: a + 16 + hold, x: W + 1.1, z: CUT - 0.15 },
  { f: a + 40 + hold, x: spot[0], z: spot[1] },
];
const rideYaws = (a: number): Array<[number, number]> => [
  [a - 30, FACE_TO.camera],
  [a + 4, FACE_TO.right],
  [a + 30, FACE_TO.right],
  [a + 46, FACE_TO.camera],
];
const belowUntil = (t: number) => (f: number): Place => (f < t ? "below" : "camp");

/** Where the men gather: round the probe when it comes through, round Plan B's shaft on day 65. */
const AT_PROBE: Record<"foreman" | "m1" | "m2" | "m3" | "m4", [number, number]> = {
  foreman: [2.55, 0.75],
  m1: [0.0, -0.1],
  m2: [1.3, -0.4],
  m3: [3.3, -0.3],
  m4: [2.3, -0.7],
};
const AT_SHAFT: Record<"hero" | "foreman" | "m1" | "m2" | "m3" | "m4", [number, number]> = {
  hero: [-1.3, 0.75],
  foreman: [-3.9, 0.8],
  m1: [-2.2, -0.45],
  m2: [-3.4, -0.3],
  m3: [-1.0, -0.5],
  m4: [-0.3, 0.3],
};
const toProbe = ([x, z]: [number, number]) => toward(x, z, PX, FACE);
const toShaft = ([x, z]: [number, number]) => toward(x, z, W, FACE);
/** Everyone watches the ramp's mouth while the mountain is still coming down. */
const toMouth = (x: number, z: number) => toward(x, z, SH.right, 1.0);

const SCRIPTS: Record<CastId, Script> = {
  hero: {
    keys: [
      // Down the ramp, the roof falls in behind him, and he runs for the shelter.
      { f: 0, x: 15.6, z: 1.0, y: rampY(15.6) },
      { f: B.collapse - 6, x: 12.3, z: 1.0, y: rampY(12.3) },
      { f: B.collapse + 8, x: 12.1, z: 1.0, y: rampY(12.1) },
      { f: B.collapse + 44, x: SH.right, z: 1.0, y: 0 },
      { f: S.shelterA + 12, x: 2.6, z: 0.7 },
      { f: S.shelterA + 60, x: -3.8, z: -0.95, cut: true },
      { f: lineStart("a3") - 4, x: 2.2, z: -0.3, cut: true },
      { f: B.shaft + 8, x: SH.vent[0] - 0.05, z: SH.vent[1] + 0.25 },
      { f: lineStart("a4") - 4, x: -0.75, z: 0.75, cut: true },
      { f: S.found, x: -0.6, z: 0.65, cut: true },
      { f: B.grinding + 2, x: -0.6, z: 0.65 },
      { f: B.bursts - 16, x: 0.7, z: 0.9 },
      { f: B.bursts + 1, x: 0.7, z: 0.9 },
      { f: B.bursts + 9, x: 0.35, z: 0.7 },
      { f: B.paint - 26, x: 0.35, z: 0.7 },
      { f: B.paint - 4, x: PX - 0.62, z: FACE - 0.42 },
      { f: S.life, x: PX - 0.62, z: FACE - 0.42, cut: true },
      { f: S.person, x: 0.3, z: 0.55, cut: true },
      { f: S.breakthrough, x: AT_SHAFT.hero[0], z: AT_SHAFT.hero[1], cut: true },
      { f: B.breaks + 30, x: 5.8, z: 0.95, cut: true },
      { f: B.breaks + 32, x: 5.8, z: 0.95 },
      { f: B.capsule - 6, x: 0.1, z: 0.95 },
      { f: S.phoenix, x: W, z: CUT, cut: true },
      ...rideKeys(ARRIVALS[1], [W + 3.6, CUT - 1.7]),
    ],
    yaws: [
      [0, FACE_TO.left],
      [B.collapse + 5, 1.0],
      [B.collapse + 18, FACE_TO.left],
      [S.shelterA + 12, FACE_TO.left],
      [S.shelterA + 34, 0.3],
      [S.shelterA + 60, -2.3],
      [B.nobody - 2, 0.5],
      [lineStart("a3") - 4, FACE_TO.right],
      [B.shaft + 8, FACE_TO.right],
      [B.shaft + 14, FACE_TO.back + 0.4],
      [B.never + 14, FACE_TO.camera - 0.5],
      [lineStart("a4") - 4, -1.0],
      [S.found, -0.6],
      [B.grinding + 12, 0.7],
      [B.bursts + 9, 0.9],
      [B.paint - 4, FACE_TO.right],
      [S.life, FACE_TO.right],
      [TUBE.caught + 16, 0.5],
      [S.person, FACE_TO.camera],
      [S.breakthrough, toShaft(AT_SHAFT.hero)],
      [B.breaks + 30, FACE_TO.left],
      [B.capsule - 6, FACE_TO.left],
      [B.capsule + 4, FACE_TO.camera],
      [S.phoenix, FACE_TO.camera],
      ...rideYaws(ARRIVALS[1]),
    ],
    act: [
      [0, {}],
      [B.collapse, { stance: "crouch" }],
      [B.collapse + 9, {}],
      [S.shelterA + 14, { stance: "crouch" }],
      [S.shelterA + 40, {}],
      [B.nobody + 2, lookUp(0.75)],
      [lineStart("a3") - 4, {}],
      [B.shaft + 14, lookUp(1.0)],
      [B.never + 8, lookUp(-0.35)],
      [lineStart("a4") - 4, sitOn(0.2, "knees")],
      [B.cracker + 8, sitOn(0.2, "eat")],
      [S.found, sitOn(0.2, "knees")],
      [B.grinding + 2, lookUp(0.6)],
      [B.bursts + 2, lookUp(0.3)],
      [B.paint - 2, arms("reach")],
      [B.tape - 4, arms("hold")],
      [B.note + 2, arms("reach")],
      [B.ride + 4, lookUp(0.9)],
      [S.life, lookUp(0.8)],
      [TUBE.out - 12, { arms: "reach", aimPitch: 0.5 }],
      [TUBE.caught, arms("hold")],
      [S.person, {}],
      [S.breakthrough, lookUp(0.75)],
      [B.breaks + 8, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
      [S.phoenix, {}],
      [B.climb - 2, lookUp(-0.5)],
      [ARRIVALS[1] + 46, arms("wave")],
    ],
    place: belowUntil(S.phoenix),
    ride: [
      [S.phoenix, S.night],
      [ARRIVALS[1] - 30, ARRIVALS[1] + 4],
    ],
    hidden: (f) => f >= S.night && f < ARRIVALS[1] - 12,
  },
  foreman: {
    keys: [
      { f: 0, x: -1.7, z: -0.2 },
      { f: lineStart("a4") - 4, x: SH.crate[0], z: SH.crate[1] - 0.6, cut: true },
      { f: S.found, x: -3.4, z: BENCH, cut: true },
      { f: B.grinding + 4, x: -3.4, z: BENCH + 0.2 },
      { f: B.bursts - 10, x: AT_PROBE.foreman[0], z: AT_PROBE.foreman[1] },
      { f: S.breakthrough, x: AT_SHAFT.foreman[0], z: AT_SHAFT.foreman[1], cut: true },
      ...rideKeys(ARRIVALS[4], [W + 1.6, CUT - 0.55]),
    ],
    yaws: [
      [0, toMouth(-1.7, -0.2)],
      [S.shelterA + 50, 0.4],
      [lineStart("a4") - 4, FACE_TO.camera],
      [S.found, FACE_TO.camera],
      [B.grinding + 14, 1.2],
      [B.bursts - 10, toProbe(AT_PROBE.foreman)],
      [S.breakthrough, toShaft(AT_SHAFT.foreman)],
      ...rideYaws(ARRIVALS[4]),
    ],
    act: [
      [0, {}],
      [B.splits - 4, arms("hold")],
      [B.cracker + 12, arms("cross")],
      [S.found, sitOn(0.46, "knees")],
      [B.grinding + 4, lookUp(0.5)],
      [B.bursts + 2, lookUp(0.2)],
      [S.life, arms("cross")],
      [S.breakthrough, lookUp(0.75)],
      [B.breaks + 10, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
      [ARRIVALS[4] + 46, arms("wave")],
    ],
    place: belowUntil(S.night),
    ride: [[ARRIVALS[4] - 30, ARRIVALS[4] + 4]],
    hidden: (f) => f >= S.night && f < ARRIVALS[4] - 12,
    glasses: (f) => f >= S.night,
  },
  m1: {
    keys: [
      { f: 0, x: -3.3, z: -0.85 },
      { f: lineStart("a4") - 4, x: -3.35, z: BENCH, cut: true },
      { f: S.found, x: -2.2, z: BENCH, cut: true },
      { f: B.grinding + 6, x: -2.2, z: BENCH + 0.2 },
      { f: B.bursts - 12, x: AT_PROBE.m1[0], z: AT_PROBE.m1[1] },
      { f: S.breakthrough, x: AT_SHAFT.m1[0], z: AT_SHAFT.m1[1], cut: true },
      ...rideKeys(ARRIVALS[0], [W + 2.6, CUT - 0.9], B.eyes + 10 - (ARRIVALS[0] + 16)),
    ],
    yaws: [
      [0, toMouth(-3.3, -0.85)],
      [S.shelterA + 50, -0.3],
      [lineStart("a4") - 4, FACE_TO.camera],
      [S.found, FACE_TO.camera],
      [B.grinding + 14, 1.4],
      [B.bursts - 12, toProbe(AT_PROBE.m1)],
      [S.breakthrough, toShaft(AT_SHAFT.m1)],
      [ARRIVALS[0] - 30, FACE_TO.camera],
      [ARRIVALS[0] + 4, FACE_TO.right],
      [ARRIVALS[0] + 18, FACE_TO.camera - 0.3],
    ],
    act: [
      [0, {}],
      [lineStart("a4") - 4, sitOn(0.46, "knees")],
      [B.cracker + 4, sitOn(0.46, "eat")],
      [S.found, sitOn(0.46, "knees")],
      [B.grinding + 6, lookUp(0.5)],
      [B.bursts + 4, lookUp(0.2)],
      [S.life, lookUp(0.5)],
      [S.person, {}],
      [S.breakthrough, lookUp(0.8)],
      [B.breaks + 6, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
      [B.sun - 4, arms("shade")],
      [B.eyes + 20, {}],
    ],
    place: belowUntil(S.night),
    ride: [[S.night, ARRIVALS[0] + 4]],
    hidden: (f) => f >= S.night && f < B.rises - 36,
    glasses: (f) => f >= S.night,
  },
  m2: {
    keys: [
      { f: 0, x: 2.3, z: -0.55 },
      { f: lineStart("a4") - 4, x: -3.1, z: 0.8, cut: true },
      { f: S.found, x: 1.0, z: 0.3, cut: true },
      { f: B.grinding + 8, x: 1.0, z: 0.3 },
      { f: B.bursts - 12, x: AT_PROBE.m2[0], z: AT_PROBE.m2[1] },
      { f: S.breakthrough, x: AT_SHAFT.m2[0], z: AT_SHAFT.m2[1], cut: true },
      ...rideKeys(ARRIVALS[2], [W + 4.6, CUT - 1.1]),
    ],
    yaws: [
      [0, toMouth(2.3, -0.55)],
      [S.shelterA + 50, -0.6],
      [lineStart("a4") - 4, 1.3],
      [S.found, -0.4],
      [B.grinding + 16, 0.4],
      [B.bursts - 12, toProbe(AT_PROBE.m2)],
      [S.breakthrough, toShaft(AT_SHAFT.m2)],
      ...rideYaws(ARRIVALS[2]),
    ],
    act: [
      [0, {}],
      [lineStart("a4") - 4, sitOn(0.2, "knees")],
      [B.cracker + 10, sitOn(0.2, "eat")],
      [S.found, sitOn(0.2, "knees")],
      [B.grinding + 8, lookUp(0.5)],
      [B.bursts + 3, lookUp(0.2)],
      [S.life, lookUp(0.5)],
      [S.person, arms("cross")],
      [S.breakthrough, lookUp(0.8)],
      [B.breaks + 12, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
      [ARRIVALS[2] + 46, arms("cheer")],
    ],
    place: belowUntil(S.night),
    ride: [[ARRIVALS[2] - 30, ARRIVALS[2] + 4]],
    hidden: (f) => f >= S.night && f < ARRIVALS[2] - 12,
    glasses: (f) => f >= S.night,
  },
  m3: {
    keys: [
      { f: 0, x: -0.5, z: -1.25 },
      { f: lineStart("a4") - 4, x: -1.35, z: BENCH, cut: true },
      { f: S.found, x: 1.9, z: BENCH, cut: true },
      { f: B.grinding + 10, x: 1.9, z: BENCH + 0.2 },
      { f: B.bursts - 12, x: AT_PROBE.m3[0], z: AT_PROBE.m3[1] },
      { f: S.breakthrough, x: AT_SHAFT.m3[0], z: AT_SHAFT.m3[1], cut: true },
    ],
    yaws: [
      [0, toMouth(-0.5, -1.25)],
      [S.shelterA + 50, 0.2],
      [lineStart("a4") - 4, FACE_TO.camera],
      [S.found, FACE_TO.camera],
      [B.grinding + 16, 0.2],
      [B.bursts - 12, toProbe(AT_PROBE.m3)],
      [S.breakthrough, toShaft(AT_SHAFT.m3)],
    ],
    act: [
      [0, {}],
      [lineStart("a4") - 4, sitOn(0.46, "knees")],
      [B.cracker + 14, sitOn(0.46, "eat")],
      [S.found, sitOn(0.46, "knees")],
      [B.grinding + 10, lookUp(0.5)],
      [B.bursts + 5, lookUp(0.2)],
      [S.life, arms("cross")],
      [S.breakthrough, lookUp(0.8)],
      [B.breaks + 9, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
    ],
    place: () => "below",
    // The rest of the 33 go up off screen.
    hidden: (f) => f >= S.night,
  },
  m4: {
    keys: [
      { f: 0, x: 3.5, z: 0.15 },
      { f: lineStart("a4") - 4, x: -0.25, z: -0.55, cut: true },
      { f: S.found, x: 2.9, z: -0.2, cut: true },
      { f: B.grinding + 6, x: 2.9, z: -0.2 },
      { f: B.bursts - 10, x: AT_PROBE.m4[0], z: AT_PROBE.m4[1] },
      { f: S.breakthrough, x: AT_SHAFT.m4[0], z: AT_SHAFT.m4[1], cut: true },
      ...rideKeys(ARRIVALS[3], [W + 5.5, CUT - 2.1]),
    ],
    yaws: [
      [0, toMouth(3.5, 0.15)],
      [S.shelterA + 50, -0.9],
      [lineStart("a4") - 4, -0.7],
      [S.found, -0.5],
      [B.grinding + 16, -0.3],
      [B.bursts - 10, toProbe(AT_PROBE.m4)],
      [S.breakthrough, toShaft(AT_SHAFT.m4)],
      ...rideYaws(ARRIVALS[3]),
    ],
    act: [
      [0, {}],
      [lineStart("a4") - 4, arms("cross")],
      [B.cracker + 6, arms("eat")],
      [S.found, sitOn(0.2, "knees")],
      [B.grinding + 6, lookUp(0.5)],
      [B.bursts + 4, lookUp(0.2)],
      [S.life, lookUp(0.5)],
      [S.person, {}],
      [S.breakthrough, lookUp(0.8)],
      [B.breaks + 11, { arms: "cheer", aimPitch: 0.4 }],
      [B.breaks + 30, {}],
      [ARRIVALS[3] + 46, arms("wave")],
    ],
    place: belowUntil(S.night),
    ride: [[ARRIVALS[3] - 30, ARRIVALS[3] + 4]],
    hidden: (f) => f >= S.night && f < ARRIVALS[3] - 12,
    glasses: (f) => f >= S.night,
  },
  // Rescuers at the camp: at the first probe rig, then at the hole that hit, then the pithead.
  r1: {
    keys: [
      { f: 0, x: PROBES[0].top + 1.5, z: CUT - 1.2 },
      { f: S.found, x: PX + 0.8, z: CUT - 0.75, cut: true },
      { f: B.weAreFine - 2, x: PX + 0.62, z: CUT - 0.5 },
      { f: B.weAreFine + 22, x: PX + 1.4, z: CUT - 0.3 },
      { f: S.life, x: PX + 0.66, z: CUT - 0.45, cut: true },
      { f: S.race, x: W + 2.0, z: CUT - 1.6, cut: true },
      { f: S.phoenix, x: W - 1.3, z: CUT - 0.4, cut: true },
      { f: S.night, x: W + 2.1, z: CUT - 1.5, cut: true },
    ],
    yaws: [
      [0, -1.1],
      [S.found, FACE_TO.left],
      [B.weAreFine + 10, FACE_TO.left],
      [B.weAreFine + 24, FACE_TO.camera],
      [S.life, FACE_TO.left],
      [S.race, -0.4],
      [S.phoenix, 0.9],
      [S.night, -0.9],
    ],
    act: [
      [0, arms("cross")],
      [S.found, {}],
      [B.weAreFine - 12, arms("reach")],
      [B.weAreFine + 4, arms("hold")],
      [B.noteThirtyThree - 4, arms("cheer")],
      [S.life, arms("reach")],
      [TUBE.drop + 8, lookUp(-0.4)],
      [S.race, arms("cross")],
      [S.night, {}],
      [B.ground + 10, arms("cheer")],
      [B.ground + 50, {}],
      [ARRIVALS[1] + 8, arms("cheer")],
      [ARRIVALS[1] + 40, {}],
      [ARRIVALS[4] + 8, arms("cheer")],
    ],
    place: () => "camp",
  },
  r2: {
    keys: [
      { f: 0, x: PROBES[0].top - 1.6, z: CUT - 1.0 },
      { f: S.found, x: PX + 2.4, z: CUT - 1.2, cut: true },
      { f: S.race, x: W + 3.6, z: CUT - 1.9, cut: true },
      { f: S.phoenix, x: W + 1.4, z: CUT - 0.9, cut: true },
      { f: S.night, x: W - 1.2, z: CUT - 0.3, cut: true },
    ],
    yaws: [
      [0, 1.0],
      [S.found, -1.0],
      [S.race, -0.8],
      [S.phoenix, -0.7],
      [S.night, 0.7],
    ],
    act: [
      [0, {}],
      [B.bore, lookUp(-0.3)],
      [S.found, {}],
      [B.weAreFine + 30, arms("cheer")],
      [S.life, {}],
      [S.night, {}],
      [B.ground + 14, arms("cheer")],
      [B.ground + 54, {}],
      [ARRIVALS[2] + 8, arms("cheer")],
      [ARRIVALS[2] + 40, {}],
      [ARRIVALS[4] + 10, arms("cheer")],
    ],
    place: () => "camp",
  },
};

export const CAST_ORDER: CastId[] = ["hero", "foreman", "m1", "m2", "m3", "m4", "r1", "r2"];

const MOVERS = {} as Record<CastId, Mover>;
const ACTS = {} as Record<CastId, (f: number) => Partial<PaladinInput>>;
CAST_ORDER.forEach((id) => {
  MOVERS[id] = mover(SCRIPTS[id].keys, SCRIPTS[id].yaws);
  ACTS[id] = acting(SCRIPTS[id].act);
});

/** Feet position, including the camp's height, the capsule ride and the drop out of the hatch (d1). */
export const actorPos = (id: CastId, f: number): V3 => {
  const p = MOVERS[id].pos(f);
  const base = SCRIPTS[id].place(f) === "camp" ? TOP : 0;
  const ride = SCRIPTS[id].ride?.find(([a, b]) => f >= a && f < b);
  if (!ride) return [p[0], p[1] + base, p[2]];
  let y = capsuleY(f) + CAP.cabin0;
  if (f < S.night) y -= 1.15 * easeInOut(progress(f, [B.climb - 10, B.climb + 22]));
  return [W, TOP + y, CUT];
};
export const actorYaw = (id: CastId, f: number): number => MOVERS[id].yaw(f);
export const actorAct = (id: CastId, f: number): Partial<PaladinInput> => ACTS[id](f);
export const actorPlace = (id: CastId, f: number): Place => SCRIPTS[id].place(f);
export const actorVisible = (id: CastId, f: number): boolean => !(SCRIPTS[id].hidden?.(f) ?? false);
export const actorGlasses = (id: CastId, f: number): boolean => SCRIPTS[id].glasses?.(f) ?? false;

/** Simulation restarts: every shot boundary and every cut in an actor's path (all camera cuts). */
export const actorResets = (id: CastId): number[] => {
  const shots = (Object.keys(SHOTS) as Array<keyof typeof SHOTS>).map((k) => SHOTS[k]);
  const cuts = SCRIPTS[id].keys.filter((k) => k.cut).map((k) => k.f);
  return shots
    .concat(cuts)
    .filter((f, i, all) => all.indexOf(f) === i)
    .sort((x, y) => x - y);
};
