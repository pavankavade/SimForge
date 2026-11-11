// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { floorAt, TIER } from "./floors";
import type { DungeonData, DungeonRoom } from "./generator";
import { ARCH_SPRING, archRise, CEIL_TOP, doorLights, type LevelData, SPRING } from "./level";
import { type PierSpot, pavingGeometry } from "./paving";
import { buildField, fieldAt, floorGeometry, heightSampler, tunnelGeometry, wallGeometry } from "./skin";

export interface CryptLamp {
  x: number;
  y: number;
  z: number;
  kind: "candle" | "ember" | "door";
}

export interface CryptViewTarget {
  group: THREE.Group;
  materials: {
    wall: THREE.Material;
    archWall: THREE.Material;
    tunnel: THREE.Material;
    vault: THREE.Material;
    dressed: THREE.Material;
    floor: THREE.Material;
    paving: THREE.Material;
    iron: THREE.Material;
  };
  U: {
    tWallH: { value: THREE.Texture };
    tFloorH: { value: THREE.Texture };
  };
  candleParts: {
    sconce: THREE.BufferGeometry;
    wax: THREE.BufferGeometry;
    flame: THREE.BufferGeometry;
    waxMaterial: THREE.Material;
    flameMaterial: THREE.Material;
  };
  haloMaterial: THREE.Material;
  markSolid: () => void;
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function roomBays(r: DungeonRoom) {
  const a = r.baysX;
  const b = r.baysZ;
  let span = 0;
  for (let i = 0; i < a.length - 1; i++) span = Math.max(span, (a[i + 1] - a[i]) / 2);
  for (let i = 0; i < b.length - 1; i++) span = Math.max(span, (b[i + 1] - b[i]) / 2);
  return { a, b, rise: Math.min(3, Math.max(1.9, span)) };
}

function bayHeight(u: number, v: number, rise: number) {
  const h1 = Math.sqrt(Math.max(0, 1 - u * u));
  const h2 = Math.sqrt(Math.max(0, 1 - v * v));
  return SPRING + rise * Math.max(h1, h2);
}

function vaultGeometry(d: DungeonData, r: DungeonRoom) {
  const { a, b, rise } = roomBays(r);
  const N = 26;
  const pos: number[] = [];
  const bay: number[] = [];
  const riseAttr: number[] = [];
  const idx: number[] = [];
  const ox = -d.W / 2;
  const oz = -d.H / 2;
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const cx = (a[i] + a[i + 1]) / 2;
      const cz = (b[j] + b[j + 1]) / 2;
      const ha = (a[i + 1] - a[i]) / 2;
      const hb = (b[j + 1] - b[j]) / 2;
      const start = pos.length / 3;
      for (let y = 0; y <= N; y++) {
        for (let x = 0; x <= N; x++) {
          const u = Math.sin(((x / N) * 2 - 1) * Math.PI * 0.5);
          const v = Math.sin(((y / N) * 2 - 1) * Math.PI * 0.5);
          pos.push(ox + cx + u * ha, bayHeight(u, v, rise), oz + cz + v * hb);
          bay.push(ox + cx, oz + cz, ha, hb);
          riseAttr.push(rise);
        }
      }
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const p = start + y * (N + 1) + x;
          idx.push(p, p + 1, p + N + 1, p + 1, p + N + 2, p + N + 1);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(
      new Float32Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? -1 : 0)),
      3
    )
  );
  g.setAttribute("aBay", new THREE.Float32BufferAttribute(bay, 4));
  g.setAttribute("aRise", new THREE.Float32BufferAttribute(riseAttr, 1));
  g.setIndex(idx);
  return g;
}

const ribFoot = (s: number) => {
  const k = Math.max(0, (Math.abs(s) - 0.7) / 0.3);
  return 0.3 * k * k;
};
const ribPath = (t: number) => Math.sin((t * 2 - 1) * Math.PI * 0.5);

function ribStones(
  at: (t: number, out: THREE.Vector3) => THREE.Vector3,
  length: number,
  width: number,
  depth: number,
  seed: number,
  out: THREE.BufferGeometry[],
  back: (t: number) => number = () => 0.02
) {
  const count = Math.max(4, Math.round(length / 0.42));
  const P = new THREE.Vector3();
  const Q = new THREE.Vector3();
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const N = new THREE.Vector3();
  const section = (t: number, w: number, dp: number) => {
    at(t, P);
    at(Math.min(1, t + 0.01), Q);
    T.subVectors(Q, P);
    if (T.lengthSq() < 1e-8) {
      at(Math.max(0, t - 0.01), Q);
      T.subVectors(P, Q);
    }
    T.normalize();
    S.set(-T.z, 0, T.x);
    if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
    S.normalize();
    N.crossVectors(S, T).normalize();
    if (N.y > 0) N.negate();
    const rear = -back(t);
    return [
      [-w, rear],
      [-w, dp * 0.55],
      [-w * 0.6, dp],
      [w * 0.6, dp],
      [w, dp * 0.55],
      [w, rear],
    ].map(([s, n]) => new THREE.Vector3().copy(P).addScaledVector(S, s).addScaledVector(N, n));
  };
  for (let i = 0; i < count; i++) {
    const w = width * (0.94 + hash(i, seed) * 0.12);
    const dp = depth * (0.88 + hash(i * 1.7, seed) * 0.24);
    const t0 = (i + 0.03) / count;
    const t1 = (i + 0.97) / count;
    const a = section(t0, w, dp);
    const b = section(t1, w, dp);
    const pos: number[] = [];
    const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) =>
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    for (let k = 0; k < a.length - 1; k++) {
      tri(a[k], b[k], a[k + 1]);
      tri(a[k + 1], b[k], b[k + 1]);
    }
    for (let k = 1; k < a.length - 1; k++) {
      tri(a[0], a[k], a[k + 1]);
      tri(b[0], b[k + 1], b[k]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    out.push(g);
  }
}

function pierGeometry(seed: number, corbel: boolean | "short" = false, foot = 0) {
  const R = 0.3;
  const rings: Array<{ y: number; r: number; square: number; carve: number }> = [];
  const top = SPRING - 0.62;
  const raise = (y: number) => (foot && !corbel && y <= top ? foot + y * (1 - foot / top) : y);
  const ring = (y: number, r: number, square = 0, carve = 0) => rings.push({ y: raise(y), r, square, carve });
  const beside = corbel === "short";
  if (beside) {
    ring(SPRING - 0.14, 0.01, 1);
    ring(SPRING - 0.14, 0.34, 1);
    ring(SPRING - 0.1, 0.4, 1);
  } else if (corbel) {
    const low = SPRING - 0.98;
    ring(low, 0.01, 0.7);
    ring(low, 0.13, 0.7);
    ring(low + 0.07, 0.15, 0.7);
    ring(low + 0.09, 0.2, 0.6);
    ring(low + 0.16, 0.22, 0.6);
    ring(low + 0.18, 0.27, 0.5);
    ring(low + 0.3, R, 0.3);
  }
  if (!corbel) {
    ring(0, 0.48, 1);
    ring(0.16, 0.48, 1);
    ring(0.18, 0.43, 1);
    ring(0.23, 0.43, 0.6);
    ring(0.25, 0.39, 0);
    ring(0.3, 0.41, 0);
    ring(0.34, 0.36, 0);
    ring(0.38, R + 0.02, 0);
  }
  let y = 0.4;
  let drum = 0;
  while (!corbel && y < top - 0.05) {
    const next = Math.min(top, y + 0.34 + hash(drum, seed) * 0.12);
    const r = R + (hash(drum * 2.1, seed) - 0.5) * 0.012;
    ring(y + 0.006, r - 0.014);
    ring(y + 0.014, r);
    ring(next - 0.014, r);
    ring(next - 0.006, r - 0.014);
    y = next;
    drum++;
  }
  if (!beside) {
    ring(top, R + 0.03);
    ring(top + 0.03, R + 0.03);
    ring(top + 0.05, R - 0.01);
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      ring(top + 0.06 + t * 0.4, R + t * t * 0.1, t * 0.4, Math.sin(t * Math.PI) ** 0.6);
    }
    ring(SPRING - 0.15, 0.43, 1);
  }
  ring(SPRING - 0.08, 0.47, 1);
  ring(SPRING - 0.03, 0.47, 1);
  ring(SPRING, 0.4, 1);
  ring(SPRING + 0.12, 0.33, 0.9);
  ring(SPRING + 0.24, 0.22, 0.8);
  ring(SPRING + 0.3, 0.1, 0.6);
  ring(SPRING + 0.33, 0.01, 0);
  const SEG = 32;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < rings.length; i++) {
    const q = rings[i];
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const c = Math.cos(a);
      const n = Math.sin(a);
      const sq = 1 / (Math.abs(c) ** 7 + Math.abs(n) ** 7) ** (1 / 7);
      let r = q.r * (1 + (sq - 1) * q.square);
      if (q.carve) {
        const lobe = Math.abs(Math.cos(a * 4));
        const vein = Math.exp(-(((a * 4) % Math.PI - Math.PI / 2) ** 2) * 18);
        r += q.carve * (0.07 * lobe ** 0.5 - 0.03 + 0.02 * vein + (hash(s, i) - 0.5) * 0.012);
      } else if (q.r < 0.5 && i > 7) r += (hash(s * 0.31, i * 0.17) - 0.5) * 0.006;
      pos.push(c * r, q.y, n * r);
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let s = 0; s < SEG; s++) {
      const a = i * SEG + s;
      const b = i * SEG + ((s + 1) % SEG);
      const c = a + SEG;
      const e = b + SEG;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function strip(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  return out;
}

const openingSpring = (len: number) => (len >= 4 ? 1.85 : ARCH_SPRING);
const openingRise = (len: number) => (len >= 4 ? 0.55 : archRise(len));

function archGeometry(len: number) {
  const half = (len - 0.04) / 2;
  const rise = openingRise(len);
  const SPRING_AT = openingSpring(len);
  const wide = len + 1.6;
  const plate = new THREE.Shape();
  plate.moveTo(-wide / 2, -0.2);
  plate.lineTo(wide / 2, -0.2);
  plate.lineTo(wide / 2, CEIL_TOP);
  plate.lineTo(-wide / 2, CEIL_TOP);
  plate.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-half, -0.1);
  hole.lineTo(-half, SPRING_AT);
  hole.absellipse(0, SPRING_AT, half, rise, Math.PI, 0, true);
  hole.lineTo(half, -0.1);
  hole.closePath();
  plate.holes.push(hole);

  const whole = new THREE.ExtrudeGeometry(plate, { depth: 0.9, bevelEnabled: false, curveSegments: 22 }).translate(
    0,
    0,
    -0.45
  );
  const group = (index: number) => {
    const g = whole.groups[index];
    const out = new THREE.BufferGeometry();
    out.setAttribute(
      "position",
      new THREE.BufferAttribute(whole.attributes.position.array.slice(g.start * 3, (g.start + g.count) * 3), 3)
    );
    out.setAttribute(
      "normal",
      new THREE.BufferAttribute(whole.attributes.normal.array.slice(g.start * 3, (g.start + g.count) * 3), 3)
    );
    return out;
  };
  const faces = group(0);
  const soffit = group(1);

  const stones: THREE.BufferGeometry[] = [];
  const onArch = (a: number, grow: number) =>
    new THREE.Vector2(Math.cos(a) * (half + grow), SPRING_AT + Math.sin(a) * (rise + grow));
  const count = Math.max(9, Math.round(len * 7));
  for (let i = 0; i < count; i++) {
    const a0 = Math.PI - ((i + 0.04) / count) * Math.PI;
    const a1 = Math.PI - ((i + 0.96) / count) * Math.PI;
    const outer = 0.2 + hash(i, len) * 0.12;
    const s = new THREE.Shape();
    const STEPS = 3;
    for (let k = 0; k <= STEPS; k++) {
      const p = onArch(a0 + ((a1 - a0) * k) / STEPS, 0);
      if (k) s.lineTo(p.x, p.y);
      else s.moveTo(p.x, p.y);
    }
    for (let k = STEPS; k >= 0; k--) {
      const p = onArch(a0 + ((a1 - a0) * k) / STEPS, outer);
      s.lineTo(p.x, p.y);
    }
    s.closePath();
    const proud = 0.05 + hash(i * 3.1, len) * 0.05;
    stones.push(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.9 + proud * 2,
        bevelEnabled: true,
        bevelSize: 0.014,
        bevelThickness: 0.014,
        bevelSegments: 1,
      }).translate(0, 0, -0.45 - proud)
    );
  }
  for (const side of [-1, 1]) {
    let y = 0;
    let n = 0;
    while (y < SPRING_AT - 0.02) {
      const tall = Math.min(SPRING_AT - y, 0.2 + hash(n, side) * 0.1);
      const deep = 0.2 + hash(n * 2.3, side + len) * 0.14;
      const proud = 0.05 + hash(n * 4.7, side) * 0.05;
      const s = new THREE.Shape();
      s.moveTo(side * (half + 0.002), y + 0.01);
      s.lineTo(side * (half + deep), y + 0.01);
      s.lineTo(side * (half + deep), y + tall - 0.01);
      s.lineTo(side * (half + 0.002), y + tall - 0.01);
      s.closePath();
      stones.push(
        new THREE.ExtrudeGeometry(s, {
          depth: 0.9 + proud * 2,
          bevelEnabled: true,
          bevelSize: 0.014,
          bevelThickness: 0.014,
          bevelSegments: 1,
        }).translate(0, 0, -0.45 - proud)
      );
      y += tall;
      n++;
    }
  }
  return { faces, soffit, stones: mergeGeometries(stones.map((g) => strip(g)))! };
}

export function buildCrypt(view: CryptViewTarget, d: DungeonData, level: LevelData): CryptLamp[] {
  const { group, materials: M, U } = view;
  const ox = -d.W / 2;
  const oz = -d.H / 2;
  level.crowns = level.heights.slice();
  const field = buildField(d);
  level.openAt = (x: number, z: number) => fieldAt(field, x, z);
  const wallHeight = heightSampler(U.tWallH.value.image as CanvasImageSource);
  const vaults: THREE.BufferGeometry[] = [];
  const ribs: THREE.BufferGeometry[] = [];
  const piers: THREE.BufferGeometry[] = [];
  const variants = [pierGeometry(1), pierGeometry(2), pierGeometry(3)];
  const raised = [pierGeometry(1, false, TIER), pierGeometry(2, false, TIER), pierGeometry(3, false, TIER)];
  const corbel = pierGeometry(4, true);
  const corbelBeside = pierGeometry(5, "short");
  const _m = new THREE.Matrix4();

  const archList = [...d.arches];
  const hasArch = (x: number, y: number, px: number) =>
    archList.some((a) => a.px === px && Math.abs(a.x - x) < 1.1 && Math.abs(a.y - y) < 1.1);
  const isOpen = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < d.W && y < d.H && (d.grid[y * d.W + x] === 1 || d.grid[y * d.W + x] === 3);

  for (const r of d.rooms) {
    const runs = (from: number, to: number, open: (k: number) => boolean, emit: (a: number, len: number) => void) => {
      let start: number | null = null;
      for (let k = from; k <= to + 1; k++) {
        const on = k <= to && open(k);
        if (on && start === null) start = k;
        if (!on && start !== null) {
          emit(start, k - start);
          start = null;
        }
      }
    };
    for (const y of [r.y0 - 1, r.y1 + 1]) {
      runs(
        r.x0,
        r.x1,
        (x) => isOpen(x, y),
        (a, len) => {
          const x = a + (len - 1) / 2;
          if (!hasArch(x, y, 1)) archList.push({ x, y, px: 1, py: 0, len, role: r.type });
        }
      );
    }
    for (const x of [r.x0 - 1, r.x1 + 1]) {
      runs(
        r.y0,
        r.y1,
        (y) => isOpen(x, y),
        (a, len) => {
          const y = a + (len - 1) / 2;
          if (!hasArch(x, y, 0)) archList.push({ x, y, px: 0, py: 1, len, role: r.type });
        }
      );
    }
  }

  const openCell = (x: number, y: number) => isOpen(Math.round(x), Math.round(y));
  for (const a of archList) {
    const centre = a.px ? a.x : a.y;
    let lo = centre - (a.len - 1) / 2;
    let hi = lo + a.len - 1;
    const at = (k: number) => (a.px ? openCell(k, a.y) : openCell(a.x, k));
    while (at(lo - 1)) lo--;
    while (at(hi + 1)) hi++;
    a.alongPassage = hi - lo + 1 - a.len >= 2;
    a.len = hi - lo + 1;
    if (a.px) a.x = (lo + hi) / 2;
    else a.y = (lo + hi) / 2;
  }

  const unique = (list: typeof archList) => {
    const seen = new Set<string>();
    return list.filter((a) => {
      if (a.len > 7 || a.alongPassage) return false;
      const key = `${a.px}:${a.x}:${a.y}:${a.len}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const uniqArch = unique(archList);
  archList.splice(0, archList.length, ...uniqArch);
  d.arches.splice(0, d.arches.length, ...unique(d.arches));
  const layout: { piers: PierSpot[]; arches: DungeonData["arches"] } = { piers: [], arches: archList };
  level.layout = layout;
  let seed = 0;

  for (const r of d.rooms) {
    const { a, b, rise } = roomBays(r);
    vaults.push(vaultGeometry(d, r));
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        const c = y * d.W + x;
        if (d.roomId[c] !== r.id) continue;
        level.crowns[c] = SPRING + rise;
        const i = Math.max(0, a.findIndex((v) => v > x + 0.5) - 1);
        const j = Math.max(0, b.findIndex((v) => v > y + 0.5) - 1);
        const u = (x + 0.5 - (a[i] + a[i + 1]) / 2) / ((a[i + 1] - a[i]) / 2);
        const v = (y + 0.5 - (b[j] + b[j + 1]) / 2) / ((b[j + 1] - b[j]) / 2);
        level.heights[c] = bayHeight(u, v, rise);
      }
    }
    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < b.length - 1; j++) {
        const cx = (a[i] + a[i + 1]) / 2;
        const cz = (b[j] + b[j + 1]) / 2;
        const ha = (a[i + 1] - a[i]) / 2;
        const hb = (b[j + 1] - b[j]) / 2;
        const wallX = (s: number) => (s < 0 ? i === 0 : i === a.length - 2);
        const wallZ = (s: number) => (s < 0 ? j === 0 : j === b.length - 2);
        for (const flip of [1, -1]) {
          ribStones(
            (t, out) => {
              const s = ribPath(t);
              const footX = wallX(s) ? Math.sign(s) * ribFoot(s) : 0;
              const footZ = wallZ(flip * s) ? Math.sign(flip * s) * ribFoot(s) : 0;
              return out.set(ox + cx + s * ha - footX, bayHeight(s, s, rise) - 0.02, oz + cz + flip * s * hb - footZ);
            },
            2 * Math.hypot(ha, hb) + rise,
            0.13,
            0.15,
            ++seed,
            ribs,
            (t) => {
              const s = ribPath(t);
              return 0.02 + (wallX(s) || wallZ(flip * s) ? ribFoot(s) * 1.05 : 0);
            }
          );
        }
      }
    }
    const across = (fixed: number, from: number, to: number, alongX: boolean, wall: boolean, inward: number) => {
      const c = (from + to) / 2;
      const h = (to - from) / 2;
      const list = alongX ? a : b;
      const endsAtWall = (s: number) => (s < 0 ? from === list[0] : to === list[list.length - 1]);
      ribStones(
        (t, out) => {
          const s = ribPath(t);
          const y = SPRING + rise * Math.sqrt(Math.max(0, 1 - s * s));
          const along = c + s * h - (endsAtWall(s) ? Math.sign(s) * ribFoot(s) : 0);
          const off = fixed + inward * ribFoot(s);
          return alongX ? out.set(ox + along, y, oz + off) : out.set(ox + off, y, oz + along);
        },
        Math.PI * Math.max(h, rise) * 0.9,
        wall ? 0.13 : 0.24,
        wall ? 0.12 : 0.2,
        ++seed,
        ribs,
        (t) => {
          const s = ribPath(t);
          return 0.02 + (wall || endsAtWall(s) ? ribFoot(s) * 1.2 : 0);
        }
      );
    };
    for (let i = 0; i < a.length; i++) {
      const wall = i === 0 || i === a.length - 1;
      const inset = i === 0 ? 0.06 : i === a.length - 1 ? -0.06 : 0;
      for (let j = 0; j < b.length - 1; j++) across(a[i] + inset, b[j], b[j + 1], false, wall, Math.sign(inset));
    }
    for (let j = 0; j < b.length; j++) {
      const wall = j === 0 || j === b.length - 1;
      const inset = j === 0 ? 0.06 : j === b.length - 1 ? -0.06 : 0;
      for (let i = 0; i < a.length - 1; i++) across(b[j] + inset, a[i], a[i + 1], true, wall, Math.sign(inset));
    }

    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const onX = i === 0 || i === a.length - 1;
        const onZ = j === 0 || j === b.length - 1;
        let px = a[i];
        let pz = b[j];
        if (onX && onZ) {
          px += i === 0 ? 0.16 : -0.16;
          pz += j === 0 ? 0.16 : -0.16;
        }
        if (!onX && !onZ) {
          const c = Math.floor(pz) * d.W + Math.floor(px);
          if (!d.props.some((p) => p.kind === "pier" && p.y * d.W + p.x === c)) continue;
        }
        const nearArch = archList.some((q) => {
          const dx = px - (q.x + 0.5);
          const dz = pz - (q.y + 0.5);
          return Math.abs(dx * q.py + dz * q.px) < 2.2 && Math.abs(dx * q.px + dz * q.py) < q.len / 2 + 1.05;
        });
        const nearProp = d.props.some(
          (q) =>
            q.kind !== "pier" &&
            q.kind !== "stand" &&
            q.kind !== "ember" &&
            Math.hypot(px - (q.x + 0.5), pz - (q.y + 0.5)) < 1.3
        );
        const bracket = (onX || onZ) && (nearArch || nearProp);
        layout.piers.push({ x: px, z: pz, bracket, short: bracket && nearArch, room: r.id });
        const adjDirs: ReadonlyArray<readonly [number, number]> = [
          [0.6, 0],
          [-0.6, 0],
          [0, 0.6],
          [0, -0.6],
        ];
        if (
          !bracket &&
          (onX || onZ) &&
          adjDirs.some(([ax, az]) => {
            const c = Math.floor(pz + az) * d.W + Math.floor(px + ax);
            return d.grid[c] === 1 && d.roomId[c] < 0;
          })
        ) {
          d.props.push({ kind: "pierOut", x: px - 0.5, y: pz - 0.5, rot: 0, scale: 1, radius: 0.42, roomId: r.id });
        }
        const onWalkway = Boolean(r.pit) && (onX || onZ || floorAt(d, px, pz) > 0);
        const overStairs =
          Math.max(
            floorAt(d, px, pz),
            floorAt(d, px + 0.6, pz),
            floorAt(d, px - 0.6, pz),
            floorAt(d, px, pz + 0.6),
            floorAt(d, px, pz - 0.6)
          ) >
          TIER + 0.01;
        const g = (
          bracket ? (nearArch || overStairs ? corbelBeside : corbel) : (onWalkway ? raised : variants)[(i * 7 + j * 3 + r.id) % 3]
        ).clone();
        g.applyMatrix4(_m.makeRotationY(((i + j) % 4) * (Math.PI / 2)).setPosition(ox + px, 0, oz + pz));
        piers.push(g);
      }
    }
  }

  const add = (geo: THREE.BufferGeometry, material: THREE.Material, cast = true) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const addChunks = (list: THREE.BufferGeometry[], material: THREE.Material, cast: boolean) => {
    for (const g of list) {
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  };

  addChunks(tunnelGeometry(d, field, level.heights), M.tunnel, false);
  const ceilingAt = (x: number, z: number) => {
    const cx = Math.max(0, Math.min(d.W - 1, Math.floor(x)));
    const cz = Math.max(0, Math.min(d.H - 1, Math.floor(z)));
    const own = cz * d.W + cx;
    const ownCrowns = level.crowns ?? level.heights;
    if (d.grid[own] === 1 || d.grid[own] === 3) return d.roomId[own] >= 0 ? ownCrowns[own] : level.heights[own];
    let top = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ax = -1; ax <= 1; ax++) {
        const c = (cz + oy) * d.W + cx + ax;
        if (c >= 0 && c < level.heights.length && ownCrowns[c] > 0 && (d.grid[c] === 1 || d.grid[c] === 3)) {
          top = Math.max(top, d.roomId[c] >= 0 ? ownCrowns[c] : level.heights[c]);
        }
      }
    }
    return top || 2.8;
  };
  addChunks(wallGeometry(d, field, ceilingAt, wallHeight), M.wall, true);
  addChunks(floorGeometry(d, field), M.floor, false);
  const { blocks, stones } = pavingGeometry(d, layout.piers);
  addChunks(blocks, M.paving, true);
  level.stoneCount = stones;

  {
    const pos: number[] = [];
    const nor: number[] = [];
    const sAttr: number[] = [];
    const tanAttr: number[] = [];
    const quad = (ax: number, az: number, bx: number, bz: number, y0: number, y1: number, nx: number, nz: number) => {
      const P: Array<[number, number, number]> = [
        [ax, y0, az],
        [bx, y0, bz],
        [bx, y1, bz],
        [ax, y0, az],
        [bx, y1, bz],
        [ax, y1, az],
      ];
      const flip = (bz - az) * nx - (bx - ax) * nz > 0;
      const list = flip ? [P[0], P[2], P[1], P[3], P[5], P[4]] : P;
      const tx = Math.sign(bx - ax);
      const tz = Math.sign(bz - az);
      for (const p of list) {
        pos.push(p[0] + ox, p[1], p[2] + oz);
        nor.push(nx, 0, nz);
        sAttr.push(tx ? p[0] : p[2]);
        tanAttr.push(Math.abs(tx), Math.abs(tz));
      }
    };
    const openAt = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < d.W && y < d.H && (d.grid[y * d.W + x] === 1 || d.grid[y * d.W + x] === 3);
    const RECESS = 0.07;
    const ROCK = 0.26;
    for (const r of d.rooms) {
      const { rise } = roomBays(r);
      const top = SPRING + rise + 0.3;
      const bottom = ARCH_SPRING + archRise(2) + 0.02 + (r.pit ? TIER : 0);
      const sweep = (
        from: number,
        to: number,
        isOpenCell: (k: number) => boolean,
        arched: (k: number) => boolean,
        emit: (a: number, b: number, pad: number, y0: number, y1: number, back: number) => void
      ) => {
        let first: number | null = null;
        let last: number | null = null;
        for (let k = from; k <= to; k++) {
          if (!isOpenCell(k)) continue;
          if (last !== null && k > last) emit(last, k, 0, -0.1, bottom, RECESS);
          if (!arched(k)) emit(k, k + 1, 0.8, ARCH_SPRING + archRise(2) + 0.02, bottom, RECESS);
          if (first === null) first = k;
          last = k + 1;
        }
        if (first !== null && last !== null) emit(first, last, 0.8, bottom, top, RECESS);
        if (first === null || last === null) emit(from, to + 1, 0, -0.1, top, ROCK);
        else {
          emit(from, first, 0, -0.1, top, ROCK);
          emit(last, to + 1, 0, -0.1, top, ROCK);
        }
      };
      const archedAlongX = (y: number) => (x: number) =>
        archList.some((q) => q.px === 1 && Math.abs(q.y - y) < 0.6 && Math.abs(x - q.x) <= q.len / 2);
      const archedAlongZ = (x: number) => (y: number) =>
        archList.some((q) => q.px === 0 && Math.abs(q.x - x) < 0.6 && Math.abs(y - q.y) <= q.len / 2);
      sweep(r.x0, r.x1, (x) => openAt(x, r.y0 - 1), archedAlongX(r.y0 - 1), (a, b, pad, y0, y1, back) =>
        quad(a - pad, r.y0 - back, b + pad, r.y0 - back, y0, y1, 0, 1)
      );
      sweep(r.x0, r.x1, (x) => openAt(x, r.y1 + 1), archedAlongX(r.y1 + 1), (a, b, pad, y0, y1, back) =>
        quad(a - pad, r.y1 + 1 + back, b + pad, r.y1 + 1 + back, y0, y1, 0, -1)
      );
      sweep(r.y0, r.y1, (y) => openAt(r.x0 - 1, y), archedAlongZ(r.x0 - 1), (a, b, pad, y0, y1, back) =>
        quad(r.x0 - back, a - pad, r.x0 - back, b + pad, y0, y1, 1, 0)
      );
      sweep(r.y0, r.y1, (y) => openAt(r.x1 + 1, y), archedAlongZ(r.x1 + 1), (a, b, pad, y0, y1, back) =>
        quad(r.x1 + 1 + back, a - pad, r.x1 + 1 + back, b + pad, y0, y1, -1, 0)
      );
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute("aS", new THREE.Float32BufferAttribute(sAttr, 1));
      g.setAttribute("aTan", new THREE.Float32BufferAttribute(tanAttr, 2));
      add(g, M.archWall);
    }
  }

  if (vaults.length) {
    const mergedVaults = mergeGeometries(vaults);
    if (mergedVaults) add(mergedVaults, M.vault, false);
  }
  if (ribs.length) {
    const mergedRibs = mergeGeometries(ribs);
    if (mergedRibs) add(mergedRibs, M.dressed, false);
  }
  if (piers.length) {
    const mergedPiers = mergeGeometries(piers);
    if (mergedPiers) add(mergedPiers, M.dressed);
  }

  const cache = new Map<number, ReturnType<typeof archGeometry>>();
  const faces: THREE.BufferGeometry[] = [];
  const rings: THREE.BufferGeometry[] = [];
  for (const a of archList) {
    let arch = cache.get(a.len);
    if (!arch) {
      arch = archGeometry(a.len);
      cache.set(a.len, arch);
    }
    const standsOn = Math.max(
      floorAt(d, a.x + 0.5, a.y + 0.5),
      floorAt(d, a.x + 0.5 + a.py * 0.45, a.y + 0.5 + a.px * 0.45),
      floorAt(d, a.x + 0.5 - a.py * 0.45, a.y + 0.5 - a.px * 0.45)
    );
    _m.makeRotationY(a.px === 1 ? 0 : Math.PI / 2).setPosition(a.x + ox + 0.5, standsOn, a.y + oz + 0.5);
    const face = arch.faces.clone().applyMatrix4(_m);
    const p = face.attributes.position;
    const s = new Float32Array(p.count);
    const tan = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      s[i] = a.px === 1 ? p.getX(i) : p.getZ(i);
      tan[i * 2] = a.px === 1 ? 1 : 0;
      tan[i * 2 + 1] = a.px === 1 ? 0 : 1;
    }
    face.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    face.setAttribute("aTan", new THREE.BufferAttribute(tan, 2));
    faces.push(face);
    rings.push(arch.stones.clone().applyMatrix4(_m));
  }
  if (faces.length) {
    const mf = mergeGeometries(faces);
    const mr = mergeGeometries(rings);
    if (mf) add(mf, M.archWall);
    if (mr) add(mr, M.dressed);
  }

  const lamps: CryptLamp[] = [];
  for (const p of d.props) {
    if (p.kind === "stand") lamps.push({ x: p.x + 0.5 + ox, y: 1.3 + floorAt(d, p.x + 0.5, p.y + 0.5), z: p.y + 0.5 + oz, kind: "candle" });
  }
  for (const p of d.props) {
    if (p.kind === "ember") lamps.push({ x: p.x + 0.5 + ox, y: 0.3 + floorAt(d, p.x + 0.5, p.y + 0.5), z: p.y + 0.5 + oz, kind: "ember" });
  }

  const sconces: Array<{ x: number; y: number; z: number; nx: number; nz: number }> = [];
  {
    group.updateMatrixWorld(true);
    const scale = group.scale.x;
    const walls = group.children.filter((m): m is THREE.Mesh => (m as THREE.Mesh).isMesh && (m as THREE.Mesh).material === M.wall);
    for (const m of walls) m.geometry.computeBoundingSphere();
    const ray = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (const l of doorLights(d)) {
      const on = floorAt(d, l.bx, l.by);
      origin.set((l.bx + ox) * scale, (on + 0.95) * scale, (l.by + oz) * scale);
      let hit: THREE.Intersection | undefined;
      for (const way of [l.way, -l.way]) {
        dir.set(l.ax * way, 0, l.ay * way);
        ray.set(origin, dir);
        ray.far = 2.6 * scale;
        const near = walls.filter(
          (m) =>
            m.geometry.boundingSphere &&
            m.geometry.boundingSphere.center.distanceTo(new THREE.Vector3(origin.x / scale, origin.y / scale, origin.z / scale)) <
              m.geometry.boundingSphere.radius + 3
        );
        const found = ray.intersectObjects(near, false)[0];
        if (found) {
          hit = found;
          break;
        }
      }
      if (!hit || !hit.face) continue;
      normal.copy(hit.face.normal);
      if (Math.abs(normal.y) > 0.6) continue;
      normal.y = 0;
      normal.normalize();
      const mx = hit.point.x / scale;
      const mz = hit.point.z / scale;
      sconces.push({ x: mx, y: on, z: mz, nx: normal.x, nz: normal.z });
      lamps.push({ x: mx + normal.x * 0.17, y: on + 1.2, z: mz + normal.z * 0.17, kind: "door" });
    }
  }
  if (sconces.length) {
    const parts = view.candleParts;
    const bracket = new THREE.InstancedMesh(parts.sconce, M.iron, sconces.length);
    const wax = new THREE.InstancedMesh(parts.wax, parts.waxMaterial, sconces.length);
    const flame = new THREE.InstancedMesh(parts.flame, parts.flameMaterial, sconces.length);
    const white = new THREE.Color(1, 1, 1);
    const place = new THREE.Matrix4();
    const turn = new THREE.Matrix4();
    sconces.forEach((c, i) => {
      bracket.setMatrixAt(i, turn.makeRotationY(Math.atan2(c.nx, c.nz)).setPosition(c.x, c.y + 0.95, c.z));
      wax.setMatrixAt(i, place.makeScale(0.8, 0.8, 0.8).setPosition(c.x + c.nx * 0.17, c.y + 0.96, c.z + c.nz * 0.17));
      flame.setMatrixAt(i, place.makeScale(0.17, 0.17, 0.17).setPosition(c.x + c.nx * 0.17, c.y + 1.165, c.z + c.nz * 0.17));
      flame.setColorAt(i, white);
      wax.setColorAt(i, white);
      bracket.setColorAt(i, white);
    });
    for (const m of [bracket, wax, flame]) {
      m.frustumCulled = false;
      group.add(m);
    }
    flame.layers.set(1);
  }
  if (lamps.length) {
    const haloGeo = new THREE.PlaneGeometry(1, 1);
    const halo = new THREE.InstancedMesh(haloGeo, view.haloMaterial, lamps.length);
    halo.frustumCulled = false;
    halo.layers.set(1);
    const col = new THREE.Color();
    lamps.forEach((l, i) => {
      const size = l.kind === "ember" ? 2.4 : l.kind === "door" ? 0.8 : 1;
      halo.setMatrixAt(i, _m.makeScale(size, size, size).setPosition(l.x, l.kind === "ember" ? l.y + 0.45 : l.y, l.z));
      halo.setColorAt(i, col.set(l.kind === "ember" ? 0xffa050 : 0xb9c2bd).multiplyScalar(l.kind === "ember" ? 0.1 : 0.03));
    });
    group.add(halo);
  }
  view.markSolid();
  return lamps;
}
