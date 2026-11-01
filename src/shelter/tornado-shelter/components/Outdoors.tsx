import type React from "react";
import { useEffect, useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Blob, Block, LP, LowPolyLight, Prism, facetGround, matte } from "../../../lowpoly";
import {
  BEATS,
  DEBRIS,
  FUNNEL6,
  FUNNEL_Z,
  HEDGE_X,
  L2_START,
  L4C_START,
  LAB_ON,
  LAB_X,
  LAB_Y,
  LAWN_Y,
  SIREN_X,
  WALL_Z,
  WIN_X,
  WIN_Y0,
  approachPos,
  funnelX,
  storm,
} from "../timeline";

export const mix = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/** Sun, sky and fill, darkening and turning green-grey with the storm. */
export const StormLight: React.FC<{ frame: number }> = ({ frame }) => {
  const s = storm(frame);
  const inLab = frame >= LAB_ON[0] && frame < LAB_ON[1];
  return (
    <group>
      <LowPolyLight
        target={inLab ? [LAB_X, LAB_Y + 1, 0] : [0, 1, -0.5]}
        bounds={15}
        sunIntensity={THREE.MathUtils.lerp(3.1, 1.1, s)}
        sunColor={mix("#fff2de", "#c9d4dc", s)}
        sky={mix("#bcd0f2", "#8c9c9a", s)}
        ground={mix("#a3825f", "#5e5a4c", s)}
        hemiIntensity={THREE.MathUtils.lerp(1.0, 0.85, s)}
      />
      {/* Weak fill from behind, so the back of the house reads in the reverse shot */}
      <directionalLight position={[2, 8, -20]} intensity={0.9} color={mix("#dfe8f5", "#9aa6a8", s)} />
      <mesh>
        <sphereGeometry args={[150, 24, 12]} />
        <meshBasicMaterial color={mix("#c3d6e6", "#56645f", s)} side={THREE.BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
};

const FUNNEL_SEG = 14;
const FUNNEL_ROWS = 18;
export const FUNNEL_H = 24;
const funnelMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
const DARK = new THREE.Color("#454d52");
const LIGHT = new THREE.Color("#a2aaae");

/**
 * One continuous funnel: a tapered tube that bends like a rope near the ground
 * and twists toward the cloud base. Faceted (one colour per quad), with pale
 * bands that spiral round it so it visibly spins.
 */
const funnelGeometry = (frame: number) => {
  const rows: THREE.Vector3[][] = [];
  for (let r = 0; r <= FUNNEL_ROWS; r++) {
    const t = r / FUNNEL_ROWS;
    const loose = (1 - t) ** 1.6;
    const cx = Math.sin(frame * 0.035 + t * 2.6) * 1.7 * loose;
    const cz = Math.cos(frame * 0.03 + t * 2.1) * 0.8 * loose;
    const radius = 0.55 + 6.6 * t ** 2.3;
    const ring: THREE.Vector3[] = [];
    for (let s = 0; s < FUNNEL_SEG; s++) {
      const a = (s / FUNNEL_SEG) * Math.PI * 2 + t * 1.6;
      const rr = radius * (1 + (random(`fj-${r}-${s}`) - 0.5) * 0.16);
      ring.push(new THREE.Vector3(cx + Math.cos(a) * rr, t * FUNNEL_H, cz + Math.sin(a) * rr));
    }
    rows.push(ring);
  }
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  for (let r = 0; r < FUNNEL_ROWS; r++) {
    const t = (r + 0.5) / FUNNEL_ROWS;
    for (let s = 0; s < FUNNEL_SEG; s++) {
      const s1 = (s + 1) % FUNNEL_SEG;
      const [p00, p01, p10, p11] = [rows[r][s], rows[r][s1], rows[r + 1][s], rows[r + 1][s1]];
      for (const p of [p00, p10, p01, p01, p10, p11]) pos.push(p.x, p.y, p.z);
      const band = Math.sin(((s + 0.5) / FUNNEL_SEG) * Math.PI * 6 + t * 9 - frame * 0.45);
      c.copy(DARK).lerp(LIGHT, 0.25 + 0.55 * t ** 0.8 + (band > 0.35 ? 0.14 : 0));
      for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

const DUST = ["#8f8676", "#7d7466", "#a39a88"];

/** A low-poly tornado: the funnel, a churning dust-and-debris skirt, and the dark wall cloud above. */
const Funnel: React.FC<{ frame: number; position: [number, number, number]; scale: number }> = ({ frame, position, scale }) => {
  const geo = useMemo(() => funnelGeometry(frame), [frame]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh geometry={geo} material={funnelMat} />
      {/* Debris skirt: dust clods and junk whirling round the foot */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = frame * (0.16 + random(`sk-v-${i}`) * 0.08) + (i / 16) * Math.PI * 2;
        const rad = 1.4 + random(`sk-r-${i}`) * 2.2;
        const y = 0.3 + random(`sk-y-${i}`) * 2.4 + Math.sin(frame * 0.1 + i) * 0.3;
        return (
          <Blob
            key={i}
            r={0.45 + random(`sk-s-${i}`) * 0.7}
            seed={80 + i}
            position={[Math.cos(a) * rad, y, Math.sin(a) * rad]}
            scale={[1.3, 0.8, 1.1]}
            color={DUST[i % 3]}
            castShadow={false}
          />
        );
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const a = -frame * 0.1 + (i / 6) * Math.PI * 2;
        const y = 3 + i * 1.6;
        const rad = 1.4 + y * 0.18;
        return (
          <group key={`j${i}`} position={[Math.cos(a) * rad, y, Math.sin(a) * rad]} rotation={[frame * 0.2 + i, frame * 0.13, i]}>
            <Block size={[0.9, 0.08, 0.2]} color={i % 2 ? "#c99a5f" : LP.roof} castShadow={false} />
          </group>
        );
      })}
      {/* Wall cloud: a dark, slowly turning lid over the funnel */}
      <group position={[0, FUNNEL_H + 0.5, 0]} rotation={[0, frame * 0.01, 0]}>
        <Blob r={8} seed={70} scale={[1.6, 0.32, 1.4]} color="#4f585c" castShadow={false} />
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return <Blob key={i} r={4.5} seed={71 + i} position={[Math.cos(a) * 9, 0.6 + (i % 2) * 0.8, Math.sin(a) * 7]} scale={[1.5, 0.45, 1.2]} color={i % 2 ? "#5a6367" : "#485155"} castShadow={false} />;
        })}
      </group>
    </group>
  );
};

export const Tornadoes: React.FC<{ frame: number }> = ({ frame }) => {
  const passing = frame >= FUNNEL6[0] && frame < FUNNEL6[1];
  return (
    <group>
      {frame < FUNNEL6[0] && <Funnel frame={frame} position={approachPos(frame)} scale={1} />}
      {passing && <Funnel frame={frame} position={[funnelX(frame), LAWN_Y - 1, FUNNEL_Z]} scale={1.1} />}
    </group>
  );
};

const streakMat = new THREE.MeshBasicMaterial({ color: "#f2f5f7", transparent: true, opacity: 0.4, depthWrite: false });

/** Wind streaks blowing toward -x in front of and behind the house; thicker with the storm. */
export const Wind: React.FC<{ frame: number }> = ({ frame }) => {
  const s = storm(frame);
  const inLab = frame >= LAB_ON[0] && frame < LAB_ON[1];
  if (s < 0.45 || inLab) return null;
  streakMat.opacity = 0.55 * Math.min(1, (s - 0.45) / 0.35);
  const n = Math.round(60 * s);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const front = random(`ws-band-${i}`) < 0.55;
        const z = front ? 3.2 + random(`ws-z-${i}`) * 1.2 : -4.5 - random(`ws-z-${i}`) * 6;
        const y = front ? 3.8 + random(`ws-y-${i}`) * 4.5 : 0.3 + random(`ws-y-${i}`) * 7;
        const speed = 0.7 + random(`ws-v-${i}`) * 0.6;
        const span = 40;
        const x = 20 - ((random(`ws-x-${i}`) * span + frame * speed) % span);
        const len = 0.7 + random(`ws-l-${i}`) * 1.6;
        return <mesh key={i} position={[x, y, z]} material={streakMat}><boxGeometry args={[len, 0.025, 0.025]} /></mesh>;
      })}
    </group>
  );
};

/** Wind pouring in through the opened living-room window in the gag, curling up to the ceiling. */
export const WindowGust: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BEATS.lets || frame >= L4C_START) return null;
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => {
        const t = ((frame - BEATS.lets) * 0.05 + random(`wg-${i}`)) % 1;
        const x = WIN_X + (random(`wgx-${i}`) - 0.5) * 1.6;
        const z = WALL_Z + 0.2 + t * 3;
        const y = WIN_Y0 + 0.3 + t * t * 1.8;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[-0.4 - t, 0, 0]} material={streakMat}>
            <boxGeometry args={[0.04, 0.04, 0.9]} />
          </mesh>
        );
      })}
    </group>
  );
};

const DEBRIS_KINDS = ["board", "shingle", "leaves", "board", "trampoline", "mailbox", "shingle", "chair", "board", "bin"] as const;
const DebrisPiece: React.FC<{ kind: (typeof DEBRIS_KINDS)[number] }> = ({ kind }) => {
  switch (kind) {
    case "board":
      return <Block size={[1.8, 0.14, 0.32]} color="#c99a5f" />;
    case "shingle":
      return <Block size={[0.7, 0.06, 0.5]} color={LP.roof} />;
    case "leaves":
      return <Blob r={0.4} seed={5} color={LP.leaf} />;
    case "trampoline":
      return (
        <group>
          <Prism r={1.3} h={0.1} sides={12} color={LP.ink} />
          <Prism r={1.45} h={0.14} sides={12} bevel={0.04} position={[0, -0.02, 0]} color={LP.cloth} />
          {[0, 1, 2, 3].map((k) => (
            <Block key={k} size={[0.08, 0.7, 0.08]} position={[Math.cos(k * 1.57) * 1.3, -0.4, Math.sin(k * 1.57) * 1.3]} color={LP.steel} />
          ))}
        </group>
      );
    case "mailbox":
      return (
        <group>
          <Block size={[0.5, 0.35, 0.3]} color={LP.red} />
          <Block size={[0.06, 0.9, 0.06]} position={[0, -0.6, 0]} color={LP.woodDark} />
        </group>
      );
    case "chair":
      return (
        <group>
          <Block size={[0.6, 0.08, 0.6]} color={LP.cream} />
          <Block size={[0.6, 0.6, 0.08]} position={[0, 0.3, -0.28]} color={LP.cream} />
        </group>
      );
    case "bin":
      return <Prism r={0.35} h={0.9} sides={8} color="#5f7a4a" />;
  }
};

/** L3a: the whole neighbourhood's junk flying past the house. */
export const DebrisStream: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < DEBRIS[0] || frame >= DEBRIS[1]) return null;
  const n = 40;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const kind = DEBRIS_KINDS[i % DEBRIS_KINDS.length];
        const t0 = DEBRIS[0] - 30 + random(`db-t-${i}`) * (DEBRIS[1] - DEBRIS[0]);
        const v = 0.25 + random(`db-v-${i}`) * 0.25;
        const x = 22 - v * (frame - t0);
        if (x < -26 || x > 24) return null;
        const y = 1.0 + random(`db-y-${i}`) * 7 + Math.sin(frame * 0.08 + i) * 0.5;
        const z = -8 + random(`db-z-${i}`) * 13;
        const spin = (random(`db-s-${i}`) - 0.5) * 0.3;
        return (
          <group key={i} position={[x, y, z]} rotation={[frame * spin, frame * spin * 0.6, frame * spin * 1.3]}>
            <DebrisPiece kind={kind} />
          </group>
        );
      })}
    </group>
  );
};

/** Lawn, hedge, tree, the siren pole, fence, path and the hills. */
export const Yard: React.FC<{ frame: number }> = ({ frame }) => {
  const sirenOn = frame >= BEATS.siren - 4 && frame < L2_START;
  const horn = sirenOn ? (frame - BEATS.siren) * 0.12 : 0;
  const ground = useMemo(() => facetGround(140, 120, 44, 1.1, 3, 11), []);
  return (
    <group>
      <mesh geometry={ground} material={matte(LP.grass)} position={[0, LAWN_Y, 0]} receiveShadow />
      {/* Hedge the family lands in */}
      {[
        [HEDGE_X - 1.2, -0.6, 0.85, 51],
        [HEDGE_X, -0.9, 1.0, 52],
        [HEDGE_X + 1.1, -0.7, 0.8, 53],
        [HEDGE_X - 0.5, -1.8, 0.9, 54],
      ].map(([x, z, r, seed]) => (
        <Blob key={seed} r={r} seed={seed} position={[x, LAWN_Y + r * 0.6, z]} scale={[1.3, 0.85, 1.1]} color={seed % 2 ? LP.leaf : LP.grassDark} />
      ))}
      <Prism r={0.24} h={2.6} sides={6} position={[-13, LAWN_Y + 1.3, -7]} color={LP.woodDark} />
      <Blob r={1.5} seed={3} position={[-13, LAWN_Y + 3.4, -7]} color={LP.leaf} />
      <Blob r={1.1} seed={7} position={[-12.1, LAWN_Y + 2.9, -6.4]} color="#7aa060" />
      {/* Siren pole: the horn turns while it wails */}
      <Prism r={0.12} h={6.5} sides={6} position={[SIREN_X, LAWN_Y + 3.25, -3.5]} color={LP.stoneDark} />
      <group position={[SIREN_X, LAWN_Y + 6.6, -3.5]} rotation={[0, horn, 0]}>
        <Prism r={0.32} h={0.8} sides={8} rotation={[0, 0, Math.PI / 2]} color={LP.red} />
        <Prism r={0.4} h={0.12} sides={8} position={[0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={LP.ink} />
      </group>
      {Array.from({ length: 8 }, (_, i) => (
        <Block key={i} size={[0.16, 0.9, 0.08]} position={[7.4 + i * 0.4, LAWN_Y + 0.4, 2.6]} color={LP.cream} />
      ))}
      <Block size={[3.2, 0.1, 0.06]} position={[8.8, LAWN_Y + 0.6, 2.56]} color={LP.cream} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Prism key={i} r={0.36} h={0.14} sides={8} position={[4.2 + Math.sin(i * 1.7) * 0.25, LAWN_Y + 0.04, 4.8 + i * 0.85]} color={LP.stone} />
      ))}
      {[
        [7.2, 2.9, 0.7, 43],
        [1.6, 3.7, 0.5, 44],
        [-1.4, 3.8, 0.45, 45],
      ].map(([x, z, r, seed]) => (
        <Blob key={seed} r={r} seed={seed} position={[x, LAWN_Y + r * 0.6, z]} scale={[1.2, 0.85, 1]} color={seed % 2 ? LP.leaf : LP.grassDark} />
      ))}
      <Blob r={9} seed={21} position={[-26, -4, -60]} scale={[1.6, 0.45, 1]} color="#a9b79c" castShadow={false} />
      <Blob r={11} seed={22} position={[18, -5, -66]} scale={[1.8, 0.45, 1]} color="#9fae93" castShadow={false} />
    </group>
  );
};

/** Storm clouds: a dark faceted deck that rolls in with the storm. */
export const Clouds: React.FC<{ frame: number }> = ({ frame }) => {
  const s = storm(frame);
  return (
    <group>
      {[
        [-14, 15, -36, 2.6],
        [4, 17, -42, 3.2],
        [20, 14, -38, 2.2],
        [-30, 16, -50, 3.0],
        [32, 18, -55, 3.4],
      ].map(([x, y, z, r], i) => (
        <Blob
          key={i}
          r={r * (1 + s * 0.6)}
          seed={31 + i}
          position={[x - frame * 0.01 * (1 + s), y - s * 2, z]}
          scale={[1.9, 0.7, 1]}
          material={matte(mix("#f4f6f8", "#6c7576", s), { emissive: mix("#ffffff", "#3c4446", s), emissiveIntensity: 0.25 })}
          castShadow={false}
        />
      ))}
    </group>
  );
};

/** Crash-test lab: concrete bay, an air cannon, a gauge, and the sample wall panel. */
export const LabSet: React.FC<{ frame: number; children?: React.ReactNode }> = ({ frame, children }) => {
  if (frame < LAB_ON[0] - 2 || frame >= LAB_ON[1]) return null;
  return (
    <group position={[LAB_X, LAB_Y, 0]}>
      <Block size={[14, 5, 9]} position={[0, -2.5, -0.5]} color={LP.concrete} castShadow={false} />
      <Block size={[14, 5, 0.4]} position={[0, 2.5, -4.6]} color={LP.stone} />
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <Block key={x} size={[0.5, 5, 0.6]} position={[x, 2.5, -4.25]} color={LP.stoneDark} />
      ))}
      <Block size={[14, 0.3, 0.7]} position={[0, 5.0, -4.3]} color={LP.trim} />
      {/* Hazard floor stripe under the firing line */}
      {Array.from({ length: 14 }, (_, i) => (
        <Block key={i} size={[0.3, 0.02, 0.5]} position={[-3.4 + i * 0.4, 0.01, 1.4]} color={i % 2 ? LP.ink : LP.hazard} castShadow={false} />
      ))}
      {children}
    </group>
  );
};

