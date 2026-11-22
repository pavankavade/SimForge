// The caster's spell HUD. The spell wheel (Spell Memory, held on its ability key or tapped on a
// phone): his memorised spells round a ring, the one he points at lit; let go (or tap) and it is
// readied, and the attack casts it. The spell bar under it shows each spell's charges as pips, the
// readied one and the cast filling, then X to rest (the cleric prays, the wizard meditates), and what
// his spells and abilities have on him (ward, bless, holy ground, haste, free casts).
import React from "react";
import { meditates, spellById, type SpellId } from "./spells";

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

/** Which slice of an n-slice wheel the direction (x right, y down) points at: 0 at the top, clockwise. */
export function wheelSlice(x: number, y: number, n: number): number {
  if (n <= 0) return -1;
  const a = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor((a + Math.PI / n) / ((Math.PI * 2) / n)) % n;
}

/**
 * The ring of spells: slice i sits at angle i/n from the top, clockwise. `pick` is lit (pointed at),
 * `ready` is ringed in gold. With `onPick` each slice is a button (a phone, or a click).
 */
export const SpellWheel: React.FC<{
  spells: SpellId[];
  size: number;
  pick?: number;
  ready?: number;
  charges?: Record<string, number>;
  onPick?: (i: number) => void;
  onClose?: () => void;
}> = ({ spells, size, pick = -1, ready = -1, charges, onPick, onClose }) => {
  const n = spells.length;
  const r = size * 0.36;
  const slot = Math.max(54, size * 0.27);
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "absolute", inset: size * 0.08, borderRadius: "50%", border: "1px solid rgba(214,186,128,0.25)", background: "radial-gradient(circle, rgba(10,8,14,0.55), rgba(10,8,14,0.82))" }} />
      {spells.map((id, i) => {
        const s = spellById(id);
        if (!s) return null;
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        const x = size / 2 + Math.sin(a) * r - slot / 2;
        const y = size / 2 - Math.cos(a) * r - slot / 2;
        const left = charges ? charges[id] ?? s.charges : s.charges;
        const lit = i === pick;
        const isReady = i === ready;
        const style: React.CSSProperties = {
          position: "absolute",
          left: x,
          top: y,
          width: slot,
          height: slot,
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: 2,
          cursor: onPick ? "pointer" : "default",
          touchAction: "none",
          background: lit ? `radial-gradient(circle, ${s.color}55, rgba(20,16,10,0.92))` : "rgba(20,16,10,0.88)",
          border: `2px solid ${isReady ? "#ffd84d" : lit ? s.color : left > 0 ? "rgba(255,224,138,0.45)" : "rgba(255,255,255,0.15)"}`,
          boxShadow: lit ? `0 0 14px ${s.color}` : "none",
          color: left > 0 ? "#f3ead2" : "#7d776a",
          transform: lit ? "scale(1.12)" : "none",
        };
        const body = (
          <>
            <span style={{ fontSize: Math.max(9, slot * 0.17), fontWeight: 800, lineHeight: 1.05, textAlign: "center" }}>{s.short}</span>
            {charges ? pips(left, s.charges) : <span style={{ fontSize: 9, color: "#a89c84" }}>tier {s.tier}</span>}
          </>
        );
        return onPick ? (
          <button
            key={id}
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPick(i);
            }}
            style={style}
          >
            {body}
          </button>
        ) : (
          <div key={id} style={style}>
            {body}
          </div>
        );
      })}
      <div
        onPointerDown={
          onClose
            ? (e) => {
                e.stopPropagation();
                onClose();
              }
            : undefined
        }
        style={{
          position: "absolute",
          left: size / 2 - size * 0.16,
          top: size / 2 - size * 0.16,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 11,
          lineHeight: 1.2,
          color: "#d8ccb0",
          cursor: onClose ? "pointer" : "default",
        }}
      >
        {n === 0 ? "No spells" : pick >= 0 ? spellById(spells[pick])?.name : onClose ? "Close" : "Spell wheel"}
      </div>
    </div>
  );
};

/** Under the abilities: his spells' charges, the readied one, the cast filling; X to rest; his buffs. */
export const SpellBar: React.FC<{ spells: SpellId[]; hud: SpellHud; ready: number }> = ({ spells, hud, ready }) => {
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
          const isReady = i === ready;
          return (
            <div
              key={id}
              style={{
                position: "relative",
                padding: "4px 8px 5px",
                minWidth: 70,
                background: isReady ? "rgba(60,48,16,0.8)" : "rgba(8,8,12,0.72)",
                border: `1px solid ${casting ? s.color : isReady ? "#ffd84d" : n > 0 ? "rgba(255,224,138,0.3)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 3,
                color: n > 0 ? "#f3ead2" : "#7d776a",
                fontSize: 11,
                overflow: "hidden",
              }}
            >
              <div style={{ whiteSpace: "nowrap" }}>{s.name}</div>
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

/** Phone: the readied spell (tap to drop it) and REST / PRAY. */
export const SpellButtons: React.FC<{ spells: SpellId[]; hud: SpellHud; ready: number; onUnready: () => void; onPray: () => void }> = ({ spells, hud, ready, onUnready, onPray }) => {
  const s = ready >= 0 && ready < spells.length ? spellById(spells[ready]) : null;
  const n = s ? hud.charges[s.id] ?? s.charges : 0;
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
      {s ? (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onUnready();
          }}
          style={{
            height: 46,
            padding: "0 12px",
            borderRadius: 23,
            border: `2px solid ${hud.casting === s.id ? s.color : "#ffd84d"}`,
            background: hud.casting === s.id ? `linear-gradient(90deg, ${s.color}55 ${Math.round(hud.castU * 100)}%, rgba(24,20,10,0.85) 0)` : "rgba(24,20,10,0.85)",
            color: n > 0 ? "#ffe9b0" : "#77705f",
            fontWeight: 800,
            fontSize: 11,
            touchAction: "none",
          }}
        >
          {s.name} · {n}
        </button>
      ) : null}
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
};
