// The classes a player can pick at the start. The fighter (the realistic human in plate with sword
// and shield) and the ranger (the same human in cloth and mail with a bow) are playable; the others
// are planned and shown as coming soon. Each has base attributes summing to 105 (an average of 15;
// stats.ts): gear adds the rest. A class also says what it may wear and hold (`gear`), what it
// starts with (`starter`), and its passives (`perks`).
import type { ArmorSlot } from "../artifacts/characters/paladin";
import type { Attributes } from "./stats";

export type ClassId = "fighter" | "rogue" | "wizard" | "ranger" | "cleric";

export interface HeroClass {
  id: ClassId;
  name: string;
  /** One line under the name. */
  tagline: string;
  blurb: string;
  /** What he starts with. */
  kit: string[];
  /** A few plain facts for the card. */
  traits: Array<[string, string]>;
  /** Playable now (the others are planned). */
  available: boolean;
  /** Accent colour (CSS). */
  color: string;
  /** Base attributes (before gear). */
  attributes: Attributes;
  /** What it may wear (armour slots; omitted: all) and hold (hands; omitted: all). */
  gear?: { armor?: ArmorSlot[]; hands?: Array<"main" | "off" | "both"> };
  /** What a new character of this class starts in: worn pieces, weapon sets, belt and bag. */
  starter: {
    wear: ArmorSlot[];
    main1?: string;
    off1?: string;
    main2?: string;
    off2?: string;
    belt: string[];
    /** Item id and count (arrows count singly). */
    bag: Array<[string, number]>;
  };
  /** Passives: extra bow damage (a share), and the chance a loosed arrow is not used up. */
  perks?: { bowDamage?: number; arrowSave?: number };
}

export const CLASSES: HeroClass[] = [
  {
    id: "fighter",
    attributes: { str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15 },
    name: "Fighter",
    tagline: "Steel, plate and a steady shield arm",
    blurb: "A sell-sword who holds the line. Takes a beating in heavy armour, blocks with the shield and cuts back with the sword in chained swings.",
    kit: ["Arming sword", "Heater shield", "Arming doublet", "Healing draught and a bandage on the belt"],
    traits: [
      ["Health", "100"],
      ["Armour", "Heavy plate and mail"],
      ["Weapons", "Sword and shield"],
      ["Strength", "Blocking, combos"],
    ],
    available: true,
    color: "#e0b25a",
    starter: { wear: ["doublet"], main1: "sword", off1: "shield", belt: ["potion", "bandage"], bag: [["apple", 1], ["bandage", 1]] },
  },
  {
    id: "rogue",
    attributes: { str: 9, vig: 10, agi: 21, dex: 23, wil: 10, kno: 10, res: 22 },
    starter: { wear: ["doublet"], belt: [], bag: [] },
    name: "Rogue",
    tagline: "Quick hands, quicker knives",
    blurb: "Moves quietly, picks locks and strikes from behind with twin daggers. Light armour, so every hit taken counts.",
    kit: ["Twin daggers", "Leather jerkin", "Lockpicks"],
    traits: [
      ["Armour", "Light leather"],
      ["Weapons", "Daggers"],
    ],
    available: false,
    color: "#7fc29b",
  },
  {
    id: "wizard",
    attributes: { str: 6, vig: 8, agi: 15, dex: 17, wil: 20, kno: 25, res: 14 },
    starter: { wear: ["doublet"], belt: [], bag: [] },
    name: "Wizard",
    tagline: "Fire, frost and forbidden words",
    blurb: "Casts from a distance with a staff and a book of spells. Fragile up close, devastating if the line holds.",
    kit: ["Oak staff", "Spellbook", "Robes"],
    traits: [
      ["Armour", "Cloth"],
      ["Weapons", "Staff and spells"],
    ],
    available: false,
    color: "#8fa8ff",
  },
  {
    id: "ranger",
    attributes: { str: 12, vig: 11, agi: 19, dex: 21, wil: 10, kno: 12, res: 20 },
    name: "Ranger",
    tagline: "The arrow you never see",
    blurb: "Fights from range with a yew bow and keeps a sword for what gets close. Travels light in cloth and mail: no plate, no shield, but quick on the feet and quicker on the string.",
    kit: ["Yew hunting bow", "Sixty arrows", "Arming sword (second set)", "Doublet, mail and a cape"],
    traits: [
      ["Health", "93"],
      ["Armour", "Cloth and mail (no plate)"],
      ["Weapons", "Bow and sword (no shield)"],
      ["Strength", "Bow damage +25%, 1 arrow in 3 kept"],
    ],
    available: true,
    color: "#c9a06a",
    gear: { armor: ["doublet", "mail", "cape", "tabard"], hands: ["main", "both"] },
    starter: {
      wear: ["doublet", "mail", "cape"],
      main1: "hunting_bow",
      main2: "sword",
      belt: ["potion", "bandage"],
      bag: [["arrows", 60], ["apple", 1]],
    },
    perks: { bowDamage: 0.25, arrowSave: 1 / 3 },
  },
  {
    id: "cleric",
    attributes: { str: 13, vig: 14, agi: 12, dex: 12, wil: 23, kno: 19, res: 12 },
    starter: { wear: ["doublet"], belt: [], bag: [] },
    name: "Cleric",
    tagline: "Mace in one hand, faith in the other",
    blurb: "Mends wounds with prayer and breaks bones with a mace. Keeps a party standing longer than anyone.",
    kit: ["Flanged mace", "Holy symbol", "Mail shirt"],
    traits: [
      ["Armour", "Mail"],
      ["Weapons", "Mace and prayers"],
    ],
    available: false,
    color: "#f0e3a8",
  },
];

export const classById = (id: ClassId | undefined): HeroClass => CLASSES.find((c) => c.id === id) ?? CLASSES[0];

/** May this class wear or hold the piece with this armour slot or hand? */
export function classAllows(c: HeroClass, slot: ArmorSlot | null, hand: "main" | "off" | "both" | null): boolean {
  if (hand) return !c.gear?.hands || c.gear.hands.indexOf(hand) >= 0;
  if (slot) return !c.gear?.armor || c.gear.armor.indexOf(slot) >= 0;
  return true;
}
