import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../../engine/materials";
import { makeCorrugated, makeMetal, makeWood } from "../../../engine/textures";
import { wobble } from "../../../kit/motion";
import { DECK_HALF, DECK_Y, PIPE_DROP, TUBE_BACK_Z, TUBE_FRONT_Z, TUBE_R, TUBE_X, TUBE_Y, pipeY } from "../timeline";

const LEN = TUBE_FRONT_Z - TUBE_BACK_Z;
const MID_Z = (TUBE_FRONT_Z + TUBE_BACK_Z) / 2;

/**
 * The giant corrugated steel pipe: drops out of the sky into the pit on
 * "steel", then stays buried as the shelter. Open front end faces the camera,
 * so the plank deck recedes into the pipe like the original's tunnel view.
 */
export const Pipe: React.FC<{ frame: number; children?: React.ReactNode }> = ({ frame, children }) => {
  const corr = useSurface("nb-corrugated", () => makeCorrugated({}), [5, (LEN / 0.22) / 16]);
  const plank = useSurface("nb-deck", () => makeWood({ base: "#c99a5e", seed: 9 }), [1.6, 2.5]);
  const steel = useSurface("nb-steel", () => makeMetal({ base: "#9aa1aa" }), [2, 2]);

  const under = useMemo(() => {
    // Steel plate closing the space under the deck at the open end.
    const a = Math.asin((DECK_Y - TUBE_Y) / TUBE_R);
    const s = new THREE.Shape();
    s.absarc(0, 0, TUBE_R - 0.02, Math.PI - a, Math.PI * 2 + a, false);
    s.closePath();
    return new THREE.ShapeGeometry(s, 32);
  }, []);

  if (frame < PIPE_DROP[0]) return null;
  const y = pipeY(frame) + wobble(frame, PIPE_DROP[1], 0.18, 0.9, 5);

  return (
    <group position={[TUBE_X, y, 0]}>
      <mesh position={[0, 0, MID_Z]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TUBE_R, TUBE_R, LEN, 64, 1, true]} />
        <meshStandardMaterial {...corr} color="#d8dce2" metalness={0.35} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {/* Rolled lip at the open end */}
      <mesh position={[0, 0, TUBE_FRONT_Z]}>
        <torusGeometry args={[TUBE_R, 0.07, 10, 64]} />
        <meshStandardMaterial {...steel} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Back bulkhead */}
      <mesh position={[0, 0, TUBE_BACK_Z + 0.02]}>
        <circleGeometry args={[TUBE_R, 48]} />
        <meshStandardMaterial {...steel} color="#c4c9d0" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Plank deck and the plate under it */}
      <mesh position={[0, DECK_Y - TUBE_Y - 0.06, MID_Z]} receiveShadow castShadow>
        <boxGeometry args={[DECK_HALF * 2, 0.12, LEN]} />
        <meshStandardMaterial {...plank} roughness={0.8} />
      </mesh>
      <mesh geometry={under} position={[0, 0, TUBE_FRONT_Z - 0.01]}>
        <meshStandardMaterial color="#5a5f66" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Two warm lamps down the ceiling */}
      {[-1.2, -3.4].map((z) => (
        <group key={z} position={[0, TUBE_R - 0.32, z]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.09, 14, 10]} />
            <meshBasicMaterial color="#fff3c4" />
          </mesh>
          <pointLight position={[0, -0.3, 0]} intensity={3.2} distance={6} color="#ffe2a8" />
        </group>
      ))}
      {children}
    </group>
  );
};
