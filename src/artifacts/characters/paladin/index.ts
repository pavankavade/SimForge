// The playable paladin: one rigged body shared by first and third person. Place and turn `group`
// (feet at its origin, facing +Z), add `fx` to the scene root, and call `update` every frame.
// The body is the imported base human (humanAsset.ts), so creating one is asynchronous.
import * as THREE from "three";
import { PaladinAnimator, type PaladinInput } from "./animator";
import { buildBody } from "./body";
import { SLOTS, SWORD, authorLocal, buildPaladinModel, shieldMount } from "./build";
import { Cloth, type ClothSpec } from "./cloth";
import { warpTorso } from "./fit";
import { BladeFx, BladeSweep, type CombatWorld } from "./combat";
import { HUMAN_URL, loadHumanAsset, restFromAsset } from "./humanAsset";
import { renderPieceIcons } from "./icons";
import { measureBody } from "./measure";
import { createPaladinMaterials, loadHumanTextures, type PaladinMaterials } from "./materials";
import { BodyRig } from "./retarget";
import { EYE_LOCAL, REST, Rig, setRest, type BoneName } from "./rig";
import { CHARACTERS, DEFAULT_CHARACTER, type HumanSpec } from "./spec";

export type { PaladinInput } from "./animator";
export type { CombatTarget, CombatWorld } from "./combat";
export { FX_LAYER } from "./combat";
export { createPaladinSfx, type PaladinSfx } from "./sfx";
export { AVERAGE_FACE, CHARACTERS, DEFAULT_CHARACTER, characterByName, type FaceSpec, type HairStyle, type HumanSpec, type RGB } from "./spec";

/** Every piece that can be put on or taken off on its own. */
export const ARMOR_SLOTS = [
  "helm",
  "gorget",
  "cuirass",
  "pauldrons",
  "arms",
  "gauntlets",
  "waist",
  "cuisses",
  "greaves",
  "sabatons",
  "mail",
  "doublet",
  "cape",
  "tabard",
  "sword",
  "shield",
] as const;

export type ArmorSlot = (typeof ARMOR_SLOTS)[number];

export type ArmorEquipment = Record<ArmorSlot, boolean>;

/** The plate harness (everything but the soft layers, cloth and weapons). */
export const PLATE_SLOTS: ArmorSlot[] = ["helm", "gorget", "cuirass", "pauldrons", "arms", "gauntlets", "waist", "cuisses", "greaves", "sabatons"];

/** Full plate over mail, cape and tabard, sword and shield. */
export const DEFAULT_EQUIPMENT: ArmorEquipment = {
  helm: true,
  gorget: true,
  cuirass: true,
  pauldrons: true,
  arms: true,
  gauntlets: true,
  waist: true,
  cuisses: true,
  greaves: true,
  sabatons: true,
  mail: true,
  doublet: false,
  cape: true,
  tabard: true,
  sword: true,
  shield: true,
};

export interface Paladin {
  /** The person this was built from. */
  character: HumanSpec;
  group: THREE.Group;
  fx: THREE.Group;
  rig: Rig;
  /** The imported skeleton the body is skinned to, driven from `rig`. */
  bodyRig: BodyRig;
  readonly animator: PaladinAnimator;
  materials: PaladinMaterials;
  sword: THREE.Group;
  shield: THREE.Group;
  equipment: ArmorEquipment;
  setEquipped: (slot: ArmorSlot, equipped: boolean) => void;
  setAllArmor: (equipped: boolean) => void;
  /** Advance animation, cloth and blade physics. `floorY` is the ground height in world space. */
  update: (dt: number, input: PaladinInput, floorY: number, world?: CombatWorld) => void;
  /**
   * Back to the state he was built in (standing, no swing, cloth re-hung on the next update), so
   * a fixed run of `update`s always gives the same pose: how videos replay him frame by frame.
   */
  reset: () => void;
  /** Hide the helm so the camera can sit at the eyes; the body, arms and weapons stay. */
  setFirstPerson: (on: boolean) => void;
  /** Eye position in world space (valid after `update`). */
  getEye: (out: THREE.Vector3) => THREE.Vector3;
  /** Camera kick from impacts, decaying: add to the view for weight. */
  shake: { value: number };
  /**
   * Picture of each piece on its own, as PNG data URLs (inventory icons). Renders off screen with
   * `renderer`; the paladin is back as it was afterwards.
   */
  renderIcons: (renderer: THREE.WebGLRenderer, size?: number) => Partial<Record<ArmorSlot, string>>;
  dispose: () => void;
}

export interface PaladinOptions {
  /** Who is under the armour: any HumanSpec (see CHARACTERS for ready-made ones). */
  character?: HumanSpec;
  /** Base human asset (defaults to the exported MakeHuman male). */
  assetUrl?: string;
  /** Use the earlier procedural head instead of the imported one (comparison only). */
  classicHead?: boolean;
}

export async function createPaladin(renderer: THREE.WebGLRenderer, options: PaladinOptions = {}): Promise<Paladin> {
  const character = options.character ?? CHARACTERS[DEFAULT_CHARACTER];
  const asset = await loadHumanAsset(options.assetUrl ?? HUMAN_URL);
  const rest = restFromAsset(asset);
  setRest(rest.joints, rest.eye);
  const textures = await loadHumanTextures(asset, character);
  const materials = createPaladinMaterials(renderer, character, textures);
  const rig = new Rig();
  const bodyRig = new BodyRig(asset, rig);
  const body = buildBody(asset, character);
  materials.paintHumanSkin(body.skin, body.paint);
  // Measure this body in the rest pose (the rig has not moved yet) so the plates fit it.
  const fit = measureBody(asset, body.skin, bodyRig, rig);
  const mount = shieldMount(bodyRig.grip.L);
  const model = buildPaladinModel(rig, materials, character, { body, bodyRig, classicHead: !!options.classicHead, shieldMount: mount, fit });
  // Cloth pins and colliders were authored against the old joints and torso.
  const torsoBones: BoneName[] = ["hips", "spine", "chest", "neck"];
  const at = (bone: BoneName, v: [number, number, number]): [number, number, number] => {
    const l = authorLocal(bone, v);
    if (torsoBones.indexOf(bone) < 0) return l;
    const p = new THREE.Vector3(l[0], l[1], l[2]).add(REST[bone]);
    warpTorso(p, body.landmarks.torso);
    p.sub(REST[bone]);
    return [p.x, p.y, p.z];
  };
  const group = new THREE.Group();
  group.name = "paladin";
  group.add(rig.root);
  for (const slot of SLOTS) {
    for (const m of model.meshes[slot]) group.add(m);
  }

  // Sword in the right fist: grip through the palm, blade out past the thumb.
  model.sword.position.copy(bodyRig.grip.R);
  rig.bone("handR").add(model.sword);
  // Shield strapped along the left forearm: face outward, top edge toward the inside of the elbow.
  model.shield.position.copy(mount.position);
  model.shield.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0))
  );
  rig.bone("foreArmL").add(model.shield);

  const fitCloth = (c: ClothSpec): ClothSpec => ({
    ...c,
    pinA: at(c.bone, c.pinA),
    pinB: at(c.bone, c.pinB),
    colliders: c.colliders.map((k) => ({ ...k, at: at(k.bone, k.at) })),
  });
  const cape = new Cloth(fitCloth({
    cols: 11,
    rows: 14,
    bone: "chest",
    pinA: [0.128, 0.228, -0.04],
    pinB: [-0.128, 0.228, -0.04],
    pinBow: [0, -0.014, -0.1],
    widthBottom: 0.74,
    length: 1.0,
    material: materials.cape,
    drape: [0, 0, -1],
    colliders: [
      { bone: "chest", at: [0, 0.08, 0.03], r: 0.172 },
      { bone: "spine", at: [0, 0, 0.02], r: 0.166 },
      { bone: "hips", at: [0, -0.04, 0], r: 0.195 },
      { bone: "pauldronL", at: [0, 0, 0], r: 0.118 },
      { bone: "pauldronR", at: [0, 0, 0], r: 0.118 },
      { bone: "upperArmL", at: [0, -0.17, 0], r: 0.082 },
      { bone: "upperArmR", at: [0, -0.17, 0], r: 0.082 },
      { bone: "thighL", at: [0, -0.2, 0], r: 0.108 },
      { bone: "thighR", at: [0, -0.2, 0], r: 0.108 },
      { bone: "shinL", at: [0, -0.12, -0.01], r: 0.086 },
      { bone: "shinR", at: [0, -0.12, -0.01], r: 0.086 },
    ],
  }));
  const tabard = new Cloth(fitCloth({
    cols: 5,
    rows: 8,
    bone: "hips",
    pinA: [0.085, 0.022, 0.13],
    pinB: [-0.085, 0.022, 0.13],
    pinBow: [0, 0, 0.004],
    widthBottom: 0.215,
    length: 0.46,
    material: materials.tabard,
    drape: [0, 0, 1],
    colliders: [
      { bone: "hips", at: [0, -0.1, 0], r: 0.168 },
      { bone: "thighL", at: [0, -0.12, 0.01], r: 0.12 },
      { bone: "thighR", at: [0, -0.12, 0.01], r: 0.12 },
      { bone: "thighL", at: [0, -0.3, 0.005], r: 0.095 },
      { bone: "thighR", at: [0, -0.3, 0.005], r: 0.095 },
      { bone: "shinL", at: [0, 0, 0.01], r: 0.08 },
      { bone: "shinR", at: [0, 0, 0.01], r: 0.08 },
    ],
  }));
  group.add(cape.mesh, tabard.mesh);

  const equipment: ArmorEquipment = { ...DEFAULT_EQUIPMENT };
  let firstPersonMode = false;

  const syncEquipment = () => {
    cape.mesh.visible = equipment.cape;
    tabard.mesh.visible = equipment.tabard;
    model.sword.visible = equipment.sword;
    model.shield.visible = equipment.shield;

    const show = (slot: keyof typeof model.meshes, on: boolean) => {
      for (const m of model.meshes[slot]) m.visible = on;
    };
    // The closed helm replaces the head; mail or the doublet replace the bare body they cover;
    // gauntlets and sabatons replace the hands and the shoes (or bare feet).
    const covered = equipment.mail || equipment.doublet;
    show("helm", !firstPersonMode && equipment.helm);
    show("head", !firstPersonMode && !equipment.helm);
    show("gorget", !firstPersonMode && equipment.gorget);
    show("cuirass", equipment.cuirass);
    show("pauldrons", equipment.pauldrons);
    show("arms", equipment.arms);
    show("gauntlets", equipment.gauntlets);
    show("waist", equipment.waist);
    show("cuisses", equipment.cuisses);
    show("greaves", equipment.greaves);
    show("sabatons", equipment.sabatons);
    show("mail", equipment.mail);
    show("doublet", equipment.doublet && !equipment.mail);
    show("body", !covered);
    show("braies", !covered);
    show("hands", !equipment.gauntlets);
    show("shoes", !equipment.sabatons && covered);
    show("feet", !equipment.sabatons && !covered);
  };
  syncEquipment();

  let animator = new PaladinAnimator();
  const fx = new BladeFx();
  const sweep = new BladeSweep();
  const shake = { value: 0 };
  const base = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let lastSerial = 0;

  const update = (dt: number, input: PaladinInput, floorY: number, world?: CombatWorld): void => {
    group.updateMatrixWorld(true);
    animator.update(dt, rig, input);
    bodyRig.update(rig, equipment.shield ? "strap" : "relaxed", equipment.sword ? "sword" : "relaxed", dt);
    group.updateMatrixWorld(true);

    if (equipment.cape) cape.step(dt, rig, group, floorY);
    if (equipment.tabard) tabard.step(dt, rig, group, floorY);

    base.set(0, 0, SWORD.base).applyMatrix4(model.sword.matrixWorld);
    tip.set(0, 0, SWORD.tip).applyMatrix4(model.sword.matrixWorld);
    if (animator.state === "strike" && animator.swingSerial !== lastSerial) {
      lastSerial = animator.swingSerial;
      world?.onSwing?.(animator.swingIndex);
    }
    const live = animator.state === "strike" && animator.strikeU > 0.1 && animator.strikeU < 0.97;
    if (animator.state === "strike" && equipment.sword) fx.sample(base, tip);
    const result = equipment.sword ? sweep.step(live, animator.swingSerial, animator.swingIndex, base, tip, world) : null;
    if (result === "clang") {
      dir.copy(sweep.travel).normalize().multiplyScalar(-1);
      fx.burst(sweep.point, dir, 22);
      animator.bounce();
      shake.value = Math.min(1, shake.value + 0.7);
    } else if (result === "hit") {
      animator.stop(0.075);
      shake.value = Math.min(1, shake.value + 0.4);
    }
    if (animator.footfall !== 0) world?.onFootstep?.(animator.footfall);
    shake.value *= Math.exp(-dt * 9);
    fx.update(dt);
  };

  const reset = (): void => {
    animator = new PaladinAnimator();
    rig.reset();
    // Fingers relaxed, as when built; the next updates close them on what he holds.
    bodyRig.update(rig, "relaxed", "relaxed", 10);
    cape.invalidate();
    tabard.invalidate();
    fx.clear();
    sweep.reset();
    shake.value = 0;
    lastSerial = 0;
  };

  return {
    character,
    group,
    fx: fx.group,
    rig,
    bodyRig,
    get animator() {
      return animator;
    },
    materials,
    sword: model.sword,
    shield: model.shield,
    equipment,
    setEquipped(slot: ArmorSlot, on: boolean) {
      equipment[slot] = on;
      syncEquipment();
    },
    setAllArmor(on: boolean) {
      for (const s of PLATE_SLOTS) equipment[s] = on;
      equipment.mail = on;
      equipment.cape = on;
      equipment.tabard = on;
      equipment.doublet = !on;
      syncEquipment();
    },
    update,
    reset,
    setFirstPerson(on: boolean) {
      firstPersonMode = on;
      syncEquipment();
    },
    getEye(out: THREE.Vector3) {
      return out.copy(EYE_LOCAL).applyMatrix4(rig.bone("head").matrixWorld);
    },
    shake,
    renderIcons(renderer: THREE.WebGLRenderer, size = 112) {
      const objects = (slot: ArmorSlot): THREE.Object3D[] =>
        slot === "cape" ? [cape.mesh] : slot === "tabard" ? [tabard.mesh] : slot === "sword" ? [model.sword] : slot === "shield" ? [model.shield] : model.meshes[slot];
      const everything: THREE.Object3D[] = [cape.mesh, tabard.mesh, model.sword, model.shield];
      for (const s of SLOTS) everything.push(...model.meshes[s]);
      return renderPieceIcons(renderer, group, ARMOR_SLOTS.slice(), objects, everything, size, syncEquipment);
    },
    dispose() {
      for (const slot of SLOTS) {
        for (const m of model.meshes[slot]) m.geometry.dispose();
      }
      model.sword.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      model.shield.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      cape.dispose();
      tabard.dispose();
      fx.dispose();
      rig.skeleton.dispose();
      bodyRig.dispose();
      materials.dispose();
    },
  };
}
