import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface TripwireBoulderProps {
  rollStartFrame?: number;
  rollDuration?: number;
  wireSnappedFrame?: number;
  showWire?: boolean;
  showGate?: boolean;
  activeWindow?: readonly [number, number];
}

export const TripwireBoulder: React.FC<TripwireBoulderProps> = ({
  rollStartFrame = 175,
  rollDuration = 48,
  wireSnappedFrame = 175,
  showWire = true,
  showGate = true,
  activeWindow,
}) => {
  const frame = useCurrentFrame();

  if (activeWindow && (frame < activeWindow[0] || frame > activeWindow[1])) {
    return null;
  }

  const radius = 0.85;
  const slopeAngle = 0.242; // ~13.8 deg

  // Top gate lifts open when triggered
  const gateLift = interpolate(
    frame,
    [rollStartFrame - 8, rollStartFrame + 4],
    [0, 1.8],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  // Boulder rolls from x = 6.8 down to x = -8.5
  const isRolling = frame >= rollStartFrame;
  const rollProgress = isRolling
    ? interpolate(frame, [rollStartFrame, rollStartFrame + rollDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    : 0;

  const currentX = interpolate(rollProgress, [0, 1], [6.8, -8.5]);
  // Position on the sloped track: y = 1.5 + x * tan(0.242) + radius * 0.98
  const currentY = 1.5 + currentX * Math.tan(slopeAngle) + radius * 0.98;
  const rollRotation = (6.8 - currentX) / radius;

  // Tripwire state: intact until wireSnappedFrame
  const wireSnapped = frame >= wireSnappedFrame;
  const wireX = -2.0;
  const wireY = 1.5 + wireX * Math.tan(slopeAngle) + 0.25;

  return (
    <group position={[0, 0, -0.6]}>
      {/* ================= TOP REVERSE WOODEN GATE ================= */}
      {showGate && (
        <group position={[7.0, 1.5 + 7.0 * Math.tan(slopeAngle) + 1.1 + gateLift, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 2.2, 2.8]} />
            <meshStandardMaterial color="#4d331f" roughness={0.88} />
          </mesh>
          {/* Iron banding and spikes on gate */}
          {[-1.0, 0, 1.0].map((z, i) => (
            <mesh key={`gate-strap-${i}`} position={[0.02, 0, z]}>
              <boxGeometry args={[0.32, 2.1, 0.12]} />
              <meshStandardMaterial color="#22242a" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}

      {/* ================= LEVEL 1 TRIPWIRE ================= */}
      {showWire && !wireSnapped && (
        <group position={[wireX, wireY, 0]}>
          {/* Iron Pegs in wall and curb */}
          <mesh position={[0, 0, 1.4]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
            <meshStandardMaterial color="#1a1b22" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, -1.4]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
            <meshStandardMaterial color="#1a1b22" metalness={0.9} />
          </mesh>
          {/* Taut steel wire spanning the hallway */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.8, 4]} />
            <meshStandardMaterial
              color="#e0e5ed"
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
        </group>
      )}

      {/* ================= ROLLING STONE BOULDER ================= */}
      <group position={[currentX, currentY, 0]} rotation={[0, 0, rollRotation]}>
        {/* Main granite spherical body */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 20, 14]} />
          <meshStandardMaterial
            color="#5e6270"
            roughness={0.86}
            metalness={0.05}
          />
        </mesh>

        {/* Rocky surface ridges / bands to make rotation clearly visible */}
        <mesh rotation={[0.4, 0.6, 0.3]}>
          <boxGeometry args={[radius * 1.8, radius * 0.4, radius * 1.8]} />
          <meshStandardMaterial color="#4f5360" roughness={0.9} />
        </mesh>
        <mesh rotation={[-0.5, 0.2, 0.8]}>
          <boxGeometry args={[radius * 1.6, radius * 1.6, radius * 0.35]} />
          <meshStandardMaterial color="#6a6f7e" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
