import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMetal, makeWood } from "../../engine/textures";

interface HingedTrapdoorProps {
  spawnFrame?: number;
  openFrame?: number;
}

export const HingedTrapdoor: React.FC<HingedTrapdoorProps> = ({
  spawnFrame = 330,
  openFrame,
}) => {
  const frame = useCurrentFrame();

  const plankWood = useSurface(
    "trapdoor-wood",
    () =>
      makeWood({
        planks: 5,
        base: "#6a472a",
        baseAlt: "#7b5533",
        seam: "#241609",
        seed: 41,
      }),
    [2, 1]
  );
  const iron = useSurface(
    "trapdoor-iron",
    () => makeMetal({ base: "#5a6070", seed: 42, roughness: 105 }),
    [3, 1]
  );

  if (frame < spawnFrame) return null;

  // Fly-in drop animation when trapdoor is installed
  const installProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.2)),
    }
  );

  const installOffsetY = (1 - installProgress) * 4;

  // Flap opening rotation (0 = flat closed, Math.PI / 2.2 = dropped open)
  let openAngle = 0;
  if (openFrame !== undefined && frame >= openFrame) {
    openAngle = interpolate(frame, [openFrame, openFrame + 10], [0, Math.PI / 2.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  }

  const flapMaterial = (
    <meshStandardMaterial
      map={plankWood.map}
      normalMap={plankWood.normalMap}
      roughnessMap={plankWood.roughnessMap}
      color="#d8c9b4"
      roughness={0.82}
    />
  );

  return (
    <group position={[0, installOffsetY, 0]}>
      {/* ===== LEFT TRAPDOOR FLAP (Pivots at x = -2.0) ===== */}
      <group position={[-2.0, -0.05, -0.6]}>
        {/* Iron Hinge Bracket */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
          <meshStandardMaterial
            map={iron.map}
            roughnessMap={iron.roughnessMap}
            color="#8d94a4"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        {/* Door flap body rotates around Z axis */}
        <group rotation={[0, 0, -openAngle]}>
          <mesh position={[1.0, -0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.96, 0.16, 3.1]} />
            {flapMaterial}
          </mesh>
          {/* Iron reinforcement straps */}
          {[-1.0, 0, 1.0].map((z, i) => (
            <mesh key={`strap-l-${i}`} position={[1.0, 0.01, z]} castShadow>
              <boxGeometry args={[1.9, 0.03, 0.14]} />
              <meshStandardMaterial
                map={iron.map}
                color="#7f8696"
                metalness={0.8}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* ===== RIGHT TRAPDOOR FLAP (Pivots at x = 2.0) ===== */}
      <group position={[2.0, -0.05, -0.6]}>
        {/* Iron Hinge Bracket */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
          <meshStandardMaterial
            map={iron.map}
            roughnessMap={iron.roughnessMap}
            color="#8d94a4"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        {/* Door flap body rotates around Z axis */}
        <group rotation={[0, 0, openAngle]}>
          <mesh position={[-1.0, -0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.96, 0.16, 3.1]} />
            {flapMaterial}
          </mesh>
          {/* Iron reinforcement straps */}
          {[-1.0, 0, 1.0].map((z, i) => (
            <mesh key={`strap-r-${i}`} position={[-1.0, 0.01, z]} castShadow>
              <boxGeometry args={[1.9, 0.03, 0.14]} />
              <meshStandardMaterial
                map={iron.map}
                color="#7f8696"
                metalness={0.8}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};
