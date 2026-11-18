// The town above the dungeon, as plain data (world metres; x east, z south, y up). The Wayfarer's
// Rest is a two-storey tavern: the common room with the bar, the kitchen behind it and the hearth
// on the ground floor; a gallery over the back of the hall with three rooms to rent upstairs. Its
// door opens on a little square and the market street, stalls down both sides, which ends at the
// gate hall: a vaulted stone room where the teleporter dais sends him down into the dungeon.
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

/** Storey heights (m): the upper floor's boards, the slab under it, the tavern's ceiling. */
export const UPPER_Y = 3.6;
export const SLAB_Y = 3.4;
export const TAVERN_TOP = 7.2;
/** The hall ceiling and the street's open sky (the camera's lid outdoors). */
export const HALL_TOP = 12;
const SKY = 40;

// ---- Footprints --------------------------------------------------------------------------------

export const TAVERN = { x0: -10, x1: 10, z0: 0, z1: 14 };
/** The back of the ground floor sits under the upper storey from here (z). */
export const GALLERY_Z = 7.5;
/** The gallery walkway's far edge (z) and the rooms' front wall. */
export const ROOMS_Z = 9.5;
/** The upper storey ends here (x); above the kitchen is the loft, closed off. */
export const UPPER_X1 = 4.4;
/** The stair along the west wall: from the floor at z0 to the gallery at z1. */
export const STAIR = { x0: -10, x1: -8.6, z0: 1.4, z1: GALLERY_Z };
/** The kitchen, behind the bar. */
export const KITCHEN = { x0: 4.4, x1: 10, z0: GALLERY_Z, z1: 14 };
/** The bar counter (an L: the long run faces the hall). */
export const BAR = { x0: 3.7, x1: 4.3, z0: 1.4, z1: 6.0 };
export const FRONT_DOOR = { x0: -1.1, x1: 1.1, top: 2.7 };
/** Doors through the kitchen walls: from behind the bar (in the z = GALLERY_Z wall) and from the hall (x = 4.4 wall). */
export const KITCHEN_DOOR_S = { x0: 6.9, x1: 8.2 };
export const KITCHEN_DOOR_W = { z0: 10.0, z1: 11.3 };

export const SQUARE = { x0: -10, x1: 10, z0: -6, z1: 0 };
export const STREET = { x0: -5, x1: 5, z0: -46, z1: -6 };
export const GATEWAY = { x0: -3, x1: 3, z0: -48, z1: -46, top: 6.6 };
export const HALL = { x0: -11, x1: 11, z0: -74, z1: -48 };
/** The teleporter dais in the gate hall. */
export const DAIS = { x: 0, z: -61, r: 3.0, step: 0.5, h: 0.36 };
/** How close to the dais centre E sends him down (m). */
export const DAIS_REACH = 2.4;

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
  [-10, -5.3],
  [-5.1, -0.5],
  [-0.3, UPPER_X1],
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
    chests: [10.75, 11.95, 13.15].map((z) => ({ x: x1 - 0.36, z })),
    bed: { x: x0 + 1.05, z: TAVERN.z1 - 1.1 },
  };
});

// ---- The market stalls (in the market's own frame: cells, with the grid's origin at 0) ---------

/** Stalls along the street: west side facing east, east side facing west (z of each, m). */
const STALL_SPOTS: Array<{ side: -1 | 1; z: number }> = [
  { side: -1, z: -12 },
  { side: 1, z: -16.5 },
  { side: -1, z: -22 },
  { side: 1, z: -27 },
  { side: -1, z: -32 },
];

export function townStalls(): StallPlan[] {
  return STALL_SPOTS.map((s, i) => {
    const nx = -s.side;
    return {
      merchant: i,
      x: (s.side * STREET.x1) / CELL_M,
      z: s.z / CELL_M,
      nx,
      nz: 0,
      // Along the wall = the normal turned a quarter to the left (as dungeon/market.ts).
      tx: 0,
      tz: nx,
      floor: 0,
    };
  });
}

// ---- Floor regions -----------------------------------------------------------------------------

export type Region =
  | { kind: "flat"; x0: number; x1: number; z0: number; z1: number; y: number }
  /** Rises from y0 at z0 to y1 at z1. */
  | { kind: "rampZ"; x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
  | { kind: "disc"; x: number; z: number; r: number; y: number };

const flat = (x0: number, x1: number, z0: number, z1: number, y = 0): Region => ({ kind: "flat", x0, x1, z0, z1, y });

export const REGIONS: Region[] = [
  // Tavern ground floor (round the stair foot). The front door is shut: E there takes him through.
  flat(TAVERN.x0, STAIR.x1, TAVERN.z0, STAIR.z0),
  flat(TAVERN.x0, STAIR.x1, STAIR.z1, TAVERN.z1),
  flat(STAIR.x1, TAVERN.x1, TAVERN.z0, TAVERN.z1),
  // The stair and the upper storey: gallery and the three rooms.
  { kind: "rampZ", x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.z0, z1: STAIR.z1, y0: 0, y1: UPPER_Y },
  flat(TAVERN.x0, UPPER_X1, GALLERY_Z, ROOMS_Z, UPPER_Y),
  ...ROOMS.map((r) => flat(r.x0, r.x1, r.z0, r.z1, UPPER_Y)),
  // Outside: the square, the street, the gateway and the hall, with the dais and its step.
  flat(SQUARE.x0, SQUARE.x1, SQUARE.z0, SQUARE.z1 - 0.45),
  flat(STREET.x0, STREET.x1, STREET.z0, STREET.z1),
  flat(GATEWAY.x0, GATEWAY.x1, GATEWAY.z0, GATEWAY.z1),
  flat(HALL.x0, HALL.x1, HALL.z0, HALL.z1),
  { kind: "disc", x: DAIS.x, z: DAIS.z, r: DAIS.r + DAIS.step, y: DAIS.h / 2 },
  { kind: "disc", x: DAIS.x, z: DAIS.z, r: DAIS.r, y: DAIS.h },
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

/** A wall along x or z with gaps cut out (each gap open from the floor to `top`). */
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
function wallZ(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, gaps: Array<{ a: number; b: number; top: number }> = []): Solid[] {
  return wallX(x0, x1, z0, z1, y0, y1, gaps).map((s) => S(s.z0, s.z1, s.x0, s.x1, s.y0, s.y1));
}

const T = 0.4; // outer wall thickness

/** Walls, slabs and partitions (the 3D view builds them from this list too). */
export const STRUCTURE: Solid[] = [
  // Tavern shell.
  ...wallX(TAVERN.z0 - T, TAVERN.z0, TAVERN.x0 - T, TAVERN.x1 + T, 0, TAVERN_TOP, [{ a: FRONT_DOOR.x0, b: FRONT_DOOR.x1, top: FRONT_DOOR.top }]),
  // The front door, shut.
  S(FRONT_DOOR.x0, FRONT_DOOR.x1, TAVERN.z0 - T, TAVERN.z0, 0, FRONT_DOOR.top),
  S(TAVERN.x0 - T, TAVERN.x1 + T, TAVERN.z1, TAVERN.z1 + T, 0, TAVERN_TOP),
  S(TAVERN.x0 - T, TAVERN.x0, TAVERN.z0, TAVERN.z1, 0, TAVERN_TOP),
  S(TAVERN.x1, TAVERN.x1 + T, TAVERN.z0, TAVERN.z1, 0, TAVERN_TOP),
  S(TAVERN.x0 - T, TAVERN.x1 + T, TAVERN.z0 - T, TAVERN.z1 + T, TAVERN_TOP, TAVERN_TOP + 0.3),
  // The upper floor's slab (the stair comes up through the gap at its west end).
  S(STAIR.x1, TAVERN.x1, GALLERY_Z, TAVERN.z1, SLAB_Y, UPPER_Y, false),
  S(TAVERN.x0, STAIR.x1, GALLERY_Z + 0.0, TAVERN.z1, SLAB_Y, UPPER_Y, false),
  // Kitchen walls (ground floor), with their doors.
  ...wallX(GALLERY_Z - 0.1, GALLERY_Z + 0.1, KITCHEN.x0, TAVERN.x1, 0, SLAB_Y, [{ a: KITCHEN_DOOR_S.x0, b: KITCHEN_DOOR_S.x1, top: 2.3 }]),
  ...wallZ(KITCHEN.x0 - 0.1, KITCHEN.x0 + 0.1, GALLERY_Z, TAVERN.z1, 0, SLAB_Y, [{ a: KITCHEN_DOOR_W.z0, b: KITCHEN_DOOR_W.z1, top: 2.3 }]),
  // Upstairs: the loft wall over the kitchen, the rooms' front wall and the partitions.
  S(UPPER_X1, UPPER_X1 + 0.2, GALLERY_Z, TAVERN.z1, UPPER_Y, TAVERN_TOP),
  ...wallX(ROOMS_Z, ROOMS_Z + 0.2, TAVERN.x0, UPPER_X1, UPPER_Y, TAVERN_TOP, ROOMS.map((r) => ({ a: r.door.x0, b: r.door.x1, top: UPPER_Y + 2.25 }))),
  S(-5.3, -5.1, ROOMS_Z + 0.2, TAVERN.z1, UPPER_Y, TAVERN_TOP),
  S(-0.5, -0.3, ROOMS_Z + 0.2, TAVERN.z1, UPPER_Y, TAVERN_TOP),
  // Gallery and stair railings (waist high).
  S(STAIR.x1, UPPER_X1, GALLERY_Z - 0.06, GALLERY_Z + 0.06, UPPER_Y, UPPER_Y + 1.0),
  S(STAIR.x1 - 0.06, STAIR.x1 + 0.06, STAIR.z0 + 0.6, GALLERY_Z, 0.9, UPPER_Y + 1.0),
  // The stair's body, as the treads (feet walk the ramp; the camera keeps out).
  ...Array.from({ length: 18 }, (_, i) => {
    const z0 = STAIR.z0 + ((STAIR.z1 - STAIR.z0) * i) / 18;
    const z1 = STAIR.z0 + ((STAIR.z1 - STAIR.z0) * (i + 1)) / 18;
    return S(STAIR.x0, STAIR.x1, z0, z1, 0, (UPPER_Y * (i + 1)) / 18 - 0.02, false);
  }),
  // The square's sides and the street's house fronts.
  S(SQUARE.x0 - 1.2, SQUARE.x0, SQUARE.z0, SQUARE.z1, 0, 5.4),
  S(SQUARE.x1, SQUARE.x1 + 1.2, SQUARE.z0, SQUARE.z1, 0, 5.4),
  S(SQUARE.x0 - 1.2, STREET.x0, STREET.z0, SQUARE.z0, 0, 6),
  S(STREET.x1, SQUARE.x1 + 1.2, STREET.z0, SQUARE.z0, 0, 6),
  // The hall's north wall with the gateway, and the hall's shell.
  ...wallX(GATEWAY.z0, GATEWAY.z1, HALL.x0 - 1, HALL.x1 + 1, 0, HALL_TOP, [{ a: GATEWAY.x0, b: GATEWAY.x1, top: GATEWAY.top }]),
  S(HALL.x0 - 1, HALL.x0, HALL.z0, HALL.z1, 0, HALL_TOP),
  S(HALL.x1, HALL.x1 + 1, HALL.z0, HALL.z1, 0, HALL_TOP),
  S(HALL.x0 - 1, HALL.x1 + 1, HALL.z0 - 1, HALL.z0, 0, HALL_TOP),
  S(HALL.x0 - 1, HALL.x1 + 1, HALL.z0 - 1, HALL.z1, HALL_TOP, HALL_TOP + 0.6),
];

/** The hall's piers (centre x, z) and their half width. */
export const PIERS: Array<{ x: number; z: number }> = [-52.5, -59, -65.5, -71].reduce<Array<{ x: number; z: number }>>((a, z) => a.concat([{ x: -8.6, z }, { x: 8.6, z }]), []);
export const PIER_HALF = 0.7;

/** Furniture and fittings that bodies bump (boxes; the 3D view places the models over them). */
export interface Furn {
  kind: "table" | "barCounter" | "barBack" | "hearth" | "stools" | "kitchenFire" | "worktable" | "kitchenShelf" | "barrels" | "bed" | "chest" | "commode" | "pier" | "brazier" | "gate" | "obelisk";
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
  { x: -5.2, z: 3.1 },
  { x: -5.2, z: 6.15 },
  { x: 1.1, z: 5.0 },
  { x: -3.6, z: 11.0 },
  { x: 1.2, z: 11.6 },
];

export const FURNITURE: Furn[] = [
  ...TABLES.map((t): Furn => ({ kind: "table", x: t.x, z: t.z, hx: 1.25, hz: 1.28, h: 0.9 })),
  { kind: "barCounter", x: (BAR.x0 + BAR.x1) / 2, z: (BAR.z0 + BAR.z1) / 2, hx: (BAR.x1 - BAR.x0) / 2, hz: (BAR.z1 - BAR.z0) / 2, h: 1.1 },
  { kind: "barCounter", x: 6.4, z: BAR.z0 - 0.0, hx: 2.1, hz: 0.3, h: 1.1 },
  { kind: "barBack", x: 9.55, z: 3.6, hx: 0.45, hz: 2.6, h: 2.2 },
  { kind: "hearth", x: -6.6, z: 13.25, hx: 1.3, hz: 0.75, h: 3.4 },
  { kind: "kitchenFire", x: 8.6, z: 12.9, hx: 1.1, hz: 0.9, h: 1.0 },
  { kind: "worktable", x: 6.9, z: 10.9, hx: 0.6, hz: 1.25, h: 0.9 },
  { kind: "kitchenShelf", x: 9.6, z: 9.6, hx: 0.4, hz: 1.4, h: 2.0 },
  { kind: "barrels", x: 5.0, z: 13.4, hx: 0.6, hz: 0.6, h: 1.1 },
  ...ROOMS.reduce<Furn[]>(
    (a, r, ri) =>
      a.concat([
        { kind: "bed", x: r.bed.x, z: r.bed.z, hx: 0.8, hz: 1.08, h: 1.1, y: UPPER_Y, room: ri },
        { kind: "commode", x: (r.x0 + r.x1) / 2 + 0.2, z: TAVERN.z1 - 0.35, hx: 0.62, hz: 0.32, h: 1.2, y: UPPER_Y, room: ri },
        ...r.chests.map((c, ci): Furn => ({ kind: "chest", x: c.x, z: c.z, hx: 0.3, hz: 0.5, h: 0.75, y: UPPER_Y, yaw: -Math.PI / 2, room: ri, slot: ci })),
      ]),
    []
  ),
  ...PIERS.map((p): Furn => ({ kind: "pier", x: p.x, z: p.z, hx: PIER_HALF, hz: PIER_HALF, h: HALL_TOP })),
  { kind: "brazier", x: -4.2, z: -70.6, hx: 0.45, hz: 0.45, h: 1.3 },
  { kind: "brazier", x: 4.2, z: -70.6, hx: 0.45, hz: 0.45, h: 1.3 },
  { kind: "gate", x: 0, z: HALL.z0 + 0.4, hx: 3.4, hz: 0.4, h: 7.5 },
  ...[0, 1, 2, 3].map((i): Furn => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return { kind: "obelisk", x: DAIS.x + Math.sin(a) * (DAIS.r + 1.6), z: DAIS.z + Math.cos(a) * (DAIS.r + 1.6), hx: 0.4, hz: 0.4, h: 3.2, yaw: a };
  }),
];

/** Bar stools in front of the counter (bodies bump them a little). */
export const BAR_STOOLS = [2.0, 3.0, 4.0, 5.0].map((z) => ({ x: BAR.x0 - 0.55, z }));

const furnSolids = (): Solid[] =>
  FURNITURE.map((f) => {
    const y = f.y ?? 0;
    // Chests stand side-on (turned a quarter): their footprint swaps.
    const quarter = f.yaw !== undefined && Math.abs(Math.sin(f.yaw)) > 0.7 && f.kind !== "obelisk";
    const hx = quarter ? f.hz : f.hx;
    const hz = quarter ? f.hx : f.hz;
    return S(f.x - hx, f.x + hx, f.z - hz, f.z + hz, y, y + f.h);
  }).concat(BAR_STOOLS.map((s) => S(s.x - 0.2, s.x + 0.2, s.z - 0.2, s.z + 0.2, 0, 0.75)));

/** Posts under the gallery's edge (x). */
export const GALLERY_POSTS = [-7.4, -3.4, 1.0];

const stallSolids = (): Solid[] =>
  STALL_SPOTS.map((s) => (s.side < 0 ? S(STREET.x0, STREET.x0 + 1.62, s.z - 1.2, s.z + 1.2, 0, 2.7) : S(STREET.x1 - 1.62, STREET.x1, s.z - 1.2, s.z + 1.2, 0, 2.7)));

export const SOLIDS: Solid[] = STRUCTURE.concat(
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
  { x0: TAVERN.x0, x1: TAVERN.x1, z0: TAVERN.z0, z1: GALLERY_Z, y0: 0, y1: TAVERN_TOP },
  { x0: TAVERN.x0, x1: TAVERN.x1, z0: GALLERY_Z, z1: TAVERN.z1, y0: 0, y1: SLAB_Y },
  { x0: TAVERN.x0, x1: UPPER_X1, z0: GALLERY_Z, z1: TAVERN.z1, y0: UPPER_Y, y1: TAVERN_TOP },
  { x0: SQUARE.x0, x1: SQUARE.x1, z0: SQUARE.z0, z1: SQUARE.z1 - 0.4, y0: 0, y1: SKY },
  { x0: STREET.x0, x1: STREET.x1, z0: STREET.z0, z1: STREET.z1, y0: 0, y1: SKY },
  { x0: GATEWAY.x0, x1: GATEWAY.x1, z0: GATEWAY.z0, z1: GATEWAY.z1, y0: 0, y1: GATEWAY.top },
  { x0: HALL.x0, x1: HALL.x1, z0: HALL.z0, z1: HALL.z1, y0: 0, y1: HALL_TOP },
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

/** What to call where he stands. */
export function areaName(x: number, z: number, y: number): string {
  if (z >= TAVERN.z0 && z <= TAVERN.z1 && x >= TAVERN.x0 && x <= TAVERN.x1) {
    if (y > UPPER_Y - 0.4) {
      const r = ROOMS.findIndex((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 + 0.2);
      return r >= 0 ? ROOMS[r].name : "Upstairs gallery";
    }
    if (x >= STAIR.x0 && x <= STAIR.x1 && z >= STAIR.z0 && z <= STAIR.z1 && y > 0.3) return "Stairs";
    if (x > KITCHEN.x0 && z > KITCHEN.z0) return "Kitchen";
    if (x > BAR.x1 && z < GALLERY_Z) return "Behind the bar";
    return "Common room";
  }
  if (z > SQUARE.z0) return "Tavern square";
  if (z > STREET.z0) return "Market Street";
  return "Gate of the Deep";
}

/** Whether a point is inside the tavern (NPCs there are only drawn when he can see in). */
export const inTavern = (x: number, z: number) => x > TAVERN.x0 && x < TAVERN.x1 && z > TAVERN.z0 - 0.5 && z < TAVERN.z1;

/** The zone a point is in: the tavern is drawn on its own, the outside on its own. */
export const zoneAt = (x: number, z: number): "in" | "out" => (inTavern(x, z) && z > TAVERN.z0 ? "in" : "out");

/** Where E works the front door from either side (m), and how near is near enough. */
export const DOOR_SPOT = { in: { x: 0, z: TAVERN.z0 + 0.7 }, out: { x: 0, z: TAVERN.z0 - 1.2 }, reach: 1.7 };

/** Where he stands on arrival: in the common room at the start, on the dais back from a dive. */
export const SPAWN = {
  tavern: { x: -0.4, z: 2.2, yaw: Math.PI },
  /** Just inside the front door (facing in) and just outside it (facing the street). */
  doorIn: { x: 0, z: TAVERN.z0 + 1.0, yaw: Math.PI },
  doorOut: { x: 0, z: TAVERN.z0 - 2.7, yaw: 0 },
  gate: { x: DAIS.x, z: DAIS.z + 1.2, yaw: Math.PI },
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
  dress: Array<"doublet" | "waist" | "cape" | "mail" | "gauntlets" | "tabard">;
  seed: number;
}

const BENCH = 1.0; // a bench's middle from its table's middle (z)
const SEAT_IN = 0.06; // sitter's hips a touch toward the table from the bench's middle

export const NPCS: NpcPlan[] = [
  {
    name: "Barkeep",
    kind: "walk",
    pace: 0.8,
    route: [
      { x: 5.0, z: 2.3, wait: 5, arms: "hold", face: -Math.PI / 2 },
      { x: 5.0, z: 4.0, wait: 3, arms: "hold", face: -Math.PI / 2 },
      { x: 5.2, z: 5.4, wait: 4, arms: "cross", face: -Math.PI / 2 },
      { x: 8.6, z: 4.4, wait: 3, arms: "reach", face: Math.PI / 2 },
    ],
    dress: ["doublet", "waist"],
    seed: 11,
  },
  {
    name: "Cook",
    kind: "walk",
    pace: 0.9,
    route: [
      { x: 8.1, z: 11.6, wait: 6, arms: "reach", face: 0 },
      { x: 7.9, z: 9.3 },
      { x: 6.0, z: 9.4, wait: 5, arms: "hold", face: Math.PI / 2 },
      { x: 6.0, z: 12.2, wait: 4, arms: "hold", face: Math.PI / 2 },
      { x: 6.0, z: 9.4 },
      { x: 7.9, z: 9.3 },
    ],
    dress: ["doublet"],
    seed: 23,
  },
  { name: "Patron", kind: "sit", seat: { x: TABLES[0].x - 0.5, z: TABLES[0].z - BENCH + SEAT_IN, yaw: 0, arms: "eat" }, dress: ["doublet", "cape"], seed: 31 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[2].x + 0.4, z: TABLES[2].z + BENCH - SEAT_IN, yaw: Math.PI, arms: "knees" }, dress: ["doublet", "waist"], seed: 37 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[3].x + 0.5, z: TABLES[3].z - BENCH + SEAT_IN, yaw: 0, arms: "eat" }, dress: ["mail"], seed: 41 },
  { name: "Patron", kind: "sit", seat: { x: TABLES[1].x + 0.3, z: TABLES[1].z + BENCH - SEAT_IN, yaw: Math.PI, arms: "hold" }, dress: ["doublet"], seed: 47 },
  {
    name: "Patron",
    kind: "walk",
    pace: 1.1,
    route: [
      { x: 0.0, z: 1.2, wait: 1.5 },
      { x: 2.6, z: 2.0 },
      { x: 2.8, z: 3.5, wait: 6, arms: "hold", face: Math.PI / 2 },
      { x: 2.55, z: 7.0 },
      { x: 2.2, z: 8.3 },
      { x: -1.4, z: 8.3 },
      { x: -5.6, z: 9.3 },
      { x: -6.6, z: 11.9, wait: 7, arms: "cross", face: 0 },
      { x: -5.6, z: 9.3 },
      { x: -1.2, z: 8.9 },
      { x: -1.6, z: 3.4, wait: 2 },
    ],
    dress: ["doublet", "waist", "cape"],
    seed: 53,
  },
  {
    name: "Patron",
    kind: "walk",
    pace: 1.0,
    route: [
      { x: -2.6, z: 1.6 },
      { x: -2.6, z: 8.6 },
      { x: 3.0, z: 8.8 },
      { x: 2.55, z: 6.9, wait: 5, arms: "hold", face: Math.PI / 2 },
      { x: 2.55, z: 2.6 },
      { x: -1.2, z: 1.0, wait: 3, arms: "cross" },
    ],
    dress: ["tabard", "mail"],
    seed: 59,
  },
  {
    name: "Townsman",
    kind: "walk",
    pace: 1.15,
    route: [
      { x: -2.0, z: -3.0, wait: 3, arms: "cross" },
      { x: -1.6, z: -20 },
      { x: -1.2, z: -42, wait: 4, arms: "hold", face: Math.PI },
      { x: 1.8, z: -28 },
      { x: 2.0, z: -8 },
    ],
    dress: ["doublet", "cape"],
    seed: 67,
  },
  {
    name: "Townswoman",
    kind: "walk",
    pace: 1.0,
    route: [
      { x: 1.6, z: -40 },
      { x: 1.7, z: -27.6, wait: 5, arms: "hold", face: Math.PI / 2 },
      { x: 1.2, z: -4.0, wait: 3 },
      { x: -2.4, z: -14.0 },
      { x: -1.8, z: -31.5, wait: 5, arms: "hold", face: -Math.PI / 2 },
    ],
    dress: ["doublet", "waist"],
    seed: 71,
  },
];

// ---- Walking -----------------------------------------------------------------------------------

/** Bodies bump solids at their own height: from the knees to the top of the head. */
function pushOut(P: { x: number; z: number }, feet: number, r: number, extra: Solid[]) {
  const test = (s: Solid) => {
    if (!s.walk || s.y1 <= feet + 0.3 || s.y0 >= feet + 1.7) return;
    const nx = Math.max(s.x0, Math.min(P.x, s.x1));
    const nz = Math.max(s.z0, Math.min(P.z, s.z1));
    const dx = P.x - nx;
    const dz = P.z - nz;
    const q = dx * dx + dz * dz;
    if (q >= r * r) return;
    if (q > 1e-9) {
      const l = Math.sqrt(q);
      P.x = nx + (dx / l) * r;
      P.z = nz + (dz / l) * r;
      return;
    }
    // Inside: out by the nearest face.
    const e = [P.x - s.x0, s.x1 - P.x, P.z - s.z0, s.z1 - P.z];
    const m = e.indexOf(Math.min(...e));
    if (m === 0) P.x = s.x0 - r;
    if (m === 1) P.x = s.x1 + r;
    if (m === 2) P.z = s.z0 - r;
    if (m === 3) P.z = s.z1 + r;
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
  const P = { x: 0, z: 0 };
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
        P.x = nx;
        P.z = nz;
        pushOut(P, y, BODY_RADIUS, extra);
        const g = groundAt(P.x, P.z, y);
        if (g === null) return false;
        x = P.x;
        z = P.z;
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
