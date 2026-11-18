/* eslint-disable @remotion/non-pure-animation */
import React from "react";
import { GAME_CONFIG } from "./gameConfig";

interface HUDProps {
  health: number;
  maxHealth: number;
  coinsCollected: number;
  totalCoins: number;
  score: number;
  isVictorious: boolean;
  isGameOver: boolean;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  coinsCollected,
  totalCoins,
  score,
  isVictorious,
  isGameOver,
  onRestart,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* Top Bar: Title, Health & Score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* Health Hearts */}
        <div
          style={{
            background: "rgba(15, 20, 30, 0.75)",
            backdropFilter: "blur(6px)",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#8e9bb0", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
            Health
          </div>
          <div style={{ fontSize: "24px", marginTop: "4px" }}>
            {Array.from({ length: maxHealth }).map((_, i) => (
              <span key={i} style={{ marginRight: "4px", opacity: i < health ? 1 : 0.25 }}>
                ❤️
              </span>
            ))}
          </div>
        </div>

        {/* Game Title */}
        <div
          style={{
            background: "rgba(15, 20, 30, 0.75)",
            backdropFilter: "blur(6px)",
            padding: "8px 20px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            color: "#ffd700",
            fontWeight: "900",
            fontSize: "18px",
            textAlign: "center",
            letterSpacing: "0.5px",
            boxShadow: "0 0 20px rgba(255, 215, 0, 0.2)",
          }}
        >
          ⚔️ {GAME_CONFIG.world.title}
        </div>

        {/* Coins & Score */}
        <div
          style={{
            background: "rgba(15, 20, 30, 0.75)",
            backdropFilter: "blur(6px)",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            textAlign: "right",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ffdc40" }}>
            🪙 {coinsCollected} / {totalCoins}
          </div>
          <div style={{ fontSize: "14px", color: "#a5b4fc", marginTop: "2px" }}>
            ⭐ {score} PTS
          </div>
        </div>
      </div>

      {/* Controls Hint (Bottom Left) */}
      <div
        style={{
          background: "rgba(10, 15, 25, 0.7)",
          backdropFilter: "blur(4px)",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#cbd5e1",
          fontSize: "13px",
          alignSelf: "flex-start",
          lineHeight: "1.6",
        }}
      >
        <span style={{ color: "#38bdf8", fontWeight: "bold" }}>[WASD / Arrows]</span> Move &bull;{" "}
        <span style={{ color: "#38bdf8", fontWeight: "bold" }}>[SPACE]</span> Jump &bull;{" "}
        <span style={{ color: "#38bdf8", fontWeight: "bold" }}>[CLICK / E]</span> Attack
      </div>

      {/* Victory Screen Modal */}
      {isVictorious && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(5, 10, 25, 0.82)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              animation: "bounce 1s infinite alternate",
            }}
          >
            🏆
          </div>
          <h1
            style={{
              color: "#ffd700",
              fontSize: "44px",
              fontWeight: "900",
              margin: "10px 0",
              textShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
            }}
          >
            VICTORY, VARDHAN!
          </h1>
          <p style={{ color: "#e2e8f0", fontSize: "20px", margin: "0 0 24px" }}>
            You collected all the coins and conquered the dungeon!
          </p>
          <div
            style={{
              fontSize: "24px",
              color: "#38bdf8",
              fontWeight: "bold",
              marginBottom: "30px",
            }}
          >
            Final Score: {score} Points!
          </div>
          <button
            onClick={onRestart}
            style={{
              padding: "14px 36px",
              fontSize: "18px",
              fontWeight: "bold",
              color: "#050608",
              backgroundColor: "#ffd700",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(255, 215, 0, 0.4)",
              transition: "transform 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Play Again (R)
          </button>
        </div>
      )}

      {/* Game Over Screen Modal */}
      {isGameOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(20, 5, 8, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "56px" }}>💀</div>
          <h1
            style={{
              color: "#ef4444",
              fontSize: "44px",
              fontWeight: "900",
              margin: "10px 0",
              textShadow: "0 0 30px rgba(239, 68, 68, 0.6)",
            }}
          >
            GAME OVER!
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "18px", margin: "0 0 24px" }}>
            The dungeon traps were too sneaky this time. Don't give up!
          </p>
          <button
            onClick={onRestart}
            style={{
              padding: "14px 36px",
              fontSize: "18px",
              fontWeight: "bold",
              color: "#ffffff",
              backgroundColor: "#ef4444",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(239, 68, 68, 0.4)",
              transition: "transform 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Try Again (R)
          </button>
        </div>
      )}
    </div>
  );
};
