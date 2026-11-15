// The Gear tab of the character screen: what he wears (laid out by body area) and a bag for
// everything he has taken off. Pieces move between them by drag and drop, with the mouse or a
// finger, or by a click. Dropping a piece from the bag onto the character puts it on too.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ARMOR_SLOTS, PLATE_SLOTS, type ArmorEquipment, type ArmorSlot } from "../artifacts/characters/paladin";

export const ITEMS: Record<ArmorSlot, { name: string; note: string }> = {
  helm: { name: "Great helm", note: "Closed helm with a mail aventail" },
  gorget: { name: "Gorget", note: "Steel collar over the throat" },
  cuirass: { name: "Breastplate", note: "Cuirass, backplate and plackart" },
  pauldrons: { name: "Pauldrons", note: "Domed shoulder plates" },
  arms: { name: "Arm harness", note: "Rerebraces, couters and vambraces" },
  gauntlets: { name: "Gauntlets", note: "Fingered plate gauntlets, leather palms" },
  waist: { name: "Fauld & belt", note: "Hip lames, tassets, belt and scabbard" },
  cuisses: { name: "Cuisses", note: "Thigh plates and poleyns" },
  greaves: { name: "Greaves", note: "Closed shin plates" },
  sabatons: { name: "Sabatons", note: "Laminated steel shoes" },
  mail: { name: "Mail hauberk", note: "Riveted mail shirt and chausses" },
  doublet: { name: "Arming doublet", note: "Quilted coat and hose (under the mail)" },
  cape: { name: "Cape", note: "Order cape" },
  tabard: { name: "Tabard", note: "Order tabard" },
  sword: { name: "Arming sword", note: "Main hand" },
  shield: { name: "Heater shield", note: "Off hand" },
};

const AREAS: Array<[string, ArmorSlot[]]> = [
  ["Head", ["helm", "gorget"]],
  ["Body", ["cuirass", "pauldrons", "mail", "doublet"]],
  ["Arms", ["arms", "gauntlets"]],
  ["Legs", ["waist", "cuisses", "greaves", "sabatons"]],
  ["Over & in hand", ["cape", "tabard", "sword", "shield"]],
];

const LOADOUTS: Array<[string, (cur: ArmorEquipment) => ArmorEquipment]> = [
  ["Full plate", (c) => withPlate(c, true, true)],
  ["No helm", (c) => withPlate(c, true, false)],
  ["Doublet", (c) => ({ ...withPlate(c, false, false), doublet: true })],
  ["Unarmoured", (c) => withPlate(c, false, false)],
];

function withPlate(c: ArmorEquipment, plate: boolean, helm: boolean): ArmorEquipment {
  const e: ArmorEquipment = { ...c };
  for (const s of PLATE_SLOTS) e[s] = plate;
  e.helm = plate && helm;
  e.mail = plate;
  e.cape = plate;
  e.tabard = plate;
  e.doublet = false;
  return e;
}

const GOLD = "#ffd84d";
const BAG_CELLS = 16;

interface Drag {
  slot: ArmorSlot;
  from: "worn" | "bag";
  x: number;
  y: number;
}

export interface InventoryProps {
  equipment: ArmorEquipment;
  onEquipment: (e: ArmorEquipment) => void;
  /** Rendered pictures of the pieces (PNG data URLs); a name stands in until they arrive. */
  icons: Partial<Record<ArmorSlot, string>>;
  /** The screen area outside the panel, where the character stands (a drop target). */
  viewRect: { left: number; top: number; width: number; height: number };
  /** Width of one cell (four to a row). */
  cell: number;
}

const Icon: React.FC<{ slot: ArmorSlot; icon?: string; size: number; ghost?: boolean }> = ({ slot, icon, size, ghost }) =>
  icon ? (
    // The game UI is not a Remotion render, so a plain <img> is right here.
    // eslint-disable-next-line @remotion/warn-native-media-tag
    <img
      src={icon}
      alt={ITEMS[slot].name}
      draggable={false}
      style={{
        width: size,
        height: size,
        display: "block",
        pointerEvents: "none",
        opacity: ghost ? 0.16 : 1,
        filter: ghost ? "grayscale(1) brightness(1.6)" : "drop-shadow(0 3px 4px rgba(0,0,0,.55))",
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: ghost ? "#4b5560" : "#c3ccd5",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {ITEMS[slot].name}
    </div>
  );

export const Inventory: React.FC<InventoryProps> = ({ equipment, onEquipment, icons, viewRect, cell }) => {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [flash, setFlash] = useState<ArmorSlot | null>(null);
  const press = useRef<{ slot: ArmorSlot; from: "worn" | "bag"; x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 450);
    return () => window.clearTimeout(t);
  }, [flash]);

  const set = (slot: ArmorSlot, on: boolean) => {
    if (equipment[slot] !== on) onEquipment({ ...equipment, [slot]: on });
    setFlash(slot);
  };

  // Drop where the pointer is: its own slot or the character puts it on, the bag takes it off.
  const drop = (d: Drag) => {
    const el = document.elementFromPoint(d.x, d.y);
    const target = el && (el as HTMLElement).closest ? ((el as HTMLElement).closest("[data-drop]") as HTMLElement | null) : null;
    const where = target ? target.getAttribute("data-drop") || "" : "";
    if (d.from === "bag" && (where === "body" || where === `slot:${d.slot}`)) set(d.slot, true);
    else if (d.from === "worn" && where === "bag") set(d.slot, false);
  };

  const handlers = (slot: ArmorSlot, from: "worn" | "bag") => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      press.current = { slot, from, x: e.clientX, y: e.clientY, moved: false };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is optional; window events still end the drag.
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) p.moved = true;
      if (p.moved) setDrag({ slot: p.slot, from: p.from, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = press.current;
      press.current = null;
      if (!p) return;
      if (p.moved) drop({ slot: p.slot, from: p.from, x: e.clientX, y: e.clientY });
      // A click (no drag) swaps it between the body and the bag.
      else set(p.slot, p.from === "bag");
      setDrag(null);
    },
    onPointerCancel: () => {
      press.current = null;
      setDrag(null);
    },
  });

  const bag = ARMOR_SLOTS.filter((s) => !equipment[s]);

  return (
    <div style={{ position: "relative", touchAction: "none" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d9aa6", margin: "12px 0 7px" }}>Loadout</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {LOADOUTS.map(([label, fn]) => (
          <button
            key={label}
            type="button"
            onClick={() => onEquipment(fn(equipment))}
            style={{ background: "#161b23", color: "#c3ccd5", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "6px 9px", fontSize: 12, cursor: "pointer" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* What he wears, by body area. */}
      {AREAS.map(([area, slots]) => (
        <div key={area}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d9aa6", margin: "12px 0 6px" }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${cell}px)`, gap: 6 }}>
            {slots.map((slot) => {
              const worn = equipment[slot];
              const target = drag !== null && drag.from === "bag" && drag.slot === slot;
              return (
                <div
                  key={slot}
                  data-drop={`slot:${slot}`}
                  title={`${ITEMS[slot].name}: ${ITEMS[slot].note}${worn ? " (drag to the bag or click to take off)" : ""}`}
                  {...(worn ? handlers(slot, "worn") : {})}
                  style={{
                    width: cell,
                    height: cell + 16,
                    borderRadius: 8,
                    background: worn ? "linear-gradient(180deg,#232a35,#161b23)" : "#10141a",
                    border: target
                      ? `2px solid ${GOLD}`
                      : flash === slot
                        ? "1px solid rgba(255,216,77,0.8)"
                        : worn
                          ? "1px solid rgba(255,255,255,0.16)"
                          : "1px dashed rgba(255,255,255,0.14)",
                    boxShadow: target ? "0 0 0 3px rgba(255,216,77,0.2), inset 0 0 14px rgba(255,216,77,0.25)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 3,
                    boxSizing: "border-box",
                    cursor: worn ? "grab" : "default",
                    opacity: drag && drag.from === "worn" && drag.slot === slot ? 0.35 : 1,
                  }}
                >
                  <Icon slot={slot} icon={icons[slot]} size={cell - 12} ghost={!worn} />
                  <div style={{ fontSize: 10, color: worn ? "#d6dde4" : "#5d6873", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: cell - 6 }}>
                    {ITEMS[slot].name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* The bag: everything he is not wearing. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 6px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d9aa6" }}>Bag</div>
        <div style={{ fontSize: 10, color: "#6f7c88" }}>{bag.length ? "Drag onto him or its slot to put on" : "Drag pieces here to take them off"}</div>
      </div>
      <div
        data-drop="bag"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(4, ${cell}px)`,
          gap: 6,
          padding: 6,
          margin: -6,
          borderRadius: 10,
          background: drag && drag.from === "worn" ? "rgba(255,216,77,0.07)" : "transparent",
          outline: drag && drag.from === "worn" ? "1px dashed rgba(255,216,77,0.55)" : "none",
        }}
      >
        {Array.from({ length: Math.max(BAG_CELLS, bag.length) }).map((_, i) => {
          const slot = bag[i];
          return (
            <div
              key={slot || `empty-${i}`}
              title={slot ? `${ITEMS[slot].name}: ${ITEMS[slot].note} (drag onto him or click to put on)` : undefined}
              {...(slot ? handlers(slot, "bag") : {})}
              style={{
                width: cell,
                height: cell,
                borderRadius: 8,
                background: slot ? "linear-gradient(180deg,#2a2419,#17140f)" : "#0d1015",
                border: slot ? "1px solid rgba(255,216,77,0.22)" : "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: slot ? "grab" : "default",
                opacity: slot && drag && drag.from === "bag" && drag.slot === slot ? 0.35 : 1,
              }}
            >
              {slot ? <Icon slot={slot} icon={icons[slot]} size={cell - 10} /> : null}
            </div>
          );
        })}
      </div>

      {/* While a piece from the bag is dragged, the character's side of the screen takes it too.
          (Portalled to the page: the panel's backdrop blur would make "fixed" relative to it.) */}
      {drag && drag.from === "bag"
        ? createPortal(<div
          data-drop="body"
          style={{
            position: "fixed",
            left: viewRect.left,
            top: viewRect.top,
            width: viewRect.width,
            height: viewRect.height,
            zIndex: 17,
            border: "2px dashed rgba(255,216,77,0.45)",
            borderRadius: 16,
            boxSizing: "border-box",
            background: "rgba(255,216,77,0.04)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 24,
            color: GOLD,
            fontSize: 13,
            pointerEvents: "auto",
          }}
        >
          Drop on him to put on the {ITEMS[drag.slot].name.toLowerCase()}
        </div>, document.body)
        : null}

      {/* The piece under the pointer. */}
      {drag
        ? createPortal(<div
          style={{
            position: "fixed",
            left: drag.x - 36,
            top: drag.y - 36,
            width: 72,
            height: 72,
            zIndex: 30,
            pointerEvents: "none",
            borderRadius: 10,
            background: "rgba(20,24,31,0.85)",
            border: `1px solid ${GOLD}`,
            boxShadow: "0 10px 26px rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon slot={drag.slot} icon={icons[drag.slot]} size={64} />
        </div>, document.body)
        : null}
    </div>
  );
};
