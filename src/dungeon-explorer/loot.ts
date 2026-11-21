// What chests and fallen monsters hold. A chest rolls coins, a few valuables, now and then a
// draught, a piece of the fighter's kit or a trophy weapon; deeper rooms and treasuries roll richer,
// and every weapon in one rolls its own rarity. A fallen monster leaves its mana crystal and two or
// three things from its kind's table (monsters/kinds.ts).
import { ARMOR_SLOTS, type ArmorSlot } from "../artifacts/characters/paladin";
import { addItem, emptyGrid, newItem, rollsRarity, type Grid, type Rarity } from "./items";
import type { MobAgent } from "./mobSim";
import { rollDrops, rollWeaponRarity } from "./monsters/kinds";
import { rollMods } from "./stats";

export const CHEST_W = 8;
export const CHEST_H = 5;
export const CORPSE_W = 8;
export const CORPSE_H = 6;

export interface Container {
  id: string;
  /** A chest, a fallen monster, or a pile the fighter dropped on the ground. */
  kind: "chest" | "corpse" | "pile";
  name: string;
  /** Where it is (world metres) for reach checks. */
  x: number;
  z: number;
  /** A sack's floor height (world metres), so a teammate's game sets it down at the same place. */
  y?: number;
  grid: Grid;
  /** Searched at least once. */
  seen: boolean;
}

const VALUABLES: Array<[string, number]> = [
  ["trencher", 5],
  ["vase", 5],
  ["goblet", 4],
  ["ewer", 3],
  ["ruby", 2],
  ["urn", 1.5],
  ["sapphire", 0.8],
  ["bust", 0.6],
];
const TROPHIES = ["saber", "mace", "warhammer", "estoc"];
const WEARABLE: ArmorSlot[] = ARMOR_SLOTS.filter((s) => s !== "sword" && s !== "shield");

function weighted<T>(rand: () => number, list: Array<[T, number]>, bias = 0): T {
  // Bias > 0 tilts toward the end of the list (the rarer things).
  const w = list.map(([, v], i) => v * (1 + (bias * i) / list.length));
  let t = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    t -= w[i];
    if (t <= 0) return list[i][0];
  }
  return list[list.length - 1][0];
}

/** Into the grid (if it fits); gear at a rarity also rolls its modifiers. */
const put = (g: Grid, id: string, qty?: number, rarity?: Rarity, rand?: () => number): Grid => {
  const it = newItem(id, qty, rarity);
  if (rand && rarity) {
    const mods = rollMods(rand, id, rarity);
    if (mods.length) it.mods = mods;
  }
  return addItem(g, it) ?? g;
};

/** A chest's weapon: its rarity from the chest's tier (deep treasuries can hold an epic or better). */
const CHEST_RARITY: Rarity[] = ["common", "uncommon", "rare", "epic"];
const putWeapon = (g: Grid, rand: () => number, id: string, tier: number): Grid =>
  put(g, id, undefined, rollsRarity(id) ? rollWeaponRarity(rand, CHEST_RARITY[Math.max(0, Math.min(3, tier))]) : undefined, rand);

/** A chest's contents; `tier` 0 (near the entrance) .. 3 (deep or a treasury). */
export function rollChest(rand: () => number, tier: number): Grid {
  let g = emptyGrid(CHEST_W, CHEST_H);
  g = put(g, "coins", Math.round((12 + rand() * 30) * (1 + tier * 0.9)));
  const valuables = 1 + Math.floor(rand() * (2 + tier));
  for (let i = 0; i < valuables; i++) g = put(g, weighted(rand, VALUABLES, tier * 1.5));
  if (rand() < 0.4) g = put(g, "potion");
  if (rand() < 0.3) g = put(g, "apple");
  if (rand() < 0.3) g = put(g, "bandage");
  if (rand() < 0.16 + tier * 0.1) g = putWeapon(g, rand, WEARABLE[Math.floor(rand() * WEARABLE.length)], tier);
  if (rand() < 0.1 + tier * 0.07) g = putWeapon(g, rand, TROPHIES[Math.floor(rand() * TROPHIES.length)], tier);
  if (rand() < 0.04 + tier * 0.04) g = putWeapon(g, rand, rand() < 0.6 ? "sword" : "shield", tier);
  return g;
}

/** What a fallen monster leaves: its crystal, then its drops (weapons at their own rarity). */
export function rollMobLoot(rand: () => number, m: MobAgent): Grid {
  let g = emptyGrid(CORPSE_W, CORPSE_H);
  for (const d of rollDrops(rand, m.kind, m.rarity)) g = put(g, d.id, d.qty, d.rarity, rand);
  return g;
}
