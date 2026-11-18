import React, { useState } from "react";
import type { AdventurerClass } from "../artifacts/characters/hero";
import type { ThemeStyle } from "./StumbleWorld";

interface StumbleHUDProps {
  currentHero: AdventurerClass;
  onSelectHero: (hero: AdventurerClass) => void;
  speedMode: number;
  onSelectSpeed: (speed: number) => void;
  jumpMode: number;
  onSelectJump: (jump: number) => void;
  theme: ThemeStyle;
  onSelectTheme: (theme: ThemeStyle) => void;
  isVictory: boolean;
  onRestart: () => void;
  onTouchJump: () => void;
  onTouchDive: () => void;
}

export const StumbleHUD: React.FC<StumbleHUDProps> = ({
  currentHero,
  onSelectHero,
  speedMode,
  onSelectSpeed,
  jumpMode,
  onSelectJump,
  theme,
  onSelectTheme,
  isVictory,
  onRestart,
  onTouchJump,
  onTouchDive,
}) => {
  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [wishlist, setWishlist] = useState<{ [key: string]: boolean }>({
    boxingGloves: true,
    iceSlide: false,
    cannonballs: true,
    botsRacing: true,
    speedrunTimer: false,
  });

  const toggleWish = (key: string) => {
    setWishlist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Top Bar: Title & Quick Hero Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Title Badge */}
        <div
          style={{
            background: "rgba(10, 25, 47, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "8px 18px",
            borderRadius: "16px",
            border: "2px solid #38bdf8",
            boxShadow: "0 6px 20px rgba(56, 189, 248, 0.3)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#38bdf8",
              fontWeight: "900",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Stumble Sandbox
          </div>
          <div style={{ fontSize: "20px", fontWeight: "900", color: "#f8fafc" }}>
            🏃 Vardhan&apos;s Run
          </div>
        </div>

        {/* Hero Selector (Paladin, Rogue, Mage, Goblin) */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "6px 10px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            gap: "8px",
            pointerEvents: "auto",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "bold", marginLeft: "4px" }}>
            HERO:
          </span>
          {[
            { id: "paladin", label: "Knight", icon: "🛡️" },
            { id: "rogue", label: "Ninja", icon: "🥷" },
            { id: "mage", label: "Wizard", icon: "🧙" },
            { id: "goblin", label: "Goblin", icon: "👺" },
          ].map((h) => {
            const active = currentHero === h.id;
            return (
              <button
                key={h.id}
                onClick={() => onSelectHero(h.id as AdventurerClass)}
                style={{
                  background: active ? "#38bdf8" : "rgba(255,255,255,0.08)",
                  color: active ? "#0f172a" : "#e2e8f0",
                  border: "none",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: active ? "0 0 14px rgba(56, 189, 248, 0.6)" : "none",
                }}
              >
                <span>{h.icon}</span>
                <span>{h.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vardhan's Workshop / Guide Toggle Button */}
        <div style={{ pointerEvents: "auto" }}>
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            style={{
              background: guideOpen ? "#f59e0b" : "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "14px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>💡</span>
            <span>{guideOpen ? "Close Workshop" : "Vardhan's Workshop"}</span>
          </button>
        </div>
      </div>

      {/* Guide & Tweak Panel Modal */}
      {guideOpen && (
        <div
          style={{
            position: "absolute",
            top: "80px",
            right: "16px",
            width: "min(380px, 92vw)",
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(14px)",
            borderRadius: "20px",
            border: "2px solid #38bdf8",
            padding: "20px",
            color: "#f1f5f9",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            pointerEvents: "auto",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#38bdf8", fontWeight: "900" }}>
              🛠️ Vardhan&apos;s Sandbox Workshop
            </h3>
            <button
              onClick={() => setGuideOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 16px" }}>
            Test physics &amp; check what obstacles you want to build next!
          </p>

          {/* Speed Presets */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#cbd5e1", marginBottom: "6px" }}>
              🏃 RUN SPEED:
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { label: "Normal (1x)", val: 1.0 },
                { label: "Rush (1.5x)", val: 1.5 },
                { label: "Sonic (2.2x)", val: 2.2 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => onSelectSpeed(s.val)}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "none",
                    background: speedMode === s.val ? "#38bdf8" : "#334155",
                    color: speedMode === s.val ? "#0f172a" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jump Presets */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#cbd5e1", marginBottom: "6px" }}>
              🦘 JUMP POWER:
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { label: "Standard", val: 1.0 },
                { label: "High Jump", val: 1.4 },
                { label: "Moon Bounce", val: 2.0 },
              ].map((j) => (
                <button
                  key={j.label}
                  onClick={() => onSelectJump(j.val)}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "none",
                    background: jumpMode === j.val ? "#22c55e" : "#334155",
                    color: jumpMode === j.val ? "#0f172a" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Presets */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#cbd5e1", marginBottom: "6px" }}>
              🎨 PLATFORM THEME:
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { id: "stumble", label: "Stumble" },
                { id: "candy", label: "Candy Land" },
                { id: "neon", label: "Neon Arcade" },
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onSelectTheme(th.id as ThemeStyle)}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "none",
                    background: theme === th.id ? "#ec4899" : "#334155",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ideas Checklist for Vardhan */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f59e0b", marginBottom: "8px" }}>
              📋 WHAT SHOULD WE BUILD NEXT?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              {[
                { id: "boxingGloves", text: "🥊 Boxing Glove Wall Punchers" },
                { id: "iceSlide", text: "🧊 Slippery Ice Slide" },
                { id: "cannonballs", text: "💣 Rolling Giant Cannonballs" },
                { id: "botsRacing", text: "🤖 10 Stumble AI Bots Racing with You" },
                { id: "speedrunTimer", text: "⏱️ Speedrun Race Timer & High Scores" },
              ].map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: wishlist[item.id] ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(wishlist[item.id])}
                    onChange={() => toggleWish(item.id)}
                    style={{ accentColor: "#38bdf8" }}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls / Help Display */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
        }}
      >
        {/* Desktop Controls Cheat-Sheet */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            padding: "8px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            fontSize: "12px",
            lineHeight: "1.6",
            pointerEvents: "auto",
          }}
        >
          <span style={{ color: "#38bdf8", fontWeight: "bold" }}>[WASD / Arrows]</span> Run &bull;{" "}
          <span style={{ color: "#38bdf8", fontWeight: "bold" }}>[SPACE]</span> Jump &bull;{" "}
          <span style={{ color: "#f59e0b", fontWeight: "bold" }}>[SHIFT / E]</span> Dive Slide
        </div>

        {/* Mobile Touch Action Buttons (Jump & Dive) */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            pointerEvents: "auto",
          }}
        >
          <button
            onPointerDown={onTouchDive}
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.9)",
              border: "3px solid #fde68a",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(245, 158, 11, 0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              touchAction: "none",
            }}
          >
            <span style={{ fontSize: "18px" }}>💨</span>
            <span>DIVE</span>
          </button>

          <button
            onPointerDown={onTouchJump}
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.9)",
              border: "3px solid #ffffff",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(56, 189, 248, 0.6)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              touchAction: "none",
            }}
          >
            <span style={{ fontSize: "22px" }}>🦘</span>
            <span>JUMP</span>
          </button>
        </div>
      </div>

      {/* Victory Celebration Modal */}
      {isVictory && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10, 15, 30, 0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "72px" }}>👑</div>
          <h1
            style={{
              color: "#ffd700",
              fontSize: " clamp(32px, 5vw, 54px)",
              fontWeight: "900",
              margin: "12px 0 6px",
              textShadow: "0 0 35px rgba(255, 215, 0, 0.7)",
              textAlign: "center",
            }}
          >
            QUALIFIED!
          </h1>
          <p
            style={{
              color: "#f8fafc",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "0 0 24px",
              textAlign: "center",
            }}
          >
            Vardhan mastered the Stumble Platform!
          </p>
          <button
            onClick={onRestart}
            style={{
              padding: "16px 40px",
              fontSize: "18px",
              fontWeight: "900",
              color: "#0f172a",
              background: "#ffd700",
              border: "none",
              borderRadius: "32px",
              cursor: "pointer",
              boxShadow: "0 8px 25px rgba(255, 215, 0, 0.5)",
            }}
          >
            Play Again 🚀
          </button>
        </div>
      )}
    </div>
  );
};
