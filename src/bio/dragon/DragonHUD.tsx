import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, shotAt, shotEnd, shotStart } from "./timeline";

/**
 * Dragon HUD (1080x1920): clean, punchy scientific biological instruments
 * displaying thermal readings, tank pressure, anaerobic safety levels,
 * flint spark status, and flame velocity vs gas exit speed.
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const CYAN = "#3fe6d4";
const AMBER = "#ffaa3b";
const RED = "#ff4d3b";
const GREEN = "#4ee072";
const PILL_BG = "rgba(12, 18, 24, 0.92)";

const pop = (frame: number, at: number, fps: number) =>
  spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 210 } });

const fadeOut = (frame: number, to: number, len = 8) =>
  interpolate(frame, [to - len, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const panel: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  background: PILL_BG,
  borderRadius: 24,
  fontFamily: FONT,
  color: "#fff",
  boxShadow: "0 12px 30px rgba(0,0,0,0.65)",
  backdropFilter: "blur(8px)",
};

export const DragonHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentShot = shotAt(frame);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* ---------------- 1. Series Title Pill ---------------- */}
      {frame < shotStart("fuel") + 15 && (
        <div
          style={{
            ...panel,
            top: 90,
            padding: "16px 36px 14px",
            border: `3px solid ${AMBER}`,
            transform: `translateX(-50%) scale(${pop(frame, 6, fps)})`,
            opacity: fadeOut(frame, shotStart("fuel") + 15),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 5, color: AMBER }}>BIOLOGY OF FANTASY</div>
          <div style={{ fontSize: 44, letterSpacing: 1, textTransform: "uppercase" }}>
            How a Dragon Survives Its Own Fire
          </div>
        </div>
      )}

      {/* ---------------- 2. Thermal Hazard Alert (Hook) ---------------- */}
      {currentShot === "hook" && frame >= BEATS.fire && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "18px 40px",
            border: `3px solid ${RED}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.fire, fps)})`,
            opacity: fadeOut(frame, shotEnd("hook")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 4, color: RED }}>BELLY TEMPERATURE</div>
          <div style={{ fontSize: 68, lineHeight: 1.1, color: "#fff" }}>
            1,500 <span style={{ fontSize: 36, color: RED }}>°C</span>
          </div>
          <div style={{ fontSize: 22, color: "#ff8888", marginTop: 4 }}>FATAL WITHIN 1 SECOND</div>
        </div>
      )}

      {/* ---------------- 3. Stomach 1: Methane Fermentation Gauge ---------------- */}
      {(currentShot === "cow" || currentShot === "ferment") && frame >= BEATS.bacteria - 6 && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "16px 36px",
            border: `3px solid ${GREEN}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.bacteria - 6, fps)})`,
            opacity: fadeOut(frame, shotEnd("ferment")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: GREEN }}>STOMACH 1 : RUMEN</div>
          <div style={{ fontSize: 46, lineHeight: 1.15, marginTop: 4 }}>
            METHANOGENESIS <span style={{ color: CYAN }}>(CH₄)</span>
          </div>
          <div style={{ fontSize: 20, color: "#a8c0a0", marginTop: 4 }}>ANALOGY: BOVINE CELLULOSE FERMENT</div>
        </div>
      )}

      {/* ---------------- 4. Stomach 2: Muscular Pressure Chamber ---------------- */}
      {(currentShot === "stomach2" || currentShot === "pressure") && frame >= BEATS.stomach - 4 && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "16px 38px",
            border: `3px solid ${CYAN}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.stomach - 4, fps)})`,
            opacity: fadeOut(frame, shotEnd("pressure")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: CYAN }}>STOMACH 2 : COMPRESSION TANK</div>
          <div style={{ fontSize: 62, lineHeight: 1.1, color: "#fff" }}>
            12.4 <span style={{ fontSize: 34, color: CYAN }}>ATM</span>
          </div>
          <div style={{ fontSize: 20, color: "#9ee5d7", marginTop: 4 }}>SEALED MUSCULAR RESERVOIR</div>
        </div>
      )}

      {/* ---------------- 5. Living Bomb Hazard ---------------- */}
      {currentShot === "bomb" && frame >= BEATS.bomb - 4 && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "16px 38px",
            border: `3px solid ${RED}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.bomb - 4, fps)})`,
            opacity: fadeOut(frame, shotEnd("bomb")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 4, color: RED }}>HAZARD WARNING</div>
          <div style={{ fontSize: 52, lineHeight: 1.15, color: "#ff5e4d", marginTop: 4 }}>
            EXPLOSIVE FUEL VESSEL
          </div>
          <div style={{ fontSize: 20, color: "#ffb4a8", marginTop: 4 }}>IGNITION LIMITS: 5% - 15% IN AIR</div>
        </div>
      )}

      {/* ---------------- 6. Anaerobic Safety Badge (0% O2) ---------------- */}
      {currentShot === "oxygen" && frame >= BEATS.oxygen - 4 && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "16px 42px",
            border: `3px solid ${GREEN}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.oxygen - 4, fps)})`,
            opacity: fadeOut(frame, shotEnd("oxygen")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: GREEN }}>COMBUSTION SAFETY</div>
          <div style={{ fontSize: 64, lineHeight: 1.1, color: GREEN }}>
            0% <span style={{ fontSize: 38, color: "#fff" }}>OXYGEN</span>
          </div>
          <div style={{ fontSize: 20, color: "#b3f0c2", marginTop: 4 }}>ANAEROBIC: CANNOT DETONATE INTERNALLY</div>
        </div>
      )}

      {/* ---------------- 7. Komodo Iron Enamel Spark Badge ---------------- */}
      {(currentShot === "teeth" || currentShot === "strike") && frame >= BEATS.armor - 4 && (
        <div
          style={{
            ...panel,
            top: 200,
            padding: "16px 36px",
            border: `3px solid ${AMBER}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.armor - 4, fps)})`,
            opacity: fadeOut(frame, shotEnd("strike")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: AMBER }}>IGNITION MECHANISM</div>
          <div style={{ fontSize: 48, lineHeight: 1.15, marginTop: 4 }}>
            KOMODO IRON ENAMEL
          </div>
          <div style={{ fontSize: 20, color: "#ffe0a0", marginTop: 4 }}>FLINT & STEEL CLASH AT SNOUT RIM</div>
        </div>
      )}

      {/* ---------------- 8. Fluid Dynamics Velocity Meter ---------------- */}
      {(currentShot === "clench" || currentShot === "gasblast" || currentShot === "flamethrower") && (
        <div
          style={{
            ...panel,
            top: 190,
            padding: "18px 40px",
            border: `3px solid ${CYAN}`,
            transform: `translateX(-50%) scale(${pop(frame, shotStart("clench") + 2, fps)})`,
            opacity: fadeOut(frame, shotEnd("flamethrower")),
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: CYAN }}>FLUID DYNAMICS ENGINE</div>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 18, color: "#8beade" }}>GAS NOZZLE SPEED</div>
              <div style={{ fontSize: 44, color: GREEN }}>
                45 <span style={{ fontSize: 24 }}>m/s</span>
              </div>
            </div>
            <div style={{ width: 2, background: "rgba(255,255,255,0.2)" }} />
            <div>
              <div style={{ fontSize: 18, color: "#ff8b7d" }}>FLAME SPEED</div>
              <div style={{ fontSize: 44, color: AMBER }}>
                0.4 <span style={{ fontSize: 24 }}>m/s</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: GREEN, marginTop: 8 }}>
            FLASHBACK PREVENTED : FLAME LOCKED OUTSIDE
          </div>
        </div>
      )}

      {/* ---------------- 9. Finale Stamp ---------------- */}
      {currentShot === "finale" && frame >= BEATS.congratulations && (
        <div
          style={{
            ...panel,
            top: 220,
            padding: "24px 50px",
            border: `4px solid ${AMBER}`,
            transform: `translateX(-50%) scale(${pop(frame, BEATS.congratulations, fps)})`,
            textAlign: "center",
            boxShadow: `0 0 45px rgba(255,170,59,0.45)`,
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 6, color: AMBER }}>SYSTEM COMPLETE</div>
          <div style={{ fontSize: 56, letterSpacing: 2, color: "#fff", marginTop: 4 }}>
            WALKING FLAMETHROWER
          </div>
          <div style={{ fontSize: 22, color: CYAN, marginTop: 8 }}>
            100% BIOLOGICALLY & CHEMICALLY CERTIFIED
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
