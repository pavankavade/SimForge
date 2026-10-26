import React from "react";
import { BEATS, WALL_X } from "../timeline";
import { progress } from "../../../kit/motion";

interface WolfPackProps {
  frame: number;
}

/** Individual blocky low-poly wolf model matching the stylized diorama aesthetic */
const BlockyWolf: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  sniffing?: boolean;
  frame: number;
  alert?: boolean;
}> = ({ position, rotation = [0, 0, 0], scale = 1, sniffing = false, frame, alert = false }) => {
  // Sniffing head bobbing animation
  const sniffAngle = sniffing ? 0.35 + 0.15 * Math.sin(frame * 0.25) : alert ? -0.1 : 0.1;
  const tailWag = Math.sin(frame * 0.2) * 0.18;
  const breathe = 1 + 0.02 * Math.sin(frame * 0.12);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Main Body Torso */}
      <mesh position={[0, 0.42, 0]} scale={[1, breathe, 1]}>
        <boxGeometry args={[0.58, 0.30, 0.24]} />
        <meshStandardMaterial color="#484d59" roughness={0.88} />
      </mesh>

      {/* Shoulder / Chest Mantle (thicker dark fur) */}
      <mesh position={[0.16, 0.46, 0]}>
        <boxGeometry args={[0.30, 0.34, 0.26]} />
        <meshStandardMaterial color="#383b45" roughness={0.92} />
      </mesh>

      {/* 2. Neck and Head */}
      <group position={[0.32, 0.48, 0]} rotation={[0, 0, sniffAngle]}>
        {/* Neck */}
        <mesh position={[0.08, 0.06, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.18, 0.20, 0.18]} />
          <meshStandardMaterial color="#484d59" roughness={0.88} />
        </mesh>

        {/* Head Block */}
        <group position={[0.22, 0.10, 0]}>
          <mesh>
            <boxGeometry args={[0.20, 0.18, 0.19]} />
            <meshStandardMaterial color="#555a68" roughness={0.85} />
          </mesh>

          {/* Snout / Muzzle */}
          <mesh position={[0.14, -0.03, 0]}>
            <boxGeometry args={[0.16, 0.10, 0.12]} />
            <meshStandardMaterial color="#383c47" roughness={0.9} />
          </mesh>

          {/* Nose Tip */}
          <mesh position={[0.225, -0.01, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.05]} />
            <meshStandardMaterial color="#111113" roughness={0.6} />
          </mesh>

          {/* Left and Right Perked Triangular Ears */}
          <mesh position={[-0.04, 0.14, 0.06]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.045, 0.11, 4]} />
            <meshStandardMaterial color="#383b45" roughness={0.9} />
          </mesh>
          <mesh position={[-0.04, 0.14, -0.06]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.045, 0.11, 4]} />
            <meshStandardMaterial color="#383b45" roughness={0.9} />
          </mesh>

          {/* Glowing Night Eyes (Eerie yellow-green in darkness) */}
          <mesh position={[0.08, 0.03, 0.07]}>
            <boxGeometry args={[0.035, 0.035, 0.02]} />
            <meshBasicMaterial color="#ffff33" />
          </mesh>
          <mesh position={[0.08, 0.03, -0.07]}>
            <boxGeometry args={[0.035, 0.035, 0.02]} />
            <meshBasicMaterial color="#ffff33" />
          </mesh>
        </group>
      </group>

      {/* 3. Four Blocky Legs */}
      {/* Front Left */}
      <mesh position={[0.20, 0.18, 0.09]}>
        <boxGeometry args={[0.075, 0.36, 0.075]} />
        <meshStandardMaterial color="#3a3e4a" roughness={0.9} />
      </mesh>
      {/* Front Right */}
      <mesh position={[0.20, 0.18, -0.09]}>
        <boxGeometry args={[0.075, 0.36, -0.075]} />
        <meshStandardMaterial color="#3a3e4a" roughness={0.9} />
      </mesh>
      {/* Hind Left */}
      <mesh position={[-0.20, 0.18, 0.09]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.085, 0.36, 0.085]} />
        <meshStandardMaterial color="#383b45" roughness={0.9} />
      </mesh>
      {/* Hind Right */}
      <mesh position={[-0.20, 0.18, -0.09]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.085, 0.36, 0.085]} />
        <meshStandardMaterial color="#383b45" roughness={0.9} />
      </mesh>

      {/* 4. Bushy Angular Tail */}
      <group position={[-0.30, 0.44, 0]} rotation={[0, tailWag, -0.55]}>
        <mesh position={[-0.14, -0.08, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.26, 0.10, 0.10]} />
          <meshStandardMaterial color="#30333d" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
};

export const WolfPack: React.FC<WolfPackProps> = ({ frame }) => {
  // Visible during night animal beat (l8a and l8b until torch lights up)
  const isNight = frame >= BEATS.animalsNight - 25 && frame < BEATS.torchLight;
  if (!isNight) return null;

  const fadeIn = progress(frame, [BEATS.animalsNight - 25, BEATS.animalsNight]);
  const fadeOut = progress(frame, [BEATS.torchLight - 20, BEATS.torchLight]);
  const opacity = fadeIn * (1 - fadeOut);

  if (opacity < 0.01) return null;

  // Door close reaction: when stick door shuts, the close wolf steps back
  const doorClosedT = progress(frame, [BEATS.doorClose, BEATS.doorClose + 15]);
  const wolf1StepBack = doorClosedT * 0.55;

  return (
    <group>
      {/* Warm campfire light spill through the doorway onto the ground and sniffing wolves */}
      <pointLight
        position={[WALL_X + 0.1, 0.7, 0.0]}
        intensity={3.2}
        color="#ffbe77"
        distance={5.0}
        decay={1.2}
      />
      {/* Soft cool moonlit rim light on wolf silhouettes */}
      <directionalLight
        position={[-6, 6, 4]}
        intensity={1.8}
        color="#9fc2ea"
      />

      {/* Wolf 1: Inquisitive wolf sniffing right at the cave entrance doorway */}
      <BlockyWolf
        position={[WALL_X - 0.22 - wolf1StepBack, 0, 0.0]}
        rotation={[0, 0.2, 0]}
        scale={1.15}
        sniffing={doorClosedT < 0.5}
        alert={doorClosedT >= 0.5}
        frame={frame}
      />

      {/* Wolf 2: Alert packmate prowling nearby beside the exterior pine tree */}
      <BlockyWolf
        position={[WALL_X - 1.25, 0, -0.85]}
        rotation={[0, 0.45, 0]}
        scale={1.0}
        alert={true}
        frame={frame}
      />

      {/* Wolf 3: Shadowy third wolf lurking further back on the mountain slope */}
      <BlockyWolf
        position={[WALL_X - 2.1, 0, 0.6]}
        rotation={[0, -0.3, 0]}
        scale={0.92}
        alert={true}
        frame={frame}
      />
    </group>
  );
};
