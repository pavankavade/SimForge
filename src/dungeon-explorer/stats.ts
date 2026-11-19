// Character stats, Dark and Darker style: seven attributes come from the class (its base) and the
// gear (modifiers rolled by rarity), and each feeds derived stats through a curve. There are no
// levels; a character grows by what he wears. The magic stats (Will, Knowledge) are already here,
// so spells only need to read them: magical power, magic resistance, casting speed and memory.
// The curves are our own numbers (AGENTS.md §16).
import { WEAR_SLOTS, def, handOf, itemOf, rarityRank, type GearSlot, type ItemInst, type Rarity } from "./items";

export const ATTRIBUTES = ["str", "vig", "agi", "dex", "wil", "kno", "res"] as const;
export type AttributeId = (typeof ATTRIBUTES)[number];
export type Attributes = Record<AttributeId, number>;

export const ATTRIBUTE_INFO: Record<AttributeId, { name: string; short: string; does: string }> = {
  str: { name: "Strength", short: "STR", does: "Physical power; a little health" },
  vig: { name: "Vigor", short: "VIG", does: "Health" },
  agi: { name: "Agility", short: "AGI", does: "Move speed; a little action speed" },
  dex: { name: "Dexterity", short: "DEX", does: "Action speed (swings, drawing the bow); a little interaction speed" },
  wil: { name: "Will", short: "WIL", does: "Magical power and magic resistance" },
  kno: { name: "Knowledge", short: "KNO", does: "Spell casting speed and memory capacity" },
  res: { name: "Resourcefulness", short: "RES", does: "Interaction speed (bandages, looting) and cooldowns" },
};

/** A piecewise-linear curve through [x, y] points (flat past both ends). */
function curve(points: Array<[number, number]>): (x: number) => number {
  return (x) => {
    if (x <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i];
      if (x <= x1) {
        const [x0, y0] = points[i - 1];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    }
    return points[points.length - 1][1];
  };
}

// Each attribute at 15 (a class's average) gives the neutral value: 100 health, no bonus.
const HEALTH = curve([[0, 70], [15, 100], [35, 130], [60, 160], [100, 200]]);
const PHYS_BONUS = curve([[0, -0.5], [15, 0], [35, 0.15], [60, 0.3], [100, 0.5]]);
const MAG_BONUS = curve([[0, -0.6], [15, 0], [35, 0.25], [60, 0.45], [100, 0.75]]);
const MAGIC_RESIST = curve([[0, 0], [15, 40], [35, 90], [100, 150]]);
const MOVE = curve([[0, -0.1], [15, 0], [35, 0.04], [60, 0.07], [100, 0.1]]);
const ACTION = curve([[0, -0.3], [15, 0], [35, 0.1], [60, 0.18], [100, 0.25]]);
const INTERACT = curve([[0, -0.5], [15, 0], [35, 0.3], [60, 0.6], [100, 1]]);
const CAST = curve([[0, -0.5], [15, 0], [35, 0.3], [60, 0.6], [100, 1]]);
const MEMORY = curve([[0, 0], [6, 0], [15, 5], [35, 15], [60, 24], [100, 30]]);
const COOLDOWN = curve([[0, -0.2], [15, 0], [35, 0.15], [60, 0.3], [100, 0.5]]);

/** Damage left after a reduction rating (armour or magic resistance): the same curve everywhere. */
export const reductionOf = (rating: number): number => Math.max(-0.5, Math.min(0.85, rating / (Math.abs(rating) + 250)));

// ---- Gear modifiers --------------------------------------------------------------------------

export type ModId = AttributeId | "physicalPower" | "magicalPower" | "weaponDamage" | "maxHealth" | "armorRating" | "magicResist" | "moveSpeed" | "actionSpeed";

export const MOD_INFO: Record<ModId, { label: string; pct?: boolean; range: [number, number]; on: Array<"weapon" | "armor"> }> = {
  str: { label: "Strength", range: [1, 3], on: ["weapon", "armor"] },
  vig: { label: "Vigor", range: [1, 3], on: ["weapon", "armor"] },
  agi: { label: "Agility", range: [1, 3], on: ["weapon", "armor"] },
  dex: { label: "Dexterity", range: [1, 3], on: ["weapon", "armor"] },
  wil: { label: "Will", range: [1, 3], on: ["weapon", "armor"] },
  kno: { label: "Knowledge", range: [1, 3], on: ["weapon", "armor"] },
  res: { label: "Resourcefulness", range: [1, 3], on: ["weapon", "armor"] },
  physicalPower: { label: "Physical Power", range: [2, 5], on: ["weapon", "armor"] },
  magicalPower: { label: "Magical Power", range: [2, 5], on: ["weapon", "armor"] },
  weaponDamage: { label: "Weapon Damage", range: [1, 4], on: ["weapon"] },
  maxHealth: { label: "Max Health", range: [3, 10], on: ["armor"] },
  armorRating: { label: "Armor Rating", range: [5, 18], on: ["armor"] },
  magicResist: { label: "Magic Resistance", range: [5, 18], on: ["armor", "weapon"] },
  moveSpeed: { label: "Move Speed", pct: true, range: [1, 4], on: ["armor"] },
  actionSpeed: { label: "Action Speed", pct: true, range: [1, 4], on: ["weapon", "armor"] },
};
const MOD_IDS = Object.keys(MOD_INFO) as ModId[];

/** How many modifiers a piece of each rarity rolls. */
export const MOD_COUNT: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5, artifact: 5 };

/** Gear that can carry modifiers: what goes in a slot. */
export const takesMods = (id: string): boolean => {
  const d = def(id);
  return !!d.slot && (d.category === "armor" || d.category === "weapon");
};

/**
 * The modifiers a piece rolls at `rarity`: distinct kinds from those that fit it, each a little
 * stronger the rarer the piece.
 */
export function rollMods(rand: () => number, id: string, rarity: Rarity): Array<[ModId, number]> {
  if (!takesMods(id)) return [];
  const kind = def(id).category === "weapon" ? "weapon" : "armor";
  const pool = MOD_IDS.filter((m) => MOD_INFO[m].on.indexOf(kind) >= 0);
  const out: Array<[ModId, number]> = [];
  const lift = 1 + rarityRank(rarity) * 0.12;
  for (let i = 0; i < MOD_COUNT[rarity] && pool.length; i++) {
    const m = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const [a, b] = MOD_INFO[m].range;
    out.push([m, Math.max(1, Math.round((a + rand() * (b - a)) * lift))]);
  }
  return out;
}

export const modLine = ([m, v]: [ModId, number]): string => `+${v}${MOD_INFO[m].pct ? "%" : ""} ${MOD_INFO[m].label}`;

// ---- The character's stats ---------------------------------------------------------------------

export interface Stats {
  /** Final attributes (class base plus gear). */
  attributes: Attributes;
  maxHealth: number;
  /** Physical / magical power (an attribute plus gear) and the damage bonus each gives. */
  physicalPower: number;
  physicalBonus: number;
  magicalPower: number;
  magicalBonus: number;
  /** Ratings and the share of each kind of damage they take off. */
  armorRating: number;
  physicalReduction: number;
  magicResist: number;
  magicalReduction: number;
  /** The weapons in hand: one cut of the sword, a full-draw arrow (before power). */
  swordDamage: number;
  bowDamage: number;
  /** Fractions: 0.05 = 5% faster. */
  moveSpeed: number;
  actionSpeed: number;
  interactionSpeed: number;
  castingSpeed: number;
  cooldownReduction: number;
  /** Spell memory (spells cost their tier). */
  memoryCapacity: number;
}

/** Everything that counts: the armour he wears and the weapon set `set` (only weapons in hand count). */
const gearOf = (equipped: Partial<Record<GearSlot, ItemInst>>, set: 1 | 2): ItemInst[] =>
  (WEAR_SLOTS as GearSlot[])
    .concat(set === 1 ? ["main1", "off1"] : ["main2", "off2"])
    .map((s) => equipped[s])
    .filter((x): x is ItemInst => !!x);

/** His stats with weapon set `set` in hand (the sheet shows set 1 while nothing is drawn). */
export function computeStats(base: Attributes, equipped: Partial<Record<GearSlot, ItemInst>>, set: 1 | 2 = 1): Stats {
  const add = {} as Record<ModId, number>;
  for (const m of MOD_IDS) add[m] = 0;
  let armor = 0;
  for (const it of gearOf(equipped, set)) {
    const d = itemOf(it);
    armor += d.armor ?? 0;
    for (const [m, v] of it.mods ?? []) add[m] += v;
  }
  const a = {} as Attributes;
  for (const k of ATTRIBUTES) a[k] = base[k] + add[k];
  const physicalPower = a.str + add.physicalPower;
  const magicalPower = a.wil + add.magicalPower;
  const armorRating = armor + add.armorRating;
  const magicResist = MAGIC_RESIST(a.wil) + add.magicResist;
  const main = equipped[set === 1 ? "main1" : "main2"];
  const sword = main && handOf(main.id) === "main" ? itemOf(main).damage ?? 30 : 6;
  const bow = main && handOf(main.id) === "both" ? itemOf(main).damage ?? 30 : 0;
  const physicalBonus = PHYS_BONUS(physicalPower);
  return {
    attributes: a,
    maxHealth: Math.round(HEALTH(0.25 * a.str + 0.75 * a.vig) + add.maxHealth),
    physicalPower,
    physicalBonus,
    magicalPower,
    magicalBonus: MAG_BONUS(magicalPower),
    armorRating,
    physicalReduction: reductionOf(armorRating),
    magicResist,
    magicalReduction: reductionOf(magicResist),
    swordDamage: (sword + add.weaponDamage) * (1 + physicalBonus),
    bowDamage: bow ? (bow + add.weaponDamage) * (1 + physicalBonus) : 0,
    moveSpeed: MOVE(a.agi) + add.moveSpeed / 100,
    actionSpeed: ACTION(0.25 * a.agi + 0.75 * a.dex) + add.actionSpeed / 100,
    interactionSpeed: INTERACT(0.25 * a.dex + 0.75 * a.res),
    castingSpeed: CAST(a.kno),
    cooldownReduction: Math.min(0.65, COOLDOWN(a.res)),
    memoryCapacity: Math.round(MEMORY(a.kno)),
  };
}

/** The sheet's derived lines, in order (label, value). */
export function statLines(s: Stats): Array<[string, string]> {
  const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;
  return [
    ["Max Health", String(s.maxHealth)],
    ["Physical Power", `${s.physicalPower} (${pct(s.physicalBonus)})`],
    ["Magical Power", `${s.magicalPower} (${pct(s.magicalBonus)})`],
    ["Armor Rating", `${s.armorRating} (${Math.round(s.physicalReduction * 100)}% phys.)`],
    ["Magic Resistance", `${Math.round(s.magicResist)} (${Math.round(s.magicalReduction * 100)}% mag.)`],
    ["Sword Damage", s.swordDamage.toFixed(0)],
    ["Bow Damage", s.bowDamage ? s.bowDamage.toFixed(0) : "-"],
    ["Move Speed", pct(s.moveSpeed)],
    ["Action Speed", pct(s.actionSpeed)],
    ["Interaction Speed", pct(s.interactionSpeed)],
    ["Spell Casting Speed", pct(s.castingSpeed)],
    ["Cooldown Reduction", pct(s.cooldownReduction)],
    ["Memory Capacity", String(s.memoryCapacity)],
  ];
}
