import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeMasonry, makeWood } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

/**
 * The dungeon from outside: a moonlit graveyard with a stone mausoleum whose
 * door is the crypt entrance. Tombstones, crosses, a crooked iron fence, dead
 * trees and ground fog. The door shudders on `doorKnocks`.
 */
export const CRYPT_DOOR: Vec3 = [0, 0, -0.4];
export const MOON: Vec3 = [7.5, 9.5, -14];

const Tombstone: React.FC<{ position: Vec3; kind: number; tilt: number; scale: number }> = ({ position, kind, tilt, scale }) => (
  <group position={position} rotation={[0, 0, tilt]} scale={scale}>
    {kind === 0 ? (
      <>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.7, 1.0, 0.18]} />
          <meshStandardMaterial color="#8d8f9a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.18, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#8d8f9a" roughness={0.95} />
        </mesh>
      </>
    ) : kind === 1 ? (
      <>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.16, 1.4, 0.16]} />
          <meshStandardMaterial color="#7d808b" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.16, 0.16]} />
          <meshStandardMaterial color="#7d808b" roughness={0.95} />
        </mesh>
      </>
    ) : (
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.3]} />
        <meshStandardMaterial color="#6f7280" roughness={0.95} />
      </mesh>
    )}
  </group>
);

const DeadTree: React.FC<{ position: Vec3; scale: number; seed: string }> = ({ position, scale, seed }) => {
  const branches = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        y: 1.6 + i * 0.55,
        a: (random(`${seed}-a-${i}`) - 0.5) * 2.2,
        l: 0.8 + random(`${seed}-l-${i}`) * 0.9,
      })),
    [seed]
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.1, 0.24, 3.2, 7]} />
        <meshStandardMaterial color="#2a2128" roughness={1} />
      </mesh>
      {branches.map((b, i) => (
        <mesh key={i} position={[Math.sin(b.a) * b.l * 0.5, b.y + Math.cos(b.a) * b.l * 0.5, 0]} rotation={[0, 0, -b.a]} castShadow>
          <cylinderGeometry args={[0.02, 0.07, b.l, 5]} />
          <meshStandardMaterial color="#2a2128" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

export const GraveyardCrypt: React.FC<{ doorKnocks?: number[] }> = ({ doorKnocks = [] }) => {
  const frame = useCurrentFrame();
  const stone = useSurface("crypt-ext", () => makeMasonry({ rows: 8, cols: 5, base: "#6a6c78", baseAlt: "#767887", mortar: "#26272e", seed: 231 }), [2, 2]);
  const wood = useSurface("crypt-ext-door", () => makeWood({ planks: 4, base: "#4a2f1a", baseAlt: "#57391f", seam: "#1a1008", seed: 232 }), [1, 1]);
  const knock = doorKnocks.reduce((k, at) => Math.max(k, frame >= at ? Math.exp(-(frame - at) / 3) : 0), 0);
  const graves = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return {
          x: side * (3.8 + random(`g-x-${i}`) * 9),
          z: -3.5 + random(`g-z-${i}`) * 4.2,
          kind: Math.floor(random(`g-k-${i}`) * 3),
          tilt: (random(`g-t-${i}`) - 0.5) * 0.25,
          scale: 0.8 + random(`g-s-${i}`) * 0.5,
          key: i,
        };
      }),
    []
  );
  const fogs = Array.from({ length: 9 }, (_, i) => ({
    x: -12 + i * 3 + Math.sin(frame * 0.01 + i) * 0.8,
    z: -1 + (i % 3) * 0.8,
    key: i,
  }));
  const [dx, , dz] = CRYPT_DOOR;
  const stoneMat = (color: string) => (
    <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} normalScale={new THREE.Vector2(0.8, 0.8)} color={color} roughness={0.9} />
  );
  return (
    <group>
      {/* Night sky, moon, distant hills */}
      <mesh position={[0, 8, -16]}>
        <planeGeometry args={[80, 30]} />
        <meshBasicMaterial color="#1a2140" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.5, -15.9]}>
        <planeGeometry args={[80, 6]} />
        <meshBasicMaterial color="#2b3358" toneMapped={false} />
      </mesh>
      <mesh position={MOON}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color="#f4ecd0" toneMapped={false} />
      </mesh>
      <GlowSprite position={[MOON[0], MOON[1], MOON[2] + 0.1]} color="#cfd8ff" size={7} opacity={0.35} />
      {[-14, -5, 6, 15].map((x, i) => (
        <mesh key={`hill-${x}`} position={[x, -1.5, -13]} scale={[7 + i, 3 + (i % 2), 1]}>
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#141a26" roughness={1} />
        </mesh>
      ))}
      <directionalLight position={[MOON[0], MOON[1], 4]} color="#9fb2ff" intensity={1.2} />
      <hemisphereLight args={["#6a7ab8", "#1a1a20", 0.6]} />

      {/* Ground */}
      <mesh position={[0, -0.1, -4]} receiveShadow>
        <boxGeometry args={[80, 0.2, 16]} />
        <meshStandardMaterial color="#2f3a2e" roughness={1} />
      </mesh>
      {/* Path to the door */}
      <mesh position={[dx, 0.01, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 4.6]} />
        <meshStandardMaterial color="#4a4a52" roughness={1} />
      </mesh>

      {/* Mausoleum */}
      <group position={[dx, 0, dz - 1.6]}>
        {[0.15, 0.4].map((y, i) => (
          <mesh key={`step-${i}`} position={[0, y / 2 + i * 0.05, 2.2 - i * 0.35]} receiveShadow castShadow>
            <boxGeometry args={[4.6 - i * 0.6, y, 1.0]} />
            {stoneMat("#9a9caa")}
          </mesh>
        ))}
        <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.4, 4.2, 3.4]} />
          {stoneMat("#a5a8b6")}
        </mesh>
        {[-1.9, -1.1, 1.1, 1.9].map((x) => (
          <mesh key={`col-${x}`} position={[x, 2.2, 1.85]} castShadow>
            <cylinderGeometry args={[0.2, 0.24, 3.8, 12]} />
            {stoneMat("#c4c7d2")}
          </mesh>
        ))}
        <mesh position={[0, 4.55, 1.8]} castShadow>
          <boxGeometry args={[5.0, 0.4, 0.8]} />
          {stoneMat("#b8bbc7")}
        </mesh>
        <mesh position={[0, 5.3, 1.6]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 1]} castShadow>
          <boxGeometry args={[2.6, 2.6, 0.7]} />
          {stoneMat("#b0b3bf")}
        </mesh>
        {/* Doorway and the door */}
        <mesh position={[0, 1.45, 1.71]}>
          <planeGeometry args={[1.6, 2.9]} />
          <meshBasicMaterial color="#08080b" />
        </mesh>
        <mesh position={[knock * 0.03, 1.4, 1.76 - knock * 0.05]} castShadow>
          <boxGeometry args={[1.5, 2.8, 0.12]} />
          <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#b58a60" roughness={0.85} />
        </mesh>
        {[0.6, 2.2].map((y) => (
          <mesh key={`band-${y}`} position={[knock * 0.03, y, 1.83]}>
            <boxGeometry args={[1.46, 0.12, 0.03]} />
            <meshStandardMaterial color="#2a2c33" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0.45, 1.4, 1.86]}>
          <torusGeometry args={[0.14, 0.035, 8, 16]} />
          <meshStandardMaterial color="#c99a3e" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Skull over the door + braziers */}
        <mesh position={[0, 3.6, 1.75]}>
          <sphereGeometry args={[0.28, 14, 10]} />
          <meshStandardMaterial color="#e8dfc8" roughness={0.7} />
        </mesh>
        {[-2.6, 2.6].map((x) => (
          <group key={`brazier-${x}`} position={[x, 0, 2.3]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
              <meshStandardMaterial color="#2a2c33" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[0, 1.35, 0]} scale={[1, 1.1 + 0.15 * Math.sin(frame * 0.35 + x), 1]}>
              <coneGeometry args={[0.2, 0.5, 10]} />
              <meshStandardMaterial color="#9fe0ff" emissive="#3a9aff" emissiveIntensity={2.2} />
            </mesh>
            <GlowSprite position={[0, 1.35, 0.1]} color="#6ab8ff" size={1.6} opacity={0.6} />
            <pointLight position={[0, 1.5, 0.6]} color="#7ac0ff" intensity={3} distance={8} decay={2} />
          </group>
        ))}
      </group>

      {graves.map((g) => (
        <Tombstone key={g.key} position={[g.x, 0, g.z]} kind={g.kind} tilt={g.tilt} scale={g.scale} />
      ))}
      <DeadTree position={[-7.5, 0, -5]} scale={1.3} seed="tree-a" />
      <DeadTree position={[9.5, 0, -6]} scale={1.6} seed="tree-b" />
      {/* Iron fence in front */}
      {Array.from({ length: 34 }, (_, i) => -17 + i).filter((x) => Math.abs(x) > 1.4).map((x) => (
        <mesh key={`fence-${x}`} position={[x, 0.6, 1.6]} castShadow>
          <boxGeometry args={[0.06, 1.2, 0.06]} />
          <meshStandardMaterial color="#1c1d22" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {[0.35, 1.05].map((y) => (
        <group key={`rail-${y}`}>
          <mesh position={[-9.2, y, 1.6]}>
            <boxGeometry args={[15.6, 0.05, 0.05]} />
            <meshStandardMaterial color="#1c1d22" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[9.2, y, 1.6]}>
            <boxGeometry args={[15.6, 0.05, 0.05]} />
            <meshStandardMaterial color="#1c1d22" metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {fogs.map((f) => (
        <GlowSprite key={f.key} position={[f.x, 0.4, f.z]} color="#8ea0c8" size={5} opacity={0.12} />
      ))}
    </group>
  );
};
