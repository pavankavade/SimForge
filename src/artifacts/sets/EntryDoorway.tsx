import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeMasonry, makeWood } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

interface EntryDoorwayProps {
  /** x of the hall's end wall (the doorway sits here, the corridor runs to -x). */
  x: number;
  z?: number;
  depth?: number;
  ceilingY?: number;
  /** Which way the corridor runs from the hall ("left" = toward -x). */
  side?: "left" | "right";
}

/**
 * A crypt entrance at the end of a hall: a stone arch, a heavy wooden door
 * swung open against the corridor wall, and a short torch-lit corridor
 * beyond, so characters walking in come out of a doorway instead of daylight.
 * Used by the long-form acts (`exitStyle="door"` on the sets).
 */
export const EntryDoorway: React.FC<EntryDoorwayProps> = ({ x, z = -0.6, depth = 3.4, ceilingY = 5.9, side = "left" }) => {
  const frame = useCurrentFrame();
  const stone = useSurface("entry-stone", () => makeMasonry({ rows: 9, cols: 3, base: "#565a6b", baseAlt: "#646879", mortar: "#20222b", seed: 191 }), [1, 3]);
  const wood = useSurface("entry-wood", () => makeWood({ planks: 5, base: "#5a3a20", baseAlt: "#6a4628", seam: "#1e130a", seed: 192 }), [1, 1]);
  const out = side === "left" ? -1 : 1;
  const flicker = 0.85 + 0.15 * Math.sin(frame * 0.31) + 0.05 * Math.cos(frame * 0.77);
  const openH = Math.min(4.4, ceilingY - 1.0);
  const half = depth / 2;
  const stoneMat = (color: string) => (
    <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} normalScale={new THREE.Vector2(0.8, 0.8)} color={color} roughness={0.9} />
  );
  return (
    <group position={[x, 0, z]}>
      {/* Corridor beyond: dark floor, walls and a far wall */}
      <mesh position={[out * 2.2, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, depth]} />
        <meshStandardMaterial color="#2c2a2e" roughness={0.95} />
      </mesh>
      <mesh position={[out * 4.3, ceilingY / 2, 0]} rotation={[0, (-out * Math.PI) / 2, 0]}>
        <planeGeometry args={[depth + 0.4, ceilingY + 0.4]} />
        <meshStandardMaterial color="#141317" roughness={1} />
      </mesh>
      <mesh position={[out * 2.2, ceilingY / 2, -half - 0.05]}>
        <planeGeometry args={[4.6, ceilingY + 0.4]} />
        {stoneMat("#6d6f7c")}
      </mesh>
      {/* Torch inside the corridor */}
      <group position={[out * 1.8, 2.9, -half + 0.15]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.07, 0.5, 7]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.34, 0]} scale={[1, flicker, 1]}>
          <coneGeometry args={[0.13, 0.36, 9]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ff7a1a" emissiveIntensity={2.4} />
        </mesh>
        <GlowSprite position={[0, 0.34, 0.05]} color="#ff9933" size={1.5 * flicker} opacity={0.6} />
        <pointLight position={[0, 0.4, 0.6]} color="#ff9a45" intensity={2.6 * flicker} distance={6} decay={2} />
      </group>

      {/* Stone arch: jambs both sides of the opening, a lintel and a keystone */}
      {[-half + 0.15, half - 0.15].map((jz) => (
        <mesh key={jz} position={[0, ceilingY / 2, jz]} castShadow>
          <boxGeometry args={[0.6, ceilingY, 0.4]} />
          {stoneMat("#a3a8b6")}
        </mesh>
      ))}
      <mesh position={[0, openH + (ceilingY - openH) / 2, 0]} castShadow>
        <boxGeometry args={[0.66, ceilingY - openH, depth]} />
        {stoneMat("#b4b9c6")}
      </mesh>
      <mesh position={[out * -0.02, openH + 0.1, half - 0.1]}>
        <boxGeometry args={[0.7, 0.45, 0.3]} />
        {stoneMat("#c9cdd6")}
      </mesh>

      {/* Door leaf, hinged on the back jamb, swung open into the corridor */}
      <group position={[0, 0, -half + 0.35]} rotation={[0, out * (Math.PI / 2 - 0.35), 0]}>
        <mesh position={[0, openH / 2, 0.85]} castShadow>
          <boxGeometry args={[0.14, openH - 0.1, 1.7]} />
          <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#c49b70" roughness={0.85} />
        </mesh>
        {[0.8, openH - 0.8].map((by) => (
          <mesh key={by} position={[0.08, by, 0.85]}>
            <boxGeometry args={[0.04, 0.14, 1.66]} />
            <meshStandardMaterial color="#2a2c33" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0.1, openH / 2, 1.5]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.13, 0.03, 8, 16]} />
          <meshStandardMaterial color="#c99a3e" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
};
