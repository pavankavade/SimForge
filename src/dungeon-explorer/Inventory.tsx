// The inventory screen (Tab), laid out like an extraction-dungeon game's: stats on the left, the
// paladin in the middle between the slots he wears (armour on his left: head, chest, gloves, legs,
// boots; on his right the cloak, necklace and two rings), the two weapon sets under him, and a grid
// bag on the right where every item takes up its real footprint. Items move by drag and drop (mouse or finger); right-click, or a
// double-click / double-tap, puts a piece on or takes it off, and drinks or eats what can be used.
// The lobby's Stash tab is this same screen with the room's chests beside him: drag between the
// chests, the bag, the belt and his slots (a chest piece dropped on him is put on straight away).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ClassId } from "./classes";
import { ARMOR_TYPE, RARITY, SLOT_LABEL, addItem, arrowsIn, def, fitsAt, handOf, isWeaponSlot, itemOf, placeItem, removeItem, wearableBy, type GearSlot, type Grid, type ItemInst, type WeaponSlot } from "./items";
import { DragGhost, GOLD, GridView, ItemIcon, ItemTooltip, PANEL_BG, PANEL_BORDER, btn, useItemDrag, type DragFrom, type DragState, type DropTarget, type Icons } from "./itemsUi";
import { ATTRIBUTES, ATTRIBUTE_INFO, statLines, type Attributes, type Stats } from "./stats";
import { BAG_H, BAG_W, BELT_SLOTS, allItems, beltable, equipFromBag, equipFromGrid, fromBelt, intoPurse, slotFor, sortBag, toBelt, unequipToBag, type PlayerInv } from "./playerInv";


/** A screen rectangle in CSS pixels (where the 3D view frames the paladin). */
export interface FrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// The armour head to foot on his left; the cloak and the jewellery on his right.
const LEFT: GearSlot[] = ["head", "chest", "hands", "legs", "feet"];
const RIGHT: GearSlot[] = ["cloak", "necklace", "ring1", "ring2"];
/** The two weapon sets (keys 1 and 2), each a main hand and an off hand, under his picture. */
const SETS: Array<[WeaponSlot, WeaponSlot]> = [
  ["main1", "off1"],
  ["main2", "off2"],
];
/** The rows in the tallest column (the slots are sized to fit it). */
const ROWS = LEFT.length;
/** The faint picture an empty slot shows (a piece that goes there). */
const PLACEHOLDER: Record<GearSlot, string> = {
  head: "great_helm",
  chest: "plate_armour",
  hands: "plate_gauntlets",
  legs: "plate_legs",
  feet: "plate_boots",
  cloak: "adventurer_cloak",
  necklace: "bear_pendant",
  ring1: "ring_courage",
  ring2: "ring_courage",
  main1: "sword",
  off1: "shield",
  main2: "sword",
  off2: "shield",
};
/** Under each slot box: its name (shorter on a phone, where the boxes are small). */
const CAPTION = 13;
const SHORT: Partial<Record<GearSlot, string>> = { necklace: "Neck", hands: "Hands", main1: "Main", off1: "Off", main2: "Main", off2: "Off" };

/** The stash beside him (the lobby's Stash tab): one room's chests, each its own grid. */
export interface StashView {
  /** The room tabs over the chests. */
  tabs: React.ReactNode;
  /** The room's chests top to bottom (ids other than "bag"); none when the room isn't his. */
  chests: Array<{ id: string; label: string; grid: Grid }>;
  /** Shown instead of the chests when the room isn't his (its rent). */
  locked?: React.ReactNode;
  /** Over the chests: the room's name and what is in it. */
  title: string;
  summary: string;
  /** Write changed chests back (a move between two chests changes both). */
  onChests: (changes: Array<[string, Grid]>) => void;
}

export interface InventoryScreenProps {
  name: string;
  /** His class's name (Fighter), and the class itself (what he may wear). */
  heroClass: string;
  cls: ClassId;
  /** His stats now (class base plus gear) and the class's base attributes (stats.ts). */
  stats: Stats;
  base: Attributes;
  inv: PlayerInv;
  onInv: (inv: PlayerInv) => void;
  /** Drink or eat an item from the bag (it is used up). */
  onUse: (item: ItemInst) => void;
  icons: Icons;
  viewport: { w: number; h: number };
  /** Portrait or narrow: the paladin on top, the slots and bag in a sheet below. */
  compact: boolean;
  touch: boolean;
  /** Where the paladin stands on screen (the 3D view frames him there). */
  onModelRect: (r: FrameRect) => void;
  /** Drag across his picture to turn him, scroll on it to zoom (desktop). */
  onTurn: (dx: number) => void;
  onZoom: (dy: number) => void;
  /** A piece dragged out of the window: it is dropped on the ground at his feet. */
  onGround: (item: ItemInst) => void;
  /** Open as the Stash tab: the room's chests beside him, and nothing drops on the floor. */
  stash?: StashView;
  /** Space kept clear at the top (the lobby's tab bar), in px. */
  top?: number;
  onClose: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ name, heroClass, cls, stats: sheet, base, inv, onInv, onUse, icons, viewport, compact, touch, onModelRect, onTurn, onZoom, onGround, stash, top = 0, onClose }) => {
  const [toast, setToast] = useState<string | null>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ---- The stash's chests ----

  const chestGrid = (id: string): Grid | null => {
    const c = stash ? stash.chests.find((k) => k.id === id) : undefined;
    return c ? c.grid : null;
  };

  /** Out of a chest into the bag (at a cell, or the first gap); coins into his purse. */
  const takeFromChest = (s: StashView, chest: string, item: ItemInst, at?: { x: number; y: number }) => {
    const g = chestGrid(chest);
    if (!g) return;
    if (def(item.id).category === "coins") {
      onInv(intoPurse(inv, item));
      s.onChests([[chest, removeItem(g, item.uid)]]);
      return;
    }
    const bag = at ? (fitsAt(inv.bag, item.id, at.x, at.y) ? placeItem(inv.bag, item, at.x, at.y) : null) : addItem(inv.bag, item);
    if (!bag) return setToast(at ? "It doesn't fit there" : "No room in your bag");
    onInv({ ...inv, bag });
    s.onChests([[chest, removeItem(g, item.uid)]]);
  };

  /** Into a chest (at a cell, or the first gap) from the bag, another chest, his body or the belt. */
  const putInChest = (s: StashView, chest: string, item: ItemInst, from: DragFrom, at?: { x: number; y: number }) => {
    const g = chestGrid(chest);
    if (!g) return;
    const same = from.kind === "grid" && from.grid === chest;
    const next = at ? (fitsAt(g, item.id, at.x, at.y, same ? item.uid : undefined) ? placeItem(g, item, at.x, at.y) : null) : addItem(g, item);
    if (!next) return setToast(at ? "It doesn't fit there" : "That chest is full");
    if (from.kind === "grid" && from.grid !== "bag") {
      const was = same ? null : chestGrid(from.grid);
      s.onChests(was ? [[from.grid, removeItem(was, item.uid)], [chest, next]] : [[chest, next]]);
      return;
    }
    s.onChests([[chest, next]]);
    if (from.kind === "grid") onInv({ ...inv, bag: removeItem(inv.bag, item.uid) });
    else if (from.kind === "slot") {
      const equipped = { ...inv.equipped };
      delete equipped[from.slot];
      onInv({ ...inv, equipped });
    } else {
      const belt = inv.belt.slice();
      belt[from.index] = null;
      onInv({ ...inv, belt });
    }
  };

  /** A chest piece dropped on him or on a slot: put on; what it replaces goes into that chest. */
  const wearFromChest = (s: StashView, chest: string, item: ItemInst, target?: GearSlot) => {
    const it = def(item.id);
    const g = chestGrid(chest);
    if (!g) return;
    if (!it.slot) return setToast(it.heal ? "Put it in the bag or on the belt first" : `The ${it.name.toLowerCase()} isn't something to wear`);
    if (!wearableBy(item.id, cls)) return setToast(cantWear(item.id));
    if (target && slotFor(inv, item.id, target, cls) !== target) return setToast(`The ${it.name.toLowerCase()} goes in the ${it.kind.toLowerCase()} slot`);
    const r = equipFromGrid(inv, g, item.uid, target, cls);
    if (!r) return setToast("No room in the chest for what you are wearing");
    onInv(r.inv);
    s.onChests([[chest, r.from]]);
  };

  /** A drag that starts or ends at a chest; false when it is an ordinary inventory move. */
  const stashDrop = (s: StashView, d: DragState, t: DropTarget): boolean => {
    if (t && t.kind === "ground") {
      setToast("Nothing to drop it on here: keep it in a chest or sell it");
      return true;
    }
    if (t && t.kind === "grid" && t.grid !== "bag") {
      putInChest(s, t.grid, d.item, d.from, t);
      return true;
    }
    if (d.from.kind !== "grid" || d.from.grid === "bag") return false;
    const chest = d.from.grid;
    if (!t) return true;
    if (t.kind === "grid") takeFromChest(s, chest, d.item, t);
    else if (t.kind === "slot") wearFromChest(s, chest, d.item, t.slot);
    else if (t.kind === "body") wearFromChest(s, chest, d.item);
    else if (t.kind === "belt") {
      // Through the bag onto the belt (what was on the belt goes into the bag).
      const g = chestGrid(chest);
      const bag = beltable(d.item.id) ? addItem(inv.bag, d.item) : null;
      const next = bag ? toBelt({ ...inv, bag }, d.item.uid, t.index) : null;
      if (!beltable(d.item.id)) setToast(`The ${def(d.item.id).name.toLowerCase()} doesn't go on the belt`);
      else if (!next || !g) setToast("No room in the bag");
      else {
        onInv(next);
        s.onChests([[chest, removeItem(g, d.item.uid)]]);
      }
    }
    return true;
  };

  const quick = (item: ItemInst, from: DragFrom) => {
    const d = def(item.id);
    // At the stash a right-click moves a piece between the chests and the bag.
    if (stash && from.kind === "grid") {
      if (from.grid !== "bag") return takeFromChest(stash, from.grid, item);
      if (!stash.chests.length) return setToast("Rent this room to use its chests");
      const room = stash.chests.find((c) => addItem(c.grid, item));
      if (room) putInChest(stash, room.id, item, from);
      else setToast("This room's chests are full");
      return;
    }
    if (from.kind === "belt") {
      const next = fromBelt(inv, from.index);
      if (next) onInv(next);
      else setToast("No room in the bag");
      return;
    }
    if (from.kind === "slot") {
      const next = unequipToBag(inv, from.slot);
      if (next) onInv(next);
      else setToast("No room in the bag");
      return;
    }
    if (d.slot) {
      if (!wearableBy(item.id, cls)) return setToast(cantWear(item.id));
      const next = equipFromBag(inv, item.uid, undefined, cls);
      if (next) onInv(next);
      else setToast("No room in the bag for what you are wearing");
    } else if (d.heal) onUse(item);
  };
  const cantWear = (id: string) => `A ${heroClass.toLowerCase()} can't wear ${ARMOR_TYPE[def(id).armorType ?? "cloth"].label.toLowerCase()}`;

  const drop = (d: DragState, t: DropTarget) => {
    if (stash && stashDrop(stash, d, t)) return;
    if (!t) return;
    const it = def(d.item.id);
    if (t.kind === "ground") {
      // Out of the window: off him (or out of the bag or belt) and onto the floor.
      if (d.from.kind === "grid") onInv({ ...inv, bag: removeItem(inv.bag, d.item.uid) });
      else if (d.from.kind === "slot") {
        const equipped = { ...inv.equipped };
        delete equipped[d.from.slot];
        onInv({ ...inv, equipped });
      } else {
        const belt = inv.belt.slice();
        belt[d.from.index] = null;
        onInv({ ...inv, belt });
      }
      onGround(d.item);
      setToast(`Dropped the ${it.name.toLowerCase()}`);
      return;
    }
    if (t.kind === "belt") {
      if (d.from.kind === "belt") {
        const belt = inv.belt.slice();
        const a = d.from.index;
        [belt[a], belt[t.index]] = [belt[t.index], belt[a]];
        return onInv({ ...inv, belt });
      }
      if (d.from.kind !== "grid") return setToast("Only draughts, bandages and food go on the belt");
      if (!beltable(d.item.id)) return setToast(`The ${it.name.toLowerCase()} doesn't go on the belt`);
      const next = toBelt(inv, d.item.uid, t.index);
      if (next) onInv(next);
      else setToast("No room in the bag for what was on the belt");
      return;
    }
    if (t.kind === "grid") {
      if (d.from.kind === "belt") {
        const next = fromBelt(inv, d.from.index, t);
        if (next) onInv(next);
        else setToast("It doesn't fit there");
        return;
      }
      if (!fitsAt(inv.bag, d.item.id, t.x, t.y, d.item.uid)) return setToast("It doesn't fit there");
      if (d.from.kind === "slot") {
        const next = unequipToBag(inv, d.from.slot, t);
        if (next) onInv(next);
      } else onInv({ ...inv, bag: placeItem(inv.bag, d.item, t.x, t.y) });
      return;
    }
    // A weapon moved from one set to the other (the two swap if they can).
    if (d.from.kind === "slot" && t.kind === "slot" && isWeaponSlot(d.from.slot) && isWeaponSlot(t.slot) && d.from.slot !== t.slot) {
      const a = d.from.slot;
      const b = t.slot;
      const fits = (id: string, s: WeaponSlot) => slotFor(inv, id, s) === s && !(handOf(id) === "both" && inv.equipped[(s.startsWith("main") ? "off" : "main") + s.slice(-1) as WeaponSlot]);
      if (!fits(d.item.id, b)) return setToast(`The ${it.name.toLowerCase()} doesn't go in that hand`);
      const other = inv.equipped[b];
      if (other && !fits(other.id, a)) return setToast("Those two can't swap hands");
      const equipped = { ...inv.equipped, [b]: d.item };
      if (other) equipped[a] = other;
      else delete equipped[a];
      return onInv({ ...inv, equipped });
    }
    // The two rings swap places.
    if (d.from.kind === "slot" && t.kind === "slot" && d.from.slot !== t.slot && (d.from.slot === "ring1" || d.from.slot === "ring2") && (t.slot === "ring1" || t.slot === "ring2")) {
      const equipped = { ...inv.equipped, [t.slot]: d.item };
      const other = inv.equipped[t.slot];
      if (other) equipped[d.from.slot] = other;
      else delete equipped[d.from.slot];
      return onInv({ ...inv, equipped });
    }
    if (d.from.kind !== "grid") return;
    if (it.slot && (t.kind === "body" || t.kind === "slot") && !wearableBy(d.item.id, cls)) return setToast(cantWear(d.item.id));
    const target = t.kind === "slot" ? slotFor(inv, d.item.id, t.slot, cls) : null;
    if (t.kind === "body" || (t.kind === "slot" && target === t.slot)) {
      if (!it.slot) return setToast(it.heal ? "Right-click it to use it" : `The ${it.name.toLowerCase()} isn't something to wear`);
      const next = equipFromBag(inv, d.item.uid, t.kind === "slot" ? t.slot : undefined, cls);
      if (next) onInv(next);
      else setToast("No room in the bag for what you are wearing");
    } else if (t.kind === "slot") setToast(it.slot ? `The ${it.name.toLowerCase()} goes in the ${it.kind.toLowerCase()} slot` : `The ${it.name.toLowerCase()} isn't something to wear`);
  };

  const dnd = useItemDrag(drop, quick);
  const drag = dnd.drag;

  // Sizes. On a desktop the inventory is a panel docked on the right over the live game (which
  // keeps playing to its left): the slot columns round his picture, then the bag; the full stat
  // sheet joins on the left when the window is wide enough. Phones keep the sheet along the bottom.
  // Under the lobby's tab bar the screen is shorter; at the stash the chests take the stat sheet's place.
  const vw = viewport.w;
  const vh = viewport.h - top;
  const wide = !compact && vw >= 1700 && !stash;
  const chestW = stash ? (stash.chests[0]?.grid.w ?? 10) : 0;
  const topBar = compact ? 44 : 46;
  const slot = compact
    ? Math.max(30, Math.min(58, Math.floor((vw - 24 - 8 * 5) / 9)))
    : Math.max(36, Math.min(72, Math.floor((vh - topBar - 90) / (ROWS + 1.6)) - 10 - CAPTION));
  const portraitW = Math.max(150, Math.min(250, Math.round(slot * 3.4)));
  const bagBudget = (stash ? vw * 0.95 - 50 : vw * 0.8) - (2 * slot + portraitW + (wide ? 250 : 0) + 90);
  const cell = compact
    ? Math.max(20, Math.min(42, Math.floor((vw - 28) / Math.max(BAG_W, chestW))))
    : Math.max(18, Math.min(44, Math.floor(Math.min(bagBudget / (BAG_W + chestW), (vh - topBar - (wide ? 110 : 190)) / BAG_H))));

  // Tell the 3D view where he stands.
  useLayoutEffect(() => {
    const el = modelRef.current;
    if (!el) return;
    const send = () => {
      const r = el.getBoundingClientRect();
      onModelRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onModelRect, compact, wide, vw, vh, slot, cell]);

  // ---- Stats ----

  const wornSlots = (Object.keys(inv.equipped) as GearSlot[]).filter((s) => inv.equipped[s]);
  const wornDef = (s: GearSlot) => def((inv.equipped[s] as ItemInst).id);
  const armor = wornSlots.reduce((a, s) => a + (wornDef(s).armor ?? 0), 0);
  const setLine = (n: 1 | 2) => {
    const main = inv.equipped[n === 1 ? "main1" : "main2"];
    const off = inv.equipped[n === 1 ? "off1" : "off2"];
    const names = [main, off].filter((x): x is ItemInst => !!x).map((x) => def(x.id).name);
    const bow = main && handOf(main.id) === "both" ? ` · ${arrowsIn(inv.bag)} arrows` : "";
    return names.length ? names.join(" + ") + bow : "Empty";
  };
  const weight = wornSlots.reduce((a, s) => a + wornDef(s).weight, 0);
  const carried = inv.bag.items.reduce((a, p) => a + def(p.item.id).weight, 0);
  const stats: Array<[string, string]> = [
    ["Health", String(sheet.maxHealth)],
    ["Armor rating", `${sheet.armorRating} (${Math.round(sheet.physicalReduction * 100)}% PDR)`],
    ["Magic resist", `${Math.round(sheet.magicResist)} (${Math.round(sheet.magicalReduction * 100)}% MDR)`],
    ["Projectile red.", `${Math.round(sheet.projectileReduction * 100)}%`],
    ["Headshot red.", `${Math.round(sheet.headshotReduction * 100)}%`],
    ["Worn weight", `${weight.toFixed(1)} kg`],
    ["Bag weight", `${carried.toFixed(1)} kg`],
    ["Set 1", setLine(1)],
    ["Set 2", setLine(2)],
    ["Gold", String(inv.gold)],
  ];
  void allItems;
  void armor;
  // The seven attributes: what he has, and how much of it his gear gives.
  const Attrs = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
      {ATTRIBUTES.map((k) => {
        const gear = sheet.attributes[k] - base[k];
        return (
          <div key={k} title={`${ATTRIBUTE_INFO[k].name}: ${ATTRIBUTE_INFO[k].does}`} style={{ textAlign: "center", padding: "4px 0", border: "1px solid rgba(214,186,128,0.14)", borderRadius: 3, background: "rgba(10,9,8,0.6)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "#8f8676" }}>{ATTRIBUTE_INFO[k].short}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: gear > 0 ? "#7fd88a" : gear < 0 ? "#ff8a7a" : "#f1ead9", fontVariantNumeric: "tabular-nums" }}>{sheet.attributes[k]}</div>
          </div>
        );
      })}
    </div>
  );
  const Derived = statLines(sheet).map(([k, v]) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid rgba(214,186,128,0.06)" }}>
      <span style={{ color: "#a69c88" }}>{k}</span>
      <span style={{ color: "#f1ead9", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  ));

  // ---- Parts ----

  // While a piece is dragged from the bag, every slot says what it would do with it: gold where it
  // goes, red where it would go but his class can't wear it, faded where it doesn't go at all.
  const dragging = drag !== null && drag.from.kind !== "belt" && def(drag.item.id).slot !== undefined ? drag.item : null;
  const slotState = (s: GearSlot): "fits" | "blocked" | "other" | null => {
    if (!dragging) return null;
    if (drag?.from.kind === "slot" && drag.from.slot === s) return null;
    const ring = def(dragging.id).slot === "ring" && (s === "ring1" || s === "ring2");
    if (slotFor(inv, dragging.id, s) === s || ring) return wearableBy(dragging.id, cls) ? "fits" : "blocked";
    return "other";
  };

  const SlotBox = (s: GearSlot) => {
    const item = inv.equipped[s];
    // An off hand beside a bow: the bow takes both hands (shown faded, nothing goes there).
    const partner = isWeaponSlot(s) && s.startsWith("off") ? inv.equipped[`main${s.slice(-1)}` as WeaponSlot] : undefined;
    const bothHands = !item && !!partner && handOf(partner.id) === "both";
    const it = item ? itemOf(item) : null;
    const state = slotState(s);
    const col = it ? RARITY[it.rarity].color : null;
    const label = bothHands ? (compact ? "Both" : "Both hands") : compact ? SHORT[s] ?? SLOT_LABEL[s] : SLOT_LABEL[s];
    return (
      <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: state === "other" ? 0.35 : 1 }}>
        <div
          data-drop={`slot:${s}`}
          {...(item ? dnd.bind(item, { kind: "slot", slot: s }, cell) : {})}
          title={item ? undefined : `${label}: empty`}
          style={{
            position: "relative",
            width: slot,
            height: slot,
            boxSizing: "border-box",
            borderRadius: 4,
            overflow: "hidden",
            background: it ? `radial-gradient(circle at 50% 38%, ${col}30, rgba(18,16,14,0.96) 72%)` : "linear-gradient(180deg, rgba(26,23,20,0.95), rgba(12,11,10,0.95))",
            border:
              state === "fits"
                ? `2px solid ${GOLD}`
                : state === "blocked"
                  ? "2px solid #e6463c"
                  : it
                    ? `1px solid ${col}90`
                    : "1px solid rgba(214,186,128,0.22)",
            boxShadow:
              state === "fits"
                ? "0 0 0 3px rgba(255,216,77,0.22), inset 0 0 16px rgba(255,216,77,0.3)"
                : state === "blocked"
                  ? "inset 0 0 16px rgba(230,70,60,0.35)"
                  : "inset 0 0 12px rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: item ? "grab" : "default",
            touchAction: "none",
          }}
        >
          <div style={{ opacity: drag && item && drag.item.uid === item.uid ? 0.3 : 1, display: "flex" }}>
            <ItemIcon id={item ? item.id : bothHands && partner ? partner.id : PLACEHOLDER[s]} icons={icons} w={slot - 10} h={slot - 10} ghost={!item} />
          </div>
          {/* The rarity, as a strip along the bottom; the armour weight in the corner. */}
          {it ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: col ?? undefined, opacity: 0.85, pointerEvents: "none" }} /> : null}
          {it?.armorType ? (
            <div style={{ position: "absolute", right: 3, top: 2, fontSize: 9, fontWeight: 800, color: "#d8c9a8", opacity: 0.75, pointerEvents: "none" }}>{ARMOR_TYPE[it.armorType].label[0]}</div>
          ) : null}
          {state === "blocked" ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#ff6a5a", textShadow: "0 1px 3px #000", pointerEvents: "none" }}>×</div>
          ) : null}
        </div>
        <div
          style={{
            height: CAPTION,
            maxWidth: compact ? slot + 4 : slot + 14,
            fontSize: compact ? 8.5 : 9.5,
            lineHeight: `${CAPTION}px`,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: state === "fits" ? GOLD : state === "blocked" ? "#ff7a6a" : it ? "#bdb29c" : "#6b6355",
            pointerEvents: "none",
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  const BagButtons = (
    <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" style={btn} onClick={() => onInv(sortBag(inv))}>
        Sort
      </button>
      <button
        type="button"
        style={btn}
        onClick={() => {
          // Put on the first piece in the bag for every empty slot.
          let next = inv;
          for (const p of inv.bag.items) {
            const s = slotFor(next, p.item.id, undefined, cls);
            if (s && !next.equipped[s]) next = equipFromBag(next, p.item.uid, s, cls) ?? next;
          }
          onInv(next);
        }}
      >
        Equip all
      </button>
      <button
        type="button"
        style={btn}
        onClick={() => {
          let next = inv;
          for (const s of wornSlots) next = unequipToBag(next, s) ?? next;
          if (wornSlots.some((s) => next.equipped[s])) setToast("The bag is full");
          onInv(next);
        }}
      >
        Unequip all
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 11, color: toast ? "#ff9a8a" : "#6e675b", minHeight: 14 }}>
        {toast || (stash ? (touch ? "Double-tap to move between the bag and the chests" : "Drag onto him to equip · Right-click to move across") : touch ? "Double-tap to equip, unequip or use" : "Right-click to equip, unequip or use")}
      </div>
    </div>
  );

  const StatsRows = stats.map(([k, v]) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(214,186,128,0.08)" }}>
      <span style={{ color: "#a69c88" }}>{k}</span>
      <span style={{ color: k === "Gold" ? GOLD : "#f1ead9", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  ));

  const StatsStrip = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 12px", marginBottom: 10 }}>
      {stats.map(([k, v]) => (
        <div key={k} style={{ fontSize: 11, color: "#a69c88", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {k} <span style={{ color: k === "Gold" ? GOLD : "#f1ead9", fontVariantNumeric: "tabular-nums" }}>{v}</span>
        </div>
      ))}
    </div>
  );

  // On a desktop the header sits over the docked panel only (the game shows to its left).
  void topBar;
  const header = (
    <div
      style={{
        height: topBar,
        flex: `0 0 ${topBar}px`,

        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: compact ? "0 12px" : "0 20px",
        background: "linear-gradient(180deg, rgba(8,7,6,0.95), rgba(8,7,6,0.7))",
        borderBottom: PANEL_BORDER,
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontSize: compact ? 15 : 18, fontWeight: 800, letterSpacing: "0.2em", color: "#e8d9b0" }}>{stash ? "STASH" : "INVENTORY"}</div>
      <div style={{ fontSize: 12, color: "#8f8676" }}>
        <span style={{ color: GOLD, fontWeight: 700 }}>{name || heroClass}</span> · {heroClass}
      </div>
      <div style={{ flex: 1 }} />
      <button type="button" onClick={onClose} style={btn}>
        {touch || stash ? "Close" : "Close (Tab)"}
      </button>
    </div>
  );

  // The paladin's space: the 3D view frames him here. It lets the pointer through to the canvas
  // (drag to spin him) except while a bag piece is dragged, when it takes the drop.
  const takingDrop = drag !== null && drag.from.kind === "grid";
  // Desktop: his own picture (the game draws it into this box). Phones: an open space over the live
  // game, where he stands in the world.
  const turnRef = useRef<{ id: number; x: number } | null>(null);
  const modelSpace = (
    <div
      ref={modelRef}
      data-drop="body"
      onPointerDown={(e) => {
        if (compact || e.button !== 0) return;
        turnRef.current = { id: e.pointerId, x: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const t = turnRef.current;
        if (!t || t.id !== e.pointerId || drag) return;
        onTurn(e.clientX - t.x);
        t.x = e.clientX;
      }}
      onPointerUp={() => {
        turnRef.current = null;
      }}
      onWheel={(e) => {
        if (!compact) onZoom(e.deltaY);
      }}
      style={{
        position: "relative",
        ...(compact
          ? { flex: 1, minWidth: 0, minHeight: 0, pointerEvents: takingDrop ? "auto" : "none" }
          : { width: portraitW, flex: `0 0 ${portraitW}px`, alignSelf: "stretch", pointerEvents: "auto", cursor: "grab", border: PANEL_BORDER, boxShadow: "inset 0 0 30px rgba(0,0,0,0.85)" }),
        outline: takingDrop ? "2px dashed rgba(255,216,77,0.45)" : "none",
        outlineOffset: -8,
        touchAction: "none",
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", fontSize: 11, color: takingDrop ? GOLD : "rgba(220,210,190,0.45)" }}>
        {takingDrop && drag ? `Drop on him to put on the ${def(drag.item.id).name.toLowerCase()}` : compact ? "" : "Drag to turn him · Scroll to zoom"}
      </div>
    </div>
  );

  const column = (slots: GearSlot[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", pointerEvents: "auto" }}>
      {slots.map((s) => (
        <React.Fragment key={s}>{SlotBox(s)}</React.Fragment>
      ))}
    </div>
  );

  // Weapon set 1 (key 1) and set 2 (key 2): a main hand and an off hand each (a bow takes both).
  const WeaponSets = (
    <div style={{ display: "flex", justifyContent: "center", gap: compact ? 10 : 18, padding: compact ? "6px 0" : "8px 10px", background: compact ? "transparent" : PANEL_BG, border: compact ? "none" : PANEL_BORDER, borderTop: "none", pointerEvents: "auto" }}>
      {SETS.map(([m, o], i) => (
        <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "3px 6px 0", border: "1px solid rgba(214,186,128,0.16)", borderRadius: 4, background: "rgba(0,0,0,0.25)" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: GOLD, fontWeight: 800 }}>
            SET {i + 1} <span style={{ color: "#6e675b", fontWeight: 600 }}>· {touch ? "tap" : "key"} {i + 1}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {SlotBox(m)}
            {SlotBox(o)}
          </div>
        </div>
      ))}
    </div>
  );

  const Bag = <GridView id="bag" grid={inv.bag} cell={cell} icons={icons} dnd={dnd} cls={cls} />;

  // The room's chests, under its tabs (they scroll inside the panel when they don't fit).
  const StashPanel = stash ? (
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        background: PANEL_BG,
        border: PANEL_BORDER,
        pointerEvents: "auto",
        ...(compact ? { marginBottom: 10 } : { alignSelf: "flex-start", maxHeight: vh - topBar - 30 }),
      }}
    >
      {stash.tabs}
      <div style={{ padding: compact ? "8px 8px" : "10px 14px", overflowY: compact ? undefined : drag ? "hidden" : "auto", overflowX: "hidden", scrollbarGutter: compact ? undefined : "stable", minHeight: 0 }}>
        {stash.chests.length ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#8f8676" }}>{stash.title}</div>
              <div style={{ fontSize: 11, color: "#6e675b" }}>{stash.summary}</div>
            </div>
            {stash.chests.map((c, k) => (
              <div key={c.id} style={{ marginBottom: k < stash.chests.length - 1 ? 6 : 0 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6e675b", margin: "2px 0 3px" }}>{c.label}</div>
                <div style={{ display: "flex", justifyContent: compact ? "center" : "flex-start" }}>
                  <GridView id={c.id} grid={c.grid} cell={cell} icons={icons} dnd={dnd} cls={cls} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ width: chestW * cell + 2, maxWidth: "100%", minHeight: 220, display: "flex" }}>{stash.locked}</div>
        )}
      </div>
    </div>
  ) : null;

  // The belt: two slots for what he uses in a hurry (keys 3 and 4).
  const beltSize = Math.max(34, Math.min(54, cell + 10));
  const Belt = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676" }}>BELT</div>
      {Array.from({ length: BELT_SLOTS }, (_, i) => {
        const item = (inv.belt || [])[i] ?? null;
        const it = item ? itemOf(item) : null;
        const target = drag !== null && drag.from.kind !== "slot" && beltable(drag.item.id);
        return (
          <div
            key={i}
            data-drop={`belt:${i}`}
            {...(item ? dnd.bind(item, { kind: "belt", index: i }, cell) : {})}
            title={item ? undefined : `Belt slot ${i + 3}: empty`}
            style={{
              position: "relative",
              width: beltSize,
              height: beltSize,
              boxSizing: "border-box",
              borderRadius: 3,
              background: it ? `radial-gradient(circle at 50% 40%, ${RARITY[it.rarity].color}22, rgba(18,16,14,0.95) 70%)` : "rgba(14,13,12,0.9)",
              border: target ? `2px solid ${GOLD}` : "1px solid rgba(214,186,128,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: item ? "grab" : "default",
              opacity: drag && item && drag.item.uid === item.uid ? 0.3 : 1,
              touchAction: "none",
            }}
          >
            {item ? <ItemIcon id={item.id} icons={icons} w={beltSize - 10} h={beltSize - 10} /> : null}
            <div style={{ position: "absolute", left: 3, top: 1, fontSize: 10, fontWeight: 800, color: "#d8c9a8", pointerEvents: "none" }}>{i + 3}</div>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "#6e675b" }}>{touch ? "Tap the slots on the bar to use" : "Keys 3 and 4 use them · WASD still walks"}</div>
    </div>
  );

  const hover = dnd.hover;
  const hint = hover
    ? stash && hover.from.kind === "grid"
      ? hover.from.grid !== "bag"
        ? def(hover.item.id).slot
          ? "Right-click to take it · Drag onto him to put it on"
          : "Right-click to take it · Drag to move"
        : def(hover.item.id).slot
          ? "Right-click to stash it · Drag onto him to put it on"
          : "Right-click to stash it · Drag to move"
      : stash && hover.from.kind === "slot"
      ? "Right-click to take it off · Drag to a chest to store it"
      : hover.from.kind === "belt"
      ? "Right-click to put it back in the bag · Drag to move"
      : hover.from.kind === "slot"
      ? "Right-click to take it off · Drag to move"
      : def(hover.item.id).slot
        ? "Right-click to put it on · Drag to move"
        : def(hover.item.id).heal
          ? "Right-click to use · Drag to move"
          : "Drag to move · Sell it at the market"
    : undefined;

  return (
    <div
      style={{
        position: "fixed",
        top,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 16,
        display: "flex",
        flexDirection: "column",
        ...(compact ? {} : { alignItems: "center", justifyContent: "center" }),
        color: "#eee6d4",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {compact ? header : null}
      {compact ? (
        <>
          {modelSpace}
          <div
            data-drop="panel"
            style={{
              flex: "0 0 auto",
              maxHeight: "60%",
              overflowY: drag ? "hidden" : "auto",
              overscrollBehavior: "contain",
              background: PANEL_BG,
              borderTop: PANEL_BORDER,
              padding: "10px 12px max(10px, env(safe-area-inset-bottom))",
              pointerEvents: "auto",
              touchAction: "pan-y",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: `repeat(9, ${slot}px)`, gap: 5, justifyContent: "center" }}>
              {LEFT.concat(RIGHT).map((s) => SlotBox(s))}
            </div>
            {WeaponSets}
            <div style={{ height: 10 }} />
            {Attrs}
            {StatsStrip}
            {StashPanel}
            <div style={{ display: "flex", justifyContent: "center" }}>{Bag}</div>
            {Belt}
            {BagButtons}
          </div>
        </>
      ) : (
        // The window, centred over the live game; drag a piece out of it to drop it on the ground.
        <div data-drop="panel" style={{ display: "flex", flexDirection: "column", maxWidth: "98vw", maxHeight: vh - 12, pointerEvents: "auto", boxShadow: "0 18px 60px rgba(0,0,0,0.65)" }}>
        {header}
        <div style={{ display: "flex", gap: 8, padding: "8px 10px 10px", alignItems: "flex-start", background: "rgba(8,7,6,0.35)" }}>
          {wide ? (
            <div style={{ width: 230, flex: "0 0 230px", alignSelf: "flex-start", background: PANEL_BG, border: PANEL_BORDER, padding: "14px 16px", pointerEvents: "auto" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{name || heroClass}</div>
              <div style={{ fontSize: 12, color: "#8f8676", marginBottom: 12 }}>{heroClass} · Sell-sword of the Wayfarer's Rest</div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginBottom: 4 }}>ATTRIBUTES</div>
              {Attrs}
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginBottom: 2 }}>STATS</div>
              {Derived}
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "10px 0 2px" }}>CARRYING</div>
              {StatsRows.slice(5)}
            </div>
          ) : null}
          {StashPanel}
          <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
            <div style={{ display: "flex", gap: 0, height: ROWS * (slot + CAPTION + 8) + 20 }}>
              <div style={{ background: PANEL_BG, border: PANEL_BORDER, borderRight: "none", padding: "8px 8px", display: "flex" }}>{column(LEFT)}</div>
              {modelSpace}
              <div style={{ background: PANEL_BG, border: PANEL_BORDER, borderLeft: "none", padding: "8px 8px", display: "flex" }}>{column(RIGHT)}</div>
            </div>
            {WeaponSets}
          </div>
          <div style={{ flex: "0 0 auto", alignSelf: "flex-start", background: PANEL_BG, border: PANEL_BORDER, padding: "12px 14px", pointerEvents: "auto" }}>
            {!wide ? Attrs : null}
            {!wide ? StatsStrip : null}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676" }}>BAG</div>
              <div style={{ fontSize: 11, color: "#6e675b" }}>
                {BAG_W} × {BAG_H}
              </div>
            </div>
            {Bag}
            {Belt}
            {BagButtons}
          </div>
        </div>
        </div>
      )}

      <DragGhost drag={drag} icons={icons} />
      {hover && !drag && !touch ? <ItemTooltip item={hover.item} hint={hint} x={hover.x} y={hover.y} cls={cls} /> : null}
    </div>
  );
};

// Kept for screens that only want to drop an item back (a removed piece goes to the first free cell).
export const removeFromBag = (inv: PlayerInv, uid: string): PlayerInv => ({ ...inv, bag: removeItem(inv.bag, uid) });
