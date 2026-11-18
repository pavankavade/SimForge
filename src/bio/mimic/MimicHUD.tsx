import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, DURATION, PASSERS, WAIT, chill, energy, month, shellAge, shotAt, shotEnd, shotStart } from "./timeline";

/**
 * Mimic HUD (1080x1920): no labels, only the small instruments that carry a
 * number on their shots (the year strip, the energy gauge with its pulse, the
 * shell-age counter) and a quiet watermark under the subtitles. Subtitles are
 * the stock series ones (config.subtitles).
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const CYAN = "#3fe6d4";
const AMBER = "#ffc247";
const RED = "#ff5a4a";
const PILL_BG = "rgba(14, 23, 29, 0.92)";

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 210 } });
const fadeOut = (frame: number, to: number, len = 6) => interpolate(frame, [to - len, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------
const panel: React.CSSProperties = { position: "absolute", left: "50%", transform: "translateX(-50%)", background: PILL_BG, borderRadius: 26, fontFamily: FONT, color: "#fff", boxShadow: "0 10px 24px rgba(0,0,0,0.5)" };

/** A year as twelve cells; the two months dinner walked past are marked. */
const MEAL_MONTHS = PASSERS.map(([start]) => Math.floor(month(start + 10)));
const YearStrip: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (shotAt(frame) !== "wait") return null;
  const m = month(frame);
  const s = pop(frame, shotStart("wait") + 2, fps);
  return (
    <div style={{ ...panel, top: 420, padding: "18px 26px 20px", border: `4px solid ${AMBER}`, transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("wait")) }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: AMBER, textAlign: "center" }}>ONE YEAR</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {Array.from({ length: 12 }, (_, i) => {
          const done = m >= i + 0.5;
          const meal = MEAL_MONTHS.indexOf(i) >= 0 && WAIT[0] <= frame && done;
          return (
            <div
              key={i}
              style={{
                width: 54,
                height: 54,
                borderRadius: 10,
                background: meal ? AMBER : done ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)",
                border: "3px solid rgba(255,255,255,0.3)",
                transform: meal ? "scale(1.16)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/** ENERGY: a warm body empties it in weeks; a cold one barely sips. With the pulse underneath. */
const EnergyGauge: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const sh = shotAt(frame);
  if (sh !== "starve" && sh !== "cold") return null;
  const e = energy(frame);
  const c = sh === "cold" ? chill(frame) : 0;
  const warm = c < 0.5;
  const color = warm ? RED : CYAN;
  const s = pop(frame, shotStart("starve") + 4, fps);
  const empty = e < 0.04 && Math.floor(frame / 6) % 2 === 0;
  // Pulse: beats arrive less and less often as it cools.
  const period = warm ? 12 : 12 + 70 * c;
  const W = 600;
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * W;
    const ph = (((frame * 5 - x) / (period * 5)) % 1 + 1) % 1;
    const blip = ph < 0.04 ? -34 : ph < 0.08 ? 26 : ph < 0.12 ? -10 : 0;
    return `${x.toFixed(1)},${(40 + blip * (e > 0.04 ? 1 : 0)).toFixed(1)}`;
  }).join(" ");
  return (
    <div style={{ ...panel, top: 380, width: 660, padding: "20px 30px 14px", border: `4px solid ${color}`, transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("cold")) }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, letterSpacing: 3 }}>
        <span style={{ color }}>ENERGY</span>
        <span style={{ color }}>{warm ? "WARM BODY" : "COLD BODY"}</span>
      </div>
      <div style={{ marginTop: 12, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "3px solid rgba(255,255,255,0.25)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(e * 100)}%`, height: "100%", background: color, opacity: empty ? 0.3 : 1 }} />
      </div>
      <svg width={W} height={80} style={{ marginTop: 8, display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** How long the shell takes to grow. */
const ShellAge: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.decades - 8;
  if (shotAt(frame) !== "scale" || frame < from) return null;
  const s = pop(frame, from, fps);
  return (
    <div style={{ ...panel, top: 300, padding: "14px 34px 12px", border: `4px solid ${RED}`, textAlign: "center", transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("scale")) }}>
      <div style={{ fontSize: 28, letterSpacing: 4, color: RED }}>TIME TO GROW</div>
      <div style={{ fontSize: 76, lineHeight: 1.1 }}>
        {shellAge(frame)} <span style={{ fontSize: 40 }}>YEARS</span>
      </div>
    </div>
  );
};

export const MimicHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <YearStrip frame={frame} fps={fps} />
      <EnergyGauge frame={frame} fps={fps} />
      <ShellAge frame={frame} fps={fps} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, textAlign: "center", fontFamily: FONT, fontSize: 24, letterSpacing: 6, color: "rgba(255,255,255,0.34)" }}>SIMFORGE</div>
    </AbsoluteFill>
  );
};
