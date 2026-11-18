// The town in 3D, built once from layout.ts: the Wayfarer's Rest (timber, plaster and stone, the
// bar, the kitchen, the hearth, the gallery and the three rooms to rent), the market street lined
// with houses, and the gate hall with the teleporter dais. Furniture is CC0 Patch models (the
// same sets as the dungeon rooms); the shell is boxes with world-scaled procedural textures, merged
// per material. A small pool of point lights follows him round the lamps, so the shader's light
// count never changes. The townsfolk are the same realistic humans as the merchants.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARMOR_SLOTS, createPaladin, type ArmorSlot, type Paladin } from "../../artifacts/characters/paladin";
import { makeFabric, makeFlagstone, makeMasonry, makeWood, type SurfaceSet } from "../../engine/textures";
import { randomSpec } from "../CharacterCustomizer";
import { MERCHANTS, css } from "../merchants";
import { loadModel, placeModel } from "../props3d";
import { hingeLid } from "../roomView";
import * as L from "./layout";

export interface Town {
  group: THREE.Group;
  /** Shut doors upstairs (bodies and the camera keep out). */
  dynamicSolids: () => L.Solid[];
  /** Inside anything solid (the blade and the camera test this). */
  solid: (x: number, y: number, z: number) => boolean;
  /** Open air for the camera (`top`/`bottom`: margins under the lid and over the floor). */
  air: (x: number, y: number, z: number, top: number, bottom: number) => boolean;
  setRented: (rented: boolean[]) => void;
  doorOpen: (room: number) => boolean;
  toggleDoor: (room: number) => void;
  setChestOpen: (room: number, slot: number, open: boolean) => void;
  /** Where the townsfolk stand (m), to keep him out of them. */
  npcSpots: () => Array<{ x: number; z: number }>;
  /** Show the town (and its lights) or hide it while he is below. */
  setActive: (on: boolean) => void;
  /** Which zone is drawn: inside the tavern, or outside (square, street, gate hall). */
  setZone: (zone: "in" | "out") => void;
  zone: () => "in" | "out";
  update: (dt: number, time: number, player: THREE.Vector3) => void;
  /** The minimap: the storey he is on, round where he stands. */
  drawMap: (ctx: CanvasRenderingContext2D, cw: number, ch: number, px: number, pz: number, py: number, time: number) => void;
  dispose: () => void;
}

// ---- Geometry helpers --------------------------------------------------------------------------

/** UVs in metres / `tile` along the two axes each face lies in (axis-aligned boxes). */
function worldUV(g: THREE.BufferGeometry, tile: number) {
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nrm = g.getAttribute("normal") as THREE.BufferAttribute;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (ax >= az) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
}

/** Boxes and shapes bucketed by material, merged into one mesh each at the end. */
class Builder {
  private buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
  constructor(private tiles: Map<THREE.Material, number>) {}
  private push(mat: THREE.Material, g: THREE.BufferGeometry, shadow = true) {
    let b = this.buckets.get(mat);
    if (!b) {
      b = { geos: [], shadow };
      this.buckets.set(mat, b);
    }
    b.geos.push(g);
  }
  /** An axis-aligned box between two corners (m). */
  box(mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    const w = Math.max(0.005, x1 - x0);
    const h = Math.max(0.005, y1 - y0);
    const d = Math.max(0.005, z1 - z0);
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    worldUV(g, this.tiles.get(mat) ?? 1);
    this.push(mat, g);
  }
  /** A box of size (w, h, d) turned by `rot` about its middle at `at` (UVs in its own frame). */
  turned(mat: THREE.Material, w: number, h: number, d: number, at: [number, number, number], rot: [number, number, number]) {
    const g = new THREE.BoxGeometry(w, h, d);
    worldUV(g, this.tiles.get(mat) ?? 1);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ")));
    g.translate(at[0], at[1], at[2]);
    this.push(mat, g);
  }
  /** Any geometry already in place (its own UVs). */
  geo(mat: THREE.Material, g: THREE.BufferGeometry) {
    this.push(mat, g);
  }
  build(parent: THREE.Object3D, owned: Array<{ dispose: () => void }>) {
    this.buckets.forEach((b, mat) => {
      // Merge indexed and non-indexed apart (mergeGeometries wants one kind).
      const idx = b.geos.filter((g) => !!g.index);
      const non = b.geos.filter((g) => !g.index);
      for (const list of [idx, non]) {
        if (!list.length) continue;
        const merged = mergeGeometries(list.map((g) => (g.getAttribute("uv") ? g : withUV(g))), false);
        for (const g of list) g.dispose();
        if (!merged) continue;
        owned.push(merged);
        const m = new THREE.Mesh(merged, mat);
        // Walls and floors only take shadows: a point light's shadow redraws every caster six
        // times a frame, and the characters and furniture are what need to cast.
        m.castShadow = false;
        m.receiveShadow = true;
        parent.add(m);
      }
    });
    this.buckets.clear();
  }
}

function withUV(g: THREE.BufferGeometry) {
  const n = (g.getAttribute("position") as THREE.BufferAttribute).count;
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

/** A prism under a pitched roof: the triangle (u from the eave line outward, y) run along z or x. */
function gablePrism(eaveY: number, ridgeY: number, span: number, length: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, eaveY);
  s.lineTo(span, eaveY);
  s.lineTo(span / 2, ridgeY);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d") as CanvasRenderingContext2D);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Lime plaster: warm off-white with soft blotches and a few cracks. */
function plasterTexture(seed: number, base: [number, number, number]): THREE.CanvasTexture {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 256;
      const y = rnd() * 256;
      const r = 6 + rnd() * 30;
      const k = rnd() < 0.5 ? 0 : 255;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${k},${k * 0.95},${k * 0.85},${0.05 + rnd() * 0.05})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
    }
    g.strokeStyle = "rgba(60,45,30,0.22)";
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      let x = rnd() * 256;
      let y = rnd() * 256;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 18;
        y += rnd() * 12;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

/** Roof slates in staggered rows. */
function slateTexture(): THREE.CanvasTexture {
  let s = 99;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = "#1c1d22";
    g.fillRect(0, 0, 256, 256);
    const rows = 8;
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 16 : 0;
      for (let c = -1; c < 9; c++) {
        const x = c * 32 + off;
        const l = 52 + Math.floor(rnd() * 26);
        g.fillStyle = `rgb(${l},${l + 2},${l + 8})`;
        g.fillRect(x + 1, r * rh + 1, 30, rh - 3);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(x + 1, r * rh + rh - 6, 30, 4);
      }
    }
  });
}

/** Painted board with lettering (signs, plaques). */
function signTexture(lines: string[], bg: string, fg: string, w = 512, h = 128): THREE.CanvasTexture {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 5;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const n = lines.length;
    lines.forEach((t, i) => {
      let size = Math.floor((h * 0.62) / n);
      g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
      while (g.measureText(t).width > w - 44 && size > 12) {
        size -= 2;
        g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
      }
      g.shadowColor = "rgba(0,0,0,0.6)";
      g.shadowBlur = 4;
      g.fillText(t, w / 2, (h * (i + 0.5)) / n + 2);
    });
  });
}

/** Runes round a ring (alpha only; tinted by the material). */
function runeTexture(): THREE.CanvasTexture {
  let s = 7;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return canvasTexture(
    512,
    512,
    (g) => {
      g.clearRect(0, 0, 512, 512);
      g.translate(256, 256);
      g.strokeStyle = "rgba(255,255,255,0.95)";
      g.lineCap = "round";
      for (const r of [250, 234, 160, 146]) {
        g.lineWidth = r > 200 ? 5 : 4;
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.stroke();
      }
      // Glyphs between the rings.
      const count = 28;
      g.lineWidth = 5;
      for (let i = 0; i < count; i++) {
        g.save();
        g.rotate((i / count) * Math.PI * 2);
        g.translate(0, -197);
        g.beginPath();
        const strokes = 2 + Math.floor(rnd() * 3);
        for (let k = 0; k < strokes; k++) {
          const x0 = (rnd() - 0.5) * 22;
          const y0 = (rnd() - 0.5) * 34;
          g.moveTo(x0, y0);
          g.lineTo(x0 + (rnd() - 0.5) * 26, y0 + (rnd() - 0.5) * 30);
        }
        g.stroke();
        g.restore();
      }
      // A star in the middle ring.
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 7; i++) {
        const a = (i * 3 * Math.PI * 2) / 7;
        const x = Math.sin(a) * 140;
        const y = -Math.cos(a) * 140;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    },
    false
  );
}

/** The evening sky: deep blue overhead to a dusky amber band at the horizon, a few stars. */
function skyTexture(): THREE.CanvasTexture {
  let s = 3;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return canvasTexture(1024, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#070a18");
    grad.addColorStop(0.32, "#141c3a");
    grad.addColorStop(0.46, "#3a3352");
    grad.addColorStop(0.5, "#8a5a48");
    grad.addColorStop(0.53, "#2a2230");
    grad.addColorStop(1, "#0a0a10");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 380; i++) {
      const y = rnd() * 220;
      const a = 0.25 + rnd() * 0.75 * (1 - y / 260);
      g.fillStyle = `rgba(255,250,235,${a})`;
      const r = rnd() < 0.08 ? 1.6 : 0.8;
      g.fillRect(rnd() * 1024, y, r, r);
    }
    // The moon.
    const mg = g.createRadialGradient(700, 120, 0, 700, 120, 40);
    mg.addColorStop(0, "rgba(255,248,225,1)");
    mg.addColorStop(0.35, "rgba(255,244,215,0.95)");
    mg.addColorStop(0.45, "rgba(200,200,230,0.25)");
    mg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = mg;
    g.fillRect(640, 60, 120, 120);
  });
}

/** Boards running up and down (the planks texture turned a quarter; its normal map left off, since turning it would light the grooves wrongly). */
function uprightPlanks(set: SurfaceSet): SurfaceSet {
  for (const t of [set.map, set.roughnessMap]) {
    if (!t) continue;
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  set.normalMap?.dispose();
  return { ...set, normalMap: null };
}

const surface = (set: SurfaceSet, extra: THREE.MeshStandardMaterialParameters = {}) => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, ...extra });
  m.map = set.map;
  m.normalMap = set.normalMap;
  m.roughnessMap = set.roughnessMap;
  return m;
};

// ---- Lamps -------------------------------------------------------------------------------------

type Zone = "in" | "out" | "hall";

interface Lamp {
  at: THREE.Vector3;
  color: THREE.Color;
  power: number;
  range: number;
  flicker: number;
  zone: Zone;
}

const zoneOf = (x: number, z: number): Zone => (L.inTavern(x, z) && z > 0 ? "in" : z < L.GATEWAY.z0 + 0.6 ? "hall" : "out");

// ---- The town ----------------------------------------------------------------------------------

export function createTown(gl: THREE.WebGLRenderer, scene: THREE.Scene): Town {
  const group = new THREE.Group();
  group.name = "town";
  scene.add(group);
  const owned: Array<{ dispose: () => void }> = [];
  let alive = true;
  const live = () => alive;

  // Materials.
  const own = <T extends { dispose: () => void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const texSet = (set: SurfaceSet) => {
    for (const t of [set.map, set.normalMap, set.roughnessMap]) if (t) owned.push(t);
    return set;
  };
  const M = {
    plaster: own(new THREE.MeshStandardMaterial({ map: own(plasterTexture(5, [214, 200, 172])), roughness: 0.95 })),
    plasterOut: own(new THREE.MeshStandardMaterial({ map: own(plasterTexture(9, [196, 180, 150])), roughness: 0.95 })),
    timber: own(surface(texSet(makeWood({ size: 256, planks: 3, base: "#3e2716", baseAlt: "#35210f", seam: "#160c05", seed: 21 })), { roughness: 0.82 })),
    boards: own(surface(texSet(makeWood({ size: 512, planks: 6, base: "#7a5232", baseAlt: "#6b4629", seam: "#26160a", seed: 4 })), { roughness: 0.78 })),
    panel: own(surface(texSet(makeWood({ size: 256, planks: 5, base: "#5a3a20", baseAlt: "#4e321b", seam: "#1d1008", seed: 8 })), { roughness: 0.8 })),
    doorWood: own(surface(texSet(uprightPlanks(makeWood({ size: 256, planks: 5, base: "#5e3c20", baseAlt: "#4f321a", seam: "#160b04", seed: 33 }))), { roughness: 0.78 })),
    stone: own(surface(texSet(makeMasonry({ size: 512, rows: 6, cols: 3, base: "#7b756b", baseAlt: "#6a645b", mortar: "#2f2b26", seed: 3 })))),
    darkStone: own(surface(texSet(makeMasonry({ size: 512, rows: 5, cols: 2, base: "#4f4c48", baseAlt: "#45423e", mortar: "#1e1c1a", seed: 13 })))),
    cobbles: own(surface(texSet(makeFlagstone({ size: 512, cells: 9, base: "#58534c", baseAlt: "#68625a", grout: "#24221f", seed: 17 })))),
    flags: own(surface(texSet(makeFlagstone({ size: 512, cells: 4, base: "#5a5852", baseAlt: "#4c4a45", grout: "#1d1c1a", seed: 29 })))),
    slate: own(new THREE.MeshStandardMaterial({ map: own(slateTexture()), roughness: 0.85 })),
    iron: own(new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.5, metalness: 0.85 })),
    soot: own(new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 1 })),
    void: own(new THREE.MeshBasicMaterial({ color: 0x010101 })),
    glassWarm: own(new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffa448, emissiveIntensity: 0.75, roughness: 0.3 })),
    glassNight: own(new THREE.MeshStandardMaterial({ color: 0x0c1220, emissive: 0x1a2a48, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.2 })),
    glassDark: own(new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.25, metalness: 0.3 })),
    flame: own(new THREE.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false })),
    flameCore: own(new THREE.MeshBasicMaterial({ color: 0xfff0c0 })),
    candle: own(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 })),
    banner: own(surface(texSet(makeFabric({ size: 256, base: "#5e1414", seed: 5 })), { side: THREE.DoubleSide, roughness: 0.95 })),
    rug: own(surface(texSet(makeFabric({ size: 256, base: "#6a2a20", seed: 12 })), { roughness: 0.98 })),
    gold: own(new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.4, metalness: 0.7 })),
  };
  const tiles = new Map<THREE.Material, number>([
    [M.plaster, 2.4],
    [M.plasterOut, 2.4],
    [M.timber, 1.6],
    [M.boards, 2.4],
    [M.panel, 1.2],
    [M.doorWood, 1.1],
    [M.stone, 2.6],
    [M.darkStone, 3.2],
    [M.cobbles, 3.2],
    [M.flags, 4],
    [M.slate, 1.6],
  ]);
  // Two zones drawn one at a time: inside the tavern (both floors), and outside (the square, the
  // street and the gate hall). The front door between them is shut; walking through it swaps them.
  const inside = new THREE.Group();
  inside.name = "tavern";
  const outside = new THREE.Group();
  outside.name = "outside";
  group.add(inside, outside);
  const Bin = new Builder(tiles);
  const Bout = new Builder(tiles);
  let B = Bin;
  let G: THREE.Group = inside;
  const solidMat = (s: L.Solid): THREE.Material => {
    if (s.z1 <= L.GATEWAY.z1 + 0.01) return M.darkStone;
    if (s.y0 >= L.TAVERN_TOP - 0.01) return M.panel;
    if (s.y0 >= L.SLAB_Y - 0.01 && s.y1 <= L.UPPER_Y + 0.01) return M.panel;
    return M.plaster;
  };

  const lamps: Lamp[] = [];
  const lamp = (x: number, y: number, z: number, color: number, power: number, range: number, flicker = 0.12) =>
    lamps.push({ at: new THREE.Vector3(x, y, z), color: new THREE.Color(color), power, range, flicker, zone: zoneOf(x, z) });
  /** Flames that flicker: small additive cones (animated in update). */
  const flames: Array<{ m: THREE.Mesh; base: number; seed: number }> = [];
  const flameGeo = own(new THREE.ConeGeometry(0.07, 0.24, 8));
  const coreGeo = own(new THREE.SphereGeometry(0.035, 8, 6));
  const flame = (x: number, y: number, z: number, size = 1) => {
    const m = new THREE.Mesh(flameGeo, M.flame);
    m.position.set(x, y + 0.12 * size, z);
    m.scale.setScalar(size);
    G.add(m);
    flames.push({ m, base: size, seed: flames.length * 1.7 });
    const c = new THREE.Mesh(coreGeo, M.flameCore);
    c.position.set(x, y + 0.04 * size, z);
    c.scale.setScalar(size);
    G.add(c);
  };
  const fire = (x: number, y: number, z: number, r: number) => {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const d = i === 0 ? 0 : r * (0.35 + 0.5 * ((i * 0.37) % 1));
      flame(x + Math.sin(a) * d, y, z + Math.cos(a) * d, 2.4 - d * 1.4);
    }
  };
  const M3 = (path: string, at: [number, number, number], o: { yaw?: number; pitch?: number; roll?: number; scale?: number } = {}) => placeModel(G, path, at, o, live);
  /**
   * A plank door on a wall face: (x, y, z) the foot of the doorway's middle on the face, (nx, nz) the
   * way out (along an axis). A timber surround stands proud of the face, the leaves (boards running
   * up, two iron straps from the hinge side, a ring pull) sit back inside it. `leaves: 0` builds the
   * surround alone (round a doorway with a hung door of its own).
   */
  const plankDoor = (Bx: Builder, x: number, y: number, z: number, nx: number, nz: number, w: number, h: number, leaves: 0 | 1 | 2, opts: { step?: boolean; canopy?: boolean } = {}) => {
    const tx = -nz;
    const tz = nx;
    const box = (mat: THREE.Material, u0: number, u1: number, v0: number, v1: number, d0: number, d1: number) => {
      const xa = x + tx * u0 + nx * d0;
      const xb = x + tx * u1 + nx * d1;
      const za = z + tz * u0 + nz * d0;
      const zb = z + tz * u1 + nz * d1;
      Bx.box(mat, Math.min(xa, xb), Math.max(xa, xb), y + v0, y + v1, Math.min(za, zb), Math.max(za, zb));
    };
    const half = w / 2;
    const F = 0.16;
    box(M.timber, -half - F, -half, 0, h + F, 0, 0.12);
    box(M.timber, half, half + F, 0, h + F, 0, 0.12);
    box(M.timber, -half, half, h, h + F, 0, 0.12);
    box(M.timber, -half - F - 0.05, half + F + 0.05, h + F, h + F + 0.09, 0, 0.17);
    const lw = leaves ? w / leaves : 0;
    for (let i = 0; i < leaves; i++) {
      const u0 = -half + i * lw;
      const u1 = u0 + lw;
      const hingeLeft = leaves === 1 || i === 0;
      box(M.doorWood, u0 + 0.006, u1 - 0.006, 0.01, h, -0.02, 0.05);
      for (const v of [0.2 * h, 0.8 * h]) {
        const a = hingeLeft ? u0 + 0.03 : u1 - 0.03 - lw * 0.74;
        box(M.iron, a, a + lw * 0.74, v - 0.035, v + 0.035, 0.05, 0.066);
      }
      const hu = hingeLeft ? u1 - 0.15 : u0 + 0.15;
      box(M.iron, hu - 0.045, hu + 0.045, h * 0.47 - 0.07, h * 0.47 + 0.07, 0.05, 0.068);
      box(M.iron, hu - 0.07, hu + 0.07, h * 0.47 - 0.17, h * 0.47 - 0.145, 0.068, 0.09);
      box(M.iron, hu - 0.07, hu - 0.05, h * 0.47 - 0.17, h * 0.47 - 0.06, 0.068, 0.09);
      box(M.iron, hu + 0.05, hu + 0.07, h * 0.47 - 0.17, h * 0.47 - 0.06, 0.068, 0.09);
    }
    if (opts.step) box(M.stone, -half - 0.25, half + 0.25, 0, 0.05, 0, 0.42);
    if (opts.canopy) {
      box(M.slate, -half - 0.4, half + 0.4, h + 0.5, h + 0.6, 0, 0.78);
      for (const u of [-half - 0.22, half + 0.12]) box(M.timber, u, u + 0.1, h + 0.27, h + 0.5, 0.0, 0.7);
    }
  };

  // ---- The tavern shell --------------------------------------------------------------------------
  const T0 = L.TAVERN;
  for (const s of L.STRUCTURE) {
    // The street's and hall's shells are built below with their own facades (the hall's here).
    if (s.z1 <= L.TAVERN.z0 - L.SQUARE.z1 + 0.01 && s.z0 < L.TAVERN.z0 - 0.5) {
      if (s.z1 <= L.GATEWAY.z1 + 0.01) Bout.box(s.y0 >= L.HALL_TOP - 0.01 ? M.darkStone : M.stone, s.x0, s.x1, s.y0, s.y1, s.z0, s.z1);
      continue;
    }
    if (s.z1 <= L.TAVERN.z0 - 0.5) continue;
    // Stair treads are wood, with a nosing standing proud of each.
    if (s.x0 === L.STAIR.x0 && s.x1 === L.STAIR.x1 && !s.walk && s.z1 <= L.STAIR.z1 + 1e-6) {
      Bin.box(M.panel, s.x0, s.x1, s.y0, s.y1 - 0.03, s.z0, s.z1);
      Bin.box(M.timber, s.x0, s.x1, s.y1 - 0.06, s.y1, s.z0 - 0.02, s.z1 + 0.03);
      continue;
    }
    // Railings are drawn as rails and balusters below; the upper floor's slab below too.
    if (s.y1 - s.y0 <= 1.01 && s.y0 >= L.UPPER_Y - 0.01 && s.z1 - s.z0 < 0.2) continue;
    if (s.x1 - s.x0 < 0.2 && s.y0 > 0.5 && s.y1 < L.UPPER_Y + 1.1) continue;
    if (s.y0 >= L.SLAB_Y - 0.01 && s.y1 <= L.UPPER_Y + 0.01) continue;
    Bin.box(solidMat(s), s.x0, s.x1, s.y0, s.y1, s.z0, s.z1);
    // The outer walls and the roof's underside are seen from outside too.
    const outer = s.x0 <= T0.x0 - 0.39 || s.x1 >= T0.x1 + 0.39 || s.z0 >= T0.z1 - 0.01 || s.y0 >= L.TAVERN_TOP - 0.01;
    if (outer) Bout.box(solidMat(s), s.x0, s.x1, s.y0, s.y1, s.z0, s.z1);
  }
  const T = L.TAVERN;
  // Floors: boards in the tavern, boards on the upper storey.
  B.box(M.boards, T.x0, T.x1, -0.12, 0, T.z0 - 0.4, T.z1);
  // The upper floor: boards on top of a timber slab (one box each, so no faces lie on each other).
  B.box(M.panel, T.x0, T.x1, L.SLAB_Y, L.UPPER_Y - 0.04, L.GALLERY_Z, T.z1);
  B.box(M.boards, T.x0, T.x1, L.UPPER_Y - 0.04, L.UPPER_Y, L.GALLERY_Z, T.z1);
  // Ceiling beams under the roof and under the upper floor; the gallery's fascia and its posts.
  for (let x = T.x0 + 1.2; x < T.x1; x += 2.3) B.box(M.timber, x - 0.13, x + 0.13, L.TAVERN_TOP - 0.3, L.TAVERN_TOP, T.z0, T.z1);
  for (const z of [8.7, 10.6, 12.5]) B.box(M.timber, T.x0, T.x1, L.SLAB_Y - 0.26, L.SLAB_Y, z - 0.12, z + 0.12);
  B.box(M.timber, L.STAIR.x1, T.x1, L.SLAB_Y - 0.3, L.UPPER_Y + 0.02, L.GALLERY_Z - 0.16, L.GALLERY_Z + 0.04);
  for (const x of L.GALLERY_POSTS) {
    B.box(M.timber, x - 0.15, x + 0.15, 0, L.SLAB_Y - 0.3, L.GALLERY_Z - 0.15, L.GALLERY_Z + 0.15);
    // Braces up to the beam.
    B.turned(M.timber, 0.1, 1.0, 0.1, [x - 0.3, L.SLAB_Y - 0.62, L.GALLERY_Z], [0, 0, -0.75]);
    B.turned(M.timber, 0.1, 1.0, 0.1, [x + 0.3, L.SLAB_Y - 0.62, L.GALLERY_Z], [0, 0, 0.75]);
  }
  // Gallery railing: top and bottom rails and balusters.
  B.box(M.timber, L.STAIR.x1, L.UPPER_X1, L.UPPER_Y + 0.92, L.UPPER_Y + 1.0, L.GALLERY_Z - 0.07, L.GALLERY_Z + 0.07);
  B.box(M.timber, L.STAIR.x1, L.UPPER_X1, L.UPPER_Y + 0.06, L.UPPER_Y + 0.13, L.GALLERY_Z - 0.05, L.GALLERY_Z + 0.05);
  for (let x = L.STAIR.x1 + 0.15; x < L.UPPER_X1; x += 0.34) B.box(M.timber, x - 0.03, x + 0.03, L.UPPER_Y + 0.13, L.UPPER_Y + 0.92, L.GALLERY_Z - 0.03, L.GALLERY_Z + 0.03);
  // Stair railing: a sloped rail on posts, one per two treads.
  {
    const S0 = L.STAIR;
    const run = S0.z1 - (S0.z0 + 0.6);
    const rise = L.UPPER_Y * (run / (S0.z1 - S0.z0));
    const y0 = (L.UPPER_Y * 0.6) / (S0.z1 - S0.z0);
    const len = Math.hypot(run, rise);
    B.turned(M.timber, 0.09, 0.08, len, [S0.x1, y0 + 0.95 + rise / 2, S0.z0 + 0.6 + run / 2], [-Math.atan2(rise, run), 0, 0]);
    for (let i = 0; i <= 9; i++) {
      const z = S0.z0 + 0.6 + (run * i) / 9;
      const y = (L.UPPER_Y * (z - S0.z0)) / (S0.z1 - S0.z0);
      B.box(M.timber, S0.x1 - 0.035, S0.x1 + 0.035, y, y + 0.95, z - 0.035, z + 0.035);
    }
    B.box(M.timber, S0.x1 - 0.07, S0.x1 + 0.07, 0, 1.15, S0.z0 + 0.53, S0.z0 + 0.67);
  }
  // Wainscot round the common room, and timber posts in the plaster.
  {
    const y1 = 1.1;
    B.box(M.panel, T.x0, T.x0 + 0.05, 0, y1, T.z0, T.z1);
    B.box(M.panel, T.x1 - 0.05, T.x1, 0, y1, T.z0, L.GALLERY_Z - 0.1);
    B.box(M.panel, T.x0, L.KITCHEN.x0 - 0.1, 0, y1, T.z1 - 0.05, T.z1);
    B.box(M.panel, T.x0, L.FRONT_DOOR.x0 - 0.16, 0, y1, T.z0, T.z0 + 0.05);
    B.box(M.panel, L.FRONT_DOOR.x1 + 0.16, T.x1, 0, y1, T.z0, T.z0 + 0.05);
    for (const x of [-6.1, -2.9, 2.9, 6.1]) {
      B.box(M.timber, x - 0.12, x + 0.12, y1, L.TAVERN_TOP, T.z0, T.z0 + 0.07);
      if (x < L.KITCHEN.x0 - 0.3) B.box(M.timber, x - 0.12, x + 0.12, y1, L.SLAB_Y, T.z1 - 0.07, T.z1);
    }
    for (let z = T.z0 + 2.6; z < T.z1; z += 3.1) {
      B.box(M.timber, T.x0, T.x0 + 0.07, y1, z > L.GALLERY_Z ? L.SLAB_Y : L.TAVERN_TOP, z - 0.12, z + 0.12);
      B.box(M.timber, T.x1 - 0.07, T.x1, y1, z > L.GALLERY_Z ? L.SLAB_Y : L.TAVERN_TOP, z - 0.12, z + 0.12);
    }
    // The front door from inside: two shut leaves in a timber surround.
    plankDoor(Bin, 0, 0, T.z0, 0, 1, L.FRONT_DOOR.x1 - L.FRONT_DOOR.x0, L.FRONT_DOOR.top, 2);
  }
  // Windows: the front and back walls (warm outside, moonlit glass inside).
  const windowAt = (x: number, y0: number, y1: number, zWall: number, outward: number, w = 1.1) => {
    const zo = zWall + outward * 0.06;
    B.box(M.timber, x - w / 2 - 0.1, x + w / 2 + 0.1, y0 - 0.12, y0, zWall - 0.06, zWall + 0.06 + outward * 0.08);
    B.box(M.timber, x - w / 2 - 0.1, x + w / 2 + 0.1, y1, y1 + 0.1, zWall - 0.06, zWall + 0.06 + outward * 0.06);
    B.box(M.glassWarm, x - w / 2, x + w / 2, y0, y1, Math.min(zo, zo + outward * 0.01), Math.max(zo, zo + outward * 0.01));
    B.box(M.timber, x - 0.03, x + 0.03, y0, y1, Math.min(zo, zo + outward * 0.03), Math.max(zo, zo + outward * 0.03));
  };
  for (const x of [-8.1, -4.5, 4.5, 8.1]) {
    B = Bout;
    windowAt(x, 1.2, 2.4, T.z0 - 0.44, -1);
    windowAt(x, 4.4, 5.7, T.z0 - 0.44, -1);
    B = Bin;
    // Inside: night glass.
    B.box(M.glassNight, x - 0.55, x + 0.55, 4.4, 5.7, T.z0 + 0.0, T.z0 + 0.02);
    if (Math.abs(x) > 5) B.box(M.glassNight, x - 0.55, x + 0.55, 1.2, 2.4, T.z0 + 0.0, T.z0 + 0.02);
  }
  for (const r of L.ROOMS) {
    const x = (r.x0 + r.x1) / 2 - 0.9;
    B.box(M.glassNight, x - 0.5, x + 0.5, L.UPPER_Y + 1.1, L.UPPER_Y + 2.2, T.z1 - 0.02, T.z1);
    B.box(M.timber, x - 0.6, x + 0.6, L.UPPER_Y + 1.0, L.UPPER_Y + 1.1, T.z1 - 0.12, T.z1);
    B.box(M.timber, x - 0.03, x + 0.03, L.UPPER_Y + 1.1, L.UPPER_Y + 2.2, T.z1 - 0.05, T.z1);
  }

  // The facade outside: stone plinth, timber frame, the jetty line, the sign and two lanterns.
  B = Bout;
  G = outside;
  {
    const zf = T.z0 - 0.4;
    const D = L.FRONT_DOOR;
    B.box(M.stone, T.x0 - 0.5, D.x0 - 0.16, 0, 1.0, zf - 0.12, zf);
    B.box(M.stone, D.x1 + 0.16, T.x1 + 0.5, 0, 1.0, zf - 0.12, zf);
    B.box(M.plasterOut, T.x0 - 0.42, D.x0 - 0.16, 1.0, L.TAVERN_TOP, zf - 0.04, zf);
    B.box(M.plasterOut, D.x1 + 0.16, T.x1 + 0.42, 1.0, L.TAVERN_TOP, zf - 0.04, zf);
    B.box(M.plasterOut, D.x0 - 0.16, D.x1 + 0.16, D.top + 0.16, L.TAVERN_TOP, zf - 0.04, zf);
    // The front door: two leaves in a surround, a step and a slate canopy on brackets.
    plankDoor(Bout, 0, 0, zf - 0.04, 0, -1, D.x1 - D.x0, D.top, 2, { step: true, canopy: true });
    for (const x of [-10.2, -6.1, -2.9, 2.9, 6.1, 10.2]) B.box(M.timber, x - 0.14, x + 0.14, 1.0, L.TAVERN_TOP, zf - 0.12, zf);
    for (const y of [3.4, L.TAVERN_TOP - 0.15]) B.box(M.timber, T.x0 - 0.45, T.x1 + 0.45, y - 0.13, y + 0.13, zf - 0.14, zf);
    // The roof: a pitched slate roof over the whole house, gables filled.
    const eave = L.TAVERN_TOP + 0.1;
    const ridge = 11.4;
    const z0 = T.z0 - 1.0;
    const z1 = T.z1 + 1.0;
    const span = z1 - z0;
    const prism = gablePrism(eave, ridge, span - 1.6, T.x1 - T.x0 + 0.8);
    // The prism's triangle is in (x: along z, y); turn it to run along x.
    prism.rotateY(Math.PI / 2);
    prism.translate(T.x0 - 0.4, 0, z0 + 0.8 + (span - 1.6));
    B.geo(M.plasterOut, prism);
    const half = span / 2;
    const slope = Math.atan2(ridge - eave, half - 0.8);
    const slab = Math.hypot(half, ridge - eave + 0.4) + 0.1;
    B.turned(M.slate, T.x1 - T.x0 + 1.6, 0.22, slab, [0, (eave + ridge) / 2 - 0.05, z0 + half / 2], [-slope, 0, 0]);
    B.turned(M.slate, T.x1 - T.x0 + 1.6, 0.22, slab, [0, (eave + ridge) / 2 - 0.05, z1 - half / 2], [slope, 0, 0]);
    // The chimney over the hearth.
    B.box(M.stone, -7.5, -5.7, 6.0, ridge + 1.4, T.z1 - 0.9, T.z1 + 0.5);
    B.box(M.darkStone, -7.65, -5.55, ridge + 1.4, ridge + 1.6, T.z1 - 1.05, T.z1 + 0.65);
    // The name board over the door, flat on the facade.
    const signTex = own(signTexture(["The Wayfarer's Rest"], "#3a2412", "#e8c878", 1024, 160));
    const signMat = own(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
    const sign = new THREE.Mesh(own(new THREE.BoxGeometry(4.4, 0.7, 0.08)), [M.timber, M.timber, M.timber, M.timber, M.timber, signMat]);
    sign.position.set(0, 4.15, zf - 0.2);
    sign.castShadow = true;
    G.add(sign);
    const lanternGeo = own(new THREE.BoxGeometry(0.22, 0.32, 0.22));
    for (const x of [L.FRONT_DOOR.x0 - 0.65, L.FRONT_DOOR.x1 + 0.65]) {
      B.box(M.iron, x - 0.03, x + 0.03, 2.4, 2.46, zf - 0.4, zf);
      const l = new THREE.Mesh(lanternGeo, M.glassWarm);
      l.position.set(x, 2.22, zf - 0.38);
      G.add(l);
      lamp(x, 2.1, zf - 0.6, 0xffb46a, 2.2, 9);
    }
  }

  // ---- Inside: bar, tables, hearth, kitchen ------------------------------------------------------
  B = Bin;
  G = inside;
  const TOP = 0.877;
  L.TABLES.forEach((t, i) => {
    M3("rooms/dining_table", [t.x, 0, t.z]);
    M3("rooms/painted_wooden_bench", [t.x, 0, t.z + 1.0], { yaw: Math.PI });
    M3("rooms/painted_wooden_bench", [t.x, 0, t.z - 1.0]);
    M3("rooms/carved_wooden_plate", [t.x - 0.55, TOP, t.z - 0.3]);
    M3("rooms/carved_wooden_plate", [t.x + 0.45, TOP, t.z + 0.3]);
    M3("market/brass_goblets", [t.x + 0.1 * (i % 3), TOP, t.z - 0.05], { scale: 0.6, yaw: i });
    if (i % 2 === 0) M3("rooms/food_apple_01", [t.x - 0.5, TOP + 0.035, t.z - 0.3]);
    if (i % 2 === 1) M3("market/wooden_bowl_01", [t.x + 0.45, TOP, t.z + 0.3], { scale: 0.8 });
  });
  // The bar: a long counter, its return, the back shelves with barrels.
  {
    const counter = (x0: number, x1: number, z0: number, z1: number) => {
      B.box(M.panel, x0 + 0.05, x1 - 0.05, 0, 1.03, z0 + 0.05, z1 - 0.05);
      B.box(M.timber, x0 - 0.06, x1 + 0.06, 1.03, 1.1, z0 - 0.06, z1 + 0.06);
      B.box(M.timber, x0, x1, 0, 0.12, z0, z1);
    };
    counter(L.BAR.x0, L.BAR.x1, L.BAR.z0, L.BAR.z1);
    counter(L.BAR.x1 + 0.08, 8.5, L.BAR.z0 - 0.3, L.BAR.z0 + 0.3);
    for (const s of L.BAR_STOOLS) M3("market/wooden_stool_01", [s.x, 0, s.z], { yaw: s.z });
    M3("market/brass_goblets", [4.0, 1.1, 2.4], { scale: 0.7 });
    M3("market/brass_goblets", [4.0, 1.1, 4.7], { scale: 0.7, yaw: 1 });
    M3("market/brass_goblets", [6.0, 1.1, 1.4], { scale: 0.7, yaw: 2 });
    M3("market/wooden_bowl_01", [4.0, 1.1, 3.6], { scale: 0.7 });
    M3("market/wine_barrel_01", [9.45, 0, 1.75], { scale: 0.9 });
    M3("market/wine_barrel_01", [9.45, 0, 2.75], { scale: 0.9, yaw: 1 });
    M3("market/painted_wooden_shelves", [9.75, 0, 4.15], { yaw: -Math.PI / 2, scale: 1.2 });
    M3("market/painted_wooden_shelves", [9.75, 0, 5.4], { yaw: -Math.PI / 2, scale: 1.2 });
    M3("market/brass_vase_01", [9.6, 1.1, 1.75], { scale: 0.6 });
    // A lantern over the counter.
    lamp(5.6, 2.8, 3.6, 0xffbe78, 3.4, 9);
    B.box(M.iron, 5.57, 5.63, 2.95, L.TAVERN_TOP, 3.57, 3.63);
    const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.24, 0.34, 0.24)), M.glassWarm);
    l.position.set(5.6, 2.8, 3.6);
    G.add(l);
  }
  // Chandeliers over the front tables: an iron hoop of candles on chains.
  {
    const hoop = own(new THREE.TorusGeometry(0.7, 0.035, 8, 32));
    const wax = own(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 8));
    const spots = [L.TABLES[0], L.TABLES[1], L.TABLES[2]].map((t) => ({ x: t.x, z: t.z }));
    spots[0] = { x: (L.TABLES[0].x + L.TABLES[1].x) / 2, z: (L.TABLES[0].z + L.TABLES[1].z) / 2 };
    spots[1] = { x: L.TABLES[2].x, z: L.TABLES[2].z };
    spots.length = 2;
    spots.push({ x: -1.6, z: 3.2 });
    for (const c of spots) {
      const y = 4.0;
      const h = new THREE.Mesh(hoop, M.iron);
      h.position.set(c.x, y, c.z);
      h.rotation.x = Math.PI / 2;
      G.add(h);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        B.turned(M.iron, 0.02, L.TAVERN_TOP - y, 0.02, [c.x + Math.sin(a) * 0.35, (L.TAVERN_TOP + y) / 2, c.z + Math.cos(a) * 0.35], [0, 0, 0]);
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const x = c.x + Math.sin(a) * 0.7;
        const z = c.z + Math.cos(a) * 0.7;
        const m = new THREE.Mesh(wax, M.candle);
        m.position.set(x, y + 0.1, z);
        G.add(m);
        flame(x, y + 0.18, z, 0.7);
      }
      lamp(c.x, y - 0.1, c.z, 0xffc888, 6.5, 12);
    }
  }
  // Lanterns hung under the gallery.
  for (const [x, z] of [
    [-3.6, 9.6],
    [1.2, 10.2],
    [-8.0, 11.0],
  ]) {
    M3("rooms/wooden_lantern_01", [x, 2.25, z]);
    B.box(M.iron, x - 0.02, x + 0.02, 2.75, L.SLAB_Y - 0.26, z - 0.02, z + 0.02);
    flame(x, 2.42, z, 0.6);
    lamp(x, 2.5, z, 0xffb870, 2.8, 8);
  }
  // The hearth: a stone fireplace with a mantel, the fire, a stack of logs.
  {
    const hx = -6.6;
    const zb = T.z1;
    B.box(M.stone, hx - 1.3, hx - 0.72, 0, 1.6, zb - 1.5, zb);
    B.box(M.stone, hx + 0.72, hx + 1.3, 0, 1.6, zb - 1.5, zb);
    B.box(M.timber, hx - 1.45, hx + 1.45, 1.6, 1.78, zb - 1.62, zb);
    B.box(M.stone, hx - 1.15, hx + 1.15, 1.78, L.SLAB_Y, zb - 1.2, zb);
    B.box(M.soot, hx - 0.72, hx + 0.72, 0, 1.6, zb - 0.25, zb - 0.05);
    B.box(M.soot, hx - 0.72, hx + 0.72, 1.45, 1.6, zb - 1.5, zb - 0.05);
    B.box(M.darkStone, hx - 1.3, hx + 1.3, 0, 0.08, zb - 2.1, zb - 1.5);
    M3("rooms/stone_fire_pit", [hx, 0, zb - 0.78], { scale: 0.62 });
    fire(hx, 0.12, zb - 0.78, 0.35);
    lamp(hx, 0.9, zb - 1.6, 0xff8a3a, 6.0, 13, 0.3);
    M3("market/brass_vase_01", [hx - 1.0, 1.78, zb - 0.9], { scale: 0.7 });
    M3("market/brass_goblets", [hx + 0.9, 1.78, zb - 0.9], { scale: 0.7 });
  }
  // The kitchen: a fire under a hood with a pot, the worktable, shelves, barrels and sundries.
  {
    const K = L.KITCHEN;
    B.box(M.darkStone, 7.5, 9.7, 0, 0.18, 12.0, 13.8);
    B.box(M.stone, 7.4, 9.8, 2.1, L.SLAB_Y, 12.0, K.z1);
    B.box(M.stone, 7.4, 9.8, 1.9, 2.1, 11.85, K.z1);
    M3("rooms/stone_fire_pit", [8.6, 0.18, 12.9], { scale: 0.55 });
    fire(8.6, 0.28, 12.9, 0.3);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      B.turned(M.iron, 0.04, 1.5, 0.04, [8.6 + Math.sin(a) * 0.35, 0.9, 12.9 + Math.cos(a) * 0.35], [Math.cos(a) * 0.22, 0, -Math.sin(a) * 0.22]);
    }
    M3("market/brass_pot_01", [8.6, 0.72, 12.9], { scale: 1.1 });
    lamp(8.6, 1.0, 12.2, 0xff8a3a, 4.6, 10, 0.3);
    M3("rooms/dining_table", [6.9, 0, 10.9], { yaw: Math.PI / 2 });
    M3("rooms/wooden_cutting_board", [6.9, TOP, 10.4], { yaw: 1.3 });
    M3("market/wooden_bowl_01", [6.8, TOP, 11.3]);
    M3("rooms/food_apple_01", [7.05, TOP, 11.55]);
    M3("rooms/food_apple_01", [6.75, TOP, 11.75], { yaw: 2 });
    M3("market/brass_pot_01", [7.0, TOP, 9.95], { scale: 0.8 });
    M3("market/painted_wooden_shelves", [9.75, 0, 9.0], { yaw: -Math.PI / 2, scale: 1.2 });
    M3("market/painted_wooden_shelves", [9.75, 0, 10.2], { yaw: -Math.PI / 2, scale: 1.2 });
    M3("market/wine_barrel_01", [4.95, 0, 13.0], { scale: 0.8 });
    M3("market/wine_barrel_01", [5.6, 0, 13.6], { scale: 0.75, yaw: 1 });
    M3("market/wooden_bucket_01", [9.4, 0, 11.6], { scale: 0.9 });
    M3("market/wicker_basket_01", [5.2, 0, 8.2]);
    M3("rooms/wooden_crate_02", [9.4, 0, 8.0], { yaw: Math.PI / 2 });
  }

  // ---- Upstairs: the rooms -----------------------------------------------------------------------
  interface DoorView {
    pivot: THREE.Group;
    open: number;
    target: number;
    plaque: THREE.MeshStandardMaterial;
    tex: THREE.CanvasTexture | null;
  }
  const doors: DoorView[] = [];
  const chestLids: Array<Array<{ pivot: THREE.Object3D | null; open: number; target: number }>> = L.ROOMS.map(() => []);
  const leafGeo = own(new THREE.BoxGeometry(1.08, 2.22, 0.07));
  leafGeo.translate(0.54, 1.11, 0);
  worldUV(leafGeo, 1.1);
  const bandGeo = own(new THREE.BoxGeometry(0.8, 0.07, 0.09));
  const ringGeo = own(new THREE.TorusGeometry(0.06, 0.011, 6, 16));
  const plaqueGeo = own(new THREE.BoxGeometry(0.9, 0.34, 0.04));
  L.ROOMS.forEach((r, ri) => {
    const Y = L.UPPER_Y;
    M3("rooms/GothicBed_01", [r.bed.x, Y, r.bed.z], { yaw: Math.PI });
    const cx = (r.x0 + r.x1) / 2 + 0.2;
    M3("rooms/GothicCommode_01", [cx, Y, T.z1 - 0.33], { yaw: Math.PI });
    M3("rooms/wooden_lantern_01", [cx - 0.3, Y + 1.21, T.z1 - 0.35]);
    flame(cx - 0.3, Y + 1.38, T.z1 - 0.35, 0.6);
    lamp(cx - 0.3, Y + 1.6, T.z1 - 0.9, 0xffbc78, 2.6, 7.5);
    // A rug in the middle.
    B.box(M.rug, (r.x0 + r.x1) / 2 - 1.1, (r.x0 + r.x1) / 2 + 1.3, Y, Y + 0.02, 10.6, 12.6);
    r.chests.forEach((c) => {
      const slot = { pivot: null as THREE.Object3D | null, open: 0, target: 0 };
      chestLids[ri].push(slot);
      M3("rooms/treasure_chest", [c.x, Y, c.z], { yaw: -Math.PI / 2 }).then((o) => {
        if (o) slot.pivot = hingeLid(o);
      });
    });
    // The door: a plank leaf with iron bands, hung on the west post; a plaque over it.
    const pivot = new THREE.Group();
    pivot.position.set(r.door.x0 + 0.01, Y, L.ROOMS_Z + 0.1);
    G.add(pivot);
    const leaf = new THREE.Mesh(leafGeo, M.doorWood);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);
    for (const y of [0.45, 1.78]) {
      const band = new THREE.Mesh(bandGeo, M.iron);
      band.position.set(0.44, y, 0);
      pivot.add(band);
    }
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(ringGeo, M.iron);
      ring.position.set(0.92, 1.0, side * 0.05);
      pivot.add(ring);
    }
    const mid = (r.door.x0 + r.door.x1) / 2;
    const dw = r.door.x1 - r.door.x0;
    plankDoor(B, mid, Y, L.ROOMS_Z, 0, -1, dw, 2.25, 0);
    plankDoor(B, mid, Y, L.ROOMS_Z + 0.2, 0, 1, dw, 2.25, 0);
    const plaque = own(new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const pm = new THREE.Mesh(plaqueGeo, [M.timber, M.timber, M.timber, M.timber, M.timber, plaque]);
    pm.position.set((r.door.x0 + r.door.x1) / 2, Y + 2.8, L.ROOMS_Z - 0.04);
    G.add(pm);
    doors.push({ pivot, open: 0, target: 0, plaque, tex: null });
    // Sconce on the gallery wall beside the door.
    const sx = r.door.x1 + 0.55;
    if (sx < L.UPPER_X1 - 0.3) {
      B.box(M.iron, sx - 0.04, sx + 0.04, Y + 1.7, Y + 1.78, L.ROOMS_Z - 0.25, L.ROOMS_Z);
      const w = new THREE.Mesh(own(new THREE.CylinderGeometry(0.03, 0.035, 0.14, 8)), M.candle);
      w.position.set(sx, Y + 1.85, L.ROOMS_Z - 0.22);
      G.add(w);
      flame(sx, Y + 1.92, L.ROOMS_Z - 0.22, 0.6);
      lamp(sx, Y + 2.0, L.ROOMS_Z - 0.6, 0xffc080, 1.6, 6.5);
    }
  });
  const setPlaque = (ri: number, rented: boolean) => {
    const d = doors[ri];
    d.tex?.dispose();
    const r = L.ROOMS[ri];
    d.tex = signTexture(rented ? [r.name, "Yours"] : [r.name, `To let · ${r.rent} gold`], rented ? "#2c2410" : "#3a2412", rented ? "#f2d27a" : "#e8c878", 256, 96);
    d.plaque.map = d.tex;
    d.plaque.needsUpdate = true;
  };

  // ---- Outside: the square and the street ---------------------------------------------------------
  B = Bout;
  G = outside;
  B.box(M.cobbles, L.SQUARE.x0 - 1.2, L.SQUARE.x1 + 1.2, -0.12, 0, L.STREET.z0, L.SQUARE.z1 - 0.4);
  // The square's side walls, with coping.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? L.SQUARE.x0 - 1.2 : L.SQUARE.x1;
    B.box(M.stone, x0, x0 + 1.2, 0, 5.4, L.SQUARE.z0, L.SQUARE.z1);
    B.box(M.darkStone, x0 - 0.1, x0 + 1.3, 5.4, 5.7, L.SQUARE.z0, L.SQUARE.z1);
    const lx = side * (L.SQUARE.x1 - 0.25);
    B.box(M.iron, lx - 0.25 * side, lx, 3.2, 3.26, -3.03, -2.97);
    const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.22, 0.32, 0.22)), M.glassWarm);
    l.position.set(lx - 0.3 * side, 3.0, -3);
    G.add(l);
    lamp(lx - 0.6 * side, 2.9, -3, 0xffb46a, 2.4, 10);
  }
  // A well in the square.
  {
    const ring = own(new THREE.CylinderGeometry(0.85, 0.9, 0.8, 20, 1, true));
    const m = new THREE.Mesh(ring, M.stone);
    m.position.set(-6.4, 0.4, -3.2);
    m.castShadow = true;
    G.add(m);
    const water = new THREE.Mesh(own(new THREE.CircleGeometry(0.82, 20)), M.glassNight);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-6.4, 0.25, -3.2);
    G.add(water);
    B.box(M.timber, -7.35, -7.2, 0, 2.2, -3.27, -3.13);
    B.box(M.timber, -5.6, -5.45, 0, 2.2, -3.27, -3.13);
    B.box(M.timber, -7.4, -5.4, 2.1, 2.22, -3.3, -3.1);
    M3("market/wooden_bucket_01", [-6.4, 1.25, -3.2], { scale: 0.7 });
    M3("market/wine_barrel_01", [7.4, 0, -4.8], { scale: 0.8 });
    M3("market/wooden_crate_01", [8.4, 0, -4.6], { yaw: 0.4 });
  }
  // The houses down both sides: stone plinth, a jettied plaster storey in a timber frame, slate roofs.
  const stallZ = (side: number) => L.townStalls().filter((p) => Math.sign(p.x) === side).map((p) => p.z * 1.5);
  let hs = 31;
  const hr = () => ((hs = (Math.imul(hs, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (const side of [-1, 1]) {
    const edges = [L.SQUARE.z0, -13.6, -21.0, -28.8, -36.6, L.STREET.z0];
    for (let i = 0; i < edges.length - 1; i++) {
      const za = edges[i + 1];
      const zb = edges[i];
      const H = 6.2 + hr() * 2.6;
      const xf = side * L.STREET.x1;
      const out = (d: number) => xf - side * d; // toward the street by d
      const back = side * (L.STREET.x1 + 5.5);
      const lo = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)] as [number, number];
      const [bx0, bx1] = lo(xf, back);
      B.box(M.stone, bx0, bx1, 0, 0.9, za, zb);
      B.box(M.plasterOut, bx0, bx1, 0.9, 3.2, za, zb);
      const [jx0, jx1] = lo(out(0.4), back);
      B.box(M.plasterOut, jx0, jx1, 3.3, H, za + 0.02, zb - 0.02);
      const [px0, px1] = lo(out(0.08), xf);
      for (const z of [za + 0.15, zb - 0.15, (za + zb) / 2]) B.box(M.timber, px0, px1, 0.9, 3.2, z - 0.12, z + 0.12);
      const [qx0, qx1] = lo(out(0.48), out(0.38));
      for (const z of [za + 0.15, zb - 0.15, (za + zb) / 2]) B.box(M.timber, qx0, qx1, 3.3, H, z - 0.12, z + 0.12);
      const [rx0, rx1] = lo(out(0.5), xf);
      B.box(M.timber, rx0, rx1, 3.15, 3.35, za, zb);
      B.box(M.timber, qx0, qx1, H - 0.2, H, za, zb);
      // Knee braces from the posts up to the top beam.
      for (const z of [za + 0.15, (za + zb) / 2, zb - 0.15]) {
        for (const dir of [-1, 1]) {
          if ((z === za + 0.15 && dir < 0) || (z === zb - 0.15 && dir > 0)) continue;
          B.turned(M.timber, 0.1, 0.12, 0.85, [out(0.43), H - 0.5, z + dir * 0.32], [-side * dir * 0.8, 0, 0]);
        }
      }
      // Windows upstairs (lit or dark), a door below where no stall stands.
      for (const z of [za + (zb - za) * 0.27, za + (zb - za) * 0.73]) {
        const lit = hr() < 0.55;
        const [wx0, wx1] = lo(out(0.44), out(0.5));
        B.box(lit ? M.glassWarm : M.glassDark, wx0, wx1, 4.3, 5.4, z - 0.45, z + 0.45);
        B.box(M.timber, wx0 - 0.02, wx1 + 0.02, 4.2, 4.3, z - 0.55, z + 0.55);
      }
      const stalls = stallZ(side);
      const doorZ = [za + 1.3, (za + zb) / 2 + 1.1, zb - 1.3].find((z) => stalls.every((s) => Math.abs(s - z) > 2.0));
      if (doorZ !== undefined) plankDoor(B, xf, 0, doorZ, -side, 0, 1.05, 2.15, 1, { step: true, canopy: true });
      // The roof: a prism and two slate slopes, ridge along the street.
      const span = 5.5 + 0.6;
      const eave = H;
      const ridge = H + 2.6;
      const prism = gablePrism(eave, ridge, span, zb - za);
      prism.translate(side < 0 ? back - 0.1 : out(0.5), 0, za);
      // The triangle's x runs from the street side when side > 0; mirror for the west side.
      B.geo(M.plasterOut, prism);
      const slope = Math.atan2(ridge - eave, span / 2);
      const len = Math.hypot(span / 2, ridge - eave) + 0.5;
      const mid = side < 0 ? back - 0.1 + span / 2 : out(0.5) + span / 2;
      B.turned(M.slate, len, 0.2, zb - za - 0.02, [mid - span / 4 - 0.12, (eave + ridge) / 2 + 0.08, (za + zb) / 2], [0, 0, slope]);
      B.turned(M.slate, len, 0.2, zb - za - 0.02, [mid + span / 4 + 0.12, (eave + ridge) / 2 + 0.08, (za + zb) / 2], [0, 0, -slope]);
      if (hr() < 0.6) {
        const cz = za + (zb - za) * (0.3 + hr() * 0.4);
        const cxm = mid + side * 1.2;
        B.box(M.stone, cxm - 0.4, cxm + 0.4, ridge - 1.2, ridge + 1.0, cz - 0.4, cz + 0.4);
      }
    }
  }
  // Wall lanterns down the street (between the stalls).
  for (const [side, z] of [
    [1, -9.5],
    [-1, -17],
    [1, -21.8],
    [-1, -27],
    [1, -32],
    [-1, -38.5],
    [1, -42],
  ] as Array<[number, number]>) {
    const x = side * (L.STREET.x1 - 0.5);
    B.box(M.iron, Math.min(x, side * L.STREET.x1), Math.max(x, side * L.STREET.x1), 3.6, 3.66, z - 0.03, z + 0.03);
    const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.22, 0.32, 0.22)), M.glassWarm);
    l.position.set(x, 3.42, z);
    G.add(l);
    lamp(x - side * 0.4, 3.2, z, 0xffb46a, 2.6, 11);
  }

  // ---- The gate hall ------------------------------------------------------------------------------
  const H0 = L.HALL;
  B.box(M.flags, H0.x0, H0.x1, -0.12, 0, H0.z0, L.GATEWAY.z1);
  // The facade on the street: pilasters, an arch of voussoirs over the gateway, crenellations, a carved name.
  {
    const zf = L.GATEWAY.z1;
    for (const x of [-4.4, 4.4]) B.box(M.stone, x - 0.7, x + 0.7, 0, L.HALL_TOP + 0.3, zf, zf + 0.5);
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      const r = 3.45;
      B.turned(M.stone, 0.62, 0.95, 0.5, [Math.cos(a) * r, 5.0 + Math.sin(a) * r, zf + 0.2], [0, 0, a - Math.PI / 2]);
    }
    for (let x = H0.x0 - 1; x < H0.x1 + 1; x += 1.6) B.box(M.darkStone, x, x + 0.9, L.HALL_TOP, L.HALL_TOP + 0.9, L.GATEWAY.z0, zf + 0.1);
    const tex = own(signTexture(["GATE OF THE DEEP"], "#3c3a36", "#d8c9a0", 1024, 160));
    const mat = own(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    const plaque = new THREE.Mesh(own(new THREE.PlaneGeometry(5.6, 0.88)), mat);
    plaque.position.set(0, 9.6, zf + 0.04);
    G.add(plaque);
    for (const x of [-3.6, 3.6]) {
      B.box(M.iron, x - 0.04, x + 0.04, 4.6, 4.66, zf, zf + 0.55);
      const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.26, 0.36, 0.26)), M.glassWarm);
      l.position.set(x, 4.4, zf + 0.55);
      G.add(l);
      lamp(x, 4.3, zf + 1.0, 0xffaa60, 3.0, 12);
    }
  }
  // Piers with bases and capitals, ribs across the vault, banners between.
  for (const p of L.PIERS) {
    const h = L.PIER_HALF;
    B.box(M.stone, p.x - h, p.x + h, 0, L.HALL_TOP, p.z - h, p.z + h);
    B.box(M.darkStone, p.x - h - 0.15, p.x + h + 0.15, 0, 0.6, p.z - h - 0.15, p.z + h + 0.15);
    B.box(M.darkStone, p.x - h - 0.2, p.x + h + 0.2, 9.6, 10.1, p.z - h - 0.2, p.z + h + 0.2);
  }
  for (const z of [-52.5, -59, -65.5, -71]) B.box(M.darkStone, H0.x0, H0.x1, 10.9, L.HALL_TOP, z - 0.45, z + 0.45);
  // Torches on the inner faces of the piers.
  for (const p of L.PIERS.filter((q) => q.z > -70)) {
    const fx = p.x - Math.sign(p.x) * (L.PIER_HALF + 0.12);
    B.box(M.iron, Math.min(fx, p.x - Math.sign(p.x) * L.PIER_HALF), Math.max(fx, p.x - Math.sign(p.x) * L.PIER_HALF), 3.0, 3.08, p.z - 0.04, p.z + 0.04);
    const cup = new THREE.Mesh(own(new THREE.CylinderGeometry(0.09, 0.05, 0.16, 8)), M.iron);
    cup.position.set(fx, 3.12, p.z);
    G.add(cup);
    flame(fx, 3.2, p.z, 1.1);
    lamp(fx - Math.sign(p.x) * 0.3, 3.4, p.z, 0xffa055, 4.0, 11, 0.25);
  }
  B.box(M.darkStone, -0.45, 0.45, 11.05, L.HALL_TOP, H0.z0, H0.z1);
  for (const side of [-1, 1]) {
    for (const z of [-55.75, -62.25, -68.25]) {
      const x = side * (H0.x1 - 0.08);
      const ban = new THREE.Mesh(own(new THREE.PlaneGeometry(1.8, 5)), M.banner);
      ban.position.set(x, 6.2, z);
      ban.rotation.y = -side * (Math.PI / 2);
      G.add(ban);
      B.box(M.iron, Math.min(x, x - side * 0.15), Math.max(x, x - side * 0.15), 8.7, 8.8, z - 1.05, z + 1.05);
      const emblem = new THREE.Mesh(own(new THREE.CircleGeometry(0.42, 24)), M.gold);
      emblem.position.set(x - side * 0.05, 6.9, z);
      emblem.rotation.y = -side * (Math.PI / 2);
      G.add(emblem);
    }
  }
  // The sealed gate in the south wall: a dark arch, the iron gate, heavy jambs.
  {
    const zg = H0.z0;
    B.box(M.void, -3.2, 3.2, 0, 7.2, zg - 0.02, zg + 0.02);
    for (const x of [-3.8, 3.8]) B.box(M.stone, x - 0.6, x + 0.6, 0, 8.2, zg, zg + 0.7);
    B.box(M.stone, -4.4, 4.4, 7.2, 8.6, zg, zg + 0.7);
    loadModel("rooms/large_iron_gate")
      .then((src) => {
        if (!alive) return;
        const o = src.clone(true);
        const box = new THREE.Box3().setFromObject(o);
        const size = box.getSize(new THREE.Vector3());
        const k = Math.min(6.4 / Math.max(0.01, size.x), 7.1 / Math.max(0.01, size.y));
        o.scale.setScalar(k);
        o.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, zg + 0.35 - ((box.min.z + box.max.z) / 2) * k);
        G.add(o);
      })
      .catch(() => {});
    // Braziers either side.
    const bowl = own(new THREE.CylinderGeometry(0.42, 0.22, 0.32, 16, 1, true));
    const leg = own(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6));
    for (const f of L.FURNITURE.filter((q) => q.kind === "brazier")) {
      const b = new THREE.Mesh(bowl, M.iron);
      b.position.set(f.x, 1.1, f.z);
      G.add(b);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const m = new THREE.Mesh(leg, M.iron);
        m.position.set(f.x + Math.sin(a) * 0.22, 0.5, f.z + Math.cos(a) * 0.22);
        m.rotation.set(Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18);
        G.add(m);
      }
      fire(f.x, 1.12, f.z, 0.25);
      lamp(f.x, 1.9, f.z + 0.6, 0xff8a3a, 6.0, 14, 0.3);
    }
  }
  // The teleporter: a stone dais and its step, a ring of runes, a column of light, four obelisks.
  const runeTex = own(runeTexture());
  const runeMat = own(new THREE.MeshBasicMaterial({ color: 0xa889ff, map: runeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const glowTex = own(
    canvasTexture(
      64,
      256,
      (g) => {
        const grad = g.createLinearGradient(0, 256, 0, 0);
        grad.addColorStop(0, "rgba(255,255,255,0.9)");
        grad.addColorStop(0.25, "rgba(255,255,255,0.35)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 256);
      },
      false
    )
  );
  const beamMat = own(new THREE.MeshBasicMaterial({ color: 0x5a44c0, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const crystalMat = own(new THREE.MeshStandardMaterial({ color: 0x281a4a, emissive: 0x9a78ff, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.1 }));
  const runeLineMat = own(new THREE.MeshStandardMaterial({ color: 0x140c24, emissive: 0x8a6cff, emissiveIntensity: 1.3 }));
  let runeRing: THREE.Mesh;
  let beam: THREE.Mesh;
  const crystals: THREE.Mesh[] = [];
  {
    const D = L.DAIS;
    const step = new THREE.Mesh(own(new THREE.CylinderGeometry(D.r + D.step, D.r + D.step + 0.05, D.h / 2, 48)), M.darkStone);
    step.position.set(D.x, D.h / 4, D.z);
    step.receiveShadow = true;
    G.add(step);
    const top = new THREE.Mesh(own(new THREE.CylinderGeometry(D.r, D.r + 0.04, D.h, 48)), M.stone);
    top.position.set(D.x, D.h / 2, D.z);
    top.receiveShadow = true;
    G.add(top);
    runeRing = new THREE.Mesh(own(new THREE.PlaneGeometry(D.r * 1.9, D.r * 1.9)), runeMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.set(D.x, D.h + 0.025, D.z);
    G.add(runeRing);
    beam = new THREE.Mesh(own(new THREE.CylinderGeometry(1.1, 1.45, 9, 40, 1, true)), beamMat);
    beam.position.set(D.x, D.h + 4.5, D.z);
    G.add(beam);
    const oct = own(new THREE.OctahedronGeometry(0.22, 0));
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(oct, crystalMat);
      c.scale.set(1, 1.8, 1);
      G.add(c);
      crystals.push(c);
    }
    lamp(D.x, 1.8, D.z, 0x9a80ff, 9.0, 16, 0.08);
    const obGeo = own(new THREE.CylinderGeometry(0.22, 0.42, 3.2, 4));
    const stripGeo = own(new THREE.BoxGeometry(0.08, 2.2, 0.08));
    for (const f of L.FURNITURE.filter((q) => q.kind === "obelisk")) {
      const o = new THREE.Mesh(obGeo, M.darkStone);
      o.position.set(f.x, 1.6, f.z);
      o.rotation.y = Math.PI / 4;
      o.castShadow = true;
      o.receiveShadow = true;
      G.add(o);
      const toC = Math.atan2(D.x - f.x, D.z - f.z);
      const s = new THREE.Mesh(stripGeo, runeLineMat);
      s.position.set(f.x + Math.sin(toC) * 0.26, 1.6, f.z + Math.cos(toC) * 0.26);
      s.rotation.y = toC;
      G.add(s);
    }
  }

  // ---- Sky, ambient and the light pool -------------------------------------------------------------
  const skyTex = own(skyTexture());
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(190, 32, 16)), own(new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })));
  sky.position.set(0, -20, -20);
  sky.renderOrder = -10;
  outside.add(sky);
  const hemi = new THREE.HemisphereLight(0x8a96c0, 0x2a2018, 0.4);
  group.add(hemi);
  const moon = new THREE.DirectionalLight(0x9aaad8, 0.35);
  moon.position.set(30, 60, -10);
  moon.target.position.set(0, 0, -20);
  group.add(moon, moon.target);
  const POOL = 6;
  interface Slot {
    light: THREE.PointLight;
    lamp: Lamp | null;
    leaving: boolean;
  }
  const slots: Slot[] = [];
  for (let i = 0; i < POOL + 1; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 10, 2);
    if (i === 0) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.002;
      light.shadow.normalBias = 0.04;
      light.shadow.camera.near = 0.2;
      light.shadow.camera.far = 20;
    }
    group.add(light);
    slots.push({ light, lamp: null, leaving: false });
  }
  let lampCheck = 0;

  Bin.build(inside, owned);
  Bout.build(outside, owned);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material !== M.flame && m.material !== beamMat && m.material !== runeMat && o !== sky) {
      m.receiveShadow = true;
    }
  });

  // ---- Townsfolk -----------------------------------------------------------------------------------
  interface Npc {
    plan: L.NpcPlan;
    p: Paladin | null;
    x: number;
    z: number;
    yaw: number;
    prevYaw: number;
    leg: number;
    wait: number;
    t: number;
    tavern: boolean;
  }
  const npcs: Npc[] = L.NPCS.map((plan) => {
    const at = plan.kind === "sit" ? plan.seat! : plan.route![0];
    const tavern = L.inTavern(at.x, at.z);
    return { plan, p: null, x: at.x, z: at.z, yaw: plan.kind === "sit" ? plan.seat!.yaw : 0, prevYaw: 0, leg: 0, wait: 0, t: plan.seed, tavern };
  });
  void (async () => {
    for (const n of npcs) {
      let s = (0x7a11 + n.plan.seed * 104729) >>> 0;
      const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      try {
        const p = await createPaladin(gl, { character: randomSpec(rnd) });
        if (!alive) {
          p.dispose();
          return;
        }
        p.materials.setEnvIntensity(0.45);
        for (const slot of ARMOR_SLOTS) p.setEquipped(slot, false);
        for (const slot of n.plan.dress) p.setEquipped(slot as ArmorSlot, true);
        p.group.rotation.order = "YXZ";
        p.group.position.set(n.x, 0, n.z);
        p.group.rotation.y = n.yaw;
        (n.tavern ? inside : outside).add(p.group, p.fx);
        n.p = p;
      } catch (err) {
        console.error("townsfolk failed to load", err);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  })();

  const playerAt = new THREE.Vector3();
  const updateNpc = (n: Npc, dt: number) => {
    const p = n.p;
    if (!p) return;
    n.t += dt;
    if (n.plan.kind === "sit") {
      const seat = n.plan.seat!;
      // Eating comes in mouthfuls: a bite, then the food down a while.
      const arms = seat.arms === "eat" ? (n.t % 7 < 3.2 ? "eat" : "knees") : seat.arms;
      p.group.position.set(seat.x, 0, seat.z);
      p.group.rotation.y = seat.yaw;
      p.update(dt, { moveX: 0, moveZ: 0, aimPitch: Math.sin(n.t * 0.4) * 0.15, turnRate: 0, air: 0, block: false, attack: false, firstPerson: false, relaxed: true, stance: "sit", seatY: 0.5, arms }, 0);
      return;
    }
    const route = n.plan.route!;
    const wp = route[n.leg % route.length];
    let speed = 0;
    let want = n.yaw;
    let arms: L.Waypoint["arms"] | undefined;
    if (n.wait > 0) {
      n.wait -= dt;
      arms = wp.arms;
      if (wp.face !== undefined) want = wp.face;
      if (n.wait <= 0) n.leg++;
    } else {
      const dx = wp.x - n.x;
      const dz = wp.z - n.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        if (wp.wait) n.wait = wp.wait;
        else n.leg++;
      } else {
        want = Math.atan2(dx, dz);
        // Someone in the way (the paladin): wait for him to pass.
        const px = playerAt.x - n.x;
        const pz = playerAt.z - n.z;
        const pd = Math.hypot(px, pz);
        const ahead = pd > 0.01 ? (px * dx + pz * dz) / (pd * dist) : 0;
        const pace = n.plan.pace ?? 1.1;
        speed = pd < 1.05 && ahead > 0.3 && Math.abs(playerAt.y) < 0.6 ? 0 : pace;
        // Ease into a walk and out of it.
        const step = Math.min(dist, speed * dt * Math.min(1, dist / 0.3 + 0.3));
        n.x += (dx / dist) * step;
        n.z += (dz / dist) * step;
        speed = dt > 0 ? step / dt : 0;
      }
    }
    let d = want - n.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    n.yaw += d * (1 - Math.exp(-dt * 6));
    const turn = dt > 0 ? Math.atan2(Math.sin(n.yaw - n.prevYaw), Math.cos(n.yaw - n.prevYaw)) / dt : 0;
    n.prevYaw = n.yaw;
    p.group.position.set(n.x, 0, n.z);
    p.group.rotation.y = n.yaw;
    p.update(dt, { moveX: 0, moveZ: speed, aimPitch: 0, turnRate: turn, air: 0, block: false, attack: false, firstPerson: false, relaxed: true, arms }, 0);
  };

  const rentedNow: boolean[] = L.ROOMS.map(() => false);
  L.ROOMS.forEach((_, i) => setPlaque(i, false));
  let active = true;
  let zoneNow: "in" | "out" = "in";
  const applyZone = () => {
    inside.visible = zoneNow === "in";
    outside.visible = zoneNow === "out";
    lampCheck = 0;
  };
  applyZone();

  const dynamicSolids = () => {
    const out: L.Solid[] = [];
    doors.forEach((d, i) => {
      if (d.open < 0.5) out.push(L.doorSolid(i));
    });
    return out;
  };

  return {
    group,
    dynamicSolids,
    solid: (x, y, z) => L.solidAt(x, y, z, 0, dynamicSolids()),
    air: (x, y, z, top, bottom) => L.airAt(x, y, z, top, bottom, dynamicSolids()),
    setRented(rented) {
      rented.forEach((r, i) => {
        if (!!r !== rentedNow[i]) {
          rentedNow[i] = !!r;
          setPlaque(i, !!r);
          // A newly rented room is unlocked and its door swings open.
          if (r) doors[i].target = 1;
        }
      });
    },
    doorOpen: (i) => doors[i]?.target > 0.5,
    toggleDoor(i) {
      const d = doors[i];
      if (d && rentedNow[i]) d.target = d.target > 0.5 ? 0 : 1;
    },
    setChestOpen(room, slot, open) {
      const c = chestLids[room]?.[slot];
      if (c) c.target = open ? 1 : 0;
    },
    npcSpots: () => npcs.filter((n) => n.p && n.p.group.visible).map((n) => ({ x: n.x, z: n.z })),
    setZone(z) {
      if (z === zoneNow) return;
      zoneNow = z;
      applyZone();
      for (const sl of slots) {
        sl.light.intensity = 0;
        sl.lamp = null;
        sl.leaving = false;
      }
    },
    zone: () => zoneNow,
    setActive(on) {
      active = on;
      group.visible = on;
      for (const s of slots) {
        s.light.intensity = 0;
        s.lamp = null;
        s.leaving = false;
      }
      lampCheck = 0;
    },
    update(dt, time, player) {
      if (!active) return;
      playerAt.copy(player);
      const zone = zoneOf(player.x, player.z);
      // Townsfolk: only the zone he is in lives (and only those near enough to matter animate).
      for (const n of npcs) {
        if (!n.p) continue;
        const here = n.tavern === (zoneNow === "in");
        n.p.group.visible = here;
        if (here && Math.hypot(n.x - player.x, n.z - player.z) < 30) updateNpc(n, dt);
      }
      // Doors and chest lids.
      for (const d of doors) {
        d.open += (d.target - d.open) * (1 - Math.exp(-dt * 5));
        d.pivot.rotation.y = -1.5 * d.open;
      }
      for (const room of chestLids) {
        for (const c of room) {
          c.open += (c.target - c.open) * (1 - Math.exp(-dt * 6));
          if (c.pivot) c.pivot.rotation.x = -1.75 * c.open;
        }
      }
      // Flames flicker; the rune ring turns and breathes; crystals orbit.
      for (const f of flames) {
        const k = 0.82 + 0.18 * Math.sin(time * 13 + f.seed) * Math.sin(time * 7.3 + f.seed * 2.1);
        f.m.scale.set(f.base * (0.9 + 0.1 * k), f.base * k * 1.1, f.base * (0.9 + 0.1 * k));
      }
      runeRing.rotation.z = time * 0.12;
      runeMat.opacity = 0.75 + 0.25 * Math.sin(time * 2.1);
      // The column dims while someone stands in it (and the camera is inside it).
      const onDais = Math.max(0, Math.min(1, (Math.hypot(player.x - L.DAIS.x, player.z - L.DAIS.z) - 1.0) / 1.8));
      beamMat.opacity = (0.12 + 0.05 * Math.sin(time * 1.7)) * (0.08 + 0.92 * onDais);
      beam.rotation.y = time * 0.3;
      crystals.forEach((c, i) => {
        const a = time * 0.6 + (i / crystals.length) * Math.PI * 2;
        c.position.set(L.DAIS.x + Math.sin(a) * 1.6, L.DAIS.h + 3.5 + 0.25 * Math.sin(time * 1.3 + i * 2), L.DAIS.z + Math.cos(a) * 1.6);
        c.rotation.y = time * 1.5 + i;
      });
      // Ambient: night sky outside, firelight within.
      const out = zone === "out" ? 1 : 0;
      const hall = zone === "hall" ? 1 : 0;
      const kh = 1 - Math.exp(-dt * 3);
      hemi.intensity += ((out ? 0.5 : hall ? 0.55 : 0.34) - hemi.intensity) * kh;
      hemi.color.lerp(new THREE.Color(out ? 0x8a96c0 : hall ? 0x6a6a90 : 0x8a6a4a), kh);
      moon.intensity += ((out ? 0.42 : 0) - moon.intensity) * kh;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(out ? 0x10131c : hall ? 0x0a0a10 : 0x0e0a08), kh);
        scene.fog.density += ((out ? 0.011 : hall ? 0.012 : 0.006) - scene.fog.density) * kh;
      }
      // The light pool: the nearest lamps where he is (other zones count for less).
      lampCheck -= dt;
      if (lampCheck <= 0) {
        lampCheck = 0.15;
        const score = (l: Lamp) => l.at.distanceTo(player) + (l.zone === zone ? 0 : 14);
        // Only the lamps of the zone being drawn.
        const ranked = lamps.filter((l) => (l.zone === "in") === (zoneNow === "in")).sort((a, b) => score(a) - score(b));
        const want = ranked.slice(0, slots.length);
        // The nearest gets the shadow.
        const first = want[0];
        if (first && slots[0].lamp !== first) {
          if (!slots[0].lamp) {
            slots[0].lamp = first;
            slots[0].leaving = false;
          } else slots[0].leaving = true;
        }
        for (const l of want.slice(1)) {
          if (slots.some((s) => s.lamp === l)) continue;
          const free = slots.find((s, i) => i > 0 && !s.lamp);
          if (free) {
            free.lamp = l;
            free.leaving = false;
            continue;
          }
          const worst = slots
            .filter((s, i) => i > 0 && !s.leaving && s.lamp)
            .sort((a, b) => score(b.lamp!) - score(a.lamp!))[0];
          if (worst && score(worst.lamp!) > score(l) + 3) worst.leaving = true;
        }
        for (let i = 1; i < slots.length; i++) if (slots[i].lamp && want.indexOf(slots[i].lamp!) < 0) slots[i].leaving = true;
      }
      for (const s of slots) {
        const l = s.lamp;
        let goal = 0;
        if (l && !s.leaving) {
          const fl = 1 - l.flicker * (0.5 + 0.5 * Math.sin(time * 11 + l.at.x * 3) * Math.sin(time * 6.7 + l.at.z * 2));
          goal = l.power * fl;
          s.light.position.copy(l.at);
          s.light.color.copy(l.color);
          s.light.distance = l.range;
        }
        s.light.intensity += (goal - s.light.intensity) * Math.min(1, dt * (s.leaving ? 6 : 4));
        if (s.leaving && s.light.intensity < 0.02) {
          s.lamp = null;
          s.leaving = false;
          s.light.intensity = 0;
        }
      }
    },
    drawMap(ctx, cw, ch, px, pz, py, time) {
      const upper = py > 2;
      const span = 34; // metres across
      const k = Math.min(cw, ch) / span;
      const X = (x: number) => cw / 2 + (x - px) * k;
      const Z = (z: number) => ch / 2 + (z - pz) * k;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(180,192,200,0.36)";
      for (const r of L.REGIONS) {
        if (r.kind === "flat") {
          if ((r.y > 2) !== upper) continue;
          ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
        } else if (r.kind === "rampZ") {
          ctx.fillStyle = "rgba(214,186,128,0.45)";
          ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
          ctx.fillStyle = "rgba(180,192,200,0.36)";
        }
      }
      // Walls and big furniture at this storey.
      ctx.fillStyle = "rgba(30,26,22,0.75)";
      const lo = upper ? L.UPPER_Y : 0;
      for (const s of L.SOLIDS.concat(dynamicSolids())) {
        if (!s.walk || s.y1 <= lo + 0.3 || s.y0 >= lo + 1.7) continue;
        ctx.fillRect(X(s.x0), Z(s.z0), Math.max(1, (s.x1 - s.x0) * k), Math.max(1, (s.z1 - s.z0) * k));
      }
      if (!upper) {
        // Stalls in their awning colours, the dais in violet.
        for (const st of L.townStalls()) {
          const m = MERCHANTS[st.merchant];
          const cx = st.x * 1.5 + st.nx * 0.9;
          const cz = st.z * 1.5;
          const sz = Math.max(5, k * 1.4);
          ctx.fillStyle = css(m?.cloth ?? 0x888888);
          ctx.strokeStyle = "#e6c48a";
          ctx.lineWidth = 1;
          ctx.fillRect(X(cx) - sz / 2, Z(cz) - sz / 2, sz, sz);
          ctx.strokeRect(X(cx) - sz / 2, Z(cz) - sz / 2, sz, sz);
        }
        const r = L.DAIS.r * k * (1 + 0.06 * Math.sin(time * 4));
        ctx.fillStyle = "rgba(160,110,255,0.35)";
        ctx.strokeStyle = "#c9a8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(L.DAIS.x), Z(L.DAIS.z), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (const n of npcs) {
          if (!n.p || !n.p.group.visible) continue;
          ctx.fillStyle = "#6ce88a";
          ctx.beginPath();
          ctx.arc(X(n.x), Z(n.z), Math.max(2, k * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Rented rooms' chests.
        L.ROOMS.forEach((r, i) => {
          if (!rentedNow[i]) return;
          ctx.fillStyle = "#ffcf5a";
          for (const c of r.chests) ctx.fillRect(X(c.x) - 3, Z(c.z) - 3, 6, 6);
        });
      }
      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, Math.max(3, k * 0.4), 0, Math.PI * 2);
      ctx.fill();
    },
    dispose() {
      alive = false;
      scene.remove(group);
      for (const n of npcs) n.p?.dispose();
      for (const d of doors) d.tex?.dispose();
      for (const o of owned) o.dispose();
    },
  };
}
