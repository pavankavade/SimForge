import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { GlowSprite } from "../dungeon/Fx";

interface ElectromagnetProps {
  x: number;
  installFrame: number;
  /** Faint hum starts (target detected). */
  armFrame: number;
  /** [on, off] frames of the full-power pull. */
  pullWindow: readonly [number, number];
  z?: number;
}

const ARC_POINTS = 7;

/** Jagged lightning bolt from `a` to `b`, re-rolled every couple of frames. */
const Arc: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; seed: string; opacity: number }> = ({ a, b, seed, opacity }) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_POINTS; i++) {
    const t = i / ARC_POINTS;
    const p = a.clone().lerp(b, t);
    if (i > 0 && i < ARC_POINTS) {
      p.x += (random(`${seed}-x-${i}`) - 0.5) * 0.28;
      p.z += (random(`${seed}-z-${i}`) - 0.5) * 0.2;
    }
    pts.push(p);
  }
  return (
    <group>
      {pts.slice(1).map((p, i) => {
        const q = pts[i];
        const dir = p.clone().sub(q);
        const len = dir.length();
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.022, 0.022, len, 4]} />
            <meshBasicMaterial color="#c8f2ff" transparent opacity={opacity} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Horseshoe electromagnet that rises into the niche under the floor. When it
 * fires, the coils glow, arcs crackle up through the floor seam and a blue
 * field ring pulses on the flagstones above it.
 */
export const Electromagnet: React.FC<ElectromagnetProps> = ({ x, installFrame, armFrame, pullWindow, z = 0.65 }) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const age = frame - installFrame;
  const rise = Math.min(1, age / 12);
  const pop = rise < 1 ? 1 - (1 - rise) ** 3 : 1 + 0.08 * Math.sin((age - 12) * 0.8) * Math.exp(-(age - 12) / 6);
  const [on, off] = pullWindow;
  const hum = frame >= armFrame && frame < on ? 0.25 + 0.1 * Math.sin(frame * 0.9) : 0;
  const pull = frame >= on ? Math.max(0, 1 - Math.max(0, frame - off) / 18) : 0;
  const charge = Math.max(hum, pull * (0.85 + 0.15 * Math.sin(frame * 1.7)));
  const glow = new THREE.Color("#4fc8ff").multiplyScalar(charge * 2.2);
  const flickerSeed = Math.floor(frame / 2);

  return (
    <group position={[x, -1.0, z]}>
      <group scale={[pop, pop, pop]} position={[0, (1 - rise) * -0.4, 0]}>
        {/* Base plate */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.2, 0.08, 0.9]} />
          <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.4} />
        </mesh>
        {/* Horseshoe: two red legs and a bridge, silver pole tips */}
        {[-0.34, 0.34].map((dx) => (
          <group key={dx} position={[dx, 0, 0]}>
            <mesh position={[0, 0.38, 0]} castShadow>
              <boxGeometry args={[0.26, 0.6, 0.5]} />
              <meshStandardMaterial color="#c8322b" metalness={0.35} roughness={0.45} emissive={glow} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0.74, 0]}>
              <boxGeometry args={[0.27, 0.12, 0.51]} />
              <meshStandardMaterial color="#d8dde6" metalness={0.9} roughness={0.25} emissive={glow} />
            </mesh>
            {/* Copper coil windings */}
            {[0.2, 0.32, 0.44, 0.56].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.035, 6, 16]} />
                <meshStandardMaterial color="#c07a3a" metalness={0.8} roughness={0.3} emissive={glow} emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.94, 0.2, 0.5]} />
          <meshStandardMaterial color="#c8322b" metalness={0.35} roughness={0.45} />
        </mesh>
        {/* Cable back into the wall */}
        <mesh position={[0, 0.14, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#17181c" roughness={0.7} />
        </mesh>
        {/* Warning lamp */}
        <mesh position={[0.5, 0.2, 0.3]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial
            color={charge > 0.05 ? "#9fe8ff" : "#405a66"}
            emissive="#36b8ff"
            emissiveIntensity={charge > 0.05 ? 2.5 : 0}
          />
        </mesh>
      </group>

      {charge > 0.05 ? (
        <>
          <GlowSprite position={[0, 0.7, 0.2]} color="#5fd0ff" size={1.4 + charge * 1.6} opacity={0.35 + charge * 0.45} />
          <pointLight position={[0, 1.4, 0.4]} color="#5fd0ff" intensity={charge * 9} distance={5} decay={2} />
          {/* Field ring on the floor above */}
          <mesh position={[0, 1.045, -0.6 - z]} rotation={[-Math.PI / 2, 0, 0]} scale={1 + ((frame % 12) / 12) * 0.6 * pull}>
            <ringGeometry args={[0.5, 0.62, 32]} />
            <meshBasicMaterial color="#8fe0ff" transparent opacity={0.65 * charge * (1 - (frame % 12) / 14)} toneMapped={false} />
          </mesh>
          {pull > 0.2
            ? [0, 1, 2].map((i) => (
                <Arc
                  key={i}
                  a={new THREE.Vector3(-0.34 + i * 0.34, 0.8, 0.1)}
                  b={new THREE.Vector3(-0.5 + i * 0.5 + (random(`arc-end-${flickerSeed}-${i}`) - 0.5) * 0.6, 1.2 + random(`arc-h-${flickerSeed}-${i}`) * 0.9, -0.2)}
                  seed={`arc-${flickerSeed}-${i}`}
                  opacity={pull}
                />
              ))
            : null}
        </>
      ) : null}
    </group>
  );
};
