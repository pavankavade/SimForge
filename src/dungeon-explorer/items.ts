// Everything that can sit in a bag, a chest or on a corpse: the fighter's kit (one item per armour
// slot, wearable), valuables to sell, trophy weapons, mana crystals and monster parts, coins and
// things to eat or drink. Items in the world are instances (`ItemInst`: a uid and a def id), so there
// can be two breastplates; grids hold them at a cell, Dark and Darker style, each taking its real
// footprint.
//
// RARITY (AGENTS.md §15): one ladder for the whole game, common to artifact. Every item def has a
// base rarity; a weapon instance rolls its own (`ItemInst.rarity`), which scales its damage, block
// and price (`itemOf`). Monsters carry a rarity too, and drop a mana crystal of it.
import { ARMOR_SLOTS, type ArmorSlot, type Finish } from "../artifacts/characters/paladin";
import type { ModId } from "./stats";

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

export type ItemCategory = "armor" | "weapon" | "valuable" | "trophy" | "consumable" | "coins" | "crystal" | "material" | "ammo";

/**
 * Where a piece is worn or held: an armour slot, or one of the two weapon sets (Dark and Darker
 * style): set 1 and set 2 each have a main hand and an off hand. Keys 1 and 2 take a set up.
 * (The rig's "sword" and "shield" slots are only what is in his hands; items never sit there.)
 */
export type WeaponSlot = "main1" | "off1" | "main2" | "off2";
export type GearSlot = ArmorSlot | WeaponSlot;
export const WEAPON_SLOTS: WeaponSlot[] = ["main1", "off1", "main2", "off2"];
/** The armour slots items are worn in (every rig slot but the hands). */
export const WEAR_SLOTS: ArmorSlot[] = ARMOR_SLOTS.filter((s) => s !== "sword" && s !== "shield");

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
  /** Wearable: the fighter's armour slot; for weapons the hand ("sword" main, "shield" off, "bow" both). */
  slot?: ArmorSlot | "bow";
  armor?: number;
  damage?: number;
  block?: number;
  /** Hit points it gives back when used. */
  heal?: number;
  /** ...over this many seconds (a bandage), rather than at once. */
  healOver?: number;
  /** How many fit in one cell (coins). */
  stack?: number;
  /** Armour made of something other than plate on the same shape (the ranger's leathers). */
  finish?: Finish;
}

const ARMOR: Array<Omit<ItemDef, "id" | "category" | "value" | "slot"> & { slot: ArmorSlot }> = [
  { slot: "helm", name: "Great helm", note: "Closed helm with a mail aventail", kind: "Head", w: 2, h: 2, rarity: "common", armor: 32, weight: 2.5 },
  { slot: "gorget", name: "Gorget", note: "Steel collar over the throat", kind: "Neck", w: 2, h: 1, rarity: "common", armor: 14, weight: 0.8 },
  { slot: "cuirass", name: "Breastplate", note: "Cuirass, backplate and plackart", kind: "Chest", w: 2, h: 3, rarity: "common", armor: 68, weight: 8 },
  { slot: "pauldrons", name: "Pauldrons", note: "Domed shoulder plates", kind: "Shoulders", w: 2, h: 2, rarity: "common", armor: 24, weight: 2.2 },
  { slot: "arms", name: "Arm harness", note: "Rerebraces, couters and vambraces", kind: "Arms", w: 2, h: 2, rarity: "common", armor: 22, weight: 2.5 },
  { slot: "gauntlets", name: "Gauntlets", note: "Fingered plate gauntlets, leather palms", kind: "Hands", w: 2, h: 2, rarity: "common", armor: 18, weight: 1.1 },
  { slot: "waist", name: "Fauld & belt", note: "Hip lames, tassets, belt and scabbard", kind: "Waist", w: 2, h: 2, rarity: "common", armor: 16, weight: 2 },
  { slot: "cuisses", name: "Cuisses", note: "Thigh plates and poleyns", kind: "Thighs", w: 2, h: 2, rarity: "common", armor: 26, weight: 2.6 },
  { slot: "greaves", name: "Greaves", note: "Closed shin plates", kind: "Shins", w: 2, h: 2, rarity: "common", armor: 22, weight: 2 },
  { slot: "sabatons", name: "Sabatons", note: "Laminated steel shoes", kind: "Feet", w: 2, h: 2, rarity: "common", armor: 16, weight: 1.4 },
  { slot: "mail", name: "Mail hauberk", note: "Riveted mail shirt and chausses", kind: "Mail", w: 2, h: 3, rarity: "common", armor: 40, weight: 9 },
  { slot: "doublet", name: "Arming doublet", note: "Quilted coat and hose, worn under the mail", kind: "Under", w: 2, h: 3, rarity: "common", armor: 10, weight: 2 },
  { slot: "cape", name: "Cape", note: "Order cape", kind: "Back", w: 2, h: 3, rarity: "common", armor: 4, weight: 1.5 },
  { slot: "tabard", name: "Tabard", note: "Order tabard", kind: "Over", w: 2, h: 3, rarity: "common", armor: 3, weight: 0.6 },
  { slot: "sword", name: "Arming sword", note: "Single-handed, double-edged", kind: "Main hand", w: 1, h: 4, rarity: "common", armor: 0, weight: 1.3, damage: 38 },
  { slot: "shield", name: "Heater shield", note: "Oak, rawhide and the order's sun", kind: "Off hand", w: 2, h: 3, rarity: "common", armor: 0, weight: 3.5, block: 70 },
];

const BASE: Record<Rarity, number> = { common: 40, uncommon: 90, rare: 170, epic: 320, legendary: 600, unique: 1000, artifact: 1800 };
const priceFor = (a: { rarity: Rarity; armor?: number; damage?: number; block?: number }) =>
  Math.round((BASE[a.rarity] + (a.armor ?? 0) * 3 + (a.damage ?? 0) * 4 + (a.block ?? 0) * 2) / 5) * 5;

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

/**
 * Leathers: hardened hide on the plate shapes (lighter, less armour), and a plain green cloak. The
 * ranger starts in them; anyone can wear them. They sit in the same slots as the plate.
 */
const LEATHERS: Array<Omit<ItemDef, "category" | "value" | "slot" | "finish"> & { slot: ArmorSlot }> = [
  { id: "leather_jerkin", slot: "cuirass", name: "Leather jerkin", note: "Boiled hide, moulded and laced; it turns a knife, not a mace", kind: "Chest", w: 2, h: 3, rarity: "common", armor: 30, weight: 3.2 },
  { id: "leather_bracers", slot: "arms", name: "Leather bracers", note: "Hide over the forearms, a guard for the bowstring", kind: "Arms", w: 2, h: 2, rarity: "common", armor: 10, weight: 0.9 },
  { id: "leather_gloves", slot: "gauntlets", name: "Archer's gloves", note: "Thin at the fingers for the string, thick at the back", kind: "Hands", w: 2, h: 2, rarity: "common", armor: 7, weight: 0.3 },
  { id: "leather_leggings", slot: "greaves", name: "Hide shin guards", note: "Stiff hide strapped over the shins", kind: "Shins", w: 2, h: 2, rarity: "common", armor: 9, weight: 0.8 },
  { id: "leather_boots", slot: "sabatons", name: "Soft boots", note: "Turned leather; quiet on stone", kind: "Feet", w: 2, h: 2, rarity: "common", armor: 6, weight: 0.6 },
  { id: "ranger_cloak", slot: "cape", name: "Ranger's cloak", note: "Green wool that goes grey in the dark", kind: "Back", w: 2, h: 3, rarity: "common", armor: 4, weight: 1.1 },
];

export const ITEM_DEFS: Record<string, ItemDef> = {};
for (const a of ARMOR) {
  ITEM_DEFS[a.slot] = { ...a, id: a.slot, category: a.slot === "sword" || a.slot === "shield" ? "weapon" : "armor", value: priceFor(a) };
}
for (const a of LEATHERS) ITEM_DEFS[a.id] = { ...a, category: "armor", value: priceFor(a), finish: "leather" };
/** The leathers' ids, and the plate piece each one stands in for (icons are drawn from that shape). */
export const LEATHER_IDS: Array<[string, ArmorSlot]> = LEATHERS.map((a) => [a.id, a.slot]);
for (const o of OTHER) ITEM_DEFS[o.id] = o;

/** The paladin's kit, one def per armour slot (the stats the game reads). */
export const ITEMS = {} as Record<ArmorSlot, ItemDef>;
for (const s of ARMOR_SLOTS) ITEMS[s] = ITEM_DEFS[s];

export const def = (id: string): ItemDef => ITEM_DEFS[id] ?? ITEM_DEFS.coins;

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

/** Weapons and armour roll their own rarity when they drop (and gear rolls modifiers with it). */
export const rollsRarity = (id: string): boolean => {
  const c = def(id).category;
  return c === "weapon" || c === "trophy" || c === "armor";
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
  return {
    ...d,
    rarity: it.rarity,
    damage: d.damage !== undefined ? Math.round(d.damage * k) : undefined,
    armor: d.armor ? Math.round(d.armor * k) : d.armor,
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
