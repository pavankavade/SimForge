// The market in the entrance hall: where each merchant's stall stands. Pure (grid cells in, plan
// out), so it can be tested headless over many seeds. A stall backs onto a flat stretch of wall,
// clear of doorways, arches, piers and the paladin's start, and the stalls are spread around the
// room. Their collision circles go into `d.props` before the crypt is built, so the wall pilasters
// next to a stall turn into corbels high up instead of growing through the awning.
import { floorAt } from "./floors";
import { FLOOR, type DungeonData, type DungeonProp } from "./generator";

/** Half the stall's width along the wall, and its depth out from the wall (cells; 1 cell = 1.5 m). */
export const STALL_HALF = 0.78;
export const STALL_DEPTH = 1.12;
/** Where the counter's middle sits, out from the wall (cells). */
export const COUNTER_AT = 0.78;
/** Where the merchant stands behind it (cells from the wall). */
export const KEEPER_AT = 0.36;

export interface StallPlan {
  /** Index into the merchant list. */
  merchant: number;
  /** Middle of the stall where it meets the wall (cells, grid space). */
  x: number;
  z: number;
  /** Unit normal out of the wall into the room, and the along-wall direction (normal turned left). */
  nx: number;
  nz: number;
  tx: number;
  tz: number;
  /** Floor height under the stall (cells). */
  floor: number;
}

interface Candidate extends Omit<StallPlan, "merchant"> {
  side: number;
}

/** A point `depth` cells out from the wall and `along` cells along it, from a stall's base. */
export function stallPoint(s: Pick<StallPlan, "x" | "z" | "nx" | "nz" | "tx" | "tz">, along: number, depth: number) {
  return { x: s.x + s.tx * along + s.nx * depth, z: s.z + s.tz * along + s.nz * depth };
}

/**
 * Plan up to `count` stalls in the entrance room. `start` is where the paladin stands at the
 * beginning (grid cells). Returns the stalls in order around the room.
 */
export function planMarket(d: DungeonData, count: number, start: { x: number; z: number }): StallPlan[] {
  const r = d.rooms[d.entrance];
  if (!r) return [];
  const { W, H, grid, roomId, doorway } = d;
  const cell = (x: number, z: number) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    if (ix < 0 || iz < 0 || ix >= W || iz >= H) return -1;
    return iz * W + ix;
  };
  const inRoom = (x: number, z: number) => {
    const c = cell(x, z);
    return c >= 0 && grid[c] === FLOOR && roomId[c] === r.id;
  };
  const nearDoor = (x: number, z: number, reach: number) => {
    for (let oz = -reach; oz <= reach; oz++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const c = cell(x + ox, z + oz);
        if (c >= 0 && doorway[c]) return true;
      }
    }
    return false;
  };
  const props = d.props.filter((p) => p.radius || p.kind === "stand" || p.kind === "ember");

  // The four walls: [wall line, along from, along to, normal x, normal z].
  const sides: Array<{ line: number; from: number; to: number; nx: number; nz: number }> = [
    { line: r.y0, from: r.x0, to: r.x1 + 1, nx: 0, nz: 1 },
    { line: r.y1 + 1, from: r.x0, to: r.x1 + 1, nx: 0, nz: -1 },
    { line: r.x0, from: r.y0, to: r.y1 + 1, nx: 1, nz: 0 },
    { line: r.x1 + 1, from: r.y0, to: r.y1 + 1, nx: -1, nz: 0 },
  ];

  const fits = (c: Candidate, half: number) => {
    // The footprint is level floor of this room, with no doorway in reach.
    for (let a = -half; a <= half + 1e-6; a += half / 4) {
      for (const dep of [0.08, 0.4, 0.75, STALL_DEPTH]) {
        const p = stallPoint(c, a, dep);
        if (!inRoom(p.x, p.z)) return false;
        if (Math.abs(floorAt(d, p.x, p.z) - c.floor) > 0.01) return false;
      }
      // Solid wall right behind it (no opening).
      const back = stallPoint(c, a, -0.3);
      const bc = cell(back.x, back.z);
      if (bc >= 0 && grid[bc] === FLOOR) return false;
    }
    // Room to stand at the counter.
    const front = stallPoint(c, 0, STALL_DEPTH + 0.7);
    if (!inRoom(front.x, front.z)) return false;
    const mid = stallPoint(c, 0, STALL_DEPTH * 0.5);
    if (nearDoor(mid.x, mid.z, 2)) return false;
    // Clear of the arches (and the stands beside them), the piers and the fire.
    for (const a of d.arches) {
      if (Math.hypot(mid.x - (a.x + 0.5), mid.z - (a.y + 0.5)) < a.len / 2 + 1.9) return false;
    }
    for (const p of props) {
      const px = p.x + 0.5;
      const pz = p.y + 0.5;
      const keep = (p.radius ?? 0.15) + (p.kind === "ember" ? 1.1 : 0.25);
      for (let a = -half; a <= half + 1e-6; a += half / 2) {
        for (const dep of [0.2, 0.7, STALL_DEPTH]) {
          const q = stallPoint(c, a, dep);
          if (Math.hypot(q.x - px, q.z - pz) < keep) return false;
        }
      }
    }
    // Not on top of the paladin's first step.
    return Math.hypot(mid.x - start.x, mid.z - start.z) > 1.9;
  };

  const collect = (half: number) => {
    const out: Candidate[] = [];
    sides.forEach((s, side) => {
      for (let a = s.from + half + 0.1; a <= s.to - half - 0.1 + 1e-6; a += 0.25) {
        const x = s.nz !== 0 ? a : s.line;
        const z = s.nz !== 0 ? s.line : a;
        // Along the wall = the normal turned a quarter to the left (x right, z down in the grid).
        const c: Candidate = { x, z, nx: s.nx, nz: s.nz, tx: -s.nz, tz: s.nx, floor: 0, side };
        const inside = stallPoint(c, 0, 0.5);
        if (!inRoom(inside.x, inside.z)) continue;
        c.floor = floorAt(d, inside.x, inside.z);
        if (fits(c, half)) out.push(c);
      }
    });
    return out;
  };

  // Footprints must not touch, including round a corner.
  const apart = (a: Candidate, b: Candidate, half: number) => {
    const pa = stallPoint(a, 0, STALL_DEPTH / 2);
    const pb = stallPoint(b, 0, STALL_DEPTH / 2);
    const need = a.side === b.side ? half * 2 + 0.45 : half + STALL_DEPTH / 2 + 0.55;
    return Math.hypot(pa.x - pb.x, pa.z - pb.z) >= need;
  };

  let picked: Candidate[] = [];
  for (const half of [STALL_HALF, 0.64]) {
    const cands = collect(half);
    // Farthest-point picks: the stall facing the start first, then always the one farthest from those taken.
    const sel: Candidate[] = [];
    const facing = cands
      .slice()
      .sort((a, b) => {
        const fa = stallPoint(a, 0, 1);
        const fb = stallPoint(b, 0, 1);
        return Math.hypot(fb.x - start.x, fb.z - start.z) - Math.hypot(fa.x - start.x, fa.z - start.z);
      });
    if (facing.length) sel.push(facing[0]);
    while (sel.length < count) {
      let best: Candidate | null = null;
      let bestD = -1;
      for (const c of cands) {
        if (sel.indexOf(c) >= 0 || !sel.every((s) => apart(s, c, half))) continue;
        const pc = stallPoint(c, 0, 0.5);
        let dmin = Infinity;
        for (const s of sel) {
          const ps = stallPoint(s, 0, 0.5);
          dmin = Math.min(dmin, Math.hypot(pc.x - ps.x, pc.z - ps.z));
        }
        if (dmin > bestD) {
          bestD = dmin;
          best = c;
        }
      }
      if (!best) break;
      sel.push(best);
    }
    if (sel.length > picked.length) picked = sel;
    if (picked.length >= count) break;
  }

  // In order round the room (by angle about its middle), so neighbours sit side by side.
  const cx = (r.x0 + r.x1 + 1) / 2;
  const cz = (r.y0 + r.y1 + 1) / 2;
  picked.sort((a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx));
  return picked.map((c, i) => ({ merchant: i, x: c.x, z: c.z, nx: c.nx, nz: c.nz, tx: c.tx, tz: c.tz, floor: c.floor }));
}

/** Collision circles for the stalls (counter and the ends behind it), as dungeon props. */
export function stallProps(d: DungeonData, stalls: StallPlan[]): DungeonProp[] {
  const out: DungeonProp[] = [];
  for (const s of stalls) {
    const circles: Array<[number, number, number]> = [
      [-0.48, COUNTER_AT, 0.3],
      [0, COUNTER_AT, 0.3],
      [0.48, COUNTER_AT, 0.3],
      [-0.62, 0.34, 0.26],
      [0.62, 0.34, 0.26],
    ];
    for (const [a, dep, rad] of circles) {
      const p = stallPoint(s, a, dep);
      out.push({ kind: "stall", x: p.x - 0.5, y: p.z - 0.5, rot: 0, scale: 1, radius: rad, roomId: d.entrance });
    }
  }
  return out;
}
