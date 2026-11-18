import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, DURATION, WOUNDS, energy, lineEnd, lineStart, progress, shotEnd, shotStart } from "./timeline";

/**
 * Heal HUD (1920x1080):
 *  - title card for the opening lines,
 *  - the ENERGY gauge top-left (drains as Kit heals, refills as he eats),
 *  - a ×100 magnifier on each healing wound (normal time vs Kit's time),
 *  - the bill chart, the digestion clock and the savings bars for "why",
 *  - fact tags top-centre on their beats,
 *  - the X-ray of the break (crack, knitting, the crooked warning, the cast),
 *  - the night clock, the Thanksgiving math, the BUDGET stamp, the end card.
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(24, 33, 58, 0.86)";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const RED = "#ff6b5a";
const GOLD = "#ffd84d";
const GREEN = "#6fdc7a";

const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
const fade = (frame: number, from: number, to: number, len = 8) =>
  interpolate(frame, [from, from + len, to - len, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const panel: React.CSSProperties = { position: "absolute", background: NAVY, borderRadius: 22, color: "#fff", fontFamily: FONT, boxShadow: "0 8px 0 rgba(0,0,0,0.22)" };

const TitleCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const end = lineStart("a3") + 10;
  if (frame > end) return null;
  const s = pop(frame, 4, fps);
  const sub = pop(frame, BEATS.catchWord, fps);
  const out = interpolate(frame, [end - 18, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", opacity: out, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ fontFamily: FONT, fontSize: 72, color: "#fff", letterSpacing: 2, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>WHAT IF YOU HEALED 100X FASTER</div>
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
          …BUT YOU WERE ALWAYS STARVING?
        </div>
      ) : null}
    </div>
  );
};

/** The ENERGY gauge: shown whenever Kit is living his life (not on the explainer stage or the end card). */
const GAUGE_OFF: [number, number][] = [
  [0, lineStart("a3")],
  [shotStart("body"), shotEnd("body")],
  [shotStart("xray"), shotEnd("xray")],
  [BEATS.deal - 10, DURATION + 1],
];
const Gauge: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (GAUGE_OFF.some(([a, b]) => frame >= a && frame < b)) return null;
  const e = energy(frame);
  const prev = energy(frame - 6);
  const draining = e < prev - 0.002;
  const filling = e > prev + 0.002;
  const color = e < 0.2 ? RED : e < 0.45 ? GOLD : GREEN;
  const s = Math.min(1, pop(frame, lineStart("a3"), fps));
  const blink = e < 0.2 && Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ ...panel, top: 36, left: 40, padding: "14px 22px", border: `4px solid ${TEAL}`, minWidth: 330, transform: `translateX(${(1 - s) * -420}px)` }}>
      <div style={{ fontSize: 20, letterSpacing: 3, color: TEAL, display: "flex", justifyContent: "space-between" }}>
        <span>ENERGY</span>
        <span style={{ color: draining ? RED : filling ? GREEN : "#cfd8ea" }}>{draining ? "▼ HEALING" : filling ? "▲ EATING" : ""}</span>
      </div>
      <div style={{ marginTop: 10, width: 300, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.12)", overflow: "hidden", border: "3px solid rgba(255,255,255,0.25)" }}>
        <div style={{ width: `${Math.round(e * 100)}%`, height: "100%", background: color, opacity: blink ? 0.45 : 1 }} />
      </div>
    </div>
  );
};

/** The ×100 magnifier: a wound closing, with its normal healing time and Kit's. */
const BUBBLES: { wound: keyof typeof WOUNDS; normal: string; fast: string; hold: number; kind: "cut" | "scrape" | "bruise" }[] = [
  { wound: "cut", normal: "3 DAYS", fast: "40 MIN", hold: BEATS.hungryAgain + 10, kind: "cut" },
  { wound: "knee", normal: "2 WEEKS", fast: "3 HOURS", hold: shotEnd("scrape"), kind: "scrape" },
  { wound: "bruise", normal: "2 WEEKS", fast: "BY LUNCH", hold: shotEnd("lunch"), kind: "bruise" },
];
const Bubble: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const b = BUBBLES.filter((x) => frame >= WOUNDS[x.wound].from - 4 && frame < x.hold)[0];
  if (!b) return null;
  const { from, to } = WOUNDS[b.wound];
  const t = progress(frame, [from + 6, to]);
  const s = pop(frame, from - 4, fps);
  const wound =
    b.kind === "cut" ? (
      <line x1={70 + 30 * t} y1={130} x2={190 - 30 * t} y2={110} stroke="#c23a3a" strokeWidth={10 * (1 - t) + 1} strokeLinecap="round" opacity={1 - t * 0.9} />
    ) : b.kind === "scrape" ? (
      <ellipse cx={130} cy={120} rx={60 * (1 - 0.8 * t)} ry={34 * (1 - 0.8 * t)} fill="#d65b4a" opacity={1 - t * 0.85} />
    ) : (
      <ellipse cx={130} cy={120} rx={58} ry={40} fill={t < 0.5 ? "#7b5aa6" : "#c9b44a"} opacity={0.8 * (1 - t)} />
    );
  return (
    <div style={{ position: "absolute", top: 160, left: 40, transform: `scale(${s})`, transformOrigin: "top left" }}>
      <svg width={260} height={260}>
        <circle cx={130} cy={120} r={110} fill="#e9b48f" stroke={GOLD} strokeWidth={8} />
        {wound}
        <circle cx={130} cy={120} r={110} fill="none" stroke="rgba(255,216,77,0.35)" strokeWidth={16} strokeDasharray={`${691 * t} 691`} transform="rotate(-90 130 120)" />
      </svg>
      <div style={{ ...panel, position: "relative", marginTop: -14, padding: "8px 16px", fontSize: 24, textAlign: "center", width: 228 }}>
        <span style={{ color: "#cfd8ea", textDecoration: "line-through" }}>{b.normal}</span> → <span style={{ color: GOLD }}>{b.fast}</span>
      </div>
    </div>
  );
};

const TAGS: [number, number, string][] = [
  [BEATS.calories, BEATS.spread - 4, "HEALING = BUILDING: PROTEIN + CALORIES"],
  [BEATS.candy, shotEnd("scrape") - 4, "SCRAPED KNEE ≈ A CANDY BAR"],
  [BEATS.horse, shotEnd("pantry") - 4, "GROCERY BILL ×3"],
  [BEATS.heat, BEATS.bike - 4, "BURNING ENERGY = HEAT"],
  [BEATS.tenHours, BEATS.remembers - 4, "BROKEN ARM: 6 WEEKS → 10 HOURS"],
  [BEATS.tenThousand, BEATS.marathon - 4, "≈ 10,000 EXTRA CALORIES · ≈ 5 DAYS OF FOOD"],
  [BEATS.marathon, lineEnd("d13") + 6, "≈ 1,000 CALORIES AN HOUR: MARATHON PACE"],
  [BEATS.kilo, shotEnd("morning") - 4, "−1.3 kg OF FAT"],
];
const Tag: React.FC<{ frame: number; fps: number; from: number; to: number; text: string }> = ({ frame, fps, from, to, text }) => {
  if (frame < from || frame > to) return null;
  const s = pop(frame, from, fps);
  const out = interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 44, left: 420, right: 40, textAlign: "center", opacity: out }}>
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

/** "Healing is building": three blocks (skin, vessels, bone) built from food. */
const Build: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.skin - 4;
  const to = BEATS.spread - 6;
  if (frame < from || frame >= to) return null;
  const items: [number, string, string][] = [
    [BEATS.skin, "SKIN", "#e9b48f"],
    [BEATS.vessels, "BLOOD VESSELS", "#e2533c"],
    [BEATS.bone, "BONE", "#f3efe6"],
  ];
  return (
    <div style={{ ...panel, top: 150, right: 60, width: 470, padding: "20px 26px", opacity: fade(frame, from, to) }}>
      <div style={{ fontSize: 24, letterSpacing: 3, color: GOLD }}>YOUR BODY BUILDS</div>
      {items.map(([at, label, color]) =>
        frame >= at ? (
          <div key={label} style={{ display: "flex", alignItems: "center", marginTop: 14, transform: `scale(${pop(frame, at, fps)})`, transformOrigin: "left" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: color, border: "3px solid #fff" }} />
            <div style={{ marginLeft: 16, fontSize: 32 }}>{label}</div>
          </div>
        ) : null,
      )}
      {frame >= BEATS.protein ? (
        <div style={{ marginTop: 22, fontSize: 26, color: "#cfd8ea" }}>
          FROM <span style={{ color: TEAL }}>PROTEIN</span> (BRICKS){frame >= BEATS.calories ? <> + <span style={{ color: TANGERINE }}>CALORIES</span> (WORK)</> : null}
        </div>
      ) : null}
    </div>
  );
};

/** The bill: six weeks of small daily costs vs one tall bar paid all at once. */
const Bill: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.spread - 4;
  const to = BEATS.foodSlow - 4;
  if (frame < from || frame >= to) return null;
  const grow = progress(frame, [BEATS.spread, BEATS.everyMeal + 20]);
  const once = progress(frame, [BEATS.billOnce, BEATS.atOnce + 10]);
  const W = 560;
  const H = 360;
  return (
    <div style={{ ...panel, top: 150, right: 60, padding: "18px 22px", opacity: fade(frame, from, to) }}>
      <div style={{ fontSize: 24, letterSpacing: 3, color: GOLD }}>THE HEALING BILL</div>
      <svg width={W} height={H}>
        <line x1={20} y1={H - 50} x2={W - 10} y2={H - 50} stroke="#cfd8ea" strokeWidth={3} />
        {Array.from({ length: 42 }, (_, i) => {
          const h = 26 * Math.min(1, Math.max(0, grow * 42 - i));
          return <rect key={i} x={24 + i * 8.4} y={H - 50 - h} width={6} height={h} fill={TEAL} rx={2} />;
        })}
        <text x={24} y={H - 18} fill="#cfd8ea" fontSize={22} fontFamily={FONT}>
          NORMAL: 6 WEEKS, A LITTLE EACH DAY
        </text>
        {frame >= BEATS.billOnce ? (
          <g transform={`scale(1 1)`}>
            <rect x={W - 90} y={H - 50 - 270 * once} width={64} height={270 * once} fill={RED} rx={6} />
            <text x={W - 58} y={H - 60 - 270 * once} textAnchor="middle" fill={RED} fontSize={22} fontFamily={FONT}>
              ×100
            </text>
          </g>
        ) : null}
      </svg>
      {frame >= BEATS.atOnce ? <div style={{ fontSize: 26, color: RED, transform: `scale(${pop(frame, BEATS.atOnce, fps)})`, transformOrigin: "left" }}>YOU: ALL OF IT, AT ONCE</div> : null}
    </div>
  );
};

/** Food is slow; the body pays from its savings: fat first, then muscle. */
const Savings: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.foodSlow - 4;
  const to = shotEnd("body");
  if (frame < from || frame >= to) return null;
  const digest = progress(frame, [BEATS.digest, BEATS.savings]);
  const fat = 1 - 0.55 * progress(frame, [BEATS.fat, BEATS.fat + 30]);
  const muscle = 1 - 0.3 * progress(frame, [BEATS.muscle, BEATS.muscle + 30]);
  const bar = (label: string, v: number, color: string, at: number) =>
    frame >= at ? (
      <div key={label} style={{ marginTop: 16, transform: `scale(${pop(frame, at, fps)})`, transformOrigin: "left" }}>
        <div style={{ fontSize: 24, color: "#cfd8ea" }}>{label}</div>
        <div style={{ width: 400, height: 28, borderRadius: 14, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ width: `${v * 100}%`, height: "100%", background: color }} />
        </div>
      </div>
    ) : null;
  return (
    <div style={{ ...panel, top: 150, right: 60, width: 460, padding: "18px 26px", opacity: fade(frame, from, to) }}>
      <div style={{ fontSize: 24, letterSpacing: 3, color: GOLD }}>FOOD → FUEL</div>
      <div style={{ marginTop: 8, fontSize: 30 }}>
        DIGESTING… <span style={{ color: TEAL }}>{Math.round(digest * 100)}%</span> <span style={{ fontSize: 22, color: "#cfd8ea" }}>(HOURS)</span>
      </div>
      {bar("SAVINGS: FAT", fat, GOLD, BEATS.savings)}
      {bar("SAVINGS: MUSCLE", muscle, RED, BEATS.muscle)}
    </div>
  );
};

/** The X-ray: the crack, the 10-hour countdown, the crooked warning, then set straight and cast. */
const Xray: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.crack;
  const to = BEATS.night - 4;
  if (frame < from || frame >= to) return null;
  const s = pop(frame, from, fps);
  const knit = progress(frame, [BEATS.knitting, BEATS.crooked + 30]);
  const set = progress(frame, [BEATS.straightens, BEATS.straightens + 12]);
  const angle = 18 * (1 - set);
  const castOn = frame >= BEATS.cast;
  const warn = frame >= BEATS.shape && frame < BEATS.straightens;
  const flash = frame < from + 6 ? 1 - (frame - from) / 6 : 0;
  return (
    <div style={{ ...panel, top: 150, right: 60, width: 480, padding: "18px 22px", border: `4px solid ${warn && Math.floor(frame / 10) % 2 ? RED : TEAL}`, transform: `scale(${s})`, transformOrigin: "top right" }}>
      <div style={{ fontSize: 24, letterSpacing: 3, color: TEAL }}>X-RAY · LEFT ARM</div>
      <svg width={436} height={260} style={{ background: "#0d1526", borderRadius: 12, marginTop: 8 }}>
        <g transform="translate(60 130)">
          <rect x={0} y={-16} width={150} height={32} rx={16} fill="#dfe9f5" />
          <g transform={`translate(160 0) rotate(${angle})`}>
            <rect x={0} y={-16} width={150} height={32} rx={16} fill="#dfe9f5" />
          </g>
          <ellipse cx={155} cy={0} rx={10 + 18 * knit} ry={20 + 10 * knit} fill="#9ed8ff" opacity={0.25 + 0.6 * knit} />
          {frame < BEATS.knitting ? <path d="M 150 -20 L 158 -4 L 148 6 L 160 22" stroke={RED} strokeWidth={5} fill="none" /> : null}
          {castOn ? <rect x={40} y={-34} width={240} height={68} rx={30} fill="rgba(255,255,255,0.28)" stroke="#fff" strokeWidth={3} /> : null}
        </g>
        {flash > 0 ? <rect width={436} height={260} fill="#fff" opacity={flash} /> : null}
      </svg>
      <div style={{ marginTop: 10, fontSize: 28 }}>
        {warn ? (
          <span style={{ color: RED }}>HEALING CROOKED IN ~3 HOURS</span>
        ) : castOn ? (
          <span style={{ color: GREEN }}>SET STRAIGHT · CAST ON</span>
        ) : frame >= BEATS.sixWeeks ? (
          <>
            <span style={{ color: "#cfd8ea", textDecoration: "line-through" }}>6 WEEKS</span> → <span style={{ color: GOLD }}>10 HOURS</span>
          </>
        ) : (
          <span style={{ color: RED }}>FRACTURE</span>
        )}
      </div>
    </div>
  );
};

/** The night: the time, big, as Kit wakes up starving. */
const NightClock: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const marks: [number, string][] = [
    [BEATS.midnight, "12:00 AM"],
    [BEATS.two, "2:00 AM"],
    [BEATS.four, "4:00 AM"],
  ];
  const m = marks.filter(([at]) => frame >= at && frame < at + 34)[0];
  if (!m) return null;
  return (
    <div style={{ position: "absolute", top: 120, right: 80, fontFamily: FONT, fontSize: 84, color: GOLD, textShadow: "0 6px 0 rgba(0,0,0,0.4)", transform: `scale(${pop(frame, m[0], fps)})` }}>
      {m[1]}
    </div>
  );
};

/** Thanksgiving math: Tess heals in weeks, Kit pays with dinner. */
const MathCards: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const from = BEATS.math;
  const to = BEATS.sprint - 2;
  if (frame < from || frame >= to) return null;
  const card = (at: number, who: string, cost: string, color: string, top: number) =>
    frame >= at ? (
      <div key={who} style={{ ...panel, top, left: 80, width: 460, padding: "18px 24px", textAlign: "center", transform: `scale(${pop(frame, at, fps)})`, border: `4px solid ${color}` }}>
        <div style={{ fontSize: 26, letterSpacing: 3, color: "#cfd8ea" }}>{who} GETS HURT</div>
        <div style={{ fontSize: 54, color, marginTop: 8 }}>{cost}</div>
      </div>
    ) : null;
  return (
    <div style={{ opacity: fade(frame, from, to, 6) }}>
      {card(BEATS.tessHurt, "TESS", BEATS.months <= frame ? "WEEKS · MONTHS" : "WEEKS", RED, 220)}
      {card(BEATS.youHurt, "YOU", "ONE DINNER", GREEN, 440)}
    </div>
  );
};

const Stamp: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.budget || frame > BEATS.pie - 6) return null;
  const s = pop(frame, BEATS.budget, fps);
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          padding: "12px 44px",
          border: `8px solid ${TANGERINE}`,
          borderRadius: 18,
          color: TANGERINE,
          fontFamily: FONT,
          fontSize: 88,
          letterSpacing: 6,
          background: "rgba(24,33,58,0.75)",
          transform: `rotate(-6deg) scale(${2 - s})`,
          opacity: Math.min(1, s),
        }}
      >
        ON A BUDGET
      </span>
    </div>
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < BEATS.deal - 6) return null;
  const s = pop(frame, BEATS.deal - 6, fps);
  const sub = pop(frame, BEATS.subscribe, fps);
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 64, color: "#fff", transform: `scale(${s})`, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>WOULD YOU TAKE THE DEAL?</div>
      {frame >= BEATS.overnight ? <div style={{ fontSize: 34, color: GOLD, marginTop: 10, textShadow: "0 4px 0 rgba(0,0,0,0.35)" }}>HEAL 100× · EAT FOR IT</div> : null}
      {frame >= BEATS.subscribe ? (
        <div style={{ marginTop: 26 }}>
          <span style={{ display: "inline-block", padding: "12px 34px", background: "#e8423a", color: "#fff", borderRadius: 40, fontSize: 36, transform: `scale(${sub})`, boxShadow: "0 8px 0 rgba(0,0,0,0.25)" }}>SUBSCRIBE</span>
        </div>
      ) : null}
    </div>
  );
};

export const HealHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > DURATION) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <TitleCard frame={frame} fps={fps} />
      <Gauge frame={frame} fps={fps} />
      <Bubble frame={frame} fps={fps} />
      <Build frame={frame} fps={fps} />
      <Bill frame={frame} fps={fps} />
      <Savings frame={frame} fps={fps} />
      {TAGS.map(([from, to, text]) => (
        <Tag key={text} frame={frame} fps={fps} from={from} to={to} text={text} />
      ))}
      <Xray frame={frame} fps={fps} />
      <NightClock frame={frame} fps={fps} />
      <MathCards frame={frame} fps={fps} />
      <Stamp frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
