// A party's dive: everyone builds the same floor from the run's seed, and one game (the authority:
// the first of the party, in order, still on the floor) runs the monsters for all of them. It
// streams them ten times a second; the others ease their copies toward that (mobSim `mirror`), and
// send their blows and arrows back to be struck on the authority's floor. A monster's blow on a
// teammate is sent to him and lands in his game, where his shield and armour count. Skeleton cuts
// are the exception: every game sweeps the mirrored swords against its own player.
//
// When the authority leaves the floor (back up to town, out through a portal, or offline), the next
// one in the party takes over the monsters from his copy, as they stand.
import type { MobKindId } from "../monsters/kinds";
import type { createMobSimulation, MobAgent } from "../mobSim";
import { mp, type RunStatus, type RunView } from "./mp";

type Sim = ReturnType<typeof createMobSimulation>;

/** id, cx, cz, yaw (x100), hp (x10), flags (1 hostile, 2 dead, 4 shield up), swings, aim, lunge (x100). */
type MobRow = [number, number, number, number, number, number, number, number, number];
/** A monster the authority made since the floor was built: id, kind, room, elite. */
type NewRow = [number, string, number, 0 | 1];
/** id, x, y, z (x100), vx, vy, vz (x10), kind (0 arrow, 1 bolt), stuck, from. */
type ShotRow = [number, number, number, number, number, number, number, 0 | 1, 0 | 1, number];
/** x, y, z, r, t, life (x100). */
type PuddleRow = [number, number, number, number, number, number];

interface MobSnap {
  m: MobRow[];
  n: NewRow[];
  pr: ShotRow[];
  pu: PuddleRow[];
}

export interface HitIn {
  id: number;
  dx: number;
  dz: number;
  dmg: number;
}
export interface ShotIn {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  dmg: number;
}
export interface HurtIn {
  mob: number;
  dmg: number;
  fx: number;
  fz: number;
  bl: boolean;
  how: "blade" | "lunge" | "arrow" | "bolt" | "acid";
}
export interface DoorIn {
  i: number;
  open: boolean;
  x: number;
  z: number;
}

const SNAP_S = 0.1;
/** A blow older than this when his game gets to it (it was paused) is dropped, not piled on. */
const HURT_TTL_MS = 1500;
/** Calm monsters further than this from every teammate go in every tenth snapshot only. */
const NEAR_M = 34;

const r2 = (v: number) => Math.round(v * 100);

export function createCoop(run: RunView) {
  const me = () => mp.state.me ?? "";
  let status: Record<string, RunStatus> = { ...run.status };
  let away: Record<string, boolean> = { ...(run.away ?? {}) };
  let authority = "";
  /** The monsters' count on the authority's floor as built (higher ids were made later). */
  let builtMobs = -1;
  const snaps: MobSnap[] = [];
  const hits: HitIn[] = [];
  const shots: ShotIn[] = [];
  /** Blows on him, stamped when they came in (performance.now()). */
  const hurts: Array<HurtIn & { at: number }> = [];
  const doors: DoorIn[] = [];
  let snapT = 0;
  let snapN = 0;

  const onFloor = (st: RunStatus | undefined) => st === "in" || st === "dead";
  /**
   * The hub says whose game runs the monsters (the one there was while he is on the floor and
   * playing, then the first in party order who is), so a teammate joining late agrees with all.
   * Alone (the party broke up), it is this game.
   */
  const pick = (auth: string) => {
    authority = auth;
  };
  pick(run.auth ?? "");

  const offs = [
    mp.on("runstate", (m) => {
      if (m.run !== run.id) return;
      status = { ...(m.status as Record<string, RunStatus>) };
      away = { ...((m.away as Record<string, boolean>) ?? {}) };
      if (Array.isArray(m.members)) run.members = (m.members as string[]).slice();
      pick(String(m.auth ?? ""));
    }),
    mp.on("party", (m) => {
      // The party broke up (the others went offline): he plays the rest of the floor alone.
      if (!m.party) {
        for (const id of Object.keys(status)) if (id !== me()) status[id] = "out";
        pick(me());
      }
    }),
    mp.on("g", (m) => {
      const from = String(m.from);
      switch (m.k) {
        case "mobs":
          if (from === authority && from !== me()) {
            snaps.push(m as unknown as MobSnap);
            if (snaps.length > 4) snaps.shift();
          }
          return;
        case "hit":
          hits.push(m as unknown as HitIn);
          return;
        case "shot":
          shots.push(m as unknown as ShotIn);
          return;
        case "hurt":
          hurts.push({ ...(m as unknown as HurtIn), at: performance.now() });
          return;
        case "door":
          doors.push(m as unknown as DoorIn);
          return;
      }
    }),
  ];

  const encode = (sim: Sim, mates: Array<{ x: number; z: number }>, full: boolean): MobSnap => {
    const near = (m: MobAgent) => mates.some((t) => Math.hypot(t.x - m.wx, t.z - m.wz) < NEAR_M);
    const m: MobRow[] = [];
    const n: NewRow[] = [];
    for (const a of sim.mobs) {
      if (a.id > builtMobs) n.push([a.id, a.kind.id, a.homeRoomId, a.elite ? 1 : 0]);
      const recent = !a.dead || a.deadT < 3;
      if (!full && !(recent && (a.hostile || a.dead || near(a)))) continue;
      m.push([
        a.id,
        r2(a.cx),
        r2(a.cz),
        r2(a.yaw),
        Math.round(a.hp * 10),
        (a.hostile ? 1 : 0) | (a.dead ? 2 : 0) | (a.blockT > 0 ? 4 : 0),
        a.swings,
        r2(a.aimT),
        r2(a.lungeT),
      ]);
    }
    const pr: ShotRow[] = [];
    for (const p of sim.projectiles) {
      if (p.dead) continue;
      pr.push([p.id, r2(p.x), r2(p.y), r2(p.z), Math.round(p.vx * 10), Math.round(p.vy * 10), Math.round(p.vz * 10), p.kind === "bolt" ? 1 : 0, p.stuck ? 1 : 0, p.from]);
    }
    const pu: PuddleRow[] = sim.puddles.map((q) => [r2(q.x), r2(q.y), r2(q.z), r2(q.r), r2(q.t), r2(q.life)]);
    return { m, n, pr, pu };
  };

  const apply = (sim: Sim, s: MobSnap) => {
    const byId = new Map(sim.mobs.map((a) => [a.id, a]));
    for (const [id, kind, room, elite] of s.n) {
      if (byId.has(id)) continue;
      const row = s.m.find((r) => r[0] === id);
      if (!row) continue;
      byId.set(id, sim.adopt(id, kind as MobKindId, row[1] / 100, row[2] / 100, room, !!elite));
    }
    const now = performance.now();
    for (const r of s.m) {
      const a = byId.get(r[0]);
      if (!a) continue;
      const [, cx, cz, yaw, hp, flags, swings, aim, lunge] = r;
      a.net = { cx: cx / 100, cz: cz / 100, yaw: yaw / 100, seen: now };
      const h = hp / 10;
      if (h < a.hp - 0.05) a.flinch = 0.22;
      a.hp = h;
      a.hostile = !!(flags & 1);
      const dead = !!(flags & 2);
      if (dead && !a.dead) {
        a.dead = true;
        a.deadT = 0;
        a.yaw = yaw / 100;
      } else if (!dead && a.dead) a.dead = false;
      a.blockT = flags & 4 ? 0.3 : Math.min(a.blockT, 0);
      if (swings > a.swings) a.attack = true;
      a.swings = swings;
      a.aimT = aim / 100;
      a.lungeT = lunge / 100;
    }
    // Projectiles and puddles: the authority's, as they are.
    const old = new Map(sim.projectiles.map((p) => [p.id, p]));
    sim.projectiles.length = 0;
    for (const [id, x, y, z, vx, vy, vz, kind, stuck, from] of s.pr) {
      const p = old.get(id) ?? { id, kind: kind ? "bolt" : "arrow", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, damage: 0, from, life: 3, stuck: false, dead: false };
      p.x = x / 100;
      p.y = y / 100;
      p.z = z / 100;
      p.vx = vx / 10;
      p.vy = vy / 10;
      p.vz = vz / 10;
      p.stuck = !!stuck;
      sim.projectiles.push(p as (typeof sim.projectiles)[number]);
    }
    sim.puddles.length = 0;
    for (const [x, y, z, r, t, life] of s.pu) sim.puddles.push({ x: x / 100, y: y / 100, z: z / 100, r: r / 100, t: t / 100, life: life / 100 });
  };

  return {
    run,
    status: () => status,
    authority: () => authority,
    /** This game runs the monsters (also when he is alone on the floor). */
    leads: () => authority === me() || !authority,
    /** His game is paused (window hidden): the monsters leave him be until he is back. */
    isAway: (id: string) => !!away[id],
    /** The others on the floor (alive or down, not gone). */
    mates: () => run.members.filter((id) => id !== me() && onFloor(status[id])),
    /** The floor was built with this many monsters (ids above it come from the authority later). */
    built(sim: Sim) {
      builtMobs = sim.mobs.reduce((n, a) => Math.max(n, a.id), 0);
    },
    /**
     * The authority's share of a frame: strike the blows and arrows the others sent, then now and
     * then send the monsters as they stand.
     */
    lead(dt: number, sim: Sim, mates: Array<{ x: number; z: number }>, onStruck: (m: MobAgent, r: "blocked" | "hit" | "killed") => void) {
      for (const h of hits.splice(0)) {
        const m = sim.mobs.find((o) => o.id === h.id);
        const r = sim.hit(h.id, h.dx, h.dz, h.dmg);
        if (m && r) onStruck(m, r);
      }
      for (const s of shots.splice(0)) sim.shoot(s.x, s.y, s.z, s.vx, s.vy, s.vz, s.dmg);
      snaps.length = 0;
      snapT += dt;
      if (snapT < SNAP_S || !mates.length) return;
      snapT = 0;
      snapN++;
      mp.game({ k: "mobs", ...encode(sim, mates, snapN % 10 === 0) });
    },
    /** A teammate's share: take the latest snapshot into the copy (after `sim.mirror`). */
    follow(sim: Sim) {
      hits.length = 0;
      shots.length = 0;
      for (const s of snaps.splice(0)) apply(sim, s);
    },
    /** His blow or arrow, for the authority to strike. */
    sendHit(id: number, dx: number, dz: number, dmg: number) {
      mp.game({ k: "hit", to: authority, id, dx, dz, dmg });
    },
    sendShot(s: ShotIn) {
      mp.game({ k: "shot", to: authority, ...s });
    },
    /** A monster's blow on a teammate (the authority tells him). */
    sendHurt(to: string, h: HurtIn) {
      mp.game({ k: "hurt", to, ...h });
    },
    /** Blows to take now; any that waited out a paused game (hidden window) are let go. */
    takeHurts: (): HurtIn[] => {
      const now = performance.now();
      return hurts.splice(0).filter((h) => now - h.at < HURT_TTL_MS);
    },
    sendDoor(d: DoorIn) {
      mp.game({ k: "door", ...d });
    },
    takeDoors: () => doors.splice(0),
    dispose() {
      for (const off of offs) off();
    },
  };
}

export type Coop = ReturnType<typeof createCoop>;
