// The graphics setting (Esc menu): how much the renderer does per frame. Phones choke on the full
// picture (two lamp shadows are six extra scene renders each, plus contact shadows, bloom and MSAA
// on a half-float target), so touch devices start on Low. Kept per browser.
const KEY = "simforge.explorer.graphics.v1";

export type Quality = "low" | "medium" | "high";
export const QUALITIES: Quality[] = ["low", "medium", "high"];
export const QUALITY_LABEL: Record<Quality, string> = { low: "Low", medium: "Medium", high: "High" };

export interface QualityPreset {
  /** Canvas pixel ratio (a [min, max] range lets the device ratio decide within it). */
  dpr: number | [number, number];
  /** Lamp shadows (point-light cube maps). */
  shadows: boolean;
  /** Contact shadows (a depth pass and a blur). */
  ao: boolean;
  bloom: boolean;
  /** Multisampling on the scene target. */
  msaa: number;
}

export const PRESETS: Record<Quality, QualityPreset> = {
  low: { dpr: 0.75, shadows: false, ao: false, bloom: false, msaa: 0 },
  medium: { dpr: 1, shadows: false, ao: true, bloom: true, msaa: 0 },
  high: { dpr: [1, 1.5], shadows: true, ao: true, bloom: true, msaa: 2 },
};

export interface Graphics {
  quality: Quality;
  showFps: boolean;
}

export function loadGraphics(touch: boolean): Graphics {
  const fallback: Graphics = { quality: touch ? "low" : "high", showFps: true };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const g = JSON.parse(raw) as Partial<Graphics>;
    return {
      quality: g.quality && QUALITIES.indexOf(g.quality) !== -1 ? g.quality : fallback.quality,
      showFps: typeof g.showFps === "boolean" ? g.showFps : fallback.showFps,
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
