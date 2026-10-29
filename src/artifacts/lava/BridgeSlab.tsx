import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

/**
 * One slab of the crumbling bridge: a thick dressed-stone block, deck flush
 * with the floor at y = 0 when in place. `crack` lights glowing fissures
 * across the deck (the trap arming under a foot), `rune` lights the red
 * "both ends" sigil. The episode owns where each slab is.
 */
export interface BridgeSlabProps {
  x: number;
  y: number;
  tilt: number;
  width: number;
  crack: number;
  rune: number;
  thickness?: number;
  z?: number;
  depth?: number;
  seed?: number;
}

export const BridgeSlab: React.FC<BridgeSlabProps> = ({ x, y, tilt, width, crack, rune, thickness = 0.32, z = -0.6, depth = 1.5, seed = 0 }) => {
  const frame = useCurrentFrame();
  const stone = useSurface(
    "bridge-stone",
    () => makeMasonry({ rows: 2, cols: 2, base: "#6a6470", baseAlt: "#76707c", mortar: "#25222a", seed: 341 }),
    [1, 1]
  );
  const flick = 0.8 + 0.2 * Math.sin(frame * 0.7 + seed);
  return (
    <group position={[x, y, z]} rotation={[0, 0, tilt]}>
      <mesh position={[0, -thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.04, thickness, depth]} />
        <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} normalScale={new THREE.Vector2(0.8, 0.8)} color="#c8c2cc" roughness={0.85} />
      </mesh>
      {/* Underside corbel so the slab reads as a heavy block, not a tile */}
      <mesh position={[0, -thickness - 0.1, 0]}>
        <boxGeometry args={[width * 0.6, 0.2, depth * 0.8]} />
        <meshStandardMaterial color="#4a4450" roughness={0.9} />
      </mesh>
      {crack > 0.01
        ? [
            [-0.18, 0.2, 0.5],
            [0.12, -0.25, -0.7],
            [0.0, 0.0, 1.4],
          ].map(([dx, dz, a], i) => (
            <mesh key={i} position={[dx * width, 0.004, dz * depth]} rotation={[-Math.PI / 2, 0, a]}>
              <planeGeometry args={[width * 0.7 * Math.min(1, crack * 1.5), 0.05]} />
              <meshBasicMaterial color="#ffb347" toneMapped={false} transparent opacity={crack * flick} />
            </mesh>
          ))
        : null}
      {crack > 0.3 ? <GlowSprite position={[0, 0.05, 0.3]} color="#ff7a2a" size={1.1 * crack} opacity={0.4 * crack} /> : null}
      {rune > 0.01 ? (
        <>
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, frame * 0.02]}>
            <ringGeometry args={[0.28, 0.36, 24]} />
            <meshBasicMaterial color="#ff3a3a" toneMapped={false} transparent opacity={rune * flick} />
          </mesh>
          <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, -frame * 0.03]}>
            <ringGeometry args={[0.1, 0.16, 3]} />
            <meshBasicMaterial color="#ff6a4a" toneMapped={false} transparent opacity={rune * flick} />
          </mesh>
          {/* The front face carries the sigil too, so it reads side-on */}
          <mesh position={[0, -thickness / 2, depth / 2 + 0.005]}>
            <ringGeometry args={[0.08, 0.13, 3]} />
            <meshBasicMaterial color="#ff3a3a" toneMapped={false} transparent opacity={rune * flick} />
          </mesh>
          <GlowSprite position={[0, 0.1, 0.2]} color="#ff3030" size={1.4 * rune} opacity={0.5 * rune} />
        </>
      ) : null}
    </group>
  );
};
