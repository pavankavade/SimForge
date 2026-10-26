import React, { useMemo } from "react";
import { random } from "remotion";
import { campfireKinematics } from "../timeline";

interface CampfireProps {
  frame: number;
}

export const Campfire: React.FC<CampfireProps> = ({ frame }) => {
  const { exists, x, isBurning, intensity } = campfireKinematics(frame);

  // Faceted rugged stones ring and radial firewood logs matching reference video
  const { stones, logs } = useMemo(() => {
    // 1. Faceted rock ring (10 stones arranged in circle)
    const stoneList = [];
    const stoneCount = 10;
    const stoneColors = ["#484c52", "#565b62", "#3e4247", "#50555c"];
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const r = 0.44 + (random(`cstone-r-${i}`) * 0.06 - 0.03);
      const seed = `cstone-${i}`;
      stoneList.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        rot: [
          random(`${seed}-rx`) * Math.PI,
          random(`${seed}-ry`) * Math.PI,
          random(`${seed}-rz`) * Math.PI,
        ] as [number, number, number],
        scale: [
          0.11 + random(`${seed}-sx`) * 0.04,
          0.09 + random(`${seed}-sy`) * 0.03,
          0.12 + random(`${seed}-sz`) * 0.04,
        ] as [number, number, number],
        color: stoneColors[Math.floor(random(`${seed}-col`) * stoneColors.length)],
      });
    }

    // 2. Radial firewood logs pointing into center (like spokes of a wheel)
    const logList = [];
    const logCount = 6;
    for (let i = 0; i < logCount; i++) {
      const angle = (i / logCount) * Math.PI * 2 + 0.2;
      const seed = `log-${i}`;
      logList.push({
        angle,
        r: 0.24,
        tilt: 0.16 + (random(`${seed}-t`) * 0.06 - 0.03),
        len: 0.38 + random(`${seed}-len`) * 0.06,
        thickness: 0.035 + random(`${seed}-th`) * 0.01,
      });
    }

    return { stones: stoneList, logs: logList };
  }, []);

  if (!exists) return null;

  // Flame flicker animation
  const flicker = isBurning
    ? 0.88 + 0.12 * Math.sin(frame * 1.8) + 0.08 * Math.cos(frame * 2.7)
    : 0;

  return (
    <group position={[x, 0, 0]}>
      {/* 1. Rugged Faceted Stone Ring */}
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, s.scale[1] * 0.9, s.z]}
          rotation={s.rot}
          scale={s.scale}
        >
          <dodecahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial
            color={s.color}
            roughness={0.88}
            metalness={0.08}
            flatShading={true}
          />
        </mesh>
      ))}

      {/* 2. Radial Firewood Logs (Pointing inward into the fire) */}
      {logs.map((log, i) => {
        const posX = Math.cos(log.angle) * log.r;
        const posZ = Math.sin(log.angle) * log.r;
        return (
          <mesh
            key={`log-${i}`}
            position={[posX, 0.045, posZ]}
            rotation={[
              Math.sin(log.angle) * log.tilt,
              -log.angle + Math.PI / 2,
              Math.cos(log.angle) * log.tilt,
            ]}
          >
            <cylinderGeometry args={[log.thickness * 0.85, log.thickness, log.len, 6]} />
            <meshStandardMaterial color="#2d1b0f" roughness={0.92} />
          </mesh>
        );
      })}

      {/* 3. Glowing Embers Bed */}
      {isBurning && (
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.24, 0.26, 0.05, 10]} />
          <meshBasicMaterial color="#ff3b00" />
        </mesh>
      )}

      {/* 4. Stylized Organic Flame Cluster */}
      {isBurning && intensity > 0.02 && (
        <group position={[0, 0.06, 0]} scale={[intensity, intensity * flicker, intensity]}>
          {/* Main Radiant Golden Core Flame */}
          <mesh position={[0, 0.28, 0]}>
            <coneGeometry args={[0.18, 0.58, 8]} />
            <meshBasicMaterial color="#ffaa11" />
          </mesh>
          {/* Inner White-Hot Tongue */}
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.11, 0.38, 7]} />
            <meshBasicMaterial color="#fff6aa" />
          </mesh>
          {/* Outer Fluttering Orange Tongues */}
          <mesh
            position={[0.03 * Math.sin(frame * 0.25), 0.24, 0.02]}
            rotation={[0.08, 0.25, -0.1 + 0.06 * Math.sin(frame * 0.3)]}
          >
            <coneGeometry args={[0.14, 0.46, 7]} />
            <meshBasicMaterial color="#ff5500" />
          </mesh>
          <mesh
            position={[-0.04 * Math.cos(frame * 0.28), 0.2, -0.03]}
            rotation={[-0.1, -0.2, 0.12]}
          >
            <coneGeometry args={[0.1, 0.35, 6]} />
            <meshBasicMaterial color="#ff8800" />
          </mesh>
        </group>
      )}

      {/* 5. Dynamic Warm Fire Point Light */}
      {isBurning && (
        <pointLight
          position={[0, 0.45, 0]}
          color="#ff9933"
          intensity={flicker * 2.8 * intensity}
          distance={10}
          decay={1.8}
          castShadow={false}
        />
      )}
    </group>
  );
};
