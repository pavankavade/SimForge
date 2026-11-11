// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).
import { type BasinRect, type DungeonStairs, planFloors } from "./floors";
import type { ThemeName } from "./themes";

export const VOID = 0;
export const FLOOR = 1;
export const WALL = 2;
export const POOL = 3;
export const THEME_NAMES: ThemeName[] = ["ancient", "molten", "frost", "grim", "verdant"];
export const ROLES = ["entrance", "combat", "elite", "treasure", "shrine", "boss"] as const;
export type RoomRole = (typeof ROLES)[number];

interface ThemeRule {
  pools?: { amount: number; pits: number };
  veins?: number;
  lakes?: boolean;
  icicles?: boolean;
  graveyards?: boolean;
  bones?: boolean;
  crypt?: boolean;
  roots?: boolean;
  nameA: string[];
  nameB: string[];
}

export const THEME_RULES: Record<ThemeName, ThemeRule> = {
  ancient: {
    crypt: true,
    nameA: ["Sunken", "Forgotten", "Silent", "Hollow", "Elder", "Broken", "Nameless", "Fallen"],
    nameB: ["Halls", "Vaults", "Catacombs", "Depths", "Sanctum", "Undercroft", "Barrows", "Reliquary"],
  },
  molten: {
    crypt: true,
    pools: { amount: 0.12, pits: 1 },
    veins: 0.8,
    nameA: ["Molten", "Ashen", "Cindered", "Smouldering", "Charred", "Burning", "Ember", "Scorched"],
    nameB: ["Forges", "Furnaces", "Calderas", "Foundry", "Kilns", "Vents", "Crucible", "Depths"],
  },
  frost: {
    crypt: true,
    lakes: true,
    icicles: true,
    nameA: ["Frozen", "Rimebound", "Glacial", "Howling", "Pale", "Shivering", "Wintered", "Whitelocked"],
    nameB: ["Crypts", "Caverns", "Hollows", "Galleries", "Sepulchre", "Warrens", "Reaches", "Throat"],
  },
  grim: {
    crypt: true,
    pools: { amount: 0.05, pits: 1 },
    veins: 0.45,
    graveyards: true,
    bones: true,
    nameA: ["Blighted", "Weeping", "Rotting", "Cursed", "Umbral", "Plagued", "Mournful", "Grim"],
    nameB: ["Necropolis", "Ossuary", "Tombs", "Charnels", "Graves", "Catacombs", "Morgue", "Crypts"],
  },
  verdant: {
    crypt: true,
    roots: true,
    nameA: ["Verdant", "Overgrown", "Sporebound", "Tangled", "Mossgrown", "Waking", "Feral", "Blooming"],
    nameB: ["Gardens", "Warrens", "Roots", "Conservatory", "Hollows", "Groves", "Cisterns", "Arbors"],
  },
};

export const SOLID_RADIUS: Record<string, number> = {
  pier: 0.46,
  stand: 0.14,
  pillar: 0.27,
  chest: 0.42,
  sarco: 0.72,
  grave: 0.2,
  shrineCrystal: 0.48,
  bossCrystal: 1.05,
  brazier: 0.3,
};

const SPAWN_RADIUS = [0, 0.14, 0.17, 0.22];

export interface DungeonRoom {
  id: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  arch: "s" | "m" | "l";
  shape: "rect" | "ellipse" | "oct";
  type: RoomRole;
  depth: number;
  difficulty: number;
  degree: number;
  critical: boolean;
  lake: boolean;
  grave: boolean;
  baysX: number[];
  baysZ: number[];
  pit: BasinRect | null;
}

export interface DungeonEdge {
  a: number;
  b: number;
  isLoop: boolean;
  isCritical: boolean;
  width?: number;
  merged?: boolean;
  route?: number[];
}

export interface DungeonArch {
  x: number;
  y: number;
  px: number;
  py: number;
  len: number;
  role: RoomRole | null;
  alongPassage?: boolean;
}

export interface DungeonProp {
  kind: string;
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  rot: number;
  scale: number;
  roomId: number;
  radius?: number;
  v?: number;
  ice?: number;
}

export interface DungeonSpawn {
  x: number;
  y: number;
  tier: number;
  roomId: number;
  radius: number;
}

export interface DungeonParams {
  seed: number;
  rooms: number;
  loops: number;
  decor: number;
  theme: ThemeName;
}

export interface DungeonData {
  valid: boolean;
  seed: number;
  params: DungeonParams;
  name: string;
  W: number;
  H: number;
  grid: Uint8Array;
  roomId: Int16Array;
  corridor: Uint8Array;
  doorway: Uint8Array;
  walkable: Uint8Array;
  bfs: Int16Array;
  maxBfs: number;
  lakeMask: Uint8Array;
  cut?: Uint8Array;
  rooms: DungeonRoom[];
  edges: DungeonEdge[];
  entrance: number;
  boss: number;
  path: number[];
  maxDepth: number;
  props: DungeonProp[];
  spawns: DungeonSpawn[];
  torches: Array<{ x: number; y: number; dx: number; dy: number }>;
  pools: Array<{ x: number; y: number }>;
  lakeCells: Array<{ x: number; y: number }>;
  arches: DungeonArch[];
  stairs?: DungeonStairs;
  stats: {
    rooms: number;
    edges: number;
    loops: number;
    merged: number;
    critLen: number;
    floorTiles: number;
    reach: number;
    attempts: number;
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    f: (a: number, b: number) => a + r() * (b - a),
    i: (a: number, b: number) => a + Math.floor(r() * (b - a + 1)),
    pick: <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)],
    chance: (p: number) => r() < p,
    raw: r,
  };
}

type Rng = ReturnType<typeof makeRng>;

interface TriPt {
  x: number;
  y: number;
  i: number;
}

interface Tri {
  0: TriPt;
  1: TriPt;
  2: TriPt;
  ccx: number;
  ccy: number;
  r2: number;
}

function delaunay(pts: Array<{ x: number; y: number }>): Array<[number, number]> {
  const n = pts.length;
  if (n < 2) return [];
  if (n === 2) return [[0, 1]];
  const P: TriPt[] = pts.map((p, i) => ({
    x: p.x + ((i * 0.618033) % 1) * 1e-3,
    y: p.y + ((i * 0.414213) % 1) * 1e-3,
    i,
  }));
  let minX = 1e18;
  let minY = 1e18;
  let maxX = -1e18;
  let maxY = -1e18;
  for (const p of P) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dm = Math.max(maxX - minX, maxY - minY, 1);
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  const mkTri = (a: TriPt, b: TriPt, c: TriPt): Tri => {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-12) {
      return { 0: a, 1: b, 2: c, ccx: 0, ccy: 0, r2: Infinity };
    }
    const a2 = a.x * a.x + a.y * a.y;
    const b2 = b.x * b.x + b.y * b.y;
    const c2 = c.x * c.x + c.y * c.y;
    const ccx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const ccy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    const r2 = (a.x - ccx) * (a.x - ccx) + (a.y - ccy) * (a.y - ccy);
    return { 0: a, 1: b, 2: c, ccx, ccy, r2 };
  };
  let tris: Tri[] = [
    mkTri(
      { x: mx - 30 * dm, y: my - dm, i: -1 },
      { x: mx, y: my + 30 * dm, i: -2 },
      { x: mx + 30 * dm, y: my - dm, i: -3 }
    ),
  ];
  for (const p of P) {
    const bad: Tri[] = [];
    const edges: Array<[TriPt, TriPt]> = [];
    for (const t of tris) {
      if ((p.x - t.ccx) * (p.x - t.ccx) + (p.y - t.ccy) * (p.y - t.ccy) < t.r2) bad.push(t);
    }
    for (const t of bad) {
      const verts: [TriPt, TriPt, TriPt] = [t[0], t[1], t[2]];
      for (let e = 0; e < 3; e++) edges.push([verts[e], verts[(e + 1) % 3]]);
    }
    const poly: Array<[TriPt, TriPt]> = [];
    for (let i = 0; i < edges.length; i++) {
      let shared = false;
      for (let j = 0; j < edges.length; j++) {
        if (i === j) continue;
        const a = edges[i];
        const b = edges[j];
        if ((a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0])) {
          shared = true;
          break;
        }
      }
      if (!shared) poly.push(edges[i]);
    }
    tris = tris.filter((t) => bad.indexOf(t) < 0);
    for (const e of poly) tris.push(mkTri(e[0], e[1], p));
  }
  tris = tris.filter((t) => t[0].i >= 0 && t[1].i >= 0 && t[2].i >= 0);
  const seen = new Set<number>();
  const out: Array<[number, number]> = [];
  for (const t of tris) {
    const verts: [TriPt, TriPt, TriPt] = [t[0], t[1], t[2]];
    for (let e = 0; e < 3; e++) {
      const a = verts[e].i;
      const b = verts[(e + 1) % 3].i;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const k = lo * 4096 + hi;
      if (!seen.has(k)) {
        seen.add(k);
        out.push([lo, hi]);
      }
    }
  }
  return out;
}

function giveRoles(rooms: DungeonRoom[], edges: DungeonEdge[], rng: Rng) {
  const N = rooms.length;
  for (const r of rooms) {
    r.type = "combat";
    r.degree = 0;
  }
  for (const e of edges) {
    e.isCritical = false;
    rooms[e.a].degree++;
    rooms[e.b].degree++;
  }
  const adj: Array<Array<{ b: number; i: number }>> = Array.from({ length: N }, () => []);
  edges.forEach((e, i) => {
    adj[e.a].push({ b: e.b, i });
    adj[e.b].push({ b: e.a, i });
  });
  let boss = 0;
  for (let i = 1; i < N; i++) if (rooms[i].w * rooms[i].h > rooms[boss].w * rooms[boss].h) boss = i;
  const distFrom = (src: number) => {
    const D = new Int32Array(N).fill(-1);
    D[src] = 0;
    const q = [src];
    for (let h = 0; h < q.length; h++) {
      for (const e of adj[q[h]]) {
        if (D[e.b] < 0) {
          D[e.b] = D[q[h]] + 1;
          q.push(e.b);
        }
      }
    }
    return D;
  };
  const dB = distFrom(boss);
  let entrance = -1;
  let bestD = -1;
  for (let i = 0; i < N; i++) {
    if (i !== boss && rooms[i].degree === 1 && dB[i] > bestD) {
      bestD = dB[i];
      entrance = i;
    }
  }
  if (entrance < 0) {
    for (let i = 0; i < N; i++) {
      if (i !== boss && dB[i] > bestD) {
        bestD = dB[i];
        entrance = i;
      }
    }
  }
  if (entrance < 0) entrance = 0;
  const dE = distFrom(entrance);
  let maxDepth = 1;
  for (let i = 0; i < N; i++) if (dE[i] > maxDepth) maxDepth = dE[i];
  rooms.forEach((r, i) => {
    r.depth = Math.max(0, dE[i]);
    r.difficulty = Math.min(1, 0.15 + 0.85 * (r.depth / maxDepth));
  });
  rooms[entrance].type = "entrance";
  rooms[entrance].difficulty = 0;
  rooms[boss].type = "boss";
  rooms[boss].difficulty = 1;

  const par = new Int32Array(N).fill(-1);
  const pe = new Int32Array(N).fill(-1);
  const vis = new Uint8Array(N);
  vis[entrance] = 1;
  const q = [entrance];
  for (let h = 0; h < q.length; h++) {
    for (const e of adj[q[h]]) {
      if (!vis[e.b]) {
        vis[e.b] = 1;
        par[e.b] = q[h];
        pe[e.b] = e.i;
        q.push(e.b);
      }
    }
  }
  const crit = new Set<number>();
  const path: number[] = [];
  for (let c = boss; c !== -1; c = par[c]) {
    crit.add(c);
    path.unshift(c);
    if (pe[c] >= 0) edges[pe[c]].isCritical = true;
    if (c === entrance) break;
  }
  for (const r of rooms) r.critical = crit.has(r.id);

  const leaves: number[] = [];
  for (let i = 0; i < N; i++) if (i !== entrance && i !== boss && rooms[i].degree === 1) leaves.push(i);
  leaves.sort((a, b) => rooms[b].depth - rooms[a].depth);
  for (const i of leaves.slice(0, 2)) rooms[i].type = "treasure";

  const shrines: number[] = [];
  for (let i = 0; i < N; i++) {
    const r = rooms[i];
    if (r.type === "combat" && !crit.has(i) && r.depth > maxDepth * 0.25) shrines.push(i);
  }
  if (shrines.length > 0) rooms[shrines[rng.i(0, shrines.length - 1)]].type = "shrine";

  const elites: number[] = [];
  for (const i of crit) {
    const r = rooms[i];
    if (r.type === "combat" && r.depth >= maxDepth * 0.5) elites.push(i);
  }
  elites.sort((a, b) => rooms[a].depth - rooms[b].depth);
  if (elites.length > 0) rooms[elites[elites.length - 1]].type = "elite";

  return { entrance, boss, maxDepth, path };
}

const key2 = (a: number, b: number) => (Math.min(a, b) << 12) | Math.max(a, b);

function trueLinks(W: number, H: number, grid: Uint8Array, roomId: Int16Array, corridor: Uint8Array): Set<number> {
  const links = new Set<number>();
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let c = 0; c < W * H; c++) {
    if (grid[c] !== FLOOR || !corridor[c] || seen[c]) continue;
    seen[c] = 1;
    stack.push(c);
    const touch = new Set<number>();
    while (stack.length) {
      const v = stack.pop()!;
      const x = v % W;
      for (const u of [x > 0 ? v - 1 : -1, x < W - 1 ? v + 1 : -1, v - W, v + W]) {
        if (u < 0 || u >= W * H) continue;
        if (roomId[u] >= 0) touch.add(roomId[u]);
        else if (grid[u] === FLOOR && corridor[u] && !seen[u]) {
          seen[u] = 1;
          stack.push(u);
        }
      }
    }
    const t = Array.from(touch);
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) links.add(key2(t[i], t[j]));
    }
  }
  for (let c = 0; c < W * H; c++) {
    if (roomId[c] < 0) continue;
    if (c % W < W - 1 && roomId[c + 1] >= 0 && roomId[c + 1] !== roomId[c]) links.add(key2(roomId[c], roomId[c + 1]));
    if (c + W < W * H && roomId[c + W] >= 0 && roomId[c + W] !== roomId[c]) links.add(key2(roomId[c], roomId[c + W]));
  }
  return links;
}

interface SearchHeap {
  g?: Int32Array;
  from?: Int32Array;
  stamp?: Int32Array;
  now?: number;
}

function routeCorridor(
  A: DungeonRoom,
  B: DungeonRoom,
  W: number,
  H: number,
  near: Int16Array,
  hug: Uint8Array,
  used: Uint8Array,
  rng: Rng,
  heap: SearchHeap,
  budget: number
): number[] {
  const cost = (c: number) => {
    const owner = near[c];
    if (owner === -2 || (owner >= 0 && owner !== A.id && owner !== B.id)) return 60;
    return used[c] ? 24 : hug[c] ? 4 : 0;
  };
  const line = (pts: Array<[number, number]>) => {
    let score = 0;
    const out: number[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const dx = Math.sign(x1 - x0);
      const dy = Math.sign(y1 - y0);
      for (let x = x0, y = y0; ; x += dx, y += dy) {
        out.push(y * W + x);
        score += cost(y * W + x);
        if (x === x1 && y === y1) break;
      }
    }
    return { out, score };
  };
  const candidates: Array<{ out: number[]; score: number }> = [];
  const ovX = Math.min(A.cx + A.w / 2, B.cx + B.w / 2) - Math.max(A.cx - A.w / 2, B.cx - B.w / 2);
  const ovY = Math.min(A.cy + A.h / 2, B.cy + B.h / 2) - Math.max(A.cy - A.h / 2, B.cy - B.h / 2);
  if (ovX >= 5) {
    const x = Math.round((Math.max(A.cx - A.w / 2, B.cx - B.w / 2) + Math.min(A.cx + A.w / 2, B.cx + B.w / 2)) / 2);
    candidates.push(line([[x, A.cy], [x, B.cy]]));
  }
  if (ovY >= 5) {
    const y = Math.round((Math.max(A.cy - A.h / 2, B.cy - B.h / 2) + Math.min(A.cy + A.h / 2, B.cy + B.h / 2)) / 2);
    candidates.push(line([[A.cx, y], [B.cx, y]]));
  }
  const hv = line([[A.cx, A.cy], [B.cx, A.cy], [B.cx, B.cy]]);
  const vh = line([[A.cx, A.cy], [A.cx, B.cy], [B.cx, B.cy]]);
  if (rng.chance(0.5)) candidates.push(hv, vh);
  else candidates.push(vh, hv);
  let best = candidates[0];
  for (const c of candidates) if (c.score < best.score) best = c;
  if (best.score <= 16) return best.out;

  const N = W * H * 4;
  if (!heap.g || heap.g.length !== N) {
    heap.g = new Int32Array(N);
    heap.from = new Int32Array(N);
    heap.stamp = new Int32Array(N);
    heap.now = 0;
  }
  heap.now = (heap.now ?? 0) + 1;
  const { g, from, stamp, now } = heap as Required<SearchHeap>;
  const DX = [1, -1, 0, 0];
  const DY = [0, 0, 1, -1];
  const goal = B.cy * W + B.cx;
  const open: Array<[number, number]> = [];
  const push = (f: number, s: number) => {
    open.push([f, s]);
    let i = open.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (open[p][0] <= open[i][0]) break;
      const tmp = open[p];
      open[p] = open[i];
      open[i] = tmp;
      i = p;
    }
  };
  const pop = () => {
    const top = open[0];
    const last = open.pop()!;
    if (open.length) {
      open[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < open.length && open[l][0] < open[m][0]) m = l;
        if (r < open.length && open[r][0] < open[m][0]) m = r;
        if (m === i) break;
        const tmp = open[m];
        open[m] = open[i];
        open[i] = tmp;
        i = m;
      }
    }
    return top;
  };
  const h = (c: number) => Math.abs((c % W) - B.cx) + Math.abs(Math.floor(c / W) - B.cy);
  const start = A.cy * W + A.cx;
  for (let d = 0; d < 4; d++) {
    const s = start * 4 + d;
    g[s] = 0;
    stamp[s] = now;
    from[s] = -1;
    push(h(start), s);
  }
  let end = -1;
  let spent = 0;
  while (open.length && spent++ < budget) {
    const [, s] = pop();
    const c = s >> 2;
    const d = s & 3;
    if (c === goal) {
      end = s;
      break;
    }
    const x = c % W;
    const y = Math.floor(c / W);
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DX[nd];
      const ny = y + DY[nd];
      if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) continue;
      const nc = ny * W + nx;
      const ns = nc * 4 + nd;
      const ng = g[s] + 1 + cost(nc) + (nd === d ? 0 : 3);
      if (stamp[ns] === now && g[ns] <= ng) continue;
      stamp[ns] = now;
      g[ns] = ng;
      from[ns] = s;
      push(ng + h(nc), ns);
    }
  }
  if (end < 0) return best.out;
  const out: number[] = [];
  for (let s = end; s !== -1; s = from[s]) out.push(s >> 2);
  return out;
}

function tryGenerate(seed: number, params: DungeonParams): DungeonData {
  const rng = makeRng(seed);
  const dress = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const N = params.rooms;
  const TH = THEME_RULES[params.theme];

  const R = Math.sqrt(N) * 6;
  const rooms: DungeonRoom[] = [];
  const large: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = rng.raw();
    let w: number;
    let h: number;
    let arch: "s" | "m" | "l";
    if (t < 0.35) {
      arch = "s";
      w = rng.i(6, 7);
      h = rng.i(6, 7);
    } else if (t < 0.8) {
      arch = "m";
      w = rng.i(8, 11);
      h = rng.i(8, 11);
    } else {
      arch = "l";
      w = rng.i(12, 16);
      h = rng.i(12, 16);
      large.push(i);
    }
    const st = rng.raw();
    const shape: "rect" | "ellipse" | "oct" = TH.crypt || st < 0.6 ? "rect" : st < 0.82 ? "ellipse" : "oct";
    const ang = rng.f(0, Math.PI * 2);
    const rad = R * Math.sqrt(rng.raw());
    rooms.push({
      id: i,
      cx: Math.cos(ang) * rad,
      cy: Math.sin(ang) * rad,
      w,
      h,
      x0: 0,
      y0: 0,
      x1: 0,
      y1: 0,
      arch,
      shape,
      type: "combat",
      depth: 0,
      difficulty: 0.2,
      degree: 0,
      critical: false,
      lake: false,
      grave: false,
      baysX: [],
      baysZ: [],
      pit: null,
    });
  }
  while (large.length < 2 && N >= 2) {
    const j = rng.i(0, N - 1);
    if (rooms[j].arch !== "l") {
      rooms[j].arch = "l";
      rooms[j].w = rng.i(12, 16);
      rooms[j].h = rng.i(12, 16);
      rooms[j].shape = "rect";
      large.push(j);
    }
  }

  const PAD = 6;
  {
    const CX = new Float64Array(N);
    const CY = new Float64Array(N);
    const HW = new Float64Array(N);
    const HH = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      CX[i] = rooms[i].cx;
      CY[i] = rooms[i].cy;
      HW[i] = rooms[i].w / 2 + PAD / 2;
      HH[i] = rooms[i].h / 2 + PAD / 2;
    }
    for (let iter = 0; iter < 400; iter++) {
      let moved = false;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const ox = HW[i] + HW[j] - Math.abs(CX[i] - CX[j]);
          if (ox <= 0) continue;
          const oy = HH[i] + HH[j] - Math.abs(CY[i] - CY[j]);
          if (oy <= 0) continue;
          moved = true;
          if (ox < oy) {
            const s = CX[i] <= CX[j] ? -1 : 1;
            CX[i] += (s * ox) / 2;
            CX[j] -= (s * ox) / 2;
          } else {
            const s = CY[i] <= CY[j] ? -1 : 1;
            CY[i] += (s * oy) / 2;
            CY[j] -= (s * oy) / 2;
          }
        }
      }
      if (!moved) break;
    }
    for (let i = 0; i < N; i++) {
      rooms[i].cx = Math.round(CX[i]);
      rooms[i].cy = Math.round(CY[i]);
    }
  }

  const centers = rooms.map((r) => ({ x: r.cx, y: r.cy }));
  let delEdges = delaunay(centers);
  if (delEdges.length === 0) {
    delEdges = [];
    for (let i = 0; i < N - 1; i++) delEdges.push([i, i + 1]);
  }
  const elen = (e: [number, number]) => Math.hypot(centers[e[0]].x - centers[e[1]].x, centers[e[0]].y - centers[e[1]].y);
  const adj: Array<Array<{ b: number; w: number; idx: number }>> = Array.from({ length: N }, () => []);
  delEdges.forEach((e, idx) => {
    const w = elen(e);
    adj[e[0]].push({ b: e[1], w, idx });
    adj[e[1]].push({ b: e[0], w, idx });
  });
  const inT = new Uint8Array(N);
  inT[0] = 1;
  let inCount = 1;
  const mstIdx = new Set<number>();
  while (inCount < N) {
    let best: { b: number; w: number; idx: number } | null = null;
    for (let a = 0; a < N; a++) {
      if (inT[a]) {
        for (const e of adj[a]) if (!inT[e.b] && (!best || e.w < best.w)) best = e;
      }
    }
    if (!best) break;
    inT[best.b] = 1;
    inCount++;
    mstIdx.add(best.idx);
  }
  if (inCount < N) {
    return {
      valid: false,
      seed,
      params,
      name: "",
      W: 1,
      H: 1,
      grid: new Uint8Array(1),
      roomId: new Int16Array(1),
      corridor: new Uint8Array(1),
      doorway: new Uint8Array(1),
      walkable: new Uint8Array(1),
      bfs: new Int16Array(1),
      maxBfs: 0,
      lakeMask: new Uint8Array(1),
      rooms: [],
      edges: [],
      entrance: 0,
      boss: 0,
      path: [],
      maxDepth: 0,
      props: [],
      spawns: [],
      torches: [],
      pools: [],
      lakeCells: [],
      arches: [],
      stats: { rooms: N, edges: 0, loops: 0, merged: 0, critLen: 0, floorTiles: 0, reach: 0, attempts: 1 },
    };
  }
  let mstLenSum = 0;
  mstIdx.forEach((i) => {
    mstLenSum += elen(delEdges[i]);
  });
  const mstMean = mstLenSum / Math.max(1, mstIdx.size);
  const edges: DungeonEdge[] = [];
  delEdges.forEach((e, idx) => {
    if (mstIdx.has(idx)) edges.push({ a: e[0], b: e[1], isLoop: false, isCritical: false });
    else if (elen(e) < mstMean * 2.2 && rng.chance(params.loops)) {
      edges.push({ a: e[0], b: e[1], isLoop: true, isCritical: false });
    }
  });
  for (const e of edges) {
    rooms[e.a].degree++;
    rooms[e.b].degree++;
  }

  let minX = 1e9;
  let minY = 1e9;
  let maxX = -1e9;
  let maxY = -1e9;
  for (const r of rooms) {
    minX = Math.min(minX, r.cx - Math.ceil(r.w / 2));
    maxX = Math.max(maxX, r.cx + Math.ceil(r.w / 2));
    minY = Math.min(minY, r.cy - Math.ceil(r.h / 2));
    maxY = Math.max(maxY, r.cy + Math.ceil(r.h / 2));
  }
  const PADG = 7;
  const offX = PADG - minX;
  const offY = PADG - minY;
  const W = maxX - minX + PADG * 2 + 1;
  const H = maxY - minY + PADG * 2 + 1;
  for (const r of rooms) {
    r.cx += offX;
    r.cy += offY;
  }
  const grid = new Uint8Array(W * H);
  const roomId = new Int16Array(W * H).fill(-1);
  const corridor = new Uint8Array(W * H);
  const idx = (x: number, y: number) => y * W + x;
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  for (const r of rooms) {
    const rx = r.w / 2;
    const ry = r.h / 2;
    const ch = Math.min(rx, ry) * 0.55;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1;
    let y1 = -1;
    for (let y = Math.max(0, Math.floor(r.cy - ry)); y <= Math.min(H - 1, Math.ceil(r.cy + ry)); y++) {
      const dy = y - r.cy;
      const ady = Math.abs(dy);
      if (ady > ry) continue;
      for (let x = Math.max(0, Math.floor(r.cx - rx)); x <= Math.min(W - 1, Math.ceil(r.cx + rx)); x++) {
        const dx = x - r.cx;
        const adx = Math.abs(dx);
        if (adx > rx) continue;
        let ok = true;
        if (r.shape === "ellipse") ok = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
        else if (r.shape === "oct") ok = adx <= rx - ch || ady <= ry - ch || adx - (rx - ch) + (ady - (ry - ch)) <= ch;
        if (ok) {
          grid[idx(x, y)] = FLOOR;
          roomId[idx(x, y)] = r.id;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    }
    r.x0 = x0;
    r.y0 = y0;
    r.x1 = x1;
    r.y1 = y1;
  }

  const near = new Int16Array(W * H).fill(-1);
  const CLEAR = 3;
  for (const r of rooms) {
    for (let y = Math.max(0, r.y0 - CLEAR); y <= Math.min(H - 1, r.y1 + CLEAR); y++) {
      for (let x = Math.max(0, r.x0 - CLEAR); x <= Math.min(W - 1, r.x1 + CLEAR); x++) {
        const c = idx(x, y);
        near[c] = near[c] === -1 || near[c] === r.id ? r.id : -2;
      }
    }
  }
  const hug = new Uint8Array(W * H);
  for (const r of rooms) {
    for (let y = Math.max(0, r.y0 - 2); y <= Math.min(H - 1, r.y1 + 2); y++) {
      for (let x = Math.max(0, r.x0 - 2); x <= Math.min(W - 1, r.x1 + 2); x++) {
        if (roomId[idx(x, y)] < 0) hug[idx(x, y)] = 1;
      }
    }
  }
  const used = new Uint8Array(W * H);
  const heap: SearchHeap = {};
  const order = edges.map((_, i) => i).sort((a, b) => Number(edges[a].isLoop) - Number(edges[b].isLoop));
  const dropped = new Set<DungeonEdge>();
  for (const i of order) {
    const e = edges[i];
    e.route = routeCorridor(rooms[e.a], rooms[e.b], W, H, near, hug, used, rng, heap, e.isLoop ? 6000 : 1e9);
    if (e.isLoop && e.route.some((c) => used[c] || (near[c] !== e.a && near[c] !== e.b && near[c] !== -1))) {
      dropped.add(e);
      continue;
    }
    for (const c of e.route) {
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const u = c + oy * W + ox;
          if (u >= 0 && u < W * H && roomId[u] < 0) used[u] = 1;
        }
      }
    }
  }

  if (dropped.size) {
    for (let i = edges.length - 1; i >= 0; i--) if (dropped.has(edges[i])) edges.splice(i, 1);
  }

  const rolesRng = makeRng((seed ^ 0x2f6e2b1) >>> 0);
  let graph = giveRoles(rooms, edges, rolesRng);
  const stamp = (x: number, y: number) => {
    if (inB(x, y) && grid[idx(x, y)] !== FLOOR) {
      grid[idx(x, y)] = FLOOR;
      corridor[idx(x, y)] = 1;
    }
  };
  for (const e of edges) {
    const w = e.isCritical ? 3 : 2;
    const o = w === 2 ? [0, 1] : [-1, 0, 1];
    const route = e.route ?? [];
    for (let i = 0; i < route.length; i++) {
      const c = route[i];
      const n = route[i + 1] ?? c;
      const p = route[i - 1] ?? c;
      const x = c % W;
      const y = Math.floor(c / W);
      const horiz = Math.abs(n - c) === 1 || Math.abs(c - p) === 1;
      const vert = Math.abs(n - c) === W || Math.abs(c - p) === W;
      for (const k of o) {
        if (horiz) stamp(x, y + k);
        if (vert) stamp(x + k, y);
        if (horiz && vert) for (const j of o) stamp(x + j, y + k);
      }
    }
    e.width = w;
    delete e.route;
  }

  const planned = new Set(edges.map((e) => key2(e.a, e.b)));
  let merged = 0;
  trueLinks(W, H, grid, roomId, corridor).forEach((k) => {
    if (planned.has(k)) return;
    edges.push({ a: k >> 12, b: k & 4095, isLoop: true, isCritical: false, width: 2, merged: true });
    merged++;
  });
  if (merged) graph = giveRoles(rooms, edges, rolesRng);
  const { entrance, boss, maxDepth, path } = graph;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[idx(x, y)] !== FLOOR) continue;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(H - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(W - 1, x + 1); nx++) {
          if (grid[idx(nx, ny)] === VOID) grid[idx(nx, ny)] = WALL;
        }
      }
    }
  }
  const doorway = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = idx(x, y);
      if (!corridor[c]) continue;
      if (
        (x < W - 1 && roomId[c + 1] >= 0) ||
        (x > 0 && roomId[c - 1] >= 0) ||
        (y < H - 1 && roomId[c + W] >= 0) ||
        (y > 0 && roomId[c - W] >= 0)
      ) {
        doorway[c] = 1;
      }
    }
  }

  for (const r of rooms) {
    r.lake = false;
    r.grave = false;
  }

  const pools: Array<{ x: number; y: number }> = [];
  if (TH.pools && TH.pools.amount > 0) {
    const nearDoorC = (x: number, y: number, d: number) => {
      for (let oy = -d; oy <= d; oy++) {
        for (let ox = -d; ox <= d; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (inB(nx, ny) && doorway[idx(nx, ny)]) return true;
        }
      }
      return false;
    };
    const cand: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const c = idx(x, y);
        if (grid[c] !== WALL || nearDoorC(x, y, 2)) continue;
        const nf =
          (grid[c + 1] === FLOOR ? 1 : 0) +
          (grid[c - 1] === FLOOR ? 1 : 0) +
          (grid[c + W] === FLOOR ? 1 : 0) +
          (grid[c - W] === FLOOR ? 1 : 0);
        if (nf === 1) cand.push({ x, y });
      }
    }
    for (let i = cand.length - 1; i > 0; i--) {
      const j = dress.i(0, i);
      const t = cand[i];
      cand[i] = cand[j];
      cand[j] = t;
    }
    const target = Math.round(cand.length * TH.pools.amount);
    for (const s of cand) {
      if (pools.length >= target) break;
      let close = false;
      for (const p of pools) {
        if (Math.max(Math.abs(p.x - s.x), Math.abs(p.y - s.y)) < 3) {
          close = true;
          break;
        }
      }
      if (close) continue;
      grid[idx(s.x, s.y)] = POOL;
      pools.push({ x: s.x, y: s.y });
    }
    for (const p of pools) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = p.x + ox;
          const ny = p.y + oy;
          if (inB(nx, ny) && grid[idx(nx, ny)] === VOID) grid[idx(nx, ny)] = WALL;
        }
      }
    }
  }

  const lakeMask = new Uint8Array(W * H);
  const lakeCells: Array<{ x: number; y: number }> = [];
  const arches: DungeonArch[] = [];
  {
    const aseen = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = idx(x, y);
        if (!doorway[c] || aseen[c]) continue;
        let rx = 0;
        if (x < W - 1 && roomId[c + 1] >= 0) rx = 1;
        else if (x > 0 && roomId[c - 1] >= 0) rx = -1;
        const px = rx === 0 ? 1 : 0;
        const py = rx === 0 ? 0 : 1;
        let x0 = x;
        let y0 = y;
        let x1 = x;
        let y1 = y;
        while (inB(x0 - px, y0 - py) && doorway[idx(x0 - px, y0 - py)] && !aseen[idx(x0 - px, y0 - py)]) {
          x0 -= px;
          y0 -= py;
        }
        while (inB(x1 + px, y1 + py) && doorway[idx(x1 + px, y1 + py)] && !aseen[idx(x1 + px, y1 + py)]) {
          x1 += px;
          y1 += py;
        }
        let len = 0;
        for (let ax = x0, ay = y0; ; ax += px, ay += py) {
          aseen[idx(ax, ay)] = 1;
          len++;
          if (ax === x1 && ay === y1) break;
        }
        const wallAt = (ax: number, ay: number) => inB(ax, ay) && grid[idx(ax, ay)] === WALL;
        if ((len <= 3 || TH.crypt) && wallAt(x0 - px, y0 - py) && wallAt(x1 + px, y1 + py)) {
          arches.push({
            x: (x0 + x1) / 2,
            y: (y0 + y1) / 2,
            px,
            py,
            len,
            role: roomId[c + rx] >= 0 ? rooms[roomId[c + rx]].type : null,
          });
        }
      }
    }
  }

  const bfs = new Int16Array(W * H).fill(-1);
  const ei = idx(rooms[entrance].cx, rooms[entrance].cy);
  let floorTotal = 0;
  for (let i = 0; i < W * H; i++) if (grid[i] === FLOOR) floorTotal++;
  let reach = 0;
  let maxBfs = 0;
  if (grid[ei] === FLOOR) {
    const q = new Int32Array(floorTotal);
    let qh = 0;
    let qt = 0;
    q[qt++] = ei;
    bfs[ei] = 0;
    reach = 1;
    while (qh < qt) {
      const c = q[qh++];
      const x = c % W;
      const b = bfs[c] + 1;
      for (const n of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) {
        if (n >= 0 && n < W * H && grid[n] === FLOOR && bfs[n] < 0) {
          bfs[n] = b;
          q[qt++] = n;
          reach++;
        }
      }
    }
    maxBfs = bfs[q[qt - 1]];
  }
  const valid = reach === floorTotal && floorTotal > 0;

  const props: DungeonProp[] = [];
  const spawns: DungeonSpawn[] = [];
  const occ = new Uint8Array(W * H);
  const nearDoor = (x: number, y: number, d: number) => {
    for (let oy = -d; oy <= d; oy++) {
      for (let ox = -d; ox <= d; ox++) {
        if (inB(x + ox, y + oy) && doorway[idx(x + ox, y + oy)]) return true;
      }
    }
    return false;
  };
  const interior = (x: number, y: number) => {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!inB(x + ox, y + oy) || grid[idx(x + ox, y + oy)] !== FLOOR) return false;
      }
    }
    return true;
  };
  const put = (kind: string, x: number, y: number, rot: number, scale: number, rid: number) => {
    props.push({ kind, x, y, rot: rot || 0, scale: scale || 1, roomId: rid });
    occ[idx(x, y)] = 1;
  };

  for (const r of rooms) {
    if (TH.crypt) {
      const lines = (from: number, to: number) => {
        const n = Math.max(1, Math.round((to - from) / 5));
        const out = [from];
        for (let i = 1; i < n; i++) out.push(Math.floor(from + ((to - from) * i) / n) + 0.5);
        out.push(to);
        return out;
      };
      r.baysX = lines(r.x0, r.x1 + 1);
      r.baysZ = lines(r.y0, r.y1 + 1);
      const inApproach = (bx: number, bz: number) =>
        arches.some((a) => {
          const dx = bx - (a.x + 0.5);
          const dz = bz - (a.y + 0.5);
          return Math.abs(dx * a.py + dz * a.px) < 3.2 && Math.abs(dx * a.px + dz * a.py) < a.len / 2 + 1;
        });
      const opening = (line: number, across: (k: number) => boolean) => {
        for (let k = Math.floor(line) - 2; k <= Math.floor(line) + 2; k++) {
          if (Math.abs(k + 0.5 - line) < 1.6 && across(k)) return true;
        }
        return false;
      };
      const isFloor = (x: number, y: number) => inB(x, y) && grid[idx(x, y)] === FLOOR;
      const settle = (list: number[], hits: (v: number) => boolean) => {
        for (let i = 1; i < list.length - 1; i++) {
          if (!hits(list[i])) continue;
          const moved = [1, -1, 2, -2]
            .map((o) => list[i] + o)
            .find((v) => v - list[i - 1] >= 3 && list[i + 1] - v >= 3 && !hits(v));
          if (moved === undefined) list.splice(i--, 1);
          else list[i] = moved;
        }
      };
      settle(r.baysX, (v) => opening(v, (k) => isFloor(k, r.y0 - 1) || isFloor(k, r.y1 + 1)));
      settle(r.baysZ, (v) => opening(v, (k) => isFloor(r.x0 - 1, k) || isFloor(r.x1 + 1, k)));
      const noColumn = (bx: number, bz: number) => {
        const x = Math.floor(bx);
        const y = Math.floor(bz);
        return inApproach(bx, bz) || !interior(x, y) || occ[idx(x, y)] || nearDoor(x, y, 1);
      };
      for (let tries = 0; tries < 8; tries++) {
        let hit: [number, number] | null = null;
        for (const bx of r.baysX.slice(1, -1)) {
          for (const bz of r.baysZ.slice(1, -1)) {
            if (!hit && noColumn(bx, bz)) hit = [bx, bz];
          }
        }
        if (!hit) break;
        const spanX = r.baysX.length;
        const spanZ = r.baysZ.length;
        if (spanX >= spanZ) r.baysX.splice(r.baysX.indexOf(hit[0]), 1);
        else r.baysZ.splice(r.baysZ.indexOf(hit[1]), 1);
      }
      for (const bx of r.baysX.slice(1, -1)) {
        for (const bz of r.baysZ.slice(1, -1)) {
          const x = Math.floor(bx);
          const y = Math.floor(bz);
          if (interior(x, y) && !occ[idx(x, y)] && !nearDoor(x, y, 1)) put("pier", x, y, 0, 1, r.id);
        }
      }
    }

    let area = 0;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (roomId[idx(x, y)] === r.id) area++;
    let count = Math.max(2, Math.round((area / 22) * (0.6 + r.difficulty)));
    if (r.type === "entrance") count = 2;
    else if (r.type === "boss") count = Math.max(3, count);
    const tier = r.type === "boss" || r.type === "elite" ? 3 : Math.max(1, Math.ceil(r.difficulty * 3));
    let guard = 0;
    while (count > 0 && guard++ < 220) {
      const x = dress.i(r.x0 + 1, r.x1 - 1);
      const y = dress.i(r.y0 + 1, r.y1 - 1);
      if (!inB(x, y)) continue;
      const c = idx(x, y);
      if (roomId[c] === r.id && grid[c] === FLOOR && !occ[c] && !lakeMask[c] && interior(x, y) && !nearDoor(x, y, 1)) {
        spawns.push({ x, y, tier, roomId: r.id, radius: SPAWN_RADIUS[tier] });
        occ[c] = 1;
        count--;
      }
    }
  }

  const torches: Array<{ x: number; y: number; dx: number; dy: number }> = [];
  if (TH.crypt) {
    const taken = new Set(props.map((p) => idx(p.x, p.y)));
    const standSpots: Array<[number, number]> = [];
    const clearForStand = (x: number, y: number, room: DungeonRoom) => {
      const cx = x + 0.5;
      const cy = y + 0.5;
      for (const bx of room.baysX) for (const bz of room.baysZ) if (Math.hypot(cx - bx, cy - bz) < 1.2) return false;
      for (const a of arches) {
        const dx = cx - (a.x + 0.5);
        const dy = cy - (a.y + 0.5);
        const along = Math.abs(dx * a.px + dy * a.py);
        const across = Math.abs(dx * a.py + dy * a.px);
        if (across < 1.6 && along < a.len / 2 + 0.7) return false;
      }
      for (const p of props) {
        if (p.kind !== "stand" && Math.hypot(cx - (p.x + 0.5), cy - (p.y + 0.5)) < 1.5) return false;
      }
      for (const s of standSpots) if (Math.hypot(cx - s[0], cy - s[1]) < 3) return false;
      return true;
    };
    for (const a of arches) {
      const nx = a.py;
      const ny = a.px;
      for (const side of [-1, 1]) {
        const dx = Math.round(a.x + nx * side);
        const dy = Math.round(a.y + ny * side);
        if (!inB(dx, dy) || roomId[idx(dx, dy)] < 0) continue;
        const room = rooms[roomId[idx(dx, dy)]];
        for (const along of [-1, 1]) {
          for (const reach of [1.3, 2, 2.8]) {
            const x = Math.round(a.x + nx * side * 1 + a.px * along * (a.len / 2 + reach));
            const y = Math.round(a.y + ny * side * 1 + a.py * along * (a.len / 2 + reach));
            if (
              !inB(x, y) ||
              roomId[idx(x, y)] !== room.id ||
              grid[idx(x, y)] !== FLOOR ||
              taken.has(idx(x, y)) ||
              doorway[idx(x, y)]
            ) {
              continue;
            }
            if (!clearForStand(x, y, room)) continue;
            taken.add(idx(x, y));
            standSpots.push([x + 0.5, y + 0.5]);
            props.push({ kind: "stand", x, y, rot: dress.f(0, 6.28), scale: 1, roomId: room.id });
            break;
          }
        }
      }
    }
    for (const r of rooms) {
      if (r.type === "entrance" || Math.min(r.w, r.h) < 7) continue;
      const a = dress.f(0, 6.28);
      const x = Math.round(r.cx + Math.cos(a) * r.w * 0.28);
      const y = Math.round(r.cy + Math.sin(a) * r.h * 0.28);
      if (inB(x, y) && roomId[idx(x, y)] === r.id && !taken.has(idx(x, y))) {
        props.push({ kind: "ember", x, y, rot: 0, scale: 1, roomId: r.id });
      }
    }
  }
  for (const s of spawns) s.radius = 0;
  for (const p of props) if (SOLID_RADIUS[p.kind]) p.radius = SOLID_RADIUS[p.kind] * (p.scale ?? 1);

  const walkable = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) walkable[i] = grid[i] === FLOOR ? 1 : 0;
  for (const p of props) if (p.radius) walkable[idx(p.x, p.y)] = 0;

  const name = (() => {
    const n = makeRng((seed ^ 0x51ed270b) >>> 0);
    const C = ["Mal", "Vor", "Ash", "Ker", "Ul", "Dra", "Noth", "Zar", "Bel", "Mor", "Gol", "Ith"];
    const D = ["goth", "ath", "ruk", "esh", "mir", "gul", "dan", "oth", "ek", "ash", "uzek", "arim"];
    return `The ${n.pick(TH.nameA)} ${n.pick(TH.nameB)} of ${n.pick(C)}'${n.pick(D)}`;
  })();

  const out: DungeonData = {
    valid,
    seed,
    params,
    name,
    W,
    H,
    grid,
    roomId,
    corridor,
    doorway,
    walkable,
    bfs,
    maxBfs,
    lakeMask,
    rooms,
    edges,
    entrance,
    boss,
    path,
    maxDepth,
    props,
    spawns,
    torches,
    pools,
    lakeCells,
    arches,
    stats: {
      rooms: N,
      edges: edges.length,
      loops: edges.filter((e) => e.isLoop).length,
      merged,
      critLen: path.length - 1,
      floorTiles: floorTotal,
      reach,
      attempts: 1,
    },
  };
  if (TH.crypt) planFloors(out);
  return out;
}

export function generateDungeon({
  seed = 1337,
  rooms = 8,
  loops = 0.3,
  decor = 0.6,
  theme = "verdant",
}: {
  seed?: number;
  rooms?: number;
  loops?: number;
  decor?: number;
  theme?: ThemeName;
} = {}): DungeonData {
  // Keep the dungeon small (10 rooms max).
  const clampedRooms = Math.min(10, Math.max(4, Math.round(rooms)));
  const params: DungeonParams = { seed: seed >>> 0, rooms: clampedRooms, loops, decor, theme };
  if (!THEME_RULES[theme]) throw new Error(`Unknown theme "${theme}".`);
  let s = params.seed;
  let d = tryGenerate(s, params);
  let attempt = 0;
  while (!d.valid && attempt < 8) {
    s = (Math.imul(s, 9301) + 49297) >>> 0;
    attempt++;
    d = tryGenerate(s, params);
  }
  d.stats.attempts = attempt + 1;
  return d;
}
