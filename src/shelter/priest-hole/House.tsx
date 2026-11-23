import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { getSurface, makeFlagstone, makeMasonry, makeWood, type SurfaceSet } from "../../engine/textures";
import { useSurface } from "../../engine/materials";
import {
  BACK,
  BACK_OUT,
  COLUMN,
  CROOK_K,
  HEARTH,
  CEIL1,
  DOOR,
  EAVES,
  FLOOR2,
  HATCH_K,
  HIDE,
  KITCHEN_WINDOW,
  HALL_PANELS,
  PANELS,
  REAL,
  RIDGE,
  SECRET_DOOR,
  SHAFT,
  STAIR,
  TABLE,
  BENCH_H,
  X_L,
  X_L_OUT,
  X_R,
  X_R_OUT,
  soffitY,
  type V3,
} from "./timeline";

/**
 * The house, cut open at z = 0: a timber-framed Elizabethan manor with sage plaster, oak
 * floors and stairs, stone side walls and a tiled roof, sat on a block of earth in a lawn.
 * Everything here is static except what the scene passes in (the door, the trick step, the torn
 * panels, the real chamber's front, the daylight in the windows).
 */

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Lime plaster: a soft mottled colour with hairline cracks and a grimy skirting. */
const makePlaster = (base: string, seed: number): SurfaceSet => {
  if (typeof document === "undefined") return { map: null, normalMap: null, roughnessMap: null };
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) return { map: null, normalMap: null, roughnessMap: null };
  const rnd = mulberry(seed);
  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  for (let k = 0; k < 260; k++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 20 + rnd() * 70;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() < 0.5;
    g.addColorStop(0, light ? "rgba(255,250,230,0.07)" : "rgba(40,36,20,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.strokeStyle = "rgba(50,44,30,0.25)";
  for (let k = 0; k < 7; k++) {
    c.lineWidth = 0.6 + rnd();
    c.beginPath();
    let x = rnd() * size;
    let y = rnd() * size;
    c.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rnd() - 0.5) * 40;
      y += rnd() * 30;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return { map: t, normalMap: null, roughnessMap: null };
};

type Mats = ReturnType<typeof useHouseMaterials>;

const std = (s: SurfaceSet, color: string, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({
    map: s.map ?? undefined,
    normalMap: s.normalMap ?? undefined,
    roughnessMap: s.roughnessMap ?? undefined,
    color,
    roughness,
    ...extra,
  });

export const useHouseMaterials = () => {
  const oak = useSurface("ph-oak", () => makeWood({ planks: 5, base: "#6a4426", baseAlt: "#7a5030", seam: "#2a180c", seed: 311 }), [1, 1]);
  const darkOak = useSurface("ph-dark-oak", () => makeWood({ planks: 3, base: "#3d2716", baseAlt: "#4a301b", seam: "#1a0f07", seed: 313 }), [1, 1]);
  const boards = useSurface("ph-boards", () => makeWood({ planks: 6, base: "#7b5232", baseAlt: "#8a5e3a", seam: "#2c1a0e", seed: 317 }), [3, 3]);
  const stone = useSurface("ph-stone", () => makeMasonry({ rows: 7, cols: 3, base: "#8c8478", baseAlt: "#9a9184", mortar: "#4e4940", seed: 331 }), [2, 4]);
  const flags = useSurface("ph-flags", () => makeFlagstone({ cells: 4, base: "#7d776c", baseAlt: "#8b8578", grout: "#3e3a33", seed: 337 }), [4, 1.2]);
  const pale = useSurface("ph-pale", () => makeWood({ planks: 2, base: "#c9a46e", baseAlt: "#d4b07a", seam: "#7a5a32", seed: 379 }), [1, 1]);
  const brick = useSurface("ph-brick", () => makeMasonry({ rows: 14, cols: 5, base: "#8a4430", baseAlt: "#9a5238", mortar: "#b9ab94", seed: 371 }), [1, 1]);
  const tiles = useSurface("ph-tiles", () => makeMasonry({ rows: 12, cols: 8, base: "#9a4a2c", baseAlt: "#a85634", mortar: "#4a2216", seed: 353 }), [5, 4]);
  const sage = useMemo(() => getSurface("ph-plaster-sage", () => makePlaster("#8f9f78", 359)), []);
  const cream = useMemo(() => getSurface("ph-plaster-cream", () => makePlaster("#d8ccb0", 367)), []);
  // Clay under the house: the plaster mottling in terracotta, tiled small.
  const earth = useMemo(() => {
    const base = getSurface("ph-clay", () => makePlaster("#94552f", 373));
    const map = base.map ? base.map.clone() : null;
    if (map) {
      map.repeat.set(30, 10);
      map.needsUpdate = true;
    }
    return { map, normalMap: null, roughnessMap: null };
  }, []);
  return useMemo(
    () => ({
      oak: std(oak, "#ffffff", 0.75),
      darkOak: std(darkOak, "#ffffff", 0.7),
      boards: std(boards, "#ffffff", 0.78),
      stone: std(stone, "#ffffff", 0.92),
      flags: std(flags, "#ffffff", 0.88),
      earth: std(earth, "#ffffff", 0.98),
      tiles: std(tiles, "#ffffff", 0.85),
      sage: std(sage, "#ffffff", 0.95),
      brick: std(brick, "#ffffff", 0.9),
      pale: std(pale, "#ffffff", 0.7),
      // Room colours, as in the reference: a yellow hall, a blue kitchen, a pink store upstairs.
      yellow: std(cream, "#f0d58c", 0.95),
      blue: std(cream, "#a9c8de", 0.95),
      pink: std(cream, "#f0bdb4", 0.95),
      cream: std(cream, "#ffffff", 0.95),
      grass: new THREE.MeshStandardMaterial({ color: "#5f8a3c", roughness: 0.95 }),
      iron: new THREE.MeshStandardMaterial({ color: "#2a2826", roughness: 0.5, metalness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c79a3c", roughness: 0.32, metalness: 0.9 }),
      xray: std(oak, "#ffffff", 0.8, { transparent: true, opacity: 0.3, depthWrite: false }),
      grime: new THREE.MeshStandardMaterial({ color: "#1d1a16", roughness: 1 }),
      cloth: new THREE.MeshStandardMaterial({ color: "#7a2a22", roughness: 0.9 }),
      linen: new THREE.MeshStandardMaterial({ color: "#d9d0bd", roughness: 0.95 }),
      pewter: new THREE.MeshStandardMaterial({ color: "#8d8c88", roughness: 0.4, metalness: 0.7 }),
    }),
    [oak, darkOak, boards, stone, flags, earth, tiles, sage, cream, brick, pale]
  );
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
/** An axis-aligned box between two corners. */
export const Block: React.FC<{ a: V3; b: V3; mat: THREE.Material; cast?: boolean; receive?: boolean }> = ({ a, b, mat, cast = true, receive = true }) => (
  <mesh
    position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}
    material={mat}
    castShadow={cast}
    receiveShadow={receive}
  >
    <boxGeometry args={[Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])]} />
  </mesh>
);

/** A wall in a z-slab, built as boxes around rectangular openings (openings must not overlap in x). */
const WallWithHoles: React.FC<{ x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; holes: Array<[number, number, number, number]>; mat: THREE.Material }> = ({
  x0,
  x1,
  y0,
  y1,
  z0,
  z1,
  holes,
  mat,
}) => {
  const sorted = holes.slice().sort((p, q) => p[0] - q[0]);
  const parts: Array<[V3, V3]> = [];
  let x = x0;
  for (const [hx0, hx1, hy0, hy1] of sorted) {
    if (hx0 > x) parts.push([[x, y0, z0], [hx0, y1, z1]]);
    if (hy0 > y0) parts.push([[hx0, y0, z0], [hx1, hy0, z1]]);
    if (hy1 < y1) parts.push([[hx0, hy1, z0], [hx1, y1, z1]]);
    x = hx1;
  }
  if (x < x1) parts.push([[x, y0, z0], [x1, y1, z1]]);
  return (
    <>
      {parts.map(([a, b], i) => (
        <Block key={i} a={a} b={b} mat={mat} />
      ))}
    </>
  );
};

/** A flat plank cut to a polygon (x, y) in the plane z = z, `depth` thick toward -z. */
const Plate: React.FC<{ pts: Array<[number, number]>; z: number; depth: number; mat: THREE.Material; cast?: boolean }> = ({ pts, z, depth, mat, cast = true }) => {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    // UVs in metres so wood grain tiles the same everywhere.
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pts), depth]);
  return <mesh geometry={geo} material={mat} position={[0, 0, z - depth]} castShadow={cast} receiveShadow />;
};

/** A beam between two points (a box of the given cross-section, rotated in the xy plane). */
const Beam: React.FC<{ from: [number, number]; to: [number, number]; z: number; w: number; d: number; mat: THREE.Material }> = ({ from, to, z, w, d, mat }) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx)]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[len, w, d]} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// The house
// ---------------------------------------------------------------------------
export interface HouseState {
  /** Front door open angle (radians, inward). */
  door: number;
  /** Small door into the real chamber, open angle. */
  secretDoor: number;
  /** The trick step: hinge angle (radians, lifting its low edge), its rattle, and crookedness. */
  hatch: { angle: number; rattle: number; crooked: number };
  /** How far each wainscot panel has come off (0 on the wall .. 1 lying on the floor). */
  panels: number[];
  /** The real chamber's front: a plank wall (1) or cut away (0). */
  realFront: number;
  /** Daylight in the windows (0 night .. 1 noon). */
  daylight: number;
  /** The hinges glowing as they go on (0..1), and the hinges shown at all. */
  hingeGlow: number;
  hinges: boolean;
  /** The secret door has its brick facing (the double hide is built). */
  doorFaced: boolean;
  /** The bolt under the step: 0 drawn back, 1 shot home. */
  bolt: number;
}

const HALL_WINDOWS: Array<[number, number]> = [
  [-4.3, -3.5],
  [-1.4, -0.6],
  [3.9, 4.7],
];

export const House: React.FC<{ s: HouseState; mats: Mats }> = ({ s, mats: m }) => {
  const doorX0 = DOOR.x - DOOR.w / 2;
  const doorX1 = DOOR.x + DOOR.w / 2;
  const kw0 = KITCHEN_WINDOW.x - KITCHEN_WINDOW.w / 2;
  const kw1 = KITCHEN_WINDOW.x + KITCHEN_WINDOW.w / 2;
  const sky = new THREE.Color().setHSL(0.58, 0.5, 0.08 + 0.42 * s.daylight);
  return (
    <group>
      {/* Earth block, lawn and the house's stone plinth. */}
      {/* The earth, cut open where the shaft goes down into it. */}
      <Block a={[-40, -30, -40]} b={[SHAFT.x0, -0.32, 0]} mat={m.earth} cast={false} />
      <Block a={[SHAFT.x1, -30, -40]} b={[40, -0.32, 0]} mat={m.earth} cast={false} />
      <Block a={[SHAFT.x0, -30, -40]} b={[SHAFT.x1, -0.32, SHAFT.z0]} mat={m.earth} cast={false} />
      <Block a={[SHAFT.x0, -30, SHAFT.z0]} b={[SHAFT.x1, SHAFT.pit, 0]} mat={m.earth} cast={false} />
      <Block a={[-30, -0.32, -40]} b={[X_L_OUT, 0, 0]} mat={m.grass} cast={false} />
      <Block a={[X_R_OUT, -0.32, -40]} b={[30, 0, 0]} mat={m.grass} cast={false} />
      <Block a={[X_L_OUT, -0.32, -40]} b={[X_R_OUT, 0, BACK_OUT]} mat={m.grass} cast={false} />
      <Block a={[X_L_OUT, -0.32, BACK_OUT]} b={[SHAFT.x0, -0.02, 0]} mat={m.stone} cast={false} />
      <Block a={[SHAFT.x1, -0.32, BACK_OUT]} b={[X_R_OUT, -0.02, 0]} mat={m.stone} cast={false} />
      <Block a={[SHAFT.x0, -0.32, BACK_OUT]} b={[SHAFT.x1, -0.02, SHAFT.z0]} mat={m.stone} cast={false} />
      {/* Ground floor flagstones (the shaft's mouth left open). */}
      <Block a={[X_L, -0.02, BACK]} b={[SHAFT.x0, 0, 0]} mat={m.flags} cast={false} />
      <Block a={[SHAFT.x1, -0.02, BACK]} b={[X_R, 0, 0]} mat={m.flags} cast={false} />

      {/* Back wall, one plaster colour per room: the door, the kitchen window, the upper windows. */}
      <WallWithHoles x0={X_L_OUT} x1={COLUMN.x0} y0={0} y1={FLOOR2} z0={BACK_OUT} z1={BACK} mat={m.yellow} holes={[[doorX0, doorX1, 0, DOOR.h]]} />
      <WallWithHoles x0={COLUMN.x1} x1={X_R_OUT} y0={0} y1={FLOOR2} z0={BACK_OUT} z1={BACK} mat={m.blue} holes={[[kw0, kw1, KITCHEN_WINDOW.y0, KITCHEN_WINDOW.y1]]} />
      <WallWithHoles x0={X_L_OUT} x1={COLUMN.x0} y0={FLOOR2} y1={EAVES} z0={BACK_OUT} z1={BACK} mat={m.sage} holes={HALL_WINDOWS.filter(([a]) => a < COLUMN.x0).map(([a, b]) => [a, b, FLOOR2 + 0.85, FLOOR2 + 1.95] as [number, number, number, number])} />
      <WallWithHoles x0={COLUMN.x1} x1={X_R_OUT} y0={FLOOR2} y1={EAVES} z0={BACK_OUT} z1={BACK} mat={m.pink} holes={HALL_WINDOWS.filter(([a]) => a > COLUMN.x1).map(([a, b]) => [a, b, FLOOR2 + 0.85, FLOOR2 + 1.95] as [number, number, number, number])} />
      {/* Daylight beyond the door and the windows. */}
      <mesh position={[(X_L_OUT + X_R_OUT) / 2, EAVES / 2, BACK_OUT - 0.6]}>
        <planeGeometry args={[X_R_OUT - X_L_OUT, EAVES]} />
        <meshBasicMaterial color={sky} toneMapped={false} />
      </mesh>
      <mesh position={[DOOR.x, 0.01, BACK_OUT - 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 1.2]} />
        <meshStandardMaterial color="#6b8f45" roughness={1} />
      </mesh>
      {/* Window frames, mullions and leaded panes. */}
      {[[kw0, kw1, KITCHEN_WINDOW.y0, KITCHEN_WINDOW.y1] as [number, number, number, number]]
        .concat(HALL_WINDOWS.map(([a, b]) => [a, b, FLOOR2 + 0.85, FLOOR2 + 1.95] as [number, number, number, number]))
        .map(([a, b, y0, y1], i) => (
          <group key={i}>
            <Block a={[a - 0.06, y0 - 0.08, BACK - 0.02]} b={[b + 0.06, y0, BACK + 0.08]} mat={m.darkOak} />
            <Block a={[a - 0.06, y1, BACK - 0.02]} b={[b + 0.06, y1 + 0.08, BACK + 0.02]} mat={m.darkOak} />
            <Block a={[(a + b) / 2 - 0.025, y0, BACK - 0.12]} b={[(a + b) / 2 + 0.025, y1, BACK - 0.06]} mat={m.darkOak} />
            <mesh position={[(a + b) / 2, (y0 + y1) / 2, BACK - 0.15]}>
              <planeGeometry args={[b - a, y1 - y0]} />
              <meshStandardMaterial color="#cfe0e8" transparent opacity={0.22} roughness={0.1} metalness={0.2} depthWrite={false} />
            </mesh>
          </group>
        ))}
      {/* Timber framing on the back wall: posts, the floor band and the wall plate. */}
      {[X_L + 0.05, -2.75, COLUMN.x1 + 0.12, X_R - 0.05].map((x) => (
        <Block key={x} a={[x - 0.1, 0, BACK - 0.02]} b={[x + 0.1, EAVES, BACK + 0.06]} mat={m.darkOak} />
      ))}
      <Block a={[X_L, CEIL1 - 0.12, BACK - 0.02]} b={[COLUMN.x0, FLOOR2 + 0.1, BACK + 0.07]} mat={m.darkOak} />
      <Block a={[COLUMN.x1, CEIL1 - 0.12, BACK - 0.02]} b={[X_R, FLOOR2 + 0.1, BACK + 0.07]} mat={m.darkOak} />
      <Block a={[X_L, EAVES - 0.22, BACK - 0.02]} b={[X_R, EAVES, BACK + 0.07]} mat={m.darkOak} />
      {[-4.75, -1.2, 0.6].map((x) => (
        <Beam key={x} from={[x - 0.6, FLOOR2 + 0.15]} to={[x + 0.6, EAVES - 0.25]} z={BACK + 0.03} w={0.14} d={0.08} mat={m.darkOak} />
      ))}

      {/* Wainscot in the hall: the four panels the hunters tear off (drawn by the scene), the rails. */}
      <Block a={[-5.0, 0, BACK - 0.01]} b={[-2.65, 0.12, BACK + 0.04]} mat={m.darkOak} />
      <Block a={[-5.0, 1.15, BACK - 0.01]} b={[-2.65, 1.25, BACK + 0.06]} mat={m.darkOak} />
      {HALL_PANELS.map((p, i) => (
        <WainscotPanel key={`h${i}`} p={p} off={0} mats={m} index={i} />
      ))}
      {/* Upstairs: the panelled room the hunters strip. */}
      <Block a={[X_L, FLOOR2, BACK - 0.01]} b={[-2.75, FLOOR2 + 0.12, BACK + 0.04]} mat={m.darkOak} />
      <Block a={[X_L, FLOOR2 + 0.8, BACK - 0.01]} b={[-2.75, FLOOR2 + 0.86, BACK + 0.06]} mat={m.darkOak} />
      {PANELS.map((p, i) => (
        <WainscotPanel key={i} p={p} off={s.panels[i] ?? 0} mats={m} index={i} />
      ))}

      {/* Left wall (stone), right gable (stone, with the garderobe shaft). */}
      <Block a={[X_L_OUT, 0, BACK_OUT]} b={[X_L, EAVES, 0]} mat={m.stone} />
      <Block a={[X_R, 0, BACK_OUT]} b={[X_R_OUT, EAVES, 0]} mat={m.stone} />
      <Column s={s} mats={m} />

      {/* Upper floor (boards on joists), with the stairwell open; the attic floor. */}
      {/* The stair hall is open to the roof; rooms over the entrance (left) and the kitchen (right). */}
      <Block a={[X_L, CEIL1, BACK]} b={[STAIR.x0, FLOOR2, 0]} mat={m.boards} />
      <Block a={[COLUMN.x1, CEIL1, BACK]} b={[X_R, FLOOR2, 0]} mat={m.boards} />
      {[-5.6, -4.2, -2.8, 2.95, 4.15, 5.2].map((x) => (
        <Block key={x} a={[x - 0.08, CEIL1 - 0.16, BACK]} b={[x + 0.08, CEIL1, 0]} mat={m.darkOak} />
      ))}
      {/* Gallery rails along both floor edges over the stair hall. */}
      {[STAIR.x0 + 0.04].map((x) => (
        <group key={x}>
          <Block a={[x - 0.04, FLOOR2 + 0.9, BACK]} b={[x + 0.04, FLOOR2 + 0.98, -0.05]} mat={m.darkOak} />
          {Array.from({ length: 10 }, (_, k) => BACK + 0.15 + k * 0.25).map((z) => (
            <Block key={z} a={[x - 0.02, FLOOR2, z - 0.02]} b={[x + 0.02, FLOOR2 + 0.9, z + 0.02]} mat={m.oak} />
          ))}
        </group>
      ))}
      <Block a={[X_L, EAVES - 0.18, BACK]} b={[X_R, EAVES, 0]} mat={m.boards} />
      <Roof mats={m} />

      {/* The front door and its frame. */}
      <Block a={[doorX0 - 0.12, 0, BACK - 0.03]} b={[doorX0, DOOR.h + 0.12, BACK + 0.08]} mat={m.darkOak} />
      <Block a={[doorX1, 0, BACK - 0.03]} b={[doorX1 + 0.12, DOOR.h + 0.12, BACK + 0.08]} mat={m.darkOak} />
      <Block a={[doorX0 - 0.12, DOOR.h, BACK - 0.03]} b={[doorX1 + 0.12, DOOR.h + 0.16, BACK + 0.08]} mat={m.darkOak} />
      <group position={[doorX0 + 0.02, 0, BACK - 0.05]} rotation={[0, -s.door, 0]}>
        <Block a={[0, 0.02, -0.07]} b={[DOOR.w - 0.04, DOOR.h - 0.02, 0]} mat={m.oak} />
        {[0.35, 1.6].map((y) => (
          <Block key={y} a={[0.02, y, 0]} b={[DOOR.w - 0.1, y + 0.07, 0.015]} mat={m.iron} />
        ))}
        <mesh position={[DOOR.w - 0.16, 1.05, 0.04]} material={m.iron}>
          <torusGeometry args={[0.05, 0.012, 6, 14]} />
        </mesh>
      </group>

      <Staircase s={s} mats={m} />
      <HideAndChamber s={s} mats={m} />
      <Kitchen mats={m} />
      <Furniture mats={m} />
    </group>
  );
};

/** A wainscot panel: on the wall, or prised off, tumbling forward and lying on the floor. */
const WainscotPanel: React.FC<{ p: { x0: number; x1: number; y0: number; y1: number; floor: number }; off: number; mats: Mats; index: number }> = ({ p, off, mats: m, index }) => {
  const w = p.x1 - p.x0 - 0.04;
  const h = p.y1 - p.y0;
  const cx = (p.x0 + p.x1) / 2;
  // Hinged about its bottom edge, it falls forward onto the flags (and skids a little).
  const fall = Math.min(1, off * 1.25);
  const ang = (Math.PI / 2) * fall * fall;
  const skid = Math.max(0, off - 0.8) * 0.6 + off * 0.12;
  const twist = (index % 2 ? 1 : -1) * 0.25 * off;
  return (
    <>
      {/* Bare stone behind it. */}
      <Block a={[p.x0, p.y0, BACK - 0.005]} b={[p.x1, p.y1, BACK + 0.002]} mat={m.stone} cast={false} />
      <group position={[cx, p.y0 + (p.floor + 0.02 - p.y0) * fall, BACK + 0.03 + skid]} rotation={[ang, twist * fall, 0]}>
        <Block a={[-w / 2, 0, -0.02]} b={[w / 2, h, 0.02]} mat={m.oak} />
        <Block a={[-w / 2 + 0.07, 0.08, 0.02]} b={[w / 2 - 0.07, h - 0.08, 0.035]} mat={m.darkOak} />
      </group>
    </>
  );
};

/**
 * The stone column in the middle of the house: the old garderobe (toilet) shaft, from above the
 * roof down into the earth, cut open at its front. Upstairs it opens into the pink store on the
 * right (the seat), at the bottom a slatted grate over the pit; from the double hide on, a small
 * brick-faced door leads in from the hide under the stairs.
 */
const Column: React.FC<{ s: HouseState; mats: Mats }> = ({ s, mats: m }) => {
  const { x0, x1, z1, top, bottom } = COLUMN;
  const door = SECRET_DOOR;
  return (
    <>
      {/* Back of the column (behind the shaft). */}
      <Block a={[x0, bottom, BACK_OUT]} b={[x1, top, SHAFT.z0]} mat={m.stone} />
      {/* West wall (against the stairs and the hide), with the secret door once it exists. */}
      {s.doorFaced ? (
        <>
          <Block a={[x0, bottom, SHAFT.z0]} b={[SHAFT.x0, 0, z1]} mat={m.stone} />
          <Block a={[x0, door.h, SHAFT.z0]} b={[SHAFT.x0, top, z1]} mat={m.stone} />
          <Block a={[x0, 0, SHAFT.z0]} b={[SHAFT.x0, door.h, door.z0]} mat={m.stone} />
          <Block a={[x0, 0, door.z1]} b={[SHAFT.x0, door.h, z1]} mat={m.stone} />
        </>
      ) : (
        <Block a={[x0, bottom, SHAFT.z0]} b={[SHAFT.x0, top, z1]} mat={m.stone} />
      )}
      {/* East wall (the kitchen side), open upstairs into the store: the way in to the seat. */}
      <Block a={[SHAFT.x1, bottom, SHAFT.z0]} b={[x1, FLOOR2, z1]} mat={m.stone} />
      <Block a={[SHAFT.x1, SHAFT.niche, SHAFT.z0]} b={[x1, top, z1]} mat={m.stone} />
      <Block a={[SHAFT.x0, SHAFT.niche, SHAFT.z0]} b={[SHAFT.x1, top, z1]} mat={m.stone} />
      {/* Soot-dark lining, the pit below the floor, and the grate he stands on. */}
      <Block a={[SHAFT.x0, SHAFT.pit, SHAFT.z0]} b={[SHAFT.x1, SHAFT.niche, SHAFT.z0 + 0.012]} mat={m.grime} cast={false} />
      <Block a={[SHAFT.x0, SHAFT.pit - 0.05, SHAFT.z0]} b={[SHAFT.x1, SHAFT.pit, 0]} mat={m.grime} cast={false} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const za = SHAFT.z0 + 0.02 + k * ((z1 - SHAFT.z0 - 0.04) / 6);
        return <Block key={k} a={[SHAFT.x0, -0.05, za]} b={[SHAFT.x1, 0, za + 0.17]} mat={m.darkOak} />;
      })}
      {/* The garderobe seat upstairs, and the oak lintel over its doorway from the store. */}
      <Block a={[SHAFT.x0, FLOOR2 + 0.38, SHAFT.z0]} b={[SHAFT.x1, FLOOR2 + 0.45, SHAFT.z0 + 0.28]} mat={m.oak} />
      <Block a={[SHAFT.x1 - 0.02, SHAFT.niche - 0.12, SHAFT.z0]} b={[x1 + 0.02, SHAFT.niche, z1]} mat={m.darkOak} />
    </>
  );
};

/** The gable roof over the cut: two tiled slopes, the rafters and the dark attic behind. */
const Roof: React.FC<{ mats: Mats }> = ({ mats: m }) => {
  const mid = (X_L_OUT + X_R_OUT) / 2;
  const half = (X_R_OUT - X_L_OUT) / 2 + 0.5;
  const rise = RIDGE - EAVES;
  const len = Math.hypot(half, rise + 0.35);
  const ang = Math.atan2(rise + 0.35, half);
  return (
    <>
      {[-1, 1].map((k) => (
        <group key={k} position={[mid + (k * half) / 2, EAVES - 0.35 + (rise + 0.35) / 2 + 0.12, (BACK_OUT - 0.3) / 2]} rotation={[0, 0, -k * ang]}>
          <mesh material={m.tiles} castShadow receiveShadow position={[0, 0.07, 0]}>
            <boxGeometry args={[len, 0.14, -BACK_OUT + 0.6]} />
          </mesh>
          <mesh material={m.darkOak} position={[0, -0.08, 0]} castShadow>
            <boxGeometry args={[len, 0.16, -BACK_OUT + 0.4]} />
          </mesh>
        </group>
      ))}
      {/* The attic's back gable, in shadow. */}
      <Plate
        pts={[
          [X_L_OUT, EAVES],
          [X_R_OUT, EAVES],
          [mid, RIDGE],
        ]}
        z={BACK}
        depth={0.3}
        mat={m.darkOak}
      />
      {/* Collar beam and king post. */}
      <Block a={[mid - 2.2, RIDGE - 1.25, BACK + 0.0]} b={[mid + 2.2, RIDGE - 1.1, BACK + 0.12]} mat={m.oak} />
      <Block a={[mid - 0.08, EAVES, BACK]} b={[mid + 0.08, RIDGE - 0.2, BACK + 0.14]} mat={m.oak} />
    </>
  );
};

/** The oak staircase, its trick step, the rail, the panel under it (x-ray over the hide). */
const Staircase: React.FC<{ s: HouseState; mats: Mats }> = ({ s, mats: m }) => {
  const { x0, rise, going, n, z0, z1 } = STAIR;
  const steps = [];
  for (let k = 0; k < n; k++) {
    if (k === HATCH_K) continue;
    const xa = x0 + k * going;
    if (k === CROOK_K) {
      // Built crooked on purpose: one end proud and twisted, the step everyone trips on.
      steps.push(
        <group key={k} position={[xa + going / 2, (k + 1) * rise, (z0 + z1) / 2]} rotation={[0.06, 0.1, 0.16]}>
          <Block a={[-going / 2 - 0.03, -0.045, z0 - (z0 + z1) / 2]} b={[going / 2, 0, z1 + 0.02 - (z0 + z1) / 2]} mat={m.oak} />
        </group>,
        <Block key={`r${k}`} a={[xa, k * rise, z0]} b={[xa + 0.025, (k + 1) * rise - 0.045, z1]} mat={m.darkOak} />
      );
      continue;
    }
    steps.push(
      <group key={k}>
        <Block a={[xa - 0.03, (k + 1) * rise - 0.045, z0]} b={[xa + going, (k + 1) * rise, z1 + 0.02]} mat={m.oak} />
        <Block a={[xa, k * rise, z0]} b={[xa + 0.025, (k + 1) * rise - 0.045, z1]} mat={m.darkOak} />
      </group>
    );
  }
  const top = x0 + n * going;
  // The hatch pivots about its high edge (the nose of the next riser), lifting its low edge.
  const hx0 = x0 + HATCH_K * going;
  const hx1 = hx0 + going;
  const hy = (HATCH_K + 1) * rise;
  const jig = s.hatch.rattle;
  return (
    <>
      {steps}
      <group position={[hx1, hy + jig * 0.012, 0]} rotation={[0, 0, -(s.hatch.angle + jig * 0.05)]}>
        {/* The trick step: a paler board than the rest (it was never stained to match). */}
        <Block a={[-going - 0.03, -0.045, z0]} b={[0, 0, z1 + 0.02]} mat={m.pale} />
        <Block a={[-going, -rise, z0]} b={[-going + 0.025, -0.045, z1]} mat={m.pale} />
        {/* The hidden strap hinges (and their glow as they go on). */}
        {s.hinges
          ? [z0 + 0.2, z1 - 0.2].map((z) => (
              <group key={z}>
                <Block a={[-0.16, -0.06, z - 0.03]} b={[0.02, -0.045, z + 0.03]} mat={m.iron} />
                <mesh position={[0, -0.06, z]} rotation={[Math.PI / 2, 0, 0]} material={m.iron}>
                  <cylinderGeometry args={[0.016, 0.016, 0.07, 10]} />
                </mesh>
                {s.hingeGlow > 0 ? (
                  <mesh position={[-0.06, -0.055, z]}>
                    <sphereGeometry args={[0.12, 14, 10]} />
                    <meshBasicMaterial color="#ffcc55" transparent opacity={0.8 * Math.min(1, s.hingeGlow)} depthWrite={false} toneMapped={false} />
                  </mesh>
                ) : null}
              </group>
            ))
          : null}
        {/* The bolt's staple on the underside. */}
        {s.hinges ? <Block a={[-going + 0.03, -0.075, -2.12]} b={[-going + 0.07, -0.045, -2.04]} mat={m.iron} /> : null}
      </group>
      {/* The bolt, on the underside of the step below, shot into the staple. */}
      {s.hinges ? (
        <group position={[hx0 - 0.02 - 0.12 + s.bolt * 0.12, hy - rise - 0.07, -2.08]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.iron}>
            <cylinderGeometry args={[0.022, 0.022, 0.26, 12]} />
          </mesh>
          <mesh position={[-0.04, -0.06, 0]} material={m.iron}>
            <cylinderGeometry args={[0.012, 0.012, 0.09, 8]} />
          </mesh>
          <mesh position={[-0.04, -0.105, 0]} material={m.brass}>
            <sphereGeometry args={[0.024, 12, 10]} />
          </mesh>
        </group>
      ) : null}
      {/* Soffit: the boarded underside of the flight (the hide's sloping ceiling). */}
      <Beam from={[x0, soffitY(x0)]} to={[hx0, soffitY(hx0)]} z={(z0 + z1) / 2} w={0.04} d={z1 - z0} mat={m.boards} />
      <Beam from={[hx1, soffitY(hx1)]} to={[top, soffitY(top)]} z={(z0 + z1) / 2} w={0.04} d={z1 - z0} mat={m.boards} />
      {/* Outer string, rail and balusters. */}
      {/* The panel under the flight: solid at the low end, see-through over the hide. */}
      <Plate
        pts={[
          [x0, 0],
          [HIDE.x0, 0],
          [HIDE.x0, soffitY(HIDE.x0) + 0.2],
          [x0, 0.05],
        ]}
        z={z1 + 0.025}
        depth={0.025}
        mat={m.oak}
      />
      <Plate
        pts={[
          [HIDE.x0, 0],
          [HIDE.x1, 0],
          [HIDE.x1, soffitY(HIDE.x1) + 0.2],
          [HIDE.x0, soffitY(HIDE.x0) + 0.2],
        ]}
        z={z1 + 0.025}
        depth={0.025}
        mat={m.xray}
        cast={false}
      />
      {/* A stone pier at the hide's end: the wall between the hall and the hide. */}
      <Block a={[HIDE.x0 - 0.16, 0, z1 - 0.05]} b={[HIDE.x0 + 0.06, soffitY(HIDE.x0) + 0.2, z1 + 0.1]} mat={m.stone} />
      <Block a={[HIDE.x0, 0, z1 - 0.02]} b={[HIDE.x1, 0.1, z1 + 0.04]} mat={m.darkOak} />
    </>
  );
};

/** Inside the hide: its boarded low end; the brick-faced secret door into the shaft; the shaft's shelf. */
const HideAndChamber: React.FC<{ s: HouseState; mats: Mats }> = ({ s, mats: m }) => {
  const { z0, z1 } = HIDE;
  const dz0 = SECRET_DOOR.z0;
  const dz1 = SECRET_DOOR.z1;
  const mid = (SHAFT.x0 + SHAFT.x1) / 2;
  return (
    <>
      {/* Low end of the hide (boarded off from the rest of the under-stair space). */}
      <Block a={[HIDE.x0 - 0.04, 0, z0]} b={[HIDE.x0, soffitY(HIDE.x0), z1]} mat={m.boards} />
      {/* The secret door through the column wall, faced with brick on the hide's side. */}
      {s.doorFaced ? (
        <group position={[REAL.x0 + 0.02, 0, dz0]} rotation={[0, s.secretDoor, 0]}>
          <Block a={[0, 0.01, 0]} b={[0.05, SECRET_DOOR.h - 0.01, dz1 - dz0]} mat={m.boards} />
          <Block a={[-0.1, 0.01, 0.005]} b={[0, SECRET_DOOR.h - 0.01, dz1 - dz0 - 0.005]} mat={m.brick} />
        </group>
      ) : null}
      {/* In the shaft: a shelf with a book, a little cross on the back wall. */}
      <Block a={[SHAFT.x0, 1.3, SHAFT.z0]} b={[SHAFT.x1, 1.34, SHAFT.z0 + 0.18]} mat={m.oak} />
      <Block a={[SHAFT.x0 + 0.08, 1.34, SHAFT.z0 + 0.04]} b={[SHAFT.x0 + 0.26, 1.39, SHAFT.z0 + 0.16]} mat={m.cloth} />
      <Block a={[mid - 0.015, 1.55, SHAFT.z0]} b={[mid + 0.015, 1.8, SHAFT.z0 + 0.03]} mat={m.oak} />
      <Block a={[mid - 0.08, 1.68, SHAFT.z0]} b={[mid + 0.08, 1.71, SHAFT.z0 + 0.03]} mat={m.oak} />
    </>
  );
};

/** The kitchen: table, benches, bowls and bread, a shelf of pewter and hanging pots. */
const Kitchen: React.FC<{ mats: Mats }> = ({ mats: m }) => {
  const { x, z, w, d, h } = TABLE;
  return (
    <>
      <Block a={[x - w / 2, h - 0.06, z - d / 2]} b={[x + w / 2, h, z + d / 2]} mat={m.oak} />
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([i, j]) => (
        <Block key={`${i}${j}`} a={[x + i * (w / 2 - 0.08) - 0.04, 0, z + j * (d / 2 - 0.08) - 0.04]} b={[x + i * (w / 2 - 0.08) + 0.04, h - 0.06, z + j * (d / 2 - 0.08) + 0.04]} mat={m.darkOak} />
      ))}
      {[x - w / 2 - 0.45, x + w / 2 + 0.38].map((bx) => (
        <group key={bx}>
          <Block a={[bx - 0.16, BENCH_H - 0.05, z - 0.5]} b={[bx + 0.16, BENCH_H, z + 0.5]} mat={m.oak} />
          <Block a={[bx - 0.04, 0, z - 0.42]} b={[bx + 0.04, BENCH_H - 0.05, z - 0.34]} mat={m.darkOak} />
          <Block a={[bx - 0.04, 0, z + 0.34]} b={[bx + 0.04, BENCH_H - 0.05, z + 0.42]} mat={m.darkOak} />
        </group>
      ))}
      {[
        [x - 0.2, z + 0.15],
        [x + 0.22, z - 0.1],
      ].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, h + 0.03, bz]} material={m.pewter}>
          <cylinderGeometry args={[0.09, 0.06, 0.06, 16]} />
        </mesh>
      ))}
      <mesh position={[x + 0.05, h + 0.06, z + 0.3]} scale={[1, 0.6, 0.7]}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshStandardMaterial color="#b0743a" roughness={0.8} />
      </mesh>
      <mesh position={[x + 0.25, h + 0.09, z + 0.25]} material={m.pewter}>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 14]} />
      </mesh>
      {/* Shelf and pots on the back wall. */}
      <Block a={[2.6, 1.95, BACK]} b={[3.0, 1.99, BACK + 0.22]} mat={m.oak} />
      {[2.68, 2.8, 2.92].map((px, i) => (
        <mesh key={px} position={[px, 2.06 + (i % 2) * 0.01, BACK + 0.11]} rotation={[Math.PI / 2 - 0.2, 0, 0]} material={m.pewter}>
          <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
        </mesh>
      ))}
      {/* The hearth against the right wall: a stone breast, the fire, a pot on the hook, barrels. */}
      <Block a={[HEARTH.x0, 0, BACK]} b={[HEARTH.x1, CEIL1, BACK + 0.55]} mat={m.stone} />
      <Block a={[HEARTH.x0 + 0.12, 0, BACK + 0.4]} b={[HEARTH.x1 - 0.12, 0.9, BACK + 0.56]} mat={m.grime} cast={false} />
      <Block a={[HEARTH.x0 - 0.05, 0.9, BACK + 0.5]} b={[HEARTH.x1, 1.02, BACK + 0.66]} mat={m.darkOak} />
      {[0, 1].map((k) => (
        <mesh key={k} position={[(HEARTH.x0 + HEARTH.x1) / 2 + (k - 0.5) * 0.12, 0.08, BACK + 0.6]} rotation={[0, 0, Math.PI / 2 + (k - 0.5) * 0.5]} material={m.darkOak}>
          <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
        </mesh>
      ))}
      <mesh position={[(HEARTH.x0 + HEARTH.x1) / 2, 0.42, BACK + 0.62]} material={m.iron}>
        <cylinderGeometry args={[0.13, 0.1, 0.2, 16]} />
      </mesh>
      {[
        [HEARTH.x0 - 0.45, -2.25],
        [HEARTH.x0 - 0.45, -1.7],
      ].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, 0.36, bz]} material={m.oak} castShadow>
          <cylinderGeometry args={[0.26, 0.24, 0.72, 18]} />
        </mesh>
      ))}
    </>
  );
};

/** The hall's chest (the candlestick stands on it), a bench; upstairs a chair, barrels in the store. */
const Furniture: React.FC<{ mats: Mats }> = ({ mats: m }) => (
  <>
    <Block a={[-2.55, 0, -0.75]} b={[-1.95, 0.5, -0.2]} mat={m.darkOak} />
    <Block a={[-2.58, 0.5, -0.78]} b={[-1.92, 0.55, -0.17]} mat={m.oak} />
    <Block a={[-6.1, 0, -1.6]} b={[-5.85, 0.45, -0.3]} mat={m.oak} />
    <Block a={[-3.2, FLOOR2, -1.0]} b={[-2.8, FLOOR2 + 0.45, -0.6]} mat={m.oak} />
    <Block a={[-3.2, FLOOR2 + 0.45, -1.0]} b={[-3.15, FLOOR2 + 1.0, -0.6]} mat={m.oak} />
    {/* The pink store over the kitchen: barrels and a ladder. */}
    {[4.3, 4.9].map((bx) => (
      <mesh key={bx} position={[bx, FLOOR2 + 0.36, -2.2]} material={m.oak} castShadow>
        <cylinderGeometry args={[0.26, 0.24, 0.72, 18]} />
      </mesh>
    ))}
    <group position={[3.4, FLOOR2, -2.45]} rotation={[0, 0, 0.18]}>
      {[-0.2, 0.2].map((x) => (
        <Block key={x} a={[x - 0.025, 0, -0.03]} b={[x + 0.025, 2.1, 0.03]} mat={m.oak} />
      ))}
      {[0.3, 0.7, 1.1, 1.5, 1.9].map((y) => (
        <Block key={y} a={[-0.2, y, -0.02]} b={[0.2, y + 0.04, 0.02]} mat={m.oak} />
      ))}
    </group>
  </>
);
