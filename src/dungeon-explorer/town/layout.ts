// The town above the dungeon, as plain data (world metres; x east, z south, y up): one walled
// plot with the Adventurers' Guild along its south side and Guild Street in front of it.
//
// The guild is one building of three parts under one roof, open to each other through arches:
// - the great hall in the middle: the open entrance from the street, the guild representative's
//   desk (quests) and, at the back, the teleporter dais that sends him down into the dungeon;
// - the Wayfarer's Rest on the left (west): the common room with the bar and the hearth, a stair up
//   to a gallery and the three rooms to rent;
// - the arena on the right (east): a sand ring behind a fence where players may fight each other
//   (and lose nothing: a knockout only puts him back at the gate).
// It is built like a temple of the old south: a pedimented portico of tall columns over the
// entrance, a long colonnade (the stoa) along the rest of the front with the merchants' stalls in
// its shade, colonnades down the great hall under a coffered ceiling. A wall closes the street on
// its other three sides, so nobody walks off the edge.
//
// Walking: the floor is a set of regions, each flat, a ramp (the stairs) or a disc (the dais). He
// stands on the highest region under him within a step of his feet, and a move with no floor in
// reach is refused, so gallery edges and stair sides hold him like walls do. Walls and furniture
// are boxes with a height range (a body only bumps the ones at its own storey). The camera keeps
// inside the open-air boxes and out of every solid one.
import type { StallPlan } from "../dungeon/market";
import { CELL_M } from "../dungeon/view";

export const STEP_UP = 0.5;
export const STEP_DOWN = 0.62;
export const BODY_RADIUS = 0.3;

/** Storey heights (m): the tavern's upper floor boards, the slab under it, its ceiling. */
export const UPPER_Y = 3.6;
export const SLAB_Y = 3.4;
export const TAVERN_TOP = 7.4;
/** The great hall's and the arena's ceilings, and the street's open sky (the camera's lid). */
export const HALL_TOP = 12;
export const ARENA_TOP = 10;
const SKY = 40;
/** Outer wall thickness, the partitions between the three parts, the border wall's height. */
export const WT = 0.6;
const PT = 0.3;
export const BORDER_H = 5.5;

// ---- Footprints --------------------------------------------------------------------------------

/** The whole plot inside the border wall. */
export const SITE = { x0: -32, x1: 32, z0: -30, z1: 26 };
/** The guild building (inner faces of its outer walls; the front wall stands at z -WT..0). */
export const GUILD = { x0: -32, x1: 32, z0: 0, z1: 26 };
/** Guild Street in front of it. */
export const STREET = { x0: -32, x1: 32, z0: -30, z1: -WT };
/** The three parts (inner faces; the partitions stand at x = ±10). */
export const TAVERN = { x0: -32, x1: -10 - PT, z0: 0, z1: 26 };
export const HALL = { x0: -10 + PT, x1: 10 - PT, z0: 0, z1: 26 };
export const ARENA_WING = { x0: 10 + PT, x1: 32, z0: 0, z1: 26 };
/** The open entrance in the front wall, and the arches from the hall into either wing. */
export const ENTRANCE = { x0: -2.6, x1: 2.6, top: 5.6 };
export const SIDE_ARCH = { z0: 8, z1: 14, top: 4.8 };

/** The tavern's upper storey starts here (z): the gallery, then the rooms from ROOMS_Z. */
export const GALLERY_Z = 15.5;
export const ROOMS_Z = 18;
/** The stair along the tavern's west wall: from the floor at z0 to the gallery at z1. */
export const STAIR = { x0: -32, x1: -30.6, z0: 7.3, z1: GALLERY_Z };
/** The bar counter (along z, facing west into the room; the barkeep works on its east side). */
export const BAR = { x0: -14.6, x1: -14.0, z0: 1.2, z1: 6.6 };

/** The guild representative's desk in the hall, and where he stands behind it. */
export const DESK = { x0: -3.2, x1: 3.2, z0: 9.6, z1: 10.2 };
export const CLERK = { x: 0, z: 11.1 };
/** Where E reaches the desk from (in front of it), and how near is near enough (m). */
export const DESK_SPOT = { x: 0, z: 8.9, reach: 2.4 };
/** The quest board beside the desk (its face looks north). */
export const QUEST_BOARD = { x: 5.4, z: 10.2 };

/** The teleporter dais at the back of the hall. */
export const DAIS = { x: 0, z: 20.2, r: 2.8, step: 0.5, h: 0.36 };
/** How close to the dais centre E sends him down (m). */
export const DAIS_REACH = 2.4;

/** The arena's sand ring (inside the fence) and its gate on the west side (z range). */
export const RING = { x0: 14.5, x1: 30, z0: 5, z1: 21 };
export const RING_GATE = { z0: 11.5, z1: 14.5 };
/** Inside the ring (fighting ground): players may strike each other only here. */
export const inArena = (x: number, z: number) => x > RING.x0 + 0.15 && x < RING.x1 - 0.15 && z > RING.z0 + 0.15 && z < RING.z1 - 0.15;

/** The fountain in the middle of the street. */
export const FOUNTAIN = { x: 0, z: -20, r: 2.1 };

// ---- The temple front ----------------------------------------------------------------------------

/** Stylobate height: the stoa and the portico stand on one low marble step above the street. */
export const STYLOBATE = 0.15;
/** The stoa: a colonnade along the wings' fronts (column line z, height to the top of the capitals). */
export const STOA = { z: -5.4, back: -WT, front: -6.1, h: 5.9, top: TAVERN_TOP };
/** The portico over the entrance: six columns across its front, two more down each side, a pediment. */
export const PORTICO = { x0: -9.4, x1: 9.4, z: -10.6, front: -11.4, h: 9.4, top: 10.9, apex: 13.9 };

export interface Column {
  x: number;
  z: number;
  /** Radius at the foot, and the height from its foot to the top of its capital. */
  r: number;
  h: number;
  y: number;
}

const STOA_XS = [11.6, 15.3, 19.0, 22.7, 26.4, 30.1];
/** Every column: the stoa's, the portico's, and the great hall's two colonnades inside. */
export const COLUMNS: Column[] = [
  ...STOA_XS.reduce<Column[]>((a, x) => a.concat([{ x: -x, z: -5.4, r: 0.36, h: 5.9, y: STYLOBATE }, { x, z: -5.4, r: 0.36, h: 5.9, y: STYLOBATE }]), []),
  ...[-8.4, -5.04, -1.68, 1.68, 5.04, 8.4].map((x) => ({ x, z: -10.6, r: 0.5, h: 9.4, y: STYLOBATE })),
  ...[-7.2, -3.8].reduce<Column[]>((a, z) => a.concat([{ x: -8.4, z, r: 0.5, h: 9.4, y: STYLOBATE }, { x: 8.4, z, r: 0.5, h: 9.4, y: STYLOBATE }]), []),
  ...[2.6, 6.2, 15.8, 19.4, 23.0].reduce<Column[]>((a, z) => a.concat([{ x: -7.2, z, r: 0.5, h: 8.4, y: 0 }, { x: 7.2, z, r: 0.5, h: 8.4, y: 0 }]), []),
];
/** Statues on plinths flanking the portico steps and down the street. */
export const STATUES: Array<{ x: number; z: number; yaw: number }> = [
  { x: -11.4, z: -10.2, yaw: Math.PI },
  { x: 11.4, z: -10.2, yaw: Math.PI },
  { x: -20, z: -17, yaw: Math.PI / 2 },
  { x: 20, z: -17, yaw: -Math.PI / 2 },
];

// ---- Rooms to rent -----------------------------------------------------------------------------

export interface RentRoom {
  name: string;
  rent: number;
  /** Floor of the room (m). */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** The doorway in the gallery wall (x range); the leaf hangs on its west post. */
  door: { x0: number; x1: number };
  /** The three chests, against the room's east wall, facing west (centre, m). */
  chests: Array<{ x: number; z: number }>;
  bed: { x: number; z: number };
}

const ROOM_EDGES: Array<[number, number]> = [
  [TAVERN.x0, -25],
  [-24.8, -17.6],
  [-17.4, TAVERN.x1],
];
/** Rent for rooms I, II and III (paid once; the room is his for good). */
export const ROOM_RENT = [100, 250, 450];
export const CHESTS_PER_ROOM = 3;

export const ROOMS: RentRoom[] = ROOM_EDGES.map(([x0, x1], i) => {
  const mid = (x0 + x1) / 2;
  return {
    name: `Room ${["I", "II", "III"][i]}`,
    rent: ROOM_RENT[i],
    x0,
    x1,
    z0: ROOMS_Z,
    z1: TAVERN.z1,
    door: { x0: mid - 0.55, x1: mid + 0.55 },
    chests: [19.4, 20.6, 21.8].map((z) => ({ x: x1 - 0.36, z })),
    bed: { x: x0 + 1.05, z: TAVERN.z1 - 1.1 },
  };
});

// ---- The market stalls (in the market's own frame: cells, with the grid's origin at 0) ---------

/** Stalls against the guild's front wall, either side of the entrance, facing the street (x, m). */
export const STALL_XS = [-8, 8, -14, 14, -20];

export function townStalls(): StallPlan[] {
  return STALL_XS.map((x, i) => ({
    merchant: i,
    x: x / CELL_M,
    z: -WT / CELL_M,
    // Out of the wall toward the street (north), and along it = the normal turned a quarter left.
    nx: 0,
    nz: -1,
    tx: 1,
    tz: 0,
    floor: STYLOBATE / CELL_M,
  }));
}

// ---- Floor regions -----------------------------------------------------------------------------

export type Region =
  | { kind: "flat"; x0: number; x1: number; z0: number; z1: number; y: number }
  /** Rises from y0 at z0 to y1 at z1. */
  | { kind: "rampZ"; x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
  | { kind: "disc"; x: number; z: number; r: number; y: number };

const flat = (x0: number, x1: number, z0: number, z1: number, y = 0): Region => ({ kind: "flat", x0, x1, z0, z1, y });

export const REGIONS: Region[] = [
  // The street, the step up onto the stoa and the portico, and the entrance through the front wall.
  flat(STREET.x0, STREET.x1, STREET.z0, STREET.z1),
  flat(STREET.x0, STREET.x1, STOA.front - 0.3, STREET.z1, STYLOBATE),
  flat(PORTICO.x0, PORTICO.x1, PORTICO.front - 0.5, STOA.front - 0.3, STYLOBATE),
  flat(ENTRANCE.x0, ENTRANCE.x1, -WT, 0),
  // The great hall, the dais and its step, and the arches either side.
  flat(HALL.x0, HALL.x1, HALL.z0, HALL.z1),
  { kind: "disc", x: DAIS.x, z: DAIS.z, r: DAIS.r + DAIS.step, y: DAIS.h / 2 },
  { kind: "disc", x: DAIS.x, z: DAIS.z, r: DAIS.r, y: DAIS.h },
  flat(TAVERN.x1, HALL.x0, SIDE_ARCH.z0, SIDE_ARCH.z1),
  flat(HALL.x1, ARENA_WING.x0, SIDE_ARCH.z0, SIDE_ARCH.z1),
  // The tavern's ground floor (round the stair foot), the stair and the upper storey.
  flat(TAVERN.x0, STAIR.x1, TAVERN.z0, STAIR.z0),
  flat(TAVERN.x0, STAIR.x1, STAIR.z1, TAVERN.z1),
  flat(STAIR.x1, TAVERN.x1, TAVERN.z0, TAVERN.z1),
  { kind: "rampZ", x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.z0, z1: STAIR.z1, y0: 0, y1: UPPER_Y },
  flat(TAVERN.x0, TAVERN.x1, GALLERY_Z, ROOMS_Z, UPPER_Y),
  ...ROOMS.map((r) => flat(r.x0, r.x1, r.z0, r.z1, UPPER_Y)),
  // The arena wing.
  flat(ARENA_WING.x0, ARENA_WING.x1, ARENA_WING.z0, ARENA_WING.z1),
];

function regionY(r: Region, x: number, z: number): number | null {
  if (r.kind === "disc") return Math.hypot(x - r.x, z - r.z) <= r.r ? r.y : null;
  if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) return null;
  if (r.kind === "flat") return r.y;
  return r.y0 + ((r.y1 - r.y0) * (z - r.z0)) / (r.z1 - r.z0);
}

/** The floor he stands on at (x, z) with his feet at `y`, or null when there is none in reach. */
export function groundAt(x: number, z: number, y: number): number | null {
  let best: number | null = null;
  for (const r of REGIONS) {
    const h = regionY(r, x, z);
    if (h === null || h > y + STEP_UP || h < y - STEP_DOWN) continue;
    if (best === null || h > best) best = h;
  }
  return best;
}

// ---- Solids ------------------------------------------------------------------------------------

export interface Solid {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  /** Bodies bump it (false: the camera keeps out, feet walk over it, e.g. the stair's treads). */
  walk: boolean;
}

const S = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, walk = true): Solid => ({ x0, x1, y0, y1, z0, z1, walk });

/** A wall along x (from x0 to x1, z0..z1 thick) with gaps cut out (each open from the floor to `top`). */
function wallX(z0: number, z1: number, x0: number, x1: number, y0: number, y1: number, gaps: Array<{ a: number; b: number; top: number }> = []): Solid[] {
  const out: Solid[] = [];
  let at = x0;
  for (const g of gaps.slice().sort((p, q) => p.a - q.a)) {
    if (g.a > at) out.push(S(at, g.a, z0, z1, y0, y1));
    if (g.top < y1) out.push(S(g.a, g.b, z0, z1, g.top, y1));
    at = g.b;
  }
  if (at < x1) out.push(S(at, x1, z0, z1, y0, y1));
  return out;
}
/** The same along z (x0..x1 thick, from z0 to z1). */
function wallZ(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, gaps: Array<{ a: number; b: number; top: number }> = []): Solid[] {
  return wallX(x0, x1, z0, z1, y0, y1, gaps).map((s) => S(s.z0, s.z1, s.x0, s.x1, s.y0, s.y1));
}

/** Which part a structure box belongs to (the 3D view picks its stone, plaster or wood by it). */
export type Part = "border" | "tavern" | "hall" | "arena" | "inner" | "ceiling" | "slab" | "rooms" | "rail" | "stair";
export interface Wall extends Solid {
  part: Part;
}
const P = (part: Part, list: Solid[]): Wall[] => list.map((s) => ({ ...s, part }));

/** Walls, slabs, partitions, stairs and railings (the 3D view builds them from this list too). */
export const STRUCTURE: Wall[] = [
  // The border wall round the street (the guild's own walls close the south side).
  ...P("border", [
    S(SITE.x0 - 1.2, SITE.x0, SITE.z0 - 1.2, -WT, 0, BORDER_H),
    S(SITE.x1, SITE.x1 + 1.2, SITE.z0 - 1.2, -WT, 0, BORDER_H),
    S(SITE.x0, SITE.x1, SITE.z0 - 1.2, SITE.z0, 0, BORDER_H),
  ]),
  // The front wall: the tavern's stretch, the hall's with the entrance, the arena's.
  ...P("tavern", wallX(-WT, 0, GUILD.x0 - WT, -10 - PT, 0, TAVERN_TOP)),
  ...P("hall", wallX(-WT, 0, -10 - PT, 10 + PT, 0, HALL_TOP, [{ a: ENTRANCE.x0, b: ENTRANCE.x1, top: ENTRANCE.top }])),
  ...P("arena", wallX(-WT, 0, 10 + PT, GUILD.x1 + WT, 0, ARENA_TOP)),
  // The back wall, the same three stretches.
  ...P("tavern", [S(GUILD.x0 - WT, -10 - PT, GUILD.z1, GUILD.z1 + WT, 0, TAVERN_TOP)]),
  ...P("hall", [S(-10 - PT, 10 + PT, GUILD.z1, GUILD.z1 + WT, 0, HALL_TOP)]),
  ...P("arena", [S(10 + PT, GUILD.x1 + WT, GUILD.z1, GUILD.z1 + WT, 0, ARENA_TOP)]),
  // The end walls.
  ...P("tavern", [S(GUILD.x0 - WT, GUILD.x0, 0, GUILD.z1, 0, TAVERN_TOP)]),
  ...P("arena", [S(GUILD.x1, GUILD.x1 + WT, 0, GUILD.z1, 0, ARENA_TOP)]),
  // The partitions, each with its arch, up to the hall's ceiling.
  ...P("inner", wallZ(-10 - PT, -10 + PT, 0, GUILD.z1, 0, HALL_TOP, [{ a: SIDE_ARCH.z0, b: SIDE_ARCH.z1, top: SIDE_ARCH.top }])),
  ...P("inner", wallZ(10 - PT, 10 + PT, 0, GUILD.z1, 0, HALL_TOP, [{ a: SIDE_ARCH.z0, b: SIDE_ARCH.z1, top: SIDE_ARCH.top }])),
  // Ceilings (the roofs over them are drawn, not solid: nobody gets up there).
  ...P("ceiling", [
    S(GUILD.x0 - WT, -10 - PT, -WT, GUILD.z1 + WT, TAVERN_TOP, TAVERN_TOP + 0.3),
    S(-10 - PT, 10 + PT, -WT, GUILD.z1 + WT, HALL_TOP, HALL_TOP + 0.4),
    S(10 + PT, GUILD.x1 + WT, -WT, GUILD.z1 + WT, ARENA_TOP, ARENA_TOP + 0.3),
  ]),
  // The tavern's upper floor slab (the stair comes up beside it, at the west wall).
  ...P("slab", [S(TAVERN.x0, TAVERN.x1, GALLERY_Z, TAVERN.z1, SLAB_Y, UPPER_Y, false)]),
  // Upstairs: the rooms' front wall with their doorways, and the walls between the rooms.
  ...P("rooms", wallX(ROOMS_Z, ROOMS_Z + 0.2, TAVERN.x0, TAVERN.x1, UPPER_Y, TAVERN_TOP, ROOMS.map((r) => ({ a: r.door.x0, b: r.door.x1, top: UPPER_Y + 2.25 })))),
  ...P("rooms", [S(-25, -24.8, ROOMS_Z + 0.2, TAVERN.z1, UPPER_Y, TAVERN_TOP), S(-17.6, -17.4, ROOMS_Z + 0.2, TAVERN.z1, UPPER_Y, TAVERN_TOP)]),
  // Gallery and stair railings (waist high).
  ...P("rail", [
    S(STAIR.x1, TAVERN.x1, GALLERY_Z - 0.06, GALLERY_Z + 0.06, UPPER_Y, UPPER_Y + 1.0),
    S(STAIR.x1 - 0.06, STAIR.x1 + 0.06, STAIR.z0 + 0.6, GALLERY_Z, 0.9, UPPER_Y + 1.0),
  ]),
  // The stair's body, as the treads (feet walk the ramp; the camera keeps out).
  ...P(
    "stair",
    Array.from({ length: 20 }, (_, i) => {
      const z0 = STAIR.z0 + ((STAIR.z1 - STAIR.z0) * i) / 20;
      const z1 = STAIR.z0 + ((STAIR.z1 - STAIR.z0) * (i + 1)) / 20;
      return S(STAIR.x0, STAIR.x1, z0, z1, 0, (UPPER_Y * (i + 1)) / 20 - 0.02, false);
    })
  ),
];


/** The arena fence: rails round the ring, open at its gate (boxes; bodies bump them). */
export const FENCE: Solid[] = [
  S(RING.x0 - 0.08, RING.x1 + 0.08, RING.z0 - 0.08, RING.z0 + 0.08, 0, 1.15),
  S(RING.x0 - 0.08, RING.x1 + 0.08, RING.z1 - 0.08, RING.z1 + 0.08, 0, 1.15),
  S(RING.x1 - 0.08, RING.x1 + 0.08, RING.z0, RING.z1, 0, 1.15),
  S(RING.x0 - 0.08, RING.x0 + 0.08, RING.z0, RING_GATE.z0, 0, 1.15),
  S(RING.x0 - 0.08, RING.x0 + 0.08, RING_GATE.z1, RING.z1, 0, 1.15),
];

/** Furniture and fittings that bodies bump (boxes; the 3D view places the models over them). */
export interface Furn {
  kind:
    | "table"
    | "barCounter"
    | "barBack"
    | "hearth"
    | "bed"
    | "chest"
    | "commode"
    | "statue"
    | "brazier"
    | "obelisk"
    | "desk"
    | "board"
    | "bench"
    | "rack"
    | "fountain"
    | "lamppost"
    | "barrels";
  x: number;
  z: number;
  /** Footprint half sizes (m) and height. */
  hx: number;
  hz: number;
  h: number;
  y?: number;
  yaw?: number;
  /** Extra: the room and chest index for chests. */
  room?: number;
  slot?: number;
}

/** Common-room tables: a table along x with a bench either side (z ± 1). */
export const TABLES: Array<{ x: number; z: number }> = [
  { x: -25.6, z: 4.2 },
  { x: -25.6, z: 10.4 },
  { x: -19.8, z: 4.2 },
  { x: -19.8, z: 10.4 },
  { x: -24.6, z: 21.2 },
  { x: -18.2, z: 21.2 },
];

/** Benches round the arena for those watching (along the north wall and the back wall). */
export const ARENA_BENCHES: Array<{ x: number; z: number; yaw: number }> = [
  ...[15.5, 19.5, 23.5, 27.5].map((x) => ({ x, z: 1.6, yaw: 0 })),
  ...[15.5, 19.5, 23.5, 27.5].map((x) => ({ x, z: 24.4, yaw: Math.PI })),
];

export const FURNITURE: Furn[] = [
  // The tavern.
  ...TABLES.map((t): Furn => ({ kind: "table", x: t.x, z: t.z, hx: 1.25, hz: 1.28, h: 0.9 })),
  { kind: "barCounter", x: (BAR.x0 + BAR.x1) / 2, z: (BAR.z0 + BAR.z1) / 2, hx: (BAR.x1 - BAR.x0) / 2, hz: (BAR.z1 - BAR.z0) / 2, h: 1.1 },
  { kind: "barBack", x: TAVERN.x1 - 0.45, z: 3.8, hx: 0.45, hz: 2.8, h: 2.2 },
  { kind: "hearth", x: TAVERN.x0 + 0.75, z: 3.3, hx: 0.75, hz: 1.3, h: 3.4 },
  { kind: "barrels", x: -12.2, z: 24.8, hx: 1.6, hz: 0.7, h: 1.1 },
  ...ROOMS.reduce<Furn[]>(
    (a, r, ri) =>
      a.concat([
        { kind: "bed", x: r.bed.x, z: r.bed.z, hx: 0.8, hz: 1.08, h: 1.1, y: UPPER_Y, room: ri },
        { kind: "commode", x: (r.x0 + r.x1) / 2 + 0.2, z: TAVERN.z1 - 0.35, hx: 0.62, hz: 0.32, h: 1.2, y: UPPER_Y, room: ri },
        ...r.chests.map((c, ci): Furn => ({ kind: "chest", x: c.x, z: c.z, hx: 0.3, hz: 0.5, h: 0.75, y: UPPER_Y, yaw: -Math.PI / 2, room: ri, slot: ci })),
      ]),
    []
  ),
  // The hall: the desk and the board, braziers by the dais, the obelisks round it.
  { kind: "desk", x: 0, z: (DESK.z0 + DESK.z1) / 2, hx: (DESK.x1 - DESK.x0) / 2, hz: (DESK.z1 - DESK.z0) / 2, h: 1.1 },
  { kind: "desk", x: DESK.x0 + 0.3, z: 11.1, hx: 0.3, hz: 0.9, h: 1.1 },
  { kind: "desk", x: DESK.x1 - 0.3, z: 11.1, hx: 0.3, hz: 0.9, h: 1.1 },
  { kind: "board", x: QUEST_BOARD.x, z: QUEST_BOARD.z, hx: 1.0, hz: 0.18, h: 2.4 },
  { kind: "brazier", x: -4.4, z: DAIS.z + 3.6, hx: 0.45, hz: 0.45, h: 1.3 },
  { kind: "brazier", x: 4.4, z: DAIS.z + 3.6, hx: 0.45, hz: 0.45, h: 1.3 },
  ...[0, 1, 2, 3].map((i): Furn => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return { kind: "obelisk", x: DAIS.x + Math.sin(a) * (DAIS.r + 1.5), z: DAIS.z + Math.cos(a) * (DAIS.r + 1.5), hx: 0.4, hz: 0.4, h: 3.2, yaw: a };
  }),
  // The arena: benches, weapon racks, braziers at the ring's corners.
  ...ARENA_BENCHES.map((b): Furn => ({ kind: "bench", x: b.x, z: b.z, hx: 0.95, hz: 0.3, h: 0.5, yaw: b.yaw })),
  { kind: "rack", x: ARENA_WING.x1 - 0.4, z: 9.5, hx: 0.35, hz: 1.2, h: 1.9 },
  { kind: "rack", x: ARENA_WING.x1 - 0.4, z: 16.5, hx: 0.35, hz: 1.2, h: 1.9 },
  ...[
    [RING.x0 - 0.9, RING.z0 - 0.9],
    [RING.x1 + 0.9, RING.z0 - 0.9],
    [RING.x0 - 0.9, RING.z1 + 0.9],
    [RING.x1 + 0.9, RING.z1 + 0.9],
  ].map(([x, z]): Furn => ({ kind: "brazier", x, z, hx: 0.45, hz: 0.45, h: 1.3 })),
  // The street: the fountain, and lamp posts down both sides.
  { kind: "fountain", x: FOUNTAIN.x, z: FOUNTAIN.z, hx: FOUNTAIN.r, hz: FOUNTAIN.r, h: 0.75 },
  ...[-26, -14, 14, 26].reduce<Furn[]>((a, x) => a.concat([{ kind: "lamppost", x, z: -9.5, hx: 0.18, hz: 0.18, h: 3.6 }, { kind: "lamppost", x, z: -25, hx: 0.18, hz: 0.18, h: 3.6 }]), []),
  ...STATUES.map((st): Furn => ({ kind: "statue", x: st.x, z: st.z, hx: 0.6, hz: 0.6, h: 3.2, yaw: st.yaw })),
];

/** Bar stools in front of the counter (bodies bump them a little). */
export const BAR_STOOLS = [2.0, 3.2, 4.4, 5.6].map((z) => ({ x: BAR.x0 - 0.55, z }));

const furnSolids = (): Solid[] =>
  FURNITURE.map((f) => {
    const y = f.y ?? 0;
    // Chests and benches turned a quarter: their footprint swaps.
    const quarter = f.yaw !== undefined && Math.abs(Math.sin(f.yaw)) > 0.7 && f.kind !== "obelisk";
    const hx = quarter ? f.hz : f.hx;
    const hz = quarter ? f.hx : f.hz;
    return S(f.x - hx, f.x + hx, f.z - hz, f.z + hz, y, y + f.h);
  }).concat(BAR_STOOLS.map((s) => S(s.x - 0.2, s.x + 0.2, s.z - 0.2, s.z + 0.2, 0, 0.75)));

/** Posts under the gallery's edge (x). */
export const GALLERY_POSTS = [-27.2, -21.2, -15.2];

/** The stalls against the front wall (their counters and awnings). */
const stallSolids = (): Solid[] => STALL_XS.map((x) => S(x - 1.2, x + 1.2, -WT - 1.62, -WT, 0, 2.7));

/** The columns as boxes (bodies go round them; the camera keeps out). */
const columnSolids = (): Solid[] => COLUMNS.map((c) => S(c.x - c.r * 1.05, c.x + c.r * 1.05, c.z - c.r * 1.05, c.z + c.r * 1.05, 0, c.y + c.h));
/** The roofs over the stoa and the portico (the camera keeps under them, or above). */
const frontRoofs = (): Solid[] => [
  S(GUILD.x0 - WT, -10 - PT, STOA.front - 0.4, -WT, STOA.h + STYLOBATE, STOA.top + 0.3, false),
  S(10 + PT, GUILD.x1 + WT, STOA.front - 0.4, -WT, STOA.h + STYLOBATE, STOA.top + 0.3, false),
  S(PORTICO.x0 - 0.5, PORTICO.x1 + 0.5, PORTICO.front - 0.4, -WT, PORTICO.h + STYLOBATE, PORTICO.apex, false),
];

export const SOLIDS: Solid[] = (STRUCTURE as Solid[]).concat(
  FENCE,
  columnSolids(),
  frontRoofs(),
  furnSolids(),
  stallSolids(),
  GALLERY_POSTS.map((x) => S(x - 0.16, x + 0.16, GALLERY_Z - 0.16, GALLERY_Z + 0.16, 0, SLAB_Y))
);

/** Shut doors of the rooms upstairs (the view opens and closes them). */
export function doorSolid(i: number): Solid {
  const r = ROOMS[i];
  return S(r.door.x0, r.door.x1, ROOMS_Z, ROOMS_Z + 0.2, UPPER_Y, UPPER_Y + 2.25);
}

// ---- Open air (where the camera may be) --------------------------------------------------------

export interface Air {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
}

export const AIR: Air[] = [
  { x0: STREET.x0, x1: STREET.x1, z0: STREET.z0, z1: STREET.z1, y0: 0, y1: SKY },
  { x0: ENTRANCE.x0, x1: ENTRANCE.x1, z0: -WT - 0.01, z1: 0.01, y0: 0, y1: ENTRANCE.top },
  { x0: HALL.x0, x1: HALL.x1, z0: HALL.z0, z1: HALL.z1, y0: 0, y1: HALL_TOP },
  { x0: TAVERN.x1 - 0.01, x1: HALL.x0 + 0.01, z0: SIDE_ARCH.z0, z1: SIDE_ARCH.z1, y0: 0, y1: SIDE_ARCH.top },
  { x0: HALL.x1 - 0.01, x1: ARENA_WING.x0 + 0.01, z0: SIDE_ARCH.z0, z1: SIDE_ARCH.z1, y0: 0, y1: SIDE_ARCH.top },
  { x0: TAVERN.x0, x1: TAVERN.x1, z0: TAVERN.z0, z1: GALLERY_Z, y0: 0, y1: TAVERN_TOP },
  { x0: TAVERN.x0, x1: TAVERN.x1, z0: GALLERY_Z, z1: TAVERN.z1, y0: 0, y1: SLAB_Y },
  { x0: TAVERN.x0, x1: TAVERN.x1, z0: GALLERY_Z, z1: TAVERN.z1, y0: UPPER_Y, y1: TAVERN_TOP },
  { x0: ARENA_WING.x0, x1: ARENA_WING.x1, z0: ARENA_WING.z0, z1: ARENA_WING.z1, y0: 0, y1: ARENA_TOP },
];

const inBox = (s: Solid, x: number, y: number, z: number, m: number) => x > s.x0 - m && x < s.x1 + m && z > s.z0 - m && z < s.z1 + m && y > s.y0 - m && y < s.y1 + m;

/** Inside something solid (walls, slabs, furniture, shut doors), `m` metres of margin. */
export function solidAt(x: number, y: number, z: number, m = 0, extra: Solid[] = []): boolean {
  for (const s of SOLIDS) if (inBox(s, x, y, z, m)) return true;
  for (const s of extra) if (inBox(s, x, y, z, m)) return true;
  return false;
}

/** Open air at (x, y, z): inside an air box `top` below its lid and `bottom` above its floor, clear of solids. */
export function airAt(x: number, y: number, z: number, top: number, bottom: number, extra: Solid[] = []): boolean {
  let inside = false;
  for (const a of AIR) {
    if (x < a.x0 || x > a.x1 || z < a.z0 || z > a.z1) continue;
    const fl = (groundAt(x, z, y - bottom) ?? a.y0) + bottom;
    if (y >= Math.max(a.y0 + bottom, fl) && y <= a.y1 - top) {
      inside = true;
      break;
    }
  }
  return inside && !solidAt(x, y, z, 0.08, extra);
}

/** The camera's height kept between the floor and the lid of the air box it is in. */
export function clampAirY(x: number, y: number, z: number): number {
  let best = y;
  let bestD = Infinity;
  for (const a of AIR) {
    if (x < a.x0 || x > a.x1 || z < a.z0 || z > a.z1) continue;
    const lo = a.y0 + 0.35;
    const hi = a.y1 - 0.28;
    const c = Math.max(lo, Math.min(hi, y));
    if (Math.abs(c - y) < bestD) {
      bestD = Math.abs(c - y);
      best = c;
    }
  }
  return best;
}

// ---- Places ------------------------------------------------------------------------------------

/** Inside the guild's walls (lit by its lamps, not the night sky). */
export const indoors = (x: number, z: number) => z > -0.05 && x > GUILD.x0 - 0.1 && x < GUILD.x1 + 0.1;

/** What to call where he stands. */
export function areaName(x: number, z: number, y: number): string {
  if (!indoors(x, z)) return "Guild Street";
  if (x < TAVERN.x1 + 0.2) {
    if (y > UPPER_Y - 0.4) {
      const r = ROOMS.findIndex((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 + 0.2);
      return r >= 0 ? ROOMS[r].name : "Upstairs gallery";
    }
    if (x >= STAIR.x0 && x <= STAIR.x1 && z >= STAIR.z0 && z <= STAIR.z1 && y > 0.3) return "Stairs";
    if (x > BAR.x1 && z < BAR.z1 + 0.5) return "Behind the bar";
    return "The Wayfarer's Rest";
  }
  if (x > ARENA_WING.x0 - 0.2) return inArena(x, z) ? "The Arena (fighting ground)" : "The Arena";
  if (z > DAIS.z - DAIS.r - 2.5) return "Gate of the Deep";
  return "Adventurers' Guild";
}

/** Whether a point is inside the tavern part. */
export const inTavern = (x: number, z: number) => x > TAVERN.x0 && x < TAVERN.x1 && z > TAVERN.z0 && z < TAVERN.z1;


/** Where he stands on arrival: in the tavern at the start, on the dais back from a dive. */
export const SPAWN = {
  tavern: { x: -17.5, z: 7.6, yaw: -Math.PI / 2 },
  gate: { x: DAIS.x, z: DAIS.z - 1.2, yaw: 0 },
  /** Back on his feet after a knockout in the arena: outside the ring's gate, looking in. */
  arena: { x: RING.x0 - 1.8, z: (RING_GATE.z0 + RING_GATE.z1) / 2, yaw: -Math.PI / 2 },
};

// ---- Townsfolk ---------------------------------------------------------------------------------

export interface Waypoint {
  x: number;
  z: number;
  /** Seconds to stand there, what the arms do meanwhile, and which way to face (yaw; default the way he came). */
  wait?: number;
  arms?: "hold" | "cross" | "eat" | "reach" | "wave";
  face?: number;
}

export interface NpcPlan {
  name: string;
  /** walk: loops the route; sit: sits at (x, z) facing `yaw`. */
  kind: "walk" | "sit";
  route?: Waypoint[];
  seat?: { x: number; z: number; yaw: number; arms: "eat" | "knees" | "hold" };
  /** Pace (m/s) for walkers. */
  pace?: number;
  /** The clothes over the base body. */
  dress: Array<"doublet" | "waist" | "cape" | "mail" | "gauntlets" | "tabard" | "cuirass" | "pauldrons" | "helm">;
  seed: number;
}

const BENCH = 1.0; // a bench's middle from its table's middle (z)
const SEAT_IN = 0.06; // sitter's hips a touch toward the table from the bench's middle
/** Facing: yaw 0 looks +z (south, into the guild), PI looks -z (north, to the street). */
const NORTH = Math.PI;
const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;

export const NPCS: NpcPlan[] = [
  // The guild representative behind his desk, two guards at the entrance, an adventurer about.
  {
    name: "Guild Representative",
    kind: "walk",
    pace: 0.7,
    route: [
      { x: CLERK.x, z: CLERK.z, wait: 9, arms: "hold", face: NORTH },
      { x: CLERK.x - 1.4, z: CLERK.z, wait: 4, arms: "cross", face: NORTH },
      { x: CLERK.x, z: CLERK.z, wait: 8, arms: "hold", face: NORTH },
      { x: CLERK.x + 1.4, z: CLERK.z, wait: 4, arms: "reach", face: NORTH },
    ],
    dress: ["doublet", "tabard", "waist"],
    seed: 101,
  },
  { name: "Guard", kind: "walk", pace: 0.6, route: [{ x: -3.7, z: 1.4, wait: 30, arms: "cross", face: NORTH }], dress: ["mail", "cuirass", "pauldrons", "helm", "tabard"], seed: 103 },
  { name: "Guard", kind: "walk", pace: 0.6, route: [{ x: 3.7, z: 1.4, wait: 30, arms: "cross", face: NORTH }], dress: ["mail", "cuirass", "pauldrons", "helm", "tabard"], seed: 107 },
  {
    name: "Adventurer",
    kind: "walk",
    pace: 0.9,
    route: [
      { x: 5.4, z: 9.0, wait: 7, arms: "hold", face: 0 },
      { x: 2.0, z: 6.5 },
      { x: -1.0, z: 15.5, wait: 4, arms: "cross", face: 0 },
      { x: -5.5, z: 12.0 },
      { x: 4.0, z: 7.0 },
    ],
    dress: ["doublet", "waist", "cape"],
    seed: 109,
  },
  // The tavern.
  {
    name: "Barkeep",
    kind: "walk",
    pace: 0.8,
    route: [
      { x: -13.2, z: 2.2, wait: 5, arms: "hold", face: WEST },
      { x: -13.2, z: 4.0, wait: 3, arms: "hold", face: WEST },
      { x: -13.2, z: 5.8, wait: 4, arms: "cross", face: WEST },
      { x: -11.4, z: 4.4, wait: 3, arms: "reach", face: EAST },
    ],
    dress: ["doublet", "waist"],
    seed: 11,
  },
  { name: "Patron", kind: "sit", seat: { x: TABLES[0].x - 0.5, z: TABLES[0].z - BENCH + SEAT_IN, yaw: 0, arms: "eat" }, dress: ["doublet", "cape"], seed: 31 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[2].x + 0.4, z: TABLES[2].z + BENCH - SEAT_IN, yaw: NORTH, arms: "knees" }, dress: ["doublet", "waist"], seed: 37 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[3].x + 0.5, z: TABLES[3].z - BENCH + SEAT_IN, yaw: 0, arms: "eat" }, dress: ["mail"], seed: 41 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[4].x + 0.3, z: TABLES[4].z + BENCH - SEAT_IN, yaw: NORTH, arms: "hold" }, dress: ["doublet"], seed: 47 },
  {
    name: "Patron",
    kind: "walk",
    pace: 1.0,
    route: [
      { x: -16.2, z: 3.0, wait: 6, arms: "hold", face: EAST },
      { x: -17.0, z: 7.4 },
      { x: -22.6, z: 7.4 },
      { x: -28.6, z: 3.4, wait: 7, arms: "cross", face: WEST },
      { x: -22.6, z: 13.6 },
      { x: -16.6, z: 13.6, wait: 3 },
    ],
    dress: ["doublet", "waist", "cape"],
    seed: 53,
  },
  // The arena: its master by the gate, a watcher on a bench.
  {
    name: "Arena Master",
    kind: "walk",
    pace: 0.8,
    route: [
      { x: 12.4, z: 10.2, wait: 10, arms: "cross", face: EAST },
      { x: 12.4, z: 15.8, wait: 10, arms: "cross", face: EAST },
    ],
    dress: ["mail", "cuirass", "gauntlets", "tabard"],
    seed: 113,
  },
  { name: "Spectator", kind: "sit", seat: { x: ARENA_BENCHES[1].x, z: ARENA_BENCHES[1].z - 0.05, yaw: 0, arms: "knees" }, dress: ["doublet", "cape"], seed: 117 },
  // The street.
  {
    name: "Townsman",
    kind: "walk",
    pace: 1.15,
    route: [
      { x: -26, z: -14, wait: 3, arms: "cross" },
      { x: -6, z: -14 },
      { x: 6, z: -14 },
      { x: 26, z: -14, wait: 4, arms: "hold", face: NORTH },
      { x: 6, z: -26 },
      { x: -6, z: -26 },
    ],
    dress: ["doublet", "cape"],
    seed: 67,
  },
  {
    name: "Townswoman",
    kind: "walk",
    pace: 1.0,
    route: [
      { x: 3.6, z: -23, wait: 6, arms: "hold", face: NORTH },
      { x: 12.4, z: -12 },
      { x: 14, z: -3.4, wait: 5, arms: "hold", face: 0 },
      { x: 12.4, z: -12 },
      { x: -12.4, z: -12 },
      { x: -14, z: -3.4, wait: 5, arms: "hold", face: 0 },
      { x: -12.4, z: -12 },
    ],
    dress: ["doublet", "waist"],
    seed: 71,
  },
];

// ---- Walking -----------------------------------------------------------------------------------

/** Bodies bump solids at their own height: from the knees to the top of the head. */
function pushOut(Pt: { x: number; z: number }, feet: number, r: number, extra: Solid[]) {
  const test = (s: Solid) => {
    if (!s.walk || s.y1 <= feet + 0.3 || s.y0 >= feet + 1.7) return;
    const nx = Math.max(s.x0, Math.min(Pt.x, s.x1));
    const nz = Math.max(s.z0, Math.min(Pt.z, s.z1));
    const dx = Pt.x - nx;
    const dz = Pt.z - nz;
    const q = dx * dx + dz * dz;
    if (q >= r * r) return;
    if (q > 1e-9) {
      const l = Math.sqrt(q);
      Pt.x = nx + (dx / l) * r;
      Pt.z = nz + (dz / l) * r;
      return;
    }
    // Inside: out by the nearest face.
    const e = [Pt.x - s.x0, s.x1 - Pt.x, Pt.z - s.z0, s.z1 - Pt.z];
    const m = e.indexOf(Math.min(...e));
    if (m === 0) Pt.x = s.x0 - r;
    if (m === 1) Pt.x = s.x1 + r;
    if (m === 2) Pt.z = s.z0 - r;
    if (m === 3) Pt.z = s.z1 + r;
  };
  for (let i = 0; i < 2; i++) {
    for (const s of SOLIDS) test(s);
    for (const s of extra) test(s);
  }
}

/**
 * The paladin's feet in town, with the same face as the dungeon walker (x and z in cells of
 * CELL_M, so the game loop treats both alike); `y` is the floor under him (m).
 */
export function createTownWalker(extraSolids: () => Solid[]) {
  const Pt = { x: 0, z: 0 };
  const w = {
    x: 0,
    z: 0,
    y: 0,
    yaw: 0,
    pitch: 0.16,
    bodyYaw: 0,
    vx: 0,
    vz: 0,
    bob: 0,
    speedNow: 0,
    radius: BODY_RADIUS,
    /** Stand at a spot (m), facing `yaw` (the camera's yaw: he looks along -sin, -cos). */
    place(x: number, z: number, yaw: number) {
      w.x = x / CELL_M;
      w.z = z / CELL_M;
      w.y = groundAt(x, z, 0.4) ?? 0;
      w.yaw = yaw;
      w.bodyYaw = yaw + Math.PI;
      w.pitch = 0.16;
      w.vx = 0;
      w.vz = 0;
      w.speedNow = 0;
    },
    /** `airborne`: off the ground, he keeps his way and steers only a little. */
    step(dt: number, forward: number, strafe: number, speed: number, airborne = false) {
      const len = Math.hypot(forward, strafe);
      const f = len > 1 ? forward / len : forward;
      const s = len > 1 ? strafe / len : strafe;
      const sin = Math.sin(w.yaw);
      const cos = Math.cos(w.yaw);
      const tx = (-sin * f + cos * s) * speed;
      const tz = (-cos * f - sin * s) * speed;
      const k = 1 - Math.exp(-dt * (airborne ? 1.2 : len > 0 ? 12 : 16));
      w.vx += (tx - w.vx) * k;
      w.vz += (tz - w.vz) * k;
      if (Math.abs(w.vx) < 0.002) w.vx = 0;
      if (Math.abs(w.vz) < 0.002) w.vz = 0;
      const extra = extraSolids();
      let x = w.x * CELL_M;
      let z = w.z * CELL_M;
      let y = w.y;
      const mx = w.vx * CELL_M * dt;
      const mz = w.vz * CELL_M * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.12));
      // A move goes through when there is floor in reach where it ends; otherwise each axis on its own (sliding).
      const tryMove = (nx: number, nz: number) => {
        Pt.x = nx;
        Pt.z = nz;
        pushOut(Pt, y, BODY_RADIUS, extra);
        const g = groundAt(Pt.x, Pt.z, y);
        if (g === null) return false;
        x = Pt.x;
        z = Pt.z;
        y = g;
        return true;
      };
      for (let i = 0; i < steps; i++) {
        const dx = mx / steps;
        const dz = mz / steps;
        if (!tryMove(x + dx, z + dz)) {
          if (!tryMove(x + dx, z)) tryMove(x, z + dz);
        }
      }
      const nx = x / CELL_M;
      const nz = z / CELL_M;
      const moved = Math.hypot(nx - w.x, nz - w.z);
      w.speedNow = dt > 0 ? moved / dt : 0;
      if (moved > 0.0005) {
        const moveYaw = Math.atan2(nx - w.x, nz - w.z);
        let diff = ((moveYaw - w.bodyYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        w.bodyYaw += diff * Math.min(1, dt * 14);
      }
      w.x = nx;
      w.z = nz;
      w.y = y;
      w.bob += moved * 2.1;
    },
    /** The town has no grid rooms (the HUD asks areaName instead). */
    room(): null {
      return null;
    },
  };
  return w;
}

export type TownWalker = ReturnType<typeof createTownWalker>;
