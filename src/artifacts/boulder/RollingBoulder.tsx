import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeGranite, makeMetal } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";

export type RollingBoulderKind = "stone" | "drum" | "spiked";

interface RollingBoulderProps {
  kind: RollingBoulderKind;
  /** Rolling radius (spike tips for the spiked ball). */
  radius: number;
  position: Vec3;
  /** Roll angle about +z. */
  angle: number;
  /** Hall-wide drum length along z. */
  drumLength?: number;
  /** Electromagnet glow on iron (0..1). */
  charge?: number;
  /** Riders (squashed victims) that spin with the boulder. */
  children?: React.ReactNode;
}

/** Points spread evenly over a sphere (spike directions). */
const fibonacciSphere = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const rr = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    return new THREE.Vector3(Math.cos(theta) * rr, y, Math.sin(theta) * rr);
  });

const SPIKE_DIRS = fibonacciSphere(26);
const UP = new THREE.Vector3(0, 1, 0);

export const RollingBoulder: React.FC<RollingBoulderProps> = ({
  kind,
  radius,
  position,
  angle,
  drumLength = 3.1,
  charge = 0,
  children,
}) => {
  const granite = useSurface("rb-granite", () => makeGranite({ seed: 42 }), [2, 1]);
  const graniteDrum = useSurface(
    "rb-granite-drum",
    () => makeGranite({ base: "#5a5c66", baseAlt: "#70727e", darkVein: "#3a3b44", seed: 47 }),
    [3, 1]
  );
  const iron = useSurface("rb-iron", () => makeMetal({ base: "#4a4f5a", seed: 13, roughness: 150 }), [2, 1]);

  const spikes = useMemo(
    () =>
      SPIKE_DIRS.map((dir) => ({
        dir,
        quat: new THREE.Quaternion().setFromUnitVectors(UP, dir),
      })),
    []
  );

  let body: React.ReactNode = null;
  if (kind === "stone") {
    body = (
      <>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 40, 28]} />
          <meshStandardMaterial
            map={granite.map}
            normalMap={granite.normalMap}
            roughnessMap={granite.roughnessMap}
            normalScale={new THREE.Vector2(1.2, 1.2)}
            color="#d5d7df"
            roughness={0.9}
          />
        </mesh>
        {/* Carved grooves so the roll reads clearly */}
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} rotation={[0, a, 0]}>
            <torusGeometry args={[radius * 0.995, radius * 0.045, 8, 48]} />
            <meshStandardMaterial color="#3a3c46" roughness={0.95} />
          </mesh>
        ))}
      </>
    );
  } else if (kind === "drum") {
    const half = drumLength / 2;
    body = (
      <>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, drumLength, 48, 1]} />
          <meshStandardMaterial
            map={graniteDrum.map}
            normalMap={graniteDrum.normalMap}
            roughnessMap={graniteDrum.roughnessMap}
            normalScale={new THREE.Vector2(1.1, 1.1)}
            color="#d0d2da"
            roughness={0.9}
          />
        </mesh>
        {/* Iron hoops near both ends */}
        {[-half + 0.25, half - 0.25].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[radius + 0.01, 0.07, 8, 48]} />
            <meshStandardMaterial color="#2e3139" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {/* Carved face: spoked wheel so the spin is obvious */}
        <mesh position={[0, 0, half + 0.005]}>
          <ringGeometry args={[radius * 0.7, radius * 0.82, 40]} />
          <meshStandardMaterial color="#3a3c46" roughness={0.95} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0, half + 0.006]} rotation={[0, 0, (i * Math.PI) / 3]}>
            <planeGeometry args={[radius * 1.4, 0.1]} />
            <meshStandardMaterial color="#3a3c46" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 0, half + 0.01]}>
          <circleGeometry args={[0.2, 20]} />
          <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
        </mesh>
      </>
    );
  } else {
    const core = radius * 0.68;
    const glow = new THREE.Color("#5fd0ff").multiplyScalar(charge * 1.6);
    body = (
      <>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[core, 36, 24]} />
          <meshStandardMaterial
            map={iron.map}
            roughnessMap={iron.roughnessMap}
            color="#9aa0ac"
            metalness={0.85}
            roughness={0.45}
            emissive={glow}
          />
        </mesh>
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} rotation={[0, a, 0]}>
            <torusGeometry args={[core * 1.005, 0.05, 8, 40]} />
            <meshStandardMaterial color="#2a2d34" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {spikes.map(({ dir, quat }, i) => {
          const len = radius - core + 0.08;
          const p = dir.clone().multiplyScalar(core + len / 2 - 0.06);
          return (
            <mesh key={i} position={[p.x, p.y, p.z]} quaternion={quat} castShadow>
              <coneGeometry args={[0.13, len, 8]} />
              <meshStandardMaterial color="#c9ced8" metalness={0.9} roughness={0.25} emissive={glow} />
            </mesh>
          );
        })}
      </>
    );
  }

  return (
    <group position={position}>
      <group rotation={[0, 0, angle]}>
        {body}
        {children}
      </group>
    </group>
  );
};

interface BoulderShatterProps {
  at: number;
  position: Vec3;
  radius: number;
  drumLength?: number;
  seed?: string;
}

/** Chunks of a smashed drum flying apart, bouncing and crumbling away. */
export const BoulderShatter: React.FC<BoulderShatterProps> = ({ at, position, radius, drumLength = 3.1, seed = "shatter" }) => {
  const frame = useCurrentFrame();
  const granite = useSurface(
    "rb-granite-drum",
    () => makeGranite({ base: "#5a5c66", baseAlt: "#70727e", darkVein: "#3a3b44", seed: 47 }),
    [3, 1]
  );
  const age = frame - at;
  if (age < 0 || age > 80) return null;
  const chunks = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + random(`${seed}-a-${i}`) * 0.3;
    const size = radius * (0.32 + random(`${seed}-s-${i}`) * 0.3);
    const z = (random(`${seed}-z-${i}`) - 0.5) * drumLength * 0.8;
    const speed = 0.05 + random(`${seed}-v-${i}`) * 0.08;
    // Blown mostly away from the hammer (toward +x) and upward.
    const vx = Math.cos(a) * speed + 0.05;
    const vy = Math.abs(Math.sin(a)) * speed + 0.06;
    const vz = (random(`${seed}-vz-${i}`) - 0.3) * 0.05;
    const x0 = position[0] + Math.cos(a) * radius * 0.5;
    const y0 = position[1] + Math.sin(a) * radius * 0.5;
    const tLand = (vy + Math.sqrt(vy * vy + 2 * 0.006 * Math.max(0.01, y0 - size / 2))) / 0.006;
    const t = Math.min(age, tLand);
    const y = Math.max(size / 2, y0 + vy * t - 0.003 * t * t);
    const shrink = age > 45 ? Math.max(0.001, 1 - (age - 45) / 35) : 1;
    return {
      key: i,
      size,
      position: [x0 + vx * t, y, position[2] + z + vz * t] as Vec3,
      rotation: [t * 0.08 * random(`${seed}-rx-${i}`), t * 0.05, t * 0.11 * (random(`${seed}-rz-${i}`) - 0.5)] as Vec3,
      scale: shrink,
    };
  });
  return (
    <group>
      {chunks.map((c) => (
        <mesh key={c.key} position={c.position} rotation={c.rotation} scale={c.scale} castShadow>
          <dodecahedronGeometry args={[c.size, 0]} />
          <meshStandardMaterial map={granite.map} normalMap={granite.normalMap} color="#d0d2da" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
};
