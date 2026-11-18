import { AVERAGE_FACE, MINER_EQUIPMENT, MINER_WORKWEAR, type FaceSpec, type HumanSpec, type Outfit } from "../../artifacts/characters/paladin";

/**
 * The miners (and two rescuers): realistic base humans in workwear. Six of the 33 are on screen;
 * "you" is the hero, and the foreman is the shift boss who splits the food and comes up last.
 */

const face = (f: Partial<FaceSpec>): FaceSpec => ({ ...AVERAGE_FACE, ...f });

export interface CastMember {
  spec: HumanSpec;
  outfit: Outfit;
}

const ORANGE: Outfit = { coverall: [0.86, 0.38, 0.1], hat: [0.96, 0.74, 0.1] };
const NAVY: Outfit = { coverall: [0.16, 0.22, 0.36], hat: [0.95, 0.78, 0.12] };
const RESCUE_RED: Outfit = { coverall: [0.72, 0.12, 0.1], hat: [0.95, 0.95, 0.95] };

export const CAST = {
  // You: thirties, dark hair, a few days of stubble.
  hero: {
    spec: {
      name: "Hero",
      skin: [0.74, 0.55, 0.42],
      flush: 0.3,
      freckles: 0,
      age: 0.3,
      face: face({ jawWidth: 0.2, jawSquare: 0.3, cheekbones: 0.3, brow: 0.3, eyeDepth: 0.2, noseSize: 0.2, noseBridge: 0.2, lips: 0.1 }),
      eyeColor: [0.24, 0.15, 0.09],
      hair: { style: "crop", color: [0.07, 0.05, 0.04], grey: 0 },
      beard: 0.35,
      brows: 1.15,
      muscle: 0.55,
      bulk: 0.05,
    },
    outfit: ORANGE,
  },
  // The foreman: older, grey at the temples, heavier, a moustache-ish beard.
  foreman: {
    spec: {
      name: "Foreman",
      skin: [0.7, 0.5, 0.38],
      flush: 0.4,
      freckles: 0,
      age: 0.75,
      face: face({ jawWidth: 0.4, jawSquare: 0.4, chin: 0.1, brow: 0.6, cheekbones: 0.2, eyeDepth: 0.5, hooded: 0.4, noseSize: 0.4, noseWidth: 0.4, lips: -0.2, earSize: 0.2 }),
      eyeColor: [0.22, 0.14, 0.09],
      hair: { style: "buzz", color: [0.16, 0.13, 0.11], grey: 0.55 },
      beard: 0.6,
      brows: 1.3,
      muscle: 0.5,
      bulk: 0.4,
    },
    outfit: NAVY,
  },
  m1: {
    spec: {
      name: "Miner1",
      skin: [0.62, 0.43, 0.31],
      flush: 0.2,
      freckles: 0,
      age: 0.15,
      face: face({ jawWidth: -0.2, chin: 0.2, cheekbones: 0.5, eyeSize: 0.2, noseWidth: 0.3, lips: 0.4 }),
      eyeColor: [0.2, 0.12, 0.07],
      hair: { style: "buzz", color: [0.05, 0.04, 0.04], grey: 0 },
      beard: 0.15,
      brows: 1.0,
      muscle: 0.6,
      bulk: -0.2,
    },
    outfit: ORANGE,
  },
  m2: {
    spec: {
      name: "Miner2",
      skin: [0.78, 0.6, 0.47],
      flush: 0.45,
      freckles: 0.05,
      age: 0.55,
      face: face({ jawWidth: 0.3, jawSquare: 0.6, brow: 0.4, cheekHollow: 0.3, noseSize: 0.5, noseBridge: 0.5, noseTip: -0.3, mouthWidth: 0.2 }),
      eyeColor: [0.3, 0.22, 0.12],
      hair: { style: "swept", color: [0.1, 0.07, 0.05], grey: 0.2 },
      beard: 0.85,
      brows: 1.2,
      muscle: 0.45,
      bulk: 0.25,
    },
    outfit: ORANGE,
  },
  m3: {
    spec: {
      name: "Miner3",
      skin: [0.55, 0.38, 0.27],
      flush: 0.15,
      freckles: 0,
      age: 0.4,
      face: face({ jawWidth: 0.5, chin: -0.2, cheekbones: 0.6, eyeTilt: 0.2, noseWidth: 0.6, lips: 0.5, skullWidth: 0.2 }),
      eyeColor: [0.18, 0.11, 0.06],
      hair: { style: "crop", color: [0.04, 0.03, 0.03], grey: 0.1 },
      beard: 0.25,
      brows: 1.1,
      muscle: 0.5,
      bulk: 0.1,
    },
    outfit: NAVY,
  },
  m4: {
    spec: {
      name: "Miner4",
      skin: [0.8, 0.63, 0.5],
      flush: 0.5,
      freckles: 0.1,
      age: 0.2,
      face: face({ jawWidth: -0.3, jawSquare: -0.2, chin: 0.3, eyeSize: 0.3, noseSize: -0.1, lips: 0.2, earSize: 0.3 }),
      eyeColor: [0.28, 0.2, 0.1],
      hair: { style: "crop", color: [0.15, 0.09, 0.05], grey: 0 },
      beard: 0.5,
      brows: 0.95,
      muscle: 0.4,
      bulk: -0.3,
    },
    outfit: ORANGE,
  },
  // Rescuers at the surface.
  r1: {
    spec: {
      name: "Rescuer1",
      skin: [0.76, 0.57, 0.44],
      flush: 0.35,
      freckles: 0,
      age: 0.45,
      face: face({ jawSquare: 0.5, brow: 0.3, noseSize: 0.3, cheekbones: 0.2 }),
      eyeColor: [0.25, 0.17, 0.1],
      hair: { style: "buzz", color: [0.08, 0.06, 0.05], grey: 0.3 },
      beard: 0.2,
      brows: 1.1,
      muscle: 0.55,
      bulk: 0.15,
    },
    outfit: RESCUE_RED,
  },
  r2: {
    spec: {
      name: "Rescuer2",
      skin: [0.68, 0.48, 0.36],
      flush: 0.3,
      freckles: 0,
      age: 0.25,
      face: face({ jawWidth: -0.1, chin: 0.2, eyeSize: 0.2, lips: 0.3, cheekbones: 0.4 }),
      eyeColor: [0.2, 0.13, 0.08],
      hair: { style: "crop", color: [0.05, 0.04, 0.04], grey: 0 },
      beard: 0.1,
      brows: 1.0,
      muscle: 0.5,
      bulk: -0.1,
    },
    outfit: RESCUE_RED,
  },
} satisfies Record<string, CastMember>;

export type CastId = keyof typeof CAST;

export { MINER_EQUIPMENT, MINER_WORKWEAR };
