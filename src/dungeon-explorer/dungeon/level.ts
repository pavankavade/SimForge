// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).
import { floorAt } from "./floors";
import { type DungeonData, FLOOR, POOL, WALL } from "./generator";
import { ROLE_TINT, THEMES, type ThemeName } from "./themes";

// Cell ceiling heights, in cells (1.5 m each). Raised so arched entrances & corridors feel tall and grand.
export const CEIL_TOP = 6.2;
const CEILING = { s: 3.3, m: 3.8, l: 4.4, boss: 5.0, corridor: 3.0 };
export const SPRING = 2.75;
// Taller doorway springline & arch rise (1.50 cells = 2.25 m jambs, crown at 3.0 m to 3.68 m).
export const ARCH_SPRING = 1.5;
export const archRise = (len: number) => Math.min(len / 2, 0.95);

export interface DoorLightSpot {
  x: number;
  y: number;
  bx: number;
  by: number;
  ax: number;
  ay: number;
  way: number;
}

export interface InstanceBuffer {
  n: number;
  m: Float32Array;
  c: Float32Array;
}

export interface LevelData {
  sets: Record<string, InstanceBuffer>;
  heights: Float32Array;
  crowns?: Float32Array;
  stoneCount?: number;
  openAt?: (x: number, z: number) => number;
  layout?: { piers: Array<{ x: number; z: number; bracket: boolean; short?: boolean; room: number }>; arches: DungeonData["arches"] };
  liquids: Array<{ pos: Float32Array; ae: Float32Array; am: Float32Array }>;
  parts: { pos: Float32Array; seed: Float32Array; kind: number; color: number };
  portal: [number, number] | null;
  rune: { x: number; z: number; s: number } | null;
  field: { w: number; h: number; color: Uint8Array; dir: Uint8Array; lamps: number } | null;
}

export function doorLights(d: DungeonData): DoorLightSpot[] {
  const out: DoorLightSpot[] = [];
  for (const a of d.arches) {
    const nx = a.py;
    const ny = a.px;
    for (const side of [-1, 1]) {
      const x = Math.round(a.x + nx * side);
      const y = Math.round(a.y + ny * side);
      if (x < 0 || y < 0 || x >= d.W || y >= d.H || d.grid[y * d.W + x] !== FLOOR || d.roomId[y * d.W + x] >= 0) continue;
      const bx = a.x + 0.5 + nx * side * 1.6;
      const by = a.y + 0.5 + ny * side * 1.6;
      if (d.grid[Math.floor(by) * d.W + Math.floor(bx)] !== FLOOR) break;
      const way = Math.round(a.x + a.y) % 2 ? 1 : -1;
      let run = 0;
      while (
        run < 3 &&
        d.grid[Math.floor(by + a.py * way * (run + 0.1)) * d.W + Math.floor(bx + a.px * way * (run + 0.1))] === FLOOR
      ) {
        run += 0.1;
      }
      const wall = run - 0.08;
      const mx = bx + a.px * way * wall;
      const my = by + a.py * way * wall;
      out.push({ x: mx - a.px * way * 0.17, y: my - a.py * way * 0.17, bx, by, ax: a.px, ay: a.py, way });
      break;
    }
  }
  return out;
}

const lin = (c: number) => (c < 0.04045 ? c * 0.0773993808 : (c * 0.9478672986 + 0.0521327014) ** 2.4);
const rgb = (hex: number): [number, number, number] => [
  lin(((hex >> 16) & 255) / 255),
  lin(((hex >> 8) & 255) / 255),
  lin((hex & 255) / 255),
];
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const mul = (a: [number, number, number], k: number): [number, number, number] => [a[0] * k, a[1] * k, a[2] * k];

class List {
  m: number[] = [];
  c: number[] = [];
  n = 0;

  add(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    ry: number,
    color: [number, number, number],
    rx = 0,
    rz = 0
  ) {
    const a = Math.cos(rx);
    const b = Math.sin(rx);
    const c = Math.cos(ry);
    const d = Math.sin(ry);
    const e = Math.cos(rz);
    const f = Math.sin(rz);
    const ae = a * e;
    const af = a * f;
    const be = b * e;
    const bf = b * f;
    this.m.push(
      c * e * sx,
      (af + be * d) * sx,
      (bf - ae * d) * sx,
      0,
      -c * f * sy,
      (ae - bf * d) * sy,
      (be + af * d) * sy,
      0,
      d * sz,
      -b * c * sz,
      a * c * sz,
      0,
      x,
      y,
      z,
      1
    );
    this.c.push(color[0], color[1], color[2]);
    this.n++;
  }

  done(): InstanceBuffer {
    return { n: this.n, m: new Float32Array(this.m), c: new Float32Array(this.c) };
  }
}

function cutCorners(d: DungeonData): Uint8Array {
  const { W, H, grid, doorway } = d;
  const cut = new Uint8Array(W * H);
  const hung = new Set<number>();
  for (const t of d.torches) hung.add(t.y * W + t.x);
  for (const p of d.props) if (p.kind === "banner" || p.kind === "roots" || p.kind === "icicle") hung.add(p.y * W + p.x);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const c = y * W + x;
      if (grid[c] !== WALL || hung.has(c)) continue;
      const E = grid[c + 1] === FLOOR;
      const W_ = grid[c - 1] === FLOOR;
      const S = grid[c + W] === FLOOR;
      const N = grid[c - W] === FLOOR;
      const count = (E ? 1 : 0) + (W_ ? 1 : 0) + (S ? 1 : 0) + (N ? 1 : 0);
      if (count !== 2 || (E && W_) || (S && N)) continue;
      let nearDoor = false;
      for (let oy = -1; oy <= 1 && !nearDoor; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (doorway[c + oy * W + ox]) {
            nearDoor = true;
            break;
          }
        }
      }
      if (nearDoor) continue;
      cut[c] = E ? (S ? 1 : 2) : N ? 3 : 4;
    }
  }
  return cut;
}

const CUT_RY = [0, 0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function bakeField(d: DungeonData, theme: ThemeName) {
  const TH = THEMES[theme];
  const { W, H, grid } = d;
  const K = 3;
  const fw = W * K;
  const fh = H * K;
  const open = new Float32Array(W * H);
  const cut = d.cut ?? new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) open[i] = grid[i] === FLOOR || grid[i] === POOL || cut[i] ? 1 : 0;
  for (const p of d.props) {
    if (p.radius && p.radius > 0.2) open[p.y * W + p.x] = Math.min(open[p.y * W + p.x], p.kind === "pillar" ? 0.68 : 0.82);
  }

  const lamps: Array<{ x: number; y: number; c: [number, number, number]; i: number; r: number; flat?: boolean }> = [];
  const soft = (c: [number, number, number], k = 0.42) =>
    mix(c, mul([1, 0.86, 0.68], c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1), k);
  const torch = soft(rgb(TH.torchLight[0]));
  const wx = (x: number) => x + 0.5;
  const lampR = TH.lampR ?? 11;
  if (TH.candleLight) {
    for (const p of d.props) {
      if (p.kind === "stand") lamps.push({ x: wx(p.x), y: wx(p.y), c: rgb(TH.candleLight.color), i: TH.candleLight.i, r: TH.candleLight.r });
    }
  }
  if (TH.doorLight) {
    for (const l of doorLights(d)) lamps.push({ x: l.x, y: l.y, c: rgb(TH.doorLight.color), i: TH.doorLight.i, r: TH.doorLight.r });
  }
  if (TH.emberLight) {
    for (const p of d.props) {
      if (p.kind === "ember") lamps.push({ x: wx(p.x), y: wx(p.y), c: rgb(TH.emberLight.color), i: TH.emberLight.i, r: TH.emberLight.r });
    }
  }
  for (const t of d.torches) lamps.push({ x: wx(t.x) + t.dx * 0.62, y: wx(t.y) + t.dy * 0.62, c: torch, i: TH.torchLight[1] * 1.3, r: lampR });
  for (const p of d.props) {
    if (p.kind === "brazier") lamps.push({ x: wx(p.x), y: wx(p.y), c: soft(rgb(TH.flame)), i: 1.7, r: lampR });
    else if (p.kind === "candle") lamps.push({ x: wx(p.x), y: wx(p.y), c: soft(rgb(TH.flame)), i: 0.35, r: 5 });
    else if (p.kind === "chest") lamps.push({ x: wx(p.x), y: wx(p.y), c: rgb(0xffc060), i: 0.5, r: 6 });
  }
  for (const r of d.rooms) {
    if (TH.coldFill) {
      lamps.push({
        x: wx(r.cx),
        y: wx(r.cy),
        c: rgb(TH.coldFill.color),
        i: TH.coldFill.i,
        r: Math.max(r.x1 - r.x0, r.y1 - r.y0) * 0.75 + 4,
        flat: true,
      });
    }
    const grey = (c: [number, number, number]) => (TH.vaults ? mix(c, rgb(0xa6aeac), 0.82) : c);
    const gain = TH.vaults ? 0.35 : 1;
    if (r.type === "entrance" && !TH.vaults) lamps.push({ x: wx(r.cx), y: wx(r.cy), c: grey(rgb(ROLE_TINT.entrance)), i: 1.2 * gain, r: 12 });
    if (r.type === "boss" && !TH.vaults) lamps.push({ x: wx(r.cx), y: wx(r.cy), c: soft(rgb(0xff4030), 0.2), i: 2.6 * gain, r: 20 });
    if (r.type === "shrine" && !TH.vaults) lamps.push({ x: wx(r.cx), y: wx(r.cy), c: grey(rgb(0x6f9dff)), i: 1.5 * gain, r: 11 });
    if (r.type === "elite" && !TH.vaults) lamps.push({ x: wx(r.cx), y: wx(r.cy), c: grey(rgb(0x9b6cf0)), i: 0.7 * gain, r: 9 });
  }
  if (TH.pools?.light) {
    const c = soft(rgb(TH.pools.light), 0.25);
    const i = TH.pools.mode === 0 ? 0.75 : 0.3;
    for (const p of d.pools) lamps.push({ x: wx(p.x), y: wx(p.y), c, i, r: 6 });
  }

  const R = new Float32Array(fw * fh);
  const G = new Float32Array(fw * fh);
  const B = new Float32Array(fw * fh);
  const DX = new Float32Array(fw * fh);
  const DY = new Float32Array(fw * fh);
  const DW = new Float32Array(fw * fh);
  for (const L of lamps) {
    const x0 = Math.max(0, Math.floor((L.x - L.r) * K));
    const x1 = Math.min(fw - 1, Math.ceil((L.x + L.r) * K));
    const y0 = Math.max(0, Math.floor((L.y - L.r) * K));
    const y1 = Math.min(fh - 1, Math.ceil((L.y + L.r) * K));
    const lum = L.c[0] * 0.3 + L.c[1] * 0.6 + L.c[2] * 0.1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = (x + 0.5) / K;
        const py = (y + 0.5) / K;
        const dx = px - L.x;
        const dy = py - L.y;
        const q = dx * dx + dy * dy;
        if (q > L.r * L.r) continue;
        const dist = Math.sqrt(q);
        const win = 1 - q / (L.r * L.r);
        const atten = L.flat ? L.i * win : (L.i * win * win) / (1 + q * 0.2);
        if (atten < 0.004) continue;
        let through = 1;
        const steps = Math.ceil(dist * 2.5);
        for (let s = 1; s < steps; s++) {
          const f = s / steps;
          through *= open[Math.floor(L.y + dy * f) * W + Math.floor(L.x + dx * f)];
          if (through <= 0.001) break;
        }
        if (through <= 0.001) continue;
        const e = atten * through;
        const i = y * fw + x;
        R[i] += L.c[0] * e;
        G[i] += L.c[1] * e;
        B[i] += L.c[2] * e;
        const w = e * lum;
        const n = dist > 0.01 ? 1 / dist : 0;
        DX[i] -= dx * n * w;
        DY[i] -= dy * n * w;
        DW[i] += w;
      }
    }
  }

  const blur = (src: Float32Array) => {
    const a = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const l = src[y * fw + Math.max(0, x - 1)];
        const r = src[y * fw + Math.min(fw - 1, x + 1)];
        a[y * fw + x] = (l + r + src[y * fw + x] * 2) * 0.25;
      }
    }
    const b = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const u = a[Math.max(0, y - 1) * fw + x];
        const v = a[Math.min(fh - 1, y + 1) * fw + x];
        b[y * fw + x] = (u + v + a[y * fw + x] * 2) * 0.25;
      }
    }
    return b;
  };
  const [r, g, b, ddx, ddy, ddw] = [R, G, B, DX, DY, DW].map(blur);

  const aoRaw = new Float32Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const cx = (x + 0.5) / K;
      const cy = (y + 0.5) / K;
      const ix = Math.floor(cx);
      const iy = Math.floor(cy);
      let near = 1.1;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = ix + ox;
          const ny = iy + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const c = ny * W + nx;
          if (grid[c] === FLOOR || grid[c] === POOL) continue;
          const qx = Math.max(nx - cx, 0, cx - nx - 1);
          const qy = Math.max(ny - cy, 0, cy - ny - 1);
          near = Math.min(near, Math.hypot(qx, qy));
        }
      }
      aoRaw[y * fw + x] = near;
    }
  }
  const color = new Uint8Array(fw * fh * 4);
  const dir = new Uint8Array(fw * fh * 4);
  const EMAX = 4;
  for (let i = 0; i < fw * fh; i++) {
    const j = i * 4;
    color[j] = Math.min(255, Math.sqrt(r[i] / EMAX) * 255);
    color[j + 1] = Math.min(255, Math.sqrt(g[i] / EMAX) * 255);
    color[j + 2] = Math.min(255, Math.sqrt(b[i] / EMAX) * 255);
    const near = Math.min(1, aoRaw[i] / 0.9);
    color[j + 3] = (0.3 + 0.7 * near * (2 - near)) * 255;
    const w = ddw[i] > 1e-5 ? 1 / ddw[i] : 0;
    const lx = ddx[i] * w;
    const ly = ddy[i] * w;
    const focus = Math.min(1, Math.hypot(lx, ly));
    dir[j] = (lx * 0.5 + 0.5) * 255;
    dir[j + 1] = (ly * 0.5 + 0.5) * 255;
    dir[j + 2] = focus * 255;
    dir[j + 3] = 255;
  }
  return { w: fw, h: fh, color, dir, lamps: lamps.length };
}

export function buildLevel(d: DungeonData, opts: { noField?: boolean } = {}): LevelData {
  const theme = d.params.theme;
  const TH = THEMES[theme];
  const { W, H, grid, roomId, corridor, rooms, lakeMask } = d;
  d.cut = cutCorners(d);
  const idx = (x: number, y: number) => y * W + x;
  const wx = (x: number) => x - W / 2 + 0.5;
  const wz = (y: number) => y - H / 2 + 0.5;
  let state = (d.seed ^ 0x9e3779b9) >>> 0;
  const raw = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f = (a: number, b: number) => a + raw() * (b - a);
  const pick4 = () => Math.floor(raw() * 4);
  const C: Record<string, [number, number, number]> = {
    floor: rgb(TH.floor),
    corridor: rgb(TH.corridor),
    wall: rgb(TH.wall),
    cap: rgb(TH.cap),
    pillar: rgb(TH.pillar),
    cloth: rgb(TH.cloth),
    flame: rgb(TH.flame),
    flameCore: rgb(TH.flameCore),
  };
  const accent = rgb(Number.parseInt(TH.accent.slice(1), 16));
  const hex = (h: number) => rgb(h);

  const names = [
    "floor",
    "wall",
    "wallCut",
    "wallCap",
    "capCut",
    "ceiling",
    "beam",
    "plinth",
    "pillar",
    "arch",
    "archL",
    "torchArm",
    "flame",
    "debrisA",
    "debrisB",
    "debrisC",
    "chest",
    "chestTrim",
    "chestGlow",
    "grave",
    "sarco",
    "candle",
    "bone",
    "icicle",
    "shardIce",
    "roots",
    "moss",
    "crackD",
    "skirt",
    "bannerRod",
    "bannerCloth",
    "emblem",
    "spawn1",
    "spawn2",
    "spawn3",
    "band2",
    "band3",
    "crystal",
    "markGem",
    "ring",
    "plinthS",
    "post",
    "platform",
    "brazier",
    "coals",
    "basin",
    "bossGlow",
    "bossRock",
    "stand",
    "standWax",
    "sconce",
    "embers",
    "emberCoals",
  ];
  const S: Record<string, List> = {};
  for (const n of names) S[n] = new List();

  const poolAdj = (x: number, y: number) => {
    const c = idx(x, y);
    return (
      (x < W - 1 && grid[c + 1] === POOL) ||
      (x > 0 && grid[c - 1] === POOL) ||
      (y < H - 1 && grid[c + W] === POOL) ||
      (y > 0 && grid[c - W] === POOL)
    );
  };
  const mossMask = new Uint8Array(W * H);
  for (const p of d.props) if (p.kind === "moss") mossMask[idx(p.x, p.y)] = 1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = idx(x, y);
      if (grid[c] !== FLOOR || lakeMask[c]) {
        if (d.cut[c] && !TH.vaults) S.floor.add(wx(x), 0, wz(y), 1, 1, 1, 0, C.corridor);
        continue;
      }
      let base = corridor[c] ? C.corridor : C.floor;
      if (mossMask[c]) base = mix(base, hex(0x4c7a42), 0.32);
      if (TH.pools && TH.pools.mode === 0 && poolAdj(x, y)) base = mix(base, hex(0xff7a33), 0.3);
      if (!TH.vaults) S.floor.add(wx(x), 0, wz(y), 1, 1, 1, 0, base);
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = idx(x, y);
      if (grid[c] !== WALL || TH.vaults) continue;
      const h = 2 + f(-0.25, 0.25);
      const wc = C.wall;
      const cc = mul(C.cap, f(0.92, 1.1));
      if (d.cut[c]) {
        const ry = CUT_RY[d.cut[c]];
        S.wallCut.add(wx(x), 0, wz(y), 1, h, 1, ry, wc);
        S.capCut.add(wx(x), h, wz(y), 1, 1, 1, ry, cc);
      } else {
        S.wall.add(wx(x), 0, wz(y), 1, h, 1, 0, wc);
        S.wallCap.add(wx(x), h, wz(y), 1, 1, 1, 0, cc);
      }
    }
  }
  const heights = new Float32Array(W * H);
  const arched = new Set<number>();
  for (const a of d.arches) {
    for (let i = 0; i < a.len; i++) {
      arched.add(Math.round(a.y + (i - (a.len - 1) / 2) * a.py) * W + Math.round(a.x + (i - (a.len - 1) / 2) * a.px));
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = idx(x, y);
      if (grid[c] !== FLOOR && grid[c] !== POOL && !d.cut[c]) continue;
      let h = CEILING.corridor;
      if (roomId[c] >= 0) {
        const r = rooms[roomId[c]];
        h = r.type === "boss" ? CEILING.boss : CEILING[r.arch];
      } else if (d.cut[c] || (grid[c] === POOL && !corridor[c])) {
        for (const n of [c - 1, c + 1, c - W, c + W]) {
          if (roomId[n] >= 0) {
            const r = rooms[roomId[n]];
            h = Math.max(h, r.type === "boss" ? CEILING.boss : CEILING[r.arch]);
          }
        }
      }
      if (arched.has(c)) h = TH.vaults ? 2.5 : 2.55;
      heights[c] = h;
      if (TH.vaults) continue;
      S.ceiling.add(wx(x), h, wz(y), 1, CEIL_TOP - h, 1, 0, mul(C.wall, f(0.62, 0.74)));
    }
  }

  for (const p of d.props) {
    const X = wx(p.x);
    const Z = wz(p.y);
    switch (p.kind) {
      case "pillar": {
        const s = p.scale * 1.15;
        const r = rooms[roomId[idx(p.x, p.y)]];
        S.pillar.add(X, 0, Z, s, (r ? CEILING[r.arch] : CEILING.corridor) / 1.79, s, pick4() * (Math.PI / 2), C.pillar);
        break;
      }
      case "stand": {
        const on = floorAt(d, p.x + 0.5, p.y + 0.5);
        S.stand.add(X, on, Z, 1, 1, 1, p.rot, [1, 1, 1]);
        S.standWax.add(X, on + 1.0, Z, 1, 1, 1, p.rot, [1, 1, 1]);
        S.flame.add(X, on + 1.255, Z, 0.19, 0.19, 0.19, 0, [1, 1, 1]);
        break;
      }
      case "ember": {
        const on = floorAt(d, p.x + 0.5, p.y + 0.5);
        S.embers.add(X, on, Z, 1, 1, 1, p.rot, [0.03, 0.028, 0.026]);
        S.emberCoals.add(X, on, Z, 1, 1, 1, p.rot, [0.36, 0.085, 0.015]);
        const gold: [number, number, number] = [1, 0.62, 0.26];
        S.flame.add(X, on + 0.02, Z, 0.26, 0.26, 0.26, 0, gold);
        S.flame.add(X + 0.06, on + 0.015, Z - 0.05, 0.17, 0.17, 0.17, 0, gold);
        S.flame.add(X - 0.07, on + 0.015, Z + 0.04, 0.14, 0.14, 0.14, 0, gold);
        break;
      }
      default:
        break;
    }
  }

  for (const p of d.pools) {
    S.basin.add(wx(p.x), 0, wz(p.y), 1, 1, 1, 0, mix(C.wall, [0, 0, 0], 0.35));
    const skirtC =
      TH.pools && TH.pools.mode === 0
        ? hex(0xff5a1f)
        : TH.pools && TH.pools.mode === 3
          ? hex(0x33531e)
          : hex(0x11463c);
    S.skirt.add(wx(p.x), 0, wz(p.y), f(0.85, 1.25), 1, f(0.85, 1.25), f(0, 6.28), skirtC);
  }

  const liquid = (cells: Array<{ x: number; y: number }>, y: number) => {
    const key = new Set(cells.map((c) => c.y * W + c.x));
    const n = cells.length;
    const pos = new Float32Array(n * 18);
    const ae = new Float32Array(n * 12);
    const am = new Float32Array(n * 24);
    const CE = [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5];
    let o = 0;
    let oe = 0;
    let om = 0;
    for (const c of cells) {
      const x0 = wx(c.x) - 0.51;
      const x1 = wx(c.x) + 0.51;
      const z0 = wz(c.y) - 0.51;
      const z1 = wz(c.y) + 0.51;
      pos.set([x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0], o);
      o += 18;
      ae.set(CE, oe);
      oe += 12;
      const m = [
        key.has(c.y * W + c.x - 1) ? 0 : 1,
        key.has(c.y * W + c.x + 1) ? 0 : 1,
        key.has((c.y - 1) * W + c.x) ? 0 : 1,
        key.has((c.y + 1) * W + c.x) ? 0 : 1,
      ];
      for (let k = 0; k < 6; k++) {
        am.set(m, om);
        om += 4;
      }
    }
    return { pos, ae, am };
  };
  const liquids: Array<{ pos: Float32Array; ae: Float32Array; am: Float32Array }> = [];
  if (d.pools.length) liquids.push(liquid(d.pools, -0.08));
  if (d.lakeCells.length) liquids.push(liquid(d.lakeCells, -0.12));

  const spec = TH.particles;
  const pts: Array<[number, number, number]> = [];
  const pp = (x: number, z: number, y: number) => pts.push([x, y, z]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (grid[idx(x, y)] === FLOOR && raw() < 0.16) pp(wx(x), wz(y), f(0.1, 1.4));
  }
  if (!pts.length) pp(0, 0, 0.5);
  const pn = Math.min(spec.n * Math.max(1, d.stats.floorTiles / 3000), Math.max(40, pts.length * 4), 700) | 0;
  const partPos = new Float32Array(pn * 3);
  const partSeed = new Float32Array(pn);
  for (let i = 0; i < pn; i++) {
    partPos.set(pts[Math.floor(raw() * pts.length)], i * 3);
    partSeed[i] = raw();
  }

  const sets: Record<string, InstanceBuffer> = {};
  for (const n of names) sets[n] = S[n].done();
  // Unused accent suppressed by keeping reference in case future props use it
  void accent;

  return {
    sets,
    heights,
    liquids,
    parts: { pos: partPos, seed: partSeed, kind: spec.kind, color: spec.color },
    portal: null,
    rune: null,
    field: opts.noField ? null : bakeField(d, theme),
  };
}
