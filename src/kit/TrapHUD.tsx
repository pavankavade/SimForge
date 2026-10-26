import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

/**
 * "Evolution of a ..." HUD: title card, a stage badge per level (diamond
 * progress pips + level name), and the end stamp. Same look as Ep2.
 *
 *   export const TrapHUD = createTrapHUD({
 *     kicker: "EVOLUTION OF A",
 *     title: "BOULDER HALLWAY",
 *     stages: [{ name: "TRIPWIRE BOULDER", color: "#ff9a3d", at: STAGE_STARTS[0] }, ...],
 *     end: { label: "HALLWAY STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
 *   });
 *
 * Keep stage names under ~26 characters so they fit on one line at phone size
 * (the font drops to 50px above 24 characters).
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";

export interface TrapStage {
  name: string;
  color: string;
  /** Frame the badge pops in (usually lineStart of the level's first line). */
  at: number;
}

export interface TrapHUDOptions {
  kicker?: string;
  title: string;
  /** Title card leaves at this frame (default 82, before the first badge). */
  titleOut?: number;
  stages: TrapStage[];
  stageLabel?: string;
  badgeFrames?: number;
  end: { label: string; stamp: string; at: number; color?: string; top?: number; fontSize?: number };
}

export const createTrapHUD = ({
  kicker = "EVOLUTION OF A",
  title,
  titleOut = 82,
  stages,
  stageLabel = "TRAP LEVEL",
  badgeFrames = 110,
  end,
}: TrapHUDOptions): React.FC => {
  const TitleCard: React.FC<{ frame: number }> = ({ frame }) => {
    if (frame > titleOut) return null;
    const inTop = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
    const inMain = interpolate(frame, [5, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
    const out = interpolate(frame, [titleOut - 16, titleOut - 2], [1, 0], clamp);
    const lift = interpolate(frame, [titleOut - 16, titleOut - 2], [0, -40], clamp);
    return (
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: FONT, opacity: out, transform: `translateY(${lift}px)` }}>
        <div style={{ fontSize: 56, color: "#ffffff", letterSpacing: 6, textShadow: STROKE, transform: `scale(${inTop})` }}>{kicker}</div>
        <div
          style={{
            fontSize: title.length > 16 ? 88 : 104,
            lineHeight: 1.05,
            color: "#ffd84d",
            letterSpacing: 2,
            textShadow: STROKE,
            transform: `scale(${inMain}) rotate(-2deg)`,
          }}
        >
          {title}
        </div>
      </div>
    );
  };

  const StageBadge: React.FC<{ frame: number }> = ({ frame }) => {
    const index = stages.findIndex((s) => frame >= s.at && frame < s.at + badgeFrames);
    if (index < 0) return null;
    const stage = stages[index];
    const age = frame - stage.at;
    const enter = interpolate(age, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) });
    const exit = interpolate(age, [badgeFrames - 12, badgeFrames], [1, 0], clamp);
    return (
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: FONT,
          opacity: exit,
          transform: `translateY(${(1 - enter) * -60}px) scale(${0.7 + enter * 0.3})`,
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          {stages.map((s, i) => {
            const isNew = i === index;
            const fill = i < index ? 1 : isNew ? interpolate(age, [8, 16], [0, 1], clamp) : 0;
            const pulse = isNew ? 1 + 0.25 * Math.max(0, Math.sin(age * 0.25)) * Math.exp(-age / 40) : 1;
            return (
              <div
                key={s.name}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  transform: `rotate(45deg) scale(${pulse})`,
                  border: "4px solid #000",
                  background: fill > 0 ? stage.color : "rgba(255,255,255,0.18)",
                  opacity: fill > 0 ? 0.35 + fill * 0.65 : 1,
                  boxShadow: isNew && fill > 0 ? `0 0 22px ${stage.color}` : undefined,
                }}
              />
            );
          })}
        </div>
        <div style={{ fontSize: 40, color: "#ffffff", letterSpacing: 5, textShadow: STROKE }}>
          {stageLabel} {index + 1}
        </div>
        <div style={{ fontSize: stage.name.length > 24 ? 50 : 62, color: stage.color, textShadow: STROKE, lineHeight: 1.1, textAlign: "center", padding: "0 40px" }}>
          {stage.name}
        </div>
      </div>
    );
  };

  const EndCard: React.FC<{ frame: number }> = ({ frame }) => {
    const age = frame - end.at;
    if (age < -14) return null;
    const color = end.color ?? "#e8322a";
    const top = end.top ?? 190;
    const labelIn = interpolate(age, [-14, -4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const slam = interpolate(age, [0, 5], [1.75, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    const settle = age >= 5 ? 1 + 0.06 * Math.sin((age - 5) * 0.9) * Math.exp(-(age - 5) / 6) : slam;
    const stampFontSize = end.fontSize ?? (end.stamp.length > 13 ? 64 : end.stamp.length >= 10 ? 82 : 104);
    return (
      <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>
        <div style={{ fontSize: 44, color: "#ffffff", letterSpacing: 8, textShadow: STROKE, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 20}px)` }}>
          {end.label}
        </div>
        {age >= 0 ? (
          <div
            style={{
              marginTop: 22,
              padding: "10px 36px",
              border: `8px solid ${color}`,
              outline: `3px solid ${color}`,
              outlineOffset: "-12px",
              borderRadius: 14,
              color,
              fontSize: stampFontSize,
              fontWeight: 900,
              letterSpacing: 6,
              background: "rgba(18, 6, 6, 0.45)",
              textShadow: "0 0 12px rgba(232, 50, 42, 0.4), 0 4px 14px rgba(0,0,0,0.85)",
              boxShadow: "0 0 24px rgba(232, 50, 42, 0.25), 0 8px 24px rgba(0,0,0,0.7), inset 0 0 12px rgba(232, 50, 42, 0.15)",
              transform: `rotate(-6deg) scale(${settle})`,
              opacity: interpolate(age, [0, 2], [0.3, 1], clamp),
            }}
          >
            {end.stamp}
          </div>
        ) : null}
      </div>
    );
  };

  const TrapHUD: React.FC = () => {
    const frame = useCurrentFrame();
    return (
      <AbsoluteFill style={{ pointerEvents: "none", zIndex: 120 }}>
        <TitleCard frame={frame} />
        <StageBadge frame={frame} />
        <EndCard frame={frame} />
      </AbsoluteFill>
    );
  };
  return TrapHUD;
};
