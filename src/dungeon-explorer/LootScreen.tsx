// Searching a chest or a fallen man, Dark and Darker style: what is in it on the left, the paladin's
// bag on the right, both grids where every item takes its real footprint. Drag between them, or
// right-click / double-click (double-tap) to move an item across; Take all fills the bag as far as
// it goes. Coins go straight into his purse.
import React, { useEffect, useState } from "react";
import { addItem, def, fitsAt, itemOf, placeItem, removeItem, type Grid, type ItemInst } from "./items";
import { DragGhost, GOLD, GridView, ItemTooltip, PANEL_BG, PANEL_BORDER, btn, useItemDrag, type DragFrom, type DragState, type DropTarget, type Icons } from "./itemsUi";
import { intoPurse, type PlayerInv } from "./playerInv";

export interface LootScreenProps {
  title: string;
  subtitle: string;
  container: Grid;
  onContainer: (g: Grid) => void;
  inv: PlayerInv;
  onInv: (inv: PlayerInv) => void;
  icons: Icons;
  viewport: { w: number; h: number };
  compact: boolean;
  touch: boolean;
  onClose: () => void;
}

export const LootScreen: React.FC<LootScreenProps> = ({ title, subtitle, container, onContainer, inv, onInv, icons, viewport, compact, touch, onClose }) => {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** Into his bag (at a cell, or the first gap); coins into the purse. */
  const take = (item: ItemInst, at?: { x: number; y: number }): boolean => {
    if (def(item.id).category === "coins") {
      onInv(intoPurse(inv, item));
      onContainer(removeItem(container, item.uid));
      return true;
    }
    const bag = at ? (fitsAt(inv.bag, item.id, at.x, at.y) ? placeItem(inv.bag, item, at.x, at.y) : null) : addItem(inv.bag, item);
    if (!bag) {
      setToast(at ? "It doesn't fit there" : "No room in your bag");
      return false;
    }
    onInv({ ...inv, bag });
    onContainer(removeItem(container, item.uid));
    return true;
  };

  /** Back into the chest (at a cell, or the first gap). */
  const stash = (item: ItemInst, at?: { x: number; y: number }) => {
    const g = at ? (fitsAt(container, item.id, at.x, at.y) ? placeItem(container, item, at.x, at.y) : null) : addItem(container, item);
    if (!g) return setToast(at ? "It doesn't fit there" : "No room in there");
    onContainer(g);
    onInv({ ...inv, bag: removeItem(inv.bag, item.uid) });
  };

  const drop = (d: DragState, t: DropTarget) => {
    if (!t || t.kind !== "grid" || d.from.kind !== "grid") return;
    const from = d.from.grid;
    if (from === t.grid) {
      const g = from === "loot" ? container : inv.bag;
      if (!fitsAt(g, d.item.id, t.x, t.y, d.item.uid)) return setToast("It doesn't fit there");
      if (from === "loot") onContainer(placeItem(container, d.item, t.x, t.y));
      else onInv({ ...inv, bag: placeItem(inv.bag, d.item, t.x, t.y) });
    } else if (t.grid === "bag") take(d.item, t);
    else stash(d.item, t);
  };

  const quick = (item: ItemInst, from: DragFrom) => {
    if (from.kind !== "grid") return;
    if (from.grid === "loot") take(item);
    else stash(item);
  };

  const dnd = useItemDrag(drop, quick);

  const takeAll = () => {
    let bag = inv.bag;
    let gold = inv.gold;
    let left = container;
    let full = false;
    for (const p of container.items) {
      if (def(p.item.id).category === "coins") {
        gold += p.item.qty ?? 1;
        left = removeItem(left, p.item.uid);
        continue;
      }
      const b = addItem(bag, p.item);
      if (b) {
        bag = b;
        left = removeItem(left, p.item.uid);
      } else full = true;
    }
    onInv({ ...inv, gold, bag });
    onContainer(left);
    if (full) setToast("Your bag is full");
  };

  // R takes everything.
  const takeAllRef = React.useRef(takeAll);
  takeAllRef.current = takeAll;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && !e.repeat) takeAllRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cell size: both grids side by side (or stacked on narrow screens) inside the view.
  const { w: vw, h: vh } = viewport;
  const cols = container.w + inv.bag.w;
  const cell = compact
    ? Math.max(18, Math.min(40, Math.floor((vw - 36) / Math.max(container.w, inv.bag.w)), Math.floor((vh - 190) / (container.h + inv.bag.h))))
    : Math.max(20, Math.min(52, Math.floor((vw - 120) / cols), Math.floor((vh - 200) / Math.max(container.h, inv.bag.h))));

  const value = container.items.reduce((a, p) => a + itemOf(p.item).value * (p.item.qty ?? 1), 0);
  const hover = dnd.hover;
  const panel = (label: string, right: React.ReactNode, body: React.ReactNode) => (
    <div style={{ background: PANEL_BG, border: PANEL_BORDER, padding: "12px 14px", pointerEvents: "auto", alignSelf: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#8f8676" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#6e675b" }}>{right}</div>
      </div>
      {body}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 16,
        display: "flex",
        flexDirection: "column",
        color: "#eee6d4",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35), rgba(0,0,0,0.75))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: compact ? "8px 12px" : "12px 20px", background: "linear-gradient(180deg, rgba(8,7,6,0.95), rgba(8,7,6,0.7))", borderBottom: PANEL_BORDER }}>
        <div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: compact ? 18 : 22, color: "#f3e6c4" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#8f8676" }}>{subtitle}</div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: toast ? "#ff9a8a" : "#6e675b" }}>{toast || (touch ? "Double-tap to move an item across" : "Right-click to move an item across")}</span>
        <button type="button" onClick={takeAll} disabled={!container.items.length} style={{ ...btn, fontWeight: 800, color: container.items.length ? "#1a1408" : "#6e675b", background: container.items.length ? "linear-gradient(180deg, #f2d27a, #c99a3a)" : btn.background }}>
          {touch ? "Take all" : "Take all (R)"}
        </button>
        <button type="button" onClick={onClose} style={btn}>
          {touch ? "Close" : "Close (E)"}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: compact ? "column" : "row", gap: compact ? 10 : 24, alignItems: compact ? "center" : "flex-start", justifyContent: "center", padding: compact ? 10 : 24, overflow: "auto" }}>
        {panel(
          title.toUpperCase(),
          container.items.length ? `${container.items.length} item${container.items.length === 1 ? "" : "s"} · ${value} gold` : "Empty",
          <GridView id="loot" grid={container} cell={cell} icons={icons} dnd={dnd} />
        )}
        {panel(
          "YOUR BAG",
          <span>
            <b style={{ color: GOLD }}>{inv.gold}</b> gold · {inv.bag.items.reduce((a, p) => a + def(p.item.id).weight, 0).toFixed(1)} kg
          </span>,
          <GridView id="bag" grid={inv.bag} cell={cell} icons={icons} dnd={dnd} />
        )}
      </div>
      <DragGhost drag={dnd.drag} icons={icons} />
      {hover && !dnd.drag && !touch ? <ItemTooltip item={hover.item} hint={hover.from.kind === "grid" && hover.from.grid === "loot" ? "Right-click to take · Drag to move" : "Right-click to put it in · Drag to move"} x={hover.x} y={hover.y} /> : null}
    </div>
  );
};
