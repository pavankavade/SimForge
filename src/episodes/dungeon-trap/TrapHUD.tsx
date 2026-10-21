import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BEATS } from "./timeline";

const FONT =
  "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";

const STAGES = [
  { at: 84, name: "SPIKE PIT", color: "#ff9a3d" },
  { at: BEATS.trapdoorSpawn, name: "FALSE FLOOR + BAIT", color: "#ffd84d" },
  { at: 994, name: "FLAME JETS", color: "#ff5a2a" },
  { at: 1452, name: "PENDULUM BLADE", color: "#9fd0ff" },
  { at: BEATS.chamberReveal + 1, name: "CATAPULT + MIMIC", color: "#ff5fa2" },
];
const BADGE_FRAMES = 100;

const TitleCard: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame > 84) return null;
  const inTop = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  const inMain = interpolate(frame, [5, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const out = interpolate(frame, [68, 82], [1, 0], clamp);
  const lift = interpolate(frame, [68, 82], [0, -40], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
        opacity: out,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div
        style={{
          fontSize: 58,
          color: "#ffffff",
          letterSpacing: 6,
          textShadow: STROKE,
          transform: `scale(${inTop})`,
        }}
      >
        EVOLUTION OF A
      </div>
      <div
        style={{
          fontSize: 116,
          lineHeight: 1.05,
          color: "#ffd84d",
          letterSpacing: 2,
          textShadow: STROKE,
          transform: `scale(${inMain}) rotate(-2deg)`,
        }}
      >
        DUNGEON TRAP
      </div>
    </div>
  );
};

const StageBadge: React.FC<{ frame: number }> = ({ frame }) => {
  const index = STAGES.findIndex((s) => frame >= s.at && frame < s.at + BADGE_FRAMES);
  if (index < 0) return null;
  const stage = STAGES[index];
  const age = frame - stage.at;
  const enter = interpolate(age, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) });
  const exit = interpolate(age, [BADGE_FRAMES - 12, BADGE_FRAMES], [1, 0], clamp);
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
        {STAGES.map((s, i) => {
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
        TRAP LEVEL {index + 1}
      </div>
      <div style={{ fontSize: 64, color: stage.color, textShadow: STROKE, lineHeight: 1.1 }}>
        {stage.name}
      </div>
    </div>
  );
};

const EndCard: React.FC<{ frame: number }> = ({ frame }) => {
  const age = frame - BEATS.stamp;
  if (age < -14) return null;
  const labelIn = interpolate(age, [-14, -4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const slam = interpolate(age, [0, 5], [2.6, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const settle = age >= 5 ? 1 + 0.06 * Math.sin((age - 5) * 0.9) * Math.exp(-(age - 5) / 6) : slam;
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 46,
          color: "#ffffff",
          letterSpacing: 8,
          textShadow: STROKE,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 20}px)`,
        }}
      >
        DUNGEON STATUS
      </div>
      {age >= 0 ? (
        <div
          style={{
            marginTop: 26,
            padding: "10px 34px",
            border: "10px solid #e8322a",
            borderRadius: 18,
            color: "#e8322a",
            fontSize: 112,
            letterSpacing: 4,
            background: "rgba(20,8,8,0.35)",
            textShadow: "0 0 2px #000, 0 4px 14px rgba(0,0,0,0.7)",
            boxShadow: "0 0 0 4px rgba(0,0,0,0.6), inset 0 0 0 4px rgba(0,0,0,0.45)",
            transform: `rotate(-7deg) scale(${settle})`,
            opacity: interpolate(age, [0, 2], [0.3, 1], clamp),
          }}
        >
          UNBEATABLE
        </div>
      ) : null}
    </div>
  );
};

export const TrapHUD: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 120 }}>
      <TitleCard frame={frame} />
      <StageBadge frame={frame} />
      <EndCard frame={frame} />
    </AbsoluteFill>
  );
};
