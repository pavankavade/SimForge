// The dungeon's monsters. The dungeon makes them out of mana, and when one dies the mana sets hard
// into a crystal of the monster's rarity (items.ts, AGENTS.md §15). Floor one holds two families:
// the skeletons (soldier, archer, mage, and the Skeleton Knight as mini-boss) and the slimes
// (slime, acid slime, and the Bloated Slime, which bursts into slimelets). Later floors add
// families (goblins, orcs, ...) here: a kind, its numbers, its drops.
import type { ArmorSlot } from "../../artifacts/characters/paladin";
import { RARITY, bumpRarity, crystalId, def, rarityRank, rollsRarity, type Rarity } from "../items";

export type MobFamily = "skeleton" | "slime";

export type MobKindId =
  | "skeletonSoldier"
  | "skeletonArcher"
  | "skeletonMage"
  | "skeletonKnight"
  | "slime"
  | "acidSlime"
  | "bloatedSlime"
  | "slimelet";

export type MobWeapon = "sword" | "bow" | "staff" | "none";

export interface Ranged {
  /** It backs off when closer than this (metres) and closes in when farther than `max`. */
  min: number;
  max: number;
  projectile: "arrow" | "bolt";
  /** Metres per second. */
  speed: number;
  /** Seconds drawing the bow or gathering the spell before it lets go. */
  windup: number;
}

export interface MobKind {
  id: MobKindId;
  name: string;
  family: MobFamily;
  /** Its rarity: the nameplate colour and the crystal it leaves. Elites roll one higher. */
  rarity: Rarity;
  /** A mini-boss: one guards each boss room. */
  boss?: boolean;
  hp: number;
  /** One landed blow (or arrow, or bolt) before the fighter's armour. */
  damage: number;
  armor: number;
  /** Seconds between attacks. */
  attackEvery: number;
  /** Multiplies the walking and chasing pace. */
  speed: number;
  /** It stops this far from the fighter (feet to feet, metres) and strikes. */
  reach: number;
  ranged?: Ranged;
  /** Chance to raise a shield against a cut (skeletons with one). */
  blockChance: number;
  /** Body size against a man (1). */
  scale: number;
  /** Collision and blade-target radius and height (metres, at scale 1). */
  radius: number;
  height: number;
  weapon: MobWeapon;
  /** Skeletons: the chance of each armour piece (fitted to the rig over the bones). */
  gear?: Partial<Record<ArmorSlot, number>>;
  /** Cape colour (a skeleton with a cape in its gear). */
  cape?: number;
  /** The light in its eye sockets (skeletons) or its body colour (slimes). */
  glow: number;
  /** 0..1 chance to drop its crystal at all (1 for nearly everything). */
  crystalChance: number;
}

export const KINDS: Record<MobKindId, MobKind> = {
  skeletonSoldier: {
    id: "skeletonSoldier",
    name: "Skeleton Soldier",
    family: "skeleton",
    rarity: "common",
    hp: 70,
    damage: 22,
    armor: 20,
    attackEvery: 1.8,
    speed: 0.95,
    reach: 1.55,
    blockChance: 0.3,
    scale: 1,
    radius: 0.3,
    height: 1.8,
    weapon: "sword",
    gear: { shield: 0.4, waist: 0.3, gorget: 0.15, pauldrons: 0.15 },
    glow: 0x7fd4ff,
    crystalChance: 1,
  },
  skeletonArcher: {
    id: "skeletonArcher",
    name: "Skeleton Archer",
    family: "skeleton",
    rarity: "common",
    hp: 55,
    damage: 16,
    armor: 10,
    attackEvery: 2.3,
    speed: 0.9,
    reach: 1.4,
    ranged: { min: 3.4, max: 12, projectile: "arrow", speed: 21, windup: 0.75 },
    blockChance: 0,
    scale: 1,
    radius: 0.3,
    height: 1.8,
    weapon: "bow",
    gear: { waist: 0.25 },
    glow: 0x9fe8ff,
    crystalChance: 1,
  },
  skeletonMage: {
    id: "skeletonMage",
    name: "Skeleton Mage",
    family: "skeleton",
    rarity: "rare",
    hp: 60,
    damage: 24,
    armor: 0,
    attackEvery: 2.8,
    speed: 0.85,
    reach: 1.4,
    ranged: { min: 4.2, max: 10, projectile: "bolt", speed: 8.5, windup: 0.95 },
    blockChance: 0,
    scale: 1,
    radius: 0.3,
    height: 1.8,
    weapon: "staff",
    gear: { cape: 1 },
    cape: 0x3a2350,
    glow: 0xc58bff,
    crystalChance: 1,
  },
  skeletonKnight: {
    id: "skeletonKnight",
    name: "Skeleton Knight",
    family: "skeleton",
    rarity: "epic",
    boss: true,
    hp: 340,
    damage: 34,
    armor: 90,
    attackEvery: 2.1,
    speed: 0.88,
    reach: 1.7,
    blockChance: 0.5,
    scale: 1.08,
    radius: 0.36,
    height: 1.9,
    weapon: "sword",
    gear: { cuirass: 1, pauldrons: 1, gauntlets: 1, waist: 1, greaves: 1, sabatons: 1, arms: 0.5, cape: 1, shield: 1 },
    cape: 0x5a1712,
    glow: 0xff7a4a,
    crystalChance: 1,
  },
  slime: {
    id: "slime",
    name: "Slime",
    family: "slime",
    rarity: "common",
    hp: 60,
    damage: 14,
    armor: 0,
    attackEvery: 1.6,
    speed: 0.62,
    reach: 1.05,
    blockChance: 0,
    scale: 1,
    radius: 0.42,
    height: 0.62,
    weapon: "none",
    glow: 0x5fd06a,
    crystalChance: 1,
  },
  acidSlime: {
    id: "acidSlime",
    name: "Acid Slime",
    family: "slime",
    rarity: "uncommon",
    hp: 75,
    damage: 12,
    armor: 0,
    attackEvery: 1.7,
    speed: 0.6,
    reach: 1.05,
    blockChance: 0,
    scale: 1.05,
    radius: 0.42,
    height: 0.62,
    weapon: "none",
    glow: 0xc6e83a,
    crystalChance: 1,
  },
  bloatedSlime: {
    id: "bloatedSlime",
    name: "Bloated Slime",
    family: "slime",
    rarity: "epic",
    boss: true,
    hp: 280,
    damage: 26,
    armor: 0,
    attackEvery: 2.4,
    speed: 0.48,
    reach: 1.9,
    blockChance: 0,
    scale: 2.1,
    radius: 0.42,
    height: 0.62,
    weapon: "none",
    glow: 0x3fc28a,
    crystalChance: 1,
  },
  slimelet: {
    id: "slimelet",
    name: "Slimelet",
    family: "slime",
    rarity: "common",
    hp: 20,
    damage: 7,
    armor: 0,
    attackEvery: 1.2,
    speed: 0.95,
    reach: 0.8,
    blockChance: 0,
    scale: 0.5,
    radius: 0.42,
    height: 0.62,
    weapon: "none",
    glow: 0x6fdc78,
    crystalChance: 0.35,
  },
};

/** How a room is peopled on floor one: a family per room, then kinds within it. */
export const ROOM_FAMILY: Array<[MobFamily, number]> = [
  ["skeleton", 0.6],
  ["slime", 0.4],
];
export const FAMILY_MIX: Record<MobFamily, Array<[MobKindId, number]>> = {
  skeleton: [
    ["skeletonSoldier", 0.6],
    ["skeletonArcher", 0.27],
    ["skeletonMage", 0.13],
  ],
  slime: [
    ["slime", 0.74],
    ["acidSlime", 0.26],
  ],
};
export const FAMILY_BOSS: Record<MobFamily, MobKindId> = { skeleton: "skeletonKnight", slime: "bloatedSlime" };

/** Chance an ordinary monster is an elite: one rarity higher, tougher, with a modifier or two. */
export const ELITE_CHANCE = 0.12;

export function pick<T>(rand: () => number, list: Array<[T, number]>): T {
  let t = rand() * list.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of list) {
    t -= w;
    if (t <= 0) return v;
  }
  return list[list.length - 1][0];
}

/** The nameplate colour of a rarity. */
export const rarityColor = (r: Rarity): string => RARITY[r].color;

// ---- Drops ---------------------------------------------------------------------------------

/** One drop: an item id, how many (coins), and the rarity it rolled (weapons). */
export interface Drop {
  id: string;
  qty?: number;
  rarity?: Rarity;
}

/**
 * A weapon's rarity when a monster of rarity `source` drops it: mostly its own rung or below, now
 * and then one above. Floor one never goes past legendary.
 */
export function rollWeaponRarity(rand: () => number, source: Rarity): Rarity {
  const r = rand();
  const steps = r < 0.3 ? -1 : r < 0.85 ? 0 : r < 0.97 ? 1 : 2;
  const out = bumpRarity(source, steps);
  return rarityRank(out) > rarityRank("legendary") ? "legendary" : out;
}

/**
 * Two or three things besides the crystal, drawn at random from the kind's table (each entry is a
 * weight, and some give coins). Mini-bosses always leave a piece of what they wore.
 */
const TABLES: Record<MobKindId, Array<[string, number]>> = {
  skeletonSoldier: [
    ["bone", 3],
    ["coins", 2.2],
    ["rusty_sword", 1.4],
    ["skull", 0.8],
    ["bandage", 0.6],
  ],
  skeletonArcher: [
    ["arrows", 3],
    ["bone", 2.4],
    ["coins", 1.8],
    ["bone_bow", 0.9],
    ["skull", 0.7],
  ],
  skeletonMage: [
    ["grave_dust", 2.6],
    ["spell_page", 1.6],
    ["candle", 1.8],
    ["coins", 1.6],
    ["bone_staff", 0.8],
    ["potion", 0.6],
  ],
  skeletonKnight: [
    ["signet", 2],
    ["coins", 3],
    ["skull", 1.4],
    ["sword", 1.2],
    ["shield", 1],
    ["potion", 1],
  ],
  slime: [
    ["slime_gel", 3],
    ["coins", 2],
    ["ring", 0.8],
    ["bone", 0.8],
    ["apple", 0.5],
  ],
  acidSlime: [
    ["acid_gland", 2.4],
    ["slime_gel", 2.2],
    ["coins", 1.6],
    ["ring", 0.9],
  ],
  bloatedSlime: [
    ["slime_gel", 3],
    ["coins", 3],
    ["ring", 1.6],
    ["acid_gland", 1],
    ["sword", 0.6],
    ["potion", 1],
  ],
  slimelet: [
    ["slime_gel", 3],
    ["coins", 1],
  ],
};

const PURSE: Record<Rarity, number> = { common: 8, uncommon: 18, rare: 36, epic: 90, legendary: 180, unique: 320, artifact: 600 };
const BOSS_WEARS: ArmorSlot[] = ["cuirass", "pauldrons", "gauntlets", "waist", "greaves", "sabatons"];

/** What a monster of `kind` and `rarity` leaves: its crystal (usually), then two or three things. */
export function rollDrops(rand: () => number, kind: MobKind, rarity: Rarity): Drop[] {
  const out: Drop[] = [];
  if (rand() < kind.crystalChance) {
    // Now and then the mana sets one rung purer than the monster was.
    const up = rand() < (kind.boss ? 0.15 : 0.08) ? 1 : 0;
    out.push({ id: crystalId(bumpRarity(rarity, up)) });
  }
  const n = kind.id === "slimelet" ? (rand() < 0.5 ? 1 : 0) : kind.boss ? 3 : 2 + (rand() < 0.4 ? 1 : 0);
  // Each draw is a different entry (no two purses from one skeleton).
  const table = TABLES[kind.id].slice();
  for (let i = 0; i < n && table.length; i++) {
    const id = pick(rand, table);
    table.splice(
      table.findIndex(([t]) => t === id),
      1
    );
    if (id === "coins") out.push({ id, qty: Math.max(1, Math.round(PURSE[rarity] * (0.6 + rand() * 0.8))) });
    // A few of an archer's arrows survive (the fighter can shoot them).
    else if (def(id).category === "ammo") out.push({ id, qty: 4 + Math.floor(rand() * 9) });
    else out.push({ id, rarity: rollsRarity(id) ? rollWeaponRarity(rand, rarity) : undefined });
  }
  if (kind.boss && kind.family === "skeleton") out.push({ id: BOSS_WEARS[Math.floor(rand() * BOSS_WEARS.length)] });
  return out;
}
