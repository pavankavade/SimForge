import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, DURATION, RENEW, clockMinutes, liningDay, nucleiCount, shotAt, shotEnd, shotStart, waterLeft } from "./timeline";

/**
 * Slime HUD (1080x1920): no labels, only the small instruments that carry a
 * number on their shots (the speed of a slime mold, the water gauge with its
 * clock, the age of a stomach lining, the nuclei counter) and a quiet
 * watermark under the subtitles. Subtitles are the stock series ones.
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const CYAN = "#3fe6d4";
const AMBER = "#ffc247";
const RED = "#ff5a4a";
const PILL_BG = "rgba(14, 23, 29, 0.92)";

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 210 } });
const fadeOut = (frame: number, to: number, len = 6) => interpolate(frame, [to - len, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const panel: React.CSSProperties = { position: "absolute", left: "50%", transform: "translateX(-50%)", background: PILL_BG, borderRadius: 26, fontFamily: FONT, color: "#fff", boxShadow: "0 10px 24px rgba(0,0,0,0.5)" };

/** How fast a slime mold travels. */
const Speed: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.few - 8;
  if (shotAt(frame) !== "slow" || frame < from) return null;
  const s = pop(frame, from, fps);
  return (
    <div style={{ ...panel, top: 300, padding: "14px 34px 12px", border: `4px solid ${RED}`, textAlign: "center", transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("slow")) }}>
      <div style={{ fontSize: 28, letterSpacing: 4, color: RED }}>TOP SPEED</div>
      <div style={{ fontSize: 76, lineHeight: 1.1 }}>
        3 <span style={{ fontSize: 40 }}>CM / HOUR</span>
      </div>
    </div>
  );
};

/** WATER: what is left of a slime on dry land, and the time of day. */
const Water: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.water - 8;
  if (shotAt(frame) !== "dry" || frame < from) return null;
  const left = waterLeft(frame);
  const pct = Math.round(left * 95);
  const color = left > 0.5 ? CYAN : left > 0.25 ? AMBER : RED;
  const s = pop(frame, from, fps);
  const m = clockMinutes(frame);
  const empty = left < 0.04 && Math.floor(frame / 6) % 2 === 0;
  return (
    <div style={{ ...panel, top: 300, width: 660, padding: "20px 30px 22px", border: `4px solid ${color}`, transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("dry")) }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, letterSpacing: 3 }}>
        <span style={{ color }}>WATER {pct}%</span>
        <span style={{ color: "#fff" }}>
          {Math.floor(m / 60)}:{`0${m % 60}`.slice(-2)}
        </span>
      </div>
      <div style={{ marginTop: 12, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "3px solid rgba(255,255,255,0.25)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(left * 100)}%`, height: "100%", background: color, opacity: empty ? 0.3 : 1 }} />
      </div>
    </div>
  );
};

/** The stomach lining: four days old at most, then new again. */
const Lining: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = RENEW[0] - 8;
  if (shotAt(frame) !== "stomach" || frame < from) return null;
  const day = frame < RENEW[0] ? 4 : frame > RENEW[1] ? 1 : liningDay(frame);
  const s = pop(frame, from, fps);
  return (
    <div style={{ ...panel, top: 300, padding: "18px 26px 20px", border: `4px solid ${CYAN}`, transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("stomach")) }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: CYAN, textAlign: "center" }}>LINING: DAY {day}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center" }}>
        {[1, 2, 3, 4].map((d) => (
          <div key={d} style={{ width: 84, height: 54, borderRadius: 10, background: d <= day ? (d === 1 && day === 1 ? "#c9fff6" : CYAN) : "rgba(255,255,255,0.08)", border: "3px solid rgba(255,255,255,0.3)" }} />
        ))}
      </div>
    </div>
  );
};

/** One cell, and how many nuclei are in it. */
const Nuclei: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.millions - 8;
  if (shotAt(frame) !== "nuclei" || frame < from) return null;
  const s = pop(frame, from, fps);
  const n = nucleiCount(frame);
  return (
    <div style={{ ...panel, top: 300, padding: "14px 34px 12px", border: `4px solid ${CYAN}`, textAlign: "center", minWidth: 520, transform: `translateX(-50%) scale(${s})`, opacity: fadeOut(frame, shotEnd("nuclei")) }}>
      <div style={{ fontSize: 28, letterSpacing: 4, color: CYAN }}>NUCLEI IN ONE CELL</div>
      <div style={{ fontSize: 76, lineHeight: 1.1 }}>{n.toLocaleString("en-US")}</div>
    </div>
  );
};

export const SlimeHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  // Keep `shotStart` honest: instruments never show before their shot.
  if (frame < shotStart("slow")) {
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Watermark />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Speed frame={frame} fps={fps} />
      <Water frame={frame} fps={fps} />
      <Lining frame={frame} fps={fps} />
      <Nuclei frame={frame} fps={fps} />
      <Watermark />
    </AbsoluteFill>
  );
};

const Watermark: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, textAlign: "center", fontFamily: FONT, fontSize: 24, letterSpacing: 6, color: "rgba(255,255,255,0.34)" }}>SIMFORGE</div>
);
