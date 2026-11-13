// The playable paladin: one rigged body shared by first and third person. Place and turn `group`
// (feet at its origin, facing +Z), add `fx` to the scene root, and call `update` every frame.
import * as THREE from "three";
import { PaladinAnimator, type PaladinInput } from "./animator";
import { SWORD, buildPaladinModel } from "./build";
import { Cloth } from "./cloth";
import { BladeFx, BladeSweep, type CombatWorld } from "./combat";
import { createPaladinMaterials, type PaladinMaterials } from "./materials";
import { EYE_LOCAL, Rig } from "./rig";

export type { PaladinInput } from "./animator";
export type { CombatTarget, CombatWorld } from "./combat";
export { FX_LAYER } from "./combat";
export { createPaladinSfx, type PaladinSfx } from "./sfx";

export interface Paladin {
  group: THREE.Group;
  fx: THREE.Group;
  rig: Rig;
  animator: PaladinAnimator;
  materials: PaladinMaterials;
  sword: THREE.Group;
  shield: THREE.Group;
  /** Advance animation, cloth and blade physics. `floorY` is the ground height in world space. */
  update: (dt: number, input: PaladinInput, floorY: number, world?: CombatWorld) => void;
  /** Hide the helm so the camera can sit at the eyes; the body, arms and weapons stay. */
  setFirstPerson: (on: boolean) => void;
  /** Eye position in world space (valid after `update`). */
  getEye: (out: THREE.Vector3) => THREE.Vector3;
  /** Camera kick from impacts, decaying: add to the view for weight. */
  shake: { value: number };
  dispose: () => void;
}

export function createPaladin(renderer: THREE.WebGLRenderer): Paladin {
  const materials = createPaladinMaterials(renderer);
  const rig = new Rig();
  const model = buildPaladinModel(rig, materials);
  const group = new THREE.Group();
  group.name = "paladin";
  group.add(rig.root);
  for (const m of model.body) group.add(m);
  for (const m of model.head) group.add(m);

  // Sword in the right fist: grip through the palm, blade out past the thumb.
  model.sword.position.set(0.02, -0.095, 0);
  rig.bone("handR").add(model.sword);
  // Shield strapped along the left forearm: face outward, top edge toward the inside of the elbow.
  model.shield.position.set(0.1, -0.13, -0.06);
  model.shield.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0))
  );
  rig.bone("foreArmL").add(model.shield);

  const cape = new Cloth({
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
  });
  const tabard = new Cloth({
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
  });
  group.add(cape.mesh, tabard.mesh);

  const animator = new PaladinAnimator();
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
    group.updateMatrixWorld(true);

    cape.step(dt, rig, group, floorY);
    tabard.step(dt, rig, group, floorY);

    base.set(0, 0, SWORD.base).applyMatrix4(model.sword.matrixWorld);
    tip.set(0, 0, SWORD.tip).applyMatrix4(model.sword.matrixWorld);
    if (animator.state === "strike" && animator.swingSerial !== lastSerial) {
      lastSerial = animator.swingSerial;
      world?.onSwing?.(animator.swingIndex);
    }
    const live = animator.state === "strike" && animator.strikeU > 0.1 && animator.strikeU < 0.97;
    if (animator.state === "strike") fx.sample(base, tip);
    const result = sweep.step(live, animator.swingSerial, animator.swingIndex, base, tip, world);
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

  return {
    group,
    fx: fx.group,
    rig,
    animator,
    materials,
    sword: model.sword,
    shield: model.shield,
    update,
    setFirstPerson(on: boolean) {
      for (const m of model.head) m.visible = !on;
    },
    getEye(out: THREE.Vector3) {
      return out.copy(EYE_LOCAL).applyMatrix4(rig.bone("head").matrixWorld);
    },
    shake,
    dispose() {
      for (const m of model.body.concat(model.head)) m.geometry.dispose();
      model.sword.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      model.shield.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      cape.dispose();
      tabard.dispose();
      fx.dispose();
      rig.skeleton.dispose();
      materials.dispose();
    },
  };
}
