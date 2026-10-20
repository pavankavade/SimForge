import type React from "react";
import type { Vec3 } from "../../engine/types";

interface BannerProps {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  color?: string;
  poleColor?: string;
  trimColor?: string;
}

export const Banner: React.FC<BannerProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = "#7d231c",
  poleColor = "#5c452b",
  trimColor = "#d8b45a",
}) => {
  const scaleValue: Vec3 =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={scaleValue}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 5.2, 8]} />
        <meshStandardMaterial color={poleColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 5.28, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={trimColor} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0.78, 4.05, 0]} castShadow>
        <boxGeometry args={[1.45, 1.7, 0.045]} />
        <meshStandardMaterial color={color} roughness={0.82} side={2} />
      </mesh>
      <mesh position={[0.78, 4.83, 0.035]}>
        <boxGeometry args={[1.45, 0.12, 0.02]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.78, 3.24, 0.035]}>
        <boxGeometry args={[1.45, 0.12, 0.02]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} />
      </mesh>
    </group>
  );
};
