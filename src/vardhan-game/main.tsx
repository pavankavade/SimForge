import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VardhanFpsApp } from "./VardhanFpsApp";
import { VardhanStumbleApp } from "./VardhanStumbleApp";

function App() {
  const [mode, setMode] = useState<"cs" | "stumble">("cs");

  return (
    <>
      {/* Top Floating Game Mode Switcher Pill */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          gap: "8px",
          background: "rgba(10, 15, 30, 0.9)",
          padding: "6px 10px",
          borderRadius: "24px",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={() => setMode("cs")}
          style={{
            background: mode === "cs" ? "#f59e0b" : "rgba(255,255,255,0.08)",
            color: mode === "cs" ? "#0f172a" : "#cbd5e1",
            border: "none",
            borderRadius: "16px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "900",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🔫</span>
          <span>CS Gun Game</span>
        </button>

        <button
          onClick={() => setMode("stumble")}
          style={{
            background: mode === "stumble" ? "#38bdf8" : "rgba(255,255,255,0.08)",
            color: mode === "stumble" ? "#0f172a" : "#cbd5e1",
            border: "none",
            borderRadius: "16px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "900",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🏃</span>
          <span>Stumble Sandbox</span>
        </button>
      </div>

      {mode === "cs" ? (
        <VardhanFpsApp onSwitchMode={() => setMode("stumble")} />
      ) : (
        <VardhanStumbleApp />
      )}
    </>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
