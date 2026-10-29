/**
 * Episode kit: the shared building blocks every "Evolution of a ..." episode
 * uses. Import from here instead of copying helpers between episodes.
 *
 *  - cues     createCues(narrationCues) -> w(), lineStart(), DURATION; sliceCues() for long-form acts
 *  - motion   lerp/progress/easing/arc/bezier/wobble: pure (frame) => value
 *  - actors   Actor, ActorView (pass the actor function: eased pose switches), lying(), Splat, CHAR_SCALE, FACE_RIGHT/LEFT
 *  - fx       dust/sparks/slimeSplash/jellySplash/flamePuff/magic bursts
 *  - camera   shot(), followTrack(), walkTrack(), holdTrack(), crashZoom(), frameSize() (TALL / WIDE)
 *  - sfx      sfxFor(slug), loopCue()
 *  - TrapHUD  createTrapHUD({ title, stages, end })
 *  - CampaignHUD  createCampaignHUD({ chapters }) for 16:9 long-form
 */
export * from "./cues";
export * from "./motion";
export * from "./actors";
export * from "./fx";
export * from "./camera";
export * from "./sfx";
export * from "./TrapHUD";
export * from "./CampaignHUD";
