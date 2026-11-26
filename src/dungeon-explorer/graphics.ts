// The graphics setting (Esc menu): how much the renderer does per frame. Phones choke on the full
// picture (two lamp shadows are six extra scene renders each, the stone's parallax relief marches a
// height map per pixel, every room has a fill light, and the frame goes through a half-float
// target, bloom and a composite), so touch devices start on Low. Kept per browser, with the frame
// cap, automatic resolution, the FPS counter, and the controls and sound settings (look speed,
// inverted look, volume).
import type { ViewQuality } from "./dungeon/view";

const KEY = "simforge.explorer.graphics.v1";

export type Quality = "low" | "medium" | "high";
export const QUALITIES: Quality[] = ["low", "medium", "high"];
export const QUALITY_LABEL: Record<Quality, string> = { low: "Low", medium: "Medium", high: "High" };

export interface QualityPreset extends ViewQuality {
  /** Canvas pixel ratio (a [min, max] range lets the device ratio decide within it). */
  dpr: number | [number, number];
  /** Cloth (capes, tabards) simulation steps per second. */
  clothHz: number;
  /** Skeletons animated every frame (the nearest); the rest every other frame. */
  nearSkeletons: number;
}

export const PRESETS: Record<Quality, QualityPreset> = {
  low: { dpr: 0.75, shadows: false, ao: false, bloom: false, msaa: 0, direct: true, relief: false, roomLights: 2, clothHz: 45, nearSkeletons: 3 },
  medium: { dpr: 1, shadows: false, ao: true, bloom: true, msaa: 0, direct: false, relief: true, roomLights: 4, clothHz: 90, nearSkeletons: 8 },
  high: { dpr: [1, 1.5], shadows: true, ao: true, bloom: true, msaa: 2, direct: false, relief: true, roomLights: 0, clothHz: 90, nearSkeletons: 8 },
};

/** The highest pixel ratio a preset allows on this screen. */
export function maxDpr(p: QualityPreset): number {
  const dev = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Array.isArray(p.dpr) ? Math.max(p.dpr[0], Math.min(p.dpr[1], dev)) : p.dpr;
}

export const FRAME_CAPS = [30, 60, 100] as const;
export type FrameCap = (typeof FRAME_CAPS)[number];

export interface Graphics {
  quality: Quality;
  showFps: boolean;
  /** Frames per second at most (a steady 30 can feel smoother than a jumpy 20 to 50). */
  frameCap: FrameCap;
  /** Lower the resolution while the frame rate is low, raise it back when there is room. */
  autoRes: boolean;
  /** Draw calls, triangles, lights and frame time under the FPS counter (also `?perf` on the URL). */
  showPerf: boolean;
  /** Controls and sound (the Esc menu too): look speed (times the usual), mouse up looks down,
   * and the sound volume (0..1). */
  lookSens: number;
  invertY: boolean;
  volume: number;
}

export const LOOK_SENS_RANGE: [number, number] = [0.3, 3];

const num = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback);

export function loadGraphics(touch: boolean): Graphics {
  const fallback: Graphics = { quality: touch ? "low" : "high", showFps: true, frameCap: 100, autoRes: true, showPerf: false, lookSens: 1, invertY: false, volume: 1 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const g = JSON.parse(raw) as Partial<Graphics>;
    return {
      quality: g.quality && QUALITIES.indexOf(g.quality) !== -1 ? g.quality : fallback.quality,
      showFps: typeof g.showFps === "boolean" ? g.showFps : fallback.showFps,
      frameCap: g.frameCap && FRAME_CAPS.indexOf(g.frameCap) !== -1 ? g.frameCap : fallback.frameCap,
      autoRes: typeof g.autoRes === "boolean" ? g.autoRes : fallback.autoRes,
      showPerf: typeof g.showPerf === "boolean" ? g.showPerf : fallback.showPerf,
      lookSens: num(g.lookSens, LOOK_SENS_RANGE[0], LOOK_SENS_RANGE[1], fallback.lookSens),
      invertY: typeof g.invertY === "boolean" ? g.invertY : fallback.invertY,
      volume: num(g.volume, 0, 1, fallback.volume),
    };
  } catch {
    return fallback;
  }
}

export function saveGraphics(g: Graphics): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    // Blocked storage: the setting lasts this visit.
  }
}

/**
 * What the last frames cost, written by the game loop and read by the FPS counter and the `?perf`
 * overlay: frames actually drawn (not the browser's animation frames, which the cap skips), the
 * game loop's own time, draw calls, triangles, lights and the pixel ratio in use.
 */
export const frameStats = {
  frames: 0,
  cpuMs: 0,
  calls: 0,
  triangles: 0,
  lights: 0,
  programs: 0,
  dpr: 1,
};
