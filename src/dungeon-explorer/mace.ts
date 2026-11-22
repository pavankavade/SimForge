// The cleric's flanged mace, built in code, and how a worn set puts it in his hand. The paladin rig
// only knows a sword: the mace rides on the sword's group (same grip, same swing and hit sweep) with
// the blade hidden. A worn set (playerInv.wornOf) carries `mainHand: "mace"` beside its finishes,
// so the table, the portrait and other players draw the mace too.
import * as THREE from "three";
import { wearKey, type ArmorEquipment, type Paladin } from "../artifacts/characters/paladin";
import { finishIn } from "./playerInv";

/**
 * A flanged mace along +Z from the grip (as the sword is): a leather-wrapped ash haft, a round
 * pommel, and a steel head of seven flanges round a core with a knob on top. About 62 cm long.
 */
export function buildMace(steel: THREE.Material, wood: THREE.Material, leather: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = "cleric-mace";
  const along = (geo: THREE.BufferGeometry, z: number) => {
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, z);
    return geo;
  };
  const parts: Array<[THREE.BufferGeometry, THREE.Material]> = [
    [along(new THREE.CylinderGeometry(0.015, 0.017, 0.5, 12), 0.2), wood],
    [along(new THREE.CylinderGeometry(0.019, 0.019, 0.13, 12), -0.01), leather],
    [along(new THREE.SphereGeometry(0.026, 14, 10), -0.09), steel],
    [along(new THREE.CylinderGeometry(0.024, 0.022, 0.028, 12), 0.39), steel],
    [along(new THREE.CylinderGeometry(0.027, 0.027, 0.16, 14), 0.49), steel],
    [along(new THREE.SphereGeometry(0.03, 14, 10), 0.575), steel],
  ];
  // The flanges: thin plates standing out from the core, deepest in the middle of the head.
  const flange = new THREE.Shape();
  flange.moveTo(0, -0.085);
  flange.lineTo(0.03, -0.055);
  flange.quadraticCurveTo(0.05, 0, 0.032, 0.06);
  flange.lineTo(0, 0.085);
  flange.lineTo(0, -0.085);
  const flangeGeo = new THREE.ExtrudeGeometry(flange, { depth: 0.007, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 6 });
  flangeGeo.translate(0.022, 0, -0.0035);
  // Shape y runs along the haft (+Z); x points out from the core.
  flangeGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const geo = flangeGeo.clone();
    geo.rotateZ((i / 7) * Math.PI * 2);
    geo.translate(0, 0, 0.49);
    parts.push([geo, steel]);
  }
  flangeGeo.dispose();
  for (const [geo, mat] of parts) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** A worn set's main hand, if it is not the sword. */
export const mainHandIn = (e: ArmorEquipment): "mace" | undefined => (e as ArmorEquipment & { mainHand?: "mace" }).mainHand;

/** A key for "what he wears and holds" (the armour, what it is made of, and the mace). */
export const gearKey = (e: ArmorEquipment): string => wearKey(e, finishIn(e)) + (mainHandIn(e) === "mace" ? "m" : "");
/** The same key for what a built paladin has on now. */
export const paladinGearKey = (p: Paladin): string => wearKey(p.equipment, p.finish) + (p.sword.userData.mace ? "m" : "");

/** Swap the sword's blade for the mace (or back). The mace is built once per paladin. */
export function setMace(p: Paladin, on: boolean): void {
  const s = p.sword;
  if (!!s.userData.mace === on) return;
  let mace = s.getObjectByName("cleric-mace") as THREE.Group | undefined;
  if (on && !mace) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x94693f, roughness: 0.65 });
    mace = buildMace(p.materials.skinned.steel, wood, p.materials.skinned.leather);
    s.add(mace);
    s.userData.maceWood = wood;
  }
  for (const c of s.children) c.visible = c === mace ? on : !on;
  s.userData.mace = on;
}

/** Put a worn set on a paladin: the armour in its finishes, and the mace if he holds one. */
export function dressGear(p: Paladin, e: ArmorEquipment): void {
  p.wear(e, finishIn(e));
  setMace(p, mainHandIn(e) === "mace");
}

/** Free what setMace made (the shared steel and leather belong to the paladin). */
export function disposeMace(p: Paladin): void {
  const mace = p.sword.getObjectByName("cleric-mace");
  mace?.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
  (p.sword.userData.maceWood as THREE.Material | undefined)?.dispose();
}
