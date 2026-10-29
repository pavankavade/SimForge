import type React from "react";
import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeWood } from "../../engine/textures";

/**
 * The Adventurers' Guild bounty board: a timber-framed cork board under a
 * little roof, with paper posters nailed to it. Posters are canvas-textured
 * text; strike-throughs and underlines are separate ink bars so they can be
 * drawn on a beat.
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const HAND = "'Segoe Print', 'Comic Sans MS', 'Segoe UI', cursive";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export interface PosterLine {
  text: string;
  /** Cap height as a fraction of the poster height. */
  size: number;
  color?: string;
  hand?: boolean;
  /** Frame a red strike-through is drawn across the line. */
  strike?: number;
  /** Frame a red underline is drawn under the line. */
  underline?: number;
}

export interface PosterSpec {
  id: string;
  /** Centre on the board face (board-local, metres). */
  x: number;
  y: number;
  w: number;
  h: number;
  tilt?: number;
  paper?: string;
  /** Frame the poster is slapped on and nailed. */
  nailAt: number;
  /** Frame it is torn off (flies away). */
  ripAt?: number;
  lines: PosterLine[];
}

/** Top of each line's box, as a fraction of poster height (shared by texture and ink bars). */
const layout = (lines: PosterLine[]) => {
  const tops: number[] = [];
  let y = 0.1;
  for (const l of lines) {
    tops.push(y);
    y += l.size * 1.32;
  }
  return tops;
};

const makePosterTexture = (spec: PosterSpec) => {
  if (typeof document === "undefined") return null;
  const W = 512;
  const H = Math.round((W * spec.h) / spec.w);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = spec.paper ?? "#efe0bd";
  ctx.fillRect(0, 0, W, H);
  // Aged edges.
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(110,70,20,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const tops = layout(spec.lines);
  spec.lines.forEach((l, i) => {
    const px = Math.round(l.size * H);
    ctx.font = `${l.hand ? "bold " : ""}${px}px ${l.hand ? HAND : FONT}`;
    ctx.fillStyle = l.color ?? "#2a1a0e";
    let size = px;
    while (ctx.measureText(l.text).width > W * 0.88 && size > 8) {
      size -= 2;
      ctx.font = `${l.hand ? "bold " : ""}${size}px ${l.hand ? HAND : FONT}`;
    }
    ctx.fillText(l.text, W / 2, tops[i] * H + (px - size) / 2);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

const textCache = new Map<string, THREE.Texture | null>();
const posterTexture = (spec: PosterSpec) => {
  const key = `${spec.id}:${spec.w}x${spec.h}:${spec.lines.map((l) => l.text).join("|")}`;
  if (!textCache.has(key)) textCache.set(key, makePosterTexture(spec));
  return textCache.get(key) ?? null;
};

const Ink: React.FC<{ at: number; x: number; y: number; w: number; thick: number; frame: number; angle?: number }> = ({
  at,
  x,
  y,
  w,
  thick,
  frame,
  angle = 0,
}) => {
  if (frame < at) return null;
  const t = interpolate(frame, [at, at + 7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <mesh position={[x - (w * (1 - t)) / 2, y, 0.012]} rotation={[0, 0, angle]} scale={[Math.max(0.001, t), 1, 1]}>
      <planeGeometry args={[w, thick]} />
      <meshBasicMaterial color="#c4161c" transparent opacity={0.92} />
    </mesh>
  );
};

const Poster: React.FC<{ spec: PosterSpec; frame: number }> = ({ spec, frame }) => {
  const tex = useMemo(() => posterTexture(spec), [spec]);
  if (frame < spec.nailAt - 6) return null;
  // Slapped on: flies in from the camera, overshoots flat, settles.
  const slap = interpolate(frame, [spec.nailAt - 6, spec.nailAt], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const wob = frame >= spec.nailAt ? 0.05 * Math.sin((frame - spec.nailAt) * 0.9) * Math.exp(-(frame - spec.nailAt) / 6) : 0;
  let pos: Vec3 = [spec.x, spec.y, 0.06 + (1 - slap) * 1.6];
  let rot: Vec3 = [(1 - slap) * -0.5, 0, (spec.tilt ?? 0) + (1 - slap) * 0.4 + wob];
  let opacity = 1;
  if (spec.ripAt !== undefined && frame >= spec.ripAt) {
    const t = (frame - spec.ripAt) / 14;
    if (t > 1) return null;
    pos = [spec.x + t * 2.4, spec.y + t * 1.2 - t * t * 2.4, 0.06 + t * 1.4];
    rot = [t * 1.2, t * 2.4, (spec.tilt ?? 0) - t * 3];
    opacity = 1 - t * t;
  }
  const tops = layout(spec.lines);
  return (
    <group position={pos} rotation={rot}>
      <mesh castShadow>
        <planeGeometry args={[spec.w, spec.h]} />
        <meshStandardMaterial map={tex ?? undefined} color="#ffffff" roughness={0.95} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {/* Nail */}
      <mesh position={[0, spec.h / 2 - 0.09, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 10]} />
        <meshStandardMaterial color="#8d8f96" metalness={0.8} roughness={0.35} />
      </mesh>
      {spec.lines.map((l, i) => {
        const cy = spec.h / 2 - (tops[i] + l.size * 0.55) * spec.h;
        const width = Math.min(spec.w * 0.86, l.text.length * l.size * spec.h * 0.62);
        return (
          <group key={i}>
            {l.strike !== undefined ? <Ink at={l.strike} x={0} y={cy} w={width + 0.1} thick={0.05} frame={frame} angle={-0.06} /> : null}
            {l.underline !== undefined ? (
              <Ink at={l.underline} x={0} y={cy - l.size * spec.h * 0.68} w={width} thick={0.045} frame={frame} />
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

const makeSignTexture = (text: string) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#5a3a1e";
  ctx.fillRect(0, 0, 1024, 160);
  let size = 92;
  ctx.font = `${size}px ${FONT}`;
  while (ctx.measureText(text).width > 940 && size > 20) {
    size -= 4;
    ctx.font = `${size}px ${FONT}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1c0f06";
  ctx.fillText(text, 516, 86);
  ctx.fillStyle = "#f0c95a";
  ctx.fillText(text, 512, 80);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export const BOARD_W = 6.4;
export const BOARD_H = 4.0;

interface GuildBoardProps {
  position: Vec3;
  rotationY?: number;
  posters: PosterSpec[];
  sign?: string;
}

export const GuildBoard: React.FC<GuildBoardProps> = ({ position, rotationY = 0, posters, sign = "ADVENTURERS' GUILD" }) => {
  const frame = useCurrentFrame();
  const wood = useSurface("guild-wood", () => makeWood({ planks: 4, base: "#5c3b20", baseAlt: "#6b4426", seam: "#20130a", seed: 151 }), [1, 1]);
  const signTex = useMemo(() => makeSignTexture(sign), [sign]);
  const W = BOARD_W;
  const H = BOARD_H;
  const beam = (x: number, y: number, w: number, h: number, d = 0.28) => (
    <mesh position={[x, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#c9a882" roughness={0.85} />
    </mesh>
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Posts into the ground */}
      {beam(-W / 2 - 0.2, H / 2 + 0.6, 0.34, H + 3.2)}
      {beam(W / 2 + 0.2, H / 2 + 0.6, 0.34, H + 3.2)}
      <group position={[0, H / 2 + 1.0, 0]}>
        {/* Cork */}
        <mesh position={[0, 0, -0.06]} receiveShadow>
          <boxGeometry args={[W, H, 0.12]} />
          <meshStandardMaterial color="#a87a4c" roughness={1} />
        </mesh>
        {/* Frame */}
        {beam(0, H / 2 + 0.1, W + 0.6, 0.22)}
        {beam(0, -H / 2 - 0.1, W + 0.6, 0.22)}
        {/* Roof */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (W / 4 + 0.15), H / 2 + 0.95, 0.15]} rotation={[0, 0, -s * 0.38]} castShadow>
            <boxGeometry args={[W / 2 + 0.95, 0.14, 1.0]} />
            <meshStandardMaterial color="#6b2c22" roughness={0.8} />
          </mesh>
        ))}
        {/* Sign plank */}
        <mesh position={[0, H / 2 + 0.5, 0.1]}>
          <planeGeometry args={[W * 0.8, W * 0.8 * 0.156]} />
          <meshStandardMaterial map={signTex ?? undefined} roughness={0.8} />
        </mesh>
        {posters.map((p) => (
          <Poster key={p.id} spec={p} frame={frame} />
        ))}
      </group>
    </group>
  );
};

/** World centre of the cork face (for camera framing). */
export const boardFace = (position: Vec3): Vec3 => [position[0], position[1] + BOARD_H / 2 + 1.0, position[2]];
