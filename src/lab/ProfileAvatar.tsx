import type React from "react";
import { AbsoluteFill } from "remotion";
import { AdventurerUnit, type AdventurerClass, type Expression } from "../artifacts/characters/hero";
import { EpisodeVideo } from "../engine/EpisodeVideo";
import { ENVIRONMENT_PRESETS } from "../engine/presets";
import type { EpisodeConfig, Vec3 } from "../engine/types";
import { GlowSprite } from "../artifacts/dungeon/Fx";

interface AvatarProps {
  classType?: AdventurerClass;
  expression?: Expression;
  yaw?: number;
}

const AVATAR_PROFILES: Record<
  AdventurerClass,
  {
    scale: number;
    camPos: Vec3;
    lookAt: Vec3;
    expression: Expression;
    yaw: number;
    torchPos: Vec3;
    torchColor: string;
  }
> = {
  paladin: {
    scale: 1.15,
    camPos: [0.12, 1.55, 3.25],
    lookAt: [0, 1.45, 0],
    expression: "smug",
    yaw: 0.28,
    torchPos: [1.2, 1.8, -0.4],
    torchColor: "#ff9233",
  },
  goblin: {
    scale: 1.25,
    camPos: [0.08, 1.25, 2.75],
    lookAt: [0, 1.15, 0],
    expression: "happy",
    yaw: 0.22,
    torchPos: [-1.0, 1.6, -0.4],
    torchColor: "#ffa244",
  },
  rogue: {
    scale: 1.15,
    camPos: [0.1, 1.48, 3.1],
    lookAt: [0, 1.38, 0],
    expression: "focus",
    yaw: -0.25,
    torchPos: [1.1, 1.7, -0.4],
    torchColor: "#ffaa44",
  },
  mage: {
    scale: 1.15,
    camPos: [0.1, 1.58, 3.35],
    lookAt: [0, 1.48, 0],
    expression: "happy",
    yaw: 0.25,
    torchPos: [-1.2, 1.9, -0.4],
    torchColor: "#5fe5ff",
  },
};

const AvatarScene: React.FC<AvatarProps> = ({ classType = "paladin", expression, yaw }) => {
  const profile = AVATAR_PROFILES[classType];
  const activeExpr = expression ?? profile.expression;
  const activeYaw = yaw ?? profile.yaw;

  return (
    <>
      {/* Background stone wall */}
      <mesh position={[0, 1.5, -0.8]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#22252e" roughness={0.92} />
      </mesh>

      {/* Rim light / atmospheric torch glow */}
      <group position={profile.torchPos}>
        <GlowSprite color={profile.torchColor} size={2.5} opacity={0.65} />
        <pointLight color={profile.torchColor} intensity={2.8} distance={6} />
      </group>

      {/* Front fill light */}
      <pointLight position={[-0.8, 2.0, 2.2]} intensity={1.5} color="#fff1db" distance={7} />

      {/* Character centered */}
      <AdventurerUnit
        classType={classType}
        pose="idle"
        expression={activeExpr}
        position={[0, 0, 0]}
        rotation={[0, activeYaw, 0]}
        scale={profile.scale}
        animFrame={15}
      />
    </>
  );
};

const AvatarOverlay: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(12,14,18,0.75) 100%)",
    }}
  />
);

export const ProfileAvatar: React.FC<AvatarProps> = (props) => {
  const classType = props.classType ?? "paladin";
  const profile = AVATAR_PROFILES[classType];

  const config: EpisodeConfig = {
    id: "ProfileAvatar",
    title: "Profile Avatar",
    width: 1024,
    height: 1024,
    fps: 30,
    durationInFrames: 30,
    camera: {
      fov: 34,
      near: 0.1,
      far: 30,
      initialPosition: profile.camPos,
      waypoints: [
        { frame: 0, position: profile.camPos, lookAt: profile.lookAt },
        { frame: 29, position: profile.camPos, lookAt: profile.lookAt },
      ],
    },
    environment: ENVIRONMENT_PRESETS.dungeonVault,
    overlays: {
      grade: "saturate(1.22) contrast(1.1) brightness(1.04)",
      fadeInFrames: 0,
      fadeOutFrames: 0,
    },
    OverlayComponent: AvatarOverlay,
  };

  return <EpisodeVideo config={config} Scene={() => <AvatarScene {...props} />} />;
};
