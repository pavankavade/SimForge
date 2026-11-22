// The lobby's Stash tab, Dark and Darker style: his bag on the left, his room's stash on the right (a
// tab per room upstairs at the Guild Tavern; its three chests stacked into one tall column). Drag
// between any of them, or right-click / double-tap an item to send it across. Rooms not yet rented
// show their rent instead.
import React, { useEffect, useState } from "react";
import { addItem, def, fitsAt, itemOf, placeItem, removeItem, type Grid, type ItemInst } from "../items";
import { DragGhost, GOLD, GridView, ItemTooltip, PANEL_BG, PANEL_BORDER, btn, useItemDrag, type DragFrom, type DragState, type DropTarget, type Icons } from "../itemsUi";
import { intoPurse, type PlayerInv } from "../playerInv";
import { CHESTS_PER_ROOM, ROOMS } from "../town/layout";
import { withStash, type TownSave } from "../town/townSave";

const serif = "Georgia, 'Times New Roman', serif";
const goldBtn: React.CSSProperties = { ...btn, fontWeight: 800, color: "#1a1408", background: "linear-gradient(180deg, #f2d27a, #c99a3a)", border: "1px solid #f2d27a" };

export interface StashScreenProps {
  top: number;
  town: TownSave;
  setTown: (f: (t: TownSave) => TownSave) => void;
  inv: PlayerInv;
  onInv: (inv: PlayerInv) => void;
  onRent: (room: number) => void;
  onGear: () => void;
  icons: Icons;
  viewport: { w: number; h: number };
  compact: boolean;
  touch: boolean;
}

const chestId = (k: number) => `chest${k}`;
const chestOf = (id: string) => (id.startsWith("chest") ? Number(id.slice(5)) : -1);

export const StashScreen: React.FC<StashScreenProps> = ({ top, town, setTown, inv, onInv, onRent, onGear, icons, viewport, compact, touch }) => {
  const firstRented = Math.max(0, town.rented.indexOf(true));
  const [room, setRoom] = useState(firstRented);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const open = !!town.rented[room];
  const chests = town.stash[room];
  const gridOf = (id: string): Grid => (id === "bag" ? inv.bag : chests[chestOf(id)]);

  /** Write a changed grid back: his bag, or a chest of the room on show. */
  const commit = (changes: Array<[string, Grid]>, gold = inv.gold) => {
    let bag = inv.bag;
    for (const [id, g] of changes) {
      if (id === "bag") bag = g;
      else {
        const k = chestOf(id);
        setTown((t) => withStash(t, room, k, g));
      }
    }
    if (bag !== inv.bag || gold !== inv.gold) onInv({ ...inv, bag, gold });
  };

  /** Move an item from one grid to another (at a cell, or the first gap). Coins into the bag go to his purse. */
  const move = (item: ItemInst, from: string, to: string, at?: { x: number; y: number }): boolean => {
    if (from === to) {
      if (!at) return false;
      const g = gridOf(from);
      if (!fitsAt(g, item.id, at.x, at.y, item.uid)) {
        setToast("It doesn't fit there");
        return false;
      }
      commit([[from, placeItem(g, item, at.x, at.y)]]);
      return true;
    }
    if (to === "bag" && def(item.id).category === "coins") {
      const purse = intoPurse(inv, item);
      commit([[from, removeItem(gridOf(from), item.uid)]], purse.gold);
      return true;
    }
    const g = gridOf(to);
    const next = at ? (fitsAt(g, item.id, at.x, at.y) ? placeItem(g, item, at.x, at.y) : null) : addItem(g, item);
    if (!next) {
      setToast(at ? "It doesn't fit there" : to === "bag" ? "No room in your bag" : "No room in that chest");
      return false;
    }
    commit([
      [from, removeItem(gridOf(from), item.uid)],
      [to, next],
    ]);
    return true;
  };

  const drop = (d: DragState, t: DropTarget) => {
    if (!t || t.kind !== "grid" || d.from.kind !== "grid") return;
    if (t.grid !== "bag" && !open) return;
    move(d.item, d.from.grid, t.grid, t);
  };

  /** Right-click / double-tap: bag → the first chest with room; chest → bag. */
  const quick = (item: ItemInst, from: DragFrom) => {
    if (from.kind !== "grid") return;
    if (from.grid !== "bag") {
      move(item, from.grid, "bag");
      return;
    }
    if (!open) return setToast(`Rent ${ROOMS[room].name} first`);
    for (let k = 0; k < CHESTS_PER_ROOM; k++) if (addItem(chests[k], item)) return void move(item, "bag", chestId(k));
    setToast("This room's chests are full");
  };

  const dnd = useItemDrag(drop, quick);

  // Cell size: his bag beside the room's column; the column is three chests tall and scrolls when it
  // has to (on a phone the bag sets the size).
  const { w: vw, h: vh } = viewport;
  const sw = chests[0]?.w ?? 10;
  const sh = chests[0]?.h ?? 6;
  const across = inv.bag.w + sw;
  const avail = vh - top - (compact ? 110 : 150);
  // An upright phone has no room for the two side by side: bag above, the room below, one scroll.
  const stacked = vw < vh && vw < 620;
  const cell = Math.floor(
    stacked
      ? Math.max(14, Math.min(34, (vw - 44) / Math.max(inv.bag.w, sw)))
      : Math.max(compact ? 16 : 20, Math.min(compact ? 40 : 46, (vw - (compact ? 60 : 120)) / across, compact ? avail / inv.bag.h : avail / Math.max(inv.bag.h, sh * CHESTS_PER_ROOM + 3)))
  );

  const value = open ? chests.reduce((a, g) => a + g.items.reduce((b, p) => b + itemOf(p.item).value * (p.item.qty ?? 1), 0), 0) : 0;
  const count = open ? chests.reduce((a, g) => a + g.items.length, 0) : 0;
  const hover = dnd.hover;
  const label = (text: string, right?: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#8f8676" }}>{text}</div>
      <div style={{ fontSize: 11, color: "#6e675b" }}>{right}</div>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 18,
        display: "flex",
        flexDirection: "column",
        color: "#eee6d4",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0.85))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: compact ? "6px 12px" : "10px 22px" }}>
        <div style={{ fontFamily: serif, fontSize: compact ? 18 : 24, color: "#f3e6c4" }}>Stash</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: toast ? "#ff9a8a" : "#6e675b", textAlign: "right" }}>{toast || (touch ? "Double-tap to move an item across" : "Drag, or right-click to move an item across")}</span>
        <button type="button" style={goldBtn} onClick={onGear}>
          Gear &amp; bag
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: stacked ? "column" : "row", gap: compact ? 10 : 24, justifyContent: stacked ? "flex-start" : "center", alignItems: stacked ? "center" : "stretch", padding: compact ? "0 8px 8px" : "4px 24px 22px", overflowY: stacked ? "auto" : undefined }}>
        {/* Left: what he carries. */}
        <div style={{ background: PANEL_BG, border: PANEL_BORDER, padding: compact ? "8px 8px" : "12px 14px", alignSelf: stacked ? "center" : "flex-start", maxHeight: stacked ? undefined : "100%", overflow: stacked ? undefined : "auto", flex: "0 0 auto" }}>
          {label(
            "YOUR BAG",
            <span>
              <b style={{ color: GOLD }}>{inv.gold}</b> gold
            </span>
          )}
          <GridView id="bag" grid={inv.bag} cell={cell} icons={icons} dnd={dnd} />
        </div>
        {/* Right: the room's stash, a tab per room. */}
        <div style={{ background: PANEL_BG, border: PANEL_BORDER, display: "flex", flexDirection: "column", minHeight: 0, maxHeight: stacked ? undefined : "100%", flex: stacked ? "0 0 auto" : undefined }}>
          <div style={{ display: "flex", borderBottom: PANEL_BORDER }}>
            {ROOMS.map((r, ri) => {
              const on = ri === room;
              const mine = !!town.rented[ri];
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setRoom(ri)}
                  style={{
                    flex: 1,
                    background: on ? "rgba(242,210,122,0.12)" : "rgba(0,0,0,0.3)",
                    border: "none",
                    borderBottom: on ? "2px solid #f2d27a" : "2px solid transparent",
                    color: on ? "#fff3d2" : mine ? "#cdbf9f" : "#6b6356",
                    fontFamily: serif,
                    fontSize: compact ? 12 : 14,
                    padding: compact ? "7px 8px" : "9px 14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {mine ? "" : "🔒 "}
                  {r.name}
                </button>
              );
            })}
          </div>
          <div style={{ padding: compact ? "8px 8px" : "12px 14px", overflowY: stacked ? undefined : "auto", minHeight: 0 }}>
            {open ? (
              <>
                {label(ROOMS[room].name.toUpperCase(), count ? `${count} item${count === 1 ? "" : "s"} · ${value} gold` : "Empty")}
                {chests.map((g, k) => (
                  <div key={k} style={{ marginBottom: k < chests.length - 1 ? 6 : 0 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6e675b", margin: "2px 0 3px" }}>CHEST {k + 1}</div>
                    <GridView id={chestId(k)} grid={g} cell={cell} icons={icons} dnd={dnd} />
                  </div>
                ))}
              </>
            ) : (
              <div style={{ width: sw * cell + 2, minHeight: Math.min(sh * CHESTS_PER_ROOM * cell, 360), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 18, color: "#f3e6c4" }}>{ROOMS[room].name}</div>
                <div style={{ fontSize: 13, color: "#a99c84", maxWidth: 280, lineHeight: 1.5 }}>A room upstairs at the Guild Tavern, with {CHESTS_PER_ROOM} chests that keep what you leave in them between dives.</div>
                <button type="button" style={inv.gold >= ROOMS[room].rent ? goldBtn : { ...btn, opacity: 0.5 }} onClick={() => onRent(room)}>
                  Rent · {ROOMS[room].rent} gold
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <DragGhost drag={dnd.drag} icons={icons} />
      {hover && !dnd.drag && !touch ? <ItemTooltip item={hover.item} hint={hover.from.kind === "grid" && hover.from.grid === "bag" ? "Right-click to stash it · Drag to move" : "Right-click to take it · Drag to move"} x={hover.x} y={hover.y} /> : null}
    </div>
  );
};
