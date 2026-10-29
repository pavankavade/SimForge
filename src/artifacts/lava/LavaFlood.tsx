import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { GlowSprite } from "../dungeon/Fx";

/**
 * The finale: iron hatches in the back wall slide up on `openFrame`, lava
 * pours out of them, and a wave with a curling crest runs the length of the
 * hall (front at `frontX`), leaving the whole floor under `floodY`.
 */
export interface LavaFloodProps {
  ventXs: readonly number[];
  openFrame: number;
  frontX: number;
  /** 0..1 how far the wave has run (crest height falls off as it spreads). */
  run: number;
  left: number;
  right: number;
  floodY: number;
  z?: number;
  depth?: number;
}

const VENT_Y = 1.3;

/** Side profile of the wave: flat tail at floodY, rising to a crest just behind the front. */
const waveShape = (left: number, front: number, floodY: number, crest: number) => {
  const s = new THREE.Shape();
  const bottom = -1.2;
  s.moveTo(left, bottom);
  s.lineTo(left, floodY);
  const steps = 18;
  const tailStart = Math.max(left, front - 3.2);
  s.lineTo(tailStart, floodY);
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const x = tailStart + (front - tailStart) * u;
    s.lineTo(x, floodY + crest * Math.sin(u * Math.PI * 0.9) ** 2 * (0.4 + 0.6 * u));
  }
  // Curl over the front and back down.
  s.quadraticCurveTo(front + 0.6, floodY + crest * 0.9, front + 0.2, floodY + crest * 0.2);
  s.lineTo(front, bottom);
  s.lineTo(left, bottom);
  return s;
};

export const LavaFlood: React.FC<LavaFloodProps> = ({ ventXs, openFrame, frontX, run, left, right, floodY, z = -0.6, depth = 3.2 }) => {
  const frame = useCurrentFrame();
  const open = Math.min(1, Math.max(0, (frame - openFrame) / 10));
  const crest = 1.9 * (1 - run) + 0.15;
  const front = Math.min(frontX, right);
  const geo = useMemo(() => {
    if (run <= 0) return null;
    const g = new THREE.ExtrudeGeometry(waveShape(left, front, floodY, front >= right ? 0.05 : crest), { depth, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, z - depth / 2);
    return g;
  }, [left, front, floodY, crest, run, right, depth, z]);
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.12);
  return (
    <group>
      {ventXs.map((vx) => (
        <group key={vx} position={[vx, VENT_Y, z - 1.62]}>
          {/* Iron frame + dark mouth */}
          <mesh position={[0, 0, 0.09]} visible={open > 0}>
            <planeGeometry args={[1.2, 1.0]} />
            <meshStandardMaterial color="#1a0a06" emissive="#ff5a1f" emissiveIntensity={1.4 * open} />
          </mesh>
          {/* Hatch disguised as wall stone: slides up into the wall when it opens */}
          <group position={[0, 1.05 * open, 0.16]}>
            <mesh>
              <boxGeometry args={[1.5, 1.3, 0.1]} />
              <meshStandardMaterial color="#3d414e" roughness={0.95} />
            </mesh>
            {[-0.33, 0.33].map((dy) => (
              <mesh key={dy} position={[0, dy, 0.055]}>
                <planeGeometry args={[1.5, 0.03]} />
                <meshBasicMaterial color="#1e2029" />
              </mesh>
            ))}
          </group>
          {/* Lava gushing out and down to the floor */}
          {open > 0.2 && run < 1 ? (
            <mesh position={[0, -0.6, 0.55]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[1.0, 1.6, 0.25]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff6a1a" emissiveIntensity={2} />
            </mesh>
          ) : null}
          {open > 0 ? <GlowSprite position={[0, 0, 0.4]} color="#ff7a2a" size={2.6 * open} opacity={0.55} /> : null}
        </group>
      ))}
      {geo ? (
        <>
          <mesh geometry={geo}>
            <meshStandardMaterial color="#e8601e" emissive="#d84010" emissiveIntensity={0.8 * pulse} roughness={0.5} />
          </mesh>
          {/* Hot bright skin on top */}
          <mesh position={[(left + front) / 2, floodY + 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[Math.max(0.01, front - left - 0.6), depth]} />
            <meshStandardMaterial color="#ff9a40" emissive="#ff7a2a" emissiveIntensity={0.8 * pulse} />
          </mesh>
          <GlowSprite position={[front - 0.6, floodY + crest * 0.6, z + 1.0]} color="#ff8a2a" size={5} opacity={0.5 * (1 - run * 0.6)} />
          <pointLight position={[front - 1, floodY + 1.5, z + 1.8]} color="#ff7a2a" intensity={10} distance={12} decay={2} />
          <pointLight position={[(left + front) / 2, floodY + 2, z + 2]} color="#ff6a1a" intensity={8 * run} distance={16} decay={2} />
        </>
      ) : null}
    </group>
  );
};
