// A door in every doorway arch: Poly Haven's castle door (CC0) at its own size, frame and both
// leaves, set in a thin wall of dressed stone that fills the rest of the arch. The wall stands only
// in the door's plane, so the passage is its full width on either side. Doors start shut: E opens
// or closes the one in front of the paladin, and it swings away from whoever opens it. A shut door
// (and the stone round it) stops him and the camera; the men open doors when they come up to one.
// The rare wide openings (halls) have no door.
import * as THREE from "three";
import type { DungeonArch, DungeonData, DungeonProp } from "./dungeon/generator";
import { floorAt } from "./dungeon/floors";
import { loadModel } from "./props3d";

const SPRING = (len: number) => (len >= 4 ? 1.85 : 1.5);
const RISE = (len: number) => (len >= 4 ? 0.55 : Math.min(len / 2, 0.95));

// The castle door model, measured (metres): the frame is 2.01 wide and 2.97 tall with a segmental
// top; the opening in the stone hugs just inside the frame's outline so the frame covers its edge.
const HOLE_HALF = 0.975;
const HOLE_SPRING = 2.4;
const HOLE_RISE = 0.54;
const LEAF_HINGE = 0.965;
/** The infill wall's thickness, and half the slab a shut door blocks. */
const WALL_T = 0.26;
const SLAB = 0.16;
/** Below this the opening is wide enough to walk through the frame (|along| in metres). */
const CLEAR_HALF = 0.92;

const doorTop = (along: number) => {
  const a = Math.abs(along);
  if (a >= HOLE_HALF) return 0;
  return HOLE_SPRING + HOLE_RISE * Math.sqrt(1 - (a / HOLE_HALF) ** 2);
};

/** Arches that get a door (the rare wide halls stay open). */
const hasDoor = (a: DungeonArch) => a.len <= 3;
const openingHalf = (a: DungeonArch, cellM: number) => ((a.len - 0.04) / 2) * cellM;

export interface Door {
  id: number;
  arch: DungeonArch;
  centre: THREE.Vector3;
  /** Along the doorway (unit, world x/z) and across it (the way through). */
  ax: number;
  az: number;
  nx: number;
  nz: number;
  /** Half the arch's opening (m). */
  half: number;
  open: number;
  target: number;
  /** Which way it swings (+1: toward +n). */
  swing: number;
}

export interface Doors {
  doors: Door[];
  /** The door the paladin can work from here (facing it, close enough), or -1. */
  reachable: (x: number, z: number, facing: number) => number;
  toggle: (i: number, from: { x: number; z: number }) => void;
  /** Keep a walker of `radius` m out of shut doors; `prev` is where it was before this step. */
  block: (p: { x: number; z: number }, prev: { x: number; z: number }, radius: number) => void;
  solidAt: (x: number, y: number, z: number) => boolean;
  /** The men open the doors they come up to. */
  update: (dt: number, men: Array<{ x: number; z: number }>) => void;
  dispose: () => void;
}

/**
 * The stone either side of each door as collision circles (dungeon props, grid cells), so the
 * paladin and the men walk through the frame and not the wall. Add before the walker is made.
 */
export function doorwayProps(d: DungeonData, cellM: number): DungeonProp[] {
  const out: DungeonProp[] = [];
  const r = 0.17;
  for (const a of d.arches) {
    if (!hasDoor(a)) continue;
    const half = openingHalf(a, cellM);
    for (const side of [-1, 1]) {
      for (let t = CLEAR_HALF + 0.06 + r; t <= half + 0.05; t += 0.22) {
        const x = a.x + 0.5 + (a.px * side * t) / cellM;
        const z = a.y + 0.5 + (a.py * side * t) / cellM;
        out.push({ kind: "doorway", x: x - 0.5, y: z - 0.5, rot: 0, scale: 1, radius: r / cellM, roomId: -1 });
      }
    }
  }
  return out;
}

/** The stone filling an arch round the door: the arch's opening less the door's outline. */
function infillGeometry(half: number, spring: number, rise: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const base = -0.03;
  const steps = 22;
  // Out round the arch, left to right…
  s.moveTo(-half, base);
  s.lineTo(-half, spring);
  for (let i = 1; i <= steps; i++) {
    const t = Math.PI - (Math.PI * i) / steps;
    s.lineTo(Math.cos(t) * half, spring + Math.sin(t) * rise);
  }
  s.lineTo(half, base);
  // …and back round the door, right to left.
  s.lineTo(HOLE_HALF, base);
  s.lineTo(HOLE_HALF, HOLE_SPRING);
  for (let i = 1; i <= steps; i++) {
    const t = (Math.PI * i) / steps;
    s.lineTo(Math.cos(t) * HOLE_HALF, HOLE_SPRING + Math.sin(t) * HOLE_RISE);
  }
  s.lineTo(-HOLE_HALF, base);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -WALL_T / 2);
}

export function createDoors(scene: THREE.Scene, d: DungeonData, cellM: number, stone: THREE.Material): Doors {
  const root = new THREE.Group();
  root.name = "doors";
  scene.add(root);
  let alive = true;
  const doors: Door[] = [];
  const pivots: Array<[THREE.Object3D, THREE.Object3D]> = [];
  const geos = new Map<number, THREE.BufferGeometry>();

  d.arches.forEach((a) => {
    if (!hasDoor(a)) return;
    const half = openingHalf(a, cellM);
    const ax = a.px;
    const az = a.py;
    const cx = a.x + 0.5;
    const cz = a.y + 0.5;
    const floor = Math.max(floorAt(d, cx, cz), floorAt(d, cx + a.py * 0.45, cz + a.px * 0.45), floorAt(d, cx - a.py * 0.45, cz - a.px * 0.45));
    const centre = new THREE.Vector3((cx - d.W / 2) * cellM, floor * cellM, (cz - d.H / 2) * cellM);
    // Across = the group's local +z: (-az, ax).
    const door: Door = { id: doors.length, arch: a, centre, ax, az, nx: -az, nz: ax, half, open: 0, target: 0, swing: 1 };
    doors.push(door);
    const g = new THREE.Group();
    g.position.copy(centre);
    // Local x runs along the doorway, local z through it.
    g.rotation.y = Math.atan2(-az, ax);
    root.add(g);

    // The stone round the door.
    let geo = geos.get(a.len);
    if (!geo) {
      geo = infillGeometry(half + 0.03, SPRING(a.len) * cellM, RISE(a.len) * cellM + 0.03);
      geos.set(a.len, geo);
    }
    const wall = new THREE.Mesh(geo, stone);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);

    const left = new THREE.Object3D();
    const right = new THREE.Object3D();
    left.position.set(-LEAF_HINGE, 0, 0);
    right.position.set(LEAF_HINGE, 0, 0);
    g.add(left, right);
    pivots.push([left, right]);
    loadModel("rooms/large_castle_door").then((src) => {
      if (!alive) return;
      // The frame where the model has it, moved so its middle is in the wall's plane.
      const frameNode = src.getObjectByName("large_castle_door_frame");
      if (frameNode) {
        const frame = frameNode.clone(true);
        frame.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(frame);
        frame.position.z -= (fb.min.z + fb.max.z) / 2;
        g.add(frame);
      }
      // Each leaf shut (the model has them ajar), on a hinge at its outer edge.
      const hang = (name: string, pivot: THREE.Object3D, hingeAtMin: boolean) => {
        const node = src.getObjectByName(name);
        if (!node) return;
        const leaf = node.clone(true);
        leaf.position.set(0, 0, 0);
        leaf.quaternion.identity();
        leaf.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(leaf);
        leaf.position.set(-(hingeAtMin ? b.min.x : b.max.x), 0.067 - b.min.y, -(b.min.z + b.max.z) / 2);
        pivot.add(leaf);
      };
      hang("large_castle_door_left", left, true);
      hang("large_castle_door_right", right, false);
    });
  });

  const local = (dr: Door, x: number, z: number) => {
    const dx = x - dr.centre.x;
    const dz = z - dr.centre.z;
    return { along: dx * dr.ax + dz * dr.az, across: dx * dr.nx + dz * dr.nz };
  };
  const shut = (dr: Door) => dr.open < 0.55;

  const open = (dr: Door, from: { x: number; z: number }) => {
    const side = local(dr, from.x, from.z).across;
    dr.swing = side >= 0 ? -1 : 1;
    dr.target = 1;
  };

  return {
    doors,
    reachable(x, z, facing) {
      let best = -1;
      let bestD = 2.3;
      for (const dr of doors) {
        const l = local(dr, x, z);
        if (Math.abs(l.along) > HOLE_HALF + 0.5) continue;
        const dist = Math.abs(l.across);
        const dx = dr.centre.x - x;
        const dz = dr.centre.z - z;
        const look = (Math.sin(facing) * dx + Math.cos(facing) * dz) / (Math.hypot(dx, dz) || 1);
        if (dist < bestD && look > 0.2) {
          bestD = dist;
          best = dr.id;
        }
      }
      return best;
    },
    toggle(i, from) {
      const dr = doors[i];
      if (!dr) return;
      if (dr.target > 0.5) dr.target = 0;
      else open(dr, from);
    },
    block(p, prev, radius) {
      for (const dr of doors) {
        if (!shut(dr)) continue;
        const l = local(dr, p.x, p.z);
        if (Math.abs(l.along) > HOLE_HALF + radius || Math.abs(l.across) > SLAB + radius) continue;
        const was = local(dr, prev.x, prev.z).across;
        const side = was >= 0 ? 1 : -1;
        const push = side * (SLAB + radius) - l.across;
        p.x += dr.nx * push;
        p.z += dr.nz * push;
      }
    },
    solidAt(x, y, z) {
      for (const dr of doors) {
        const l = local(dr, x, z);
        if (Math.abs(l.across) > WALL_T / 2 + 0.1 || Math.abs(l.along) > dr.half) continue;
        // The stone round the door, the stone over it, and the leaves while shut.
        const h = y - dr.centre.y;
        if (Math.abs(l.along) > CLEAR_HALF || h > doorTop(l.along) - 0.05 || shut(dr)) return true;
      }
      return false;
    },
    update(dt, men) {
      for (const dr of doors) {
        if (dr.target < 0.5) {
          for (const m of men) {
            const l = local(dr, m.x, m.z);
            if (Math.abs(l.along) < HOLE_HALF + 0.6 && Math.abs(l.across) < 1.5) {
              open(dr, m);
              break;
            }
          }
        }
        dr.open += (dr.target - dr.open) * (1 - Math.exp(-dt * 3.2));
        const [l, r] = pivots[dr.id];
        const ang = dr.open * 1.55 * dr.swing;
        l.rotation.y = -ang;
        r.rotation.y = ang;
      }
    },
    dispose() {
      alive = false;
      scene.remove(root);
      geos.forEach((g) => g.dispose());
    },
  };
}
