import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame, random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

const makeGlowTexture = () => {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.34)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

interface GlowSpriteProps {
  position?: Vec3;
  color?: string;
  size?: number;
  opacity?: number;
}

export const GlowSprite: React.FC<GlowSpriteProps> = ({
  position = [0, 0, 0],
  color = "#ffb15e",
  size = 1,
  opacity = 0.5,
}) => {
  const texture = useMemo(() => makeGlowTexture(), []);

  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={texture ?? undefined}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
};

interface DustMotesProps {
  count?: number;
}

interface BurstProps {
  /** Frame the burst starts. Nothing renders before it. */
  at: number;
  position: Vec3;
  count?: number;
  color?: string;
  /** Particle size in world units. */
  size?: number;
  /** Lifetime in frames. */
  duration?: number;
  /** Initial speed range (units / frame). */
  speed?: number;
  /** Bias added to every particle's velocity (units / frame). */
  direction?: Vec3;
  /** Vertical acceleration (units / frame²); negative pulls down. */
  gravity?: number;
  /** Horizontal emitter footprint. */
  spread?: Vec3;
  additive?: boolean;
  opacity?: number;
  seed?: string;
}

/**
 * Deterministic one-shot particle burst (dust puffs, sparks, debris), driven
 * purely by the current frame so every render is identical.
 */
export const Burst: React.FC<BurstProps> = ({
  at,
  position,
  count = 40,
  color = "#cbb89c",
  size = 0.32,
  duration = 40,
  speed = 0.08,
  direction = [0, 0.03, 0],
  gravity = -0.002,
  spread = [0.6, 0.1, 0.6],
  additive = false,
  opacity = 0.75,
  seed = "burst",
}) => {
  const frame = useCurrentFrame();
  const texture = useMemo(() => makeGlowTexture(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const theta = random(`${seed}-t-${i}`) * Math.PI * 2;
        const phi = Math.acos(2 * random(`${seed}-p-${i}`) - 1);
        const mag = speed * (0.35 + random(`${seed}-m-${i}`) * 0.65);
        return {
          origin: [
            (random(`${seed}-x-${i}`) - 0.5) * spread[0],
            (random(`${seed}-y-${i}`) - 0.5) * spread[1],
            (random(`${seed}-z-${i}`) - 0.5) * spread[2],
          ],
          velocity: [
            Math.sin(phi) * Math.cos(theta) * mag + direction[0],
            Math.abs(Math.cos(phi)) * mag + direction[1],
            Math.sin(phi) * Math.sin(theta) * mag + direction[2],
          ],
          life: 0.55 + random(`${seed}-l-${i}`) * 0.45,
        };
      }),
    [count, seed, speed, direction, spread]
  );
  const age = frame - at;
  if (age < 0 || age > duration) return null;

  // Fresh array per frame so the attribute is rebuilt rather than mutated.
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    // Drag makes dust billow out then hang in the air.
    const t = additive ? age : (1 - Math.exp(-age / 14)) * 14;
    const alive = age < duration * p.life;
    positions[i * 3] = alive ? p.origin[0] + p.velocity[0] * t : 9999;
    positions[i * 3 + 1] = p.origin[1] + p.velocity[1] * t + 0.5 * gravity * age * age;
    positions[i * 3 + 2] = p.origin[2] + p.velocity[2] * t;
  }

  const fade = Math.min(1, age / 3) * Math.max(0, 1 - age / duration) ** 0.8;
  const grow = additive ? 1 : 0.6 + (age / duration) * 1.2;

  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture ?? undefined}
        color={color}
        size={size * grow}
        sizeAttenuation
        transparent
        opacity={opacity * fade}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        depthWrite={false}
        toneMapped={!additive}
      />
    </points>
  );
};

export const DustMotes: React.FC<DustMotesProps> = ({ count = 110 }) => {
  const frame = useCurrentFrame();
  const texture = useMemo(() => makeGlowTexture(), []);

  const motes = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        x: random(`mote-x-${index}`) * 22 - 11,
        y: 0.45 + random(`mote-y-${index}`) * 7.3,
        z: random(`mote-z-${index}`) * 15 - 3,
        phase: random(`mote-phase-${index}`) * Math.PI * 2,
        speed: 0.16 + random(`mote-speed-${index}`) * 0.34,
        drift: 0.1 + random(`mote-drift-${index}`) * 0.4,
      })),
    [count]
  );

  const positions = new Float32Array(count * 3);
  for (let index = 0; index < motes.length; index++) {
    const mote = motes[index];
    const drift = frame * mote.speed + mote.phase;
    positions[index * 3] = mote.x + Math.sin(drift) * mote.drift;
    positions[index * 3 + 1] =
      mote.y + Math.sin(drift * 0.72 + 1.4) * mote.drift * 1.3;
    positions[index * 3 + 2] =
      mote.z + Math.cos(drift * 0.54) * mote.drift * 0.8;
  }

  return (
    <points position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture ?? undefined}
        color="#ffd8a8"
        size={0.17}
        sizeAttenuation
        transparent
        opacity={0.62}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
};
