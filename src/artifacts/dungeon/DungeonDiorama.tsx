import type React from "react";
import { useCurrentFrame, random } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import {
  makeEarth,
  makeFlagstone,
  makeMasonry,
  makeWood,
} from "../../engine/textures";
import { Burst, DustMotes, GlowSprite } from "./Fx";

interface DungeonDioramaProps {
  /**
   * Frame the hidden catapult chamber under the entrance floor is revealed.
   * Before it the left underground is solid earth.
   */
  catapultFrame?: number;
}

/** Hinged catapult slab span (x), kept clear of loose floor decoration. */
const SLAB_RANGE: [number, number] = [-9.75, -5.35];
const PIT_RANGE: [number, number] = [-2.3, 2.3];
const CHAMBER = { left: -9.8, right: -2.35, bottom: -3.6, top: -0.5 };

const inRange = (x: number, [a, b]: [number, number], pad = 0) =>
  x > a - pad && x < b + pad;

const BRICK_COLORS = [
  "#d7dae3",
  "#e2e5ec",
  "#cdd1db",
  "#e9ecf2",
  "#d2d6df",
  "#dde0e8",
];

export const DungeonDiorama: React.FC<DungeonDioramaProps> = ({
  catapultFrame = Infinity,
}) => {
  const frame = useCurrentFrame();
  const revealed = frame >= catapultFrame;
  const revealAge = frame - catapultFrame;
  const flicker = Math.sin(frame * 0.3) * 0.12 + Math.cos(frame * 0.77) * 0.08;
  const flickerTwo = Math.sin(frame * 0.26 + 1.7) * 0.1;

  const wallStone = useSurface(
    "diorama-wall",
    () =>
      makeMasonry({
        rows: 7,
        cols: 4,
        base: "#3d414e",
        baseAlt: "#4a4e5c",
        mortar: "#1b1d24",
        seed: 21,
      }),
    [6, 2]
  );
  const brickStone = useSurface(
    "diorama-brick",
    () =>
      makeMasonry({
        rows: 5,
        cols: 3,
        base: "#4c505f",
        baseAlt: "#5a5e6d",
        mortar: "#1e2029",
        seed: 22,
      }),
    [1, 1]
  );
  const pillarStone = useSurface(
    "diorama-pillar",
    () =>
      makeMasonry({
        rows: 9,
        cols: 3,
        base: "#565a6b",
        baseAlt: "#646879",
        mortar: "#20222b",
        seed: 23,
      }),
    [1, 3]
  );
  const floorStone = useSurface(
    "diorama-floor",
    () =>
      makeFlagstone({
        cells: 4,
        base: "#4b4e5a",
        baseAlt: "#565965",
        grout: "#1c1e25",
        seed: 24,
      }),
    [1, 1]
  );
  const earth = useSurface("diorama-earth", () => makeEarth({}), [2, 1.4]);
  const earthDark = useSurface(
    "diorama-earth-dark",
    () =>
      makeEarth({
        layers: ["#2a201a", "#33261d", "#261e1e", "#2f251f", "#211b1c"],
        seed: 62,
      }),
    [2, 1]
  );
  const beamWood = useSurface(
    "diorama-beam",
    () =>
      makeWood({
        planks: 3,
        base: "#4a3320",
        baseAlt: "#573d26",
        seam: "#1e140c",
        seed: 26,
      }),
    [3, 1]
  );

  const bricks: Array<{
    x: number;
    y: number;
    color: string;
    key: string;
  }> = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 9; col++) {
      bricks.push({
        x: -10 + col * 2.5 + (row % 2 === 0 ? 0 : 1.25),
        y: 0.75 + row * 1.08,
        color: BRICK_COLORS[(row * 9 + col) % BRICK_COLORS.length],
        key: `brick-${row}-${col}`,
      });
    }
  }

  // Loose decoration only on the fixed walkway, never on the pit or the
  // catapult slab (which flips away).
  const onFixedFloor = (x: number) =>
    !inRange(x, PIT_RANGE, 0.1) && !inRange(x, SLAB_RANGE, 0.1);

  const floorCracks = Array.from({ length: 30 }, (_, index) => ({
    x: -10 + random(`floor-crack-x-${index}`) * 20,
    z: -2.0 + random(`floor-crack-z-${index}`) * 2.9,
    angle: random(`floor-crack-angle-${index}`) * Math.PI,
    length: 0.3 + random(`floor-crack-length-${index}`) * 0.5,
    key: `floor-crack-${index}`,
  })).filter((crack) => onFixedFloor(crack.x));

  const debris = Array.from({ length: 22 }, (_, index) => ({
    x:
      (random(`debris-side-${index}`) > 0.5 ? 1 : -1) *
      (2.6 + random(`debris-x-${index}`) * 7.2),
    z: -2.0 + random(`debris-z-${index}`) * 2.9,
    size: 0.055 + random(`debris-size-${index}`) * 0.14,
    rotation: random(`debris-rotation-${index}`) * Math.PI,
    color: random(`debris-color-${index}`) > 0.6 ? "#615d62" : "#494950",
    key: `debris-${index}`,
  })).filter((piece) => onFixedFloor(piece.x));

  // Earth plug sealing the chamber front; crumbles away at the reveal.
  const plugChunks =
    revealed && revealAge < 40
      ? Array.from({ length: 24 }, (_, index) => {
          const col = index % 8;
          const row = Math.floor(index / 8);
          const w = (CHAMBER.right - CHAMBER.left) / 8;
          const h = (CHAMBER.top - CHAMBER.bottom) / 3;
          const delay = random(`plug-delay-${index}`) * 8;
          const t = Math.max(0, revealAge - delay);
          return {
            key: `plug-${index}`,
            size: [w * 0.92, h * 0.9, 0.5] as [number, number, number],
            position: [
              CHAMBER.left + w * (col + 0.5) + (random(`plug-vx-${index}`) - 0.5) * 0.05 * t,
              CHAMBER.bottom + h * (row + 0.5) - 0.006 * t * t,
              0.85 + 0.06 * t,
            ] as [number, number, number],
            rotation: [
              t * 0.08 * (random(`plug-rx-${index}`) - 0.3),
              0,
              t * 0.1 * (random(`plug-rz-${index}`) - 0.5),
            ] as [number, number, number],
            scale: Math.max(0.001, 1 - t / 36),
          };
        })
      : [];

  const chamberLight = revealed
    ? Math.min(1, revealAge / 12) * (3.4 + flicker * 1.2)
    : 0;

  const earthMat = (
    <meshStandardMaterial
      map={earth.map}
      normalMap={earth.normalMap}
      normalScale={new THREE.Vector2(0.8, 0.8)}
      color="#d8c8b8"
      roughness={0.95}
    />
  );
  const earthDarkMat = (
    <meshStandardMaterial
      map={earthDark.map}
      normalMap={earthDark.normalMap}
      color="#c8b8a8"
      roughness={0.95}
    />
  );

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 3.1, -2.55]} receiveShadow>
        <boxGeometry args={[22, 6.4, 0.5]} />
        <meshStandardMaterial
          map={wallStone.map}
          normalMap={wallStone.normalMap}
          roughnessMap={wallStone.roughnessMap}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          color="#c8ccd8"
          roughness={0.95}
        />
      </mesh>

      {bricks.map((brick) => (
        <mesh
          key={brick.key}
          position={[brick.x, brick.y, -2.26]}
          receiveShadow
        >
          <boxGeometry args={[2.34, 0.94, 0.08]} />
          <meshStandardMaterial
            map={brickStone.map}
            normalMap={brickStone.normalMap}
            roughnessMap={brickStone.roughnessMap}
            normalScale={new THREE.Vector2(0.9, 0.9)}
            color={brick.color}
            roughness={0.9}
            metalness={0.02}
          />
        </mesh>
      ))}

      {[-8, -4, 4, 8].map((x, index) => (
        <group key={`pillar-${index}`} position={[x, 3, -2.02]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.82, 6.1, 0.52]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              roughnessMap={pillarStone.roughnessMap}
              normalScale={new THREE.Vector2(0.7, 0.7)}
              color="#9da3b0"
              roughness={0.86}
            />
          </mesh>
          <mesh position={[0, 3.02, 0.05]} castShadow>
            <boxGeometry args={[1.16, 0.32, 0.66]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              color="#ccd2dd"
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, -3.02, 0.05]} castShadow>
            <boxGeometry args={[1.16, 0.36, 0.66]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              color="#ccd2dd"
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, 0, 0.3]}>
            <boxGeometry args={[0.9, 0.06, 0.04]} />
            <meshStandardMaterial color="#777c90" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {[-2.7, 2.7].map((x, index) => (
        <group key={`arch-column-${index}`} position={[x, 1.25, -1.88]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 2.5, 0.58]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              roughnessMap={pillarStone.roughnessMap}
              normalScale={new THREE.Vector2(0.8, 0.8)}
              color="#a3a8b6"
              roughness={0.84}
            />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[0.84, 0.2, 0.68]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              color="#b4b9c6"
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, -1.18, 0]} castShadow>
            <boxGeometry args={[0.8, 0.18, 0.66]} />
            <meshStandardMaterial
              map={pillarStone.map}
              normalMap={pillarStone.normalMap}
              color="#b4b9c6"
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.5, -1.9]} castShadow>
        <torusGeometry args={[2.7, 0.3, 10, 32, Math.PI]} />
        <meshStandardMaterial
          map={brickStone.map}
          normalMap={brickStone.normalMap}
          roughnessMap={brickStone.roughnessMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          color="#a7acba"
          roughness={0.85}
        />
      </mesh>
      {/* Voussoir seams + gold keystone so the arch reads as built stone */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((i + 1) / 10) * Math.PI;
        return (
          <mesh
            key={`voussoir-${i}`}
            position={[Math.cos(a) * 2.7, 2.5 + Math.sin(a) * 2.7, -1.62]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[0.62, 0.035, 0.04]} />
            <meshStandardMaterial color="#2a2c34" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, 5.2, -1.66]}>
        <boxGeometry args={[0.42, 0.5, 0.2]} />
        <meshStandardMaterial
          color="#c99a3e"
          metalness={0.6}
          roughness={0.38}
        />
      </mesh>

      <mesh position={[0, 3.7, -1.72]}>
        <boxGeometry args={[1.9, 2.2, 0.045]} />
        <meshStandardMaterial color="#7c2024" roughness={0.88} />
      </mesh>
      <mesh position={[0, 4.82, -1.68]}>
        <boxGeometry args={[2.02, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#d2a545"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 2.58, -1.68]}>
        <boxGeometry args={[2.02, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#d2a545"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {/* Crossed swords emblem */}
      {[-1, 1].map((side) => (
        <group
          key={`emblem-sword-${side}`}
          position={[0, 3.72, -1.66]}
          rotation={[0, 0, side * 0.62]}
        >
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.08, 1.0, 0.03]} />
            <meshStandardMaterial
              color="#e3e7ee"
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.66, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.057, 0.057, 0.03]} />
            <meshStandardMaterial
              color="#e3e7ee"
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, -0.4, 0.01]}>
            <boxGeometry args={[0.32, 0.06, 0.035]} />
            <meshStandardMaterial
              color="#d2a545"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, -0.53, 0.01]}>
            <boxGeometry args={[0.06, 0.22, 0.035]} />
            <meshStandardMaterial color="#4a2e1a" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.67, 0.01]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial
              color="#d2a545"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.72, -1.63]}>
        <circleGeometry args={[0.14, 16]} />
        <meshStandardMaterial
          color="#d2a545"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>

      {[-7.1, -3.5, 3.5, 7.1].map((x, index) => (
        <group key={`torch-${index}`} position={[x, 3.35, -1.72]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 0.55, 7]} />
            <meshStandardMaterial
              color="#1a1c22"
              metalness={0.8}
              roughness={0.45}
            />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color="#24262e"
              metalness={0.85}
              roughness={0.35}
            />
          </mesh>
          <mesh
            position={[0, 0.08, 0.04]}
            rotation={[0.22, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.045, 0.055, 0.48, 6]} />
            <meshStandardMaterial color="#5d3a22" roughness={0.9} />
          </mesh>
          <mesh
            position={[0, 0.36, 0.1]}
            scale={[1, 1.18 + flicker + flickerTwo, 1]}
          >
            <coneGeometry args={[0.14, 0.38, 9]} />
            <meshStandardMaterial
              color="#ffd27a"
              emissive="#ff7a1a"
              emissiveIntensity={2.6 + flicker}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.37, 0.1]} scale={[1.5, 1.4, 1]}>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshBasicMaterial
              color="#ff9a3d"
              transparent
              opacity={0.16 + flicker * 0.25}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            position={[0, 0.4, 0.45]}
            color="#ff9a45"
            intensity={3.1 + flicker * 1.6}
            distance={10}
            decay={2}
          />
        </group>
      ))}

      <mesh position={[0, 6.15, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[22, 0.50, 3.4]} />
        <meshStandardMaterial color="#30323c" roughness={0.9} />
      </mesh>
      {[-8, -4, 0, 4, 8].map((x, index) => (
        <mesh key={`ceiling-beam-${index}`} position={[x, 5.85, -0.7]}>
          <boxGeometry args={[0.33, 0.36, 3.3]} />
          <meshStandardMaterial color="#3e3329" roughness={0.9} />
        </mesh>
      ))}

      {[-1.9, 1.9].map((x, index) => (
        <group key={`chain-${index}`} position={[x, 5.45, -1.1]}>
          {[0, 1, 2, 3].map((link) => (
            <mesh
              key={`chain-link-${link}`}
              position={[0, -link * 0.24, 0]}
              rotation={[0, 0, link % 2 === 0 ? 0 : Math.PI / 2]}
            >
              <torusGeometry args={[0.09, 0.024, 5, 8]} />
              <meshStandardMaterial
                color="#6c7180"
                metalness={0.85}
                roughness={0.38}
              />
            </mesh>
          ))}
        </group>
      ))}

      {revealed ? (
        <>
          {/* Floor base minus the hinged slab (drawn by TrebuchetFloor) */}
          <mesh position={[-9.8575, -0.25, -0.6]} receiveShadow>
            <boxGeometry args={[0.285, 0.5, 3.4]} />
            <meshStandardMaterial color="#4d505d" roughness={0.88} />
          </mesh>
          <mesh position={[-3.6925, -0.25, -0.6]} receiveShadow>
            <boxGeometry args={[3.385, 0.5, 3.4]} />
            <meshStandardMaterial color="#4d505d" roughness={0.88} />
          </mesh>
        </>
      ) : (
        <mesh position={[-6, -0.25, -0.6]} receiveShadow>
          <boxGeometry args={[8, 0.5, 3.4]} />
          <meshStandardMaterial color="#4d505d" roughness={0.88} />
        </mesh>
      )}
      <mesh position={[6, -0.25, -0.6]} receiveShadow>
        <boxGeometry args={[8, 0.5, 3.4]} />
        <meshStandardMaterial color="#4d505d" roughness={0.88} />
      </mesh>

      {[-9.2, -8.1, -7.0, -5.9, -4.8, -3.7, -2.6].map((x, index) =>
        revealed && x < -5.3 ? null : (
        <mesh
          key={`tile-left-${index}`}
          position={[x, 0.012, -0.6]}
          receiveShadow
        >
          <boxGeometry args={[1.03, 0.035, 3.2]} />
          <meshStandardMaterial
            map={floorStone.map}
            normalMap={floorStone.normalMap}
            roughnessMap={floorStone.roughnessMap}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            color={index % 2 === 0 ? "#c9cedb" : "#bcc1cc"}
            roughness={0.82}
          />
        </mesh>
        )
      )}
      {[2.6, 3.7, 4.8, 5.9, 7.0, 8.1, 9.2].map((x, index) => (
        <mesh
          key={`tile-right-${index}`}
          position={[x, 0.012, -0.6]}
          receiveShadow
        >
          <boxGeometry args={[1.03, 0.035, 3.2]} />
          <meshStandardMaterial
            map={floorStone.map}
            normalMap={floorStone.normalMap}
            roughnessMap={floorStone.roughnessMap}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            color={index % 2 === 0 ? "#c4c9d5" : "#b8bdc8"}
            roughness={0.82}
          />
        </mesh>
      ))}

      <mesh position={[-2.12, -0.1, -0.6]}>
        <boxGeometry args={[0.16, 0.26, 3.4]} />
        <meshStandardMaterial color="#73788c" roughness={0.72} />
      </mesh>
      <mesh position={[2.12, -0.1, -0.6]}>
        <boxGeometry args={[0.16, 0.26, 3.4]} />
        <meshStandardMaterial color="#73788c" roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.12, 1.12]} receiveShadow>
        <boxGeometry args={[4.46, 0.3, 0.18]} />
        <meshStandardMaterial color="#777c90" roughness={0.72} />
      </mesh>

      {revealed ? (
        <group>
          {/* Hollow catapult chamber: end walls, floor and back wall */}
          <mesh position={[-9.9, -3.2, -0.6]} receiveShadow>
            <boxGeometry args={[0.2, 5.4, 3.4]} />
            {earthMat}
          </mesh>
          <mesh position={[-2.275, -3.2, -0.6]} receiveShadow>
            <boxGeometry args={[0.15, 5.4, 3.4]} />
            {earthMat}
          </mesh>
          <mesh position={[-6.075, -4.75, -0.6]} receiveShadow>
            <boxGeometry args={[7.45, 2.3, 3.4]} />
            {earthMat}
          </mesh>
          <mesh position={[-6.075, -2.05, -2.15]} receiveShadow>
            <boxGeometry args={[7.45, 3.1, 0.3]} />
            {earthDarkMat}
          </mesh>
          {/* Timber shoring along the chamber back wall */}
          {[-9.3, -7.6, -4.2, -2.75].map((x) => (
            <mesh key={`shore-${x}`} position={[x, -2.05, -1.95]}>
              <boxGeometry args={[0.18, 3.1, 0.12]} />
              <meshStandardMaterial
                map={beamWood.map}
                normalMap={beamWood.normalMap}
                color="#cbbfae"
                roughness={0.9}
              />
            </mesh>
          ))}
          <mesh position={[-6.075, -0.62, -1.95]}>
            <boxGeometry args={[7.45, 0.16, 0.14]} />
            <meshStandardMaterial
              map={beamWood.map}
              normalMap={beamWood.normalMap}
              color="#cbbfae"
              roughness={0.9}
            />
          </mesh>
          <pointLight
            position={[-6.2, -1.6, 0.6]}
            color="#ffab5c"
            intensity={chamberLight}
            distance={9}
            decay={2}
          />
          <pointLight
            position={[-3.4, -2.6, -0.8]}
            color="#ffcf7a"
            intensity={chamberLight * 0.5}
            distance={5}
            decay={2}
          />
          {plugChunks.map((chunk) => (
            <mesh
              key={chunk.key}
              position={chunk.position}
              rotation={chunk.rotation}
              scale={chunk.scale}
              castShadow
            >
              <boxGeometry args={chunk.size} />
              {earthMat}
            </mesh>
          ))}
          <Burst
            at={catapultFrame}
            position={[-6.1, -2.1, 1.2]}
            count={70}
            size={0.9}
            duration={60}
            speed={0.14}
            direction={[0, 0.02, 0.06]}
            spread={[7, 2.6, 0.4]}
            color="#a58d72"
            opacity={0.7}
            seed="chamber-dust"
          />
        </group>
      ) : (
        <mesh position={[-6, -3.2, -0.6]} receiveShadow>
          <boxGeometry args={[8, 5.4, 3.4]} />
          {earthMat}
        </mesh>
      )}
      <mesh position={[6, -3.2, -0.6]} receiveShadow>
        <boxGeometry args={[8, 5.4, 3.4]} />
        {earthMat}
      </mesh>
      {/* Deep bedrock so wide shots never show empty space below the set */}
      <mesh position={[0, -10.1, -0.6]} receiveShadow>
        <boxGeometry args={[26, 12, 3.4]} />
        {earthDarkMat}
      </mesh>

      <mesh position={[0, -5.7, -0.6]} receiveShadow>
        <boxGeometry args={[22, 0.8, 3.8]} />
        <meshStandardMaterial color="#22232a" roughness={0.95} />
      </mesh>

      <mesh position={[0, -2.6, -2.3]} receiveShadow>
        <boxGeometry args={[4, 5.4, 0.4]} />
        <meshStandardMaterial color="#3b3a43" roughness={0.92} />
      </mesh>

      {[-1.55, 0, 1.55].map((x, index) => (
        <mesh key={`pit-beam-${index}`} position={[x, -2.4, -2.06]}>
          <boxGeometry args={[0.2, 5.0, 0.1]} />
          <meshStandardMaterial
            map={beamWood.map}
            normalMap={beamWood.normalMap}
            roughnessMap={beamWood.roughnessMap}
            color="#d8cdbd"
            roughness={0.9}
          />
        </mesh>
      ))}
      {[-1.3, -3.1].map((y, index) => (
        <mesh key={`pit-crossbeam-${index}`} position={[0, y, -2.0]}>
          <boxGeometry args={[3.9, 0.18, 0.12]} />
          <meshStandardMaterial
            map={beamWood.map}
            normalMap={beamWood.normalMap}
            color="#cbbfae"
            roughness={0.9}
          />
        </mesh>
      ))}
      {[-1.6, -2.8].map((y, index) => (
        <mesh
          key={`pit-sidebeam-${index}`}
          position={[-2.01, y, -0.6]}
        >
          <boxGeometry args={[0.1, 0.16, 3.1]} />
          <meshStandardMaterial
            map={beamWood.map}
            normalMap={beamWood.normalMap}
            color="#cbbfae"
            roughness={0.9}
          />
        </mesh>
      ))}
      {[-1.6, -2.8].map((y, index) => (
        <mesh
          key={`pit-sidebeam-right-${index}`}
          position={[2.01, y, -0.6]}
        >
          <boxGeometry args={[0.1, 0.16, 3.1]} />
          <meshStandardMaterial
            map={beamWood.map}
            normalMap={beamWood.normalMap}
            color="#cbbfae"
            roughness={0.9}
          />
        </mesh>
      ))}
      <mesh position={[-2.1, -2.6, -0.6]} receiveShadow>
        <boxGeometry args={[0.2, 5.4, 3.4]} />
        <meshStandardMaterial color="#45444e" roughness={0.9} />
      </mesh>
      <mesh position={[2.1, -2.6, -0.6]} receiveShadow>
        <boxGeometry args={[0.2, 5.4, 3.4]} />
        <meshStandardMaterial color="#45444e" roughness={0.9} />
      </mesh>
      <mesh position={[0, -4.2, -0.6]} receiveShadow>
        <boxGeometry args={[4.2, 0.4, 3.4]} />
        <meshStandardMaterial color="#2a2b32" roughness={0.9} />
      </mesh>

      <pointLight
        position={[0, -1.9, 0.1]}
        color="#ff7a36"
        intensity={4.2}
        distance={7}
        decay={2}
      />
      <pointLight
        position={[0, 2.4, 2.2]}
        color="#ffb26b"
        intensity={1.6}
        distance={12}
        decay={2}
      />

      <group position={[9.7, 0, -1.2]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.5, 1.1, 12]} />
          <meshStandardMaterial color="#5a3d27" roughness={0.88} />
        </mesh>
        {[-0.3, 0.3].map((y, bandIndex) => (
          <mesh
            key={`barrel-band-${bandIndex}`}
            position={[0, 0.55 + y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.47, 0.035, 6, 14]} />
            <meshStandardMaterial
              color="#2e3038"
              metalness={0.7}
              roughness={0.45}
            />
          </mesh>
        ))}
      </group>
      <mesh position={[8.7, 0.42, 0.4]} rotation={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.85, 0.9]} />
        <meshStandardMaterial color="#58412c" roughness={0.9} />
      </mesh>
      <mesh position={[8.7, 0.87, 0.4]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.96, 0.08, 0.96]} />
        <meshStandardMaterial color="#3c2b1d" roughness={0.9} />
      </mesh>

      {/* Floor Cracks */}
      {floorCracks.map((crack) => (
        <mesh
          key={crack.key}
          position={[crack.x, 0.02, crack.z]}
          rotation={[-Math.PI / 2, 0, crack.angle]}
        >
          <planeGeometry args={[crack.length, 0.04]} />
          <meshBasicMaterial color="#1f1e24" />
        </mesh>
      ))}

      {/* Debris Pebbles */}
      {debris.map((piece) => (
        <mesh
          key={piece.key}
          position={[piece.x, piece.size * 0.5, piece.z]}
          rotation={[0, piece.rotation, 0]}
          castShadow
        >
          <boxGeometry args={[piece.size, piece.size, piece.size]} />
          <meshStandardMaterial color={piece.color} roughness={0.9} />
        </mesh>
      ))}

      {/* Atmospheric Dust Motes */}
      <DustMotes count={130} />

      {/* Torch Glow Sprites */}
      {[-7.1, -3.5, 3.5, 7.1].map((x, i) => (
        <GlowSprite
          key={`torch-glow-${i}`}
          position={[x, 3.71, -1.62]}
          color="#ff9933"
          size={1.6 + flicker}
          opacity={0.65}
        />
      ))}
    </group>
  );
};
