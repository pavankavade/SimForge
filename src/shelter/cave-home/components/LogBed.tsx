import React, { useMemo } from "react";
import { random } from "remotion";
import { bedKinematics, BED_X, BED_Z } from "../timeline";
import { easeOutBack } from "../../../kit/motion";
import { useSurface } from "../../../engine/materials";
import { makeFabric } from "../../../engine/textures";

interface LogBedProps {
  frame: number;
}

export const LogBed: React.FC<LogBedProps> = ({ frame }) => {
  const { exists, dropY, grassAlpha } = bedKinematics(frame);
  const strawMat = useSurface(
    "bed-straw",
    () => makeFabric({ base: "#cbb582", seed: 91 }),
    [6, 4]
  );

  // Generate deterministic rustic log slats and dry grass tufts matching reference video
  const { slats, crossLogs, strawTufts, surfaceStrands } = useMemo(() => {
    // 1. Two heavy base cross-logs on the floor (running along Z)
    const baseLogs = [
      { x: -0.42, y: 0.07, z: 0, r: 0.075, len: 0.95 },
      { x: 0.42, y: 0.07, z: 0, r: 0.075, len: 0.95 },
    ];

    // 2. Eight round split-log platform slats laid side-by-side (running along Z)
    const slatList = [];
    const slatCount = 9;
    const bedWidthX = 1.25;
    for (let i = 0; i < slatCount; i++) {
      const xNorm = i / (slatCount - 1); // 0 to 1
      const x = -bedWidthX / 2 + xNorm * bedWidthX;
      const seed = `slat-${i}`;
      slatList.push({
        x,
        y: 0.15 + (random(`${seed}-y`) * 0.015 - 0.0075),
        z: 0,
        r: 0.052 + random(`${seed}-r`) * 0.012,
        len: 1.0 + random(`${seed}-len`) * 0.08,
        rotZ: (random(`${seed}-rotz`) * 0.04 - 0.02),
        color: i % 2 === 0 ? "#4a3523" : "#563e2a",
      });
    }

    // 3. Fringed / tufted straw strands along all 4 perimeter edges of the mattress
    const tufts = [];
    const strawColors = ["#cbb582", "#baa172", "#d8c594", "#e2d1a3", "#b29b68"];
    const matLenX = 1.2;
    const matWidZ = 0.88;

    // Front edge (Z = +matWidZ/2) & Back edge (Z = -matWidZ/2)
    const edgeCountX = 22;
    for (let i = 0; i < edgeCountX; i++) {
      const x = -matLenX / 2 + (i / (edgeCountX - 1)) * matLenX;

      // Front edge
      const seedF = `tuft-f-${i}`;
      tufts.push({
        x: x + (random(`${seedF}-jx`) * 0.04 - 0.02),
        y: 0.22 + (random(`${seedF}-jy`) * 0.03 - 0.015),
        z: matWidZ / 2 + 0.02,
        rotX: Math.PI * 0.4 + random(`${seedF}-rx`) * 0.25,
        rotY: (random(`${seedF}-ry`) * 0.4 - 0.2),
        rotZ: (random(`${seedF}-rz`) * 0.3 - 0.15),
        len: 0.09 + random(`${seedF}-len`) * 0.05,
        r: 0.008 + random(`${seedF}-r`) * 0.004,
        color: strawColors[Math.floor(random(`${seedF}-col`) * strawColors.length)],
      });

      // Back edge
      const seedB = `tuft-b-${i}`;
      tufts.push({
        x: x + (random(`${seedB}-jx`) * 0.04 - 0.02),
        y: 0.22 + (random(`${seedB}-jy`) * 0.03 - 0.015),
        z: -matWidZ / 2 - 0.02,
        rotX: -Math.PI * 0.4 - random(`${seedB}-rx`) * 0.25,
        rotY: (random(`${seedB}-ry`) * 0.4 - 0.2),
        rotZ: (random(`${seedB}-rz`) * 0.3 - 0.15),
        len: 0.09 + random(`${seedB}-len`) * 0.05,
        r: 0.008 + random(`${seedB}-r`) * 0.004,
        color: strawColors[Math.floor(random(`${seedB}-col`) * strawColors.length)],
      });
    }

    // Left edge (X = -matLenX/2) & Right edge (X = +matLenX/2)
    const edgeCountZ = 16;
    for (let i = 0; i < edgeCountZ; i++) {
      const z = -matWidZ / 2 + (i / (edgeCountZ - 1)) * matWidZ;

      // Left edge
      const seedL = `tuft-l-${i}`;
      tufts.push({
        x: -matLenX / 2 - 0.02,
        y: 0.22 + (random(`${seedL}-jy`) * 0.03 - 0.015),
        z: z + (random(`${seedL}-jz`) * 0.04 - 0.02),
        rotX: (random(`${seedL}-rx`) * 0.3 - 0.15),
        rotY: (random(`${seedL}-ry`) * 0.4 - 0.2),
        rotZ: -Math.PI * 0.4 - random(`${seedL}-rz`) * 0.25,
        len: 0.09 + random(`${seedL}-len`) * 0.05,
        r: 0.008 + random(`${seedL}-r`) * 0.004,
        color: strawColors[Math.floor(random(`${seedL}-col`) * strawColors.length)],
      });

      // Right edge
      const seedR = `tuft-r-${i}`;
      tufts.push({
        x: matLenX / 2 + 0.02,
        y: 0.22 + (random(`${seedR}-jy`) * 0.03 - 0.015),
        z: z + (random(`${seedR}-jz`) * 0.04 - 0.02),
        rotX: (random(`${seedR}-rx`) * 0.3 - 0.15),
        rotY: (random(`${seedR}-ry`) * 0.4 - 0.2),
        rotZ: Math.PI * 0.4 + random(`${seedR}-rz`) * 0.25,
        len: 0.09 + random(`${seedR}-len`) * 0.05,
        r: 0.008 + random(`${seedR}-r`) * 0.004,
        color: strawColors[Math.floor(random(`${seedR}-col`) * strawColors.length)],
      });
    }

    // 4. Loose straw fibers scattered on top surface of the mattress
    const topStrands = [];
    for (let i = 0; i < 24; i++) {
      const seedT = `top-${i}`;
      topStrands.push({
        x: -matLenX * 0.42 + random(`${seedT}-x`) * matLenX * 0.84,
        y: 0.275 + random(`${seedT}-y`) * 0.01,
        z: -matWidZ * 0.42 + random(`${seedT}-z`) * matWidZ * 0.84,
        rotY: random(`${seedT}-roty`) * Math.PI * 2,
        rotZ: (random(`${seedT}-rotz`) * 0.1 - 0.05),
        len: 0.12 + random(`${seedT}-len`) * 0.08,
        r: 0.007,
        color: strawColors[Math.floor(random(`${seedT}-col`) * strawColors.length)],
      });
    }

    return {
      slats: slatList,
      crossLogs: baseLogs,
      strawTufts: tufts,
      surfaceStrands: topStrands,
    };
  }, []);

  if (!exists) return null;

  // Grass mattress drop animation with organic cushion squash overshoot
  const grassDropOffset = (1 - easeOutBack(Math.min(1, grassAlpha * 1.4))) * 1.2;

  return (
    <group position={[BED_X, dropY, BED_Z]}>
      {/* 1. Base Support Cross-Logs (lying on the floor) */}
      {crossLogs.map((log, idx) => (
        <mesh
          key={`base-${idx}`}
          position={[log.x, log.y, log.z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[log.r, log.r * 1.05, log.len, 8]} />
          <meshStandardMaterial color="#3a2719" roughness={0.92} />
        </mesh>
      ))}

      {/* 2. Split-Log Slat Platform (lying across base logs) */}
      {slats.map((slat, idx) => (
        <mesh
          key={`slat-${idx}`}
          position={[slat.x, slat.y, slat.z]}
          rotation={[Math.PI / 2, 0, slat.rotZ]}
        >
          <cylinderGeometry args={[slat.r, slat.r * 0.96, slat.len, 7]} />
          <meshStandardMaterial color={slat.color} roughness={0.88} />
        </mesh>
      ))}

      {/* 3. Pale Golden Dry Grass / Straw Thatched Mattress */}
      {grassAlpha > 0.01 && (
        <group position={[0, grassDropOffset, 0]}>
          {/* Solid Non-Glitched Thatched Straw Mattress Base */}
          <mesh position={[0, 0.23, 0]}>
            <boxGeometry args={[1.24, 0.14, 0.92]} />
            <meshStandardMaterial
              {...strawMat}
              color="#cbb582"
              roughness={0.92}
              transparent={grassAlpha < 0.98}
              opacity={grassAlpha}
              depthWrite={true}
            />
          </mesh>

          {/* Soft Crowned Straw Top Cushion */}
          <mesh position={[0, 0.305, 0]}>
            <boxGeometry args={[1.16, 0.04, 0.84]} />
            <meshStandardMaterial
              {...strawMat}
              color="#d8c594"
              roughness={0.88}
              transparent={grassAlpha < 0.98}
              opacity={grassAlpha}
              depthWrite={true}
            />
          </mesh>

          {/* Fringed / Tufted Perimeter Straw Strands (matching bed_frame_09.jpg) */}
          {strawTufts.map((tuft, idx) => (
            <mesh
              key={`tuft-${idx}`}
              position={[tuft.x, tuft.y, tuft.z]}
              rotation={[tuft.rotX, tuft.rotY, tuft.rotZ]}
            >
              <coneGeometry args={[tuft.r, tuft.len, 4]} />
              <meshStandardMaterial
                color={tuft.color}
                roughness={0.9}
                transparent={grassAlpha < 0.98}
                opacity={grassAlpha}
                depthWrite={true}
              />
            </mesh>
          ))}

          {/* Loose Surface Straw Fibers (lying flat on top of mattress) */}
          {surfaceStrands.map((strand, idx) => (
            <mesh
              key={`surf-${idx}`}
              position={[strand.x, 0.33, strand.z]}
              rotation={[Math.PI / 2, 0, strand.rotY]}
            >
              <cylinderGeometry args={[strand.r, strand.r, strand.len, 4]} />
              <meshStandardMaterial
                color={strand.color}
                roughness={0.92}
                transparent={grassAlpha < 0.98}
                opacity={grassAlpha}
                depthWrite={true}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
