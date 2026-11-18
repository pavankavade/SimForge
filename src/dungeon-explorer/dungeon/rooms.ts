// Room modules: every room on a floor gets a theme (barracks, storeroom, library, ...) that decides
// what furnishes it, and the corridors get clutter and the odd chest. Pure (grid cells in, a plan
// out), so it can be tested headless over many seeds. Pieces are axis-aligned rectangles: a wall
// piece backs onto a flat stretch of wall and faces the room, a centre piece stands in the middle.
// Their collision circles go into `d.props` before the crypt is built (the pilasters beside them
// become corbels), and the cells under them are taken out of the walkable grid where that leaves
// the way open.
import { floorAt } from "./floors";
import { FLOOR, type DungeonData, type DungeonProp, type DungeonRoom } from "./generator";

const CELL = 1.5; // metres per cell (view.ts CELL_M)

export type PieceKind =
  | "bed"
  | "bench"
  | "cabinet"
  | "commode"
  | "bookshelf"
  | "shelves"
  | "crate"
  | "crateStack"
  | "barrel"
  | "barrelPair"
  | "sundries"
  | "weaponRack"
  | "shieldWall"
  | "chest"
  | "statue"
  | "throne"
  | "vases"
  | "messTable"
  | "guardFire"
  | "studyTable"
  | "pews"
  | "hearth";

/** Footprint in metres: w along the wall (or across the room), d out from the wall. */
export const PIECES: Record<PieceKind, { w: number; d: number }> = {
  bed: { w: 1.55, d: 2.1 },
  bench: { w: 1.2, d: 0.55 },
  cabinet: { w: 1.75, d: 1.15 },
  commode: { w: 1.25, d: 0.62 },
  bookshelf: { w: 1.4, d: 0.62 },
  shelves: { w: 0.7, d: 0.5 },
  crate: { w: 0.9, d: 0.5 },
  crateStack: { w: 1.25, d: 1.2 },
  barrel: { w: 0.66, d: 0.66 },
  barrelPair: { w: 1.4, d: 0.72 },
  sundries: { w: 1.0, d: 0.5 },
  weaponRack: { w: 1.7, d: 0.42 },
  shieldWall: { w: 1.3, d: 0.4 },
  chest: { w: 1.0, d: 0.58 },
  statue: { w: 1.6, d: 1.6 },
  throne: { w: 1.3, d: 1.1 },
  vases: { w: 1.1, d: 0.5 },
  messTable: { w: 2.4, d: 2.7 },
  guardFire: { w: 2.7, d: 2.7 },
  studyTable: { w: 2.4, d: 2.0 },
  pews: { w: 3.0, d: 2.6 },
  hearth: { w: 1.5, d: 1.5 },
};

export type ModuleId = "market" | "barracks" | "storeroom" | "library" | "messhall" | "armory" | "guardroom" | "chapel" | "treasury" | "throne";

export interface RoomModule {
  id: ModuleId;
  name: string;
  /** Wall pieces, tried in order (the list repeats from `repeatFrom` while there is wall left). */
  walls: PieceKind[];
  repeatFrom: number;
  /** At most this many wall pieces. */
  maxWalls: number;
  /** Centre pieces, tried in order (each placed once if it fits). */
  centre: PieceKind[];
  /** Chests (some may also come from `walls`). */
  chests: [number, number];
}

export const MODULES: Record<ModuleId, RoomModule> = {
  market: { id: "market", name: "Market", walls: [], repeatFrom: 0, maxWalls: 0, centre: [], chests: [0, 0] },
  barracks: { id: "barracks", name: "Barracks", walls: ["bed", "bed", "weaponRack", "bed", "barrel", "bed", "crate"], repeatFrom: 3, maxWalls: 8, centre: ["messTable"], chests: [1, 1] },
  storeroom: { id: "storeroom", name: "Storeroom", walls: ["crateStack", "barrelPair", "shelves", "sundries", "crate", "barrel", "crateStack"], repeatFrom: 0, maxWalls: 9, centre: [], chests: [1, 2] },
  library: { id: "library", name: "Library", walls: ["bookshelf", "bookshelf", "cabinet", "commode", "bookshelf", "shelves"], repeatFrom: 0, maxWalls: 7, centre: ["studyTable"], chests: [0, 1] },
  messhall: { id: "messhall", name: "Mess hall", walls: ["barrelPair", "commode", "sundries", "barrel"], repeatFrom: 0, maxWalls: 5, centre: ["messTable", "messTable"], chests: [0, 1] },
  armory: { id: "armory", name: "Armoury", walls: ["weaponRack", "shieldWall", "weaponRack", "crate", "shieldWall", "barrel"], repeatFrom: 0, maxWalls: 6, centre: ["bench"], chests: [1, 1] },
  guardroom: { id: "guardroom", name: "Guardroom", walls: ["weaponRack", "bench", "barrel", "crate", "bench"], repeatFrom: 0, maxWalls: 5, centre: ["guardFire"], chests: [0, 1] },
  chapel: { id: "chapel", name: "Chapel", walls: ["statue", "bench", "vases", "bench"], repeatFrom: 1, maxWalls: 5, centre: ["pews"], chests: [0, 1] },
  treasury: { id: "treasury", name: "Treasury", walls: ["vases", "commode", "statue", "vases", "crate"], repeatFrom: 0, maxWalls: 5, centre: [], chests: [3, 4] },
  throne: { id: "throne", name: "Throne room", walls: ["throne", "statue", "statue", "barrelPair", "weaponRack"], repeatFrom: 1, maxWalls: 5, centre: ["guardFire"], chests: [1, 1] },
};

export interface Piece {
  kind: PieceKind;
  /** Room id, or -1 in a corridor. */
  room: number;
  /** Middle of the footprint on the floor (cells, grid space) and the floor height (cells). */
  x: number;
  z: number;
  floor: number;
  /** Turn about y: the piece's front (+Z) faces (sin yaw, cos yaw). */
  yaw: number;
  /** Half extents in cells along x and z of the grid (after turning). */
  hx: number;
  hz: number;
  /** Lootable (a chest). */
  chest?: boolean;
}

export interface FloorPlan {
  modules: ModuleId[];
  pieces: Piece[];
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which module each room gets: by its role, then by size, avoiding repeats. */
export function assignModules(d: DungeonData, rand: () => number): ModuleId[] {
  const used: Record<string, number> = {};
  const pick = (opts: ModuleId[]) => {
    let best = opts[0];
    let bestScore = -Infinity;
    for (const o of opts) {
      const s = rand() - (used[o] ?? 0) * 0.8;
      if (s > bestScore) {
        bestScore = s;
        best = o;
      }
    }
    used[best] = (used[best] ?? 0) + 1;
    return best;
  };
  return d.rooms.map((r: DungeonRoom) => {
    if (r.id === d.entrance) return "market";
    if (r.type === "boss") return "throne";
    if (r.type === "treasure") return "treasury";
    if (r.type === "shrine") return "chapel";
    const small = Math.min(r.w, r.h) <= 7;
    const large = Math.min(r.w, r.h) >= 10;
    if (r.type === "elite") return pick(large ? ["barracks", "armory"] : ["armory", "guardroom"]);
    if (small) return pick(["storeroom", "guardroom", "library", "armory"]);
    if (large) return pick(["messhall", "barracks", "library"]);
    return pick(["barracks", "library", "guardroom", "messhall", "storeroom"]);
  });
}

interface Box {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Plan the furnishings of every room but the market (planned by market.ts) and the corridors. */
export function planFloor(d: DungeonData, start: { x: number; z: number }, keepClear: Box[] = []): FloorPlan {
  const rand = rng((d.seed ^ 0x2f6b13a7) >>> 0);
  const modules = assignModules(d, rand);
  const { W, H, grid, roomId, doorway, corridor } = d;
  const pieces: Piece[] = [];
  const taken: Box[] = keepClear.slice();
  const cellOf = (x: number, z: number) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    return ix < 0 || iz < 0 || ix >= W || iz >= H ? -1 : iz * W + ix;
  };
  const isFloor = (x: number, z: number) => {
    const c = cellOf(x, z);
    return c >= 0 && grid[c] === FLOOR;
  };
  const nearDoor = (x: number, z: number, reach: number) => {
    for (let oz = -reach; oz <= reach; oz++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const c = cellOf(x + ox, z + oz);
        if (c >= 0 && doorway[c]) return true;
      }
    }
    return false;
  };
  const props = d.props.filter((p) => p.radius || p.kind === "stand" || p.kind === "ember");

  /** Is the box (cells) free floor of `room` (or corridor when room < 0), level, clear of everything? */
  const clear = (b: Box, room: number, floor: number, margin: number) => {
    for (let x = b.x0 + 0.05; x <= b.x1 - 0.05 + 1e-6; x += Math.max(0.1, (b.x1 - b.x0 - 0.1) / 4)) {
      for (let z = b.z0 + 0.05; z <= b.z1 - 0.05 + 1e-6; z += Math.max(0.1, (b.z1 - b.z0 - 0.1) / 4)) {
        const c = cellOf(x, z);
        if (c < 0 || grid[c] !== FLOOR) return false;
        if (room >= 0 ? roomId[c] !== room : roomId[c] >= 0 || !corridor[c]) return false;
        if (Math.abs(floorAt(d, x, z) - floor) > 0.01) return false;
      }
    }
    for (const t of taken) if (b.x0 < t.x1 + margin && b.x1 > t.x0 - margin && b.z0 < t.z1 + margin && b.z1 > t.z0 - margin) return false;
    for (const p of props) {
      const px = p.x + 0.5;
      const pz = p.y + 0.5;
      const keep = (p.radius ?? 0.15) + (p.kind === "ember" ? 0.9 : 0.2);
      const cx = Math.max(b.x0, Math.min(px, b.x1));
      const cz = Math.max(b.z0, Math.min(pz, b.z1));
      if (Math.hypot(cx - px, cz - pz) < keep) return false;
    }
    // Keep the way through every doorway clear: its width (and a little) for about two metres in.
    for (const a of d.arches) {
      const ax = a.x + 0.5;
      const az = a.y + 0.5;
      const along = a.len / 2 + 0.45;
      const across = 1.9;
      const hx = a.px * along + a.py * across;
      const hz = a.py * along + a.px * across;
      if (b.x0 < ax + hx && b.x1 > ax - hx && b.z0 < az + hz && b.z1 > az - hz) return false;
    }
    const mx = (b.x0 + b.x1) / 2;
    const mz = (b.z0 + b.z1) / 2;
    if (Math.hypot(mx - start.x, mz - start.z) < 1.6) return false;
    return true;
  };

  const put = (kind: PieceKind, room: number, x: number, z: number, yaw: number, floor: number, chest = false) => {
    const s = PIECES[kind];
    const across = Math.abs(Math.sin(yaw)) > 0.5;
    const hx = (across ? s.d : s.w) / 2 / CELL;
    const hz = (across ? s.w : s.d) / 2 / CELL;
    pieces.push({ kind, room, x, z, floor, yaw, hx, hz, chest: chest || undefined });
    taken.push({ x0: x - hx, z0: z - hz, x1: x + hx, z1: z + hz });
  };

  /** Wall spots of a room: [x, z (on the wall line), normal x, normal z] every quarter cell. */
  const wallSpots = (r: DungeonRoom) => {
    const out: Array<[number, number, number, number]> = [];
    const sides: Array<{ line: number; from: number; to: number; nx: number; nz: number }> = [
      { line: r.y0, from: r.x0, to: r.x1 + 1, nx: 0, nz: 1 },
      { line: r.y1 + 1, from: r.x0, to: r.x1 + 1, nx: 0, nz: -1 },
      { line: r.x0, from: r.y0, to: r.y1 + 1, nx: 1, nz: 0 },
      { line: r.x1 + 1, from: r.y0, to: r.y1 + 1, nx: -1, nz: 0 },
    ];
    for (const s of sides) {
      for (let a = s.from + 0.3; a <= s.to - 0.3; a += 0.25) {
        out.push(s.nz !== 0 ? [a, s.line, s.nx, s.nz] : [s.line, a, s.nx, s.nz]);
      }
    }
    // Shuffle, so pieces spread round the room.
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  };

  /** Try to stand a piece against a wall of `r`; true when it went in. */
  const onWall = (r: DungeonRoom, kind: PieceKind, chest = false) => {
    const s = PIECES[kind];
    const half = s.w / 2 / CELL;
    const dep = s.d / CELL;
    // The masonry stands a little proud of the grid line (see marketView WALL_GAP).
    const gap = 0.14;
    for (const [wx, wz, nx, nz] of wallSpots(r)) {
      const tx = -nz;
      const tz = nx;
      const cx = wx + nx * (gap + dep / 2);
      const cz = wz + nz * (gap + dep / 2);
      const hx = Math.abs(tx) * half + Math.abs(nx) * (dep / 2);
      const hz = Math.abs(tz) * half + Math.abs(nz) * (dep / 2);
      const b = { x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz };
      const floor = floorAt(d, cx, cz);
      // Solid wall right behind, room to stand in front, and no doorway near.
      let backed = true;
      for (const a of [-half, 0, half]) if (isFloor(wx + tx * a - nx * 0.3, wz + tz * a - nz * 0.3)) backed = false;
      if (!backed) continue;
      const fx = wx + nx * (gap + dep + 0.7);
      const fz = wz + nz * (gap + dep + 0.7);
      if (!isFloor(fx, fz) || roomId[cellOf(fx, fz)] !== r.id) continue;
      if (!clear(b, r.id, floor, 0.12)) continue;
      put(kind, r.id, cx, cz, Math.atan2(nx, nz), floor, chest);
      return true;
    }
    return false;
  };

  /** A centre piece near the middle of `r` (along its long side), nudged until it fits. */
  const inMiddle = (r: DungeonRoom, kind: PieceKind, slot: number, count: number) => {
    const s = PIECES[kind];
    const long = r.w >= r.h;
    const yaw = long ? Math.PI / 2 : 0;
    const hx = (long ? s.d : s.w) / 2 / CELL;
    const hz = (long ? s.w : s.d) / 2 / CELL;
    const mx = (r.x0 + r.x1 + 1) / 2;
    const mz = (r.y0 + r.y1 + 1) / 2;
    // Several centre pieces share the long axis.
    const spread = count > 1 ? ((slot - (count - 1) / 2) * (long ? r.w : r.h)) / (count + 0.6) : 0;
    const bx = mx + (long ? spread : 0);
    const bz = mz + (long ? 0 : spread);
    for (const [ox, oz] of [
      [0, 0],
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
      [1, 0.5],
      [-1, -0.5],
      [1, -1],
      [-1, 1],
    ]) {
      const cx = bx + ox;
      const cz = bz + oz;
      const b = { x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz };
      const floor = floorAt(d, cx, cz);
      if (!clear(b, r.id, floor, 0.35)) continue;
      // Keep a walkway round it.
      const ring = [
        [b.x0 - 0.7, cz],
        [b.x1 + 0.7, cz],
        [cx, b.z0 - 0.7],
        [cx, b.z1 + 0.7],
      ];
      if (!ring.every(([x, z]) => isFloor(x, z))) continue;
      put(kind, r.id, cx, cz, yaw, floor);
      return true;
    }
    return false;
  };

  // The crypt lights some rooms with a fire on the floor: where the module brings its own fire pit
  // that one goes, elsewhere it gets a stone hearth round it.
  for (let k = d.props.length - 1; k >= 0; k--) {
    const e = d.props[k];
    if (e.kind !== "ember" || e.roomId === undefined || e.roomId < 0) continue;
    const m = MODULES[modules[e.roomId]];
    if (m.centre.indexOf("guardFire") >= 0) {
      d.props.splice(k, 1);
      continue;
    }
    if (m.id === "market") continue;
    put("hearth", e.roomId, e.x + 0.5, e.y + 0.5, 0, floorAt(d, e.x + 0.5, e.y + 0.5));
  }
  props.splice(0, props.length, ...d.props.filter((p) => p.radius || p.kind === "stand"));

  d.rooms.forEach((r, i) => {
    const m = MODULES[modules[i]];
    if (m.id === "market") return;
    m.centre.forEach((k, j) => inMiddle(r, k, j, m.centre.length));
    const chests = m.chests[0] + Math.floor(rand() * (m.chests[1] - m.chests[0] + 1));
    for (let c = 0; c < chests; c++) onWall(r, "chest", true);
    let placed = 0;
    let fails = 0;
    for (let k = 0; placed < m.maxWalls && fails < 4 && m.walls.length; k++) {
      const idx = k < m.walls.length ? k : m.repeatFrom + ((k - m.walls.length) % (m.walls.length - m.repeatFrom));
      if (onWall(r, m.walls[idx])) {
        placed++;
        fails = 0;
      } else fails++;
      if (k > 40) break;
    }
  });

  // Corridors: clutter along the walls (never closing the way: a cell stays open beside it) and a
  // chest now and then.
  const spots: Array<[number, number]> = [];
  for (let z = 1; z < H - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      const c = z * W + x;
      if (!corridor[c] || roomId[c] >= 0 || grid[c] !== FLOOR) continue;
      spots.push([x, z]);
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = spots[i];
    spots[i] = spots[j];
    spots[j] = t;
  }
  const want = Math.round(spots.length / 14);
  let chestsLeft = Math.max(2, Math.round(spots.length / 60));
  let made = 0;
  for (const [x, z] of spots) {
    if (made >= want) break;
    if (nearDoor(x + 0.5, z + 0.5, 2)) continue;
    for (const [nx, nz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      // A wall on the far side, and two open cells on this side.
      if (isFloor(x - nx + 0.5, z - nz + 0.5)) continue;
      if (!isFloor(x + nx + 0.5, z + nz + 0.5) || !isFloor(x + 2 * nx + 0.5, z + 2 * nz + 0.5)) continue;
      const kinds: PieceKind[] = chestsLeft > 0 && rand() < 0.3 ? ["chest"] : rand() < 0.5 ? ["barrel"] : rand() < 0.5 ? ["crate"] : ["sundries"];
      const kind = kinds[0];
      const s = PIECES[kind];
      const dep = s.d / CELL;
      const half = s.w / 2 / CELL;
      // The wall line is the edge of this cell away from the open side.
      const wx = x + 0.5 - nx * 0.5;
      const wz = z + 0.5 - nz * 0.5;
      const cx = wx + nx * (0.14 + dep / 2);
      const cz = wz + nz * (0.14 + dep / 2);
      const hx = Math.abs(nz) * half + Math.abs(nx) * (dep / 2);
      const hz = Math.abs(nx) * half + Math.abs(nz) * (dep / 2);
      const floor = floorAt(d, cx, cz);
      if (!clear({ x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz }, -1, floor, 0.8)) continue;
      put(kind, -1, cx, cz, Math.atan2(nx, nz), floor, kind === "chest");
      if (kind === "chest") chestsLeft--;
      made++;
      break;
    }
  }
  return { modules, pieces };
}

/** Collision circles for the pieces (as dungeon props), and their cells off the walkable grid. */
export function pieceProps(d: DungeonData, pieces: Piece[]): DungeonProp[] {
  const out: DungeonProp[] = [];
  for (const p of pieces) {
    const r = Math.max(0.12, Math.min(p.hx, p.hz) * 0.95);
    const alongX = p.hx >= p.hz;
    const len = alongX ? p.hx : p.hz;
    const n = Math.max(1, Math.ceil((len * 2) / (r * 1.6)));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : -len + r + ((2 * len - 2 * r) * i) / (n - 1);
      const x = p.x + (alongX ? t : 0);
      const z = p.z + (alongX ? 0 : t);
      out.push({ kind: "deco", x: x - 0.5, y: z - 0.5, rot: 0, scale: 1, radius: r, roomId: p.room });
    }
    if (p.room >= 0) {
      const c = Math.floor(p.z) * d.W + Math.floor(p.x);
      if (c >= 0 && c < d.walkable.length) d.walkable[c] = 0;
    }
  }
  return out;
}
