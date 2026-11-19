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
// `planTraps` is pure; `createTraps` draws them and reports what caught him each frame.
import * as THREE from "three";
import { floorAt } from "./dungeon/floors";
import { FLOOR, type DungeonData } from "./dungeon/generator";
import type { Piece } from "./dungeon/rooms";

export const TRAP_COUNT = 5;

export type TrapKind = "spikes" | "log" | "blade" | "channel";

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
  /** A channel's length along the corridor (cells: 1 is one jump, 2 has a stepping stone). */
  length: number;
}

/** Widest corridor a log is laid across (cells). */
const MAX_LOG_SPAN = 3;

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
      // Two cells long: its middle on the edge between this row and the next.
      if (row(2)) longCrossings.push({ kind: "channel", gx: lx + ax * 0.5, gz: lz + az * 0.5, along, floor: f, phase: 0, span, length: 2 });
    }
  }

  const picked: TrapPlan[] = [];
  const room = (p: TrapPlan, gap: number) => picked.every((q) => Math.hypot(q.gx - p.gx, q.gz - p.gz) >= gap);
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
    if (kind === "channel" && rand() < 0.5 && take(longCrossings, kind)) return true;
    return take(crossings, kind);
  };
  // One of each crossing kind, then two more drawn at random (plates the likeliest), shuffled so no
  // kind always comes first. Where a kind finds no room, a spike plate takes its place.
  const extra: TrapKind[] = ["spikes", "spikes", "spikes", "blade", "log", "channel"];
  const order: TrapKind[] = ["log", "blade", "channel", extra[Math.floor(rand() * extra.length)], extra[Math.floor(rand() * extra.length)]];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
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
}

export interface Traps {
  plans: TrapPlan[];
  update: (dt: number, time: number, player: TrapPlayer, sounds: TrapSounds | null) => TrapHit[];
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
  const geos: THREE.BufferGeometry[] = [plateGeo, spikeGeo, studGeo, bracketGeo, bubbleGeo, bladeGeo, armGeo, hubGeo];
  const mats: THREE.Material[] = [plateMat, steel, iron, wood, acidMat, curbMat, bubbleMat];
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
  }
  const live: Live[] = [];

  for (const plan of plans) {
    const x = (plan.gx - d.W / 2) * cellM;
    const z = (plan.gz - d.H / 2) * cellM;
    const y = plan.floor * cellM;
    const t: Live = { plan, x, z, y, struck: false, warned: false, rose: false, primed: false, halfSpan: cellM / 2, cool: 0, swing: 0, side: 0 };
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

  return {
    plans,
    update(dt, time, p, sounds) {
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
      return hits;
    },
    dispose() {
      scene.remove(root);
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      plateTex.dispose();
      glowTex.dispose();
      acidTex.dispose();
    },
  };
}
