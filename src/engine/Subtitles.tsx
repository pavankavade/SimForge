import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SubtitleConfig, SubtitleSegment } from "./types";

const DEFAULT_FONT_STACK =
  "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const getActiveSegment = (segments: SubtitleSegment[], frame: number) => {
  let activeIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    if (frame >= segments[i].startFrame) {
      activeIndex = i;
    } else {
      break;
    }
  }
  if (activeIndex < 0) {
    return null;
  }
  return segments[activeIndex];
};

const needsSpace = (previous: string, current: string) => {
  if (!previous) {
    return false;
  }
  if (/^[.,!?;:%)\]}]/.test(current)) {
    return false;
  }
  if (/^[-–—]/.test(current)) {
    return false;
  }
  if (/[([{]$/.test(previous)) {
    return false;
  }
  if (/[-–—/]$/.test(previous)) {
    return false;
  }
  return true;
};

export const Subtitles: React.FC<SubtitleConfig> = ({
  title,
  segments,
  bottomOffset = 250,
  activeColor = "#FFE500",
  textColor = "#FFFFFF",
  fontFamily = DEFAULT_FONT_STACK,
}) => {
  const frame = useCurrentFrame();
  const segment = getActiveSegment(segments, frame);

  let activeWordIndex = -1;
  let wordPop = 1;
  let segmentProgress = 0;

  if (segment) {
    for (let i = 0; i < segment.words.length; i++) {
      if (frame >= segment.words[i].startFrame) {
        activeWordIndex = i;
      } else {
        break;
      }
    }
    if (activeWordIndex < 0 && segment.words.length > 0) {
      activeWordIndex = 0;
    }
    if (activeWordIndex >= 0) {
      const activeWord = segment.words[activeWordIndex];
      wordPop = interpolate(frame - activeWord.startFrame, [0, 3], [1.09, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
    const span = Math.max(1, segment.endFrame - segment.startFrame);
    segmentProgress = Math.min(
      1,
      Math.max(0, (frame - segment.startFrame) / span)
    );
  }

  const segmentEnter = segment
    ? interpolate(frame - segment.startFrame, [0, 5], [14, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const segmentOpacity = segment
    ? interpolate(frame - segment.startFrame, [0, 5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 100,
        fontFamily,
      }}
    >
      {title ? (
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              color: "rgba(255, 255, 255, 0.92)",
              fontSize: 21,
              fontWeight: 900,
              letterSpacing: "3.2px",
              textTransform: "uppercase",
              textShadow:
                "0 2px 8px rgba(0, 0, 0, 0.95), 0 0 3px rgba(0, 0, 0, 0.9)",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
      ) : null}

      {segment ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: bottomOffset,
            transform: `translateX(-50%) translateY(${segmentEnter}px)`,
            opacity: segmentOpacity,
            width: "92%",
            maxWidth: 960,
            boxSizing: "border-box",
            padding: "27px 32px 31px",
            backgroundColor: "rgba(7, 10, 15, 0.78)",
            border: "2px solid rgba(255, 229, 0, 0.24)",
            borderRadius: 24,
            boxShadow: "0 14px 38px rgba(0, 0, 0, 0.55)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              color: textColor,
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.34,
              letterSpacing: "-0.3px",
              textAlign: "center",
              textShadow: "0 3px 10px rgba(0, 0, 0, 0.85)",
            }}
          >
            {segment.words.length > 0
              ? segment.words.map((word, index) => {
                  const isActive = index === activeWordIndex;
                  const color = isActive
                    ? activeColor
                    : index < activeWordIndex
                      ? textColor
                      : "rgba(255, 255, 255, 0.82)";
                  const previous =
                    index > 0 ? segment.words[index - 1].word : "";
                  return (
                    <React.Fragment key={`${word.startFrame}-${index}`}>
                      {needsSpace(previous, word.word) ? " " : null}
                      <span
                        style={{
                          display: "inline-block",
                          color,
                          transform: isActive
                            ? `scale(${wordPop})`
                            : undefined,
                          transformOrigin: "50% 72%",
                          textShadow: isActive
                            ? `0 0 18px ${activeColor}73, 0 3px 10px rgba(0, 0, 0, 0.85)`
                            : "0 3px 10px rgba(0, 0, 0, 0.85)",
                        }}
                      >
                        {word.word}
                      </span>
                    </React.Fragment>
                  );
                })
              : segment.text}
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 5,
              width: `${segmentProgress * 100}%`,
              backgroundColor: activeColor,
              boxShadow: `0 0 12px ${activeColor}8c`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
