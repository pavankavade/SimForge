import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";
import { clamp01, easeOutBack } from "../../kit";
import { HazardBand } from "./Dart";

/**
 * Solid masonry end wall closing the trap corridor. Its left face (x = `x`)
 * carries the dart battery and, later, the winch and an end-wall turret.
 */
export const TrapEndWall: React.FC<{ x: number; right: number; ceilingY: number; z?: number }> = ({ x, right, ceilingY, z = -0.6 }) => {
  const stone = useSurface(
    "dt-endwall",
    () => makeMasonry({ rows: 9, cols: 3, base: "#4a4e5d", baseAlt: "#575b6b", mortar: "#1c1e26", seed: 41 }),
    [1, 3]
  );
  const w = right - x;
  const back = z - 2.0;
  const front = z + 1.7;
  const d = front - back;
  const mat = (
    <meshStandardMaterial
      map={stone.map}
      normalMap={stone.normalMap}
      roughnessMap={stone.roughnessMap}
      normalScale={new THREE.Vector2(0.8, 0.8)}
      color="#c9cbd4"
      roughness={0.86}
    />
  );
  return (
    <group>
      <mesh position={[x + w / 2, ceilingY / 2, back + d / 2]} receiveShadow castShadow>
        <boxGeometry args={[w, ceilingY, d]} />
        {mat}
      </mesh>
      {/* Plinth and a capstone ledge, so the block reads as a built wall */}
      <mesh position={[x + w / 2 - 0.06, 0.18, back + d / 2]} receiveShadow>
        <boxGeometry args={[w + 0.12, 0.36, d + 0.08]} />
        <meshStandardMaterial color="#363946" roughness={0.9} />
      </mesh>
      <mesh position={[x + w / 2 - 0.08, 4.2, back + d / 2]}>
        <boxGeometry args={[w + 0.16, 0.16, d + 0.1]} />
        <meshStandardMaterial color="#5d6172" roughness={0.8} />
      </mesh>
    </group>
  );
};

interface DartBatteryProps {
  /** Wall face x; the battery juts out to the left of it. */
  wallX: number;
  nozzles: Vec3[];
  installFrame: number;
  /** Shutter slides up to bare the nozzles. */
  openFrame: number;
  /** Enchanted with bat magic: runes glow violet, bores glow red. */
  enchantFrame: number;
  /** Frames on which the nozzles flash. */
  fireFrames: number[];
  /** Retracts into the wall (when the ballista takes over). */
  retractFrame?: number;
}

const BOX_W = 0.42;

/**
 * Bronze-trimmed iron dart battery: 4 rows x 2 brass nozzles facing -x, a
 * skull plate on the camera face, hazard bands. Slides out of the wall with an
 * overshoot when installed.
 */
export const DartBattery: React.FC<DartBatteryProps> = ({ wallX, nozzles, installFrame, openFrame, enchantFrame, fireFrames, retractFrame }) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const out = easeOutBack(clamp01((frame - installFrame) / 16));
  const back = retractFrame != null ? clamp01((frame - retractFrame) / 14) : 0;
  if (back >= 1) return null;
  const slide = (1 - out) * (BOX_W + 0.1) + back * (BOX_W + 0.1);

  const ys = nozzles.map((n) => n[1]);
  const zs = nozzles.map((n) => n[2]);
  const y0 = Math.min(...ys) - 0.17;
  const y1 = Math.max(...ys) + 0.17;
  const zMid = (Math.min(...zs) + Math.max(...zs)) / 2;
  const h = y1 - y0;
  const d = 0.62;
  const shutter = clamp01((frame - openFrame) / 8);
  const enchanted = frame >= enchantFrame;
  const charge = enchanted ? clamp01((frame - enchantFrame) / 20) : 0;
  const flashing = fireFrames.some((f) => frame >= f && frame < f + 4);

  return (
    <group position={[wallX - BOX_W / 2 + slide, (y0 + y1) / 2, zMid]}>
      {/* Iron casing and bronze rim */}
      <Part geo={G.box(BOX_W, h, d, 0.05)} mat={vinyl("#4b505e", "leather")} />
      <Part geo={G.box(BOX_W + 0.04, 0.07, d + 0.04, 0.02)} mat={vinyl("#ffcf5a", "gloss")} position={[0, h / 2, 0]} ink={INK_THIN} />
      <Part geo={G.box(BOX_W + 0.04, 0.07, d + 0.04, 0.02)} mat={vinyl("#ffcf5a", "gloss")} position={[0, -h / 2, 0]} ink={INK_THIN} />
      {/* Camera face: skull plate and hazard bands */}
      <HazardBand width={BOX_W - 0.04} height={0.07} position={[0, h / 2 - 0.1, d / 2 + 0.005]} count={6} />
      <HazardBand width={BOX_W - 0.04} height={0.07} position={[0, -h / 2 + 0.1, d / 2 + 0.005]} count={6} />
      <group position={[0, 0.02, d / 2 + 0.02]}>
        <Part geo={G.sphere(0.12)} mat={vinyl("#efe4c8", "bone")} scale={[1, 0.95, 0.45]} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={G.sphere(0.034)} material={enchanted ? glow("#ff2a3d", 1 + 2 * charge) : flat("#1a1216")} position={[s * 0.045, 0.015, 0.05]} />
        ))}
        <mesh geometry={G.box(0.08, 0.03, 0.02, 0.008)} material={flat("#1a1216")} position={[0, -0.06, 0.05]} />
      </group>
      {/* Violet runes light up once the darts are enchanted */}
      {enchanted
        ? [-1, 1].map((s) => (
            <mesh key={s} geometry={G.box(0.05, 0.16, 0.01, 0.005)} material={glow("#b45cff", 2.4 * charge)} position={[s * 0.15, 0.02, d / 2 + 0.012]} />
          ))
        : null}

      {/* Nozzles on the -x face */}
      {nozzles.map(([, ny, nz], i) => (
        <group key={i} position={[-BOX_W / 2, ny - (y0 + y1) / 2, nz - zMid]}>
          <Part geo={G.cyl(0.05, 0.058, 0.12, 14)} mat={vinyl("#ffcf5a", "gloss")} position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
          <mesh position={[-0.101, 0, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={G.disc(0.032)} material={enchanted ? glow("#ff3346", 1.5 + charge) : flat("#0b0a0d")} />
        </group>
      ))}
      {/* Shutter covers the nozzles until the plate is stepped on, then lifts like a portcullis */}
      <Part
        geo={G.box(0.05, h - 0.12, d - 0.06, 0.02)}
        mat={vinyl("#6b7080", "leather")}
        position={[-BOX_W / 2 - 0.13, easeOutBack(shutter) * (h - 0.16), 0]}
        ink={INK_THIN}
      />
      <HazardBand width={d - 0.1} height={0.06} position={[-BOX_W / 2 - 0.16, easeOutBack(shutter) * (h - 0.16) - h / 2 + 0.12, 0]} rotation={[0, Math.PI / 2, 0]} count={6} />

      {flashing ? <GlowSprite position={[-BOX_W / 2 - 0.2, 0, 0]} size={1.1} color={enchanted ? "#ff5a7a" : "#ffd27a"} opacity={0.85} /> : null}
      {enchanted ? <GlowSprite position={[-BOX_W / 2 - 0.05, 0, 0]} size={0.9 + 0.2 * Math.sin(frame * 0.4)} color="#c060ff" opacity={0.35 * charge} /> : null}
    </group>
  );
};
