import type React from "react";
import { easeOutBack, progress } from "../../../kit/motion";
import { BEATS, EXIT_GROW, EXIT_X0, EXIT_Y, GROUND_Y, HATCH_X, SHAFT_R, exitGrow, hatchAngle } from "../timeline";
import { HalfShaft, HalfTunnel } from "./Shafts";

const HATCH_Z = -0.4;

/**
 * Second exit: a tunnel out of the pipe's right wall, a ladder shaft up to a
 * round hatch in the lawn. Dug on "second tunnel", the hatch pops open after
 * "hatch in the yard".
 */
export const Exit: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < EXIT_GROW[0]) return null;
  const g = exitGrow(frame);
  const ring = easeOutBack(progress(frame, [BEATS.hatch - 4, BEATS.hatch + 6]), 1.5);
  const lid = hatchAngle(frame);
  return (
    <group>
      <HalfTunnel x0={EXIT_X0} x1={HATCH_X + SHAFT_R} y={EXIT_Y} grow={g.tunnel} />
      <HalfShaft x={HATCH_X} y0={EXIT_Y - SHAFT_R} y1={GROUND_Y + 0.02} grow={g.shaft} />
      {ring > 0 ? (
        <group position={[HATCH_X, GROUND_Y + 0.02, HATCH_Z]} scale={ring}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.55, 0.08, 10, 32]} />
            <meshStandardMaterial color="#8d949c" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Lid, hinged at the back edge */}
          <group position={[0, 0.06, -0.55]} rotation={[-lid, 0, 0]}>
            <mesh position={[0, 0, 0.55]} castShadow>
              <cylinderGeometry args={[0.56, 0.56, 0.08, 32]} />
              <meshStandardMaterial color="#5d6670" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.06, 0.55]}>
              <torusGeometry args={[0.18, 0.025, 8, 20]} />
              <meshStandardMaterial color="#d23a2e" />
            </mesh>
          </group>
        </group>
      ) : null}
    </group>
  );
};

export { HATCH_Z };
