import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Thanksgiving on the steepest street in town: Grandpa's flat front yard at
 * the top (x < 0), the sidewalk sloping down toward +x, a curb at the bottom
 * and the cross street with parked cars beyond it. Also the old red wagon,
 * Tess's stuffed rabbit, and Grandpa's open-top car (used again for the
 * drive to the hospital).
 */

const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Street slope (radians, about 13 degrees: the steepest street in town) and where the slope ends at the curb. */
export const SLOPE = 0.22;
export const CURB_X = 10;
export const CURB_H = 0.14;
/** Ground height at x: flat yard above x = 0, the slope down to the curb, flat road below. */
export const hillY = (x: number) => -Math.tan(SLOPE) * Math.min(CURB_X, Math.max(0, x));
/** Wagon: tub top height and length. */
export const WAGON_L = 0.9;
export const WAGON_TOP = 0.42;

/** A plane from x0 to x1 along the slope (or flat), width along z. */
const Strip: React.FC<{ x0: number; x1: number; z: number; w: number; color: string; lift?: number }> = ({ x0, x1, z, w, color, lift = 0 }) => {
  const y0 = hillY(x0);
  const y1 = hillY(x1);
  const len = Math.hypot(x1 - x0, y1 - y0);
  return (
    <group position={[(x0 + x1) / 2, (y0 + y1) / 2 + lift, z]} rotation={[0, 0, Math.atan2(y1 - y0, x1 - x0)]}>
      <mesh material={std(color, 0.95)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[len, w]} />
      </mesh>
    </group>
  );
};

export const HillStreet: React.FC = () => (
  <group>
    {/* Yard, slope and road, in bands along z: back lawn, sidewalk, street, front lawn */}
    <Strip x0={-14} x1={0} z={-1} w={14} color="#7fb85c" />
    <Strip x0={0} x1={CURB_X} z={-4.5} w={7} color="#7fb85c" lift={0.003} />
    <Strip x0={0} x1={CURB_X} z={0} w={2.0} color="#cfc8bc" lift={0.006} />
    <Strip x0={0} x1={CURB_X} z={2.6} w={3.2} color="#5c5f66" lift={0.004} />
    <Strip x0={0} x1={CURB_X} z={5.5} w={2.6} color="#7fb85c" lift={0.003} />
    {/* Sidewalk joints */}
    {Array.from({ length: 10 }, (_, i) => {
      const x = (i + 1) * (CURB_X / 11);
      return <mesh key={i} geometry={G.box(0.02, 0.004, 2.0, 0.001)} material={std("#b3ab9e")} position={[x, hillY(x) + 0.009, 0]} rotation={[0, 0, -SLOPE]} />;
    })}
    {/* Curb and the cross street at the bottom */}
    <Part geo={G.box(0.25, CURB_H * 2, 12, 0.03)} mat={vinyl("#e9e4da", "cloth")} position={[CURB_X + 0.12, hillY(CURB_X), 0]} ink={INK_THIN} />
    <mesh material={std("#4e5158", 0.95)} rotation={[-Math.PI / 2, 0, 0]} position={[CURB_X + 5, hillY(CURB_X) - 0.02, 0]} receiveShadow>
      <planeGeometry args={[10, 30]} />
    </mesh>
    {Array.from({ length: 6 }, (_, i) => (
      <mesh key={i} geometry={G.box(0.16, 0.004, 1.0, 0.001)} material={flat("#f2e7c4")} position={[CURB_X + 3.2, hillY(CURB_X) - 0.015, -9 + i * 3.2]} />
    ))}
    <Car position={[CURB_X + 1.7, hillY(CURB_X) - 0.02, -2.4]} yaw={Math.PI / 2} color="#4f7dc4" />
    <Car position={[CURB_X + 1.7, hillY(CURB_X) - 0.02, -6.6]} yaw={Math.PI / 2} color="#e2a04f" />
    {/* Lamp posts along the sidewalk */}
    {[2.5, 6.5].map((x) => (
      <group key={x} position={[x, hillY(x), -1.25]}>
        <Part geo={G.cyl(0.05, 0.06, 3.0, 10)} mat={vinyl("#3a4150", "metal")} position={[0, 1.5, 0]} ink={INK_THIN} />
        <Part geo={G.sphere(0.16)} mat={vinyl("#fff4d6", "gloss")} position={[0, 3.05, 0]} ink={INK_THIN} />
      </group>
    ))}
  </group>
);

/** The old red wagon; `position` is the ground under its centre, `tilt` the slope it sits on, `handle` swings the pull bar (0 down, 1 up). */
export const Wagon: React.FC<{ position: Vec3; tilt?: number; handle?: number; spin?: number; children?: React.ReactNode }> = ({ position, tilt = 0, handle = 0.3, spin = 0, children }) => {
  const red = vinyl("#d8392f", "gloss");
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <Part geo={G.box(WAGON_L, 0.2, 0.5, 0.04)} mat={red} position={[0, WAGON_TOP - 0.1, 0]} ink={INK_THIN} />
      <mesh geometry={G.box(WAGON_L - 0.08, 0.02, 0.42, 0.01)} material={flat("#8a1f1a")} position={[0, WAGON_TOP - 0.005, 0]} />
      {[-0.3, 0.3].map((x) =>
        [-0.26, 0.26].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.11, z]} rotation={[0, 0, -spin]}>
            <Part geo={G.cyl(0.11, 0.11, 0.05, 16)} mat={vinyl("#2b2b2b", "leather")} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
            <mesh geometry={G.box(0.12, 0.02, 0.055, 0.005)} material={flat("#d7dde3")} />
          </group>
        )),
      )}
      {/* Pull bar from the front (-x) axle */}
      <group position={[-WAGON_L / 2, 0.14, 0]} rotation={[0, 0, -0.3 - handle * 1.0]}>
        <Part geo={G.cyl(0.02, 0.02, 0.7, 8)} mat={vinyl("#2b2b2b", "metal")} position={[0, 0.35, 0]} ink={INK_THIN} />
        <Part geo={G.cyl(0.03, 0.03, 0.18, 8)} mat={vinyl("#2b2b2b", "leather")} position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
      </group>
      <group position={[0, WAGON_TOP, 0]}>{children}</group>
    </group>
  );
};

/** Tess's stuffed rabbit, sitting (base at local y = 0). */
export const Rabbit: React.FC<{ position?: Vec3; yaw?: number; scale?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1 }) => {
  const fur = vinyl("#f3eee6", "cloth");
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <Part geo={G.sphere(0.11)} mat={fur} position={[0, 0.1, 0]} scale={[1, 1.05, 0.9]} ink={INK_THIN} />
      <Part geo={G.sphere(0.085)} mat={fur} position={[0, 0.27, 0.02]} ink={INK_THIN} />
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.capsule(0.025, 0.12)} mat={fur} position={[s * 0.04, 0.42, 0]} rotation={[0, 0, s * -0.2]} ink={INK_THIN} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={G.disc(0.012)} material={flat("#2b2230")} position={[s * 0.03, 0.29, 0.1]} />
      ))}
      <mesh geometry={G.disc(0.014)} material={flat("#f29bb0")} position={[0, 0.265, 0.104]} />
    </group>
  );
};

/** Grandpa's open-top old car, facing +x. Children sit in it (local seat height SEAT_Y). */
export const CAR_SEAT_Y = 0.55;
export const Car: React.FC<{ position: Vec3; yaw?: number; color?: string; wheelSpin?: number; children?: React.ReactNode }> = ({ position, yaw = 0, color = "#3e8f7a", wheelSpin = 0, children }) => {
  const body = vinyl(color, "gloss");
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Part geo={G.box(3.2, 0.55, 1.5, 0.12)} mat={body} position={[0, 0.55, 0]} ink={INK_THIN} />
      <Part geo={G.box(1.0, 0.25, 1.4, 0.08)} mat={body} position={[1.05, 0.9, 0]} ink={INK_THIN} />
      <Part geo={G.box(0.06, 0.32, 1.3, 0.02)} mat={vinyl("#bfe3f2", "gloss")} position={[0.45, 1.1, 0]} rotation={[0, 0, 0.35]} ink={INK_THIN} />
      <mesh geometry={G.box(1.5, 0.05, 1.3, 0.02)} material={flat("#5a3a2a")} position={[-0.45, 0.83, 0]} />
      {[1.65, -1.65].map((x) => (
        <Part key={x} geo={G.box(0.08, 0.16, 1.4, 0.03)} mat={vinyl("#d7dde3", "gloss")} position={[x, 0.42, 0]} ink={INK_THIN} />
      ))}
      <Part geo={G.sphere(0.09)} mat={vinyl("#fff4d6", "gloss")} position={[1.62, 0.66, 0.5]} ink={INK_THIN} />
      <Part geo={G.sphere(0.09)} mat={vinyl("#fff4d6", "gloss")} position={[1.62, 0.66, -0.5]} ink={INK_THIN} />
      {[-1.05, 1.05].map((x) =>
        [-0.72, 0.72].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.3, z]} rotation={[0, 0, -wheelSpin]}>
            <Part geo={G.cyl(0.3, 0.3, 0.2, 18)} mat={vinyl("#2b2b2b", "leather")} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
            <mesh geometry={G.box(0.32, 0.05, 0.21, 0.01)} material={flat("#9aa1a8")} />
          </group>
        )),
      )}
      {children}
    </group>
  );
};
