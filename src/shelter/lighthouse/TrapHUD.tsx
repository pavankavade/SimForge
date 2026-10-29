import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS, lineEnd } from "./timeline";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Title card and end stamp only: the big word captions carry the story.
const Base = createTrapHUD({
  kicker: "HOW A CANDLE BECOMES A",
  title: "LIGHTHOUSE",
  stages: [],
  end: {
    label: "LIGHTHOUSE STATUS",
    stamp: "SHIP-SAFE",
    at: BEATS.congrats,
    color: "#38c172",
  },
});

/** "Captains look it up on their charts": a chart card listing each light's pattern. */
const CHART = [BEATS.charts - 4, lineEnd("l5c") + 18] as const;
const ROWS = [
  { name: "CAPE NORTH", pattern: "STEADY", you: false },
  { name: "GULL ISLAND", pattern: "STEADY", you: false },
  { name: "YOUR LIGHT", pattern: "● ●  EVERY 10 s", you: true },
];

const ChartCard: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < CHART[0] || frame > CHART[1]) return null;
  const enter = interpolate(frame, [CHART[0], CHART[0] + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) });
  const exit = interpolate(frame, [CHART[1] - 10, CHART[1]], [1, 0], clamp);
  const pulse = frame >= BEATS.exactly ? 1 + 0.06 * Math.sin((frame - BEATS.exactly) * 0.5) : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 230,
        left: 110,
        right: 110,
        padding: "34px 40px",
        background: "#f3e6c4",
        border: "8px solid #7a5232",
        borderRadius: 24,
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        fontFamily: FONT,
        opacity: exit,
        transform: `scale(${enter}) rotate(-2deg)`,
      }}
    >
      <div style={{ fontSize: 40, color: "#7a5232", letterSpacing: 4, marginBottom: 18, textAlign: "center" }}>SEA CHART · LIGHTS</div>
      {ROWS.map((r) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 42,
            padding: "12px 18px",
            marginTop: 8,
            borderRadius: 14,
            color: r.you ? "#1d1d1d" : "#4a4a4a",
            background: r.you ? "#ffd84d" : "transparent",
            transform: r.you ? `scale(${pulse})` : undefined,
          }}
        >
          <span>{r.name}</span>
          <span>{r.pattern}</span>
        </div>
      ))}
    </div>
  );
};

export const TrapHUD: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Base />
      <ChartCard frame={frame} />
    </>
  );
};
