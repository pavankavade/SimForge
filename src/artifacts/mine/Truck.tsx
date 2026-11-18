import type React from "react";
import { GlowSprite } from "../dungeon";
import { Block } from "./common";

/**
 * A mine pickup: crew cab, flat bed with a rack, chunky tyres, an orange beacon and a whip flag.
 * Local origin on the ground under its middle; it faces -x (downhill on the ramp). `roll` turns
 * the wheels (radians), `lights` 0..1 lights the headlamps.
 */
export const Truck: React.FC<{ color?: string; roll?: number; lights?: number; beacon?: number }> = ({ color = "#d9dcdd", roll = 0, lights = 1, beacon = 0 }) => {
  const paint = { color, roughness: 0.42, metalness: 0.35 };
  const dark = { color: "#22262b", roughness: 0.6, metalness: 0.3 };
  return (
    <group>
      {/* Chassis. */}
      <Block min={[-2.3, 0.42, -0.86]} max={[2.3, 0.6, 0.86]} {...dark} />
      {/* Bonnet, cab, bed. */}
      <Block min={[-2.35, 0.6, -0.9]} max={[-1.25, 1.12, 0.9]} {...paint} />
      <Block min={[-1.25, 0.6, -0.9]} max={[0.45, 1.2, 0.9]} {...paint} />
      <Block min={[-1.05, 1.2, -0.84]} max={[0.4, 1.86, 0.84]} {...paint} />
      <Block min={[0.5, 0.6, -0.9]} max={[2.35, 1.14, 0.9]} {...paint} />
      <Block min={[0.58, 0.9, -0.82]} max={[2.27, 1.15, 0.82]} color="#3a3d42" roughness={0.8} castShadow={false} />
      {/* Windscreen (raked) and side windows. */}
      <mesh position={[-1.08, 1.52, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.06, 0.6, 1.56]} />
        <meshStandardMaterial color="#1c2630" roughness={0.15} metalness={0.6} />
      </mesh>
      {[-0.845, 0.845].map((z) => (
        <group key={z}>
          <Block min={[-0.9, 1.3, z - 0.004]} max={[-0.28, 1.76, z + 0.004]} color="#1c2630" roughness={0.15} metalness={0.6} castShadow={false} />
          <Block min={[-0.2, 1.3, z - 0.004]} max={[0.32, 1.76, z + 0.004]} color="#1c2630" roughness={0.15} metalness={0.6} castShadow={false} />
          {/* Reflective stripe along the side. */}
          <Block min={[-2.2, 0.82, z + (z > 0 ? 0.056 : -0.06)]} max={[2.3, 0.94, z + (z > 0 ? 0.06 : -0.056)]} color="#f2b21c" roughness={0.5} castShadow={false} />
        </group>
      ))}
      {/* Bumper, grille, headlamps. */}
      <Block min={[-2.48, 0.42, -0.92]} max={[-2.33, 0.68, 0.92]} {...dark} />
      <Block min={[-2.37, 0.72, -0.5]} max={[-2.345, 1.02, 0.5]} color="#15171a" roughness={0.7} castShadow={false} />
      {[-0.68, 0.68].map((z) => (
        <group key={z}>
          <mesh position={[-2.36, 0.9, z]}>
            <boxGeometry args={[0.03, 0.17, 0.26]} />
            <meshStandardMaterial color="#fff7dc" emissive="#fff0c0" emissiveIntensity={2.4 * lights} toneMapped={false} />
          </mesh>
          {lights > 0.05 && <GlowSprite position={[-2.5, 0.9, z]} color="#fff0c0" size={1.5} opacity={0.55 * lights} />}
          <mesh position={[2.36, 0.9, z]}>
            <boxGeometry args={[0.03, 0.14, 0.2]} />
            <meshStandardMaterial color="#8a1512" emissive="#ff3020" emissiveIntensity={1.2 * lights} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Roll bar and rack behind the cab. */}
      {[-0.8, 0.8].map((z) => (
        <Block key={z} min={[0.52, 1.14, z - 0.04]} max={[0.6, 1.95, z + 0.04]} {...dark} />
      ))}
      <Block min={[0.52, 1.9, -0.84]} max={[0.6, 1.98, 0.84]} {...dark} />
      {/* Beacon and whip flag. */}
      <mesh position={[-0.3, 1.93, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.13, 12]} />
        <meshStandardMaterial color="#ff8a1c" emissive="#ff8a1c" emissiveIntensity={0.6 + 2.4 * beacon} toneMapped={false} />
      </mesh>
      {beacon > 0.3 && <GlowSprite position={[-0.3, 2.0, 0]} color="#ffa040" size={1.6} opacity={0.5 * beacon} />}
      <mesh position={[2.2, 1.85, 0.8]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 6]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.5} />
      </mesh>
      <mesh position={[2.36, 2.44, 0.8]}>
        <boxGeometry args={[0.3, 0.2, 0.01]} />
        <meshStandardMaterial color="#e8421c" roughness={0.7} />
      </mesh>
      {/* Wheels. */}
      {[
        [-1.55, -0.9],
        [-1.55, 0.9],
        [1.5, -0.9],
        [1.5, 0.9],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.42, z]} rotation={[0, 0, roll]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.3, 20]} />
            <meshStandardMaterial color="#161616" roughness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z > 0 ? 0.152 : -0.152]}>
            <cylinderGeometry args={[0.22, 0.22, 0.01, 14]} />
            <meshStandardMaterial color="#b8bcc0" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, z > 0 ? 0.16 : -0.16]}>
            <boxGeometry args={[0.36, 0.06, 0.012]} />
            <meshStandardMaterial color="#5a5e63" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
