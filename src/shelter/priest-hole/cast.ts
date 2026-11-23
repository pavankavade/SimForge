import { AVERAGE_FACE, MINER_EQUIPMENT, type ArmorEquipment, type FaceSpec, type HumanSpec, type Outfit, type Workwear } from "../../artifacts/characters/paladin";

/**
 * The cast: realistic base humans dressed for an Elizabethan manor. The priest ("you") in a long
 * rust wool cassock under a brown cloak; three priest hunters in half armour (closed helm, plate
 * over mail, a dark coat skirt, swords); the friend upstairs, the house's owner, in a doublet.
 */

type RGB = [number, number, number];
const face = (f: Partial<FaceSpec>): FaceSpec => ({ ...AVERAGE_FACE, ...f });

export interface CastMember {
  spec: HumanSpec;
  outfit: Outfit;
  equipment: ArmorEquipment;
  workwear: Partial<Workwear>;
  scale: number;
}

const NONE = MINER_EQUIPMENT;
const BOOTS: Partial<Workwear> = { coverall: true, boots: true };

/** Soldiers' kit: helm, breastplate over mail (mail sleeves), a dark coat skirt, a sword. */
const HUNTER_KIT: ArmorEquipment = {
  ...NONE,
  helm: true,
  gorget: true,
  cuirass: true,
  waist: true,
  mail: true,
  tabard: true,
  sword: true,
};
const hunterCoat = (coat: RGB): Outfit => ({ coverall: coat, hat: coat, tape: coat, boots: [0.12, 0.09, 0.07], tabard: coat });

/** The reference short's priest: orange linen tunic, maroon hood and collar, charcoal cloak. */
const RUST: RGB = [0.86, 0.38, 0.15];
const HOOD: RGB = [0.33, 0.14, 0.12];
const CLOAK: RGB = [0.2, 0.21, 0.23];
const hunter = (name: string, skin: RGB, f: Partial<FaceSpec>): HumanSpec => ({
  name,
  skin,
  flush: 0.4,
  freckles: 0.05,
  age: 0.45,
  face: face({ jawSquare: 0.3, brow: 0.3, ...f }),
  eyeColor: [0.3, 0.25, 0.2],
  hair: { style: "buzz", color: [0.15, 0.11, 0.08], grey: 0.2 },
  beard: 0.4,
  brows: 1.1,
  muscle: 0.6,
  bulk: 0.15,
});

export const CAST = {
  // You: the priest, dressed as in the reference: hood up, a padded maroon collar, a long charcoal
  // cloak over a knee-length orange tunic, tall brown boots; a tanned face and a full beard.
  priest: {
    spec: {
      name: "Priest",
      skin: [0.7, 0.5, 0.38],
      flush: 0.3,
      freckles: 0.05,
      age: 0.3,
      face: face({ cheekbones: 0.3, cheekHollow: 0.25, jawWidth: -0.15, noseSize: 0.15, eyeSize: 0.15, brow: 0.05 }),
      eyeColor: [0.28, 0.2, 0.12],
      hair: { style: "crop", color: [0.12, 0.08, 0.05], grey: 0 },
      beard: 0.85,
      brows: 1.05,
      muscle: 0.1,
      bulk: -0.35,
    },
    outfit: { coverall: RUST, hat: RUST, tape: RUST, boots: [0.22, 0.13, 0.07], tabard: RUST, cape: CLOAK, garb: { robe: 0.5, hood: "up", hoodColor: HOOD } },
    equipment: { ...NONE, tabard: true, cape: true },
    workwear: BOOTS,
    scale: 0.97,
  },
  h1: { spec: hunter("Hunter1", [0.86, 0.68, 0.58], { noseSize: 0.3 }), outfit: hunterCoat([0.1, 0.1, 0.12]), equipment: HUNTER_KIT, workwear: BOOTS, scale: 1.02 },
  h2: { spec: hunter("Hunter2", [0.8, 0.62, 0.5], { jawWidth: 0.3 }), outfit: hunterCoat([0.3, 0.06, 0.05]), equipment: HUNTER_KIT, workwear: BOOTS, scale: 1 },
  h3: { spec: hunter("Hunter3", [0.84, 0.66, 0.55], { chin: 0.3 }), outfit: hunterCoat([0.16, 0.15, 0.12]), equipment: HUNTER_KIT, workwear: BOOTS, scale: 0.98 },
  // The friend upstairs: the owner of the house, grey at the temples.
  owner: {
    spec: {
      name: "Owner",
      skin: [0.86, 0.7, 0.6],
      flush: 0.45,
      freckles: 0.1,
      age: 0.7,
      face: face({ jawWidth: 0.1, cheekbones: 0.1, noseSize: 0.25, lips: -0.1 }),
      eyeColor: [0.35, 0.42, 0.5],
      hair: { style: "swept", color: [0.3, 0.24, 0.18], grey: 0.6 },
      beard: 0.6,
      brows: 1.0,
      muscle: 0.3,
      bulk: 0.25,
    },
    // In green, robed and hooded like the reference's friend upstairs.
    outfit: { coverall: [0.2, 0.36, 0.2], hat: [0.2, 0.36, 0.2], tape: [0.2, 0.36, 0.2], boots: [0.12, 0.09, 0.07], tabard: [0.2, 0.36, 0.2], cape: [0.14, 0.24, 0.14], garb: { robe: 0.7, capelet: 0.5, hood: "up" } },
    equipment: { ...NONE, tabard: true, cape: true },
    workwear: BOOTS,
    scale: 1,
  },
} satisfies Record<string, CastMember>;

export type CastId = keyof typeof CAST;
export const HUNTERS: CastId[] = ["h1", "h2", "h3"];
