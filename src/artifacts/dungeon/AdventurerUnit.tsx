import React from "react";
import type { Vec3 } from "../../engine/types";

export type AdventurerClass = "goblin" | "rogue" | "mage" | "paladin";
export type AdventurerPose = "idle" | "walk" | "jump" | "cast" | "shield" | "fall" | "launch";

interface AdventurerUnitProps {
  classType: AdventurerClass;
  pose?: AdventurerPose;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  animFrame?: number;
}

export const AdventurerUnit: React.FC<AdventurerUnitProps> = ({
  classType,
  pose = "idle",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animFrame = 0,
}) => {
  // Class specific color palettes
  const palettes = {
    goblin: {
      skin: "#5a8c3d",
      tunic: "#4a3522",
      metal: "#383b42",
      special: "#9c6d3b",
    },
    rogue: {
      skin: "#e0b48a",
      tunic: "#282a30",
      metal: "#858b98",
      special: "#1b1c20",
    },
    mage: {
      skin: "#dfb385",
      tunic: "#1f335c",
      metal: "#c29938",
      special: "#4db8ff",
    },
    paladin: {
      skin: "#d9ab7c",
      tunic: "#752222",
      metal: "#8fa2be",
      special: "#d4aa33",
    },
  };

  const pal = palettes[classType];
  const sizeMult = classType === "goblin" ? 0.75 : 1.0;

  // Limb animation based on pose and animFrame
  let leftArmRot: Vec3 = [0, 0, 0];
  let rightArmRot: Vec3 = [0, 0, 0];
  let leftLegRot: Vec3 = [0, 0, 0];
  let rightLegRot: Vec3 = [0, 0, 0];
  let bodyBob = 0;

  if (pose === "walk") {
    const cycle = Math.sin(animFrame * 0.35);
    leftArmRot = [cycle * 0.7, 0, 0.1];
    rightArmRot = [-cycle * 0.7, 0, -0.1];
    leftLegRot = [-cycle * 0.65, 0, 0];
    rightLegRot = [cycle * 0.65, 0, 0];
    bodyBob = Math.abs(Math.sin(animFrame * 0.35)) * 0.08;
  } else if (pose === "jump") {
    leftArmRot = [-2.2, 0, 0.4];
    rightArmRot = [-2.2, 0, -0.4];
    leftLegRot = [0.8, 0, 0.2];
    rightLegRot = [0.4, 0, -0.2];
  } else if (pose === "cast") {
    // Both arms raised high holding staff
    leftArmRot = [-1.8, 0.4, 0.3];
    rightArmRot = [-2.3, -0.2, -0.2];
  } else if (pose === "shield") {
    // Shield held directly in front
    leftArmRot = [-1.4, 0.6, 0.1];
    rightArmRot = [-0.6, 0, -0.4];
    leftLegRot = [-0.2, 0, 0];
    rightLegRot = [0.3, 0, 0];
  } else if (pose === "fall" || pose === "launch") {
    // Ragdoll flail
    const flail = Math.sin(animFrame * 0.5);
    leftArmRot = [-2.5 + flail * 0.5, 0, 0.6];
    rightArmRot = [-2.2 - flail * 0.5, 0, -0.6];
    leftLegRot = [0.6 - flail * 0.4, 0, 0.3];
    rightLegRot = [0.9 + flail * 0.4, 0, -0.3];
  }

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale * sizeMult}
    >
      <group position={[0, bodyBob, 0]}>
        {/* ================= TORSO ================= */}
        <mesh position={[0, 0.88, 0]} castShadow>
          <boxGeometry args={[0.48, 0.54, 0.3]} />
          <meshStandardMaterial
            color={pal.tunic}
            roughness={classType === "paladin" ? 0.3 : 0.8}
            metalness={classType === "paladin" ? 0.7 : 0.1}
          />
        </mesh>

        {/* Belt */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.5, 0.09, 0.32]} />
          <meshStandardMaterial color="#1f1812" roughness={0.9} />
        </mesh>

        {/* ================= HEAD & HAIR/HELMET ================= */}
        <mesh position={[0, 1.34, 0]} castShadow>
          <boxGeometry args={[0.34, 0.36, 0.34]} />
          <meshStandardMaterial color={pal.skin} roughness={0.7} />
        </mesh>

        {/* Class-Specific Headgear / Props */}
        {classType === "goblin" && (
          <>
            {/* Big Pointy Goblin Ears */}
            <mesh position={[-0.24, 1.34, 0]} rotation={[0, 0, 0.5]} castShadow>
              <coneGeometry args={[0.08, 0.28, 4]} />
              <meshStandardMaterial color={pal.skin} roughness={0.7} />
            </mesh>
            <mesh position={[0.24, 1.34, 0]} rotation={[0, 0, -0.5]} castShadow>
              <coneGeometry args={[0.08, 0.28, 4]} />
              <meshStandardMaterial color={pal.skin} roughness={0.7} />
            </mesh>
          </>
        )}

        {classType === "rogue" && (
          /* Leather Cowl / Hood */
          <mesh position={[0, 1.4, -0.04]} castShadow>
            <boxGeometry args={[0.38, 0.34, 0.38]} />
            <meshStandardMaterial color="#1a1b20" roughness={0.9} />
          </mesh>
        )}

        {classType === "mage" && (
          /* Pointy Wizard Hat */
          <group position={[0, 1.54, 0]}>
            <mesh rotation={[-0.1, 0, 0]} castShadow>
              <cylinderGeometry args={[0.34, 0.36, 0.05, 12]} />
              <meshStandardMaterial color="#162340" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.36, -0.05]} rotation={[-0.2, 0, 0]} castShadow>
              <coneGeometry args={[0.22, 0.72, 8]} />
              <meshStandardMaterial color="#1b2b4f" roughness={0.8} />
            </mesh>
          </group>
        )}

        {classType === "paladin" && (
          /* Steel Greathelm */
          <group position={[0, 1.38, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.38, 0.38]} />
              <meshStandardMaterial color="#8898b0" metalness={0.9} roughness={0.25} />
            </mesh>
            {/* Golden Visor Slit */}
            <mesh position={[0, 0.01, 0.2]}>
              <boxGeometry args={[0.26, 0.05, 0.02]} />
              <meshStandardMaterial color="#d4aa33" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        )}

        {/* ================= LEGS ================= */}
        {/* Left Leg */}
        <group position={[-0.14, 0.58, 0]} rotation={leftLegRot}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.56, 0.18]} />
            <meshStandardMaterial color={pal.tunic} roughness={0.8} />
          </mesh>
          {/* Boot */}
          <mesh position={[0, -0.56, 0.04]} castShadow>
            <boxGeometry args={[0.17, 0.14, 0.26]} />
            <meshStandardMaterial color="#1a140f" roughness={0.9} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group position={[0.14, 0.58, 0]} rotation={rightLegRot}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.56, 0.18]} />
            <meshStandardMaterial color={pal.tunic} roughness={0.8} />
          </mesh>
          {/* Boot */}
          <mesh position={[0, -0.56, 0.04]} castShadow>
            <boxGeometry args={[0.17, 0.14, 0.26]} />
            <meshStandardMaterial color="#1a140f" roughness={0.9} />
          </mesh>
        </group>

        {/* ================= ARMS & HELD WEAPONS ================= */}
        {/* Left Arm */}
        <group position={[-0.31, 1.08, 0]} rotation={leftArmRot}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.14, 0.52, 0.16]} />
            <meshStandardMaterial color={pal.tunic} roughness={0.8} />
          </mesh>

          {/* Rogue Left Dagger */}
          {classType === "rogue" && (
            <group position={[0, -0.52, 0.1]} rotation={[1.4, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.04, 0.35, 0.02]} />
                <meshStandardMaterial color="#ccd4e0" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* Paladin Massive Tower Shield */}
          {classType === "paladin" && (
            <group position={[-0.1, -0.2, 0.3]} rotation={[0, 0.2, 0]}>
              {/* Main shield plate */}
              <mesh castShadow>
                <boxGeometry args={[0.72, 1.25, 0.08]} />
                <meshStandardMaterial
                  color="#801c1c"
                  roughness={0.5}
                />
              </mesh>
              {/* Golden trim border */}
              <mesh position={[0, 0, 0.04]}>
                <boxGeometry args={[0.76, 1.29, 0.02]} />
                <meshStandardMaterial color="#d4aa33" metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Golden Boss Emblem in center */}
              <mesh position={[0, 0, 0.07]}>
                <boxGeometry args={[0.24, 0.24, 0.04]} />
                <meshStandardMaterial color="#fff080" metalness={0.95} roughness={0.15} />
              </mesh>
            </group>
          )}
        </group>

        {/* Right Arm */}
        <group position={[0.31, 1.08, 0]} rotation={rightArmRot}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.14, 0.52, 0.16]} />
            <meshStandardMaterial color={pal.tunic} roughness={0.8} />
          </mesh>

          {/* Rogue Right Dagger */}
          {classType === "rogue" && (
            <group position={[0, -0.52, 0.1]} rotation={[1.4, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.04, 0.35, 0.02]} />
                <meshStandardMaterial color="#ccd4e0" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* Mage Wizard Staff with Glowing Crystal Orb */}
          {classType === "mage" && (
            <group position={[0, 0.2, 0.35]} rotation={[0.4, 0, 0]}>
              {/* Wooden shaft */}
              <mesh castShadow>
                <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
                <meshStandardMaterial color="#54361e" roughness={0.9} />
              </mesh>
              {/* Staff head crystal holder */}
              <mesh position={[0, 0.85, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.04, 0.16, 6]} />
                <meshStandardMaterial color="#caa246" metalness={0.9} roughness={0.3} />
              </mesh>
              {/* Cyan Mana Orb */}
              <mesh position={[0, 0.98, 0]}>
                <sphereGeometry args={[0.12, 10, 10]} />
                <meshStandardMaterial
                  color="#55ddff"
                  emissive="#00bbff"
                  emissiveIntensity={2.0}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* Local Mana Light */}
              <pointLight
                position={[0, 1.0, 0]}
                color="#00eeff"
                intensity={1.2}
                distance={3}
              />
            </group>
          )}
        </group>
      </group>
    </group>
  );
};
