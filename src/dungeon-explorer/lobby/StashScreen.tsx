// The lobby's Stash tab, Dark and Darker style: the gear screen (his picture between the slots he
// wears, the weapon sets, the bag and belt) with his room's stash beside it (a tab per room upstairs
// at the Guild Tavern; its three chests stacked into one column). Drag between any of them: a chest
// piece dropped on him is put on, a worn piece dropped in a chest is stored. Right-click / double-tap
// sends an item between the bag and the chests. Rooms not yet rented show their rent instead.
import React, { useState } from "react";
import { InventoryScreen, type InventoryScreenProps } from "../Inventory";
import { itemOf, type Grid } from "../items";
import { btn } from "../itemsUi";
import { CHESTS_PER_ROOM, ROOMS } from "../town/layout";
import { withStash, type TownSave } from "../town/townSave";

const serif = "Georgia, 'Times New Roman', serif";
const goldBtn: React.CSSProperties = { ...btn, fontWeight: 800, color: "#1a1408", background: "linear-gradient(180deg, #f2d27a, #c99a3a)", border: "1px solid #f2d27a" };

export type StashScreenProps = Omit<InventoryScreenProps, "stash" | "top" | "onGround"> & {
  /** Space kept clear at the top for the lobby's tab bar. */
  top: number;
  town: TownSave;
  setTown: (f: (t: TownSave) => TownSave) => void;
  onRent: (room: number) => void;
};

const chestId = (k: number) => `chest${k}`;
const chestOf = (id: string) => (id.startsWith("chest") ? Number(id.slice(5)) : -1);

export const StashScreen: React.FC<StashScreenProps> = ({ top, town, setTown, onRent, ...gear }) => {
  const firstRented = Math.max(0, town.rented.indexOf(true));
  const [room, setRoom] = useState(firstRented);
  const open = !!town.rented[room];
  const chests = town.stash[room];
  const compact = gear.compact;

  const value = open ? chests.reduce((a, g) => a + g.items.reduce((b, p) => b + itemOf(p.item).value * (p.item.qty ?? 1), 0), 0) : 0;
  const count = open ? chests.reduce((a, g) => a + g.items.length, 0) : 0;

  const tabs = (
    <div style={{ display: "flex", borderBottom: "1px solid rgba(214, 186, 128, 0.22)" }}>
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
  );

  const locked = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: 12 }}>
      <div style={{ fontFamily: serif, fontSize: 18, color: "#f3e6c4" }}>{ROOMS[room].name}</div>
      <div style={{ fontSize: 13, color: "#a99c84", maxWidth: 280, lineHeight: 1.5 }}>A room upstairs at the Guild Tavern, with {CHESTS_PER_ROOM} chests that keep what you leave in them between dives.</div>
      <button type="button" style={gear.inv.gold >= ROOMS[room].rent ? goldBtn : { ...btn, opacity: 0.5 }} onClick={() => onRent(room)}>
        Rent · {ROOMS[room].rent} gold
      </button>
    </div>
  );

  /** Write changed chests back to the room on show. */
  const onChests = (changes: Array<[string, Grid]>) => {
    for (const [id, g] of changes) {
      const k = chestOf(id);
      if (k >= 0) setTown((t) => withStash(t, room, k, g));
    }
  };

  return (
    <InventoryScreen
      {...gear}
      top={top}
      onGround={() => {}}
      stash={{
        tabs,
        chests: open ? chests.map((grid, k) => ({ id: chestId(k), label: `CHEST ${k + 1}`, grid })) : [],
        locked,
        title: ROOMS[room].name.toUpperCase(),
        summary: count ? `${count} item${count === 1 ? "" : "s"} · ${value} gold` : "Empty",
        onChests,
      }}
    />
  );
};
