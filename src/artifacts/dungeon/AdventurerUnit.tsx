import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

export type AdventurerClass = "goblin" | "rogue" | "mage" | "paladin";
export type AdventurerPose =
  | "idle"
  | "walk"
  | "jump"
  | "cast"
  | "shield"
  | "shieldWalk"
  | "fall"
  | "launch"
  | "sprawl"
  | "slip"
  | "float"
  | "smash";

interface AdventurerUnitProps {
  classType: AdventurerClass;
  pose?: AdventurerPose;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  animFrame?: number;
}

const STYLES = {
  goblin: {
    skin: "#8fbe63",
    skinShadow: "#5f8442",
    tunic: "#6d5436",
    tunicDark: "#4a3a26",
    trim: "#a67f45",
    metal: "#9aa1ad",
    accent: "#e0b34a",
    cape: null,
    leather: "#5a422b",
    scale: 0.78,
  },
  rogue: {
    skin: "#e2b78f",
    skinShadow: "#bd8f66",
    tunic: "#4a5470",
    tunicDark: "#333a4f",
    trim: "#6f7b90",
    metal: "#c6d0de",
    accent: "#c9a24e",
    cape: "#20232d",
    leather: "#4a3724",
    scale: 1,
  },
  mage: {
    skin: "#e0b890",
    skinShadow: "#b98c64",
    tunic: "#4a63a3",
    tunicDark: "#37497a",
    trim: "#e0b85e",
    metal: "#e4d29c",
    accent: "#5fe5ff",
    cape: null,
    leather: "#33261a",
    scale: 1,
  },
  paladin: {
    skin: "#dcb086",
    skinShadow: "#b4875f",
    tunic: "#a82f2f",
    tunicDark: "#821f1f",
    trim: "#e2b946",
    metal: "#c9d4e6",
    accent: "#ffe9a6",
    cape: "#9c2727",
    leather: "#33251a",
    scale: 1.04,
  },
} satisfies Record<
  AdventurerClass,
  {
    skin: string;
    skinShadow: string;
    tunic: string;
    tunicDark: string;
    trim: string;
    metal: string;
    accent: string;
    cape: string | null;
    leather: string;
    scale: number;
  }
>;

const BOOT = "#1b1612";

export const AdventurerUnit: React.FC<AdventurerUnitProps> = ({
  classType,
  pose = "idle",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animFrame = 0,
}) => {
  const style = STYLES[classType];
  const isGoblin = classType === "goblin";
  const isRogue = classType === "rogue";
  const isMage = classType === "mage";
  const isPaladin = classType === "paladin";

  // ---- Pose rig -----------------------------------------------------------
  let leftArmRot: Vec3 = [0.1, 0, 0.06];
  let rightArmRot: Vec3 = [0.1, 0, -0.06];
  let leftElbow = -0.18;
  let rightElbow = -0.18;
  let leftLegRot: Vec3 = [0, 0, 0.03];
  let rightLegRot: Vec3 = [0, 0, -0.03];
  let leftKnee = 0.05;
  let rightKnee = 0.05;
  let bodyBob = 0;
  let bodyLean = 0;

  if (pose === "walk") {
    const cycle = Math.sin(animFrame * 0.32);
    leftArmRot = [cycle * 0.62, 0, 0.09];
    rightArmRot = [-cycle * 0.62, 0, -0.09];
    leftElbow = -0.22 - Math.abs(cycle) * 0.14;
    rightElbow = -0.22 - Math.abs(cycle) * 0.14;
    leftLegRot = [-cycle * 0.58, 0, 0.02];
    rightLegRot = [cycle * 0.58, 0, -0.02];
    leftKnee = Math.max(0, -cycle) * 0.8 + 0.06;
    rightKnee = Math.max(0, cycle) * 0.8 + 0.06;
    bodyBob = Math.abs(Math.sin(animFrame * 0.32)) * 0.05;
    bodyLean = 0.05;
  } else if (pose === "jump") {
    // Arms swept back, lead leg tucked: reads as a leap, not a T-pose.
    leftArmRot = [0.85, 0.1, -0.42];
    rightArmRot = [0.95, -0.1, 0.42];
    leftElbow = -0.55;
    rightElbow = -0.45;
    leftLegRot = [-0.75, 0, 0.1];
    rightLegRot = [0.5, 0, -0.1];
    leftKnee = 1.15;
    rightKnee = 0.35;
    bodyLean = 0.16;
  } else if (pose === "cast") {
    leftArmRot = [-1.45, 0.3, 0.5];
    rightArmRot = [-2.35, -0.2, -0.15];
    leftElbow = -0.75;
    rightElbow = -0.35;
    leftLegRot = [-0.16, 0, 0.1];
    rightLegRot = [0.22, 0, -0.1];
    leftKnee = 0.12;
    rightKnee = 0.2;
    bodyLean = -0.05;
  } else if (pose === "shield") {
    leftArmRot = [-1.5, 0.55, 0.5];
    rightArmRot = [-0.45, 0.1, -0.3];
    leftElbow = -1.0;
    rightElbow = -0.55;
    leftLegRot = [-0.28, 0, 0.1];
    rightLegRot = [0.34, 0, -0.1];
    leftKnee = 0.3;
    rightKnee = 0.22;
    bodyLean = 0.08;
  } else if (pose === "shieldWalk") {
    // Shield braced forward while trudging on.
    const cycle = Math.sin(animFrame * 0.26);
    leftArmRot = [-1.5, 0.55, 0.5];
    rightArmRot = [-0.45 + cycle * 0.15, 0.1, -0.3];
    leftElbow = -1.0;
    rightElbow = -0.55;
    leftLegRot = [-cycle * 0.5, 0, 0.06];
    rightLegRot = [cycle * 0.5, 0, -0.06];
    leftKnee = Math.max(0, -cycle) * 0.7 + 0.12;
    rightKnee = Math.max(0, cycle) * 0.7 + 0.12;
    bodyBob = Math.abs(cycle) * 0.035;
    bodyLean = 0.14;
  } else if (pose === "sprawl") {
    // Limp, splayed body lying where it landed.
    leftArmRot = [-0.4, 0, 1.25];
    rightArmRot = [0.3, 0, -1.1];
    leftElbow = -0.25;
    rightElbow = -0.6;
    leftLegRot = [0.15, 0, 0.35];
    rightLegRot = [-0.25, 0, -0.28];
    leftKnee = 0.2;
    rightKnee = 0.5;
  } else if (pose === "fall" || pose === "launch") {
    const flail = Math.sin(animFrame * 0.55);
    leftArmRot = [-2.2 + flail * 0.45, 0, -0.75];
    rightArmRot = [-2.05 - flail * 0.45, 0, 0.75];
    leftElbow = -0.5;
    rightElbow = -0.5;
    leftLegRot = [0.65 - flail * 0.35, 0, 0.22];
    rightLegRot = [0.95 + flail * 0.35, 0, -0.22];
    leftKnee = 0.75;
    rightKnee = 1.0;
    bodyLean = 0.1;
  } else if (pose === "slip") {
    // Comical banana-peel slip backward on slime
    leftArmRot = [-2.1, 0, 0.65];
    rightArmRot = [-2.05, 0, -0.65];
    leftElbow = -0.4;
    rightElbow = -0.4;
    leftLegRot = [-1.35, 0, 0.15];
    rightLegRot = [-1.15, 0, -0.15];
    leftKnee = 0.3;
    rightKnee = 0.5;
    bodyLean = -0.55;
    bodyBob = -0.18;
  } else if (pose === "float") {
    // Levitating gently near rafters
    const floatBob = Math.sin(animFrame * 0.16);
    leftArmRot = [-0.5, 0, 0.7];
    rightArmRot = [-0.5, 0, -0.7];
    leftElbow = -0.35;
    rightElbow = -0.35;
    leftLegRot = [0.25 + floatBob * 0.12, 0, 0.1];
    rightLegRot = [-0.1 - floatBob * 0.12, 0, -0.1];
    leftKnee = 0.45;
    rightKnee = 0.3;
    bodyBob = floatBob * 0.12;
    bodyLean = 0.04;
  } else if (pose === "smash") {
    // Heavy Paladin warhammer stance
    leftArmRot = [-1.6, 0.35, 0.2];
    rightArmRot = [-1.6, -0.35, -0.2];
    leftElbow = -0.85;
    rightElbow = -0.85;
    leftLegRot = [-0.45, 0, 0.2];
    rightLegRot = [0.65, 0, -0.2];
    leftKnee = 0.5;
    rightKnee = 0.4;
    bodyLean = 0.32;
  } else {
    leftLegRot = [-0.05, 0, 0.035];
    rightLegRot = [0.05, 0, -0.035];
    bodyBob = Math.sin(animFrame * 0.06) * 0.007;
  }

  const capeSway =
    Math.sin(animFrame * 0.26) * 0.05 +
    (pose === "walk" ? 0.12 : 0) +
    (pose === "jump" || pose === "fall" || pose === "launch" ? 0.22 : 0);

  const eyeColor = isGoblin
    ? "#ffe36b"
    : isMage
      ? "#7de9ff"
      : isPaladin
        ? "#bfe4ff"
        : "#f4eee2";

  const clothMat = (color: string, roughness = 0.86) => (
    <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} />
  );

  const leatherMat = (color: string) => (
    <meshStandardMaterial color={color} roughness={0.68} metalness={0.05} />
  );

  const metalMat = (
    color: string,
    roughness = 0.3,
    metalness = 0.82
  ) => (
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
  );

  const legMaterialColor = isPaladin ? style.metal : style.tunicDark;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale * style.scale}
    >
      <group position={[0, bodyBob, 0]} rotation={[bodyLean, 0, 0]}>
        {style.cape ? (
          <mesh
            position={[0, 0.95, -0.17]}
            rotation={[0.14 + capeSway, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.44, 0.86, 0.03]} />
            <meshStandardMaterial
              color={style.cape}
              roughness={0.94}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : null}

        {/* ---------------------------- Legs ---------------------------- */}
        {([-1, 1] as const).map((side) => {
          const legRot = side === -1 ? leftLegRot : rightLegRot;
          const knee = side === -1 ? leftKnee : rightKnee;
          return (
            <group
              key={`leg-${side}`}
              position={[side * 0.105, 0.86, 0]}
              rotation={legRot}
            >
              {/* thigh */}
              <mesh position={[0, -0.17, 0]} castShadow>
                <capsuleGeometry args={[0.073, 0.18, 4, 10]} />
                {isPaladin ? metalMat(style.metal, 0.34) : leatherMat(legMaterialColor)}
              </mesh>
              {/* knee */}
              <mesh position={[0, -0.33, 0.005]} castShadow>
                <sphereGeometry args={[0.068, 12, 10]} />
                {isPaladin ? metalMat(style.metal, 0.3) : leatherMat(style.tunicDark)}
              </mesh>
              <group position={[0, -0.34, 0]} rotation={[knee, 0, 0]}>
                {/* shin */}
                <mesh position={[0, -0.15, 0]} castShadow>
                  <capsuleGeometry args={[0.062, 0.17, 4, 10]} />
                  {isPaladin ? metalMat(style.metal, 0.34) : leatherMat(legMaterialColor)}
                </mesh>
                {/* boot */}
                <mesh position={[0, -0.31, 0.045]} castShadow>
                  <boxGeometry args={[0.155, 0.13, 0.255]} />
                  {leatherMat(BOOT)}
                </mesh>
                <mesh position={[0, -0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.09, 0.085, 0.13, 10]} />
                  {isPaladin ? metalMat(style.metal, 0.3) : leatherMat(style.leather)}
                </mesh>
              </group>
            </group>
          );
        })}

        {/* ---------------------------- Pelvis --------------------------- */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.19]} />
          {isPaladin ? metalMat(style.metal, 0.34) : leatherMat(style.tunicDark)}
        </mesh>

        {/* Belt */}
        <mesh position={[0, 0.99, 0]} castShadow>
          <boxGeometry args={[0.31, 0.065, 0.22]} />
          {leatherMat(style.leather)}
        </mesh>
        <mesh position={[0, 0.99, 0.115]}>
          <boxGeometry args={[0.075, 0.075, 0.025]} />
          {metalMat(style.trim, 0.28)}
        </mesh>

        {/* ---------------------------- Torso ---------------------------- */}
        {isMage ? (
          <>
            {/* Robe skirt */}
            <mesh position={[0, 0.63, 0]} castShadow>
              <cylinderGeometry args={[0.19, 0.36, 0.62, 14]} />
              {clothMat(style.tunic)}
            </mesh>
            <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.355, 0.022, 6, 24]} />
              {metalMat(style.trim, 0.3, 0.55)}
            </mesh>
          </>
        ) : null}

        <mesh position={[0, 1.18, 0]} castShadow>
          <cylinderGeometry args={[0.225, 0.185, 0.46, 14]} />
          {isPaladin ? metalMat(style.tunic, 0.4, 0.55) : clothMat(style.tunic)}
        </mesh>

        {isPaladin ? (
          <>
            {/* Breastplate */}
            <mesh position={[0, 1.2, 0.075]} castShadow>
              <boxGeometry args={[0.36, 0.34, 0.16]} />
              {metalMat(style.metal, 0.26, 0.9)}
            </mesh>
            <mesh position={[0, 1.2, 0.158]}>
              <boxGeometry args={[0.05, 0.26, 0.02]} />
              {metalMat(style.trim, 0.22, 0.6)}
            </mesh>
            <mesh position={[0, 1.26, 0.158]}>
              <boxGeometry args={[0.19, 0.045, 0.02]} />
              {metalMat(style.trim, 0.22, 0.6)}
            </mesh>
          </>
        ) : null}

        {isRogue ? (
          <>
            {/* Crossed chest straps */}
            {[-1, 1].map((side) => (
              <mesh
                key={`strap-${side}`}
                position={[side * 0.03, 1.2, 0.16]}
                rotation={[0, 0, side * 0.62]}
              >
                <boxGeometry args={[0.045, 0.42, 0.025]} />
                {leatherMat(style.leather)}
              </mesh>
            ))}
            <mesh position={[0, 1.06, 0.17]}>
              <boxGeometry args={[0.13, 0.1, 0.04]} />
              {leatherMat(style.leather)}
            </mesh>
          </>
        ) : null}

        {isGoblin ? (
          <>
            {/* Leather vest and shoulder rag */}
            <mesh position={[0, 1.16, 0.135]} castShadow>
              <boxGeometry args={[0.34, 0.34, 0.1]} />
              {leatherMat(style.leather)}
            </mesh>
            <mesh position={[0, 1.02, 0.1]} rotation={[0.1, 0, 0.2]}>
              <boxGeometry args={[0.4, 0.12, 0.22]} />
              {clothMat(style.tunicDark)}
            </mesh>
          </>
        ) : null}

        {/* Shoulders */}
        {([-1, 1] as const).map((side) => (
          <mesh
            key={`shoulder-${side}`}
            position={[side * 0.235, 1.345, 0]}
            castShadow
          >
            <sphereGeometry
              args={[isPaladin ? 0.105 : 0.078, 14, 12]}
            />
            {isPaladin
              ? metalMat(style.metal, 0.24, 0.9)
              : isMage
                ? clothMat(style.tunic)
                : leatherMat(style.tunicDark)}
          </mesh>
        ))}

        {/* Paladin pauldrons */}
        {isPaladin
          ? ([-1, 1] as const).map((side) => (
              <mesh
                key={`pauldron-${side}`}
                position={[side * 0.25, 1.36, 0]}
                rotation={[0, 0, side * 0.32]}
                scale={[1, 0.62, 1]}
                castShadow
              >
                <sphereGeometry
                  args={[0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56]}
                />
                {metalMat(style.metal, 0.28, 0.85)}
              </mesh>
            ))
          : null}

        {/* ---------------------------- Neck / Head ----------------------- */}
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[0.058, 0.07, 0.09, 10]} />
          {clothMat(style.skinShadow, 0.75)}
        </mesh>

        <group position={[0, 1.575, 0]}>
          <mesh castShadow scale={[1, 1.06, 0.96]}>
            <sphereGeometry args={[0.152, 24, 18]} />
            <meshStandardMaterial color={style.skin} roughness={0.62} />
          </mesh>

          {/* Brow / cheek shaping */}
          <mesh position={[0, 0.035, 0.132]} scale={[1, 0.42, 0.4]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color={style.skinShadow} roughness={0.66} />
          </mesh>

          <mesh position={[-0.055, 0.028, 0.138]}>
            <sphereGeometry args={[0.017, 10, 10]} />
            <meshStandardMaterial
              color={eyeColor}
              emissive={eyeColor}
              emissiveIntensity={isPaladin ? 3.0 : 1.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0.055, 0.028, 0.138]}>
            <sphereGeometry args={[0.017, 10, 10]} />
            <meshStandardMaterial
              color={eyeColor}
              emissive={eyeColor}
              emissiveIntensity={isPaladin ? 3.0 : 1.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.018, 0.147]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.024, 0.07, 7]} />
            <meshStandardMaterial color={style.skinShadow} roughness={0.7} />
          </mesh>

          {/* Goblin ears */}
          {isGoblin ? (
            <>
              <mesh position={[-0.175, 0.045, -0.01]} rotation={[0, 0, 1.22]} castShadow>
                <coneGeometry args={[0.052, 0.22, 6]} />
                <meshStandardMaterial color={style.skin} roughness={0.68} />
              </mesh>
              <mesh position={[0.175, 0.045, -0.01]} rotation={[0, 0, -1.22]} castShadow>
                <coneGeometry args={[0.052, 0.22, 6]} />
                <meshStandardMaterial color={style.skin} roughness={0.68} />
              </mesh>
              <mesh position={[0, 0.13, -0.005]} castShadow>
                <cylinderGeometry args={[0.152, 0.172, 0.09, 12]} />
                {metalMat("#5e6572", 0.62, 0.25)}
              </mesh>
            </>
          ) : null}

          {/* Rogue hood + mask */}
          {isRogue ? (
            <>
              <mesh position={[0, 0.075, -0.004]}>
                <sphereGeometry
                  args={[0.176, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2.05]}
                />
                {clothMat(style.tunicDark, 0.92)}
              </mesh>
              <mesh position={[0, -0.035, -0.12]} castShadow>
                <boxGeometry args={[0.29, 0.32, 0.1]} />
                {clothMat(style.tunicDark, 0.92)}
              </mesh>
              <mesh position={[-0.15, -0.02, 0]} castShadow>
                <boxGeometry args={[0.055, 0.28, 0.2]} />
                {clothMat(style.tunicDark, 0.92)}
              </mesh>
              <mesh position={[0.15, -0.02, 0]} castShadow>
                <boxGeometry args={[0.055, 0.28, 0.2]} />
                {clothMat(style.tunicDark, 0.92)}
              </mesh>
              <mesh position={[0, -0.075, 0.133]}>
                <boxGeometry args={[0.2, 0.07, 0.03]} />
                <meshStandardMaterial color="#15171f" roughness={0.9} />
              </mesh>
            </>
          ) : null}

          {/* Mage hat */}
          {isMage ? (
            <>
              <mesh position={[0, 0.132, 0]} castShadow>
                <cylinderGeometry args={[0.235, 0.245, 0.03, 20]} />
                {clothMat(style.tunicDark)}
              </mesh>
              <mesh
                position={[0, 0.33, -0.035]}
                rotation={[-0.14, 0, 0.05]}
                castShadow
              >
                <coneGeometry args={[0.17, 0.46, 12]} />
                {clothMat(style.tunic)}
              </mesh>
              <mesh position={[0, 0.148, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.196, 0.018, 6, 22]} />
                {metalMat(style.trim, 0.28, 0.6)}
              </mesh>
            </>
          ) : null}

          {/* Paladin great helm */}
          {isPaladin ? (
            <>
              <mesh castShadow scale={[1.06, 1.1, 1.03]}>
                <sphereGeometry args={[0.158, 20, 16]} />
                {metalMat(style.metal, 0.24, 0.9)}
              </mesh>
              <mesh position={[0, -0.012, 0.152]}>
                <boxGeometry args={[0.2, 0.045, 0.03]} />
                <meshStandardMaterial color="#10131b" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.05, 0.153]}>
                <boxGeometry args={[0.05, 0.14, 0.03]} />
                <meshStandardMaterial color="#10131b" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.0, 0.166]}>
                <boxGeometry args={[0.13, 0.016, 0.014]} />
                <meshStandardMaterial
                  color="#c7f0ff"
                  emissive="#62cfff"
                  emissiveIntensity={3.0}
                  roughness={0.2}
                />
              </mesh>
              <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.02, 6, 20]} />
                {metalMat(style.trim, 0.24, 0.85)}
              </mesh>
              <mesh position={[0, 0.2, -0.055]} rotation={[-0.38, 0, 0]} castShadow>
                <coneGeometry args={[0.062, 0.28, 8]} />
                <meshStandardMaterial color="#a32020" roughness={0.8} />
              </mesh>
            </>
          ) : null}
        </group>

        {/* ---------------------------- Arms ----------------------------- */}
        {([-1, 1] as const).map((side) => {
          const armRot = side === -1 ? leftArmRot : rightArmRot;
          const elbow = side === -1 ? leftElbow : rightElbow;
          return (
            <group
              key={`arm-${side}`}
              position={[side * 0.245, 1.345, 0]}
              rotation={armRot}
            >
              {/* Upper arm */}
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.062, 0.16, 4, 10]} />
                {isPaladin
                  ? metalMat(style.metal, 0.32)
                  : isMage
                    ? clothMat(style.tunic)
                    : clothMat(style.tunicDark)}
              </mesh>

              <group position={[0, -0.29, 0]} rotation={[elbow, 0, 0]}>
                {/* Forearm */}
                <mesh position={[0, -0.13, 0]} castShadow>
                  <capsuleGeometry args={[0.052, 0.14, 4, 10]} />
                  {isPaladin
                    ? metalMat(style.metal, 0.32)
                    : isGoblin
                      ? clothMat(style.skin, 0.8)
                      : isMage
                        ? clothMat(style.tunic)
                        : leatherMat(style.leather)}
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.255, 0.01]} castShadow>
                  <boxGeometry args={[0.068, 0.085, 0.055]} />
                  <meshStandardMaterial color={style.skin} roughness={0.66} />
                </mesh>

                {/* === Class-specific weapons / props === */}
                {isRogue ? (
                  <group position={[0, -0.28, 0.055]} rotation={[0.22, 0, side * 0.1]}>
                    <mesh castShadow>
                      <boxGeometry args={[0.028, 0.24, 0.014]} />
                      {metalMat(style.metal, 0.18, 0.9)}
                    </mesh>
                    <mesh position={[0, -0.155, 0]} rotation={[Math.PI, 0, 0]}>
                      <coneGeometry args={[0.02, 0.075, 4]} />
                      {metalMat(style.metal, 0.18, 0.9)}
                    </mesh>
                    <mesh position={[0, 0.135, 0]}>
                      <boxGeometry args={[0.1, 0.022, 0.035]} />
                      {metalMat(style.trim, 0.26, 0.6)}
                    </mesh>
                    <mesh position={[0, 0.2, 0]}>
                      <cylinderGeometry args={[0.017, 0.017, 0.1, 8]} />
                      {leatherMat(style.leather)}
                    </mesh>
                  </group>
                ) : null}

                {isGoblin && side === 1 ? (
                  <group position={[0, -0.3, 0.05]} rotation={[0.15, 0, -0.08]}>
                    <mesh castShadow>
                      <boxGeometry args={[0.065, 0.28, 0.022]} />
                      {metalMat(style.metal, 0.5, 0.4)}
                    </mesh>
                    <mesh position={[0, -0.17, 0]} rotation={[Math.PI, 0, 0]}>
                      <coneGeometry args={[0.036, 0.09, 4]} />
                      {metalMat(style.metal, 0.5, 0.4)}
                    </mesh>
                    <mesh position={[0, 0.18, 0]}>
                      <cylinderGeometry args={[0.024, 0.028, 0.18, 7]} />
                      {leatherMat(style.leather)}
                    </mesh>
                  </group>
                ) : null}

                {isMage && side === 1 ? (
                  <group position={[0, -0.24, 0.06]} rotation={[0.05, 0, 0.03]}>
                    <mesh position={[0, 0.22, 0]} castShadow>
                      <cylinderGeometry args={[0.026, 0.034, 1.5, 10]} />
                      {leatherMat("#3f2a18")}
                    </mesh>
                    <mesh position={[0, 1.0, 0]} castShadow>
                      <cylinderGeometry args={[0.075, 0.045, 0.14, 10]} />
                      {metalMat(style.trim, 0.25, 0.7)}
                    </mesh>
                    <mesh position={[0, 1.14, 0]} castShadow>
                      <sphereGeometry args={[0.115, 18, 14]} />
                      <meshStandardMaterial
                        color="#a8f6ff"
                        emissive="#2fd4ff"
                        emissiveIntensity={1.35}
                        transparent
                        opacity={0.9}
                        roughness={0.15}
                      />
                    </mesh>
                    <pointLight
                      position={[0, 1.14, 0]}
                      color={style.accent}
                      intensity={2.4}
                      distance={4.2}
                      decay={2}
                    />
                  </group>
                ) : null}

                {isPaladin && side === 1 ? (
                  <group position={[0, -0.28, 0.05]} rotation={[0.12, 0, 0.06]}>
                    <mesh position={[0, 0.14, 0]}>
                      <cylinderGeometry args={[0.026, 0.03, 0.13, 8]} />
                      {leatherMat(style.leather)}
                    </mesh>
                    <mesh position={[0, 0.24, 0]}>
                      <boxGeometry args={[0.2, 0.035, 0.05]} />
                      {metalMat(style.trim, 0.22, 0.6)}
                    </mesh>
                    <mesh position={[0, -0.05, 0]} castShadow>
                      <boxGeometry args={[0.055, 0.5, 0.02]} />
                      {metalMat(style.metal, 0.14, 0.95)}
                    </mesh>
                    <mesh position={[0, -0.33, 0]} rotation={[Math.PI, 0, 0]}>
                      <coneGeometry args={[0.038, 0.14, 4]} />
                      {metalMat("#eef4ff", 0.12, 0.95)}
                    </mesh>
                  </group>
                ) : null}
              </group>
            </group>
          );
        })}

        {/* Rogue quiver */}
        {isRogue ? (
          <group position={[0.13, 1.15, -0.19]} rotation={[0.16, 0, 0.28]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.058, 0.072, 0.54, 10]} />
              {leatherMat(style.leather)}
            </mesh>
            {[-0.1, 0.02, 0.14].map((y, index) => (
              <mesh key={`arrow-${index}`} position={[0, y + 0.24, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.44, 5]} />
                <meshStandardMaterial color="#b8a07a" roughness={0.7} />
              </mesh>
            ))}
          </group>
        ) : null}

        {/* Paladin tower shield */}
        {isPaladin ? (
          <group position={[-0.42, 0.94, 0.3]} rotation={[0.02, -0.14, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.56, 0.86, 0.06]} />
              {metalMat(style.metal, 0.28, 0.62)}
            </mesh>
            <mesh position={[0, 0, 0.042]}>
              <boxGeometry args={[0.46, 0.75, 0.04]} />
              <meshStandardMaterial color="#a32424" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.06, 0.066]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.24, 0.24, 0.025]} />
              {metalMat(style.trim, 0.2, 0.65)}
            </mesh>
            <mesh position={[0, 0.06, 0.08]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.13, 0.13, 0.02]} />
              <meshStandardMaterial color="#a32424" roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.26, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.095, 0.095, 0.03, 14]} />
              <meshStandardMaterial
                color="#fff2b8"
                emissive="#b88628"
                emissiveIntensity={0.8}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            {[
              [-0.23, 0.36],
              [0.23, 0.36],
              [-0.23, -0.36],
              [0.23, -0.36],
            ].map(([x, y]) => (
              <mesh key={`rivet-${x}-${y}`} position={[x, y, 0.07]}>
                <sphereGeometry args={[0.019, 10, 10]} />
                {metalMat(style.trim, 0.2, 0.7)}
              </mesh>
            ))}
          </group>
        ) : null}
      </group>
    </group>
  );
};
