// Traps in the corridors: five a floor, placed from the seed (the same floor always has the same
// traps, every life).
// - Spike plates: an iron grate whose holes glow red and click, then steel spikes shoot up and sink
//   again, each plate on its own beat. Standing on it as they rise hurts.
// - Spiked logs: a log studded with spikes spinning at shin height across a narrow corridor. He has
//   to jump it (a running jump clears it easily, a walking one just); touching it hurts and throws
//   him back the way he came.
// `planTraps` is pure; `createTraps` draws them and reports what caught him each frame.
import * as THREE from "three";
import { floorAt } from "./dungeon/floors";
import { FLOOR, type DungeonData } from "./dungeon/generator";
import type { Piece } from "./dungeon/rooms";

export const TRAP_COUNT = 5;
const MAX_LOGS = 2;

export type TrapKind = "spikes" | "log";

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
  /** A log's length across the corridor, wall to wall (cells; 1 for a plate). */
  span: number;
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
  const logs: TrapPlan[] = [];
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
      plates.push({ kind: "spikes", gx: x + 0.5, gz: z + 0.5, along, floor: f, phase: 0, span: 1 });
      // A log is laid across the whole corridor, wall to wall (so it cannot be walked round), from
      // the first cell of the crossing: every cell of it usable, with flat floor to land on either way.
      const [cx, cz] = along === "x" ? [0, 1] : [1, 0];
      const [ax, az] = along === "x" ? [1, 0] : [0, 1];
      if (isFloor(x - cx, z - cz)) continue;
      let span = 1;
      while (span <= MAX_LOG_SPAN && isFloor(x + cx * span, z + cz * span)) span++;
      if (span > MAX_LOG_SPAN) continue;
      let ok = true;
      for (let k = 0; k < span && ok; k++) {
        const qx = x + cx * k;
        const qz = z + cz * k;
        ok = usable(qx, qz, f) && usable(qx - ax, qz - az, f) && usable(qx + ax, qz + az, f);
      }
      if (!ok) continue;
      const lx = x + 0.5 + (cx * (span - 1)) / 2;
      const lz = z + 0.5 + (cz * (span - 1)) / 2;
      if (Math.hypot(lx - start.x, lz - start.z) < 7) continue;
      logs.push({ kind: "log", gx: lx, gz: lz, along, floor: f, phase: 0, span });
    }
  }

  const picked: TrapPlan[] = [];
  const room = (p: TrapPlan, gap: number) => picked.every((q) => Math.hypot(q.gx - p.gx, q.gz - p.gz) >= gap);
  const take = (pool: TrapPlan[], upTo: number) => {
    for (let tries = 0; tries < 300 && pool.length && picked.length < upTo; tries++) {
      const p = pool[Math.floor(rand() * pool.length)];
      if (!room(p, tries < 200 ? 7 : 4)) continue;
      picked.push({ ...p, phase: rand() });
    }
  };
  take(logs, Math.min(MAX_LOGS, rand() < 0.5 ? 1 : 2));
  take(plates, TRAP_COUNT);
  return picked;
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
const LOG_Y = 0.12;
const LOG_BAND = 0.3;
const LOG_CLEAR = 0.2;
const LOG_DAMAGE = 12;
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

export function createTraps(scene: THREE.Scene, d: DungeonData, cellM: number, plans: TrapPlan[]): Traps {
  const root = new THREE.Group();
  root.name = "traps";
  scene.add(root);

  const plateTex = plateTexture();
  const glowTex = holeGlowTexture();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.6, metalness: 0.4, emissive: 0xff2a10, emissiveMap: glowTex, emissiveIntensity: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa8adb4, roughness: 0.3, metalness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.55, metalness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.85, metalness: 0 });
  const plateGeo = new THREE.BoxGeometry(PLATE_HALF * 2, 0.03, PLATE_HALF * 2);
  const spikeGeo = new THREE.ConeGeometry(0.04, SINK, 6).translate(0, SINK / 2, 0);
  const studGeo = new THREE.ConeGeometry(0.026, 0.08, 5).translate(0, 0.09 + 0.04, 0);
  const bracketGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
  const geos: THREE.BufferGeometry[] = [plateGeo, spikeGeo, studGeo, bracketGeo];
  const mats: THREE.Material[] = [plateMat, steel, iron, wood];
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
  }
  const live: Live[] = [];

  for (const plan of plans) {
    const x = (plan.gx - d.W / 2) * cellM;
    const z = (plan.gz - d.H / 2) * cellM;
    const y = plan.floor * cellM;
    const t: Live = { plan, x, z, y, struck: false, warned: false, rose: false, primed: false, halfSpan: cellM / 2, cool: 0 };
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
    } else {
      // The log lies across the corridor, from wall to wall, turning about its own length.
      const across = plan.along === "x" ? "z" : "x";
      const len = plan.span * cellM - 0.08;
      const holder = new THREE.Group();
      holder.position.set(x, y + LOG_Y, z);
      root.add(holder);
      const spinner = new THREE.Group();
      holder.add(spinner);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 12), wood);
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
    },
  };
}
