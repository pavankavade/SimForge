// What the paladin carries: gold, the pieces he wears (one item per armour slot) and a bag grid.
// Pure helpers return a new inventory, so React state stays simple. Saved between visits; the first
// time he starts in the basic kit (padding, sword, shield) with a little gold. An earlier save (a
// purse of owned slots) is carried over.
import { ARMOR_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";
import { addItem, def, emptyGrid, fitsAt, newItem, placeItem, removeItem, sortGrid, type Grid, type ItemInst } from "./items";

export const BAG_W = 12;
export const BAG_H = 8;

export interface PlayerInv {
  gold: number;
  equipped: Partial<Record<ArmorSlot, ItemInst>>;
  bag: Grid;
}

export const BASIC_KIT: ArmorSlot[] = ["doublet", "sword", "shield"];
const START_GOLD = 300;
const KEY = "simforge.explorer.inventory.v3";

function fresh(): PlayerInv {
  const equipped: PlayerInv["equipped"] = {};
  for (const s of BASIC_KIT) equipped[s] = newItem(s);
  let bag = emptyGrid(BAG_W, BAG_H);
  bag = addItem(bag, newItem("potion")) ?? bag;
  bag = addItem(bag, newItem("apple")) ?? bag;
  return { gold: START_GOLD, equipped, bag };
}

export function loadInventory(wornBefore: ArmorEquipment): PlayerInv {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as PlayerInv;
      if (s && s.bag && Array.isArray(s.bag.items)) {
        return { gold: Math.max(0, Math.floor(s.gold || 0)), equipped: s.equipped || {}, bag: { w: BAG_W, h: BAG_H, items: s.bag.items } };
      }
    }
    // The purse of the first market build: the slots he owned, worn or in the bag.
    const old = window.localStorage.getItem("simforge.explorer.purse.v2");
    if (old) {
      const p = JSON.parse(old) as { gold?: number; owned?: Record<string, boolean> };
      const inv: PlayerInv = { gold: Math.max(0, Math.floor(p.gold || 0)), equipped: {}, bag: emptyGrid(BAG_W, BAG_H) };
      for (const s of ARMOR_SLOTS) {
        if (!p.owned?.[s]) continue;
        if (wornBefore[s]) inv.equipped[s] = newItem(s);
        else inv.bag = addItem(inv.bag, newItem(s)) ?? inv.bag;
      }
      return inv;
    }
  } catch {
    // Blocked storage: a new paladin.
  }
  return fresh();
}

export function saveInventory(inv: PlayerInv): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(inv));
  } catch {
    // Not remembered.
  }
}

/** What the body shows: a slot is worn when an item is in it. */
export function wornOf(inv: PlayerInv): ArmorEquipment {
  const e = {} as ArmorEquipment;
  for (const s of ARMOR_SLOTS) e[s] = !!inv.equipped[s];
  return e;
}

/**
 * Put a bag item on (it must be wearable). What was in that slot goes into the bag where the new
 * piece was, or anywhere it fits; with no room the swap does not happen.
 */
export function equipFromBag(inv: PlayerInv, uid: string): PlayerInv | null {
  const p = inv.bag.items.find((q) => q.item.uid === uid);
  const slot = p ? def(p.item.id).slot : undefined;
  if (!p || !slot) return null;
  let bag = removeItem(inv.bag, uid);
  const old = inv.equipped[slot];
  if (old) {
    if (fitsAt(bag, old.id, p.x, p.y)) bag = placeItem(bag, old, p.x, p.y);
    else {
      const b = addItem(bag, old);
      if (!b) return null;
      bag = b;
    }
  }
  return { ...inv, bag, equipped: { ...inv.equipped, [slot]: p.item } };
}

/** Take a piece off into the bag (at a cell, or the first gap); null when it doesn't fit. */
export function unequipToBag(inv: PlayerInv, slot: ArmorSlot, at?: { x: number; y: number }): PlayerInv | null {
  const it = inv.equipped[slot];
  if (!it) return null;
  let bag: Grid | null;
  if (at) bag = fitsAt(inv.bag, it.id, at.x, at.y) ? placeItem(inv.bag, it, at.x, at.y) : null;
  else bag = addItem(inv.bag, it);
  if (!bag) return null;
  const equipped = { ...inv.equipped };
  delete equipped[slot];
  return { ...inv, bag, equipped };
}

/** Coins dropped into the bag go into the purse instead. */
export function intoPurse(inv: PlayerInv, item: ItemInst): PlayerInv {
  return { ...inv, gold: inv.gold + (item.qty ?? 1) };
}

export const sortBag = (inv: PlayerInv): PlayerInv => ({ ...inv, bag: sortGrid(inv.bag) });

/** Every item he has (worn and carried), for weights and counts. */
export function allItems(inv: PlayerInv): ItemInst[] {
  const worn = ARMOR_SLOTS.map((s) => inv.equipped[s]).filter((x): x is ItemInst => !!x);
  return worn.concat(inv.bag.items.map((p) => p.item));
}
