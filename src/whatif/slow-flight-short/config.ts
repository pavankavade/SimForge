import { PERCH } from "../../artifacts/sky";
import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, Vec3 } from "../../engine/types";
import { easeInOut, lerp, progress, sfxFor } from "../../kit";
import { config as longConfig, SFX as LONG_SFX } from "../slow-flight/config";
import { LAND, SHOT_GEOMETRY, climbPair, schoolPair, takeoffPair } from "../slow-flight/Scene";
import { BEATS as L, PERCH_LAND, Z, kitYardX, shotEnd, shotStart } from "../slow-flight/timeline";
import { BEATS, CLIPS, clipEnd } from "./timeline";

/**
 * Short config: the long-form camera (in long-form frames, since every clip
 * plays in long-form time) with portrait overrides appended, and the
 * long-form effects remapped into each clip window.
 */

// ---------------------------------------------------------------------------
// Portrait reframes, in long-form frames (later tracks override the long-form
// ones). 9:16 at fov 40: at distance d the frame is ~0.41·d wide, ~0.73·d tall.
// Subjects sit in the middle band, under the speed chip and above the captions.
// ---------------------------------------------------------------------------
const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Side-on shot of a point on the action plane from distance d, looking slightly down. */
const side = (x: number, y: number, z: number, d: number) => pose([x, y + 0.5, z + d], [x, y, z]);

const PERCH_Y = PERCH.y;
const stallPair = (f: number): Vec3 => {
  const t = easeInOut(progress(f, PERCH_LAND));
  return [lerp(-3, 0, t), lerp(1.6, PERCH_Y, t), Z];
};

const PORTRAIT_TRACKS: CameraTrack[] = [
  // Kit hovering at walking pace with the cat on the fence, framed under the hook title.
  track(0, shotEnd("yard"), (f) => side(kitYardX(f) + 0.55, 2.3, Z, 7)),
  // The dead bus and the pair beside it.
  track(shotStart("bus"), shotEnd("bus"), () => pose([-0.6, 1.7, Z + 9.5], [-0.8, 0.9, Z - 1.2])),
  track(shotStart("takeoff"), shotEnd("takeoff"), (f) => {
    const p = takeoffPair(f).position;
    return side(p[0] + 0.3, 0.9 + p[1], Z, 6.4);
  }),
  track(shotStart("cruise"), shotEnd("cruise"), () => side(0.4, 1.0, Z, 7.5)),
  // Headwind: the struggling pair, then a cut to the cow looking up at them.
  track(shotStart("headwind"), L.cow - 12, () => side(0.4, 1.0, Z, 7.2)),
  track(L.cow - 12, shotEnd("headwind"), () => pose([2.7, -SHOT_GEOMETRY.PASTURE_ALT + 0.9, Z + 1.6], [2.2, -SHOT_GEOMETRY.PASTURE_ALT + 0.75, Z - 3])),
  track(shotStart("climb"), shotEnd("climb"), (f) => {
    const p = climbPair(f).position;
    return side(p[0], 0.6, p[2], 6.4);
  }),
  // Ridge lift: centred between the pair sliding in and the paraglider.
  track(shotStart("ridge"), shotEnd("ridge"), (f) => {
    const pairX = lerp(-5, -1.2, easeInOut(progress(f, [L.slideIn - 10, L.slideIn + 40])));
    return side((pairX + 1.6) / 2 - 0.25, 0.4, Z - 1, 14.5);
  }),
  track(shotStart("stall"), L.landRock + 10, (f) => {
    const p = stallPair(f);
    return side(p[0] + 0.2, p[1] + 0.9, Z, 6.4);
  }),
  track(shotStart("valley"), shotEnd("valley"), (f) => side(0.2, PERCH_Y + 0.9 + 0.8 * easeInOut(progress(f, [L.jump, L.jump + 26])), Z, 8)),
  track(shotStart("school"), L.land - 8, (f) => {
    const p = schoolPair(f).position;
    return pose([p[0] + 0.3, 1.9 + p[1] * 0.8, LAND[2] + 7], [p[0] + 0.3, 1.2 + p[1] * 0.8, LAND[2] - 0.5]);
  }),
];

export const canvasConfig: EpisodeConfig = {
  ...longConfig,
  camera: { ...longConfig.camera, tracks: (longConfig.camera.tracks ?? []).concat(PORTRAIT_TRACKS) },
};

/** Long-form cues that start inside a clip, shifted to short time and trimmed at the cut. */
const remapped: SfxCue[] = ([] as SfxCue[]).concat(
  ...CLIPS.map((clip, i) => {
    if (clip.freeze) return [];
    const len = clipEnd(i) - clip.at;
    return LONG_SFX.filter((c) => c.frame >= clip.src && c.frame < clip.src + len).map((c) => {
      const frame = c.frame - clip.src + clip.at;
      const room = clip.at + len - frame + 6;
      return { ...c, frame, durationInFrames: Math.min(c.durationInFrames ?? room, room), fadeOutFrames: Math.min(c.fadeOutFrames ?? 6, 8) };
    });
  }),
);

const sfx = sfxFor("slow-flight", "whatif");

export const SHORT_SFX: SfxCue[] = remapped.concat(
  // A soft whoosh on every cut keeps the pace audible.
  CLIPS.slice(1, -1).map((c) => sfx("whoosh", c.at - 2, 0.12)),
  [sfx("stamp", 4, 0.25), sfx("stamp", BEATS.endCard, 0.3), sfx("pop", BEATS.linked, 0.25)],
);
