import type React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { GlowSprite } from "../../artifacts/dungeon";
import { CloudPuff } from "../../artifacts/sky";
import { BACK, HIDE, SECRET_DOOR, STAIR, soffitY, type V3 } from "./timeline";

/**
 * Props for the priest-hole house: the cat, candles and the brass candlestick, the cushion, the
 * brick lining (laid course by course), the measuring ropes, the reed and its soup, steam,
 * cobwebs, the rings of a hollow knock, and the sky behind the house. Pure functions of their props.
 */

// ---------------------------------------------------------------------------
// The cat: a ginger tabby sitting up, or curled on her cushion.
// ---------------------------------------------------------------------------
const useCatMats = () =>
  useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({ color: "#d98a3a", roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: "#a85a1e", roughness: 0.92 }),
      white: new THREE.MeshStandardMaterial({ color: "#e8e0d2", roughness: 0.95 }),
      eye: new THREE.MeshStandardMaterial({ color: "#d6a326", roughness: 0.15, emissive: "#3a2600", emissiveIntensity: 0.4 }),
      pupil: new THREE.MeshBasicMaterial({ color: "#060504" }),
      nose: new THREE.MeshStandardMaterial({ color: "#b0706a", roughness: 0.6 }),
      ear: new THREE.MeshStandardMaterial({ color: "#7a5446", roughness: 0.8, side: THREE.DoubleSide }),
    }),
    []
  );

const Ball: React.FC<{ p: V3; r: number; s?: V3; rot?: V3; mat: THREE.Material }> = ({ p, r, s = [1, 1, 1], rot = [0, 0, 0], mat }) => (
  <mesh position={p} scale={s} rotation={rot} material={mat} castShadow>
    <sphereGeometry args={[r, 20, 14]} />
  </mesh>
);

const CatHead: React.FC<{ m: ReturnType<typeof useCatMats>; blink: number }> = ({ m, blink }) => (
  <>
    <Ball p={[0, 0, 0]} r={0.056} s={[1.05, 0.92, 1]} mat={m.fur} />
    <Ball p={[0, -0.016, 0.042]} r={0.026} s={[1.35, 0.85, 1]} mat={m.white} />
    <Ball p={[0, -0.004, 0.064]} r={0.008} s={[1.3, 0.8, 0.8]} mat={m.nose} />
    {[-1, 1].map((k) => (
      <group key={k}>
        <mesh position={[k * 0.033, 0.05, -0.002]} rotation={[0.1, 0, -k * 0.38]} material={m.fur} castShadow>
          <coneGeometry args={[0.024, 0.05, 4]} />
        </mesh>
        <mesh position={[k * 0.031, 0.05, 0.006]} rotation={[0.1, 0, -k * 0.38]} material={m.ear}>
          <coneGeometry args={[0.015, 0.036, 4]} />
        </mesh>
        <Ball p={[k * 0.022, 0.012, 0.047]} r={0.0115} s={[1, blink, 0.6]} mat={m.eye} />
        <mesh position={[k * 0.022, 0.012, 0.054]} scale={[0.22, blink, 1]} material={m.pupil}>
          <sphereGeometry args={[0.009, 10, 8]} />
        </mesh>
      </group>
    ))}
  </>
);

/** A tube along a curve (tails). */
const Tube: React.FC<{ pts: V3[]; r: number; mat: THREE.Material }> = ({ pts, r, mat }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), 24, r, 8, false), [JSON.stringify(pts), r]); // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} material={mat} castShadow />;
};

export const Cat: React.FC<{ position: V3; yaw?: number; pose?: "sit" | "curl"; look?: number; frame: number }> = ({ position, yaw = 0, pose = "sit", look = 0, frame }) => {
  const m = useCatMats();
  // A slow blink every few seconds, the tail tip twitching.
  const cycle = frame % 97;
  const blink = cycle < 4 ? 0.15 : 1;
  const flick = Math.sin(frame * 0.12) * 0.03;
  if (pose === "curl") {
    return (
      <group position={position} rotation={[0, yaw, 0]}>
        <Ball p={[0, 0.07, 0]} r={0.1} s={[1.45, 0.7, 1.05]} mat={m.fur} />
        <Ball p={[0.02, 0.1, -0.02]} r={0.06} s={[1.4, 0.5, 0.9]} mat={m.dark} />
        <group position={[0.11, 0.08, 0.06]} rotation={[0.25, 0.5, 0.2]}>
          <CatHead m={m} blink={0.12} />
        </group>
        <Tube pts={[[-0.14, 0.04, -0.02], [-0.12, 0.03, 0.09], [0.0, 0.025, 0.13], [0.1 + flick, 0.03, 0.11]]} r={0.016} mat={m.fur} />
      </group>
    );
  }
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Haunches, chest, the white bib, the front legs and paws. */}
      <Ball p={[0, 0.075, -0.045]} r={0.08} s={[1.15, 0.95, 1.2]} mat={m.fur} />
      <Ball p={[0, 0.16, 0.02]} r={0.065} s={[0.95, 1.55, 0.95]} rot={[-0.25, 0, 0]} mat={m.fur} />
      <Ball p={[0, 0.17, 0.068]} r={0.03} s={[1, 1.9, 0.6]} mat={m.white} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * 0.026, 0.07, 0.07]} material={m.fur} castShadow>
            <capsuleGeometry args={[0.015, 0.11, 4, 10]} />
          </mesh>
          <Ball p={[k * 0.027, 0.012, 0.085]} r={0.018} s={[1, 0.7, 1.3]} mat={m.white} />
          <Ball p={[k * 0.06, 0.02, 0.03]} r={0.024} s={[0.9, 0.7, 1.5]} mat={m.fur} />
          {/* Tabby stripes down the flank. */}
          {[0, 1, 2].map((j) => (
            <Ball key={j} p={[k * 0.083, 0.06 + j * 0.035, -0.04 + j * 0.01]} r={0.012} s={[0.4, 0.5, 2.6]} mat={m.dark} />
          ))}
        </group>
      ))}
      <group position={[0, 0.27, 0.04]} rotation={[0, look, 0]}>
        <CatHead m={m} blink={blink} />
      </group>
      {/* The tail, wrapped round her feet. */}
      <Tube pts={[[0, 0.03, -0.13], [0.07, 0.02, -0.1], [0.1, 0.015, 0.0], [0.08 + flick, 0.015, 0.09]]} r={0.016} mat={m.fur} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Light: candles, the brass candlestick.
// ---------------------------------------------------------------------------
/** Flicker 0.8..1.1 from the frame (deterministic). */
export const flicker = (frame: number, seed: string): number => 0.85 + 0.15 * Math.sin(frame * 0.9 + random(seed) * 9) * Math.sin(frame * 0.37 + random(`${seed}b`) * 5) + 0.08 * random(`${seed}-${frame}`);

export const Candle: React.FC<{ position: V3; height?: number; lit?: number; frame: number; seed: string; light?: number }> = ({ position, height = 0.14, lit = 1, frame, seed, light = 1.4 }) => {
  const k = flicker(frame, seed);
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.024, height, 14]} />
        <meshStandardMaterial color="#efe3c4" roughness={0.6} emissive="#ffb060" emissiveIntensity={0.08 * lit} />
      </mesh>
      {lit > 0 ? (
        <>
          <mesh position={[0, height + 0.03 * lit, 0]} scale={[0.6 * lit, (1 + 0.15 * (k - 0.9)) * lit, 0.6 * lit]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshBasicMaterial color="#fff1c0" toneMapped={false} />
          </mesh>
          <GlowSprite position={[0, height + 0.03, 0]} color="#ffb35a" size={0.32 * lit * k} opacity={0.55} />
          <pointLight position={[0, height + 0.08, 0.05]} color="#ffa64d" intensity={light * lit * k} distance={4.5} decay={2} />
        </>
      ) : null}
    </group>
  );
};

export const Candlestick: React.FC<{ position: V3; frame: number; tilt?: number }> = ({ position, frame, tilt = 0 }) => {
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c99b3f", roughness: 0.3, metalness: 0.9 }), []);
  return (
    <group position={position} rotation={[tilt, 0, 0]}>
      <mesh position={[0, 0.012, 0]} material={brass} castShadow>
        <cylinderGeometry args={[0.065, 0.075, 0.024, 20]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} material={brass} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.22, 12]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={brass}>
        <sphereGeometry args={[0.024, 14, 10]} />
      </mesh>
      <mesh position={[0, 0.245, 0]} material={brass}>
        <cylinderGeometry args={[0.04, 0.02, 0.025, 16]} />
      </mesh>
      <Candle position={[0, 0.255, 0]} height={0.12} frame={frame} seed="stick" light={1.2} />
    </group>
  );
};

/** The cat's red velvet cushion, popping in. */
export const Cushion: React.FC<{ position: V3; scale: number }> = ({ position, scale }) =>
  scale <= 0 ? null : (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.04, 0]} scale={[1, 0.38, 0.85]} castShadow receiveShadow>
        <sphereGeometry args={[0.15, 24, 14]} />
        <meshStandardMaterial color="#8e1f2a" roughness={0.75} />
      </mesh>
      {[-1, 1].map((i) =>
        [-1, 1].map((j) => (
          <mesh key={`${i}${j}`} position={[i * 0.13, 0.04, j * 0.11]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshStandardMaterial color="#d4a640" roughness={0.4} metalness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );

// ---------------------------------------------------------------------------
// The brick lining: the hide's back wall, ends and a low front course, laid bottom-up.
// ---------------------------------------------------------------------------
interface Brick {
  p: V3;
  size: V3;
  course: number;
  color: THREE.Color;
  /** Where the secret door goes (left out once it is built). */
  door?: boolean;
}
const BRICK = { l: 0.22, h: 0.065, d: 0.1, gap: 0.012 };
const FRONT_TOP = 0.62;

const buildBricks = (): Brick[] => {
  const out: Brick[] = [];
  const shade = (seed: string) => new THREE.Color().setHSL(0.03 + random(seed) * 0.025, 0.55, 0.28 + random(`${seed}l`) * 0.1);
  const courseH = BRICK.h + BRICK.gap;
  const x0 = HIDE.x0 + 0.02;
  const x1 = HIDE.x1 - 0.02;
  for (let c = 0; c * courseH < 3; c++) {
    const y = c * courseH + BRICK.h / 2;
    const off = c % 2 ? BRICK.l / 2 : 0;
    // Back wall and front course, along x.
    for (let x = x0 - off; x < x1; x += BRICK.l + BRICK.gap) {
      const a = Math.max(x0, x);
      const b = Math.min(x1, x + BRICK.l);
      if (b - a < 0.05) continue;
      const cx = (a + b) / 2;
      if (y + BRICK.h / 2 < soffitY(cx) - 0.02) out.push({ p: [cx, y, BACK + BRICK.d / 2 + 0.005], size: [b - a, BRICK.h, BRICK.d], course: c, color: shade(`bb${c}-${x}`) });
      if (y + BRICK.h / 2 < FRONT_TOP) out.push({ p: [cx, y, HIDE.z1 - BRICK.d / 2 + 0.015], size: [b - a, BRICK.h, BRICK.d], course: c, color: shade(`bf${c}-${x}`) });
    }
    // The two ends, along z.
    for (const [ex, dir] of [
      [x0 + BRICK.d / 2, 1],
      [x1 - BRICK.d / 2, -1],
    ] as Array<[number, number]>) {
      if (y + BRICK.h / 2 > soffitY(ex) - 0.02) continue;
      for (let z = BACK + BRICK.d + (c % 2 ? BRICK.l / 2 : 0); z < HIDE.z1 - 0.05; z += BRICK.l + BRICK.gap) {
        const za = z;
        const zb = Math.min(HIDE.z1 - 0.05, z + BRICK.l);
        if (zb - za < 0.05) continue;
        const door = dir < 0 && y < SECRET_DOOR.h && zb > SECRET_DOOR.z0 - 0.02 && za < SECRET_DOOR.z1 + 0.02;
        out.push({ p: [ex, y, (za + zb) / 2], size: [BRICK.d, BRICK.h, zb - za], course: c, color: shade(`be${c}-${z}-${dir}`), door });
      }
    }
  }
  return out;
};

export const Bricks: React.FC<{ frame: number; span: [number, number]; door?: boolean }> = ({ frame, span, door = false }) => {
  const bricks = useMemo(buildBricks, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const courses = bricks.reduce((m, b) => Math.max(m, b.course), 0) + 1;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    bricks.forEach((b, i) => {
      // Course c lands at span[0] + c * step, each brick dropping 12 cm into place over 4 frames.
      const at = span[0] + (b.course / courses) * (span[1] - span[0]) + random(`bt${i}`) * 3;
      const t = Math.max(0, Math.min(1, (frame - at) / 4));
      const sc = t <= 0 || (door && b.door) ? 0.0001 : 1;
      mat.compose(new THREE.Vector3(b.p[0], b.p[1] + (1 - t) * 0.12, b.p[2]), q, new THREE.Vector3(b.size[0] * sc, b.size[1] * sc, b.size[2] * sc));
      mesh.setMatrixAt(i, mat);
      mesh.setColorAt(i, b.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  if (frame < span[0]) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bricks.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} />
    </instancedMesh>
  );
};

// ---------------------------------------------------------------------------
// Lines in the air: ropes, the reed, soup going down it, steam, cobwebs, knock rings.
// ---------------------------------------------------------------------------
/** A straight rod from a toward b, drawn to fraction t of its length. */
export const Rod: React.FC<{ a: V3; b: V3; t?: number; r: number; color: string; roughness?: number }> = ({ a, b, t = 1, r, color, roughness = 0.85 }) => {
  if (t <= 0.001) return null;
  const e: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const d = new THREE.Vector3(e[0] - a[0], e[1] - a[1], e[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <mesh position={[(a[0] + e[0]) / 2, (a[1] + e[1]) / 2, (a[2] + e[2]) / 2]} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, len, 10]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
};

/** Drops of soup sliding down the reed from `top` to `tip` while `on`. */
export const SoupDrops: React.FC<{ top: V3; tip: V3; frame: number; span: [number, number] }> = ({ top, tip, frame, span }) => {
  if (frame < span[0] || frame > span[1] + 12) return null;
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const start = span[0] + k * ((span[1] - span[0]) / 6);
        const t = (frame - start) / 12;
        if (t < 0 || t > 1) return null;
        const p: V3 = [top[0] + (tip[0] - top[0]) * t, top[1] + (tip[1] - top[1]) * t, top[2] + (tip[2] - top[2]) * t + 0.02];
        return (
          <mesh key={k} position={p} scale={[1, 1.6, 1]}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <meshStandardMaterial color="#8a5a24" roughness={0.2} />
          </mesh>
        );
      })}
    </>
  );
};

/** Steam curling up from a point (`puff` adds a burst). */
export const Steam: React.FC<{ at: V3; frame: number; from: number; to: number; puff?: number }> = ({ at, frame, from, to, puff }) => {
  if (frame < from || frame > to) return null;
  const wisps = Array.from({ length: 8 }, (_, k) => k);
  const burst = puff !== undefined && frame >= puff && frame < puff + 24 ? 1 - (frame - puff) / 24 : 0;
  return (
    <>
      {wisps.map((k) => {
        const t = ((frame - from) / 30 + k / wisps.length) % 1;
        const x = at[0] + Math.sin(t * 6 + k) * 0.04;
        const y = at[1] + t * 0.45;
        return <GlowSprite key={k} position={[x, y, at[2] + 0.05]} color="#f3efe6" size={0.07 + t * 0.15 + burst * 0.08} opacity={(0.3 + burst * 0.2) * (1 - t)} />;
      })}
    </>
  );
};

/** A cobweb strung in a corner: spokes and a sagging spiral of thin strands, swaying when brushed. */
export const Cobweb: React.FC<{ position: V3; rotation?: V3; size?: number; sway?: number }> = ({ position, rotation = [0, 0, 0], size = 0.35, sway = 0 }) => {
  const geo = useMemo(() => {
    const segs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const spokes = 7;
    const ang = (i: number) => (i / (spokes - 1)) * (Math.PI / 2);
    const at = (i: number, r: number) => new THREE.Vector3(Math.cos(ang(i)) * r, -Math.sin(ang(i)) * r, 0);
    for (let i = 0; i < spokes; i++) segs.push([new THREE.Vector3(0, 0, 0), at(i, size)]);
    for (let ring = 1; ring <= 6; ring++) {
      const r = (ring / 6.5) * size;
      for (let i = 0; i < spokes - 1; i++) segs.push([at(i, r * (0.92 + 0.1 * Math.sin(i * 3 + ring))), at(i + 1, r * (0.92 + 0.1 * Math.sin((i + 1) * 3 + ring)))]);
    }
    // One merged mesh of thin boxes along the strands.
    const parts = segs.map(([p, q]) => {
      const len = p.distanceTo(q);
      const g = new THREE.BoxGeometry(len, 0.004, 0.004);
      const m = new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), q.clone().sub(p).normalize()), new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m);
      return g;
    });
    const pos: number[] = [];
    const idx: number[] = [];
    for (const g of parts) {
      const base = pos.length / 3;
      const ga = g.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < ga.count; k++) pos.push(ga.getX(k), ga.getY(k), ga.getZ(k));
      const gi = g.index as THREE.BufferAttribute;
      for (let k = 0; k < gi.count; k++) idx.push(base + gi.getX(k));
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    out.setIndex(idx);
    return out;
  }, [size]);
  return (
    <group position={position} rotation={[rotation[0] + sway * 0.25, rotation[1], rotation[2] + sway * 0.1]}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#e4e0d6" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

/** Rings spreading from a hollow knock on the panel (in the plane z = at[2]). */
export const KnockRings: React.FC<{ at: V3; frame: number; knock: number }> = ({ at, frame, knock }) => {
  const t = (frame - knock) / 16;
  if (t < 0 || t > 1.4) return null;
  return (
    <>
      {[0, 0.2, 0.4].map((d) => {
        const u = t - d;
        if (u < 0 || u > 1) return null;
        const r = 0.06 + u * 0.42;
        return (
          <mesh key={d} position={at}>
            <ringGeometry args={[r, r + 0.018, 40]} />
            <meshBasicMaterial color="#fff2cf" transparent opacity={0.85 * (1 - u)} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// The sky behind the house (seen in the wide shots).
// ---------------------------------------------------------------------------
export const Sky: React.FC = () => {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const g = c.getContext("2d");
    if (!g) return null;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#3f78c4");
    grad.addColorStop(0.65, "#8fb8e3");
    grad.addColorStop(1, "#d9e6ee");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <>
      <mesh position={[0, 30, -80]}>
        <planeGeometry args={[260, 110]} />
        <meshBasicMaterial map={tex ?? undefined} toneMapped={false} fog={false} />
      </mesh>
      <CloudPuff position={[-14, 16, -60]} scale={3.2} seed={1} />
      <CloudPuff position={[10, 19, -64]} scale={3.8} seed={2} />
      <CloudPuff position={[-2, 23, -70]} scale={2.6} seed={3} />
      <CloudPuff position={[22, 12, -58]} scale={2.8} seed={4} />
    </>
  );
};

/** Where the stairs' x-ray panel is: knocks ring just in front of it. */
export const PANEL_Z = STAIR.z1 + 0.06;
