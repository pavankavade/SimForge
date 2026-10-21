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
  | "fall"
  | "launch";

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
    skin: "#8bc05e",
    skinShadow: "#5f8a3e",
    tunic: "#5b452b",
    trim: "#a17b43",
    metal: "#a3a8b2",
    accent: "#d9b24a",
    cape: null,
    scale: 0.8,
  },
  rogue: {
    skin: "#e7be94",
    skinShadow: "#c29268",
    tunic: "#3b4054",
    trim: "#747e92",
    metal: "#c3ccda",
    accent: "#caa24e",
    cape: "#232732",
    scale: 1,
  },
  mage: {
    skin: "#e4bd93",
    skinShadow: "#bd9068",
    tunic: "#3c5388",
    trim: "#e0b85e",
    metal: "#e4d29c",
    accent: "#5fe5ff",
    cape: null,
    scale: 1,
  },
  paladin: {
    skin: "#e0b58b",
    skinShadow: "#b88b63",
    tunic: "#962828",
    trim: "#e2b946",
    metal: "#d3dceb",
    accent: "#ffe9a6",
    cape: "#a52a2a",
    scale: 1.06,
  },
} satisfies Record<
  AdventurerClass,
  {
    skin: string;
    skinShadow: string;
    tunic: string;
    trim: string;
    metal: string;
    accent: string;
    cape: string | null;
    scale: number;
  }
>;

const LEATHER = "#3a2a1c";
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

  let leftArmRot: Vec3 = [0, 0, 0.08];
  let rightArmRot: Vec3 = [0, 0, -0.08];
  let leftElbow = -0.14;
  let rightElbow = -0.14;
  let leftLegRot: Vec3 = [0, 0, 0.02];
  let rightLegRot: Vec3 = [0, 0, -0.02];
  let bodyBob = 0;
  let bodyLean = 0;

  if (pose === "walk") {
    const cycle = Math.sin(animFrame * 0.32);
    leftArmRot = [cycle * 0.68, 0, 0.1];
    rightArmRot = [-cycle * 0.68, 0, -0.1];
    leftElbow = -0.2 - Math.abs(cycle) * 0.12;
    rightElbow = -0.2 - Math.abs(cycle) * 0.12;
    leftLegRot = [-cycle * 0.62, 0, 0.02];
    rightLegRot = [cycle * 0.62, 0, -0.02];
    bodyBob = Math.abs(Math.sin(animFrame * 0.32)) * 0.055;
    bodyLean = 0.05;
  } else if (pose === "jump") {
    leftArmRot = [-1.3, 0, -1.0];
    rightArmRot = [-1.3, 0, 1.0];
    leftElbow = -0.4;
    rightElbow = -0.4;
    leftLegRot = [0.7, 0, 0.16];
    rightLegRot = [0.35, 0, -0.16];
    bodyLean = 0.12;
  } else if (pose === "cast") {
    leftArmRot = [-1.7, 0.35, 0.35];
    rightArmRot = [-2.2, -0.25, -0.25];
    leftElbow = -0.7;
    rightElbow = -0.5;
    leftLegRot = [-0.12, 0, 0.1];
    rightLegRot = [0.18, 0, -0.1];
    bodyLean = -0.04;
  } else if (pose === "shield") {
    leftArmRot = [-1.35, 0.7, 0.15];
    rightArmRot = [-0.55, 0.15, -0.35];
    leftElbow = -0.6;
    rightElbow = -0.5;
    leftLegRot = [-0.2, 0, 0.08];
    rightLegRot = [0.3, 0, -0.08];
    bodyLean = 0.06;
  } else if (pose === "fall" || pose === "launch") {
    const flail = Math.sin(animFrame * 0.55);
    leftArmRot = [-1.9 + flail * 0.5, 0, -0.92];
    rightArmRot = [-1.8 - flail * 0.5, 0, 0.92];
    leftElbow = -0.35;
    rightElbow = -0.35;
    leftLegRot = [0.7 - flail * 0.4, 0, 0.25];
    rightLegRot = [0.9 + flail * 0.4, 0, -0.25];
    bodyLean = 0.12;
  } else {
    leftLegRot = [-0.04, 0, 0.03];
    rightLegRot = [0.04, 0, -0.03];
    bodyBob = Math.sin(animFrame * 0.06) * 0.008;
  }

  const capeSway =
    Math.sin(animFrame * 0.26) * 0.05 +
    (pose === "walk" ? 0.12 : 0) +
    (pose === "jump" || pose === "fall" || pose === "launch" ? 0.2 : 0);

  const eyeColor = isGoblin
    ? "#ffe36b"
    : isMage
      ? "#7de9ff"
      : isPaladin
        ? "#bfe4ff"
        : "#f4eee2";

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale * style.scale}
    >
      <group position={[0, bodyBob, 0]} rotation={[bodyLean, 0, 0]}>
        {style.cape ? (
          <mesh
            position={[0, 0.93, -0.2]}
            rotation={[0.12 + capeSway, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.54, 0.92, 0.035]} />
            <meshStandardMaterial
              color={style.cape}
              roughness={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : null}

        <group position={[-0.14, 0.82, 0]} rotation={leftLegRot}>
          <mesh position={[0, -0.19, 0]} castShadow>
            <capsuleGeometry args={[0.082, 0.23, 4, 8]} />
            <meshStandardMaterial
              color={isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.28 : 0.05}
              roughness={isPaladin ? 0.35 : 0.82}
            />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <capsuleGeometry args={[0.072, 0.19, 4, 8]} />
            <meshStandardMaterial
              color={isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.28 : 0.05}
              roughness={isPaladin ? 0.35 : 0.82}
            />
          </mesh>
          <mesh position={[0, -0.62, 0.055]} castShadow>
            <boxGeometry args={[0.17, 0.15, 0.28]} />
            <meshStandardMaterial color={BOOT} roughness={0.9} />
          </mesh>
        </group>

        <group position={[0.14, 0.82, 0]} rotation={rightLegRot}>
          <mesh position={[0, -0.19, 0]} castShadow>
            <capsuleGeometry args={[0.082, 0.23, 4, 8]} />
            <meshStandardMaterial
              color={isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.28 : 0.05}
              roughness={isPaladin ? 0.35 : 0.82}
            />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <capsuleGeometry args={[0.072, 0.19, 4, 8]} />
            <meshStandardMaterial
              color={isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.28 : 0.05}
              roughness={isPaladin ? 0.35 : 0.82}
            />
          </mesh>
          <mesh position={[0, -0.62, 0.055]} castShadow>
            <boxGeometry args={[0.17, 0.15, 0.28]} />
            <meshStandardMaterial color={BOOT} roughness={0.9} />
          </mesh>
        </group>

        {isMage ? (
          <>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.4, 0.68, 12]} />
              <meshStandardMaterial color={style.tunic} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.385, 0.024, 6, 20]} />
              <meshStandardMaterial
                color={style.trim}
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[0, 0.7, 0.19]} castShadow>
              <boxGeometry args={[0.34, 0.32, 0.08]} />
              <meshStandardMaterial color="#344a7c" roughness={0.72} />
            </mesh>
          </>
        ) : null}

        <mesh
          position={[0, 1.08, 0]}
          scale={[1.06, 1, 0.82]}
          castShadow
        >
          <capsuleGeometry args={[0.225, 0.27, 4, 12]} />
          <meshStandardMaterial color={style.tunic} roughness={0.78} />
        </mesh>

        {isPaladin ? (
          <>
            <mesh position={[0, 1.13, 0.105]} castShadow>
              <boxGeometry args={[0.37, 0.34, 0.13]} />
              <meshStandardMaterial
                color={style.metal}
                metalness={0.82}
                roughness={0.28}
              />
            </mesh>
            <mesh position={[0, 1.13, 0.18]}>
              <boxGeometry args={[0.055, 0.25, 0.025]} />
              <meshStandardMaterial
                color={style.trim}
                metalness={0.45}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 1.18, 0.18]}>
              <boxGeometry args={[0.2, 0.05, 0.025]} />
              <meshStandardMaterial
                color={style.trim}
                metalness={0.45}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 0.79, 0]} castShadow scale={[1, 1, 0.82]}>
              <cylinderGeometry args={[0.27, 0.31, 0.17, 10]} />
              <meshStandardMaterial
                color={style.metal}
                metalness={0.3}
                roughness={0.32}
              />
            </mesh>
          </>
        ) : null}

        {isRogue ? (
          <>
            <mesh
              position={[-0.05, 1.1, 0.155]}
              rotation={[0, 0, -0.58]}
            >
              <boxGeometry args={[0.055, 0.46, 0.03]} />
              <meshStandardMaterial color="#6d4a2a" roughness={0.8} />
            </mesh>
            <mesh
              position={[0.07, 1.1, 0.155]}
              rotation={[0, 0, 0.58]}
            >
              <boxGeometry args={[0.055, 0.46, 0.03]} />
              <meshStandardMaterial color="#6d4a2a" roughness={0.8} />
            </mesh>
            <group position={[0.15, 1.12, -0.22]} rotation={[0.15, 0, 0.25]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.065, 0.08, 0.62, 8]} />
                <meshStandardMaterial color={LEATHER} roughness={0.85} />
              </mesh>
              {[-0.12, 0.02, 0.16].map((y, index) => (
                <mesh key={`arrow-${index}`} position={[0, y + 0.27, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.5, 5]} />
                  <meshStandardMaterial color="#b8a07a" roughness={0.7} />
                </mesh>
              ))}
            </group>
          </>
        ) : null}

        {isGoblin ? (
          <mesh position={[0, 1.0, 0.13]} castShadow>
            <boxGeometry args={[0.39, 0.42, 0.12]} />
            <meshStandardMaterial color="#3f3121" roughness={0.88} />
          </mesh>
        ) : null}

        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.49, 0.085, 0.29]} />
          <meshStandardMaterial color={LEATHER} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.8, 0.155]}>
          <boxGeometry args={[0.11, 0.09, 0.035]} />
          <meshStandardMaterial
            color={style.trim}
            metalness={0.3}
            roughness={0.32}
          />
        </mesh>

        <mesh position={[-0.3, 1.32, 0]} castShadow>
          <sphereGeometry args={[isPaladin ? 0.115 : 0.08, 12, 10]} />
          <meshStandardMaterial
            color={isPaladin ? style.metal : style.tunic}
            metalness={isPaladin ? 0.35 : 0.1}
            roughness={isPaladin ? 0.3 : 0.75}
          />
        </mesh>
        <mesh position={[0.3, 1.32, 0]} castShadow>
          <sphereGeometry args={[isPaladin ? 0.115 : 0.08, 12, 10]} />
          <meshStandardMaterial
            color={isPaladin ? style.metal : style.tunic}
            metalness={isPaladin ? 0.35 : 0.1}
            roughness={isPaladin ? 0.3 : 0.75}
          />
        </mesh>

        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.075, 0.09, 0.1, 8]} />
          <meshStandardMaterial color={style.skinShadow} roughness={0.7} />
        </mesh>

        <group position={[0, 1.52, 0]}>
          <mesh castShadow scale={[1, 1.05, 0.96]}>
            <sphereGeometry args={[0.19, 18, 14]} />
            <meshStandardMaterial color={style.skin} roughness={0.62} />
          </mesh>

          <mesh position={[-0.066, 0.028, 0.176]}>
            <sphereGeometry args={[0.019, 8, 8]} />
            <meshStandardMaterial
              color={eyeColor}
              emissive={eyeColor}
              emissiveIntensity={isPaladin ? 3.2 : 1.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0.066, 0.028, 0.176]}>
            <sphereGeometry args={[0.019, 8, 8]} />
            <meshStandardMaterial
              color={eyeColor}
              emissive={eyeColor}
              emissiveIntensity={isPaladin ? 3.2 : 1.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.02, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.028, 0.09, 6]} />
            <meshStandardMaterial color={style.skinShadow} roughness={0.7} />
          </mesh>

          {isGoblin ? (
            <>
              <mesh
                position={[-0.21, 0.04, -0.01]}
                rotation={[0, 0, 1.15]}
                castShadow
              >
                <coneGeometry args={[0.075, 0.3, 5]} />
                <meshStandardMaterial color={style.skin} roughness={0.68} />
              </mesh>
              <mesh
                position={[0.21, 0.04, -0.01]}
                rotation={[0, 0, -1.15]}
                castShadow
              >
                <coneGeometry args={[0.075, 0.3, 5]} />
                <meshStandardMaterial color={style.skin} roughness={0.68} />
              </mesh>
              <mesh position={[0, 0.145, -0.005]} castShadow>
                <cylinderGeometry args={[0.19, 0.215, 0.11, 10]} />
                <meshStandardMaterial
                  color={style.metal}
                  metalness={0.45}
                  roughness={0.42}
                />
              </mesh>
            </>
          ) : null}

          {isRogue ? (
            <>
              <mesh position={[0, 0.085, -0.01]}>
                <sphereGeometry
                  args={[0.216, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial color="#20232e" roughness={0.9} />
              </mesh>
              <mesh position={[0, -0.01, -0.15]} castShadow>
                <boxGeometry args={[0.35, 0.33, 0.09]} />
                <meshStandardMaterial color="#20232e" roughness={0.9} />
              </mesh>
              <mesh position={[-0.185, -0.015, 0]} castShadow>
                <boxGeometry args={[0.06, 0.34, 0.25]} />
                <meshStandardMaterial color="#20232e" roughness={0.9} />
              </mesh>
              <mesh position={[0.185, -0.015, 0]} castShadow>
                <boxGeometry args={[0.06, 0.34, 0.25]} />
                <meshStandardMaterial color="#20232e" roughness={0.9} />
              </mesh>
              <mesh position={[0, -0.095, 0.174]}>
                <boxGeometry args={[0.23, 0.075, 0.035]} />
                <meshStandardMaterial color="#11131a" roughness={0.9} />
              </mesh>
            </>
          ) : null}

          {isMage ? (
            <>
              <mesh position={[0, 0.168, 0]} castShadow>
                <cylinderGeometry args={[0.29, 0.3, 0.035, 16]} />
                <meshStandardMaterial color="#2b3d66" roughness={0.78} />
              </mesh>
              <mesh
                position={[0, 0.41, -0.055]}
                rotation={[-0.16, 0, 0.06]}
                castShadow
              >
                <coneGeometry args={[0.215, 0.54, 10]} />
                <meshStandardMaterial color="#3b5488" roughness={0.72} />
              </mesh>
              <mesh position={[0, 0.188, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.225, 0.022, 6, 18]} />
                <meshStandardMaterial
                  color={style.trim}
                  metalness={0.4}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0, -0.19, 0.11]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.1, 0.3, 7]} />
                <meshStandardMaterial color="#cfd6e4" roughness={0.75} />
              </mesh>
            </>
          ) : null}

          {isPaladin ? (
            <>
              <mesh castShadow scale={[1.08, 1.1, 1.04]}>
                <sphereGeometry args={[0.2, 16, 12]} />
                <meshStandardMaterial
                  color={style.metal}
                  metalness={0.4}
                  roughness={0.24}
                />
              </mesh>
              <mesh position={[0, -0.01, 0.196]}>
                <boxGeometry args={[0.25, 0.07, 0.03]} />
                <meshStandardMaterial color="#141822" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.055, 0.197]}>
                <boxGeometry args={[0.07, 0.18, 0.03]} />
                <meshStandardMaterial color="#141822" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.005, 0.214]}>
                <boxGeometry args={[0.17, 0.02, 0.014]} />
                <meshStandardMaterial
                  color="#c7f0ff"
                  emissive="#62cfff"
                  emissiveIntensity={3.4}
                  roughness={0.2}
                />
              </mesh>
              <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.19, 0.025, 6, 18]} />
                <meshStandardMaterial
                  color={style.trim}
                  metalness={0.45}
                  roughness={0.24}
                />
              </mesh>
              <mesh
                position={[0, 0.27, -0.08]}
                rotation={[-0.42, 0, 0]}
                castShadow
              >
                <coneGeometry args={[0.085, 0.4, 7]} />
                <meshStandardMaterial color="#a32020" roughness={0.8} />
              </mesh>
            </>
          ) : null}
        </group>

        <group position={[-0.31, 1.31, 0]} rotation={leftArmRot}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.066, 0.2, 4, 8]} />
            <meshStandardMaterial
              color={isMage ? style.tunic : isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.3 : 0.05}
              roughness={isPaladin ? 0.32 : 0.78}
            />
          </mesh>
          <group position={[0, -0.34, 0]} rotation={[leftElbow, 0, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.058, 0.17, 4, 8]} />
              <meshStandardMaterial
                color={isPaladin ? style.metal : style.tunic}
                metalness={isPaladin ? 0.3 : 0.05}
                roughness={isPaladin ? 0.32 : 0.8}
              />
            </mesh>
            <mesh position={[0, -0.27, 0]} castShadow>
              <sphereGeometry args={[0.075, 10, 8]} />
              <meshStandardMaterial color={style.skin} roughness={0.65} />
            </mesh>

            {isRogue ? (
              <group position={[0, -0.3, 0.08]} rotation={[0.25, 0, 0.12]}>
                <mesh castShadow>
                  <boxGeometry args={[0.035, 0.27, 0.018]} />
                  <meshStandardMaterial
                    color={style.metal}
                    metalness={0.42}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.024, 0.09, 4]} />
                  <meshStandardMaterial
                    color={style.metal}
                    metalness={0.42}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, 0.16, 0]}>
                  <boxGeometry args={[0.13, 0.028, 0.045]} />
                  <meshStandardMaterial
                    color={style.trim}
                    metalness={0.45}
                    roughness={0.28}
                  />
                </mesh>
                <mesh position={[0, 0.235, 0]}>
                  <cylinderGeometry args={[0.022, 0.022, 0.12, 6]} />
                  <meshStandardMaterial color={LEATHER} roughness={0.8} />
                </mesh>
              </group>
            ) : null}

          </group>
        </group>

        <group position={[0.31, 1.31, 0]} rotation={rightArmRot}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.066, 0.2, 4, 8]} />
            <meshStandardMaterial
              color={isMage ? style.tunic : isPaladin ? style.metal : style.tunic}
              metalness={isPaladin ? 0.3 : 0.05}
              roughness={isPaladin ? 0.32 : 0.78}
            />
          </mesh>
          <group position={[0, -0.34, 0]} rotation={[rightElbow, 0, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.058, 0.17, 4, 8]} />
              <meshStandardMaterial
                color={isPaladin ? style.metal : style.tunic}
                metalness={isPaladin ? 0.3 : 0.05}
                roughness={isPaladin ? 0.32 : 0.8}
              />
            </mesh>
            <mesh position={[0, -0.27, 0]} castShadow>
              <sphereGeometry args={[0.075, 10, 8]} />
              <meshStandardMaterial color={style.skin} roughness={0.65} />
            </mesh>

            {isGoblin ? (
              <group position={[0, -0.31, 0.07]} rotation={[0.2, 0, -0.12]}>
                <mesh castShadow>
                  <boxGeometry args={[0.08, 0.32, 0.025]} />
                  <meshStandardMaterial
                    color="#6d747e"
                    metalness={0.4}
                    roughness={0.48}
                  />
                </mesh>
                <mesh position={[0, -0.19, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.045, 0.11, 4]} />
                  <meshStandardMaterial
                    color="#6d747e"
                    metalness={0.4}
                    roughness={0.48}
                  />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.028, 0.032, 0.2, 6]} />
                  <meshStandardMaterial color={LEATHER} roughness={0.85} />
                </mesh>
              </group>
            ) : null}

            {isRogue ? (
              <group position={[0, -0.3, 0.08]} rotation={[0.25, 0, -0.12]}>
                <mesh castShadow>
                  <boxGeometry args={[0.035, 0.27, 0.018]} />
                  <meshStandardMaterial
                    color={style.metal}
                    metalness={0.42}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.024, 0.09, 4]} />
                  <meshStandardMaterial
                    color={style.metal}
                    metalness={0.42}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, 0.16, 0]}>
                  <boxGeometry args={[0.13, 0.028, 0.045]} />
                  <meshStandardMaterial
                    color={style.trim}
                    metalness={0.45}
                    roughness={0.28}
                  />
                </mesh>
                <mesh position={[0, 0.235, 0]}>
                  <cylinderGeometry args={[0.022, 0.022, 0.12, 6]} />
                  <meshStandardMaterial color={LEATHER} roughness={0.8} />
                </mesh>
              </group>
            ) : null}

            {isMage ? (
              <group position={[0, -0.29, 0.07]} rotation={[0.06, 0, 0.04]}>
                <mesh position={[0, 0.26, 0]} castShadow>
                  <cylinderGeometry args={[0.028, 0.038, 1.62, 8]} />
                  <meshStandardMaterial color="#5a3a21" roughness={0.86} />
                </mesh>
                <mesh position={[0, 1.08, 0]} castShadow>
                  <cylinderGeometry args={[0.085, 0.05, 0.16, 8]} />
                  <meshStandardMaterial
                    color={style.trim}
                    metalness={0.45}
                    roughness={0.25}
                  />
                </mesh>
                <mesh position={[0, 1.23, 0]} castShadow>
                  <sphereGeometry args={[0.135, 16, 12]} />
                  <meshStandardMaterial
                    color={style.accent}
                    emissive={style.accent}
                    emissiveIntensity={2.8}
                    transparent
                    opacity={0.92}
                    roughness={0.15}
                  />
                </mesh>
                <pointLight
                  position={[0, 1.23, 0]}
                  color={style.accent}
                  intensity={2.2}
                  distance={4.2}
                  decay={2}
                />
              </group>
            ) : null}

            {isPaladin ? (
              <group position={[0, -0.3, 0.06]} rotation={[0.12, 0, 0.08]}>
                <mesh position={[0, 0.16, 0]}>
                  <cylinderGeometry args={[0.028, 0.032, 0.15, 6]} />
                  <meshStandardMaterial color={LEATHER} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.27, 0]}>
                  <boxGeometry args={[0.22, 0.04, 0.055]} />
                  <meshStandardMaterial
                    color={style.trim}
                    metalness={0.45}
                    roughness={0.22}
                  />
                </mesh>
                <mesh position={[0, -0.1, 0]} castShadow>
                  <boxGeometry args={[0.065, 0.56, 0.024]} />
                  <meshStandardMaterial
                    color={style.metal}
                    metalness={0.45}
                    roughness={0.14}
                  />
                </mesh>
                <mesh position={[0, -0.42, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.045, 0.16, 4]} />
                  <meshStandardMaterial
                    color="#eef4ff"
                    metalness={0.45}
                    roughness={0.12}
                  />
                </mesh>
              </group>
            ) : null}
          </group>
        </group>

        {isPaladin ? (
          <group position={[-0.4, 0.9, 0.34]} rotation={[0.02, -0.12, 0.04]}>
            <mesh castShadow>
              <boxGeometry args={[0.64, 0.98, 0.075]} />
              <meshStandardMaterial
                color={style.metal}
                metalness={0.35}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0, 0.046]}>
              <boxGeometry args={[0.53, 0.86, 0.05]} />
              <meshStandardMaterial color="#a32424" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.02, 0.075]}>
              <boxGeometry args={[0.065, 0.48, 0.03]} />
              <meshStandardMaterial
                color={style.trim}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.08, 0.075]}>
              <boxGeometry args={[0.34, 0.065, 0.03]} />
              <meshStandardMaterial
                color={style.trim}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, -0.3, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.11, 0.11, 0.035, 12]} />
              <meshStandardMaterial
                color="#fff2b8"
                emissive="#b88628"
                emissiveIntensity={0.9}
                metalness={0.45}
                roughness={0.2}
              />
            </mesh>
            {[
              [-0.26, 0.4],
              [0.26, 0.4],
              [-0.26, -0.4],
              [0.26, -0.4],
            ].map(([x, y]) => (
              <mesh key={`shield-rivet-${x}-${y}`} position={[x, y, 0.078]}>
                <sphereGeometry args={[0.022, 8, 8]} />
                <meshStandardMaterial
                  color={style.trim}
                  metalness={0.5}
                  roughness={0.2}
                />
              </mesh>
            ))}
          </group>
        ) : null}
      </group>
    </group>
  );
};
