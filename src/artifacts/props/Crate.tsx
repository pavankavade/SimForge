import type React from "react";
import type { Vec3 } from "../../engine/types";

interface CrateProps {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  color?: string;
  trimColor?: string;
}

export const Crate: React.FC<CrateProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = "#8a5a2b",
  trimColor = "#5e3a1a",
}) => {
  const scaleValue: Vec3 =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={scaleValue}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>

      {[-0.42, 0.42].map((y) =>
        [-0.52, 0.52].map((z) => (
          <mesh key={`band-${y}-${z}`} position={[0, 0.5 + y, z]} castShadow>
            <boxGeometry args={[1.04, 0.12, 0.08]} />
            <meshStandardMaterial color={trimColor} roughness={0.7} />
          </mesh>
        ))
      )}

      <mesh position={[0, 0.5, 0.53]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.28, 0.12, 0.06]} />
        <meshStandardMaterial color={trimColor} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.5, -0.53]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[1.28, 0.12, 0.06]} />
        <meshStandardMaterial color={trimColor} roughness={0.72} />
      </mesh>
    </group>
  );
};
