import { createCues, lerp, progress } from "../../kit";
import cues from "./data/narrationCues.json";

/**
 * Beats, geometry and motion math shared by Scene.tsx (what moves) and
 * config.ts (camera, SFX, shakes). Pure functions of the frame only.
 *
 * EVERY story beat is `w(line, word) ± offset` from the voiced narration
 * (data/narrationCues.json, written by scripts/__SLUG__-audio.py). Never type a
 * literal frame for a beat: re-voicing a line must move the action with it.
 *
 * Until you run the audio script, narrationCues.json holds an estimate made
 * by the scaffolder, so the episode already renders.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry: Scene, camera and SFX all read these, never their own copies.
// ---------------------------------------------------------------------------
/** Action plane: actors walk along x at z = Z, the camera looks at it from +z. */
export const Z = -0.6;
/** Daylight exit at the left end of the hall: newcomers enter here, on camera. */
export const ENTRY_X = -10.2;
export const CEILING_Y = 5.9;
/** Under the hall's bannered arch (DioramaHall archX = 0), so the set frames the trap. */
export const CRUSHER_X = 0;
/**
 * The crusher hangs well below the ceiling at rest so it stays in frame above
 * the victim (the HUD covers the top ~20% of the frame). Rest face at y≈3.3.
 */
export const CRUSHER_HANG = 2.6;
export const CRUSHER_REST_Y = CEILING_Y - CRUSHER_HANG;
/** Lowest point of the crusher face; its teeth reach ~0.2 below it. */
export const CRUSH_Y = 0.45;
/** Walking pace in world units per frame (jogging ~0.14, sprint ~0.2). */
export const WALK = 0.09;

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Level 1 - ceiling crusher. INSTALL while the line names it...
  install: w("l1a", "crusher") - 4,
  gearsStart: w("l1a", "crusher") + 12,
  // ...the VICTIM walks into it...
  goblinUnder: w("l1a", "underneath") + 4,
  /** Crusher face meets the goblin exactly on the word. */
  crush: w("l1a", "flattened"),
  // ...and the COUNTER beats it.
  rogueWaits: w("l1b", "waits"),
  lift: w("l1b", "lift"),
  stroll: w("l1b", "strolls"),
  // Levels 2-5: the designer's answer to the counter, the next victim, the
  // next counter. Add them here in the same style.
  stamp: w("end", "unbeatable"),
} as const;

/** CeilingCrushers bottoms out 4 frames after its slam cue. */
export const SLAMS = [BEATS.crush - 4, BEATS.lift - 18] as const;

/** Stage badges pop at the start of each level's first line (after the title card). */
export const STAGE_STARTS = [Math.max(84, lineStart("l1a"))] as const;

// ---------------------------------------------------------------------------
// Kinematics, solved backwards from the beats
// ---------------------------------------------------------------------------
/** Goblin: already in the hall, walks so he is under the crusher on "underneath". */
export const GOBLIN_X0 = CRUSHER_X - 4.4;
export const GOBLIN_WALK: [number, number] = [BEATS.goblinUnder - Math.round(4.4 / WALK), BEATS.goblinUnder];

/** Rogue: enters through the exit after the crush and arrives as the line says "waits". */
export const ROGUE_WAIT_X = CRUSHER_X - 1.5;
export const ROGUE_ENTER: [number, number] = [BEATS.crush + 18, BEATS.rogueWaits - 8];
/** First frame the rogue is clear of the exit glow: cut to him then, never to an empty doorway. */
export const ROGUE_ON_CAMERA =
  ROGUE_ENTER[0] + Math.round(((ROGUE_ENTER[1] - ROGUE_ENTER[0]) * 1.6) / (ROGUE_WAIT_X - ENTRY_X));
export const ROGUE_END_X = CRUSHER_X + 2.4;
export const ROGUE_STROLL: [number, number] = [BEATS.stroll, BEATS.stroll + 44];

export const rogueX = (frame: number) => {
  if (frame < ROGUE_ENTER[1]) return lerp(ENTRY_X, ROGUE_WAIT_X, progress(frame, ROGUE_ENTER));
  if (frame < ROGUE_STROLL[0]) return ROGUE_WAIT_X;
  return lerp(ROGUE_WAIT_X, ROGUE_END_X, progress(frame, ROGUE_STROLL));
};
