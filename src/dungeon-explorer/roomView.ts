// The furnishings of the floor in 3D: every Piece of the room plan (rooms.ts) built from CC0 Patch
// models (assets/models/rooms and /market) and a few procedural parts (weapon racks, plinths, a
// dais). Chests keep their lid on a hinge so they can open when searched. Far pieces are hidden.
// Some chests are mimics (the crypt hallway's): eyes that glint in the gap under the lid now and
// then, teeth peeking along its edge, and a lunge with the lid snapping when he goes to search it.
import * as THREE from "three";
import type { DungeonData } from "./dungeon/generator";
import { PIECES, type Piece } from "./dungeon/rooms";
import { loadModel, placeModel } from "./props3d";

export interface ChestView {
  piece: Piece;
  /** Where to stand to search it (world metres) and its middle. */
  front: THREE.Vector3;
  centre: THREE.Vector3;
  /** 0 shut .. 1 open (eased by the view). */
  open: number;
  target: number;
  /** A mimic (`makeMimic`), whether it has bitten yet, and how long ago it began its bite (s; -1 none). */
  mimic: boolean;
  spent: boolean;
  bite: number;
}

export interface FloorDressing {
  chests: ChestView[];
  /** Chest `i` is a mimic: it gets its eyes and teeth. */
  makeMimic: (i: number) => void;
  /** Chest `i` bites (lunges, lid snapping); after that its eyes go dark and it opens like any chest. */
  bite: (i: number) => void;
  update: (dt: number, player: THREE.Vector3) => void;
  dispose: () => void;
}

/** `obj`'s bounds in `root`'s own frame (meshes under it, as they stand now). */
function boundsIn(root: THREE.Object3D, obj: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out = new THREE.Box3();
  const b = new THREE.Box3();
  const m = new THREE.Matrix4();
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    b.copy(mesh.geometry.boundingBox as THREE.Box3).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld));
    out.union(b);
  });
  return out;
}

const R = (set: string, name: string) => `${set}/${name}`;

/** The lid of a chest model, hung on a pivot at its back edge (null until loaded). */
export function hingeLid(chest: THREE.Object3D): THREE.Object3D | null {
  const lid = chest.getObjectByName("treasure_chest_lid");
  if (!lid) return null;
  chest.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(lid);
  const back = chest.worldToLocal(new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, box.min.z));
  const pivot = new THREE.Object3D();
  pivot.position.copy(back);
  chest.add(pivot);
  pivot.updateMatrixWorld(true);
  pivot.attach(lid);
  return pivot;
}

export function buildDressing(scene: THREE.Scene, d: DungeonData, pieces: Piece[], cellM: number): FloorDressing {
  const root = new THREE.Group();
  root.name = "dressing";
  scene.add(root);
  let alive = true;
  const live = () => alive;
  const owned: Array<{ dispose: () => void }> = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.9 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 0.8 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x3a2410, emissive: 0xffa040, emissiveIntensity: 1.8, roughness: 0.4 });
  owned.push(stone, darkWood, glow);
  const box = (w: number, h: number, dd: number) => {
    const g = new THREE.BoxGeometry(w, h, dd);
    owned.push(g);
    return g;
  };
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  const chests: ChestView[] = [];
  const groups: Array<{ g: THREE.Group; at: THREE.Vector3 }> = [];
  const lids = new Map<ChestView, THREE.Object3D>();
  /** Each chest's group and model (once loaded), and a mimic's eyes. */
  const chestGroups = new Map<ChestView, THREE.Group>();
  const chestModels = new Map<ChestView, THREE.Object3D>();
  const mimicEyes = new Map<ChestView, { eyes: THREE.Object3D[]; mat: THREE.MeshBasicMaterial }>();
  const bone = new THREE.MeshStandardMaterial({ color: 0xeee4cc, roughness: 0.4, emissive: 0x2a2620 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const toothGeo = new THREE.ConeGeometry(0.022, 0.075, 5);
  const eyeGeo = new THREE.SphereGeometry(0.03, 10, 8);
  const pupilGeo = new THREE.BoxGeometry(0.01, 0.042, 0.01);
  owned.push(bone, pupilMat, toothGeo, eyeGeo, pupilGeo);
  /** Give a mimic its eyes and teeth, once its model is in. */
  const dressMimic = (view: ChestView) => {
    const o = chestModels.get(view);
    const pivot = lids.get(view);
    if (!view.mimic || !o || !pivot || mimicEyes.has(view)) return;
    const body = boundsIn(o, o);
    const lid = boundsIn(o, pivot);
    const cx = (body.min.x + body.max.x) / 2;
    const w = body.max.x - body.min.x;
    const lip = lid.min.y;
    const front = body.max.z;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
    owned.push(mat);
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, mat);
      eye.position.set(cx + side * w * 0.17, lip - 0.03, front - 0.01);
      eye.scale.set(1, 0.7, 0.5);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0, 0.026);
      eye.add(pupil);
      o.add(eye);
      eyes.push(eye);
    }
    mimicEyes.set(view, { eyes, mat });
    // Teeth: a lower row on the rim, an upper row on the lid (so they open with it).
    const n = 7;
    for (let k = 0; k < n; k++) {
      const x = cx - w * 0.38 + (k * w * 0.76) / (n - 1);
      const low = new THREE.Mesh(toothGeo, bone);
      low.position.set(x, lip + 0.02, front - 0.03);
      o.add(low);
      const up = new THREE.Mesh(toothGeo, bone);
      up.rotation.x = Math.PI;
      up.position.set(x + w * 0.05, lip - 0.005, front - 0.025);
      o.add(up);
      pivot.attach(up);
    }
  };

  for (const p of pieces) {
    const g = new THREE.Group();
    g.position.set((p.x - d.W / 2) * cellM, p.floor * cellM, (p.z - d.H / 2) * cellM);
    g.rotation.y = p.yaw;
    root.add(g);
    groups.push({ g, at: g.position.clone() });
    const s = PIECES[p.kind];
    const back = -s.d / 2;
    const M = (path: string, at: [number, number, number], o: { yaw?: number; pitch?: number; roll?: number; scale?: number } = {}) => placeModel(g, path, at, o, live);

    switch (p.kind) {
      case "bed":
        M(R("rooms", "GothicBed_01"), [0, 0, 0]);
        break;
      case "bench":
        M(R("rooms", "painted_wooden_bench"), [0, 0, 0]);
        break;
      case "cabinet":
        M(R("rooms", "GothicCabinet_01"), [0, 0, 0]);
        break;
      case "commode":
        M(R("rooms", "GothicCommode_01"), [0, 0, 0]);
        M((p.x * 13.7 + p.z * 7.1) % 1 < 0.5 ? R("rooms", "marble_bust_01") : R("market", "brass_vase_01"), [0.25, 1.21, 0.02], { yaw: -0.3, scale: 0.9 });
        break;
      case "bookshelf":
        M(R("rooms", "wooden_bookshelf_worn"), [0, 0, 0]);
        break;
      case "shelves":
        M(R("market", "painted_wooden_shelves"), [0, 0, back + 0.23], { scale: 1.25 });
        break;
      case "crate":
        M(R("market", "wooden_crate_01"), [0, 0, 0], { yaw: (p.x * 7.3) % 0.2 });
        break;
      case "crateStack":
        M(R("rooms", "wooden_crate_02"), [-0.3, 0, 0]);
        M(R("rooms", "wooden_crate_02"), [0.32, 0, 0.02], { yaw: 0.06 });
        M(R("market", "wooden_crate_01"), [0, 0.465, -0.05], { yaw: 0.2, scale: 0.9 });
        break;
      case "barrel":
        M(R("market", "wine_barrel_01"), [0, 0, 0], { scale: 0.85, yaw: p.x });
        break;
      case "barrelPair":
        M(R("market", "wine_barrel_01"), [-0.36, 0, 0], { scale: 0.88, yaw: 0.4 });
        M(R("market", "wine_barrel_01"), [0.36, 0, 0.02], { scale: 0.88, yaw: 1.9 });
        break;
      case "sundries":
        M(R("market", "wooden_bucket_01"), [-0.3, 0, 0], { scale: 0.9 });
        M(R("market", "wicker_basket_01"), [0.22, 0, 0.02], { yaw: 0.3 });
        M(R("rooms", "wooden_stool_02"), [0.25, 0.117, 0], { scale: 0.8 });
        break;
      case "weaponRack": {
        for (const y of [0.62, 1.32]) mesh(g, box(s.w - 0.1, 0.07, 0.07), darkWood, 0, y, back + 0.07);
        for (const x of [-(s.w / 2) + 0.08, s.w / 2 - 0.08]) mesh(g, box(0.08, 1.56, 0.08), darkWood, x, 0.78, back + 0.06);
        M(R("market", "antique_estoc"), [-0.55, 0.02, back + 0.24], { pitch: -0.1 });
        M(R("market", "wooden_handle_saber"), [-0.2, 0.38, back + 0.2], { pitch: -0.1 });
        M(R("market", "ornate_war_hammer"), [0.25, 0.52, back + 0.2], { pitch: -0.1 });
        M(R("market", "ornate_medieval_mace"), [0.55, 0.52, back + 0.2], { pitch: -0.1 });
        break;
      }
      case "shieldWall":
        M(R("market", "kite_shield"), [-0.34, 0, back + 0.25], { pitch: -0.14, yaw: 0.12 });
        M(R("market", "kite_shield"), [0.34, 0, back + 0.27], { pitch: -0.14, yaw: -0.15 });
        break;
      case "chest": {
        g.updateMatrixWorld(true);
        const view: ChestView = {
          piece: p,
          centre: g.position.clone().add(new THREE.Vector3(0, 0.3, 0)),
          front: g.localToWorld(new THREE.Vector3(0, 0, 0.95)),
          open: 0,
          target: 0,
          mimic: false,
          spent: false,
          bite: -1,
        };
        chests.push(view);
        chestGroups.set(view, g);
        M(R("rooms", "treasure_chest"), [0, 0, 0]).then((o) => {
          if (!o) return;
          const pivot = hingeLid(o);
          if (pivot) lids.set(view, pivot);
          chestModels.set(view, o);
          dressMimic(view);
        });
        break;
      }
      case "statue":
        mesh(g, box(1.5, 0.22, 1.5), stone, 0, 0.11, 0);
        M(R("rooms", "gothic_statue"), [0, 0.22, 0], { scale: 0.95 });
        break;
      case "throne":
        mesh(g, box(1.3, 0.16, 1.1), stone, 0, 0.08, 0);
        mesh(g, box(1.0, 0.12, 0.8), stone, 0, 0.22, -0.05);
        M(R("rooms", "WoodenChair_01"), [0, 0.28, -0.05]);
        break;
      case "vases":
        M(R("market", "antique_ceramic_vase_01"), [-0.3, 0, 0], { scale: 0.95 });
        M(R("market", "ceramic_vase_01"), [0.05, 0, 0.05], { scale: 0.9 });
        M(R("market", "brass_vase_01"), [0.36, 0, -0.02], { scale: 0.8 });
        break;
      case "messTable": {
        // The table along x, a bench on either side facing it, a meal on top.
        M(R("rooms", "dining_table"), [0, 0, 0]);
        M(R("rooms", "painted_wooden_bench"), [0, 0, 1.0], { yaw: Math.PI });
        M(R("rooms", "painted_wooden_bench"), [0, 0, -1.0]);
        const top = 0.877;
        M(R("rooms", "carved_wooden_plate"), [-0.55, top, 0.3]);
        M(R("rooms", "carved_wooden_plate"), [0.5, top, -0.3]);
        M(R("rooms", "food_apple_01"), [-0.5, top + 0.035, 0.3]);
        M(R("rooms", "food_apple_01"), [0.15, top, 0.05], { yaw: 1.1 });
        M(R("market", "brass_goblets"), [0.55, top, 0.32], { scale: 0.6, yaw: 0.6 });
        M(R("rooms", "wooden_cutting_board"), [-0.05, top, -0.32], { yaw: 0.2 });
        break;
      }
      case "studyTable": {
        M(R("rooms", "dining_table"), [0, 0, 0]);
        M(R("rooms", "folding_wooden_stool"), [-0.5, 0, 0.95], { yaw: 0.2 });
        M(R("rooms", "folding_wooden_stool"), [0.6, 0, -0.95], { yaw: 2.9 });
        M(R("rooms", "wooden_lantern_01"), [0.7, 0.877, 0.25]);
        mesh(g, new THREE.SphereGeometry(0.05, 8, 6), glow, 0.7, 0.877 + 0.2, 0.25);
        M(R("rooms", "marble_bust_01"), [-0.65, 0.877, -0.2], { scale: 0.7, yaw: 0.4 });
        M(R("rooms", "carved_wooden_plate"), [0, 0.877, 0.15]);
        break;
      }
      case "guardFire": {
        M(R("rooms", "stone_fire_pit"), [0, 0, 0]);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          M(R("rooms", "folding_wooden_stool"), [Math.sin(a) * 1.15, 0, Math.cos(a) * 1.15], { yaw: a + Math.PI });
        }
        break;
      }
      case "hearth":
        M(R("rooms", "stone_fire_pit"), [0, 0, 0]);
        break;
      case "pews":
        for (const [x, z] of [
          [-0.75, -0.6],
          [0.75, -0.6],
          [-0.75, 0.6],
          [0.75, 0.6],
        ]) {
          M(R("rooms", "painted_wooden_bench"), [x, 0, z]);
        }
        break;
    }
  }

  // Warm the model cache for the chests (their lids are hinged once loaded).
  void loadModel(R("rooms", "treasure_chest"));

  const playerAt = new THREE.Vector3();
  let clock = 0;
  return {
    chests,
    makeMimic(i) {
      const c = chests[i];
      if (!c) return;
      c.mimic = true;
      dressMimic(c);
    },
    bite(i) {
      const c = chests[i];
      if (c) c.bite = 0;
    },
    update(dt, player) {
      playerAt.copy(player);
      clock += dt;
      // Far pieces are not drawn (they are behind walls anyway).
      for (const { g, at } of groups) g.visible = Math.abs(at.x - player.x) + Math.abs(at.z - player.z) < 34;
      chests.forEach((c, i) => {
        c.open += (c.target - c.open) * (1 - Math.exp(-dt * 6));
        let open = c.open;
        const g = chestGroups.get(c);
        if (c.bite >= 0) {
          // The lunge: the lid snaps up, holds a moment, and slams; the chest hops at him.
          c.bite += dt;
          const u = c.bite;
          open = u < 0.09 ? (u / 0.09) * 1.15 : u < 0.2 ? 1.15 : u < 0.28 ? 1.15 * (1 - (u - 0.2) / 0.08) : c.open;
          if (g) {
            const hop = u < 0.32 ? Math.sin((Math.PI * u) / 0.32) : 0;
            g.position.y = c.centre.y - 0.3 + 0.2 * hop;
            g.position.x = c.centre.x + (c.front.x - c.centre.x) * 0.25 * hop;
            g.position.z = c.centre.z + (c.front.z - c.centre.z) * 0.25 * hop;
          }
          if (u > 0.6) {
            c.bite = -1;
            c.spent = true;
            if (g) g.position.set(c.centre.x, c.centre.y - 0.3, c.centre.z);
          }
        }
        const lid = lids.get(c);
        if (lid) lid.rotation.x = -1.75 * open;
        // A mimic's eyes: dim, then now and then a glint and a blink; wide on the bite; dark once spent.
        const m = mimicEyes.get(c);
        if (m) {
          const t = (clock + i * 1.37) % 5.2;
          const glint = t < 0.7 ? Math.sin((Math.PI * t) / 0.7) : 0;
          const k = c.bite >= 0 ? 1.4 : c.spent ? 0 : 0.35 + 0.9 * glint;
          m.mat.color.setRGB(1 * k, 0.82 * k, 0.23 * k);
          const blink = t > 3.1 && t < 3.22 ? 0.15 : 1;
          for (const e of m.eyes) {
            e.visible = !c.spent || c.bite >= 0;
            e.scale.y = 0.7 * blink;
          }
        }
      });
    },
    dispose() {
      alive = false;
      scene.remove(root);
      for (const o of owned) o.dispose();
    },
  };
}
