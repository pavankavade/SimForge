import { createCues, sliceCues } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Global timing for the long-form campaign. One narration drives everything;
 * it is cut into segments (cold open, four acts, three bridges, finale). Each
 * segment plays in its own <Sequence> with its own 3D canvas and camera and
 * times itself in LOCAL frames via `segmentCues(id)` (sliceCues re-bases the
 * segment's lines to frame 0), exactly like a short.
 *
 * Segments overlap by XF frames; the later one cross-fades in on top.
 */
export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);

/** A narration line id ("e1a", "b2b", ...). */
export type LineId = keyof typeof cues.lines;

export const XF = 12;
/** An act opens this long before its first line (chapter card + establishing shot). */
const ACT_PRE = 45;
/** An act holds this long after its last line (the party vanishing down the chute). */
const ACT_POST = 50;

export const SEGMENT_LINES = {
  cold: ["c0a", "c0b", "c0c"],
  entrance: ["e1a", "e1b", "e2a", "e2b", "e3a", "e3b", "e4a", "e5a"],
  bridge1: ["b1a", "b1b"],
  hallway: ["h1a", "h1b", "h2a", "h2b", "h3a", "h3b", "h4a", "h5a"],
  bridge2: ["b2a", "b2b"],
  vault: ["v1a", "v1b", "v2a", "v2b", "v3a", "v3b", "v4a", "v5a"],
  bridge3: ["b3a", "b3b"],
  gallery: ["g1a", "g1b", "g2a", "g2b", "g3a", "g3b", "g4a", "g5a"],
  finale: ["fa", "fb", "fc", "fd"],
} as const satisfies Record<string, readonly LineId[]>;
export type SegmentId = keyof typeof SEGMENT_LINES;

const actStart = (first: LineId) => lineStart(first) - ACT_PRE;
const actEnd = (last: LineId) => lineEnd(last) + ACT_POST;

/** [start, end) of every segment in global frames. */
export const SEGMENTS: Record<SegmentId, { start: number; end: number }> = {
  cold: { start: 0, end: actStart("e1a") + XF },
  entrance: { start: actStart("e1a"), end: actEnd("e5a") },
  bridge1: { start: actEnd("e5a") - XF, end: actStart("h1a") + XF },
  hallway: { start: actStart("h1a"), end: actEnd("h5a") },
  bridge2: { start: actEnd("h5a") - XF, end: actStart("v1a") + XF },
  vault: { start: actStart("v1a"), end: actEnd("v5a") },
  bridge3: { start: actEnd("v5a") - XF, end: actStart("g1a") + XF },
  gallery: { start: actStart("g1a"), end: actEnd("g5a") },
  finale: { start: actEnd("g5a") - XF, end: DURATION },
};

export const SEGMENT_ORDER: SegmentId[] = ["cold", "entrance", "bridge1", "hallway", "bridge2", "vault", "bridge3", "gallery", "finale"];

/** Local-frame cues for one segment: `const { w, lineStart } = segmentCues("hallway")`. */
export const segmentCues = (id: SegmentId) =>
  createCues(sliceCues(cues, SEGMENT_LINES[id], SEGMENTS[id].start));

/** Length of a segment in frames. */
export const segmentLength = (id: SegmentId) => SEGMENTS[id].end - SEGMENTS[id].start;
