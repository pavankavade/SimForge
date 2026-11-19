// Frames per second in the top-right corner (Esc menu: Show FPS). Counts the browser's own
// animation frames and writes the number straight into the DOM twice a second, so it costs no
// React renders and shows what the player really gets.
import React, { useEffect, useRef } from "react";

export const FPS_HEIGHT = 22;

export const FpsCounter: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      frames++;
      const dt = now - since;
      if (dt >= 500) {
        const fps = (frames * 1000) / dt;
        const el = ref.current;
        if (el) {
          el.textContent = `${Math.round(fps)} FPS`;
          el.style.color = fps >= 50 ? "#8be08b" : fps >= 28 ? "#ffd84d" : "#ff6a5a";
        }
        frames = 0;
        since = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: "max(4px, env(safe-area-inset-top))",
        right: "max(8px, env(safe-area-inset-right))",
        zIndex: 30,
        height: FPS_HEIGHT - 4,
        lineHeight: `${FPS_HEIGHT - 4}px`,
        padding: "0 6px",
        borderRadius: 4,
        background: "rgba(0,0,0,0.55)",
        color: "#8be08b",
        font: "700 11px ui-monospace, Consolas, monospace",
        pointerEvents: "none",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      -- FPS
    </div>
  );
};
