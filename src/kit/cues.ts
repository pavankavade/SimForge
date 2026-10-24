/**
 * Narration cue lookup. `scripts/<slug>-audio.py` writes `data/narrationCues.json`
 * with the frame of every voiced word, line by line. Every story beat must be
 * written as `w(line, word) ± offset`, never as a literal frame, so re-voicing a
 * line moves the action with it.
 *
 *   import cues from "./data/narrationCues.json";
 *   export const { w, lineStart, lineEnd, DURATION } = createCues(cues);
 *   export const BEATS = { trapSet: w("l1a", "tripwire") + 2, ... } as const;
 */

export interface CueWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface NarrationCues {
  durationFrames: number;
  lines: Record<string, { startFrame: number; endFrame: number; words: CueWord[] }>;
}

const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");

export const createCues = <C extends NarrationCues>(cues: C) => {
  type LineId = keyof C["lines"] & string;
  const line = (lineId: LineId) => {
    const l = cues.lines[lineId];
    if (!l) throw new Error(`Missing narration line ${lineId}`);
    return l;
  };
  /** Start frame of the nth occurrence (0-based) of `word` in a line. Punctuation and case are ignored. */
  const w = (lineId: LineId, word: string, nth = 0): number => {
    const hit = line(lineId).words.filter((x) => bare(x.word) === bare(word))[nth];
    if (!hit) throw new Error(`Missing narration cue ${lineId}:${word}#${nth}`);
    return hit.startFrame;
  };
  /** End frame of the nth occurrence of `word` (for holds that last until a word is finished). */
  const wEnd = (lineId: LineId, word: string, nth = 0): number => {
    const hit = line(lineId).words.filter((x) => bare(x.word) === bare(word))[nth];
    if (!hit) throw new Error(`Missing narration cue ${lineId}:${word}#${nth}`);
    return hit.endFrame;
  };
  const lineStart = (lineId: LineId) => line(lineId).startFrame;
  const lineEnd = (lineId: LineId) => line(lineId).endFrame;
  return { w, wEnd, lineStart, lineEnd, DURATION: cues.durationFrames + 10 };
};
