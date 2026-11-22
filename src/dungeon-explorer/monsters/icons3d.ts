// Inventory pictures of the monsters' drops, made from the same code-built models as the world:
// mana crystals at every rarity, bones and a skull, arrows, the bone bow and staff, slime gel, the
// acid gland and the rings. icons.ts renders each on its small off-screen renderer.
import * as THREE from "three";
import { crystalId, RARITIES } from "../items";
import { BOWS, BOW_WOOD, bowLimbs } from "../bows";
import { buildMace, buildStaff } from "../mace";
import { arrowGeometry, bowGeometry, crystalGeometry, crystalMaterial, staffGeometry } from "./props";
import { boneGeometry, skullObject } from "./skeletonBody";

/** A bow from the side, strung (the same limbs he carries). */
function bowIcon(id: string): THREE.Object3D {
  const spec = BOWS[id];
  const o = new THREE.Group();
  o.add(new THREE.Mesh(bowLimbs(spec.shape), new THREE.MeshStandardMaterial({ color: BOW_WOOD[spec.shape], roughness: 0.55 })));
  const s = new THREE.Mesh(bowGeometry().string, new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.9 }));
  s.scale.set(1.6, spec.tipY * 2, 1.6);
  s.position.z = spec.tipZ;
  o.add(s);
  o.rotation.set(0, Math.PI / 2, 0.15);
  return o;
}

const boneMat = () => new THREE.MeshStandardMaterial({ color: 0xd6c8a6, roughness: 0.75 });

function jelly(color: number, size = 1): THREE.Object3D {
  const g = new THREE.SphereGeometry(0.05 * size, 24, 16);
  g.scale(1, 0.72, 1);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.05, transparent: true, opacity: 0.85 }));
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.012 * size, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  shine.position.set(-0.018 * size, 0.022 * size, 0.03 * size);
  const o = new THREE.Group();
  o.add(m, shine);
  return o;
}

function ring(stone: number | null): THREE.Object3D {
  const o = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 10, 28), new THREE.MeshStandardMaterial({ color: stone === null ? 0x8a7a55 : 0xd8b24a, metalness: 0.9, roughness: 0.35 }));
  o.add(band);
  if (stone !== null) {
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.006, 16), new THREE.MeshStandardMaterial({ color: stone, metalness: 0.4, roughness: 0.3 }));
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0, 0.022, 0);
    seal.rotation.set(0, 0, 0);
    o.add(seal);
  }
  o.rotation.set(1.0, 0.3, 0);
  return o;
}

/** A maker for each drop that has a model; anything else is drawn or named (icons.ts). */
export const PROC_ICONS: Record<string, () => THREE.Object3D> = {
  bone: () => {
    const o = new THREE.Group();
    const a = new THREE.Mesh(boneGeometry(0.34, 0.018), boneMat());
    a.rotation.z = 0.9;
    const b = new THREE.Mesh(boneGeometry(0.22, 0.012), boneMat());
    b.rotation.z = -0.5;
    b.position.set(0.03, -0.02, 0.03);
    o.add(a, b);
    return o;
  },
  skull: () => {
    const o = skullObject(boneMat());
    o.rotation.set(0.1, 0.55, 0);
    return o;
  },
  arrows: () => {
    const o = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8c7a5c, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const a = new THREE.Mesh(arrowGeometry(), mat);
      a.rotation.set(-Math.PI / 2 + (i - 1.5) * 0.05, 0, (i - 1.5) * 0.06);
      a.position.set((i - 1.5) * 0.014, 0, (i % 2) * 0.01);
      o.add(a);
    }
    o.rotation.z = 0.15;
    return o;
  },
  bone_bow: () => {
    const m = new THREE.Mesh(bowGeometry().limbs, new THREE.MeshStandardMaterial({ color: 0xb9a88a, roughness: 0.7 }));
    m.rotation.set(0, Math.PI / 2, 0.15);
    return m;
  },
  recurve_bow: () => bowIcon("recurve_bow"),
  flanged_mace: () => {
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.85, roughness: 0.32 });
    const m = buildMace(steel, new THREE.MeshStandardMaterial({ color: 0x94693f, roughness: 0.65 }), new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.8 }));
    m.rotation.x = -Math.PI / 2;
    const o = new THREE.Group();
    o.add(m);
    return o;
  },
  oak_staff: () => {
    const m = buildStaff(
      new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x5a5c62, metalness: 0.8, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ color: 0x3f7bff, emissive: 0x5aa2ff, emissiveIntensity: 1, roughness: 0.15, flatShading: true })
    );
    m.rotation.set(-Math.PI / 2, 0, 0.12);
    const o = new THREE.Group();
    o.add(m);
    return o;
  },
  short_bow: () => bowIcon("short_bow"),
  long_bow: () => bowIcon("long_bow"),
  bone_staff: () => {
    const g = staffGeometry();
    const o = new THREE.Group();
    o.add(new THREE.Mesh(g.shaft, new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.85 })));
    o.add(new THREE.Mesh(g.head, new THREE.MeshStandardMaterial({ color: 0x7a5ad8, emissive: 0xa77bff, emissiveIntensity: 1, roughness: 0.15, flatShading: true })));
    o.rotation.set(-Math.PI / 2, 0, 0.12);
    return o;
  },
  slime_gel: () => jelly(0x5fd06a),
  acid_gland: () => jelly(0xc6e83a, 0.85),
  ring: () => ring(null),
  signet: () => ring(0x8a1c1c),
};
for (const r of RARITIES) {
  PROC_ICONS[crystalId(r)] = () => {
    const m = new THREE.Mesh(crystalGeometry(r), crystalMaterial(r));
    m.rotation.set(0.25, 0.5, -0.2);
    return m;
  };
}
