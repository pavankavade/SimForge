import type { SfxCue } from "../engine/types";

/**
 * SFX cue factory for one episode's `public/episodes/<slug>/sfx/*.wav`.
 *
 *   const sfx = sfxFor("rolling-boulder");
 *   sfx("squash", BEATS.goblinHit, 0.5)
 *   sfx("roll", b.release, 0.3, { durationInFrames: 60, fadeOutFrames: 8 })
 *
 * Key every cue to a BEATS value or a kinematics helper, never a literal frame.
 */
export const sfxFor =
  (slug: string) =>
  (name: string, frame: number, volume = 1, extra: Partial<SfxCue> = {}): SfxCue => ({
    src: `episodes/${slug}/sfx/${name}.wav`,
    frame: Math.round(frame),
    volume,
    ...extra,
  });

/** A looping bed (rolling, gears, rumble) trimmed to [start, end] with a fade-out. */
export const loopCue = (cue: SfxCue, end: number, fadeOutFrames = 8): SfxCue => ({
  ...cue,
  durationInFrames: Math.max(4, Math.round(end) - cue.frame),
  fadeOutFrames,
});
