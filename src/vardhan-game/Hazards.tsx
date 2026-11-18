import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sfx } from "./sfx";

interface HazardsProps {
  playerPos: [number, number, number];
  onPlayerHit: () => void;
  isInvulnerable: boolean;
}

export const Hazards: React.FC<HazardsProps> = ({ playerPos, onPlayerHit, isInvulnerable }) => {
  const sawRef1 = useRef<THREE.Group>(null);
  const sawRef2 = useRef<THREE.Group>(null);
  const spikesYRef = useRef<number>(0);

  // Trap coordinates
  const spikeLocations: [number, number][] = [
    [-5, -2],
    [5, -2],
    [0, 2],
    [-4, 6],
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const [px, py, pz] = playerPos;

    // 1. Moving Pendulum / Blade 1 (swings left and right at z = -4)
    const blade1X = Math.sin(t * 2.2) * 6.5;
    if (sawRef1.current) {
      sawRef1.current.position.x = blade1X;
      sawRef1.current.rotation.z = t * 10;
    }

    // 2. Moving Pendulum / Blade 2 (swings left and right at z = 3)
    const blade2X = Math.cos(t * 1.8) * 6.5;
    if (sawRef2.current) {
      sawRef2.current.position.x = blade2X;
      sawRef2.current.rotation.z = -t * 10;
    }

    // Check collision with Blade 1
    if (!isInvulnerable) {
      const dist1 = Math.hypot(px - blade1X, pz - (-4));
      if (dist1 < 1.3 && py < 1.6) {
        sfx.hit();
        onPlayerHit();
        return;
      }

      // Check collision with Blade 2
      const dist2 = Math.hypot(px - blade2X, pz - 3);
      if (dist2 < 1.3 && py < 1.6) {
        sfx.hit();
        onPlayerHit();
        return;
      }

      // 3. Spikes pop up every 2.5 seconds
      const spikeCycle = (Math.sin(t * 2.5) + 1) / 2; // 0 to 1
      spikesYRef.current = spikeCycle > 0.6 ? 0.35 : -0.15; // spikes extended

      if (spikesYRef.current > 0.1 && py < 0.4) {
        for (const [sx, sz] of spikeLocations) {
          if (Math.hypot(px - sx, pz - sz) < 1.1) {
            sfx.hit();
            onPlayerHit();
            return;
          }
        }
      }
    }
  });

  return (
    <group>
      {/* Moving Saw Blade 1 */}
      <group ref={sawRef1} position={[0, 0.6, -4]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.12, 16]} />
          <meshStandardMaterial color="#8892a0" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Warning Hazard Ring */}
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.92, 0.04, 8, 24]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>
      </group>

      {/* Moving Saw Blade 2 */}
      <group ref={sawRef2} position={[0, 0.6, 3]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.12, 16]} />
          <meshStandardMaterial color="#8892a0" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.92, 0.04, 8, 24]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>
      </group>

      {/* Floor Spike Traps */}
      {spikeLocations.map(([sx, sz], i) => (
        <group key={`spikes-${i}`} position={[sx, 0, sz]}>
          {/* Iron Grate Base */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[1.6, 0.04, 1.6]} />
            <meshStandardMaterial color="#22252e" metalness={0.8} />
          </mesh>

          {/* 4 Sharp Iron Spikes */}
          {[
            [-0.4, -0.4],
            [0.4, -0.4],
            [-0.4, 0.4],
            [0.4, 0.4],
          ].map(([ox, oz], j) => (
            <mesh key={`spike-${j}`} position={[ox, 0.35, oz]}>
              <coneGeometry args={[0.12, 0.7, 5]} />
              <meshStandardMaterial color="#a0abbd" metalness={0.9} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};
