// Traps in the corridors: five a floor, at least three different kinds, placed from the seed (the
// same floor always has the same traps, every life).
// - Spike plates: an iron grate whose holes glow red and click, then steel spikes shoot up and sink
//   again, each plate on its own beat. Standing on it as they rise hurts.
// - Spiked logs: a log studded with spikes spinning at shin height across the corridor, wall to
//   wall. He has to jump it (a running jump clears it easily, a walking one just); touching it hurts
//   and throws him back the way he came.
// - Swinging blades: a crescent blade on a long arm, swinging from wall to wall under the vault.
//   Jumping does not help: he times his run past it. A cut throws him back.
// - Acid channels (lava on molten floors): a bubbling trench across the corridor. The short one is
//   one jump; the long one has a stepping stone in the middle to land on. Standing in it burns, a
//   little every moment, but never blocks the way.
// From the trap hallways (labs/crypt-hallway, Episodes 1 and 2):
// - Rolling boulder: a tripwire across a long straight corridor. Snap it and a boulder drops from a
//   chute behind him and rolls the length of the corridor, flattening whatever it meets (monsters
//   too) until it bursts apart at the far end. Jump the wire, or run.
// - Ceiling crusher: a stone block between iron guides under the vault, slamming to the floor on its
//   own beat; dust trickles and its chains rattle first. While it is down it blocks the way.
// - Flame burners: copper pipes along both walls. Walk up to them and the oil hisses for a moment,
//   then fire fills the corridor wall to wall for a breath or two, then they cool. Rush through
//   before they light, or wait for them to burn out.
// `planTraps` is pure; `createTraps` draws them and reports what caught him each frame.
import * as THREE from "three";
import { floorAt } from "./dungeon/floors";
import { FLOOR, type DungeonData } from "./dungeon/generator";
import type { Piece } from "./dungeon/rooms";

export const TRAP_COUNT = 6;

export type TrapKind = "spikes" | "log" | "blade" | "channel" | "boulder" | "crusher" | "flames";

export interface TrapPlan {
  kind: TrapKind;
  /** Grid position of the cell's middle (cells). */
  gx: number;
  gz: number;
  /** The corridor runs along this axis (a log lies across it). */
  along: "x" | "z";
  /** Floor height (cells). */
  floor: number;
  /** Where in its beat a spike plate starts (0..1). */
  phase: number;
  /** A log's, blade's or channel's length across the corridor, wall to wall (cells; 1 for a plate). */
  span: number;
  /** A channel's length along the corridor (cells: 1 is one jump, 2 has a stepping stone); burners
   *  1 or 2; a boulder's straight run (cells, its middle at gx/gz, where the wire is). */
  length: number;
}

/** Widest corridor a log is laid across (cells). */
const MAX_LOG_SPAN = 3;
/** A boulder needs a straight run this long (cells) in a corridor at most two cells wide. */
const BOULDER_RUN = 9;
const BOULDER_SPAN = 2;

/** Where this floor's traps go: flat corridor cells, away from doors, furniture, the start and each other. */
export function planTraps(d: DungeonData, pieces: Piece[], start: { x: number; z: number }, rand: () => number): TrapPlan[] {
  const { W, H } = d;
  const isFloor = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H && d.grid[z * W + x] === FLOOR;
  const nearDoor = (x: number, z: number) => {
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const cx = x + dx;
        const cz = z + dz;
        if (cx >= 0 && cz >= 0 && cx < W && cz < H && d.doorway[cz * W + cx]) return true;
      }
    return false;
  };
  const flat = (x: number, z: number, f: number) =>
    [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.1, 0.9],
      [0.9, 0.9],
      [0.5, 0.5],
    ].every(([ox, oz]) => Math.abs(floorAt(d, x + ox, z + oz) - f) < 1e-3);

  const clearOf = (x: number, z: number) => !pieces.some((p) => Math.abs(p.x - (x + 0.5)) < p.hx + 0.9 && Math.abs(p.z - (z + 0.5)) < p.hz + 0.9);
  /** A cell a trap may cover: corridor floor at height `f`, flat, no door near, nothing standing on it. */
  const usable = (x: number, z: number, f: number) => {
    if (x < 1 || z < 1 || x >= W - 1 || z >= H - 1) return false;
    const c = z * W + x;
    if (!d.corridor[c] || d.roomId[c] >= 0 || d.grid[c] !== FLOOR || d.doorway[c]) return false;
    return !nearDoor(x, z) && flat(x, z, f) && clearOf(x, z);
  };

  const plates: TrapPlan[] = [];
  /** Wall-to-wall crossings one cell long (logs, blades, short channels) and two cells long (long channels). */
  const crossings: TrapPlan[] = [];
  const longCrossings: TrapPlan[] = [];
  /** Crossing rows by their first cell across: the span (for straight runs of them). */
  const rows = new Map<string, { span: number; f: number }>();
  const rowKey = (along: string, x: number, z: number) => `${along}:${x}:${z}`;
  for (let z = 1; z < H - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      if (d.grid[z * W + x] !== FLOOR) continue;
      const f = floorAt(d, x + 0.5, z + 0.5);
      if (!usable(x, z, f)) continue;
      if (Math.hypot(x + 0.5 - start.x, z + 0.5 - start.z) < 7) continue;
      const alongX = isFloor(x - 1, z) && isFloor(x + 1, z);
      const alongZ = isFloor(x, z - 1) && isFloor(x, z + 1);
      if (!alongX && !alongZ) continue;
      const along: "x" | "z" = alongX ? "x" : "z";
      plates.push({ kind: "spikes", gx: x + 0.5, gz: z + 0.5, along, floor: f, phase: 0, span: 1, length: 1 });
      // A crossing spans the whole corridor, wall to wall (so it cannot be walked round), from the
      // first cell across: every cell of it usable, with flat floor to land on either way.
      const [cx, cz] = along === "x" ? [0, 1] : [1, 0];
      const [ax, az] = along === "x" ? [1, 0] : [0, 1];
      if (isFloor(x - cx, z - cz)) continue;
      let span = 1;
      while (span <= MAX_LOG_SPAN && isFloor(x + cx * span, z + cz * span)) span++;
      if (span > MAX_LOG_SPAN) continue;
      /** Every cell across, `k` cells along from here, is usable. */
      const row = (k: number) => {
        for (let j = 0; j < span; j++) if (!usable(x + cx * j + ax * k, z + cz * j + az * k, f)) return false;
        return true;
      };
      if (!row(-1) || !row(0) || !row(1)) continue;
      const lx = x + 0.5 + (cx * (span - 1)) / 2;
      const lz = z + 0.5 + (cz * (span - 1)) / 2;
      if (Math.hypot(lx - start.x, lz - start.z) < 7) continue;
      crossings.push({ kind: "log", gx: lx, gz: lz, along, floor: f, phase: 0, span, length: 1 });
      rows.set(rowKey(along, x, z), { span, f });
      // Two cells long: its middle on the edge between this row and the next.
      if (row(2)) longCrossings.push({ kind: "channel", gx: lx + ax * 0.5, gz: lz + az * 0.5, along, floor: f, phase: 0, span, length: 2 });
    }
  }

  // Straight runs for a boulder: crossing rows one after another, the same width and height.
  const runs: TrapPlan[] = [];
  rows.forEach((r, key) => {
    const [along, sx, sz] = key.split(":");
    const x = Number(sx);
    const z = Number(sz);
    const [ax, az] = along === "x" ? [1, 0] : [0, 1];
    const [cx, cz] = along === "x" ? [0, 1] : [1, 0];
    const same = (k: number) => {
      const o = rows.get(rowKey(along, x + ax * k, z + az * k));
      return !!o && o.span === r.span && Math.abs(o.f - r.f) < 1e-3;
    };
    if (r.span > BOULDER_SPAN || same(-1)) return;
    let len = 1;
    while (same(len)) len++;
    if (len < BOULDER_RUN) return;
    const gx = x + 0.5 + (cx * (r.span - 1)) / 2 + (ax * (len - 1)) / 2;
    const gz = z + 0.5 + (cz * (r.span - 1)) / 2 + (az * (len - 1)) / 2;
    if (Math.hypot(gx - start.x, gz - start.z) < 8) return;
    runs.push({ kind: "boulder", gx, gz, along: along as "x" | "z", floor: r.f, phase: 0, span: r.span, length: len });
  });

  const picked: TrapPlan[] = [];
  /** Clear of every trap picked so far: `gap` cells from each, and off a boulder's whole run. */
  const room = (p: TrapPlan, gap: number) =>
    picked.every((q) => {
      const runs2 = [q, p].filter((t) => t.kind === "boulder");
      if (!runs2.length) return Math.hypot(q.gx - p.gx, q.gz - p.gz) >= gap;
      // Against a run: along it (past its ends) or across it.
      const b = runs2[0];
      const o = b === q ? p : q;
      const da = Math.abs(b.along === "x" ? o.gx - b.gx : o.gz - b.gz) - b.length / 2;
      const dc = Math.abs(b.along === "x" ? o.gz - b.gz : o.gx - b.gx) - b.span / 2;
      return Math.max(da, dc) >= Math.min(gap, 4);
    });
  const take = (pool: TrapPlan[], kind: TrapKind): boolean => {
    for (let tries = 0; tries < 300 && pool.length; tries++) {
      const p = pool[Math.floor(rand() * pool.length)];
      if (!room(p, tries < 200 ? 7 : 4)) continue;
      picked.push({ ...p, kind, phase: rand() });
      return true;
    }
    return false;
  };
  const one = (kind: TrapKind): boolean => {
    if (kind === "spikes") return take(plates, kind);
    if (kind === "boulder") return take(runs, kind);
    if ((kind === "channel" || kind === "flames") && rand() < 0.5 && take(longCrossings, kind)) return true;
    return take(crossings, kind);
  };
  // A boulder first (it needs the most room: a long straight corridor), then the crusher, the
  // burners and the blade, then two more drawn at random (the old logs and channels now and then),
  // shuffled so no kind always comes first. Where a kind finds no room, a spike plate takes its place.
  const extra: TrapKind[] = ["spikes", "spikes", "crusher", "flames", "blade", "log", "channel"];
  const order: TrapKind[] = ["crusher", "flames", "blade", extra[Math.floor(rand() * extra.length)], extra[Math.floor(rand() * extra.length)]];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (!one("boulder")) order.push("spikes");
  for (const kind of order) if (!one(kind)) take(plates, "spikes");
  return picked.slice(0, TRAP_COUNT);
}

/** What caught him this frame. `push`: where he is thrown to (world metres). */
export interface TrapHit {
  damage: number;
  cause: string;
  push?: { x: number; z: number };
}

export interface TrapPlayer {
  /** Where he stands now and stood last frame (world metres), and how high his jump has him. */
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  air: number;
  /** Only the living (and not yet escaped) are caught. */
  alive: boolean;
}

export interface TrapSounds {
  trapClick: () => void;
  spikes: () => void;
  thud: () => void;
  /** A blade sweeping past, and acid (or lava) eating at his boots. */
  swish: () => void;
  sizzle: () => void;
  /** The boulder rolling and bursting, the crusher's chains and slam, the burners' fuse and fire. */
  rumble: (seconds: number) => void;
  smash: () => void;
  rattle: () => void;
  slam: () => void;
  fuse: () => void;
  roar: (seconds: number) => void;
}

/** A monster as the traps see it (mobSim's MobAgent has these). */
export interface TrapMob {
  id: number;
  wx: number;
  wy: number;
  wz: number;
  dead: boolean;
  radius: number;
}

/** The rest of the floor: monsters the boulder, crusher and fire also catch, and the view's shake. */
export interface TrapWorld {
  mobs: readonly TrapMob[];
  /** Strike a monster (only where this screen runs the monsters: alone, or a party's leader). */
  hitMob: ((id: number, dirX: number, dirZ: number, damage: number) => void) | null;
  /** Something heavy landed near him (0..1). */
  shake: (amount: number) => void;
  /** He set off trap `index` (the boulder's wire, the burners): a party's other screens set it off too. */
  onTrigger?: (index: number, dir: number) => void;
}

export interface Traps {
  plans: TrapPlan[];
  update: (dt: number, time: number, player: TrapPlayer, sounds: TrapSounds | null, world?: TrapWorld) => TrapHit[];
  /** Set off trap `index` from elsewhere (a party member's wire or burners); `dir` is his way along. */
  trigger: (index: number, dir: number) => void;
  dispose: () => void;
}

/** Spike plate beat (seconds): down, the warning, up fast, held, and back down. */
const PERIOD = 3.4;
const WARN_AT = 2.2;
const RISE_AT = 2.75;
const UP_AT = 2.83;
const DOWN_AT = 3.2;
/** How far the spikes sink below the floor, and what counts as up. */
const SINK = 0.3;
const PLATE_HALF = 0.62;
const SPIKE_DAMAGE = 20;
/** The log: its centre height, the band he must be above, and how high is high enough. */
const LOG_Y = 0.13;
const LOG_R = 0.115;
const LOG_BAND = 0.3;
const LOG_CLEAR = 0.2;
const LOG_DAMAGE = 12;
/** The blade: its pivot under the vault, the arm, the swing (seconds), the blade's half width, how
 *  close along the corridor counts as in its path, and the cut. */
const BLADE_PIVOT = 3.3;
const BLADE_ARM = 2.35;
const BLADE_PERIOD = 2.6;
const BLADE_HALF = 0.42;
const BLADE_BAND = 0.32;
const BLADE_DAMAGE = 22;
/** How near across the corridor the blade's middle must pass him to cut (its middle part, plus his body). */
const BLADE_HIT = 0.3 + 0.22;
/** The channel: how much of its cells along the corridor the liquid fills (a short one is 0.8 m, one
 *  jump even walking; a long one is 2.7 m with a 1.4 m stone in the middle), the burn and how often. */
const ACID_SHORT = 0.8;
const ACID_LONG = 2.7;
const STONE_LONG = 1.4;
const ACID_DAMAGE = 7;
const ACID_TICK = 0.4;
/** The boulder: how fast it drops down the chute (m/s²), its pace (m/s² and m/s: a run outruns it
 *  from the wire, a walk does not), the blow, and how high over the wire is clear of it. */
const BOULDER_G = 22;
const BOULDER_ACCEL = 7;
const BOULDER_TOP = 6.6;
const BOULDER_DAMAGE = 60;
const BOULDER_MOB = 300;
const WIRE_Y = 0.2;
const WIRE_CLEAR = 0.16;
/** The crusher's beat (seconds): rising until UP, held up, the warning from WARN, the slam from
 *  SLAM to DOWN, then held down to the end of the beat. */
const CRUSH_PERIOD = 4.6;
const CRUSH_UP = 1.4;
const CRUSH_WARN = 3.0;
const CRUSH_SLAM = 3.55;
const CRUSH_DOWN = 3.7;
/** Its block: half its depth along the corridor, its height, and the blow. */
const CRUSH_HALF = 0.55;
const CRUSH_H = 1.0;
const CRUSH_DAMAGE = 45;
const CRUSH_MOB = 150;
/** The burners: how near arms them (m past their ends), the fuse, the fire, the cooling; the burn. */
const FLAME_REACH = 1.7;
const FLAME_FUSE = 0.9;
const FLAME_BURN = 1.7;
const FLAME_COOL = 2.2;
const FLAME_DAMAGE = 10;
const FLAME_TICK = 0.3;
/** A repeatable 0..1 from a number (bubble spots). */
const hash = (v: number) => {
  const h = Math.sin(v) * 43758.5453;
  return h - Math.floor(h);
};
/** Sounds carry this far (metres). */
const HEAR = 12;

function plateTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = "#2c2a2a";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#555050";
  g.lineWidth = 4;
  g.strokeRect(4, 4, 120, 120);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      g.fillStyle = "#050404";
      g.beginPath();
      g.arc(22 + i * 28, 22 + j * 28, 6, 0, Math.PI * 2);
      g.fill();
    }
  g.fillStyle = "#6a6460";
  for (const [x, y] of [
    [10, 10],
    [118, 10],
    [10, 118],
    [118, 118],
  ]) {
    g.beginPath();
    g.arc(x, y, 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function holeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const grd = g.createRadialGradient(22 + i * 28, 22 + j * 28, 0, 22 + i * 28, 22 + j * 28, 10);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(1, "#000");
      g.fillStyle = grd;
      g.fillRect(i * 28 + 8, j * 28 + 8, 28, 28);
    }
  return new THREE.CanvasTexture(c);
}

/** Mottled liquid: bright blotches on a dark ground, tiling (used as both colour and glow). */
function acidTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = "#2a2a2a";
  g.fillRect(0, 0, 128, 128);
  let s = 4242;
  const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 60; i++) {
    const x = r() * 128;
    const y = r() * 128;
    const rad = 4 + r() * 14;
    const v = Math.floor(120 + r() * 135);
    for (const [ox, oy] of [
      [0, 0],
      [128, 0],
      [-128, 0],
      [0, 128],
      [0, -128],
    ]) {
      const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      grd.addColorStop(0, "rgba(" + v + "," + v + "," + v + ",0.9)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A soft round puff (dust; also the fire's glow on the floor). */
function puffTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** A tongue of flame: a teardrop, white-hot at its root, orange and fading at its tip. */
function flameTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.translate(32, 104);
  g.scale(1, 3.2);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  grd.addColorStop(0, "rgba(255,250,220,1)");
  grd.addColorStop(0.25, "rgba(255,200,90,0.95)");
  grd.addColorStop(0.6, "rgba(255,110,30,0.55)");
  grd.addColorStop(1, "rgba(255,60,10,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(0, 0, 30, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

/** Dressed stone blocks with dark joints (the crusher). */
function blockTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  let s = 913;
  const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  g.fillStyle = "#2a2724";
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 4; row++)
    for (let col = -1; col < 3; col++) {
      const v = Math.floor(120 + r() * 40);
      g.fillStyle = `rgb(${v},${v - 6},${v - 12})`;
      g.fillRect(col * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A rough boulder: an icosphere pushed in and out a little at every corner (same corner, same push). */
function boulderGeometry(r: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + 0.1 * (hash(v.x * 12.1 + v.y * 7.7 + v.z * 3.3) - 0.5) + 0.05 * (hash(v.x * 3.1 - v.z * 5.9) - 0.5);
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A crescent blade in the XY plane, edge down, `depth` thick along Z, centred on the origin. */
function bladeGeometry(depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const R = BLADE_HALF;
  const n = 18;
  // The cutting edge: a wide arc below; the back: a shallower arc above it.
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + 0.35 + (i / n) * (Math.PI - 0.7);
    const x = Math.cos(a) * R;
    const y = Math.sin(a) * R * 0.75;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const a = Math.PI + 0.35 + (i / n) * (Math.PI - 0.7);
    shape.lineTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.32 + 0.02);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

export function createTraps(scene: THREE.Scene, d: DungeonData, cellM: number, plans: TrapPlan[], opts: { lava?: boolean } = {}): Traps {
  const root = new THREE.Group();
  root.name = "traps";
  scene.add(root);

  const plateTex = plateTexture();
  const glowTex = holeGlowTexture();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.6, metalness: 0.4, emissive: 0xff2a10, emissiveMap: glowTex, emissiveIntensity: 0 });
  // Corridors are dark and have nothing for polished metal to mirror: keep the metal mostly matt and
  // give it (and the wood) a faint glow of its own, so a trap reads from a distance.
  const steel = new THREE.MeshStandardMaterial({ color: 0xcdd2d8, roughness: 0.35, metalness: 0.3, emissive: 0x2c2c2e });
  const iron = new THREE.MeshStandardMaterial({ color: 0x5a5a62, roughness: 0.55, metalness: 0.3, emissive: 0x141416 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.85, metalness: 0, emissive: 0x1c0e05 });
  const plateGeo = new THREE.BoxGeometry(PLATE_HALF * 2, 0.03, PLATE_HALF * 2);
  const spikeGeo = new THREE.ConeGeometry(0.04, SINK, 6).translate(0, SINK / 2, 0);
  const studGeo = new THREE.ConeGeometry(0.03, 0.09, 5).translate(0, LOG_R + 0.045, 0);
  const bracketGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
  const lava = !!opts.lava;
  const acidTex = acidTexture();
  const acidMat = new THREE.MeshStandardMaterial({
    color: lava ? 0x3a1206 : 0x10240a,
    map: acidTex,
    roughness: 0.25,
    metalness: 0,
    emissive: lava ? 0xff5a12 : 0x48e020,
    emissiveMap: acidTex,
    emissiveIntensity: 0.6,
  });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x4a4644, roughness: 0.9, metalness: 0 });
  const bubbleMat = new THREE.MeshStandardMaterial({ color: lava ? 0x6a2008 : 0x2a5a14, emissive: lava ? 0xff7a2a : 0x8aff4a, emissiveIntensity: 1.1, roughness: 0.2 });
  const bubbleGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const bladeGeo = bladeGeometry(0.03);
  const armGeo = new THREE.CylinderGeometry(0.025, 0.025, BLADE_ARM - 0.15, 6).translate(0, -(BLADE_ARM - 0.15) / 2, 0);
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10).rotateX(Math.PI / 2);
  // The hallway traps' stone, copper, fire and dust.
  const blockTex = blockTexture();
  const puffTex = puffTexture();
  const flameTex = flameTexture();
  const tongueMat = new THREE.SpriteMaterial({ map: flameTex, color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rock = new THREE.MeshStandardMaterial({ color: 0x9a9086, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x1e1b18 });
  const blockMat = new THREE.MeshStandardMaterial({ map: blockTex, color: 0xb0a898, roughness: 0.92, metalness: 0, emissive: 0x16140f });
  const copper = new THREE.MeshStandardMaterial({ color: 0xc87a48, roughness: 0.4, metalness: 0.45, emissive: 0x2a1006 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x030203 });
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff6a12, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.3, metalness: 0.4, emissive: 0x6a645a });
  const geos: THREE.BufferGeometry[] = [plateGeo, spikeGeo, studGeo, bracketGeo, bubbleGeo, bladeGeo, armGeo, hubGeo];
  const mats: THREE.Material[] = [plateMat, steel, iron, wood, acidMat, curbMat, bubbleMat, rock, blockMat, copper, dark, flameOuter, flameCore, wireMat, tongueMat];

  // Dust: a small pool of soft sprites that billow out and fade (a boulder landing or bursting, a
  // crusher slamming). Each has its own material (one shader), so each fades on its own.
  const PUFFS = 48;
  const puffs = Array.from({ length: PUFFS }, () => {
    const m = new THREE.SpriteMaterial({ map: puffTex, color: 0x8f877c, transparent: true, opacity: 0, depthWrite: false });
    mats.push(m);
    const sp = new THREE.Sprite(m);
    sp.visible = false;
    root.add(sp);
    return { sp, m, t: 0, life: 0, vx: 0, vy: 0, vz: 0, size: 1 };
  });
  let nextPuff = 0;
  /** `n` puffs around world point (x, y, z), spread `r` metres, billowing out and up. */
  const dust = (x: number, y: number, z: number, n: number, r: number, size = 0.9) => {
    for (let i = 0; i < n; i++) {
      const q = puffs[nextPuff];
      nextPuff = (nextPuff + 1) % PUFFS;
      const k = nextPuff + i * 0.37 + x * 0.13;
      const a = hash(k * 3.7) * Math.PI * 2;
      const d = hash(k * 9.1) * r;
      q.sp.position.set(x + Math.cos(a) * d, y + hash(k * 1.3) * 0.3, z + Math.sin(a) * d);
      const sp = 0.6 + hash(k * 5.3) * 1.2;
      q.vx = Math.cos(a) * sp;
      q.vz = Math.sin(a) * sp;
      q.vy = 0.25 + hash(k * 2.9) * 0.6;
      q.t = 0;
      q.life = 1.1 + hash(k * 4.1) * 0.9;
      q.size = size * (0.7 + hash(k * 6.6) * 0.6);
      q.sp.visible = true;
    }
  };
  // Fragments when a boulder bursts (one pool: one bursts at a time).
  const chunkGeo = new THREE.IcosahedronGeometry(0.22, 0);
  geos.push(chunkGeo);
  const chunks = Array.from({ length: 9 }, () => {
    const m = new THREE.Mesh(chunkGeo, rock);
    m.visible = false;
    m.castShadow = true;
    root.add(m);
    return { m, t: 0, vx: 0, vy: 0, vz: 0, floor: 0 };
  });
  const _w = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();

  interface Live {
    plan: TrapPlan;
    x: number;
    z: number;
    y: number;
    /** Spike plates: the moving spikes, the plate's own material, and whether this rise has struck. */
    spikes?: THREE.InstancedMesh;
    mat?: THREE.MeshStandardMaterial;
    struck: boolean;
    warned: boolean;
    rose: boolean;
    /** Seen its first frame: a plate already part-way through a beat then sits that beat out. */
    primed: boolean;
    /** Logs: the spinning part and the time left before it can strike again. */
    spinner?: THREE.Group;
    halfSpan: number;
    cool: number;
    /** Blades: the swinging arm, how far it swings, and which side of the bottom it was last frame. */
    pendulum?: THREE.Group;
    swing: number;
    side: number;
    /** Channels: the bubbles rising out of it. */
    bubbles?: THREE.InstancedMesh;
    /** The hallway traps' holder (along = local Z, across = local X) and the room overhead (m). */
    holder?: THREE.Group;
    ceil: number;
    /** Boulders: the rock, the wire, half the run (m), where the rock is along it and how fast,
     *  which way it rolls, its height and radius, and how far it has got. */
    boulder?: THREE.Mesh;
    wire?: THREE.Object3D;
    halfRun: number;
    s: number;
    v: number;
    dir: number;
    by: number;
    radius: number;
    stage: "armed" | "drop" | "roll" | "done";
    /** Crushers: the block, its resting height (its underside), and the monsters struck this slam. */
    block?: THREE.Group;
    rest: number;
    struckMobs: Set<number>;
    /** Burners: the jets (outer and core per nozzle), the nozzles, the floor's glow, where in their
     *  cycle and how long in it. */
    jets?: THREE.Mesh[];
    /** Burners: the flames standing up across the corridor once they roar. */
    tongues?: THREE.Sprite[];
    nozzleMat?: THREE.MeshStandardMaterial;
    glowMat?: THREE.MeshBasicMaterial;
    fire: "idle" | "fuse" | "burn" | "cool";
    fireT: number;
  }
  const live: Live[] = [];

  for (const plan of plans) {
    const x = (plan.gx - d.W / 2) * cellM;
    const z = (plan.gz - d.H / 2) * cellM;
    const y = plan.floor * cellM;
    const t: Live = {
      plan,
      x,
      z,
      y,
      struck: false,
      warned: false,
      rose: false,
      primed: false,
      halfSpan: cellM / 2,
      cool: 0,
      swing: 0,
      side: 0,
      ceil: Math.max(2.6, 3 * cellM - y),
      halfRun: 0,
      s: 0,
      v: 0,
      dir: 1,
      by: 0,
      radius: 0,
      stage: "armed",
      rest: 0,
      struckMobs: new Set(),
      fire: "idle",
      fireT: 0,
    };
    /** A holder at the trap, with the corridor along its local Z (turned for corridors along x). */
    const holderAt = () => {
      const h = new THREE.Group();
      h.position.set(x, y, z);
      if (plan.along === "x") h.rotation.y = Math.PI / 2;
      root.add(h);
      t.holder = h;
      return h;
    };
    if (plan.kind === "spikes") {
      // Each plate glows on its own (its own copy of the material).
      const mat = plateMat.clone();
      mats.push(mat);
      const plate = new THREE.Mesh(plateGeo, mat);
      plate.position.set(x, y + 0.016, z);
      plate.receiveShadow = true;
      root.add(plate);
      const spikes = new THREE.InstancedMesh(spikeGeo, steel, 16);
      let k = 0;
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const sx = (-1 + (i * 2 + 1) / 4) * PLATE_HALF * 0.88;
          const sz = (-1 + (j * 2 + 1) / 4) * PLATE_HALF * 0.88;
          spikes.setMatrixAt(k++, _m.makeTranslation(sx, 0, sz));
        }
      spikes.position.set(x, y - SINK, z);
      root.add(spikes);
      t.spikes = spikes;
      t.mat = mat;
    } else if (plan.kind === "blade") {
      // Built with the corridor along local Z and across along local X, then turned into place.
      const width = plan.span * cellM;
      const holder = new THREE.Group();
      holder.position.set(x, y, z);
      if (plan.along === "x") holder.rotation.y = Math.PI / 2;
      root.add(holder);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.12, 0.12), iron);
      geos.push(bar.geometry);
      bar.position.y = BLADE_PIVOT + 0.08;
      holder.add(bar);
      for (const sideX of [-1, 1]) {
        const b = new THREE.Mesh(bracketGeo, iron);
        b.position.set((sideX * (width - 0.12)) / 2, BLADE_PIVOT + 0.04, 0);
        holder.add(b);
      }
      const pendulum = new THREE.Group();
      pendulum.position.y = BLADE_PIVOT;
      holder.add(pendulum);
      pendulum.add(new THREE.Mesh(hubGeo, iron));
      pendulum.add(new THREE.Mesh(armGeo, iron));
      const blade = new THREE.Mesh(bladeGeo, steel);
      blade.position.y = -BLADE_ARM;
      blade.castShadow = true;
      pendulum.add(blade);
      t.pendulum = pendulum;
      // It swings until its tip comes within a hand of the wall.
      t.swing = Math.asin(Math.max(0.2, Math.min(0.9, (width / 2 - BLADE_HALF - 0.12) / BLADE_ARM)));
      t.halfSpan = width / 2;
    } else if (plan.kind === "channel") {
      // Also built along local Z and turned into place: the liquid, a stone curb at each end and,
      // in a long one, the stepping stone in the middle.
      const width = plan.span * cellM - 0.04;
      const len = plan.length === 2 ? ACID_LONG : ACID_SHORT;
      const holder = new THREE.Group();
      holder.position.set(x, y, z);
      if (plan.along === "x") holder.rotation.y = Math.PI / 2;
      root.add(holder);
      const mat = acidMat.clone();
      mats.push(mat);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(width, len).rotateX(-Math.PI / 2), mat);
      geos.push(pool.geometry);
      pool.position.y = 0.025;
      holder.add(pool);
      const curbGeo = new THREE.BoxGeometry(width, 0.06, 0.1);
      geos.push(curbGeo);
      for (const end of [-1, 1]) {
        const c = new THREE.Mesh(curbGeo, curbMat);
        c.position.set(0, 0.03, (end * (len + 0.1)) / 2);
        c.receiveShadow = true;
        holder.add(c);
      }
      if (plan.length === 2) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, STONE_LONG), curbMat);
        geos.push(stone.geometry);
        stone.position.y = 0.03;
        stone.receiveShadow = true;
        holder.add(stone);
      }
      const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, 10 * plan.span * plan.length);
      holder.add(bubbles);
      t.bubbles = bubbles;
      t.mat = mat;
      t.halfSpan = width / 2;
    } else if (plan.kind === "boulder") {
      // A chute in the vault at each end (it drops from the one behind him), the boulder hidden in
      // it, and the wire across the middle between two iron eyes.
      const width = plan.span * cellM;
      const holder = holderAt();
      t.halfSpan = width / 2;
      t.radius = Math.min(width / 2 - 0.08, (t.ceil - 0.3) / 2);
      t.halfRun = (plan.length / 2 + 0.5) * cellM;
      const rockGeo = boulderGeometry(t.radius);
      geos.push(rockGeo);
      const b = new THREE.Mesh(rockGeo, rock);
      b.castShadow = true;
      b.visible = false;
      holder.add(b);
      t.boulder = b;
      const holeGeo = new THREE.CircleGeometry(t.radius + 0.12, 20).rotateX(Math.PI / 2);
      const ringGeo = new THREE.TorusGeometry(t.radius + 0.14, 0.07, 6, 24).rotateX(Math.PI / 2);
      geos.push(holeGeo, ringGeo);
      for (const end of [-1, 1]) {
        const hole = new THREE.Mesh(holeGeo, dark);
        hole.position.set(0, t.ceil - 0.02, end * (t.halfRun - t.radius));
        const ring = new THREE.Mesh(ringGeo, iron);
        ring.position.copy(hole.position);
        holder.add(hole, ring);
      }
      const wire = new THREE.Group();
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, width - 0.1, 4).rotateZ(Math.PI / 2), wireMat);
      geos.push(thread.geometry);
      wire.add(thread);
      for (const sideX of [-1, 1]) {
        const eye = new THREE.Mesh(bracketGeo, iron);
        eye.scale.set(0.5, 0.3, 0.5);
        eye.position.x = (sideX * (width - 0.06)) / 2;
        wire.add(eye);
      }
      wire.position.y = WIRE_Y;
      holder.add(wire);
      t.wire = wire;
    } else if (plan.kind === "crusher") {
      // The block between four iron guides (two on each wall), hung on two chains from the vault.
      const width = plan.span * cellM - 0.1;
      const holder = holderAt();
      t.halfSpan = width / 2;
      t.rest = Math.min(3.2, t.ceil - CRUSH_H - 0.15);
      const block = new THREE.Group();
      const stone = new THREE.Mesh(new THREE.BoxGeometry(width, CRUSH_H, CRUSH_HALF * 2).translate(0, CRUSH_H / 2, 0), blockMat);
      stone.castShadow = true;
      stone.receiveShadow = true;
      block.add(stone);
      const bandGeo = new THREE.BoxGeometry(width + 0.04, 0.1, CRUSH_HALF * 2 + 0.04);
      geos.push(stone.geometry, bandGeo);
      for (const yb of [0.08, CRUSH_H - 0.08]) {
        const band = new THREE.Mesh(bandGeo, iron);
        band.position.y = yb;
        block.add(band);
      }
      // The chains run from its top to the vault: long while it is down, short while it is up.
      const chainGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0);
      geos.push(chainGeo);
      for (const sideX of [-0.3, 0.3]) {
        const chain = new THREE.Mesh(chainGeo, iron);
        chain.position.set(sideX * width, CRUSH_H, 0);
        chain.name = "chain";
        block.add(chain);
      }
      block.position.y = t.rest;
      holder.add(block);
      t.block = block;
      const guideGeo = new THREE.BoxGeometry(0.1, t.ceil, 0.1).translate(0, t.ceil / 2, 0);
      geos.push(guideGeo);
      for (const sideX of [-1, 1])
        for (const end of [-1, 1]) {
          const g = new THREE.Mesh(guideGeo, iron);
          g.position.set((sideX * (width + 0.06)) / 2, 0, end * (CRUSH_HALF + 0.06));
          holder.add(g);
        }
    } else if (plan.kind === "flames") {
      // A copper pipe along the foot of each wall with nozzles pointing across, a feed pipe up the
      // wall, and the jets (hidden until they light).
      const width = plan.span * cellM - 0.04;
      const len = plan.length * cellM - 0.3;
      const holder = holderAt();
      t.halfSpan = width / 2;
      const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, len + 0.3, 10).rotateX(Math.PI / 2);
      const feedGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8).translate(0, 0.8, 0);
      const nozzleGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.12, 8).rotateZ(Math.PI / 2);
      const jetLen = width * 0.62;
      const outerGeo = new THREE.ConeGeometry(0.26, jetLen, 10, 1, true).translate(0, -jetLen / 2, 0);
      const coreGeo = new THREE.ConeGeometry(0.11, jetLen * 0.8, 8, 1, true).translate(0, (-jetLen * 0.8) / 2, 0);
      geos.push(pipeGeo, feedGeo, nozzleGeo, outerGeo, coreGeo);
      const nozzleMat = copper.clone();
      mats.push(nozzleMat);
      t.nozzleMat = nozzleMat;
      const jets: THREE.Mesh[] = [];
      const count = Math.max(3, Math.round(len / 0.4));
      for (const sideX of [-1, 1]) {
        const wx = sideX * (width / 2 - 0.08);
        const pipe = new THREE.Mesh(pipeGeo, copper);
        pipe.position.set(wx, 0.12, 0);
        const feed = new THREE.Mesh(feedGeo, copper);
        feed.position.set(wx, 0.12, -(len + 0.3) / 2);
        holder.add(pipe, feed);
        for (let i = 0; i < count; i++) {
          const along = (-0.5 + (i + 0.5) / count) * len;
          const n = new THREE.Mesh(nozzleGeo, nozzleMat);
          n.position.set(wx - sideX * 0.08, 0.16, along);
          holder.add(n);
          // A cone with its tip at the nozzle, opening across the corridor toward the far wall
          // (the cone's base hangs below its tip: a quarter turn lays it across).
          for (const core of [false, true]) {
            const jet = new THREE.Mesh(core ? coreGeo : outerGeo, core ? flameCore : flameOuter);
            jet.rotation.z = sideX < 0 ? Math.PI / 2 : -Math.PI / 2;
            jet.position.set(wx - sideX * 0.12, core ? 0.2 : 0.24, along);
            jet.visible = false;
            jet.frustumCulled = false;
            holder.add(jet);
            jets.push(jet);
          }
        }
      }
      t.jets = jets;
      // Tongues of fire standing up wall to wall over the whole stretch (the hallway's burners).
      const tongues: THREE.Sprite[] = [];
      const cols = plan.span * 2 + 1;
      const rowsN = Math.max(2, plan.length * 3);
      for (let r = 0; r < rowsN; r++)
        for (let k = 0; k < cols; k++) {
          const sp = new THREE.Sprite(tongueMat);
          sp.center.set(0.5, 0.08);
          sp.position.set((-0.5 + (k + 0.5) / cols) * (width - 0.3), 0.05, (-0.5 + (r + 0.5) / rowsN) * len);
          sp.visible = false;
          holder.add(sp);
          tongues.push(sp);
        }
      t.tongues = tongues;
      // The fire lights the floor under it (an additive glow, no extra light for every shader).
      const glowMat = new THREE.MeshBasicMaterial({ map: puffTex, color: 0xff6a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      mats.push(glowMat);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.6, len * 1.8).rotateX(-Math.PI / 2), glowMat);
      geos.push(glow.geometry);
      glow.position.y = 0.03;
      holder.add(glow);
      t.glowMat = glowMat;
    } else {
      // The log lies across the corridor, from wall to wall, turning about its own length.
      const across = plan.along === "x" ? "z" : "x";
      const len = plan.span * cellM - 0.08;
      const holder = new THREE.Group();
      holder.position.set(x, y + LOG_Y, z);
      root.add(holder);
      const spinner = new THREE.Group();
      holder.add(spinner);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(LOG_R, LOG_R, len, 12), wood);
      geos.push(log.geometry);
      // Cylinders stand along y: lay it along the axis across the corridor.
      if (across === "x") log.rotation.z = Math.PI / 2;
      else log.rotation.x = Math.PI / 2;
      spinner.add(log);
      const rings = 6 * plan.span + 1;
      const studs = new THREE.InstancedMesh(studGeo, steel, rings * 6);
      let k = 0;
      for (let r = 0; r < rings; r++) {
        const along = (-0.5 + (r + 0.5) / rings) * (len - 0.1);
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2 + (r % 2) * (Math.PI / 6);
          // A stud points out from the log's axis: turned about the axis, set along it.
          if (across === "x") {
            _e.set(a, 0, 0);
            _q.setFromEuler(_e);
            _m.compose(new THREE.Vector3(along, 0, 0), _q, new THREE.Vector3(1, 1, 1));
          } else {
            _e.set(0, 0, a);
            _q.setFromEuler(_e);
            _m.compose(new THREE.Vector3(0, 0, along), _q, new THREE.Vector3(1, 1, 1));
          }
          studs.setMatrixAt(k++, _m);
        }
      }
      spinner.add(studs);
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(bracketGeo, iron);
        if (across === "x") b.position.set((side * len) / 2, 0.04, 0);
        else b.position.set(0, 0.04, (side * len) / 2);
        holder.add(b);
      }
      t.spinner = spinner;
      t.halfSpan = len / 2;
    }
    live.push(t);
  }

  // Placed now, so the first frame's sums use where the holders really are.
  root.updateMatrixWorld(true);

  /** A point in trap `t`'s frame (`a` along the corridor, `c` across, `h` up) to world metres. */
  const toWorld = (t: Live, c: number, h: number, a: number) => {
    _w.set(c, h, a);
    return t.holder ? t.holder.localToWorld(_w) : _w.set(t.x + c, t.y + h, t.z + a);
  };
  /** Where he (or a monster) is in trap `t`'s frame: along and across the corridor. */
  const local = (t: Live, wx: number, wz: number) => {
    const dx = wx - t.x;
    const dz = wz - t.z;
    return t.plan.along === "x" ? { a: dx, c: -dz } : { a: dz, c: dx };
  };
  /** The wire snaps: the boulder drops from the chute behind him (he was going `dir` along). */
  const release = (t: Live, dir: number, sounds: TrapSounds | null) => {
    t.stage = "drop";
    t.dir = dir;
    t.s = -dir * (t.halfRun - t.radius);
    t.by = t.ceil + t.radius;
    t.v = 0;
    t.struck = false;
    if (t.wire) t.wire.visible = false;
    if (t.boulder) {
      t.boulder.visible = true;
      t.boulder.position.set(0, t.by, t.s);
    }
    sounds?.trapClick();
  };

  /** The hallway traps' rules, each frame. */
  const hallway = (t: Live, index: number, dt: number, time: number, p: TrapPlayer, sounds: TrapSounds | null, world: TrapWorld | undefined, near: boolean, hits: TrapHit[]) => {
    const me = local(t, p.x, p.z);
    const was = local(t, p.prevX, p.prevZ);
    const dist = Math.hypot(p.x - t.x, p.z - t.z);
    if (t.plan.kind === "boulder") {
      if (t.stage === "armed") {
        // Over the wire this frame (or standing on it), feet low enough to catch it.
        const crossed = (me.a < 0) !== (was.a < 0) || Math.abs(me.a) < 0.06;
        if (p.alive && crossed && Math.abs(me.c) < t.halfSpan && p.air < WIRE_CLEAR) {
          const dir = Math.sign(me.a - was.a) || -Math.sign(me.a) || 1;
          release(t, dir, near ? sounds : null);
          world?.onTrigger?.(index, dir);
        }
        return;
      }
      if (t.stage === "done" || !t.boulder) return;
      const b = t.boulder;
      if (t.stage === "drop") {
        t.v += BOULDER_G * dt;
        t.by -= t.v * dt;
        if (t.by <= t.radius) {
          t.by = t.radius;
          t.stage = "roll";
          t.v = 0;
          const at = toWorld(t, 0, 0.1, t.s);
          dust(at.x, at.y, at.z, 10, t.radius, 1.1);
          if (dist < 14) {
            sounds?.slam();
            sounds?.rumble((t.halfRun * 2) / BOULDER_TOP + 0.6);
            world?.shake(0.6 * (1 - dist / 14));
          }
        }
        b.position.set(0, t.by, t.s);
        return;
      }
      // Rolling: faster and faster to its top pace, turning over as it goes.
      t.v = Math.min(BOULDER_TOP, t.v + BOULDER_ACCEL * dt);
      t.s += t.dir * t.v * dt;
      b.position.set(0, t.radius, t.s);
      b.rotation.x += (t.dir * t.v * dt) / t.radius;
      if (dist < 10 && Math.floor(time * 6) !== Math.floor((time - dt) * 6)) world?.shake(0.06 * (1 - dist / 10));
      // Whatever is in its way: him once, monsters flattened.
      const reach = t.radius * 0.85 + 0.3;
      if (p.alive && !t.struck && Math.abs(me.a - t.s) < reach && Math.abs(me.c) < t.halfSpan + 0.2 && p.air < t.radius * 1.6) {
        t.struck = true;
        hits.push({ damage: BOULDER_DAMAGE, cause: "Flattened by a rolling boulder" });
        world?.shake(0.9);
        sounds?.thud();
      }
      if (world?.hitMob) {
        const fwd = toWorld(t, 0, 0, 1).clone().sub(toWorld(t, 0, 0, 0));
        for (const m of world.mobs) {
          if (m.dead || t.struckMobs.has(m.id) || Math.abs(m.wy - t.y) > 1.2) continue;
          const o = local(t, m.wx, m.wz);
          if (Math.abs(o.a - t.s) < t.radius + m.radius && Math.abs(o.c) < t.halfSpan + 0.2) {
            t.struckMobs.add(m.id);
            world.hitMob(m.id, fwd.x * t.dir, fwd.z * t.dir, BOULDER_MOB);
          }
        }
      }
      // The far end: it bursts apart.
      if (t.dir * t.s >= t.halfRun - t.radius * 0.5) {
        t.stage = "done";
        b.visible = false;
        const at = toWorld(t, 0, t.radius, t.s).clone();
        const ahead = toWorld(t, 0, 0, t.s + t.dir).clone().sub(toWorld(t, 0, 0, t.s));
        dust(at.x, t.y + 0.2, at.z, 16, t.radius * 1.2, 1.3);
        chunks.forEach((c, k) => {
          const a = (k / chunks.length) * Math.PI * 2;
          c.m.visible = true;
          c.m.position.set(at.x + Math.cos(a) * t.radius * 0.5, at.y, at.z + Math.sin(a) * t.radius * 0.5);
          c.vx = ahead.x * 3 + Math.cos(a) * 2.2;
          c.vz = ahead.z * 3 + Math.sin(a) * 2.2;
          c.vy = 2 + hash(k * 7.7) * 3;
          c.t = 0;
          c.floor = t.y;
          c.m.scale.setScalar(0.6 + hash(k * 3.3) * 0.9);
        });
        if (dist < 18) {
          sounds?.smash();
          world?.shake(0.5 * (1 - dist / 18));
        }
      }
      return;
    }

    if (t.plan.kind === "crusher" && t.block) {
      const at = (time + t.plan.phase * CRUSH_PERIOD) % CRUSH_PERIOD;
      let bottom: number;
      if (at < CRUSH_UP) {
        const u = at / CRUSH_UP;
        bottom = t.rest * u * u * (3 - 2 * u);
      } else if (at < CRUSH_WARN) bottom = t.rest;
      else if (at < CRUSH_SLAM) bottom = t.rest + 0.025 * Math.sin(at * 90);
      else if (at < CRUSH_DOWN) {
        const u = (at - CRUSH_SLAM) / (CRUSH_DOWN - CRUSH_SLAM);
        bottom = t.rest * (1 - u * u);
      } else bottom = 0;
      t.block.position.y = bottom;
      for (const ch of t.block.children) if (ch.name === "chain") ch.scale.y = Math.max(0.01, t.ceil - bottom - CRUSH_H);
      const prevAt = (time - dt + t.plan.phase * CRUSH_PERIOD) % CRUSH_PERIOD;
      const crossedT = (mark: number) => prevAt < mark && at >= mark;
      if (crossedT(CRUSH_WARN)) {
        t.struck = false;
        t.struckMobs.clear();
        if (near) sounds?.rattle();
        for (const e of [-1, 1]) {
          const w = toWorld(t, 0, t.rest - 0.05, e * CRUSH_HALF);
          dust(w.x, w.y, w.z, 2, 0.4, 0.5);
        }
      }
      const slamming = at >= CRUSH_SLAM && at < CRUSH_DOWN + 0.05;
      if (crossedT(CRUSH_DOWN)) {
        const w = toWorld(t, 0, 0.1, 0);
        dust(w.x, w.y, w.z, 12, t.halfSpan + 0.4, 1.1);
        if (dist < 12) {
          sounds?.slam();
          world?.shake(0.55 * (1 - dist / 12));
        }
      }
      const under = Math.abs(me.a) < CRUSH_HALF + 0.25 && Math.abs(me.c) < t.halfSpan + 0.1;
      if (p.alive && under) {
        if (slamming && bottom < 1.8 && !t.struck) {
          t.struck = true;
          const side = Math.sign(me.a) || Math.sign(was.a) || 1;
          const out = toWorld(t, me.c, 0, side * (CRUSH_HALF + 0.55));
          hits.push({ damage: CRUSH_DAMAGE, cause: "Crushed under a falling block", push: { x: out.x, z: out.z } });
        } else if (!slamming && bottom < 1.5) {
          // The block is down (or not up yet): stone, not air. Back the way he came.
          const side = Math.sign(was.a) || Math.sign(me.a) || 1;
          const out = toWorld(t, me.c, 0, side * (CRUSH_HALF + 0.3));
          hits.push({ damage: 0, cause: "", push: { x: out.x, z: out.z } });
        }
      }
      if (slamming && bottom < 1.8 && world?.hitMob) {
        for (const m of world.mobs) {
          if (m.dead || t.struckMobs.has(m.id) || Math.abs(m.wy - t.y) > 1.2) continue;
          const o = local(t, m.wx, m.wz);
          if (Math.abs(o.a) < CRUSH_HALF + m.radius && Math.abs(o.c) < t.halfSpan + 0.1) {
            t.struckMobs.add(m.id);
            world.hitMob(m.id, 0, 0, CRUSH_MOB);
          }
        }
      }
      return;
    }

    if (t.plan.kind === "flames" && t.jets && t.nozzleMat && t.glowMat) {
      const half = (t.plan.length * cellM) / 2;
      // Arming: he walks up to either end (or into them).
      if (t.fire === "idle" && p.alive && Math.abs(me.a) < half + FLAME_REACH && Math.abs(me.c) < t.halfSpan + 0.3) {
        t.fire = "fuse";
        t.fireT = 0;
        world?.onTrigger?.(index, 1);
      }
      if (t.fire !== "idle") t.fireT += dt;
      if (t.fire === "fuse" && t.fireT === dt && near) sounds?.fuse();
      if (t.fire === "fuse" && t.fireT >= FLAME_FUSE) {
        t.fire = "burn";
        t.fireT = 0;
        if (dist < 14) sounds?.roar(FLAME_BURN);
      } else if (t.fire === "burn" && t.fireT >= FLAME_BURN) {
        t.fire = "cool";
        t.fireT = 0;
      } else if (t.fire === "cool" && t.fireT >= FLAME_COOL) {
        t.fire = "idle";
        t.fireT = 0;
      }
      // The look: nozzles glow on the fuse with a sputter of pilot flame; then the jets roar out,
      // flickering, and die back; the floor glows under them.
      const fuse = t.fire === "fuse" ? t.fireT / FLAME_FUSE : 0;
      const burn = t.fire === "burn" ? Math.min(1, t.fireT / 0.12, (FLAME_BURN - t.fireT) / 0.25) : 0;
      t.nozzleMat.emissive.setRGB(0.16 + 0.9 * Math.max(fuse, burn), 0.06 + 0.25 * Math.max(fuse, burn), 0.02);
      t.glowMat.opacity = 0.75 * burn + 0.12 * fuse;
      t.jets.forEach((j, k) => {
        const flick = 0.82 + 0.3 * hash(Math.floor(time * 24) * 1.7 + k * 13.1);
        const len = burn > 0 ? burn * flick : fuse > 0 ? 0.1 + 0.06 * hash(Math.floor(time * 30) + k) : 0;
        j.visible = len > 0.01;
        j.scale.set(0.8 + 0.4 * flick, len, 0.8 + 0.4 * flick);
      });
      t.tongues?.forEach((sp, k) => {
        const flick = 0.75 + 0.45 * hash(Math.floor(time * 18) * 2.3 + k * 7.9);
        sp.visible = burn > 0.02;
        sp.scale.set(0.75 * burn * (0.8 + 0.3 * flick), 1.9 * burn * flick, 1);
      });
      // In the fire: a burn every tick, him and monsters alike.
      t.cool = Math.max(0, t.cool - dt);
      if (burn > 0.5 && t.cool <= 0) {
        t.cool = FLAME_TICK;
        if (p.alive && Math.abs(me.a) < half + 0.1 && Math.abs(me.c) < t.halfSpan) {
          hits.push({ damage: FLAME_DAMAGE, cause: "Burned alive by a flame trap" });
          if (near) sounds?.sizzle();
        }
        if (world?.hitMob) {
          for (const m of world.mobs) {
            if (m.dead || Math.abs(m.wy - t.y) > 1.2) continue;
            const o = local(t, m.wx, m.wz);
            if (Math.abs(o.a) < half + m.radius * 0.5 && Math.abs(o.c) < t.halfSpan) world.hitMob(m.id, 0, 0, FLAME_DAMAGE);
          }
        }
      }
    }
  };

  return {
    plans,
    update(dt, time, p, sounds, world) {
      const hits: TrapHit[] = [];
      for (const t of live) {
        const near = Math.hypot(p.x - t.x, p.z - t.z) < HEAR;
        if (t.spikes && t.mat) {
          const at = (time + t.plan.phase * PERIOD) % PERIOD;
          if (!t.primed) {
            t.primed = true;
            if (at >= WARN_AT) t.warned = t.rose = t.struck = true;
          }
          let lift: number;
          if (at < WARN_AT) lift = -SINK;
          else if (at < RISE_AT) lift = -SINK + 0.03 + 0.015 * Math.sin(at * 70);
          else if (at < UP_AT) lift = -SINK + SINK * ((at - RISE_AT) / (UP_AT - RISE_AT));
          else if (at < DOWN_AT) lift = 0;
          else lift = -SINK * ((at - DOWN_AT) / (PERIOD - DOWN_AT));
          t.spikes.position.y = t.y + lift;
          // The holes glow while it is about to strike, brightest just before.
          t.mat.emissiveIntensity = at >= WARN_AT && at < UP_AT ? 0.6 + 1.6 * ((at - WARN_AT) / (UP_AT - WARN_AT)) : at < DOWN_AT && at >= UP_AT ? 0.5 : 0;
          if (at < WARN_AT) {
            t.warned = t.rose = t.struck = false;
          } else {
            if (!t.warned) {
              t.warned = true;
              if (near) sounds?.trapClick();
            }
            if (at >= RISE_AT && !t.rose) {
              t.rose = true;
              if (near) sounds?.spikes();
            }
          }
          const up = lift > -SINK * 0.45;
          const on = Math.abs(p.x - t.x) < PLATE_HALF && Math.abs(p.z - t.z) < PLATE_HALF && p.air < 0.12;
          if (p.alive && up && on && !t.struck) {
            t.struck = true;
            hits.push({ damage: SPIKE_DAMAGE, cause: "Impaled on a spike trap" });
          }
        } else if (t.spinner) {
          const axis = t.plan.along === "x" ? "z" : "x";
          t.spinner.rotation[axis] += dt * 6;
          t.cool = Math.max(0, t.cool - dt);
          // Distance along the corridor from the log, now and last frame.
          const a = t.plan.along === "x" ? p.x - t.x : p.z - t.z;
          const a0 = t.plan.along === "x" ? p.prevX - t.x : p.prevZ - t.z;
          const across = t.plan.along === "x" ? p.z - t.z : p.x - t.x;
          if (p.alive && t.cool <= 0 && Math.abs(a) < LOG_BAND && Math.abs(across) < t.halfSpan + 0.2 && p.air < LOG_CLEAR) {
            t.cool = 0.8;
            // Thrown back to the side he came from.
            const side = Math.sign(a0) || Math.sign(a) || -1;
            const back = t.plan.along === "x" ? { x: t.x + side * (LOG_BAND + 0.2), z: p.z } : { x: p.x, z: t.z + side * (LOG_BAND + 0.2) };
            if (near) sounds?.thud();
            hits.push({ damage: LOG_DAMAGE, cause: "Caught by a spiked log", push: back });
          }
        } else if (t.pendulum) {
          // A pendulum's swing: quickest through the bottom, slowing at either wall.
          const angle = t.swing * Math.sin(((time / BLADE_PERIOD + t.plan.phase) % 1) * Math.PI * 2);
          t.pendulum.rotation.z = angle;
          const side = Math.sign(angle);
          if (side !== 0 && side !== t.side) {
            if (t.side !== 0 && near) sounds?.swish();
            t.side = side;
          }
          t.cool = Math.max(0, t.cool - dt);
          // In the holder's frame: along is local Z, across local X (turned a quarter for x corridors).
          const dx = p.x - t.x;
          const dz = p.z - t.z;
          const a = t.plan.along === "x" ? dx : dz;
          const a0 = t.plan.along === "x" ? p.prevX - t.x : p.prevZ - t.z;
          const across = t.plan.along === "x" ? -dz : dx;
          // Turning about local Z by `angle` carries the blade to x = ARM * sin(angle).
          const bladeX = BLADE_ARM * Math.sin(angle);
          if (p.alive && t.cool <= 0 && Math.abs(a) < BLADE_BAND && Math.abs(across - bladeX) < BLADE_HIT) {
            t.cool = 1;
            const back = Math.sign(a0) || Math.sign(a) || -1;
            const to = t.plan.along === "x" ? { x: t.x + back * (BLADE_BAND + 0.35), z: p.z } : { x: p.x, z: t.z + back * (BLADE_BAND + 0.35) };
            if (near) sounds?.thud();
            hits.push({ damage: BLADE_DAMAGE, cause: "Cut down by a swinging blade", push: to });
          }
        } else if (t.plan.kind === "boulder" || t.plan.kind === "crusher" || t.plan.kind === "flames") {
          hallway(t, live.indexOf(t), dt, time, p, sounds, world, near, hits);
        } else if (t.bubbles && t.mat) {
          const len = t.plan.length === 2 ? ACID_LONG : ACID_SHORT;
          // The surface creeps and its glow breathes; bubbles swell and pop, each on its own clock.
          if (t.mat.map) t.mat.map.offset.set(time * 0.03, time * 0.05);
          t.mat.emissiveIntensity = 0.55 + 0.15 * Math.sin(time * 2.3 + t.plan.phase * 6);
          const n = t.bubbles.count;
          for (let i = 0; i < n; i++) {
            const k = (i * 0.618 + t.plan.phase) % 1;
            const rate = 0.5 + k * 0.6;
            const clock = time * rate + k * 7;
            const life = clock % 1;
            // Where this bubble comes up this time round (a new spot each cycle), -1..1 each way.
            const cycle = Math.floor(clock);
            const hx = hash(i * 12.9898 + cycle * 78.233) * 2 - 1;
            const hz = hash(i * 39.346 + cycle * 11.135) * 2 - 1;
            let bz = hz * (len / 2 - 0.08);
            if (t.plan.length === 2 && Math.abs(bz) < STONE_LONG / 2 + 0.06) bz = (hz < 0 ? -1 : 1) * (STONE_LONG / 2 + 0.08 + Math.abs(hz) * 0.5);
            const sc = life < 0.8 ? life / 0.8 : 0;
            _m.makeScale(sc, sc * 0.7, sc);
            _m.setPosition(hx * (t.halfSpan - 0.08), 0.025, bz);
            t.bubbles.setMatrixAt(i, _m);
          }
          t.bubbles.instanceMatrix.needsUpdate = true;
          t.cool = Math.max(0, t.cool - dt);
          const a = t.plan.along === "x" ? p.x - t.x : p.z - t.z;
          const across = t.plan.along === "x" ? p.z - t.z : p.x - t.x;
          // A boot on the curb, or a take-off from its very edge, does not count.
          const inside = Math.abs(a) < len / 2 - 0.05 && Math.abs(across) < t.halfSpan && !(t.plan.length === 2 && Math.abs(a) < STONE_LONG / 2);
          if (p.alive && inside && p.air < 0.03 && t.cool <= 0) {
            t.cool = ACID_TICK;
            if (near) sounds?.sizzle();
            hits.push({ damage: ACID_DAMAGE, cause: lava ? "Burned up in a lava channel" : "Dissolved in an acid channel" });
          }
        }
      }
      // Dust billows and fades; boulder fragments tumble, bounce once or twice and sink away.
      for (const q of puffs) {
        if (!q.sp.visible) continue;
        q.t += dt;
        const u = q.t / q.life;
        if (u >= 1) {
          q.sp.visible = false;
          continue;
        }
        const drag = Math.exp(-dt * 2.5);
        q.vx *= drag;
        q.vz *= drag;
        q.sp.position.set(q.sp.position.x + q.vx * dt, q.sp.position.y + q.vy * dt, q.sp.position.z + q.vz * dt);
        q.sp.scale.setScalar(q.size * (0.6 + u * 1.2));
        q.m.opacity = 0.55 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85);
      }
      for (const c of chunks) {
        if (!c.m.visible) continue;
        c.t += dt;
        c.vy -= 9.8 * dt;
        c.m.position.x += c.vx * dt;
        c.m.position.y += c.vy * dt;
        c.m.position.z += c.vz * dt;
        c.m.rotation.x += dt * 7;
        c.m.rotation.z += dt * 5;
        if (c.m.position.y < c.floor + 0.12) {
          c.m.position.y = c.floor + 0.12;
          c.vy = Math.abs(c.vy) * 0.3;
          c.vx *= 0.5;
          c.vz *= 0.5;
        }
        if (c.t > 2.2) c.m.position.y -= (c.t - 2.2) * 0.4 * dt * 10;
        if (c.t > 3.2) c.m.visible = false;
      }
      return hits;
    },
    trigger(index, dir) {
      const t = live[index];
      if (!t) return;
      if (t.plan.kind === "boulder" && t.stage === "armed") release(t, dir || 1, null);
      else if (t.plan.kind === "flames" && t.fire === "idle") {
        t.fire = "fuse";
        t.fireT = 0;
      }
    },
    dispose() {
      scene.remove(root);
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      plateTex.dispose();
      glowTex.dispose();
      acidTex.dispose();
      blockTex.dispose();
      puffTex.dispose();
      flameTex.dispose();
    },
  };
}
