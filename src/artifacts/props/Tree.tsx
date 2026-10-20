import type React from "react";
import type { Vec3 } from "../../engine/types";

interface TreeProps {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  trunkColor?: string;
  foliageColor?: string;
}

export const Tree: React.FC<TreeProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  trunkColor = "#6b4a2b",
  foliageColor = "#3d6b3f",
}) => {
  const scaleValue: Vec3 =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={scaleValue}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.34, 2.2, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      {[2.1, 3.0, 3.85].map((y, index) => (
        <mesh key={`foliage-${index}`} position={[0, y, 0]} castShadow>
          <coneGeometry args={[1.55 - index * 0.34, 1.5, 8]} />
          <meshStandardMaterial color={foliageColor} roughness={0.88} flatShading />
        </mesh>
      ))}
    </group>
  );
};
