// Everything that can sit in a bag, a chest or on a corpse: the paladin's kit (one item per armour
// slot, wearable), valuables to sell, trophy weapons, coins and things to eat or drink. Items in the
// world are instances (`ItemInst`: a uid and a def id), so there can be two breastplates; grids hold
// them at a cell, Dark and Darker style, each taking its real footprint.
import { ARMOR_SLOTS, type ArmorSlot } from "../artifacts/characters/paladin";

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#d9dde2" },
  uncommon: { label: "Uncommon", color: "#62d36d" },
  rare: { label: "Rare", color: "#5aa2ff" },
  epic: { label: "Epic", color: "#bd76ff" },
};

export type ItemCategory = "armor" | "weapon" | "valuable" | "trophy" | "consumable" | "coins";

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
  /** Wearable: the paladin's armour slot. */
  slot?: ArmorSlot;
  armor?: number;
  damage?: number;
  block?: number;
  /** Hit points it gives back when used. */
  heal?: number;
  /** How many fit in one cell (coins). */
  stack?: number;
}

const ARMOR: Array<Omit<ItemDef, "id" | "category" | "value" | "slot"> & { slot: ArmorSlot }> = [
  { slot: "helm", name: "Great helm", note: "Closed helm with a mail aventail", kind: "Head", w: 2, h: 2, rarity: "rare", armor: 32, weight: 2.5 },
  { slot: "gorget", name: "Gorget", note: "Steel collar over the throat", kind: "Neck", w: 2, h: 1, rarity: "uncommon", armor: 14, weight: 0.8 },
  { slot: "cuirass", name: "Breastplate", note: "Cuirass, backplate and plackart", kind: "Chest", w: 2, h: 3, rarity: "epic", armor: 68, weight: 8 },
  { slot: "pauldrons", name: "Pauldrons", note: "Domed shoulder plates", kind: "Shoulders", w: 2, h: 2, rarity: "rare", armor: 24, weight: 2.2 },
  { slot: "arms", name: "Arm harness", note: "Rerebraces, couters and vambraces", kind: "Arms", w: 2, h: 2, rarity: "uncommon", armor: 22, weight: 2.5 },
  { slot: "gauntlets", name: "Gauntlets", note: "Fingered plate gauntlets, leather palms", kind: "Hands", w: 2, h: 2, rarity: "uncommon", armor: 18, weight: 1.1 },
  { slot: "waist", name: "Fauld & belt", note: "Hip lames, tassets, belt and scabbard", kind: "Waist", w: 2, h: 2, rarity: "common", armor: 16, weight: 2 },
  { slot: "cuisses", name: "Cuisses", note: "Thigh plates and poleyns", kind: "Thighs", w: 2, h: 2, rarity: "uncommon", armor: 26, weight: 2.6 },
  { slot: "greaves", name: "Greaves", note: "Closed shin plates", kind: "Shins", w: 2, h: 2, rarity: "uncommon", armor: 22, weight: 2 },
  { slot: "sabatons", name: "Sabatons", note: "Laminated steel shoes", kind: "Feet", w: 2, h: 2, rarity: "common", armor: 16, weight: 1.4 },
  { slot: "mail", name: "Mail hauberk", note: "Riveted mail shirt and chausses", kind: "Mail", w: 2, h: 3, rarity: "rare", armor: 40, weight: 9 },
  { slot: "doublet", name: "Arming doublet", note: "Quilted coat and hose, worn under the mail", kind: "Under", w: 2, h: 3, rarity: "common", armor: 10, weight: 2 },
  { slot: "cape", name: "Cape", note: "Order cape", kind: "Back", w: 2, h: 3, rarity: "uncommon", armor: 4, weight: 1.5 },
  { slot: "tabard", name: "Tabard", note: "Order tabard", kind: "Over", w: 2, h: 3, rarity: "rare", armor: 3, weight: 0.6 },
  { slot: "sword", name: "Arming sword", note: "Single-handed, double-edged", kind: "Main hand", w: 1, h: 4, rarity: "epic", armor: 0, weight: 1.3, damage: 38 },
  { slot: "shield", name: "Heater shield", note: "Oak, rawhide and the order's sun", kind: "Off hand", w: 2, h: 3, rarity: "rare", armor: 0, weight: 3.5, block: 70 },
];

const BASE: Record<Rarity, number> = { common: 40, uncommon: 90, rare: 170, epic: 320 };
const priceFor = (a: { rarity: Rarity; armor?: number; damage?: number; block?: number }) =>
  Math.round((BASE[a.rarity] + (a.armor ?? 0) * 3 + (a.damage ?? 0) * 4 + (a.block ?? 0) * 2) / 5) * 5;

const OTHER: ItemDef[] = [
  { id: "coins", name: "Gold coins", note: "Struck with a king nobody remembers", kind: "Coins", category: "coins", w: 1, h: 1, rarity: "common", weight: 0.01, value: 1, stack: 999 },
  { id: "potion", name: "Healing draught", note: "Bitter, red, and it works", kind: "Drink", category: "consumable", w: 1, h: 1, rarity: "uncommon", weight: 0.3, value: 30, heal: 40 },
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
];

export const ITEM_DEFS: Record<string, ItemDef> = {};
for (const a of ARMOR) {
  ITEM_DEFS[a.slot] = { ...a, id: a.slot, category: a.slot === "sword" || a.slot === "shield" ? "weapon" : "armor", value: priceFor(a) };
}
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
export function newItem(id: string, qty?: number): ItemInst {
  uidSerial++;
  return { uid: `${SESSION}-${uidSerial.toString(36)}`, id, qty };
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

/** A copy of the grid with the item placed at the first free spot, or null if it doesn't fit. */
export function addItem(g: Grid, item: ItemInst): Grid | null {
  const p = firstFit(g, item.id);
  return p ? { ...g, items: g.items.concat([{ item, x: p.x, y: p.y }]) } : null;
}

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

export const gridWeight = (g: Grid) => g.items.reduce((a, p) => a + def(p.item.id).weight * (p.item.qty ? p.item.qty / 100 : 1), 0);
