/**
 * Episode kit: the shared building blocks every "Evolution of a ..." episode
 * uses. Import from here instead of copying helpers between episodes.
 *
 *  - cues     createCues(narrationCues) -> w(), lineStart(), DURATION
 *  - motion   lerp/progress/easing/arc/bezier/wobble: pure (frame) => value
 *  - actors   Actor, ActorView, lying(), Splat, CHAR_SCALE, FACE_RIGHT/LEFT
 *  - fx       dust/sparks/slimeSplash/jellySplash/flamePuff/magic bursts
 *  - camera   shot(), followTrack(), walkTrack(), holdTrack(), frameSize()
 *  - sfx      sfxFor(slug), loopCue()
 *  - TrapHUD  createTrapHUD({ title, stages, end })
 */
export * from "./cues";
export * from "./motion";
export * from "./actors";
export * from "./fx";
export * from "./camera";
export * from "./sfx";
export * from "./TrapHUD";
