import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

/**
 * Long-form (16:9) HUD: a chapter card per act and a compact level tag in the
 * top-left corner per level, with the act's progress pips. Global frames.
 *
 *   export const CampaignHUD = createCampaignHUD({
 *     chapters: [{
 *       kicker: "ACT II", title: "THE HALLWAY", at: ACTS.hallway.start + 6,
 *       stages: [{ name: "TRIPWIRE BOULDER", color: "#ff9a3d", at: ... }, ...],
 *     }, ...],
 *   });
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";
const STROKE_THIN = "-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 4px 12px rgba(0,0,0,0.6)";

export interface CampaignStage {
  name: string;
  color: string;
  /** Frame the tag pops in (global; usually the level's first line start). */
  at: number;
}

export interface CampaignChapter {
  kicker: string;
  title: string;
  /** Frame the chapter card pops in (global). */
  at: number;
  /** How long the card holds (default 80). */
  hold?: number;
  color?: string;
  stages: CampaignStage[];
}

export interface CampaignHUDOptions {
  chapters: CampaignChapter[];
  stageLabel?: string;
  badgeFrames?: number;
}

export const createCampaignHUD = ({ chapters, stageLabel = "LEVEL", badgeFrames = 120 }: CampaignHUDOptions): React.FC => {
  const ChapterCard: React.FC<{ frame: number }> = ({ frame }) => {
    const chapter = chapters.find((c) => frame >= c.at && frame < c.at + (c.hold ?? 80));
    if (!chapter) return null;
    const age = frame - chapter.at;
    const hold = chapter.hold ?? 80;
    const inTop = interpolate(age, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
    const inMain = interpolate(age, [5, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
    const out = interpolate(age, [hold - 14, hold], [1, 0], clamp);
    const lift = interpolate(age, [hold - 14, hold], [0, -30], clamp);
    return (
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", fontFamily: FONT, opacity: out, transform: `translateY(${lift}px)` }}>
        <div style={{ fontSize: 46, color: "#ffffff", letterSpacing: 10, textShadow: STROKE, transform: `scale(${inTop})` }}>{chapter.kicker}</div>
        <div style={{ fontSize: 96, lineHeight: 1.05, color: chapter.color ?? "#ffd84d", letterSpacing: 3, textShadow: STROKE, transform: `scale(${inMain}) rotate(-2deg)` }}>
          {chapter.title}
        </div>
      </div>
    );
  };

  const LevelTag: React.FC<{ frame: number }> = ({ frame }) => {
    for (const chapter of chapters) {
      const index = chapter.stages.findIndex((s) => frame >= s.at && frame < s.at + badgeFrames);
      if (index < 0) continue;
      const stage = chapter.stages[index];
      const age = frame - stage.at;
      const enter = interpolate(age, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) });
      const exit = interpolate(age, [badgeFrames - 12, badgeFrames], [1, 0], clamp);
      return (
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 56,
            fontFamily: FONT,
            opacity: exit,
            transform: `translateX(${(1 - enter) * -80}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            {chapter.stages.map((s, i) => {
              const isNew = i === index;
              const fill = i < index ? 1 : isNew ? interpolate(age, [8, 16], [0, 1], clamp) : 0;
              return (
                <div
                  key={s.name}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    transform: "rotate(45deg)",
                    border: "3px solid #000",
                    background: fill > 0 ? stage.color : "rgba(255,255,255,0.18)",
                    opacity: fill > 0 ? 0.35 + fill * 0.65 : 1,
                    boxShadow: isNew && fill > 0 ? `0 0 16px ${stage.color}` : undefined,
                  }}
                />
              );
            })}
            <div style={{ marginLeft: 10, fontSize: 28, color: "#ffffff", letterSpacing: 4, textShadow: STROKE_THIN }}>
              {stageLabel} {index + 1}
            </div>
          </div>
          <div style={{ fontSize: 44, color: stage.color, textShadow: STROKE_THIN, lineHeight: 1.1 }}>{stage.name}</div>
        </div>
      );
    }
    return null;
  };

  const CampaignHUD: React.FC = () => {
    const frame = useCurrentFrame();
    return (
      <AbsoluteFill style={{ pointerEvents: "none", zIndex: 120 }}>
        <ChapterCard frame={frame} />
        <LevelTag frame={frame} />
      </AbsoluteFill>
    );
  };
  return CampaignHUD;
};
