import type { CameraPose, CameraTrack, Vec3 } from "../engine/types";

/**
 * Camera helpers for the 9:16 portrait frame at fov 40 (pass `WIDE` as the
 * aspect for 16:9 long-form).
 *
 * At distance d the portrait frame shows about 0.41·d wide and 0.73·d tall;
 * the 16:9 frame about 1.30·d wide and 0.73·d tall (same height). Keep the
 * subject inside the middle ~80% of the width, above the subtitle band
 * (bottom ~20% of the frame).
 *
 * Waypoints are for establishing and reaction shots; tracks are for anything
 * that moves fast. Tracks apply in order, later ones override earlier ones,
 * `blend: 1` is a hard cut.
 */

export const FRAME_W_PER_D = 0.41;
export const FRAME_H_PER_D = 0.73;
/** Aspect ratios (width / height) for the frame helpers. */
export const TALL = 9 / 16;
export const WIDE = 16 / 9;

/** Visible width/height of the frame at camera distance d. */
export const frameSize = (d: number, aspect = TALL) => ({ width: FRAME_H_PER_D * aspect * d, height: FRAME_H_PER_D * d });
/** Camera distance that fits `width` world units inside 80% of the frame width. */
export const distForWidth = (width: number, aspect = TALL) => width / (FRAME_H_PER_D * aspect * 0.8);
/**
 * Camera distance that fits `height` world units inside `band` of the frame
 * height (portrait: top ~70%, subtitles below; 16:9 long-form: ~80%).
 */
export const distForHeight = (height: number, band = 0.7) => height / (FRAME_H_PER_D * band);

/**
 * A standard side-on shot of the action plane z = `z`, looking at (x, y).
 * `rise` lifts the camera above the look target for a slight downward angle;
 * `lead` shifts the look target sideways (look into the direction of motion).
 */
export const shot = (
  x: number,
  y: number,
  dist: number,
  { z = -0.6, rise = 1.3, lead = 0, fov, roll }: { z?: number; rise?: number; lead?: number; fov?: number; roll?: number } = {}
): CameraPose => ({
  position: [x, y + rise, z + dist],
  lookAt: [x + lead, y, z],
  ...(fov === undefined ? {} : { fov }),
  ...(roll === undefined ? {} : { roll }),
});

/** Field of view that magnifies the picture `zoom` times from `fov` (degrees) without moving the camera. */
export const zoomFov = (fov: number, zoom: number) => (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / zoom) * 180) / Math.PI;

/**
 * Crash zoom: hard cut to `pose` at `start`, then the lens snaps in `zoom`x
 * over `len` frames (no dolly) and holds until `end`. The comedy punch-in on a
 * reaction ("...and then he sees the boulder"). Aim `pose.lookAt` at the face.
 */
export const crashZoom = (start: number, end: number, pose: CameraPose, { zoom = 2.2, len = 5, fov = 40 } = {}): CameraTrack => ({
  start,
  end,
  blend: 1,
  fn: (f) => {
    const t = Math.min(1, Math.max(0, (f - start) / len));
    return { ...pose, fov: fov + (zoomFov(fov, zoom) - fov) * (1 - (1 - t) ** 3) };
  },
});

/**
 * Like `shot`, but orbits the camera around (x, y) by `yaw` radians.
 * yaw < 0 swings the camera to the left, showing the RIGHT wall's inner face; yaw > 0 the left.
 */
export const orbitShot = (x: number, y: number, dist: number, yaw: number, { z = -0.6, rise = 1.0 } = {}): CameraPose => ({
  position: [x + Math.sin(yaw) * dist, y + rise, z + Math.cos(yaw) * dist],
  lookAt: [x, y, z],
});

/** Holds a fixed pose between start and end (hard cut in and out by default). */
export const holdTrack = (start: number, end: number, pose: CameraPose, blend = 1): CameraTrack => ({
  start,
  end,
  blend,
  fn: () => pose,
});

/**
 * Follows any moving point (a sprinting character, a projectile, a rolling
 * hazard). `target(frame)` returns the point to frame; `clampX` keeps the
 * camera short of level edges and bright exits so the subject leaves frame
 * instead of the camera panning across empty space.
 */
export const followTrack = ({
  start,
  end,
  target,
  dist = 9.5,
  lead = 0,
  height = 1.2,
  minY = 0.9,
  clampX = [-Infinity, Infinity],
  z = -0.6,
  blend = 8,
}: {
  start: number;
  end: number;
  target: (frame: number) => Vec3;
  dist?: number;
  lead?: number;
  height?: number;
  minY?: number;
  clampX?: readonly [number, number];
  z?: number;
  blend?: number;
}): CameraTrack => ({
  start,
  end,
  blend,
  fn: (f) => {
    const p = target(f);
    const x = Math.min(clampX[1], Math.max(clampX[0], p[0]));
    const y = Math.max(minY, p[1] * 0.75 + 0.5);
    return { position: [x + lead, y + height, z + dist], lookAt: [x + lead * 1.3, y, z] };
  },
});

/**
 * Tracks blend in AND out over `blend` frames, so two back-to-back tracks leave
 * a few frames of waypoint drift between them. For each track that the next
 * one picks up from (next.start within 2 frames of this end), keep this one
 * alive until the next has fully blended in. Pass tracks in timeline order.
 */
export const chainTracks = (tracks: CameraTrack[]): CameraTrack[] =>
  tracks.map((t, i) => {
    const next = tracks[i + 1];
    if (!next || next.start > t.end + 2 || next.start < t.start) return t;
    return { ...t, end: Math.max(t.end, next.start + (next.blend ?? 15) + (t.blend ?? 15)) };
  });

/** Follows a newcomer walking in linearly from x0 to x1 over [start, end] (Ep2 entries). */
export const walkTrack = (start: number, end: number, x0: number, x1: number, dist = 9, blend = 8, z = -0.6): CameraTrack => ({
  start,
  end,
  blend,
  fn: (f) => {
    const x = x0 + (x1 - x0) * Math.min(1, Math.max(0, (f - start) / (end - start))) + 0.6;
    return { position: [x, 2.3, z + dist], lookAt: [x + 0.2, 1.0, z] };
  },
});
