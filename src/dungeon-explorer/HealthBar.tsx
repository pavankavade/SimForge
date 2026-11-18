// The paladin's health, bottom centre, in the manner of an extraction-dungeon HUD: his name over a
// long dark-framed bar of blood red with a socket at each end. Health lost lingers as a pale band
// that drains after a beat, so a heavy blow reads at a glance.
import React from "react";

export interface HealthBarProps {
  name: string;
  hp: number;
  maxHp: number;
  /** Narrow screens: a shorter bar. */
  compact: boolean;
}

const Socket: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <div
    style={{
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      borderRadius: "50%",
      background: "radial-gradient(circle at 50% 40%, #2a2420, #0b0907 70%)",
      border: "2px solid #6b5636",
      boxShadow: "0 0 0 1px #000, inset 0 0 8px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 1,
    }}
  >
    {children}
  </div>
);

export const HealthBar: React.FC<HealthBarProps> = ({ name, hp, maxHp, compact }) => {
  const frac = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  const W = compact ? 210 : 340;
  const H = compact ? 14 : 18;
  const sock = compact ? 26 : 34;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", userSelect: "none" }}>
      <div
        style={{
          fontSize: compact ? 11 : 13,
          color: "#e9dfc7",
          letterSpacing: "0.04em",
          textShadow: "0 1px 2px #000, 0 0 6px #000",
          marginBottom: 3,
        }}
      >
        {name || "Fighter"}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Socket size={sock}>
          {/* A heart for life. */}
          <svg width={sock * 0.5} height={sock * 0.5} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3.2C13.9 6.1 15.5 5 17.5 5 21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z" fill="#a8151a" stroke="#e05040" strokeWidth="1" />
          </svg>
        </Socket>
        <div
          role="progressbar"
          aria-label="Health"
          aria-valuenow={Math.round(hp)}
          aria-valuemax={maxHp}
          style={{
            position: "relative",
            width: W,
            height: H,
            margin: `0 -${Math.round(sock * 0.18)}px`,
            background: "linear-gradient(180deg, #160807, #2a0f0c)",
            border: "2px solid #5a4630",
            boxShadow: "0 0 0 1px #000, inset 0 2px 6px rgba(0,0,0,0.9)",
            overflow: "hidden",
          }}
        >
          {/* Health just lost: a pale band that drains after a beat. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${frac * 100}%`,
              background: "linear-gradient(180deg, #e8c39a, #b38a63)",
              // The game UI is not a Remotion render: a CSS transition is right here.
              // eslint-disable-next-line @remotion/non-pure-animation
              transition: "width 0.7s ease-in 0.35s",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${frac * 100}%`,
              background: "linear-gradient(180deg, #d42a22 0%, #a3140f 45%, #6d0907 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,150,120,0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? 10 : 12,
              fontWeight: 700,
              color: "#f6eadb",
              textShadow: "0 1px 2px #000",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.ceil(hp)} / {maxHp}
          </div>
        </div>
        <Socket size={sock}>
          {/* A shield for the guard. */}
          <svg width={sock * 0.5} height={sock * 0.5} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z" fill="#5d5546" stroke="#b9a47a" strokeWidth="1.2" />
          </svg>
        </Socket>
      </div>
    </div>
  );
};
