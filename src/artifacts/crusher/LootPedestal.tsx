import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { easeOutBack, progress } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface LootPedestalProps {
  riseAt: number;
  wiresAt: number;
  /** Wall inner face distance: the trigger wires run out to both walls. */
  inner: number;
  /** 0 = up, 1 = sunk into the floor (out of the walls' way). */
  sunk?: number;
  x?: number;
  z?: number;
  h?: number;
}

/** Stone loot pedestal with a velvet cushion, wired to both walls by glowing trigger wires. */
export const LootPedestal: React.FC<LootPedestalProps> = ({ riseAt, wiresAt, inner, sunk = 0, x = 0, z = -1.1, h = 1.0 }) => {
  const frame = useCurrentFrame();
  const stone = useSurface(
    "pedestal-stone",
    () => makeMasonry({ rows: 4, cols: 2, base: "#8a8580", baseAlt: "#76716c", mortar: "#2b2926", seed: 44 }),
    [1, 1]
  );
  if (frame < riseAt) return null;
  const y = (easeOutBack(progress(frame, [riseAt, riseAt + 12])) - 1) * (h + 0.1) - sunk * (h + 0.12);
  const wire = progress(frame, [wiresAt, wiresAt + 10]);
  const hum = 0.6 + 0.25 * Math.sin(frame * 0.5);

  return (
    <group position={[x, 0, z]}>
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.16, 0.62]} />
          <meshStandardMaterial map={stone.map} color="#c8c4bc" roughness={0.85} />
        </mesh>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.24, h - 0.2, 16]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#d0ccc4" roughness={0.85} />
        </mesh>
        <mesh position={[0, h - 0.05, 0]} castShadow>
          <boxGeometry args={[0.56, 0.1, 0.56]} />
          <meshStandardMaterial map={stone.map} color="#c8c4bc" roughness={0.85} />
        </mesh>
        {/* Velvet cushion with gold tassels */}
        <mesh position={[0, h + 0.03, 0]} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[0.24, 16, 12]} />
          <meshStandardMaterial color="#b0202e" roughness={0.75} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.2, h - 0.02, sz * 0.2]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#ffd36a" emissive="#a06a10" emissiveIntensity={0.3} roughness={0.4} />
            </mesh>
          ))
        )}
      </group>

      {/* Trigger wires to both walls along the floor */}
      {wire > 0
        ? [-1, 1].map((side) => {
            const len = Math.max(0.05, inner * wire);
            return (
              <group key={side}>
                <mesh position={[(side * len) / 2, 0.025, 0.36]}>
                  <boxGeometry args={[len, 0.04, 0.04]} />
                  <meshStandardMaterial color="#ffb050" emissive="#ff7a1a" emissiveIntensity={hum * 1.2} roughness={0.4} toneMapped={false} />
                </mesh>
                <GlowSprite position={[side * len, 0.08, 0.36]} color="#ff9a3a" size={0.45} opacity={0.5 * wire} />
              </group>
            );
          })
        : null}
    </group>
  );
};
