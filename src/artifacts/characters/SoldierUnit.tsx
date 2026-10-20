import React from "react";

interface SoldierProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  team?: "attacker" | "defender";
  pose?: "stand" | "climb" | "run" | "push" | "attack";
  headgear?: "helmet" | "topknot";
  animFrame?: number;
}

export const SoldierUnit: React.FC<SoldierProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  team = "attacker",
  pose = "stand",
  headgear = "helmet",
  animFrame = 0,
}) => {
  // Ancient Chinese infantry color palette
  const coatColor = team === "attacker" ? "#d5c49d" : "#7b828a"; // Beige/sand vs Grey defenders
  const vestColor = "#6e251b"; // Dark red/maroon leather cuirass
  const skinColor = "#dfb278";
  const woodColor = "#784c28";
  const pantsColor = "#252628";
  const wrapColor = "#baac8b";
  const shoeColor = "#151516";
  const redTasselColor = "#cc1b14";

  // Limb animation based on animFrame and pose
  let leftArmRot: [number, number, number] = [0, 0, 0];
  let rightArmRot: [number, number, number] = [0, 0, 0];
  let leftLegRot: [number, number, number] = [0, 0, 0];
  let rightLegRot: [number, number, number] = [0, 0, 0];

  if (pose === "climb") {
    const cycle = Math.sin(animFrame * 0.25);
    leftArmRot = [-1.75 + cycle * 0.45, 0, 0.2];
    rightArmRot = [-1.75 - cycle * 0.45, 0, -0.2];
    leftLegRot = [0.45 + cycle * 0.35, 0, 0];
    rightLegRot = [0.45 - cycle * 0.35, 0, 0];
  } else if (pose === "run") {
    const cycle = Math.sin(animFrame * 0.4);
    leftArmRot = [cycle * 0.8, 0, 0.1];
    rightArmRot = [-cycle * 0.8, 0, -0.1];
    leftLegRot = [-cycle * 0.7, 0, 0];
    rightLegRot = [cycle * 0.7, 0, 0];
  } else if (pose === "push") {
    leftArmRot = [-1.4, 0, 0.25];
    rightArmRot = [-1.4, 0, -0.25];
    leftLegRot = [0.35, 0, 0];
    rightLegRot = [-0.35, 0, 0];
  } else if (pose === "stand") {
    // Standing at attention holding spear upright
    leftArmRot = [0.1, 0, 0.1];
    rightArmRot = [-0.55, 0, -0.15];
  }

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* ================= TORSO & ROBE / CUIRASS ================= */}
      {/* Beige Padded Coat */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.48, 0.65, 0.28]} />
        <meshStandardMaterial color={coatColor} roughness={0.8} />
      </mesh>

      {/* Maroon Leather Breast Vest */}
      <mesh position={[0, 0.98, 0.03]} castShadow>
        <boxGeometry args={[0.44, 0.52, 0.26]} />
        <meshStandardMaterial color={vestColor} roughness={0.7} />
      </mesh>
      {/* Brigandine Silver Studs on Chest Cuirass */}
      {[0.82, 0.98, 1.14].map((sy, row) =>
        [-0.14, 0, 0.14].map((sx, col) => (
          <mesh key={`stud-${row}-${col}`} position={[sx, sy, 0.17]}>
            <sphereGeometry args={[0.024, 6, 6]} />
            <meshStandardMaterial color="#e0e3e8" metalness={0.88} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Belt Sash */}
      <mesh position={[0, 0.66, 0.02]}>
        <boxGeometry args={[0.49, 0.12, 0.3]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.85} />
      </mesh>
      {/* Belt Metal Buckle Studs */}
      {[-0.14, 0, 0.14].map((bx, bi) => (
        <mesh key={`bb-${bi}`} position={[bx, 0.66, 0.18]}>
          <cylinderGeometry args={[0.028, 0.028, 0.02, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* Robe Skirt (Flaps) */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.46, 0.24, 0.26]} />
        <meshStandardMaterial color={coatColor} roughness={0.8} />
      </mesh>

      {/* ================= HEAD & HEADDRESS ================= */}
      {/* Face / Head */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[0.26, 0.28, 0.26]} />
        <meshStandardMaterial color={skinColor} roughness={0.65} />
      </mesh>

      {/* Hair (Black hair) */}
      <mesh position={[0, 1.54, -0.04]} castShadow>
        <boxGeometry args={[0.27, 0.16, 0.2]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      {headgear === "topknot" ? (
        /* Traditional Chinese Hair Bun / Topknot with Red Ribbon */
        <group position={[0, 1.62, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.14, 8]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.04, 8]} />
            <meshStandardMaterial color={redTasselColor} />
          </mesh>
        </group>
      ) : (
        /* Traditional Conical Helmet (笠盔) with Red Tassel */
        <group position={[0, 1.58, 0]}>
          {/* Conical Straw / Lacquered Hat Brim & Cone */}
          <mesh castShadow>
            <coneGeometry args={[0.38, 0.16, 18]} />
            <meshStandardMaterial color="#c2ab83" roughness={0.7} />
          </mesh>
          {/* Red Ribbon band around crown */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.26, 0.27, 0.045, 18]} />
            <meshStandardMaterial color={redTasselColor} />
          </mesh>
          {/* Top Brass Finial Socket */}
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.03, 0.038, 0.08, 8]} />
            <meshStandardMaterial color="#d4af37" metalness={0.85} />
          </mesh>
          {/* Protruding Red Pom-Pom / Crest (红缨) */}
          <mesh position={[0, 0.21, 0]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshStandardMaterial color="#e61a10" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* ================= LEFT ARM ================= */}
      <group position={[-0.32, 1.15, 0]} rotation={leftArmRot}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.13, 0.48, 0.13]} />
          <meshStandardMaterial color={coatColor} roughness={0.8} />
        </mesh>
        {/* Wrist Guard */}
        <mesh position={[0, -0.42, 0]}>
          <boxGeometry args={[0.14, 0.12, 0.14]} />
          <meshStandardMaterial color={vestColor} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[0.11, 0.11, 0.11]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* ================= RIGHT ARM & SPEAR ================= */}
      <group position={[0.32, 1.15, 0]} rotation={rightArmRot}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.13, 0.48, 0.13]} />
          <meshStandardMaterial color={coatColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <boxGeometry args={[0.14, 0.12, 0.14]} />
          <meshStandardMaterial color={vestColor} />
        </mesh>
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[0.11, 0.11, 0.11]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>

        {/* Spear (红缨枪) held in right hand */}
        {pose !== "climb" && (
          <group
            position={[0.08, pose === "push" ? -0.4 : 0.2, pose === "push" ? 0.3 : 0.1]}
            rotation={[pose === "push" ? Math.PI / 4 : 0.08, 0, 0]}
          >
            {/* Wooden Spear Shaft */}
            <mesh position={[0, 0.65, 0]} castShadow>
              <cylinderGeometry args={[0.024, 0.024, 2.7, 6]} />
              <meshStandardMaterial color={woodColor} roughness={0.85} />
            </mesh>
            {/* Red Tassel below Spearhead (红缨) */}
            <mesh position={[0, 1.95, 0]}>
              <coneGeometry args={[0.075, 0.18, 8]} />
              <meshStandardMaterial color={redTasselColor} roughness={0.6} />
            </mesh>
            {/* Leaf-shaped Steel Spearhead */}
            <mesh position={[0, 2.18, 0]} castShadow>
              <coneGeometry args={[0.05, 0.32, 4]} />
              <meshStandardMaterial color="#d8dce2" metalness={0.92} roughness={0.2} />
            </mesh>
          </group>
        )}
      </group>

      {/* ================= LEGS ================= */}
      {/* Left Leg */}
      <group position={[-0.14, 0.58, 0]} rotation={leftLegRot}>
        {/* Dark Pants */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.15, 0.44, 0.15]} />
          <meshStandardMaterial color={pantsColor} roughness={0.9} />
        </mesh>
        {/* Puttee Leg Wrap */}
        <mesh position={[0, -0.38, 0]}>
          <boxGeometry args={[0.16, 0.22, 0.16]} />
          <meshStandardMaterial color={wrapColor} roughness={0.85} />
        </mesh>
        {/* Black Shoe */}
        <mesh position={[0, -0.52, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.24]} />
          <meshStandardMaterial color={shoeColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[0.14, 0.58, 0]} rotation={rightLegRot}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.15, 0.44, 0.15]} />
          <meshStandardMaterial color={pantsColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <boxGeometry args={[0.16, 0.22, 0.16]} />
          <meshStandardMaterial color={wrapColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.52, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.24]} />
          <meshStandardMaterial color={shoeColor} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};
