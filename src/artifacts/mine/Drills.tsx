import type React from "react";
import * as THREE from "three";
import { Block, Rod } from "./common";
import { useNoteTexture } from "./ShelterFit";

/**
 * Drilling gear: the slim probe string with its tricone bit (painted red and carrying the note on
 * its way back up), the big hammer bit of the rescue drills, and the rigs that stand over the
 * holes at the camp. Everything is placed in world space by its parent.
 */

/** A probe string: the rod from `topY` down to the bit's tip at `tipY`. Local origin = (x, 0, z). */
export const ProbeString: React.FC<{ tipY: number; topY: number; paint?: number; note?: boolean; spin?: number }> = ({ tipY, topY, paint = 0, note = false, spin = 0 }) => {
  const noteTex = useNoteTexture();
  const steel = new THREE.Color("#9da2a8");
  const red = steel.clone().lerp(new THREE.Color("#c3161a"), paint);
  const paintLen = 0.95;
  return (
    <group>
      <Rod a={[0, tipY + paintLen, 0]} b={[0, topY, 0]} r={0.045} color="#8d9196" metalness={0.7} roughness={0.4} />
      <mesh position={[0, tipY + 0.1 + paintLen / 2, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.052, paintLen - 0.1, 14]} />
        <meshStandardMaterial color={red} roughness={0.45} metalness={0.7 * (1 - paint)} />
      </mesh>
      {/* Tricone bit. */}
      <group position={[0, tipY, 0]} rotation={[0, spin, 0]}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.06, 0.12, 14]} />
          <meshStandardMaterial color={red} roughness={0.45} metalness={0.7 * (1 - paint)} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[Math.cos((k * Math.PI * 2) / 3) * 0.035, 0.045, Math.sin((k * Math.PI * 2) / 3) * 0.035]} rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.04, 0.09, 10]} />
            <meshStandardMaterial color={red} roughness={0.5} metalness={0.6 * (1 - paint)} />
          </mesh>
        ))}
      </group>
      {note && (
        <group position={[0, tipY + 0.52, 0.056]}>
          <mesh>
            <planeGeometry args={[0.3, 0.19]} />
            <meshStandardMaterial map={noteTex} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* Tape. */}
          {[-0.07, 0.07].map((y) => (
            <mesh key={y} position={[0, y, 0.002]}>
              <planeGeometry args={[0.34, 0.035]} />
              <meshStandardMaterial color="#d9d2b8" roughness={0.6} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

/**
 * A big hammer bit with its drill pipe up to `topY`. Local origin = (x, 0, z); `y` is the bit's
 * cutting face. `worn` 0..1 knocks the carbide buttons off.
 */
export const HammerBit: React.FC<{ y: number; topY: number; r?: number; spin?: number; worn?: number }> = ({ y, topY, r = 0.33, spin = 0, worn = 0 }) => (
  <group>
    <Rod a={[0, y + 0.7, 0]} b={[0, topY, 0]} r={r * 0.42} color="#aab0b6" metalness={0.35} roughness={0.45} seg={16} />
    <group position={[0, y, 0]} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[r * 0.6, r * 0.8, 0.45, 20]} />
        <meshStandardMaterial color="#8a9096" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[r, r * 0.92, 0.4, 24]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Flutes down the side. */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[Math.cos(k * 1.047) * r * 0.97, 0.2, Math.sin(k * 1.047) * r * 0.97]} rotation={[0, -k * 1.047, 0]}>
          <boxGeometry args={[0.03, 0.4, 0.09]} />
          <meshStandardMaterial color="#3a3d41" roughness={0.6} metalness={0.6} />
        </mesh>
      ))}
      {/* Carbide buttons on the face; the worn ones are flat dark stumps. */}
      {Array.from({ length: 12 }, (_, k) => {
        const ring = k % 3 ? 0.82 : 0.4;
        const a = k * 0.9;
        const gone = ((k * 7) % 12) / 12 < worn;
        return (
          <mesh key={k} position={[Math.cos(a) * r * ring, gone ? 0.004 : -0.012, Math.sin(a) * r * ring]}>
            <sphereGeometry args={[gone ? 0.03 : 0.04, 8, 6]} />
            <meshStandardMaterial color={gone ? "#221d1a" : "#dcdcd2"} roughness={gone ? 1 : 0.3} metalness={gone ? 0 : 0.6} />
          </mesh>
        );
      })}
    </group>
  </group>
);

/**
 * A drill rig standing over a hole: skid base, power pack, a lattice mast with a crown sheave,
 * and the travelling head on the string. Local origin = the hole's collar on the ground, with
 * the mast behind it (-z). `up` 0..1 raises it into place.
 */
export const DrillRig: React.FC<{ height?: number; color?: string; big?: boolean; up?: number; frame?: number; turning?: boolean }> = ({
  height = 7,
  color = "#e0b23a",
  big = false,
  up = 1,
  frame = 0,
  turning = false,
}) => {
  if (up <= 0.001) return null;
  const w = big ? 0.85 : 0.5;
  const leg = big ? 0.07 : 0.05;
  const z = -(big ? 0.75 : 0.5);
  const lift = (1 - up) * -0.6;
  const rungs = Math.floor(height / 1.1);
  return (
    <group position={[0, lift, 0]} scale={[1, 0.25 + 0.75 * up, 1]}>
      {/* Skid and deck. */}
      <Block min={[-w - 0.9, 0, z - 1.3]} max={[w + 0.9, 0.3, z + 0.35]} color="#4c5157" metalness={0.4} roughness={0.55} />
      <Block min={[-w - 0.9, 0.3, z - 1.3]} max={[w + 0.9, 0.36, z + 0.35]} color="#33373c" metalness={0.5} roughness={0.5} />
      {/* Power pack and its exhaust. */}
      <Block min={[w + 0.05, 0.36, z - 1.2]} max={[w + 0.85, 1.25, z - 0.2]} color="#e2702a" roughness={0.5} metalness={0.2} />
      <Block min={[w + 0.12, 0.6, z - 0.2]} max={[w + 0.78, 1.1, z - 0.18]} color="#2a2d31" roughness={0.6} />
      <Rod a={[w + 0.65, 1.25, z - 1.0]} b={[w + 0.65, 1.75, z - 1.0]} r={0.05} color="#2f3236" />
      {/* Mast: four legs leaning in, rungs and cross braces on the front. */}
      {[
        [-1, 0],
        [1, 0],
        [-1, -1],
        [1, -1],
      ].map(([sx, sz], i) => (
        <Rod key={i} a={[sx * w, 0.36, z + sz * 0.7]} b={[sx * w * 0.45, height, z + sz * 0.35]} r={leg} color={color} metalness={0.3} roughness={0.5} />
      ))}
      {Array.from({ length: rungs }, (_, k) => {
        const t0 = (k + 0.5) / (rungs + 0.5);
        const t1 = (k + 1.5) / (rungs + 0.5);
        const x0 = w * (1 - 0.55 * t0);
        const x1 = w * (1 - 0.55 * t1);
        const y0 = 0.36 + (height - 0.36) * t0;
        const y1 = 0.36 + (height - 0.36) * t1;
        return (
          <group key={k}>
            <Rod a={[-x0, y0, z]} b={[x0, y0, z]} r={leg * 0.6} color={color} metalness={0.3} />
            {k + 1 < rungs && <Rod a={[k % 2 ? -x0 : x0, y0, z]} b={[k % 2 ? x1 : -x1, y1, z]} r={leg * 0.5} color={color} metalness={0.3} />}
          </group>
        );
      })}
      {/* Crown and sheave. */}
      <Block min={[-w * 0.55, height, z - 0.45]} max={[w * 0.55, height + 0.14, z + 0.12]} color={color} metalness={0.3} />
      <group position={[0, height + 0.5, z + 0.1]} rotation={[0, 0, turning ? frame * 0.12 : 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.09, 24]} />
          <meshStandardMaterial color="#8b9096" roughness={0.4} metalness={0.7} />
        </mesh>
        {[0, 1].map((k) => (
          <mesh key={k} position={[0, 0, 0.05]} rotation={[0, 0, (k * Math.PI) / 2]}>
            <boxGeometry args={[0.7, 0.07, 0.02]} />
            <meshStandardMaterial color="#3e4247" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 12]} />
          <meshStandardMaterial color="#3e4247" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
};
