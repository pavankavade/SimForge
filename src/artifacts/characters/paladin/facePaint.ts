// Skin, eye and hair textures painted from the same spec and the same shape functions that
// sculpt the head, so lips, brows, lash lines and stubble land exactly on the geometry.
import * as THREE from "three";
import { EYE_Y, jawBorder, type HeadGrid, type HeadShape } from "./head";
import { clamp01, gauss, gauss2, mix, sstep, superR, valueAt } from "./sculpt";
import type { HumanSpec, RGB } from "./spec";

const hash = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Value noise on an infinite lattice. */
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const fbm = (x: number, y: number): number => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

function tex(size: number, px: Uint8Array, srgb: boolean, repeat: boolean): THREE.DataTexture {
  const t = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const u8 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

/** Blend colour `c` toward `to` by `k`, in place. */
function toward(c: number[], to: RGB | number[], k: number): void {
  c[0] += (to[0] - c[0]) * k;
  c[1] += (to[1] - c[1]) * k;
  c[2] += (to[2] - c[2]) * k;
}

export function hairTint(spec: HumanSpec): RGB {
  const g = spec.hair.grey;
  return [mix(spec.hair.color[0], 0.6, g * 0.8), mix(spec.hair.color[1], 0.59, g * 0.8), mix(spec.hair.color[2], 0.57, g * 0.8)];
}

/** Lip colour: the skin tone pushed toward red, less so on dark skin. */
function lipTone(skin: RGB): RGB {
  const light = (skin[0] + skin[1] + skin[2]) / 3;
  return [skin[0] * mix(0.95, 0.78, light), skin[1] * mix(0.72, 0.55, light), skin[2] * mix(0.74, 0.62, light)];
}

export interface HeadTextures {
  map: THREE.Texture;
  /** G = roughness. */
  orm: THREE.Texture;
}

export function paintHead(spec: HumanSpec, shape: HeadShape, grid: HeadGrid, size = 1024): HeadTextures {
  const px = new Uint8Array(size * size * 4);
  const orm = new Uint8Array(size * size * 4);
  const skin = spec.skin;
  const lip = lipTone(skin);
  const hair = hairTint(spec);
  const browCol: RGB = [hair[0] * 0.75, hair[1] * 0.75, hair[2] * 0.75];
  const red: RGB = [skin[0] * 1.02, skin[1] * 0.74, skin[2] * 0.7];
  const shadow: RGB = [skin[0] * 0.72, skin[1] * 0.6, skin[2] * 0.58];
  const stubble: RGB = [mix(skin[0], hair[0], 0.55) * 0.82, mix(skin[1], hair[1], 0.55) * 0.84, mix(skin[2], hair[2], 0.55) * 0.9];
  const c = [0, 0, 0];
  const bald = spec.hair.style === "bald";

  for (let py = 0; py < size; py++) {
    const y = valueAt(grid.ys, (py + 0.5) / size);
    const prof = shape.profile(y);
    for (let qx = 0; qx < size; qx++) {
      const theta = valueAt(grid.thetas, (qx + 0.5) / size);
      const at = Math.abs(theta);
      const cs = Math.cos(theta);
      const r0 = superR(theta, prof.w, prof.f, prof.b, prof.n);
      const x = r0 * Math.sin(theta);
      const ax = Math.abs(x);
      const front = sstep(0.05, 0.55, cs);
      // Surface coordinates in millimetres, for noise that keeps its scale around the head.
      const su = theta * 85;
      const sv = y * 1000;

      // Base tone with broad mottling and fine pore speckle.
      const blotch = fbm(su * 0.035 + 7, sv * 0.035) - 0.5;
      const pore = vnoise(su * 1.9, sv * 1.9) - 0.5;
      c[0] = skin[0] * (1 + blotch * 0.07 + pore * 0.035);
      c[1] = skin[1] * (1 + blotch * 0.1 + pore * 0.04);
      c[2] = skin[2] * (1 + blotch * 0.11 + pore * 0.04);
      let rough = 0.6 + pore * 0.12;

      // Blood near the surface: cheeks, nose, chin; darker, thinner skin round the eyes.
      const flush =
        gauss2(at - 0.72, 0.3, y - 0.06, 0.022) * 0.5 + gauss2(x, 0.013, y - 0.064, 0.013) * front * 0.45 + gauss2(x, 0.02, y - 0.002, 0.012) * front * 0.2;
      toward(c, red, flush * spec.flush);
      toward(c, shadow, gauss2(ax - shape.eyeX, 0.019, y - (EYE_Y - 0.002), 0.012) * front * (0.28 + 0.3 * spec.age));
      // Baked contact shadow where light rarely reaches: beside and under the nose, under the
      // lower lip, under the jaw, behind the jaw angle.
      const occ =
        gauss2(ax - 0.0145, 0.0055, y - 0.072, 0.02) * 0.22 +
        gauss2(x, 0.011, y - 0.0492, 0.0022) * 0.16 +
        gauss2(x, 0.015, y - 0.0205, 0.0042) * 0.3 +
        gauss2(ax - 0.027, 0.004, y - 0.0355, 0.004) * 0.25;
      toward(c, shadow, occ * front + 0.3 * sstep(-0.004, -0.02, y) * sstep(-0.05, -0.03, y) * sstep(-0.3, 0.6, cs));
      toward(c, shadow, 0.3 * gauss(y - (jawBorder(at) - 0.011), 0.008) * sstep(0.25, 0.7, at) * (1 - sstep(1.45, 1.75, at)));
      // The forehead and nose catch more oil.
      rough -= 0.1 * (gauss2(x, 0.03, y - 0.14, 0.03) + gauss2(x, 0.01, y - 0.07, 0.02)) * front;

      if (front > 0) {
        // Lips, with the fine vertical creases and a dark line where they meet.
        const lp = shape.lips(ax, y) * front;
        if (lp > 0) {
          const crease = 0.9 + 0.1 * vnoise(x * 2600, y * 180);
          toward(c, [lip[0] * crease, lip[1] * crease, lip[2] * crease], lp * 0.9);
          rough = mix(rough, 0.36, lp);
        }
        const mw = 0.0245 * (1 + 0.14 * shape.face.mouthWidth);
        const ux = clamp01(ax / mw);
        toward(c, [0.16, 0.07, 0.07], gauss(y - (0.0362 - 0.0012 * ux * ux), 0.0009) * (1 - Math.pow(ux, 4)) * 0.75 * front);
        // Nostrils.
        toward(c, [0.1, 0.05, 0.05], gauss2(ax - 0.0072 * (1 + 0.16 * shape.face.noseWidth), 0.002, y - 0.0516, 0.0014) * 0.45 * front);

        // Eyebrows: individual hairs growing outward and up.
        const bm = shape.brow(ax, y, spec.brows) * front;
        if (bm > 0) {
          const strand = vnoise(ax * 5200 - y * 2600, y * 1500 + ax * 600);
          toward(c, browCol, bm * (0.35 + 0.65 * sstep(0.25, 0.7, strand)));
          rough = mix(rough, 0.75, bm);
        }

        // Lash lines and the darker rim of the lids.
        const L = shape.lidAt(theta, y, prof);
        if (L) {
          if (Math.abs(L.un) < 1.05) {
            const upper = L.v > (L.up + L.low) / 2;
            const edge = upper ? L.v - L.up : L.low - L.v;
            const w = upper ? 0.00075 : 0.00045;
            const k = gauss(edge - 0.0002, w) * (upper ? 0.92 : 0.45) * sstep(1.05, 0.9, Math.abs(L.un));
            toward(c, [0.07, 0.045, 0.04], k);
            // Inside the opening the skin turns to the wet pink of the lid margin.
            if (L.inside > 0) toward(c, [0.62, 0.36, 0.34], sstep(0, 0.0006, L.inside));
          }
        }
      }

      // Freckles across the nose and cheeks.
      if (spec.freckles > 0) {
        const zone = (gauss2(at - 0.5, 0.42, y - 0.072, 0.03) + gauss2(x, 0.02, y - 0.075, 0.02) * front) * spec.freckles;
        const dots = sstep(0.74, 0.86, vnoise(su * 0.62 + 3, sv * 0.62)) * sstep(0.3, 0.6, vnoise(su * 0.11, sv * 0.11 + 9));
        toward(c, [skin[0] * 0.72, skin[1] * 0.52, skin[2] * 0.4], clamp01(zone * 1.6) * dots * 0.7);
      }

      // Weathering: forehead lines, crow's feet, uneven tone.
      if (spec.age > 0.45) {
        const lines = sstep(0.6, 0.95, Math.sin(y * 950 + vnoise(x * 60, 2) * 4)) * gauss2(x, 0.045, y - 0.145, 0.018) * front;
        const feet = sstep(0.6, 0.95, Math.sin((y - EYE_Y) * 1500 + (at - 0.62) * 40)) * gauss2(at - 0.66, 0.1, y - EYE_Y, 0.008);
        toward(c, shadow, (lines + feet) * spec.age * 0.5);
        toward(c, [skin[0] * 0.86, skin[1] * 0.72, skin[2] * 0.62], sstep(0.62, 0.8, fbm(su * 0.09 + 31, sv * 0.09)) * spec.age * 0.35);
      }

      // Beard: a shadow of stubble at low values, a dark base under the beard shells at high ones.
      if (spec.beard > 0) {
        const bz = shape.beard(theta, ax, y);
        if (bz > 0) {
          const dots = sstep(0.42, 0.62, vnoise(su * 2.4 + 11, sv * 2.4));
          const full = sstep(0.45, 0.8, spec.beard);
          toward(c, stubble, bz * clamp01(spec.beard * 1.6) * (0.4 + 0.3 * dots));
          toward(c, [hair[0] * 0.6, hair[1] * 0.6, hair[2] * 0.6], bz * bz * full * (0.45 + 0.4 * dots));
          rough = mix(rough, 0.78, bz * clamp01(spec.beard * 1.5));
        }
      }

      // Scalp: short hair growing out of the skin, so the hair shells have something to sit on.
      const sc = shape.scalp(theta, y);
      if (sc > 0) {
        if (bald) {
          toward(c, stubble, sc * 0.22);
        } else {
          const dots = sstep(0.3, 0.6, vnoise(su * 2.2 + 5, sv * 2.2));
          toward(c, [hair[0] * 0.6, hair[1] * 0.6, hair[2] * 0.6], sc * sc * (0.6 + 0.35 * dots));
          rough = mix(rough, 0.8, sc);
        }
      }

      const o = (py * size + qx) * 4;
      px[o] = u8(c[0]);
      px[o + 1] = u8(c[1]);
      px[o + 2] = u8(c[2]);
      px[o + 3] = 255;
      orm[o] = 255;
      orm[o + 1] = u8(rough);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { map: tex(size, px, true, false), orm: tex(size, orm, false, false) };
}

/** Tiling skin for the body, matched to the head's base tone. */
export function paintBodySkin(spec: HumanSpec, size = 256): HeadTextures {
  const px = new Uint8Array(size * size * 4);
  const orm = new Uint8Array(size * size * 4);
  const P = 8;
  // Periodic noise so the tile repeats without a seam.
  const pn = (x: number, y: number, f: number) => {
    const xi = Math.floor(x * f);
    const yi = Math.floor(y * f);
    const tx = x * f - xi;
    const ty = y * f - yi;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const h = (i: number, j: number) => hash(((i % f) + f) % f, ((j % f) + f) % f);
    return h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx + (h(xi, yi + 1) - h(xi, yi)) * sy + (h(xi, yi) - h(xi + 1, yi) - h(xi, yi + 1) + h(xi + 1, yi + 1)) * sx * sy;
  };
  for (let i = 0; i < size * size; i++) {
    const x = (i % size) / size;
    const y = Math.floor(i / size) / size;
    const blotch = pn(x, y, P) * 0.6 + pn(x, y, P * 2) * 0.4 - 0.5;
    const pore = pn(x, y, 64) - 0.5;
    px[i * 4] = u8(spec.skin[0] * (1 + blotch * 0.07 + pore * 0.03));
    px[i * 4 + 1] = u8(spec.skin[1] * (1 + blotch * 0.1 + pore * 0.035));
    px[i * 4 + 2] = u8(spec.skin[2] * (1 + blotch * 0.11 + pore * 0.035));
    px[i * 4 + 3] = 255;
    orm[i * 4] = 255;
    orm[i * 4 + 1] = u8(0.62 + pore * 0.12);
    orm[i * 4 + 2] = 0;
    orm[i * 4 + 3] = 255;
  }
  return { map: tex(size, px, true, true), orm: tex(size, orm, false, true) };
}

/** Iris with radial fibres, a dark limbal ring, pupil, and a veined sclera shaded by the lid. */
export function paintEye(spec: HumanSpec, size = 256): THREE.Texture {
  const px = new Uint8Array(size * size * 4);
  const iris = spec.eyeColor;
  const IRIS = 0.222;
  for (let i = 0; i < size * size; i++) {
    const dx = ((i % size) + 0.5) / size - 0.5;
    const dy = (Math.floor(i / size) + 0.5) / size - 0.5;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    const c = [0.9, 0.87, 0.84];
    // Sclera: pinker toward the corners, faint veins, shadow under the upper lid.
    toward(c, [0.82, 0.62, 0.58], sstep(0.3, 0.5, d) * 0.5);
    toward(c, [0.7, 0.3, 0.28], sstep(0.72, 0.9, vnoise(a * 9 + 4, d * 30)) * sstep(0.27, 0.42, d) * 0.35);
    if (d < IRIS + 0.012) {
      const t = d / IRIS;
      const fibre = 0.72 + 0.4 * vnoise(a * 22, t * 3) * vnoise(a * 7 + 3, 1);
      const col = [iris[0] * fibre, iris[1] * fibre, iris[2] * fibre];
      // Lighter collarette round the pupil, dark limbal ring at the edge.
      toward(col, [iris[0] * 1.5 + 0.08, iris[1] * 1.35 + 0.06, iris[2] * 1.1], gauss(t - 0.42, 0.14) * 0.5);
      toward(col, [0.03, 0.03, 0.035], sstep(0.82, 1.0, t) * 0.85);
      toward(col, [0.012, 0.012, 0.014], sstep(0.36, 0.31, t));
      toward(c, col, sstep(IRIS + 0.012, IRIS - 0.004, d));
    }
    toward(c, [0.2, 0.14, 0.13], sstep(0.02, 0.2, dy) * 0.5);
    px[i * 4] = u8(c[0]);
    px[i * 4 + 1] = u8(c[1]);
    px[i * 4 + 2] = u8(c[2]);
    px[i * 4 + 3] = 255;
  }
  return tex(size, px, true, false);
}

/** Strand texture for hair shells: alpha marks where a strand is, so shells read as hair. */
export function paintHair(spec: HumanSpec, size = 256): THREE.Texture {
  const px = new Uint8Array(size * size * 4);
  const ACROSS = 72;
  const ALONG = 7;
  const lat = (i: number, j: number, seed: number) => hash((((i % ACROSS) + ACROSS) % ACROSS) + seed * 17, ((j % ALONG) + ALONG) % ALONG);
  for (let i = 0; i < size * size; i++) {
    const x = ((i % size) / size) * ACROSS;
    const y = (Math.floor(i / size) / size) * ALONG;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const sy = ty * ty * (3 - 2 * ty);
    const sample = (seed: number) => {
      const a = mix(lat(xi, yi, seed), lat(xi, yi + 1, seed), sy);
      const b = mix(lat(xi + 1, yi, seed), lat(xi + 1, yi + 1, seed), sy);
      return mix(a, b, tx * tx * (3 - 2 * tx));
    };
    const strand = sample(1);
    const tone = sample(2);
    // Whole strands go grey, not a wash over everything.
    const greyStrand = hash(xi * 3.7, 91) < spec.hair.grey ? 1 : 0;
    const base = spec.hair.color;
    const k = 0.72 + 0.6 * tone;
    px[i * 4] = u8(mix(base[0], 0.64, greyStrand * 0.9) * k);
    px[i * 4 + 1] = u8(mix(base[1], 0.63, greyStrand * 0.9) * k);
    px[i * 4 + 2] = u8(mix(base[2], 0.61, greyStrand * 0.9) * k);
    px[i * 4 + 3] = u8(clamp01(0.25 + strand * 1.1));
  }
  return tex(size, px, true, true);
}
