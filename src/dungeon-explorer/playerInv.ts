// What the paladin carries: gold, what he wears (six armour slots, a necklace, two rings, two
// weapon sets) and a bag grid.
// Pure helpers return a new inventory, so React state stays simple. Saved between visits; the first
// time he starts in the basic kit (padding, sword, shield) with a little gold. An earlier save (a
// purse of owned slots) is carried over.
import { ARMOR_SLOTS, type ArmorEquipment, type Finishes } from "../artifacts/characters/paladin";
import type { ClassId } from "./classes";
import {
  OLD_VALUE,
  WEAPON_SLOTS,
  WEAR_SLOTS,
  WORN_SLOTS,
  addItem,
  def,
  emptyGrid,
  fitsAt,
  handOf,
  isWeaponSlot,
  migrateGrid,
  migrateItem,
  newItem,
  placeItem,
  removeItem,
  sortGrid,
  wearableBy,
  type GearSlot,
  type Grid,
  type ItemInst,
  type WeaponSlot,
} from "./items";

export const BAG_W = 12;
export const BAG_H = 8;

export interface PlayerInv {
  gold: number;
  equipped: Partial<Record<GearSlot, ItemInst>>;
  bag: Grid;
  /** The two belt slots (keys 3 and 4): a draught, a bandage, food, ready to use. */
  belt: Array<ItemInst | null>;
  /** Classes whose starting kit this save has been given (the ranger's bow and arrows). */
  kits?: string[];
  /** The starting purse this save has been given (older saves are topped up to it once). */
  granted?: number;
}

export const BELT_SLOTS = 2;

/** What can go on the belt: anything that heals when used. */
export const beltable = (id: string) => !!def(id).heal;

/** The basic kit: a gambeson on him, sword and shield as weapon set 1. */
const BASIC_KIT: Array<[GearSlot, string]> = [
  ["chest", "gambeson"],
  ["main1", "sword"],
  ["off1", "shield"],
];
export const START_GOLD = 10000;
const KEY = "simforge.explorer.inventory.v3";

function fresh(): PlayerInv {
  const equipped: PlayerInv["equipped"] = {};
  for (const [s, id] of BASIC_KIT) equipped[s] = newItem(id);
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
        return normalizeInventory({ gold: Math.max(0, Math.floor(s.gold || 0)), equipped: s.equipped || {}, bag: { w: BAG_W, h: BAG_H, items: s.bag.items }, belt: s.belt, granted: s.granted, kits: s.kits });
      }
    }
    // The purse of the first market build: the rig slots he owned, worn or in the bag.
    const old = window.localStorage.getItem("simforge.explorer.purse.v2");
    if (old) {
      const p = JSON.parse(old) as { gold?: number; owned?: Record<string, boolean> };
      const inv = { gold: Math.max(0, Math.floor(p.gold || 0)), equipped: {} as Record<string, ItemInst>, bag: emptyGrid(BAG_W, BAG_H), belt: [null, null] };
      for (const s of ARMOR_SLOTS) {
        if (!p.owned?.[s]) continue;
        const hand = s === "sword" ? "main1" : s === "shield" ? "off1" : null;
        if (wornBefore[s]) inv.equipped[hand ?? s] = newItem(s);
        else inv.bag = addItem(inv.bag, newItem(s)) ?? inv.bag;
      }
      return normalizeInventory(inv as PlayerInv);
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
/**
 * What he wears with weapon set `set` in hand. What each piece is made of rides along as `finish`
 * (finishIn reads it back), so the table, the portrait and other players see leather as leather.
 */
export function wornOf(inv: PlayerInv, set: 0 | 1 | 2 = 1): ArmorEquipment {
  const e = {} as ArmorEquipment & { finish?: Finishes };
  for (const s of ARMOR_SLOTS) e[s] = false;
  // Each armour item shows its rig pieces (plate armour: cuirass, pauldrons, arms and mail).
  for (const s of WEAR_SLOTS) {
    const it = inv.equipped[s];
    for (const piece of it ? def(it.id).shows ?? [] : []) e[piece] = true;
  }
  const h = heldOf(inv, set);
  e.sword = h.sword;
  e.shield = h.shield;
  e.finish = finishOf(inv);
  // A mace or a staff in hand is drawn on the sword's grip (mace.ts).
  const held = h.sword && h.main ? def(h.main.id).held : undefined;
  if (held) (e as ArmorEquipment & { mainHand?: "mace" | "staff" | "dagger" }).mainHand = held;
  return e;
}

/** The finish carried on a worn set (wornOf), if any; plate otherwise. */
export const finishIn = (e: ArmorEquipment): Finishes | undefined => (e as ArmorEquipment & { finish?: Finishes }).finish;

/** What each worn piece is made of (leather or cloth where such an item sits in the slot). */
export function finishOf(inv: PlayerInv): Finishes {
  const f: Finishes = {};
  for (const s of WEAR_SLOTS) {
    const it = inv.equipped[s];
    const d = it ? def(it.id) : null;
    if (d?.finish) for (const piece of d.shows ?? []) f[piece] = d.finish;
  }
  return f;
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
 * The slot a bag piece goes in: armour and a necklace in their own; a ring in the ring slot it was
 * dropped on, else the first free one; a weapon in the weapon slot it was dropped on if that hand
 * fits it, else the first set with that hand free, else set 1. Null if it is nothing to wear, or
 * (given `cls`) his class can't wear it.
 */
export function slotFor(inv: PlayerInv, id: string, target?: GearSlot, cls?: ClassId): GearSlot | null {
  const d = def(id);
  if (!d.slot) return null;
  if (cls && !wearableBy(id, cls)) return null;
  if (d.slot === "ring") {
    if (target === "ring1" || target === "ring2") return target;
    if (target) return null;
    return !inv.equipped.ring1 ? "ring1" : !inv.equipped.ring2 ? "ring2" : "ring1";
  }
  const hand = handOf(id);
  if (!hand) return target && target !== d.slot ? null : (d.slot as GearSlot);
  const fits = (s: WeaponSlot) => (hand === "off" ? s.startsWith("off") : s.startsWith("main"));
  if (target && isWeaponSlot(target)) return fits(target) ? target : null;
  const order: WeaponSlot[] = hand === "off" ? ["off1", "off2"] : ["main1", "main2"];
  return order.find((s) => !inv.equipped[s]) ?? order[0];
}

/**
 * Put a bag item on (it must be wearable). What was in that slot goes into the bag where the new
 * piece was, or anywhere it fits; with no room the swap does not happen.
 */
export function equipFromBag(inv: PlayerInv, uid: string, target?: GearSlot, cls?: ClassId): PlayerInv | null {
  const p = inv.bag.items.find((q) => q.item.uid === uid);
  const slot = p ? slotFor(inv, p.item.id, target, cls) : null;
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
  const worn = WORN_SLOTS.concat(WEAPON_SLOTS).map((s) => inv.equipped[s]).filter((x): x is ItemInst => !!x);
  const belt = (inv.belt || []).filter((x): x is ItemInst => !!x);
  return worn.concat(belt, inv.bag.items.map((p) => p.item));
}

/** A saved inventory from anywhere (the server, an older save) with a belt in place. */
/** A save from before the purse was raised gets the new starting purse once (never less than it has). */
function withGrant(inv: PlayerInv): PlayerInv {
  if ((inv.granted ?? 0) >= START_GOLD) return inv;
  return { ...inv, gold: Math.max(inv.gold, START_GOLD), granted: START_GOLD };
}

export const normalizeInventory = (inv: PlayerInv): PlayerInv => withSlots(withSets(withGrant(withBelt(inv))));

/**
 * A save from before the six armour slots: each old piece becomes the new one it matches, in its
 * new slot (or the bag, where that slot is taken); pieces now folded into a whole armour (the gorget,
 * pauldrons, mail ...) are sold back to the armourer for gold.
 */
function withSlots(inv: PlayerInv): PlayerInv {
  const eq = inv.equipped as Record<string, ItemInst | undefined>;
  const known = (WORN_SLOTS as string[]).concat(WEAPON_SLOTS);
  const stale = Object.keys(eq).filter((k) => eq[k] && (known.indexOf(k) < 0 || migrateItem(eq[k] as ItemInst) !== eq[k]));
  const bagMoved = migrateGrid(inv.bag);
  if (!stale.length && bagMoved.gold === 0 && bagMoved.grid === inv.bag) return inv;
  let gold = inv.gold + bagMoved.gold;
  let bag = bagMoved.grid;
  const next: Record<string, ItemInst | undefined> = {};
  for (const k of Object.keys(eq)) if (stale.indexOf(k) < 0) next[k] = eq[k];
  for (const k of stale) {
    const now = migrateItem(eq[k] as ItemInst);
    if (!now) {
      gold += OLD_VALUE;
      continue;
    }
    const slot = def(now.id).slot;
    const into = slot === "ring" ? (!next.ring1 ? "ring1" : "ring2") : (slot as string | undefined);
    if (into && known.indexOf(into) >= 0 && !next[into]) next[into] = now;
    else {
      const b = addItem(bag, now);
      if (b) bag = b;
      else gold += OLD_VALUE;
    }
  }
  return { ...inv, gold, bag, equipped: next as PlayerInv["equipped"] };
}

/**
 * Off with what his class can't wear (plate on a rogue, leather on a wizard): into the bag where it
 * fits. The same inventory back when nothing changes.
 */
export function fitClass(inv: PlayerInv, cls: ClassId): PlayerInv {
  let next = inv;
  for (const s of WORN_SLOTS) {
    const it = next.equipped[s];
    if (it && !wearableBy(it.id, cls)) next = unequipToBag(next, s) ?? next;
  }
  return next;
}

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

/** The bow in weapon set `set`'s main hand, if that is a bow. */
const bowSlot = (set: 0 | 1 | 2): "main1" | "main2" | null => (set === 1 ? "main1" : set === 2 ? "main2" : null);

/** Take up to `n` arrows out of the bag (smallest stacks first); how many came out. */
function takeArrows(inv: PlayerInv, n: number): { inv: PlayerInv; taken: number } {
  let left = n;
  const stacks = inv.bag.items.filter((p) => p.item.id === "arrows").sort((a, b) => (a.item.qty ?? 1) - (b.item.qty ?? 1));
  const qty = new Map<string, number>();
  for (const p of stacks) {
    if (left <= 0) break;
    const have = p.item.qty ?? 1;
    const take = Math.min(have, left);
    left -= take;
    qty.set(p.item.uid, have - take);
  }
  const items = inv.bag.items
    .filter((p) => qty.get(p.item.uid) !== 0)
    .map((p) => (qty.has(p.item.uid) ? { ...p, item: { ...p.item, qty: qty.get(p.item.uid) } } : p));
  return { inv: { ...inv, bag: { ...inv.bag, items } }, taken: n - left };
}

/** Load the bow in set `set` from the bag: up to `capacity` arrows in it. */
export function loadBow(inv: PlayerInv, set: 0 | 1 | 2, capacity: number): PlayerInv {
  const s = bowSlot(set);
  const bow = s ? inv.equipped[s] : undefined;
  if (!s || !bow) return inv;
  const want = Math.max(0, capacity - (bow.loaded ?? 0));
  const r = takeArrows(inv, want);
  return { ...r.inv, equipped: { ...r.inv.equipped, [s]: { ...bow, loaded: (bow.loaded ?? 0) + r.taken } } };
}

/** One loaded arrow leaves the bow in set `set`. */
export function shootLoaded(inv: PlayerInv, set: 0 | 1 | 2): PlayerInv {
  const s = bowSlot(set);
  const bow = s ? inv.equipped[s] : undefined;
  if (!s || !bow || !bow.loaded) return inv;
  return { ...inv, equipped: { ...inv.equipped, [s]: { ...bow, loaded: bow.loaded - 1 } } };
}

/** Arrows picked up off the floor go back into the bag (topping up stacks). */
export function addArrows(inv: PlayerInv, n: number): PlayerInv {
  if (n <= 0) return inv;
  const bag = addItem(inv.bag, newItem("arrows", n));
  return bag ? { ...inv, bag } : inv;
}

/** The cleric's wear: templar armour and a chaperon. */
const CLERIC_WEAR = ["chaperon", "templar_armour"];
const RANGER_LEATHERS = ["ranger_hood", "leather_jerkin", "leather_gloves", "leather_leggings", "leather_boots", "ranger_cloak"];

/** Each piece on where its slot is free, else into the bag. */
function wearKit(eq: PlayerInv["equipped"], bag: Grid, ids: string[]): Grid {
  for (const id of ids) {
    const slot = def(id).slot as GearSlot;
    if (!eq[slot]) eq[slot] = newItem(id);
    else bag = addItem(bag, newItem(id)) ?? bag;
  }
  return bag;
}

/**
 * A class's own starting kit, given once the first time it is played (the fighter's is the fresh
 * inventory). The ranger's short bow goes in weapon set 1 (loaded), what was there moves to set 2
 * if that is free (or the bag), sixty arrows go in the bag, and his leathers go on (or in the bag,
 * where plate is worn).
 */

export function grantClassKit(inv: PlayerInv, cls: string): PlayerInv {
  if ((inv.kits ?? []).indexOf(cls) >= 0) return inv;
  if (cls === "cleric") return clericKit(inv);
  if (cls === "wizard") return wizardKit(inv);
  if (cls === "rogue") return rogueKit(inv);
  if (cls !== "ranger") return inv;
  let next: PlayerInv = { ...inv, kits: (inv.kits ?? []).concat([cls]) };
  const eq = { ...next.equipped };
  let bag = next.bag;
  const m1 = eq.main1;
  const o1 = eq.off1;
  if (m1 || o1) {
    if (!eq.main2 && !eq.off2) {
      if (m1) eq.main2 = m1;
      if (o1) eq.off2 = o1;
    } else {
      for (const it of [m1, o1]) if (it) bag = addItem(bag, it) ?? bag;
    }
    delete eq.main1;
    delete eq.off1;
  }
  eq.main1 = { ...newItem("short_bow"), loaded: 10 };
  // His leathers: on where the slot is free, in the bag where something is already worn.
  bag = wearKit(eq, bag, RANGER_LEATHERS);
  next = { ...next, equipped: eq, bag };
  return addArrows(next, 60);
}

/** The cleric's kit: the flanged mace in set 1 (the shield stays beside it), mail and a few draughts. */
function clericKit(inv: PlayerInv): PlayerInv {
  const eq = { ...inv.equipped };
  let bag = inv.bag;
  const m1 = eq.main1;
  if (m1) {
    if (!eq.main2 && !eq.off2) eq.main2 = m1;
    else bag = addItem(bag, m1) ?? bag;
  }
  eq.main1 = newItem("flanged_mace");
  // A shield: the one already in set 2 if there is one, else a new one.
  if (!eq.off1) {
    if (eq.off2 && handOf(eq.off2.id) === "off" && !eq.main2) {
      eq.off1 = eq.off2;
      delete eq.off2;
    } else eq.off1 = newItem("shield");
  }
  bag = wearKit(eq, bag, CLERIC_WEAR);
  for (let i = 0; i < 2; i++) bag = addItem(bag, newItem("potion")) ?? bag;
  return { ...inv, kits: (inv.kits ?? []).concat(["cleric"]), equipped: eq, bag };
}

/** The wizard's cloth (on where the slot is free, else in the bag). */
const WIZARD_WEAR = ["wizard_hat", "wizard_robe", "wizard_mantle", "turnshoes"];

/**
 * The wizard's kit: the oak staff in set 1 (what was there, shield too, moves to set 2 if it is free,
 * else to the bag), his cloth and two draughts.
 */
function wizardKit(inv: PlayerInv): PlayerInv {
  const eq = { ...inv.equipped };
  let bag = inv.bag;
  const m1 = eq.main1;
  const o1 = eq.off1;
  if (m1 || o1) {
    if (!eq.main2 && !eq.off2) {
      if (m1) eq.main2 = m1;
      if (o1) eq.off2 = o1;
    } else {
      for (const it of [m1, o1]) if (it) bag = addItem(bag, it) ?? bag;
    }
    delete eq.off1;
  }
  eq.main1 = newItem("oak_staff");
  bag = wearKit(eq, bag, WIZARD_WEAR);
  for (let i = 0; i < 2; i++) bag = addItem(bag, newItem("potion")) ?? bag;
  return { ...inv, kits: (inv.kits ?? []).concat(["wizard"]), equipped: eq, bag };
}

/** The rogue's leathers (on where the slot is free, else in the bag). */
const ROGUE_WEAR = ["leather_cap", "leather_jerkin", "leather_gloves", "leather_leggings", "leather_boots", "adventurer_cloak"];

/**
 * The rogue's kit: the rondel dagger in set 1 (what was there, shield too, moves to set 2 if it is
 * free, else to the bag), his leathers and two draughts.
 */
function rogueKit(inv: PlayerInv): PlayerInv {
  const eq = { ...inv.equipped };
  let bag = inv.bag;
  const m1 = eq.main1;
  const o1 = eq.off1;
  if (m1 || o1) {
    if (!eq.main2 && !eq.off2) {
      if (m1) eq.main2 = m1;
      if (o1) eq.off2 = o1;
    } else {
      for (const it of [m1, o1]) if (it) bag = addItem(bag, it) ?? bag;
    }
    delete eq.off1;
  }
  eq.main1 = newItem("rondel_dagger");
  bag = wearKit(eq, bag, ROGUE_WEAR);
  for (let i = 0; i < 2; i++) bag = addItem(bag, newItem("potion")) ?? bag;
  return { ...inv, kits: (inv.kits ?? []).concat(["rogue"]), equipped: eq, bag };
}
