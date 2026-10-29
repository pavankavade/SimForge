import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

/**
 * The floor-two lava pit, cut away like the rest of the diorama: rock walls
 * on three sides, a molten lake from `left` to `fallsX` that spills into a
 * chasm before the vault ledge at `right`. Pure function of the frame plus
 * the state the episode hands in:
 *
 *  - `surfaceY` / `glow`: the lake rising in on install;
 *  - `flow` (0..1): the current; crust drifts toward the falls, which open;
 *  - `frostX`: everything left of it is frozen to dark obsidian with frost;
 *  - `crack` (0..1): glowing cracks through the frozen crust.
 */
export interface LavaPitProps {
  left: number;
  fallsX: number;
  right: number;
  surfaceY: number;
  glow: number;
  flow: number;
  /** Distance the crust has drifted downstream (same as floating bodies). */
  drift: number;
  frostX: number;
  crack: number;
  z?: number;
  depth?: number;
}

const LAVA_HOT = new THREE.Color("#ff9a3a");
const LAVA_BODY = new THREE.Color("#e8501a");
const OBSIDIAN = new THREE.Color("#2a3446");
const FROST = new THREE.Color("#9fd8ff");

const TILE = 0.46;
/** Top of the front rock lip (just under the lava surface) and the chasm's open front. */
const LIP_Y = -0.95;
const CHASM_FRONT = -4.2;
const BEDROCK = -10;
const BOTTOM = -3.2;

export const LavaPit: React.FC<LavaPitProps> = ({ left, fallsX, right, surfaceY, glow, flow, drift, frostX, crack, z = -0.6, depth = 3.2 }) => {
  const frame = useCurrentFrame();
  const rock = useSurface(
    "lava-rock",
    () => makeMasonry({ rows: 6, cols: 5, base: "#3a2a26", baseAlt: "#4a332c", mortar: "#140b09", seed: 311 }),
    [3, 1]
  );
  const rockMat = (color: string, heat = 0) => (
    <meshStandardMaterial
      map={rock.map}
      normalMap={rock.normalMap}
      normalScale={new THREE.Vector2(0.9, 0.9)}
      color={color}
      roughness={0.95}
      emissive="#7a2a10"
      emissiveMap={rock.map}
      emissiveIntensity={heat}
    />
  );
  /** Front faces glow with reflected lava heat so the cut-away never reads as a black void. */
  const heat = 0.25 + 0.5 * glow * (1 - Math.min(1, Math.max(0, (frostX - left) / (fallsX - left))));

  const width = fallsX - left;
  const n = Math.ceil(width / TILE);
  const tiles = Array.from({ length: n }, (_, i) => {
    const x = left + (i + 0.5) * (width / n);
    const frozen = THREE.MathUtils.clamp((frostX - x) / 0.6 + 0.5, 0, 1);
    return { x, frozen, key: `lt-${i}` };
  });
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.09);

  // Crust plates on the surface drift with the current and wrap around.
  const crusts = Array.from({ length: 14 }, (_, i) => {
    const u = (random(`crust-x-${i}`) * width + drift * (0.8 + random(`crust-v-${i}`) * 0.4)) % width;
    const x = left + u;
    return {
      x,
      z: z - depth / 2 + 0.3 + random(`crust-z-${i}`) * (depth - 0.6),
      s: 0.25 + random(`crust-s-${i}`) * 0.35,
      rot: random(`crust-r-${i}`) * Math.PI,
      key: `crust-${i}`,
    };
  });
  // Bubbles pop on a loop at seeded spots (not on frozen tiles).
  const bubbles = Array.from({ length: 10 }, (_, i) => {
    const period = 34 + Math.floor(random(`bub-p-${i}`) * 30);
    const t = ((frame + Math.floor(random(`bub-o-${i}`) * period)) % period) / period;
    const x = left + 0.3 + random(`bub-x-${i}`) * (width - 0.6);
    return {
      x,
      z: z - depth / 2 + 0.4 + random(`bub-z-${i}`) * (depth - 0.8),
      s: t < 0.8 ? 0.06 + 0.14 * (t / 0.8) : 0,
      key: `bub-${i}`,
    };
  }).filter((b) => b.x > frostX + 0.2);

  // Streaks racing toward the falls once the current is on.
  const streaks = flow > 0.02
    ? Array.from({ length: 12 }, (_, i) => {
        const u = (random(`st-x-${i}`) * width + drift * 1.6) % width;
        return { x: left + u, z: z - depth / 2 + 0.25 + random(`st-z-${i}`) * (depth - 0.5), key: `st-${i}` };
      })
    : [];

  const fallOpen = flow;
  const lakeVisible = glow > 0.001;
  const frostAll = frostX > fallsX;

  return (
    <group>
      {/* Pit walls: back, left end below the entry ledge, the chasm back and the vault ledge face */}
      <mesh position={[(left + right) / 2, (BOTTOM - 0.1) / 2, z - depth / 2 - 0.1]}>
        <boxGeometry args={[right - left, -BOTTOM - 0.1, 0.3]} />
        {rockMat("#8a6a60")}
      </mesh>
      <mesh position={[left - 0.15, (BOTTOM - 0.06) / 2, z - 0.03]}>
        <boxGeometry args={[0.4, -BOTTOM - 0.06, depth - 0.06]} />
        {rockMat("#9a7a70")}
      </mesh>
      <mesh position={[right + 0.15, (BOTTOM - 3 - 0.06) / 2, z - 0.03]}>
        <boxGeometry args={[0.4, -BOTTOM + 3 - 0.06, depth - 0.06]} />
        {rockMat("#9a7a70")}
      </mesh>
      {/* Cut-away front: rock lip over the lake (just under the surface), the
          chasm left open down to its glow, bedrock under both ledges. */}
      <mesh position={[(left + fallsX) / 2, (LIP_Y + BEDROCK) / 2, z + depth / 2 + 0.25]}>
        <boxGeometry args={[fallsX - left + 0.02, LIP_Y - BEDROCK, 0.3]} />
        {rockMat("#8a6a60", heat)}
      </mesh>
      <mesh position={[(left + fallsX) / 2, LIP_Y + 0.02, z + depth / 2 + 0.25]}>
        <boxGeometry args={[fallsX - left + 0.02, 0.06, 0.34]} />
        <meshStandardMaterial color="#ff7a2a" emissive="#ff5a1f" emissiveIntensity={0.9 * glow * (1 - Math.min(1, Math.max(0, (frostX - left) / width)))} />
      </mesh>
      <mesh position={[(fallsX + right) / 2, (CHASM_FRONT + BEDROCK) / 2, z + depth / 2 + 0.25]}>
        <boxGeometry args={[right - fallsX + 0.02, CHASM_FRONT - BEDROCK, 0.3]} />
        {rockMat("#7a5a52", heat)}
      </mesh>
      {[
        [left - 7, left],
        [right, right + 7],
      ].map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, (-1.04 + BEDROCK) / 2, z + 0.1]}>
          <boxGeometry args={[b - a, -1.04 - BEDROCK, depth + 0.6]} />
          {rockMat("#6a5a58", 0.3)}
        </mesh>
      ))}
      {/* Deep chasm under the falls: dark, lit from below */}
      <mesh position={[(fallsX + right) / 2, BOTTOM - 1.6, z]}>
        <boxGeometry args={[right - fallsX, 0.2, depth]} />
        <meshStandardMaterial color="#1a0d0a" emissive="#ff4a14" emissiveIntensity={0.2 * glow} />
      </mesh>

      {/* Lake: body tiles (cut-away face glows) and the surface */}
      {lakeVisible
        ? tiles.map((t) => {
            const hot = LAVA_BODY.clone().lerp(OBSIDIAN, t.frozen);
            const top = LAVA_HOT.clone().lerp(OBSIDIAN, t.frozen);
            const h = surfaceY - BOTTOM;
            return (
              <group key={t.key}>
                <mesh position={[t.x, BOTTOM + h / 2, z]}>
                  <boxGeometry args={[width / n + 0.002, h, depth]} />
                  <meshStandardMaterial
                    color={hot}
                    emissive={hot}
                    emissiveIntensity={(1 - t.frozen) * 0.5 * glow * pulse + t.frozen * 0.05}
                    roughness={0.6}
                  />
                </mesh>
                <mesh position={[t.x, surfaceY + 0.001, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[width / n + 0.002, depth]} />
                  <meshStandardMaterial
                    color={top}
                    emissive={top}
                    emissiveIntensity={(1 - t.frozen) * 0.75 * glow * pulse}
                    roughness={t.frozen > 0.5 ? 0.25 : 0.5}
                    metalness={t.frozen * 0.2}
                  />
                </mesh>
                {t.frozen > 0.05 ? (
                  <mesh position={[t.x, surfaceY + 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[width / n, depth]} />
                    <meshBasicMaterial color={FROST} transparent opacity={0.28 * t.frozen * (1 - crack * 0.7)} depthWrite={false} />
                  </mesh>
                ) : null}
              </group>
            );
          })
        : null}

      {/* Dark crust plates riding the lava */}
      {lakeVisible
        ? crusts
            .filter((c) => c.x > frostX)
            .map((c) => (
              <mesh key={c.key} position={[c.x, surfaceY + 0.012, c.z]} rotation={[-Math.PI / 2, 0, c.rot]}>
                <circleGeometry args={[c.s, 6]} />
                <meshStandardMaterial color="#3a1a10" roughness={0.9} emissive="#ff3a0a" emissiveIntensity={0.15} />
              </mesh>
            ))
        : null}
      {lakeVisible
        ? bubbles.map((b) => (
            <mesh key={b.key} position={[b.x, surfaceY, b.z]} scale={b.s}>
              <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#ffd27a" emissive="#ff8a2a" emissiveIntensity={2 * glow} />
            </mesh>
          ))
        : null}
      {streaks.map((s) => (
        <mesh key={s.key} position={[s.x, surfaceY + 0.015, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7 * flow, 0.05]} />
          <meshBasicMaterial color="#fff0b0" transparent opacity={0.7 * flow} toneMapped={false} />
        </mesh>
      ))}

      {/* Cracks of light through the frozen crust */}
      {crack > 0.01
        ? Array.from({ length: 16 }, (_, i) => {
            const x = left + 0.3 + random(`ck-x-${i}`) * (width - 0.6);
            return (
              <mesh
                key={`ck-${i}`}
                position={[x, surfaceY + 0.008, z - depth / 2 + 0.3 + random(`ck-z-${i}`) * (depth - 0.6)]}
                rotation={[-Math.PI / 2, 0, random(`ck-a-${i}`) * Math.PI]}
              >
                <planeGeometry args={[(0.5 + random(`ck-l-${i}`) * 0.9) * Math.min(1, crack * 1.6), 0.05]} />
                <meshBasicMaterial color="#ffb347" toneMapped={false} />
              </mesh>
            );
          })
        : null}

      {/* Dam lip at the falls; it sinks when the current starts */}
      <mesh position={[fallsX - 0.12, surfaceY + 0.12 - fallOpen * 0.5, z]}>
        <boxGeometry args={[0.26, 0.5, depth]} />
        {rockMat("#a07868")}
      </mesh>
      {/* Lava waterfall down into the chasm */}
      {lakeVisible && fallOpen > 0.01 ? (
        <group>
          <mesh position={[fallsX + 0.3, surfaceY - 2.4 * fallOpen, z]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.45, 4.8 * fallOpen, depth - 0.2]} />
            <meshStandardMaterial
              color={frostAll ? OBSIDIAN : LAVA_HOT}
              emissive={frostAll ? OBSIDIAN : LAVA_BODY}
              emissiveIntensity={frostAll ? 0.05 : 1.5}
            />
          </mesh>
          {!frostAll
            ? Array.from({ length: 6 }, (_, i) => {
                const y = surfaceY - (((frame * 0.12 + i * 0.8) % 4.8) * fallOpen);
                return (
                  <mesh key={`fs-${i}`} position={[fallsX + 0.55, y, z + depth / 2 - 0.2 - i * 0.12]}>
                    <boxGeometry args={[0.02, 0.5, 0.08]} />
                    <meshBasicMaterial color="#fff0b0" toneMapped={false} />
                  </mesh>
                );
              })
            : null}
        </group>
      ) : null}

      {/* Heat glow */}
      {lakeVisible && !frostAll ? (
        <>
          {[0.2, 0.5, 0.8].map((u) => (
            <GlowSprite key={u} position={[left + u * width, surfaceY + 0.4, z + 0.6]} color="#ff7a2a" size={4.2 * glow} opacity={0.4 * Math.max(0, Math.min(1, (left + u * width - frostX) / 1.5 + 0.5))} />
          ))}
          <pointLight position={[(left + fallsX) / 2, surfaceY + 1.6, z + 1.4]} color="#ff7a2a" intensity={9 * glow * pulse * (1 - Math.min(1, Math.max(0, (frostX - left) / width)))} distance={13} decay={2} />
        </>
      ) : null}
      {frostX > left ? <pointLight position={[Math.min(frostX, fallsX) - 1.2, surfaceY + 1.4, z + 1.4]} color="#8fd0ff" intensity={4 * (1 - crack)} distance={8} decay={2} /> : null}
    </group>
  );
};
