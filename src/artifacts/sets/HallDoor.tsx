import type React from "react";
import { useMemo } from "react";
import { Easing, interpolate } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeMasonry, makeWood } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

/**
 * A numbered hallway door on a hub's back wall: stone arch, numeral plaque,
 * torch, and a door leaf that swings back into the dark passage. Floor one's
 * Antechamber (`CryptHall`) and floor two's hub (`FloorTwoHub`) both use it.
 * A door whose room was destroyed in its episode is `sealedAt`: a plug of
 * cooled lava fills the arch, still glowing through its cracks.
 */

export const HALL_DOOR = { width: 1.7, height: 3.0, z: -2.2 } as const;

const numeralTexture = (text: string) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#3b3326";
  ctx.fillRect(0, 0, 128, 96);
  ctx.strokeStyle = "#c99a3e";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 88);
  ctx.font = "bold 62px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0c95a";
  ctx.fillText(text, 64, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Glowing cracks across the lava plug, in door-local units (x, y, length, angle). */
const CRACKS: Array<[number, number, number, number]> = [
  [-0.25, 0.7, 0.9, 0.9],
  [0.2, 1.4, 1.1, -0.5],
  [-0.1, 2.1, 0.8, 0.3],
  [0.35, 2.55, 0.6, 1.2],
  [-0.4, 1.7, 0.5, -1.1],
];

const LavaSeal: React.FC<{ frame: number; x: number }> = ({ frame, x }) => {
  const W = HALL_DOOR.width;
  const H = HALL_DOOR.height;
  const pulse = 0.75 + 0.25 * Math.sin(frame * 0.12 + x);
  return (
    <group>
      <mesh position={[0, H / 2, 0.02]} castShadow>
        <boxGeometry args={[W + 0.05, H, 0.3]} />
        <meshStandardMaterial color="#2b2422" roughness={0.95} />
      </mesh>
      {CRACKS.map(([cx, cy, len, a], i) => (
        <mesh key={i} position={[cx, cy, 0.18]} rotation={[0, 0, a]}>
          <boxGeometry args={[len, 0.05, 0.02]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff5a1a" emissiveIntensity={2.2 * pulse} toneMapped={false} />
        </mesh>
      ))}
      {/* Slumped crust spilling over the threshold */}
      <mesh position={[0, 0.06, 0.35]} scale={[1.25, 0.22, 0.6]}>
        <sphereGeometry args={[W / 2, 16, 10]} />
        <meshStandardMaterial color="#332926" roughness={0.9} />
      </mesh>
      <GlowSprite position={[0, H * 0.45, 0.4]} color="#ff6a2a" size={2.2 * pulse} opacity={0.28} />
    </group>
  );
};

export interface HallDoorProps {
  x: number;
  numeral: string;
  frame: number;
  /** Frame the door swings open (default: shut). */
  openAt?: number;
  /** Frame the torch lights (default: lit from the start). */
  litAt?: number;
  /** Frame from which the arch is plugged with cooled lava (default: never). */
  sealedAt?: number;
  z?: number;
}

export const HallDoor: React.FC<HallDoorProps> = ({ x, numeral, frame, openAt = 1e6, litAt = -100, sealedAt = 1e6, z = HALL_DOOR.z }) => {
  const wood = useSurface("crypt-door", () => makeWood({ planks: 4, base: "#4d321c", baseAlt: "#5c3c22", seam: "#1a1008", seed: 211 }), [1, 1]);
  const stone = useSurface("crypt-arch", () => makeMasonry({ rows: 6, cols: 2, base: "#5c5f6e", baseAlt: "#6a6d7c", mortar: "#22242c", seed: 212 }), [1, 2]);
  const tex = useMemo(() => numeralTexture(numeral), [numeral]);
  const open = interpolate(frame, [openAt, openAt + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const lit = interpolate(frame, [litAt, litAt + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sealed = frame >= sealedAt;
  const flicker = 0.85 + 0.15 * Math.sin(frame * 0.33 + x);
  const W = HALL_DOOR.width;
  const H = HALL_DOOR.height;
  return (
    <group position={[x, 0, z]}>
      {/* Dark passage behind */}
      <mesh position={[0, H / 2, -0.12]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color="#07070a" />
      </mesh>
      {/* Arch */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.2), H / 2, 0.05]} castShadow>
          <boxGeometry args={[0.4, H, 0.5]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#b0b4c1" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, H + 0.05, 0.05]} castShadow>
        <boxGeometry args={[W + 0.8, 0.5, 0.55]} />
        <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#c0c4cf" roughness={0.85} />
      </mesh>
      <mesh position={[0, H + 0.6, 0.18]}>
        <planeGeometry args={[0.75, 0.56]} />
        <meshStandardMaterial map={tex ?? undefined} roughness={0.6} />
      </mesh>
      {sealed ? (
        <LavaSeal frame={frame} x={x} />
      ) : (
        /* Door leaf hinged on the left, swings back into the passage */
        <group position={[-W / 2, 0, 0]} rotation={[0, open * 1.75, 0]}>
          <mesh position={[W / 2, H / 2, 0]} castShadow>
            <boxGeometry args={[W, H - 0.05, 0.12]} />
            <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#c49b70" roughness={0.85} />
          </mesh>
          {[0.6, H - 0.6].map((by) => (
            <mesh key={by} position={[W / 2, by, 0.07]}>
              <boxGeometry args={[W - 0.06, 0.12, 0.03]} />
              <meshStandardMaterial color="#2a2c33" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[W - 0.3, H / 2, 0.1]}>
            <torusGeometry args={[0.11, 0.03, 8, 16]} />
            <meshStandardMaterial color="#c99a3e" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      )}
      {/* Torch over the door, lit on cue (a sealed door's torch is out) */}
      <group position={[W / 2 + 0.55, H - 0.2, 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.06, 0.45, 7]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.45} />
        </mesh>
        {lit > 0 && !sealed ? (
          <>
            <mesh position={[0, 0.32, 0]} scale={[lit, lit * flicker * 1.2, lit]}>
              <coneGeometry args={[0.12, 0.34, 9]} />
              <meshStandardMaterial color="#ffd27a" emissive="#ff7a1a" emissiveIntensity={2.4} />
            </mesh>
            <GlowSprite position={[0, 0.32, 0.05]} color="#ff9933" size={1.4 * lit * flicker} opacity={0.6} />
            <pointLight position={[0, 0.4, 0.6]} color="#ff9a45" intensity={2.4 * lit * flicker} distance={6} decay={2} />
          </>
        ) : null}
      </group>
    </group>
  );
};
