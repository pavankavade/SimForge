// The dungeon's monsters as a simulation (monsters/kinds.ts says what each is). Each room is rolled
// from the dungeon seed: a family (skeletons or slimes), then kinds within it, with now and then an
// elite; a boss room holds the family's mini-boss. A monster that sees the fighter for a moment (or
// is hit) turns hostile and wakes its room. Then:
// - melee kinds close in and strike (a skeleton's sword really sweeps, see mobBodies; a slime lunges
//   and the hit lands here),
// - archers and mages keep their distance, back away when he closes, and loose arrows or bolts
//   (projectiles fly here, walls stop them, a raised shield takes them),
// - slimes hop, acid slimes leave burning puddles, and the Bloated Slime bursts into slimelets.
// The market (entrance) is safe ground. Hits on the fighter come out as `events` for the app.
import { ARMOR_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";
import { floorAt } from "./dungeon/floors";
import type { DungeonArch, DungeonData } from "./dungeon/generator";
import { CELL_M } from "./dungeon/view";
import { createAgentCollider } from "./dungeon/walker";
import { bumpRarity, type Rarity } from "./items";
import { ELITE_CHANCE, FAMILY_BOSS, FAMILY_MIX, KINDS, ROOM_FAMILY, pick, type MobFamily, type MobKind, type MobKindId } from "./monsters/kinds";

export interface MobStats {
  maxHp: number;
  /** Damage of one landed blow before the target's armour. */
  damage: number;
  armor: number;
  /** Seconds between attacks. */
  attackEvery: number;
  /** Chance to raise the shield against an incoming cut (0 without a shield). */
  blockChance: number;
  /** Walking and chasing speed multiplier. */
  speed: number;
}

export interface MobAgent {
  id: number;
  kind: MobKind;
  family: MobFamily;
  /** "Skeleton Soldier", "Elite Slime", ... */
  name: string;
  rarity: Rarity;
  elite: boolean;
  /** The rolled modifiers, as the tooltip-style lines ("+6 Weapon Damage"). */
  mods: string[];
  /** Skeletons: armour pieces worn over the bones (and sword/shield). */
  equipment: ArmorEquipment;
  stats: MobStats;
  /** Body size (kind scale, a touch more for elites). */
  scale: number;
  radius: number;
  height: number;
  hp: number;
  hostile: boolean;
  /** Seconds it has had the fighter in sight while calm (it turns hostile past its notice time). */
  notice: number;
  dead: boolean;
  /** Seconds since it died (drives the fall or the melt). */
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
  /** Its path ends at a shut door (it cannot open doors): it waits there. */
  gated: boolean;
  waitTimer: number;
  /** Seconds left staggering from a blow, and the knock-back velocity (cells/s). */
  stun: number;
  kx: number;
  kz: number;
  /** Lean back from the last blow (radians, decays). */
  flinch: number;
  attackCd: number;
  /** True on the step it starts a melee swing (consumed by the body). */
  attack: boolean;
  /** Seconds left holding the shield up. */
  blockT: number;
  /** Ranged: seconds left drawing or casting (0 when not), and true on the step it lets go. */
  aimT: number;
  loosed: boolean;
  /** Slimes: where in the hop it is (0..1) and the lunge (seconds left, 0 when not lunging). */
  hopU: number;
  lungeT: number;
  /** Acid slimes: seconds to the next puddle. */
  dripCd: number;
  /** In a party: which player it is after (0 = this one, 1.. the others in `step`'s list). */
  target: number;
  /** Melee swings started so far (a party's mirror starts the swing when this goes up). */
  swings: number;
  /** In a mirrored floor (net/coop.ts): where the leader's game last put it, eased toward. */
  net?: { cx: number; cz: number; yaw: number; seen: number };
}

export interface Projectile {
  id: number;
  kind: "arrow" | "bolt";
  /** World metres and metres per second. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  /** Who loosed it: a monster's id, or 0 for the fighter (his arrows hit monsters, not him). */
  from: number;
  /** His arrows: what a headshot multiplies the damage by. */
  headBonus?: number;
  /** His arrows: loosed by a party member (net/coop.ts), not by the player at this screen. */
  theirs?: boolean;
  /** Seconds left; an arrow stuck in a wall stays a while. */
  life: number;
  stuck: boolean;
  dead: boolean;
  /** Stuck in a monster: which one, and where on it (its own frame: x right, z forward). */
  stuckTo?: number;
  ox?: number;
  oy?: number;
  oz?: number;
}

export interface AcidPuddle {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Seconds since it was dropped, and how long it lasts. */
  t: number;
  life: number;
}

/**
 * The ranger's snare: iron jaws on the floor (world metres). It arms a moment after it is set; the
 * first monster to step in is bitten and held. It springs shut once and is gone a little later.
 */
export interface Snare {
  x: number;
  y: number;
  z: number;
  /** Seconds since it was set, and how long it waits for something to step in. */
  t: number;
  life: number;
  /** The monster it caught (and seconds since), or null while it waits. */
  caught: number | null;
  caughtT: number;
}
export const SNARE_ARM_S = 0.6;
export const SNARE_LIFE_S = 60;
/** How long it holds what it catches (a boss tears free sooner), and the bite. */
export const SNARE_HOLD_S = 3;
export const SNARE_BITE = 18;
const MAX_SNARES = 3;

/** Something that happened to the fighter (or near him) this step. */
export type MobEvent =
  | { type: "hit"; mob: MobAgent; damage: number; fromX: number; fromZ: number; blockable: boolean; how: "lunge" | "arrow" | "bolt" | "acid"; who: number; head?: boolean }
  | { type: "loose"; mob: MobAgent; projectile: "arrow" | "bolt" }
  | { type: "impact"; projectile: Projectile; wall: boolean }
  | { type: "split"; mob: MobAgent }
  /** His arrow or snare caught a monster: what it took off (`dealt`), and whether it was this
   * player's own (`mine`; in a party the leader's floor also flies the others' arrows). */
  | { type: "struck"; mob: MobAgent; result: "blocked" | "hit" | "killed"; head: boolean; dealt: number; mine: boolean }
  | { type: "hop"; mob: MobAgent }
  | { type: "snared"; mob: MobAgent; snare: Snare };

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
function findPath(d: DungeonData, sx: number, sz: number, tx: number, tz: number, maxExpand = 350): Array<[number, number]> {
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

/** Damage left after armour: the same curve for the fighter and for them. */
export const armorReduction = (armor: number): number => armor / (armor + 250);

/** Armour rating of a set of worn pieces (the inventory's numbers). */
/** A skeleton's armour from the rig pieces it wears (the old per-piece numbers). */
const PIECE_ARMOR: Record<ArmorSlot, number> = { helm: 32, gorget: 14, cuirass: 68, pauldrons: 24, arms: 22, gauntlets: 18, waist: 16, cuisses: 26, greaves: 22, sabatons: 16, mail: 40, doublet: 10, cape: 4, tabard: 3, sword: 0, shield: 0 };
export const armorOf = (e: ArmorEquipment): number => ARMOR_SLOTS.reduce((a, s) => a + (e[s] ? PIECE_ARMOR[s] : 0), 0);

const NO_GEAR = (): ArmorEquipment => {
  const e = {} as ArmorEquipment;
  for (const s of ARMOR_SLOTS) e[s] = false;
  return e;
};

/** A monster of `kind`: its gear (skeletons), stats, and an elite's modifiers. */
function rollMob(rng: () => number, kind: MobKind, elite: boolean) {
  const equipment = NO_GEAR();
  if (kind.gear) for (const s of ARMOR_SLOTS) equipment[s] = rng() < (kind.gear[s] ?? 0);
  equipment.sword = kind.weapon === "sword";
  const stats: MobStats = {
    maxHp: kind.hp,
    damage: kind.damage,
    armor: kind.armor,
    attackEvery: kind.attackEvery,
    blockChance: equipment.shield ? kind.blockChance : 0,
    speed: kind.speed,
  };
  const mods: string[] = [];
  if (elite) {
    stats.maxHp = Math.round(stats.maxHp * 1.45);
    stats.damage = Math.round(stats.damage * 1.15);
    const pool = ["damage", "health", "armor", "speed", "action"];
    const count = 1 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < count && pool.length; i++) {
      const m = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const r = (a: number, b: number) => Math.round(a + rng() * (b - a));
      if (m === "damage") {
        const v = r(3, 8);
        stats.damage += v;
        mods.push(`+${v} Damage`);
      } else if (m === "health") {
        const v = r(10, 30);
        stats.maxHp += v;
        mods.push(`+${v} Max Health`);
      } else if (m === "armor") {
        const v = r(15, 40);
        stats.armor += v;
        mods.push(`+${v} Armor Rating`);
      } else if (m === "speed") {
        const v = r(5, 12);
        stats.speed *= 1 + v / 100;
        mods.push(`+${v}% Move Speed`);
      } else {
        const v = r(6, 15);
        stats.attackEvery /= 1 + v / 100;
        mods.push(`+${v}% Action Speed`);
      }
    }
  }
  return { equipment, stats, mods };
}

// ---- Simulation ------------------------------------------------------------------------------

/** Paces in metres per second: a stroll and a run at the fighter (scaled by each kind's speed). */
const WALK_MS = 1.3;
const CHASE_MS = 3.1;
/** How far a calm monster sees (metres) in its ~150 degree view, and how long until it reacts (s). */
const SIGHT_M = 6.5;
const RANGED_SIGHT_M = 9.5;
const BOSS_SIGHT_M = 9;
const NOTICE_S = 0.6;
const BOSS_NOTICE_S = 0.2;
/** Closer than this it hears the fighter whichever way it faces. */
const HEAR_M = 2.1;
/** A monster that turns hostile wakes everyone from its room within this many metres. */
const ALERT_M = 12;
/** Slimes: one hop's length (s), the part of it spent in the air, and the lunge. */
const HOP_S = 0.78;
const HOP_AIR: [number, number] = [0.22, 0.82];
const LUNGE_S = 0.5;
/** Acid: a puddle every so often while it moves, how long one lasts, and its burn (hp/s). */
const DRIP_S = 1.1;
const PUDDLE_S = 7;
const PUDDLE_BURN = 7;
const MAX_PUDDLES = 24;
/** Arrows fall a little; the fighter is a capsule this wide. */
/** Arrows fall under (a game's) gravity and slow a little in the air; a headshot hurts half again. */
const ARROW_G = 6.5;
const ARROW_DRAG = 0.12;
const HEAD_BONUS = 1.5;
/** How long the fighter's arrows stay stuck in the stone (to be picked up again), and in a monster. */
const STUCK_WALL_S = 60;
const STUCK_MOB_S = 8;
const PLAYER_R = 0.36;

export interface PlayerView {
  /** World position (metres) of the fighter's feet. */
  wx: number;
  wy: number;
  wz: number;
  /** The fighter is winding up or cutting (a shield-bearer may raise his shield). */
  swinging: boolean;
  /** A new cut started this step. */
  swingStarted: boolean;
  dead: boolean;
  /** Hidden (the rogue's Hide): still in the way, but nothing can see him to pick him as a target. */
  hidden?: boolean;
}

/** The floor's doors as the monsters know them (doorView): they cannot open one, and a shut one stops them. */
export interface MobDoors {
  /** The doorway of every door, in door order. */
  arches: DungeonArch[];
  /** Door `i` is shut (or not open far enough to pass). */
  blocking: (i: number) => boolean;
  /** Keep a walker of `radius` m out of shut doors (metres); `prev` is where it was before this step. */
  block: (p: { x: number; z: number }, prev: { x: number; z: number }, radius: number) => void;
}

/** How far either side of a door (cells) a monster lines up before going through it. */
const DOOR_APPROACH = 0.7;

export function createMobSimulation(
  d: DungeonData,
  playerStartX: number,
  playerStartZ: number,
  solid: (x: number, y: number, z: number) => boolean,
  doors?: MobDoors
) {
  const rng = mulberry32((d.seed ^ 0x7f4a7c15) >>> 0);
  const collider = createAgentCollider(d, 0.24);

  // Which door each doorway cell belongs to. A grid path through a wide doorway may use a side
  // cell, behind the stone beside the door: routes go through the door's middle instead.
  const gates = doors?.arches ?? [];
  const gateOf = new Int16Array(d.W * d.H).fill(-1);
  gates.forEach((a, gi) => {
    for (let j = 0; j < a.len; j++) {
      const x = Math.round(a.x - (a.px * (a.len - 1)) / 2 + a.px * j);
      const z = Math.round(a.y - (a.py * (a.len - 1)) / 2 + a.py * j);
      if (x >= 0 && z >= 0 && x < d.W && z < d.H) gateOf[z * d.W + x] = gi;
    }
  });
  const gateShut = (gi: number) => !!doors?.blocking(gi);
  /** Does the line between two cell points pass through a shut door? */
  const throughShut = (ax: number, az: number, bx: number, bz: number): boolean => {
    for (let gi = 0; gi < gates.length; gi++) {
      if (!gateShut(gi)) continue;
      const a = gates[gi];
      const ox = a.x + 0.5;
      const oz = a.y + 0.5;
      const sa = (ax - ox) * a.py + (az - oz) * a.px;
      const sb = (bx - ox) * a.py + (bz - oz) * a.px;
      if (sa * sb > 0 || sa === sb) continue;
      const t = sa / (sa - sb);
      const along = (ax + (bx - ax) * t - ox) * a.px + (az + (bz - az) * t - oz) * a.py;
      if (Math.abs(along) < a.len / 2 + 0.1) return true;
    }
    return false;
  };
  /** Keep a monster (moving from prev to P, cells) out of shut doors. */
  const blockDoors = (P: { x: number; y: number }, prevX: number, prevZ: number, radiusM: number) => {
    if (!doors) return;
    const at = { x: (P.x - d.W / 2) * CELL_M, z: (P.y - d.H / 2) * CELL_M };
    doors.block(at, { x: (prevX - d.W / 2) * CELL_M, z: (prevZ - d.H / 2) * CELL_M }, radiusM);
    P.x = at.x / CELL_M + d.W / 2;
    P.y = at.z / CELL_M + d.H / 2;
  };
  /**
   * A walking route (cells) from where `m` stands to (tx, tz): the grid path, threaded through the
   * middle of every door on it (lined up on one side, out the other), and cut short in front of
   * the first shut door.
   */
  const route = (m: MobAgent, tx: number, tz: number, maxExpand?: number): Array<[number, number]> => {
    const cells = findPath(d, m.cx, m.cz, tx, tz, maxExpand);
    m.gated = false;
    if (!cells.length || !gates.length) return cells;
    const list: Array<[number, number]> = [[Math.floor(m.cx) + 0.5, Math.floor(m.cz) + 0.5], ...cells];
    const gateAt = (p: [number, number]) => gateOf[Math.floor(p[1]) * d.W + Math.floor(p[0])];
    const out: Array<[number, number]> = [];
    for (let k = 0; k < list.length; ) {
      const gi = gateAt(list[k]);
      if (gi < 0) {
        if (k > 0) out.push(list[k]);
        k++;
        continue;
      }
      let e = k;
      while (e + 1 < list.length && gateAt(list[e + 1]) === gi) e++;
      const a = gates[gi];
      const ox = a.x + 0.5;
      const oz = a.y + 0.5;
      const nx = a.py;
      const nz = a.px;
      const from: [number, number] = k > 0 ? list[k - 1] : [m.cx, m.cz];
      const to = e + 1 < list.length ? list[e + 1] : null;
      // Which way through (+1: along +n).
      const s = Math.sign(to ? (to[0] - from[0]) * nx + (to[1] - from[1]) * nz : (ox - from[0]) * nx + (oz - from[1]) * nz) || 1;
      // Where the monster is now relative to this door: across it (toward the far side) and along it.
      const across = ((m.cx - ox) * nx + (m.cz - oz) * nz) * s;
      const along = Math.abs((m.cx - ox) * a.px + (m.cz - oz) * a.py);
      const lined = along < 0.4 && across > -DOOR_APPROACH - 0.1 && across < DOOR_APPROACH + 0.1;
      if (!lined) out.push([ox - s * nx * DOOR_APPROACH, oz - s * nz * DOOR_APPROACH]);
      if (gateShut(gi)) {
        m.gated = true;
        return out;
      }
      if (!lined || across < -0.05) out.push([ox, oz]);
      if (to) out.push([ox + s * nx * DOOR_APPROACH, oz + s * nz * DOOR_APPROACH]);
      k = e + 1;
    }
    return out;
  };
  const pCellX = playerStartX / CELL_M + d.W / 2;
  const pCellZ = playerStartZ / CELL_M + d.H / 2;

  // Index walkable cells per room so every room always gets monsters + quick roaming targets.
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
  const projectiles: Projectile[] = [];
  const puddles: AcidPuddle[] = [];
  const events: MobEvent[] = [];
  let nextId = 1;
  let nextShot = 1;

  const spawn = (kindId: MobKindId, cx: number, cz: number, room: number, elite: boolean): MobAgent => {
    const kind = KINDS[kindId];
    const { equipment, stats, mods } = rollMob(rng, kind, elite);
    const scale = kind.scale * (elite ? 1.06 : 1);
    const m: MobAgent = {
      id: nextId++,
      kind,
      family: kind.family,
      name: elite ? `Elite ${kind.name}` : kind.name,
      rarity: elite ? bumpRarity(kind.rarity) : kind.rarity,
      elite,
      mods,
      equipment,
      stats,
      scale,
      radius: kind.radius * scale,
      height: kind.height * scale,
      hp: stats.maxHp,
      hostile: false,
      notice: 0,
      dead: false,
      deadT: 0,
      homeRoomId: room,
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
      gated: false,
      waitTimer: rng() * 2,
      stun: 0,
      kx: 0,
      kz: 0,
      flinch: 0,
      attackCd: 0,
      attack: false,
      blockT: 0,
      aimT: 0,
      loosed: false,
      hopU: rng(),
      lungeT: 0,
      dripCd: DRIP_S,
      target: 0,
      swings: 0,
    };
    mobs.push(m);
    return m;
  };

  for (const r of d.rooms) {
    const cells = roomCells[r.id];
    if (!cells.length) continue;
    // Larger and boss rooms hold more. The entrance is the merchants' market: nothing waits there.
    if (r.type === "entrance") continue;
    const desired = r.type === "boss" ? 4 : r.arch === "l" ? 4 : r.arch === "m" ? 3 : 2;
    const family = pick(rng, ROOM_FAMILY);
    let placed = 0;
    let guard = 0;
    while (placed < desired && guard++ < 80) {
      const [cx, cz] = cells[Math.floor(rng() * cells.length)];
      if (Math.hypot(cx - pCellX, cz - pCellZ) < 1.8) continue;
      if (mobs.some((m) => Math.hypot(m.cx - cx, m.cz - cz) < 0.8)) continue;
      const boss = r.type === "boss" && placed === 0;
      const kindId = boss ? FAMILY_BOSS[family] : pick(rng, FAMILY_MIX[family]);
      spawn(kindId, cx, cz, r.id, !boss && rng() < ELITE_CHANCE);
      placed++;
    }
  }

  const pickTargetPath = (m: MobAgent): Array<[number, number]> => {
    const roamNeighbors = rng() < 0.25 && roomAdj[m.homeRoomId].length > 0;
    const next = roamNeighbors ? roomAdj[m.homeRoomId][Math.floor(rng() * roomAdj[m.homeRoomId].length)] : m.homeRoomId;
    // The entrance is the market: monsters only come in after the fighter (hostile ones chase him).
    const targetRoom = next === d.entrance ? m.homeRoomId : next;
    const pool = roomCells[targetRoom]?.length ? roomCells[targetRoom] : allWalkable;
    if (!pool.length) return [];
    const [tx, tz] = pool[Math.floor(rng() * pool.length)];
    return route(m, tx, tz);
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
    return !throughShut(ax, az, bx, bz);
  };
  /** It turns hostile and calls out: the calm monsters of its room near it join in. */
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
  const moveToward = (m: MobAgent, i: number, tx: number, tz: number, speed: number, dt: number): number => {
    let dx = tx - m.cx;
    let dz = tz - m.cz;
    const dist = Math.hypot(dx, dz) || 1;
    dx /= dist;
    dz /= dist;
    // Soft separation from the others and the fighter so they steer around each other.
    let sx = 0;
    let sz = 0;
    const mine = m.radius / CELL_M;
    for (let j = 0; j < mobs.length; j++) {
      const o = mobs[j];
      if (i === j || o.dead) continue;
      const ox = m.cx - o.cx;
      const oz = m.cz - o.cz;
      const q = ox * ox + oz * oz;
      const gap = Math.max(0.55, mine + o.radius / CELL_M + 0.1);
      if (q < gap * gap && q > 1e-6) {
        const l = Math.sqrt(q);
        const push = (gap - l) * 2.2;
        sx += (ox / l) * push;
        sz += (oz / l) * push;
      }
    }
    // Every fighter on the floor (cells, x then z: the whole party, see `step`).
    for (let k = 0; k + 1 < bodies.length; k += 2) {
      const ox = m.cx - bodies[k];
      const oz = m.cz - bodies[k + 1];
      const q = ox * ox + oz * oz;
      const gap = Math.max(0.6, mine + 0.3);
      if (q < gap * gap && q > 1e-6) {
        const l = Math.sqrt(q);
        const push = (gap - l) * 2.4;
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
    blockDoors(P, m.cx, m.cz, m.radius);
    const moved = Math.hypot(P.x - m.cx, P.y - m.cz);
    if (dt > 0) {
      m.vx = ((P.x - m.cx) * CELL_M) / dt;
      m.vz = ((P.y - m.cz) * CELL_M) / dt;
    }
    m.cx = P.x;
    m.cz = P.y;
    return moved * CELL_M;
  };

  /** A slime only travels while airborne in its hop: how much of its pace it has right now. */
  const hopPace = (m: MobAgent, dt: number, moving: boolean): number => {
    if (m.family !== "slime") return 1;
    const before = m.hopU;
    // Hops quicken a little with size down (slimelets skitter) and slow for the Bloated Slime.
    m.hopU = (m.hopU + (dt / HOP_S) * (moving ? 1 : 0.35) * Math.pow(m.scale, -0.35)) % 1;
    if (moving && before < HOP_AIR[1] && (m.hopU >= HOP_AIR[1] || m.hopU < before)) events.push({ type: "hop", mob: m });
    if (!moving) return 0;
    return m.hopU > HOP_AIR[0] && m.hopU < HOP_AIR[1] ? 1 / (HOP_AIR[1] - HOP_AIR[0]) : 0;
  };

  const loose = (m: MobAgent, pl: PlayerView) => {
    const r = m.kind.ranged;
    if (!r) return;
    // From the hands at chest height toward his chest, with a little spread (more for the bow).
    const fx = Math.sin(m.yaw);
    const fz = Math.cos(m.yaw);
    const sx = m.wx + fx * 0.45;
    const sy = m.wy + 1.38 * m.scale;
    const sz = m.wz + fz * 0.45;
    const tx = pl.wx + (rng() - 0.5) * (r.projectile === "arrow" ? 0.5 : 0.2);
    const ty = pl.wy + 1.15 + (rng() - 0.5) * 0.3;
    const tz = pl.wz + (rng() - 0.5) * (r.projectile === "arrow" ? 0.5 : 0.2);
    const dx = tx - sx;
    const dz = tz - sz;
    const flat = Math.hypot(dx, dz) || 1;
    const t = flat / r.speed;
    // An arrow is aimed a little high so it drops onto him.
    const dy = ty - sy + (r.projectile === "arrow" ? 0.5 * ARROW_G * t * t : 0);
    const len = Math.hypot(flat, dy) || 1;
    projectiles.push({
      id: nextShot++,
      kind: r.projectile,
      x: sx,
      y: sy,
      z: sz,
      vx: (dx / len) * r.speed,
      vy: (dy / len) * r.speed,
      vz: (dz / len) * r.speed,
      damage: m.stats.damage,
      from: m.id,
      life: r.projectile === "arrow" ? 2.4 : 3.2,
      stuck: false,
      dead: false,
    });
    m.loosed = true;
    events.push({ type: "loose", mob: m, projectile: r.projectile });
  };

  const stepProjectiles = (dt: number, party: PlayerView[]) => {
    for (const p of projectiles) {
      if (p.dead) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      if (p.stuck) {
        // Stuck in a monster: it rides along with him, and comes out when he falls.
        if (p.stuckTo !== undefined) {
          const m = mobs.find((o) => o.id === p.stuckTo);
          if (!m || m.dead) {
            p.dead = true;
            continue;
          }
          const c = Math.cos(m.yaw);
          const s = Math.sin(m.yaw);
          p.x = m.wx + (p.ox ?? 0) * c + (p.oz ?? 0) * s;
          p.z = m.wz - (p.ox ?? 0) * s + (p.oz ?? 0) * c;
          p.y = m.wy + (p.oy ?? 1);
        }
        continue;
      }
      const caster = p.kind === "bolt" ? mobs.find((o) => o.id === p.from) : undefined;
      const pl = party[caster ? caster.target : 0] ?? party[0];
      if (p.kind === "bolt" && pl && !pl.dead) {
        // A bolt bends gently toward him.
        const tx = pl.wx - p.x;
        const ty = pl.wy + 1.15 - p.y;
        const tz = pl.wz - p.z;
        const tl = Math.hypot(tx, ty, tz) || 1;
        const sp = Math.hypot(p.vx, p.vy, p.vz) || 1;
        const k = Math.min(1, dt * 1.3);
        p.vx += ((tx / tl) * sp - p.vx) * k;
        p.vy += ((ty / tl) * sp - p.vy) * k;
        p.vz += ((tz / tl) * sp - p.vz) * k;
      } else if (p.kind === "arrow") {
        p.vy -= ARROW_G * dt;
        const drag = Math.exp(-ARROW_DRAG * dt);
        p.vx *= drag;
        p.vy *= drag;
        p.vz *= drag;
      }
      // Sub-steps so a fast arrow does not jump through him or a wall.
      const n = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vy, p.vz) * dt) / 0.2));
      for (let k = 0; k < n && !p.dead && !p.stuck; k++) {
        p.x += (p.vx * dt) / n;
        p.y += (p.vy * dt) / n;
        p.z += (p.vz * dt) / n;
        // His own arrows: the first monster whose body it passes through takes it.
        if (p.from === 0) {
          for (const m of mobs) {
            if (m.dead) continue;
            const hy = Math.max(m.wy + 0.1, Math.min(m.wy + m.height, p.y));
            if (Math.hypot(p.x - m.wx, p.y - hy, p.z - m.wz) < m.radius + 0.06) {
              const sp = Math.hypot(p.vx, p.vz) || 1;
              // A skeleton's skull (the top eighth of it) takes half again.
              const head = m.family === "skeleton" && p.y > m.wy + m.height * 0.86;
              const before = m.hp;
              const result = hit(m.id, p.vx / sp, p.vz / sp, p.damage * (head ? p.headBonus ?? HEAD_BONUS : 1));
              if (result) events.push({ type: "struck", mob: m, result, head, dealt: before - m.hp, mine: !p.theirs });
              // It stays in him where it went in (a shield turns it aside).
              if (result === "hit") {
                const c = Math.cos(m.yaw);
                const s = Math.sin(m.yaw);
                const dx = p.x - m.wx;
                const dz = p.z - m.wz;
                p.stuck = true;
                p.stuckTo = m.id;
                p.ox = dx * c - dz * s;
                p.oz = dx * s + dz * c;
                p.oy = p.y - m.wy;
                p.life = STUCK_MOB_S;
              } else p.dead = true;
              break;
            }
          }
          if (p.dead) break;
        }
        // The fighters: a capsule from the feet to the crown (their arrows pass their friends).
        if (p.from !== 0) {
          for (let w = 0; w < party.length; w++) {
            const f = party[w];
            if (f.dead) continue;
            const hy = Math.max(f.wy + 0.2, Math.min(f.wy + 1.65, p.y));
            if (Math.hypot(p.x - f.wx, p.y - hy, p.z - f.wz) < PLAYER_R) {
              p.dead = true;
              events.push({
                type: "hit",
                mob: mobs.find((o) => o.id === p.from) ?? mobs[0],
                damage: p.damage,
                fromX: p.x - p.vx,
                fromZ: p.z - p.vz,
                blockable: true,
                how: p.kind,
                who: w,
                // The top of him (above the shoulders) is the head.
                head: p.y > f.wy + 1.45,
              });
              break;
            }
          }
          if (p.dead) break;
        }
        if (solid(p.x, p.y, p.z)) {
          events.push({ type: "impact", projectile: p, wall: true });
          // An arrow sticks where it hit (backed out of the stone a touch); a bolt bursts.
          if (p.kind === "arrow") {
            const sp = Math.hypot(p.vx, p.vy, p.vz) || 1;
            p.x -= (p.vx / sp) * 0.12;
            p.y -= (p.vy / sp) * 0.12;
            p.z -= (p.vz / sp) * 0.12;
            p.stuck = true;
            p.life = p.from === 0 ? STUCK_WALL_S : 9;
          } else p.dead = true;
        }
      }
    }
    // Forget the spent ones now and then.
    if (projectiles.length > 60) {
      const live = projectiles.filter((p) => !p.dead);
      projectiles.length = 0;
      projectiles.push(...live);
    }
  };

  const snares: Snare[] = [];
  /** The ranger sets a snare at his feet (the oldest goes when there are too many). */
  const setSnare = (x: number, y: number, z: number) => {
    snares.push({ x, y, z, t: 0, life: SNARE_LIFE_S, caught: null, caughtT: 0 });
    if (snares.length > MAX_SNARES) snares.shift();
  };
  /** Snares age; an armed one bites the first monster on it and holds it. `live`: only the
   *  authority's floor springs them (a party member's copy just shows them). */
  const stepSnares = (dt: number, live: boolean) => {
    for (const q of snares) {
      q.t += dt;
      if (q.caught !== null) q.caughtT += dt;
    }
    for (let i = snares.length - 1; i >= 0; i--) {
      const q = snares[i];
      if ((q.caught === null && q.t > q.life) || q.caughtT > SNARE_HOLD_S + 1.5) snares.splice(i, 1);
    }
    if (!live) return;
    for (const q of snares) {
      if (q.t < SNARE_ARM_S) continue;
      if (q.caught !== null) {
        // Held: it stays put until the jaws let go (or it dies).
        const m = mobs.find((o) => o.id === q.caught);
        if (m && !m.dead && q.caughtT < (m.kind.boss ? 1.2 : SNARE_HOLD_S)) {
          m.stun = Math.max(m.stun, 0.1);
          m.kx = m.kz = 0;
        }
        continue;
      }
      const m = mobs.find((o) => !o.dead && Math.abs(o.wy - q.y) < 1 && Math.hypot(o.wx - q.x, o.wz - q.z) < 0.35 + o.radius * 0.6);
      if (!m) continue;
      q.caught = m.id;
      q.caughtT = 0;
      m.blockT = 0;
      const before = m.hp;
      const result = hit(m.id, 0, 0, SNARE_BITE);
      if (result) events.push({ type: "struck", mob: m, result, head: false, dealt: before - m.hp, mine: true });
      events.push({ type: "snared", mob: m, snare: q });
      if (!m.dead) {
        m.stun = m.kind.boss ? 1.2 : SNARE_HOLD_S;
        m.kx = m.kz = 0;
      }
    }
  };

  /** Seconds before acid can burn each fighter again. */
  const acidTick: number[] = [];
  const stepPuddles = (dt: number, party: PlayerView[]) => {
    for (const p of puddles) p.t += dt;
    for (let i = puddles.length - 1; i >= 0; i--) if (puddles[i].t > puddles[i].life) puddles.splice(i, 1);
    // Standing in one burns (twice a second), boots or no boots.
    for (let w = 0; w < party.length; w++) {
      const pl = party[w];
      acidTick[w] = (acidTick[w] ?? 0) - dt;
      if (pl.dead || acidTick[w] > 0) continue;
      for (const p of puddles) {
        const fresh = Math.min(1, (p.life - p.t) / 1.5);
        if (fresh > 0.2 && Math.hypot(p.x - pl.wx, p.z - pl.wz) < p.r && Math.abs(p.y - pl.wy) < 0.6) {
          acidTick[w] = 0.5;
          const owner = mobs.find((m) => m.kind.id === "acidSlime") ?? mobs[0];
          events.push({ type: "hit", mob: owner, damage: PUDDLE_BURN * 0.5, fromX: p.x, fromZ: p.z, blockable: false, how: "acid", who: w });
          break;
        }
      }
    }
  };

  /** Cells under each fighter, and whether he stands in the market (the entrance: safe ground). */
  const cellsOf = (pl: PlayerView) => {
    const cx = pl.wx / CELL_M + d.W / 2;
    const cz = pl.wz / CELL_M + d.H / 2;
    const ix = Math.floor(cx);
    const iz = Math.floor(cz);
    return { cx, cz, market: ix >= 0 && iz >= 0 && ix < d.W && iz < d.H && d.roomId[iz * d.W + ix] === d.entrance };
  };
  /** The living fighters' cells, x then z (moveToward steers round all of them). */
  const bodies: number[] = [];

  /**
   * One step. `me` is this player; `others` the rest of the party on this floor (a party's leader
   * runs the floor for everyone, net/coop.ts). Each monster goes after the nearest living one and
   * the "hit" events say whom they landed on (`who`: 0 is `me`, 1.. index `others` + 1).
   */
  const step = (dt: number, me: PlayerView, others: PlayerView[] = []) => {
    events.length = 0;
    const party = others.length ? [me, ...others] : [me];
    const cells = party.map(cellsOf);
    bodies.length = 0;
    party.forEach((f, w) => {
      if (!f.dead) bodies.push(cells[w].cx, cells[w].cz);
    });

    for (let i = 0; i < mobs.length; i++) {
      const m = mobs[i];
      m.attack = false;
      m.loosed = false;
      m.flinch *= Math.exp(-dt * 6);
      if (m.dead) {
        m.deadT += dt;
        m.vx = m.vz = 0;
        continue;
      }
      m.attackCd -= dt;
      m.blockT -= dt;
      if (m.stun > 0) {
        // Struck: thrown back a step along the cut, then it gathers itself.
        m.stun -= dt;
        m.aimT = 0;
        P.x = m.cx + m.kx * dt;
        P.y = m.cz + m.kz * dt;
        collider.collide(P);
        blockDoors(P, m.cx, m.cz, m.radius);
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

      // Acid slimes leave a burning trail.
      if (m.kind.id === "acidSlime" && Math.hypot(m.vx, m.vz) > 0.2) {
        m.dripCd -= dt;
        if (m.dripCd <= 0) {
          m.dripCd = DRIP_S;
          puddles.push({ x: m.wx, y: m.wy, z: m.wz, r: 0.55 + rng() * 0.2, t: 0, life: PUDDLE_S });
          if (puddles.length > MAX_PUDDLES) puddles.shift();
        }
      }

      // Whom it is after: the nearest of the living (it only turns to another a good step closer).
      if (party.length > 1) {
        const far = (w: number) => (party[w].dead || party[w].hidden ? Infinity : Math.hypot(party[w].wx - m.wx, party[w].wz - m.wz));
        let best = m.target < party.length ? m.target : 0;
        let bestD = far(best) - 1.5;
        for (let w = 0; w < party.length; w++) {
          const dw = far(w);
          if (dw < bestD) {
            best = w;
            bestD = dw;
          }
        }
        m.target = best;
      } else m.target = 0;
      const pl = party[m.target];
      const pCx = cells[m.target].cx;
      const pCz = cells[m.target].cz;
      const inMarket = cells[m.target].market;
      const toX = pl.wx - m.wx;
      const toZ = pl.wz - m.wz;
      const distM = Math.hypot(toX, toZ);
      const facePlayer = Math.atan2(toX, toZ);

      // Calm: does it see the fighter (in front of it, in reach of its eyes, no wall between)?
      // Nothing picks a fight in the market.
      const unseen = pl.dead || !!pl.hidden;
      if (!m.hostile && !unseen && !inMarket) {
        const boss = !!m.kind.boss;
        const ahead = Math.cos(facePlayer - m.yaw) > -0.26;
        const range = boss ? BOSS_SIGHT_M : m.kind.ranged ? RANGED_SIGHT_M : SIGHT_M;
        const sees = distM < HEAR_M || (distM < range && ahead && clearLine(m.cx, m.cz, pCx, pCz));
        m.notice = sees ? m.notice + dt : Math.max(0, m.notice - dt * 0.5);
        if (sees) turnTo(m, facePlayer, 5, dt);
        if (m.notice >= (boss ? BOSS_NOTICE_S : NOTICE_S)) {
          alertRoom(m);
          m.path = [];
          m.repath = 0;
          m.waitTimer = 0;
        }
      }

      if (m.hostile && !unseen) {
        const chase = (paceK: number) => {
          m.repath -= dt;
          if (m.repath <= 0 || (!m.path.length && !m.gated)) {
            m.path = route(m, pCx, pCz, 900);
            m.repath = 0.45;
          }
          // A shut door in the way: up to it, then it waits there, glaring.
          if (m.gated && m.path.length && Math.hypot(m.path[0][0] - m.cx, m.path[0][1] - m.cz) < 0.3) m.path.shift();
          if (m.gated && !m.path.length) {
            m.vx = m.vz = 0;
            turnTo(m, facePlayer, 6, dt);
            hopPace(m, dt, false);
            return;
          }
          const [tx, tz] = m.path.length > 1 || m.gated ? m.path[0] : [pCx, pCz];
          if (m.path.length > 1 && Math.hypot(tx - m.cx, tz - m.cz) < 0.3) m.path.shift();
          const speed = ((m.blockT > 0 ? 0.35 : 1) * CHASE_MS * m.stats.speed * paceK * hopPace(m, dt, true)) / CELL_M;
          moveToward(m, i, tx, tz, speed, dt);
          turnTo(m, distM < 4 ? facePlayer : Math.atan2(m.vx, m.vz) || m.yaw, 10, dt);
        };
        const r = m.kind.ranged;
        if (r) {
          // Archers and mages: keep him between min and max, with a clear line, and loose.
          const sight = clearLine(m.cx, m.cz, pCx, pCz);
          if (m.aimT > 0) {
            // Drawing or casting: rooted, turning to follow him.
            m.vx = m.vz = 0;
            turnTo(m, facePlayer, 7, dt);
            m.aimT -= dt;
            if (m.aimT <= 0) {
              m.aimT = 0;
              if (sight) loose(m, pl);
              m.attackCd = m.stats.attackEvery * (0.85 + rng() * 0.3);
            }
          } else if (distM > r.max || !sight) chase(0.85);
          else if (distM < r.min) {
            // Too close: back away from him (along the open floor), still facing him.
            const ax = m.cx - (toX / (distM || 1)) * 2;
            const az = m.cz - (toZ / (distM || 1)) * 2;
            const moved = moveToward(m, i, ax, az, (WALK_MS * 1.1 * m.stats.speed) / CELL_M, dt);
            turnTo(m, facePlayer, 9, dt);
            // Cornered (or in reach): it looses anyway, quicker.
            if ((moved < 0.002 || distM < 1.6) && m.attackCd <= 0) m.aimT = r.windup * 0.7;
          } else {
            m.vx = m.vz = 0;
            turnTo(m, facePlayer, 8, dt);
            if (m.attackCd <= 0 && Math.cos(m.yaw - facePlayer) > 0.8) m.aimT = r.windup;
          }
          place(m, dt);
          continue;
        }

        // Melee: a shield-bearer sees the cut coming and may raise his shield (decided once per cut).
        if (pl.swingStarted && distM < 3 && rng() < m.stats.blockChance) m.blockT = 0.75;
        if (m.lungeT > 0) {
          // A slime's lunge: thrown at him, and the blow lands at the top of it if he is still there.
          const before = m.lungeT;
          m.lungeT -= dt;
          const fx = Math.sin(m.yaw);
          const fz = Math.cos(m.yaw);
          const pace = (m.lungeT > LUNGE_S * 0.35 ? 2.4 : 0.4) * m.scale ** 0.5;
          moveToward(m, i, m.cx + fx, m.cz + fz, pace / CELL_M, dt);
          if (before > LUNGE_S * 0.45 && m.lungeT <= LUNGE_S * 0.45 && distM < m.kind.reach + m.radius + 0.45 && !throughShut(m.cx, m.cz, pCx, pCz)) {
            events.push({ type: "hit", mob: m, damage: m.stats.damage, fromX: m.wx, fromZ: m.wz, blockable: true, how: "lunge", who: m.target });
          }
          if (m.lungeT <= 0) m.lungeT = 0;
          place(m, dt);
          continue;
        }
        const reach = m.kind.reach + (m.family === "slime" ? m.radius : 0);
        if (distM > reach || throughShut(m.cx, m.cz, pCx, pCz)) chase(1);
        else {
          m.vx = m.vz = 0;
          turnTo(m, facePlayer, 9, dt);
          const facing = Math.cos(m.yaw - facePlayer) > 0.85;
          if (m.attackCd <= 0 && m.blockT <= 0 && facing) {
            m.attackCd = m.stats.attackEvery * (0.85 + rng() * 0.3);
            if (m.family === "slime") m.lungeT = LUNGE_S;
            else {
              m.attack = true;
              m.swings++;
            }
          }
          hopPace(m, dt, false);
        }
        place(m, dt);
        continue;
      }

      // Calm: wander the home room (now and then the next one), pausing to look about.
      if (m.waitTimer > 0) {
        m.waitTimer -= dt;
        m.vx = m.vz = 0;
        hopPace(m, dt, false);
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
      const pace = hopPace(m, dt, true);
      const speed = (WALK_MS * m.stats.speed * pace) / CELL_M;
      const moved = moveToward(m, i, tx, tz, speed, dt);
      if (moved > 0.0005) turnTo(m, Math.atan2(m.vx, m.vz), 6, dt);
      // Blocked: think again in a moment (a slime between hops is not blocked).
      if (pace > 0 && moved < speed * CELL_M * dt * 0.15) {
        m.waitTimer = 0.3;
        m.path = pickTargetPath(m);
      }
      place(m, dt);
    }

    stepProjectiles(dt, party);
    stepPuddles(dt, party);
    stepSnares(dt, true);
  };

  /**
   * The fighter's blade reached monster `id`, travelling along (dirX, dirZ). Returns what happened:
   * "blocked" (its shield took it), "hit" (damage dealt) or "killed".
   */
  const hit = (id: number, dirX: number, dirZ: number, damage: number, soft = false): "blocked" | "hit" | "killed" | null => {
    const m = mobs.find((o) => o.id === id);
    if (!m || m.dead) return null;
    if (!m.hostile) alertRoom(m);
    // A raised shield facing the cut takes it (not poison already in the blood).
    if (!soft && m.blockT > 0 && m.equipment.shield && Math.cos(m.yaw - Math.atan2(-dirX, -dirZ)) > 0.4) {
      m.blockT = Math.max(m.blockT, 0.3);
      return "blocked";
    }
    // Soft damage (poison) goes past armour and neither staggers nor knocks it back.
    m.hp -= soft ? damage : damage * (1 - armorReduction(m.stats.armor));
    if (!soft) {
      m.flinch = 0.22;
      m.aimT = 0;
    }
    if (m.hp <= 0) {
      m.hp = 0;
      m.dead = true;
      m.deadT = 0;
      m.yaw = Math.atan2(-dirX, -dirZ);
      // The Bloated Slime bursts: three slimelets spill out, already angry.
      if (m.kind.id === "bloatedSlime") {
        for (let k = 0; k < 3; k++) {
          const a = m.yaw + Math.PI + (k - 1) * 1.1;
          const c = spawn("slimelet", m.cx, m.cz, m.homeRoomId, false);
          c.hostile = true;
          c.kx = (Math.sin(a) * 2.6) / CELL_M;
          c.kz = (Math.cos(a) * 2.6) / CELL_M;
          c.stun = 0.45;
          c.yaw = a;
          c.attackCd = 0.8 + k * 0.3;
        }
        events.push({ type: "split", mob: m });
      }
      return "killed";
    }
    if (soft) return "hit";
    // Slimes are not knocked about as far as men, and the big one hardly at all.
    const knock = m.family === "slime" ? 1.0 / m.scale : m.kind.boss ? 0.6 : 1.4;
    m.stun = m.kind.boss ? 0.18 : 0.32;
    m.lungeT = 0;
    m.kx = (dirX * knock) / CELL_M;
    m.kz = (dirZ * knock) / CELL_M;
    m.blockT = 0;
    // It has been hit: the next blow comes back quickly.
    m.attackCd = Math.min(m.attackCd, 0.5);
    return "hit";
  };

  /**
   * The fighter looses an arrow from (x, y, z) with velocity (vx, vy, vz), metres and m/s;
   * `headBonus` multiplies a headshot (his headshot damage on top of the usual half again);
   * `theirs` marks a party member's arrow flown on the leader's floor.
   */
  const shoot = (x: number, y: number, z: number, vx: number, vy: number, vz: number, damage: number, headBonus = HEAD_BONUS, theirs = false) => {
    projectiles.push({ id: nextShot++, kind: "arrow", x, y, z, vx, vy, vz, damage, from: 0, life: 4, stuck: false, dead: false, headBonus, theirs });
  };

  /**
   * A party member's copy of the leader's floor (net/coop.ts writes the leader's snapshots into the
   * monsters' `net` and the projectile and puddle lists): instead of `step`, everything eases toward
   * where the leader's game last put it, and flies on between snapshots.
   */
  const mirror = (dt: number) => {
    events.length = 0;
    const k = 1 - Math.exp(-dt * 10);
    for (const m of mobs) {
      m.attack = false;
      m.loosed = false;
      m.flinch *= Math.exp(-dt * 6);
      m.aimT = Math.max(0, m.aimT - dt);
      m.lungeT = Math.max(0, m.lungeT - dt);
      m.blockT -= dt;
      m.stun = Math.max(0, m.stun - dt);
      if (m.dead) {
        m.deadT += dt;
        m.vx = m.vz = 0;
        if (m.net) {
          m.cx = m.net.cx;
          m.cz = m.net.cz;
        }
        place(m, dt);
        continue;
      }
      const n = m.net;
      if (!n) continue;
      const far = Math.hypot(n.cx - m.cx, n.cz - m.cz) > 3;
      const nx = far ? n.cx : m.cx + (n.cx - m.cx) * k;
      const nz = far ? n.cz : m.cz + (n.cz - m.cz) * k;
      m.vx = dt > 0 && !far ? ((nx - m.cx) * CELL_M) / dt : 0;
      m.vz = dt > 0 && !far ? ((nz - m.cz) * CELL_M) / dt : 0;
      m.cx = nx;
      m.cz = nz;
      turnTo(m, n.yaw, 12, dt);
      if (m.family === "slime") m.hopU = (m.hopU + (dt / HOP_S) * (Math.hypot(m.vx, m.vz) > 0.2 ? 1 : 0.35) * Math.pow(m.scale, -0.35)) % 1;
      place(m, dt);
    }
    for (const p of projectiles) {
      if (p.dead || p.stuck) continue;
      if (p.kind === "arrow") p.vy -= ARROW_G * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    for (const q of puddles) q.t += dt;
    stepSnares(dt, false);
  };

  /** A monster the leader's floor has and this copy lacks (a Bloated Slime's slimelets). */
  const adopt = (id: number, kindId: MobKindId, cx: number, cz: number, room: number, elite: boolean): MobAgent => {
    const m = spawn(kindId, cx, cz, room, elite);
    m.id = id;
    nextId = Math.max(nextId, id + 1);
    return m;
  };

  return { mobs, projectiles, puddles, snares, events, step, hit, shoot, setSnare, mirror, adopt };
}
