// The furnishings of the floor in 3D: every Piece of the room plan (rooms.ts) built from CC0 Patch
// models (assets/models/rooms and /market) and a few procedural parts (weapon racks, plinths, a
// dais). Chests keep their lid on a hinge so they can open when searched. Far pieces are hidden.
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
}

export interface FloorDressing {
  chests: ChestView[];
  update: (dt: number, player: THREE.Vector3) => void;
  dispose: () => void;
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
        };
        chests.push(view);
        M(R("rooms", "treasure_chest"), [0, 0, 0]).then((o) => {
          if (!o) return;
          const pivot = hingeLid(o);
          if (pivot) lids.set(view, pivot);
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
  return {
    chests,
    update(dt, player) {
      playerAt.copy(player);
      // Far pieces are not drawn (they are behind walls anyway).
      for (const { g, at } of groups) g.visible = Math.abs(at.x - player.x) + Math.abs(at.z - player.z) < 34;
      for (const c of chests) {
        c.open += (c.target - c.open) * (1 - Math.exp(-dt * 6));
        const lid = lids.get(c);
        if (lid) lid.rotation.x = -1.75 * c.open;
      }
    },
    dispose() {
      alive = false;
      scene.remove(root);
      for (const o of owned) o.dispose();
    },
  };
}
