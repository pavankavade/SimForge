import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, CLOCK_FROM, CLOCK_TO, DURATION, flying, minutesLeft, shotAt, shotEnd, shotStart, showSpeed, windMph } from "./timeline";

/**
 * Slow Flight HUD (1920x1080):
 *  - title card for the first ~4 s,
 *  - flight card top-left: airspeed + wind = ground speed, altitude while climbing,
 *    and the countdown to the 7:00 curtain,
 *  - fact tags top-centre on their beats, a frost edge at nine thousand feet,
 *  - the "part two" end card.
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(24, 33, 58, 0.86)";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });

const TitleCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const end = BEATS.catStrolls - 30;
  if (frame > end) return null;
  const s = pop(frame, 4, fps);
  const out = interpolate(frame, [end - 18, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", opacity: out, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ fontFamily: FONT, fontSize: 72, color: "#fff", letterSpacing: 2, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>WHAT IF YOU COULD FLY</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "8px 30px",
          background: TANGERINE,
          borderRadius: 18,
          fontFamily: FONT,
          fontSize: 60,
          color: "#fff",
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
          transform: "rotate(-2deg)",
        }}
      >
        …BUT ONLY AT WALKING SPEED?
      </div>
    </div>
  );
};

const clock = (min: number) => {
  const m = Math.max(0, Math.round(min));
  const mm = m % 60;
  return `${Math.floor(m / 60)}:${mm < 10 ? "0" : ""}${mm}`;
};

/** Altitude in feet while the thermal lifts them (shown in the climb and high shots). */
const ALT_KEYS: [number, number][] = [
  [shotStart("climb"), 300],
  [BEATS.twoK, 2000],
  [BEATS.fiveK, 5000],
  [BEATS.nineK, 9000],
];
const altitude = (frame: number) => {
  for (let i = 1; i < ALT_KEYS.length; i++) {
    if (frame <= ALT_KEYS[i][0]) {
      return interpolate(frame, [ALT_KEYS[i - 1][0], ALT_KEYS[i][0]], [ALT_KEYS[i - 1][1], ALT_KEYS[i][1]], { extrapolateLeft: "clamp" });
    }
  }
  return 9000;
};

const Row: React.FC<{ label: string; children: React.ReactNode; color?: string }> = ({ label, children, color = TEAL }) => (
  <div style={{ marginTop: 6 }}>
    <span style={{ fontSize: 20, letterSpacing: 3, color }}>{label} </span>
    {children}
  </div>
);

const FlightCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const speed = showSpeed(frame);
  const timed = frame >= CLOCK_FROM && frame < CLOCK_TO;
  const shot = shotAt(frame);
  const alt = shot === "climb" || shot === "high";
  if (!speed && !timed) return null;
  const s = pop(frame, frame < CLOCK_FROM ? shotStart("rules") : Math.max(shotStart("rules"), Math.min(CLOCK_FROM, frame)), fps);
  const wind = windMph(frame);
  const air = flying(frame) ? 3 : 0;
  const min = minutesLeft(frame);
  const urgent = min <= 15;
  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        left: 40,
        padding: "14px 22px",
        background: NAVY,
        borderRadius: 22,
        border: `4px solid ${TANGERINE}`,
        color: "#fff",
        fontFamily: FONT,
        transform: `translateX(${(1 - s) * -420}px)`,
        boxShadow: "0 8px 0 rgba(0,0,0,0.22)",
      }}
    >
      {speed ? (
        <div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: TEAL }}>GROUND SPEED</div>
          <div style={{ fontSize: 40, lineHeight: 1.1, whiteSpace: "nowrap" }}>
            <span style={{ color: "#ffd84d" }}>{air}</span>
            <span style={{ fontSize: 24, color: "#cfd8ea" }}> AIR {wind < 0 ? "−" : "+"} </span>
            <span style={{ color: wind < 0 ? "#ff6b5a" : TEAL }}>{Math.abs(wind)}</span>
            <span style={{ fontSize: 24, color: "#cfd8ea" }}> WIND = </span>
            <span>{Math.max(0, air + wind)}</span>
            <span style={{ fontSize: 24 }}> MPH</span>
          </div>
        </div>
      ) : null}
      {alt ? (
        <Row label="ALTITUDE">
          <span style={{ fontSize: 32 }}>{Math.round(altitude(frame) / 100) * 100} FT</span>
        </Row>
      ) : null}
      {timed ? (
        <Row label="CURTAIN IN" color={urgent ? "#ff6b5a" : TEAL}>
          <span style={{ fontSize: 36, color: urgent ? "#ff6b5a" : "#fff" }}>{clock(min)}</span>
        </Row>
      ) : null}
    </div>
  );
};

/** Fact tags, top centre: [from, to, text]. */
const TAGS: [number, number, string][] = [
  [BEATS.plusWind, BEATS.plusWind + 90, "GROUND SPEED = AIRSPEED + WIND"],
  [BEATS.thirteen, BEATS.thirteen + 80, "38 MILES ÷ 3 MPH ≈ 13 HOURS"],
  [BEATS.allFull, shotEnd("windsock"), "5 STRIPES FULL = 15 KNOTS ≈ 17 MPH"],
  [BEATS.thermal, BEATS.thermal + 110, "THERMAL: SUN-WARMED AIR RISING"],
  [BEATS.cold, BEATS.cold + 100, "≈ 3 °F COLDER EVERY 1,000 FT"],
  [BEATS.jet, BEATS.freeze, "JET STREAM ≈ 150 MPH, −60 °F"],
  [BEATS.ridgeLift, BEATS.ridgeLift + 110, "RIDGE LIFT: WIND FORCED UP THE SLOPE"],
  [BEATS.heavier, BEATS.pours + 60, "COOLING SLOPES → DOWNSLOPE WIND"],
  [BEATS.sixFiftyNine, BEATS.sixFiftyNine + 60, "6:59 PM"],
];

const Tag: React.FC<{ frame: number; fps: number; from: number; to: number; text: string }> = ({ frame, fps, from, to, text }) => {
  if (frame < from || frame > to) return null;
  const s = pop(frame, from, fps);
  const out = interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 44, left: 520, right: 40, textAlign: "center", opacity: out }}>
      <span
        style={{
          display: "inline-block",
          padding: "10px 26px",
          background: "#fff",
          color: "#18213a",
          borderRadius: 40,
          fontFamily: FONT,
          fontSize: 32,
          transform: `scale(${s})`,
          boxShadow: "0 8px 0 rgba(0,0,0,0.2)",
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** Frost creeping in from the frame edges at altitude. */
const Frost: React.FC<{ frame: number }> = ({ frame }) => {
  const a = interpolate(frame, [BEATS.frost - 10, BEATS.frost + 30, shotEnd("high") - 10, shotEnd("high")], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (a <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: a,
        background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0) 55%, rgba(220,240,255,0.55) 85%, rgba(240,250,255,0.85) 100%)",
      }}
    />
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.jetStream) return null;
  const s = pop(frame, BEATS.jetStream, fps);
  const sub = pop(frame, BEATS.subscribe, fps);
  return (
    <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 40, color: TEAL, letterSpacing: 4, opacity: s }}>PART TWO</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 10,
          padding: "10px 30px",
          border: `8px solid ${TANGERINE}`,
          borderRadius: 20,
          fontFamily: FONT,
          fontSize: 70,
          color: "#fff",
          transform: `rotate(-3deg) scale(${2.2 - 1.2 * s})`,
          opacity: Math.min(1, s * 1.5),
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
      >
        THE JET STREAM
      </div>
      {frame >= BEATS.subscribe ? (
        <div style={{ marginTop: 26 }}>
          <span
            style={{
              display: "inline-block",
              padding: "12px 34px",
              background: "#e8423a",
              color: "#fff",
              borderRadius: 40,
              fontFamily: FONT,
              fontSize: 36,
              transform: `scale(${sub})`,
              boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
            }}
          >
            SUBSCRIBE
          </span>
        </div>
      ) : null}
    </div>
  );
};

export const FlightHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Frost frame={frame} />
      <TitleCard frame={frame} fps={fps} />
      <FlightCard frame={frame} fps={fps} />
      {TAGS.map(([from, to, text]) => (
        <Tag key={text} frame={frame} fps={fps} from={from} to={to} text={text} />
      ))}
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
