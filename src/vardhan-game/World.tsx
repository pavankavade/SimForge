import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "./gameConfig";

interface WorldProps {
  portalOpen: boolean;
}

export const World: React.FC<WorldProps> = ({ portalOpen }) => {
  const size = GAME_CONFIG.world.arenaSize;
  const half = size / 2;
  const wallH = GAME_CONFIG.world.wallHeight;
  const torchLight1 = useRef<THREE.PointLight>(null);
  const torchLight2 = useRef<THREE.PointLight>(null);
  const torchLight3 = useRef<THREE.PointLight>(null);
  const torchLight4 = useRef<THREE.PointLight>(null);

  // Animate torch flickering
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const f1 = 2.0 + Math.sin(t * 12) * 0.3 + Math.cos(t * 22) * 0.15;
    const f2 = 2.0 + Math.sin(t * 14 + 1) * 0.3 + Math.cos(t * 19 + 2) * 0.15;
    if (torchLight1.current) torchLight1.current.intensity = f1;
    if (torchLight2.current) torchLight2.current.intensity = f2;
    if (torchLight3.current) torchLight3.current.intensity = f1;
    if (torchLight4.current) torchLight4.current.intensity = f2;
  });

  return (
    <group>
      {/* Ambient & Sun Lights */}
      <ambientLight intensity={0.65} color="#dbe4ff" />
      <directionalLight position={[10, 16, 8]} intensity={1.1} castShadow />

      {/* Main Dungeon Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={GAME_CONFIG.world.floorColor} roughness={0.85} />
      </mesh>

      {/* Tiled Floor Grid Lines */}
      <gridHelper
        args={[size, Math.floor(size / 2), "#58627a", "#3b4152"]}
        position={[0, 0.005, 0]}
      />

      {/* Dungeon Walls (North, South, East, West) */}
      {/* North Wall */}
      <mesh position={[0, wallH / 2, -half]} receiveShadow>
        <boxGeometry args={[size, wallH, 1]} />
        <meshStandardMaterial color={GAME_CONFIG.world.wallColor} roughness={0.7} />
      </mesh>
      {/* South Wall */}
      <mesh position={[0, wallH / 2, half]} receiveShadow>
        <boxGeometry args={[size, wallH, 1]} />
        <meshStandardMaterial color={GAME_CONFIG.world.wallColor} roughness={0.7} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-half, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[1, wallH, size]} />
        <meshStandardMaterial color={GAME_CONFIG.world.wallColor} roughness={0.7} />
      </mesh>
      {/* East Wall */}
      <mesh position={[half, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[1, wallH, size]} />
        <meshStandardMaterial color={GAME_CONFIG.world.wallColor} roughness={0.7} />
      </mesh>

      {/* 4 Corner Stone Pillars */}
      {[
        [-half + 2, -half + 2],
        [half - 2, -half + 2],
        [-half + 2, half - 2],
        [half - 2, half - 2],
      ].map(([px, pz], i) => (
        <group key={`pillar-${i}`} position={[px, 0, pz]}>
          <mesh position={[0, wallH / 2, 0]}>
            <cylinderGeometry args={[0.9, 1.1, wallH, 8]} />
            <meshStandardMaterial color="#353b47" roughness={0.9} />
          </mesh>
          <mesh position={[0, wallH + 0.2, 0]}>
            <boxGeometry args={[2.2, 0.4, 2.2]} />
            <meshStandardMaterial color="#4a5263" />
          </mesh>
        </group>
      ))}

      {/* Torches with Flickering Point Lights */}
      {/* Torch 1: North Left */}
      <group position={[-half + 5, 2.3, -half + 0.6]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#54381e" />
        </mesh>
        {/* Flame */}
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshBasicMaterial color="#ffaa22" />
        </mesh>
        <pointLight ref={torchLight1} color="#ff9922" distance={12} intensity={2.0} />
      </group>

      {/* Torch 2: North Right */}
      <group position={[half - 5, 2.3, -half + 0.6]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#54381e" />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshBasicMaterial color="#ffaa22" />
        </mesh>
        <pointLight ref={torchLight2} color="#ff9922" distance={12} intensity={2.0} />
      </group>

      {/* Torch 3: West Wall */}
      <group position={[-half + 0.6, 2.3, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#54381e" />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshBasicMaterial color="#ffaa22" />
        </mesh>
        <pointLight ref={torchLight3} color="#ff9922" distance={12} intensity={2.0} />
      </group>

      {/* Torch 4: East Wall */}
      <group position={[half - 0.6, 2.3, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#54381e" />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshBasicMaterial color="#ffaa22" />
        </mesh>
        <pointLight ref={torchLight4} color="#ff9922" distance={12} intensity={2.0} />
      </group>

      {/* Victory Treasure Portal / Gateway at North Center */}
      <group position={[0, 0, -half + 0.8]}>
        {/* Left Stone Pillar */}
        <mesh position={[-1.6, 2, 0]}>
          <boxGeometry args={[0.6, 4, 0.6]} />
          <meshStandardMaterial color="#50586b" />
        </mesh>
        {/* Right Stone Pillar */}
        <mesh position={[1.6, 2, 0]}>
          <boxGeometry args={[0.6, 4, 0.6]} />
          <meshStandardMaterial color="#50586b" />
        </mesh>
        {/* Arch Top */}
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[4.0, 0.7, 0.8]} />
          <meshStandardMaterial color="#646e85" />
        </mesh>

        {/* Portal Energy Barrier */}
        <mesh position={[0, 2, 0]}>
          <planeGeometry args={[2.6, 3.8]} />
          <meshBasicMaterial
            color={portalOpen ? "#44ffaa" : "#8844ff"}
            transparent
            opacity={portalOpen ? 0.85 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight
          color={portalOpen ? "#44ffaa" : "#8844ff"}
          intensity={portalOpen ? 3.5 : 1.0}
          distance={8}
          position={[0, 2, 0.5]}
        />
      </group>
    </group>
  );
};
