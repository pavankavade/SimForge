import React from "react";
import { detailsKinematics } from "../timeline";

interface CaveDetailsProps {
  frame: number;
}

export const CaveDetails: React.FC<CaveDetailsProps> = ({ frame }) => {
  const { torchLit, torchIntensity, mammothAlpha, batAlpha } = detailsKinematics(frame);

  const torchFlicker = 0.9 + 0.1 * Math.sin(frame * 2.2);

  return (
    <group>
      {/* 1. Wall Torch Mounted on Back Wall */}
      <group position={[3.5, 2.1, -2.10]}>
        {/* Wooden Bracket */}
        <mesh rotation={[0.4, 0, 0]} position={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.04, 0.05, 0.45, 6]} />
          <meshStandardMaterial color="#422917" roughness={0.9} />
        </mesh>
        {/* Metal Sconce Ring */}
        <mesh position={[0, 0.18, 0.15]}>
          <cylinderGeometry args={[0.07, 0.05, 0.12, 6]} />
          <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* Torch Flame & Amber Light */}
        {torchLit && (
          <group position={[0, 0.32, 0.15]} scale={torchIntensity * torchFlicker}>
            <mesh>
              <coneGeometry args={[0.13, 0.38, 6]} />
              <meshBasicMaterial color="#ffaa11" />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#ff4400" />
            </mesh>
            <pointLight
              color="#ffaa33"
              intensity={4.8 * torchIntensity * torchFlicker}
              distance={10}
              decay={1.4}
            />
          </group>
        )}
      </group>

      {/* 2. Prehistoric Red Ochre Mammoth Cave Painting on Back Wall */}
      {mammothAlpha > 0.01 && (
        <group position={[4.6, 2.15, -2.12]} scale={[1, 1, 0.04]}>
          {/* Main Mammoth Body Silhouette */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.3, 0.48, 8]} />
            <meshStandardMaterial
              color="#9e2d14"
              roughness={0.95}
              transparent
              opacity={mammothAlpha}
            />
          </mesh>

          {/* High Domed Head */}
          <mesh position={[-0.32, 0.14, 0]}>
            <cylinderGeometry args={[0.22, 0.18, 0.38, 8]} />
            <meshStandardMaterial
              color="#9e2d14"
              roughness={0.95}
              transparent
              opacity={mammothAlpha}
            />
          </mesh>

          {/* Curled Trunk */}
          <mesh position={[-0.52, -0.12, 0]} rotation={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.05, 0.07, 0.36, 6]} />
            <meshStandardMaterial
              color="#9e2d14"
              roughness={0.95}
              transparent
              opacity={mammothAlpha}
            />
          </mesh>
          <mesh position={[-0.62, -0.22, 0]} rotation={[0, 0, 0.8]}>
            <cylinderGeometry args={[0.038, 0.05, 0.22, 5]} />
            <meshStandardMaterial
              color="#9e2d14"
              roughness={0.95}
              transparent
              opacity={mammothAlpha}
            />
          </mesh>

          {/* Sweeping Ivory Curved Tusks */}
          <mesh position={[-0.42, 0.0, 0.06]} rotation={[0, 0, 0.75]}>
            <cylinderGeometry args={[0.02, 0.04, 0.45, 5]} />
            <meshStandardMaterial
              color="#ede5d3"
              roughness={0.65}
              transparent
              opacity={mammothAlpha * 0.95}
            />
          </mesh>

          {/* 4 Sturdy Legs */}
          {[-0.22, -0.07, 0.07, 0.22].map((lx, i) => (
            <mesh key={`leg-${i}`} position={[lx, -0.38, 0]}>
              <cylinderGeometry args={[0.065, 0.08, 0.34, 6]} />
              <meshStandardMaterial
                color="#9e2d14"
                roughness={0.95}
                transparent
                opacity={mammothAlpha}
              />
            </mesh>
          ))}

          {/* Short Tail */}
          <mesh position={[0.28, -0.12, 0]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.025, 0.035, 0.22, 4]} />
            <meshStandardMaterial
              color="#9e2d14"
              roughness={0.95}
              transparent
              opacity={mammothAlpha}
            />
          </mesh>

          {/* Prehistoric Negative Hand Stencils (Left & Right) */}
          {[-0.85, 0.65].map((hx, idx) => (
            <group key={`hand-${idx}`} position={[hx, 0.1, 0]}>
              {/* Palm */}
              <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.04, 8]} />
                <meshStandardMaterial color="#822510" roughness={0.95} transparent opacity={mammothAlpha * 0.85} />
              </mesh>
              {/* 5 Finger Streaks */}
              {[-0.06, -0.03, 0, 0.03, 0.06].map((fx, fi) => (
                <mesh key={`finger-${fi}`} position={[fx, 0.11, 0]} rotation={[0, 0, fx * 1.5]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.1, 4]} />
                  <meshStandardMaterial color="#822510" roughness={0.95} transparent opacity={mammothAlpha * 0.85} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* 3. Cute Cartoon Bat Hanging on Ceiling */}
      {batAlpha > 0.01 && (
        <group position={[3.2, 3.65, -0.38]} scale={batAlpha * 1.35}>
          {/* Subtle Warm Fill Light on Bat */}
          <pointLight color="#ffd2a8" intensity={1.2} distance={3} decay={2} position={[0, -0.3, 0.3]} />

          {/* Upside-down Body */}
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.095, 0.18, 6, 8]} />
            <meshStandardMaterial color="#35303d" roughness={0.75} />
          </mesh>

          {/* Folded Wings Wrapped Like a Blanket */}
          <mesh position={[0, -0.14, 0.02]} scale={[1 + 0.06 * Math.sin(frame * 0.18), 1, 1]}>
            <boxGeometry args={[0.26, 0.28, 0.1]} />
            <meshStandardMaterial color="#2a2530" roughness={0.8} />
          </mesh>

          {/* Cute Head */}
          <mesh position={[0, -0.28, 0.02]}>
            <sphereGeometry args={[0.085, 6, 6]} />
            <meshStandardMaterial color="#35303d" roughness={0.75} />
          </mesh>

          {/* Left & Right Pointy Ears */}
          {[-0.055, 0.055].map((ex, i) => (
            <group key={`ear-${i}`} position={[ex, -0.36, 0.02]} rotation={[Math.PI, 0, ex * 1.8]}>
              <mesh>
                <coneGeometry args={[0.04, 0.1, 4]} />
                <meshStandardMaterial color="#423b4c" roughness={0.8} />
              </mesh>
              {/* Pink Inner Ear */}
              <mesh position={[0, 0, 0.01]}>
                <coneGeometry args={[0.022, 0.06, 4]} />
                <meshBasicMaterial color="#c4788c" />
              </mesh>
            </group>
          ))}

          {/* Cute Sleeping Crescent Eyes (^ ^) */}
          {[-0.035, 0.035].map((eyeX, i) => (
            <mesh key={`eye-${i}`} position={[eyeX, -0.29, 0.1]}>
              <sphereGeometry args={[0.018, 5, 5]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}

          {/* Little Pink Nose */}
          <mesh position={[0, -0.32, 0.1]}>
            <sphereGeometry args={[0.012, 4, 4]} />
            <meshBasicMaterial color="#e898aa" />
          </mesh>
        </group>
      )}
    </group>
  );
};
