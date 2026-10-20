import type React from "react";
import type { Vec3 } from "../../engine/types";

interface RockProps {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  color?: string;
}

export const Rock: React.FC<RockProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = "#77736b",
}) => {
  const scaleValue: Vec3 =
    typeof scale === "number" ? [scale, scale * 0.72, scale] : scale;

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scaleValue}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
};
