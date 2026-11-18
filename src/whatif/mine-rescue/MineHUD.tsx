import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ARRIVALS, BEATS, DURATION, PLANS, SHOTS, lineStart, planProgress } from "./timeline";

/**
 * Mine Rescue HUD (1080x1920):
 *  - the day counter top-left, counting up through the 69 days,
 *  - fact tags on their words (food for 2 days, the ration, ~12 cm holes, 53 cm, the capsule's parts),
 *  - the note from the shelter, full size, with its translation,
 *  - what came down the palomas, the hole-size comparison, the race of the three drills,
 *  - the rescue counter at the pithead, and the end card.
 * Everything sits in the top ~30% or clear of the subtitle band (bottom 19-24%).
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(16, 22, 40, 0.86)";
const GOLD = "#ffd84d";
const ORANGE = "#f28a2e";
const RED = "#e0402e";
const TEAL = "#7de9ff";

const B = BEATS;
const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
const fade = (frame: number, from: number, to: number, len = 8) =>
  interpolate(frame, [from, from + len, to - len, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const panel: React.CSSProperties = { background: NAVY, borderRadius: 26, color: "#fff", fontFamily: FONT, boxShadow: "0 10px 0 rgba(0,0,0,0.25)" };

/** A tag that pops in on `at` and fades out at `to`, centred at `top` px. */
const Tag: React.FC<{ frame: number; fps: number; at: number; to: number; top: number; color?: string; children: React.ReactNode; size?: number }> = ({
  frame,
  fps,
  at,
  to,
  top,
  color = GOLD,
  children,
  size = 54,
}) => {
  if (frame < at - 1 || frame > to) return null;
  const s = pop(frame, at, fps);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(frame, at - 1, to, 6) }}>
      <div style={{ ...panel, padding: "14px 34px", fontSize: size, color, transform: `scale(${0.5 + 0.5 * s})`, textAlign: "center", lineHeight: 1.15 }}>{children}</div>
    </div>
  );
};

/** DAY counter, top-left: it runs on between the days the story names. */
const DAYS: Array<[number, number]> = [
  [SHOTS.shelterA, 1],
  [B.alive, 1],
  [B.everyTwo, 3],
  [SHOTS.drills, 5],
  [B.again2 + 20, 16],
  [B.day17, 17],
  [B.lifeline, 18],
  [SHOTS.person, 24],
  [B.three, 33],
  [SHOTS.bits, 40],
  [B.bits + 20, 62],
  [B.day65, 65],
  [B.phoenix, 66],
  [B.day69 - 20, 68],
  [B.day69, 69],
];
const DayCounter: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SHOTS.shelterA + 16 || frame >= lineStart("end")) return null;
  let day = 1;
  for (let k = 0; k < DAYS.length; k++) {
    const [f, d] = DAYS[k];
    if (frame < f) break;
    const next = DAYS[k + 1];
    day = next && next[0] > f ? Math.floor(interpolate(frame, [f, next[0]], [d, next[1]], { extrapolateRight: "clamp" })) : d;
  }
  return (
    <div style={{ position: "absolute", top: 70, left: 50, ...panel, padding: "12px 26px", fontSize: 50 }}>
      DAY <span style={{ color: GOLD }}>{day}</span>
    </div>
  );
};

const NoteCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.weAreFine - 4;
  const to = SHOTS.life + 6;
  if (frame < at || frame > to) return null;
  const s = pop(frame, at, fps);
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(frame, at, to, 6) }}>
      <div
        style={{
          width: 820,
          padding: "30px 40px 26px",
          background: "#f4f1e6",
          borderRadius: 10,
          boxShadow: "0 16px 0 rgba(0,0,0,0.3)",
          transform: `rotate(-3deg) scale(${0.5 + 0.5 * s})`,
          backgroundImage: "repeating-linear-gradient(transparent 0 58px, rgba(80,110,170,0.3) 58px 60px)",
        }}
      >
        <div style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', cursive", fontWeight: 700, fontSize: 66, color: "#c81818", lineHeight: 1.15 }}>
          Estamos bien en el refugio los 33
        </div>
        <div style={{ fontFamily: FONT, fontSize: 32, color: "#3a3a3a", marginTop: 14 }}>"We are fine in the shelter, the 33"</div>
      </div>
    </div>
  );
};

const Icon: React.FC<{ kind: "food" | "water" | "letters" | "camera" }> = ({ kind }) => {
  const c = "#fff";
  if (kind === "food")
    return (
      <svg width="96" height="96" viewBox="0 0 96 96">
        <ellipse cx="48" cy="56" rx="34" ry="20" fill="#e3b86a" />
        <path d="M20 54 Q48 20 76 54" fill="#d9a24f" />
      </svg>
    );
  if (kind === "water")
    return (
      <svg width="96" height="96" viewBox="0 0 96 96">
        <rect x="34" y="14" width="28" height="10" rx="3" fill="#4a90e2" />
        <path d="M30 30 h36 v52 a6 6 0 0 1 -6 6 h-24 a6 6 0 0 1 -6 -6z" fill="#9fd3ff" />
      </svg>
    );
  if (kind === "letters")
    return (
      <svg width="96" height="96" viewBox="0 0 96 96">
        <rect x="12" y="24" width="72" height="48" rx="5" fill={c} />
        <path d="M12 26 L48 54 L84 26" stroke="#9aa" strokeWidth="5" fill="none" />
      </svg>
    );
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <rect x="14" y="30" width="68" height="44" rx="8" fill="#555c66" />
      <rect x="34" y="22" width="22" height="12" rx="3" fill="#555c66" />
      <circle cx="48" cy="52" r="15" fill="#20242a" stroke={c} strokeWidth="4" />
    </svg>
  );
};

const Supplies: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const to = B.tubes + 20;
  if (frame < B.cFood - 2 || frame > to) return null;
  const items: Array<[number, "food" | "water" | "letters" | "camera", string]> = [
    [B.cFood, "food", "FOOD"],
    [B.water, "water", "WATER"],
    [B.letters, "letters", "LETTERS"],
    [B.camera, "camera", "CAMERA"],
  ];
  return (
    <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22, opacity: fade(frame, B.cFood - 2, to, 6) }}>
      {items.map(([at, kind, label]) =>
        frame >= at - 1 ? (
          <div key={kind} style={{ ...panel, width: 210, padding: "14px 0 12px", textAlign: "center", transform: `scale(${pop(frame, at, fps)})` }}>
            <Icon kind={kind} />
            <div style={{ fontSize: 30, color: GOLD }}>{label}</div>
          </div>
        ) : null
      )}
    </div>
  );
};

const HoleSizes: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.person - 2;
  const to = B.three - 6;
  if (frame < at || frame > to) return null;
  const big = pop(frame, B.shoulders - 4, fps);
  return (
    <div style={{ position: "absolute", top: 180, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 60, opacity: fade(frame, at, to, 6) }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", border: `8px solid ${ORANGE}`, margin: "0 auto 12px", background: "rgba(0,0,0,0.6)" }} />
        <div style={{ ...panel, padding: "8px 18px", fontSize: 34, color: ORANGE }}>12 CM</div>
      </div>
      {frame >= B.shoulders - 4 && (
        <div style={{ textAlign: "center", transform: `scale(${big})` }}>
          <div style={{ width: 300, height: 300, borderRadius: "50%", border: `10px solid ${TEAL}`, margin: "0 auto 12px", background: "rgba(0,0,0,0.6)" }} />
          <div style={{ ...panel, padding: "8px 18px", fontSize: 34, color: TEAL }}>ABOUT 70 CM</div>
        </div>
      )}
    </div>
  );
};

const DrillRace: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.race - 4;
  const to = SHOTS.bits - 2;
  if (frame < at || frame > to) return null;
  const rows: Array<[string, string]> = PLANS.map((p) => [p.name, p.color] as [string, string]);
  return (
    <div style={{ position: "absolute", top: 70, right: 50, ...panel, padding: "18px 24px", width: 470, opacity: fade(frame, at, to, 6), transform: `scale(${pop(frame, at, fps)})`, transformOrigin: "right top" }}>
      {rows.map(([name, color], k) => {
        const p = planProgress(k, frame);
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0" }}>
            <div style={{ fontSize: 30, color, width: 140 }}>{name}</div>
            <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.15)", borderRadius: 11, overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RescueCounter: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < ARRIVALS[0] || frame >= lineStart("end")) return null;
  const counts = [1, 9, 21, 32, 33];
  let n = 1;
  for (let k = 0; k < ARRIVALS.length; k++) {
    if (frame >= ARRIVALS[k]) n = counts[k];
    else if (k > 0 && frame >= ARRIVALS[k] - 30) n = Math.round(interpolate(frame, [ARRIVALS[k] - 30, ARRIVALS[k]], [counts[k - 1], counts[k]]));
  }
  const s = pop(frame, ARRIVALS[0], fps);
  return (
    <div style={{ position: "absolute", top: 70, right: 50, ...panel, padding: "12px 26px", fontSize: 50, transform: `scale(${0.6 + 0.4 * s})`, transformOrigin: "right top" }}>
      RESCUED <span style={{ color: n === 33 ? "#6fdc7a" : GOLD }}>{n}</span>/33
    </div>
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.endDays;
  if (frame < at) return null;
  const s = pop(frame, at, fps);
  const s2 = pop(frame, B.every, fps);
  return (
    <div style={{ position: "absolute", top: 170, left: 40, right: 40, textAlign: "center", opacity: fade(frame, at, DURATION + 20, 8) }}>
      <div style={{ display: "inline-block", ...panel, padding: "18px 40px", transform: `rotate(-2deg) scale(${0.5 + 0.5 * s})` }}>
        <div style={{ fontSize: 76, color: "#fff", lineHeight: 1.05 }}>69 DAYS · 700 M</div>
        {frame >= B.every && <div style={{ fontSize: 70, color: "#6fdc7a", transform: `scale(${s2})` }}>33 OF 33 HOME</div>}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 30, color: "rgba(255,255,255,0.85)", marginTop: 22, textShadow: "0 3px 0 rgba(0,0,0,0.6)" }}>
        San José mine, Chile · 2010
      </div>
    </div>
  );
};

export const MineHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = 230;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <DayCounter frame={frame} />
      <Tag frame={frame} fps={fps} at={B.thirtyThree} to={SHOTS.shelterA + 58} top={t} size={48}>
        700 M DOWN · 33 MEN
      </Tag>
      <Tag frame={frame} fps={fps} at={B.twoDays} to={B.alive + 24} top={t}>
        FOOD FOR 2 DAYS
      </Tag>
      <Tag frame={frame} fps={fps} at={B.ladders} to={lineStart("a4") - 4} top={t} color={RED}>
        NO LADDERS
      </Tag>
      <Tag frame={frame} fps={fps} at={B.everyTwo} to={lineStart("b1") - 6} top={t} size={42}>
        EVERY 48 HOURS
        <div style={{ fontSize: 34, color: "#fff", marginTop: 6 }}>2 spoons of tuna · a sip of milk · a bite of cracker</div>
      </Tag>
      <Tag frame={frame} fps={fps} at={B.fist} to={B.past + 10} top={t} color={ORANGE}>
        HOLES ~12 CM WIDE
      </Tag>
      <Tag frame={frame} fps={fps} at={B.past} to={lineStart("b2") - 6} top={t + 110} color={RED}>
        MISSED
      </Tag>
      <NoteCard frame={frame} fps={fps} />
      <Supplies frame={frame} fps={fps} />
      <HoleSizes frame={frame} fps={fps} />
      <DrillRace frame={frame} fps={fps} />
      <Tag frame={frame} fps={fps} at={B.chews} to={SHOTS.breakthrough - 4} top={t} color={ORANGE}>
        BITS WORN OUT
      </Tag>
      <Tag frame={frame} fps={fps} at={B.fiftyThree} to={lineStart("d1") - 4} top={t} color={TEAL}>
        53 CM WIDE
      </Tag>
      <Tag frame={frame} fps={fps} at={B.phoenix} to={B.wheels - 4} top={t}>
        FÉNIX 2
      </Tag>
      <Tag frame={frame} fps={fps} at={B.wheels} to={B.oxygen - 6} top={t} size={46}>
        SPRUNG WHEELS
      </Tag>
      <Tag frame={frame} fps={fps} at={B.oxygen} to={B.hatch - 4} top={t} size={46} color="#7dffa0">
        OXYGEN ON BOARD
      </Tag>
      <Tag frame={frame} fps={fps} at={B.hatch} to={lineStart("d2") - 4} top={t} size={46} color={ORANGE}>
        ESCAPE HATCH
      </Tag>
      <RescueCounter frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
