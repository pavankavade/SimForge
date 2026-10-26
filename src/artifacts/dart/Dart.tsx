import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";

/**
 * Projectiles for the dart trap, in the cast's ink & vinyl style. Every mesh
 * is built with its NOSE AT THE ORIGIN pointing +x and its body trailing along
 * -x, so a projectile placed at its tip position with rotation z = heading
 * touches exactly the point it was aimed at (and stays stuck there).
 */

const HALF_PI = Math.PI / 2;
const FIN_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

/** Steel bodkin dart with a turned wood shaft and red fletching (~0.5 long). */
export const DartMesh: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <group scale={scale}>
    <Part geo={G.cone(0.05, 0.15, 10)} mat={vinyl("#d9dee8", "metal")} position={[-0.075, 0, 0]} rotation={[0, 0, -HALF_PI]} ink={INK_THIN} />
    <Part geo={G.cyl(0.034, 0.034, 0.05, 12)} mat={vinyl("#ffcf5a", "gloss")} position={[-0.17, 0, 0]} rotation={[0, 0, HALF_PI]} ink={INK_THIN} />
    <Part geo={G.cyl(0.024, 0.024, 0.3, 10)} mat={vinyl("#c98a4b", "wood")} position={[-0.34, 0, 0]} rotation={[0, 0, HALF_PI]} ink={INK_THIN} />
    {FIN_ANGLES.map((a) => (
      <group key={a} position={[-0.43, 0, 0]} rotation={[a, 0, 0]}>
        <Part geo={G.box(0.15, 0.085, 0.014, 0.006)} mat={vinyl("#e2343a", "cloth")} position={[0, 0.055, 0]} ink={INK_THIN} />
      </group>
    ))}
  </group>
);

/**
 * Dart with leathery bat wings and a little bat face behind the tip. `flap`
 * is the wing angle (radians), drive it with sin(frame).
 */
export const BatDartMesh: React.FC<{ flap: number; scale?: number }> = ({ flap, scale = 1.25 }) => (
  <group scale={scale}>
    <Part geo={G.cone(0.045, 0.13, 10)} mat={vinyl("#d9dee8", "metal")} position={[-0.065, 0, 0]} rotation={[0, 0, -HALF_PI]} ink={INK_THIN} />
    <Part geo={G.cyl(0.022, 0.022, 0.32, 10)} mat={vinyl("#3a3346", "leather")} position={[-0.3, 0, 0]} rotation={[0, 0, HALF_PI]} ink={INK_THIN} />
    {/* Bat head with ears and glowing eyes, just behind the tip */}
    <Part geo={G.sphere(0.075)} mat={vinyl("#4a2c5c", "cloth")} position={[-0.18, 0.02, 0]} scale={[1.15, 0.95, 1]} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <Part geo={G.cone(0.03, 0.08, 8)} mat={vinyl("#4a2c5c", "cloth")} position={[-0.2, 0.1, s * 0.04]} rotation={[s * -0.35, 0, 0.3]} ink={INK_THIN} />
        <mesh geometry={G.sphere(0.017)} material={glow("#ff2a3d", 3)} position={[-0.135, 0.04, s * 0.035]} />
      </group>
    ))}
    {/* Wings flap about the shaft */}
    {[-1, 1].map((s) => (
      <group key={`w${s}`} position={[-0.3, 0.02, s * 0.02]} rotation={[s * flap, 0, 0]}>
        <Part geo={G.box(0.2, 0.014, 0.17, 0.006)} mat={vinyl("#2e1e3a", "leather")} position={[0, 0, s * 0.1]} ink={INK_THIN} />
        <Part geo={G.box(0.14, 0.012, 0.15, 0.005)} mat={vinyl("#3d2850", "leather")} position={[-0.03, 0, s * 0.24]} rotation={[0, s * 0.35, 0]} ink={INK_THIN} />
        <Part geo={G.cone(0.016, 0.07, 6)} mat={vinyl("#e8d9b0", "bone")} position={[0.07, 0, s * 0.3]} rotation={[s * HALF_PI, 0, 0]} ink={false} />
      </group>
    ))}
    {FIN_ANGLES.map((a) => (
      <group key={a} position={[-0.44, 0, 0]} rotation={[a, 0, 0]}>
        <Part geo={G.box(0.12, 0.07, 0.012, 0.005)} mat={vinyl("#7b2fa8", "cloth")} position={[0, 0.045, 0]} ink={INK_THIN} />
      </group>
    ))}
    <GlowSprite position={[-0.14, 0.04, 0]} size={0.32} color="#ff3346" opacity={0.7} />
  </group>
);

/** Massive armour-piercing harpoon: barbed steel head, hazard-banded shaft. */
export const HarpoonMesh: React.FC<{ length?: number }> = ({ length = 1.5 }) => {
  const shaft = length - 0.36;
  return (
    <group>
      <Part geo={G.cone(0.12, 0.36, 14)} mat={vinyl("#dfe4ee", "metal")} position={[-0.18, 0, 0]} rotation={[0, 0, -HALF_PI]} />
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.cone(0.05, 0.22, 8)} mat={vinyl("#c3c9d6", "metal")} position={[-0.36, s * 0.11, 0]} rotation={[0, 0, HALF_PI + s * 0.55]} ink={INK_THIN} />
      ))}
      <Part geo={G.cyl(0.052, 0.052, shaft, 14)} mat={vinyl("#596171", "leather")} position={[-0.36 - shaft / 2, 0, 0]} rotation={[0, 0, HALF_PI]} />
      {[0.25, 0.45, 0.65].map((k) => (
        <Part key={k} geo={G.cyl(0.058, 0.058, 0.07, 14)} mat={vinyl(k === 0.45 ? "#1d1a20" : "#ffcc33", "gloss")} position={[-0.36 - shaft * k, 0, 0]} rotation={[0, 0, HALF_PI]} ink={false} />
      ))}
      <Part geo={G.torus(0.075, 0.025)} mat={vinyl("#ffcf5a", "gloss")} position={[-length + 0.02, 0, 0]} rotation={[0, HALF_PI, 0]} ink={INK_THIN} />
    </group>
  );
};

/** Places a projectile: tip at `pos`, nose along `angle` in the x-y plane. */
export const ShotAt: React.FC<{ pos: Vec3; angle: number; children: React.ReactNode }> = ({ pos, angle, children }) => (
  <group position={pos} rotation={[0, 0, angle]}>
    {children}
  </group>
);

/** Speed streak trailing a projectile (draw it inside a ShotAt). */
export const Streak: React.FC<{ length: number; from?: number; color?: string; width?: number; opacity?: number }> = ({
  length,
  from = 0.45,
  color = "#fff3d6",
  width = 0.018,
  opacity = 0.55,
}) => (
  <mesh position={[-from - length / 2, 0, 0]} rotation={[0, 0, HALF_PI]}>
    <cylinderGeometry args={[width * 0.3, width, length, 6]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
  </mesh>
);

/**
 * Bullet-time wake: rings of displaced air trailing a projectile in slow
 * motion (draw it inside a ShotAt). `frame` drives the ring pulse.
 */
export const SlowMoWake: React.FC<{ frame: number; from?: number }> = ({ frame, from = 0.5 }) => (
  <group>
    {[0, 1].map((k) => {
      const pulse = (frame * 0.05 + k * 0.5) % 1;
      return (
        <mesh key={k} position={[-from - pulse * 0.5, 0, 0]} rotation={[0, HALF_PI, 0]} scale={0.6 + pulse * 0.6}>
          <torusGeometry args={[0.09, 0.006, 6, 24]} />
          <meshBasicMaterial color="#d8f0ff" transparent opacity={0.4 * (1 - pulse)} depthWrite={false} toneMapped={false} />
        </mesh>
      );
    })}
    <Streak length={0.7} from={from} width={0.01} opacity={0.22} color="#d8f0ff" />
  </group>
);

const UP = new THREE.Vector3(0, 1, 0);

/** Taut steel cable between two points. */
export const Cable: React.FC<{ a: Vec3; b: Vec3; radius?: number; color?: string }> = ({ a, b, radius = 0.02, color = "#2b2d33" }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  return (
    <mesh position={va.add(vb).multiplyScalar(0.5)} quaternion={quat} material={flat(color)}>
      <cylinderGeometry args={[radius, radius, len, 6]} />
    </mesh>
  );
};

/** Black-and-yellow hazard band made of alternating blocks. */
export const HazardBand: React.FC<{ width: number; height?: number; depth?: number; count?: number; position?: Vec3; rotation?: Vec3 }> = ({
  width,
  height = 0.1,
  depth = 0.02,
  count = 8,
  position,
  rotation,
}) => {
  const seg = width / count;
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          geometry={G.box(seg * 0.98, height, depth, 0.004)}
          material={vinyl(i % 2 === 0 ? "#ffcc33" : "#1d1a20", "gloss")}
          position={[-width / 2 + seg * (i + 0.5), 0, 0]}
        />
      ))}
    </group>
  );
};
