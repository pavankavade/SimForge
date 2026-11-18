// The dungeon's people: armed men who wander their rooms until they spot the paladin. Each is
// rolled from the dungeon seed: an archetype (what armour he wears), sword alone or sword and
// shield, and a rarity with random modifiers. A man who sees him for a moment (or is hit) turns
// hostile and calls the rest of his room: he closes in, swings when in reach, raises his shield
// against the paladin's cuts, and fights until he dies. The market (entrance) is safe ground.
// This module is the simulation only; DungeonApp gives the nearest men a realistic body.
import { ARMOR_SLOTS, type ArmorEquipment } from "../artifacts/characters/paladin";
import { floorAt } from "./dungeon/floors";
import type { DungeonData } from "./dungeon/generator";
import { CELL_M } from "./dungeon/view";
import { createAgentCollider } from "./dungeon/walker";
import { ITEMS } from "./Inventory";

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#d9dde2",
  uncommon: "#62d36d",
  rare: "#5aa2ff",
  epic: "#bd76ff",
};

export interface MobStats {
  maxHp: number;
  /** Damage of one landed cut before the target's armour. */
  damage: number;
  armor: number;
  /** Seconds between his attacks. */
  attackEvery: number;
  /** Chance to raise the shield against an incoming cut (0 without a shield). */
  blockChance: number;
  /** Walking and chasing speed multiplier. */
  speed: number;
}

export interface MobAgent {
  id: number;
  /** "Sellsword", "Knight", ... */
  name: string;
  rarity: Rarity;
  /** The rolled modifiers, as the tooltip-style lines ("+6 Weapon Damage"). */
  mods: string[];
  equipment: ArmorEquipment;
  stats: MobStats;
  hp: number;
  hostile: boolean;
  /** Seconds he has had the paladin in sight while calm (he turns hostile past his notice time). */
  notice: number;
  dead: boolean;
  /** Seconds since he died (drives the fall). */
  deadT: number;
  homeRoomId: number;
  /** Position in grid cell coordinates (0..W, 0..H). */
  cx: number;
  cz: number;
  /** World coordinates (metres). */
  wx: number;
  wy: number;
  wz: number;
  /** Facing (0 = +Z). */
  yaw: number;
  /** Ground velocity this step, world m/s (for the walk cycle). */
  vx: number;
  vz: number;
  path: Array<[number, number]>;
  repath: number;
  waitTimer: number;
  /** Seconds left staggering from a blow, and the knock-back velocity (cells/s). */
  stun: number;
  kx: number;
  kz: number;
  /** Lean back from the last blow (radians, decays). */
  flinch: number;
  attackCd: number;
  /** True on the step he starts a swing (consumed by the body). */
  attack: boolean;
  /** Seconds left holding the shield up. */
  blockT: number;
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
    const nbrs = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, z > 0 ? c - W : -1, z < H - 1 ? c + W : -1];
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

// ---- Loadouts --------------------------------------------------------------------------------

type Archetype = "brigand" | "sellsword" | "manAtArms" | "knight";

const ARCHETYPE_NAME: Record<Archetype, string> = {
  brigand: "Brigand",
  sellsword: "Sellsword",
  manAtArms: "Man-at-Arms",
  knight: "Knight",
};

/** Chance of each piece for each archetype (the order's cape and tabard are the paladin's alone). */
const KIT: Record<Archetype, Partial<Record<keyof ArmorEquipment, number>>> = {
  brigand: { doublet: 1, gauntlets: 0.25, gorget: 0.2, helm: 0.1, sabatons: 0.15, shield: 0.3, sword: 1 },
  sellsword: { mail: 1, gorget: 0.5, helm: 0.35, gauntlets: 0.6, sabatons: 0.4, greaves: 0.25, waist: 0.3, shield: 0.6, sword: 1 },
  manAtArms: {
    mail: 1,
    cuirass: 1,
    gorget: 0.8,
    pauldrons: 0.5,
    arms: 0.6,
    gauntlets: 0.9,
    waist: 0.6,
    cuisses: 0.4,
    greaves: 0.5,
    sabatons: 0.7,
    helm: 0.55,
    shield: 0.75,
    sword: 1,
  },
  knight: {
    mail: 1,
    cuirass: 1,
    gorget: 1,
    pauldrons: 1,
    arms: 1,
    gauntlets: 1,
    waist: 1,
    cuisses: 1,
    greaves: 1,
    sabatons: 1,
    helm: 0.8,
    shield: 0.85,
    sword: 1,
  },
};

const BASE: Record<Archetype, { hp: number; damage: number; attackEvery: number; speed: number }> = {
  brigand: { hp: 80, damage: 26, attackEvery: 1.7, speed: 1.08 },
  sellsword: { hp: 95, damage: 30, attackEvery: 1.9, speed: 1 },
  manAtArms: { hp: 110, damage: 32, attackEvery: 2.1, speed: 0.95 },
  knight: { hp: 130, damage: 36, attackEvery: 2.3, speed: 0.9 },
};

/** Damage left after armour: the same curve for the paladin and for them. */
export const armorReduction = (armor: number): number => armor / (armor + 250);

/** Armour rating of a set of worn pieces (the inventory's numbers). */
export const armorOf = (e: ArmorEquipment): number => ARMOR_SLOTS.reduce((a, s) => a + (e[s] ? (ITEMS[s].armor ?? 0) : 0), 0);

function rollMob(rng: () => number, kind: Archetype, rarity: Rarity) {
  const equipment = {} as ArmorEquipment;
  for (const s of ARMOR_SLOTS) equipment[s] = rng() < (KIT[kind][s] ?? 0);
  if (equipment.mail) equipment.doublet = false;
  const b = BASE[kind];
  const stats: MobStats = {
    maxHp: b.hp,
    damage: b.damage,
    armor: armorOf(equipment),
    attackEvery: b.attackEvery,
    blockChance: equipment.shield ? 0.35 : 0,
    speed: b.speed,
  };
  // Rarity: how many random modifiers, as on found gear.
  const count = rarity === "epic" ? 3 : rarity === "rare" ? 2 : rarity === "uncommon" ? 1 : 0;
  const pool = ["damage", "health", "armor", "speed", "action", "block"].filter((m) => m !== "block" || equipment.shield);
  const mods: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const m = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const r = (a: number, b2: number) => Math.round(a + rng() * (b2 - a));
    if (m === "damage") {
      const v = r(4, 10);
      stats.damage += v;
      mods.push(`+${v} Weapon Damage`);
    } else if (m === "health") {
      const v = r(10, 30);
      stats.maxHp += v;
      mods.push(`+${v} Max Health`);
    } else if (m === "armor") {
      const v = r(15, 40);
      stats.armor += v;
      mods.push(`+${v} Armor Rating`);
    } else if (m === "speed") {
      const v = r(4, 10);
      stats.speed *= 1 + v / 100;
      mods.push(`+${v}% Move Speed`);
    } else if (m === "action") {
      const v = r(6, 15);
      stats.attackEvery /= 1 + v / 100;
      mods.push(`+${v}% Action Speed`);
    } else {
      const v = r(10, 25);
      stats.blockChance += v / 100;
      mods.push(`+${v}% Block Chance`);
    }
  }
  return { equipment, stats, mods };
}

// ---- Simulation ------------------------------------------------------------------------------

/** Paces in metres per second: an armoured man's stroll and his run at an enemy. */
const WALK_MS = 1.3;
const CHASE_MS = 3.1;
/** He stops this far from the paladin (feet to feet, metres) and cuts. */
const REACH_M = 1.55;
/** How far a calm man sees (metres) in his ~150 degree view, and how long until he reacts (s). */
const SIGHT_M = 6.5;
const BOSS_SIGHT_M = 9;
const NOTICE_S = 0.6;
const BOSS_NOTICE_S = 0.2;
/** Closer than this he hears the paladin whichever way he faces. */
const HEAR_M = 2.1;
/** A man who turns hostile calls everyone from his room within this many metres. */
const ALERT_M = 12;

export interface PlayerView {
  /** World position (metres) and facing of the paladin. */
  wx: number;
  wz: number;
  /** The paladin is winding up or cutting (a shield-bearer may raise his shield). */
  swinging: boolean;
  /** A new cut started this step. */
  swingStarted: boolean;
  dead: boolean;
}

export function createMobSimulation(d: DungeonData, playerStartX: number, playerStartZ: number) {
  const rng = mulberry32((d.seed ^ 0x7f4a7c15) >>> 0);
  const collider = createAgentCollider(d, 0.24);
  const pCellX = playerStartX / CELL_M + d.W / 2;
  const pCellZ = playerStartZ / CELL_M + d.H / 2;

  // Index walkable cells per room so every room always gets men + quick roaming targets.
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

  const pickRarity = (): Rarity => {
    const r = rng();
    return r < 0.04 ? "epic" : r < 0.15 ? "rare" : r < 0.4 ? "uncommon" : "common";
  };
  const pickKind = (): Archetype => {
    const r = rng();
    return r < 0.35 ? "brigand" : r < 0.65 ? "sellsword" : r < 0.9 ? "manAtArms" : "knight";
  };

  for (const r of d.rooms) {
    const cells = roomCells[r.id];
    if (!cells.length) continue;
    // The same density as before: larger and boss rooms hold more men.
    // The entrance is the merchants' market: nobody hostile waits there.
    const desired = r.type === "entrance" ? 0 : r.type === "boss" ? 4 : r.arch === "l" ? 4 : r.arch === "m" ? 3 : 2;
    let placed = 0;
    let guard = 0;
    while (placed < desired && guard++ < 80) {
      const [cx, cz] = cells[Math.floor(rng() * cells.length)];
      if (Math.hypot(cx - pCellX, cz - pCellZ) < 1.8) continue;
      if (mobs.some((m) => Math.hypot(m.cx - cx, m.cz - cz) < 0.8)) continue;

      const boss = r.type === "boss" && placed === 0;
      const kind: Archetype = boss ? "knight" : r.type === "entrance" ? "brigand" : pickKind();
      const rarity: Rarity = boss ? "epic" : r.type === "entrance" ? "common" : pickRarity();
      const { equipment, stats, mods } = rollMob(rng, kind, rarity);

      mobs.push({
        id: nextId++,
        name: boss ? "Knight Captain" : ARCHETYPE_NAME[kind],
        rarity,
        mods,
        equipment,
        stats,
        hp: stats.maxHp,
        hostile: false,
        notice: 0,
        dead: false,
        deadT: 0,
        homeRoomId: r.id,
        cx,
        cz,
        wx: (cx - d.W / 2) * CELL_M,
        wy: floorAt(d, cx, cz) * CELL_M,
        wz: (cz - d.H / 2) * CELL_M,
        yaw: rng() * Math.PI * 2,
        vx: 0,
        vz: 0,
        path: [],
        repath: 0,
        waitTimer: rng() * 2,
        stun: 0,
        kx: 0,
        kz: 0,
        flinch: 0,
        attackCd: 0,
        attack: false,
        blockT: 0,
      });
      placed++;
    }
  }

  const pickTargetPath = (m: MobAgent): Array<[number, number]> => {
    const roamNeighbors = rng() < 0.25 && roomAdj[m.homeRoomId].length > 0;
    const next = roamNeighbors ? roomAdj[m.homeRoomId][Math.floor(rng() * roomAdj[m.homeRoomId].length)] : m.homeRoomId;
    // The entrance is the market: men only come in after the paladin (hostile ones chase him).
    const targetRoom = next === d.entrance ? m.homeRoomId : next;
    const pool = roomCells[targetRoom]?.length ? roomCells[targetRoom] : allWalkable;
    if (!pool.length) return [];
    const [tx, tz] = pool[Math.floor(rng() * pool.length)];
    return findPath(d, m.cx, m.cz, tx, tz);
  };

  for (const m of mobs) m.path = pickTargetPath(m);

  /** Is the straight line between two cell points open floor (walls block sight)? */
  const clearLine = (ax: number, az: number, bx: number, bz: number): boolean => {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let k = 1; k < n; k++) {
      const x = Math.floor(ax + ((bx - ax) * k) / n);
      const z = Math.floor(az + ((bz - az) * k) / n);
      if (x < 0 || z < 0 || x >= d.W || z >= d.H || !d.walkable[z * d.W + x]) return false;
    }
    return true;
  };
  /** He turns hostile and shouts: the calm men of his room near him join in. */
  const alertRoom = (m: MobAgent) => {
    m.hostile = true;
    for (const o of mobs) {
      if (o.dead || o.hostile || o.homeRoomId !== m.homeRoomId) continue;
      if (Math.hypot(o.wx - m.wx, o.wz - m.wz) < ALERT_M) {
        o.hostile = true;
        o.repath = 0;
      }
    }
  };

  const P = { x: 0, y: 0 };
  const turnTo = (m: MobAgent, yaw: number, rate: number, dt: number) => {
    const diff = Math.atan2(Math.sin(yaw - m.yaw), Math.cos(yaw - m.yaw));
    m.yaw += diff * Math.min(1, dt * rate);
  };
  const place = (m: MobAgent, dt: number) => {
    m.wx = (m.cx - d.W / 2) * CELL_M;
    m.wz = (m.cz - d.H / 2) * CELL_M;
    const targetY = floorAt(d, m.cx, m.cz) * CELL_M;
    m.wy += (targetY - m.wy) * Math.min(1, dt * 14);
  };

  /** Move toward (tx, tz) cells at `speed` cells/s, steering around the others; returns metres moved. */
  const moveToward = (m: MobAgent, i: number, tx: number, tz: number, speed: number, dt: number, pCx: number, pCz: number): number => {
    let dx = tx - m.cx;
    let dz = tz - m.cz;
    const dist = Math.hypot(dx, dz) || 1;
    dx /= dist;
    dz /= dist;
    // Soft separation from the other men and the paladin so they steer around each other.
    let sx = 0;
    let sz = 0;
    for (let j = 0; j < mobs.length; j++) {
      const o = mobs[j];
      if (i === j || o.dead) continue;
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
      if (q < 0.6 * 0.6 && q > 1e-6) {
        const l = Math.sqrt(q);
        const push = (0.6 - l) * 2.4;
        sx += (ox / l) * push;
        sz += (oz / l) * push;
      }
    }
    const vx = dx * speed + sx;
    const vz = dz * speed + sz;
    const vLen = Math.hypot(vx, vz) || 1;
    const stepDist = Math.min(speed * dt, vLen * dt);
    P.x = m.cx + (vx / vLen) * stepDist;
    P.y = m.cz + (vz / vLen) * stepDist;
    collider.collide(P);
    const moved = Math.hypot(P.x - m.cx, P.y - m.cz);
    if (dt > 0) {
      m.vx = ((P.x - m.cx) * CELL_M) / dt;
      m.vz = ((P.y - m.cz) * CELL_M) / dt;
    }
    m.cx = P.x;
    m.cz = P.y;
    return moved * CELL_M;
  };

  const step = (dt: number, pl: PlayerView) => {
    const pCx = pl.wx / CELL_M + d.W / 2;
    const pCz = pl.wz / CELL_M + d.H / 2;
    const pix = Math.floor(pCx);
    const piz = Math.floor(pCz);
    const inMarket = pix >= 0 && piz >= 0 && pix < d.W && piz < d.H && d.roomId[piz * d.W + pix] === d.entrance;

    for (let i = 0; i < mobs.length; i++) {
      const m = mobs[i];
      m.attack = false;
      m.flinch *= Math.exp(-dt * 6);
      if (m.dead) {
        m.deadT += dt;
        m.vx = m.vz = 0;
        continue;
      }
      m.attackCd -= dt;
      m.blockT -= dt;
      if (m.stun > 0) {
        // Struck: thrown back a step along the cut, then he gathers himself.
        m.stun -= dt;
        P.x = m.cx + m.kx * dt;
        P.y = m.cz + m.kz * dt;
        collider.collide(P);
        m.vx = ((P.x - m.cx) * CELL_M) / Math.max(dt, 1e-4);
        m.vz = ((P.y - m.cz) * CELL_M) / Math.max(dt, 1e-4);
        m.cx = P.x;
        m.cz = P.y;
        const drag = Math.exp(-dt * 7);
        m.kx *= drag;
        m.kz *= drag;
        place(m, dt);
        continue;
      }

      // Calm: does he see the paladin (in front of him, in reach of his eyes, no wall between)?
      // Nobody picks a fight in the market.
      if (!m.hostile && !pl.dead && !inMarket) {
        const toX = pl.wx - m.wx;
        const toZ = pl.wz - m.wz;
        const distM = Math.hypot(toX, toZ);
        const boss = d.rooms[m.homeRoomId]?.type === "boss";
        const ahead = Math.cos(Math.atan2(toX, toZ) - m.yaw) > -0.26;
        const sees = distM < HEAR_M || (distM < (boss ? BOSS_SIGHT_M : SIGHT_M) && ahead && clearLine(m.cx, m.cz, pCx, pCz));
        m.notice = sees ? m.notice + dt : Math.max(0, m.notice - dt * 0.5);
        if (sees) turnTo(m, Math.atan2(toX, toZ), 5, dt);
        if (m.notice >= (boss ? BOSS_NOTICE_S : NOTICE_S)) {
          alertRoom(m);
          m.path = [];
          m.repath = 0;
          m.waitTimer = 0;
        }
      }

      if (m.hostile && !pl.dead) {
        const toX = pl.wx - m.wx;
        const toZ = pl.wz - m.wz;
        const distM = Math.hypot(toX, toZ);
        const facePlayer = Math.atan2(toX, toZ);
        // A shield-bearer sees the cut coming and may raise his shield (decided once per cut).
        if (pl.swingStarted && distM < 3 && rng() < m.stats.blockChance) m.blockT = 0.75;
        if (distM > REACH_M) {
          m.repath -= dt;
          if (m.repath <= 0 || !m.path.length) {
            m.path = findPath(d, m.cx, m.cz, pCx, pCz, 900);
            m.repath = 0.45;
          }
          const [tx, tz] = m.path.length > 1 ? m.path[0] : [pCx, pCz];
          if (m.path.length > 1 && Math.hypot(tx - m.cx, tz - m.cz) < 0.3) m.path.shift();
          const speed = ((m.blockT > 0 ? 0.35 : 1) * CHASE_MS * m.stats.speed) / CELL_M;
          moveToward(m, i, tx, tz, speed, dt, pCx, pCz);
          turnTo(m, distM < 4 ? facePlayer : Math.atan2(m.vx, m.vz), 10, dt);
        } else {
          m.vx = m.vz = 0;
          turnTo(m, facePlayer, 9, dt);
          const facing = Math.cos(m.yaw - facePlayer) > 0.85;
          if (m.attackCd <= 0 && m.blockT <= 0 && facing) {
            m.attack = true;
            m.attackCd = m.stats.attackEvery * (0.85 + rng() * 0.3);
          }
        }
        place(m, dt);
        continue;
      }

      // Calm: wander the home room (now and then the next one), pausing to look about.
      if (m.waitTimer > 0) {
        m.waitTimer -= dt;
        m.vx = m.vz = 0;
        continue;
      }
      if (!m.path.length) {
        m.path = pickTargetPath(m);
        if (!m.path.length) {
          m.waitTimer = 0.5;
          continue;
        }
      }
      const [tx, tz] = m.path[0];
      if (Math.hypot(tx - m.cx, tz - m.cz) < 0.28) {
        m.path.shift();
        if (!m.path.length) m.waitTimer = 1 + rng() * 3;
        continue;
      }
      const speed = (WALK_MS * m.stats.speed) / CELL_M;
      const moved = moveToward(m, i, tx, tz, speed, dt, pCx, pCz);
      if (moved > 0.0005) turnTo(m, Math.atan2(m.vx, m.vz), 6, dt);
      // Blocked: think again in a moment.
      if (moved < speed * CELL_M * dt * 0.15) {
        m.waitTimer = 0.3;
        m.path = pickTargetPath(m);
      }
      place(m, dt);
    }
  };

  /**
   * The paladin's blade reached man `id`, travelling along (dirX, dirZ). Returns what happened:
   * "blocked" (his shield took it), "hit" (damage dealt) or "killed".
   */
  const hit = (id: number, dirX: number, dirZ: number, damage: number): "blocked" | "hit" | "killed" | null => {
    const m = mobs.find((o) => o.id === id);
    if (!m || m.dead) return null;
    if (!m.hostile) alertRoom(m);
    // A raised shield facing the cut takes it.
    if (m.blockT > 0 && m.equipment.shield && Math.cos(m.yaw - Math.atan2(-dirX, -dirZ)) > 0.4) {
      m.blockT = Math.max(m.blockT, 0.3);
      return "blocked";
    }
    m.hp -= damage * (1 - armorReduction(m.stats.armor));
    m.flinch = 0.22;
    if (m.hp <= 0) {
      m.hp = 0;
      m.dead = true;
      m.deadT = 0;
      m.yaw = Math.atan2(-dirX, -dirZ);
      return "killed";
    }
    m.stun = 0.32;
    m.kx = (dirX * 1.4) / CELL_M;
    m.kz = (dirZ * 1.4) / CELL_M;
    m.blockT = 0;
    // He has been hit: the next cut comes back quickly.
    m.attackCd = Math.min(m.attackCd, 0.5);
    return "hit";
  };

  return { mobs, step, hit };
}
