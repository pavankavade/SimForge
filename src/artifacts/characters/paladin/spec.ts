// What makes one person different from another. The base human is built entirely from this spec,
// so a new character is a new set of numbers: same skeleton, same animations, same armour.
export type RGB = [number, number, number];

/** Face structure. Every value is a deviation from the average face: 0 = average, about -1..1. */
export interface FaceSpec {
  /** Width of the jaw at its angles. */
  jawWidth: number;
  /** How square and angular the jaw is. */
  jawSquare: number;
  /** Chin projection and width. */
  chin: number;
  chinWidth: number;
  /** Cheekbone prominence. */
  cheekbones: number;
  /** Hollow under the cheekbones (lean faces). */
  cheekHollow: number;
  /** Brow ridge weight. */
  brow: number;
  /** Eye opening size, spacing, outer-corner tilt, depth of the sockets, and hooded upper lids. */
  eyeSize: number;
  eyeSpacing: number;
  eyeTilt: number;
  eyeDepth: number;
  hooded: number;
  /** Nose: projection, width at the nostrils, height of the bridge, upturned tip. */
  noseSize: number;
  noseWidth: number;
  noseBridge: number;
  noseTip: number;
  /** Lips and mouth. */
  lips: number;
  mouthWidth: number;
  /** Ears. */
  earSize: number;
  /** Width of the skull. */
  skullWidth: number;
}

export type HairStyle = "bald" | "buzz" | "crop" | "swept";

export interface HumanSpec {
  name: string;
  /** Skin base colour (sRGB 0..1). */
  skin: RGB;
  /** Extra redness in cheeks, nose and ears, 0..1. */
  flush: number;
  /** Freckles 0..1, and weathering / age lines 0..1. */
  freckles: number;
  age: number;
  face: FaceSpec;
  eyeColor: RGB;
  hair: { style: HairStyle; color: RGB; grey: number };
  /** 0 = clean shaven, ~0.3 = stubble, 1 = full short beard. */
  beard: number;
  /** Eyebrow thickness, about 0.6..1.5. */
  brows: number;
  /** Body: muscle definition 0..1 and overall bulk (-1 lean .. 1 heavy). */
  muscle: number;
  bulk: number;
}

export const AVERAGE_FACE: FaceSpec = {
  jawWidth: 0,
  jawSquare: 0,
  chin: 0,
  chinWidth: 0,
  cheekbones: 0,
  cheekHollow: 0,
  brow: 0,
  eyeSize: 0,
  eyeSpacing: 0,
  eyeTilt: 0,
  eyeDepth: 0,
  hooded: 0,
  noseSize: 0,
  noseWidth: 0,
  noseBridge: 0,
  noseTip: 0,
  lips: 0,
  mouthWidth: 0,
  earSize: 0,
  skullWidth: 0,
};

const face = (f: Partial<FaceSpec>): FaceSpec => ({ ...AVERAGE_FACE, ...f });

export const CHARACTERS: Record<string, HumanSpec> = {
  // The paladin: broad, square-jawed, short brown hair and a trimmed beard.
  aldric: {
    name: "Aldric",
    skin: [0.8, 0.62, 0.51],
    flush: 0.45,
    freckles: 0.05,
    age: 0.3,
    face: face({ jawWidth: 0.5, jawSquare: 0.7, chin: 0.4, chinWidth: 0.3, brow: 0.5, cheekbones: 0.3, eyeDepth: 0.3, noseSize: 0.2, noseBridge: 0.3 }),
    eyeColor: [0.36, 0.5, 0.62],
    hair: { style: "crop", color: [0.2, 0.13, 0.08], grey: 0 },
    beard: 0.85,
    brows: 1.1,
    muscle: 0.75,
    bulk: 0.2,
  },
  // A grizzled veteran: weathered skin, grey buzz cut, heavy brow, broken-looking nose.
  garrick: {
    name: "Garrick",
    skin: [0.74, 0.55, 0.43],
    flush: 0.55,
    freckles: 0,
    age: 0.85,
    face: face({
      jawWidth: 0.3,
      jawSquare: 0.4,
      chin: 0.1,
      brow: 0.9,
      cheekbones: 0.5,
      cheekHollow: 0.6,
      eyeSize: -0.3,
      eyeDepth: 0.7,
      hooded: 0.6,
      noseSize: 0.5,
      noseWidth: 0.5,
      noseBridge: 0.6,
      noseTip: -0.4,
      lips: -0.5,
      earSize: 0.4,
    }),
    eyeColor: [0.42, 0.44, 0.4],
    hair: { style: "buzz", color: [0.3, 0.27, 0.24], grey: 0.75 },
    beard: 0.35,
    brows: 1.3,
    muscle: 0.6,
    bulk: 0.35,
  },
  // A young squire: dark skin, narrow jaw, full lips, clean shaven.
  tomas: {
    name: "Tomas",
    skin: [0.47, 0.31, 0.22],
    flush: 0.15,
    freckles: 0,
    age: 0.05,
    face: face({
      jawWidth: -0.4,
      jawSquare: -0.3,
      chin: -0.1,
      chinWidth: -0.3,
      brow: -0.3,
      cheekbones: 0.5,
      eyeSize: 0.35,
      eyeSpacing: 0.15,
      eyeTilt: 0.3,
      noseSize: -0.1,
      noseWidth: 0.7,
      noseBridge: -0.5,
      lips: 0.8,
      mouthWidth: 0.25,
      skullWidth: -0.1,
    }),
    eyeColor: [0.24, 0.14, 0.08],
    hair: { style: "buzz", color: [0.05, 0.04, 0.04], grey: 0 },
    beard: 0,
    brows: 1.0,
    muscle: 0.5,
    bulk: -0.25,
  },
  // A lean northerner: pale and freckled, red hair swept back, green eyes, light stubble.
  rhys: {
    name: "Rhys",
    skin: [0.9, 0.74, 0.64],
    flush: 0.7,
    freckles: 0.8,
    age: 0.2,
    face: face({
      jawWidth: -0.2,
      jawSquare: 0.2,
      chin: 0.5,
      chinWidth: -0.4,
      cheekbones: 0.7,
      cheekHollow: 0.5,
      brow: 0.1,
      eyeSize: 0.1,
      eyeTilt: -0.2,
      noseSize: 0.3,
      noseWidth: -0.5,
      noseBridge: 0.2,
      noseTip: 0.5,
      lips: -0.2,
      mouthWidth: -0.2,
      skullWidth: -0.2,
    }),
    eyeColor: [0.3, 0.5, 0.3],
    hair: { style: "swept", color: [0.5, 0.2, 0.08], grey: 0 },
    beard: 0.3,
    brows: 0.85,
    muscle: 0.55,
    bulk: -0.4,
  },
};

export const DEFAULT_CHARACTER = "aldric";

export function characterByName(name: string | null | undefined): HumanSpec {
  return (name && CHARACTERS[name.toLowerCase()]) || CHARACTERS[DEFAULT_CHARACTER];
}
