// What the paladin carries: gold, the pieces he wears (one item per armour slot) and a bag grid.
// Pure helpers return a new inventory, so React state stays simple. Saved between visits; the first
// time he starts in the basic kit (padding, sword, shield) with a little gold. An earlier save (a
// purse of owned slots) is carried over.
import { ARMOR_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";
import { classAllows, classById, type ClassId } from "./classes";
import { WEAPON_SLOTS, WEAR_SLOTS, addItem, def, emptyGrid, fitsAt, handOf, isWeaponSlot, newItem, placeItem, removeItem, sortGrid, type GearSlot, type Grid, type ItemInst, type WeaponSlot } from "./items";

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
  /** The class wearing `equipped` and `belt` (older saves: the fighter). */
  cls?: ClassId;
  /**
   * The other classes' worn gear and belts, kept while he plays another class (the bag and the
   * purse are shared). A class with no entry here has never been played: it gets its starter kit.
   */
  wardrobe?: Partial<Record<ClassId, { equipped: PlayerInv["equipped"]; belt: Array<ItemInst | null> }>>;
}

export const BELT_SLOTS = 2;

/** What can go on the belt: anything that heals when used. */
export const beltable = (id: string) => !!def(id).heal;

/** Where the first market build's sword and shield go: weapon set 1. */
const KIT_SLOT: Partial<Record<ArmorSlot, GearSlot>> = { sword: "main1", shield: "off1" };
export const START_GOLD = 10000;
const KEY = "simforge.explorer.inventory.v3";

/** A class's starter kit (classes.ts): what it wears and holds, its belt, and what it adds to the bag. */
function starterOf(cls: ClassId, bag: Grid): { equipped: PlayerInv["equipped"]; belt: Array<ItemInst | null>; bag: Grid } {
  const k = classById(cls).starter;
  const equipped: PlayerInv["equipped"] = {};
  for (const s of k.wear) equipped[s] = newItem(s);
  for (const s of WEAPON_SLOTS) {
    const id = k[s];
    if (id) equipped[s] = newItem(id);
  }
  const belt: Array<ItemInst | null> = [];
  for (let i = 0; i < BELT_SLOTS; i++) belt.push(k.belt[i] ? newItem(k.belt[i]) : null);
  for (const [id, n] of k.bag) {
    const stack = def(id).stack;
    // Arrows go in bundles; anything else one at a time. What doesn't fit is not given.
    for (let left = n; left > 0; ) {
      const q = stack && def(id).category === "ammo" ? Math.min(stack, left) : 1;
      bag = addItem(bag, newItem(id, stack && def(id).category === "ammo" ? q : undefined)) ?? bag;
      left -= q;
    }
  }
  return { equipped, belt, bag };
}

function fresh(): PlayerInv {
  const k = starterOf("fighter", emptyGrid(BAG_W, BAG_H));
  return { gold: START_GOLD, ...k, granted: START_GOLD, cls: "fighter" };
}

/**
 * He plays another class: this class's worn gear and belt go to the wardrobe, and that class's come
 * out (its starter kit, the first time). The bag and the purse stay as they are.
 */
export function switchClass(inv: PlayerInv, cls: ClassId): PlayerInv {
  const cur = inv.cls ?? "fighter";
  if (cur === cls) return inv.cls ? inv : { ...inv, cls };
  const wardrobe = { ...(inv.wardrobe ?? {}) };
  wardrobe[cur] = { equipped: inv.equipped, belt: inv.belt };
  const stored = wardrobe[cls];
  delete wardrobe[cls];
  if (stored) return { ...inv, cls, wardrobe, equipped: stored.equipped, belt: stored.belt };
  const k = starterOf(cls, inv.bag);
  return { ...inv, cls, wardrobe, equipped: k.equipped, belt: k.belt, bag: k.bag };
}

/** Why his class can't wear or hold this piece, or null when it can. */
export function classRefuses(inv: PlayerInv, id: string): string | null {
  const d = def(id);
  if (!d.slot) return null;
  const c = classById(inv.cls);
  const hand = handOf(id);
  if (classAllows(c, hand ? null : (d.slot as ArmorSlot), hand)) return null;
  return `A ${c.name.toLowerCase()} can't ${hand ? "hold" : "wear"} the ${d.name.toLowerCase()}`;
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
        return withSets(withGrant(withBelt({ gold: Math.max(0, Math.floor(s.gold || 0)), equipped: s.equipped || {}, bag: { w: BAG_W, h: BAG_H, items: s.bag.items }, belt: s.belt, granted: s.granted, cls: s.cls, wardrobe: s.wardrobe })));
      }
    }
    // The purse of the first market build: the slots he owned, worn or in the bag.
    const old = window.localStorage.getItem("simforge.explorer.purse.v2");
    if (old) {
      const p = JSON.parse(old) as { gold?: number; owned?: Record<string, boolean> };
      const inv: PlayerInv = { gold: Math.max(0, Math.floor(p.gold || 0)), equipped: {}, bag: emptyGrid(BAG_W, BAG_H), belt: [null, null] };
      for (const s of ARMOR_SLOTS) {
        if (!p.owned?.[s]) continue;
        if (wornBefore[s]) inv.equipped[KIT_SLOT[s] ?? s] = newItem(s);
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

/** What the body shows: the armour he wears, and in his hands what weapon set `set` holds (0: none). */
export function wornOf(inv: PlayerInv, set: 0 | 1 | 2 = 1): ArmorEquipment {
  const e = {} as ArmorEquipment;
  for (const s of ARMOR_SLOTS) e[s] = !!inv.equipped[s];
  const h = heldOf(inv, set);
  e.sword = h.sword;
  e.shield = h.shield;
  return e;
}

/** What weapon set `set` puts in his hands. */
export function heldOf(inv: PlayerInv, set: 0 | 1 | 2): { sword: boolean; shield: boolean; bow: boolean; main: ItemInst | null; off: ItemInst | null } {
  const main = set ? inv.equipped[set === 1 ? "main1" : "main2"] ?? null : null;
  const off = set ? inv.equipped[set === 1 ? "off1" : "off2"] ?? null : null;
  return { sword: !!main && handOf(main.id) === "main", shield: !!off && handOf(off.id) === "off", bow: !!main && handOf(main.id) === "both", main, off };
}

/** A save from before the weapon sets: the sword and shield become set 1, the bow set 2. */
function withSets(inv: PlayerInv): PlayerInv {
  const eq = inv.equipped as Record<string, ItemInst | undefined>;
  if (!eq.sword && !eq.shield && !eq.bow) return inv;
  const next: Record<string, ItemInst | undefined> = { ...eq };
  if (eq.sword && !next.main1) next.main1 = eq.sword;
  if (eq.shield && !next.off1) next.off1 = eq.shield;
  if (eq.bow && !next.main2) next.main2 = eq.bow;
  delete next.sword;
  delete next.shield;
  delete next.bow;
  return { ...inv, equipped: next as PlayerInv["equipped"] };
}

/**
 * The slot a bag piece goes in: armour in its own; a weapon in the weapon slot it was dropped on if
 * that hand fits it, else the first set with that hand free, else set 1.
 */
export function slotFor(inv: PlayerInv, id: string, target?: GearSlot): GearSlot | null {
  const d = def(id);
  if (!d.slot || classRefuses(inv, id)) return null;
  const hand = handOf(id);
  if (!hand) return d.slot as GearSlot;
  const fits = (s: WeaponSlot) => (hand === "off" ? s.startsWith("off") : s.startsWith("main"));
  if (target && isWeaponSlot(target)) return fits(target) ? target : null;
  const order: WeaponSlot[] = hand === "off" ? ["off1", "off2"] : ["main1", "main2"];
  return order.find((s) => !inv.equipped[s]) ?? order[0];
}

/**
 * Put a bag item on (it must be wearable). What was in that slot goes into the bag where the new
 * piece was, or anywhere it fits; with no room the swap does not happen.
 */
export function equipFromBag(inv: PlayerInv, uid: string, target?: GearSlot): PlayerInv | null {
  const p = inv.bag.items.find((q) => q.item.uid === uid);
  const slot = p ? slotFor(inv, p.item.id, target) : null;
  if (!p || !slot) return null;
  let bag = removeItem(inv.bag, uid);
  const equipped = { ...inv.equipped };
  // What has to come off: whatever was in the slot, and for a two-handed bow the set's off hand
  // (or the bow, when a shield goes in beside it).
  const off: ItemInst[] = [];
  const was = equipped[slot];
  if (was) off.push(was);
  if (isWeaponSlot(slot)) {
    const n = slot.endsWith("1") ? "1" : "2";
    const other = (slot.startsWith("main") ? `off${n}` : `main${n}`) as WeaponSlot;
    const o = equipped[other];
    if (o && (handOf(p.item.id) === "both" || handOf(o.id) === "both")) {
      off.push(o);
      delete equipped[other];
    }
  }
  for (const [i, it] of off.entries()) {
    if (i === 0 && fitsAt(bag, it.id, p.x, p.y)) bag = placeItem(bag, it, p.x, p.y);
    else {
      const b = addItem(bag, it);
      if (!b) return null;
      bag = b;
    }
  }
  equipped[slot] = p.item;
  return { ...inv, bag, equipped };
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
  const worn = (WEAR_SLOTS as GearSlot[]).concat(WEAPON_SLOTS).map((s) => inv.equipped[s]).filter((x): x is ItemInst => !!x);
  const belt = (inv.belt || []).filter((x): x is ItemInst => !!x);
  return worn.concat(belt, inv.bag.items.map((p) => p.item));
}

/** A saved inventory from anywhere (the server, an older save) with a belt in place. */
/** A save from before the purse was raised gets the new starting purse once (never less than it has). */
function withGrant(inv: PlayerInv): PlayerInv {
  if ((inv.granted ?? 0) >= START_GOLD) return inv;
  return { ...inv, gold: Math.max(inv.gold, START_GOLD), granted: START_GOLD };
}

export const normalizeInventory = (inv: PlayerInv): PlayerInv => withSets(withGrant(withBelt(inv)));

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
