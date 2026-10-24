import React from "react";
import { AbsoluteFill } from "remotion";
import { easeBack, clamp01 } from "./math";

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

/** One word at a time, white with a heavy ink outline, centred at ~70% of the frame height. */
export const Caption: React.FC<{
  frame: number;
  words: CaptionWord[];
  y?: number;
}> = ({ frame, words, y = 0.7 }) => {
  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    const next = words[i + 1];
    const until = next
      ? Math.min(next.start - 1, words[i].end + 10)
      : words[i].end + 12;
    if (frame >= words[i].start - 1 && frame <= until) idx = i;
  }
  if (idx < 0) return null;
  const w = words[idx];
  const s = 0.82 + 0.18 * easeBack(clamp01((frame - (w.start - 1)) / 4));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${y * 100}%`,
          transform: `translateY(-50%) scale(${s})`,
          textAlign: "center",
          fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif",
          fontWeight: 900,
          fontSize: 82,
          color: "#ffffff",
          WebkitTextStroke: "16px #000",
          paintOrder: "stroke fill",
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
          letterSpacing: 1,
        }}
      >
        {w.word}
      </div>
    </AbsoluteFill>
  );
};
