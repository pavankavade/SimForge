// The minimap, drawn the same way in town and below: the floor plan is painted once into a cached
// layer (stone or planks, thick dark walls with a pale inked edge, rooms tinted by what they hold),
// and each refresh only copies the part round the player and draws the live markers over it.

import {
  FLOOR,
  POOL,
  SOLID_RADIUS,
  type DungeonData,
  type RoomRole,
} from "./dungeon/generator";

/** Layer pixels per map unit (a dungeon cell, or a metre in town). */
const DUNGEON_PPU = 10;
const TOWN_PPU = 12;

const BG = "#0b0d11";
const WALL = "#3a342c";
const SOLID = "#17130f";
const EDGE = "rgba(232,214,180,0.85)";

// Room floors by what the room holds, so the way to the boss or the treasure reads at a glance.
const ROLE_FLOOR: Record<RoomRole, string> = {
  entrance: "#56705a",
  combat: "#6d665b",
  elite: "#6c5a70",
  treasure: "#80693a",
  shrine: "#4c6680",
  boss: "#7d4038",
};
const CORRIDOR_FLOOR = "#58534b";
const WATER = "#2f5f78";

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

/** Shade a #rrggbb colour by `f` (1 = as is). */
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

// ---- The frame ---------------------------------------------------------------------------------

/** What a draw call needs to place things: map units to canvas (CSS) pixels round the centre. */
export interface MapView {
  ctx: CanvasRenderingContext2D;
  size: number;
  /** CSS pixels per map unit. */
  k: number;
  cx: number;
  cz: number;
  X: (x: number) => number;
  Z: (z: number) => number;
}

/** Start a frame: clear, clip to the rounded tile, and set up a view of `span` units round (cx, cz). */
export function beginMap(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  cx: number,
  cz: number,
  span: number,
): MapView {
  // The canvas is sized in device pixels; draw in CSS pixels so lines stay one weight on any screen.
  const dpr = Math.max(
    1,
    (ctx.canvas.clientWidth
      ? cw / ctx.canvas.clientWidth
      : window.devicePixelRatio) || 1,
  );
  const size = Math.min(cw, ch) / dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, Math.max(4, size * 0.06));
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);
  const k = size / span;
  return {
    ctx,
    size,
    k,
    cx,
    cz,
    X: (x) => size / 2 + (x - cx) * k,
    Z: (z) => size / 2 + (z - cz) * k,
  };
}

/** Finish a frame: a soft vignette (`vignette` = edge darkness) so the plan fades into the frame, then a fine gold rim. */
export function endMap(v: MapView, vignette = 0.85) {
  const { ctx, size } = v;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.32,
    size / 2,
    size / 2,
    size * 0.74,
  );
  g.addColorStop(0, "rgba(6,7,10,0)");
  g.addColorStop(1, `rgba(6,7,10,${vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.strokeStyle = "rgba(230,196,138,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, size - 1, size - 1, Math.max(4, size * 0.06));
  ctx.stroke();
}

/** Copy a cached plan layer (drawn at `ppu` pixels per unit, origin at map (ox, oz)) into the view. */
export function blitLayer(
  v: MapView,
  layer: HTMLCanvasElement,
  ppu: number,
  ox = 0,
  oz = 0,
) {
  const s = v.k / ppu;
  v.ctx.imageSmoothingEnabled = true;
  v.ctx.drawImage(layer, v.X(ox), v.Z(oz), layer.width * s, layer.height * s);
}

// ---- Markers -----------------------------------------------------------------------------------

/** The player: a soft view cone and an arrow pointing where he faces (`facing` 0 = +z, down the map). */
export function drawPlayer(v: MapView, x: number, z: number, facing: number) {
  const { ctx } = v;
  const px = v.X(x);
  const pz = v.Z(z);
  const dx = Math.sin(facing);
  const dz = Math.cos(facing);
  const a = Math.atan2(dz, dx);
  const reach = clamp(v.k * 5, 18, 70);
  const cone = ctx.createRadialGradient(px, pz, 0, px, pz, reach);
  cone.addColorStop(0, "rgba(255,216,77,0.38)");
  cone.addColorStop(1, "rgba(255,216,77,0)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.arc(px, pz, reach, a - 0.6, a + 0.6);
  ctx.closePath();
  ctx.fill();

  const r = clamp(v.k * 0.55, 4.5, 9);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(r * 1.35, 0);
  ctx.lineTo(-r * 0.85, r * 0.85);
  ctx.lineTo(-r * 0.4, 0);
  ctx.lineTo(-r * 0.85, -r * 0.85);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(10,8,4,0.9)";
  ctx.stroke();
  ctx.fillStyle = "#ffd84d";
  ctx.fill();
  ctx.restore();
}

/** A creature or townsfolk: a dot with a dark ring; hostiles get a pulsing halo. */
export function drawDot(
  v: MapView,
  x: number,
  z: number,
  color: string,
  opts: { r?: number; pulse?: number } = {},
) {
  const { ctx } = v;
  const px = v.X(x);
  const pz = v.Z(z);
  if (px < -6 || pz < -6 || px > v.size + 6 || pz > v.size + 6) return;
  const r = opts.r ?? clamp(v.k * 0.35, 2.4, 5.5);
  if (opts.pulse !== undefined) {
    const t = ((opts.pulse % 1) + 1) % 1;
    ctx.fillStyle = `rgba(255,90,74,${0.35 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(px, pz, r * (1.3 + 1.4 * t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(px, pz, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(8,8,10,0.85)";
  ctx.stroke();
}

/** A chest not yet searched: a little gold box with a lid line. */
export function drawChest(v: MapView, x: number, z: number) {
  const { ctx } = v;
  const s = clamp(v.k * 0.6, 4, 10);
  const px = v.X(x) - s / 2;
  const pz = v.Z(z) - s * 0.4;
  ctx.fillStyle = "#ffcf5a";
  ctx.strokeStyle = "rgba(20,12,2,0.9)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(px, pz, s, s * 0.8, 1);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px, pz + s * 0.32);
  ctx.lineTo(px + s, pz + s * 0.32);
  ctx.stroke();
}

/** A merchant's stall: a square in the awning colour with a pale trim. */
export function drawStall(v: MapView, x: number, z: number, color: string) {
  const { ctx } = v;
  const s = clamp(v.k * 0.9, 5, 12);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#e6c48a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(v.X(x) - s / 2, v.Z(z) - s / 2, s, s, 1.5);
  ctx.fill();
  ctx.stroke();
}

/** A door across a passage: dark wood, shut solid or open faint. */
export function drawDoor(
  v: MapView,
  x: number,
  z: number,
  px: number,
  pz: number,
  len: number,
  open: boolean,
) {
  const { ctx } = v;
  const l = (len * v.k) / 2;
  const cx = v.X(x);
  const cz = v.Z(z);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - px * l, cz - pz * l);
  ctx.lineTo(cx + px * l, cz + pz * l);
  if (!open) {
    ctx.strokeStyle = "rgba(10,6,2,0.9)";
    ctx.lineWidth = Math.max(3.5, v.k * 0.55);
    ctx.stroke();
  }
  ctx.strokeStyle = open ? "rgba(192,138,72,0.4)" : "#c08a48";
  ctx.lineWidth = Math.max(2, v.k * 0.35);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** A portal or the teleporter: a violet ring that breathes, with a bright core. */
export function drawPortal(
  v: MapView,
  x: number,
  z: number,
  r: number,
  time: number,
) {
  const { ctx } = v;
  const px = v.X(x);
  const pz = v.Z(z);
  const rr = r * (1 + 0.12 * Math.sin(time * 4));
  const g = ctx.createRadialGradient(px, pz, 0, px, pz, rr * 1.5);
  g.addColorStop(0, "rgba(220,190,255,0.75)");
  g.addColorStop(0.55, "rgba(160,110,255,0.35)");
  g.addColorStop(1, "rgba(160,110,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, pz, rr * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9a8ff";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(px, pz, rr, 0, Math.PI * 2);
  ctx.stroke();
}

/** A place name on the big map: small caps in parchment with a dark halo. */
export function drawLabel(v: MapView, x: number, z: number, text: string) {
  const { ctx } = v;
  const px = Math.round(clamp(v.size / 52, 9, 12));
  ctx.font = `600 ${px}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,8,10,0.9)";
  ctx.strokeText(text.toUpperCase(), v.X(x), v.Z(z));
  ctx.fillStyle = "#eadbb8";
  ctx.fillText(text.toUpperCase(), v.X(x), v.Z(z));
}

// ---- Shared plan painting ----------------------------------------------------------------------

/**
 * Walls round a set of open cells: a thick dark band outside every edge, then the floor over it,
 * then the pale inked edge on top. `edges` holds segments in layer pixels [x0, y0, x1, y1, ...].
 */
function paintWalls(
  ctx: CanvasRenderingContext2D,
  edges: number[],
  band: number,
  ink: number,
  under: () => void,
) {
  const path = new Path2D();
  for (let i = 0; i < edges.length; i += 4) {
    path.moveTo(edges[i], edges[i + 1]);
    path.lineTo(edges[i + 2], edges[i + 3]);
  }
  ctx.lineCap = "square";
  ctx.strokeStyle = WALL;
  ctx.lineWidth = band;
  ctx.stroke(path);
  under();
  // A soft shadow cast inward off the walls, then the crisp edge.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = band * 0.9;
  ctx.filter = `blur(${Math.max(1, band * 0.25)}px)`;
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = ink;
  ctx.stroke(path);
}

// ---- Dungeon -----------------------------------------------------------------------------------

const dungeonLayers = new WeakMap<DungeonData, HTMLCanvasElement>();

/** The floor plan of a dungeon level, painted once and kept for as long as the level lives. */
export function dungeonLayer(d: DungeonData): {
  layer: HTMLCanvasElement;
  ppu: number;
} {
  let layer = dungeonLayers.get(d);
  if (!layer) {
    layer = paintDungeon(d);
    dungeonLayers.set(d, layer);
  }
  return { layer, ppu: DUNGEON_PPU };
}

function paintDungeon(d: DungeonData): HTMLCanvasElement {
  const P = DUNGEON_PPU;
  const { W, H } = d;
  const c = makeCanvas(W * P, H * P);
  const ctx = c.getContext("2d")!;
  const open = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const g = d.grid[y * W + x];
    return g === FLOOR || g === POOL;
  };

  const edges: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!open(x, y)) continue;
      if (!open(x, y - 1)) edges.push(x * P, y * P, (x + 1) * P, y * P);
      if (!open(x, y + 1))
        edges.push(x * P, (y + 1) * P, (x + 1) * P, (y + 1) * P);
      if (!open(x - 1, y)) edges.push(x * P, y * P, x * P, (y + 1) * P);
      if (!open(x + 1, y))
        edges.push((x + 1) * P, y * P, (x + 1) * P, (y + 1) * P);
    }
  }

  // Solid rock round the halls: a warm shade that fades out over two cells from the walls.
  const rockNear = (x: number, y: number) => {
    let best = 9;
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++)
        if (open(x + i, y + j))
          best = Math.min(best, Math.max(Math.abs(i), Math.abs(j)));
    return best;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (open(x, y)) continue;
      const n = rockNear(x, y);
      if (n > 2) continue;
      ctx.fillStyle = `rgba(74,66,56,${(n === 1 ? 0.5 : 0.22) * (0.8 + hash(x, y) * 0.4)})`;
      ctx.fillRect(x * P, y * P, P, P);
    }
  }

  paintWalls(ctx, edges, P * 0.9, Math.max(1.5, P * 0.16), () => {
    // Floor: each flagstone a touch lighter or darker than its neighbours.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!open(x, y)) continue;
        const i = y * W + x;
        const water = d.grid[i] === POOL || d.lakeMask[i];
        const room = d.roomId[i] >= 0 ? d.rooms[d.roomId[i]] : null;
        const base = water
          ? WATER
          : room
            ? ROLE_FLOOR[room.type]
            : CORRIDOR_FLOOR;
        ctx.fillStyle = shade(base, 0.9 + hash(x, y) * 0.2);
        ctx.fillRect(x * P, y * P, P, P);
      }
    }
    // Faint joints between the flags.
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < W; x++) {
      ctx.moveTo(x * P + 0.5, 0);
      ctx.lineTo(x * P + 0.5, H * P);
    }
    for (let y = 1; y < H; y++) {
      ctx.moveTo(0, y * P + 0.5);
      ctx.lineTo(W * P, y * P + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  });

  // Pillars, piers, sarcophagi and crystals: the things he has to walk round.
  for (const p of d.props) {
    const r = SOLID_RADIUS[p.kind];
    if (!r) continue;
    const px = (p.x + 0.5) * P;
    const py = (p.y + 0.5) * P;
    const rr = Math.max(P * 0.22, r * (p.scale ?? 1) * P);
    ctx.beginPath();
    if (p.kind === "sarco" || p.kind === "chest")
      ctx.rect(px - rr, py - rr * 0.6, rr * 2, rr * 1.2);
    else ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fillStyle =
      p.kind === "shrineCrystal"
        ? "#7fb2ff"
        : p.kind === "bossCrystal"
          ? "#ff6d5a"
          : p.kind === "brazier"
            ? "#d98a3a"
            : SOLID;
    ctx.fill();
    ctx.strokeStyle = "rgba(232,214,180,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  return c;
}

/** Map units the dungeon minimap shows across, for a tile of `size` CSS pixels. */
export const dungeonSpan = (size: number) =>
  Math.max(22, Math.min(40, size / 4.2));

// ---- Town --------------------------------------------------------------------------------------

export interface TownRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface TownPlan {
  /** World bounds of the layer. */
  bounds: TownRect;
  /** Walkable floors, each with its surface. */
  floors: Array<TownRect & { surface: "wood" | "stone" | "stair" | "sand" }>;
  discs: Array<{ x: number; z: number; r: number }>;
  /** Walls and big furniture. */
  solids: TownRect[];
}

/** One storey of the town, painted once. Floors are planks indoors and flags outside. */
export function paintTown(plan: TownPlan): {
  layer: HTMLCanvasElement;
  ppu: number;
  ox: number;
  oz: number;
} {
  const P = TOWN_PPU;
  const b = plan.bounds;
  const c = makeCanvas((b.x1 - b.x0) * P, (b.z1 - b.z0) * P);
  const ctx = c.getContext("2d")!;
  const X = (x: number) => (x - b.x0) * P;
  const Z = (z: number) => (z - b.z0) * P;

  // The outline of the open floor, traced on a coarse grid so walls join round every corner.
  const G = 0.5;
  const gw = Math.ceil((b.x1 - b.x0) / G);
  const gh = Math.ceil((b.z1 - b.z0) / G);
  const cell = new Uint8Array(gw * gh);
  const inRect = (r: TownRect, x: number, z: number) =>
    x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = b.x0 + (i + 0.5) * G;
      const z = b.z0 + (j + 0.5) * G;
      if (
        plan.floors.some((r) => inRect(r, x, z)) ||
        plan.discs.some((d) => Math.hypot(x - d.x, z - d.z) <= d.r)
      )
        cell[j * gw + i] = 1;
    }
  }
  const on = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < gw && j < gh && cell[j * gw + i] === 1;
  const edges: number[] = [];
  const s = G * P;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      if (!on(i, j)) continue;
      if (!on(i, j - 1)) edges.push(i * s, j * s, (i + 1) * s, j * s);
      if (!on(i, j + 1))
        edges.push(i * s, (j + 1) * s, (i + 1) * s, (j + 1) * s);
      if (!on(i - 1, j)) edges.push(i * s, j * s, i * s, (j + 1) * s);
      if (!on(i + 1, j))
        edges.push((i + 1) * s, j * s, (i + 1) * s, (j + 1) * s);
    }
  }

  paintWalls(ctx, edges, P * 0.7, Math.max(1.5, P * 0.12), () => {
    for (const f of plan.floors) {
      const x0 = X(f.x0);
      const z0 = Z(f.z0);
      const w = (f.x1 - f.x0) * P;
      const h = (f.z1 - f.z0) * P;
      if (f.surface === "wood") {
        // Planks running along x, each its own tone.
        const plank = P * 0.45;
        for (let k = 0, z = z0; z < z0 + h; k++, z += plank) {
          ctx.fillStyle = shade(
            "#7a5a38",
            0.88 + hash(k, Math.round(x0)) * 0.24,
          );
          ctx.fillRect(x0, z, w, Math.min(plank, z0 + h - z));
        }
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        for (let z = z0 + plank; z < z0 + h; z += plank)
          ctx.fillRect(x0, z, w, 1);
      } else if (f.surface === "sand") {
        // Raked sand, speckled.
        ctx.fillStyle = "#a88a5c";
        ctx.fillRect(x0, z0, w, h);
        for (let i = 0; i < (w * h) / 40; i++) {
          ctx.fillStyle =
            hash(i, 7) > 0.5 ? "rgba(255,240,200,0.18)" : "rgba(60,40,20,0.16)";
          ctx.fillRect(x0 + hash(i, 1) * w, z0 + hash(i, 2) * h, 1.5, 1.5);
        }
      } else if (f.surface === "stair") {
        ctx.fillStyle = "#8d7a58";
        ctx.fillRect(x0, z0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        for (let z = z0; z < z0 + h; z += P * 0.36) ctx.fillRect(x0, z, w, 1.2);
      } else {
        // Flagstones in a loose grid.
        const fl = P * 1.2;
        for (let j = 0; j * fl < h; j++) {
          for (let i = 0; i * fl < w; i++) {
            ctx.fillStyle = shade(
              "#676660",
              0.86 + hash(i + Math.round(x0), j + Math.round(z0)) * 0.26,
            );
            ctx.fillRect(
              x0 + i * fl,
              z0 + j * fl,
              Math.min(fl, w - i * fl),
              Math.min(fl, h - j * fl),
            );
          }
        }
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = x0 + fl; x < x0 + w; x += fl) {
          ctx.moveTo(x, z0);
          ctx.lineTo(x, z0 + h);
        }
        for (let z = z0 + fl; z < z0 + h; z += fl) {
          ctx.moveTo(x0, z);
          ctx.lineTo(x0 + w, z);
        }
        ctx.stroke();
      }
    }
    for (const d of plan.discs) {
      ctx.fillStyle = "#57525f";
      ctx.beginPath();
      ctx.arc(X(d.x), Z(d.z), d.r * P, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // Walls inside the floor and the big furniture: dark ink with a pale rim.
  for (const r of plan.solids) {
    const w = Math.max(1.5, (r.x1 - r.x0) * P);
    const h = Math.max(1.5, (r.z1 - r.z0) * P);
    ctx.fillStyle = WALL;
    ctx.fillRect(X(r.x0), Z(r.z0), w, h);
    ctx.strokeStyle = "rgba(232,214,180,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(X(r.x0) + 0.5, Z(r.z0) + 0.5, w - 1, h - 1);
  }
  return { layer: c, ppu: P, ox: b.x0, oz: b.z0 };
}
