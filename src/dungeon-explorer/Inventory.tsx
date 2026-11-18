// The inventory screen (Tab), laid out like an extraction-dungeon game's: stats on the left, the
// paladin in the middle between the slots he wears, and a grid bag on the right where every item
// takes up its real footprint. Items move by drag and drop (mouse or finger); right-click, or a
// double-click / double-tap, puts a piece on or takes it off, and drinks or eats what can be used.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RARITY, arrowsIn, def, fitsAt, itemOf, placeItem, removeItem, type GearSlot, type ItemInst } from "./items";
import { DragGhost, GOLD, GridView, ItemIcon, ItemTooltip, PANEL_BG, PANEL_BORDER, btn, useItemDrag, type DragFrom, type DragState, type DropTarget, type Icons } from "./itemsUi";
import { ATTRIBUTES, ATTRIBUTE_INFO, statLines, type Attributes, type Stats } from "./stats";
import { BAG_H, BAG_W, BELT_SLOTS, allItems, beltable, equipFromBag, fromBelt, sortBag, toBelt, unequipToBag, type PlayerInv } from "./playerInv";

export { ITEMS, RARITY } from "./items";

/** A screen rectangle in CSS pixels (where the 3D view frames the paladin). */
export interface FrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Head to waist (and the sword and bow) on his left; what goes over and under, the legs (and the
// shield) on his right.
const LEFT: GearSlot[] = ["helm", "gorget", "pauldrons", "cuirass", "arms", "gauntlets", "waist", "sword", "bow"];
const RIGHT: GearSlot[] = ["cape", "tabard", "mail", "doublet", "cuisses", "greaves", "sabatons", "shield"];
const WEAPONS: GearSlot[] = ["sword", "shield", "bow"];
/** The rows in the tallest column (the slots are sized to fit it). */
const ROWS = LEFT.length;
const SLOT_KIND: Record<GearSlot, string> = {
  bow: "Ranged",
  helm: "Head",
  gorget: "Neck",
  cuirass: "Chest",
  pauldrons: "Shoulders",
  arms: "Arms",
  gauntlets: "Hands",
  waist: "Waist",
  cuisses: "Thighs",
  greaves: "Shins",
  sabatons: "Feet",
  mail: "Mail",
  doublet: "Under",
  cape: "Back",
  tabard: "Over",
  sword: "Main hand",
  shield: "Off hand",
};

export interface InventoryScreenProps {
  name: string;
  /** His class's name (Fighter). */
  heroClass: string;
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
  onClose: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ name, heroClass, stats: sheet, base, inv, onInv, onUse, icons, viewport, compact, touch, onModelRect, onClose }) => {
  const [toast, setToast] = useState<string | null>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const quick = (item: ItemInst, from: DragFrom) => {
    const d = def(item.id);
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
      const next = equipFromBag(inv, item.uid);
      if (next) onInv(next);
      else setToast("No room in the bag for what you are wearing");
    } else if (d.heal) onUse(item);
  };

  const drop = (d: DragState, t: DropTarget) => {
    if (!t) return;
    const it = def(d.item.id);
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
    if (d.from.kind !== "grid") return;
    if (t.kind === "body" || (t.kind === "slot" && t.slot === it.slot)) {
      if (!it.slot) return setToast(it.heal ? "Right-click it to use it" : `The ${it.name.toLowerCase()} isn't something to wear`);
      const next = equipFromBag(inv, d.item.uid);
      if (next) onInv(next);
      else setToast("No room in the bag for what you are wearing");
    } else if (t.kind === "slot") setToast(it.slot ? `The ${it.name.toLowerCase()} goes in the ${it.kind.toLowerCase()} slot` : `The ${it.name.toLowerCase()} isn't something to wear`);
  };

  const dnd = useItemDrag(drop, quick);
  const drag = dnd.drag;

  // Sizes: eight slots tall in each column; the bag takes about two fifths of the width.
  const { w: vw, h: vh } = viewport;
  const wide = !compact && vw >= 1100;
  const topBar = compact ? 44 : 54;
  const slot = compact
    ? Math.max(30, Math.min(58, Math.floor((vw - 24 - 8 * 5) / 9)))
    : Math.max(28, Math.min(70, Math.floor((vh - topBar - 36) / ROWS) - 7));
  const cell = compact
    ? Math.max(20, Math.min(42, Math.floor((vw - 28) / BAG_W)))
    : Math.max(18, Math.min(50, Math.floor(Math.min((vw * (wide ? 0.36 : 0.44) - 30) / BAG_W, (vh - topBar - (wide ? 90 : 170)) / BAG_H))));

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
  const bowInst = inv.equipped.bow;
  const swordInst = inv.equipped.sword;
  const shieldInst = inv.equipped.shield;
  const weight = wornSlots.reduce((a, s) => a + wornDef(s).weight, 0);
  const carried = inv.bag.items.reduce((a, p) => a + def(p.item.id).weight, 0);
  const stats: Array<[string, string]> = [
    ["Health", String(sheet.maxHealth)],
    ["Armor rating", `${sheet.armorRating} (${Math.round(sheet.physicalReduction * 100)}%)`],
    ["Magic resist", `${Math.round(sheet.magicResist)} (${Math.round(sheet.magicalReduction * 100)}%)`],
    ["Worn weight", `${weight.toFixed(1)} kg`],
    ["Bag weight", `${carried.toFixed(1)} kg`],
    ["Main hand", swordInst ? `${Math.round(sheet.swordDamage)} dmg` : "Fists"],
    ["Off hand", shieldInst ? `${itemOf(shieldInst).block}% block` : "Empty"],
    ["Ranged", bowInst ? `${Math.round(sheet.bowDamage)} dmg · ${arrowsIn(inv.bag)} arrows` : "Empty"],
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

  const SlotBox = (s: GearSlot) => {
    const item = inv.equipped[s];
    const it = item ? itemOf(item) : null;
    const target = drag !== null && drag.from.kind === "grid" && def(drag.item.id).slot === s;
    const weapon = WEAPONS.indexOf(s) !== -1;
    return (
      <div
        key={s}
        data-drop={`slot:${s}`}
        {...(item ? dnd.bind(item, { kind: "slot", slot: s }, cell) : {})}
        title={item ? undefined : `${SLOT_KIND[s]}: empty`}
        style={{
          position: "relative",
          width: slot,
          height: slot,
          boxSizing: "border-box",
          borderRadius: 3,
          background: it ? `radial-gradient(circle at 50% 40%, ${RARITY[it.rarity].color}22, rgba(18,16,14,0.95) 70%)` : "rgba(14,13,12,0.9)",
          border: target
            ? `2px solid ${GOLD}`
            : it
              ? `1px solid ${RARITY[it.rarity].color}70`
              : weapon
                ? "1px solid rgba(214,186,128,0.3)"
                : "1px solid rgba(214,186,128,0.14)",
          boxShadow: target ? "0 0 0 3px rgba(255,216,77,0.22), inset 0 0 14px rgba(255,216,77,0.3)" : "inset 0 0 10px rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: item ? "grab" : "default",
          opacity: drag && item && drag.item.uid === item.uid ? 0.3 : 1,
          touchAction: "none",
        }}
      >
        <ItemIcon id={item ? item.id : s === "bow" ? "recurve_bow" : s} icons={icons} w={slot - 8} h={slot - 8} ghost={!item} />
        {!item ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 2, fontSize: 9, color: "#6b6355", textAlign: "center", letterSpacing: "0.04em", textTransform: "uppercase", pointerEvents: "none" }}>
            {SLOT_KIND[s]}
          </div>
        ) : null}
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
            const s = def(p.item.id).slot;
            if (s && !next.equipped[s]) next = equipFromBag(next, p.item.uid) ?? next;
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
        {toast || (touch ? "Double-tap to equip, unequip or use" : "Right-click to equip, unequip or use")}
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
      <div style={{ fontSize: compact ? 15 : 18, fontWeight: 800, letterSpacing: "0.2em", color: "#e8d9b0" }}>INVENTORY</div>
      <div style={{ fontSize: 12, color: "#8f8676" }}>
        <span style={{ color: GOLD, fontWeight: 700 }}>{name || heroClass}</span> · {heroClass}
      </div>
      <div style={{ flex: 1 }} />
      <button type="button" onClick={onClose} style={btn}>
        {touch ? "Close" : "Close (Tab)"}
      </button>
    </div>
  );

  // The paladin's space: the 3D view frames him here. It lets the pointer through to the canvas
  // (drag to spin him) except while a bag piece is dragged, when it takes the drop.
  const takingDrop = drag !== null && drag.from.kind === "grid";
  const modelSpace = (
    <div
      ref={modelRef}
      data-drop="body"
      style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        pointerEvents: takingDrop ? "auto" : "none",
        outline: takingDrop ? "2px dashed rgba(255,216,77,0.45)" : "none",
        outlineOffset: -8,
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", fontSize: 11, color: takingDrop ? GOLD : "rgba(220,210,190,0.45)" }}>
        {takingDrop && drag ? `Drop on him to put on the ${def(drag.item.id).name.toLowerCase()}` : touch ? "Drag to turn him" : "Drag to turn him · Scroll to zoom"}
      </div>
    </div>
  );

  const column = (slots: GearSlot[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center", pointerEvents: "auto" }}>
      {slots.map((s, i) => (
        <React.Fragment key={s}>
          {WEAPONS.indexOf(s) >= 0 && (i === 0 || WEAPONS.indexOf(slots[i - 1]) < 0) ? <div style={{ height: 4 }} /> : null}
          {SlotBox(s)}
        </React.Fragment>
      ))}
    </div>
  );

  const Bag = <GridView id="bag" grid={inv.bag} cell={cell} icons={icons} dnd={dnd} />;

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
      <div style={{ fontSize: 11, color: "#6e675b" }}>{touch ? "Tap the slots on the bar to use" : "Keys 3 and 4 use them"}</div>
    </div>
  );

  const hover = dnd.hover;
  const hint = hover
    ? hover.from.kind === "belt"
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
    <div style={{ position: "fixed", inset: 0, zIndex: 16, display: "flex", flexDirection: "column", color: "#eee6d4", fontFamily: "system-ui, sans-serif", userSelect: "none", pointerEvents: "none" }}>
      {header}
      {compact ? (
        <>
          {modelSpace}
          <div
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
            <div style={{ height: 10 }} />
            {Attrs}
            {StatsStrip}
            <div style={{ display: "flex", justifyContent: "center" }}>{Bag}</div>
            {Belt}
            {BagButtons}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14, padding: "14px 18px 16px" }}>
          {wide ? (
            <div style={{ width: 230, flex: "0 0 230px", alignSelf: "flex-start", background: PANEL_BG, border: PANEL_BORDER, padding: "14px 16px", pointerEvents: "auto" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{name || heroClass}</div>
              <div style={{ fontSize: 12, color: "#8f8676", marginBottom: 12 }}>{heroClass} · Sell-sword of the Wayfarer's Rest</div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginBottom: 4 }}>ATTRIBUTES</div>
              {Attrs}
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginBottom: 2 }}>STATS</div>
              {Derived}
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "10px 0 2px" }}>CARRYING</div>
              {StatsRows.slice(3)}
            </div>
          ) : null}
          {column(LEFT)}
          {modelSpace}
          {column(RIGHT)}
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
      )}

      <DragGhost drag={drag} icons={icons} />
      {hover && !drag && !touch ? <ItemTooltip item={hover.item} hint={hint} x={hover.x} y={hover.y} /> : null}
    </div>
  );
};

// Kept for screens that only want to drop an item back (a removed piece goes to the first free cell).
export const removeFromBag = (inv: PlayerInv, uid: string): PlayerInv => ({ ...inv, bag: removeItem(inv.bag, uid) });
