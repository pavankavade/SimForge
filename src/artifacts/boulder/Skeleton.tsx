import type React from "react";
import type { Vec3 } from "../../engine/types";

interface SkeletonProps {
  /** Keeps the victim's headgear so you can tell who it was. */
  variant: "rogue" | "mage" | "paladin";
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  animFrame?: number;
}

const BONE = "#efe6cf";
const BONE_DARK = "#c9bd9c";

const boneMat = (color = BONE) => <meshStandardMaterial color={color} roughness={0.6} />;

const Limb: React.FC<{ position: Vec3; rotation: Vec3; upper: number; lower: number; bend: number }> = ({
  position,
  rotation,
  upper,
  lower,
  bend,
}) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, -upper / 2, 0]}>
      <cylinderGeometry args={[0.028, 0.024, upper, 6]} />
      {boneMat()}
    </mesh>
    <mesh position={[0, -upper, 0]}>
      <sphereGeometry args={[0.045, 8, 6]} />
      {boneMat(BONE_DARK)}
    </mesh>
    <group position={[0, -upper, 0]} rotation={[bend, 0, 0]}>
      {[-0.018, 0.018].map((dx) => (
        <mesh key={dx} position={[dx, -lower / 2, 0]}>
          <cylinderGeometry args={[0.016, 0.014, lower, 5]} />
          {boneMat()}
        </mesh>
      ))}
      <mesh position={[0, -lower - 0.03, 0.02]}>
        <boxGeometry args={[0.07, 0.05, 0.09]} />
        {boneMat(BONE_DARK)}
      </mesh>
    </group>
  </group>
);

/**
 * Cartoon skeleton matching the AdventurerUnit proportions (feet at the
 * origin, facing +z) so a digested character can be swapped in place.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ variant, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, animFrame = 0 }) => {
  const sway = Math.sin(animFrame * 0.08) * 0.12;
  const jaw = 0.12 + 0.1 * Math.max(0, Math.sin(animFrame * 0.21));
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Spine */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`vert-${i}`} position={[0, 0.94 + i * 0.075, -0.02]}>
          <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
          {boneMat(i % 2 === 0 ? BONE : BONE_DARK)}
        </mesh>
      ))}
      {/* Ribcage */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`rib-${i}`} position={[0, 1.33 - i * 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - i * 0.07, 0.8, 1]}>
          <torusGeometry args={[0.15, 0.018, 6, 18, Math.PI * 1.6]} />
          {boneMat()}
        </mesh>
      ))}
      <mesh position={[0, 1.24, 0.13]}>
        <boxGeometry args={[0.04, 0.24, 0.03]} />
        {boneMat()}
      </mesh>
      {/* Collarbone + pelvis */}
      <mesh position={[0, 1.37, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.46, 6]} />
        {boneMat()}
      </mesh>
      <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.6]}>
        <torusGeometry args={[0.11, 0.035, 6, 14]} />
        {boneMat()}
      </mesh>

      {/* Skull */}
      <group position={[0, 1.58, 0]}>
        <mesh scale={[1, 1.05, 1.05]}>
          <sphereGeometry args={[0.15, 18, 14]} />
          {boneMat()}
        </mesh>
        {[-0.055, 0.055].map((dx) => (
          <mesh key={dx} position={[dx, 0.01, 0.125]}>
            <sphereGeometry args={[0.042, 10, 8]} />
            <meshStandardMaterial color="#1b1712" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, -0.05, 0.145]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.04, 3]} />
          <meshStandardMaterial color="#1b1712" roughness={0.9} />
        </mesh>
        <group position={[0, -0.08, 0.02]} rotation={[jaw, 0, 0]}>
          <mesh position={[0, -0.035, 0.07]}>
            <boxGeometry args={[0.17, 0.05, 0.1]} />
            {boneMat()}
          </mesh>
          {[-0.05, -0.017, 0.017, 0.05].map((dx) => (
            <mesh key={dx} position={[dx, -0.005, 0.115]}>
              <boxGeometry args={[0.025, 0.03, 0.015]} />
              {boneMat("#fffaf0")}
            </mesh>
          ))}
        </group>

        {variant === "mage" ? (
          <>
            <mesh position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.235, 0.245, 0.03, 20]} />
              <meshStandardMaterial color="#37497a" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.33, -0.035]} rotation={[-0.14 + sway * 0.5, 0, 0.05]}>
              <coneGeometry args={[0.17, 0.46, 12]} />
              <meshStandardMaterial color="#4a63a3" roughness={0.86} />
            </mesh>
          </>
        ) : null}
        {variant === "paladin" ? (
          <>
            <mesh position={[0, 0.03, -0.01]} scale={[1.08, 1.0, 1.05]}>
              <sphereGeometry args={[0.165, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
              <meshStandardMaterial color="#c9d4e6" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.22, -0.055]} rotation={[-0.38, 0, 0]}>
              <coneGeometry args={[0.062, 0.28, 8]} />
              <meshStandardMaterial color="#a32020" roughness={0.8} />
            </mesh>
          </>
        ) : null}
        {variant === "rogue" ? (
          <mesh position={[0, 0.06, -0.03]}>
            <sphereGeometry args={[0.175, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.05]} />
            <meshStandardMaterial color="#333a4f" roughness={0.92} />
          </mesh>
        ) : null}
      </group>

      {/* Arms */}
      <Limb position={[-0.24, 1.35, 0]} rotation={[-0.5 + sway, 0, 0.7]} upper={0.3} lower={0.27} bend={-0.6} />
      <Limb position={[0.24, 1.35, 0]} rotation={[-0.4 - sway, 0, -0.75]} upper={0.3} lower={0.27} bend={-0.5} />
      {/* Legs */}
      <Limb position={[-0.1, 0.86, 0]} rotation={[0.3 + sway * 0.5, 0, 0.15]} upper={0.36} lower={0.36} bend={0.5} />
      <Limb position={[0.1, 0.86, 0]} rotation={[-0.2 - sway * 0.5, 0, -0.15]} upper={0.36} lower={0.36} bend={0.35} />
    </group>
  );
};
