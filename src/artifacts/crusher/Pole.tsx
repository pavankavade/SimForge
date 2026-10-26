import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

export interface PoleProps {
  /** Where the hands hold it. */
  hand: Vec3;
  /** Where the tip is. */
  tip: Vec3;
  /** Total length; the butt sticks out behind the hand. */
  length?: number;
}

/** The ten-foot pole: wooden shaft from behind the hand to the tip, with an iron ferrule. */
export const Pole: React.FC<PoleProps> = ({ hand, tip, length = 3.2 }) => {
  const h = new THREE.Vector3(...hand);
  const t = new THREE.Vector3(...tip);
  const dir = t.clone().sub(h);
  if (dir.length() < 0.01) return null;
  dir.normalize();
  const butt = t.clone().addScaledVector(dir, -length);
  const mid = butt.clone().add(t).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const ferrule = t.clone().addScaledVector(dir, -0.08);
  return (
    <group>
      <mesh position={mid} quaternion={quat} castShadow>
        <cylinderGeometry args={[0.035, 0.04, length, 10]} />
        <meshStandardMaterial color="#9a6a3a" roughness={0.7} />
      </mesh>
      <mesh position={ferrule} quaternion={quat}>
        <cylinderGeometry args={[0.045, 0.03, 0.16, 10]} />
        <meshStandardMaterial color="#5a5e66" metalness={0.6} roughness={0.35} />
      </mesh>
      {[0.3, 0.55].map((f) => (
        <mesh key={f} position={butt.clone().lerp(t, f)} quaternion={quat}>
          <cylinderGeometry args={[0.044, 0.044, 0.05, 10]} />
          <meshStandardMaterial color="#c8322b" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};
