import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BEATS,
  DURATION,
  FELT,
  TAU,
  ladderDeg,
  lineStart,
  progress,
  shotEnd,
  shotStart,
  thetaAt,
} from "./timeline";

/**
 * Reflexes HUD (1920x1080):
 *  - title card for the opening lines,
 *  - the felt-time stopwatch top-left (real seconds vs. what Kit feels, ×10),
 *  - the reaction-time bars and the signal-trip diagram for the "why" chapter,
 *  - fact tags top-centre on their beats,
 *  - blink lids, the slow speech bubble, the ache countdown,
 *  - the "EARLIER" stamp, the ladder's tip angle and its fall curve,
 *  - the end card.
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(24, 33, 58, 0.86)";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const RED = "#ff6b5a";
const GOLD = "#ffd84d";

const pop = (frame: number, at: number, fps: number) =>
  spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
const fade = (frame: number, from: number, to: number, len = 8) =>
  interpolate(frame, [from, from + len, to - len, to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const TitleCard: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const end = lineStart("a3") + 10;
  if (frame > end) return null;
  const s = pop(frame, 4, fps);
  const sub = pop(frame, BEATS.catchWord, fps);
  const out = interpolate(frame, [end - 18, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: out,
        transform: `scale(${0.6 + 0.4 * s})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 72,
          color: "#fff",
          letterSpacing: 2,
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
      >
        WHAT IF YOU COULD REACT 10X FASTER
      </div>
      {frame >= BEATS.catchWord ? (
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
          …BUT YOUR BODY COULDN'T?
        </div>
      ) : null}
    </div>
  );
};

/** Real seconds vs felt seconds while a slow-motion moment plays. */
const STOPWATCH: {
  from: number;
  to: number;
  hold: number;
  real: number;
  label: string;
}[] = [
  { ...FELT.milk, hold: shotStart("replay"), label: "THE MILK" },
  { ...FELT.ball, hold: shotEnd("gym"), label: "THE BALL" },
  { ...FELT.ladder, hold: BEATS.thump, label: "THE LADDER" },
];

const Stopwatch: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const sw = STOPWATCH.filter((s) => frame >= s.from && frame < s.hold)[0];
  if (!sw) return null;
  const real = sw.real * progress(frame, [sw.from, sw.to]);
  const s = pop(frame, sw.from, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        left: 40,
        padding: "14px 24px",
        background: NAVY,
        borderRadius: 22,
        border: `4px solid ${TEAL}`,
        color: "#fff",
        fontFamily: FONT,
        transform: `translateX(${(1 - Math.min(1, s)) * -420}px)`,
        boxShadow: "0 8px 0 rgba(0,0,0,0.22)",
        minWidth: 330,
      }}
    >
      <div style={{ fontSize: 20, letterSpacing: 3, color: TEAL }}>
        {sw.label}
      </div>
      <div style={{ fontSize: 22, color: "#cfd8ea", marginTop: 4 }}>
        REAL{" "}
        <span style={{ fontSize: 40, color: "#fff" }}>{real.toFixed(2)}</span> s
      </div>
      <div style={{ fontSize: 22, color: "#cfd8ea" }}>
        FEELS LIKE{" "}
        <span style={{ fontSize: 40, color: GOLD }}>
          {(real * 10).toFixed(1)}
        </span>{" "}
        s
      </div>
    </div>
  );
};

/** Reaction time, split into its parts: normal vs. Kit (brain ×10, nerves and muscle unchanged). */
const PARTS = [
  { key: "see", label: "SEE + DECIDE", color: GOLD, normal: 0.17, you: 0.017 },
  { key: "nerve", label: "NERVES", color: "#4fd1ff", normal: 0.03, you: 0.03 },
  { key: "muscle", label: "MUSCLE", color: TANGERINE, normal: 0.05, you: 0.05 },
];
const BAR_PX = 2600;

const Bars: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.quarter - 4;
  const to = shotEnd("body");
  if (frame < from || frame >= to) return null;
  const shrink = interpolate(frame, [BEATS.nowTen, BEATS.nowTen + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showYou = frame >= BEATS.nowTen - 4;
  const lit = (k: string) =>
    k === "see"
      ? frame >= BEATS.inside
      : k === "nerve"
        ? frame >= BEATS.nerves
        : frame >= BEATS.muscle;
  const row = (
    label: string,
    value: (p: (typeof PARTS)[number]) => number,
    total: string,
    at: number,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: 12,
        transform: `scale(${pop(frame, at, fps)})`,
        transformOrigin: "left center",
      }}
    >
      <div style={{ width: 120, fontSize: 24, color: "#cfd8ea" }}>{label}</div>
      <div
        style={{
          display: "flex",
          height: 40,
          borderRadius: 10,
          overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.6)",
        }}
      >
        {PARTS.map((p) => (
          <div
            key={p.key}
            style={{
              width: value(p) * BAR_PX,
              background: p.color,
              opacity: lit(p.key) ? 1 : 0.35,
            }}
          />
        ))}
      </div>
      <div style={{ marginLeft: 16, fontSize: 34, color: "#fff" }}>{total}</div>
    </div>
  );
  const youTotal = PARTS.reduce(
    (a, p) => a + p.normal + (p.you - p.normal) * shrink,
    0,
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        padding: "16px 26px",
        background: NAVY,
        borderRadius: 22,
        color: "#fff",
        fontFamily: FONT,
        opacity: fade(frame, from, to),
      }}
    >
      <div style={{ display: "flex", gap: 22, fontSize: 18, letterSpacing: 2 }}>
        {PARTS.map((p) => (
          <span
            key={p.key}
            style={{ color: p.color, opacity: lit(p.key) ? 1 : 0.4 }}
          >
            ■ {p.label}
          </span>
        ))}
      </div>
      {row("NORMAL", (p) => p.normal, "0.25 s", from)}
      {showYou
        ? row(
            "YOU",
            (p) => p.normal + (p.you - p.normal) * shrink,
            `${youTotal.toFixed(2)} s`,
            BEATS.nowTen - 4,
          )
        : null}
      {frame >= BEATS.twoAndHalf ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 30,
            color: GOLD,
            transform: `scale(${pop(frame, BEATS.twoAndHalf, fps)})`,
            transformOrigin: "left center",
          }}
        >
          BRAIN 10× · REACTION ONLY 2.5×
        </div>
      ) : null}
    </div>
  );
};

/**
 * The signal's trip, as an anatomy diagram beside Kit (right third): eye → brain (the part that got
 * 10x faster), then brain → spine → arm nerve → the muscle (not one bit faster).
 */
type Pt = [number, number];
const EYE_BRAIN: Pt[] = [
  [282, 162],
  [258, 132],
  [232, 116],
];
const BRAIN_HAND: Pt[] = [
  [232, 116],
  [234, 205],
  [232, 272],
  [176, 286],
  [146, 380],
  [124, 468],
];
const pathD = (pts: Pt[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
const pointAt = (pts: Pt[], t: number): Pt => {
  const seg = pts
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = Math.max(0, Math.min(1, t)) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? Math.min(1, d / seg[i]) : 0;
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u,
      ];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};

const SignalMap: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const from = BEATS.eyes - 6;
  const to = shotEnd("body");
  if (frame < from || frame >= to) return null;
  const see =
    frame >= BEATS.nowTen ? 1 : progress(frame, [BEATS.eyes, BEATS.decides]);
  const nerve = progress(frame, [BEATS.nerves, BEATS.thought + 10]);
  const muscle =
    frame >= BEATS.muscle
      ? Math.min(1, (frame - BEATS.muscle) / 10) *
        (0.75 + 0.25 * Math.sin(frame * 0.4))
      : 0;
  const brainLit = see >= 1 ? 1 : 0.25 + 0.5 * see;
  const line = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const body = {
    fill: "rgba(255,255,255,0.07)",
    stroke: "rgba(255,255,255,0.55)",
    strokeWidth: 4,
  };
  const label = (
    x: number,
    y: number,
    text: string,
    color: string,
    anchor: "start" | "middle" | "end" = "start",
    size = 24,
  ) => (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontFamily={FONT}
      textAnchor={anchor}
      letterSpacing={2}
    >
      {text}
    </text>
  );
  const pulse = (pts: Pt[], t: number, color: string) => {
    if (t <= 0 || t >= 1) return null;
    const [x, y] = pointAt(pts, t);
    return (
      <circle cx={x} cy={y} r={11} fill={color} stroke="#fff" strokeWidth={3} />
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 50,
        width: 470,
        padding: "18px 10px 6px",
        background: NAVY,
        borderRadius: 22,
        fontFamily: FONT,
        opacity: fade(frame, from, to),
        transform: `scale(${pop(frame, from, fps)})`,
        transformOrigin: "right top",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 22,
          letterSpacing: 3,
          color: "#cfd8ea",
        }}
      >
        THE SIGNAL&apos;S TRIP
      </div>
      <svg viewBox="0 0 470 710" width={470} height={710}>
        <g transform="translate(-50 0)">
          {/* Kit's outline: big head, torso, the reaching arm, legs. */}
          <rect x={192} y={455} width={38} height={175} rx={18} {...body} />
          <rect x={250} y={455} width={38} height={175} rx={18} {...body} />
          <line
            x1={176}
            y1={286}
            x2={124}
            y2={468}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={50}
            strokeLinecap="round"
          />
          <line
            x1={176}
            y1={286}
            x2={124}
            y2={468}
            stroke="#25304d"
            strokeWidth={42}
            strokeLinecap="round"
          />
          <rect x={172} y={258} width={136} height={205} rx={42} {...body} />
          <circle cx={240} cy={150} r={98} {...body} />
          {/* Muscle in the upper arm. */}
          <ellipse
            cx={154}
            cy={345}
            rx={17}
            ry={40}
            transform="rotate(16 154 345)"
            fill={TANGERINE}
            opacity={0.2 + 0.8 * muscle}
          />
          {/* Brain and eye. */}
          <ellipse
            cx={226}
            cy={112}
            rx={52}
            ry={36}
            fill="#ff8fc8"
            opacity={brainLit}
          />
          <circle cx={284} cy={164} r={15} fill="#fff" />
          <circle cx={288} cy={164} r={7} fill="#18213a" />
          {/* Paths: dim track, then the lit part, then the travelling pulse. */}
          <path
            d={pathD(EYE_BRAIN)}
            stroke={GOLD}
            strokeOpacity={0.25}
            strokeWidth={8}
            {...line}
          />
          <path
            d={pathD(EYE_BRAIN)}
            stroke={GOLD}
            strokeWidth={8}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - see}
            {...line}
          />
          <path
            d={pathD(BRAIN_HAND)}
            stroke="#4fd1ff"
            strokeOpacity={0.25}
            strokeWidth={8}
            {...line}
          />
          <path
            d={pathD(BRAIN_HAND)}
            stroke="#4fd1ff"
            strokeWidth={8}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - nerve}
            {...line}
          />
          {pulse(EYE_BRAIN, frame >= BEATS.nowTen ? 0 : see, GOLD)}
          {pulse(BRAIN_HAND, nerve, "#4fd1ff")}
        </g>
        {label(296, 172, "EYE", GOLD)}
        {label(296, 100, "BRAIN", "#ff8fc8")}
        {frame >= BEATS.nowTen ? label(296, 132, "10× FASTER", GOLD, "start", 20) : null}
        {label(276, 330, "NERVES", "#4fd1ff")}
        {frame >= BEATS.none ? label(276, 362, "SAME SPEED", RED, "start", 20) : null}
        {label(12, 672, "MUSCLE", TANGERINE)}
        {frame >= BEATS.none
          ? label(12, 700, "SAME SPEED", RED, "start", 18)
          : null}
      </svg>
    </div>
  );
};

/** Fact tags, top centre: [from, to, text]. */
const TAGS: [number, number, string][] = [
  [BEATS.blink, BEATS.know - 4, "10× THOUGHTS = WORLD IN 10× SLOW MOTION"],
  [BEATS.twoHundred, BEATS.muscle - 6, "NERVES: ~200 MPH"],
  [BEATS.switchOn, BEATS.none - 4, "MUSCLE SWITCH-ON: 1/20 s"],
  [BEATS.line, shotEnd("race"), "UNDER 0.100 s = FALSE START"],
  [BEATS.slower, shotEnd("self"), "YOUR BODY: 10× SLOWER TOO"],
  [BEATS.dark, BEATS.talking - 4, "A BLINK: 0.15 s → FEELS LIKE 1.5 s"],
  [BEATS.sixty, shotEnd("classroom") - 4, "6 HOURS → FEELS LIKE 60"],
  [
    BEATS.walkingSpeed,
    BEATS.eleven - 4,
    "THE ACHE TRAVELS AT ~1.5 m/s: 1.1 s TO YOUR BRAIN",
  ],
  [BEATS.forty, BEATS.plenty - 4, "40 MPH OVER 20 FT = 0.33 s"],
  [BEATS.sideways, BEATS.watchCome - 4, "A SIDESTEP TAKES ~0.35 s"],
  [BEATS.quarterD, BEATS.everyoneElse - 4, "THE WINDUP: 0.25 s OF WARNING"],
  [BEATS.cannotRun, BEATS.normalKid - 4, "4 STEPS ≈ 1.5 s"],
  [BEATS.wobble, shotEnd("night") - 6, "A FALL STARTS AS A WOBBLE"],
];

const Tag: React.FC<{
  frame: number;
  fps: number;
  from: number;
  to: number;
  text: string;
}> = ({ frame, fps, from, to, text }) => {
  if (frame < from || frame > to) return null;
  const s = pop(frame, from, fps);
  const out = interpolate(frame, [to - 8, to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 420,
        right: 40,
        textAlign: "center",
        opacity: out,
      }}
    >
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

/** "Catch it.": a thought bubble that pops instantly, the point of the opening. */
const Thought: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.catchIt || frame > BEATS.tell) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 260,
        fontFamily: FONT,
        transform: `scale(${pop(frame, BEATS.catchIt, fps)})`,
      }}
    >
      <div
        style={{
          padding: "16px 34px",
          background: "#fff",
          color: "#18213a",
          borderRadius: 60,
          fontSize: 52,
          boxShadow: "0 8px 0 rgba(0,0,0,0.2)",
        }}
      >
        CATCH IT.
      </div>
    </div>
  );
};

/** A blink at 10x: the lids close and the world is dark for a second and a half. */
const Lids: React.FC<{ frame: number }> = ({ frame }) => {
  const a = BEATS.blinkC;
  const b = BEATS.dark + 30;
  if (frame < a || frame > b + 10) return null;
  const close = interpolate(frame, [a, a + 8, b, b + 10], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const h = 50 * close;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${h}%`,
          background: "#0d0a10",
          borderBottomLeftRadius: "50% 30%",
          borderBottomRightRadius: "50% 30%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${h}%`,
          background: "#0d0a10",
          borderTopLeftRadius: "50% 30%",
          borderTopRightRadius: "50% 30%",
        }}
      />
    </AbsoluteFill>
  );
};

/** Kit's sentence, finished in his head, spelled out by his mouth one slow word at a time. */
const SPEECH: [number, string][] = [
  [BEATS.mouth, "I"],
  [BEATS.one, "THINK"],
  [BEATS.slow, "THE"],
  [BEATS.word, "ANSWER"],
  [BEATS.aTime, "IS…"],
];
const Speech: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.finish || frame > BEATS.sixHour - 6) return null;
  const said = SPEECH.filter(([at]) => frame >= at);
  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "14px 30px",
          background: "rgba(255,255,255,0.92)",
          borderRadius: 40,
          color: "#18213a",
          fontSize: 26,
          transform: `scale(${pop(frame, BEATS.finish, fps)})`,
        }}
      >
        <span style={{ color: "#8a93a6" }}>IN YOUR HEAD: </span>"I THINK THE
        ANSWER IS FORTY TWO."
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 56,
          color: "#fff",
          textShadow: "0 5px 0 rgba(0,0,0,0.4)",
        }}
      >
        {said.map(([at, w]) => (
          <span
            key={w}
            style={{
              display: "inline-block",
              marginRight: 22,
              transform: `scale(${pop(frame, at, fps)})`,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

/** The ache, still on its way: felt seconds until it arrives. */
const Ache: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.eleven - 4;
  if (frame < from || frame > BEATS.arrives + 20) return null;
  const left = Math.max(
    0,
    11 * (1 - progress(frame, [BEATS.stub, BEATS.arrives])),
  );
  const arrived = frame >= BEATS.arrives;
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        padding: "14px 26px",
        background: NAVY,
        borderRadius: 22,
        border: `4px solid ${RED}`,
        fontFamily: FONT,
        color: "#fff",
        transform: `scale(${pop(frame, from, fps)})`,
        transformOrigin: "left top",
      }}
    >
      <div style={{ fontSize: 20, letterSpacing: 3, color: RED }}>
        ACHE ARRIVING IN
      </div>
      <div style={{ fontSize: 64, color: arrived ? RED : "#fff" }}>
        {arrived ? "NOW" : `${left.toFixed(1)} s`}
      </div>
    </div>
  );
};

const Stamp: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.earlier || frame > BEATS.wins - 4) return null;
  const s = pop(frame, BEATS.earlier, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 34,
          color: "#cfd8ea",
          letterSpacing: 4,
          textShadow: "0 4px 0 rgba(0,0,0,0.4)",
        }}
      >
        NOT <s>FASTER</s>
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "8px 40px",
          border: `8px solid ${TANGERINE}`,
          borderRadius: 20,
          fontSize: 96,
          color: "#fff",
          transform: `rotate(-4deg) scale(${2.2 - 1.2 * s})`,
          opacity: Math.min(1, s * 1.5),
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
      >
        EARLIER
      </div>
    </div>
  );
};

/** The ladder's tip angle, from the first rock to the thump back down. */
const Tilt: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (
    frame < BEATS.rocks ||
    frame > BEATS.thump + 20 ||
    (frame >= shotStart("graph") && frame < shotStart("save"))
  )
    return null;
  const d = ladderDeg(frame);
  const danger = d >= 5;
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        right: 40,
        padding: "12px 24px",
        background: NAVY,
        borderRadius: 22,
        border: `4px solid ${danger ? RED : GOLD}`,
        fontFamily: FONT,
        color: "#fff",
        transform: `scale(${pop(frame, BEATS.rocks, fps)})`,
        transformOrigin: "right top",
      }}
    >
      <div
        style={{ fontSize: 20, letterSpacing: 3, color: danger ? RED : GOLD }}
      >
        LADDER TIP
      </div>
      <div style={{ fontSize: 64 }}>
        {d < 10 ? d.toFixed(1) : Math.round(d)}°
      </div>
    </div>
  );
};

/** The tipping curve: theta = 1° · cosh(t / 0.45 s), with you and a normal kid marked. */
const GRAPH_T = 2.34;
const Graph: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = shotStart("graph");
  const to = shotEnd("graph");
  if (frame < from || frame >= to) return null;
  const W = 900;
  const H = 440;
  const x = (t: number) => 70 + (t / GRAPH_T) * (W - 110);
  const y = (deg: number) => H - 50 - (Math.min(deg, 90) / 90) * (H - 90);
  const drawn = interpolate(
    frame,
    [BEATS.barely, BEATS.hitsGround + 10],
    [0.05, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pts = Array.from({ length: 80 }, (_, i) => (i / 79) * GRAPH_T * drawn)
    .map((t) => `${x(t)},${y(thetaAt(t))}`)
    .join(" ");
  const mark = (
    t: number,
    deg: number,
    label: string,
    color: string,
    at: number,
  ) =>
    frame >= at ? (
      <g
        key={label}
        transform={`translate(${x(t)},${y(deg)}) scale(${pop(frame, at, fps)})`}
      >
        <circle r={12} fill={color} stroke="#fff" strokeWidth={4} />
        <text x={18} y={-16} fill={color} fontSize={26} fontFamily={FONT}>
          {label}
        </text>
      </g>
    ) : null;
  const tNormal = 1.04 + 0.25 + 1.4;
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 0,
        right: 40,
        display: "flex",
        // Top-right, clear of Grandpa on the ladder (left) and of Kit and Tess (below it).
        justifyContent: "flex-end",
        opacity: fade(frame, from, to, 10),
      }}
    >
      <svg width={W} height={H} style={{ background: NAVY, borderRadius: 24 }}>
        <text
          x={30}
          y={40}
          fill={GOLD}
          fontSize={26}
          fontFamily={FONT}
          letterSpacing={2}
        >
          A TIPPING LADDER (τ = {TAU} s)
        </text>
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(GRAPH_T)}
          y2={y(0)}
          stroke="#cfd8ea"
          strokeWidth={3}
        />
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(0)}
          y2={y(90)}
          stroke="#cfd8ea"
          strokeWidth={3}
        />
        <text
          x={x(GRAPH_T) - 60}
          y={y(0) + 34}
          fill="#cfd8ea"
          fontSize={22}
          fontFamily={FONT}
        >
          TIME
        </text>
        <polyline
          points={pts}
          fill="none"
          stroke={GOLD}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        {mark(0, 1, "1° YOU SEE IT", TEAL, BEATS.secret)}
        {mark(1.04, 5, "5° · 1 s", "#fff", BEATS.fiveDeg)}
        {mark(GRAPH_T, 90, "GROUND · 2.3 s", RED, BEATS.hitsGround)}
        {frame >= BEATS.normalKid ? (
          <g
            transform={`translate(${x(Math.min(tNormal, GRAPH_T + 0.2))},${y(0) - 30})`}
          >
            <text textAnchor="end" fill={RED} fontSize={24} fontFamily={FONT}>
              NORMAL KID ARRIVES · 2.7 s
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.deal - 6) return null;
  const s = pop(frame, BEATS.deal - 6, fps);
  const sub = pop(frame, BEATS.subscribe, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 64,
          color: "#fff",
          transform: `scale(${s})`,
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
      >
        WOULD YOU TAKE THE DEAL?
      </div>
      {frame >= BEATS.sameOld ? (
        <div
          style={{
            fontSize: 34,
            color: GOLD,
            marginTop: 10,
            textShadow: "0 4px 0 rgba(0,0,0,0.35)",
          }}
        >
          BRAIN 10× · BODY 1×
        </div>
      ) : null}
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

export const ReflexHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Lids frame={frame} />
      <TitleCard frame={frame} fps={fps} />
      <Stopwatch frame={frame} fps={fps} />
      <Bars frame={frame} fps={fps} />
      <SignalMap frame={frame} fps={fps} />
      {TAGS.map(([from, to, text]) => (
        <Tag
          key={text}
          frame={frame}
          fps={fps}
          from={from}
          to={to}
          text={text}
        />
      ))}
      <Thought frame={frame} fps={fps} />
      <Speech frame={frame} fps={fps} />
      <Ache frame={frame} fps={fps} />
      <Stamp frame={frame} fps={fps} />
      <Tilt frame={frame} fps={fps} />
      <Graph frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
