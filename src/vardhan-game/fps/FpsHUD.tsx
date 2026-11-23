/* eslint-disable @remotion/non-pure-animation */
import React from "react";
import type { WeaponSpec } from "./weapons";

export interface FpsHUDProps {
  health: number;
  maxHealth: number;
  armor: number;
  weapon: WeaponSpec;
  ammo: number;
  gunGameLevel: number;
  totalLevels: number;
  killsThisLevel: number;
  killsNeeded: number;
  score: number;
  hitmarker: "body" | "head" | null;
  isScoped: boolean;
  killFeed: { id: number; killer: string; victim: string; weapon: string; headshot: boolean }[];
  isMatchWon: boolean;
  isGameOver: boolean;
  killerName: string | null;
  damageIndicator: { angle: number; opacity: number } | null;
  lastAttacker: { name: string; dist: number } | null;
  isHurtFlash: boolean;
  difficulty: "vardhan" | "classic";
  onToggleDifficulty: () => void;
  onRestart: () => void;
  onSwitchMode: () => void;
}

export const FpsHUD: React.FC<FpsHUDProps> = ({
  health,
  maxHealth,
  armor,
  weapon,
  ammo,
  gunGameLevel,
  totalLevels,
  killsThisLevel,
  killsNeeded,
  score,
  hitmarker,
  isScoped,
  killFeed,
  isMatchWon,
  isGameOver,
  killerName,
  damageIndicator,
  lastAttacker,
  isHurtFlash,
  difficulty,
  onToggleDifficulty,
  onRestart,
  onSwitchMode,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Trebuchet MS', 'Segoe UI', Roboto, sans-serif",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* 1. BLOOD VIGNETTE & RED HURT FLASH (Screen Edges) */}
      {isHurtFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(220, 38, 38, 0.45) 80%, rgba(185, 28, 28, 0.8) 100%)",
            pointerEvents: "none",
            transition: "opacity 0.2s ease-out",
          }}
        />
      )}

      {/* 2. DIRECTIONAL DAMAGE INDICATOR (Red Wedge Pointing at Enemy) */}
      {damageIndicator && damageIndicator.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "280px",
            height: "280px",
            transform: `translate(-50%, -50%) rotate(${damageIndicator.angle}rad)`,
            pointerEvents: "none",
            opacity: damageIndicator.opacity,
            transition: "opacity 0.25s ease-out",
          }}
        >
          {/* Curved threat arc pointing from center outward */}
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id="dmgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.4" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Top pointing chevron arc */}
            <path
              d="M 28 20 A 42 42 0 0 1 72 20 L 50 4 Z"
              fill="url(#dmgGrad)"
              filter="url(#glow)"
            />
          </svg>
        </div>
      )}

      {/* 3. UNDER ATTACK ALERT BANNER */}
      {lastAttacker && (
        <div
          style={{
            position: "absolute",
            top: "84px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(185, 28, 28, 0.92)",
            backdropFilter: "blur(6px)",
            border: "2px solid #f87171",
            borderRadius: "14px",
            padding: "8px 24px",
            color: "#ffffff",
            fontWeight: "900",
            fontSize: "14px",
            boxShadow: "0 0 25px rgba(239, 68, 68, 0.8)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "pulse 0.8s infinite alternate",
          }}
        >
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <span>
            UNDER ATTACK FROM: <span style={{ color: "#fef08a" }}>{lastAttacker.name}</span> (
            {lastAttacker.dist}m away!)
          </span>
        </div>
      )}

      {/* 4. RETICLE & CROSSHAIR (Center) */}
      {!isScoped && weapon.category !== "knife" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", top: 0, width: "2px", height: "7px", background: "#22c55e" }} />
          <div style={{ position: "absolute", bottom: 0, width: "2px", height: "7px", background: "#22c55e" }} />
          <div style={{ position: "absolute", left: 0, width: "7px", height: "2px", background: "#22c55e" }} />
          <div style={{ position: "absolute", right: 0, width: "7px", height: "2px", background: "#22c55e" }} />
          <div style={{ width: "2px", height: "2px", background: "#22c55e" }} />
        </div>
      )}

      {/* Hitmarker Flash */}
      {hitmarker && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "36px",
            height: "36px",
            color: hitmarker === "head" ? "#ef4444" : "#ffffff",
            fontSize: "28px",
            fontWeight: "900",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textShadow: "0 0 10px rgba(255, 0, 0, 0.8)",
          }}
        >
          ✕
        </div>
      )}

      {/* 5. AWP SNIPER SCOPE OVERLAY */}
      {isScoped && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 38%, rgba(0,0,0,0.92) 40%, #000000 100%)",
          }}
        >
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", background: "rgba(0,0,0,0.85)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", background: "rgba(0,0,0,0.85)" }} />
        </div>
      )}

      {/* 6. TOP BAR: GUN GAME WEAPON PROGRESSION (Arms Race) */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          border: "2px solid #38bdf8",
          borderRadius: "16px",
          padding: "10px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "900", letterSpacing: "1px" }}>
          ⚔️ ARMS RACE &bull; LEVEL {gunGameLevel} / {totalLevels}
        </div>
        <div style={{ fontSize: "20px", fontWeight: "900", color: "#f8fafc", margin: "3px 0" }}>
          {weapon.name}
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Kills: {killsThisLevel} / {killsNeeded} to Next Weapon
        </div>
      </div>

      {/* 7. TOP LEFT: MODE SWITCHER & DIFFICULTY TOGGLE */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={onSwitchMode}
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#e2e8f0",
            padding: "8px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🏃</span>
          <span>Switch to Stumble Sandbox</span>
        </button>

        {/* Difficulty Button */}
        <button
          onClick={onToggleDifficulty}
          style={{
            background: difficulty === "vardhan" ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "900",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          <span>{difficulty === "vardhan" ? "🛡️" : "⚡"}</span>
          <span>Mode: {difficulty === "vardhan" ? "Vardhan (150 HP + Cover Heal)" : "Classic CS"}</span>
        </button>
      </div>

      {/* 8. TOP RIGHT: KILL FEED */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: "flex-end",
        }}
      >
        {killFeed.map((k) => (
          <div
            key={k.id}
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: k.headshot ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "bold",
              color: "#e2e8f0",
            }}
          >
            <span style={{ color: "#38bdf8" }}>{k.killer}</span>{" "}
            <span style={{ color: "#f59e0b" }}>[{k.weapon}]</span>{" "}
            {k.headshot && <span style={{ color: "#ef4444" }}>🎯 </span>}
            <span style={{ color: "#f87171" }}>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* 9. BOTTOM LEFT: HEALTH & ARMOR */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "24px",
          display: "flex",
          gap: "18px",
        }}
      >
        {/* Health */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "10px 18px",
            borderRadius: "14px",
            border: health < 40 ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: health < 40 ? "0 0 20px rgba(239, 68, 68, 0.6)" : "none",
          }}
        >
          <span style={{ fontSize: "28px" }}>➕</span>
          <div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "bold" }}>HEALTH</div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "900",
                color: health > 50 ? "#22c55e" : health > 25 ? "#f59e0b" : "#ef4444",
                lineHeight: "1.1",
              }}
            >
              {health} <span style={{ fontSize: "14px", color: "#64748b" }}>/ {maxHealth}</span>
            </div>
          </div>
        </div>

        {/* Armor */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "2px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "24px" }}>🛡️</span>
          <div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "bold" }}>ARMOR</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#38bdf8", lineHeight: "1.1" }}>
              {armor}
            </div>
          </div>
        </div>
      </div>

      {/* 10. BOTTOM RIGHT: AMMO & WEAPON */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "24px",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(6px)",
          padding: "10px 22px",
          borderRadius: "14px",
          border: "2px solid rgba(255,255,255,0.15)",
          textAlign: "right",
        }}
      >
        <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "bold", textTransform: "uppercase" }}>
          {weapon.name}
        </div>
        <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", lineHeight: "1.1" }}>
          {weapon.category === "knife" ? "∞" : `${ammo} / ${weapon.magSize * 3}`}
        </div>
      </div>

      {/* 11. CONTROLS GUIDE (Bottom Center) */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.82)",
          padding: "7px 16px",
          borderRadius: "10px",
          fontSize: "12px",
          color: "#cbd5e1",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Click to Lock Mouse &bull; <span style={{ color: "#38bdf8" }}>[WASD]</span> Move &bull;{" "}
        <span style={{ color: "#38bdf8" }}>[L-CLICK]</span> Shoot &bull;{" "}
        <span style={{ color: "#38bdf8" }}>[R-CLICK]</span> Scope &bull;{" "}
        <span style={{ color: "#38bdf8" }}>[R]</span> Reload
      </div>

      {/* 12. MATCH WON BANNER */}
      {isMatchWon && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 23, 42, 0.94)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "72px" }}>🏆</div>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "900",
              color: "#ffd700",
              margin: "12px 0 6px",
              textShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
            }}
          >
            VICTORY!
          </h1>
          <p style={{ fontSize: "20px", color: "#e2e8f0", margin: "0 0 24px" }}>
            Vardhan completed the Gun Game with the Golden Knife!
          </p>
          <div style={{ fontSize: "22px", color: "#38bdf8", fontWeight: "bold", marginBottom: "30px" }}>
            Final Score: {score} PTS
          </div>
          <button
            onClick={onRestart}
            style={{
              padding: "16px 42px",
              fontSize: "18px",
              fontWeight: "900",
              background: "#ffd700",
              color: "#0f172a",
              border: "none",
              borderRadius: "32px",
              cursor: "pointer",
              boxShadow: "0 8px 25px rgba(255, 215, 0, 0.5)",
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* 13. ELIMINATED / RESPAWN BANNER */}
      {isGameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 5, 5, 0.92)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
            padding: "20px",
          }}
        >
          <div style={{ fontSize: "64px" }}>💀</div>
          <h1 style={{ fontSize: "44px", fontWeight: "900", color: "#ef4444", margin: "12px 0 4px" }}>
            YOU DIED!
          </h1>

          {/* Attacker Information Badge */}
          <div
            style={{
              background: "rgba(239, 68, 68, 0.18)",
              border: "2px solid #ef4444",
              borderRadius: "16px",
              padding: "12px 28px",
              margin: "14px 0 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "bold" }}>ELIMINATED BY:</div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#ffffff", margin: "4px 0" }}>
              {killerName || "Rival Bot"}
            </div>
          </div>

          <div
            style={{
              color: "#94a3b8",
              fontSize: "15px",
              maxWidth: "460px",
              textAlign: "center",
              lineHeight: "1.5",
              marginBottom: "28px",
              background: "rgba(255,255,255,0.05)",
              padding: "12px 20px",
              borderRadius: "12px",
            }}
          >
            💡 <b style={{ color: "#f8fafc" }}>Tip for Vardhan:</b> Take cover behind the wooden crates or
            sandbags when you hear shots! In Vardhan Mode, taking cover for 2.5s regenerates your health!
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <button
              onClick={onRestart}
              style={{
                padding: "16px 36px",
                fontSize: "18px",
                fontWeight: "900",
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "32px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(239, 68, 68, 0.5)",
              }}
            >
              Respawn &amp; Try Again
            </button>
            <button
              onClick={onSwitchMode}
              style={{
                padding: "16px 28px",
                fontSize: "16px",
                fontWeight: "bold",
                background: "rgba(255, 255, 255, 0.12)",
                color: "#e2e8f0",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "32px",
                cursor: "pointer",
              }}
            >
              🏃 Switch to Sandbox
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
