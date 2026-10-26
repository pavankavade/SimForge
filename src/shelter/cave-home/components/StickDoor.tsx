import React, { useMemo } from "react";
import { stickDoorKinematics, WALL_X, DOOR_WIDTH, DOOR_HEIGHT } from "../timeline";

interface StickDoorProps {
  frame: number;
}

export const StickDoor: React.FC<StickDoorProps> = ({ frame }) => {
  const { exists, angle } = stickDoorKinematics(frame);

  // Vertical branch sticks spanning the door
  const sticks = useMemo(() => {
    const arr = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const zLocal = (i + 0.5) * (DOOR_WIDTH / count);
      arr.push({
        z: zLocal,
        r: 0.042 + (i % 3) * 0.008,
        h: DOOR_HEIGHT - 0.08 + (i % 2) * 0.06,
      });
    }
    return arr;
  }, []);

  if (!exists) return null;

  // Hinge point on interior inner face of the doorframe: [WALL_X + 0.28, 0, -DOOR_WIDTH / 2]
  return (
    <group position={[WALL_X + 0.28, 0, -DOOR_WIDTH / 2]} rotation={[0, angle, 0]}>
      {/* Vertical Tied Branch Sticks */}
      {sticks.map((s, idx) => (
        <mesh key={idx} position={[0, s.h * 0.5, s.z]}>
          <cylinderGeometry args={[s.r, s.r * 1.08, s.h, 6]} />
          <meshStandardMaterial color={idx % 2 === 0 ? "#452e1d" : "#4e3522"} roughness={0.92} />
        </mesh>
      ))}

      {/* Horizontal Bracing Sticks (Top, Middle, Bottom) */}
      {[0.35, DOOR_HEIGHT * 0.5, DOOR_HEIGHT - 0.35].map((y, idx) => (
        <mesh key={`brace-${idx}`} position={[0.045, y, DOOR_WIDTH * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, DOOR_WIDTH - 0.04, 6]} />
          <meshStandardMaterial color="#5e391b" roughness={0.92} />
        </mesh>
      ))}

      {/* Diagonal Z-Brace (Connecting bottom hinge to top latch) */}
      <mesh
        position={[0.05, DOOR_HEIGHT * 0.5, DOOR_WIDTH * 0.5]}
        rotation={[Math.atan2(DOOR_WIDTH - 0.1, DOOR_HEIGHT - 0.7), 0, 0]}
      >
        <cylinderGeometry
          args={[0.035, 0.035, Math.hypot(DOOR_HEIGHT - 0.7, DOOR_WIDTH - 0.1), 5]}
        />
        <meshStandardMaterial color="#553317" roughness={0.92} />
      </mesh>

      {/* Golden Twine Rope Bindings */}
      {[0.2, DOOR_WIDTH * 0.5, DOOR_WIDTH - 0.2].map((z, idx) => (
        <mesh key={`rope-${idx}`} position={[0.045, DOOR_HEIGHT * 0.5, z]}>
          <torusGeometry args={[0.07, 0.022, 6, 8]} />
          <meshStandardMaterial color="#d4a359" roughness={0.75} />
        </mesh>
      ))}

      {/* Interior Heavy Locking Branch Bar */}
      <mesh position={[0.08, DOOR_HEIGHT * 0.46, DOOR_WIDTH * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, DOOR_WIDTH + 0.3, 6]} />
        <meshStandardMaterial color="#4d2f16" roughness={0.9} />
      </mesh>
    </group>
  );
};
