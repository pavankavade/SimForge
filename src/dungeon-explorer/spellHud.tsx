// The caster's spell bar: each memorised spell with its key, its charges as pips and the cast
// filling under it, then X to rest (the cleric prays, the wizard meditates), and what his spells and
// skill have on him (ward, bless, holy ground, haste, free casts).
// On a keyboard it sits above the skill box; on a phone it is a row of round buttons over the
// fighting buttons (tap to cast, PRAY to sit and pray).
import React from "react";
import { SPELL_KEYS, meditates, spellById, type SpellId } from "./spells";

/** His spells for the HUD (casters): charges left by spell, the cast under way and how far it
 * is, and the blessings on him (seconds left; the ward's points). */
export interface SpellHud {
  charges: Record<string, number>;
  casting: string | null;
  castU: number;
  resting: boolean;
  ward: number;
  bless: number;
  sanctuary: number;
  haste: number;
  /** Casts left that cost no charge (Intense Focus). */
  free: number;
}

const pips = (n: number, of: number) => (
  <span style={{ letterSpacing: 1, fontSize: 9 }}>
    {Array.from({ length: of }, (_, i) => (
      <span key={i} style={{ color: i < n ? "#ffe08a" : "rgba(255,255,255,0.22)" }}>
        ●
      </span>
    ))}
  </span>
);

export const SpellBar: React.FC<{ spells: SpellId[]; hud: SpellHud }> = ({ spells, hud }) => {
  const buffs: string[] = [];
  if (hud.ward > 0) buffs.push(`Ward ${Math.ceil(hud.ward)}`);
  if (hud.bless > 0) buffs.push(`Blessed ${Math.ceil(hud.bless)}s`);
  if (hud.sanctuary > 0) buffs.push(`Holy ground ${Math.ceil(hud.sanctuary)}s`);
  if (hud.haste > 0) buffs.push(`Haste ${Math.ceil(hud.haste)}s`);
  if (hud.free > 0) buffs.push(`Focus: ${hud.free} free`);
  const wiz = meditates(spells);
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 166, transform: "translateX(-50%)", zIndex: 9, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: "system-ui, sans-serif" }}>
      {buffs.length ? <div style={{ fontSize: 11, color: "#ffe9a8", textShadow: "0 1px 2px #000", letterSpacing: "0.04em" }}>{buffs.join(" · ")}</div> : null}
      <div style={{ display: "flex", gap: 5 }}>
        {spells.map((id, i) => {
          const s = spellById(id);
          if (!s) return null;
          const n = hud.charges[id] ?? s.charges;
          const casting = hud.casting === id;
          return (
            <div
              key={id}
              style={{
                position: "relative",
                padding: "4px 8px 5px",
                minWidth: 74,
                background: "rgba(8,8,12,0.72)",
                border: `1px solid ${casting ? s.color : n > 0 ? "rgba(255,224,138,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 3,
                color: n > 0 ? "#f3ead2" : "#7d776a",
                fontSize: 11,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ minWidth: 14, padding: "0 4px", textAlign: "center", border: "1px solid currentColor", borderRadius: 3, fontWeight: 800, fontSize: 10 }}>{SPELL_KEYS[i]}</span>
                <span style={{ whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              <div style={{ marginTop: 2 }}>{pips(n, s.charges)}</div>
              {casting ? <div style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: `${Math.round(hud.castU * 100)}%`, background: s.color }} /> : null}
            </div>
          );
        })}
        <div
          style={{
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: hud.resting ? "rgba(60,48,16,0.8)" : "rgba(8,8,12,0.72)",
            border: `1px solid ${hud.resting ? "#ffe08a" : "rgba(255,255,255,0.14)"}`,
            borderRadius: 3,
            color: hud.resting ? "#ffe08a" : "#cfc6b0",
            fontSize: 11,
          }}
        >
          <span style={{ minWidth: 14, padding: "0 4px", textAlign: "center", border: "1px solid currentColor", borderRadius: 3, fontWeight: 800, fontSize: 10 }}>X</span>
          {hud.resting ? (wiz ? "Meditating…" : "Praying…") : wiz ? "Meditate" : "Pray"}
        </div>
      </div>
    </div>
  );
};

/** Phone: a round button per spell (tap to cast) and PRAY (REST for the wizard). */
export const SpellButtons: React.FC<{ spells: SpellId[]; hud: SpellHud; onCast: (i: number) => void; onPray: () => void }> = ({ spells, hud, onCast, onPray }) => (
  <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
    {spells.map((id, i) => {
      const s = spellById(id);
      if (!s) return null;
      const n = hud.charges[id] ?? s.charges;
      const casting = hud.casting === id;
      return (
        <button
          key={id}
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onCast(i);
          }}
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: `2px solid ${casting ? s.color : n > 0 ? "rgba(255,224,138,0.6)" : "rgba(255,255,255,0.18)"}`,
            background: casting ? `conic-gradient(${s.color}55 ${Math.round(hud.castU * 360)}deg, rgba(24,20,10,0.8) 0)` : "rgba(24,20,10,0.78)",
            color: n > 0 ? "#ffe9b0" : "#77705f",
            fontWeight: 900,
            fontSize: 8.5,
            lineHeight: 1.1,
            padding: 1,
            touchAction: "none",
          }}
        >
          {s.short}
          <div style={{ fontSize: 9, fontWeight: 700 }}>{n}</div>
        </button>
      );
    })}
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onPray();
      }}
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        border: `2px solid ${hud.resting ? "#ffe08a" : "rgba(255,255,255,0.25)"}`,
        background: hud.resting ? "rgba(70,56,18,0.85)" : "rgba(20,20,24,0.75)",
        color: "#f3e6c4",
        fontWeight: 900,
        fontSize: 9,
        touchAction: "none",
      }}
    >
      {meditates(spells) ? "REST" : "PRAY"}
    </button>
  </div>
);
