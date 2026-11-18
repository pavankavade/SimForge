// What the paladin carries: gold, the pieces he wears (one item per armour slot) and a bag grid.
// Pure helpers return a new inventory, so React state stays simple. Saved between visits; the first
// time he starts in the basic kit (padding, sword, shield) with a little gold. An earlier save (a
// purse of owned slots) is carried over.
import { ARMOR_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";
import { addItem, def, emptyGrid, fitsAt, newItem, placeItem, removeItem, sortGrid, type GearSlot, type Grid, type ItemInst } from "./items";

export const BAG_W = 12;
export const BAG_H = 8;

export interface PlayerInv {
  gold: number;
  equipped: Partial<Record<GearSlot, ItemInst>>;
  bag: Grid;
  /** The two belt slots (keys 3 and 4): a draught, a bandage, food, ready to use. */
  belt: Array<ItemInst | null>;
  /** The starting purse this save has been given (older saves are topped up to it once). */
  granted?: number;
}

export const BELT_SLOTS = 2;

/** What can go on the belt: anything that heals when used. */
export const beltable = (id: string) => !!def(id).heal;

export const BASIC_KIT: ArmorSlot[] = ["doublet", "sword", "shield"];
export const START_GOLD = 10000;
const KEY = "simforge.explorer.inventory.v3";

function fresh(): PlayerInv {
  const equipped: PlayerInv["equipped"] = {};
  for (const s of BASIC_KIT) equipped[s] = newItem(s);
  let bag = emptyGrid(BAG_W, BAG_H);
  bag = addItem(bag, newItem("apple")) ?? bag;
  bag = addItem(bag, newItem("bandage")) ?? bag;
  return { gold: START_GOLD, equipped, bag, belt: [newItem("potion"), newItem("bandage")], granted: START_GOLD };
}

/** An older save has no belt: the first draught and the first bandage (or food) in the bag go on it. */
function withBelt(inv: Omit<PlayerInv, "belt"> & { belt?: Array<ItemInst | null> }): PlayerInv {
  if (Array.isArray(inv.belt) && inv.belt.length === BELT_SLOTS) return inv as PlayerInv;
  let bag = inv.bag;
  const belt: Array<ItemInst | null> = [null, null];
  const take = (ids: string[]) => {
    const p = bag.items.find((q) => ids.indexOf(q.item.id) >= 0);
    if (!p) return null;
    bag = removeItem(bag, p.item.uid);
    return p.item;
  };
  belt[0] = take(["potion"]);
  belt[1] = take(["bandage", "apple"]);
  return { ...inv, bag, belt };
}

export function loadInventory(wornBefore: ArmorEquipment): PlayerInv {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as PlayerInv;
      if (s && s.bag && Array.isArray(s.bag.items)) {
        return withGrant(withBelt({ gold: Math.max(0, Math.floor(s.gold || 0)), equipped: s.equipped || {}, bag: { w: BAG_W, h: BAG_H, items: s.bag.items }, belt: s.belt, granted: s.granted }));
      }
    }
    // The purse of the first market build: the slots he owned, worn or in the bag.
    const old = window.localStorage.getItem("simforge.explorer.purse.v2");
    if (old) {
      const p = JSON.parse(old) as { gold?: number; owned?: Record<string, boolean> };
      const inv: PlayerInv = { gold: Math.max(0, Math.floor(p.gold || 0)), equipped: {}, bag: emptyGrid(BAG_W, BAG_H), belt: [null, null] };
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
export function unequipToBag(inv: PlayerInv, slot: GearSlot, at?: { x: number; y: number }): PlayerInv | null {
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

/** Every item he has (worn, on the belt and carried), for weights and counts. */
export function allItems(inv: PlayerInv): ItemInst[] {
  const worn = (ARMOR_SLOTS as readonly GearSlot[]).concat(["bow"]).map((s) => inv.equipped[s]).filter((x): x is ItemInst => !!x);
  const belt = (inv.belt || []).filter((x): x is ItemInst => !!x);
  return worn.concat(belt, inv.bag.items.map((p) => p.item));
}

/** A saved inventory from anywhere (the server, an older save) with a belt in place. */
/** A save from before the purse was raised gets the new starting purse once (never less than it has). */
function withGrant(inv: PlayerInv): PlayerInv {
  if ((inv.granted ?? 0) >= START_GOLD) return inv;
  return { ...inv, gold: Math.max(inv.gold, START_GOLD), granted: START_GOLD };
}

export const normalizeInventory = (inv: PlayerInv): PlayerInv => withGrant(withBelt(inv));

/** Arrows he carries (every stack in the bag). */
export const arrowCount = (inv: PlayerInv): number => inv.bag.items.reduce((a, p) => a + (p.item.id === "arrows" ? (p.item.qty ?? 1) : 0), 0);

/** One arrow off the smallest stack (an emptied stack goes); null with none left. */
export function spendArrow(inv: PlayerInv): PlayerInv | null {
  let best: { uid: string; qty: number } | null = null;
  for (const p of inv.bag.items) {
    if (p.item.id !== "arrows") continue;
    const q = p.item.qty ?? 1;
    if (!best || q < best.qty) best = { uid: p.item.uid, qty: q };
  }
  if (!best) return null;
  const b = best;
  const items = b.qty <= 1 ? inv.bag.items.filter((p) => p.item.uid !== b.uid) : inv.bag.items.map((p) => (p.item.uid === b.uid ? { ...p, item: { ...p.item, qty: b.qty - 1 } } : p));
  return { ...inv, bag: { ...inv.bag, items } };
}

/** Put a bag item on belt slot `i`; what was there goes back to the bag (where this came from if it fits). */
export function toBelt(inv: PlayerInv, uid: string, i: number): PlayerInv | null {
  const p = inv.bag.items.find((q) => q.item.uid === uid);
  if (!p || !beltable(p.item.id)) return null;
  let bag = removeItem(inv.bag, uid);
  const old = inv.belt[i];
  if (old) {
    if (fitsAt(bag, old.id, p.x, p.y)) bag = placeItem(bag, old, p.x, p.y);
    else {
      const b = addItem(bag, old);
      if (!b) return null;
      bag = b;
    }
  }
  const belt = inv.belt.slice();
  belt[i] = p.item;
  return { ...inv, bag, belt };
}

/** Take belt slot `i` into the bag (at a cell, or the first gap); null when it doesn't fit. */
export function fromBelt(inv: PlayerInv, i: number, at?: { x: number; y: number }): PlayerInv | null {
  const it = inv.belt[i];
  if (!it) return null;
  const bag = at ? (fitsAt(inv.bag, it.id, at.x, at.y) ? placeItem(inv.bag, it, at.x, at.y) : null) : addItem(inv.bag, it);
  if (!bag) return null;
  const belt = inv.belt.slice();
  belt[i] = null;
  return { ...inv, bag, belt };
}

/** Use belt slot `i` up; the next of the same kind in the bag takes its place. */
export function spendBelt(inv: PlayerInv, i: number): { inv: PlayerInv; used: ItemInst } | null {
  const it = inv.belt[i];
  if (!it) return null;
  const belt = inv.belt.slice();
  let bag = inv.bag;
  const next = bag.items.find((q) => q.item.id === it.id);
  if (next) bag = removeItem(bag, next.item.uid);
  belt[i] = next ? next.item : null;
  return { inv: { ...inv, bag, belt }, used: it };
}
