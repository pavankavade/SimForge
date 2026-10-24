import type { CameraPose, CameraTrack, Vec3 } from "../engine/types";

/**
 * Camera helpers for the 9:16 portrait frame at fov 40.
 *
 * At distance d the frame shows about 0.41·d wide and 0.73·d tall. Keep the
 * subject inside the middle ~80% of the width, above the subtitle band
 * (bottom ~20% of the frame).
 *
 * Waypoints are for establishing and reaction shots; tracks are for anything
 * that moves fast. Tracks apply in order, later ones override earlier ones,
 * `blend: 1` is a hard cut.
 */

export const FRAME_W_PER_D = 0.41;
export const FRAME_H_PER_D = 0.73;

/** Visible width/height of the frame at camera distance d. */
export const frameSize = (d: number) => ({ width: FRAME_W_PER_D * d, height: FRAME_H_PER_D * d });
/** Camera distance that fits `width` world units inside 80% of the frame width. */
export const distForWidth = (width: number) => width / (FRAME_W_PER_D * 0.8);
/** Camera distance that fits `height` world units inside the top ~70% of the frame (subtitles below). */
export const distForHeight = (height: number) => height / (FRAME_H_PER_D * 0.7);

/**
 * A standard side-on shot of the action plane z = `z`, looking at (x, y).
 * `rise` lifts the camera above the look target for a slight downward angle;
 * `lead` shifts the look target sideways (look into the direction of motion).
 */
export const shot = (x: number, y: number, dist: number, { z = -0.6, rise = 1.3, lead = 0 } = {}): CameraPose => ({
  position: [x, y + rise, z + dist],
  lookAt: [x + lead, y, z],
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
