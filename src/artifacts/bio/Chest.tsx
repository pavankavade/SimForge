import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeWood } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";

/**
 * The hero treasure chest: a real chest (oak planks, iron straps, brass lock)
 * that a mimic lives in. Props pose it: `lid` opens the barrel lid, `alive`
 * shows the mouth (gums, teeth, glow) instead of an empty box, `eyes` lights
 * two eyes in the gap, `cutaway` opens a 2D cross-section window on the front
 * whose contents are this component's children (drawn in front-face
 * coordinates: x across, y up from the floor, flattened in depth).
 */

export const CHEST = { w: 1.5, d: 0.95, base: 0.62, r: 0.475 };
/** Height of the closed chest. */
export const CHEST_H = CHEST.base + CHEST.r;

const lidCache = new Map<string, THREE.BufferGeometry>();
/** A barrel lid: a half disc of radius r extruded `len` along x, flat side down on y = 0, centred on x and z. */
const barrel = (r: number, len: number) => {
  const key = `${r.toFixed(3)}:${len.toFixed(3)}`;
  let g = lidCache.get(key);
  if (!g) {
    const s = new THREE.Shape();
    s.moveTo(-r, 0);
    s.lineTo(r, 0);
    s.absarc(0, 0, r, 0, Math.PI, false);
    const bevel = Math.min(0.02, len * 0.2);
    g = new THREE.ExtrudeGeometry(s, { depth: len - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 24 });
    g.translate(0, 0, -(len - 2 * bevel) / 2);
    g.rotateY(Math.PI / 2);
    lidCache.set(key, g);
  }
  return g;
};

const webTexture = (() => {
  let tex: THREE.Texture | null | undefined;
  return () => {
    if (tex !== undefined) return tex;
    if (typeof document === "undefined") return (tex = null);
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return (tex = null);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.6;
    // A quarter web anchored in the bottom-left corner.
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.lineTo(Math.cos(a) * 250, 256 - Math.sin(a) * 250);
      ctx.stroke();
    }
    for (let ring = 1; ring <= 6; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2);
        const r = ring * 40 * (i % 2 ? 0.93 : 1);
        const x = Math.cos(a) * r;
        const y = 256 - Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return (tex = new THREE.CanvasTexture(c));
  };
})();

/** A quarter cobweb in the corner at `position` (grows with `amount`). */
const Cobweb: React.FC<{ position: Vec3; rotation?: Vec3; size?: number; amount: number }> = ({ position, rotation = [0, 0, 0], size = 0.6, amount }) =>
  amount > 0.02 ? (
    <mesh position={position} rotation={rotation} scale={size * (0.5 + 0.5 * amount)}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={webTexture() ?? undefined} transparent opacity={0.7 * amount} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  ) : null;

export interface HeroChestProps {
  position?: Vec3;
  yaw?: number;
  /** Lid angle in radians (0 shut, ~1.4 wide open). */
  lid?: number;
  /** Squash on a chomp (> 0 flattens, < 0 stretches). */
  squash?: number;
  /** A mimic is inside: mouth, gums and teeth instead of bare boards. */
  alive?: boolean;
  /** 0..1: two eyes glowing just inside the lid gap. */
  eyes?: number;
  /** 0..1 cobwebs and dust. */
  cobwebs?: number;
  /** 0..1 scale of the cross-section window on the front face. */
  cutaway?: number;
  /** Colour of the cross-section rim (cyan = how it works, red = failing). */
  cutawayColor?: string;
  /** Lean about the floor (a hungry rock forward). */
  lean?: number;
  /** Rendered inside the mouth, in base coordinates (origin on the floor under the chest). */
  mouth?: React.ReactNode;
  children?: React.ReactNode;
}

export const HeroChest: React.FC<HeroChestProps> = ({
  position = [0, 0, 0],
  yaw = 0,
  lid = 0,
  squash = 0,
  alive = false,
  eyes = 0,
  cobwebs = 0,
  cutaway = 0,
  cutawayColor = "#3fe6d4",
  lean = 0,
  mouth,
  children,
}) => {
  const frame = useCurrentFrame();
  const wood = useSurface("bio-chest-oak", () => makeWood({ planks: 5, base: "#96682f", baseAlt: "#a9783a", seam: "#2e1c0c", seed: 87 }), [1, 1]);
  const lidWood = useSurface("bio-chest-oak", () => makeWood({ planks: 5, base: "#96682f", baseAlt: "#a9783a", seam: "#2e1c0c", seed: 87 }), [1.4, 1.4]);
  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap, color: "#ffffff", roughness: 0.72 }),
      lid: new THREE.MeshStandardMaterial({ map: lidWood.map, normalMap: lidWood.normalMap, color: "#ffffff", roughness: 0.72 }),
    }),
    [wood.map, wood.normalMap, wood.roughnessMap, lidWood.map, lidWood.normalMap],
  );
  const iron = vinyl("#555c6e", "leather");
  const rivet = vinyl("#b4bccb", "gloss");
  const brass = vinyl("#e7b545", "gloss");
  const gum = vinyl("#c23a6a", "skin");
  const tooth = vinyl("#fff3d6", "bone");
  const { w, d, base, r } = CHEST;
  const bandXs = [-0.5, 0, 0.5];
  const open = Math.min(1, lid / 0.5);
  const teethX = Array.from({ length: 9 }, (_, i) => -0.6 + i * 0.15);
  const sy = 1 - squash;
  const sx = 1 + squash * 0.6;

  return (
    <group position={position} rotation={[lean, yaw, 0]} scale={[sx, sy, sx]}>
      {/* ---- Base ---- */}
      <Part geo={G.box(w, base, d, 0.035)} mat={mats.wood} position={[0, base / 2, 0]} />
      {bandXs.map((x) => (
        <group key={x}>
          <Part geo={G.box(0.11, base + 0.03, d + 0.05, 0.02)} mat={iron} position={[x, base / 2, 0]} ink={INK_THIN} />
          {[0.14, 0.48].map((y) => (
            <mesh key={y} geometry={G.sphere(0.022)} material={rivet} position={[x, y, d / 2 + 0.028]} />
          ))}
        </group>
      ))}
      <Part geo={G.box(w + 0.05, 0.1, d + 0.05, 0.03)} mat={iron} position={[0, 0.05, 0]} ink={INK_THIN} />
      {[-1, 1].map((sxn) =>
        [-1, 1].map((szn) => <Part key={`${sxn}${szn}`} geo={G.box(0.16, 0.2, 0.16, 0.03)} mat={brass} position={[sxn * (w / 2 - 0.05), base - 0.1, szn * (d / 2 - 0.05)]} ink={INK_THIN} />),
      )}
      {/* Lock plate and keyhole. */}
      <Part geo={G.box(0.24, 0.28, 0.05, 0.02)} mat={brass} position={[0, base - 0.2, d / 2 + 0.02]} ink={INK_THIN} />
      <mesh geometry={G.disc(0.035)} material={flat("#120a0c")} position={[0, base - 0.17, d / 2 + 0.047]} />
      <mesh position={[0, base - 0.24, d / 2 + 0.047]} material={flat("#120a0c")}>
        <planeGeometry args={[0.03, 0.09]} />
      </mesh>
      {/* Side handles. */}
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.torus(0.09, 0.02, Math.PI)} mat={iron} position={[s * (w / 2 + 0.02), base * 0.62, 0]} rotation={[Math.PI, Math.PI / 2, 0]} ink={INK_THIN} />
      ))}

      {/* ---- Interior ---- */}
      {alive ? (
        <>
          <mesh position={[0, base - 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - 0.12, d - 0.12]} />
            <meshStandardMaterial color="#3a0a1c" emissive="#7a0f3c" emissiveIntensity={0.25 + open * 0.9} roughness={0.5} />
          </mesh>
          {/* Gums along the rim, then the teeth. */}
          <Part geo={G.capsule(0.05, w - 0.1)} mat={gum} position={[0, base + 0.005, d / 2 - 0.07]} rotation={[0, 0, Math.PI / 2]} ink={false} />
          {[-1, 1].map((s) => (
            <Part key={s} geo={G.capsule(0.05, d - 0.14)} mat={gum} position={[s * (w / 2 - 0.07), base + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
          ))}
          {teethX.map((x, i) => (
            <Part key={i} geo={G.cone(0.05, 0.17 + (i % 3) * 0.04, 8)} mat={tooth} position={[x, base + 0.1, d / 2 - 0.08]} rotation={[0.12, 0, ((i % 2) - 0.5) * 0.14]} ink={INK_THIN} />
          ))}
          {[-1, 1].map((s) =>
            [-0.18, 0.12].map((z) => <Part key={`${s}${z}`} geo={G.cone(0.045, 0.16, 8)} mat={tooth} position={[s * (w / 2 - 0.08), base + 0.09, z]} ink={INK_THIN} />),
          )}
          {open > 0.05 ? <GlowSprite position={[0, base + 0.2, 0.2]} color="#ff3b8a" size={1.1 + open * 1.2} opacity={0.3 * open} /> : null}
          {mouth}
        </>
      ) : (
        <mesh position={[0, base - 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.12, d - 0.12]} />
          <meshStandardMaterial color="#1c120c" roughness={0.9} />
        </mesh>
      )}
      {/* Eyes in the dark gap under the lid. */}
      {eyes > 0.02
        ? [-0.26, 0.26].map((x) => (
            <group key={x} position={[x, base + 0.035, d / 2 - 0.1]} scale={[1, eyes, 1]}>
              <mesh geometry={G.sphere(0.055)} material={glow("#ffd23a", 2.6)} scale={[1.25, 0.6, 0.6]} />
              <mesh geometry={G.disc(0.5)} material={flat("#170d12")} position={[0, 0, 0.036]} scale={[0.028, 0.06, 1]} />
            </group>
          ))
        : null}

      {/* ---- Lid, hinged along the back ---- */}
      <group position={[0, base, -d / 2]} rotation={[-lid, 0, 0]}>
        <group position={[0, 0, d / 2]}>
          <Part geo={barrel(r, w)} mat={mats.lid} />
          {bandXs.map((x) => (
            <group key={x}>
              <Part geo={barrel(r + 0.028, 0.11)} mat={iron} position={[x, 0, 0]} ink={INK_THIN} />
              {[0.5, 1.2, Math.PI - 1.2, Math.PI - 0.5].map((a) => (
                <mesh key={a} geometry={G.sphere(0.022)} material={rivet} position={[x, Math.sin(a) * (r + 0.03), Math.cos(a) * (r + 0.03)]} />
              ))}
            </group>
          ))}
          <Part geo={G.box(0.14, 0.2, 0.05, 0.02)} mat={brass} position={[0, 0.05, r + 0.012]} ink={INK_THIN} />
          {alive ? (
            <>
              <mesh position={[0, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w - 0.1, d - 0.1]} />
                <meshStandardMaterial color="#5a1030" emissive="#7a0f3c" emissiveIntensity={0.3} roughness={0.5} />
              </mesh>
              <Part geo={G.capsule(0.05, w - 0.1)} mat={gum} position={[0, -0.01, d / 2 - 0.07]} rotation={[0, 0, Math.PI / 2]} ink={false} />
              {teethX.map((x, i) => (
                <Part
                  key={i}
                  geo={G.cone(0.052, 0.19 + ((i + 1) % 3) * 0.05, 8)}
                  mat={tooth}
                  position={[x + 0.075, -0.11, d / 2 - 0.08]}
                  rotation={[Math.PI - 0.12, 0, ((i % 2) - 0.5) * 0.14]}
                  ink={INK_THIN}
                />
              ))}
            </>
          ) : (
            <mesh position={[0, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w - 0.1, d - 0.1]} />
              <meshStandardMaterial color="#1c120c" roughness={0.9} />
            </mesh>
          )}
        </group>
      </group>
      <Cobweb position={[-w / 2 - 0.27, 0.28, d / 2 + 0.01]} rotation={[0, 0, Math.PI / 2]} size={0.62} amount={cobwebs} />
      <Cobweb position={[w / 2 + 0.3, 0.3, d / 2 - 0.3]} rotation={[0, -0.5, 0]} size={0.7} amount={cobwebs} />

      {/* ---- Cross-section window ---- */}
      {cutaway > 0.02 ? (
        <group position={[0, 0, d / 2 + 0.06]}>
          <group position={[0, CHEST_H / 2, 0]} scale={[cutaway, cutaway, 1]}>
            <mesh geometry={G.box(w - 0.1, CHEST_H - 0.08, 0.02, 0.008)} material={glow(cutawayColor, 1.5)} />
            <mesh position={[0, 0, 0.012]}>
              <planeGeometry args={[w - 0.18, CHEST_H - 0.16]} />
              <meshBasicMaterial color="#1b0d14" />
            </mesh>
            {/* The boards in section: a lighter rim with end-grain ticks. */}
            {Array.from({ length: 14 }, (_, i) => (
              <mesh key={i} position={[-(w - 0.18) / 2 + 0.05 + i * ((w - 0.28) / 13), -(CHEST_H - 0.16) / 2 + 0.035, 0.014]} rotation={[0, 0, 0.5]}>
                <planeGeometry args={[0.012, 0.06]} />
                <meshBasicMaterial color="#8a5a34" />
              </mesh>
            ))}
          </group>
          {cutaway > 0.9 ? (
            <group position={[0, 0, 0.03]} scale={[1, 1, 0.12]}>
              {children}
            </group>
          ) : null}
        </group>
      ) : null}
      {/* Contact shadow. */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* A faint hungry shimmer of drool when the mouth hangs open. */}
      {alive && open > 0.6
        ? [0, 1, 2].map((i) => {
            const t = ((frame * 0.04 + i * 0.37) % 1 + 1) % 1;
            return <mesh key={i} geometry={G.sphere(0.022)} material={vinyl("#cfe9ff", "gloss")} position={[-0.4 + i * 0.42 + 0.1 * random(`drool-${i}`), base + 0.05 - t * 0.5, d / 2 - 0.02]} scale={[1, 1.6, 1]} />;
          })
        : null}
    </group>
  );
};

/**
 * The mimic's tongue: a thick tapering rope from the back of the mouth to
 * `tip` (in chest base coordinates), sagging by `sag`, lined with suckers.
 * `out` 0..1 extends it along the path.
 */
export const Tongue: React.FC<{ tip: Vec3; out: number; sag?: number; curl?: number }> = ({ tip, out, sag = 0.25, curl = 0 }) => {
  const root: Vec3 = [0, CHEST.base + 0.06, -0.15];
  const pink = vinyl("#e0457e", "gloss");
  const sucker = vinyl("#ffc2d6", "gloss");
  const n = 14;
  const at = (t: number): Vec3 => {
    const u = t * out;
    const lift = Math.sin(u * Math.PI) * sag;
    const hook = curl * Math.max(0, u - 0.75) ** 2 * 6;
    return [root[0] + (tip[0] - root[0]) * u - hook * 0.4, root[1] + (tip[1] - root[1]) * u + lift + hook, root[2] + (tip[2] - root[2]) * u];
  };
  if (out <= 0.02) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const r = 0.15 - 0.07 * t + (i === n - 1 ? 0.03 : 0);
        const p = at(t);
        return (
          <group key={i} position={p}>
            <Part geo={G.sphere(0.1)} mat={pink} scale={[r / 0.1, (r * 0.72) / 0.1, r / 0.1]} />
            {i > 1 && i % 2 === 0 ? [-1, 1].map((s) => <mesh key={s} geometry={G.torus(0.035, 0.014)} material={sucker} position={[0, -r * 0.5, s * r * 0.55]} rotation={[Math.PI / 2 + s * 0.6, 0, 0]} />) : null}
          </group>
        );
      })}
    </>
  );
};

/** A length of tongue held still for the macro: a row of big suckers that pulse as they grip. */
export const SuckerMacro: React.FC<{ position?: Vec3; grip: number }> = ({ position = [0, 0, 0], grip }) => {
  const frame = useCurrentFrame();
  const pink = vinyl("#e0457e", "gloss");
  const rim = vinyl("#ffc2d6", "gloss");
  const cup = vinyl("#b82a60", "skin");
  return (
    <group position={position}>
      <Part geo={G.capsule(1.05, 7.5)} mat={pink} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.55]} position={[0, 0, -0.5]} />
      {Array.from({ length: 7 }, (_, i) => {
        const x = (i - 3) * 0.72;
        const pulse = 1 + 0.07 * Math.sin(frame * 0.25 - i * 0.9) * (0.4 + 0.6 * grip);
        const big = i === 3 ? 1.3 : 1 - Math.abs(i - 3) * 0.06;
        return (
          <group key={i} position={[x, (i % 2 ? 0.34 : -0.34) * (i === 3 ? 0 : 1), 0.08]} scale={big * pulse}>
            <Part geo={G.torus(0.22, 0.075)} mat={rim} ink={INK_THIN} />
            <mesh geometry={G.sphere(0.2)} material={cup} scale={[1, 1, 0.35]} position={[0, 0, -0.03]} />
            <mesh geometry={G.disc(0.07)} material={flat("#5a0f2c")} position={[0, 0, 0.05]} />
          </group>
        );
      })}
    </group>
  );
};
