import React from "react";
import { convectionKinematics, BEATS, FIRE_FRONT_X, WALL_X } from "../timeline";
import { progress } from "../../../kit/motion";

interface AirflowArrowsProps {
  frame: number;
}

/** Individual 3D stylized chevron arrow */
const ArrowMesh: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity: number;
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], color, opacity, scale = 1 }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Arrow Shaft */}
      <mesh position={[-0.2, 0, 0]}>
        <boxGeometry args={[0.35, 0.08, 0.06]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Arrow Head (Cone) */}
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.13, 0.26, 4]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
};

export const AirflowArrows: React.FC<AirflowArrowsProps> = ({ frame }) => {
  const { isActive, opacity } = convectionKinematics(frame);

  // Wind gust blowout arrows (during L3b)
  const isWindGust = frame >= BEATS.windGust && frame < BEATS.fireBlowout + 12;
  const windT = progress(frame, [BEATS.windGust, BEATS.fireBlowout]);
  const windOpacity = (1 - Math.abs(windT - 0.5) * 2) * 0.9;

  return (
    <group>
      {/* L3b: Exterior Cold Wind Gust Arrows */}
      {isWindGust && (
        <group>
          {[-1, 0, 1].map((row) => {
            const cycle = ((frame * 0.12 + row * 0.4) % 1.0);
            const x = -3.5 + cycle * 4.2;
            const y = 0.5 + row * 0.35;
            return (
              <ArrowMesh
                key={`wind-${row}`}
                position={[x, y, 0]}
                rotation={[0, 0, 0]}
                color="#e0e8f0"
                opacity={windOpacity}
                scale={1.2}
              />
            );
          })}
        </group>
      )}

      {/* L9: Convection Arrows (Passive Chimney Ventilation Loop) */}
      {isActive && opacity > 0.01 && (
        <group>
          {/* 1. Exhaust: Warm Smoke Rising & Flowing Out Ceiling Vent (White/Grey) */}
          {[0, 1, 2, 3].map((idx) => {
            const t = ((frame * 0.02 + idx * 0.25) % 1.0);
            // Bézier path: Fire (0.5, 0.6) -> Ceiling (0.8, 3.2) -> Vent (-1.8, 3.2)
            let x: number, y: number, angle: number;
            if (t < 0.38) {
              const segT = t / 0.38;
              x = FIRE_FRONT_X + segT * 0.4;
              y = 0.6 + segT * 2.6;
              angle = Math.PI * 0.45;
            } else {
              const segT = (t - 0.38) / 0.62;
              x = (FIRE_FRONT_X + 0.4) - segT * 2.6;
              y = 3.2;
              angle = Math.PI; // pointing left toward exterior vent
            }

            return (
              <ArrowMesh
                key={`exhaust-${idx}`}
                position={[x, y, 0]}
                rotation={[0, 0, angle]}
                color="#ffffff"
                opacity={opacity * 0.92}
                scale={1.1}
              />
            );
          })}

          {/* 2. Intake: Cold Fresh Air Inflow Along Floor (Vivid Cyan) */}
          {[0, 1, 2].map((idx) => {
            const t = ((frame * 0.024 + idx * 0.33) % 1.0);
            // Path: Outside (-2.0, 0.28) -> Doorway (-0.8, 0.28) -> Fire (0.5, 0.28)
            const x = (WALL_X - 1.2) + t * 2.5;
            const y = 0.28;
            return (
              <ArrowMesh
                key={`intake-${idx}`}
                position={[x, y, 0]}
                rotation={[0, 0, 0]}
                color="#00f2ff"
                opacity={opacity * 0.95}
                scale={1.05}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};
