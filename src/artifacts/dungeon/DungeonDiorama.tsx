import React from "react";
import { useCurrentFrame } from "remotion";

export const DungeonDiorama: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle torch flicker
  const torchFlicker = Math.sin(frame * 0.3) * 0.15 + Math.cos(frame * 0.77) * 0.1;

  return (
    <group position={[0, 0, 0]}>
      {/* ================= BACK STONE WALL ================= */}
      {/* Main stone wall behind the corridor */}
      <mesh position={[0, 3, -2.5]} receiveShadow>
        <boxGeometry args={[22, 6.2, 0.6]} />
        <meshStandardMaterial color="#2c2d38" roughness={0.88} />
      </mesh>

      {/* Decorative stone arches / pillar pillars on back wall */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <group key={`pillar-${i}`} position={[x, 3, -2.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 6.2, 0.4]} />
            <meshStandardMaterial color="#383a48" roughness={0.82} />
          </mesh>
          <mesh position={[0, 2.9, 0.1]} castShadow>
            <boxGeometry args={[1.1, 0.4, 0.5]} />
            <meshStandardMaterial color="#444759" roughness={0.8} />
          </mesh>
          <mesh position={[0, -2.9, 0.1]} castShadow>
            <boxGeometry args={[1.1, 0.4, 0.5]} />
            <meshStandardMaterial color="#444759" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Wall Torches with warm point lights */}
      {[-6, 2, 6].map((x, i) => (
        <group key={`torch-${i}`} position={[x, 3.2, -2.0]}>
          {/* Iron Sconce */}
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.5, 6]} />
            <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.5} />
          </mesh>
          {/* Torch wood handle */}
          <mesh position={[0, 0.05, 0.05]} rotation={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
            <meshStandardMaterial color="#5c381e" roughness={0.9} />
          </mesh>
          {/* Flame head */}
          <mesh position={[0, 0.3, 0.1]} scale={[1, 1.2 + torchFlicker, 1]}>
            <coneGeometry args={[0.12, 0.3, 8]} />
            <meshStandardMaterial
              color="#ffaa33"
              emissive="#ff5500"
              emissiveIntensity={1.8 + torchFlicker}
            />
          </mesh>
          {/* Local Torch Point Light */}
          <pointLight
            position={[0, 0.35, 0.3]}
            color="#ff8822"
            intensity={1.2 + torchFlicker * 0.4}
            distance={8}
            decay={2}
          />
        </group>
      ))}

      {/* Ceiling Beam */}
      <mesh position={[0, 6.1, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[22, 0.6, 3.8]} />
        <meshStandardMaterial color="#21222b" roughness={0.9} />
      </mesh>

      {/* ================= CORRIDOR FLOOR BLOCKS ================= */}
      {/* 1. Entrance Floor Slab (Left: x = -10 to -2) */}
      <mesh position={[-6, -0.25, -0.6]} receiveShadow>
        <boxGeometry args={[8, 0.5, 3.4]} />
        <meshStandardMaterial color="#353744" roughness={0.85} />
      </mesh>

      {/* 2. Far Landing Floor Slab (Right: x = 2 to 10) */}
      <mesh position={[6, -0.25, -0.6]} receiveShadow>
        <boxGeometry args={[8, 0.5, 3.4]} />
        <meshStandardMaterial color="#353744" roughness={0.85} />
      </mesh>

      {/* Flagstone Tile grooves for entrance */}
      {[-9, -8, -7, -6, -5, -4, -3].map((x, i) => (
        <mesh key={`groove-l-${i}`} position={[x, 0.01, -0.6]} receiveShadow>
          <boxGeometry args={[0.05, 0.02, 3.3]} />
          <meshStandardMaterial color="#1f2029" roughness={0.95} />
        </mesh>
      ))}

      {/* Flagstone Tile grooves for landing */}
      {[3, 4, 5, 6, 7, 8, 9].map((x, i) => (
        <mesh key={`groove-r-${i}`} position={[x, 0.01, -0.6]} receiveShadow>
          <boxGeometry args={[0.05, 0.02, 3.3]} />
          <meshStandardMaterial color="#1f2029" roughness={0.95} />
        </mesh>
      ))}

      {/* ================= UNDERGROUND SOIL & CROSS SECTION ================= */}
      {/* Massive cutaway underground rock and soil underneath entrance */}
      <mesh position={[-6, -3.2, -0.6]} receiveShadow>
        <boxGeometry args={[8, 5.4, 3.4]} />
        <meshStandardMaterial color="#16181f" roughness={0.95} />
      </mesh>

      {/* Massive cutaway underground rock and soil underneath landing */}
      <mesh position={[6, -3.2, -0.6]} receiveShadow>
        <boxGeometry args={[8, 5.4, 3.4]} />
        <meshStandardMaterial color="#16181f" roughness={0.95} />
      </mesh>

      {/* Underground Bedrock floor below the pit */}
      <mesh position={[0, -5.7, -0.6]} receiveShadow>
        <boxGeometry args={[22, 0.8, 3.8]} />
        <meshStandardMaterial color="#0f1015" roughness={0.95} />
      </mesh>

      {/* Back wall of the pit */}
      <mesh position={[0, -2.6, -2.3]} receiveShadow>
        <boxGeometry args={[4, 5.4, 0.4]} />
        <meshStandardMaterial color="#1c1d25" roughness={0.92} />
      </mesh>

      {/* Pit Left Wall */}
      <mesh position={[-2.1, -2.6, -0.6]} receiveShadow>
        <boxGeometry args={[0.2, 5.4, 3.4]} />
        <meshStandardMaterial color="#23242f" roughness={0.9} />
      </mesh>

      {/* Pit Right Wall */}
      <mesh position={[2.1, -2.6, -0.6]} receiveShadow>
        <boxGeometry args={[0.2, 5.4, 3.4]} />
        <meshStandardMaterial color="#23242f" roughness={0.9} />
      </mesh>

      {/* Pit Floor Foundation (y = -4.2) */}
      <mesh position={[0, -4.2, -0.6]} receiveShadow>
        <boxGeometry args={[4.2, 0.4, 3.4]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.9} />
      </mesh>
    </group>
  );
};
