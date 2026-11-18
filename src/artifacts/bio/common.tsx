import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, Part, vinyl } from "../characters/hero";

/**
 * Shared pieces of the fantasy-biology sets: gradient backdrops, light shafts,
 * rocks, drifting particles and a colour mixer. Everything is a pure function
 * of the frame.
 */

const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const A = new THREE.Color();
const B = new THREE.Color();
/**
 * Colour between `a` and `b`, snapped to 24 steps so animated colours reuse a
 * handful of cached vinyl materials instead of minting one per frame.
 */
export const tint = (a: string, b: string, t: number) => {
  const q = Math.round(Math.min(1, Math.max(0, t)) * 24) / 24;
  return hex(A.set(a).lerp(B.set(b), q));
};

const textureCache = new Map<string, THREE.Texture | null>();
const cached = (key: string, make: () => THREE.Texture | null) => {
  if (!textureCache.has(key)) textureCache.set(key, make());
  return textureCache.get(key) ?? null;
};
const canvas = (w: number, h: number) => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  return ctx ? { c, ctx } : null;
};

/** Vertical gradient (top to bottom) as a texture. */
export const gradientTexture = (stops: readonly string[]) =>
  cached(`grad:${stops.join(",")}`, () => {
    const cv = canvas(8, 256);
    if (!cv) return null;
    const g = cv.ctx.createLinearGradient(0, 0, 0, 256);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    cv.ctx.fillStyle = g;
    cv.ctx.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(cv.c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

/** Soft white beam: bright core, feathered sides, fading toward the bottom. */
const shaftTexture = () =>
  cached("shaft", () => {
    const cv = canvas(64, 256);
    if (!cv) return null;
    const img = cv.ctx.createImageData(64, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 64; x++) {
        const side = Math.sin((x / 63) * Math.PI) ** 2;
        const fall = (1 - y / 255) ** 1.4;
        const i = (y * 64 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = 255 * side * fall;
      }
    }
    cv.ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(cv.c);
  });

/** Round soft dot for particles. */
const dotTexture = () =>
  cached("dot", () => {
    const cv = canvas(64, 64);
    if (!cv) return null;
    const g = cv.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    cv.ctx.fillStyle = g;
    cv.ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv.c);
  });

/** Unlit gradient wall far behind the set: the sky, the open water, the studio sweep. */
export const Backdrop: React.FC<{ stops: readonly string[]; z?: number; width?: number; height?: number; y?: number }> = ({ stops, z = -16, width = 90, height = 50, y = 8 }) => (
  <mesh position={[0, y, z]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={gradientTexture(stops) ?? undefined} toneMapped={false} fog={false} />
  </mesh>
);

/** Per-shot scene background colour and fog (attach straight to the scene: render at the Scene root). */
export const Atmosphere: React.FC<{ color: string; near: number; far: number }> = ({ color, near, far }) => (
  <>
    <color attach="background" args={[color]} />
    <fog attach="fog" args={[color, near, far]} />
  </>
);

/** A beam of light through dust or water: two crossed additive quads hanging from `position`. */
export const Shaft: React.FC<{ position: Vec3; length?: number; width?: number; color?: string; opacity?: number; tilt?: number; yaw?: number }> = ({
  position,
  length = 7,
  width = 2.2,
  color = "#ffe2b0",
  opacity = 0.2,
  tilt = 0,
  yaw = 0,
}) => {
  const frame = useCurrentFrame();
  const breathe = 1 + 0.08 * Math.sin(frame * 0.045 + position[0]);
  return (
    <group position={position} rotation={[0, yaw, tilt]}>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, -length / 2, 0]} rotation={[0, r, 0]}>
          <planeGeometry args={[width, length]} />
          <meshBasicMaterial
            map={shaftTexture() ?? undefined}
            color={color}
            transparent
            opacity={opacity * breathe}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/** A lumpy boulder (three overlapping rounded forms). */
export const Rock: React.FC<{ position: Vec3; size?: number; color?: string; seed?: string; flat?: number }> = ({ position, size = 1, color = "#5b6470", seed = "rock", flat = 0.7 }) => {
  const r = (k: string) => random(`${seed}-${k}`);
  const mat = vinyl(color, "cloth");
  return (
    <group position={position} rotation={[0, r("yaw") * 6, 0]} scale={size}>
      <Part geo={G.sphere(0.6)} mat={mat} position={[0, 0.3 * flat, 0]} scale={[1.2, flat, 1]} />
      <Part geo={G.sphere(0.42)} mat={mat} position={[0.45 + r("a") * 0.2, 0.2 * flat, 0.15]} scale={[1, flat * 0.9, 1.1]} />
      <Part geo={G.sphere(0.36)} mat={mat} position={[-0.5, 0.16 * flat, -0.1 + r("b") * 0.3]} scale={[1.1, flat * 0.8, 0.9]} />
    </group>
  );
};

/**
 * Soft drifting dots in a box around `center`: bubbles (rise > 0), mist,
 * fireflies. Each dot loops through the box height, so the field never empties.
 */
export const Drift: React.FC<{
  count?: number;
  center?: Vec3;
  box?: Vec3;
  rise?: number;
  size?: number;
  color?: string;
  opacity?: number;
  seed?: string;
  twinkle?: boolean;
}> = ({ count = 60, center = [0, 3, 0], box = [12, 6, 8], rise = 0.02, size = 0.12, color = "#ffffff", opacity = 0.6, seed = "drift", twinkle = false }) => {
  const frame = useCurrentFrame();
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: random(`${seed}-x-${i}`) - 0.5,
        y: random(`${seed}-y-${i}`),
        z: random(`${seed}-z-${i}`) - 0.5,
        p: random(`${seed}-p-${i}`) * Math.PI * 2,
        s: 0.6 + random(`${seed}-s-${i}`) * 0.8,
      })),
    [count, seed],
  );
  const positions = new Float32Array(count * 3);
  seeds.forEach((d, i) => {
    const y = (((d.y + (frame * rise * d.s) / box[1]) % 1) + 1) % 1;
    positions[i * 3] = center[0] + d.x * box[0] + Math.sin(frame * 0.03 * d.s + d.p) * 0.25;
    positions[i * 3 + 1] = center[1] + (y - 0.5) * box[1];
    positions[i * 3 + 2] = center[2] + d.z * box[2] + Math.cos(frame * 0.024 * d.s + d.p) * 0.2;
  });
  const pulse = twinkle ? 0.65 + 0.35 * Math.sin(frame * 0.12) : 1;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dotTexture() ?? undefined}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity * pulse}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
};

/** Three-point lighting for one shot: a shadow-casting key, a coloured rim from behind and a soft fill. */
export const ThreePoint: React.FC<{
  key_?: { position: Vec3; color: string; intensity: number };
  rim?: { position: Vec3; color: string; intensity: number };
  fill?: { color: string; ground: string; intensity: number };
  /** Half-size of the shadowed area around the origin. */
  area?: number;
}> = ({
  key_ = { position: [4, 7, 6], color: "#fff1dc", intensity: 2.4 },
  rim = { position: [-5, 5, -6], color: "#7fb4ff", intensity: 2.2 },
  fill = { color: "#9fb4d8", ground: "#2a2420", intensity: 0.6 },
  area = 7,
}) => (
  <>
    <hemisphereLight args={[fill.color, fill.ground, fill.intensity]} />
    <directionalLight
      position={key_.position}
      color={key_.color}
      intensity={key_.intensity}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-area}
      shadow-camera-right={area}
      shadow-camera-top={area}
      shadow-camera-bottom={-area}
      shadow-camera-near={0.5}
      shadow-camera-far={40}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
    />
    <directionalLight position={rim.position} color={rim.color} intensity={rim.intensity} />
  </>
);
