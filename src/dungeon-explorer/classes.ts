// The classes a player can pick at the start: the fighter, the rogue, the wizard, the ranger and the
// cleric, all playable (the realistic human, dressed and armed for the class). Each has
// base attributes summing to 105 (an average of 15; stats.ts): gear adds the rest.
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
}

export const CLASSES: HeroClass[] = [
  {
    id: "fighter",
    attributes: { str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15 },
    name: "Fighter",
    tagline: "Steel, plate and a steady shield arm",
    blurb: "A sell-sword who holds the line. Takes a beating in heavy armour, blocks with the shield and cuts back with the sword in chained swings.",
    kit: ["Arming sword", "Heater shield", "Padded gambeson", "Healing draught and a bandage on the belt"],
    traits: [
      ["Health", "100"],
      ["Armour", "Plate, leather, cloth"],
      ["Weapons", "Sword and shield"],
      ["Strength", "Blocking, combos"],
    ],
    available: true,
    color: "#e0b25a",
  },
  {
    id: "rogue",
    attributes: { str: 9, vig: 10, agi: 21, dex: 23, wil: 10, kno: 10, res: 22 },
    name: "Rogue",
    tagline: "Quick hands, quicker knives",
    blurb: "Strikes fast with a rondel dagger, hides in plain sight and opens the fight from behind. Light leathers, so every hit taken counts.",
    kit: ["Rondel dagger (set 1; swings 35% faster)", "Leather cap, jerkin, gloves, leggings and boots", "Adventurer's cloak", "Two healing draughts"],
    traits: [
      ["Health", "~90"],
      ["Armour", "Leather, cloth"],
      ["Weapons", "Dagger"],
      ["Strength", "Hiding, backstabs, poison"],
    ],
    available: true,
    color: "#7fc29b",
  },
  {
    id: "wizard",
    attributes: { str: 6, vig: 8, agi: 15, dex: 17, wil: 20, kno: 25, res: 14 },
    name: "Wizard",
    tagline: "Fire, frost and forbidden words",
    blurb: "Fights from a distance with bolts, ice, lightning and fire. Knowledge gives him the most memory of anyone, so he carries the most spells; he meditates to get their charges back. Fragile up close.",
    kit: ["Oak staff (set 1; adds magical power)", "Wizard hat, scholar's robe and night mantle", "Turnshoes", "Two healing draughts", "Spells: Zap, Magic Missile, Ice Bolt, Fireball, Haste"],
    traits: [
      ["Health", "~82"],
      ["Armour", "Cloth"],
      ["Weapons", "Staff and spells"],
      ["Strength", "Damage from range"],
    ],
    available: true,
    color: "#8fa8ff",
  },
  {
    id: "ranger",
    attributes: { str: 12, vig: 11, agi: 19, dex: 21, wil: 10, kno: 12, res: 20 },
    name: "Ranger",
    tagline: "The arrow you never see",
    blurb: "Fights from range: quick hands draw and reload faster, and a light step keeps the distance. Shoots short bows, recurves and longbows; a sword for when they close in.",
    kit: ["Short bow (set 1, loaded)", "Sixty arrows", "Ranger's hood, leather jerkin, gloves, leggings and boots", "Ranger's cloak", "Sword and shield move to set 2"],
    traits: [
      ["Health", "93"],
      ["Armour", "Leather, cloth"],
      ["Weapons", "Bows, sword"],
      ["Strength", "Draw and reload speed"],
    ],
    available: true,
    color: "#c9a06a",
  },
  {
    id: "cleric",
    attributes: { str: 13, vig: 14, agi: 12, dex: 12, wil: 23, kno: 19, res: 12 },
    name: "Cleric",
    tagline: "Mace in one hand, faith in the other",
    blurb: "Mends wounds with prayer and breaks bones with a mace. Memorises holy spells (Knowledge sets how many), casts them from charges, and sits down to pray them back. Hard on the undead.",
    kit: ["Flanged mace and heater shield (set 1)", "Templar armour: breastplate, mail and the order's tabard", "A chaperon", "Two healing draughts", "Spells: Lesser Heal, Bless, Protection, Holy Light, Sanctuary"],
    traits: [
      ["Health", "~99"],
      ["Armour", "Plate, leather, cloth"],
      ["Weapons", "Mace and shield"],
      ["Strength", "Healing, wards, holy light"],
    ],
    available: true,
    color: "#f0e3a8",
  },
];

export const classById = (id: ClassId | undefined): HeroClass => CLASSES.find((c) => c.id === id) ?? CLASSES[0];
