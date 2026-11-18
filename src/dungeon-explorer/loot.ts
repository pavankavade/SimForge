// What chests and fallen men hold. A chest rolls coins, a few valuables, now and then a draught, a
// piece of the paladin's kit or a trophy weapon; deeper rooms and treasuries roll richer. A fallen
// man leaves some of what he wore (pieces the paladin can wear too), his purse, and sometimes a
// draught or a trinket.
import { ARMOR_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";
import { addItem, emptyGrid, newItem, type Grid, type Rarity } from "./items";

export const CHEST_W = 8;
export const CHEST_H = 5;
export const CORPSE_W = 8;
export const CORPSE_H = 6;

export interface Container {
  id: string;
  kind: "chest" | "corpse";
  name: string;
  /** Where it is (world metres) for reach checks. */
  x: number;
  z: number;
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

const put = (g: Grid, id: string, qty?: number): Grid => addItem(g, newItem(id, qty)) ?? g;

/** A chest's contents; `tier` 0 (near the entrance) .. 3 (deep or a treasury). */
export function rollChest(rand: () => number, tier: number): Grid {
  let g = emptyGrid(CHEST_W, CHEST_H);
  g = put(g, "coins", Math.round((12 + rand() * 30) * (1 + tier * 0.9)));
  const valuables = 1 + Math.floor(rand() * (2 + tier));
  for (let i = 0; i < valuables; i++) g = put(g, weighted(rand, VALUABLES, tier * 1.5));
  if (rand() < 0.4) g = put(g, "potion");
  if (rand() < 0.3) g = put(g, "apple");
  if (rand() < 0.3) g = put(g, "bandage");
  if (rand() < 0.16 + tier * 0.1) g = put(g, WEARABLE[Math.floor(rand() * WEARABLE.length)]);
  if (rand() < 0.1 + tier * 0.07) g = put(g, TROPHIES[Math.floor(rand() * TROPHIES.length)]);
  return g;
}

const PURSE: Record<Rarity, number> = { common: 10, uncommon: 22, rare: 45, epic: 110 };

/** What a fallen man leaves: some of what he wore, his purse, maybe a draught or a trinket. */
export function rollCorpse(rand: () => number, rarity: Rarity, worn: ArmorEquipment): Grid {
  let g = emptyGrid(CORPSE_W, CORPSE_H);
  g = put(g, "coins", Math.max(1, Math.round(PURSE[rarity] * (0.6 + rand() * 0.8))));
  const keep = rarity === "epic" ? 0.55 : rarity === "rare" ? 0.42 : 0.3;
  let pieces = 0;
  for (const s of ARMOR_SLOTS) {
    if (!worn[s] || pieces >= 3) continue;
    if (rand() < keep) {
      g = put(g, s);
      pieces++;
    }
  }
  if (rand() < 0.25) g = put(g, "potion");
  if (rand() < 0.3) g = put(g, "bandage");
  if (rand() < 0.2) g = put(g, weighted(rand, VALUABLES, rarity === "epic" ? 3 : 0));
  return g;
}
