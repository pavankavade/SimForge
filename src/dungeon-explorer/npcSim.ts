import type { Expression } from "../artifacts/characters/hero/Face";
import type { AdventurerClass, AdventurerPose } from "../artifacts/characters/hero";
import { floorAt } from "./dungeon/floors";
import type { DungeonData } from "./dungeon/generator";
import { CELL_M } from "./dungeon/view";
import { createAgentCollider } from "./dungeon/walker";

export interface MobAgent {
  id: number;
  classType: AdventurerClass;
  expression: Expression;
  scale: number;
  homeRoomId: number;
  /** Position in grid cell coordinates (0..W, 0..H). */
  cx: number;
  cz: number;
  /** World coordinates (metres). */
  wx: number;
  wy: number;
  wz: number;
  yaw: number;
  speed: number;
  pose: AdventurerPose;
  animFrame: number;
  path: Array<[number, number]>;
  waitTimer: number;
  /** Seconds left reeling from a sword blow, and the knock-back velocity (cells/s). */
  stun: number;
  kx: number;
  kz: number;
  calm: Expression;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shortest walkable grid path (cells) between two walkable coordinates. */
function findPath(
  d: DungeonData,
  sx: number,
  sz: number,
  tx: number,
  tz: number,
  maxExpand = 350
): Array<[number, number]> {
  const { W, H, walkable } = d;
  const x0 = Math.max(0, Math.min(W - 1, Math.floor(sx)));
  const z0 = Math.max(0, Math.min(H - 1, Math.floor(sz)));
  const x1 = Math.max(0, Math.min(W - 1, Math.floor(tx)));
  const z1 = Math.max(0, Math.min(H - 1, Math.floor(tz)));
  if (x0 === x1 && z0 === z1) return [[x1 + 0.5, z1 + 0.5]];

  const start = z0 * W + x0;
  const goal = z1 * W + x1;
  const prev = new Int32Array(W * H).fill(-1);
  const vis = new Uint8Array(W * H);
  const queue = [start];
  vis[start] = 1;
  let found = false;
  let expanded = 0;

  for (let head = 0; head < queue.length && expanded < maxExpand; head++) {
    const c = queue[head];
    if (c === goal) {
      found = true;
      break;
    }
    expanded++;
    const x = c % W;
    const z = Math.floor(c / W);
    const nbrs = [
      x > 0 ? c - 1 : -1,
      x < W - 1 ? c + 1 : -1,
      z > 0 ? c - W : -1,
      z < H - 1 ? c + W : -1,
    ];
    for (const n of nbrs) {
      if (n >= 0 && walkable[n] && !vis[n]) {
        vis[n] = 1;
        prev[n] = c;
        queue.push(n);
      }
    }
  }
  if (!found) return [];
  const out: Array<[number, number]> = [];
  for (let c = goal; c !== start && c !== -1; c = prev[c]) {
    out.push([(c % W) + 0.5, Math.floor(c / W) + 0.5]);
  }
  out.reverse();
  return out;
}

const MOB_CLASSES: AdventurerClass[] = ["goblin", "rogue", "mage", "barbarian", "bard"];
const MOB_EXPR: Record<string, Expression> = {
  goblin: "angry",
  rogue: "smug",
  mage: "focus",
  barbarian: "yell",
  bard: "happy",
};

export function createMobSimulation(d: DungeonData, playerStartX: number, playerStartZ: number) {
  const rng = mulberry32((d.seed ^ 0x7f4a7c15) >>> 0);
  const collider = createAgentCollider(d, 0.22);
  const pCellX = playerStartX / CELL_M + d.W / 2;
  const pCellZ = playerStartZ / CELL_M + d.H / 2;

  // Index walkable cells per room so every room always gets mobs + quick roaming targets.
  const roomCells: Array<Array<[number, number]>> = d.rooms.map(() => []);
  const allWalkable: Array<[number, number]> = [];
  for (let z = 0; z < d.H; z++) {
    for (let x = 0; x < d.W; x++) {
      const c = z * d.W + x;
      if (!d.walkable[c]) continue;
      allWalkable.push([x + 0.5, z + 0.5]);
      const rid = d.roomId[c];
      if (rid >= 0) roomCells[rid].push([x + 0.5, z + 0.5]);
    }
  }

  // Adjacency per room for roaming across corridors into neighbouring rooms.
  const roomAdj: number[][] = d.rooms.map(() => []);
  for (const e of d.edges) {
    roomAdj[e.a].push(e.b);
    roomAdj[e.b].push(e.a);
  }

  const mobs: MobAgent[] = [];
  let nextId = 1;

  for (const r of d.rooms) {
    const cells = roomCells[r.id];
    if (!cells.length) continue;
    // Every single room gets mobs running around; larger/boss rooms get a bigger pack.
    const desired = r.type === "entrance" ? 2 : r.type === "boss" ? 4 : r.arch === "l" ? 4 : r.arch === "m" ? 3 : 2;
    let placed = 0;
    let guard = 0;
    while (placed < desired && guard++ < 80) {
      const [cx, cz] = cells[Math.floor(rng() * cells.length)];
      if (Math.hypot(cx - pCellX, cz - pCellZ) < 1.8) continue;
      if (mobs.some((m) => Math.hypot(m.cx - cx, m.cz - cz) < 0.8)) continue;

      let classType: AdventurerClass;
      let scale = 0.88;
      if (r.type === "boss" && placed === 0) {
        classType = "barbarian";
        scale = 1.06;
      } else if (r.type === "entrance") {
        classType = placed === 0 ? "goblin" : "rogue";
        scale = 0.86;
      } else {
        // Mix of goblins + our SimForge cast running around each room.
        classType = rng() < 0.45 ? "goblin" : MOB_CLASSES[Math.floor(rng() * MOB_CLASSES.length)];
        scale = classType === "barbarian" ? 0.96 : 0.88;
      }

      const wy = floorAt(d, cx, cz) * CELL_M;
      mobs.push({
        id: nextId++,
        classType,
        expression: MOB_EXPR[classType] ?? "neutral",
        scale,
        homeRoomId: r.id,
        cx,
        cz,
        wx: (cx - d.W / 2) * CELL_M,
        wy,
        wz: (cz - d.H / 2) * CELL_M,
        yaw: rng() * Math.PI * 2,
        speed: 1.8 + rng() * 0.9, // cells/sec (~2.7 - 4.0 m/s brisk run)
        pose: "run",
        animFrame: Math.floor(rng() * 60),
        path: [],
        waitTimer: rng() * 0.25,
        stun: 0,
        kx: 0,
        kz: 0,
        calm: MOB_EXPR[classType] ?? "neutral",
      });
      placed++;
    }
  }

  const pickTargetPath = (m: MobAgent): Array<[number, number]> => {
    const roamNeighbors = rng() < 0.35 && roomAdj[m.homeRoomId].length > 0;
    const targetRoom = roamNeighbors
      ? roomAdj[m.homeRoomId][Math.floor(rng() * roomAdj[m.homeRoomId].length)]
      : m.homeRoomId;
    const pool = roomCells[targetRoom]?.length ? roomCells[targetRoom] : allWalkable;
    if (!pool.length) return [];
    const [tx, tz] = pool[Math.floor(rng() * pool.length)];
    return findPath(d, m.cx, m.cz, tx, tz);
  };

  for (const m of mobs) m.path = pickTargetPath(m);

  const P = { x: 0, y: 0 };

  const step = (dt: number, playerWx: number, playerWz: number) => {
    const pCx = playerWx / CELL_M + d.W / 2;
    const pCz = playerWz / CELL_M + d.H / 2;

    for (let i = 0; i < mobs.length; i++) {
      const m = mobs[i];
      if (m.stun > 0) {
        // Struck: thrown back along the cut, sliding to a stop against whatever is behind.
        m.stun -= dt;
        P.x = m.cx + m.kx * dt;
        P.y = m.cz + m.kz * dt;
        collider.collide(P);
        m.cx = P.x;
        m.cz = P.y;
        const drag = Math.exp(-dt * 5);
        m.kx *= drag;
        m.kz *= drag;
        m.wx = (m.cx - d.W / 2) * CELL_M;
        m.wz = (m.cz - d.H / 2) * CELL_M;
        m.wy = floorAt(d, m.cx, m.cz) * CELL_M;
        m.pose = m.stun > 0.35 ? "sprawl" : "cower";
        m.expression = m.stun > 0.35 ? "pain" : "dazed";
        m.animFrame += dt * 30;
        if (m.stun <= 0) {
          m.expression = m.calm;
          m.path = [];
          m.waitTimer = 0.2;
        }
        continue;
      }
      if (m.waitTimer > 0) {
        m.waitTimer -= dt;
        m.pose = "idle";
        m.animFrame += dt * 30;
        continue;
      }
      if (!m.path.length) {
        m.path = pickTargetPath(m);
        if (!m.path.length) {
          m.waitTimer = 0.25;
          continue;
        }
      }

      const [tx, tz] = m.path[0];
      let dx = tx - m.cx;
      let dz = tz - m.cz;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.28) {
        m.path.shift();
        if (!m.path.length) {
          m.waitTimer = 0.1 + rng() * 0.35;
          m.path = pickTargetPath(m);
        }
        continue;
      }

      dx /= dist;
      dz /= dist;

      // Soft separation from other mobs and player so they steer smoothly around each other.
      let sx = 0;
      let sz = 0;
      for (let j = 0; j < mobs.length; j++) {
        if (i === j) continue;
        const o = mobs[j];
        const ox = m.cx - o.cx;
        const oz = m.cz - o.cz;
        const q = ox * ox + oz * oz;
        if (q < 0.55 * 0.55 && q > 1e-6) {
          const l = Math.sqrt(q);
          const push = (0.55 - l) * 2.2;
          sx += (ox / l) * push;
          sz += (oz / l) * push;
        }
      }
      {
        const ox = m.cx - pCx;
        const oz = m.cz - pCz;
        const q = ox * ox + oz * oz;
        if (q < 0.65 * 0.65 && q > 1e-6) {
          const l = Math.sqrt(q);
          const push = (0.65 - l) * 2.4;
          sx += (ox / l) * push;
          sz += (oz / l) * push;
        }
      }

      const vx = dx * m.speed + sx;
      const vz = dz * m.speed + sz;
      const vLen = Math.hypot(vx, vz) || 1;
      const stepDist = Math.min(m.speed * dt, vLen * dt);

      P.x = m.cx + (vx / vLen) * stepDist;
      P.y = m.cz + (vz / vLen) * stepDist;
      collider.collide(P);

      const moved = Math.hypot(P.x - m.cx, P.y - m.cz);
      if (moved > 0.0005) {
        const targetYaw = Math.atan2(P.x - m.cx, P.y - m.cz);
        let diff = ((targetYaw - m.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        m.yaw += diff * Math.min(1, dt * 12);
      }

      // If blocked/stuck, pick a new path cleanly.
      if (moved < m.speed * dt * 0.15) {
        m.waitTimer = 0.08;
        m.path = pickTargetPath(m);
      }

      m.cx = P.x;
      m.cz = P.y;
      m.wx = (m.cx - d.W / 2) * CELL_M;
      m.wz = (m.cz - d.H / 2) * CELL_M;
      const targetY = floorAt(d, m.cx, m.cz) * CELL_M;
      m.wy += (targetY - m.wy) * Math.min(1, dt * 14);
      m.pose = "run";
      // Match animation stride cadence to world meters moved.
      m.animFrame += moved * CELL_M * 10.5;
    }
  };

  /** A sword blow landed on mob `id`, travelling along (dirX, dirZ) in world space. */
  const hit = (id: number, dirX: number, dirZ: number) => {
    for (const m of mobs) {
      if (m.id !== id) continue;
      m.stun = 1.25;
      m.kx = (dirX * 3.4) / CELL_M;
      m.kz = (dirZ * 3.4) / CELL_M;
      m.yaw = Math.atan2(-dirX, -dirZ);
    }
  };

  return { mobs, step, hit };
}
