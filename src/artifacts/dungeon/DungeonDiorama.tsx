import type React from "react";
import { useCurrentFrame, random } from "remotion";
import { DustMotes, GlowSprite } from "./Fx";

const BRICK_COLORS = [
  "#4b4e5d",
  "#555868",
  "#454855",
  "#5c5f6f",
  "#50525f",
  "#5a5863",
];

export const DungeonDiorama: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = Math.sin(frame * 0.3) * 0.12 + Math.cos(frame * 0.77) * 0.08;
  const flickerTwo = Math.sin(frame * 0.26 + 1.7) * 0.1;

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

  const foregroundTiles: Array<{
    x: number;
    z: number;
    color: string;
    key: string;
  }> = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 10; col++) {
      foregroundTiles.push({
        x: -9.5 + col * 2.1,
        z: 5.5 + row * 1.8,
        color:
          (row + col) % 2 === 0
            ? "#514f58"
            : col % 3 === 0
              ? "#5d5a62"
              : "#49474f",
        key: `foreground-tile-${row}-${col}`,
      });
    }
  }

  const floorCracks = Array.from({ length: 24 }, (_, index) => ({
    x: -10 + random(`floor-crack-x-${index}`) * 20,
    z: 3.2 + random(`floor-crack-z-${index}`) * 9.2,
    angle: random(`floor-crack-angle-${index}`) * Math.PI,
    length: 0.35 + random(`floor-crack-length-${index}`) * 0.65,
    key: `floor-crack-${index}`,
  }));

  const debris = Array.from({ length: 18 }, (_, index) => ({
    x:
      (random(`debris-side-${index}`) > 0.5 ? 1 : -1) *
      (2.6 + random(`debris-x-${index}`) * 7.2),
    z: -1.2 + random(`debris-z-${index}`) * 12.4,
    size: 0.055 + random(`debris-size-${index}`) * 0.14,
    rotation: random(`debris-rotation-${index}`) * Math.PI,
    color: random(`debris-color-${index}`) > 0.6 ? "#615d62" : "#494950",
    key: `debris-${index}`,
  }));

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 3.1, -2.55]} receiveShadow>
        <boxGeometry args={[22, 6.4, 0.5]} />
        <meshStandardMaterial color="#2c2f3a" roughness={0.94} />
      </mesh>

      {bricks.map((brick) => (
        <mesh
          key={brick.key}
          position={[brick.x, brick.y, -2.26]}
          receiveShadow
        >
          <boxGeometry args={[2.34, 0.94, 0.08]} />
          <meshStandardMaterial
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
            <meshStandardMaterial color="#5a5e70" roughness={0.86} />
          </mesh>
          <mesh position={[0, 3.02, 0.05]} castShadow>
            <boxGeometry args={[1.16, 0.32, 0.66]} />
            <meshStandardMaterial color="#6b7084" roughness={0.8} />
          </mesh>
          <mesh position={[0, -3.02, 0.05]} castShadow>
            <boxGeometry args={[1.16, 0.36, 0.66]} />
            <meshStandardMaterial color="#6b7084" roughness={0.8} />
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
            <meshStandardMaterial color="#626779" roughness={0.84} />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[0.84, 0.2, 0.68]} />
            <meshStandardMaterial color="#74798d" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.5, -1.9]} castShadow>
        <torusGeometry args={[2.7, 0.3, 8, 26, Math.PI]} />
        <meshStandardMaterial color="#5d6173" roughness={0.85} />
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
      <mesh position={[0, 3.7, -1.66]}>
        <boxGeometry args={[0.09, 1.0, 0.035]} />
        <meshStandardMaterial
          color="#d2a545"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 3.9, -1.66]}>
        <boxGeometry args={[0.6, 0.09, 0.035]} />
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

      <mesh position={[-6, -0.25, -0.6]} receiveShadow>
        <boxGeometry args={[8, 0.5, 3.4]} />
        <meshStandardMaterial color="#4d505d" roughness={0.88} />
      </mesh>
      <mesh position={[6, -0.25, -0.6]} receiveShadow>
        <boxGeometry args={[8, 0.5, 3.4]} />
        <meshStandardMaterial color="#4d505d" roughness={0.88} />
      </mesh>

      {[-9.2, -8.1, -7.0, -5.9, -4.8, -3.7, -2.6].map((x, index) => (
        <mesh
          key={`tile-left-${index}`}
          position={[x, 0.012, -0.6]}
          receiveShadow
        >
          <boxGeometry args={[1.03, 0.035, 3.2]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#585b69" : "#50535f"}
            roughness={0.82}
          />
        </mesh>
      ))}
      {[2.6, 3.7, 4.8, 5.9, 7.0, 8.1, 9.2].map((x, index) => (
        <mesh
          key={`tile-right-${index}`}
          position={[x, 0.012, -0.6]}
          receiveShadow
        >
          <boxGeometry args={[1.03, 0.035, 3.2]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#555865" : "#4d505c"}
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

      <mesh position={[0, -0.26, 9.125]} receiveShadow>
        <boxGeometry args={[22, 0.52, 8.65]} />
        <meshStandardMaterial color="#444752" roughness={0.9} />
      </mesh>
      {foregroundTiles.map((tile) => (
        <mesh
          key={tile.key}
          position={[tile.x, 0.012, tile.z]}
          receiveShadow
        >
          <boxGeometry args={[1.96, 0.035, 1.7]} />
          <meshStandardMaterial color={tile.color} roughness={0.84} />
        </mesh>
      ))}

      <mesh position={[-6, -3.2, -0.6]} receiveShadow>
        <boxGeometry args={[8, 5.4, 3.4]} />
        <meshStandardMaterial color="#2b2a2e" roughness={0.95} />
      </mesh>
      <mesh position={[6, -3.2, -0.6]} receiveShadow>
        <boxGeometry args={[8, 5.4, 3.4]} />
        <meshStandardMaterial color="#2b2a2e" roughness={0.95} />
      </mesh>

      {[-6, 6].map((x, index) => (
        <group key={`strata-${index}`}>
          <mesh position={[x, -1.15, 1.115]}>
            <boxGeometry args={[8, 0.16, 0.05]} />
            <meshStandardMaterial color="#4f3b2d" roughness={0.95} />
          </mesh>
          <mesh position={[x, -2.35, 1.115]}>
            <boxGeometry args={[8, 0.12, 0.05]} />
            <meshStandardMaterial color="#3e322b" roughness={0.95} />
          </mesh>
          <mesh position={[x, -3.5, 1.115]}>
            <boxGeometry args={[8, 0.2, 0.05]} />
            <meshStandardMaterial color="#332b27" roughness={0.95} />
          </mesh>
          {[-2.4, 0.4, 2.8].map((offset, rockIndex) => (
            <mesh
              key={`strata-rock-${index}-${rockIndex}`}
              position={[x + offset, -1.9 - rockIndex * 0.7, 1.12]}
              rotation={[0, 0, rockIndex * 0.6]}
            >
              <dodecahedronGeometry args={[0.32, 0]} />
              <meshStandardMaterial
                color="#524238"
                roughness={0.95}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}

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
          <meshStandardMaterial color="#5a3d27" roughness={0.9} />
        </mesh>
      ))}
      {[-1.3, -3.1].map((y, index) => (
        <mesh key={`pit-crossbeam-${index}`} position={[0, y, -2.0]}>
          <boxGeometry args={[3.9, 0.18, 0.12]} />
          <meshStandardMaterial color="#4a3222" roughness={0.9} />
        </mesh>
      ))}
      {[-1.6, -2.8].map((y, index) => (
        <mesh
          key={`pit-sidebeam-${index}`}
          position={[-2.01, y, -0.6]}
        >
          <boxGeometry args={[0.1, 0.16, 3.1]} />
          <meshStandardMaterial color="#4a3222" roughness={0.9} />
        </mesh>
      ))}
      {[-1.6, -2.8].map((y, index) => (
        <mesh
          key={`pit-sidebeam-right-${index}`}
          position={[2.01, y, -0.6]}
        >
          <boxGeometry args={[0.1, 0.16, 3.1]} />
          <meshStandardMaterial color="#4a3222" roughness={0.9} />
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

      <group position={[-9.2, 0, 0.35]}>
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
      <DustMotes count={90} />

      {/* Torch Glow Sprites */}
      {[-6, 2, 6].map((x, i) => (
        <GlowSprite
          key={`torch-glow-${i}`}
          position={[x, 3.5, -1.9]}
          color="#ff9933"
          size={1.6 + flicker}
          opacity={0.65}
        />
      ))}
    </group>
  );
};
