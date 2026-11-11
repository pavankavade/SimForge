// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).

export const TIER = 0.22; // How far a walkway stands above its basin.
export const RISER = 0.11;
export const TREAD = 1 / 3; // Whole thirds, so a passage's rows of stone meet at cell edges.
export const STEP_RING = 0.33; // How wide each of the two steps down into a basin is.
const SMALLEST_BASIN = 5;
const BED = 0.03;

export interface BasinRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface DungeonStairs {
  steps: Int16Array;
  off: Float32Array;
  axis: Int8Array;
  sign: Int8Array;
  cap: Float32Array;
}

export interface FloorDungeonLike {
  W: number;
  H: number;
  seed: number;
  grid: Uint8Array;
  roomId: Int16Array;
  rooms: Array<{
    id: number;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    baysX: number[];
    baysZ: number[];
    pit: BasinRect | null;
  }>;
  props: Array<{ kind: string; x: number; y: number; roomId?: number }>;
  stairs?: DungeonStairs;
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function placeBasin(r: FloorDungeonLike["rooms"][number]): BasinRect | null {
  const lo = { x: r.x0, z: r.y0 };
  const hi = { x: r.x1 + 1, z: r.y1 + 1 };
  const across = (from: number, to: number, lines: number[]): [number, number] | null => {
    const clear = (e: number) => lines.slice(1, -1).every((l) => Math.abs(l - e) >= 1.15);
    for (const a of [2, 3, 4]) {
      for (const b of [2, 3, 4]) {
        if (to - b - (from + a) >= SMALLEST_BASIN && clear(from + a) && clear(to - b)) {
          return [from + a, to - b];
        }
      }
    }
    return null;
  };
  const x = across(lo.x, hi.x, r.baysX);
  const z = across(lo.z, hi.z, r.baysZ);
  return x && z ? { x0: x[0], x1: x[1], z0: z[0], z1: z[1] } : null;
}

export function planFloors(d: FloorDungeonLike): void {
  const { W, H, grid, roomId } = d;
  for (const r of d.rooms) r.pit = placeBasin(r);

  for (const e of d.props) {
    if (e.kind !== "ember") continue;
    const p = e.roomId !== undefined ? d.rooms[e.roomId]?.pit : null;
    if (!p) continue;
    e.x = Math.max(p.x0 + 1, Math.min(p.x1 - 2, e.x));
    e.y = Math.max(p.z0 + 1, Math.min(p.z1 - 2, e.y));
  }

  const steps = new Int16Array(W * H).fill(-1);
  const off = new Float32Array(W * H);
  const axis = new Int8Array(W * H);
  const sign = new Int8Array(W * H);
  const cap = new Float32Array(W * H);
  const passage = (c: number) => c >= 0 && c < W * H && grid[c] === 1 && roomId[c] < 0;
  const DIRS: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const key = new Float32Array(W * H).fill(Infinity);

  for (let c = 0; c < W * H; c++) {
    if (!passage(c)) continue;
    for (let k = 0; k < 4; k++) {
      const [dx, dy] = DIRS[k];
      const n = c - dx - dy * W;
      if (n < 0 || n >= W * H || roomId[n] < 0 || grid[n] !== 1) continue;
      const level = d.rooms[roomId[n]].pit ? TIER : 0;
      const o = (level / RISER) * TREAD;
      if (o < key[c]) {
        key[c] = o;
        steps[c] = 0;
        off[c] = o;
        axis[c] = dx ? 0 : 1;
        sign[c] = dx || dy;
      }
    }
  }

  for (let changed = true; changed; ) {
    changed = false;
    for (let c = 0; c < W * H; c++) {
      if (steps[c] < 0) continue;
      for (const [dx, dy] of DIRS) {
        const n = c + dx + dy * W;
        if (!passage(n)) continue;
        const next = off[c] + steps[c] + 1;
        if (next < key[n] - 1e-4) {
          key[n] = next;
          steps[n] = steps[c] + 1;
          off[n] = off[c];
          axis[n] = dx ? 0 : 1;
          sign[n] = dx || dy;
          changed = true;
        }
      }
    }
  }

  const seen = new Uint8Array(W * H);
  for (let c = 0; c < W * H; c++) {
    if (!passage(c) || seen[c]) continue;
    const list = [c];
    seen[c] = 1;
    for (let i = 0; i < list.length; i++) {
      for (const [dx, dy] of DIRS) {
        const n = list[i] + dx + dy * W;
        if (passage(n) && !seen[n]) {
          seen[n] = 1;
          list.push(n);
        }
      }
    }
    const lowest = Math.max(...list.map((q) => (off[q] / TREAD) * RISER));
    const top = Math.max(
      lowest,
      [TIER, TIER * 2, TIER * 3, TIER * 4][Math.floor(hash(c, d.seed ?? 0) * 4)]
    );
    for (const q of list) cap[q] = top;
  }
  d.stairs = { steps, off, axis, sign, cap };
}

const SEEK: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

function climb(s: DungeonStairs, c: number, x: number, z: number, back: number): number {
  const f = s.axis[c] ? z - Math.floor(z) : x - Math.floor(x);
  const along = s.sign[c] > 0 ? f : 1 - f;
  return s.off[c] + Math.max(0, s.steps[c] + along - back - 1);
}

function inRoom(r: FloorDungeonLike["rooms"][number], x: number, z: number): number {
  const p = r.pit;
  if (!p) return 0;
  return Math.max(p.x0 - x, x - p.x1, p.z0 - z, z - p.z1);
}

export function floorAt(d: FloorDungeonLike, x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (const [ox, oz] of SEEK) {
    const cx = ix + ox;
    const cz = iz + oz;
    if (cx < 0 || cz < 0 || cx >= d.W || cz >= d.H) continue;
    const c = cz * d.W + cx;
    if (d.grid[c] !== 1) continue;
    if (d.roomId[c] >= 0) {
      const out = inRoom(d.rooms[d.roomId[c]], x, z);
      return out <= 0 ? 0 : out < STEP_RING ? TIER / 2 : TIER;
    }
    const s = d.stairs;
    if (!s) return 0;
    return Math.min(s.cap[c], Math.floor(climb(s, c, x, z, 0) / TREAD + 1e-5) * RISER);
  }
  return 0;
}

export function bedAt(d: FloorDungeonLike, x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (const [ox, oz] of SEEK) {
    const cx = ix + ox;
    const cz = iz + oz;
    if (cx < 0 || cz < 0 || cx >= d.W || cz >= d.H) continue;
    const c = cz * d.W + cx;
    if (d.grid[c] !== 1) continue;
    if (d.roomId[c] >= 0) {
      const r = d.rooms[d.roomId[c]];
      if (!r.pit) return -BED;
      const out = inRoom(r, x, z);
      return out <= 0.1 ? 0 : out < STEP_RING ? TIER / 2 - BED : TIER - BED;
    }
    const s = d.stairs;
    if (!s) return -BED;
    const below = Math.min(s.cap[c], Math.floor(climb(s, c, x, z, 0.25) / TREAD + 1e-5) * RISER);
    return below - BED;
  }
  return 0;
}

export function rampAt(d: FloorDungeonLike, x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const s = d.stairs;
  if (!s) return 0;
  for (const [ox, oz] of SEEK) {
    const cx = ix + ox;
    const cz = iz + oz;
    if (cx < 0 || cz < 0 || cx >= d.W || cz >= d.H) continue;
    const c = cz * d.W + cx;
    if (d.grid[c] !== 1 || d.roomId[c] >= 0) continue;
    return Math.min(s.cap[c], (climb(s, c, x, z, 0) / TREAD) * RISER);
  }
  return 0;
}
