// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).

export interface ProceduralTextureData {
  size: number;
  color: Uint8Array;
  normal: Uint8Array;
}

const fract = (x: number) => x - Math.floor(x);

function makeNoise(seed: number) {
  const P = new Float32Array(65536);
  let s = seed >>> 0;
  for (let i = 0; i < P.length; i++) {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    P[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const h = (x: number, y: number) => P[((x & 255) | ((y & 255) << 8)) >>> 0];
  return (x: number, y: number, period: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y0 = ((iy % period) + period) % period;
    const y1 = (y0 + 1) % period;
    const a = h(x0, y0);
    const b = h(x1, y0);
    const c = h(x0, y1);
    const d = h(x1, y1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
}

function fbm(
  noise: (x: number, y: number, p: number) => number,
  u: number,
  v: number,
  base: number,
  octaves: number
): number {
  let sum = 0;
  let amp = 0.5;
  let p = base;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(u * p, v * p, p);
    amp *= 0.5;
    p *= 2;
  }
  return sum / (1 - 0.5 ** octaves);
}

function finish(
  size: number,
  height: Float32Array,
  tone: Float32Array,
  strength: number,
  darkInSeams: [number, number]
): ProceduralTextureData {
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const k = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      normal[i] = (-dx * k * 0.5 + 0.5) * 255;
      normal[i + 1] = (dy * k * 0.5 + 0.5) * 255;
      normal[i + 2] = (k * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
      const h = height[y * size + x];
      const seam = Math.min(1, Math.max(0, (h - darkInSeams[0]) / (darkInSeams[1] - darkInSeams[0])));
      const v = (0.42 + 0.58 * seam) * tone[y * size + x];
      const c = Math.min(255, v * 255);
      color[i] = c;
      color[i + 1] = c;
      color[i + 2] = c;
      color[i + 3] = Math.min(255, (0.98 - 0.32 * seam * h) * 255);
    }
  }
  return { size, color, normal };
}

export function ashlar(size = 1024, seed = 11, courses = 8): ProceduralTextureData {
  const noise = makeNoise(seed);
  const height = new Float32Array(size * size);
  const tone = new Float32Array(size * size);
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rows: Array<Array<{ a: number; tone: number; lift: number }>> = [];
  for (let r = 0; r < courses; r++) {
    const n = 4 + Math.floor(rnd() * 3);
    const cuts: Array<{ a: number; tone: number; lift: number }> = [];
    let x = rnd();
    for (let i = 0; i < n; i++) {
      cuts.push({ a: x, tone: 0.8 + rnd() * 0.32, lift: rnd() });
      x += (0.7 + rnd() * 0.6) / n;
    }
    rows.push(cuts);
  }
  const mortar = 0.0035;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const wu = u + (fbm(noise, u, v, 16, 3) - 0.5) * 0.009;
      const wv = v + (fbm(noise, u + 0.37, v, 16, 3) - 0.5) * 0.009;
      const rowF = fract(wv) * courses;
      const row = Math.floor(rowF) % courses;
      const dv = Math.min(rowF - Math.floor(rowF), 1 - (rowF - Math.floor(rowF))) / courses;
      const cuts = rows[row];
      const uu = fract(wu);
      let which = cuts.length - 1;
      let du = 1;
      for (let i = 0; i < cuts.length; i++) {
        const a = fract(cuts[i].a);
        const b = fract(cuts[(i + 1) % cuts.length].a);
        const inside = a < b ? uu >= a && uu < b : uu >= a || uu < b;
        if (inside) {
          which = i;
          const da = fract(uu - a);
          const db = fract(b - uu);
          du = Math.min(da, db);
          break;
        }
      }
      const d = Math.min(du, dv);
      const edge = Math.min(1, Math.max(0, (d - mortar) / 0.0085));
      const roughVal = fbm(noise, u, v, 8, 5);
      const fine = fbm(noise, u + 0.5, v + 0.5, 64, 3);
      const stone = 0.62 + cuts[which].lift * 0.06 + (roughVal - 0.5) * 0.3 + (fine - 0.5) * 0.2;
      height[y * size + x] = edge * edge * (3 - 2 * edge) * stone;
      tone[y * size + x] = cuts[which].tone * (0.82 + roughVal * 0.36);
    }
  }
  return finish(size, height, tone, size / 190, [0.06, 0.34]);
}

export function rough(size = 512, seed = 23): ProceduralTextureData {
  const noise = makeNoise(seed);
  const height = new Float32Array(size * size);
  const tone = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const big = fbm(noise, u, v, 4, 5);
      const fine = fbm(noise, u + 0.3, v + 0.7, 32, 4);
      const c = Math.abs(fbm(noise, u + 0.11, v + 0.57, 6, 4) - 0.5);
      const crack = Math.min(1, c / 0.012);
      height[y * size + x] = (0.35 + big * 0.42 + fine * 0.23) * (0.9 + 0.1 * crack);
      tone[y * size + x] = 0.72 + big * 0.5 + (fine - 0.5) * 0.28;
    }
  }
  return finish(size, height, tone, size / 150, [0.1, 0.42]);
}
