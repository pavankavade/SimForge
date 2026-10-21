import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface SpikePitProps {
  spawnFrame?: number;
}

export const SpikePit: React.FC<SpikePitProps> = ({ spawnFrame = 0 }) => {
  const frame = useCurrentFrame();

  // Spikes grid in the pit (x between -1.8 and 1.8, z between -2.0 and 0.8)
  const rows = 4;
  const cols = 7;
  const spikes = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -1.6 + (c / (cols - 1)) * 3.2;
      const z = -1.9 + (r / (rows - 1)) * 2.6;
      const index = r * cols + c;
      spikes.push({ x, z, index });
    }
  }

  return (
    <group position={[0, -4.0, 0]}>
      {/* Base spike wooden bed */}
      <mesh position={[0, 0.05, -0.6]} receiveShadow>
        <boxGeometry args={[3.8, 0.1, 3.0]} />
        <meshStandardMaterial color="#422e1b" roughness={0.9} />
      </mesh>

      {/* Grid of menacing spikes */}
      {spikes.map((spike) => {
        const spikeDelay = spike.index * 1.5;
        const popProgress = interpolate(
          frame,
          [spawnFrame + spikeDelay, spawnFrame + spikeDelay + 14],
          [0.001, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.5)),
          }
        );

        return (
          <group
            key={`spike-${spike.index}`}
            position={[spike.x, 0.1, spike.z]}
            scale={[1, popProgress, 1]}
          >
            {/* Iron / Bone Spike Cone */}
            <mesh position={[0, 0.65, 0]} castShadow>
              <coneGeometry args={[0.09, 1.3, 6]} />
              <meshStandardMaterial
                color={spike.index % 3 === 0 ? "#b23a2a" : "#8791a3"}
                metalness={0.45}
                roughness={0.38}
              />
            </mesh>
            {/* Spike Base Collar */}
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.12, 0.14, 0.1, 6]} />
              <meshStandardMaterial color="#2d3038" metalness={0.8} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      <pointLight
        position={[0, 2.1, 0]}
        color="#ff8a46"
        intensity={7.5}
        distance={9}
        decay={2}
      />
      <pointLight
        position={[0, 3.8, 0.6]}
        color="#ffc07a"
        intensity={3.2}
        distance={6}
        decay={2}
      />
    </group>
  );
};
