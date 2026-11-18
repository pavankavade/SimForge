import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stumbleSfx } from "./stumbleSfx";

export type ThemeStyle = "stumble" | "candy" | "neon";

interface StumbleWorldProps {
  theme: ThemeStyle;
  playerPos: [number, number, number];
  onImpulse: (impulse: [number, number, number]) => void;
  onVictory: () => void;
  isVictory: boolean;
}

export const StumbleWorld: React.FC<StumbleWorldProps> = ({
  theme,
  playerPos,
  onImpulse,
  onVictory,
}) => {
  const sweeperRef = useRef<THREE.Group>(null);
  const trophyRef = useRef<THREE.Group>(null);
  const victoryTriggeredRef = useRef<boolean>(false);
  const lastSweeperHitRef = useRef<number>(0);

  // Theme palettes
  const colors = {
    stumble: {
      platform: "#38bdf8",
      accent: "#facc15",
      border: "#0284c7",
      sweeper: ["#ec4899", "#f59e0b", "#06b6d4"],
      bouncer: "#22c55e",
      bumper: "#ef4444",
    },
    candy: {
      platform: "#f472b6",
      accent: "#c084fc",
      border: "#db2777",
      sweeper: ["#fb7185", "#38bdf8", "#a855f7"],
      bouncer: "#4ade80",
      bumper: "#f97316",
    },
    neon: {
      platform: "#0f172a",
      accent: "#00f0ff",
      border: "#ff007f",
      sweeper: ["#00f0ff", "#ff007f", "#ffe600"],
      bouncer: "#00ff66",
      bumper: "#ff0055",
    },
  }[theme];

  // Bouncer pad positions
  const bouncerPads: [number, number, number][] = [
    [-3.8, 0.05, 5.0],
    [3.8, 0.05, 5.0],
    [-6.0, 0.55, -14.0],
    [6.0, 0.55, -14.0],
  ];

  // Pinball Bumper positions
  const bumpers: [number, number, number][] = [
    [-4.5, 0.6, -1.0],
    [4.5, 0.6, -1.0],
    [-4.0, 0.6, -7.0],
    [4.0, 0.6, -7.0],
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const [px, py, pz] = playerPos;

    // 1. Rotate the Sweeper Wheel
    const sweeperSpeed = 1.3;
    const sweeperAngle = t * sweeperSpeed;
    if (sweeperRef.current) {
      sweeperRef.current.rotation.y = sweeperAngle;
    }

    // Precise Sweeper Arm Collision (Center = [0, 0, -4])
    const cx = 0;
    const cz = -4;
    const vx = px - cx;
    const vz = pz - cz;
    const now = clock.getElapsedTime();

    // Check each of the 3 arms (cylinder length = 6.4, radius = 0.35, height y = 0.75)
    for (let i = 0; i < 3; i++) {
      const armYaw = sweeperAngle + (i * Math.PI * 2) / 3;
      // In Three.js, Y-rotation moves local +X axis to:
      const dirX = Math.cos(armYaw);
      const dirZ = -Math.sin(armYaw);

      // Distance projected along the arm from center
      const proj = vx * dirX + vz * dirZ;

      // The foam arm extends from radius 0.6 to 6.8
      if (proj >= 0.6 && proj <= 6.85) {
        // Perpendicular distance from player to arm centerline
        const perpX = vx - proj * dirX;
        const perpZ = vz - proj * dirZ;
        const perpDist = Math.hypot(perpX, perpZ);

        // Arm radius is 0.35 + player radius ~0.35. Tight, realistic contact:
        const collisionRadius = 0.65;
        // The stick is at y = 0.75. If player jumps (py > 0.8), they clear the stick!
        const isAtStickHeight = py < 0.82;

        if (perpDist < collisionRadius && isAtStickHeight) {
          if (now - lastSweeperHitRef.current > 0.45) {
            lastSweeperHitRef.current = now;
            stumbleSfx.stumble();

            // Push player in the sweep direction (tangential velocity)
            const tangentX = -dirZ;
            const tangentZ = dirX;
            const force = 10.5;
            onImpulse([tangentX * force, 5.5, tangentZ * force]);
            break;
          }
        }
      }
    }

    // 2. Bouncer Pads Collision (must actually step on pad)
    for (const [bx, by, bz] of bouncerPads) {
      const d = Math.hypot(px - bx, pz - bz);
      if (d < 0.95 && Math.abs(py - by) < 0.6) {
        stumbleSfx.bounce();
        onImpulse([0, 22.0, -4.0]); // High launch forward!
        break;
      }
    }

    // 3. Pinball Bumpers Collision
    for (const [bx, , bz] of bumpers) {
      const d = Math.hypot(px - bx, pz - bz);
      if (d < 1.05 && py < 1.3) {
        stumbleSfx.bumper();
        const angle = Math.atan2(px - bx, pz - bz);
        const bumpForce = 13.0;
        onImpulse([Math.sin(angle) * bumpForce, 4.0, Math.cos(angle) * bumpForce]);
        break;
      }
    }

    // 4. Winner's Trophy Rotation & Podium Detection
    if (trophyRef.current) {
      trophyRef.current.rotation.y = t * 2.0;
      trophyRef.current.position.y = 2.8 + Math.sin(t * 3.0) * 0.25;
    }

    // Podium Check (around [0, 1.8, -24])
    if (
      !victoryTriggeredRef.current &&
      pz <= -21 &&
      pz >= -27 &&
      px >= -4.0 &&
      px <= 4.0 &&
      py >= 1.5
    ) {
      victoryTriggeredRef.current = true;
      stumbleSfx.victory();
      onVictory();
    }
  });

  return (
    <group>
      {/* Cartoon Sky Light */}
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight position={[12, 24, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 14, -8]} intensity={0.4} color="#dbeafe" />

      {/* Floating Cartoon Clouds in Background */}
      {[
        [-18, 4, -10],
        [20, 6, -18],
        [-22, 2, -28],
        [18, 5, -5],
        [0, -4, -34],
      ].map(([cx, cy, cz], i) => (
        <group key={`cloud-${i}`} position={[cx, cy, cz]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[3.2, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh position={[2, 0.4, 0]}>
            <sphereGeometry args={[2.4, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh position={[-2, -0.2, 0]}>
            <sphereGeometry args={[2.6, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ======================================================== */}
      {/* 1. STARTING PLATFORM (z from 4 to 14, x from -6 to 6)    */}
      {/* ======================================================== */}
      <group position={[0, 0, 9]}>
        {/* Main Floor Slab */}
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[12, 0.5, 10]} />
          <meshStandardMaterial color={colors.platform} roughness={0.4} />
        </mesh>
        {/* Colored Rim Borders */}
        <mesh position={[0, 0.05, 5]}>
          <boxGeometry args={[12.4, 0.4, 0.4]} />
          <meshStandardMaterial color={colors.border} />
        </mesh>
        <mesh position={[-6, 0.05, 0]}>
          <boxGeometry args={[0.4, 0.4, 10.4]} />
          <meshStandardMaterial color={colors.border} />
        </mesh>
        <mesh position={[6, 0.05, 0]}>
          <boxGeometry args={[0.4, 0.4, 10.4]} />
          <meshStandardMaterial color={colors.border} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 2. CENTER SWEEPER WHEEL (z = -4, radius = 7.5)           */}
      {/* ======================================================== */}
      <group position={[0, 0, -4]}>
        {/* Circular Island Platform */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[7.5, 7.7, 0.5, 32]} />
          <meshStandardMaterial color={colors.accent} roughness={0.5} />
        </mesh>
        {/* Outer Ring Guard */}
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[7.5, 0.25, 8, 32]} />
          <meshStandardMaterial color={colors.border} />
        </mesh>

        {/* Central Rotating Sweeper Hub and 3 Foam Arms */}
        <group ref={sweeperRef} position={[0, 0.4, 0]}>
          {/* Center Hub */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[1.0, 1.2, 0.8, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} />
          </mesh>

          {/* 3 Sweeper Foam Arms */}
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
            <group key={`sweeper-arm-${i}`} rotation={[0, angle, 0]}>
              <mesh position={[3.6, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.35, 0.35, 6.4, 16]} />
                <meshStandardMaterial color={colors.sweeper[i]} roughness={0.2} />
              </mesh>
              {/* Foam Bumper Cap */}
              <mesh position={[6.8, 0.35, 0]}>
                <sphereGeometry args={[0.42, 12, 12]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ======================================================== */}
      {/* 3. BOUNCY TRAMPOLINE PADS (Boing Pads!)                   */}
      {/* ======================================================== */}
      {bouncerPads.map(([bx, by, bz], i) => (
        <group key={`bouncer-${i}`} position={[bx, by, bz]}>
          {/* Pad Base */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[1.1, 1.2, 0.2, 16]} />
            <meshStandardMaterial color={colors.bouncer} roughness={0.3} />
          </mesh>
          {/* Arrow / Chevron Marker */}
          <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {/* ======================================================== */}
      {/* 4. PINBALL BUMPERS (Push you back!)                      */}
      {/* ======================================================== */}
      {bumpers.map(([bx, by, bz], i) => (
        <group key={`bumper-${i}`} position={[bx, by, bz]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.85, 0.85, 0.9, 20]} />
            <meshStandardMaterial color={colors.bumper} roughness={0.2} />
          </mesh>
          {/* Top Cap */}
          <mesh position={[0, 0.95, 0]}>
            <sphereGeometry args={[0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {/* ======================================================== */}
      {/* 5. STEPPING ISLANDS (Transition to Finish)                */}
      {/* ======================================================== */}
      {/* Left Stepping Island */}
      <group position={[-6, 0.25, -14]}>
        <mesh>
          <cylinderGeometry args={[3.2, 3.4, 0.5, 24]} />
          <meshStandardMaterial color={colors.platform} />
        </mesh>
      </group>
      {/* Right Stepping Island */}
      <group position={[6, 0.25, -14]}>
        <mesh>
          <cylinderGeometry args={[3.2, 3.4, 0.5, 24]} />
          <meshStandardMaterial color={colors.platform} />
        </mesh>
      </group>
      {/* Center High Stepping Island */}
      <group position={[0, 0.75, -16]}>
        <mesh>
          <cylinderGeometry args={[3.5, 3.7, 0.5, 24]} />
          <meshStandardMaterial color={colors.accent} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 6. WINNER'S PODIUM & ROTATING GOLDEN CROWN 👑            */}
      {/* ======================================================== */}
      <group position={[0, 1.55, -24]}>
        {/* Victory Podium Stage */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[8, 0.6, 6]} />
          <meshStandardMaterial color="#8b5cf6" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Gold Trim */}
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[8.2, 0.1, 6.2]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} />
        </mesh>

        {/* Rotating 3D Golden Crown / Trophy */}
        <group ref={trophyRef} position={[0, 1.6, 0]}>
          {/* Crown Base */}
          <mesh>
            <cylinderGeometry args={[0.85, 0.75, 0.45, 16]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Crown Spikes */}
          {[0, 1, 2, 3, 4].map((idx) => {
            const a = (idx * Math.PI * 2) / 5;
            return (
              <mesh
                key={`spike-${idx}`}
                position={[Math.sin(a) * 0.75, 0.45, Math.cos(a) * 0.75]}
              >
                <coneGeometry args={[0.18, 0.5, 6]} />
                <meshStandardMaterial color="#ffe043" metalness={0.9} roughness={0.2} />
              </mesh>
            );
          })}
          <pointLight color="#ffd700" intensity={2.5} distance={7} />
        </group>
      </group>
    </group>
  );
};
