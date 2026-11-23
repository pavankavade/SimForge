// Shared pieces of the item screens (inventory, loot, shop): icons, the tooltip, a grid of items and
// one drag-and-drop controller. Items move by drag (mouse or finger); right-click, double-click or a
// double-tap does the quick move the screen defines (equip, use, take, stash).
import React, { useEffect, useRef, useState } from "react";
import type { ClassId } from "./classes";
import { ARMOR_TYPE, RARITY, def, fitsAt, itemOf, wearableBy, type GearSlot, type Grid, type ItemInst } from "./items";
import { ATTRIBUTE_INFO, modLine, type AttributeId } from "./stats";

export type Icons = Record<string, string | undefined>;

export const GOLD = "#ffd84d";
export const PANEL_BG = "rgba(12, 11, 10, 0.9)";
export const PANEL_BORDER = "1px solid rgba(214, 186, 128, 0.22)";

export const btn: React.CSSProperties = {
  background: "rgba(30,27,23,0.95)",
  color: "#e8dcc0",
  border: "1px solid rgba(214,186,128,0.3)",
  borderRadius: 3,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
};

export const ItemIcon: React.FC<{ id: string; icons: Icons; w: number; h: number; ghost?: boolean }> = ({ id, icons, w, h, ghost }) => {
  const src = icons[id];
  return src ? (
    // The game UI is not a Remotion render, so a plain <img> is right here.
    // eslint-disable-next-line @remotion/warn-native-media-tag
    <img
      src={src}
      alt={def(id).name}
      draggable={false}
      style={{
        width: w,
        height: h,
        objectFit: "contain",
        display: "block",
        pointerEvents: "none",
        opacity: ghost ? 0.13 : 1,
        filter: ghost ? "grayscale(1) brightness(1.8)" : "drop-shadow(0 3px 4px rgba(0,0,0,.6))",
      }}
    />
  ) : (
    <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, lineHeight: 1.15, color: ghost ? "#4f4a42" : "#cfc6b4", textAlign: "center", pointerEvents: "none" }}>
      {def(id).name}
    </div>
  );
};

/** "Fighter, Cleric" for an armour weight. */
const whoWears = (t: keyof typeof ARMOR_TYPE): string =>
  ARMOR_TYPE[t].classes.length === 5 ? "Anyone" : ARMOR_TYPE[t].classes.map((c) => c[0].toUpperCase() + c.slice(1)).join(", ");

/** The tooltip; given `cls`, armour his class can't wear says so in red. */
export const ItemTooltip: React.FC<{ item: ItemInst; hint?: string; x: number; y: number; cls?: ClassId }> = ({ item, hint, x, y, cls }) => {
  const it = itemOf(item);
  const blocked = !!cls && !wearableBy(item.id, cls);
  const pct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
  const r = RARITY[it.rarity];
  const W = 240;
  const left = x + 18 + W > window.innerWidth ? x - 18 - W : x + 18;
  const top = Math.max(8, Math.min(window.innerHeight - 210, y - 20));
  const line = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#d8d2c4", marginTop: 3 }}>
      <span>{label}</span>
      <span style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: W,
        zIndex: 60,
        pointerEvents: "none",
        background: "rgba(10, 9, 8, 0.97)",
        border: `1px solid ${r.color}66`,
        boxShadow: `0 0 0 1px rgba(0,0,0,.6), 0 12px 30px rgba(0,0,0,.7), inset 0 0 18px ${r.color}14`,
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: r.color }}>
        {it.name}
        {item.qty ? ` × ${item.qty}` : ""}
      </div>
      <div style={{ fontSize: 11, color: "#9a917f", marginTop: 1 }}>
        {r.label} · {it.armorType ? `${ARMOR_TYPE[it.armorType].label} · ` : ""}
        {it.kind}
      </div>
      {it.armorType ? <div style={{ fontSize: 11, color: blocked ? "#ff7a6a" : "#7f7766", marginTop: 2 }}>{blocked ? `Your class can't wear ${ARMOR_TYPE[it.armorType].label.toLowerCase()}` : `Worn by: ${whoWears(it.armorType)}`}</div> : null}
      <div style={{ height: 1, background: "rgba(214,186,128,0.18)", margin: "8px 0 4px" }} />
      {it.armor ? line("Armor rating", `+${it.armor}`) : null}
      {it.magicResist ? line("Magic resistance", `+${it.magicResist}`) : null}
      {it.headshot ? line("Headshot reduction", `${it.headshot}%`) : null}
      {it.projectile ? line("Projectile reduction", `${it.projectile}%`) : null}
      {it.move ? line("Move speed", pct(it.move)) : null}
      {it.maxHealth ? line("Max health", `+${it.maxHealth}`) : null}
      {it.headshotDamage ? line("Headshot damage", `+${it.headshotDamage}%`) : null}
      {(Object.keys(it.attr ?? {}) as AttributeId[]).map((k) => (
        <React.Fragment key={k}>{line(ATTRIBUTE_INFO[k].name, `+${it.attr?.[k]}`)}</React.Fragment>
      ))}
      {it.damage ? line("Weapon damage", String(it.damage)) : null}
      {it.block ? line("Block", `${it.block}%`) : null}
      {it.heal ? line("Restores", `${it.heal} health`) : null}
      {item.mods?.length ? (
        <div style={{ margin: "6px 0 2px" }}>
          {item.mods.map((m) => (
            <div key={m[0]} style={{ fontSize: 12, color: "#8fd0ff", marginTop: 2 }}>
              {modLine(m)}
            </div>
          ))}
        </div>
      ) : null}
      {line("Weight", `${it.weight.toFixed(it.weight < 0.1 ? 2 : 1)} kg`)}
      {line("Value", `${it.value * (item.qty ?? 1)} gold`)}
      <div style={{ fontSize: 11, color: "#8f8676", fontStyle: "italic", marginTop: 8 }}>{it.note}</div>
      {hint ? <div style={{ fontSize: 10, color: "#6e675b", marginTop: 8 }}>{hint}</div> : null}
    </div>
  );
};

// ---- Drag and drop ------------------------------------------------------------------------------

export type DragFrom = { kind: "grid"; grid: string } | { kind: "slot"; slot: GearSlot } | { kind: "belt"; index: number };

export interface DragState {
  item: ItemInst;
  from: DragFrom;
  x: number;
  y: number;
  /** Where the pointer holds the piece, in px from its footprint's top-left, and the cell size it was picked at. */
  gx: number;
  gy: number;
  cell: number;
}

/**
 * Where a dragged piece lands: a grid cell, a slot, the belt, his picture, the window itself (no
 * drop), or the ground (anywhere outside the window: it is dropped at his feet).
 */
export type DropTarget =
  | { kind: "grid"; grid: string; x: number; y: number }
  | { kind: "slot"; slot: GearSlot }
  | { kind: "belt"; index: number }
  | { kind: "body" }
  | { kind: "ground" }
  | null;

/** What lies under the pointer: a grid cell (for the piece's top-left), an equipment slot or his body. */
export function dropTargetAt(d: Pick<DragState, "x" | "y" | "gx" | "gy" | "item">): DropTarget {
  const el = document.elementFromPoint(d.x, d.y) as HTMLElement | null;
  const t = el && el.closest ? (el.closest("[data-drop]") as HTMLElement | null) : null;
  const tag = t ? t.getAttribute("data-drop") || "" : "";
  if (tag.startsWith("grid:") && t) {
    const cell = Number(t.getAttribute("data-cell")) || 32;
    const w = Number(t.getAttribute("data-w")) || 1;
    const h = Number(t.getAttribute("data-h")) || 1;
    const r = t.getBoundingClientRect();
    const it = def(d.item.id);
    const x = Math.round((d.x - d.gx - r.left) / cell);
    const y = Math.round((d.y - d.gy - r.top) / cell);
    return { kind: "grid", grid: tag.slice(5), x: Math.max(0, Math.min(w - it.w, x)), y: Math.max(0, Math.min(h - it.h, y)) };
  }
  if (tag.startsWith("slot:")) return { kind: "slot", slot: tag.slice(5) as GearSlot };
  if (tag.startsWith("belt:")) return { kind: "belt", index: Number(tag.slice(5)) || 0 };
  if (tag === "body") return { kind: "body" };
  // Outside every window (the live game shows there): onto the ground.
  if (!t) return { kind: "ground" };
  return null;
}

export interface ItemDrag {
  drag: DragState | null;
  hover: { item: ItemInst; from: DragFrom; x: number; y: number } | null;
  /** Pointer handlers for an item shown at `cell` px per grid cell. */
  bind: (item: ItemInst, from: DragFrom, cell: number) => React.HTMLAttributes<HTMLDivElement>;
}

export function useItemDrag(onDrop: (d: DragState, t: DropTarget) => void, onQuick: (item: ItemInst, from: DragFrom) => void): ItemDrag {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<ItemDrag["hover"]>(null);
  const press = useRef<(DragState & { sx: number; sy: number; moved: boolean }) | null>(null);
  const lastTap = useRef<{ uid: string; t: number } | null>(null);
  const cb = useRef({ onDrop, onQuick });
  cb.current = { onDrop, onQuick };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [drag]);

  const bind = (item: ItemInst, from: DragFrom, cell: number): React.HTMLAttributes<HTMLDivElement> => ({
    onPointerDown: (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      const it = def(item.id);
      // From a grid the piece is held where it was grabbed; from his body, by its middle.
      const gx = from.kind === "grid" ? e.clientX - r.left : (it.w * cell) / 2;
      const gy = from.kind === "grid" ? e.clientY - r.top : (it.h * cell) / 2;
      press.current = { item, from, x: e.clientX, y: e.clientY, gx, gy, cell, sx: e.clientX, sy: e.clientY, moved: false };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Optional.
      }
    },
    onPointerMove: (e) => {
      const p = press.current;
      if (!p) {
        if (e.pointerType === "mouse") setHover({ item, from, x: e.clientX, y: e.clientY });
        return;
      }
      if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 5) {
        p.moved = true;
        setHover(null);
      }
      if (p.moved) setDrag({ item: p.item, from: p.from, x: e.clientX, y: e.clientY, gx: p.gx, gy: p.gy, cell: p.cell });
    },
    onPointerUp: (e) => {
      const p = press.current;
      press.current = null;
      setDrag(null);
      if (!p) return;
      if (p.moved) {
        const d: DragState = { item: p.item, from: p.from, x: e.clientX, y: e.clientY, gx: p.gx, gy: p.gy, cell: p.cell };
        // The pointer is captured by the piece: look through it for what lies under the pointer.
        const el = e.currentTarget as HTMLElement;
        const prev = el.style.pointerEvents;
        el.style.pointerEvents = "none";
        const t = dropTargetAt(d);
        el.style.pointerEvents = prev;
        cb.current.onDrop(d, t);
        return;
      }
      const now = performance.now();
      const last = lastTap.current;
      if (last && last.uid === item.uid && now - last.t < 320) {
        lastTap.current = null;
        setHover(null);
        cb.current.onQuick(item, from);
      } else lastTap.current = { uid: item.uid, t: now };
    },
    onPointerCancel: () => {
      press.current = null;
      setDrag(null);
    },
    onPointerLeave: () => setHover(null),
    onContextMenu: (e) => {
      e.preventDefault();
      setHover(null);
      cb.current.onQuick(item, from);
    },
  });

  return { drag, hover, bind };
}

/** The piece under the pointer while dragging, at the size it was picked up. */
export const DragGhost: React.FC<{ drag: DragState | null; icons: Icons }> = ({ drag, icons }) => {
  if (!drag) return null;
  const it = def(drag.item.id);
  return (
    <div
      style={{
        position: "fixed",
        left: drag.x - drag.gx,
        top: drag.y - drag.gy,
        width: it.w * drag.cell,
        height: it.h * drag.cell,
        zIndex: 55,
        pointerEvents: "none",
        background: "rgba(20,18,16,0.75)",
        border: `1px solid ${RARITY[it.rarity].color}`,
        boxShadow: "0 12px 28px rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ItemIcon id={drag.item.id} icons={icons} w={it.w * drag.cell - 4} h={it.h * drag.cell - 4} />
    </div>
  );
};

/** A grid of items: drop target `grid:<id>`, with a landing preview while something is dragged over it. */
export const GridView: React.FC<{ id: string; grid: Grid; cell: number; icons: Icons; dnd: ItemDrag; dim?: (item: ItemInst) => boolean; cls?: ClassId }> = ({ id, grid, cell, icons, dnd, dim, cls }) => {
  const pad = 1;
  const drag = dnd.drag;
  const over = drag ? dropTargetAt(drag) : null;
  const landing = over && over.kind === "grid" && over.grid === id ? over : null;
  const landingFits = drag && landing ? fitsAt(grid, drag.item.id, landing.x, landing.y, drag.from.kind === "grid" && drag.from.grid === id ? drag.item.uid : undefined) : false;
  return (
    <div
      data-drop={`grid:${id}`}
      data-cell={cell}
      data-w={grid.w}
      data-h={grid.h}
      style={{
        position: "relative",
        width: grid.w * cell + pad * 2,
        height: grid.h * cell + pad * 2,
        boxSizing: "border-box",
        background: "rgba(8,7,6,0.92)",
        border: landing ? "1px solid rgba(255,216,77,0.55)" : "1px solid rgba(214,186,128,0.2)",
        backgroundImage: "linear-gradient(rgba(214,186,128,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(214,186,128,0.09) 1px, transparent 1px)",
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${pad}px ${pad}px`,
        touchAction: "none",
        flex: "0 0 auto",
      }}
    >
      {grid.items.map((p) => {
        const it = itemOf(p.item);
        const col = RARITY[it.rarity].color;
        const faded = dim ? dim(p.item) : false;
        // Armour his class can't wear: tinted red, so it reads at a glance.
        const blocked = !!cls && !wearableBy(p.item.id, cls);
        return (
          <div
            key={p.item.uid}
            {...dnd.bind(p.item, { kind: "grid", grid: id }, cell)}
            style={{
              position: "absolute",
              left: pad + p.x * cell + 1,
              top: pad + p.y * cell + 1,
              width: it.w * cell - 2,
              height: it.h * cell - 2,
              boxSizing: "border-box",
              background: blocked ? "linear-gradient(180deg, rgba(200,50,40,0.28), rgba(40,12,10,0.92))" : `linear-gradient(180deg, ${col}1e, rgba(20,18,16,0.92))`,
              border: blocked ? "1px solid rgba(230,80,60,0.6)" : `1px solid ${col}55`,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              opacity: drag && drag.item.uid === p.item.uid ? 0.3 : faded ? 0.45 : 1,
              touchAction: "none",
            }}
          >
            <ItemIcon id={p.item.id} icons={icons} w={it.w * cell - 6} h={it.h * cell - 6} />
            {p.item.qty ? (
              <div style={{ position: "absolute", right: 2, bottom: 1, fontSize: Math.max(9, cell * 0.3), fontWeight: 800, color: "#fff2b0", textShadow: "0 1px 2px #000", pointerEvents: "none" }}>{p.item.qty}</div>
            ) : null}
          </div>
        );
      })}
      {drag && landing ? (
        <div
          style={{
            position: "absolute",
            left: pad + landing.x * cell,
            top: pad + landing.y * cell,
            width: def(drag.item.id).w * cell,
            height: def(drag.item.id).h * cell,
            boxSizing: "border-box",
            background: landingFits ? "rgba(98,211,109,0.18)" : "rgba(230,70,60,0.2)",
            border: `1px solid ${landingFits ? "#62d36d" : "#e6463c"}`,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
};
