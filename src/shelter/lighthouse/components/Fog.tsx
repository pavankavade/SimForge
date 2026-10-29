import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { FOG_IN, fogAmount, progress } from "../timeline";

const makePuffTexture = () => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Fog banks that roll in off the sea (from +x) and drift over the coast. */
export const Fog: React.FC<{ frame: number }> = ({ frame }) => {
  const tex = useMemo(() => makePuffTexture(), []);
  const puffs = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        x: -10 + random(`fog-x-${i}`) * 30,
        y: 0.6 + random(`fog-y-${i}`) * 7,
        z: -16 + random(`fog-z-${i}`) * 18,
        s: 5 + random(`fog-s-${i}`) * 6,
        v: 0.01 + random(`fog-v-${i}`) * 0.02,
      })),
    [],
  );
  const a = fogAmount(frame);
  if (a < 0.01) return null;
  // Banks slide in from the sea while the fog rolls in.
  const roll = (1 - progress(frame, FOG_IN)) * 26;
  return (
    <>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x + roll - (frame - FOG_IN[0]) * p.v, p.y, p.z]} scale={[p.s, p.s * 0.6, 1]} renderOrder={9}>
          <spriteMaterial map={tex ?? undefined} color="#d4dbe4" transparent opacity={0.28 * a} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
};
