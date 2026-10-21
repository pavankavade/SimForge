import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SubtitleConfig, SubtitleSegment, SubtitleWord } from "./types";

const DEFAULT_FONT_STACK =
  "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const CHUNK_SIZE = 5;

const getActiveSegmentIndex = (segments: SubtitleSegment[], frame: number) => {
  let activeIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    if (frame < segments[i].startFrame) {
      break;
    }
    if (frame <= segments[i].endFrame) {
      activeIndex = i;
    }
  }
  return activeIndex;
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

const buildChunks = (words: SubtitleWord[]) => {
  const chunks: SubtitleWord[][] = [];
  let current: SubtitleWord[] = [];

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    current.push(word);

    const sentenceEnd = /[.!?…]["')\]]?$/.test(word.word);
    const clauseEnd = /[,;:]["')\]]?$/.test(word.word);

    if (
      current.length >= CHUNK_SIZE ||
      (sentenceEnd && current.length >= 3) ||
      (clauseEnd && current.length >= 4) ||
      index === words.length - 1
    ) {
      chunks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
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
  const activeSegmentIndex = getActiveSegmentIndex(segments, frame);
  const segment =
    activeSegmentIndex >= 0 ? segments[activeSegmentIndex] : null;

  let activeWordIndex = -1;
  let chunkIndex = 0;

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

    const chunks = buildChunks(segment.words);
    let wordOffset = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (activeWordIndex >= wordOffset) {
        chunkIndex = i;
      }
      wordOffset += chunks[i].length;
    }

    const activeChunk = chunks[chunkIndex] ?? [];
    const chunkStart = activeChunk[0]?.startFrame ?? segment.startFrame;
    const enter = interpolate(frame - chunkStart, [0, 4], [12, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(frame - chunkStart, [0, 3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const chunkOffset = chunks
      .slice(0, chunkIndex)
      .reduce((total, chunk) => total + chunk.length, 0);

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
              top: 34,
              left: 0,
              right: 0,
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 21,
              fontWeight: 900,
              letterSpacing: "3.2px",
              textTransform: "uppercase",
              textAlign: "center",
              textShadow:
                "0 2px 10px rgba(0, 0, 0, 0.98), 0 0 4px rgba(0, 0, 0, 0.95)",
            }}
          >
            {title}
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: bottomOffset,
            width: "94%",
            maxWidth: 1000,
            transform: `translateX(-50%) translateY(${enter}px)`,
            opacity,
          }}
        >
          <div
            style={{
              color: textColor,
              fontSize: 55,
              fontWeight: 900,
              lineHeight: 1.18,
              letterSpacing: "-0.4px",
              textAlign: "center",
            }}
          >
            {activeChunk.map((word, index) => {
              const absoluteIndex = chunkOffset + index;
              const isActive = absoluteIndex === activeWordIndex;
              const previous =
                index > 0
                  ? activeChunk[index - 1].word
                  : chunkOffset > 0
                    ? segment.words[chunkOffset - 1].word
                    : "";

              return (
                <React.Fragment key={`${word.startFrame}-${index}`}>
                  {needsSpace(previous, word.word) ? " " : null}
                  <span
                    style={{
                      display: "inline-block",
                      color: isActive ? activeColor : textColor,
                      WebkitTextStroke: "7px rgba(0, 0, 0, 0.96)",
                      paintOrder: "stroke fill",
                      textShadow: isActive
                        ? "0 0 24px rgba(255, 216, 77, 0.55), 0 6px 18px rgba(0, 0, 0, 0.9)"
                        : "0 6px 18px rgba(0, 0, 0, 0.92)",
                    }}
                  >
                    {word.word}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!title) {
    return null;
  }

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
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 0,
          right: 0,
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 21,
          fontWeight: 900,
          letterSpacing: "3.2px",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow:
            "0 2px 10px rgba(0, 0, 0, 0.98), 0 0 4px rgba(0, 0, 0, 0.95)",
        }}
      >
        {title}
      </div>
    </div>
  );
};
