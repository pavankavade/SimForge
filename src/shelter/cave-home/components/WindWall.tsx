import React, { useMemo } from "react";
import { random } from "remotion";
import {
  windWallKinematics,
  WALL_X,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  CAVE_HEIGHT,
  CAVE_DEPTH,
} from "../timeline";
import { easeOutBack } from "../../../kit/motion";

interface WindWallProps {
  frame: number;
}

interface StoneData {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: [number, number, number];
  rot: [number, number, number];
  colorIdx: number;
  isVentRow: boolean;
}

export const WindWall: React.FC<WindWallProps> = ({ frame }) => {
  const { exists, buildProgress, ventGap } = windWallKinematics(frame);

  // Generate deterministic stacked fieldstones / boulders matching reference video
  const { stones, doorFrameSticks } = useMemo(() => {
    const list: StoneData[] = [];
    const stoneColors = ["#50555c", "#626872", "#42464c", "#585e68", "#6c737c", "#3a3c40"];

    const halfDepth = CAVE_DEPTH / 2 - 0.15; // approx 1.95
    const doorHalf = DOOR_WIDTH / 2; // approx 0.58

    // 1. Left Wing Stack (Back Pillar: Z from -doorHalf to -1.90, Y: 0.22 to 2.40)
    const leftRows = 6;
    for (let row = 0; row < leftRows; row++) {
      const y = 0.22 + row * 0.38;
      const stonesInRow = 4;
      for (let s = 0; s < stonesInRow; s++) {
        const z = -doorHalf - 0.06 - (s / (stonesInRow - 1)) * (1.90 - doorHalf - 0.06);
        const seed = `left-${row}-${s}`;
        const xOffset = (s % 2 === 0 ? 0.07 : -0.07) + (random(`${seed}-rx`) * 0.06 - 0.03);
        const rY = y + (random(`${seed}-ry`) * 0.05 - 0.025);
        const rZ = z + (random(`${seed}-rz`) * 0.06 - 0.03);
        list.push({
          id: seed,
          x: xOffset,
          y: rY,
          z: rZ,
          scale: [
            0.28 + random(`${seed}-sx`) * 0.12,
            0.20 + random(`${seed}-sy`) * 0.08,
            0.28 + random(`${seed}-sz`) * 0.12,
          ],
          rot: [
            random(`${seed}-rotx`) * Math.PI,
            random(`${seed}-roty`) * Math.PI,
            random(`${seed}-rotz`) * Math.PI,
          ],
          colorIdx: Math.floor(random(`${seed}-col`) * stoneColors.length),
          isVentRow: false,
        });
      }
    }

    // 2. Right Wing Stack (Front Pillar: Z from +doorHalf to +1.60, Y: 0.22 to 2.40)
    const rightRows = 6;
    for (let row = 0; row < rightRows; row++) {
      const y = 0.22 + row * 0.38;
      const stonesInRow = 4;
      for (let s = 0; s < stonesInRow; s++) {
        const z = doorHalf + 0.06 + (s / (stonesInRow - 1)) * (1.60 - doorHalf - 0.06);
        const seed = `right-${row}-${s}`;
        const xOffset = (s % 2 === 0 ? 0.07 : -0.07) + (random(`${seed}-rx`) * 0.06 - 0.03);
        const rY = y + (random(`${seed}-ry`) * 0.05 - 0.025);
        const rZ = z + (random(`${seed}-rz`) * 0.06 - 0.03);
        list.push({
          id: seed,
          x: xOffset,
          y: rY,
          z: rZ,
          scale: [
            0.28 + random(`${seed}-sx`) * 0.12,
            0.20 + random(`${seed}-sy`) * 0.08,
            0.28 + random(`${seed}-sz`) * 0.12,
          ],
          rot: [
            random(`${seed}-rotx`) * Math.PI,
            random(`${seed}-roty`) * Math.PI,
            random(`${seed}-rotz`) * Math.PI,
          ],
          colorIdx: Math.floor(random(`${seed}-col`) * stoneColors.length),
          isVentRow: false,
        });
      }
    }

    // 3. Middle Arch / Keystone Lintel (Seamlessly bridges left pillar & right pillar over the door)
    // Firmly keys into Left Pillar (Z = -0.76) and Right Pillar (Z = +0.76)
    const archRows = 2;
    for (let row = 0; row < archRows; row++) {
      const baseY = DOOR_HEIGHT + 0.14 + row * 0.22;
      const stonesAcross = 8;
      const archSpan = DOOR_WIDTH + 0.36; // 1.51m span from -0.755 to +0.755
      for (let s = 0; s < stonesAcross; s++) {
        const zNorm = s / (stonesAcross - 1); // 0 to 1
        const z = -doorHalf - 0.18 + zNorm * archSpan;
        const seed = `arch-${row}-${s}`;
        const xOffset = (s % 2 === 0 ? 0.06 : -0.06) + (random(`${seed}-rx`) * 0.06 - 0.03);
        // Slight natural curved masonry crown in the center
        const crown = Math.cos(((z / (doorHalf + 0.18)) * Math.PI) / 2) * 0.07;
        const y = baseY + crown + (random(`${seed}-ry`) * 0.04 - 0.02);
        list.push({
          id: seed,
          x: xOffset,
          y,
          z: z + (random(`${seed}-rz`) * 0.05 - 0.025),
          scale: [
            0.28 + random(`${seed}-sx`) * 0.10,
            0.20 + random(`${seed}-sy`) * 0.08,
            0.26 + random(`${seed}-sz`) * 0.10,
          ],
          rot: [
            random(`${seed}-rotx`) * Math.PI,
            random(`${seed}-roty`) * Math.PI,
            random(`${seed}-rotz`) * Math.PI,
          ],
          colorIdx: Math.floor(random(`${seed}-col`) * stoneColors.length),
          isVentRow: false,
        });
      }
    }

    // 4. Temporary Vent Closure Stones (Y: 2.68 to 3.35)
    // Sits strictly ABOVE the permanent wall; removed on BEATS.ventOpen without touching the arch!
    const ventRows = 2;
    for (let r = 0; r < ventRows; r++) {
      const y = 2.70 + r * 0.34;
      const count = 10;
      for (let s = 0; s < count; s++) {
        const zNorm = s / (count - 1);
        const z = -halfDepth + 0.2 + zNorm * (CAVE_DEPTH - 0.8);
        const seed = `vent-${r}-${s}`;
        list.push({
          id: seed,
          x: (s % 2 === 0 ? 0.05 : -0.05) + (random(`${seed}-rx`) * 0.06 - 0.03),
          y: y + (random(`${seed}-ry`) * 0.05 - 0.025),
          z,
          scale: [
            0.27 + random(`${seed}-sx`) * 0.08,
            0.19 + random(`${seed}-sy`) * 0.06,
            0.27 + random(`${seed}-sz`) * 0.1,
          ],
          rot: [
            random(`${seed}-rotx`) * Math.PI,
            random(`${seed}-roty`) * Math.PI,
            random(`${seed}-rotz`) * Math.PI,
          ],
          colorIdx: Math.floor(random(`${seed}-col`) * stoneColors.length),
          isVentRow: true,
        });
      }
    }

    // Rustic wooden doorway frame (two vertical posts + top lintel beam)
    const doorPosts = [
      { z: -doorHalf - 0.02, h: DOOR_HEIGHT, r: 0.07 },
      { z: doorHalf + 0.02, h: DOOR_HEIGHT, r: 0.07 },
    ];

    return { stones: list, doorFrameSticks: doorPosts };
  }, []);

  if (!exists || buildProgress < 0.01) return null;

  const stoneColors = ["#50555c", "#626872", "#42464c", "#585e68", "#6c737c", "#3a3c40"];

  return (
    <group position={[WALL_X, 0, 0]}>
      {/* Rustic Timber Doorframe (matching reference video's doorway frame) */}
      <group>
        {/* Left and Right Vertical Door Jamb Posts */}
        {doorFrameSticks.map((post, idx) => {
          const postT = Math.min(1, buildProgress * 1.5);
          const dropY = (1 - postT) * 3.0;
          return (
            <mesh key={`post-${idx}`} position={[0, post.h * 0.5 + dropY, post.z]}>
              <cylinderGeometry args={[post.r, post.r * 1.05, post.h, 7]} />
              <meshStandardMaterial color="#3b2718" roughness={0.92} />
            </mesh>
          );
        })}

        {/* Lintel Beam Above Door */}
        {buildProgress > 0.4 && (
          <mesh
            position={[
              0,
              DOOR_HEIGHT + 0.05 + (1 - Math.min(1, (buildProgress - 0.4) * 2)) * 2.5,
              0,
            ]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.075, 0.075, DOOR_WIDTH + 0.28, 7]} />
            <meshStandardMaterial color="#362315" roughness={0.92} />
          </mesh>
        )}
      </group>

      {/* Stacked Natural Fieldstones / Boulders */}
      {stones.map((stone) => {
        // Individual stone drop-in stagger based on height during initial wall build
        const heightNorm = stone.y / CAVE_HEIGHT; // 0 to 1
        const startT = heightNorm * 0.65;
        const endT = Math.min(1, startT + 0.35);

        let localProg = 0;
        if (buildProgress >= endT) {
          localProg = 1;
        } else if (buildProgress > startT) {
          localProg = (buildProgress - startT) / (endT - startT);
        }

        if (localProg <= 0.01) return null;

        const easeP = easeOutBack(localProg);
        const dropY = (1 - easeP) * 3.5;

        // When vent gap opens on line l5b, the temporary vent stones tumble OUTWARD to the exterior rain
        // NEVER dropping down into the middle arch or permanent wall below!
        if (stone.isVentRow) {
          if (ventGap >= 0.70) {
            // Completely cleared away, leaving wide 1.25m open transom gap!
            return null;
          }
          if (ventGap > 0) {
            const t = ventGap / 0.70; // 0 to 1
            const tumbleOutX = -t * 2.2 - (random(`${stone.id}-tx`) * 0.5 * t);
            const tumbleFallY = -t * t * 1.6;
            const tumbleZ = (random(`${stone.id}-tz`) * 0.3 - 0.15) * t;
            const ventScale = Math.max(0.01, 1 - t * 0.85);
            return (
              <mesh
                key={stone.id}
                position={[
                  stone.x + tumbleOutX,
                  stone.y + dropY + tumbleFallY,
                  stone.z + tumbleZ,
                ]}
                rotation={[
                  stone.rot[0] + t * 2.8,
                  stone.rot[1] + t * 2.0,
                  stone.rot[2] + t * 2.2,
                ]}
                scale={[
                  stone.scale[0] * ventScale,
                  stone.scale[1] * ventScale,
                  stone.scale[2] * ventScale,
                ]}
              >
                <dodecahedronGeometry args={[1.0, 0]} />
                <meshStandardMaterial
                  color={stoneColors[stone.colorIdx]}
                  roughness={0.88}
                  metalness={0.08}
                  flatShading={true}
                />
              </mesh>
            );
          }
        }

        const stoneColor = stoneColors[stone.colorIdx];

        return (
          <mesh
            key={stone.id}
            position={[stone.x, stone.y + dropY, stone.z]}
            rotation={stone.rot}
            scale={stone.scale}
          >
            {/* Dodecahedron provides organic, sharp, faceted rock geometry */}
            <dodecahedronGeometry args={[1.0, 0]} />
            <meshStandardMaterial
              color={stoneColor}
              roughness={0.88}
              metalness={0.08}
              flatShading={true}
            />
          </mesh>
        );
      })}
    </group>
  );
};
