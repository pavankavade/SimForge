// The Esc menu: back to the game, the inventory, the character screen (who is under the armour),
// and the dungeon options. The world keeps running behind it; only the paladin stops listening.
import React from "react";

export interface PauseMenuProps {
  dungeonName: string;
  touch: boolean;
  onResume: () => void;
  onInventory: () => void;
  onCharacter: () => void;
  onNewSeed: () => void;
  onTheme: () => void;
  themeLabel: string;
  rooms: number;
  onRooms: (n: number) => void;
  firstPerson: boolean;
  onCamera: () => void;
  showMap: boolean;
  onMap: () => void;
  backHref?: string;
}

const GOLD = "#ffd84d";

const Big: React.FC<{ onClick: () => void; hint?: string; accent?: boolean; children: React.ReactNode }> = ({ onClick, hint, accent, children }) => (
  <button
    type="button"
    onClick={(e) => {
      // Drop focus so Space (jump) does not press it again after the menu closes.
      e.currentTarget.blur();
      onClick();
    }}
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      background: accent ? "linear-gradient(180deg, rgba(255,216,77,0.16), rgba(255,216,77,0.06))" : "rgba(30,27,23,0.95)",
      color: accent ? GOLD : "#eee3c8",
      border: accent ? "1px solid rgba(255,216,77,0.5)" : "1px solid rgba(214,186,128,0.24)",
      borderRadius: 3,
      padding: "11px 14px",
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      cursor: "pointer",
      marginBottom: 8,
    }}
  >
    <span>{children}</span>
    <span style={{ flex: 1 }} />
    {hint ? <span style={{ fontSize: 11, fontWeight: 500, color: "#8f8676", letterSpacing: 0 }}>{hint}</span> : null}
  </button>
);

const Small: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.currentTarget.blur();
      onClick();
    }}
    style={{
      background: "rgba(24,22,19,0.95)",
      color: "#d8ccb0",
      border: "1px solid rgba(214,186,128,0.2)",
      borderRadius: 3,
      padding: "6px 10px",
      fontSize: 12,
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

export const PauseMenu: React.FC<PauseMenuProps> = (p) => (
  <div
    onClick={p.onResume}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 18,
      background: "radial-gradient(ellipse at center, rgba(5,5,6,0.55), rgba(5,5,6,0.85))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      padding: 16,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(340px, 100%)",
        maxHeight: "100%",
        overflowY: "auto",
        background: "rgba(12,11,10,0.95)",
        border: "1px solid rgba(214,186,128,0.26)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        padding: "20px 20px 14px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.24em", color: "#e8d9b0", textAlign: "center" }}>MENU</div>
      <div style={{ fontSize: 12, color: "#8f8676", textAlign: "center", margin: "4px 0 18px" }}>{p.dungeonName}</div>

      <Big onClick={p.onResume} hint={p.touch ? undefined : "Esc"} accent>
        Resume
      </Big>
      <Big onClick={p.onInventory} hint={p.touch ? undefined : "Tab"}>
        Inventory
      </Big>
      <Big onClick={p.onCharacter}>Character</Big>

      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "14px 0 8px" }}>DUNGEON</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <Small onClick={p.onNewSeed}>New floor</Small>
        <Small onClick={p.onTheme}>Theme: {p.themeLabel}</Small>
        <Small onClick={p.onCamera}>{p.firstPerson ? "Third person" : "First person"}{p.touch ? "" : " (V)"}</Small>
        <Small onClick={p.onMap}>{p.showMap ? "Hide map" : "Show map"}{p.touch ? "" : " (M)"}</Small>
        <label style={{ fontSize: 12, color: "#d8ccb0", display: "flex", alignItems: "center", gap: 5 }}>
          Rooms
          <select
            value={p.rooms}
            onChange={(e) => p.onRooms(Math.min(10, Math.max(4, Number(e.target.value))))}
            style={{ background: "#18160f", color: "#fff", border: "1px solid rgba(214,186,128,0.3)", borderRadius: 3, padding: "4px 6px", fontSize: 12 }}
          >
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ fontSize: 11, color: "#8f8676", marginTop: 8, lineHeight: 1.4 }}>
        A new floor, theme or room count abandons this run: what you found here is lost. Escape through a portal to keep it.
      </div>

      {p.backHref ? (
        <a
          href={p.backHref}
          style={{ display: "block", marginTop: 16, fontSize: 13, color: GOLD, textDecoration: "none", textAlign: "center" }}
        >
          ← Back to modes
        </a>
      ) : null}
    </div>
  </div>
);
