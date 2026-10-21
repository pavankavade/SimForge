import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const TrapHUD: React.FC = () => {
  const frame = useCurrentFrame();

  const stages = [
    {
      start: 0,
      end: 330,
      level: "STAGE 1/5",
      title: "EXCAVATED SPIKE PIT",
      counter: "BASE TRAP",
      color: "#e68a35",
    },
    {
      start: 330,
      end: 750,
      level: "STAGE 2/5",
      title: "GREED BAIT & FALSE FLOOR",
      counter: "COUNTER: ROGUE LEAP",
      color: "#ffd000",
    },
    {
      start: 750,
      end: 1230,
      level: "STAGE 3/5",
      title: "ALCHEMICAL FLAME JETS",
      counter: "COUNTER: MAGE ICE SPELL",
      color: "#ff4411",
    },
    {
      start: 1230,
      end: 1710,
      level: "STAGE 4/5",
      title: "CEILING PENDULUM BLADE",
      counter: "COUNTER: TOWER SHIELD",
      color: "#aa33ff",
    },
    {
      start: 1710,
      end: 2250,
      level: "STAGE 5/5",
      title: "OVERKILL MIMIC CATAPULT",
      counter: "UNBEATABLE ARCHITECTURE",
      color: "#00eeff",
    },
  ];

  let currentStage = stages[0];
  for (const s of stages) {
    if (frame >= s.start && frame < s.end) {
      currentStage = s;
      break;
    }
  }

  // Stage transition pop animation
  const stageElapsed = frame - currentStage.start;
  const pop = interpolate(stageElapsed, [0, 6], [1.08, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 92,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 120,
        fontFamily: "'Arial Black', 'Impact', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          transform: `scale(${pop})`,
        }}
      >
        {/* Main Title Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(10, 14, 22, 0.88)",
            border: `2px solid ${currentStage.color}`,
            borderRadius: 12,
            padding: "8px 22px",
            boxShadow: `0 6px 20px rgba(0, 0, 0, 0.7), 0 0 16px ${currentStage.color}55`,
          }}
        >
          <span
            style={{
              color: currentStage.color,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1.5,
            }}
          >
            {currentStage.level}
          </span>
          <span
            style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 1.2,
            }}
          >
            {currentStage.title}
          </span>
        </div>

        {/* Counter Sub-Badge */}
        <div
          style={{
            background: `${currentStage.color}22`,
            border: `1px solid ${currentStage.color}88`,
            borderRadius: 6,
            padding: "4px 14px",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 2.0,
            textTransform: "uppercase",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          {currentStage.counter}
        </div>
      </div>
    </div>
  );
};
