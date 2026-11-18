// Paladin materials: PBR steel, riveted mail, cloth, leather and gilt, all from procedural textures
// (no external files). A small generated environment gives the metal something to reflect.
import * as THREE from "three";
import { paintBodySkin, paintEye, paintHair, type HeadTextures } from "./facePaint";
import type { HumanAsset } from "./humanAsset";
import type { HumanSpec, RGB } from "./spec";

/** Textures of the imported base human for one character, with the tints that recolour them. */
export interface HumanTextures {
  skin: THREE.Texture;
  eye: THREE.Texture;
  brows: THREE.Texture;
  lashes: THREE.Texture;
  hairCrop: THREE.Texture;
  hairCropNormal: THREE.Texture;
  hairSwept: THREE.Texture;
  /** Linear multipliers taking each texture's average to the character's colour. */
  skinTint: THREE.Color;
  hairTint: { crop: THREE.Color; swept: THREE.Color; brows: THREE.Color };
}

/** A copy of an alpha-card texture with white RGB (so `color` sets its colour), same alpha. */
function whiten(t: THREE.Texture): THREE.Texture {
  const img = t.image as HTMLImageElement;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return t;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = 255;
    d.data[i + 1] = 255;
    d.data[i + 2] = 255;
  }
  g.putImageData(d, 0, 0);
  const out = new THREE.CanvasTexture(c);
  out.flipY = false;
  out.colorSpace = THREE.SRGBColorSpace;
  out.anisotropy = t.anisotropy;
  t.dispose();
  return out;
}

/** Average colour (sRGB 0..1) of the opaque, non-black texels of an image. */
function meanColor(img: CanvasImageSource): RGB {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d");
  if (!g) return [0.5, 0.5, 0.5];
  g.drawImage(img, 0, 0, 32, 32);
  const d = g.getImageData(0, 0, 32, 32).data;
  let r = 0;
  let gg = 0;
  let b = 0;
  let w = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.5 || d[i] + d[i + 1] + d[i + 2] < 30) continue;
    r += d[i] * a;
    gg += d[i + 1] * a;
    b += d[i + 2] * a;
    w += a;
  }
  return w > 0 ? [r / w / 255, gg / w / 255, b / w / 255] : [0.5, 0.5, 0.5];
}

/** Linear-space multiplier that turns `from` (sRGB) into `to` (sRGB). */
function tintFrom(from: RGB, to: RGB, lo = 0.15, hi = 1.8): THREE.Color {
  const a = new THREE.Color().setRGB(from[0], from[1], from[2], THREE.SRGBColorSpace);
  const b = new THREE.Color().setRGB(to[0], to[1], to[2], THREE.SRGBColorSpace);
  const k = (x: number, y: number) => Math.max(lo, Math.min(hi, y / Math.max(1e-3, x)));
  return new THREE.Color(k(a.r, b.r), k(a.g, b.g), k(a.b, b.b));
}

const EYE_SWATCHES: Array<[string, RGB]> = [
  ["eye_brown.png", [0.3, 0.18, 0.09]],
  ["eye_blue.png", [0.33, 0.48, 0.66]],
  ["eye_green.png", [0.3, 0.5, 0.3]],
  ["eye_grey.png", [0.43, 0.45, 0.43]],
];

/** Load the textures one character needs (skin by age, eyes by colour) and work out the tints. */
export async function loadHumanTextures(a: HumanAsset, spec: HumanSpec): Promise<HumanTextures> {
  const loader = new THREE.TextureLoader();
  const url = (file: string) => a.base + (a.meta.textures[file] || file);
  const get = async (file: string, color = true) => {
    const t = await loader.loadAsync(url(file));
    // glTF UVs start at the top left.
    t.flipY = false;
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  const d2 = (x: RGB, y: RGB) => (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
  const eyeFile = EYE_SWATCHES.slice().sort((p, q) => d2(p[1], spec.eyeColor) - d2(q[1], spec.eyeColor))[0][0];
  const [skin, eye, browsRaw, lashesRaw, hairCrop, hairCropNormal, hairSwept] = await Promise.all([
    get(spec.age > 0.6 ? "skin_middleage.jpg" : "skin_young.jpg"),
    get(eyeFile),
    get("brows.png"),
    get("lashes.png"),
    get("hair_short02.png"),
    get("hair_short02_normal.jpg", false),
    get("hair_short04.png"),
  ]);
  // Brows and lashes are black cards; keep their alpha and make them white so a colour tints them.
  const brows = whiten(browsRaw);
  const lashes = whiten(lashesRaw);
  const hair = spec.hair.color;
  const grey: RGB = [0.62, 0.61, 0.59];
  const g = spec.hair.grey;
  const hairColor: RGB = [hair[0] + (grey[0] - hair[0]) * g, hair[1] + (grey[1] - hair[1]) * g, hair[2] + (grey[2] - hair[2]) * g];
  return {
    skin,
    eye,
    brows,
    lashes,
    hairCrop,
    hairCropNormal,
    hairSwept,
    skinTint: tintFrom(meanColor(skin.image as CanvasImageSource), spec.skin, 0.2, 1.4),
    hairTint: {
      crop: tintFrom(meanColor(hairCrop.image as CanvasImageSource), hairColor, 0.05, 6),
      swept: tintFrom(meanColor(hairSwept.image as CanvasImageSource), hairColor, 0.05, 6),
      brows: new THREE.Color().setRGB(hairColor[0] * 0.8, hairColor[1] * 0.8, hairColor[2] * 0.8, THREE.SRGBColorSpace),
    },
  };
}

/** Hair painted into a skin texture (see body.ts SkinPaint). */
export interface PaintLayer {
  mask: Float32Array;
  color: RGB;
  amount: number;
  grain: number;
}

/**
 * A copy of the skin texture with short hair (stubble, beards, buzz cuts) painted in UV space:
 * each layer's per-vertex mask is drawn triangle by triangle, blurred, and used to lay a grainy
 * strand pattern of the hair colour over the skin. `tint` is the skin material's colour, which
 * the paint is divided by so the hair keeps its own colour.
 */
export function paintSkin(base: THREE.Texture, geo: THREE.BufferGeometry, layers: PaintLayer[], tint: THREE.Color): THREE.Texture {
  const img = base.image as HTMLImageElement;
  const W = img.width;
  const H = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) return base;
  g.drawImage(img, 0, 0);
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const idx = geo.getIndex() as THREE.BufferAttribute;
  // Strand grain: short dark dashes, tiled.
  const grain = document.createElement("canvas");
  grain.width = 128;
  grain.height = 128;
  const gg = grain.getContext("2d");
  const rnd = mulberry(7);
  for (const layer of layers) {
    const mask = document.createElement("canvas");
    mask.width = W;
    mask.height = H;
    const mg = mask.getContext("2d");
    if (!mg || !gg) continue;
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t);
      const b = idx.getX(t + 1);
      const c = idx.getX(t + 2);
      const m = (layer.mask[a] + layer.mask[b] + layer.mask[c]) / 3;
      if (m < 0.01) continue;
      mg.fillStyle = `rgba(255,255,255,${Math.min(1, m)})`;
      mg.beginPath();
      mg.moveTo(uv.getX(a) * W, uv.getY(a) * H);
      mg.lineTo(uv.getX(b) * W, uv.getY(b) * H);
      mg.lineTo(uv.getX(c) * W, uv.getY(c) * H);
      mg.closePath();
      mg.fill();
    }
    const soft = document.createElement("canvas");
    soft.width = W;
    soft.height = H;
    const sg = soft.getContext("2d");
    if (!sg) continue;
    sg.filter = `blur(${Math.round(W / 400)}px)`;
    sg.drawImage(mask, 0, 0);
    sg.filter = "none";
    // Colour in the skin's space: divide out the material tint.
    const col = new THREE.Color().setRGB(layer.color[0], layer.color[1], layer.color[2], THREE.SRGBColorSpace);
    col.setRGB(Math.min(1, col.r / tint.r), Math.min(1, col.g / tint.g), Math.min(1, col.b / tint.b));
    const css = `#${col.getHexString(THREE.SRGBColorSpace)}`;
    gg.clearRect(0, 0, 128, 128);
    gg.fillStyle = css;
    gg.globalAlpha = 1 - layer.grain;
    gg.fillRect(0, 0, 128, 128);
    gg.globalAlpha = 1;
    gg.strokeStyle = css;
    gg.lineWidth = 1;
    for (let k = 0; k < 900 * layer.grain; k++) {
      const x = rnd() * 128;
      const y = rnd() * 128;
      const l = 1.5 + rnd() * 3;
      const ang = Math.PI / 2 + (rnd() - 0.5) * 0.9;
      gg.beginPath();
      gg.moveTo(x, y);
      gg.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
      gg.stroke();
    }
    const pattern = sg.createPattern(grain, "repeat");
    if (!pattern) continue;
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = pattern;
    sg.fillRect(0, 0, W, H);
    sg.globalCompositeOperation = "source-over";
    g.globalAlpha = layer.amount;
    g.drawImage(soft, 0, 0);
    g.globalAlpha = 1;
  }
  const out = new THREE.CanvasTexture(canvas);
  out.flipY = false;
  out.colorSpace = THREE.SRGBColorSpace;
  out.anisotropy = base.anisotropy;
  return out;
}

/** Harness materials re-used on layers cut from the skin, with finer texture repeats for its UVs. */
export const FIT_KEYS = ["mail", "quilt", "wool", "braies", "leather", "steel", "coverall"] as const;
type FitKey = `${(typeof FIT_KEYS)[number]}Fit`;

export type HumanMaterials = Record<"skin" | "eye" | "brows" | "lashes" | "hairCrop" | "hairSwept" | FitKey, THREE.MeshStandardMaterial>;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise, `freq` lattice cells across the tile. */
function tileNoise(size: number, freq: number, seed: number): Float32Array {
  const rnd = mulberry(seed);
  const lat = new Float32Array(freq * freq);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * freq;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * freq;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const a = lat[(y0 % freq) * freq + (x0 % freq)];
      const b = lat[(y0 % freq) * freq + ((x0 + 1) % freq)];
      const c = lat[((y0 + 1) % freq) * freq + (x0 % freq)];
      const d = lat[((y0 + 1) % freq) * freq + ((x0 + 1) % freq)];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

function fbm(size: number, base: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = tileNoise(size, base << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function dataTex(size: number, fill: (i: number, px: Uint8Array, o: number) => void, srgb: boolean): THREE.DataTexture {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4 + 3] = 255;
    fill(i, px, i * 4);
  }
  const t = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Tangent-space normal map from a tileable height field. */
function normalTex(size: number, h: Float32Array, strength: number): THREE.DataTexture {
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  return dataTex(
    size,
    (i, px, o) => {
      const x = i % size;
      const y = Math.floor(i / size);
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.sqrt(dx * dx + dy * dy + 1);
      px[o] = Math.round((-dx / l) * 127.5 + 127.5);
      px[o + 1] = Math.round((-dy / l) * 127.5 + 127.5);
      px[o + 2] = Math.round((1 / l) * 127.5 + 127.5);
    },
    false
  );
}

const u8 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

interface MapSet {
  map: THREE.Texture;
  orm: THREE.Texture;
  normal: THREE.Texture;
}

/** Worked steel: fine scratches, soft hammer marks, darker patina in the low spots. */
function steelMaps(): MapSet {
  const S = 512;
  const rnd = mulberry(91);
  const blotch = fbm(S, 4, 4, 3);
  const fine = fbm(S, 32, 3, 9);
  const dents = fbm(S, 9, 2, 21);
  const scratch = new Float32Array(S * S);
  for (let k = 0; k < 520; k++) {
    let x = rnd() * S;
    let y = rnd() * S;
    const a = rnd() < 0.7 ? (rnd() - 0.5) * 0.5 + Math.PI / 2 : rnd() * Math.PI;
    const len = 12 + rnd() * 90;
    const depth = 0.25 + rnd() * 0.75;
    for (let s = 0; s < len; s++) {
      x += Math.cos(a);
      y += Math.sin(a);
      const i = ((Math.floor(y) + S * 4) % S) * S + ((Math.floor(x) + S * 4) % S);
      scratch[i] = Math.max(scratch[i], depth * (1 - Math.abs(s / len - 0.5) * 1.6));
    }
  }
  // Hammered plate: broad, shallow planishing marks and fine scratches. (Deep dents read as crumpled
  // foil on the large flat plates.)
  const height = new Float32Array(S * S);
  for (let i = 0; i < height.length; i++) height[i] = dents[i] * 0.16 + fine[i] * 0.035 - scratch[i] * 0.05;
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const patina = Math.max(0, 0.48 - blotch[i]) * 1.4;
        const v = 0.84 + blotch[i] * 0.14 - patina * 0.26 + scratch[i] * 0.08;
        px[o] = u8(v * (1 - patina * 0.04));
        px[o + 1] = u8(v * (1 - patina * 0.12));
        px[o + 2] = u8(v * (1 - patina * 0.24));
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        const patina = Math.max(0, 0.48 - blotch[i]) * 1.4;
        px[o] = 255;
        px[o + 1] = u8(0.26 + blotch[i] * 0.22 + patina * 0.5 + scratch[i] * 0.3 + fine[i] * 0.1);
        px[o + 2] = u8(1 - patina * 0.35);
      },
      false
    ),
    normal: normalTex(S, height, 4),
  };
}

/** Riveted mail: staggered rows of interlocking rings over a dark padded backing. */
function mailMaps(): MapSet {
  const S = 256;
  const cols = 10;
  const rows = 16;
  const cw = S / cols;
  const ch = S / rows;
  const height = new Float32Array(S * S);
  const mask = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let best = 0;
      const row0 = Math.floor(y / ch);
      for (let dr = -1; dr <= 1; dr++) {
        const r = row0 + dr;
        const off = ((r % 2) + 2) % 2 === 0 ? 0 : cw / 2;
        const cy = (r + 0.5) * ch;
        const col0 = Math.floor((x - off) / cw);
        for (let dc = -1; dc <= 1; dc++) {
          const cx = (col0 + dc + 0.5) * cw + off;
          // Rings lean alternately left and right, like real 4-in-1 mail.
          const lean = ((r % 2) + 2) % 2 === 0 ? 0.35 : -0.35;
          const px = (x - cx) / (cw * 0.62);
          const py = (y - cy + (x - cx) * lean) / (ch * 0.95);
          const d = Math.abs(Math.sqrt(px * px + py * py) - 0.72);
          const ringH = Math.max(0, 1 - d / 0.27);
          if (ringH > best) best = ringH;
        }
      }
      const i = y * S + x;
      mask[i] = Math.min(1, best * 2.2);
      height[i] = Math.sqrt(best);
    }
  }
  const grime = fbm(S, 6, 3, 44);
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const v = 0.06 + mask[i] * (0.52 + grime[i] * 0.22);
        px[o] = u8(v);
        px[o + 1] = u8(v * 0.99);
        px[o + 2] = u8(v * 0.97);
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        px[o] = 255;
        px[o + 1] = u8(0.95 - mask[i] * (0.5 - grime[i] * 0.2));
        px[o + 2] = u8(mask[i]);
      },
      false
    ),
    normal: normalTex(S, height, 3.2),
  };
}

/** Plain-weave cloth normal (also reused, coarser, for leather grain). */
function weaveNormal(threads: number, rough: number, seed: number): THREE.Texture {
  const S = 256;
  const n = fbm(S, 16, 3, seed);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * threads * Math.PI * 2;
      const v = (y / S) * threads * Math.PI * 2;
      h[y * S + x] = (Math.sin(u) * Math.sin(v) * 0.5 + 0.5) * (1 - rough) + n[y * S + x] * rough;
    }
  }
  return normalTex(S, h, 2.2);
}

function leatherMaps(): MapSet {
  const S = 256;
  const a = fbm(S, 8, 4, 71);
  const cells = fbm(S, 40, 2, 5);
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.5 + Math.abs(cells[i] - 0.5) * 0.9;
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const v = 0.72 + a[i] * 0.5;
        px[o] = u8(0.3 * v);
        px[o + 1] = u8(0.17 * v);
        px[o + 2] = u8(0.09 * v);
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        px[o] = 255;
        px[o + 1] = u8(0.5 + a[i] * 0.35);
        px[o + 2] = 0;
      },
      false
    ),
    normal: normalTex(S, h, 2.6),
  };
}

function braiesMaps(): MapSet {
  const S = 256;
  const weave = fbm(S, 24, 2, 63);
  const height = new Float32Array(S * S);
  for (let i = 0; i < height.length; i++) height[i] = weave[i] * 0.12;
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        // Natural unbleached linen (light ecru)
        const w = weave[i] * 0.08 - 0.04;
        px[o] = u8(0.68 + w);
        px[o + 1] = u8(0.63 + w);
        px[o + 2] = u8(0.55 + w);
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        px[o] = 255;
        px[o + 1] = u8(0.92);
        px[o + 2] = 0;
      },
      false
    ),
    normal: normalTex(S, height, 3.2),
  };
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(c: CanvasRenderingContext2D, w: number, h: number, seed: number, alpha: number): void {
  const rnd = mulberry(seed);
  for (let k = 0; k < 1400; k++) {
    const dark = rnd() < 0.6;
    c.fillStyle = dark ? `rgba(20,8,6,${alpha * rnd()})` : `rgba(255,236,210,${alpha * 0.6 * rnd()})`;
    const s = 1 + rnd() * 6;
    c.fillRect(rnd() * w, rnd() * h, s * (0.4 + rnd() * 2.4), s * 0.5);
  }
}

/** A radiant sun-cross: the paladin's device, shared by shield, tabard and cape. */
function sunCross(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, gold: string, shade: string): void {
  c.save();
  c.translate(cx, cy);
  c.fillStyle = gold;
  c.strokeStyle = shade;
  c.lineWidth = r * 0.05;
  for (let k = 0; k < 16; k++) {
    const long = k % 2 === 0;
    c.save();
    c.rotate((k / 16) * Math.PI * 2);
    c.beginPath();
    c.moveTo(-r * 0.09, -r * 0.42);
    c.lineTo(0, -r * (long ? 1 : 0.72));
    c.lineTo(r * 0.09, -r * 0.42);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  c.beginPath();
  c.arc(0, 0, r * 0.46, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = shade;
  const t = r * 0.085;
  c.fillRect(-t, -r * 0.34, t * 2, r * 0.68);
  c.fillRect(-r * 0.27, -r * 0.1 - t, r * 0.54, t * 2);
  c.restore();
}

const CRIMSON = "#7c1418";
const CRIMSON_DARK = "#4f0b10";
const GILT = "#d8a53c";
const GILT_DARK = "#7a5413";
const IVORY = "#d9cfb8";

function shieldFace(): THREE.Texture {
  return canvasTex(512, 640, (c) => {
    c.fillStyle = IVORY;
    c.fillRect(0, 0, 512, 640);
    // Crimson cross on ivory, gilt sun at the crossing.
    c.fillStyle = CRIMSON;
    c.fillRect(206, 0, 100, 640);
    c.fillRect(0, 170, 512, 100);
    c.strokeStyle = GILT_DARK;
    c.lineWidth = 5;
    c.strokeRect(206, -10, 100, 660);
    c.strokeRect(-10, 170, 532, 100);
    sunCross(c, 256, 220, 96, GILT, GILT_DARK);
    speckle(c, 512, 640, 7, 0.28);
    // Old cuts across the paint.
    const rnd = mulberry(202);
    c.strokeStyle = "rgba(40,30,24,0.55)";
    for (let k = 0; k < 9; k++) {
      c.lineWidth = 1 + rnd() * 2.5;
      const x = rnd() * 512;
      const y = rnd() * 640;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rnd() - 0.5) * 150, y + (rnd() - 0.2) * 120);
      c.stroke();
    }
  });
}

function capeFace(): THREE.Texture {
  return canvasTex(512, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, CRIMSON);
    g.addColorStop(1, CRIMSON_DARK);
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 1024);
    c.strokeStyle = GILT;
    c.lineWidth = 16;
    c.strokeRect(26, -40, 460, 1036);
    c.lineWidth = 4;
    c.strokeRect(50, -40, 412, 1012);
    sunCross(c, 256, 430, 130, GILT, GILT_DARK);
    speckle(c, 512, 1024, 12, 0.2);
    // Mud and fraying toward the hem.
    const hem = c.createLinearGradient(0, 820, 0, 1024);
    hem.addColorStop(0, "rgba(25,14,10,0)");
    hem.addColorStop(1, "rgba(25,14,10,0.7)");
    c.fillStyle = hem;
    c.fillRect(0, 820, 512, 204);
  });
}

function tabardFace(): THREE.Texture {
  return canvasTex(256, 512, (c) => {
    c.fillStyle = CRIMSON;
    c.fillRect(0, 0, 256, 512);
    c.strokeStyle = GILT;
    c.lineWidth = 12;
    c.strokeRect(14, -30, 228, 528);
    sunCross(c, 128, 230, 70, GILT, GILT_DARK);
    speckle(c, 256, 512, 31, 0.22);
    const hem = c.createLinearGradient(0, 400, 0, 512);
    hem.addColorStop(0, "rgba(25,14,10,0)");
    hem.addColorStop(1, "rgba(25,14,10,0.6)");
    c.fillStyle = hem;
    c.fillRect(0, 400, 256, 112);
  });
}

function woodBack(): THREE.Texture {
  return canvasTex(256, 320, (c) => {
    c.fillStyle = "#5a3d24";
    c.fillRect(0, 0, 256, 320);
    const rnd = mulberry(77);
    for (let x = 0; x < 256; x++) {
      const plank = Math.floor(x / 52);
      c.fillStyle = `rgba(${20 + plank * 6},${12 + plank * 3},6,${0.1 + rnd() * 0.3})`;
      c.fillRect(x, 0, 1, 320);
    }
    c.fillStyle = "rgba(10,6,3,0.8)";
    for (let x = 52; x < 256; x += 52) c.fillRect(x, 0, 2, 320);
  });
}

/** A dim torch-lit room for the metal to reflect: warm lights low, cool fill above. */
function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 lo = vec3(0.03,0.024,0.02); vec3 mid = vec3(0.07,0.062,0.055); vec3 hi = vec3(0.035,0.045,0.06); vec3 c = h < 0.0 ? mix(mid, lo, -h) : mix(mid, hi, h); gl_FragColor = vec4(c, 1.0); }",
    })
  );
  scene.add(shell);
  const panel = (color: number, power: number, pos: [number, number, number], size: [number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide })
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(0xffb066, 16, [9, 3, 6], [2.4, 5]);
  panel(0xffc890, 12, [-10, 2, -3], [2.4, 5]);
  panel(0xff9a50, 10, [-3, 1, 11], [2, 4]);
  panel(0x9fc2ff, 5, [2, 12, -6], [7, 7]);
  panel(0xdfe8ff, 4, [0, 6, -12], [5, 2.5]);
  panel(0xffd9a8, 6, [5, -2, -9], [6, 2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035, 0.1, 60);
  pmrem.dispose();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
  return target.texture;
}

export type MatKey =
  | "steel"
  | "mail"
  | "gold"
  | "leather"
  | "dark"
  | "cloth"
  | "skin"
  | "faceSkin"
  | "hair"
  | "eye"
  | "braies"
  | "quilt"
  | "wool"
  // Workwear (miners): coveralls, reflective tape, rubber boots, the hard hat, its lamp, sunglasses.
  | "coverall"
  | "reflect"
  | "rubber"
  | "hat"
  | "lamp"
  | "lens";

/** Colours of the workwear (sRGB 0..1); each person can wear their own. */
export interface Outfit {
  coverall: RGB;
  hat: RGB;
}

export const DEFAULT_OUTFIT: Outfit = { coverall: [0.86, 0.38, 0.1], hat: [0.93, 0.92, 0.88] };

export interface PaladinMaterials {
  skinned: Record<MatKey, THREE.MeshStandardMaterial>;
  /** The imported base human's own materials (skin, eyes, brows, lashes, hair caps). */
  human: HumanMaterials;
  blade: THREE.MeshStandardMaterial;
  shieldFace: THREE.MeshStandardMaterial;
  shieldBack: THREE.MeshStandardMaterial;
  cape: THREE.MeshStandardMaterial;
  tabard: THREE.MeshStandardMaterial;
  all: THREE.MeshStandardMaterial[];
  /** Put the painted head skin (built with the head mesh) on the face material. */
  setHeadTextures: (t: HeadTextures) => void;
  /** Paint short hair into the imported skin (see paintSkin). */
  paintHumanSkin: (geo: THREE.BufferGeometry, layers: PaintLayer[]) => void;
  setEnvIntensity: (v: number) => void;
  dispose: () => void;
}

export function createPaladinMaterials(renderer: THREE.WebGLRenderer, spec: HumanSpec, ht: HumanTextures, outfit: Outfit = DEFAULT_OUTFIT): PaladinMaterials {
  const env = buildEnvironment(renderer);
  const steel = steelMaps();
  const mail = mailMaps();
  const leather = leatherMaps();
  const weave = weaveNormal(24, 0.25, 8);
  const braies = braiesMaps();
  const bodySkin = paintBodySkin(spec);
  const eye = paintEye(spec);
  const hair = paintHair(spec);
  // Fine pores for all skin, and a coarser weave for wool and quilted linen.
  const pores = weaveNormal(40, 0.9, 77);
  pores.repeat.set(6, 6);
  const facePores = pores.clone();
  facePores.repeat.set(14, 14);
  facePores.needsUpdate = true;
  const coarse = weave.clone();
  coarse.repeat.set(10, 10);
  coarse.needsUpdate = true;
  const textures: THREE.Texture[] = [
    env,
    steel.map,
    steel.orm,
    steel.normal,
    mail.map,
    mail.orm,
    mail.normal,
    leather.map,
    leather.orm,
    leather.normal,
    weave,
    braies.map,
    braies.orm,
    braies.normal,
    bodySkin.map,
    bodySkin.orm,
    eye,
    hair,
    pores,
    facePores,
    coarse,
  ];

  const std = (p: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: 1, side: THREE.DoubleSide, ...p });
  // Skin: a soft reddish sheen at grazing angles stands in for light scattering under the surface.
  const skinMat = (p: THREE.MeshPhysicalMaterialParameters) =>
    new THREE.MeshPhysicalMaterial({
      envMap: env,
      envMapIntensity: 0.35,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(spec.skin[0], spec.skin[1] * 0.55, spec.skin[2] * 0.45),
      specularIntensity: 0.45,
      ...p,
    });

  const skinned: Record<MatKey, THREE.MeshStandardMaterial> = {
    steel: std({
      color: 0xb6bac1,
      map: steel.map,
      roughnessMap: steel.orm,
      metalnessMap: steel.orm,
      normalMap: steel.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.62,
      metalness: 1,
    }),
    mail: std({
      color: 0xaeb2b8,
      map: mail.map,
      roughnessMap: mail.orm,
      metalnessMap: mail.orm,
      normalMap: mail.normal,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 1,
      metalness: 1,
    }),
    gold: std({
      color: 0xd9a441,
      roughnessMap: steel.orm,
      normalMap: steel.normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.62,
      metalness: 1,
    }),
    leather: std({
      map: leather.map,
      roughnessMap: leather.orm,
      normalMap: leather.normal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.4,
    }),
    dark: std({ color: 0x050506, roughness: 1, metalness: 0, envMapIntensity: 0 }),
    cloth: std({ color: 0x6a1216, roughness: 0.92, metalness: 0, normalMap: weave, envMapIntensity: 0.3 }),
    skin: skinMat({ map: bodySkin.map, roughnessMap: bodySkin.orm, normalMap: pores, normalScale: new THREE.Vector2(0.25, 0.25) }),
    faceSkin: skinMat({ normalMap: facePores, normalScale: new THREE.Vector2(0.22, 0.22) }),
    hair: std({
      map: hair,
      alphaTest: 0.5,
      vertexColors: true,
      roughness: 0.6,
      metalness: 0,
      envMapIntensity: 0.3,
    }),
    eye: std({ map: eye, roughness: 0.08, metalness: 0, envMapIntensity: 1.2 }),
    braies: std({
      map: braies.map,
      roughnessMap: braies.orm,
      normalMap: braies.normal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.25,
    }),
    quilt: std({ color: 0x5b1a1c, roughness: 0.95, metalness: 0, normalMap: coarse, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.2 }),
    wool: std({ color: 0x2f2a25, roughness: 1, metalness: 0, normalMap: coarse, normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.15 }),
    coverall: std({
      color: new THREE.Color().setRGB(outfit.coverall[0], outfit.coverall[1], outfit.coverall[2], THREE.SRGBColorSpace),
      roughness: 0.92,
      metalness: 0,
      normalMap: coarse,
      normalScale: new THREE.Vector2(0.55, 0.55),
      envMapIntensity: 0.2,
    }),
    // Retroreflective tape: pale and a little glossy, with a faint glow so it catches the lamps.
    reflect: std({ color: 0xd8dcd6, roughness: 0.3, metalness: 0.2, emissive: 0x2a2c28, envMapIntensity: 1.3 }),
    rubber: std({ color: 0x17181a, roughness: 0.55, metalness: 0, envMapIntensity: 0.5 }),
    hat: std({
      color: new THREE.Color().setRGB(outfit.hat[0], outfit.hat[1], outfit.hat[2], THREE.SRGBColorSpace),
      roughness: 0.32,
      metalness: 0,
      envMapIntensity: 0.9,
    }),
    lamp: std({ color: 0xfff6e0, emissive: 0xffe7b0, emissiveIntensity: 3, roughness: 0.2, metalness: 0, envMapIntensity: 0.5 }),
    lens: std({ color: 0x0a0b0e, roughness: 0.06, metalness: 0.4, envMapIntensity: 1.6 }),
  };
  textures.push(ht.skin, ht.eye, ht.brows, ht.lashes, ht.hairCrop, ht.hairCropNormal, ht.hairSwept);
  const card = (map: THREE.Texture, color: THREE.Color, cut: number, p: THREE.MeshStandardMaterialParameters = {}) =>
    std({ map, color, alphaTest: cut, roughness: 0.75, metalness: 0, envMapIntensity: 0.25, ...p });
  const human = {} as HumanMaterials;
  Object.assign(human, {
    skin: skinMat({
      map: ht.skin,
      color: ht.skinTint,
      roughness: 0.62,
      normalMap: facePores,
      normalScale: new THREE.Vector2(0.14, 0.14),
      side: THREE.FrontSide,
    }),
    // The cornea is the transparent part of the eye texture.
    eye: std({ map: ht.eye, alphaTest: 0.5, roughness: 0.12, metalness: 0, envMapIntensity: 1.1, side: THREE.FrontSide }),
    brows: card(ht.brows, ht.hairTint.brows, 0.3),
    lashes: card(ht.lashes, new THREE.Color(0.05, 0.04, 0.035), 0.3),
    hairCrop: card(ht.hairCrop, ht.hairTint.crop, 0.42, { normalMap: ht.hairCropNormal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.55 }),
    hairSwept: card(ht.hairSwept, ht.hairTint.swept, 0.42, { roughness: 0.55 }),
  });

  mail.map.repeat.set(5, 5);
  mail.orm.repeat.set(5, 5);
  mail.normal.repeat.set(5, 5);
  leather.map.repeat.set(3, 3);
  leather.orm.repeat.set(3, 3);
  leather.normal.repeat.set(3, 3);
  // The skin's UV atlas spans the whole figure, so layers cut from it repeat their textures finer.
  for (const key of FIT_KEYS) {
    const m = skinned[key].clone();
    for (const slot of ["map", "normalMap", "roughnessMap", "metalnessMap"] as const) {
      const t = m[slot];
      if (!t) continue;
      const c = t.clone();
      c.repeat.copy(t.repeat).multiplyScalar(key === "mail" ? 5.2 : 3);
      c.needsUpdate = true;
      textures.push(c);
      m[slot] = c;
    }
    human[`${key}Fit` as FitKey] = m;
  }

  const blade = std({
    color: 0xe2e6ec,
    roughnessMap: steel.orm,
    normalMap: steel.normal,
    normalScale: new THREE.Vector2(0.15, 0.15),
    roughness: 0.42,
    metalness: 1,
    envMapIntensity: 1.25,
  });

  const face = shieldFace();
  const back = woodBack();
  const capeMap = capeFace();
  const tabardMap = tabardFace();
  const clothWeave = weave.clone();
  clothWeave.repeat.set(14, 28);
  clothWeave.needsUpdate = true;
  textures.push(face, back, capeMap, tabardMap, clothWeave);

  const shieldFaceMat = std({ map: face, roughness: 0.62, metalness: 0.05, normalMap: steel.normal, normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.6 });
  const shieldBackMat = std({ map: back, roughness: 0.85, metalness: 0, envMapIntensity: 0.3 });
  const cape = std({ map: capeMap, roughness: 0.9, metalness: 0, normalMap: clothWeave, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3 });
  const tabard = std({ map: tabardMap, roughness: 0.9, metalness: 0, normalMap: clothWeave, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3 });

  const all = Object.keys(skinned)
    .map((k) => skinned[k as MatKey])
    .concat(Object.keys(human).map((k) => human[k as keyof HumanMaterials]))
    .concat([blade, shieldFaceMat, shieldBackMat, cape, tabard]);
  const base = all.map((m) => m.envMapIntensity);

  return {
    skinned,
    human,
    blade,
    shieldFace: shieldFaceMat,
    shieldBack: shieldBackMat,
    cape,
    tabard,
    all,
    setHeadTextures(t: HeadTextures) {
      skinned.faceSkin.map = t.map;
      skinned.faceSkin.roughnessMap = t.orm;
      skinned.faceSkin.needsUpdate = true;
      textures.push(t.map, t.orm);
    },
    paintHumanSkin(geo: THREE.BufferGeometry, layers: PaintLayer[]) {
      if (!layers.length) return;
      const painted = paintSkin(ht.skin, geo, layers, ht.skinTint);
      human.skin.map = painted;
      human.skin.needsUpdate = true;
      textures.push(painted);
    },
    setEnvIntensity(v: number) {
      all.forEach((m, i) => {
        m.envMapIntensity = base[i] * v;
      });
    },
    dispose() {
      for (const m of all) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
