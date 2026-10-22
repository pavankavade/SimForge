import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { GlowSprite } from "../dungeon/Fx";

interface GelatinousCubeProps {
  center: Vec3;
  size: Vec3;
  spawnFrame: number;
  /** Frames something smacks into the jelly (adds a damped wobble). */
  impulses?: number[];
}

const JELLY = "#79eea0";

const wobbleAt = (frame: number, impulses: number[]) =>
  impulses.reduce((acc, at) => {
    const t = frame - at;
    if (t < 0) return acc;
    return acc + Math.sin(t * 0.55) * Math.exp(-t / 14);
  }, 0);

/**
 * Translucent gelatinous cube clinging to the ceiling. It plops out of the
 * ceiling, wobbles whenever something lands in it, and digests whatever it
 * holds (bubbles, a lost sword, coins).
 */
export const GelatinousCube: React.FC<GelatinousCubeProps> = ({ center, size, spawnFrame, impulses = [] }) => {
  const frame = useCurrentFrame();
  if (frame < spawnFrame) return null;
  const age = frame - spawnFrame;
  const grow = Math.min(1, age / 10);
  const elastic = grow < 1 ? 1 - (1 - grow) ** 3 : 1 + 0.18 * Math.sin((age - 10) * 0.7) * Math.exp(-(age - 10) / 7);
  const w = 0.12 * wobbleAt(frame, impulses);
  const idle = 0.015 * Math.sin(frame * 0.12);
  const sx = elastic * (1 + w * 0.6 + idle);
  const sy = elastic * (1 - w + idle * 0.5);
  const sz = elastic * (1 + w * 0.6 - idle);
  const [W, H, D] = size;
  const top: Vec3 = [center[0], center[1] + H / 2, center[2]];

  const edges: { p: Vec3; s: Vec3 }[] = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      edges.push({ p: [0, (a * H) / 2, (b * D) / 2], s: [W, 0.07, 0.07] });
      edges.push({ p: [(a * W) / 2, 0, (b * D) / 2], s: [0.07, H, 0.07] });
      edges.push({ p: [(a * W) / 2, (b * H) / 2, 0], s: [0.07, 0.07, D] });
    }
  }

  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const period = 50 + random(`gc-bp-${i}`) * 50;
    const u = ((frame + random(`gc-ph-${i}`) * period) % period) / period;
    return {
      key: i,
      p: [
        (random(`gc-bx-${i}`) - 0.5) * W * 0.8 + 0.05 * Math.sin(u * 9 + i),
        -H / 2 + 0.2 + u * (H - 0.4),
        (random(`gc-bz-${i}`) - 0.5) * D * 0.8,
      ] as Vec3,
      r: 0.04 + random(`gc-br-${i}`) * 0.07,
    };
  });

  const drips = Array.from({ length: 5 }, (_, i) => {
    const period = 70 + random(`gc-dp-${i}`) * 40;
    const u = ((frame + random(`gc-dph-${i}`) * period) % period) / period;
    return {
      key: i,
      x: (random(`gc-dx-${i}`) - 0.5) * W * 0.85,
      z: (random(`gc-dz-${i}`) - 0.5) * D * 0.7,
      len: 0.12 + u * 0.35,
    };
  });

  return (
    <group position={top}>
      <group scale={[sx, sy, sz]}>
        <group position={[0, -H / 2, 0]}>
          {/* Swallowed junk */}
          <group position={[0.7, -0.3, -0.6]} rotation={[0.3, 0.4, 0.9 + frame * 0.004]}>
            <mesh>
              <boxGeometry args={[0.06, 0.9, 0.02]} />
              <meshStandardMaterial color="#c6d0de" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.47, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.05]} />
              <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={`coin-${i}`}
              position={[-0.9 + i * 0.35, -0.9 + 0.05 * Math.sin(frame * 0.05 + i), -0.8 + i * 0.1]}
              rotation={[1.2 + i, frame * 0.01 + i, 0]}
            >
              <cylinderGeometry args={[0.09, 0.09, 0.02, 12]} />
              <meshStandardMaterial color="#e2b946" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
          {bubbles.map((b) => (
            <mesh key={b.key} position={b.p}>
              <sphereGeometry args={[b.r, 8, 6]} />
              <meshStandardMaterial color="#d8ffe2" transparent opacity={0.55} roughness={0.05} depthWrite={false} />
            </mesh>
          ))}
          {/* Jelly body */}
          <mesh renderOrder={2}>
            <boxGeometry args={[W, H, D]} />
            <meshStandardMaterial
              color={JELLY}
              emissive="#1f7a45"
              emissiveIntensity={0.35}
              roughness={0.08}
              metalness={0.05}
              transparent
              opacity={0.36}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {edges.map((e, i) => (
            <mesh key={`edge-${i}`} position={e.p} renderOrder={3}>
              <boxGeometry args={e.s} />
              <meshStandardMaterial color="#b6ffcb" emissive="#3fbf6a" emissiveIntensity={0.4} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          ))}
          {/* Beady eyes on the camera face */}
          {[-0.45, 0.45].map((dx) => (
            <group key={dx} position={[dx, H * 0.18, D / 2 - 0.25]}>
              <mesh>
                <sphereGeometry args={[0.15, 14, 10]} />
                <meshStandardMaterial color="#173a22" roughness={0.3} />
              </mesh>
              <mesh position={[0.05, 0.05, 0.12]}>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {drips.map((d) => (
            <mesh key={`drip-${d.key}`} position={[d.x, -H / 2 - d.len / 2 + 0.05, d.z]} scale={[0.09, d.len / 2, 0.09]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color={JELLY} emissive="#1f7a45" emissiveIntensity={0.3} transparent opacity={0.6} roughness={0.08} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
      <GlowSprite position={[0, -H / 2, 0.4]} color="#6dff9a" size={W * 1.3} opacity={0.18} />
      <pointLight position={[0, -H / 2, D / 2 + 0.6]} color="#7dffa6" intensity={3.2} distance={7} decay={2} />
    </group>
  );
};
