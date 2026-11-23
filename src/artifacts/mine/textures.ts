import * as THREE from "three";
import type { SurfaceSet } from "../../engine/textures";

/**
 * Ground for the mine sets, built per pixel from tileable noise (deterministic, baked once and
 * cached by `useSurface`): crisp jointed rock for cut faces and tunnel walls, packed gravel for
 * floors and roads, and a slow tone drift laid over the whole mountain.
 */

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const c = new THREE.Color(h);
  return [c.r * 255, c.g * 255, c.b * 255];
};

/** Hash of lattice point (x, y) wrapped to a period, 0..1. */
const hash = (x: number, y: number, px: number, py: number, seed: number) => {
  const ix = ((x % px) + px) % px;
  const iy = ((y % py) + py) % py;
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Smooth value noise that tiles over (px, py) lattice cells. */
const noise = (x: number, y: number, px: number, py: number, seed: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, px, py, seed);
  const b = hash(x0 + 1, y0, px, py, seed);
  const c = hash(x0, y0 + 1, px, py, seed);
  const d = hash(x0 + 1, y0 + 1, px, py, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

/** Fractal noise at (u, v) in 0..1 texture space, tiling; fx/fy are the base cell counts. */
const fbm = (u: number, v: number, fx: number, fy: number, octaves: number, seed: number) => {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const k = 1 << o;
    sum += amp * noise(u * fx * k, v * fy * k, fx * k, fy * k, seed + o * 17);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
};

const canvasOf = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
};

const tex = (canvas: HTMLCanvasElement, srgb: boolean) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
};

/** Normal map from a height array (sobel, wrapping). */
const normalsFrom = (hgt: Float32Array, size: number, strength: number) => {
  const { canvas, ctx } = canvasOf(size);
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => hgt[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      let nx = -dx * strength;
      let ny = -dy * strength;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (0.5 + 0.5 / len) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Tiling cellular noise at (u, v) with nx by ny cells: distance to the nearest and second-nearest
 *  cell points, the nearest cell's id (0..1) and the offset to its point. */
const cells = (u: number, v: number, nx: number, ny: number, seed: number) => {
  const x = u * nx;
  const y = v * ny;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  let ox = 0;
  let oy = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const px = cx + 0.15 + 0.7 * hash(cx, cy, nx, ny, seed);
      const py = cy + 0.15 + 0.7 * hash(cx, cy, nx, ny, seed + 7);
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash(cx, cy, nx, ny, seed + 13);
        ox = dx;
        oy = dy;
      } else if (d < f2) f2 = d;
    }
  }
  return { f1, f2, id, ox, oy };
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Broken rock for cut faces and tunnel walls: jointed blocks of slightly different tone with dark
 * cracks between them, finer fractures inside the blocks, thin bedding lines and sharp grain. The
 * normal map tilts every block a little, so the face catches light like chipped stone. One tile is
 * ROCK_TILE metres. `palette` runs light to dark.
 */
export const ROCK_TILE = 8;
export const makeRock = ({
  size = 2048,
  palette = ["#ecd3b0", "#dcbc94", "#caa57c", "#b38b62"],
  seed = 3,
  cracks = 1,
}: {
  size?: number;
  palette?: string[];
  seed?: number;
  /** How dark the joints and fractures are (1 = the mine's sandstone; less for smooth limestone). */
  cracks?: number;
}): SurfaceSet => {
  const pal = palette.map(hex);
  const { canvas, ctx } = canvasOf(size);
  const img = ctx.createImageData(size, size);
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const wx = fbm(u, v, 5, 5, 3, seed + 1) - 0.5;
      const wy = fbm(u, v, 5, 5, 3, seed + 2) - 0.5;
      const wx2 = fbm(u, v, 22, 22, 2, seed + 11) - 0.5;
      const wy2 = fbm(u, v, 22, 22, 2, seed + 12) - 0.5;
      // Big joint blocks (wider than tall, like bedded rock), and small fractures inside them. The
      // edges are bent by the warp, and the joints only open here and there, so it never reads
      // as a tidy net.
      const big = cells(u + wx * 0.1 + wx2 * 0.014, v + wy * 0.06 + wy2 * 0.014, 8, 13, seed + 3);
      const small = cells(u + wx * 0.06 + wx2 * 0.022, v + wy * 0.06 + wy2 * 0.022, 26, 40, seed + 4);
      const open = smooth(0.34, 0.6, fbm(u, v, 6, 6, 3, seed + 10));
      const openSmall = smooth(0.42, 0.68, fbm(u, v, 9, 9, 3, seed + 14));
      const crackBig = (1 - smooth(0.0, 0.03, big.f2 - big.f1)) * (0.3 + 0.7 * open);
      const crackSmall = (1 - smooth(0.0, 0.05, small.f2 - small.f1)) * (0.12 + 0.88 * openSmall);
      // Bedding: thin dark lines that wander and break up.
      const bedV = (v + wy * 0.04) * 14;
      const bedK = Math.floor(bedV);
      const bedOn = hash(bedK, 0, 14, 1, seed + 5) > 0.62 ? 1 : 0;
      const bedLine = bedOn * (1 - smooth(0.0, 0.07, Math.abs(bedV - bedK - 0.5))) * smooth(0.3, 0.55, fbm(u, v, 12, 3, 2, seed + 6));
      const mottle = fbm(u, v, 14, 14, 4, seed + 7);
      const fine = fbm(u, v, 96, 96, 3, seed + 8);
      const grain = hash(x, y, size, size, seed + 9);
      // Tone: each block and fracture has its own, over a slow mottle.
      let t = 0.5 + (big.id - 0.5) * 0.24 + (small.id - 0.5) * 0.18 + (mottle - 0.5) * 0.7 + (fine - 0.5) * 0.36;
      t = Math.max(0, Math.min(0.999, t));
      const f = t * (pal.length - 1);
      const k = Math.floor(f);
      let c = mix(pal[k], pal[Math.min(pal.length - 1, k + 1)], f - k);
      const dark = Math.max(0.5, 1 - (0.42 * crackBig + 0.22 * crackSmall + 0.2 * bedLine) * cracks);
      const g = dark * (0.86 + grain * 0.2 + (fine - 0.5) * 0.3);
      c = [c[0] * g, c[1] * g, c[2] * g];
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, c[0]);
      img.data[i + 1] = Math.min(255, c[1]);
      img.data[i + 2] = Math.min(255, c[2]);
      img.data[i + 3] = 255;
      // Relief: tilted blocks, recessed cracks and beds, gritty surface.
      const facet = big.id * 0.5 + (big.ox * (hash(Math.floor(big.id * 97), 1, 97, 3, seed) - 0.5) + big.oy * (hash(Math.floor(big.id * 97), 2, 97, 3, seed) - 0.5)) * 1.1;
      const facetS = small.id * 0.25 + (small.ox * (small.id - 0.5) + small.oy * (0.5 - small.id)) * 0.5;
      hgt[y * size + x] = facet * 0.55 + facetS * 0.3 + fine * 0.2 + grain * 0.04 - crackBig * 0.5 - crackSmall * 0.22 - bedLine * 0.3;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(canvas, true), normalMap: tex(normalsFrom(hgt, size, 5), false), roughnessMap: null };
};

/**
 * Slow tone drift over the whole mountain (multiplied over the rock tile in the shader, 0.5 = no
 * change): broad strata bands and blotches, so the tile never reads as a repeating pattern.
 */
export const makeMacro = (seed = 21): THREE.CanvasTexture => {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const warp = (fbm(u, v, 3, 3, 3, seed) - 0.5) * 0.05;
      const bands = fbm(0.5, v + warp, 1, 22, 3, seed + 1);
      const blotch = fbm(u, v, 6, 9, 4, seed + 2);
      const t = 0.5 + (bands - 0.5) * 0.55 + (blotch - 0.5) * 0.36;
      const i = (y * w + x) * 4;
      // A touch warmer where it is lighter.
      img.data[i] = Math.max(0, Math.min(255, (t + 0.012) * 255));
      img.data[i + 1] = Math.max(0, Math.min(255, t * 255));
      img.data[i + 2] = Math.max(0, Math.min(255, (t - 0.02) * 255));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.MirroredRepeatWrapping;
  t.wrapT = THREE.MirroredRepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
};

/**
 * Packed gravel: a dense jittered layer of small stones of mixed tone over sandy dirt, each shaded
 * as a little dome (lit from above, shadowed below), with matching relief in the normal map.
 */
export const makeGravel = ({
  size = 1024,
  dirt = ["#b8916a", "#a07a55"],
  stones = ["#d2b48e", "#b99a76", "#9c8064", "#c8a27a", "#8a7058", "#e0c8a6"],
  seed = 11,
  cells = 46,
}: {
  size?: number;
  dirt?: string[];
  stones?: string[];
  seed?: number;
  cells?: number;
}): SurfaceSet => {
  const d0 = hex(dirt[0]);
  const d1 = hex(dirt[1]);
  const st = stones.map(hex);
  const { canvas, ctx } = canvasOf(size);
  const img = ctx.createImageData(size, size);
  const hgt = new Float32Array(size * size);
  const cell = size / cells;
  // Stone centres on a jittered grid (two per cell), tiling.
  type Stone = { x: number; y: number; rx: number; ry: number; a: number; c: RGB };
  const grid: Stone[][] = [];
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const list: Stone[] = [];
      for (let s = 0; s < 2; s++) {
        const r = (n: number) => hash(i * 7 + s * 131 + n, j * 13 + s * 71, 100000, 100000, seed);
        const rad = cell * (0.32 + r(1) * 0.45);
        list.push({
          x: (i + r(2)) * cell,
          y: (j + r(3)) * cell,
          rx: rad,
          ry: rad * (0.6 + r(4) * 0.35),
          a: r(5) * Math.PI,
          c: mix(st[Math.floor(r(6) * st.length)], st[Math.floor(r(7) * st.length)], 0.35),
        });
      }
      grid.push(list);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u, v, 8, 8, 4, seed + 1);
      const grain = hash(x, y, size, size, seed + 2);
      let c = mix(d0, d1, n);
      c = [c[0] * (0.88 + grain * 0.22), c[1] * (0.88 + grain * 0.22), c[2] * (0.88 + grain * 0.22)];
      let h = n * 0.2;
      // Highest stone covering this pixel wins.
      const ci = Math.floor(x / cell);
      const cj = Math.floor(y / cell);
      let best = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const gi = (ci + di + cells) % cells;
          const gj = (cj + dj + cells) % cells;
          for (const s of grid[gj * cells + gi]) {
            let dx = x - s.x;
            let dy = y - s.y;
            if (dx > size / 2) dx -= size;
            if (dx < -size / 2) dx += size;
            if (dy > size / 2) dy -= size;
            if (dy < -size / 2) dy += size;
            const ca = Math.cos(s.a);
            const sa = Math.sin(s.a);
            const lx = (dx * ca + dy * sa) / s.rx;
            const ly = (-dx * sa + dy * ca) / s.ry;
            const q = 1 - (lx * lx + ly * ly);
            if (q <= 0) continue;
            const dome = Math.sqrt(q);
            const top = 0.3 + dome * 0.7;
            if (top <= best) continue;
            best = top;
            // Light from the top of the texture: lighter on the upper side, a dark rim at the edge.
            const shade = 0.78 + dome * 0.28 - (dy / s.ry) * 0.1;
            const edge = Math.min(1, q * 6);
            c = mix([c[0] * 0.55, c[1] * 0.55, c[2] * 0.55], [s.c[0] * shade, s.c[1] * shade, s.c[2] * shade], edge);
            h = top;
          }
        }
      }
      const i = (y * size + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
      hgt[y * size + x] = h;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(canvas, true), normalMap: tex(normalsFrom(hgt, size, 4), false), roughnessMap: null };
};
