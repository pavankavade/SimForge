// The Esc menu: back to the game, the inventory, the character screen (who is under the armour),
// the dungeon options and the graphics setting. The world keeps running behind it; only the
// paladin stops listening.
import React from "react";
import { FRAME_CAPS, LOOK_SENS_RANGE, QUALITIES, QUALITY_LABEL, type FrameCap, type Quality } from "./graphics";

export interface PauseMenuProps {
  dungeonName: string;
  touch: boolean;
  onResume: () => void;
  onInventory: () => void;
  onCharacter: () => void;
  onNewSeed: () => void;
  /** Below: give up the run and go back up to town (what was found on this floor is lost). */
  onTown?: () => void;
  /** Back to the lobby (from a dive this asks first: the run is forfeit). */
  onLobby?: () => void;
  /** He is in town: the dungeon options set up the next dive. */
  inTown?: boolean;
  onTheme: () => void;
  themeLabel: string;
  rooms: number;
  onRooms: (n: number) => void;
  firstPerson: boolean;
  onCamera: () => void;
  showMap: boolean;
  onMap: () => void;
  /** The graphics setting (graphics.ts) and the FPS counter. */
  quality: Quality;
  onQuality: (q: Quality) => void;
  showFps: boolean;
  onFps: () => void;
  /** Frames per second at most, and the resolution dropping by itself while the game is slow. */
  frameCap: FrameCap;
  onFrameCap: (c: FrameCap) => void;
  autoRes: boolean;
  onAutoRes: () => void;
  /** Draw calls, triangles, lights and frame time under the FPS counter. */
  showPerf: boolean;
  onPerf: () => void;
  /** Controls and sound: look speed (times the usual), inverted look, volume (0..1). */
  lookSens: number;
  onLookSens: (v: number) => void;
  invertY: boolean;
  onInvertY: () => void;
  volume: number;
  onVolume: (v: number) => void;
  backHref?: string;
}

const QUALITY_HINT: Record<Quality, string> = {
  low: "For phones: lower resolution, flat stone, two room lights, no shadows, bloom or smoothing.",
  medium: "Full resolution, no lamp shadows or smoothing, four room lights.",
  high: "Everything: lamp shadows, contact shadows, stone relief, bloom, smoothing.",
};

/** One row of choices, the chosen one lit. */
function Choices<T extends string | number>(p: { label: string; options: readonly T[]; value: T; name: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={p.label} style={{ display: "flex", gap: 6 }}>
      {p.options.map((q) => {
        const on = q === p.value;
        return (
          <button
            type="button"
            key={String(q)}
            role="radio"
            aria-checked={on}
            onClick={(e) => {
              e.currentTarget.blur();
              p.onPick(q);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: on ? "linear-gradient(180deg, rgba(255,216,77,0.2), rgba(255,216,77,0.08))" : "rgba(24,22,19,0.95)",
              color: on ? GOLD : "#d8ccb0",
              border: on ? "1px solid rgba(255,216,77,0.6)" : "1px solid rgba(214,186,128,0.2)",
            }}
          >
            {p.name(q)}
          </button>
        );
      })}
    </div>
  );
}

const GOLD = "#ffd84d";

/** A labelled slider with its value on the right. */
function Slider(p: { label: string; min: number; max: number; step: number; value: number; show: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#d8ccb0", margin: "6px 0" }}>
      <span style={{ width: 92, flexShrink: 0 }}>{p.label}</span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onChange={(e) => p.onChange(Number(e.target.value))}
        // Arrow keys would otherwise both move the slider and walk him once the menu closes.
        onKeyDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.currentTarget.blur()}
        style={{ flex: 1, accentColor: GOLD, cursor: "pointer" }}
      />
      <span style={{ width: 40, textAlign: "right", color: GOLD, fontVariantNumeric: "tabular-nums" }}>{p.show(p.value)}</span>
    </label>
  );
}

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
      {p.onTown ? <Big onClick={p.onTown}>Return to town</Big> : null}
      {p.onLobby ? <Big onClick={p.onLobby}>Back to lobby</Big> : null}

      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "14px 0 8px" }}>DUNGEON</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {p.inTown ? null : <Small onClick={p.onNewSeed}>New floor</Small>}
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
        {p.inTown
          ? "Theme and room count shape your next dive. Step onto the teleporter in the gate hall to go down."
          : "A new floor, theme or room count (or going back to town) abandons this run: what you found here is lost. Escape through a portal to keep it."}
      </div>

      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "16px 0 6px" }}>CONTROLS &amp; SOUND</div>
      <Slider
        label={p.touch ? "Look speed" : "Mouse speed"}
        min={LOOK_SENS_RANGE[0]}
        max={LOOK_SENS_RANGE[1]}
        step={0.05}
        value={p.lookSens}
        show={(v) => `${v.toFixed(2)}×`}
        onChange={p.onLookSens}
      />
      <Slider label="Volume" min={0} max={1} step={0.05} value={p.volume} show={(v) => `${Math.round(v * 100)}%`} onChange={p.onVolume} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        <Small onClick={p.onInvertY}>Invert look up / down: {p.invertY ? "on" : "off"}</Small>
      </div>

      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", margin: "16px 0 8px" }}>GRAPHICS</div>
      <Choices label="Graphics quality" options={QUALITIES} value={p.quality} name={(q) => QUALITY_LABEL[q]} onPick={p.onQuality} />
      <div style={{ fontSize: 11, color: "#8f8676", marginTop: 6, lineHeight: 1.4 }}>{QUALITY_HINT[p.quality]}</div>
      <div style={{ fontSize: 11, color: "#8f8676", margin: "10px 0 6px" }}>Frame cap</div>
      <Choices label="Frame cap" options={FRAME_CAPS} value={p.frameCap} name={(c) => `${c} FPS`} onPick={p.onFrameCap} />
      <div style={{ fontSize: 11, color: "#8f8676", marginTop: 6, lineHeight: 1.4 }}>
        A steady 30 can feel smoother on a phone than a frame rate that jumps around.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        <Small onClick={p.onAutoRes}>Auto resolution: {p.autoRes ? "on" : "off"}</Small>
        <Small onClick={p.onFps}>{p.showFps ? "Hide FPS" : "Show FPS"}</Small>
        <Small onClick={p.onPerf}>Performance details: {p.showPerf ? "on" : "off"}</Small>
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
