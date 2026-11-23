// Character stats, Dark and Darker style: seven attributes come from the class (its base) and the
// gear (modifiers rolled by rarity), and each feeds derived stats through a curve. There are no
// levels; a character grows by what he wears. The magic stats (Will, Knowledge) are already here,
// so spells only need to read them: magical power, magic resistance, casting speed and memory.
// The curves are our own numbers (AGENTS.md §16).
import { WORN_SLOTS, def, handOf, itemOf, rarityRank, type GearSlot, type ItemInst, type Rarity } from "./items";

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
/**
 * The most any damage reduction reaches (physical, magical, projectile), Dark and Darker style:
 * the rating's curve plus flat "% damage reduction" from gear, never past this.
 */
export const REDUCTION_CAP = 0.65;
/** A headshot does half again; a helmet's headshot reduction takes points off that half. */
export const HEADSHOT_BONUS = 0.5;
/** A blow landing on the head: the multiplier after his headshot reduction (never below 1). */
export const headshotMultiplier = (reduction: number): number => 1 + Math.max(0, HEADSHOT_BONUS - reduction);

// ---- Gear modifiers --------------------------------------------------------------------------

export type ModId =
  | AttributeId
  | "physicalPower"
  | "magicalPower"
  | "weaponDamage"
  | "maxHealth"
  | "armorRating"
  | "magicResist"
  | "moveSpeed"
  | "actionSpeed"
  | "physicalReduction"
  | "magicalReduction"
  | "projectileReduction"
  | "headshotReduction"
  | "headshotDamage";

/** What gear a modifier rolls on: weapons, armour (`head`: helmets only) and jewellery. */
type ModOn = "weapon" | "armor" | "head" | "jewelry";
export const MOD_INFO: Record<ModId, { label: string; pct?: boolean; range: [number, number]; on: ModOn[] }> = {
  str: { label: "Strength", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  vig: { label: "Vigor", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  agi: { label: "Agility", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  dex: { label: "Dexterity", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  wil: { label: "Will", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  kno: { label: "Knowledge", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  res: { label: "Resourcefulness", range: [1, 3], on: ["weapon", "armor", "jewelry"] },
  physicalPower: { label: "Physical Power", range: [2, 5], on: ["weapon", "armor", "jewelry"] },
  magicalPower: { label: "Magical Power", range: [2, 5], on: ["weapon", "armor", "jewelry"] },
  weaponDamage: { label: "Weapon Damage", range: [1, 4], on: ["weapon"] },
  maxHealth: { label: "Max Health", range: [3, 10], on: ["armor", "jewelry"] },
  armorRating: { label: "Armor Rating", range: [5, 18], on: ["armor"] },
  magicResist: { label: "Magic Resistance", range: [5, 18], on: ["armor", "weapon", "jewelry"] },
  moveSpeed: { label: "Move Speed", pct: true, range: [1, 4], on: ["armor"] },
  actionSpeed: { label: "Action Speed", pct: true, range: [1, 4], on: ["weapon", "armor", "jewelry"] },
  physicalReduction: { label: "Physical Damage Reduction", pct: true, range: [1, 3], on: ["armor", "jewelry"] },
  magicalReduction: { label: "Magical Damage Reduction", pct: true, range: [1, 3], on: ["armor", "jewelry"] },
  projectileReduction: { label: "Projectile Damage Reduction", pct: true, range: [1, 4], on: ["armor", "jewelry"] },
  headshotReduction: { label: "Headshot Damage Reduction", pct: true, range: [2, 6], on: ["head"] },
  headshotDamage: { label: "Headshot Damage", pct: true, range: [2, 6], on: ["weapon", "jewelry"] },
};
const MOD_IDS = Object.keys(MOD_INFO) as ModId[];

/** How many modifiers a piece of each rarity rolls. */
export const MOD_COUNT: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5, artifact: 5 };

/** Gear that can carry modifiers: what goes in a slot. */
export const takesMods = (id: string): boolean => {
  const d = def(id);
  return !!d.slot && (d.category === "armor" || d.category === "weapon" || d.category === "jewelry");
};

/**
 * The modifiers a piece rolls at `rarity`: distinct kinds from those that fit it, each a little
 * stronger the rarer the piece.
 */
export function rollMods(rand: () => number, id: string, rarity: Rarity): Array<[ModId, number]> {
  if (!takesMods(id)) return [];
  const d = def(id);
  const kinds: ModOn[] = d.category === "weapon" ? ["weapon"] : d.category === "jewelry" ? ["jewelry"] : d.slot === "head" ? ["armor", "head"] : ["armor"];
  const pool = MOD_IDS.filter((m) => MOD_INFO[m].on.some((k) => kinds.indexOf(k) >= 0));
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
  /**
   * Ratings and the share of each kind of damage they take off (PDR and MDR: the rating's curve
   * plus gear's flat percent, capped). Projectile reduction comes off arrows and bolts on top.
   */
  armorRating: number;
  physicalReduction: number;
  magicResist: number;
  magicalReduction: number;
  projectileReduction: number;
  /** Points off a headshot's +50% (helmets), and extra damage on his own headshots (fractions). */
  headshotReduction: number;
  headshotDamage: number;
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
  /** Fractions from perks: how much faster the bow draws and reloads (on top of action speed). */
  drawSpeed: number;
  reloadSpeed: number;
  /** Fractions from perks: extra healing from spells, extra damage of every kind on the undead. */
  healBonus: number;
  undeadBonus: number;
  /** Extra spell damage (Arcane Mastery), and Fireball's (Fire Mastery: harder and wider). */
  spellBonus: number;
  fireBonus: number;
  /** The rogue's: extra damage from behind (Backstab) and out of hiding (Ambush). */
  backstabBonus: number;
  ambushBonus: number;
}

/** Everything that counts: the armour and jewellery he wears and the weapon set `set` (only weapons in hand count). */
const gearOf = (equipped: Partial<Record<GearSlot, ItemInst>>, set: 1 | 2): ItemInst[] =>
  WORN_SLOTS.concat(set === 1 ? ["main1", "off1"] : ["main2", "off2"])
    .map((s) => equipped[s])
    .filter((x): x is ItemInst => !!x);

/**
 * His stats with weapon set `set` in hand (the sheet shows set 1 while nothing is drawn), with the
 * class perks he picked (skills.ts) on top.
 */
export function computeStats(base: Attributes, equipped: Partial<Record<GearSlot, ItemInst>>, set: 1 | 2 = 1, perks: string[] = []): Stats {
  const has = (p: string) => perks.indexOf(p) >= 0;
  const add = {} as Record<ModId, number>;
  for (const m of MOD_IDS) add[m] = 0;
  // What the pieces give by themselves (armour, resistance, speed, attributes), then their modifiers.
  let armor = 0;
  let resist = 0;
  let move = 0;
  let projectile = 0;
  let headshot = 0;
  let plate = false;
  for (const it of gearOf(equipped, set)) {
    const d = itemOf(it);
    armor += d.armor ?? 0;
    resist += d.magicResist ?? 0;
    move += d.move ?? 0;
    projectile += d.projectile ?? 0;
    headshot += d.headshot ?? 0;
    add.maxHealth += d.maxHealth ?? 0;
    add.headshotDamage += d.headshotDamage ?? 0;
    if (d.armorType === "plate") plate = true;
    for (const k of Object.keys(d.attr ?? {}) as AttributeId[]) add[k] += d.attr?.[k] ?? 0;
    for (const [m, v] of it.mods ?? []) add[m] += v;
  }
  const a = {} as Attributes;
  for (const k of ATTRIBUTES) a[k] = base[k] + add[k];
  const physicalPower = a.str + add.physicalPower;
  const mainItem = equipped[set === 1 ? "main1" : "main2"];
  // A staff in hand adds to his magical power.
  const magicalPower = a.wil + add.magicalPower + (mainItem ? def(mainItem.id).magic ?? 0 : 0);
  const armorRating = armor + add.armorRating + (has("defense_expert") ? 15 : 0);
  const magicResist = MAGIC_RESIST(a.wil) + resist + add.magicResist + (has("protection_evil") ? 25 : 0);
  const main = equipped[set === 1 ? "main1" : "main2"];
  const sword = main && handOf(main.id) === "main" ? itemOf(main).damage ?? 30 : 6;
  const bow = main && handOf(main.id) === "both" ? itemOf(main).damage ?? 30 : 0;
  const blunt = !!main && def(main.id).blunt === true && has("blunt_mastery");
  const physicalBonus = PHYS_BONUS(physicalPower);
  // Light Step counts while nothing of plate is worn (leathers and cloth are fine).
  const moveExtra = (has("swift") ? 0.04 : 0) + (has("light_step") && !plate ? 0.06 : 0) + (has("fleet_foot") ? 0.06 : 0);
  // A quick weapon in hand (the dagger) swings faster.
  const quick = mainItem ? def(mainItem.id).quick ?? 0 : 0;
  return {
    attributes: a,
    maxHealth: Math.round(HEALTH(0.25 * a.str + 0.75 * a.vig) + add.maxHealth + (has("robust") ? 10 : 0)),
    physicalPower,
    physicalBonus,
    magicalPower,
    magicalBonus: MAG_BONUS(magicalPower),
    armorRating,
    physicalReduction: Math.min(REDUCTION_CAP, reductionOf(armorRating) + add.physicalReduction / 100),
    magicResist,
    magicalReduction: Math.min(REDUCTION_CAP, reductionOf(magicResist) + add.magicalReduction / 100),
    projectileReduction: Math.min(REDUCTION_CAP, (projectile + add.projectileReduction) / 100),
    headshotReduction: Math.min(HEADSHOT_BONUS, (headshot + add.headshotReduction) / 100),
    headshotDamage: add.headshotDamage / 100,
    swordDamage: (sword + add.weaponDamage) * (1 + physicalBonus) * (has("weapon_mastery") ? 1.1 : 1) * (blunt ? 1.1 : 1),
    bowDamage: bow ? (bow + add.weaponDamage) * (1 + physicalBonus) * (has("ranged_mastery") ? 1.12 : 1) : 0,
    moveSpeed: MOVE(a.agi) + (move + add.moveSpeed) / 100 + moveExtra,
    actionSpeed: ACTION(0.25 * a.agi + 0.75 * a.dex) + add.actionSpeed / 100 + quick,
    interactionSpeed: INTERACT(0.25 * a.dex + 0.75 * a.res) + (has("light_fingers") ? 0.3 : 0),
    castingSpeed: CAST(a.kno) + (has("quick_chant") ? 0.2 : 0),
    cooldownReduction: Math.min(0.65, COOLDOWN(a.res)),
    memoryCapacity: Math.round(MEMORY(a.kno)) + (has("sage") ? 3 : 0),
    drawSpeed: has("steady_aim") ? 0.25 : 0,
    reloadSpeed: has("nimble_fingers") ? 0.35 : 0,
    healBonus: has("advanced_healer") ? 0.25 : 0,
    undeadBonus: has("undead_slaying") ? 0.2 : 0,
    spellBonus: has("arcane_mastery") ? 0.15 : 0,
    fireBonus: has("fire_mastery") ? 0.25 : 0,
    backstabBonus: has("backstab") ? 0.4 : 0,
    ambushBonus: has("ambush") ? 0.6 : 0,
  };
}

/** The sheet's derived lines, in order (label, value). */
export function statLines(s: Stats): Array<[string, string]> {
  const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;
  return [
    ["Max Health", String(s.maxHealth)],
    ["Physical Power", `${s.physicalPower} (${pct(s.physicalBonus)})`],
    ["Magical Power", `${s.magicalPower} (${pct(s.magicalBonus)})`],
    ["Armor Rating", String(s.armorRating)],
    ["Physical Damage Reduction", `${Math.round(s.physicalReduction * 100)}%`],
    ["Magic Resistance", String(Math.round(s.magicResist))],
    ["Magical Damage Reduction", `${Math.round(s.magicalReduction * 100)}%`],
    ["Projectile Damage Reduction", `${Math.round(s.projectileReduction * 100)}%`],
    ["Headshot Damage Reduction", `${Math.round(s.headshotReduction * 100)}%`],
    ["Headshot Damage", `+${Math.round((HEADSHOT_BONUS + s.headshotDamage) * 100)}%`],
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
