import * as THREE from "three";

/** Deterministic PRNG so every render frame bakes identical textures. */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeCanvas = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { canvas, ctx };
};

/**
 * Converts a grayscale height canvas into a tangent-space normal map.
 * Cheap sobel; enough to make flat boxes catch light along their bevels.
 */
const heightToNormal = (height: HTMLCanvasElement, strength: number) => {
  const size = height.width;
  const src = height.getContext("2d")?.getImageData(0, 0, size, size);
  const out = makeCanvas(size);
  if (!src || !out) return null;

  const dst = out.ctx.createImageData(size, size);
  const at = (x: number, y: number) => {
    const cx = (x + size) % size;
    const cy = (y + size) % size;
    return src.data[(cy * size + cx) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * size + x) * 4;
      dst.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      dst.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst.data[i + 3] = 255;
    }
  }

  out.ctx.putImageData(dst, 0, 0);
  return out.canvas;
};

export type SurfaceSet = {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
};

const toTexture = (
  canvas: HTMLCanvasElement | null,
  repeat: [number, number],
  srgb: boolean
) => {
  if (!canvas) return null;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
};

const finish = (
  color: HTMLCanvasElement | null,
  height: HTMLCanvasElement | null,
  rough: HTMLCanvasElement | null,
  repeat: [number, number],
  normalStrength = 2.2
): SurfaceSet => {
  const normalCanvas = height ? heightToNormal(height, normalStrength) : null;
  return {
    map: toTexture(color, repeat, true),
    normalMap: toTexture(normalCanvas, repeat, false),
    roughnessMap: toTexture(rough, repeat, false),
  };
};

/** Adds fine speckle grain on top of whatever is already drawn. */
const speckle = (
  ctx: CanvasRenderingContext2D,
  size: number,
  rnd: () => number,
  amount: number,
  alpha: number
) => {
  for (let i = 0; i < amount; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.5 + rnd() * 2.2;
    const l = Math.round(120 + rnd() * 130);
    ctx.fillStyle = `rgba(${l},${l},${l},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

export interface MasonryOptions {
  size?: number;
  rows?: number;
  cols?: number;
  base: string;
  baseAlt: string;
  mortar: string;
  seed?: number;
}

/** Brick / ashlar masonry with recessed mortar and chipped edges. */
export const makeMasonry = ({
  size = 512,
  rows = 8,
  cols = 4,
  base,
  baseAlt,
  mortar,
  seed = 1,
}: MasonryOptions): SurfaceSet => {
  const color = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  if (!color || !height || !rough) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  const { ctx: c } = color;
  const { ctx: h } = height;
  const { ctx: r } = rough;

  c.fillStyle = mortar;
  c.fillRect(0, 0, size, size);
  h.fillStyle = "#202020";
  h.fillRect(0, 0, size, size);
  r.fillStyle = "#d8d8d8";
  r.fillRect(0, 0, size, size);

  const bh = size / rows;
  const bw = size / cols;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col <= cols; col++) {
      const x = col * bw + offset + 2;
      const y = row * bh + 2;
      const w = bw - 4;
      const hgt = bh - 4;

      const tone = rnd();
      c.fillStyle = tone > 0.55 ? baseAlt : base;
      c.beginPath();
      c.roundRect(x, y, w, hgt, 3);
      c.fill();

      // Chunky lighter bevel on the top/left edges.
      c.fillStyle = "rgba(255,255,255,0.10)";
      c.beginPath();
      c.roundRect(x, y, w, 3.5, 2);
      c.fill();
      c.fillStyle = "rgba(0,0,0,0.22)";
      c.beginPath();
      c.roundRect(x, y + hgt - 4, w, 4, 2);
      c.fill();

      // Per-brick mottling.
      for (let i = 0; i < 26; i++) {
        const px = x + rnd() * w;
        const py = y + rnd() * hgt;
        const pr = 1 + rnd() * 5;
        c.fillStyle =
          rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.09)";
        c.beginPath();
        c.arc(px, py, pr, 0, Math.PI * 2);
        c.fill();
      }

      h.fillStyle = `rgb(${190 + Math.round(tone * 40)},${190 + Math.round(tone * 40)
        },${190 + Math.round(tone * 40)})`;
      h.beginPath();
      h.roundRect(x, y, w, hgt, 3);
      h.fill();

      const roughTone = 205 + Math.round(rnd() * 40);
      r.fillStyle = `rgb(${roughTone},${roughTone},${roughTone})`;
      r.beginPath();
      r.roundRect(x, y, w, hgt, 3);
      r.fill();
    }
  }

  speckle(c, size, rnd, 2600, 0.05);
  speckle(h, size, rnd, 2600, 0.16);

  return finish(color.canvas, height.canvas, rough.canvas, [1, 1], 2.6);
};

/** Irregular flagstone floor. */
export const makeFlagstone = ({
  size = 512,
  cells = 5,
  base = "#4a4d58",
  baseAlt = "#565a66",
  grout = "#20222a",
  seed = 7,
}: {
  size?: number;
  cells?: number;
  base?: string;
  baseAlt?: string;
  grout?: string;
  seed?: number;
}): SurfaceSet => {
  const color = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  if (!color || !height || !rough) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  const { ctx: c } = color;
  const { ctx: h } = height;
  const { ctx: r } = rough;

  c.fillStyle = grout;
  c.fillRect(0, 0, size, size);
  h.fillStyle = "#1c1c1c";
  h.fillRect(0, 0, size, size);
  r.fillStyle = "#e6e6e6";
  r.fillRect(0, 0, size, size);

  const cell = size / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const inset = 3.5 + rnd() * 4;
      const x = col * cell + inset;
      const y = row * cell + inset;
      const w = cell - inset * 2 - rnd() * 4;
      const hh = cell - inset * 2 - rnd() * 4;
      const radius = 4 + rnd() * 7;

      c.fillStyle = rnd() > 0.5 ? baseAlt : base;
      c.beginPath();
      c.roundRect(x, y, w, hh, radius);
      c.fill();

      // Worn highlight along the top edge.
      c.fillStyle = "rgba(255,255,255,0.07)";
      c.beginPath();
      c.roundRect(x + 2, y + 2, w - 4, 3, 2);
      c.fill();

      for (let i = 0; i < 34; i++) {
        c.fillStyle =
          rnd() > 0.5 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.08)";
        c.beginPath();
        c.arc(x + rnd() * w, y + rnd() * hh, 1 + rnd() * 5, 0, Math.PI * 2);
        c.fill();
      }

      const tone = 180 + Math.round(rnd() * 60);
      h.fillStyle = `rgb(${tone},${tone},${tone})`;
      h.beginPath();
      h.roundRect(x, y, w, hh, radius);
      h.fill();

      const rt = 190 + Math.round(rnd() * 50);
      r.fillStyle = `rgb(${rt},${rt},${rt})`;
      r.beginPath();
      r.roundRect(x, y, w, hh, radius);
      r.fill();
    }
  }

  speckle(c, size, rnd, 2200, 0.05);
  speckle(h, size, rnd, 2200, 0.2);

  return finish(color.canvas, height.canvas, rough.canvas, [1, 1], 3.0);
};

/** Timber planks with grain and occasional knots. */
export const makeWood = ({
  size = 512,
  planks = 6,
  base = "#6b4527",
  baseAlt = "#7a512f",
  seam = "#2c1a0e",
  seed = 3,
}: {
  size?: number;
  planks?: number;
  base?: string;
  baseAlt?: string;
  seam?: string;
  seed?: number;
}): SurfaceSet => {
  const color = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  if (!color || !height || !rough) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  const { ctx: c } = color;
  const { ctx: h } = height;
  const { ctx: r } = rough;

  const ph = size / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    c.fillStyle = rnd() > 0.5 ? baseAlt : base;
    c.fillRect(0, y, size, ph);
    h.fillStyle = `rgb(${200 + Math.round(rnd() * 30)},${200 + Math.round(rnd() * 30)},${200 + Math.round(rnd() * 30)})`;
    h.fillRect(0, y, size, ph);

    // Grain: long wobbling horizontal streaks.
    for (let g = 0; g < 70; g++) {
      const gy = y + rnd() * ph;
      const alpha = 0.04 + rnd() * 0.1;
      c.strokeStyle =
        rnd() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,220,180,${alpha * 0.7})`;
      c.lineWidth = 0.6 + rnd() * 1.8;
      c.beginPath();
      c.moveTo(0, gy);
      let cy = gy;
      for (let x = 0; x <= size; x += 32) {
        cy += (rnd() - 0.5) * 2.4;
        c.lineTo(x, cy);
      }
      c.stroke();
    }

    // Knots.
    if (rnd() > 0.55) {
      const kx = rnd() * size;
      const ky = y + ph * (0.3 + rnd() * 0.4);
      const kr = 3 + rnd() * 6;
      const grad = c.createRadialGradient(kx, ky, 0, kx, ky, kr * 2.6);
      grad.addColorStop(0, "rgba(40,22,10,0.85)");
      grad.addColorStop(1, "rgba(40,22,10,0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(kx, ky, kr * 2.6, 0, Math.PI * 2);
      c.fill();
    }

    // Dark seam between planks.
    c.fillStyle = seam;
    c.fillRect(0, y + ph - 2.5, size, 2.5);
    h.fillStyle = "#3a3a3a";
    h.fillRect(0, y + ph - 3, size, 3);

    const rt = 175 + Math.round(rnd() * 45);
    r.fillStyle = `rgb(${rt},${rt},${rt})`;
    r.fillRect(0, y, size, ph);
  }

  speckle(c, size, rnd, 1500, 0.04);

  return finish(color.canvas, height.canvas, rough.canvas, [1, 1], 1.8);
};

/** Brushed metal with faint scratches. */
export const makeMetal = ({
  size = 512,
  base = "#8b93a3",
  seed = 11,
  roughness = 120,
}: {
  size?: number;
  base?: string;
  seed?: number;
  roughness?: number;
}): SurfaceSet => {
  const color = makeCanvas(size);
  const rough = makeCanvas(size);
  if (!color || !rough) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  color.ctx.fillStyle = base;
  color.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = `rgb(${roughness},${roughness},${roughness})`;
  rough.ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const y = rnd() * size;
    const w = 20 + rnd() * size;
    const alpha = 0.02 + rnd() * 0.06;
    color.ctx.strokeStyle =
      rnd() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    color.ctx.lineWidth = 0.5 + rnd() * 1.4;
    color.ctx.beginPath();
    color.ctx.moveTo(rnd() * size, y);
    color.ctx.lineTo(rnd() * size + w, y + (rnd() - 0.5) * 2);
    color.ctx.stroke();

    rough.ctx.strokeStyle = `rgba(${rnd() > 0.5 ? 255 : 0},0,0,${alpha * 2})`;
    rough.ctx.lineWidth = 1;
    rough.ctx.beginPath();
    rough.ctx.moveTo(rnd() * size, y);
    rough.ctx.lineTo(rnd() * size + w, y);
    rough.ctx.stroke();
  }

  return {
    map: toTexture(color.canvas, [1, 1], true),
    normalMap: null,
    roughnessMap: toTexture(rough.canvas, [1, 1], false),
  };
};

/** Woven cloth: subtle cross-hatch weave plus fibre noise. */
export const makeFabric = ({
  size = 256,
  base = "#4a5470",
  seed = 31,
}: {
  size?: number;
  base?: string;
  seed?: number;
}): SurfaceSet => {
  const color = makeCanvas(size);
  const height = makeCanvas(size);
  if (!color || !height) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  const { ctx: c } = color;
  const { ctx: h } = height;

  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  h.fillStyle = "#808080";
  h.fillRect(0, 0, size, size);

  const step = 4;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const over = ((x / step + y / step) | 0) % 2 === 0;
      const light = 0.05 + rnd() * 0.05;
      c.fillStyle = over
        ? `rgba(255,255,255,${light})`
        : `rgba(0,0,0,${light})`;
      c.fillRect(x, y, step - 1, step - 1);

      h.fillStyle = over ? "#9a9a9a" : "#6a6a6a";
      h.fillRect(x, y, step - 1, step - 1);
    }
  }

  speckle(c, size, rnd, 900, 0.05);

  return finish(color.canvas, height.canvas, null, [1, 1], 1.1);
};

/** Pebbled leather with stitch-free grain. */
export const makeLeather = ({
  size = 256,
  base = "#4a3524",
  seed = 37,
}: {
  size?: number;
  base?: string;
  seed?: number;
}): SurfaceSet => {
  const color = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  if (!color || !height || !rough) {
    return { map: null, normalMap: null, roughnessMap: null };
  }

  const rnd = mulberry32(seed);
  const { ctx: c } = color;
  const { ctx: h } = height;
  const { ctx: r } = rough;

  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  h.fillStyle = "#7a7a7a";
  h.fillRect(0, 0, size, size);
  r.fillStyle = "#c8c8c8";
  r.fillRect(0, 0, size, size);

  for (let i = 0; i < 2200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const radius = 1.2 + rnd() * 3.4;
    const light = rnd() > 0.5;
    c.fillStyle = light ? "rgba(255,240,220,0.05)" : "rgba(0,0,0,0.10)";
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();

    h.fillStyle = light ? "#a8a8a8" : "#5e5e5e";
    h.beginPath();
    h.arc(x, y, radius, 0, Math.PI * 2);
    h.fill();
  }

  return finish(color.canvas, height.canvas, rough.canvas, [1, 1], 1.6);
};

/** Cache so multiple components share one baked texture set. */
const cache = new Map<string, SurfaceSet>();

export const getSurface = (key: string, build: () => SurfaceSet): SurfaceSet => {
  const hit = cache.get(key);
  if (hit) return hit;
  const built = build();
  cache.set(key, built);
  return built;
};
