import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";

interface ArrowDef {
  id: number;
  from: [number, number, number];
  to: [number, number, number];
  fireFrame: number;
  duration: number;
  arcHeight: number;
}

interface ArrowVolleyProps {
  startFrame: number;
  endFrame: number;
  targetMode?: "soldier" | "shields";
}

export const ArrowVolley: React.FC<ArrowVolleyProps> = ({
  startFrame,
  endFrame,
  targetMode = "soldier",
}) => {
  const frame = useCurrentFrame();

  const arrows = useMemo(() => {
    const list: ArrowDef[] = [];
    const count = 14;

    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? -15 - (i % 3) * 2 : 15 + (i % 3) * 2;
      const startY = 8 + (i % 4) * 1.5;
      const startZ = 8 + (i % 3) * 3;

      let targetX = 0;
      let targetY = 5 + (i % 5) * 1.0;
      let targetZ = 1.8;

      if (targetMode === "shields") {
        targetX = fromLeft ? -1.15 : 1.15;
        targetY = 4 + (i % 5) * 1.2;
        targetZ = 2.0;
      }

      list.push({
        id: i,
        from: [startX, startY, startZ],
        to: [targetX, targetY, targetZ],
        fireFrame: startFrame + i * 8,
        duration: 18,
        arcHeight: 2.5,
      });
    }
    return list;
  }, [startFrame, targetMode]);

  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  return (
    <group>
      {arrows.map((arr) => {
        if (frame < arr.fireFrame) return null;

        const t = Math.min(1, Math.max(0, (frame - arr.fireFrame) / arr.duration));
        const posX = arr.from[0] + (arr.to[0] - arr.from[0]) * t;
        const posZ = arr.from[2] + (arr.to[2] - arr.from[2]) * t;
        const basePosY = arr.from[1] + (arr.to[1] - arr.from[1]) * t;
        const parabola = 4 * arr.arcHeight * t * (1 - t);
        const posY = basePosY + parabola;

        // Calculate direction for arrow rotation
        const nextT = Math.min(1, t + 0.05);
        const nextX = arr.from[0] + (arr.to[0] - arr.from[0]) * nextT;
        const nextZ = arr.from[2] + (arr.to[2] - arr.from[2]) * nextT;
        const nextY =
          arr.from[1] +
          (arr.to[1] - arr.from[1]) * nextT +
          4 * arr.arcHeight * nextT * (1 - nextT);

        const dir = new THREE.Vector3(
          nextX - posX,
          nextY - posY,
          nextZ - posZ
        ).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        const euler = new THREE.Euler().setFromQuaternion(quat);

        return (
          <group
            key={arr.id}
            position={[posX, posY, posZ]}
            rotation={[euler.x, euler.y, euler.z]}
          >
            {/* Shaft */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
              <meshStandardMaterial color="#8a5e30" roughness={0.8} />
            </mesh>
            {/* Steel Arrowhead */}
            <mesh position={[0, 0.48, 0]} castShadow>
              <coneGeometry args={[0.05, 0.15, 4]} />
              <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Fletching / Feathers */}
            <mesh position={[0, -0.4, 0]}>
              <boxGeometry args={[0.12, 0.18, 0.02]} />
              <meshStandardMaterial color="#f5f5f5" />
            </mesh>
            <mesh position={[0, -0.4, 0]}>
              <boxGeometry args={[0.02, 0.18, 0.12]} />
              <meshStandardMaterial color="#f5f5f5" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
