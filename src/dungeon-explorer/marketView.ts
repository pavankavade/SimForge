// The market in 3D (down the town's street): one stall per merchant (timber counter, striped awning on posts, a
// painted sign, a lantern) dressed with CC0 props from Patch's asset library (Poly Haven models,
// assets/models/market/), and a merchant behind each counter: the same realistic human as the
// paladin, out of armour. The stalls are built for the town (none below); the merchants once.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ARMOR_SLOTS, createPaladin, type ArmorSlot, type Paladin } from "../artifacts/characters/paladin";
import { makeWood } from "../engine/textures";
import { randomSpec } from "./CharacterCustomizer";
import { COUNTER_AT, KEEPER_AT, STALL_DEPTH, STALL_HALF, stallPoint, type StallPlan } from "./dungeon/market";
import type { DungeonData } from "./dungeon/generator";
import { CELL_M } from "./dungeon/view";
import { MERCHANTS, type MerchantId } from "./merchants";

const MODEL_DIR = "/assets/models/market/";

type ModelName =
  | "antique_estoc"
  | "ornate_medieval_mace"
  | "ornate_war_hammer"
  | "wooden_handle_saber"
  | "cross_pein_hammer"
  | "tree_stump_01"
  | "wine_barrel_01"
  | "kite_shield"
  | "wooden_crate_01"
  | "wooden_stool_01"
  | "wooden_axe"
  | "wooden_hammer_01"
  | "wooden_bucket_01"
  | "wooden_bowl_01"
  | "wicker_basket_01"
  | "brass_pot_01"
  | "ceramic_vase_01"
  | "antique_ceramic_vase_01"
  | "painted_wooden_shelves"
  | "brass_vase_01"
  | "brass_goblets";

/** A prop on a stall, in the stall's frame: x along the wall, y up, z out into the room (metres). */
interface Dressing {
  model: ModelName;
  at: [number, number, number];
  /** Turn about y, then lean about x and z (radians). */
  yaw?: number;
  pitch?: number;
  roll?: number;
  scale?: number;
}

const TOP = 0.96; // counter top (m)
/**
 * The stall's frame starts at the face of the masonry, which stands proud of the grid's wall line
 * (a flared foot and relief: up to about 0.25 m); everything below is measured from that face.
 */
const WALL_GAP = 0.2;
/** The counter's middle, out from the wall face (m). */
const CZ = COUNTER_AT * CELL_M - WALL_GAP;

/** The counter's length: shorter than the stall, so the ends show what stands on the floor. */
const COUNTER_W = 1.4;
/** Where the floor props stand at either end of the counter (m along the wall). */
const END = 0.9;

const DRESS: Record<MerchantId, Dressing[]> = {
  armourer: [
    // Shields leaning on the wall behind him, a box of fittings and a hammer on the counter.
    { model: "kite_shield", at: [-0.62, 0, 0.24], pitch: -0.14, yaw: 0.15 },
    { model: "kite_shield", at: [0.62, 0, 0.26], pitch: -0.14, yaw: -0.2 },
    { model: "wooden_crate_01", at: [-0.36, TOP, CZ], scale: 0.7, yaw: 0.06 },
    { model: "cross_pein_hammer", at: [0.36, TOP + 0.012, CZ + 0.05], roll: Math.PI / 2, yaw: 0.5 },
    { model: "wooden_stool_01", at: [END, 0, CZ] },
    { model: "wooden_crate_01", at: [-END, 0, CZ], scale: 0.62, yaw: Math.PI / 2 },
  ],
  weaponsmith: [
    // Blades and hafts against the wall rack, a quench barrel, his hammer on the counter.
    { model: "antique_estoc", at: [-0.62, 0.02, 0.24], pitch: -0.1 },
    { model: "wooden_handle_saber", at: [-0.3, 0.38, 0.2], pitch: -0.1 },
    { model: "ornate_war_hammer", at: [0.36, 0.52, 0.2], pitch: -0.1 },
    { model: "ornate_medieval_mace", at: [0.64, 0.52, 0.2], pitch: -0.1 },
    { model: "wine_barrel_01", at: [END, 0, CZ], scale: 0.58, yaw: 0.6 },
    { model: "tree_stump_01", at: [-END, 0, CZ], scale: 0.3 },
    { model: "cross_pein_hammer", at: [-0.3, TOP + 0.012, CZ + 0.05], roll: Math.PI / 2, yaw: -0.3 },
  ],
  alchemist: [
    // Bare shelves (the caravan is late), a brass pot and jars on the counter.
    { model: "painted_wooden_shelves", at: [-0.5, 0, 0.24], scale: 1.25 },
    { model: "brass_pot_01", at: [0.44, TOP, CZ] },
    { model: "ceramic_vase_01", at: [-0.22, TOP, CZ - 0.05], scale: 0.7 },
    { model: "antique_ceramic_vase_01", at: [END, 0, CZ], scale: 0.9 },
    { model: "wooden_bowl_01", at: [-0.52, TOP, CZ + 0.05], scale: 0.7 },
  ],
  mage: [
    { model: "brass_vase_01", at: [-END, 0, CZ] },
    { model: "brass_goblets", at: [-0.42, TOP, CZ + 0.03], scale: 0.75, yaw: 0.4 },
    { model: "brass_vase_01", at: [END, 0, CZ], scale: 0.85 },
  ],
  woodsmith: [
    // A chopping stump with the axe in it, a bucket, and turned bowls on the counter.
    { model: "tree_stump_01", at: [END, 0, CZ], scale: 0.32 },
    { model: "wooden_axe", at: [END, 0.18 + 0.63 - 0.07, CZ], roll: Math.PI, yaw: 0.4 },
    { model: "wooden_bucket_01", at: [-END, 0, CZ], scale: 0.9 },
    { model: "wicker_basket_01", at: [-0.36, TOP, CZ] },
    { model: "wooden_hammer_01", at: [0.22, TOP + 0.012, CZ + 0.05], roll: Math.PI / 2, yaw: 0.9 },
    { model: "wooden_bowl_01", at: [0.52, TOP, CZ - 0.02], scale: 0.62 },
  ],
};

/** What each merchant wears: their own clothes, no plate (the mail for the armourer). */
const DRESSED: Record<MerchantId, ArmorSlot[]> = {
  armourer: ["mail", "gauntlets", "waist"],
  weaponsmith: ["doublet", "waist", "gauntlets"],
  alchemist: ["doublet"],
  mage: ["doublet", "cape"],
  woodsmith: ["doublet", "waist"],
};

export interface MarketStall {
  plan: StallPlan;
  merchant: MerchantId;
  /** Where to stand to trade (world metres) and how close counts. */
  front: THREE.Vector3;
  keeper: THREE.Vector3;
  facing: number;
  /** Where the stall meets the wall (world metres), its half width and depth (m). */
  base: THREE.Vector3;
  half: number;
  depth: number;
}

export interface Market {
  /** The stalls on this floor (in plan order). */
  stalls: MarketStall[];
  /** Rebuild the stalls (plans in cells about the grid's middle; the town passes a 0 x 0 grid). */
  setFloor: (d: Pick<DungeonData, "W" | "H">, plans: StallPlan[], cellM: number) => void;
  /** The stall the paladin can trade at from here (facing it, close enough), or -1. */
  reachable: (x: number, z: number, facing: number) => number;
  /** Inside a stall (counter, posts, awning)? World metres; the camera keeps out. */
  solidAt: (x: number, y: number, z: number) => boolean;
  update: (dt: number, player: THREE.Vector3, trading: number) => void;
  dispose: () => void;
}

// ---- Shared parts ------------------------------------------------------------------------------

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const modelCache = new Map<ModelName, Promise<THREE.Object3D>>();
function loadModel(name: ModelName): Promise<THREE.Object3D> {
  let p = modelCache.get(name);
  if (!p) {
    p = loader.loadAsync(`${MODEL_DIR}${name}.glb`).then((g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.45;
        }
      });
      return g.scene;
    });
    modelCache.set(name, p);
  }
  return p;
}

function signTexture(text: string, cloth: number, trim: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const wood = g.createLinearGradient(0, 0, 0, 128);
  wood.addColorStop(0, "#5a3a20");
  wood.addColorStop(1, "#3a2414");
  g.fillStyle = wood;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = "rgba(0,0,0,0.25)";
  for (let y = 10; y < 128; y += 22) {
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + 6, 340, y - 6, 512, y + 3);
    g.stroke();
  }
  g.strokeStyle = `#${new THREE.Color(trim).getHexString()}`;
  g.lineWidth = 6;
  g.strokeRect(8, 8, 496, 112);
  g.fillStyle = `#${new THREE.Color(cloth).lerp(new THREE.Color(0x000000), 0.15).getHexString()}`;
  g.fillRect(16, 16, 480, 96);
  g.fillStyle = `#${new THREE.Color(trim).getHexString()}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 52;
  g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  while (g.measureText(text).width > 452 && size > 24) {
    size -= 2;
    g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  }
  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = 6;
  g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A striped awning sloping from the wall to the front beam, with a hanging valance. */
function awningGeometry(width: number, backY: number, frontY: number, depth: number, strips: number) {
  const pos: number[] = [];
  const col: number[] = [];
  const stripe = (i: number) => (i % 2 === 0 ? 1 : 0);
  const quad = (a: number[], b: number[], c: number[], d: number[], k: number) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) col.push(k, k, k);
  };
  const sag = 0.05;
  for (let i = 0; i < strips; i++) {
    const x0 = -width / 2 + (width * i) / strips;
    const x1 = -width / 2 + (width * (i + 1)) / strips;
    const k = stripe(i);
    // Two rows so the cloth sags a little between the wall and the beam.
    const midY = (backY + frontY) / 2 - sag;
    quad([x0, backY, 0.02], [x1, backY, 0.02], [x1, midY, depth / 2], [x0, midY, depth / 2], k);
    quad([x0, midY, depth / 2], [x1, midY, depth / 2], [x1, frontY, depth], [x0, frontY, depth], k);
    // Scalloped valance: a flap per strip.
    const xm = (x0 + x1) / 2;
    pos.push(x0, frontY, depth, x1, frontY, depth, xm, frontY - 0.2, depth + 0.01);
    for (let j = 0; j < 3; j++) col.push(k, k, k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aStripe", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Awning cloth: the stripes are vertex colours. */
const stripedMaterial = () => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true });

// ---- The market --------------------------------------------------------------------------------

export function createMarket(gl: THREE.WebGLRenderer, scene: THREE.Scene): Market {
  const root = new THREE.Group();
  root.name = "market";
  scene.add(root);

  const woodSet = makeWood({ size: 256, planks: 4, base: "#6b4527", baseAlt: "#5e3c22", seam: "#24150b", seed: 11 });
  const wood = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodSet.map ?? undefined,
    normalMap: woodSet.normalMap ?? undefined,
    roughnessMap: woodSet.roughnessMap ?? undefined,
    roughness: 0.85,
    metalness: 0,
  });
  const darkWood = wood.clone();
  darkWood.color.set(0x8a7a6a);
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.55, metalness: 0.8 });
  const flame = new THREE.MeshBasicMaterial({ color: 0xffc070 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 0.2, transparent: true, opacity: 0.85 });

  const G = {
    post: new THREE.CylinderGeometry(0.045, 0.05, 1, 8),
    beam: new THREE.BoxGeometry(1, 0.08, 0.08),
    rail: new THREE.BoxGeometry(0.07, 0.07, 1),
    lantern: new THREE.CylinderGeometry(0.07, 0.06, 0.18, 8),
    lanternCap: new THREE.ConeGeometry(0.09, 0.08, 8),
    bulb: new THREE.SphereGeometry(0.045, 10, 8),
    orb: new THREE.SphereGeometry(0.13, 24, 16),
    bottle: new THREE.CylinderGeometry(0.035, 0.045, 0.16, 10),
    neck: new THREE.CylinderGeometry(0.015, 0.02, 0.06, 8),
  };

  const stalls: MarketStall[] = [];
  const perFloor: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const lights: THREE.PointLight[] = [];
  let floorSerial = 0;

  // The merchants: one realistic body each, built in the background (half a second apiece).
  interface Keeper {
    p: Paladin | null;
    yaw: number;
    prevYaw: number;
    greetT: number;
    near: boolean;
  }
  const keepers: Keeper[] = MERCHANTS.map(() => ({ p: null, yaw: 0, prevYaw: 0, greetT: 0, near: false }));
  let disposed = false;
  void (async () => {
    for (let i = 0; i < MERCHANTS.length; i++) {
      let s = (0xa11ce + i * 104729) >>> 0;
      const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      try {
        const p = await createPaladin(gl, { character: randomSpec(rnd) });
        if (disposed) {
          p.dispose();
          return;
        }
        p.materials.setEnvIntensity(0.45);
        // Out of armour and unarmed, then their own clothes.
        for (const slot of ARMOR_SLOTS) p.setEquipped(slot, false);
        for (const slot of DRESSED[MERCHANTS[i].id]) p.setEquipped(slot, true);
        p.group.rotation.order = "YXZ";
        p.group.visible = false;
        scene.add(p.group, p.fx);
        keepers[i].p = p;
        placeKeeper(i);
      } catch (err) {
        console.error("merchant failed to load", err);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  })();

  function placeKeeper(i: number) {
    const k = keepers[i];
    if (!k.p) return;
    const st = stalls.find((s) => s.merchant === MERCHANTS[i].id);
    k.p.group.visible = !!st;
    if (!st) return;
    k.p.reset();
    k.yaw = st.facing;
    k.prevYaw = st.facing;
    k.greetT = 0;
    k.near = false;
    k.p.group.position.copy(st.keeper);
    k.p.group.rotation.set(0, st.facing, 0);
  }

  const clearFloor = () => {
    for (const o of perFloor) root.remove(o);
    perFloor.length = 0;
    for (const d of disposables) d.dispose();
    disposables.length = 0;
    for (const l of lights) scene.remove(l);
    lights.length = 0;
    stalls.length = 0;
  };

  const buildStall = (plan: StallPlan, d: Pick<DungeonData, "W" | "H">, cellM: number) => {
    const m = MERCHANTS[plan.merchant];
    const toWorld = (cx: number, cz: number) => new THREE.Vector3((cx - d.W / 2) * cellM, plan.floor * cellM, (cz - d.H / 2) * cellM);
    const base = toWorld(plan.x, plan.z);
    const facing = Math.atan2(plan.nx, plan.nz);
    const g = new THREE.Group();
    g.position.set(base.x + plan.nx * WALL_GAP, base.y, base.z + plan.nz * WALL_GAP);
    g.rotation.y = facing;
    root.add(g);
    // Placed now, so the lights below can be put where the stall stands.
    g.updateMatrixWorld(true);
    perFloor.push(g);

    const W = STALL_HALF * 2 * cellM - 0.1;
    const counterZ = CZ;
    const depth = STALL_DEPTH * cellM - WALL_GAP;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };

    // Counter: a timber box with a heavier top, a cloth runner in the stall's colour down the front.
    const cw = COUNTER_W;
    const box = new THREE.BoxGeometry(cw, TOP - 0.06, 0.46);
    disposables.push(box);
    add(box, wood, 0, (TOP - 0.06) / 2, counterZ);
    const top = new THREE.BoxGeometry(cw + 0.1, 0.06, 0.56);
    disposables.push(top);
    add(top, darkWood, 0, TOP - 0.03, counterZ);
    const runnerMat = new THREE.MeshStandardMaterial({ color: m.cloth, roughness: 0.95, side: THREE.DoubleSide });
    disposables.push(runnerMat);
    const runner = new THREE.PlaneGeometry(cw * 0.42, 0.5);
    disposables.push(runner);
    add(runner, runnerMat, 0, TOP - 0.25, counterZ + 0.235);
    const runnerTop = new THREE.PlaneGeometry(cw * 0.42, 0.56);
    disposables.push(runnerTop);
    const rt = add(runnerTop, runnerMat, 0, TOP + 0.003, counterZ);
    rt.rotation.x = -Math.PI / 2;

    // Posts: two at the front corners, two against the wall; a beam across the front.
    const frontZ = depth - 0.06;
    const backH = 2.42;
    const frontH = 2.06;
    for (const sx of [-1, 1]) {
      add(G.post, wood, sx * (W / 2), frontH / 2, frontZ, 1, frontH, 1);
      add(G.post, wood, sx * (W / 2), backH / 2, 0.07, 1, backH, 1);
      // Side rails from the wall down to the front beam, under the awning's edges.
      const run = frontZ - 0.07;
      const rail = add(G.rail, darkWood, sx * (W / 2), (backH + frontH) / 2 - 0.04, 0.07 + run / 2, 1, 1, Math.hypot(run, backH - frontH));
      rail.rotation.x = Math.atan2(backH - frontH, run);
    }
    add(G.beam, darkWood, 0, frontH, frontZ, W + 0.1, 1, 1);

    // Awning: stripes of the stall's cloth and a cream, with a scalloped valance.
    const aw = awningGeometry(W + 0.14, backH + 0.03, frontH + 0.05, frontZ + 0.08, 7);
    const cloth = new THREE.Color(m.cloth);
    const cream = new THREE.Color(0xe6dcc4).lerp(new THREE.Color(m.cloth), 0.12);
    const stripes = aw.getAttribute("aStripe") as THREE.BufferAttribute;
    const colors = new Float32Array(stripes.count * 3);
    for (let i = 0; i < stripes.count; i++) {
      const c = stripes.getX(i) > 0.5 ? cloth : cream;
      // Linear vertex colours (the material works in linear space).
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    aw.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    aw.deleteAttribute("aStripe");
    disposables.push(aw);
    const awMat = stripedMaterial();
    disposables.push(awMat);
    add(aw, awMat, 0, 0, 0);

    // The sign stands on the front beam, facing the hall.
    const tex = signTexture(m.shop, m.cloth, m.trim);
    const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    disposables.push(tex, signMat);
    const board = new THREE.BoxGeometry(1.5, 0.375, 0.04);
    disposables.push(board);
    const signMats = [darkWood, darkWood, darkWood, darkWood, signMat, darkWood];
    const sign = new THREE.Mesh(board, signMats);
    sign.position.set(0, frontH + 0.26, frontZ + 0.06);
    sign.castShadow = true;
    g.add(sign);

    // A lantern hangs from the front beam on the right: a small warm light of its own.
    const lx = W / 2 - 0.22;
    const lz = frontZ;
    add(G.lanternCap, iron, lx, frontH - 0.1, lz);
    add(G.lantern, glass, lx, frontH - 0.22, lz);
    add(G.bulb, flame, lx, frontH - 0.22, lz);
    const light = new THREE.PointLight(0xffb46a, 1.4, 5.5, 2);
    light.position.copy(g.localToWorld(new THREE.Vector3(lx, frontH - 0.25, lz + 0.1)));
    scene.add(light);
    lights.push(light);

    // The alchemist's bottles and the arcanist's crystal ball glow on their own.
    if (m.id === "weaponsmith") {
      // A timber rack on the wall for the blades and hafts to lean on.
      for (const y of [0.62, 1.32]) add(G.beam, darkWood, 0, y, 0.07, W - 0.16, 1, 1);
      for (const x of [-(W / 2) + 0.12, W / 2 - 0.12]) add(G.post, darkWood, x, 0.78, 0.05, 0.8, 1.56, 0.8);
    }
    if (m.id === "alchemist") {
      const hues = [0x58e070, 0xe04a3a, 0x4aa8ff, 0xd8c040, 0xb060ff];
      for (let i = 0; i < 3; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x202020,
          emissive: hues[i % hues.length],
          emissiveIntensity: 0.9,
          roughness: 0.15,
          transparent: true,
          opacity: 0.9,
        });
        disposables.push(mat);
        const x = -0.92 + i * 0.16;
        const onTop = 1.125 * 1.25;
        add(G.bottle, mat, x, onTop + 0.08, 0.24);
        add(G.neck, mat, x, onTop + 0.19, 0.24);
      }
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x202020, emissive: hues[(i + 2) % hues.length], emissiveIntensity: 1.1, roughness: 0.15 });
        disposables.push(mat);
        add(G.bottle, mat, -0.02 + i * 0.075, TOP + 0.08, counterZ + 0.1 - (i % 2) * 0.12);
        add(G.neck, mat, -0.02 + i * 0.075, TOP + 0.19, counterZ + 0.1 - (i % 2) * 0.12);
      }
    }
    if (m.id === "mage") {
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x1a1030,
        emissive: 0x8a6cff,
        emissiveIntensity: 1.4,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
      });
      disposables.push(orbMat);
      const stand = new THREE.CylinderGeometry(0.06, 0.1, 0.1, 12);
      disposables.push(stand);
      add(stand, iron, 0.12, TOP + 0.05, counterZ);
      const orb = add(G.orb, orbMat, 0.12, TOP + 0.22, counterZ);
      orb.userData.spin = true;
      const glow = new THREE.PointLight(0x8a6cff, 0.9, 3.5, 2);
      glow.position.copy(g.localToWorld(new THREE.Vector3(0.12, TOP + 0.35, counterZ + 0.2)));
      scene.add(glow);
      lights.push(glow);
      // Candles on the counter's far end.
      for (let i = 0; i < 3; i++) {
        const wax = new THREE.CylinderGeometry(0.022, 0.025, 0.12 + i * 0.05, 8);
        disposables.push(wax);
        const waxMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 });
        disposables.push(waxMat);
        const h = 0.12 + i * 0.05;
        add(wax, waxMat, 0.48 + i * 0.07, TOP + h / 2, counterZ - 0.08 + (i % 2) * 0.1);
        add(G.bulb, flame, 0.48 + i * 0.07, TOP + h + 0.03, counterZ - 0.08 + (i % 2) * 0.1, 0.5, 0.9, 0.5);
      }
    }

    // CC0 props (cached, cloned per floor).
    const serial = floorSerial;
    for (const item of DRESS[m.id]) {
      loadModel(item.model)
        .then((src) => {
          if (serial !== floorSerial) return;
          const o = src.clone(true);
          o.position.set(item.at[0], item.at[1], item.at[2]);
          o.rotation.order = "YXZ";
          o.rotation.set(item.pitch ?? 0, item.yaw ?? 0, item.roll ?? 0);
          o.scale.setScalar(item.scale ?? 1);
          g.add(o);
        })
        .catch((err: unknown) => console.warn(`market prop ${item.model} failed`, err));
    }

    const f = stallPoint(plan, 0, STALL_DEPTH + 0.45);
    const k = stallPoint(plan, 0, KEEPER_AT);
    const front = toWorld(f.x, f.z);
    const keeper = toWorld(k.x, k.z);
    stalls.push({ plan, merchant: m.id, front, keeper, facing, base, half: W / 2 + 0.12, depth: depth + 0.15 });
  };

  return {
    stalls,
    setFloor(d, plans, cellM) {
      floorSerial++;
      clearFloor();
      for (const p of plans) buildStall(p, d, cellM);
      for (let i = 0; i < keepers.length; i++) placeKeeper(i);
    },
    reachable(x, z, facing) {
      let best = -1;
      let bestD = 1.7;
      for (let i = 0; i < stalls.length; i++) {
        const s = stalls[i];
        const dx = s.keeper.x - x;
        const dz = s.keeper.z - z;
        const toFront = Math.hypot(s.front.x - x, s.front.z - z);
        // Facing the merchant, more or less.
        const look = (Math.sin(facing) * dx + Math.cos(facing) * dz) / (Math.hypot(dx, dz) || 1);
        if (toFront < bestD && look > 0.35) {
          bestD = toFront;
          best = i;
        }
      }
      return best;
    },
    solidAt(x, y, z) {
      for (const s of stalls) {
        const dx = x - s.base.x;
        const dz = z - s.base.z;
        const out = dx * s.plan.nx + dz * s.plan.nz;
        const along = dx * s.plan.tx + dz * s.plan.tz;
        if (out > -0.2 && out < s.depth && Math.abs(along) < s.half && y - s.base.y < 2.75) return true;
      }
      return false;
    },
    update(dt, player, trading) {
      for (const o of perFloor) {
        o.traverse((c) => {
          if (c.userData.spin) c.rotation.y += dt * 0.6;
        });
      }
      for (let i = 0; i < keepers.length; i++) {
        const k = keepers[i];
        const p = k.p;
        if (!p || !p.group.visible) continue;
        const st = stalls.find((s) => s.merchant === MERCHANTS[i].id);
        if (!st) continue;
        const dx = player.x - st.keeper.x;
        const dz = player.z - st.keeper.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 28) continue;
        // Turn to the paladin while he is near (never right round to the wall).
        const near = dist < 5.5 || trading === stalls.indexOf(st);
        let want = st.facing;
        if (near) {
          let d = Math.atan2(dx, dz) - st.facing;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          want = st.facing + Math.max(-1.0, Math.min(1.0, d));
        }
        let d = want - k.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        k.yaw += d * (1 - Math.exp(-dt * 4));
        // A wave as he comes up to the stall.
        if (near && !k.near) k.greetT = 1.8;
        k.near = near;
        k.greetT = Math.max(0, k.greetT - dt);
        const turn = dt > 0 ? Math.atan2(Math.sin(k.yaw - k.prevYaw), Math.cos(k.yaw - k.prevYaw)) / dt : 0;
        k.prevYaw = k.yaw;
        p.group.rotation.y = k.yaw;
        p.update(
          dt,
          {
            moveX: 0,
            moveZ: 0,
            aimPitch: 0,
            turnRate: turn,
            air: 0,
            block: false,
            attack: false,
            firstPerson: false,
            relaxed: true,
            arms: k.greetT > 0 ? "wave" : near ? undefined : "cross",
          },
          st.keeper.y
        );
      }
    },
    dispose() {
      disposed = true;
      clearFloor();
      scene.remove(root);
      for (const k of keepers) {
        if (!k.p) continue;
        scene.remove(k.p.group, k.p.fx);
        k.p.dispose();
      }
      for (const k of Object.keys(G) as Array<keyof typeof G>) G[k].dispose();
      wood.dispose();
      darkWood.dispose();
      iron.dispose();
      flame.dispose();
      glass.dispose();
    },
  };
}
