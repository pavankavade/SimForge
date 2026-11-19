// The town in 3D, built once from layout.ts: the Adventurers' Guild, a temple of marble columns
// (a pedimented portico over the entrance, a stoa along the front, colonnades in the great hall
// under a coffered ceiling). Inside: the great hall with the
// guild representative's desk and the teleporter dais, the Wayfarer's Rest with its gallery and
// rooms to rent, and the arena's sand ring), Guild Street in front of it with the merchants' stalls
// and a fountain, and the castle wall round it all. The surfaces are the same family of scanned
// CC0 materials as the dungeon below (stone blocks, plaster, worn boards, cobbles, roof tiles,
// sand); furniture is CC0 Patch models. The shell is boxes with world-scaled UVs, merged per
// material. A small pool of point lights follows him round the lamps, so the shader's light count
// never changes. The townsfolk are the same realistic humans as the merchants.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARMOR_SLOTS, createPaladin, type ArmorSlot, type Paladin } from "../../artifacts/characters/paladin";
import { makeFabric } from "../../engine/textures";
import { randomSpec } from "../CharacterCustomizer";
import { MERCHANTS, css } from "../merchants";
import { placeModel } from "../props3d";
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
  /** The nearest lamp's shadow (off on the lower graphics settings, graphics.ts). */
  setShadows: (on: boolean) => void;
  /** One open place now: kept for callers (no part is swapped out). */
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

// ---- Scanned surfaces --------------------------------------------------------------------------

const scanLoader = new THREE.TextureLoader();

/**
 * A scanned PBR surface from public/dungeon-explorer/assets/materials (1K maps, the same family as
 * the dungeon's stone and plaster), optionally tinted. Its maps are shared by `variant`s.
 */
function scanned(dir: string, file: string, own: (t: THREE.Texture) => void, opts: { tint?: number; roughness?: number; normal?: number } = {}) {
  const tex = (map: string, srgb: boolean) => {
    const t = scanLoader.load(`/assets/materials/${dir}/${file}_${map}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    own(t);
    return t;
  };
  const maps = { map: tex("baseColor", true), normalMap: tex("normal", false), roughnessMap: tex("roughness", false) };
  const make = (o: { tint?: number; roughness?: number; normal?: number } = {}) => {
    const n = o.normal ?? 1;
    return new THREE.MeshStandardMaterial({ ...maps, color: o.tint ?? 0xffffff, roughness: o.roughness ?? 1, metalness: 0, normalScale: new THREE.Vector2(n, n) });
  };
  return { mat: make(opts), variant: make };
}

/** UVs of a shape's own geometry (an extruded roof, a cylinder) scaled to `1 / tile` per metre. */
function scaleUV(g: THREE.BufferGeometry, k: number) {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute | undefined;
  if (!uv) return g;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  uv.needsUpdate = true;
  return g;
}

/** The quest board's notices: pinned parchment of different sizes, a few lines of scrawl each. */
function noticesTexture(): THREE.CanvasTexture {
  let s = 41;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return canvasTexture(512, 512, (g) => {
    g.fillStyle = "#4a2f1a";
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#e8d4a0";
    g.font = "bold 44px Georgia, 'Times New Roman', serif";
    g.textAlign = "center";
    g.fillText("NOTICES", 256, 58);
    const notes = [
      [40, 96, 200, 170],
      [262, 92, 210, 150],
      [56, 290, 170, 190],
      [250, 262, 220, 210],
    ];
    notes.forEach(([x, y, w, h], i) => {
      g.save();
      g.translate(x + w / 2, y + h / 2);
      g.rotate((rnd() - 0.5) * 0.12);
      g.fillStyle = i % 2 ? "#e6d3a3" : "#dcc690";
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = "#3a2a18";
      g.font = "bold 22px Georgia, serif";
      g.fillText(["WANTED", "BOUNTY", "REWARD", "HELP"][i], 0, -h / 2 + 32);
      g.fillStyle = "rgba(58,42,24,0.75)";
      for (let k = 0; k < 4; k++) g.fillRect(-w / 2 + 16, -h / 2 + 52 + k * 24, w - 32 - rnd() * 50, 5);
      g.fillStyle = "#8a1d14";
      g.beginPath();
      g.arc(0, -h / 2 + 8, 7, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
  });
}

// ---- Lamps -------------------------------------------------------------------------------------

interface Lamp {
  at: THREE.Vector3;
  color: THREE.Color;
  power: number;
  range: number;
  flicker: number;
  /** Lit inside the guild (else out on the street). */
  indoors: boolean;
}

// ---- The town ----------------------------------------------------------------------------------

export function createTown(gl: THREE.WebGLRenderer, scene: THREE.Scene): Town {
  const group = new THREE.Group();
  group.name = "town";
  scene.add(group);
  const owned: Array<{ dispose: () => void }> = [];
  let alive = true;
  const live = () => alive;
  const own = <T extends { dispose: () => void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const ownTex = (t: THREE.Texture) => {
    owned.push(t);
  };

  /** Woven cloth (banners, the rugs): the procedural weave, its maps owned here. */
  const fabric = (base: string, seed: number, twoSided: boolean) => {
    const set = makeFabric({ size: 256, base, seed });
    for (const t of [set.map, set.normalMap, set.roughnessMap]) if (t) owned.push(t);
    return new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, roughness: 0.95, side: twoSided ? THREE.DoubleSide : THREE.FrontSide });
  };
  /** No gloss: the scan's roughness map off (tiles under the night sky turned to mirrors). */
  const matte = (m: THREE.MeshStandardMaterial) => {
    m.roughnessMap = null;
    m.roughness = 0.95;
    return m;
  };
  // Materials: the scans, and a few plain ones for iron, flame and glass.
  const blocks = scanned("medievalBlocks05", "medieval_blocks_05", ownTex);
  const wood = scanned("darkWoodenPlanks", "dark_wooden_planks", ownTex, { roughness: 0.9 });
  const marble = scanned("marble01", "marble_01", ownTex, { tint: 0xfff8ee, roughness: 0.7 });
  const M = {
    blocks: own(blocks.mat),
    marble: own(marble.mat),
    marbleTrim: own(marble.variant({ tint: 0xf4ecdc, roughness: 0.6 })),
    marbleShade: own(marble.variant({ tint: 0xb8ad98, roughness: 0.75 })),
    marbleFloor: own(scanned("marbleTiles", "marble_tiles", ownTex, { roughness: 0.45 }).mat),
    sandstone: own(scanned("sandstoneBlocks", "large_sandstone_blocks", ownTex, { tint: 0xe6dccb }).mat),
    darkBlocks: own(blocks.variant({ tint: 0x8c867e })),
    plaster: own(scanned("medievalWall01", "medieval_wall_01", ownTex, { tint: 0xfff2dc }).mat),
    hallFloor: own(scanned("stoneTiles02", "stone_tiles_02", ownTex, { roughness: 0.85 }).mat),
    boards: own(scanned("woodFloorWorn", "wood_floor_worn", ownTex, { roughness: 0.8 }).mat),
    cobbles: own(scanned("cobblestonePavement", "cobblestone_pavement", ownTex).mat),
    roof: own(matte(scanned("roofTiles", "roof_tiles", ownTex, { tint: 0xe8c8b0 }).mat)),
    sand: own(scanned("aerialSand", "aerial_sand", ownTex, { tint: 0xf2e2c4 }).mat),
    wood: own(wood.mat),
    lightWood: own(wood.variant({ tint: 0xd8b48a, roughness: 0.85 })),
    iron: own(new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.5, metalness: 0.85 })),
    soot: own(new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 1 })),
    glassWarm: own(new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffa448, emissiveIntensity: 0.8, roughness: 0.3 })),
    glassDark: own(new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.25, metalness: 0.3 })),
    flame: own(new THREE.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false })),
    flameCore: own(new THREE.MeshBasicMaterial({ color: 0xfff0c0 })),
    candle: own(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 })),
    bannerRed: own(fabric("#7a1612", 5, true)),
    bannerBlue: own(fabric("#1c2f6a", 6, true)),
    rug: own(fabric("#6a1e1a", 12, false)),
    gold: own(new THREE.MeshStandardMaterial({ color: 0xd8b060, roughness: 0.35, metalness: 0.8 })),
    water: own(new THREE.MeshStandardMaterial({ color: 0x14303c, emissive: 0x0c2a3a, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.85 })),
  };
  const tiles = new Map<THREE.Material, number>([
    [M.blocks, 3],
    [M.marble, 3.2],
    [M.marbleTrim, 2.4],
    [M.marbleShade, 2.4],
    [M.marbleFloor, 3.4],
    [M.sandstone, 3],
    [M.darkBlocks, 3],
    [M.plaster, 3.2],
    [M.hallFloor, 3],
    [M.boards, 2.6],
    [M.cobbles, 3.2],
    [M.roof, 3],
    [M.sand, 5],
    [M.wood, 2],
    [M.lightWood, 2],
    [M.rug, 1.4],
    [M.bannerRed, 2],
    [M.bannerBlue, 2],
  ]);
  const B = new Builder(tiles);
  const G = group;

  const lamps: Lamp[] = [];
  const lamp = (x: number, y: number, z: number, color: number, power: number, range: number, flicker = 0.12) =>
    lamps.push({ at: new THREE.Vector3(x, y, z), color: new THREE.Color(color), power, range, flicker, indoors: L.indoors(x, z) });
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
  /** A flat sign on a wall face, `nx, nz` the way it faces (along an axis). */
  const sign = (lines: string[], x: number, y: number, z: number, nx: number, nz: number, w: number, h: number, bg = "#2c1c0e", fg = "#f2d27a") => {
    const tex = own(signTexture(lines, bg, fg, 512, Math.round((512 * h) / w)));
    const face = own(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    const m = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), face);
    m.position.set(x + nx * 0.06, y, z + nz * 0.06);
    m.rotation.y = Math.atan2(nx, nz);
    G.add(m);
    // Its board: wide along the wall, thin out of it.
    const along = w / 2 + 0.08;
    if (nz) B.box(M.wood, x - along, x + along, y - h / 2 - 0.08, y + h / 2 + 0.08, z - 0.02, z + 0.02);
    else B.box(M.wood, x - 0.02, x + 0.02, y - h / 2 - 0.08, y + h / 2 + 0.08, z - along, z + along);
  };
  /** A hanging banner (a cloth panel with a pole along its top), facing `nx, nz`. */
  const banner = (mat: THREE.Material, x: number, y0: number, y1: number, z: number, nx: number, nz: number, w = 1.3) => {
    const tx = -nz;
    const tz = nx;
    const cx = x + nx * 0.1;
    const cz = z + nz * 0.1;
    const m = new THREE.Mesh(own(new THREE.PlaneGeometry(w, y1 - y0)), mat);
    m.position.set(cx, (y0 + y1) / 2, cz);
    m.rotation.y = Math.atan2(nx, nz);
    G.add(m);
    // A gold trim at the foot and the pole.
    B.box(M.gold, Math.min(cx - tx * w * 0.5, cx + tx * w * 0.5) - 0.02, Math.max(cx - tx * w * 0.5, cx + tx * w * 0.5) + 0.02, y0 - 0.06, y0, Math.min(cz - tz * w * 0.5, cz + tz * w * 0.5) - 0.02, Math.max(cz - tz * w * 0.5, cz + tz * w * 0.5) + 0.02);
    B.turned(M.iron, w + 0.3, 0.06, 0.06, [cx, y1 + 0.04, cz], [0, Math.atan2(tx, tz) - Math.PI / 2, 0]);
  };
  /** A torch in an iron bracket on a wall face, lit. */
  const torch = (x: number, y: number, z: number, nx: number, nz: number) => {
    B.box(M.iron, x - 0.05 + Math.min(0, nx) * 0.25, x + 0.05 + Math.max(0, nx) * 0.25, y - 0.05, y + 0.05, z - 0.05 + Math.min(0, nz) * 0.25, z + 0.05 + Math.max(0, nz) * 0.25);
    const tx = x + nx * 0.25;
    const tz = z + nz * 0.25;
    B.turned(M.wood, 0.07, 0.5, 0.07, [tx, y + 0.2, tz], [nz * 0.25, 0, -nx * 0.25]);
    flame(tx + nx * 0.06, y + 0.44, tz + nz * 0.06, 1.25);
    lamp(tx + nx * 0.3, y + 0.5, tz + nz * 0.3, 0xff9a48, 4.2, 10, 0.25);
  };
  /** An iron hoop of candles on chains, hung from `top`. */
  const hoop = own(new THREE.TorusGeometry(0.85, 0.04, 8, 32));
  const wax = own(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 8));
  const chandelier = (x: number, y: number, z: number, top: number, power = 7, range = 14) => {
    const h = new THREE.Mesh(hoop, M.iron);
    h.position.set(x, y, z);
    h.rotation.x = Math.PI / 2;
    G.add(h);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      B.turned(M.iron, 0.02, top - y, 0.02, [x + Math.sin(a) * 0.4, (top + y) / 2, z + Math.cos(a) * 0.4], [0, 0, 0]);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const cx = x + Math.sin(a) * 0.85;
      const cz = z + Math.cos(a) * 0.85;
      const m = new THREE.Mesh(wax, M.candle);
      m.position.set(cx, y + 0.1, cz);
      G.add(m);
      flame(cx, y + 0.18, cz, 0.7);
    }
    lamp(x, y - 0.1, z, 0xffc888, power, range);
  };
  /** An iron brazier with a fire in it. */
  const brazier = (x: number, z: number) => {
    const bowl = new THREE.Mesh(own(new THREE.CylinderGeometry(0.45, 0.25, 0.32, 16, 1, true)), M.iron);
    bowl.position.set(x, 1.05, z);
    G.add(bowl);
    B.box(M.iron, x - 0.05, x + 0.05, 0, 0.9, z - 0.05, z + 0.05);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      B.turned(M.iron, 0.04, 1.0, 0.04, [x + Math.sin(a) * 0.22, 0.5, z + Math.cos(a) * 0.22], [Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]);
    }
    fire(x, 1.1, z, 0.22);
    lamp(x, 1.7, z, 0xff8a3a, 5.5, 12, 0.3);
  };

  // ---- The shell -----------------------------------------------------------------------------------
  for (const s of L.STRUCTURE) {
    if (s.part === "rail") continue;
    if (s.part === "stair") {
      // Wooden treads, each with a nosing standing proud.
      B.box(M.lightWood, s.x0, s.x1, s.y0, s.y1 - 0.03, s.z0, s.z1);
      B.box(M.wood, s.x0, s.x1, s.y1 - 0.06, s.y1, s.z0 - 0.02, s.z1 + 0.03);
      continue;
    }
    const hallCeiling = s.part === "ceiling" && s.x0 > -11 && s.x1 < 11;
    const mat = s.part === "border" ? M.marble : hallCeiling ? M.marbleTrim : s.part === "ceiling" || s.part === "slab" ? M.wood : s.part === "rooms" ? M.plaster : M.marble;
    B.box(mat, s.x0, s.x1, s.y0, s.y1, s.z0, s.z1);
  }
  const T = L.TAVERN;
  const H = L.HALL;
  const A = L.ARENA_WING;
  const WT = L.WT;
  // The tavern's walls are plastered inside, over a wooden wainscot (the hall and the arena show
  // their marble).
  {
    const lin = 0.03;
    const plasterWall = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => {
      B.box(M.plaster, x0, x1, Math.max(y0, 1.1), y1, z0, z1);
    };
    // Front, back and west walls (ground floor and upstairs).
    plasterWall(T.x0, T.x1, 0, lin, 0, L.TAVERN_TOP);
    plasterWall(T.x0, T.x1, T.z1 - lin, T.z1, 0, L.SLAB_Y);
    plasterWall(T.x0, T.x0 + lin, 0, T.z1, 0, L.SLAB_Y);
    plasterWall(T.x0, T.x0 + lin, 0, L.GALLERY_Z, L.SLAB_Y, L.TAVERN_TOP);
    // The partition's west face, round its arch.
    plasterWall(T.x1 - lin, T.x1, 0, L.SIDE_ARCH.z0, 0, L.TAVERN_TOP);
    plasterWall(T.x1 - lin, T.x1, L.SIDE_ARCH.z1, T.z1, 0, L.TAVERN_TOP);
    B.box(M.plaster, T.x1 - lin, T.x1, L.SIDE_ARCH.top, L.TAVERN_TOP, L.SIDE_ARCH.z0, L.SIDE_ARCH.z1);
    // Upstairs, in the rooms.
    plasterWall(T.x0, T.x1, T.z1 - lin, T.z1, L.UPPER_Y, L.TAVERN_TOP);
    plasterWall(T.x0, T.x0 + lin, L.GALLERY_Z, T.z1, L.UPPER_Y, L.TAVERN_TOP);
    // The wainscot: boards up to the dado rail, round the ground floor.
    const ws = 0.05;
    B.box(M.wood, T.x0 + 1.4, T.x1, 0, 1.1, 0, ws);
    B.box(M.wood, T.x0, T.x0 + ws, 0, 1.1, L.STAIR.z1, T.z1);
    B.box(M.wood, T.x1 - ws, T.x1, 0, 1.1, 0, L.SIDE_ARCH.z0);
    B.box(M.wood, T.x1 - ws, T.x1, 0, 1.1, L.SIDE_ARCH.z1, T.z1);
    B.box(M.wood, T.x0, T.x1, 0, 1.1, T.z1 - ws, T.z1);
    // Posts and beams in the plaster: a timber frame.
    for (const x of [-27.5, -21.5, -15.5]) {
      B.box(M.wood, x - 0.14, x + 0.14, 1.1, L.TAVERN_TOP, 0.03, 0.12);
      B.box(M.wood, x - 0.14, x + 0.14, 0, L.SLAB_Y, T.z1 - 0.12, T.z1 - 0.03);
    }
    for (let z = 2; z < T.z1; z += 3) B.box(M.wood, T.x0, T.x1, L.TAVERN_TOP - 0.32, L.TAVERN_TOP, z - 0.14, z + 0.14);
    for (let x = T.x0 + 2.5; x < T.x1; x += 3.4) B.box(M.wood, x - 0.12, x + 0.12, L.SLAB_Y - 0.3, L.SLAB_Y, L.GALLERY_Z, T.z1);
  }

  // ---- Floors ----------------------------------------------------------------------------------
  B.box(M.cobbles, L.STREET.x0, L.STREET.x1, -0.12, 0, L.STREET.z0, L.STREET.z1);
  B.box(M.marbleTrim, L.ENTRANCE.x0, L.ENTRANCE.x1, -0.12, 0, -WT, 0);
  B.box(M.marbleFloor, H.x0, H.x1, -0.12, 0, H.z0, H.z1);
  B.box(M.marbleTrim, T.x1, H.x0, -0.12, 0, L.SIDE_ARCH.z0, L.SIDE_ARCH.z1);
  B.box(M.marbleTrim, H.x1, A.x0, -0.12, 0, L.SIDE_ARCH.z0, L.SIDE_ARCH.z1);
  // The stylobate: one marble step up from the street under the stoa and the portico.
  B.box(M.marbleFloor, L.STREET.x0, L.STREET.x1, -0.12, L.STYLOBATE, L.STOA.front - 0.3, -WT);
  B.box(M.marbleFloor, L.PORTICO.x0, L.PORTICO.x1, -0.12, L.STYLOBATE, L.PORTICO.front - 0.5, L.STOA.front - 0.3);
  B.box(M.boards, T.x0, T.x1, -0.12, 0, T.z0, T.z1);
  B.box(M.boards, T.x0, T.x1, L.UPPER_Y - 0.03, L.UPPER_Y, L.GALLERY_Z, T.z1);
  B.box(M.marbleFloor, A.x0, A.x1, -0.12, 0, A.z0, A.z1);
  B.box(M.sand, L.RING.x0, L.RING.x1, 0, 0.012, L.RING.z0, L.RING.z1);
  // A red runner from the door to the desk, and from the desk to the dais.
  B.box(M.rug, -1.3, 1.3, 0, 0.015, 0.6, L.DESK.z0 - 0.4);
  B.box(M.rug, -1.3, 1.3, 0, 0.015, 12.6, L.DAIS.z - L.DAIS.r - L.DAIS.step - 0.3);

  // ---- Columns ---------------------------------------------------------------------------------------
  // A Doric order: a plinth and a torus at the foot, a fluted shaft with a slight swell (entasis),
  // the echinus and the square abacus on top. One set of shapes per size, shared by every column.
  const columnParts = new Map<string, { shaft: THREE.BufferGeometry; echinus: THREE.BufferGeometry; torus: THREE.BufferGeometry }>();
  const partsFor = (r: number, h: number) => {
    const key = `${r}|${h}`;
    let parts = columnParts.get(key);
    if (parts) return parts;
    const shaftH = h - r * 0.9 - r * 0.85;
    const g = new THREE.CylinderGeometry(r * 0.84, r, shaftH, 96, 18, true);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const a = Math.atan2(x, z);
      const t = (y + shaftH / 2) / shaftH;
      // Twenty flutes, sharp arrises between them; a swell a third of the way up.
      const flute = 1 - 0.055 * Math.pow(0.5 + 0.5 * Math.cos(a * 20), 1.6);
      const bulge = 1 + 0.025 * Math.sin(Math.PI * Math.min(1, t * 1.4));
      pos.setX(i, x * flute * bulge);
      pos.setZ(i, z * flute * bulge);
      uv.setXY(i, (uv.getX(i) * Math.PI * 2 * r) / 2.6, (uv.getY(i) * shaftH) / 2.6);
    }
    g.computeVertexNormals();
    parts = {
      shaft: own(g),
      echinus: own(scaleUV(new THREE.CylinderGeometry(r * 1.32, r * 0.86, r * 0.5, 48, 1), 0.4)),
      torus: own(new THREE.TorusGeometry(r * 1.02, r * 0.13, 10, 48)),
    };
    columnParts.set(key, parts);
    return parts;
  };
  const column = (c: L.Column) => {
    const { r, h, y } = c;
    const parts = partsFor(r, h);
    // Plinth and torus, the shaft, the echinus and the abacus.
    B.box(M.marbleTrim, c.x - r * 1.3, c.x + r * 1.3, y, y + r * 0.45, c.z - r * 1.3, c.z + r * 1.3);
    const t = new THREE.Mesh(parts.torus, M.marbleTrim);
    t.rotation.x = Math.PI / 2;
    t.position.set(c.x, y + r * 0.58, c.z);
    G.add(t);
    const shaftH = h - r * 0.9 - r * 0.85;
    const sh = new THREE.Mesh(parts.shaft, M.marble);
    sh.position.set(c.x, y + r * 0.9 + shaftH / 2, c.z);
    G.add(sh);
    const ech = new THREE.Mesh(parts.echinus, M.marbleTrim);
    ech.position.set(c.x, y + h - r * 0.85 + r * 0.25, c.z);
    G.add(ech);
    B.box(M.marbleTrim, c.x - r * 1.45, c.x + r * 1.45, y + h - r * 0.35, y + h, c.z - r * 1.45, c.z + r * 1.45);
  };
  for (const c of L.COLUMNS) column(c);

  /**
   * An entablature on columns along x, its face to the street (north): the architrave, the frieze
   * with its triglyphs, the cornice over them. (y: its foot; zf: its face; zb: its back.)
   */
  const entablature = (x0: number, x1: number, zf: number, zb: number, y: number, scale = 1) => {
    const a = 0.62 * scale;
    const f = 0.62 * scale;
    const c = 0.3 * scale;
    B.box(M.marbleTrim, x0, x1, y, y + a, zf, zb);
    B.box(M.marbleTrim, x0, x1, y + a - 0.08, y + a, zf - 0.06, zb);
    B.box(M.marble, x0, x1, y + a, y + a + f, zf + 0.05, zb);
    const step = 1.25 * scale;
    for (let x = x0 + step / 2; x < x1 - 0.2; x += step) B.box(M.marbleShade, x - 0.2 * scale, x + 0.2 * scale, y + a, y + a + f, zf, zf + 0.06);
    B.box(M.marbleTrim, x0 - 0.3, x1 + 0.3, y + a + f, y + a + f + c, zf - 0.32, zb);
    B.box(M.marbleShade, x0 - 0.3, x1 + 0.3, y + a + f - 0.06, y + a + f, zf - 0.22, zb);
    return y + a + f + c;
  };
  /** The same running along z (the hall's colonnades inside, the portico's flanks), face to `side`. */
  const entablatureZ = (z0: number, z1: number, xc: number, half: number, y: number, side: number) => {
    B.box(M.marbleTrim, xc - half, xc + half, y, y + 0.62, z0, z1);
    B.box(M.marble, xc - half + 0.05, xc + half - 0.05, y + 0.62, y + 1.24, z0, z1);
    for (let z = z0 + 0.62; z < z1 - 0.2; z += 1.25) B.box(M.marbleShade, xc + side * half - 0.03, xc + side * half + 0.03, y + 0.62, y + 1.24, z - 0.2, z + 0.2);
    B.box(M.marbleTrim, xc - half - 0.3, xc + half + 0.3, y + 1.24, y + 1.54, z0 - 0.3, z1 + 0.3);
    return y + 1.54;
  };

  // ---- The temple front: the portico with its pediment, the stoa along the wings ------------------
  {
    const zf = -WT;
    const P = L.PORTICO;
    const SB = L.STYLOBATE;
    const E = L.ENTRANCE;
    // The entrance: a marble surround and lintel, gilded bronze doors folded back, lanterns.
    B.box(M.marbleTrim, E.x0 - 0.7, E.x0, 0, E.top + 0.5, zf - 0.3, zf);
    B.box(M.marbleTrim, E.x1, E.x1 + 0.7, 0, E.top + 0.5, zf - 0.3, zf);
    B.box(M.marbleTrim, E.x0 - 1.0, E.x1 + 1.0, E.top, E.top + 0.8, zf - 0.4, zf);
    B.box(M.marbleShade, E.x0 - 1.1, E.x1 + 1.1, E.top + 0.8, E.top + 0.95, zf - 0.5, zf);
    for (const x of [E.x0, E.x1]) B.box(M.marbleTrim, x - 0.12, x + 0.12, 0, E.top, -WT, 0);
    for (const sgn of [-1, 1]) B.box(M.gold, sgn * (E.x1 + 0.02) - (sgn > 0 ? 0 : 1.2), sgn * (E.x1 + 0.02) + (sgn > 0 ? 1.2 : 0), 0.1, E.top - 0.2, zf + 0.62, zf + 0.7);
    for (const x of [E.x0 - 1.5, E.x1 + 1.5]) {
      B.box(M.gold, x - 0.04, x + 0.04, 4.1, 4.18, zf - 0.45, zf);
      const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.26, 0.38, 0.26)), M.glassWarm);
      l.position.set(x, 3.9, zf - 0.42);
      G.add(l);
      lamp(x, 3.8, zf - 1.4, 0xffc888, 4.5, 11);
    }
    // The portico: an entablature round its front and flanks, the pediment over the front with the
    // guild's name on the architrave and a gilded crest in the tympanum, a tiled roof behind.
    const capTop = SB + P.h;
    const top = entablature(P.x0 - 0.2, P.x1 + 0.2, P.front, zf, capTop, 1.05);
    for (const sx of [-1, 1]) entablatureZ(P.front + 0.3, zf, sx * 8.4, 0.62, capTop, sx);
    const inscription = own(new THREE.MeshStandardMaterial({ map: own(signTexture(["ADVENTURERS' GUILD"], "#e7dcc6", "#5a4a30", 1024, 96)), roughness: 0.6 }));
    const ins = new THREE.Mesh(own(new THREE.PlaneGeometry(9.6, 0.5)), inscription);
    ins.position.set(0, capTop + 0.33, P.front - 0.01);
    ins.rotation.y = Math.PI;
    G.add(ins);
    const span = P.x1 - P.x0 + 0.6;
    const rise = P.apex - top;
    {
      const tymp = gablePrism(top, P.apex - 0.3, span - 0.9, 0.5);
      tymp.translate(P.x0 - 0.3 + 0.45, 0, P.front + 0.2);
      B.geo(M.marble, scaleUV(tymp, 1 / 3));
      const back = gablePrism(top, P.apex, span, 0.4);
      back.translate(P.x0 - 0.3, 0, zf - 0.4);
      B.geo(M.marble, scaleUV(back, 1 / 3));
      // Raking cornices up both slopes, and the roof's two slopes back to the hall's front.
      const len = Math.hypot(span / 2, rise) + 0.5;
      const ang = Math.atan2(rise, span / 2);
      const midY = top + rise / 2 + 0.12;
      B.turned(M.marbleTrim, len, 0.36, 1.0, [P.x0 - 0.3 + span / 4, midY, P.front - 0.1], [0, 0, ang]);
      B.turned(M.marbleTrim, len, 0.36, 1.0, [P.x1 + 0.3 - span / 4, midY, P.front - 0.1], [0, 0, -ang]);
      const depth = zf - P.front + 0.4;
      B.turned(M.roof, len, 0.24, depth, [P.x0 - 0.3 + span / 4, midY + 0.16, (P.front + zf) / 2], [0, 0, ang]);
      B.turned(M.roof, len, 0.24, depth, [P.x1 + 0.3 - span / 4, midY + 0.16, (P.front + zf) / 2], [0, 0, -ang]);
      // A coffered ceiling under the portico.
      for (let x = P.x0; x <= P.x1 + 0.01; x += (P.x1 - P.x0) / 6) B.box(M.marbleTrim, x - 0.15, x + 0.15, capTop - 0.02, capTop + 0.25, P.front, zf);
      B.box(M.marbleShade, P.x0, P.x1, capTop + 0.25, capTop + 0.4, P.front, zf);
      // The crest in the tympanum, and gilded acroteria at the apex and the corners.
      const crest = new THREE.Mesh(own(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 40)), M.gold);
      crest.rotation.x = Math.PI / 2;
      crest.position.set(0, top + rise * 0.42, P.front + 0.12);
      G.add(crest);
      const star = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.42, 0)), M.gold);
      star.position.set(0, top + rise * 0.42, P.front + 0.02);
      star.scale.set(1, 1.3, 0.25);
      G.add(star);
      for (const [x, y] of [
        [0, P.apex + 0.35],
        [P.x0 - 0.2, top + 0.35],
        [P.x1 + 0.2, top + 0.35],
      ]) {
        const o = new THREE.Mesh(own(new THREE.ConeGeometry(0.28, 0.8, 4)), M.gold);
        o.position.set(x, y, P.front - 0.05);
        G.add(o);
      }
    }
    // Braziers on tall tripods either side of the portico steps.
    for (const x of [P.x0 + 0.2, P.x1 - 0.2]) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        B.turned(M.gold, 0.05, 2.0, 0.05, [x + Math.sin(a) * 0.25, 1.0, P.front - 1.4 + Math.cos(a) * 0.25], [Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15]);
      }
      const bowl = new THREE.Mesh(own(new THREE.CylinderGeometry(0.5, 0.25, 0.35, 16, 1, true)), M.gold);
      bowl.position.set(x, 2.1, P.front - 1.4);
      G.add(bowl);
      fire(x, 2.15, P.front - 1.4, 0.25);
      lamp(x, 2.8, P.front - 1.4, 0xff9a48, 7.5, 15, 0.28);
    }
    // The stoa: an entablature along each wing's colonnade, a coffered porch ceiling, a cornice.
    const S = L.STOA;
    const stoaCap = SB + S.h;
    for (const [x0, x1] of [
      [L.GUILD.x0 - WT, -10 - 0.3],
      [10 + 0.3, L.GUILD.x1 + WT],
    ]) {
      const st = entablature(x0, x1, S.front, zf, stoaCap, 0.8);
      B.box(M.marbleShade, x0, x1, stoaCap - 0.02, stoaCap + 0.1, S.front + 0.4, zf);
      for (let x = x0 + 1.85; x < x1; x += 3.7) B.box(M.marbleTrim, x - 0.12, x + 0.12, stoaCap - 0.25, stoaCap, S.front + 0.4, zf);
      // Antefixes along the cornice, lanterns hung between the columns.
      for (let x = x0 + 0.9; x < x1; x += 1.85) B.box(M.marbleTrim, x - 0.12, x + 0.12, st, st + 0.32, S.front - 0.34, S.front - 0.2);
      for (let x = x0 + 3.7; x < x1 - 1; x += 7.4) {
        B.box(M.gold, x - 0.015, x + 0.015, 4.8, stoaCap, -3.3, -3.27);
        const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.24, 0.34, 0.24)), M.glassWarm);
        l.position.set(x, 4.6, -3.3);
        G.add(l);
        lamp(x, 4.5, -3.6, 0xffc078, 4.2, 10);
      }
    }
    // Windows of the wings between the columns, their signs over the stalls, high windows above.
    for (const x of [-29, -24.5, -17, -13]) {
      B.box(M.glassWarm, x - 0.55, x + 0.55, 1.4, 2.9, zf - 0.03, zf + 0.02);
      B.box(M.marbleTrim, x - 0.7, x + 0.7, 1.26, 1.4, zf - 0.14, zf);
      B.box(M.marbleTrim, x - 0.7, x + 0.7, 2.9, 3.05, zf - 0.1, zf);
    }
    for (const x of [14, 18, 24, 28]) B.box(M.glassDark, x - 0.3, x + 0.3, 7.9, 9.4, zf - 0.03, zf + 0.02);
    sign(["THE WAYFARER'S REST", "rooms · ale · hot food"], -21, 4.4, zf, 0, -1, 4.2, 0.95, "#3a2412", "#e8c878");
    sign(["THE ARENA", "no gear is lost here"], 21, 4.4, zf, 0, -1, 4.0, 0.95, "#3a1210", "#f0c070");
    banner(M.bannerRed, -10.9, 0.6, 5.0, -WT - 0.02, 0, -1, 0.9);
    banner(M.bannerBlue, 10.9, 0.6, 5.0, -WT - 0.02, 0, -1, 0.9);
    // A cornice along the top of the hall's front and back, low tiled roofs over the wings.
    B.box(M.marbleTrim, -10.4, 10.4, L.HALL_TOP, L.HALL_TOP + 0.45, zf - 0.35, L.GUILD.z1 + WT + 0.3);
    B.box(M.marbleTrim, 10.3, L.GUILD.x1 + WT + 0.3, L.ARENA_TOP, L.ARENA_TOP + 0.35, zf - 0.3, L.GUILD.z1 + WT + 0.3);
    const roof = (x0: number, x1: number, eave: number, ridge: number) => {
      const z0 = -WT - 0.6;
      const z1 = L.GUILD.z1 + WT + 0.6;
      const half = (z1 - z0) / 2;
      const len = Math.hypot(half, ridge - eave) + 0.3;
      const ang = Math.atan2(ridge - eave, half);
      const y = (eave + ridge) / 2 + 0.12;
      B.turned(M.roof, x1 - x0, 0.22, len, [(x0 + x1) / 2, y, z0 + half / 2], [-ang, 0, 0]);
      B.turned(M.roof, x1 - x0, 0.22, len, [(x0 + x1) / 2, y, z1 - half / 2], [ang, 0, 0]);
      B.box(M.marbleTrim, x0, x1, ridge + 0.05, ridge + 0.28, (z0 + z1) / 2 - 0.18, (z0 + z1) / 2 + 0.18);
      for (const gx of [x0 + 0.1, x1 - 0.5]) {
        const g = gablePrism(eave, ridge, z1 - z0 - 0.4, 0.4);
        g.rotateY(Math.PI / 2);
        g.translate(gx, 0, z1 - 0.2);
        B.geo(M.marble, scaleUV(g, 1 / 3));
      }
    };
    roof(L.GUILD.x0 - WT - 0.4, -10.3, L.TAVERN_TOP + 0.3, L.TAVERN_TOP + 2.6);
    roof(10.3, L.GUILD.x1 + WT + 0.4, L.ARENA_TOP + 0.35, L.ARENA_TOP + 2.4);
  }

  // ---- The border wall ----------------------------------------------------------------------------
  {
    const top = L.BORDER_H;
    const S0 = L.SITE;
    // A sandstone plinth, pilasters at intervals, a marble cornice along the top.
    B.box(M.sandstone, S0.x0, S0.x1, 0, 0.7, S0.z0, S0.z0 + 0.18);
    B.box(M.sandstone, S0.x0, S0.x0 + 0.18, 0, 0.7, S0.z0, -WT);
    B.box(M.sandstone, S0.x1 - 0.18, S0.x1, 0, 0.7, S0.z0, -WT);
    for (let x = S0.x0 + 3; x < S0.x1 - 1; x += 6) if (Math.abs(x) > 4) B.box(M.marbleTrim, x - 0.4, x + 0.4, 0, top, S0.z0, S0.z0 + 0.25);
    for (let z = S0.z0 + 3; z < -8; z += 6) {
      B.box(M.marbleTrim, S0.x0, S0.x0 + 0.25, 0, top, z - 0.4, z + 0.4);
      B.box(M.marbleTrim, S0.x1 - 0.25, S0.x1, 0, top, z - 0.4, z + 0.4);
    }
    B.box(M.marbleTrim, S0.x0 - 1.2, S0.x1 + 1.2, top, top + 0.4, S0.z0 - 1.3, S0.z0 + 0.3);
    B.box(M.marbleTrim, S0.x0 - 1.3, S0.x0 + 0.3, top, top + 0.4, S0.z0, -WT);
    B.box(M.marbleTrim, S0.x1 - 0.3, S0.x1 + 1.3, top, top + 0.4, S0.z0, -WT);
    for (let x = S0.x0 - 1; x < S0.x1 + 1; x += 1.6) B.box(M.marble, x, x + 0.5, top + 0.4, top + 0.75, S0.z0 - 0.9, S0.z0 - 0.4);
    // Torches between the pilasters.
    for (const x of [-24, -12, 12, 24]) torch(x, 2.8, S0.z0, 0, 1);
    for (const z of [-24, -15]) {
      torch(S0.x0, 2.8, z, 1, 0);
      torch(S0.x1, 2.8, z, -1, 0);
    }
    // The town gate in the north wall (shut): two columns, an entablature, a small pediment.
    for (const x of [-2.6, 2.6]) column({ x, z: S0.z0 + 0.7, r: 0.34, h: 4.4, y: 0 });
    entablature(-3.4, 3.4, S0.z0 + 0.15, S0.z0 + 1.2, 4.4, 0.6);
    {
      const g = gablePrism(5.32, 6.6, 7.0, 0.5);
      g.translate(-3.5, 0, S0.z0 + 0.3);
      B.geo(M.marble, scaleUV(g, 1 / 3));
    }
    M3("rooms/large_castle_door", [0, 0, S0.z0 + 0.12], { scale: 1.05 });
  }

  // ---- Out on the street: the fountain, lamp posts, sundries ----------------------------------------
  {
    const F = L.FOUNTAIN;
    const ring = new THREE.Mesh(own(scaleUV(new THREE.CylinderGeometry(F.r, F.r + 0.08, 0.75, 32, 1, true), 1)), M.darkBlocks);
    ring.position.set(F.x, 0.375, F.z);
    G.add(ring);
    const lip = new THREE.Mesh(own(new THREE.TorusGeometry(F.r, 0.12, 8, 40)), M.darkBlocks);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(F.x, 0.75, F.z);
    G.add(lip);
    const water = new THREE.Mesh(own(new THREE.CircleGeometry(F.r - 0.05, 32)), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(F.x, 0.6, F.z);
    G.add(water);
    const column = new THREE.Mesh(own(new THREE.CylinderGeometry(0.22, 0.32, 1.9, 12)), M.blocks);
    column.position.set(F.x, 0.95, F.z);
    G.add(column);
    const bowl = new THREE.Mesh(own(new THREE.CylinderGeometry(0.75, 0.3, 0.3, 20)), M.darkBlocks);
    bowl.position.set(F.x, 1.95, F.z);
    G.add(bowl);
    const top = new THREE.Mesh(own(new THREE.CircleGeometry(0.68, 20)), M.water);
    top.rotation.x = -Math.PI / 2;
    top.position.set(F.x, 2.08, F.z);
    G.add(top);
    lamp(F.x, 2.6, F.z, 0x8ab8ff, 1.6, 7, 0.02);
    for (const f of L.FURNITURE.filter((q) => q.kind === "lamppost")) {
      B.box(M.iron, f.x - 0.07, f.x + 0.07, 0, 3.4, f.z - 0.07, f.z + 0.07);
      B.box(M.darkBlocks, f.x - 0.2, f.x + 0.2, 0, 0.35, f.z - 0.2, f.z + 0.2);
      const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.3, 0.42, 0.3)), M.glassWarm);
      l.position.set(f.x, 3.6, f.z);
      G.add(l);
      B.box(M.iron, f.x - 0.2, f.x + 0.2, 3.82, 3.88, f.z - 0.2, f.z + 0.2);
      lamp(f.x, 3.55, f.z, 0xffc078, 5.0, 13, 0.08);
    }
    // Crates and barrels by the stalls, a cart's worth of goods.
    const SB = L.STYLOBATE;
    M3("market/wine_barrel_01", [-25.5, SB, -1.6], { scale: 0.9 });
    M3("market/wine_barrel_01", [-26.6, SB, -1.4], { scale: 0.85, yaw: 1 });
    M3("market/wooden_crate_01", [25, SB, -1.7], { yaw: 0.3 });
    M3("rooms/wooden_crate_02", [26.4, SB, -1.6], { yaw: -0.2 });
    // Statues on marble plinths, flanking the portico and down the street.
    for (const st of L.STATUES) {
      B.box(M.marbleTrim, st.x - 0.6, st.x + 0.6, 0, 1.1, st.z - 0.6, st.z + 0.6);
      B.box(M.marbleShade, st.x - 0.68, st.x + 0.68, 0, 0.18, st.z - 0.68, st.z + 0.68);
      B.box(M.marbleShade, st.x - 0.66, st.x + 0.66, 1.0, 1.12, st.z - 0.66, st.z + 0.66);
      M3("rooms/gothic_statue", [st.x, 1.12, st.z], { yaw: st.yaw, scale: 1.1 });
    }
  }

  // ---- The great hall --------------------------------------------------------------------------------
  {
    // The two colonnades carry an entablature each; torches on the columns' inner faces.
    const hallCols = L.COLUMNS.filter((c) => c.y === 0 && Math.abs(c.x) < 9);
    for (const c of hallCols) {
      const inward = c.x < 0 ? 1 : -1;
      torch(c.x + inward * c.r * 0.92, 2.8, c.z, inward, 0);
    }
    const colTop = hallCols[0]?.h ?? 8.4;
    for (const sx of [-1, 1]) entablatureZ(H.z0 + 0.3, H.z1 - 0.3, sx * 7.2, 0.62, colTop, -sx);
    // The ceiling: deep coffers in a grid of marble beams, a gilded boss in each.
    const boss = own(new THREE.OctahedronGeometry(0.16, 0));
    for (let z = H.z0 + 1.6; z < H.z1 - 0.5; z += 2.6) B.box(M.marbleTrim, H.x0, H.x1, L.HALL_TOP - 0.55, L.HALL_TOP, z - 0.16, z + 0.16);
    for (let x = H.x0 + 1.6; x < H.x1; x += 2.6) B.box(M.marbleTrim, x - 0.16, x + 0.16, L.HALL_TOP - 0.55, L.HALL_TOP, H.z0, H.z1);
    for (let z = H.z0 + 2.9; z < H.z1 - 1; z += 2.6) {
      for (let x = H.x0 + 2.9; x < H.x1 - 1; x += 2.6) {
        const b = new THREE.Mesh(boss, M.gold);
        b.position.set(x, L.HALL_TOP - 0.08, z);
        G.add(b);
      }
    }
    // Banners down the side walls, between the piers.
    for (const z of [10.8, 20]) {
      banner(M.bannerBlue, H.x0, 4.5, 9.5, z, 1, 0, 1.4);
      banner(M.bannerBlue, H.x1, 4.5, 9.5, z, -1, 0, 1.4);
    }
    banner(M.bannerRed, 0, 5.5, 10.5, H.z1, 0, -1, 2.0);
    // Two great chandeliers.
    chandelier(0, 7.6, 5.2, L.HALL_TOP, 9, 16);
    chandelier(0, 7.6, 15.6, L.HALL_TOP, 9, 16);
    // Over the arches into the wings: their names.
    sign(["← THE WAYFARER'S REST"], H.x0 + 0.02, L.SIDE_ARCH.top + 0.7, (L.SIDE_ARCH.z0 + L.SIDE_ARCH.z1) / 2, 1, 0, 4.4, 0.8);
    sign(["THE ARENA →"], H.x1 - 0.02, L.SIDE_ARCH.top + 0.7, (L.SIDE_ARCH.z0 + L.SIDE_ARCH.z1) / 2, -1, 0, 3.6, 0.8, "#3a1210", "#f0c070");
    for (const x of [T.x1 - 0.02, A.x0 + 0.02]) {
      // A stone frame round each arch on both faces.
      for (const z of [L.SIDE_ARCH.z0, L.SIDE_ARCH.z1]) B.box(M.marbleTrim, x - 0.5, x + 0.5, 0, L.SIDE_ARCH.top, z - 0.22, z + 0.22);
      B.box(M.marbleTrim, x - 0.5, x + 0.5, L.SIDE_ARCH.top, L.SIDE_ARCH.top + 0.45, L.SIDE_ARCH.z0 - 0.3, L.SIDE_ARCH.z1 + 0.3);
    }
    // The entrance's inner face: a frame and a sign for the way out.
    B.box(M.marbleTrim, L.ENTRANCE.x0 - 0.5, L.ENTRANCE.x1 + 0.5, L.ENTRANCE.top, L.ENTRANCE.top + 0.5, 0, 0.25);
    // The desk: a long counter with its returns, ledgers, a candle, a bell.
    const desk = (x0: number, x1: number, z0: number, z1: number) => {
      B.box(M.wood, x0 + 0.05, x1 - 0.05, 0, 1.0, z0 + 0.05, z1 - 0.05);
      B.box(M.lightWood, x0 - 0.06, x1 + 0.06, 1.0, 1.1, z0 - 0.06, z1 + 0.06);
      B.box(M.darkBlocks, x0, x1, 0, 0.12, z0, z1);
      B.box(M.gold, x0 + 0.05, x1 - 0.05, 0.88, 0.92, z0 - 0.01, z0 + 0.01);
    };
    desk(L.DESK.x0, L.DESK.x1, L.DESK.z0, L.DESK.z1);
    desk(L.DESK.x0, L.DESK.x0 + 0.6, L.DESK.z1, 12.0);
    desk(L.DESK.x1 - 0.6, L.DESK.x1, L.DESK.z1, 12.0);
    M3("rooms/wooden_bookshelf_worn", [-2.2, 0, 13.0], { yaw: Math.PI });
    M3("rooms/wooden_bookshelf_worn", [2.2, 0, 13.0], { yaw: Math.PI });
    M3("market/brass_vase_01", [-2.4, 1.1, 9.9], { scale: 0.6 });
    M3("rooms/carved_wooden_plate", [1.6, 1.1, 9.9], { scale: 0.8 });
    sign(["GUILD REPRESENTATIVE", "quests · bounties · rewards"], 0, 3.0, 13.4, 0, -1, 3.6, 0.9, "#1e1a2a", "#f2d27a");
    lamp(0, 2.6, 9.0, 0xffd090, 3.2, 8);
    // The quest board: a framed panel on two legs, notices pinned to it, a lantern over it.
    {
      const Q = L.QUEST_BOARD;
      B.box(M.wood, Q.x - 1.0, Q.x - 0.88, 0, 2.4, Q.z - 0.1, Q.z + 0.1);
      B.box(M.wood, Q.x + 0.88, Q.x + 1.0, 0, 2.4, Q.z - 0.1, Q.z + 0.1);
      B.box(M.wood, Q.x - 1.0, Q.x + 1.0, 2.3, 2.45, Q.z - 0.14, Q.z + 0.14);
      B.box(M.wood, Q.x - 0.88, Q.x + 0.88, 0.8, 2.3, Q.z - 0.04, Q.z + 0.04);
      const notes = new THREE.Mesh(own(new THREE.PlaneGeometry(1.7, 1.45)), own(new THREE.MeshStandardMaterial({ map: own(noticesTexture()), roughness: 0.9 })));
      notes.position.set(Q.x, 1.55, Q.z - 0.05);
      notes.rotation.y = Math.PI;
      G.add(notes);
    }
  }

  // ---- The teleporter: a stone dais and its step, a ring of runes, a column of light, four obelisks ----
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
    const step = new THREE.Mesh(own(scaleUV(new THREE.CylinderGeometry(D.r + D.step, D.r + D.step + 0.05, D.h / 2, 48), 2)), M.darkBlocks);
    step.position.set(D.x, D.h / 4, D.z);
    step.receiveShadow = true;
    G.add(step);
    const top = new THREE.Mesh(own(scaleUV(new THREE.CylinderGeometry(D.r, D.r + 0.04, D.h, 48), 2)), M.hallFloor);
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
      const o = new THREE.Mesh(obGeo, M.darkBlocks);
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
    sign(["GATE OF THE DEEP"], 0, 6.2, H.z1, 0, -1, 4.4, 0.8, "#1a1230", "#c9a8ff");
  }
  for (const f of L.FURNITURE.filter((q) => q.kind === "brazier")) brazier(f.x, f.z);

  // ---- The tavern ----------------------------------------------------------------------------------
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
  {
    // The bar: the counter, stools, the back shelves with barrels and goblets, a lantern.
    const Bc = L.BAR;
    B.box(M.wood, Bc.x0 + 0.05, Bc.x1 - 0.05, 0, 1.03, Bc.z0 + 0.05, Bc.z1 - 0.05);
    B.box(M.lightWood, Bc.x0 - 0.08, Bc.x1 + 0.06, 1.03, 1.1, Bc.z0 - 0.06, Bc.z1 + 0.06);
    B.box(M.darkBlocks, Bc.x0, Bc.x1, 0, 0.12, Bc.z0, Bc.z1);
    for (const s of L.BAR_STOOLS) M3("market/wooden_stool_01", [s.x, 0, s.z], { yaw: s.z });
    M3("market/brass_goblets", [-14.3, 1.1, 2.2], { scale: 0.7 });
    M3("market/brass_goblets", [-14.3, 1.1, 5.0], { scale: 0.7, yaw: 1 });
    M3("market/wooden_bowl_01", [-14.3, 1.1, 3.7], { scale: 0.7 });
    M3("market/wine_barrel_01", [-10.85, 0, 1.4], { scale: 0.9 });
    M3("market/wine_barrel_01", [-10.85, 0, 6.6], { scale: 0.9, yaw: 1 });
    M3("market/painted_wooden_shelves", [-10.55, 0, 3.0], { yaw: -Math.PI / 2, scale: 1.2 });
    M3("market/painted_wooden_shelves", [-10.55, 0, 4.6], { yaw: -Math.PI / 2, scale: 1.2 });
    lamp(-13.2, 2.8, 3.9, 0xffbe78, 3.6, 9);
    B.box(M.iron, -13.23, -13.17, 2.95, L.TAVERN_TOP, 3.87, 3.93);
    const l = new THREE.Mesh(own(new THREE.BoxGeometry(0.24, 0.34, 0.24)), M.glassWarm);
    l.position.set(-13.2, 2.8, 3.9);
    G.add(l);
  }
  // The hearth on the west wall: stone cheeks, a mantel, the fire, a chimney breast up to the ceiling.
  {
    const hz = 3.3;
    const xw = T.x0;
    B.box(M.blocks, xw, xw + 1.5, 0, 1.6, hz - 1.3, hz - 0.72);
    B.box(M.blocks, xw, xw + 1.5, 0, 1.6, hz + 0.72, hz + 1.3);
    B.box(M.wood, xw, xw + 1.62, 1.6, 1.78, hz - 1.45, hz + 1.45);
    B.box(M.blocks, xw, xw + 1.2, 1.78, L.TAVERN_TOP, hz - 1.15, hz + 1.15);
    B.box(M.soot, xw + 0.05, xw + 0.25, 0, 1.6, hz - 0.72, hz + 0.72);
    B.box(M.soot, xw, xw + 1.5, 1.45, 1.6, hz - 0.72, hz + 0.72);
    B.box(M.darkBlocks, xw + 1.5, xw + 2.1, 0, 0.08, hz - 1.3, hz + 1.3);
    M3("rooms/stone_fire_pit", [xw + 0.78, 0, hz], { scale: 0.62 });
    fire(xw + 0.78, 0.12, hz, 0.35);
    lamp(xw + 1.6, 0.9, hz, 0xff8a3a, 6.5, 14, 0.3);
    M3("market/brass_vase_01", [xw + 0.9, 1.78, hz - 1.0], { scale: 0.7 });
    M3("market/brass_goblets", [xw + 0.9, 1.78, hz + 0.9], { scale: 0.7 });
    M3("rooms/marble_bust_01", [xw + 0.9, 1.78, hz], { scale: 0.7, yaw: Math.PI / 2 });
  }
  chandelier(-23, 4.4, 4.4, L.TAVERN_TOP, 7, 13);
  chandelier(-23, 4.4, 10.6, L.TAVERN_TOP, 7, 13);
  // Lanterns under the gallery, and barrels at the back.
  for (const [x, z] of [
    [-27, 19.4],
    [-21, 22.4],
    [-14, 19.4],
  ]) {
    M3("rooms/wooden_lantern_01", [x, 2.25, z]);
    B.box(M.iron, x - 0.02, x + 0.02, 2.75, L.SLAB_Y - 0.3, z - 0.02, z + 0.02);
    flame(x, 2.42, z, 0.6);
    lamp(x, 2.5, z, 0xffb870, 3.0, 8.5);
  }
  M3("market/wine_barrel_01", [-12.0, 0, 25.1], { scale: 0.9 });
  M3("market/wine_barrel_01", [-13.1, 0, 25.0], { scale: 0.9, yaw: 1 });
  M3("market/wine_barrel_01", [-12.5, 0.95, 25.05], { scale: 0.85, yaw: 2, pitch: Math.PI / 2 });
  // The gallery: its fascia, posts, rails and balusters; the stair's rail.
  {
    const Y = L.UPPER_Y;
    const gz = L.GALLERY_Z;
    B.box(M.wood, L.STAIR.x1, T.x1, L.SLAB_Y - 0.25, Y + 0.05, gz - 0.12, gz + 0.02);
    for (const x of L.GALLERY_POSTS) B.box(M.wood, x - 0.16, x + 0.16, 0, L.SLAB_Y, gz - 0.16, gz + 0.16);
    B.box(M.wood, L.STAIR.x1, T.x1, Y + 0.95, Y + 1.04, gz - 0.06, gz + 0.06);
    B.box(M.wood, L.STAIR.x1, T.x1, Y + 0.05, Y + 0.12, gz - 0.04, gz + 0.04);
    for (let x = L.STAIR.x1 + 0.2; x < T.x1; x += 0.28) B.box(M.lightWood, x - 0.025, x + 0.025, Y + 0.12, Y + 0.95, gz - 0.025, gz + 0.025);
    const S0 = L.STAIR;
    const len = Math.hypot(S0.z1 - S0.z0 - 0.6, Y);
    const ang = Math.atan2(Y, S0.z1 - S0.z0 - 0.6);
    B.turned(M.wood, 0.08, 0.08, len, [S0.x1, 0.95 + Y / 2 + 0.05, (S0.z0 + 0.6 + S0.z1) / 2], [-ang, 0, 0]);
    for (let i = 0; i < 9; i++) {
      const z = S0.z0 + 0.8 + i * ((S0.z1 - S0.z0 - 0.9) / 8);
      const y = (Y * (z - S0.z0)) / (S0.z1 - S0.z0);
      B.box(M.wood, S0.x1 - 0.04, S0.x1 + 0.04, y, y + 0.95, z - 0.04, z + 0.04);
    }
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
  worldUV(leafGeo, 1.6);
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
    lamp(cx - 0.3, Y + 1.6, T.z1 - 1.0, 0xffbc78, 2.8, 8);
    B.box(M.rug, (r.x0 + r.x1) / 2 - 1.2, (r.x0 + r.x1) / 2 + 1.4, Y, Y + 0.02, 20.0, 23.4);
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
    const leaf = new THREE.Mesh(leafGeo, M.wood);
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
    // The door's timber surround on both faces.
    for (const [z0, z1] of [
      [L.ROOMS_Z - 0.1, L.ROOMS_Z],
      [L.ROOMS_Z + 0.2, L.ROOMS_Z + 0.3],
    ]) {
      B.box(M.wood, r.door.x0 - 0.14, r.door.x0, Y, Y + 2.38, z0, z1);
      B.box(M.wood, r.door.x1, r.door.x1 + 0.14, Y, Y + 2.38, z0, z1);
      B.box(M.wood, r.door.x0 - 0.14, r.door.x1 + 0.14, Y + 2.25, Y + 2.4, z0, z1);
    }
    const plaque = own(new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const pm = new THREE.Mesh(plaqueGeo, [M.wood, M.wood, M.wood, M.wood, M.wood, plaque]);
    pm.position.set((r.door.x0 + r.door.x1) / 2, Y + 2.8, L.ROOMS_Z - 0.04);
    pm.rotation.y = Math.PI;
    G.add(pm);
    doors.push({ pivot, open: 0, target: 0, plaque, tex: null });
    // A sconce on the gallery wall beside the door.
    const sx = r.door.x1 + 0.6;
    B.box(M.iron, sx - 0.04, sx + 0.04, Y + 1.7, Y + 1.78, L.ROOMS_Z - 0.25, L.ROOMS_Z);
    const w = new THREE.Mesh(own(new THREE.CylinderGeometry(0.03, 0.035, 0.14, 8)), M.candle);
    w.position.set(sx, Y + 1.85, L.ROOMS_Z - 0.22);
    G.add(w);
    flame(sx, Y + 1.92, L.ROOMS_Z - 0.22, 0.6);
    lamp(sx, Y + 2.0, L.ROOMS_Z - 0.6, 0xffc080, 1.8, 7);
  });
  const setPlaque = (ri: number, rented: boolean) => {
    const d = doors[ri];
    d.tex?.dispose();
    const r = L.ROOMS[ri];
    d.tex = signTexture(rented ? [r.name, "Yours"] : [r.name, `To let · ${r.rent} gold`], rented ? "#2c2410" : "#3a2412", rented ? "#f2d27a" : "#e8c878", 256, 96);
    d.plaque.map = d.tex;
    d.plaque.needsUpdate = true;
  };

  // ---- The arena -------------------------------------------------------------------------------------
  {
    const R = L.RING;
    // The fence: posts every metre and a half, two rails, heavier posts at the gate.
    const posts: number[] = [];
    for (let x = R.x0; x <= R.x1 + 0.01; x += (R.x1 - R.x0) / 10) posts.push(x);
    for (const x of posts) {
      for (const z of [R.z0, R.z1]) B.box(M.wood, x - 0.09, x + 0.09, 0, 1.3, z - 0.09, z + 0.09);
    }
    for (let z = R.z0; z <= R.z1 + 0.01; z += (R.z1 - R.z0) / 10) {
      B.box(M.wood, R.x1 - 0.09, R.x1 + 0.09, 0, 1.3, z - 0.09, z + 0.09);
      if (z < L.RING_GATE.z0 - 0.05 || z > L.RING_GATE.z1 + 0.05) B.box(M.wood, R.x0 - 0.09, R.x0 + 0.09, 0, 1.3, z - 0.09, z + 0.09);
    }
    for (const y of [0.55, 1.05]) {
      for (const f of L.FENCE) B.box(M.lightWood, f.x0, f.x1, y - 0.05, y + 0.05, f.z0, f.z1);
    }
    for (const z of [L.RING_GATE.z0, L.RING_GATE.z1]) {
      B.box(M.wood, R.x0 - 0.16, R.x0 + 0.16, 0, 2.4, z - 0.16, z + 0.16);
      flame(R.x0, 2.42, z, 1.1);
    }
    B.box(M.wood, R.x0 - 0.12, R.x0 + 0.12, 2.25, 2.45, L.RING_GATE.z0 - 0.16, L.RING_GATE.z1 + 0.16);
    sign(["FIGHTING GROUND"], R.x0 - 0.14, 2.75, (L.RING_GATE.z0 + L.RING_GATE.z1) / 2, -1, 0, 2.8, 0.5, "#3a1210", "#f0c070");
    lamp(R.x0 - 0.6, 2.4, (L.RING_GATE.z0 + L.RING_GATE.z1) / 2, 0xff9a48, 3.4, 9, 0.25);
    // Benches for those watching, racks of arms on the east wall, braziers at the ring's corners.
    for (const b of L.ARENA_BENCHES) M3("rooms/painted_wooden_bench", [b.x, 0, b.z], { yaw: b.yaw, scale: 1.0 });
    for (const f of L.FURNITURE.filter((q) => q.kind === "rack")) {
      B.box(M.wood, f.x - 0.3, f.x + 0.05, 0, 1.9, f.z - 1.2, f.z - 1.08);
      B.box(M.wood, f.x - 0.3, f.x + 0.05, 0, 1.9, f.z + 1.08, f.z + 1.2);
      B.box(M.wood, f.x - 0.3, f.x + 0.05, 1.5, 1.6, f.z - 1.2, f.z + 1.2);
      B.box(M.wood, f.x - 0.3, f.x + 0.05, 0.3, 0.4, f.z - 1.2, f.z + 1.2);
      M3("market/antique_estoc", [f.x - 0.2, 0.35, f.z - 0.6], { roll: -0.2, yaw: Math.PI / 2 });
      M3("market/ornate_war_hammer", [f.x - 0.2, 0.35, f.z], { roll: -0.15, yaw: Math.PI / 2 });
      M3("market/wooden_handle_saber", [f.x - 0.2, 0.35, f.z + 0.6], { roll: -0.2, yaw: Math.PI / 2 });
      M3("market/kite_shield", [f.x - 0.34, 0.9, f.z + 0.1], { yaw: -Math.PI / 2, scale: 0.9 });
    }
    // Banners of the two sides on the long walls, chandeliers over the ring, torches round the walls.
    for (const x of [17, 22.25, 27.5]) {
      banner(M.bannerRed, x, 4.6, 8.8, A.z0, 0, 1, 1.4);
      banner(M.bannerBlue, x, 4.6, 8.8, A.z1, 0, -1, 1.4);
    }
    chandelier(19, 7.2, 13, L.ARENA_TOP, 8, 15);
    chandelier(26, 7.2, 13, L.ARENA_TOP, 8, 15);
    for (const z of [6, 13, 20]) torch(A.x1, 2.6, z, -1, 0);
    for (let x = A.x0 + 2.6; x < A.x1; x += 4.4) B.box(M.wood, x - 0.2, x + 0.2, L.ARENA_TOP - 0.45, L.ARENA_TOP, A.z0, A.z1);
  }
  // A torch either side of each wing's arch (tavern side and arena side).
  for (const z of [L.SIDE_ARCH.z0 - 0.7, L.SIDE_ARCH.z1 + 0.7]) {
    torch(T.x1, 2.7, z, -1, 0);
    torch(A.x0, 2.7, z, 1, 0);
  }

  // ---- Sky, ambient and the light pool -------------------------------------------------------------
  const skyTex = own(skyTexture());
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(190, 32, 16)), own(new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })));
  sky.position.set(0, -20, 0);
  sky.renderOrder = -10;
  group.add(sky);
  const hemi = new THREE.HemisphereLight(0x8a96c0, 0x2a2018, 0.4);
  group.add(hemi);
  const moon = new THREE.DirectionalLight(0x9aaad8, 0.35);
  moon.position.set(30, 60, -40);
  moon.target.position.set(0, 0, -10);
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

  B.build(group, owned);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material !== M.flame && m.material !== beamMat && m.material !== runeMat && o !== sky) m.receiveShadow = true;
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
  }
  const npcs: Npc[] = L.NPCS.map((plan) => {
    const at = plan.kind === "sit" ? plan.seat! : plan.route![0];
    return { plan, p: null, x: at.x, z: at.z, yaw: plan.kind === "sit" ? plan.seat!.yaw : (plan.route![0].face ?? 0), prevYaw: 0, leg: 0, wait: 0, t: plan.seed };
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
        group.add(p.group, p.fx);
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

  const dynamicSolids = () => {
    const out: L.Solid[] = [];
    doors.forEach((d, i) => {
      if (d.open < 0.5) out.push(L.doorSolid(i));
    });
    return out;
  };
  const outdoorFog = new THREE.Color(0x10131c);
  const indoorFog = new THREE.Color(0x0e0a08);
  const outdoorHemi = new THREE.Color(0x8a96c0);
  const indoorHemi = new THREE.Color(0x8a7058);

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
    npcSpots: () => npcs.filter((n) => n.p).map((n) => ({ x: n.x, z: n.z })),
    // One open place: there is nothing to swap.
    setZone() {},
    zone: () => "in",
    setShadows(on) {
      slots[0].light.castShadow = on;
    },
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
      const inside = L.indoors(player.x, player.z);
      // Townsfolk near enough to matter animate.
      for (const n of npcs) if (n.p && Math.hypot(n.x - player.x, n.z - player.z) < 34) updateNpc(n, dt);
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
      // Ambient: the night sky on the street, firelight within.
      const kh = 1 - Math.exp(-dt * 3);
      hemi.intensity += ((inside ? 0.8 : 0.7) - hemi.intensity) * kh;
      hemi.color.lerp(inside ? indoorHemi : outdoorHemi, kh);
      moon.intensity += ((inside ? 0.05 : 0.6) - moon.intensity) * kh;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(inside ? indoorFog : outdoorFog, kh);
        scene.fog.density += ((inside ? 0.007 : 0.01) - scene.fog.density) * kh;
      }
      // The light pool: the nearest lamps where he is (those on the other side of a wall count for less).
      lampCheck -= dt;
      if (lampCheck <= 0) {
        lampCheck = 0.15;
        const score = (l: Lamp) => l.at.distanceTo(player) + (l.indoors === inside ? 0 : 10);
        const ranked = lamps.slice().sort((a, b) => score(a) - score(b));
        const want = ranked.slice(0, slots.length);
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
      const span = 40; // metres across
      const k = Math.min(cw, ch) / span;
      const X = (x: number) => cw / 2 + (x - px) * k;
      const Z = (z: number) => ch / 2 + (z - pz) * k;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(180,192,200,0.36)";
      for (const r of L.REGIONS) {
        if (r.kind === "flat") {
          if (r.y > 2 !== upper) continue;
          ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
        } else if (r.kind === "rampZ") {
          ctx.fillStyle = "rgba(214,186,128,0.45)";
          ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
          ctx.fillStyle = "rgba(180,192,200,0.36)";
        }
      }
      // Walls and big furniture at this storey.
      ctx.fillStyle = "rgba(30,26,22,0.8)";
      const lo = upper ? L.UPPER_Y : 0;
      for (const s of L.SOLIDS.concat(dynamicSolids())) {
        if (!s.walk || s.y1 <= lo + 0.3 || s.y0 >= lo + 1.7) continue;
        ctx.fillRect(X(s.x0), Z(s.z0), Math.max(1, (s.x1 - s.x0) * k), Math.max(1, (s.z1 - s.z0) * k));
      }
      if (!upper) {
        // The sand ring, the stalls in their awning colours, the dais in violet, the desk in gold.
        const R = L.RING;
        ctx.fillStyle = "rgba(226,196,140,0.35)";
        ctx.fillRect(X(R.x0), Z(R.z0), (R.x1 - R.x0) * k, (R.z1 - R.z0) * k);
        L.townStalls().forEach((st) => {
          const m = MERCHANTS[st.merchant];
          const sz = Math.max(5, k * 1.6);
          ctx.fillStyle = css(m?.cloth ?? 0x888888);
          ctx.strokeStyle = "#e6c48a";
          ctx.lineWidth = 1;
          const cx = st.x * 1.5;
          const cz = st.z * 1.5 - 0.9;
          ctx.fillRect(X(cx) - sz / 2, Z(cz) - sz / 2, sz, sz);
          ctx.strokeRect(X(cx) - sz / 2, Z(cz) - sz / 2, sz, sz);
        });
        ctx.fillStyle = "#e8c060";
        ctx.fillRect(X(L.DESK.x0), Z(L.DESK.z0), (L.DESK.x1 - L.DESK.x0) * k, Math.max(2, (L.DESK.z1 - L.DESK.z0) * k));
        const r = L.DAIS.r * k * (1 + 0.06 * Math.sin(time * 4));
        ctx.fillStyle = "rgba(160,110,255,0.35)";
        ctx.strokeStyle = "#c9a8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(L.DAIS.x), Z(L.DAIS.z), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (const n of npcs) {
          if (!n.p) continue;
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
