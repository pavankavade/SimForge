// Choosing a class when the game starts: the character stands in the tavern on the left (the 3D
// view frames him), the classes are listed on the right (below on narrow portrait screens). Only the
// fighter is playable for now; the rogue, wizard, ranger and cleric are shown as coming soon.
import React, { useEffect, useState } from "react";
import { CLASSES, classById, type ClassId } from "./classes";
import type { PanelLayout } from "./CharacterCustomizer";
import { ATTRIBUTES, ATTRIBUTE_INFO } from "./stats";

const GOLD = "#ffd84d";
const LINE = "rgba(214,186,128,0.22)";

/** A small emblem per class (line art, in the class colour). */
const Emblem: React.FC<{ id: ClassId; color: string; size: number }> = ({ id, color, size }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {id === "fighter" ? (
        <>
          <path {...common} d="M20 6 L31 10 L30 22 Q28 30 20 34 Q12 30 10 22 L9 10 Z" />
          <path {...common} d="M20 11 V29 M14 17 H26" />
        </>
      ) : id === "rogue" ? (
        <>
          <path {...common} d="M9 31 L27 9 M27 9 L29 7 M12 25 L15 28" />
          <path {...common} d="M31 31 L13 9 M13 9 L11 7 M28 25 L25 28" />
        </>
      ) : id === "wizard" ? (
        <>
          <path {...common} d="M12 33 L28 7" />
          <path {...common} d="M28 7 L30 3 M25 6 L31 9" />
          <path {...common} d="M10 14 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1 Z" />
        </>
      ) : id === "ranger" ? (
        <>
          <path {...common} d="M13 6 Q31 20 13 34" />
          <path {...common} d="M13 6 V34" />
          <path {...common} d="M8 20 H32 M28 17 L32 20 L28 23" />
        </>
      ) : (
        <>
          <circle {...common} cx="20" cy="20" r="6" />
          <path {...common} d="M20 5 V10 M20 30 V35 M5 20 H10 M30 20 H35 M9.5 9.5 L13 13 M27 27 L30.5 30.5 M30.5 9.5 L27 13 M13 27 L9.5 30.5" />
        </>
      )}
    </svg>
  );
};

export interface ClassSelectProps {
  /** The player's name (drawn for them). */
  name: string;
  current: ClassId;
  layout: PanelLayout;
  touch: boolean;
  /** The character is still being built (the button waits). */
  busy: boolean;
  onPick: (id: ClassId) => void;
}

export const ClassSelect: React.FC<ClassSelectProps> = ({ name, current, layout, touch, busy, onPick }) => {
  const [sel, setSel] = useState<ClassId>(classById(current).available ? current : "fighter");
  const c = classById(sel);
  const ready = c.available && !busy;

  // Enter (or Space) goes in with the chosen class.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "NumpadEnter") && ready) {
        e.preventDefault();
        onPick(sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, sel, onPick]);

  const right = layout.side === "right";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 16, pointerEvents: "none", color: "#eee6d4", fontFamily: "system-ui, sans-serif", userSelect: "none" }}>
      {/* The title over the character. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: right ? layout.size : 0,
          padding: "max(18px, env(safe-area-inset-top)) 24px 0",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: "0.28em", color: "#c9b27a" }}>THE WAYFARER'S REST</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: right ? 34 : 24, color: "#f3e6c4", marginTop: 4 }}>Choose your class</div>
        <div style={{ fontSize: 13, color: "#d8cdb4", marginTop: 2 }}>
          You are <b style={{ color: GOLD }}>{name}</b>
        </div>
      </div>

      {/* The list. */}
      <div
        style={{
          position: "absolute",
          ...(right ? { top: 0, right: 0, bottom: 0, width: layout.size } : { left: 0, right: 0, bottom: 0, height: layout.size }),
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, rgba(14,12,10,0.94), rgba(8,7,6,0.97))",
          borderLeft: right ? `1px solid ${LINE}` : "none",
          borderTop: right ? "none" : `1px solid ${LINE}`,
          boxShadow: "-12px 0 40px rgba(0,0,0,0.55)",
          pointerEvents: "auto",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: right ? "18px 16px 8px" : "10px 12px 6px" }}>
          {CLASSES.map((k) => {
            const on = k.id === sel;
            return (
              <button
                type="button"
                key={k.id}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setSel(k.id);
                }}
                onDoubleClick={() => k.available && !busy && onPick(k.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 8,
                  padding: on ? "12px 12px" : "9px 12px",
                  background: on ? `linear-gradient(90deg, ${k.color}26, rgba(20,18,15,0.9))` : "rgba(20,18,15,0.82)",
                  border: on ? `1px solid ${k.color}` : `1px solid ${LINE}`,
                  borderRadius: 4,
                  color: "inherit",
                  cursor: "pointer",
                  opacity: k.available ? 1 : 0.62,
                }}
              >
                <Emblem id={k.id} color={k.available ? k.color : "#8f8676"} size={on ? 40 : 32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: on ? 20 : 17, color: k.available ? "#f3e6c4" : "#b8ad98" }}>{k.name}</span>
                    {!k.available ? (
                      <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "#8f8676", border: "1px solid rgba(143,134,118,0.5)", borderRadius: 3, padding: "1px 5px" }}>COMING SOON</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#a69c88", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.tagline}</div>
                </div>
              </button>
            );
          })}

          {/* What the chosen class is. */}
          <div style={{ marginTop: 6, padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: 4, background: "rgba(10,9,8,0.7)" }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#d8cdb4" }}>{c.blurb}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", marginTop: 10, fontSize: 12 }}>
              {c.traits.map(([k, v]) => (
                <React.Fragment key={k}>
                  <span style={{ color: "#8f8676" }}>{k}</span>
                  <span style={{ color: "#f1ead9" }}>{v}</span>
                </React.Fragment>
              ))}
            </div>
            {/* Base attributes (gear adds to them; there are no levels). */}
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginTop: 10 }}>ATTRIBUTES</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "3px 8px", alignItems: "center", marginTop: 4, fontSize: 11 }}>
              {ATTRIBUTES.map((k) => (
                <React.Fragment key={k}>
                  <span style={{ color: "#a69c88" }} title={ATTRIBUTE_INFO[k].does}>
                    {ATTRIBUTE_INFO[k].name}
                  </span>
                  <span style={{ height: 5, background: "rgba(214,186,128,0.12)", borderRadius: 3, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.min(100, (c.attributes[k] / 30) * 100)}%`, background: c.available ? c.color : "#8f8676" }} />
                  </span>
                  <span style={{ color: "#f1ead9", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{c.attributes[k]}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8f8676", marginTop: 10 }}>STARTS WITH</div>
            <div style={{ fontSize: 12, color: "#d8cdb4", marginTop: 2 }}>{c.kit.join(" · ")}</div>
          </div>
        </div>

        <div style={{ padding: right ? "12px 16px 18px" : "8px 12px max(12px, env(safe-area-inset-bottom))", borderTop: `1px solid ${LINE}` }}>
          <button
            type="button"
            disabled={!ready}
            onClick={(e) => {
              e.currentTarget.blur();
              if (ready) onPick(sel);
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 3,
              border: ready ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
              background: ready ? "linear-gradient(180deg, #f2d27a, #c99a3a)" : "rgba(30,27,23,0.9)",
              color: ready ? "#1a1408" : "#8f8676",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.12em",
              cursor: ready ? "pointer" : "default",
            }}
          >
            {!c.available ? `${c.name.toUpperCase()} IS COMING SOON` : busy ? "PREPARING..." : `PLAY AS ${c.name.toUpperCase()}${touch ? "" : " (ENTER)"}`}
          </button>
        </div>
      </div>
    </div>
  );
};
