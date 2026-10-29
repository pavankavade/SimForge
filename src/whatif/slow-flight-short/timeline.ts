import { createCues } from "../../kit";
import { BEATS as L, shotStart } from "../slow-flight/timeline";
import cues from "./data/narrationCues.json";

/**
 * Slow Flight Short (1080x1920, ~1 min): a fast recut of the long-form under
 * new narration (scripts/slow-flight-short-audio.py). Each clip plays the
 * long-form scene, camera and effects in long-form time; `cut` aligns one
 * word of the short's voice with one long-form beat, so the picture lands on
 * the word exactly as it did in the long-form.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);

export interface Clip {
  /** First short frame of the clip. */
  at: number;
  /** Long-form frame shown at `at`. */
  src: number;
  /** Hold `src` instead of playing on (the cliffhanger end card). */
  freeze?: boolean;
}

/** Starts at short frame `at`, with short frame `word` showing long-form frame `beat`. */
const cut = (at: number, word: number, beat: number, freeze = false): Clip => ({ at, src: beat - (word - at), freeze });

/** Cuts land a few frames before each line, so the shot is on screen when the voice starts. */
const LEAD = 3;
const head = (id: Parameters<typeof lineStart>[0]) => lineStart(id) - LEAD;

export const CLIPS: Clip[] = [
  cut(0, w("s1", "walk"), L.flap),
  cut(head("s2"), w("s2", "beats"), L.catBeats),
  cut(head("s3"), w("s3", "gust"), L.gust),
  cut(head("s4"), w("s4", "nowhere"), L.nowhere),
  cut(head("s5"), w("s5", "dies"), L.dies),
  // Takeoff aligned on "ride" = "step", never earlier than the takeoff shot.
  { at: head("s6"), src: Math.max(shotStart("takeoff") + 2, L.step - (w("s6", "ride") - head("s6"))) },
  cut(head("s7"), w("s7", "tailwind"), L.ground20),
  cut(head("s8"), w("s8", "headwind"), L.inFace),
  cut(w("s8", "cow") - LEAD, w("s8", "cow"), L.cow),
  cut(head("s9"), w("s9", "spiraling"), L.spiral),
  cut(w("s9", "freezing") - 4, w("s9", "freezing"), L.frost),
  cut(head("s10"), w("s10", "lift"), L.slideIn),
  cut(head("s11"), w("s11", "stops"), L.stops),
  cut(w("s11", "Nine") - LEAD, w("s11", "Nine"), L.landRock),
  cut(head("s12"), w("s12", "pours"), L.pours),
  cut(head("s13"), w("s13", "rooftops"), L.rooftops),
  // The approach to the school steps, frozen a beat before touchdown.
  cut(head("s14"), lineStart("s15"), L.land - 12),
  cut(lineStart("s15"), lineStart("s15"), L.land - 12, true),
];

export const clipEnd = (i: number) => (i + 1 < CLIPS.length ? CLIPS[i + 1].at : DURATION);

/** Long-form frame on screen at short frame `frame` (drives the HUD readouts). */
export const longFrame = (frame: number) => {
  let c = CLIPS[0];
  for (const clip of CLIPS) if (frame >= clip.at) c = clip;
  return c.freeze ? c.src : c.src + (frame - c.at);
};

export const BEATS = {
  hookOut: lineStart("s3"),
  question: w("s14", "curtain"),
  endCard: lineStart("s15"),
  linked: w("s15", "linked"),
} as const;

