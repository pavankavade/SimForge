// Real stone geometry: chamfered ashlar blocks laid in courses on the aisle and far walls, wedge
// voussoirs on every arch, opening and vault rib, and a jambed doorway. The flat walls behind them
// become the mortar bed, so joints are true recesses that catch shadows, AO and GI.
import * as THREE from "three/webgpu";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { bakeUV, clean, extrudeSY, extrudeXY, rng } from "./geo.js";
import { L, BAY, WALL_X, WALL_T, AISLE_X, SPRING, ARCH_R, GALLERY_Y, WALL_TOP, VAULT_R, WELL } from "./hall.js";

const JOINT = 0.014;  // mortar joint width
const PROUD = 0.022;  // how far a stone face stands out of the mortar bed
const BEVEL = 0.008;  // extrude chamfer on voussoirs (grows the shape, so joints are widened by it)

// Per-stone id (0..1) for the material's tint variation.
function tag(g, id) {
  g = clean(g);
  g.setAttribute("blockId", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(id), 1));
  return g;
}

const fract = (x) => x - Math.floor(x);
const qh = (x, y, z, k) => fract(Math.sin(Math.round(x * 2000) * 12.9898 + Math.round(y * 2000) * 78.233 + Math.round(z * 2000) * 37.719 + k) * 43758.5453);

// One chamfered block, w (x) by h (y) by d (z), with its corners nudged so no two are square.
function stone(w, h, d, r) {
  const g = new RoundedBoxGeometry(w, h, d, 1, Math.min(0.016, h * 0.08, w * 0.08));
  const p = g.attributes.position;
  const k = r() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x + (qh(x, y, z, k) - 0.5) * 0.008, y + (qh(x, y, z, k + 7) - 0.5) * 0.006, z + (qh(x, y, z, k + 13) - 0.5) * 0.008);
  }
  g.rotateX((r() - 0.5) * 0.01).rotateY((r() - 0.5) * 0.01).rotateZ((r() - 0.5) * 0.008);
  return g;
}

// Courses of irregular stones over a len x height rectangle (u along, v up), joints left open.
function courses(len, height, r, { h = 0.31, w = 0.62, v0 = 0 } = {}) {
  const out = [];
  let v = v0;
  while (v < height - 0.06) {
    const ch = Math.min(h * (0.82 + r() * 0.36), height - v);
    let u = -r() * w * 0.8;
    while (u < len) {
      const bw = w * (0.55 + r() * 0.9);
      const a = Math.max(u, 0), b = Math.min(u + bw, len);
      if (b - a > 0.1) out.push({ u0: a, u1: b, v0: v, v1: v + ch });
      u += bw;
    }
    v += ch;
  }
  return out;
}

// Wedge stones round a semicircle centred at (cx, cy), radii r0..r1, n stones, drawn in a 2D plane.
// Joints are radial with constant width; the extrados is stepped a little, the keystone stands tall.
function ring(cx, cy, r0, r1, n, r, jitter = 0.04) {
  const shapes = [];
  const gap = JOINT + 2 * BEVEL;
  const ri = r0 + BEVEL;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - (i * Math.PI) / n, a1 = Math.PI - ((i + 1) * Math.PI) / n;
    const o = (i === (n - 1) / 2 ? r1 + 0.03 : r1 - r() * jitter) - BEVEL;
    const sh = new THREE.Shape();
    const gi = gap / 2 / ri, go = gap / 2 / o;
    sh.moveTo(cx + ri * Math.cos(a0 - gi), cy + ri * Math.sin(a0 - gi));
    sh.absarc(cx, cy, ri, a0 - gi, a1 + gi, true);
    sh.lineTo(cx + o * Math.cos(a1 + go), cy + o * Math.sin(a1 + go));
    sh.absarc(cx, cy, o, a1 + go, a0 - go, false);
    sh.closePath();
    shapes.push(sh);
  }
  return shapes;
}

// Extrude with few curve segments: each voussoir arc is short.
function ringSY(shapes, x0, depth, r) {
  return shapes.map((sh) => tag(extrudeSY(sh, x0, depth, BEVEL, 6), r()));
}
function ringXY(shapes, s0, depth, r) {
  return shapes.map((sh) => tag(extrudeXY(sh, s0, depth, BEVEL, 6), r()));
}

export function buildMasonry() {
  const r = rng(4242);
  const walls = [];  // ashlar on the aisle and far walls
  const arches = []; // voussoirs (arch-stone colour)

  // aisle walls, floor to gallery
  for (const sx of [-1, 1]) {
    for (const c of courses(L, GALLERY_Y, r)) {
      const w = c.u1 - c.u0 - JOINT, h = c.v1 - c.v0 - JOINT, d = 0.14;
      const prot = PROUD + (r() - 0.5) * 0.012;
      const g = stone(d, h, w, r);
      g.translate(sx * (AISLE_X - prot + d / 2), (c.v0 + c.v1) / 2, -(c.u0 + c.u1) / 2);
      walls.push(tag(bakeUV(g), r()));
    }
  }

  // far wall: full width, up to the vault, cut around a voussoired doorway
  const DOOR_R = 1.0, DOOR_Y = 2.2, RX = DOOR_R + 0.42;
  const limit = (x) => (Math.abs(x) < VAULT_R ? WALL_TOP + Math.sqrt(VAULT_R * VAULT_R - x * x) : WALL_TOP);
  const xr = (y) => (y <= DOOR_Y ? RX : y < DOOR_Y + RX ? Math.sqrt(RX * RX - (y - DOOR_Y) ** 2) : 0);
  const farStone = (x0, x1, v0, v1, d, protExtra = 0) => {
    const w = x1 - x0 - JOINT, h = v1 - v0 - JOINT;
    if (w < 0.08) return;
    const prot = PROUD + protExtra + (r() - 0.5) * 0.012;
    const g = stone(w, h, d, r);
    g.translate((x0 + x1) / 2, (v0 + v1) / 2, -L + prot - d / 2);
    walls.push(tag(bakeUV(g), r()));
  };
  for (const c of courses(2 * AISLE_X, WALL_TOP + VAULT_R, r)) {
    const x0 = c.u0 - AISLE_X, x1 = c.u1 - AISLE_X;
    if (c.v0 > limit((x0 + x1) / 2)) continue;
    const xm = xr(c.v0);
    if (xm > 0 && x1 > -xm && x0 < xm) {
      farStone(x0, Math.min(x1, -xm), c.v0, c.v1, 0.14);
      farStone(Math.max(x0, xm), x1, c.v0, c.v1, 0.14);
    } else farStone(x0, x1, c.v0, c.v1, 0.14);
  }
  // jambs: through-stones that also line the door reveal
  for (const sx of [-1, 1]) {
    for (const c of courses(RX - DOOR_R, DOOR_Y, r, { w: 0.5, h: 0.32 })) {
      const a = DOOR_R - 0.01, b = RX + JOINT / 2;
      const [x0, x1] = sx < 0 ? [-b, -a] : [a, b];
      farStone(x0, x1, c.v0, c.v1, 0.49, 0.008);
    }
  }
  arches.push(...ringXY(ring(0, DOOR_Y, DOOR_R - 0.01, RX, 11, r), L - PROUD - 0.008, 0.49, r));

  // arcade arches and the small gallery openings above them, stones run through the wall
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -(WALL_X + WALL_T / 2 + PROUD) : WALL_X - WALL_T / 2 - PROUD;
    for (let k = 0; k < L / BAY; k++) {
      const c = k * BAY + BAY / 2;
      arches.push(...ringSY(ring(c, SPRING, ARCH_R - 0.01, BAY / 2, 13, r), x0, WALL_T + 2 * PROUD, r));
      arches.push(...ringSY(ring(c, 5.6, 0.59, 0.82, 9, r, 0.03), x0, WALL_T + 2 * PROUD, r));
    }
  }

  // transverse vault ribs
  for (let k = 1; k < L / BAY; k++) {
    const s = k * BAY;
    if (s > WELL[0] - 0.3 && s < WELL[1] + 0.3) continue;
    arches.push(...ringXY(ring(0, WALL_TOP, VAULT_R - 0.22, VAULT_R - 0.035, 21, r, 0.0), s - 0.2, 0.4, r));
  }

  return { walls, arches };
}
