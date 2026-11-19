// Frames per second in the top-right corner (Esc menu: Show FPS), and with `?perf` on the URL a
// breakdown under it: the game loop's own time per frame against the frame time (a loop much
// shorter than the frame means the GPU is the limit), draw calls, triangles, lights, shader
// programs and the pixel ratio. Both count the frames the game actually draws (graphics.ts
// `frameStats`), not the browser's animation frames, and write straight into the DOM twice a
// second, so they cost no React renders.
import React, { useEffect, useRef } from "react";
import { frameStats } from "./graphics";

export const FPS_HEIGHT = 22;

const box: React.CSSProperties = {
  position: "fixed",
  right: "max(8px, env(safe-area-inset-right))",
  zIndex: 30,
  padding: "0 6px",
  borderRadius: 4,
  background: "rgba(0,0,0,0.55)",
  font: "700 11px ui-monospace, Consolas, monospace",
  pointerEvents: "none",
  fontVariantNumeric: "tabular-nums",
};

/**
 * `perfRight` / `perfTop`: how far (px) to move the performance details left of, or down below,
 * the counter, to keep them off the minimap on phones.
 */
export const FpsCounter: React.FC<{ perf?: boolean; perfRight?: number; perfTop?: number }> = ({ perf = false, perfRight = 0, perfTop = 0 }) => {
  const fpsRef = useRef<HTMLDivElement | null>(null);
  const perfRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let since = performance.now();
    let frames = frameStats.frames;
    const t = window.setInterval(() => {
      const now = performance.now();
      const n = frameStats.frames - frames;
      const fps = (n * 1000) / (now - since);
      frames = frameStats.frames;
      since = now;
      const el = fpsRef.current;
      if (el) {
        el.textContent = `${Math.round(fps)} FPS`;
        el.style.color = fps >= 50 ? "#8be08b" : fps >= 28 ? "#ffd84d" : "#ff6a5a";
      }
      const p = perfRef.current;
      if (p) {
        const frameMs = fps > 0 ? 1000 / fps : 0;
        p.textContent = [
          `frame ${frameMs.toFixed(1)} ms · loop ${frameStats.cpuMs.toFixed(1)} ms`,
          `${frameStats.calls} draws · ${(frameStats.triangles / 1000).toFixed(0)}k tris`,
          `${frameStats.lights} lights · ${frameStats.programs} shaders`,
          `dpr ${frameStats.dpr.toFixed(2)}`,
        ].join("\n");
      }
    }, 500);
    return () => window.clearInterval(t);
  }, []);
  return (
    <>
      <div
        ref={fpsRef}
        style={{
          ...box,
          top: "max(4px, env(safe-area-inset-top))",
          height: FPS_HEIGHT - 4,
          lineHeight: `${FPS_HEIGHT - 4}px`,
          color: "#8be08b",
        }}
      >
        -- FPS
      </div>
      {perf ? (
        <div
          ref={perfRef}
          style={{
            ...box,
            top: `calc(max(4px, env(safe-area-inset-top)) + ${FPS_HEIGHT + perfTop}px)`,
            right: `calc(max(8px, env(safe-area-inset-right)) + ${perfRight}px)`,
            padding: "4px 6px",
            color: "#d8e4ee",
            fontWeight: 500,
            whiteSpace: "pre",
            lineHeight: 1.45,
          }}
        />
      ) : null}
    </>
  );
};
