import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, BUNDLES, DURATION, SHOTS, lineStart, progress, rescued } from "./timeline";

/**
 * Cave Rescue HUD (1080x1920):
 *  - the day counter top-left, counting up through the 18 days,
 *  - fact tags on their words (4 km in, no food, zero visibility, 13 alive, the mask),
 *  - the air in the chamber running down, a quiet tag for the volunteer who died,
 *  - the tally of boys out in the three waves, and the end card.
 * Everything sits in the top ~30% or clear of the subtitle band (bottom 19-24%).
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const NAVY = "rgba(16, 22, 40, 0.86)";
const GOLD = "#ffd84d";
const ORANGE = "#f28a2e";
const RED = "#e0402e";
const TEAL = "#7de9ff";
const GREEN = "#6fdc7a";

const B = BEATS;
const S = SHOTS;
const pop = (frame: number, at: number, fps: number) => spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
const fade = (frame: number, from: number, to: number, len = 8) =>
  interpolate(frame, [from, from + len, to - len, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const panel: React.CSSProperties = { background: NAVY, borderRadius: 26, color: "#fff", fontFamily: FONT, boxShadow: "0 10px 0 rgba(0,0,0,0.25)" };

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
  [S.inside, 1],
  [S.ledge + 10, 1],
  [B.noFood, 2],
  [S.pumps, 3],
  [S.dive, 8],
  [S.found, 9],
  [B.dayTen, 10],
  [S.wayOut, 11],
  [S.air, 13],
  [S.tanks, 14],
  [S.sleep, 16],
  [B.wave2, 17],
  [B.last, 18],
];
const DayCounter: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < S.inside || frame >= S.after || (frame >= S.sub && frame < S.sleep)) return null;
  let day = 1;
  let changed = S.inside;
  for (let k = 0; k < DAYS.length; k++) {
    const [f, d] = DAYS[k];
    if (frame < f) break;
    const next = DAYS[k + 1];
    const v = next && next[0] > f && next[1] - d > 1 ? Math.floor(interpolate(frame, [f, next[0]], [d, next[1]], { extrapolateRight: "clamp" })) : d;
    if (v !== day) changed = f;
    day = v;
  }
  const s = 1 + 0.12 * (1 - pop(frame, changed, fps));
  return (
    <div style={{ position: "absolute", top: 70, left: 50, ...panel, padding: "12px 26px", fontSize: 50, transform: `scale(${s})`, transformOrigin: "left top" }}>
      DAY <span style={{ color: GOLD }}>{day}</span>
    </div>
  );
};

/** The air in the chamber, running down (no number: the story only says it is going thin). */
const AirMeter: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.air - 2;
  const to = S.tanks - 4;
  if (frame < at || frame > to) return null;
  const left = interpolate(progress(frame, [B.air, B.thin + 20]), [0, 1], [0.72, 0.38]);
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(frame, at, to, 6) }}>
      <div style={{ ...panel, padding: "18px 30px", width: 620, transform: `scale(${0.6 + 0.4 * pop(frame, at, fps)})` }}>
        <div style={{ fontSize: 34, color: TEAL, marginBottom: 12 }}>AIR IN THE CHAMBER</div>
        <div style={{ height: 34, background: "rgba(255,255,255,0.14)", borderRadius: 17, overflow: "hidden" }}>
          <div style={{ width: `${left * 100}%`, height: "100%", background: left < 0.5 ? ORANGE : TEAL, borderRadius: 17 }} />
        </div>
      </div>
    </div>
  );
};

/** A quiet card for the volunteer who died laying the tanks. */
const Memorial: React.FC<{ frame: number }> = ({ frame }) => {
  const at = B.dies + 10;
  const to = S.sub - 4;
  if (frame < at || frame > to) return null;
  return (
    <div style={{ position: "absolute", top: 220, left: 0, right: 0, textAlign: "center", opacity: fade(frame, at, to, 14) }}>
      <div style={{ display: "inline-block", padding: "16px 36px", borderRadius: 18, background: "rgba(8,10,16,0.72)", fontFamily: FONT }}>
        <div style={{ fontSize: 46, color: "#f2f2f2", letterSpacing: 2 }}>SAMAN KUNAN</div>
        <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>former Thai Navy SEAL</div>
      </div>
    </div>
  );
};

/** Out so far, top-right, through the three waves. */
const Tally: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = S.out + 2;
  if (frame < at || frame >= S.after) return null;
  const n = rescued(frame);
  return (
    <div style={{ position: "absolute", top: 70, right: 50, ...panel, padding: "14px 22px", transform: `scale(${0.6 + 0.4 * pop(frame, at, fps)})`, transformOrigin: "right top" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>
        OUT <span style={{ color: n === BUNDLES ? GREEN : GOLD }}>{n}</span>/{BUNDLES}
      </div>
      <div style={{ display: "flex", gap: 6, width: 13 * 26 }}>
        {Array.from({ length: BUNDLES }, (_, i) => (
          <div key={i} style={{ width: 20, height: 20, borderRadius: 10, background: i < n ? (i === BUNDLES - 1 ? GREEN : ORANGE) : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
    </div>
  );
};

/** Afterwards: who said what, and the verdict, stacked as they are spoken. */
const Afterwards: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const to = lineStart("end") - 2;
  if (frame < B.caver - 2 || frame > to) return null;
  const card = (at: number, children: React.ReactNode, color = "#fff", size = 44) =>
    frame >= at - 1 ? (
      <div style={{ ...panel, padding: "14px 30px", fontSize: size, color, transform: `scale(${0.5 + 0.5 * pop(frame, at, fps)})`, textAlign: "center", lineHeight: 1.15 }}>{children}</div>
    ) : null;
  return (
    <div style={{ position: "absolute", top: 190, left: 40, right: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: fade(frame, B.caver - 2, to, 8) }}>
      {card(
        B.caver,
        <>
          VERN UNSWORTH
          <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>British caver who helped the rescue</div>
        </>
      )}
      {card(B.stunt, "“A PR STUNT”", GOLD, 54)}
      {card(
        B.pedo,
        <>
          <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>Musk, on Twitter</div>
          {"“PEDO GUY”"}
        </>,
        RED,
        54
      )}
      {card(B.deletes, "DELETED · APOLOGIZED", TEAL, 40)}
      {card(B.jury, "2019 JURY: NOT DEFAMATION", GREEN, 44)}
    </div>
  );
};

const EndCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const at = B.eighteen;
  if (frame < at) return null;
  const s = pop(frame, at, fps);
  const s2 = pop(frame, B.every, fps);
  return (
    <div style={{ position: "absolute", top: 170, left: 40, right: 40, textAlign: "center", opacity: fade(frame, at, DURATION + 20, 8) }}>
      <div style={{ display: "inline-block", ...panel, padding: "18px 40px", transform: `rotate(-2deg) scale(${0.5 + 0.5 * s})` }}>
        <div style={{ fontSize: 76, color: "#fff", lineHeight: 1.05 }}>18 DAYS · 4 KM</div>
        {frame >= B.every && <div style={{ fontSize: 70, color: GREEN, transform: `scale(${s2})` }}>13 OF 13 HOME</div>}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 30, color: "rgba(255,255,255,0.88)", marginTop: 22, textShadow: "0 3px 0 rgba(0,0,0,0.6)" }}>Tham Luang cave, Thailand · 2018</div>
    </div>
  );
};

export const CaveHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = 230;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <DayCounter frame={frame} fps={fps} />
      <Tag frame={frame} fps={fps} at={B.twelve} to={B.four - 6} top={t} size={48}>
        12 BOYS · 1 COACH
      </Tag>
      <Tag frame={frame} fps={fps} at={B.kilometers} to={S.ledge + 30} top={t} color={ORANGE}>
        4 KM INSIDE
      </Tag>
      <Tag frame={frame} fps={fps} at={B.food} to={B.drink - 2} top={t} color={RED}>
        NO FOOD
      </Tag>
      <Tag frame={frame} fps={fps} at={B.murky} to={S.found - 4} top={t} color={ORANGE}>
        ZERO VISIBILITY
      </Tag>
      <Tag frame={frame} fps={fps} at={B.thirteen} to={S.wayOut - 4} top={t} color={GREEN} size={70}>
        13 ALIVE
      </Tag>
      <Tag frame={frame} fps={fps} at={B.hours} to={B.barely - 6} top={t} color={TEAL} size={48}>
        HOURS UNDER WATER
      </Tag>
      <AirMeter frame={frame} fps={fps} />
      <Memorial frame={frame} />
      <Tag frame={frame} fps={fps} at={B.sleep} to={B.mask - 8} top={t} color={TEAL} size={48}>
        SEDATED
      </Tag>
      <Tag frame={frame} fps={fps} at={B.mask} to={B.stretcher - 4} top={t} size={48}>
        FULL-FACE MASK
      </Tag>
      <Tag frame={frame} fps={fps} at={B.kidSub} to={B.rocket - 4} top={t} size={48}>
        ELON MUSK&apos;S MINI-SUB
      </Tag>
      <Tag frame={frame} fps={fps} at={B.rocket} to={B.practical - 6} top={t} color={TEAL} size={48}>
        MADE OF ROCKET PARTS
      </Tag>
      <Tag frame={frame} fps={fps} at={B.practical} to={B.used - 4} top={t} color={RED}>
        NOT PRACTICAL
      </Tag>
      <Tag frame={frame} fps={fps} at={B.used} to={S.sleep - 4} top={t} color={ORANGE}>
        NEVER USED
      </Tag>
      <Tally frame={frame} fps={fps} />
      <Afterwards frame={frame} fps={fps} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
