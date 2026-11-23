import { AVERAGE_FACE, MINER_EQUIPMENT, type FaceSpec, type HumanSpec, type Outfit, type Workwear } from "../../artifacts/characters/paladin";

/**
 * The cast: realistic base humans. Seven of the twelve boys (scaled to their age) and their
 * coach, in football kit; the two British divers who find them, and the volunteer, in black
 * wetsuits with helmets, cap lamps and masks. "You" is the hero, the boy we follow.
 */

const face = (f: Partial<FaceSpec>): FaceSpec => ({ ...AVERAGE_FACE, ...f });

export interface CastMember {
  spec: HumanSpec;
  outfit: Outfit;
  /** Overall size (1 = adult). */
  scale: number;
  workwear: Partial<Workwear>;
}

/** Football kit: shirt, shorts, and socks with trainers (the "boots"). */
type RGB = [number, number, number];
const kit = (shirt: RGB, shorts: RGB = [0.1, 0.11, 0.14], socks: RGB = [0.92, 0.92, 0.9]): Outfit => ({ coverall: shirt, hat: [1, 1, 1], shirt, shorts, boots: socks });
const KIT_WEAR: Partial<Workwear> = { kit: true, boots: true };
/** Wetsuit: glossy black, a blue stripe, helmet, lamp and mask. */
const suit = (helmet: [number, number, number]): Outfit => ({ coverall: [0.04, 0.045, 0.05], hat: helmet, tape: [0.12, 0.32, 0.62], boots: [0.05, 0.05, 0.06], roughness: 0.38 });
const DIVER_WEAR: Partial<Workwear> = { coverall: true, boots: true, hardhat: true, lamp: true, sunglasses: true };

const boy = (name: string, skin: [number, number, number], f: Partial<FaceSpec>, hair: HumanSpec["hair"], muscle = 0.2, bulk = -0.45): HumanSpec => ({
  name,
  skin,
  flush: 0.25,
  freckles: 0,
  age: 0,
  face: face({ eyeSize: 0.3, noseSize: -0.35, jawWidth: -0.3, jawSquare: -0.4, chin: -0.1, brow: -0.4, cheekbones: -0.1, lips: 0.15, ...f }),
  eyeColor: [0.2, 0.13, 0.08],
  hair,
  beard: 0,
  brows: 0.75,
  muscle,
  bulk,
});

const BLACK: [number, number, number] = [0.05, 0.04, 0.035];

export const CAST = {
  // You: thirteen, a red shirt.
  hero: { spec: boy("Hero", [0.78, 0.6, 0.46], { eyeSize: 0.4, lips: 0.2 }, { style: "crop", color: BLACK, grey: 0 }), outfit: kit([0.78, 0.12, 0.12], [0.1, 0.11, 0.14], [0.78, 0.12, 0.12]), scale: 0.84, workwear: KIT_WEAR },
  coach: {
    spec: {
      name: "Coach",
      skin: [0.76, 0.58, 0.44],
      flush: 0.25,
      freckles: 0,
      age: 0.15,
      face: face({ jawWidth: 0.1, cheekbones: 0.4, eyeSize: 0.1, noseWidth: 0.2, lips: 0.1, brow: 0.1 }),
      eyeColor: [0.2, 0.13, 0.08],
      hair: { style: "buzz", color: BLACK, grey: 0 },
      beard: 0.08,
      brows: 0.95,
      muscle: 0.4,
      bulk: -0.35,
    },
    outfit: kit([0.18, 0.2, 0.26], [0.12, 0.12, 0.14], [0.15, 0.15, 0.17]),
    scale: 0.96,
    workwear: KIT_WEAR,
  },
  b1: { spec: boy("Boy1", [0.72, 0.53, 0.4], { jawWidth: -0.1, eyeTilt: 0.2 }, { style: "buzz", color: BLACK, grey: 0 }), outfit: kit([0.16, 0.3, 0.62]), scale: 0.8, workwear: KIT_WEAR },
  b2: { spec: boy("Boy2", [0.8, 0.63, 0.5], { eyeSize: 0.2, chin: 0.2 }, { style: "swept", color: BLACK, grey: 0 }), outfit: kit([0.92, 0.9, 0.86], [0.78, 0.12, 0.12]), scale: 0.87, workwear: KIT_WEAR },
  b3: { spec: boy("Boy3", [0.68, 0.5, 0.37], { cheekbones: 0.2, noseWidth: 0.3 }, { style: "crop", color: BLACK, grey: 0 }, 0.3, -0.3), outfit: kit([0.78, 0.12, 0.12]), scale: 0.9, workwear: KIT_WEAR },
  b4: { spec: boy("Boy4", [0.82, 0.65, 0.52], { eyeSize: 0.5, noseSize: -0.5 }, { style: "crop", color: BLACK, grey: 0 }), outfit: kit([0.95, 0.72, 0.12], [0.16, 0.3, 0.62]), scale: 0.76, workwear: KIT_WEAR },
  b5: { spec: boy("Boy5", [0.74, 0.55, 0.41], { jawWidth: 0, lips: 0.3 }, { style: "buzz", color: BLACK, grey: 0 }), outfit: kit([0.2, 0.55, 0.3]), scale: 0.83, workwear: KIT_WEAR },
  // The two British divers who find them (the first one later carries "you" out), and the volunteer.
  d1: {
    spec: {
      name: "Diver1",
      skin: [0.84, 0.66, 0.56],
      flush: 0.5,
      freckles: 0.05,
      age: 0.6,
      face: face({ jawSquare: 0.3, brow: 0.4, noseSize: 0.3, cheekHollow: 0.2 }),
      eyeColor: [0.4, 0.45, 0.5],
      hair: { style: "buzz", color: [0.35, 0.3, 0.26], grey: 0.5 },
      beard: 0.2,
      brows: 1.1,
      muscle: 0.5,
      bulk: 0.1,
    },
    outfit: suit([0.95, 0.95, 0.92]),
    scale: 1,
    workwear: DIVER_WEAR,
  },
  d2: {
    spec: {
      name: "Diver2",
      skin: [0.86, 0.68, 0.58],
      flush: 0.45,
      freckles: 0.1,
      age: 0.4,
      face: face({ jawWidth: 0.2, chin: 0.2, noseBridge: 0.3 }),
      eyeColor: [0.3, 0.42, 0.55],
      hair: { style: "crop", color: [0.3, 0.22, 0.15], grey: 0.1 },
      beard: 0.3,
      brows: 1.0,
      muscle: 0.55,
      bulk: 0,
    },
    outfit: suit([0.96, 0.78, 0.1]),
    scale: 1,
    workwear: DIVER_WEAR,
  },
  d3: {
    spec: {
      name: "Volunteer",
      skin: [0.7, 0.52, 0.39],
      flush: 0.25,
      freckles: 0,
      age: 0.35,
      face: face({ jawWidth: 0.2, cheekbones: 0.4, noseWidth: 0.3 }),
      eyeColor: [0.2, 0.13, 0.08],
      hair: { style: "buzz", color: BLACK, grey: 0 },
      beard: 0.1,
      brows: 1.0,
      muscle: 0.6,
      bulk: 0,
    },
    outfit: suit([0.2, 0.22, 0.25]),
    scale: 1,
    workwear: DIVER_WEAR,
  },
} satisfies Record<string, CastMember>;

export type CastId = keyof typeof CAST;
export const BOYS: CastId[] = ["hero", "coach", "b1", "b2", "b3", "b4", "b5"];
export const DIVERS: CastId[] = ["d1", "d2", "d3"];

export { MINER_EQUIPMENT };
