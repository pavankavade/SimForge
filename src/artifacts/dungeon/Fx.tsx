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

  const positions = useMemo(
    () => new Float32Array(count * 3),
    [count]
  );

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
        size={0.115}
        sizeAttenuation
        transparent
        opacity={0.48}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
};
