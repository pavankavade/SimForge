/* eslint-disable @remotion/deterministic-randomness */
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry, makeMetal, makeWood } from "../../engine/textures";

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

// Collidable bounding boxes for player and AI pathing
export const ARENA_OBSTACLES: ObstacleBox[] = [
  // Crate Stack A (Center Left)
  { minX: -7.5, maxX: -4.5, minZ: -3.5, maxZ: -0.5, height: 2.2 },
  // Crate Stack B (Center Right)
  { minX: 4.5, maxX: 7.5, minZ: -3.5, maxZ: -0.5, height: 2.2 },
  // High Platform (Sniper Catwalk North)
  { minX: -5.0, maxX: 5.0, minZ: -18.0, maxZ: -14.0, height: 2.5 },
  // Cover Bunker / Wall (Mid Center)
  { minX: -2.0, maxX: 2.0, minZ: 3.0, maxZ: 5.0, height: 1.8 },
  // Left Pillar
  { minX: -11.0, maxX: -9.0, minZ: -10.0, maxZ: -8.0, height: 5.0 },
  // Right Pillar
  { minX: 9.0, maxX: 11.0, minZ: -10.0, maxZ: -8.0, height: 5.0 },
];

/** Detailed Military Ammo / Equipment Crate */
const TacticalCrate: React.FC<{
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  label?: string;
}> = ({ position, size = [1.4, 1.4, 1.4], rotation = [0, 0, 0], label }) => {
  const woodSurf = useSurface(
    "fps-crate-wood",
    () => makeWood({ planks: 4, base: "#784d28", baseAlt: "#8c5b30", seam: "#331f0d", seed: 88 }),
    [1, 1]
  );
  const metalSurf = useSurface(
    "fps-crate-metal",
    () => makeMetal({ base: "#363a40", seed: 44, roughness: 120 }),
    [1, 1]
  );

  const [w, h, d] = size;
  const frameThick = 0.05;

  return (
    <group position={position} rotation={rotation}>
      {/* Wood Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...woodSurf} roughness={0.7} />
      </mesh>

      {/* Metal Corner Caps & Brackets */}
      {/* Top Edge Rails */}
      <mesh position={[0, h / 2, d / 2 - frameThick / 2]}>
        <boxGeometry args={[w, frameThick, frameThick * 1.5]} />
        <meshStandardMaterial {...metalSurf} metalness={0.7} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2 + frameThick / 2]}>
        <boxGeometry args={[w, frameThick, frameThick * 1.5]} />
        <meshStandardMaterial {...metalSurf} metalness={0.7} />
      </mesh>
      <mesh position={[w / 2 - frameThick / 2, h / 2, 0]}>
        <boxGeometry args={[frameThick * 1.5, frameThick, d]} />
        <meshStandardMaterial {...metalSurf} metalness={0.7} />
      </mesh>
      <mesh position={[-w / 2 + frameThick / 2, h / 2, 0]}>
        <boxGeometry args={[frameThick * 1.5, frameThick, d]} />
        <meshStandardMaterial {...metalSurf} metalness={0.7} />
      </mesh>

      {/* Vertical Metal Edge Strips */}
      {([
        [w / 2, 0, d / 2],
        [-w / 2, 0, d / 2],
        [w / 2, 0, -d / 2],
        [-w / 2, 0, -d / 2],
      ] as const).map(([cx, cy, cz], i) => (
        <mesh key={`post-${i}`} position={[cx, cy, cz]}>
          <boxGeometry args={[0.07, h, 0.07]} />
          <meshStandardMaterial {...metalSurf} metalness={0.8} />
        </mesh>
      ))}

      {/* Cross Bracing on Front and Back */}
      <mesh position={[0, 0, d / 2 + 0.005]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[Math.hypot(w, h) * 0.9, 0.08, 0.02]} />
        <meshStandardMaterial color="#5e3a1b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.005]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[Math.hypot(w, h) * 0.9, 0.08, 0.02]} />
        <meshStandardMaterial color="#5e3a1b" roughness={0.8} />
      </mesh>

      {/* Side Metal Carry Handles */}
      <mesh position={[w / 2 + 0.02, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.28]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-w / 2 - 0.02, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.28]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Military Stencil Marker Badge */}
      {label && (
        <mesh position={[0, 0, d / 2 + 0.012]}>
          <planeGeometry args={[0.7, 0.25]} />
          <meshBasicMaterial color="#d97706" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
};

/** High-Detail Date Palm Tree */
const PalmTree: React.FC<{
  position: [number, number, number];
  height?: number;
  scale?: number;
}> = ({ position, height = 7.5, scale = 1.0 }) => {
  const trunkSegments = 14;
  const frondCount = 12;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Segmented Fibrous Trunk */}
      {Array.from({ length: trunkSegments }).map((_, i) => {
        const segH = height / trunkSegments;
        const y = i * segH + segH / 2;
        const taper = 1.0 - (i / trunkSegments) * 0.35;
        const lean = Math.sin((i / trunkSegments) * 1.5) * 0.18;
        const radius = 0.38 * taper;

        return (
          <group key={`trunk-${i}`} position={[lean, y, 0]}>
            {/* Trunk Ring */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[radius * 0.95, radius, segH * 1.05, 10]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#5a3d28" : "#4a301e"}
                roughness={0.95}
              />
            </mesh>
            {/* Fiber Bark Ridge */}
            <mesh position={[0, segH * 0.4, 0]}>
              <torusGeometry args={[radius * 0.98, 0.035, 6, 12]} />
              <meshStandardMaterial color="#3b2414" roughness={1.0} />
            </mesh>
          </group>
        );
      })}

      {/* Palm Crown with Cascading Fronds */}
      <group position={[Math.sin(1.5) * 0.18, height, 0]}>
        {/* Crown core */}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#2d4a1d" roughness={0.9} />
        </mesh>

        {/* Arching Fronds */}
        {Array.from({ length: frondCount }).map((_, fi) => {
          const angle = (fi / frondCount) * Math.PI * 2;
          const droop = 0.55 + (fi % 3) * 0.12;
          const frondLen = 3.6 + (fi % 2) * 0.6;

          return (
            <group key={`frond-${fi}`} rotation={[0, angle, 0]}>
              {/* Central Palm Stem / Rib */}
              <group rotation={[droop, 0, 0]}>
                <mesh position={[0, 0, frondLen / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.03, 0.08, frondLen, 6]} />
                  <meshStandardMaterial color="#4d7c0f" roughness={0.6} />
                </mesh>

                {/* Feathered Palm Leaf Blades */}
                {Array.from({ length: 6 }).map((_, li) => {
                  const leafDist = 0.6 + li * 0.5;
                  const leafW = Math.sin((li / 6) * Math.PI) * 0.9 + 0.3;
                  return (
                    <mesh
                      key={`leaf-${li}`}
                      position={[0, -0.05, leafDist]}
                      rotation={[-0.15, 0, 0]}
                    >
                      <planeGeometry args={[leafW, 0.42]} />
                      <meshStandardMaterial
                        color={li % 2 === 0 ? "#365314" : "#4d7c0f"}
                        roughness={0.7}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                  );
                })}
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

/** Stacked Burlap Sandbag Barricade */
const SandbagBunker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const bagColors = ["#ba9e7b", "#a88d6a", "#c4aa87", "#9e8461"];

  return (
    <group position={position}>
      {/* 3 Tier Staggered Sandbags */}
      {Array.from({ length: 3 }).map((_, layer) => {
        const bagY = layer * 0.28 + 0.14;
        const count = 5 - (layer % 2);
        const startX = -((count - 1) * 0.65) / 2;

        return (
          <group key={`layer-${layer}`}>
            {Array.from({ length: count }).map((_, bi) => {
              const bagX = startX + bi * 0.65;
              const color = bagColors[(layer * 3 + bi) % bagColors.length];
              return (
                <mesh
                  key={`bag-${layer}-${bi}`}
                  position={[bagX, bagY, 0]}
                  rotation={[0, ((bi % 3) - 1) * 0.06, 0]}
                  castShadow
                  receiveShadow
                >
                  <capsuleGeometry args={[0.13, 0.46, 6, 8]} />
                  <meshStandardMaterial color={color} roughness={0.92} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

/** Floating Sunlit Dust Motes in Desert Air */
const DesertDustParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 220;

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = 0.5 + Math.random() * 8.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44;
      scl[i] = 0.05 + Math.random() * 0.12;
    }
    return [pos, scl];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      // Gentle drift
      arr[i * 3 + 0] += Math.sin(time * 0.5 + i) * 0.15 * delta;
      arr[i * 3 + 1] += (Math.sin(time * 0.8 + i * 2) * 0.08 - 0.02) * delta;
      arr[i * 3 + 2] += Math.cos(time * 0.4 + i) * 0.12 * delta;

      // Wrap boundaries
      if (arr[i * 3 + 1] < 0.2) arr[i * 3 + 1] = 8.5;
      if (arr[i * 3 + 1] > 9.0) arr[i * 3 + 1] = 0.5;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-scale"
          args={[scales, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        color="#fef3c7"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export const FpsArena: React.FC = () => {
  const arenaWidth = 36;
  const arenaLength = 48;
  const wallHeight = 6.8;

  // Procedural Textures
  const wallMasonry = useSurface(
    "fps-sandstone-wall",
    () =>
      makeMasonry({
        rows: 7,
        cols: 5,
        base: "#cbb490",
        baseAlt: "#d8c29e",
        mortar: "#7d6a50",
        seed: 42,
      }),
    [8, 2.5]
  );

  const parapetMasonry = useSurface(
    "fps-sandstone-parapet",
    () =>
      makeMasonry({
        rows: 3,
        cols: 6,
        base: "#b89f7b",
        baseAlt: "#a8906c",
        mortar: "#6e5c43",
        seed: 73,
      }),
    [12, 1]
  );

  const floorStone = useSurface(
    "fps-ground-flagstone",
    () =>
      makeFlagstone({
        cells: 5,
        base: "#baa280",
        baseAlt: "#c7af8d",
        grout: "#78654c",
        seed: 95,
      }),
    [10, 14]
  );

  const concreteRamp = useSurface(
    "fps-catwalk-concrete",
    () =>
      makeFlagstone({
        cells: 4,
        base: "#91816e",
        baseAlt: "#9e8e7c",
        grout: "#615443",
        seed: 31,
      }),
    [2, 3]
  );

  const metalPillar = useSurface(
    "fps-metal-trim",
    () => makeMetal({ base: "#3b414a", seed: 62, roughness: 130 }),
    [1, 3]
  );

  return (
    <group>
      {/* Cinematic Desert Dust II Atmosphere & Warm Sun Lighting */}
      <fog attach="fog" args={["#dfc7a5", 24, 85]} />
      <hemisphereLight args={["#fed7aa", "#78350f", 0.75]} />

      {/* Main High-Sun Directional Light with Deep Shadows */}
      <directionalLight
        position={[24, 38, 18]}
        intensity={2.1}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />

      {/* Sky Blue Indirect Ambient Fill Light */}
      <directionalLight position={[-18, 16, -22]} intensity={0.48} color="#93c5fd" />

      {/* Sand Bounce Light from Ground Up */}
      <directionalLight position={[0, -10, 0]} intensity={0.22} color="#f59e0b" />

      {/* Atmospheric Desert Dust Particles */}
      <DesertDustParticles />

      {/* Main Sandy Flagstone Arena Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[arenaWidth, arenaLength]} />
        <meshStandardMaterial {...floorStone} roughness={0.92} />
      </mesh>

      {/* Central Dust Pathway / Cobble Markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[6.5, arenaLength - 4]} />
        <meshStandardMaterial color="#c2ab87" roughness={0.95} />
      </mesh>

      {/* Concrete Sidewalk Curbs alongside Perimeter */}
      {/* West Curb */}
      <mesh position={[-arenaWidth / 2 + 1.2, 0.1, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.22, arenaLength]} />
        <meshStandardMaterial color="#9c8c78" roughness={0.88} />
      </mesh>
      {/* East Curb */}
      <mesh position={[arenaWidth / 2 - 1.2, 0.1, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.22, arenaLength]} />
        <meshStandardMaterial color="#9c8c78" roughness={0.88} />
      </mesh>

      {/* Perimeter Sandstone Walls with Cornices & Parapets */}
      {/* North Wall with Catwalk Backing */}
      <group position={[0, wallHeight / 2, -arenaLength / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[arenaWidth, wallHeight, 1.4]} />
          <meshStandardMaterial {...wallMasonry} roughness={0.82} />
        </mesh>
        {/* Parapet Crenellations Top Trim */}
        <mesh position={[0, wallHeight / 2 + 0.35, 0]}>
          <boxGeometry args={[arenaWidth + 0.4, 0.7, 1.6]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.85} />
        </mesh>
      </group>

      {/* South Wall (Player Spawn Area) */}
      <group position={[0, wallHeight / 2, arenaLength / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[arenaWidth, wallHeight, 1.4]} />
          <meshStandardMaterial {...wallMasonry} roughness={0.82} />
        </mesh>
        <mesh position={[0, wallHeight / 2 + 0.35, 0]}>
          <boxGeometry args={[arenaWidth + 0.4, 0.7, 1.6]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.85} />
        </mesh>
      </group>

      {/* West Wall (Flank Corridor to B Site) */}
      <group position={[-arenaWidth / 2, wallHeight / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[1.4, wallHeight, arenaLength]} />
          <meshStandardMaterial {...wallMasonry} roughness={0.82} />
        </mesh>
        <mesh position={[0, wallHeight / 2 + 0.35, 0]}>
          <boxGeometry args={[1.6, 0.7, arenaLength + 0.4]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.85} />
        </mesh>
      </group>

      {/* East Wall (Long A Angle) */}
      <group position={[arenaWidth / 2, wallHeight / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[1.4, wallHeight, arenaLength]} />
          <meshStandardMaterial {...wallMasonry} roughness={0.82} />
        </mesh>
        <mesh position={[0, wallHeight / 2 + 0.35, 0]}>
          <boxGeometry args={[1.6, 0.7, arenaLength + 0.4]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.85} />
        </mesh>
      </group>

      {/* Arched Tunnel Entrance Portals (B-Tunnels & Long-A) */}
      {/* West Tunnel Archway */}
      <group position={[-arenaWidth / 2 + 0.72, 2.2, -8]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 4.4, 3.8]} />
          <meshBasicMaterial color="#0f1115" />
        </mesh>
        {/* Stone Arch Frame */}
        <mesh position={[0.08, 0, -1.9]}>
          <boxGeometry args={[0.2, 4.4, 0.35]} />
          <meshStandardMaterial color="#b8a17d" roughness={0.7} />
        </mesh>
        <mesh position={[0.08, 0, 1.9]}>
          <boxGeometry args={[0.2, 4.4, 0.35]} />
          <meshStandardMaterial color="#b8a17d" roughness={0.7} />
        </mesh>
        <mesh position={[0.08, 2.2, 0]}>
          <boxGeometry args={[0.24, 0.45, 4.2]} />
          <meshStandardMaterial color="#a68e6a" roughness={0.7} />
        </mesh>
      </group>

      {/* East Tunnel Archway */}
      <group position={[arenaWidth / 2 - 0.72, 2.2, 6]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 4.4, 3.8]} />
          <meshBasicMaterial color="#0f1115" />
        </mesh>
        <mesh position={[-0.08, 0, -1.9]}>
          <boxGeometry args={[0.2, 4.4, 0.35]} />
          <meshStandardMaterial color="#b8a17d" roughness={0.7} />
        </mesh>
        <mesh position={[-0.08, 0, 1.9]}>
          <boxGeometry args={[0.2, 4.4, 0.35]} />
          <meshStandardMaterial color="#b8a17d" roughness={0.7} />
        </mesh>
        <mesh position={[-0.08, 2.2, 0]}>
          <boxGeometry args={[0.24, 0.45, 4.2]} />
          <meshStandardMaterial color="#a68e6a" roughness={0.7} />
        </mesh>
      </group>

      {/* Bomb Site Tactical Graffiti Signs */}
      {/* Red Spray Painted [ A ➔ ] Sign on East Wall */}
      <group position={[arenaWidth / 2 - 0.68, 3.2, -12]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.8, 1.3]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.78} />
        </mesh>
        <mesh position={[-0.02, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.9, 1.4]} />
          <meshBasicMaterial color="#111827" transparent opacity={0.3} />
        </mesh>
        {/* Stenciled "A" letter shape */}
        <mesh position={[-0.03, 0, -0.4]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.55, 0.85]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Arrow pointer towards Catwalk */}
        <mesh position={[-0.03, 0, 0.4]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, 0.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Red Spray Painted [ ⬅ B ] Sign on West Wall */}
      <group position={[-arenaWidth / 2 + 0.68, 3.2, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.8, 1.3]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.78} />
        </mesh>
        <mesh position={[0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.9, 1.4]} />
          <meshBasicMaterial color="#111827" transparent opacity={0.3} />
        </mesh>
        {/* Stenciled "B" letter shape */}
        <mesh position={[0.03, 0, 0.4]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.55, 0.85]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Arrow pointer */}
        <mesh position={[0.03, 0, -0.4]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, 0.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Overhead Diagonal Telephone & Power Cables */}
      <group position={[0, 6.4, 0]}>
        {/* Sagging Cable 1 */}
        <mesh position={[0, -0.3, -8]} rotation={[0, 0.15, 0.03]}>
          <cylinderGeometry args={[0.018, 0.018, arenaWidth + 2, 6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {/* Sagging Cable 2 */}
        <mesh position={[0, -0.4, 6]} rotation={[0, -0.1, -0.02]}>
          <cylinderGeometry args={[0.018, 0.018, arenaWidth + 2, 6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
      </group>

      {/* Date Palm Trees in Corners */}
      <PalmTree position={[-14.5, 0, -20.5]} height={8.2} scale={1.05} />
      <PalmTree position={[14.5, 0, -20.5]} height={7.8} scale={0.98} />
      <PalmTree position={[-14.5, 0, 19.5]} height={8.0} scale={1.02} />
      <PalmTree position={[14.5, 0, 19.5]} height={7.5} scale={0.95} />

      {/* Crate Stack A (Center Left) */}
      <group position={[-6, 0, -2]}>
        <TacticalCrate position={[-0.7, 0.7, 0]} size={[1.4, 1.4, 1.4]} label="7.62" />
        <TacticalCrate position={[0.7, 0.7, 0]} size={[1.4, 1.4, 1.4]} />
        <TacticalCrate position={[0, 1.9, 0]} size={[1.2, 1.0, 1.2]} rotation={[0, 0.1, 0]} />
      </group>

      {/* Crate Stack B (Center Right) */}
      <group position={[6, 0, -2]}>
        <TacticalCrate position={[-0.7, 0.7, 0]} size={[1.4, 1.4, 1.4]} />
        <TacticalCrate position={[0.7, 0.7, 0]} size={[1.4, 1.4, 1.4]} label="AMMO" />
        <TacticalCrate position={[0, 1.9, 0]} size={[1.2, 1.0, 1.2]} rotation={[0, -0.08, 0]} />
      </group>

      {/* North Sniper Catwalk Platform */}
      <group position={[0, 0, -16]}>
        {/* Catwalk Platform Foundation & Deck */}
        <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 2.5, 4]} />
          <meshStandardMaterial {...concreteRamp} roughness={0.85} />
        </mesh>

        {/* Heavy Steel Support Beams under Catwalk */}
        {[-4.6, 0, 4.6].map((bx, bi) => (
          <mesh key={`beam-${bi}`} position={[bx, 0.6, 2.05]}>
            <boxGeometry args={[0.22, 1.2, 0.22]} />
            <meshStandardMaterial {...metalPillar} metalness={0.7} />
          </mesh>
        ))}

        {/* Industrial Safety Handrails on Catwalk */}
        <group position={[0, 2.5, 1.95]}>
          {/* Top Rail */}
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[10, 0.06, 0.06]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Mid Rail */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[10, 0.04, 0.04]} />
            <meshStandardMaterial color="#374151" metalness={0.7} />
          </mesh>
          {/* Stanchion Posts */}
          {[-4.8, -2.4, 0, 2.4, 4.8].map((px, pi) => (
            <mesh key={`rail-post-${pi}`} position={[px, 0.5, 0]}>
              <boxGeometry args={[0.06, 1.0, 0.06]} />
              <meshStandardMaterial color="#1f2937" metalness={0.8} />
            </mesh>
          ))}
        </group>

        {/* Concrete Ramp on Left */}
        <group position={[-6.2, 0.6, 0]} rotation={[0, 0, -0.38]}>
          <mesh receiveShadow>
            <boxGeometry args={[3.2, 0.4, 3.5]} />
            <meshStandardMaterial {...concreteRamp} roughness={0.85} />
          </mesh>
          {/* Yellow/Black Warning Lip */}
          <mesh position={[0, 0.22, 1.6]}>
            <boxGeometry args={[3.2, 0.04, 0.2]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>

        {/* Concrete Ramp on Right */}
        <group position={[6.2, 0.6, 0]} rotation={[0, 0, 0.38]}>
          <mesh receiveShadow>
            <boxGeometry args={[3.2, 0.4, 3.5]} />
            <meshStandardMaterial {...concreteRamp} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.22, 1.6]}>
            <boxGeometry args={[3.2, 0.04, 0.2]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>
      </group>

      {/* Mid Cover Barricade with Stacked Burlap Sandbags */}
      <group position={[0, 0, 4]}>
        {/* Core Sandstone Concrete Wall */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 1.8, 0.8]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.8} />
        </mesh>
        {/* Heavy Sandbag Emplacement in Front */}
        <SandbagBunker position={[0, 0, 0.55]} />
      </group>

      {/* Left Stone Pillar with Weathered Ashlar Masonry */}
      <group position={[-10, 2.5, -9]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 5, 2]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.88} />
        </mesh>
        {/* Top Capital Molding */}
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[2.3, 0.3, 2.3]} />
          <meshStandardMaterial color="#a68e6a" roughness={0.75} />
        </mesh>
        {/* Base Plinth */}
        <mesh position={[0, -2.4, 0]}>
          <boxGeometry args={[2.3, 0.3, 2.3]} />
          <meshStandardMaterial color="#8c7857" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Stone Pillar with Weathered Ashlar Masonry */}
      <group position={[10, 2.5, -9]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 5, 2]} />
          <meshStandardMaterial {...parapetMasonry} roughness={0.88} />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[2.3, 0.3, 2.3]} />
          <meshStandardMaterial color="#a68e6a" roughness={0.75} />
        </mesh>
        <mesh position={[0, -2.4, 0]}>
          <boxGeometry args={[2.3, 0.3, 2.3]} />
          <meshStandardMaterial color="#8c7857" roughness={0.9} />
        </mesh>
      </group>

      {/* Detailed Explosive Red Barrels */}
      {[
        [-5, 0.6, 8],
        [5, 0.6, 8],
        [-9, 0.6, -14],
        [9, 0.6, -14],
      ].map(([bx, by, bz], i) => (
        <group key={`barrel-${i}`} position={[bx, by, bz]}>
          {/* Main Ribbed Steel Drum */}
          <mesh castShadow>
            <cylinderGeometry args={[0.36, 0.36, 1.15, 20]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Reinforcement Rib Rings */}
          <mesh position={[0, 0.28, 0]}>
            <torusGeometry args={[0.365, 0.016, 6, 20]} />
            <meshStandardMaterial color="#991b1b" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <torusGeometry args={[0.365, 0.016, 6, 20]} />
            <meshStandardMaterial color="#991b1b" roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Center Yellow Hazard Stripe Band */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.368, 0.368, 0.24, 20]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
          {/* Top Drum Chime & Cap */}
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.04, 20]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.16, 0.61, 0.1]}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 10]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
