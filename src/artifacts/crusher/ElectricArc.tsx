import type React from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { GlowSprite } from "../dungeon/Fx";

export interface ElectricArcProps {
  a: Vec3;
  b: Vec3;
  seed: string;
  opacity?: number;
  frame: number;
  jitter?: number;
}

const ARC_POINTS = 7;

export const ElectricArc: React.FC<ElectricArcProps> = ({
  a,
  b,
  seed,
  opacity = 1,
  frame,
  jitter = 0.12,
}) => {
  const vA = new THREE.Vector3(...a);
  const vB = new THREE.Vector3(...b);
  const dir = vB.clone().sub(vA);
  const len = dir.length();
  if (len < 0.001) return null;

  const u = dir.clone().normalize();
  const up = Math.abs(u.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const perp1 = new THREE.Vector3().crossVectors(u, up).normalize();
  const perp2 = new THREE.Vector3().crossVectors(u, perp1).normalize();

  const fKey = Math.floor(frame / 2);
  const pts: THREE.Vector3[] = [vA];

  for (let i = 1; i < ARC_POINTS; i++) {
    const t = i / ARC_POINTS;
    const base = vA.clone().lerp(vB, t);
    const r1 = (random(`${seed}-${fKey}-1-${i}`) - 0.5) * 2 * jitter;
    const r2 = (random(`${seed}-${fKey}-2-${i}`) - 0.5) * 2 * jitter;
    base.addScaledVector(perp1, r1);
    base.addScaledVector(perp2, r2);
    pts.push(base);
  }
  pts.push(vB);

  return (
    <group>
      {pts.slice(1).map((p, i) => {
        const q = pts[i];
        const seg = p.clone().sub(q);
        const segLen = seg.length();
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          seg.normalize()
        );
        return (
          <group key={i} position={mid} quaternion={quat}>
            {/* Bright inner core */}
            <mesh>
              <cylinderGeometry args={[0.016, 0.016, segLen, 4]} />
              <meshBasicMaterial
                color="#eaf8ff"
                transparent
                opacity={opacity}
                toneMapped={false}
              />
            </mesh>
            {/* Wider faint glow line */}
            <mesh>
              <cylinderGeometry args={[0.045, 0.045, segLen, 4]} />
              <meshBasicMaterial
                color="#5fd0ff"
                transparent
                opacity={opacity * 0.35}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      <GlowSprite position={a} color="#5fd0ff" size={0.4} opacity={opacity * 0.6} />
      <GlowSprite position={b} color="#5fd0ff" size={0.4} opacity={opacity * 0.6} />
    </group>
  );
};
