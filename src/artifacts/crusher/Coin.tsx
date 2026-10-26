import type React from "react";
import type { Vec3 } from "../../engine/types";
import { GlowSprite } from "../dungeon/Fx";

export interface CoinProps {
  position: Vec3;
  spin?: number;
}

export const Coin: React.FC<CoinProps> = ({ position, spin = 0 }) => {
  return (
    <group position={position} rotation={[0, spin, 0]}>
      {/* Coin disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.032, 20]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.85}
          roughness={0.25}
          emissive="#ffae00"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* Subtle star / face decal relief */}
      <mesh position={[0, 0, 0.018]}>
        <ringGeometry args={[0.04, 0.09, 5]} />
        <meshBasicMaterial color="#ffe875" />
      </mesh>
      <mesh position={[0, 0, -0.018]} rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[0.04, 0.09, 5]} />
        <meshBasicMaterial color="#ffe875" />
      </mesh>
      {/* Warm coin glow */}
      <GlowSprite size={0.65} color="#ffc430" opacity={0.55} />
    </group>
  );
};
