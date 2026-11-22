// The cleric's flanged mace, the wizard's oak staff and the rogue's rondel dagger, built in code, and how a worn set puts them in
// his hand. The paladin rig only knows a sword: either rides on the sword's group (same grip, same
// swing and hit sweep) with the blade hidden. A worn set (playerInv.wornOf) carries
// `mainHand: "mace" | "staff" | "dagger"` beside its finishes, so the table, the portrait and other players
// draw it too.
import * as THREE from "three";
import { crystalGeometry } from "./monsters/props";
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

/**
 * The wizard's oak staff along +Z from the grip: a knotted shaft from an iron shoe below his hand to
 * an iron crown above his head, three prongs holding a blue crystal (the tip spells leave from:
 * STAFF_TIP_Z). About 1.6 m long.
 */
export const STAFF_TIP_Z = 1.08;
export function buildStaff(wood: THREE.Material, iron: THREE.Material, crystal: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = "wizard-staff";
  const pts: THREE.Vector2[] = [];
  // The shaft's outline, bottom to top: a slight taper and a few knots.
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const z = -0.52 + t * 1.46;
    const knot = 0.0035 * Math.exp(-(((t - 0.28) / 0.025) ** 2)) + 0.004 * Math.exp(-(((t - 0.62) / 0.02) ** 2)) + 0.003 * Math.exp(-(((t - 0.83) / 0.02) ** 2));
    pts.push(new THREE.Vector2(0.016 + 0.004 * t + knot, z));
  }
  const shaft = new THREE.LatheGeometry(pts, 10);
  shaft.rotateX(Math.PI / 2);
  const parts: Array<[THREE.BufferGeometry, THREE.Material]> = [[shaft, wood]];
  const along = (geo: THREE.BufferGeometry, z: number) => {
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, z);
    return geo;
  };
  parts.push([along(new THREE.CylinderGeometry(0.019, 0.013, 0.07, 10), -0.52), iron]);
  parts.push([along(new THREE.CylinderGeometry(0.024, 0.022, 0.035, 10), 0.93), iron]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const prong = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 0.018, Math.sin(a) * 0.018, 0.94),
        new THREE.Vector3(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 1.02),
        new THREE.Vector3(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 1.12),
      ]),
      8,
      0.0055,
      5,
      false
    );
    parts.push([prong, iron]);
  }
  const head = crystalGeometry("rare").clone();
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, STAFF_TIP_Z - 0.04);
  parts.push([head, crystal]);
  for (const [geo, mat] of parts) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = mat !== crystal;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/**
 * The rogue's rondel dagger along +Z from the grip: a square-section spike of a blade between two
 * steel discs (the rondels), a wire-bound grip. About 38 cm long.
 */
export function buildDagger(steel: THREE.Material, grip: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = "rogue-dagger";
  const along = (geo: THREE.BufferGeometry, z: number) => {
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, z);
    return geo;
  };
  // Four sides tapering to a point: a cylinder with four segments, its top closed to nothing.
  const blade = new THREE.CylinderGeometry(0.0015, 0.011, 0.25, 4, 1);
  blade.rotateY(Math.PI / 4);
  const parts: Array<[THREE.BufferGeometry, THREE.Material]> = [
    [along(blade, 0.19), steel],
    [along(new THREE.CylinderGeometry(0.026, 0.026, 0.008, 18), 0.062), steel],
    [along(new THREE.CylinderGeometry(0.014, 0.016, 0.1, 10), 0.008), grip],
    [along(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 18), -0.048), steel],
    [along(new THREE.SphereGeometry(0.008, 8, 6), -0.056), steel],
  ];
  for (const [geo, mat] of parts) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

type Held = "mace" | "staff" | "dagger";
/** A worn set's main hand, if it is not the sword. */
export const mainHandIn = (e: ArmorEquipment): Held | undefined => (e as ArmorEquipment & { mainHand?: Held }).mainHand;

const heldKey = (h: Held | undefined) => (h === "mace" ? "m" : h === "staff" ? "s" : h === "dagger" ? "d" : "");
/** A key for "what he wears and holds" (the armour, what it is made of, and a mace, staff or dagger). */
export const gearKey = (e: ArmorEquipment): string => wearKey(e, finishIn(e)) + heldKey(mainHandIn(e));
/** The same key for what a built paladin has on now. */
export const paladinGearKey = (p: Paladin): string => wearKey(p.equipment, p.finish) + heldKey(p.sword.userData.held as Held | undefined);

/** What he holds on the sword's grip now (the staff's tip is where spells leave from). */
export const heldBy = (p: Paladin): Held | undefined => p.sword.userData.held as Held | undefined;

/** Swap the sword's blade for the mace, the staff or the dagger (or back). Each is built once per paladin. */
export function setHeld(p: Paladin, held: Held | undefined): void {
  const s = p.sword;
  if (s.userData.held === held) return;
  const names: Record<Held, string> = { mace: "cleric-mace", staff: "wizard-staff", dagger: "rogue-dagger" };
  let shown: THREE.Object3D | undefined;
  if (held) {
    shown = s.getObjectByName(names[held]);
    if (!shown) {
      const mats = (s.userData.heldMats ??= [] as THREE.Material[]) as THREE.Material[];
      if (held === "mace") {
        const wood = new THREE.MeshStandardMaterial({ color: 0x94693f, roughness: 0.65 });
        mats.push(wood);
        shown = buildMace(p.materials.skinned.steel, wood, p.materials.skinned.leather);
      } else if (held === "dagger") {
        shown = buildDagger(p.materials.skinned.steel, p.materials.skinned.leather);
      } else {
        const oak = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.8 });
        const iron = new THREE.MeshStandardMaterial({ color: 0x4a4c52, metalness: 0.8, roughness: 0.45 });
        const crystal = new THREE.MeshStandardMaterial({ color: 0x3f7bff, emissive: 0x5aa2ff, emissiveIntensity: 1.2, roughness: 0.15, flatShading: true });
        mats.push(oak, iron, crystal);
        shown = buildStaff(oak, iron, crystal);
      }
      s.add(shown);
    }
  }
  const ours = [names.mace, names.staff, names.dagger];
  for (const c of s.children) c.visible = held ? c === shown : ours.indexOf(c.name) < 0;
  s.userData.held = held;
}

/** Put a worn set on a paladin: the armour in its finishes, and the mace, staff or dagger if he holds one. */
export function dressGear(p: Paladin, e: ArmorEquipment): void {
  p.wear(e, finishIn(e));
  setHeld(p, mainHandIn(e));
}

/** Free what setHeld made (the shared steel and leather belong to the paladin). */
export function disposeMace(p: Paladin): void {
  for (const n of ["cleric-mace", "wizard-staff", "rogue-dagger"]) {
    p.sword.getObjectByName(n)?.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
  for (const m of (p.sword.userData.heldMats as THREE.Material[] | undefined) ?? []) m.dispose();
}
