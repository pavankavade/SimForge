import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SubtitleConfig, SubtitleSegment, SubtitleWord } from "./types";

const DEFAULT_FONT_STACK =
  "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const CHUNK_SIZE = 5;
const MAX_CHARS = 22;
const BASE_FONT_SIZE = 62;
const MAX_LINE_WIDTH = 960;
/** Rough advance width of the bold display face, in em. */
const CHAR_WIDTH_EM = 0.66;

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

const textLength = (words: SubtitleWord[]) =>
  words.reduce((total, w, i) => total + w.word.length + (i > 0 ? 1 : 0), 0);

/**
 * Splits a clause into the fewest single-line chunks that respect the word
 * and character limits, balancing their lengths and avoiding one-word orphans.
 */
const splitClause = (words: SubtitleWord[]): SubtitleWord[][] => {
  const n = words.length;
  const fits = (from: number, to: number) =>
    to - from <= CHUNK_SIZE &&
    (to - from === 1 || textLength(words.slice(from, to)) <= MAX_CHARS);

  // best[i] = [parts, cost, previous cut] for words[0..i)
  const best: Array<[number, number, number]> = [[0, 0, -1]];
  for (let i = 1; i <= n; i++) {
    best[i] = [Infinity, Infinity, -1];
    for (let j = Math.max(0, i - CHUNK_SIZE); j < i; j++) {
      if (!fits(j, i) || best[j][0] === Infinity) continue;
      const len = textLength(words.slice(j, i));
      const orphan = i - j === 1 && n > 1 ? 400 : 0;
      const parts = best[j][0] + 1;
      const cost = best[j][1] + (MAX_CHARS - len) ** 2 + orphan;
      const [bestParts, bestCost] = best[i];
      if (parts < bestParts || (parts === bestParts && cost < bestCost)) {
        best[i] = [parts, cost, j];
      }
    }
  }

  const chunks: SubtitleWord[][] = [];
  for (let i = n; i > 0; i = best[i][2]) {
    chunks.unshift(words.slice(best[i][2], i));
  }
  return chunks;
};

const buildChunks = (words: SubtitleWord[]) => {
  const clauses: SubtitleWord[][] = [];
  let current: SubtitleWord[] = [];

  for (const word of words) {
    current.push(word);
    if (/[.!?…,;:]["')\]]?$/.test(word.word)) {
      clauses.push(current);
      current = [];
    }
  }
  if (current.length > 0) clauses.push(current);

  // A lone lead-in word ("However,") rides with the clause that follows it.
  const merged: SubtitleWord[][] = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    if (clause.length === 1 && i < clauses.length - 1) {
      clauses[i + 1] = [...clause, ...clauses[i + 1]];
      continue;
    }
    if (clause.length === 1 && merged.length > 0) {
      const previous = merged[merged.length - 1];
      if (
        previous.length < CHUNK_SIZE &&
        textLength([...previous, ...clause]) <= MAX_CHARS
      ) {
        previous.push(...clause);
        continue;
      }
    }
    merged.push(clause);
  }

  return merged.reduce<SubtitleWord[][]>(
    (all, clause) => all.concat(splitClause(clause)),
    []
  );
};

/** One big word at a time, popping in on its spoken frame (Shorts explainer style). */
const WordCaption: React.FC<SubtitleConfig> = ({
  segments,
  wordTop = 700,
  textColor = "#FFFFFF",
  fontFamily = DEFAULT_FONT_STACK,
}) => {
  const frame = useCurrentFrame();
  let word: SubtitleWord | null = null;
  for (const segment of segments) {
    if (frame < segment.startFrame) break;
    if (frame > segment.endFrame + 4) continue;
    for (const w of segment.words) {
      if (frame >= w.startFrame) word = w;
    }
  }
  if (!word) return null;

  const text = word.word.replace(/[.,!?;:�"]+$/g, "").replace(/^["']+/, "");
  const label = text.charAt(0).toUpperCase() + text.slice(1);
  const age = frame - word.startFrame;
  const pop = interpolate(age, [0, 3, 6], [0.6, 1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fontSize = Math.min(128, MAX_LINE_WIDTH / Math.max(1, label.length * CHAR_WIDTH_EM));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: wordTop,
        transform: `translateY(-50%) scale(${pop})`,
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 100,
        fontFamily,
        fontSize,
        fontWeight: 900,
        color: textColor,
        letterSpacing: "-0.5px",
        WebkitTextStroke: "10px rgba(0, 0, 0, 0.96)",
        paintOrder: "stroke fill",
        textShadow: "0 6px 18px rgba(0, 0, 0, 0.55)",
      }}
    >
      {label}
    </div>
  );
};

export const Subtitles: React.FC<SubtitleConfig> = (props) =>
  props.mode === "word" ? <WordCaption {...props} /> : <ChunkCaption {...props} />;

const ChunkCaption: React.FC<SubtitleConfig> = ({
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
    const pop = interpolate(frame - chunkStart, [0, 3, 6], [0.78, 1.06, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(frame - chunkStart, [0, 2], [0.2, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const chunkChars = textLength(activeChunk);
    const fontSize = Math.min(
      BASE_FONT_SIZE,
      MAX_LINE_WIDTH / Math.max(1, chunkChars * CHAR_WIDTH_EM)
    );

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
            width: "96%",
            transform: `translateX(-50%) scale(${pop})`,
            transformOrigin: "50% 60%",
            opacity,
          }}
        >
          <div
            style={{
              color: textColor,
              fontSize,
              fontWeight: 900,
              lineHeight: 1.18,
              letterSpacing: "-0.4px",
              textAlign: "center",
              whiteSpace: "nowrap",
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
                      transform: isActive ? "scale(1.08)" : undefined,
                      // Reserve the room the scaled-up word grows into so it
                      // never swallows the neighbouring spaces.
                      margin: isActive
                        ? `0 ${word.word.length * CHAR_WIDTH_EM * 0.04}em`
                        : undefined,
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
