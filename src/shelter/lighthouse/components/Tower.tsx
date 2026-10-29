import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { G, INK_THIN, Part, flat, vinyl } from "../../../artifacts/characters/hero";
import { GlowSprite } from "../../../artifacts/dungeon/Fx";
import { useSurface } from "../../../engine/materials";
import { makeMasonry } from "../../../engine/textures";
import {
  BEAM_GROW,
  BLASTS,
  GALLERY_R,
  HORN_IN,
  LAMP_Y,
  LAND_Y,
  LENS_IN,
  MIRROR_IN,
  MIRROR_OUT,
  RELIGHT,
  RISE,
  ROOF_DROP,
  ROOM_FRAME,
  ROOM_GLASS,
  ROOM_H,
  ROOM_R,
  TOWER_H,
  TOWER_R0,
  TOWER_R1,
  TOWER_X,
  TOWER_Z,
  beamLength,
  clamp01,
  easeOutBack,
  easeOutCubic,
  facing,
  fireAmount,
  lampAmount,
  lerp,
  panelAngles,
  progress,
  topY,
} from "../timeline";

const COURSES = 8;
const BAND = ["#f4efe6", "#d23a32"];

// ---------------------------------------------------------------------------
// Fire: the beach bonfire that later rides the tower up and is blown out.
// ---------------------------------------------------------------------------

export const Flame: React.FC<{ frame: number; amount: number; scale?: number }> = ({ frame, amount, scale = 1 }) => {
  if (amount < 0.02) return null;
  const fl = 0.9 + 0.1 * Math.sin(frame * 1.7) + 0.06 * Math.cos(frame * 2.9);
  return (
    <group scale={[scale * amount, scale * amount * fl, scale * amount]}>
      <mesh position={[0, 0.34, 0]}>
        <coneGeometry args={[0.24, 0.78, 9]} />
        <meshBasicMaterial color="#ffa21a" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.24, 0.02]}>
        <coneGeometry args={[0.14, 0.5, 8]} />
        <meshBasicMaterial color="#fff3a8" toneMapped={false} />
      </mesh>
      <mesh position={[0.05 * Math.sin(frame * 0.3), 0.28, 0.05]} rotation={[0.1, 0.2, -0.15 + 0.08 * Math.sin(frame * 0.35)]}>
        <coneGeometry args={[0.17, 0.6, 7]} />
        <meshBasicMaterial color="#ff5a12" toneMapped={false} />
      </mesh>
      <mesh position={[-0.06 * Math.cos(frame * 0.27), 0.22, -0.04]} rotation={[-0.1, -0.2, 0.18]}>
        <coneGeometry args={[0.12, 0.44, 7]} />
        <meshBasicMaterial color="#ff8a1a" toneMapped={false} />
      </mesh>
    </group>
  );
};

const Bonfire: React.FC<{ frame: number; y: number }> = ({ frame, y }) => {
  const amount = fireAmount(frame);
  if (frame >= RELIGHT[0]) return null;
  return (
    <group position={[TOWER_X, y, TOWER_Z]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        return (
          <Part key={i} geo={G.capsule(0.06, 0.62)} mat={vinyl("#5a3820", "wood")} position={[Math.cos(a) * 0.14, 0.14, Math.sin(a) * 0.14]} rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]} ink={INK_THIN} />
        );
      })}
      {amount > 0.05 ? (
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.24, 0.26, 0.05, 10]} />
          <meshBasicMaterial color="#ff4a10" toneMapped={false} />
        </mesh>
      ) : null}
      <group position={[0, 0.06, 0]}>
        <Flame frame={frame} amount={amount} scale={2.4} />
      </group>
      <GlowSprite position={[0, 0.7, 0.1]} size={2.6 + 3.2 * amount} color="#ff9a40" opacity={0.55 * amount} />
      <pointLight position={[0, 1.0, 0.4]} color="#ff9a40" intensity={6 * amount} distance={9} decay={1.6} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// The tower, its gallery, the lantern room and everything inside it.
// ---------------------------------------------------------------------------

/** Parabolic mirror profile for the lathe (opens toward +y before rotation). */
const MIRROR_PROFILE: ReadonlyArray<readonly [number, number]> = Array.from({ length: 9 }, (_, i) => {
  const r = 0.02 + (i / 8) * 0.56;
  return [r, r * r * 0.9] as const;
});

const beamMaterial = (color: string) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0.3 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying vec2 vUv;
      void main(){ float a = opacity * pow(vUv.y, 1.3); gl_FragColor = vec4(color * a, a); }`,
  });

/** A light beam from the origin along +x; its yaw turns it about y (pi/2 = toward the camera). */
export const Beam: React.FC<{ angle: number; length: number; radius: number; opacity: number; color?: string }> = ({ angle, length, radius, opacity, color = "#fff1b8" }) => {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 40, 1, true);
    g.translate(0, -0.5, 0);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  const outer = useMemo(() => beamMaterial(color), [color]);
  const inner = useMemo(() => beamMaterial("#ffffff"), []);
  outer.uniforms.opacity.value = opacity;
  inner.uniforms.opacity.value = opacity * 0.8;
  if (length < 0.2 || opacity < 0.01) return null;
  return (
    <group rotation={[0, -angle, 0]}>
      <mesh geometry={geo} material={outer} scale={[length, radius, radius]} renderOrder={5} />
      <mesh geometry={geo} material={inner} scale={[length, radius * 0.4, radius * 0.4]} renderOrder={6} />
    </group>
  );
};

/** Beehive Fresnel lens: brass frame, glass prism rings, a bullseye per panel. */
const FresnelLens: React.FC<{ frame: number }> = ({ frame }) => {
  const s = easeOutBack(progress(frame, LENS_IN), 1.6);
  if (s <= 0.001) return null;
  const glass = vinyl("#c8f0ff", "gloss");
  const brass = vinyl("#f2c14e", "gloss");
  const [a0] = panelAngles(frame);
  const lag = a0 - panelAngles(frame)[1];
  return (
    <group position={[0, LAMP_Y - (TOWER_H + LAND_Y), 0]} scale={[s, s, s]} rotation={[0, -a0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.42, 0.42, 1.0, 28, 1, true]} />
        <meshStandardMaterial color="#d9f6ff" transparent opacity={0.28} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-0.42, -0.3, -0.18, 0.18, 0.3, 0.42].map((y, i) => (
        <Part key={i} geo={G.torus(0.42 - Math.abs(y) * 0.12, 0.035)} mat={glass} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
      ))}
      {[-0.52, 0.52].map((y) => (
        <Part key={`b${y}`} geo={G.torus(0.44, 0.045)} mat={brass} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
      ))}
      {/* Bullseye panels: one on +x, the second lagging behind it */}
      {[0, lag].map((off, k) => (
        <group key={k} rotation={[0, off, 0]}>
          {[0.08, 0.16, 0.24].map((r) => (
            <Part key={r} geo={G.torus(r, 0.022)} mat={glass} position={[0.44, 0, 0]} rotation={[0, Math.PI / 2, 0]} ink={false} />
          ))}
          <mesh position={[0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.07, 16]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Foghorn: a red housing and a brass trumpet pointing out to sea, plus its sound rings. */
const Foghorn: React.FC<{ frame: number }> = ({ frame }) => {
  const s = easeOutBack(progress(frame, HORN_IN), 1.8);
  if (s <= 0.001) return null;
  const blasting = BLASTS.some((b) => frame >= b && frame < b + 40);
  const kick = BLASTS.reduce((acc, b) => acc + (frame >= b && frame < b + 40 ? 0.06 * Math.sin((frame - b) * 1.6) * (1 - (frame - b) / 40) : 0), 0);
  return (
    <group position={[GALLERY_R - 0.35, 0.32, 0.25]} scale={[s, s, s]}>
      <Part geo={G.box(0.42, 0.36, 0.42)} mat={vinyl("#c8322b", "gloss")} position={[0, 0, 0]} />
      <group position={[0.2 + kick, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <Part geo={G.cyl(0.07, 0.07, 0.4)} mat={vinyl("#f2c14e", "gloss")} position={[0, 0.2, 0]} ink={INK_THIN} />
        <Part geo={G.cyl(0.36, 0.08, 0.62, 24)} mat={vinyl("#f2c14e", "gloss")} position={[0, 0.7, 0]} />
        <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.33, 24]} />
          <meshBasicMaterial color="#3a2a1a" />
        </mesh>
      </group>
      {blasting ? <GlowSprite position={[1.2, 0.05, 0]} size={1.2} color="#ffffff" opacity={0.25} /> : null}
    </group>
  );
};

/** Expanding rings of sound from the horn mouth for each blast. */
const SoundRings: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {BLASTS.map((b) =>
      [0, 7, 14, 21].map((d) => {
        const t = (frame - b - d) / 44;
        if (t < 0 || t > 1) return null;
        return (
          <mesh key={`${b}-${d}`} position={[GALLERY_R + 0.7 + t * 7, 0.37, 0.25]} rotation={[0, Math.PI / 2, 0]} scale={0.35 + t * 2.6}>
            <torusGeometry args={[1, 0.06, 8, 48]} />
            <meshBasicMaterial color="#ffd84d" transparent opacity={0.95 * (1 - t)} depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
        );
      }),
    )}
  </>
);

export const Tower: React.FC<{ frame: number }> = ({ frame }) => {
  const masonry = useSurface(
    "lh-masonry",
    () => makeMasonry({ rows: 10, cols: 8, base: "#e9e2d4", baseAlt: "#d8cfbd", mortar: "#9b9284", seed: 21 }),
    [3, 1],
  );
  const top = topY(frame);
  const rising = frame >= RISE[0];
  const lamp = lampAmount(frame);
  const deckLocal = LAND_Y + TOWER_H;

  return (
    <>
      <Bonfire frame={frame} y={rising ? top : LAND_Y} />
      {rising ? (
        <group position={[TOWER_X, top - deckLocal, TOWER_Z]}>
          {/* Striped stone courses, tapering, with a door and windows */}
          {Array.from({ length: COURSES }, (_, i) => {
            const h = TOWER_H / COURSES;
            const y0 = LAND_Y + i * h;
            const r0 = lerp(TOWER_R0, TOWER_R1, i / COURSES);
            const r1 = lerp(TOWER_R0, TOWER_R1, (i + 1) / COURSES);
            return (
              <mesh key={i} position={[0, y0 + h / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[r1, r0, h, 40]} />
                <meshStandardMaterial {...masonry} color={BAND[Math.floor(i / 2) % 2]} roughness={0.85} />
              </mesh>
            );
          })}
          <mesh position={[0, LAND_Y + 0.2, 0]}>
            <cylinderGeometry args={[TOWER_R0 + 0.2, TOWER_R0 + 0.28, 0.4, 40]} />
            <meshStandardMaterial color="#8b8d98" roughness={0.9} />
          </mesh>
          <Part geo={G.box(0.6, 1.05, 0.2)} mat={vinyl("#4a2e1c", "wood")} position={[0.12, LAND_Y + 0.55, TOWER_R0 - 0.02]} rotation={[0, 0.1, 0]} />
          {[2.6, 4.4].map((y, i) => (
            <Part key={y} geo={G.box(0.3, 0.42, 0.12)} mat={vinyl("#ffd27a", "gloss")} position={[i ? -0.25 : 0.25, LAND_Y + y, lerp(TOWER_R0, TOWER_R1, y / TOWER_H) - 0.02]} ink={INK_THIN} />
          ))}

          {/* Gallery deck and railing */}
          <group position={[0, deckLocal, 0]}>
            <mesh position={[0, -0.08, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[GALLERY_R, GALLERY_R - 0.25, 0.18, 40]} />
              <meshStandardMaterial color="#363c4a" roughness={0.6} metalness={0.3} />
            </mesh>
            <Part geo={G.torus(GALLERY_R - 0.06, 0.035)} mat={vinyl("#2a2f3a", "metal")} position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * Math.PI * 2;
              return <mesh key={i} position={[Math.cos(a) * (GALLERY_R - 0.06), 0.29, Math.sin(a) * (GALLERY_R - 0.06)]}><cylinderGeometry args={[0.022, 0.022, 0.58, 6]} /><meshStandardMaterial color="#2a2f3a" /></mesh>;
            })}

            <LanternRoom frame={frame} />
            <Foghorn frame={frame} />
            <SoundRings frame={frame} />

            {/* The lamp, relit inside the room */}
            {lamp > 0.01 ? (
              <group>
                <Part geo={G.cyl(0.08, 0.14, 0.42)} mat={vinyl("#f2c14e", "gloss")} position={[0, 0.21, 0]} ink={INK_THIN} />
                <group position={[0, 0.44, 0]}>
                  <Flame frame={frame} amount={lamp} scale={0.7} />
                </group>
                <pointLight position={[0, LAMP_Y - deckLocal, 0.6]} color="#ffd38a" intensity={5 * lamp} distance={8} decay={1.6} />
              </group>
            ) : null}
            <Mirror frame={frame} />
            <FresnelLens frame={frame} />
          </group>
        </group>
      ) : null}
      <LampGlow frame={frame} />
    </>
  );
};

const LanternRoom: React.FC<{ frame: number }> = ({ frame }) => {
  const fr = easeOutBack(progress(frame, ROOM_FRAME), 1.4);
  if (fr <= 0.001) return null;
  const glass = progress(frame, ROOM_GLASS);
  const roofT = progress(frame, ROOF_DROP);
  const roofY = ROOM_H + 5 * (1 - easeOutCubic(roofT)) ** 2 - 0.08 * Math.sin(Math.PI * clamp01((frame - ROOF_DROP[1]) / 8));
  return (
    <>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[ROOM_R + 0.06, ROOM_R + 0.08, 0.14, 32]} />
        <meshStandardMaterial color="#2a2f3a" roughness={0.5} metalness={0.4} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh key={i} position={[Math.cos(a) * ROOM_R, (ROOM_H * fr) / 2, Math.sin(a) * ROOM_R]} scale={[1, fr, 1]}>
            <boxGeometry args={[0.06, ROOM_H, 0.06]} />
            <meshStandardMaterial color="#20252e" roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
      {glass > 0 ? (
        <mesh position={[0, ROOM_H / 2, 0]}>
          <cylinderGeometry args={[ROOM_R - 0.01, ROOM_R - 0.01, ROOM_H, 32, 1, true]} />
          <meshStandardMaterial color="#cfeeff" transparent opacity={0.22 * glass} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ) : null}
      {roofT > 0 ? (
        <group position={[0, roofY, 0]}>
          <Part geo={G.cone(ROOM_R + 0.22, 0.62, 32)} mat={vinyl("#c8322b", "gloss")} position={[0, 0.31, 0]} />
          <Part geo={G.sphere(0.12)} mat={vinyl("#2a2f3a", "gloss")} position={[0, 0.68, 0]} ink={INK_THIN} />
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
            <meshStandardMaterial color="#2a2f3a" />
          </mesh>
        </group>
      ) : null}
    </>
  );
};

const Mirror: React.FC<{ frame: number }> = ({ frame }) => {
  const inT = easeOutBack(progress(frame, MIRROR_IN), 1.5);
  const outT = progress(frame, MIRROR_OUT);
  const s = inT * (1 - easeOutCubic(outT));
  if (s <= 0.001) return null;
  return (
    <group position={[-0.3, LAMP_Y - (TOWER_H + LAND_Y), 0]} rotation={[0, 0, -Math.PI / 2]} scale={[s, s, s]}>
      <Part geo={G.lathe("lh-mirror", MIRROR_PROFILE)} mat={vinyl("#e8eef6", "gloss")} ink={INK_THIN} />
    </group>
  );
};

/** World-space glow at the lamp, plus the turning beams and their flashes toward the camera. */
const LampGlow: React.FC<{ frame: number }> = ({ frame }) => {
  const lamp = lampAmount(frame);
  if (lamp < 0.01) return null;
  const grow = progress(frame, BEAM_GROW);
  const len = beamLength(frame);
  const choke = clamp01(len / 34);
  const angles = panelAngles(frame);
  const flash = Math.max(...angles.map(facing)) * grow;
  const p: [number, number, number] = [TOWER_X, LAMP_Y, TOWER_Z];
  return (
    <group position={p}>
      <GlowSprite size={1.6 + 1.2 * grow} color="#ffe2a0" opacity={0.6 * lamp} />
      {angles.map((a, i) => (
        <Beam key={i} angle={a} length={len} radius={0.25 + len * 0.07} opacity={(i === 0 ? 0.5 : 0.42) * grow * lerp(0.4, 1, choke)} />
      ))}
      {flash > 0.02 ? (
        <>
          <GlowSprite position={[0, 0, 0.9]} size={3 + 9 * flash} color="#fff6d8" opacity={0.7 * flash * choke} />
          <mesh position={[0, 0, 0.9]}>
            <sphereGeometry args={[0.3 * flash, 16, 12]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </>
      ) : null}
    </group>
  );
};

/** A distant copy of our lighthouse with a steady beam, rising on its headland. */
export const OtherLighthouse: React.FC<{ x: number; z: number; s: number; rise: number; lit: number; beamAngle: number; fog: number }> = ({ x, z, s, rise, lit, beamAngle, fog }) => {
  if (rise <= 0.001) return null;
  const h = 6.4 * s;
  return (
    <group position={[x, 1.6 * s - h * (1 - rise), z]}>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * (h / 4), 0]}>
          <cylinderGeometry args={[lerp(1.0, 0.8, (i + 1) / 4) * s, lerp(1.0, 0.8, i / 4) * s, h / 4, 24]} />
          <meshStandardMaterial color={i % 2 ? "#2b3e6b" : "#f0ebe0"} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.55 * s, 0]}>
        <cylinderGeometry args={[0.6 * s, 0.6 * s, 1.1 * s, 16]} />
        <meshStandardMaterial color="#20252e" emissive="#ffd38a" emissiveIntensity={1.5 * lit} />
      </mesh>
      <mesh position={[0, h + 1.35 * s, 0]}>
        <coneGeometry args={[0.8 * s, 0.6 * s, 16]} />
        <meshStandardMaterial color="#2b3e6b" />
      </mesh>
      <group position={[0, h + 0.55 * s, 0]}>
        <GlowSprite size={4 * s * lit} color="#ffe2a0" opacity={0.8 * lit * (1 - 0.8 * fog)} />
        <Beam angle={beamAngle} length={26 * lit} radius={0.25 + 1.6 * lit} opacity={0.26 * lit * (1 - 0.85 * fog)} />
      </group>
    </group>
  );
};

/** The keeper's candle on its crate: the whole idea in miniature. */
export const Candle: React.FC<{ frame: number; position: readonly [number, number, number] }> = ({ frame, position }) => (
  <group position={[position[0], position[1], position[2]]}>
    <Part geo={G.box(0.5, 0.46, 0.44)} mat={vinyl("#9a6a3c", "wood")} position={[0, 0.23, 0]} />
    <Part geo={G.cyl(0.05, 0.05, 0.22)} mat={vinyl("#f6f0dc", "cloth")} position={[0, 0.57, 0]} ink={INK_THIN} />
    <mesh position={[0, 0.71, 0]} scale={[1, 1 + 0.12 * Math.sin(frame * 1.3), 1]}>
      <coneGeometry args={[0.035, 0.11, 8]} />
      <meshBasicMaterial color="#ffc04a" toneMapped={false} />
    </mesh>
    <mesh position={[0, 0.71, 0]} material={flat("#fff6c8")}>
      <sphereGeometry args={[0.018, 8, 6]} />
    </mesh>
    <GlowSprite position={[0, 0.72, 0.05]} size={0.5} color="#ffb860" opacity={0.6} />
  </group>
);
