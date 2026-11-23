// Everything that can sit in a bag, a chest or on a corpse: armour (six slots, Dark and Darker
// style: head, chest, hands, legs, feet, cloak; plate, leather or cloth), jewellery (a necklace and
// two rings), weapons, valuables to sell, trophy weapons, mana crystals and monster parts, coins and
// things to eat or drink. Items in the world are instances (`ItemInst`: a uid and a def id), so there
// can be two breastplates; grids hold them at a cell, Dark and Darker style, each taking its real
// footprint.
//
// RARITY (AGENTS.md §15): one ladder for the whole game, common to artifact. Every item def has a
// base rarity; a weapon instance rolls its own (`ItemInst.rarity`), which scales its damage, block
// and price (`itemOf`). Monsters carry a rarity too, and drop a mana crystal of it.
import type { ArmorSlot, Finish } from "../artifacts/characters/paladin";
import type { ClassId } from "./classes";
import type { AttributeId, ModId } from "./stats";

/** The rarity ladder, lowest first. */
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "unique", "artifact"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#d9dde2" },
  uncommon: { label: "Uncommon", color: "#62d36d" },
  rare: { label: "Rare", color: "#5aa2ff" },
  epic: { label: "Epic", color: "#bd76ff" },
  legendary: { label: "Legendary", color: "#ff9f2e" },
  unique: { label: "Unique", color: "#f2d478" },
  artifact: { label: "Artifact", color: "#ff4f4f" },
};

/** 0 (common) .. 6 (artifact). */
export const rarityRank = (r: Rarity): number => RARITIES.indexOf(r);
/** `steps` rungs up (or down) the ladder, clamped at both ends. */
export const bumpRarity = (r: Rarity, steps = 1): Rarity => RARITIES[Math.max(0, Math.min(RARITIES.length - 1, rarityRank(r) + steps))];

/** A weapon's damage and block at each rarity, against its common self. */
export const RARITY_POWER: Record<Rarity, number> = { common: 1, uncommon: 1.08, rare: 1.17, epic: 1.27, legendary: 1.4, unique: 1.55, artifact: 1.75 };
/** A rolled weapon's price at each rarity, against its common self. */
export const RARITY_PRICE: Record<Rarity, number> = { common: 1, uncommon: 1.7, rare: 2.8, epic: 4.6, legendary: 8, unique: 13, artifact: 22 };

export type ItemCategory = "armor" | "jewelry" | "weapon" | "valuable" | "trophy" | "consumable" | "coins" | "crystal" | "material" | "ammo";

/**
 * Where a piece is worn or held, Dark and Darker style: six armour slots, a necklace and two rings,
 * and two weapon sets (set 1 and set 2 each have a main hand and an off hand; keys 1 and 2 take a
 * set up). One armour item shows as one or more of the rig's pieces (`ItemDef.shows`): plate
 * armour is the cuirass, pauldrons, arm harness and mail together.
 */
export type WearSlot = "head" | "chest" | "hands" | "legs" | "feet" | "cloak";
export type JewelSlot = "necklace" | "ring1" | "ring2";
export type WeaponSlot = "main1" | "off1" | "main2" | "off2";
export type GearSlot = WearSlot | JewelSlot | WeaponSlot;
export const WEAR_SLOTS: WearSlot[] = ["head", "chest", "hands", "legs", "feet", "cloak"];
export const JEWEL_SLOTS: JewelSlot[] = ["necklace", "ring1", "ring2"];
export const WEAPON_SLOTS: WeaponSlot[] = ["main1", "off1", "main2", "off2"];
/** Everything worn whatever is in hand: the armour and the jewellery (what counts for stats). */
export const WORN_SLOTS: GearSlot[] = (WEAR_SLOTS as GearSlot[]).concat(JEWEL_SLOTS);
/** What an item says it goes in: an armour slot, a necklace or ring, or a hand ("sword" main, "shield" off, "bow" both). */
export type ItemSlot = WearSlot | "necklace" | "ring" | "sword" | "shield" | "bow";
/** Slot names as the screens show them. */
export const SLOT_LABEL: Record<GearSlot, string> = {
  head: "Head",
  chest: "Chest",
  hands: "Gloves",
  legs: "Legs",
  feet: "Boots",
  cloak: "Cloak",
  necklace: "Necklace",
  ring1: "Ring",
  ring2: "Ring",
  main1: "Main hand",
  off1: "Off hand",
  main2: "Main hand",
  off2: "Off hand",
};

/** Armour weight: plate, leather or cloth, and who may wear it (cloaks are cloth: anyone). */
export type ArmorType = "plate" | "leather" | "cloth";
export const ARMOR_TYPE: Record<ArmorType, { label: string; classes: ClassId[] }> = {
  plate: { label: "Plate", classes: ["fighter", "cleric"] },
  leather: { label: "Leather", classes: ["fighter", "rogue", "ranger", "cleric"] },
  cloth: { label: "Cloth", classes: ["fighter", "rogue", "wizard", "ranger", "cleric"] },
};
/** Can a hero of class `cls` wear or hold it? (Only armour has a weight; everything else is anyone's.) */
export const wearableBy = (id: string, cls: ClassId): boolean => {
  const t = def(id).armorType;
  return !t || ARMOR_TYPE[t].classes.indexOf(cls) >= 0;
};

/** Which hand a weapon goes in: the sword in the main hand, the shield in the off hand, the bow in both. */
export function handOf(id: string): "main" | "off" | "both" | null {
  const s = def(id).slot;
  return s === "sword" ? "main" : s === "shield" ? "off" : s === "bow" ? "both" : null;
}
export const isWeaponSlot = (s: GearSlot): s is WeaponSlot => (WEAPON_SLOTS as GearSlot[]).indexOf(s) >= 0;
export const setOf = (s: WeaponSlot): 1 | 2 => (s.endsWith("1") ? 1 : 2);
/** Arrows come in stacks of this many. */
export const ARROW_STACK = 30;

export interface ItemDef {
  id: string;
  name: string;
  note: string;
  /** The slot it goes in, or what it is, as the tooltip names it. */
  kind: string;
  category: ItemCategory;
  /** Footprint in grid cells. */
  w: number;
  h: number;
  rarity: Rarity;
  /** Kilograms. */
  weight: number;
  /** What a merchant asks for it (gold); they pay two fifths. */
  value: number;
  /** Wearable: its armour or jewellery slot; for weapons the hand ("sword" main, "shield" off, "bow" both). */
  slot?: ItemSlot;
  /** Armour: plate, leather or cloth (who may wear it). */
  armorType?: ArmorType;
  /** The rig pieces it shows on him (in `finish`); none for a ring, a hood or a hat. */
  shows?: ArmorSlot[];
  armor?: number;
  magicResist?: number;
  /** Move speed, in percent (plate slows him). */
  move?: number;
  /** Takes this many points off a headshot's +50% (percent; helmets). */
  headshot?: number;
  /** Projectile damage reduction, percent (arrows and bolts). */
  projectile?: number;
  /** Attributes it gives (jewellery: at common, one more per rung of rarity). */
  attr?: Partial<Record<AttributeId, number>>;
  maxHealth?: number;
  /** Extra damage on his own headshots, percent. */
  headshotDamage?: number;
  damage?: number;
  block?: number;
  /** Hit points it gives back when used. */
  heal?: number;
  /** ...over this many seconds (a bandage), rather than at once. */
  healOver?: number;
  /** How many fit in one cell (coins). */
  stack?: number;
  /** What its rig pieces look like: plate (as built), leather or cloth on the same shapes. */
  finish?: Finish;
  /** A blunt main-hand weapon (the cleric's mace): Blunt Weapon Mastery counts. */
  blunt?: boolean;
  /** A main-hand weapon drawn as something other than the sword (mace.ts). */
  held?: "mace" | "staff" | "dagger";
  /** How much faster it swings while in hand (the dagger), added to action speed. */
  quick?: number;
  /** Magical power it adds while in hand (the wizard's staff). */
  magic?: number;
}

/** The weapons kept from the paladin's own kit (their ids are the rig's hand slots). */
const KIT_WEAPONS: ItemDef[] = [
  { id: "sword", slot: "sword", name: "Arming sword", note: "Single-handed, double-edged", kind: "Main hand", category: "weapon", w: 1, h: 4, rarity: "common", armor: 0, weight: 1.3, damage: 38, value: 0 },
  { id: "shield", slot: "shield", name: "Heater shield", note: "Oak, rawhide and the order's sun", kind: "Off hand", category: "weapon", w: 2, h: 3, rarity: "common", armor: 0, weight: 3.5, block: 70, value: 0 },
];

type ArmorRow = Omit<ItemDef, "category" | "value" | "rarity" | "kind" | "w" | "h"> & { slot: WearSlot; armorType: ArmorType };
const KIND: Record<WearSlot, { kind: string; w: number; h: number }> = {
  head: { kind: "Head", w: 2, h: 2 },
  chest: { kind: "Chest", w: 2, h: 3 },
  hands: { kind: "Gloves", w: 2, h: 2 },
  legs: { kind: "Legs", w: 2, h: 3 },
  feet: { kind: "Boots", w: 2, h: 2 },
  cloak: { kind: "Cloak", w: 2, h: 3 },
};

/**
 * The armour: for every slot a plate, a leather and a cloth piece (two of each on the head and chest).
 * Our own numbers in Dark and Darker's shape: plate is the most armour and slows him; cloth gives
 * magic resistance and nothing in the way. A full set comes to about 305 armour (plate), 181
 * (leather) or 62 (cloth). Each piece gives an attribute or two.
 */
const ARMOR_ROWS: ArmorRow[] = [
  // Head: the helmets take points off the +50% a headshot does.
  { id: "great_helm", slot: "head", armorType: "plate", shows: ["helm", "gorget"], name: "Great helm", note: "A closed steel bucket and a gorget under it; you hear your own breath", armor: 50, move: -3, headshot: 25, projectile: 2, attr: { vig: 2 }, weight: 3.3 },
  { id: "kettle_hat", slot: "head", armorType: "plate", shows: ["helm"], name: "Kettle hat", note: "Steel over the crown; arrows glance off it", armor: 40, magicResist: 5, move: -2, headshot: 18, projectile: 2, attr: { str: 2 }, weight: 2.2 },
  { id: "leather_cap", slot: "head", armorType: "leather", shows: ["helm"], finish: "leather", name: "Leather cap", note: "Boiled hide moulded over a wooden head", armor: 25, magicResist: 5, move: -1, headshot: 12, projectile: 1, attr: { agi: 2 }, weight: 0.8 },
  { id: "ranger_hood", slot: "head", armorType: "leather", name: "Ranger's hood", note: "Waxed leather, deep enough to hide a face", armor: 20, magicResist: 10, headshot: 10, projectile: 1, attr: { dex: 2 }, weight: 0.4 },
  { id: "wizard_hat", slot: "head", armorType: "cloth", name: "Wizard hat", note: "Tall, blue and pointed; the brim has seen weather", armor: 8, magicResist: 20, headshot: 5, attr: { kno: 2 }, weight: 0.3 },
  { id: "chaperon", slot: "head", armorType: "cloth", name: "Chaperon", note: "A wound hood of red wool, the tail over one shoulder", armor: 12, magicResist: 15, headshot: 6, attr: { wil: 2 }, weight: 0.4 },
  // Chest.
  { id: "plate_armour", slot: "chest", armorType: "plate", shows: ["cuirass", "pauldrons", "arms", "mail"], name: "Blackened plate armour", note: "Cuirass, pauldrons and arm harness over a mail shirt", armor: 120, move: -6, projectile: 4, attr: { str: 2 }, weight: 15 },
  { id: "templar_armour", slot: "chest", armorType: "plate", shows: ["cuirass", "mail", "tabard"], name: "Templar armour", note: "A breastplate over mail and the order's tabard", armor: 105, magicResist: 15, move: -5, projectile: 3, attr: { wil: 2 }, weight: 13 },
  { id: "brigandine", slot: "chest", armorType: "leather", shows: ["cuirass", "pauldrons", "doublet"], finish: "leather", name: "Brigandine", note: "Steel plates riveted inside a leather coat", armor: 75, magicResist: 5, move: -2, projectile: 2, attr: { vig: 2 }, weight: 6 },
  { id: "leather_jerkin", slot: "chest", armorType: "leather", shows: ["cuirass", "doublet"], finish: "leather", name: "Leather jerkin", note: "Boiled hide, moulded and laced; it turns a knife, not a mace", armor: 60, magicResist: 10, move: -1, projectile: 2, attr: { agi: 2 }, weight: 3.2 },
  { id: "gambeson", slot: "chest", armorType: "cloth", shows: ["doublet"], name: "Padded gambeson", note: "Quilted linen, twenty layers deep", armor: 35, magicResist: 15, projectile: 1, attr: { vig: 2 }, weight: 2.4 },
  { id: "wizard_robe", slot: "chest", armorType: "cloth", shows: ["doublet", "tabard"], finish: "cloth", name: "Scholar's robe", note: "Blue wool, ink on the cuffs, a lining of something that is not quite silk", armor: 15, magicResist: 35, attr: { kno: 3 }, weight: 1.8 },
  // Gloves.
  { id: "plate_gauntlets", slot: "hands", armorType: "plate", shows: ["gauntlets"], name: "Plate gauntlets", note: "Fingered steel, leather palms", armor: 30, move: -1, projectile: 1, attr: { str: 2 }, weight: 1.2 },
  { id: "leather_gloves", slot: "hands", armorType: "leather", shows: ["gauntlets"], finish: "leather", name: "Leather gloves", note: "Thin at the fingers for the string, thick at the back", armor: 18, attr: { dex: 2 }, weight: 0.3 },
  { id: "embroidered_gloves", slot: "hands", armorType: "cloth", shows: ["gauntlets"], finish: "cloth", name: "Embroidered gloves", note: "Silver thread in a pattern that almost moves", armor: 6, magicResist: 12, attr: { wil: 2 }, weight: 0.2 },
  // Legs.
  { id: "plate_legs", slot: "legs", armorType: "plate", shows: ["waist", "cuisses", "greaves"], name: "Plate legs", note: "Fauld and tassets, cuisses, poleyns and greaves", armor: 70, move: -3, projectile: 3, attr: { vig: 2 }, weight: 6.5 },
  { id: "leather_leggings", slot: "legs", armorType: "leather", shows: ["cuisses", "greaves"], finish: "leather", name: "Leather leggings", note: "Stiff hide over the thighs and shins", armor: 40, move: -1, projectile: 2, attr: { agi: 2 }, weight: 1.6 },
  { id: "padded_leggings", slot: "legs", armorType: "cloth", shows: ["cuisses", "greaves"], finish: "cloth", name: "Padded leggings", note: "Quilted wool hose", armor: 22, magicResist: 10, attr: { res: 2 }, weight: 1 },
  // Boots.
  { id: "plate_boots", slot: "feet", armorType: "plate", shows: ["sabatons"], name: "Plate sabatons", note: "Laminated steel shoes", armor: 30, move: -2, projectile: 1, attr: { vig: 1 }, weight: 1.6 },
  { id: "leather_boots", slot: "feet", armorType: "leather", shows: ["sabatons"], finish: "leather", name: "Leather boots", note: "Turned leather; quiet on stone", armor: 18, move: 2, attr: { agi: 1 }, weight: 0.6 },
  { id: "turnshoes", slot: "feet", armorType: "cloth", shows: ["sabatons"], finish: "cloth", name: "Turnshoes", note: "Felt soles stitched inside out; you can run all day", armor: 8, magicResist: 6, move: 3, attr: { res: 2 }, weight: 0.4 },
  // Cloaks (cloth: anyone).
  { id: "adventurer_cloak", slot: "cloak", armorType: "cloth", shows: ["cape"], name: "Adventurer's cloak", note: "Red wool, patched twice", armor: 5, magicResist: 5, attr: { vig: 1 }, weight: 1.4 },
  { id: "ranger_cloak", slot: "cloak", armorType: "cloth", shows: ["cape"], finish: "leather", name: "Ranger's cloak", note: "Green wool that goes grey in the dark", armor: 5, projectile: 2, attr: { agi: 2 }, weight: 1.1 },
  { id: "wizard_mantle", slot: "cloak", armorType: "cloth", shows: ["cape"], finish: "cloth", name: "Night mantle", note: "Heavy, dark and warm; it smells of candle smoke", armor: 3, magicResist: 15, attr: { wil: 2 }, weight: 1.3 },
];

type JewelRow = Omit<ItemDef, "category" | "value" | "rarity" | "kind" | "w" | "h" | "weight"> & { slot: "necklace" | "ring"; gem: string };
/**
 * The jewellery: a pendant and a ring for each attribute, three necklaces besides. At common a piece
 * gives +1 (the specials their base number); each rung of rarity adds as much again (`itemOf`).
 */
const JEWEL_ROWS: JewelRow[] = [
  { id: "bear_pendant", slot: "necklace", gem: "#c8553d", name: "Bear pendant", note: "A bear's claw in a silver cap", attr: { str: 1 } },
  { id: "ox_pendant", slot: "necklace", gem: "#b88a4a", name: "Ox pendant", note: "A horn carved into an ox's head", attr: { vig: 1 } },
  { id: "fox_pendant", slot: "necklace", gem: "#e07b2a", name: "Fox pendant", note: "Red enamel, a fox mid-leap", attr: { agi: 1 } },
  { id: "monkey_pendant", slot: "necklace", gem: "#8f6a3a", name: "Monkey pendant", note: "A brass monkey, all fingers", attr: { dex: 1 } },
  { id: "badger_pendant", slot: "necklace", gem: "#cfd3d8", name: "Badger pendant", note: "Black and white stone; stubborn as its namesake", attr: { wil: 1 } },
  { id: "owl_pendant", slot: "necklace", gem: "#7a8fd0", name: "Owl pendant", note: "Two moonstones for eyes", attr: { kno: 1 } },
  { id: "rat_pendant", slot: "necklace", gem: "#8c8c7a", name: "Rat pendant", note: "A lead rat with a ruby in its teeth", attr: { res: 1 } },
  { id: "amulet_health", slot: "necklace", gem: "#d8344a", name: "Amulet of health", note: "Warm, and it beats a little", maxHealth: 5 },
  { id: "wolftooth_necklace", slot: "necklace", gem: "#e8e2cf", name: "Wolf-tooth necklace", note: "Teeth on a thong; they find the gap in a helm", headshotDamage: 5 },
  { id: "frost_amulet", slot: "necklace", gem: "#8fe0ff", name: "Frost amulet", note: "Cold to the touch even by a fire", magicResist: 10 },
  { id: "ring_courage", slot: "ring", gem: "#c8553d", name: "Ring of courage", note: "Iron, with a lion stamped in it", attr: { str: 1 } },
  { id: "ring_vitality", slot: "ring", gem: "#5bb35b", name: "Ring of vitality", note: "Green jade, a little warm", attr: { vig: 1 } },
  { id: "ring_quickness", slot: "ring", gem: "#e0c040", name: "Ring of quickness", note: "A thin gold band that never sits still", attr: { agi: 1 } },
  { id: "ring_finesse", slot: "ring", gem: "#d07ad0", name: "Ring of finesse", note: "Two twisted wires, silver and copper", attr: { dex: 1 } },
  { id: "ring_resolve", slot: "ring", gem: "#e8e8f0", name: "Ring of resolve", note: "A pearl in a plain setting", attr: { wil: 1 } },
  { id: "ring_wisdom", slot: "ring", gem: "#5a8cff", name: "Ring of wisdom", note: "A sapphire cut with an eye", attr: { kno: 1 } },
  { id: "ring_survival", slot: "ring", gem: "#8a6a4a", name: "Ring of survival", note: "Bone, carved by someone with time on their hands", attr: { res: 1 } },
];
/** Each piece's stone colour (its drawn icon). */
export const JEWEL_GEM: Record<string, { slot: "necklace" | "ring"; gem: string }> = {};

const BASE: Record<Rarity, number> = { common: 40, uncommon: 90, rare: 170, epic: 320, legendary: 600, unique: 1000, artifact: 1800 };
const priceFor = (a: { rarity: Rarity; armor?: number; damage?: number; block?: number; magicResist?: number }) =>
  Math.round((BASE[a.rarity] + (a.armor ?? 0) * 3 + (a.magicResist ?? 0) * 3 + (a.damage ?? 0) * 4 + (a.block ?? 0) * 2) / 5) * 5;

const OTHER: ItemDef[] = [
  { id: "coins", name: "Gold coins", note: "Struck with a king nobody remembers", kind: "Coins", category: "coins", w: 1, h: 1, rarity: "common", weight: 0.01, value: 1, stack: 999 },
  { id: "potion", name: "Healing draught", note: "Bitter, red, and it works", kind: "Drink", category: "consumable", w: 1, h: 1, rarity: "uncommon", weight: 0.3, value: 30, heal: 40 },
  { id: "bandage", name: "Linen bandage", note: "Boiled linen; slow, but it stops the bleeding", kind: "Bandage", category: "consumable", w: 1, h: 1, rarity: "common", weight: 0.1, value: 14, heal: 35, healOver: 6 },
  { id: "apple", name: "Apple", note: "A little wrinkled", kind: "Food", category: "consumable", w: 1, h: 1, rarity: "common", weight: 0.2, value: 2, heal: 8 },
  { id: "ruby", name: "Ruby", note: "Cut and polished, the size of a thumbnail", kind: "Gem", category: "valuable", w: 1, h: 1, rarity: "rare", weight: 0.02, value: 90 },
  { id: "sapphire", name: "Star sapphire", note: "A pale star moves in it", kind: "Gem", category: "valuable", w: 1, h: 1, rarity: "epic", weight: 0.02, value: 170 },
  { id: "goblet", name: "Brass goblet", note: "A pair, dented from a feast", kind: "Valuable", category: "valuable", w: 1, h: 2, rarity: "uncommon", weight: 0.6, value: 45 },
  { id: "ewer", name: "Brass ewer", note: "Tall and engraved", kind: "Valuable", category: "valuable", w: 1, h: 2, rarity: "uncommon", weight: 1.2, value: 55 },
  { id: "vase", name: "Glazed vase", note: "White glaze, one hairline crack", kind: "Valuable", category: "valuable", w: 1, h: 2, rarity: "common", weight: 1, value: 25 },
  { id: "urn", name: "Painted urn", note: "Blue birds on porcelain from far away", kind: "Valuable", category: "valuable", w: 2, h: 2, rarity: "rare", weight: 2.4, value: 95 },
  { id: "bust", name: "Marble bust", note: "Some emperor. Heavy.", kind: "Valuable", category: "valuable", w: 2, h: 2, rarity: "epic", weight: 9, value: 220 },
  { id: "trencher", name: "Carved trencher", note: "A wooden plate with a knotwork rim", kind: "Valuable", category: "valuable", w: 2, h: 1, rarity: "common", weight: 0.5, value: 12 },
  { id: "estoc", name: "Antique estoc", note: "A thrusting blade, too long for your hand", kind: "Trophy", category: "trophy", w: 1, h: 4, rarity: "rare", weight: 1.8, value: 120 },
  { id: "mace", name: "Ornate mace", note: "Flanged, with a wire-bound grip", kind: "Trophy", category: "trophy", w: 1, h: 3, rarity: "rare", weight: 1.6, value: 110 },
  { id: "warhammer", name: "Engraved war hammer", note: "A parade piece, but it would still hurt", kind: "Trophy", category: "trophy", w: 1, h: 3, rarity: "rare", weight: 1.7, value: 100 },
  { id: "saber", name: "Old saber", note: "Curved, and nicked along the edge", kind: "Trophy", category: "trophy", w: 1, h: 3, rarity: "uncommon", weight: 1.1, value: 70 },
  // Weapons the dead carried (skeletons). Too poor to fight with; a smith pays for the steel.
  { id: "rusty_sword", name: "Rusted sword", note: "Pitted to the core. It held together for a dead man.", kind: "Trophy", category: "trophy", w: 1, h: 4, rarity: "common", weight: 1.2, value: 18 },
  { id: "bone_bow", name: "Bone-limbed bow", note: "Horn and bone, strung with something dried", kind: "Trophy", category: "trophy", w: 1, h: 4, rarity: "uncommon", weight: 0.9, value: 42 },
  { id: "bone_staff", name: "Bone staff", note: "A thighbone on a blackthorn shaft; it hums near crystal", kind: "Trophy", category: "trophy", w: 1, h: 4, rarity: "rare", weight: 1.4, value: 75 },
  // What monsters leave besides their crystal.
  { id: "bone", name: "Bone fragments", note: "Grey, dry, and still faintly warm with mana", kind: "Monster part", category: "material", w: 1, h: 1, rarity: "common", weight: 0.3, value: 4 },
  { id: "skull", name: "Hollow skull", note: "The light in the sockets went out when it fell", kind: "Monster part", category: "material", w: 1, h: 1, rarity: "uncommon", weight: 0.6, value: 14 },
  { id: "grave_dust", name: "Grave dust", note: "Ash of bone that held a spell too long", kind: "Monster part", category: "material", w: 1, h: 1, rarity: "uncommon", weight: 0.1, value: 18 },
  { id: "spell_page", name: "Scorched spell page", note: "Half a cantrip in a hand nobody reads now", kind: "Valuable", category: "valuable", w: 1, h: 1, rarity: "rare", weight: 0.05, value: 46 },
  { id: "candle", name: "Black candle", note: "Tallow and soot, burnt to the knuckle", kind: "Valuable", category: "valuable", w: 1, h: 1, rarity: "common", weight: 0.2, value: 7 },
  // The fighter's ranged kit: a recurve bow (the bow slot, key 2) and arrows, a stack to a cell pair.
  { id: "flanged_mace", name: "Flanged mace", note: "Seven steel flanges on an ash haft; it breaks bone through mail", kind: "Main hand", category: "weapon", slot: "sword", w: 1, h: 3, rarity: "common", weight: 1.5, value: 150, damage: 36, blunt: true, held: "mace" },
  { id: "oak_staff", name: "Oak staff", note: "Knotted oak shod in iron, a blue crystal in its crown; it hums when you think of fire", kind: "Main hand", category: "weapon", slot: "sword", w: 1, h: 4, rarity: "common", weight: 1.8, value: 170, damage: 24, blunt: true, held: "staff", magic: 6 },
  { id: "rondel_dagger", name: "Rondel dagger", note: "A square spike of a blade between two steel discs; made for the gaps in armour", kind: "Main hand", category: "weapon", slot: "sword", w: 1, h: 2, rarity: "common", weight: 0.5, value: 130, damage: 24, held: "dagger", quick: 0.35 },
  { id: "short_bow", name: "Short bow", note: "Ash, quick in the hand; ten arrows to a load", kind: "Bow", category: "weapon", slot: "bow", w: 1, h: 3, rarity: "common", weight: 0.7, value: 110, damage: 26 },
  { id: "long_bow", name: "Longbow", note: "A yew stave as tall as a man; slow to draw, it punches through mail. Five to a load", kind: "Bow", category: "weapon", slot: "bow", w: 1, h: 4, rarity: "common", weight: 1.4, value: 240, damage: 46 },
  { id: "recurve_bow", name: "Recurve bow", note: "Ash and horn, the tips bent forward; a strong draw", kind: "Ranged", category: "weapon", slot: "bow", w: 1, h: 4, rarity: "common", weight: 1.1, value: 160, damage: 34 },
  { id: "arrows", name: "Arrows", note: "Bodkin heads, grey goose fletching. Thirty to a bundle.", kind: "Ammunition", category: "ammo", w: 1, h: 2, rarity: "common", weight: 0.03, value: 2, stack: ARROW_STACK },
  { id: "signet", name: "Signet ring", note: "A knight's seal; the house died with him", kind: "Valuable", category: "valuable", w: 1, h: 1, rarity: "rare", weight: 0.02, value: 85 },
  { id: "slime_gel", name: "Slime gel", note: "Cold, clear, and it will not stop wobbling", kind: "Monster part", category: "material", w: 1, h: 1, rarity: "common", weight: 0.4, value: 6 },
  { id: "acid_gland", name: "Acid gland", note: "Keep it away from your steel", kind: "Monster part", category: "material", w: 1, h: 1, rarity: "uncommon", weight: 0.3, value: 26 },
  { id: "ring", name: "Tarnished ring", note: "Someone lost a finger to a slime once", kind: "Valuable", category: "valuable", w: 1, h: 1, rarity: "uncommon", weight: 0.02, value: 32 },
];

/**
 * Mana crystals: the dungeon makes its monsters out of mana, and this is what is left of one when it
 * dies, set hard. One per rarity; the stronger the monster, the rarer its crystal.
 */
const CRYSTAL_VALUE: Record<Rarity, number> = { common: 12, uncommon: 30, rare: 75, epic: 180, legendary: 420, unique: 900, artifact: 2000 };
const CRYSTAL_NOTE: Record<Rarity, string> = {
  common: "Cloudy mana, set hard. The dungeon's small change.",
  uncommon: "A clear green heart; it was a stronger thing.",
  rare: "Blue and humming. Mages pay well for these.",
  epic: "Violet light moves inside it, slow as breathing.",
  legendary: "Warm in the hand. Something old was made of this.",
  unique: "Pale gold. There should not be another like it.",
  artifact: "It beats like a heart. The dungeon wants it back.",
};
export const crystalId = (r: Rarity): string => `crystal_${r}`;
for (const r of RARITIES) {
  OTHER.push({
    id: crystalId(r),
    name: `${RARITY[r].label} mana crystal`,
    note: CRYSTAL_NOTE[r],
    kind: "Mana crystal",
    category: "crystal",
    w: 1,
    h: rarityRank(r) >= 4 ? 2 : 1,
    rarity: r,
    weight: 0.1 + rarityRank(r) * 0.05,
    value: CRYSTAL_VALUE[r],
  });
}

export const ITEM_DEFS: Record<string, ItemDef> = {};
for (const w of KIT_WEAPONS) ITEM_DEFS[w.id] = { ...w, value: priceFor(w) };
for (const a of ARMOR_ROWS) {
  const k = KIND[a.slot];
  const d: ItemDef = { ...a, kind: k.kind, w: k.w, h: k.h, category: "armor", rarity: "common", value: 0 };
  ITEM_DEFS[a.id] = { ...d, value: priceFor(d) };
}
for (const j of JEWEL_ROWS) {
  const { gem, ...rest } = j;
  JEWEL_GEM[j.id] = { slot: j.slot, gem };
  ITEM_DEFS[j.id] = { ...rest, kind: j.slot === "ring" ? "Ring" : "Necklace", category: "jewelry", w: 1, h: 1, rarity: "common", weight: 0.05, value: 60 };
}
for (const o of OTHER) ITEM_DEFS[o.id] = o;

/** Every armour item, every jewellery item (loot and the merchants pick from these). */
export const ARMOR_IDS: string[] = ARMOR_ROWS.map((a) => a.id);
export const JEWEL_IDS: string[] = JEWEL_ROWS.map((j) => j.id);
/** The armour items of one weight. */
export const armorOfType = (t: ArmorType): string[] => ARMOR_ROWS.filter((a) => a.armorType === t).map((a) => a.id);

export const def = (id: string): ItemDef => ITEM_DEFS[id] ?? ITEM_DEFS.coins;

/**
 * Pieces from before the six slots, and what each one is now. Old pieces with no new match (the
 * gorget, pauldrons, mail and the rest, now part of a whole armour) are sold back: `null`, and
 * `OLD_VALUE` is what the armourer pays for one.
 */
const OLD_IDS: Record<string, string | null> = {
  helm: "great_helm",
  cuirass: "plate_armour",
  gauntlets: "plate_gauntlets",
  cuisses: "plate_legs",
  sabatons: "plate_boots",
  cape: "adventurer_cloak",
  doublet: "gambeson",
  gorget: null,
  pauldrons: null,
  arms: null,
  waist: null,
  greaves: null,
  mail: null,
  tabard: null,
  leather_bracers: null,
  wizard_surcoat: null,
  shadow_jerkin: "leather_jerkin",
  shadow_gloves: "leather_gloves",
  shadow_boots: "leather_boots",
  shadow_cloak: "ranger_cloak",
};
export const OLD_VALUE = 60;
/** An item from an older save as it is now: the same piece under its new id, or null (sold back). */
export function migrateItem(it: ItemInst): ItemInst | null {
  if (!(it.id in OLD_IDS)) return it;
  const now = OLD_IDS[it.id];
  return now ? { ...it, id: now } : null;
}
/** A grid from an older save: old pieces renamed (they keep their place if they still fit), the rest dropped; `gold` is what they fetched. */
export function migrateGrid(g: Grid): { grid: Grid; gold: number } {
  if (!g.items.some((p) => p.item.id in OLD_IDS)) return { grid: g, gold: 0 };
  let gold = 0;
  let out: Grid = { ...g, items: g.items.filter((p) => !(p.item.id in OLD_IDS)) };
  for (const p of g.items) {
    if (!(p.item.id in OLD_IDS)) continue;
    const now = migrateItem(p.item);
    if (!now) {
      gold += OLD_VALUE;
      continue;
    }
    if (fitsAt(out, now.id, p.x, p.y)) out = placeItem(out, now, p.x, p.y);
    else {
      const next = addItem(out, now);
      if (next) out = next;
      else gold += OLD_VALUE;
    }
  }
  return { grid: out, gold };
}

// ---- Instances and grids ------------------------------------------------------------------------

export interface ItemInst {
  uid: string;
  id: string;
  /** Coins only. */
  qty?: number;
  /** A weapon's or armour piece's own rarity (it rolled one), instead of its def's. */
  rarity?: Rarity;
  /** A bow: the arrows loaded in it now (shots before a reload with R; bows.ts gives how many it holds). */
  loaded?: number;
  /** Stat modifiers it rolled with its rarity (stats.ts): [modifier, amount]. */
  mods?: Array<[ModId, number]>;
}

/** Weapons, armour and jewellery roll their own rarity when they drop (and gear rolls modifiers with it). */
export const rollsRarity = (id: string): boolean => {
  const c = def(id).category;
  return c === "weapon" || c === "trophy" || c === "armor" || c === "jewelry";
};

/**
 * The def as this instance is: its own rarity, with damage, block and price scaled to it. Use it
 * wherever an instance is at hand (tooltips, prices, the fighter's damage); `def` is the base.
 */
export function itemOf(it: ItemInst): ItemDef {
  const d = def(it.id);
  if (!it.rarity || it.rarity === d.rarity) return d;
  const k = RARITY_POWER[it.rarity] / RARITY_POWER[d.rarity];
  const p = RARITY_PRICE[it.rarity] / RARITY_PRICE[d.rarity];
  // Jewellery: its one number again for every rung above its base.
  const steps = d.category === "jewelry" ? rarityRank(it.rarity) - rarityRank(d.rarity) + 1 : 1;
  let attr = d.attr;
  if (attr && steps !== 1) {
    const a: Partial<Record<AttributeId, number>> = {};
    for (const key of Object.keys(attr) as AttributeId[]) a[key] = (attr[key] ?? 0) * steps;
    attr = a;
  }
  return {
    ...d,
    rarity: it.rarity,
    attr,
    damage: d.damage !== undefined ? Math.round(d.damage * k) : undefined,
    armor: d.armor ? Math.round(d.armor * k) : d.armor,
    magicResist: d.magicResist ? Math.round(d.magicResist * (d.category === "jewelry" ? steps : k)) : d.magicResist,
    maxHealth: d.maxHealth ? d.maxHealth * steps : d.maxHealth,
    headshotDamage: d.headshotDamage ? d.headshotDamage * steps : d.headshotDamage,
    block: d.block !== undefined ? Math.min(95, Math.round(d.block * k)) : undefined,
    value: Math.max(1, Math.round((d.value * p) / 5) * 5),
  };
}

export interface Placed {
  item: ItemInst;
  x: number;
  y: number;
}

export interface Grid {
  w: number;
  h: number;
  items: Placed[];
}

// Unique across visits: the session's start time, then a counter.
const SESSION = Date.now().toString(36);
let uidSerial = 0;
export function newItem(id: string, qty?: number, rarity?: Rarity): ItemInst {
  uidSerial++;
  const it: ItemInst = { uid: `${SESSION}-${uidSerial.toString(36)}`, id, qty };
  if (rarity && rarity !== def(id).rarity) it.rarity = rarity;
  return it;
}

export const emptyGrid = (w: number, h: number): Grid => ({ w, h, items: [] });

/** Can `item` sit with its top-left at (x, y)? `ignore` is a uid that may be in the way (it is moving). */
export function fitsAt(g: Grid, id: string, x: number, y: number, ignore?: string): boolean {
  const d = def(id);
  if (x < 0 || y < 0 || x + d.w > g.w || y + d.h > g.h) return false;
  for (const p of g.items) {
    if (p.item.uid === ignore) continue;
    const q = def(p.item.id);
    if (x < p.x + q.w && x + d.w > p.x && y < p.y + q.h && y + d.h > p.y) return false;
  }
  return true;
}

export function firstFit(g: Grid, id: string, ignore?: string): { x: number; y: number } | null {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (fitsAt(g, id, x, y, ignore)) return { x, y };
  return null;
}

/**
 * A copy of the grid with the item placed at the first free spot, or null if it doesn't fit.
 * Ammunition tops up the stacks already there first (up to `stack` each), then takes a new spot.
 */
export function addItem(g: Grid, item: ItemInst): Grid | null {
  const d = def(item.id);
  if (d.category === "ammo" && d.stack) {
    let left = item.qty ?? 1;
    const items = g.items.map((p) => {
      if (left <= 0 || p.item.id !== item.id || (p.item.qty ?? 1) >= (d.stack ?? 1)) return p;
      const take = Math.min(left, (d.stack ?? 1) - (p.item.qty ?? 1));
      left -= take;
      return { ...p, item: { ...p.item, qty: (p.item.qty ?? 1) + take } };
    });
    // The rest in new stacks of at most `stack` each (the first keeps the item's uid).
    let out: Grid = { ...g, items };
    let first = true;
    while (left > 0) {
      const n = Math.min(left, d.stack);
      const p = firstFit(out, item.id);
      if (!p) return null;
      const it = first ? { ...item, qty: n } : newItem(item.id, n);
      out = { ...out, items: out.items.concat([{ item: it, x: p.x, y: p.y }]) };
      left -= n;
      first = false;
    }
    return out;
  }
  const p = firstFit(g, item.id);
  return p ? { ...g, items: g.items.concat([{ item, x: p.x, y: p.y }]) } : null;
}

/** Arrows in a grid (every stack). */
export const arrowsIn = (g: Grid): number => g.items.reduce((a, p) => a + (p.item.id === "arrows" ? (p.item.qty ?? 1) : 0), 0);

export const removeItem = (g: Grid, uid: string): Grid => ({ ...g, items: g.items.filter((p) => p.item.uid !== uid) });

export const placeItem = (g: Grid, item: ItemInst, x: number, y: number): Grid => ({
  ...g,
  items: g.items.filter((p) => p.item.uid !== item.uid).concat([{ item, x, y }]),
});

/** Tidy: tallest and biggest first, so what fits always fits. */
export function sortGrid(g: Grid): Grid {
  const order = g.items
    .map((p) => p.item)
    .sort((a, b) => def(b.id).h - def(a.id).h || def(b.id).w * def(b.id).h - def(a.id).w * def(a.id).h);
  let out: Grid = emptyGrid(g.w, g.h);
  for (const it of order) out = addItem(out, it) ?? out;
  return out;
}

export const gridWeight = (g: Grid) =>
  g.items.reduce((a, p) => a + def(p.item.id).weight * (p.item.qty ? (def(p.item.id).category === "ammo" ? p.item.qty : p.item.qty / 100) : 1), 0);
