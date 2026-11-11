// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).
import * as THREE from "three";
import { floorAt, RISER, STEP_RING, TIER, TREAD } from "./floors";
import type { DungeonData } from "./generator";

const CHUNK = 14;

function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const h = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy);
    const b = h(ix + 1, iy);
    const c = h(ix, iy + 1);
    const e = h(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy;
  };
}

interface ChunkBuf {
  pos: number[];
  tone: number[];
  idx: number[];
}

class Mason {
  ox: number;
  oz: number;
  chunks = new Map<string, ChunkBuf>();
  count = 0;

  constructor(d: DungeonData) {
    this.ox = -d.W / 2;
    this.oz = -d.H / 2;
  }

  lay(
    opts: {
      x: number;
      z: number;
      hx: number;
      hz: number;
      yaw?: number;
      top: number;
      bottom: number;
      tx?: number;
      tz?: number;
      tone?: number;
      bevel?: number;
      corners?: number;
      rough?: number;
      round?: number;
      wander?: number;
    },
    random: () => number
  ) {
    const {
      x,
      z,
      hx,
      hz,
      yaw = 0,
      top,
      bottom,
      tx = 0,
      tz = 0,
      tone = 1,
      bevel = 0.022,
      corners = 2,
      rough = 0.005,
      round = 0.025,
      wander = 0.03,
    } = opts;
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let c = this.chunks.get(key);
    if (!c) {
      c = { pos: [], tone: [], idx: [] };
      this.chunks.set(key, c);
    }
    const outline: Array<[number, number]> = [];
    const r = Math.min(round, Math.min(hx, hz) * 0.7);
    const quads: ReadonlyArray<readonly [number, number, number]> = [
      [1, 1, 0],
      [-1, 1, 1],
      [-1, -1, 2],
      [1, -1, 3],
    ];
    for (const [sx, sz, from] of quads) {
      for (let k = 0; k < corners; k++) {
        const a = (from + (k + 0.5) / corners) * (Math.PI / 2);
        outline.push([sx * (hx - r) + Math.cos(a) * r, sz * (hz - r) + Math.sin(a) * r]);
      }
    }
    const n = outline.length;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const base = c.pos.length / 3;
    const put = (lx: number, lz: number, y: number, shade: number, tipped: boolean) => {
      const lift = tipped ? tx * lx + tz * lz : 0;
      c!.pos.push(x + this.ox + lx * cos - lz * sin, y + lift, z + this.oz + lx * sin + lz * cos);
      c!.tone.push(tone, shade);
    };
    const wobble = outline.map(() => 1 + (random() - 0.5) * wander);
    outline.forEach(([lx, lz], i) => put(lx * wobble[i], lz * wobble[i], bottom, 0.3, false));
    outline.forEach(([lx, lz], i) => put(lx * wobble[i], lz * wobble[i], top - bevel, 0.72, true));
    const inset = (v: number, half: number) => v * Math.max(0.2, (half - bevel) / half);
    outline.forEach(([lx, lz], i) =>
      put(inset(lx, hx) * wobble[i], inset(lz, hz) * wobble[i], top - random() * rough, 0.88, true)
    );
    put(0, 0, top, 1, true);
    const middle = base + n * 3;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      for (let ring = 0; ring < 2; ring++) {
        const a = base + ring * n + i;
        const b = base + ring * n + j;
        const e = base + (ring + 1) * n + i;
        const f = base + (ring + 1) * n + j;
        c.idx.push(a, e, b, b, e, f);
      }
      c.idx.push(base + 2 * n + i, middle, base + 2 * n + j);
    }
    this.count++;
  }

  layOutline(
    opts: {
      points: Array<[number, number]>;
      wears: number[];
      top: number;
      bottom: number;
      tx?: number;
      tz?: number;
      tone?: number;
      rough?: number;
    },
    random: () => number
  ) {
    const { points, wears, top, bottom, tx = 0, tz = 0, tone = 1, rough = 0.006 } = opts;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[(i + 1) % points.length];
      area += ax * bz - bx * az;
    }
    if (area < 0) {
      points.reverse();
      wears.reverse();
    }
    const n = points.length;
    let cx = 0;
    let cz = 0;
    for (const [px, pz] of points) {
      cx += px / n;
      cz += pz / n;
    }
    const key = `${Math.floor(cx / CHUNK)},${Math.floor(cz / CHUNK)}`;
    let c = this.chunks.get(key);
    if (!c) {
      c = { pos: [], tone: [], idx: [] };
      this.chunks.set(key, c);
    }
    const base = c.pos.length / 3;
    const put = (x: number, y: number, z: number, shade: number) => {
      c!.pos.push(x + this.ox, y, z + this.oz);
      c!.tone.push(tone, shade);
    };
    const lift = (x: number, z: number) => tx * (x - cx) + tz * (z - cz);
    for (const [x, z] of points) put(x, bottom, z, 0.5);
    const bevelAt = (i: number) => 0.007 + wears[i] * 0.032;
    points.forEach(([x, z], i) => put(x, top - bevelAt(i) + lift(x, z), z, 0.86));
    points.forEach(([x, z], i) => {
      const k = Math.min(0.4, (bevelAt(i) * 1.5) / (Math.hypot(x - cx, z - cz) || 1));
      const ix = x + (cx - x) * k;
      const iz = z + (cz - z) * k;
      put(ix, top - random() * rough + lift(ix, iz), iz, 0.95);
    });
    put(cx, top + lift(cx, cz) + (random() - 0.5) * rough, cz, 1);
    const middle = base + n * 3;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      for (let ring = 0; ring < 2; ring++) {
        const a = base + ring * n + i;
        const b = base + ring * n + j;
        const e = base + (ring + 1) * n + i;
        const f = base + (ring + 1) * n + j;
        c.idx.push(a, e, b, b, e, f);
      }
      c.idx.push(base + 2 * n + i, middle, base + 2 * n + j);
    }
    this.count++;
  }

  build(): THREE.BufferGeometry[] {
    const out: THREE.BufferGeometry[] = [];
    this.chunks.forEach((c) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(c.pos, 3));
      g.setAttribute("aTone", new THREE.Float32BufferAttribute(c.tone, 2));
      g.setIndex(c.idx);
      g.computeVertexNormals();
      g.computeBoundingSphere();
      out.push(g);
    });
    return out;
  }
}

export interface PierSpot {
  x: number;
  z: number;
  bracket: boolean;
  short?: boolean;
  room: number;
}

export function pavingGeometry(d: DungeonData, piers: PierSpot[]): { blocks: THREE.BufferGeometry[]; stones: number } {
  const blocks = new Mason(d);
  const random = makeRandom((d.seed ?? 1) * 7 + 3);
  const ruinField = makeNoise(5);
  const between = (a: number, b: number) => a + random() * (b - a);
  const ruinAt = (x: number, z: number) =>
    THREE.MathUtils.smoothstep(ruinField(x * 0.21, z * 0.21) * 0.8 + ruinField(x * 0.7, z * 0.7) * 0.2, 0.47, 0.68);
  const nearPier = (x: number, z: number, r: number) =>
    piers.some((p) => !p.bracket && Math.hypot(x - p.x, z - p.z) < r + 0.5);
  const standing = d.props.filter((p) => ["stand", "chest", "shrineCrystal", "bossCrystal", "ring"].indexOf(p.kind) >= 0);
  const nearThing = (x: number, z: number, r: number) =>
    standing.some((p) => Math.hypot(x - p.x - 0.5, z - p.y - 0.5) < r + 0.45);

  const heave = (x: number, z: number, level: number, along: boolean) => {
    const long = between(0.26, 0.5);
    const short = between(0.17, 0.27);
    const tilt = between(0.08, 0.2) * (random() < 0.5 ? -1 : 1);
    blocks.lay(
      {
        x,
        z,
        hx: along ? long : short,
        hz: along ? short : long,
        yaw: between(-0.09, 0.09),
        top: level + between(0.035, 0.075),
        bottom: level - 0.03,
        tx: random() < 0.5 ? tilt : tilt * 0.2,
        tz: random() < 0.5 ? tilt * 0.2 : tilt,
        tone: between(0.82, 1.04),
        bevel: between(0.014, 0.024),
        corners: 2,
        round: 0.02,
      },
      random
    );
  };

  const settleField = makeNoise(13);
  const warpField = makeNoise(17);
  const wearField = makeNoise(21);

  const pave = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    level: number,
    hole: { x0: number; x1: number; z0: number; z1: number } | null
  ) => {
    const alongX = x1 - x0 >= z1 - z0;
    const [u0, u1, v0, v1] = alongX ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
    const toWorld = (u: number, v: number): [number, number] => {
      const x = alongX ? u : v;
      const z = alongX ? v : u;
      let k = 1;
      if (hole) k = THREE.MathUtils.smoothstep(Math.max(hole.x0 - x, x - hole.x1, hole.z0 - z, z - hole.z1), 0, 0.5);
      return [
        x + k * ((warpField(x * 0.33, z * 0.33) - 0.5) * 0.1 + (warpField(x * 2.3, z * 2.3) - 0.5) * 0.02),
        z + k * ((warpField(x * 0.33 + 7, z * 0.33 + 3) - 0.5) * 0.1 + (warpField(x * 2.3 + 5, z * 2.3 + 9) - 0.5) * 0.02),
      ];
    };
    const STEP = 0.15;
    const edge = (points: Array<[number, number]>, wears: number[], ua: number, va: number, ub: number, vb: number) => {
      const length = Math.hypot(ub - ua, vb - va) || 1;
      const n = Math.max(1, Math.round(length / STEP));
      const nu = (vb - va) / length;
      const nv = -(ub - ua) / length;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const u = ua + (ub - ua) * t;
        const v = va + (vb - va) * t;
        const [wx, wz] = toWorld(u, v);
        const wear = THREE.MathUtils.smoothstep(
          wearField(wx * 2.6, wz * 2.6) * 0.7 + wearField(wx * 8, wz * 8) * 0.3,
          0.46,
          0.72
        );
        const dent = i > 0 ? wear * between(0.008, 0.028) : 0;
        points.push(toWorld(u - nu * dent, v - nv * dent));
        wears.push(wear);
      }
    };
    const lay = (a0: number, a1: number, b0: number, b1: number, va: number, vb: number, cracked: boolean) => {
      const midU = (a0 + a1 + b0 + b1) / 4;
      const midV = (va + vb) / 2;
      const [x, z] = toWorld(midU, midV);
      const g = between(0.002, 0.005);
      const corner = () => (random() < 0.42 ? between(0.02, 0.07) : 0.006);
      const [c0, c1, c2, c3] = [corner(), corner(), corner(), corner()];
      const points: Array<[number, number]> = [];
      const wears: number[] = [];
      edge(points, wears, a0 + g + c0, va + g, b0 - g - c1, va + g);
      edge(points, wears, b0 - g, va + g + c1, b1 - g, vb - g - c2);
      edge(points, wears, b1 - g - c2, vb - g, a1 + g + c3, vb - g);
      edge(points, wears, a1 + g, vb - g - c3, a0 + g, va + g + c0);
      const sag = (settleField(x * 0.37, z * 0.37) - 0.5) * 0.028;
      let top = level + sag + (random() - 0.5) * 0.01;
      const raised = !cracked && random() < 0.095;
      if (raised) top += between(0.04, 0.09);
      const tip = raised ? 0.08 : cracked ? 0.03 : 0.014;
      const tone = random() < 0.06 ? between(0.66, 0.78) : between(0.82, 1.08);
      blocks.layOutline(
        {
          points,
          wears,
          top,
          bottom: level - 0.1,
          tx: (random() - 0.5) * tip,
          tz: (random() - 0.5) * tip,
          tone,
          rough: 0.004,
        },
        random
      );
      const chipSpecs: ReadonlyArray<readonly [number, number, number, number, number]> = [
        [c0, a0 + g, va + g, 1, 1],
        [c1, b0 - g, va + g, -1, 1],
        [c2, b1 - g, vb - g, -1, -1],
        [c3, a1 + g, vb - g, 1, -1],
      ];
      for (const [c, cu, cv, su, sv] of chipSpecs) {
        if (c < 0.03 || random() > 0.34) continue;
        const k = c * between(0.72, 0.9);
        blocks.layOutline(
          {
            points: [toWorld(cu, cv), toWorld(cu + su * k, cv), toWorld(cu, cv + sv * k)],
            wears: [0.5, 0.5, 0.5],
            top: top - between(0.004, 0.018),
            bottom: level - 0.08,
            tx: (random() - 0.5) * 0.1,
            tz: (random() - 0.5) * 0.1,
            tone,
            rough: 0.004,
          },
          random
        );
      }
    };
    const stone = (a0: number, a1: number, b0: number, b1: number, va: number, vb: number) => {
      const midU = (a0 + a1 + b0 + b1) / 4;
      const midV = (va + vb) / 2;
      const x = alongX ? midU : midV;
      const z = alongX ? midV : midU;
      if (nearPier(x, z, -0.2)) return;
      if (hole) {
        const [hu0, hu1, hv0, hv1] = alongX ? [hole.x0, hole.x1, hole.z0, hole.z1] : [hole.z0, hole.z1, hole.x0, hole.x1];
        if (Math.max(a0, a1) > hu0 && Math.min(b0, b1) < hu1 && vb > hv0 && va < hv1) {
          if (va >= hv0 && vb <= hv1) {
            if (a0 >= hu0 && b0 <= hu1) return;
            if (Math.min(a0, a1) < hu0) {
              b0 = hu0;
              b1 = hu0;
            } else {
              a0 = hu1;
              a1 = hu1;
            }
            if (b0 - a0 < 0.14) return;
          } else if (va < hv0) vb = hv0;
          else va = hv1;
          if (vb - va < 0.12) return;
        }
      }
      if (random() < 0.008) return;
      if (random() < 0.06 && b0 - a0 > 0.4) {
        const top = a0 + (b0 - a0) * between(0.35, 0.65);
        const low = a1 + (b1 - a1) * between(0.35, 0.65);
        lay(a0, a1, low, top, va, vb, true);
        lay(low, top, b0, b1, va, vb, true);
        return;
      }
      lay(a0, a1, b0, b1, va, vb, false);
    };
    for (let v = v0; v < v1; ) {
      const depth = Math.min(v1 - v, between(0.43, 0.56));
      const end = v + depth;
      let u = u0 - between(0, 0.7);
      let slant = 0;
      while (u < u1) {
        const length = random() < 0.12 ? between(0.4, 0.55) : between(0.7, 1.25);
        const nextSlant = between(-0.028, 0.028);
        const b = u + length;
        stone(u + slant, u - slant, b + nextSlant, b - nextSlant, v, end);
        u = b;
        slant = nextSlant;
      }
      v = end;
    }
  };

  for (const r of d.rooms) {
    const x0 = r.x0;
    const x1 = r.x1 + 1;
    const z0 = r.y0;
    const z1 = r.y1 + 1;
    const along = x1 - x0 >= z1 - z0;
    const p = r.pit;
    const area = (x1 - x0) * (z1 - z0);
    const ring = STEP_RING * 2;
    pave(
      x0,
      x1,
      z0,
      z1,
      p ? TIER : 0,
      p ? { x0: p.x0 - ring, x1: p.x1 + ring, z0: p.z0 - ring, z1: p.z1 + ring } : null
    );
    for (let n = 0, many = Math.round(area * 0.012); n < many; n++) {
      const x = between(x0 + 0.55, x1 - 0.55);
      const z = between(z0 + 0.55, z1 - 0.55);
      if (nearPier(x, z, 0.45) || nearThing(x, z, 0.5)) continue;
      if (random() > 0.25 + ruinAt(x, z)) continue;
      if (p) {
        if (Math.max(p.x0 - x, x - p.x1, p.z0 - z, z - p.z1) < STEP_RING * 2 + 0.45) continue;
        heave(x, z, TIER, along);
      } else heave(x, z, 0, along);
    }
    if (!p) continue;

    for (let n = 0, many = (p.x1 - p.x0 + p.z1 - p.z0) * 12; n < many; n++) {
      const x = between(p.x0 + 0.08, p.x1 - 0.08);
      const z = between(p.z0 + 0.08, p.z1 - 0.08);
      const edgeDist = Math.min(x - p.x0, p.x1 - x, z - p.z0, p.z1 - z);
      if (random() > Math.max(0.018, 1 - edgeDist / 1.7) * (0.5 + ruinAt(x, z) * 0.9) || nearPier(x, z, 0.2)) continue;
      const small = random() < 0.4;
      blocks.lay(
        {
          x,
          z,
          hx: small ? between(0.07, 0.13) : between(0.17, 0.42),
          hz: small ? between(0.06, 0.11) : between(0.13, 0.28),
          yaw: random() * 3.14,
          top: edgeDist > 1 ? between(0.012, 0.024) : between(0.025, 0.075),
          bottom: -0.05,
          tx: (random() - 0.5) * 0.28,
          tz: (random() - 0.5) * 0.28,
          tone: between(0.66, 1),
          bevel: between(0.022, 0.04),
          corners: 3,
          rough: 0.012,
          round: between(0.05, 0.1),
          wander: 0.16,
        },
        random
      );
    }

    const steps = [
      { from: 0, to: STEP_RING, level: TIER / 2 },
      { from: STEP_RING, to: STEP_RING * 2, level: TIER },
    ];
    for (const { from, to, level } of steps) {
      const width = (to - from) / 2 - 0.005;
      const middle = (from + to) / 2;
      const side = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
        const length = Math.hypot(bx - ax, bz - az);
        const dx = (bx - ax) / length;
        const dz = (bz - az) / length;
        for (let s = -to + between(0, 0.3); s < length + to; ) {
          const size = Math.min(between(0.42, 0.95), length + to - s);
          const half = size / 2 - 0.006;
          const at = s + size / 2;
          s += size;
          if (half < 0.08) continue;
          const x = ax + dx * at + nx * middle;
          const z = az + dz * at + nz * middle;
          if (nearPier(x, z, 0.1)) continue;
          const hx = dx ? half : width;
          const hz = dx ? width : half;
          const ruin = ruinAt(x, z);
          if (random() < 0.02 + ruin * 0.12) {
            if (random() < 0.6) {
              const out = between(0.22, 0.7);
              const propped = random() < 0.5;
              blocks.lay(
                {
                  x: x - nx * (middle + out),
                  z: z - nz * (middle + out),
                  hx: hx * between(0.7, 0.95),
                  hz: hz * between(0.7, 0.95),
                  yaw: between(-0.45, 0.45),
                  top: propped ? 0.085 : 0.05,
                  bottom: -0.04,
                  tx: (nx || between(-0.2, 0.2)) * (propped ? 0.28 : 0.09),
                  tz: (nz || between(-0.2, 0.2)) * (propped ? 0.28 : 0.09),
                  tone: between(0.72, 0.98),
                  bevel: 0.024,
                  corners: 2,
                  round: 0.035,
                },
                random
              );
            }
            continue;
          }
          const tip = 0.012 + ruin * 0.05;
          blocks.lay(
            {
              x,
              z,
              hx,
              hz,
              yaw: (random() - 0.5) * (0.012 + ruin * 0.06),
              top: level + 0.004 + (random() - 0.5) * (0.012 + ruin * 0.035),
              bottom: -0.04,
              tx: (random() - 0.5) * tip,
              tz: (random() - 0.5) * tip,
              tone: between(0.84, 1.08),
              bevel: between(0.016, 0.03),
              corners: 2,
              round: between(0.015, 0.04),
            },
            random
          );
        }
      };
      side(p.x0, p.z0, p.x1, p.z0, 0, -1);
      side(p.x0, p.z1, p.x1, p.z1, 0, 1);
      side(p.x0, p.z0, p.x0, p.z1, -1, 0);
      side(p.x1, p.z0, p.x1, p.z1, 1, 0);
    }
  }

  const rows = new Map<string, { alongX: boolean; a: number; level: number; cross: number[] }>();
  for (let cy = 0; cy < d.H; cy++) {
    for (let cx = 0; cx < d.W; cx++) {
      const c = cy * d.W + cx;
      if (d.grid[c] !== 1 || d.roomId[c] >= 0 || !d.stairs) continue;
      const alongX = d.stairs.axis[c] === 0;
      for (let i = 0; i < 3; i++) {
        const a = (alongX ? cx : cy) + i * TREAD;
        const middle = a + TREAD / 2;
        const level = floorAt(d, alongX ? middle : cx + 0.5, alongX ? cy + 0.5 : middle);
        const key = `${alongX ? "x" : "z"}:${Math.round(a * 3)}:${Math.round(level / RISER)}`;
        if (!rows.has(key)) rows.set(key, { alongX, a, level, cross: [] });
        rows.get(key)!.cross.push(alongX ? cy : cx);
      }
    }
  }
  rows.forEach((row) => {
    const cross = Array.from(new Set(row.cross)).sort((a, b) => a - b);
    for (let i = 0; i < cross.length; ) {
      let j = i;
      while (j + 1 < cross.length && cross[j + 1] === cross[j] + 1) j++;
      const from = cross[i];
      const to = cross[j] + 1;
      i = j + 1;
      for (let u = from - between(0, 0.4); u < to; ) {
        const length = between(0.55, 1.15);
        const a = Math.max(u, from);
        const b = Math.min(u + length, to);
        u += length;
        const half = (b - a) / 2 - 0.006;
        if (half < 0.06) continue;
        const mid = (a + b) / 2;
        const along = row.a + TREAD / 2;
        const x = row.alongX ? along : mid;
        const z = row.alongX ? mid : along;
        const ruin = ruinAt(x, z) * 0.35;
        const tip = 0.012 + ruin * 0.06;
        blocks.lay(
          {
            x,
            z,
            hx: row.alongX ? TREAD / 2 - 0.004 : half,
            hz: row.alongX ? half : TREAD / 2 - 0.004,
            yaw: (random() - 0.5) * (0.006 + ruin * 0.035),
            top: row.level + (random() - 0.5) * (0.012 + ruin * 0.03),
            bottom: row.level - RISER - 0.05,
            tx: (random() - 0.5) * tip,
            tz: (random() - 0.5) * tip,
            tone: random() < 0.1 ? between(0.58, 0.72) : between(0.76, 1.12),
            bevel: between(0.014, 0.028),
            corners: 2,
            round: between(0.012, 0.05),
            wander: 0.05,
          },
          random
        );
      }
    }
  });
  return { blocks: blocks.build(), stones: blocks.count };
}
