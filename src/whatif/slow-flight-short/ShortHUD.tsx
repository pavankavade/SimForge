import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CLOCK_FROM, CLOCK_TO, flying, minutesLeft, showSpeed, windMph } from "../slow-flight/timeline";
import { BEATS, DURATION, longFrame } from "./timeline";

/**
 * Short HUD (1080x1920): the hook title, a ground-speed + countdown chip
 * read from the long-form frame on screen, and the "full flight" end card.
 * Everything sits between the Shorts top bar (~150 px) and the caption/title
 * block at the bottom (~520 px).
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(24, 33, 58, 0.88)";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const INK = "#18213a";

const stroke = (px: number, color = INK) =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`])
    .join(", ");

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });

const Hook: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const end = BEATS.hookOut;
  if (frame > end) return null;
  const s = pop(frame, 2, fps);
  const out = interpolate(frame, [end - 10, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", opacity: out, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ fontFamily: FONT, fontSize: 84, color: "#fff", lineHeight: 1.05, textShadow: stroke(6) }}>
        WHAT IF YOU
        <br />
        COULD FLY…
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 18,
          padding: "10px 30px",
          background: TANGERINE,
          borderRadius: 20,
          fontFamily: FONT,
          fontSize: 62,
          color: "#fff",
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
          transform: "rotate(-2deg)",
        }}
      >
        AT 3 MPH?
      </div>
    </div>
  );
};

const clock = (min: number) => {
  const m = Math.max(0, Math.round(min));
  const mm = m % 60;
  return `${Math.floor(m / 60)}:${mm < 10 ? "0" : ""}${mm}`;
};

/** Ground speed (and the curtain countdown once it is running), centred under the top bar. */
const SpeedChip: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.hookOut || frame >= BEATS.endCard) return null;
  const lf = longFrame(frame);
  const speed = showSpeed(lf);
  const timed = lf >= CLOCK_FROM && lf < CLOCK_TO;
  if (!speed && !timed) return null;
  const s = pop(frame, BEATS.hookOut, fps);
  const wind = windMph(lf);
  const air = flying(lf) ? 3 : 0;
  const min = minutesLeft(lf);
  return (
    <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", transform: `scale(${s})` }}>
      <div
        style={{
          display: "inline-block",
          padding: "14px 28px",
          background: NAVY,
          borderRadius: 24,
          border: `5px solid ${TANGERINE}`,
          color: "#fff",
          fontFamily: FONT,
          boxShadow: "0 8px 0 rgba(0,0,0,0.22)",
        }}
      >
        {speed ? (
          <div style={{ fontSize: 50, whiteSpace: "nowrap" }}>
            <span style={{ color: "#ffd84d" }}>{air}</span>
            <span style={{ fontSize: 30, color: "#cfd8ea" }}> AIR {wind < 0 ? "−" : "+"} </span>
            <span style={{ color: wind < 0 ? "#ff6b5a" : TEAL }}>{Math.abs(wind)}</span>
            <span style={{ fontSize: 30, color: "#cfd8ea" }}> WIND = </span>
            <span>{Math.max(0, air + wind)}</span>
            <span style={{ fontSize: 30 }}> MPH</span>
          </div>
        ) : null}
        {timed ? (
          <div style={{ fontSize: 34, marginTop: speed ? 6 : 0, color: min <= 15 ? "#ff6b5a" : TEAL, letterSpacing: 2 }}>
            CURTAIN IN <span style={{ color: min <= 15 ? "#ff6b5a" : "#fff" }}>{clock(min)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** The cliffhanger: the frame dims and the "full flight" card points down to the linked video. */
const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.question) return null;
  const dim = interpolate(frame, [BEATS.question, BEATS.endCard], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = pop(frame, BEATS.endCard, fps);
  const link = pop(frame, BEATS.linked, fps);
  const bob = Math.sin((frame - BEATS.linked) / 5) * 12;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(12, 16, 30, ${dim})` }} />
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontSize: 96, color: "#fff", textShadow: stroke(7), transform: `scale(${s})`, lineHeight: 1.05 }}>
          DO THEY
          <br />
          MAKE IT?
        </div>
      </div>
      {frame >= BEATS.endCard ? (
        <div style={{ position: "absolute", top: 500, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
          <div
            style={{
              display: "inline-block",
              padding: "18px 40px",
              background: TANGERINE,
              borderRadius: 26,
              fontSize: 64,
              color: "#fff",
              boxShadow: "0 10px 0 rgba(0,0,0,0.3)",
              transform: `rotate(-2deg) scale(${2 - s})`,
              opacity: Math.min(1, s * 1.5),
            }}
          >
            WATCH THE FULL FLIGHT
          </div>
        </div>
      ) : null}
      {/* Points at the related-video link Shorts shows under the caption. */}
      {frame >= BEATS.linked ? (
        <div style={{ position: "absolute", top: 1390, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
          <div style={{ display: "inline-block", fontSize: 130, color: "#ffd84d", textShadow: stroke(6), transform: `translateY(${bob}px) scale(${link})` }}>↓</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ShortHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Hook frame={frame} fps={fps} />
      <SpeedChip frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
