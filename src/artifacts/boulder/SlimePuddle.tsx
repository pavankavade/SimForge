import type React from "react";
import { random, useCurrentFrame } from "remotion";
import { GlowSprite } from "../dungeon/Fx";

interface SlimePuddleProps {
  /** Floor x span the puddle spreads to. */
  range: [number, number];
  spoutX: number;
  /** [start, end] frames of the pour from the ceiling spout. */
  pourWindow: readonly [number, number];
  /** Frame the puddle starts drying up. */
  goneFrame: number;
  ceilingY?: number;
  z?: number;
  depth?: number;
}

const SLIME = "#7fe04a";
const SLIME_DARK = "#3f8f22";
const SPOUT_DROP = 0.9;

/**
 * Brass spout that lowers from the ceiling, pours a glossy green stream and
 * leaves a wobbling slime slick across the hall floor.
 */
export const SlimePuddle: React.FC<SlimePuddleProps> = ({
  range,
  spoutX,
  pourWindow,
  goneFrame,
  ceilingY = 5.9,
  z = -0.6,
  depth = 3.0,
}) => {
  const frame = useCurrentFrame();
  const [pourStart, pourEnd] = pourWindow;
  if (frame < pourStart - 14 || frame > goneFrame + 16) return null;

  // Spout lowers before the pour and retracts after it.
  const lower = Math.min(1, Math.max(0, (frame - (pourStart - 14)) / 10));
  const raise = Math.min(1, Math.max(0, (frame - (pourEnd + 6)) / 12));
  const spoutOut = (1 - (1 - lower) ** 3) * (1 - raise * raise);
  const nozzleY = ceilingY - SPOUT_DROP * spoutOut;

  // Stream: falls to the floor, then thins out and lets go at the top.
  const pourAge = frame - pourStart;
  const pouring = frame >= pourStart && frame < pourEnd + 8;
  const headY = pouring ? Math.max(0.04, nozzleY - 0.6 * pourAge * (1 + pourAge * 0.08)) : 0;
  const tailY = frame < pourEnd ? nozzleY : Math.max(0.04, nozzleY - 0.5 * (frame - pourEnd) * (1 + (frame - pourEnd) * 0.15));
  const streamLen = Math.max(0, tailY - headY);
  const streamWidth = 0.13 * (frame < pourEnd ? 1 : Math.max(0.2, 1 - (frame - pourEnd) / 8));

  // Puddle spreads from the impact point until it fills the range.
  const spread = Math.min(1, Math.max(0, (frame - pourStart - 4) / (pourEnd - pourStart + 6)));
  const spreadEase = 1 - (1 - spread) ** 2;
  const dry = Math.max(0, Math.min(1, (frame - goneFrame) / 14));
  const leftX = spoutX + (range[0] - spoutX) * spreadEase;
  const rightX = spoutX + (range[1] - spoutX) * spreadEase;
  const width = Math.max(0.01, rightX - leftX) * (1 - dry * 0.6);
  const cx = (leftX + rightX) / 2;
  const deep = Math.max(0.01, depth * (0.35 + 0.65 * spreadEase) * (1 - dry * 0.6));
  const wobble = 1 + 0.03 * Math.sin(frame * 0.35);
  const puddleOpacity = 0.92 * (1 - dry);

  const blobs = Array.from({ length: 9 }, (_, i) => ({
    x: cx + (random(`slime-bx-${i}`) - 0.5) * width * 0.9,
    z: z + (random(`slime-bz-${i}`) - 0.5) * deep * 0.8,
    r: 0.18 + random(`slime-br-${i}`) * 0.22,
    key: i,
  }));
  const bubbles = Array.from({ length: 7 }, (_, i) => {
    const period = 26 + Math.floor(random(`slime-bp-${i}`) * 20);
    const phase = (frame + random(`slime-bph-${i}`) * period) % period;
    return {
      x: cx + (random(`slime-bubx-${i}`) - 0.5) * width * 0.8,
      z: z + (random(`slime-bubz-${i}`) - 0.5) * deep * 0.7,
      s: 0.05 + 0.07 * Math.sin((phase / period) * Math.PI),
      key: i,
    };
  });

  return (
    <group>
      {/* Ceiling spout */}
      {spoutOut > 0.01 ? (
        <group position={[spoutX, 0, z + 0.3]}>
          <mesh position={[0, ceilingY - (SPOUT_DROP * spoutOut) / 2, 0]}>
            <cylinderGeometry args={[0.09, 0.09, Math.max(0.01, SPOUT_DROP * spoutOut), 10]} />
            <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, nozzleY - 0.06, 0]}>
            <cylinderGeometry args={[0.13, 0.2, 0.22, 12, 1, true]} />
            <meshStandardMaterial color="#8a6a2c" metalness={0.75} roughness={0.35} side={2} />
          </mesh>
          <mesh position={[0, nozzleY + 0.1, 0]}>
            <torusGeometry args={[0.13, 0.035, 6, 16]} />
            <meshStandardMaterial color="#d2a545" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {/* Falling stream */}
      {streamLen > 0.02 ? (
        <mesh position={[spoutX, headY + streamLen / 2, z + 0.3]}>
          <cylinderGeometry args={[streamWidth * 0.8, streamWidth, streamLen, 10]} />
          <meshStandardMaterial color={SLIME} emissive={SLIME_DARK} emissiveIntensity={0.35} roughness={0.15} transparent opacity={0.9} />
        </mesh>
      ) : null}
      {pouring && headY <= 0.05 ? (
        <GlowSprite position={[spoutX, 0.25, z + 0.4]} color="#9dff6a" size={1.2} opacity={0.35} />
      ) : null}

      {/* Puddle */}
      {spread > 0 ? (
        <group>
          <mesh position={[cx, 0.045, z]} scale={[width / 2, 1, (deep / 2) * wobble]}>
            <cylinderGeometry args={[1, 1, 0.03, 40]} />
            <meshStandardMaterial
              color={SLIME}
              emissive={SLIME_DARK}
              emissiveIntensity={0.25}
              roughness={0.08}
              metalness={0.05}
              transparent
              opacity={puddleOpacity}
            />
          </mesh>
          {blobs.map((b) => (
            <mesh
              key={`blob-${b.key}`}
              position={[b.x, 0.05, b.z]}
              scale={[b.r * spreadEase * (1 - dry), 0.05, b.r * spreadEase * (1 - dry) * wobble]}
            >
              <sphereGeometry args={[1, 14, 8]} />
              <meshStandardMaterial color="#9af064" emissive={SLIME_DARK} emissiveIntensity={0.25} roughness={0.06} transparent opacity={puddleOpacity} />
            </mesh>
          ))}
          {bubbles.map((b) => (
            <mesh key={`bub-${b.key}`} position={[b.x, 0.07, b.z]} scale={b.s * spreadEase * (1 - dry)}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#c8ff9a" roughness={0.05} transparent opacity={0.8 * puddleOpacity} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};
