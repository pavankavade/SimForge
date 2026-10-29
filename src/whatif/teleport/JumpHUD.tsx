import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, CLOCK_FROM, CLOCK_TO, DURATION, jumpAt, lineStart, minutesLeft, shotEnd, shotStart } from "./timeline";

/**
 * Teleport HUD (1920x1080):
 *  - title card for the opening line,
 *  - jump card top-left: distance jumped in, landing speed out, and the
 *    countdown to the 4:00 candles,
 *  - fact tags top-centre on their beats, a heat haze at ninety degrees,
 *  - the "launch" end card.
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(24, 33, 58, 0.86)";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const RED = "#ff6b5a";

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });

const TitleCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const end = lineStart("a2") + 40;
  if (frame > end) return null;
  const s = pop(frame, 4, fps);
  const sub = pop(frame, BEATS.anywhere, fps);
  const out = interpolate(frame, [end - 18, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", opacity: out, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ fontFamily: FONT, fontSize: 72, color: "#fff", letterSpacing: 2, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>WHAT IF YOU COULD TELEPORT</div>
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
          transform: `rotate(-2deg) scale(${sub})`,
        }}
      >
        …BUT KEPT YOUR MOMENTUM?
      </div>
    </div>
  );
};

const clock = (min: number) => {
  const total = Math.max(0, Math.round(min * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const fmt = (n: number) => (n < 10 && n % 1 ? n.toFixed(1) : Math.round(n).toLocaleString("en-US"));

const JumpCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const jump = jumpAt(frame);
  const timed = frame >= CLOCK_FROM && frame < CLOCK_TO;
  if (!jump && !timed) return null;
  const s = pop(frame, jump ? jump.from : CLOCK_FROM, fps);
  const min = minutesLeft(frame);
  const urgent = min <= 12;
  const hard = jump ? jump.mph > 5 : false;
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
        transform: `translateX(${(1 - Math.min(1, s)) * -420}px)`,
        boxShadow: "0 8px 0 rgba(0,0,0,0.22)",
        minWidth: 340,
      }}
    >
      {jump ? (
        <div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: TEAL }}>{jump.label}</div>
          <div style={{ fontSize: 34, lineHeight: 1.15, whiteSpace: "nowrap" }}>
            {jump.miles !== null ? (
              <>
                <span style={{ fontSize: 22, color: "#cfd8ea" }}>JUMP </span>
                <span style={{ color: "#ffd84d" }}>{fmt(jump.miles)}</span>
                <span style={{ fontSize: 22, color: "#cfd8ea" }}> MI → </span>
              </>
            ) : (
              <span style={{ fontSize: 22, color: "#cfd8ea" }}>MOMENTUM KEPT → </span>
            )}
            <span style={{ fontSize: 22, color: "#cfd8ea" }}>LAND </span>
            <span style={{ color: hard ? RED : TEAL, fontSize: 44 }}>{fmt(jump.mph)}</span>
            <span style={{ fontSize: 22 }}> MPH</span>
          </div>
        </div>
      ) : null}
      {timed ? (
        <div style={{ marginTop: jump ? 6 : 0 }}>
          <span style={{ fontSize: 20, letterSpacing: 3, color: urgent ? RED : TEAL }}>CANDLES IN </span>
          <span style={{ fontSize: 36, color: urgent ? RED : "#fff" }}>{clock(min)}</span>
        </div>
      ) : null}
    </div>
  );
};

/** Fact tags, top centre: [from, to, text]. */
const TAGS: [number, number, string][] = [
  [BEATS.thousand, BEATS.connecticut - 4, "EQUATOR: 1,037 MPH"],
  [BEATS.connecticut, BEATS.pole - 4, "CONNECTICUT: 779 MPH"],
  [BEATS.pole, shotEnd("spin"), "NORTH POLE: 0 MPH"],
  [BEATS.feel, shotEnd("still"), "YOU, THE GROUND, THE HOUSE, THE HEDGE: ALL 779 MPH"],
  [BEATS.sixtySeven, shotEnd("orbit"), "AROUND THE SUN: 67,000 MPH, ALL OF EARTH TOGETHER"],
  [BEATS.differentSpeed, BEATS.rule - 4, "SAME SPIN, DIFFERENT GROUND VELOCITY"],
  [BEATS.mile, shotEnd("rule"), "EVERY MILE YOU JUMP: UP TO ¼ MPH TOO FAST"],
  [BEATS.ninety, BEATS.easy - 6, "90 °F · 3:20 PM"],
  [BEATS.fortyHops, BEATS.thirtyFive - 6, "≈ 340 HOPS × ½ MIN ≈ 3 HOURS, EACH WAY"],
  [BEATS.axis, BEATS.parallel - 6, "EVERYTHING CIRCLES ONE AXIS"],
  [BEATS.exactly, BEATS.longitude - 4, "PARALLEL TO THE AXIS: SAME GROUND SPEED"],
  [BEATS.longitude, BEATS.winter - 6, "72.4° W · 44.4° N → 44.4° S"],
  [BEATS.winter, shotEnd("axis"), "JULY SOUTH OF THE EQUATOR = WINTER"],
  [BEATS.patagonia, BEATS.patagonia + 90, "QUEULAT, PATAGONIA, CHILE"],
  [BEATS.twentyTwo, BEATS.twentyTwo + 90, "22 HOPS × ½ MIN = 11 MINUTES"],
];

const Tag: React.FC<{ frame: number; fps: number; from: number; to: number; text: string }> = ({ frame, fps, from, to, text }) => {
  if (frame < from || frame > to) return null;
  const s = pop(frame, from, fps);
  const out = interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 44, left: 470, right: 40, textAlign: "center", opacity: out }}>
      <span
        style={{
          display: "inline-block",
          padding: "10px 26px",
          background: "#fff",
          color: "#18213a",
          borderRadius: 40,
          fontFamily: FONT,
          fontSize: 30,
          transform: `scale(${s})`,
          boxShadow: "0 8px 0 rgba(0,0,0,0.2)",
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** Shimmering heat at ninety degrees, warm and wavy at the frame edges. */
const Heat: React.FC<{ frame: number }> = ({ frame }) => {
  const a = interpolate(frame, [BEATS.ninety - 6, BEATS.ninety + 20, BEATS.easy - 10, BEATS.easy], [0, 0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (a <= 0) return null;
  return <AbsoluteFill style={{ opacity: a, background: "radial-gradient(ellipse at 50% 40%, rgba(255,220,150,0) 50%, rgba(255,170,90,0.35) 100%)" }} />;
};

/** Snow-blue edge on arrival in Patagonia. */
const Chill: React.FC<{ frame: number }> = ({ frame }) => {
  const a = interpolate(frame, [BEATS.colder - 10, BEATS.colder + 20, shotEnd("patagonia") - 10, shotEnd("patagonia")], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (a <= 0) return null;
  return <AbsoluteFill style={{ opacity: a, background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0) 58%, rgba(210,235,255,0.5) 88%, rgba(235,248,255,0.8) 100%)" }} />;
};

/** Big readouts over the globe at the launch idea. */
const Launch: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.aThousand || frame >= BEATS.comments - 20) return null;
  const s = pop(frame, BEATS.aThousand, fps);
  const l = pop(frame, BEATS.launch, fps);
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: TEAL, opacity: s }}>EQUATOR → NORTH POLE</div>
      <div style={{ fontSize: 76, color: "#ffd84d", transform: `scale(${s})`, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>1,037 MPH</div>
      {frame >= BEATS.launch ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 10,
            padding: "8px 34px",
            border: `8px solid ${TANGERINE}`,
            borderRadius: 20,
            fontSize: 70,
            color: "#fff",
            transform: `rotate(-3deg) scale(${2.2 - 1.2 * l})`,
            opacity: Math.min(1, l * 1.5),
            textShadow: "0 6px 0 rgba(0,0,0,0.35)",
          }}
        >
          NOT A CRASH. A LAUNCH.
        </div>
      ) : null}
    </div>
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.comments - 20) return null;
  const s = pop(frame, BEATS.comments - 20, fps);
  const sub = pop(frame, BEATS.subscribe, fps);
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 64, color: "#fff", transform: `scale(${s})`, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>WHERE WOULD YOU JUMP?</div>
      {frame >= BEATS.subscribe ? (
        <div style={{ marginTop: 26 }}>
          <span
            style={{
              display: "inline-block",
              padding: "12px 34px",
              background: "#e8423a",
              color: "#fff",
              borderRadius: 40,
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

export const JumpHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  const globeEnd = frame >= shotStart("launchGlobe");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Heat frame={frame} />
      <Chill frame={frame} />
      <TitleCard frame={frame} fps={fps} />
      {!globeEnd ? <JumpCard frame={frame} fps={fps} /> : null}
      {TAGS.map(([from, to, text]) => (
        <Tag key={text} frame={frame} fps={fps} from={from} to={to} text={text} />
      ))}
      <Launch frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
