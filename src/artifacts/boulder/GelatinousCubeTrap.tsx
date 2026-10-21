import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface GelatinousCubeTrapProps {
  spawnFrame?: number;
  doorSlamFrame?: number;
  splashFrame?: number;
}

export const GelatinousCubeTrap: React.FC<GelatinousCubeTrapProps> = ({
  spawnFrame = 1880,
  doorSlamFrame = 1932,
  splashFrame = 2210,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  const slopeAngle = 0.242;
  const doorFloorY = 1.5 + -8.2 * Math.tan(slopeAngle);
  const rampFloorY = 1.5 + -7.4 * Math.tan(slopeAngle);
  const cubeFloorY = 1.5 + 4.2 * Math.tan(slopeAngle);

  // Assembly scale-in animation
  const spawnScale = interpolate(
    frame,
    [spawnFrame, spawnFrame + 22],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  );

  // Entrance blast door drops shut rapidly
  let doorDropY = 0;
  if (doorSlamFrame !== undefined && frame >= doorSlamFrame) {
    doorDropY = interpolate(
      frame,
      [doorSlamFrame, doorSlamFrame + 6],
      [4.2, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      }
    );
  } else {
    doorDropY = 4.2;
  }

  // Cube gelatinous wobble animation
  const isSplashed = splashFrame !== undefined && frame >= splashFrame;
  const wobbleSpeed = isSplashed ? 0.6 : 0.15;
  const wobbleAmount = isSplashed ? 0.18 : 0.04;
  const wobbleX = 1 + Math.sin(frame * wobbleSpeed) * wobbleAmount;
  const wobbleY = 1 + Math.cos(frame * wobbleSpeed * 0.8) * wobbleAmount;
  const wobbleZ = 1 + Math.sin(frame * wobbleSpeed * 1.2) * wobbleAmount;

  return (
    <group scale={[spawnScale, spawnScale, spawnScale]}>
      {/* ================= ENTRANCE STEEL PORTCULLIS / BLAST DOOR ================= */}
      <group position={[-8.2, doorFloorY + 2.2 + doorDropY, -0.6]}>
        {/* Massive Iron Blast Door Slab */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.4, 4.4, 3.2]} />
          <meshStandardMaterial color="#20222a" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Reinforced Iron Grate Ribs */}
        {[-1.2, -0.4, 0.4, 1.2].map((y, i) => (
          <mesh key={`grate-rib-${i}`} position={[0.22, y, 0]}>
            <boxGeometry args={[0.08, 0.22, 3.18]} />
            <meshStandardMaterial color="#404554" metalness={0.85} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* ================= HALF-PIPE LAUNCH RAMP AT ENTRANCE ================= */}
      {/* Curves upward from track floor at x = -6.5 up to vertical at x = -8.0 */}
      <group position={[-7.4, rampFloorY + 0.8, -0.6]} rotation={[0, 0, slopeAngle]}>
        {/* Curved Launch Ramp Quarter-cylinder */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[2.0, 2.0, 3.0, 16, 1, false, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#383c4a" roughness={0.8} />
        </mesh>
        {/* Heavy Iron Rim Curbing */}
        <mesh position={[0, 1.0, 1.5]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.3, 2.8, 0.18]} />
          <meshStandardMaterial color="#1f2129" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.0, -1.5]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.3, 2.8, 0.18]} />
          <meshStandardMaterial color="#1f2129" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* ================= CEILING MOUNTED GELATINOUS CUBE ================= */}
      <group position={[4.2, cubeFloorY + 4.5, -0.6]}>
        {/* Hanging Iron Cage Suspension Framework */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[4.4, 0.4, 4.4]} />
          <meshStandardMaterial color="#1b1c22" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* 4 Corner Suspension Chains */}
        {[
          [-2.0, -2.0],
          [-2.0, 2.0],
          [2.0, -2.0],
          [2.0, 2.0],
        ].map(([cx, cz], i) => (
          <mesh key={`cube-chain-${i}`} position={[cx, 1.1, cz]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 6]} />
            <meshStandardMaterial color="#323642" metalness={0.88} />
          </mesh>
        ))}

        {/* The Massive Wobbling Translucent Emerald Gelatinous Cube Body */}
        <group scale={[wobbleX, wobbleY, wobbleZ]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.6, 3.6, 3.6]} />
            <meshPhysicalMaterial
              color="#22ee66"
              emissive="#004411"
              emissiveIntensity={0.35}
              roughness={0.08}
              transmission={0.88}
              thickness={2.2}
              transparent
              opacity={0.75}
              ior={1.33}
            />
          </mesh>

          {/* Internal Emerald Core Glow Light */}
          <pointLight
            position={[0, 0, 0]}
            color="#33ff77"
            intensity={2.8}
            distance={7.0}
          />

          {/* Floating dissolved skeleton items trapped inside */}
          {/* Skull */}
          <group position={[-0.6, 0.5, 0.4]} rotation={[0.4, 0.3, -0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.38, 0.42]} />
              <meshStandardMaterial color="#f0ece1" roughness={0.6} />
            </mesh>
            {/* Eye Sockets */}
            <mesh position={[-0.09, 0.05, 0.22]}>
              <boxGeometry args={[0.09, 0.09, 0.05]} />
              <meshBasicMaterial color="#003311" />
            </mesh>
            <mesh position={[0.09, 0.05, 0.22]}>
              <boxGeometry args={[0.09, 0.09, 0.05]} />
              <meshBasicMaterial color="#003311" />
            </mesh>
          </group>

          {/* Ribcage */}
          <mesh position={[0.4, -0.3, -0.3]} rotation={[-0.3, 0.5, 0.2]} castShadow>
            <cylinderGeometry args={[0.4, 0.32, 0.7, 8, 1, true]} />
            <meshStandardMaterial color="#f0ece1" roughness={0.6} />
          </mesh>

          {/* Floating Gold Sword */}
          <group position={[0.2, 0.8, -0.4]} rotation={[1.1, 0.4, 0.8]}>
            <mesh castShadow>
              <boxGeometry args={[0.08, 1.1, 0.03]} />
              <meshStandardMaterial color="#e8d080" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.4, 0]}>
              <boxGeometry args={[0.3, 0.06, 0.08]} />
              <meshStandardMaterial color="#3a2517" roughness={0.8} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
