import type React from "react";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../engine/types";

export interface LowPolyLightProps {
  /** Point the sun shines at (the centre of the set). */
  target?: Vec3;
  /** Sun direction as an offset from the target (front-left and high by default). */
  sun?: Vec3;
  sunColor?: string;
  sunIntensity?: number;
  /** Half-size of the shadow camera; fit it to the set, smaller = sharper map. */
  bounds?: number;
  /** Penumbra softness (VSM blur radius in texels). Needs `shadows: "variance"` in the config. */
  softness?: number;
  sky?: string;
  ground?: string;
  hemiIntensity?: number;
  /** Warm bounce from the floor side, standing in for GI colour bleed. */
  bounce?: string;
  bounceIntensity?: number;
}

/**
 * The clean low-poly light: one big soft sun, a cool sky / warm floor
 * hemisphere, and a low bounce fill so shadowed faces stay readable (the
 * reference gets this from GI; we fake it). Pair with `LOWPOLY_POSTFX`.
 */
export const LowPolyLight: React.FC<LowPolyLightProps> = ({
  target = [0, 0, 0],
  sun = [-7, 18, 12],
  sunColor = "#fff2de",
  sunIntensity = 3.1,
  bounds = 14,
  softness = 9,
  sky = "#bcd0f2",
  ground = "#a3825f",
  hemiIntensity = 1.0,
  bounce = "#ffe2c4",
  bounceIntensity = 0.75,
}) => {
  const light = useRef<THREE.DirectionalLight>(null);
  const aim = useRef<THREE.Object3D>(null);

  useLayoutEffect(() => {
    const l = light.current;
    if (!l || !aim.current) return;
    l.target = aim.current;
    l.shadow.radius = softness;
    l.shadow.blurSamples = 16;
    l.shadow.needsUpdate = true;
  }, [softness]);

  return (
    <group>
      <object3D ref={aim} position={target} />
      <directionalLight
        ref={light}
        position={[target[0] + sun[0], target[1] + sun[1], target[2] + sun[2]]}
        color={sunColor}
        intensity={sunIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-bounds}
        shadow-camera-right={bounds}
        shadow-camera-top={bounds}
        shadow-camera-bottom={-bounds}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <hemisphereLight args={[sky, ground, hemiIntensity]} />
      <directionalLight
        position={[target[0] - sun[0] * 0.6, target[1] + 3, target[2] + 14]}
        color={bounce}
        intensity={bounceIntensity}
      />
    </group>
  );
};

/**
 * Colour bleed: a soft, shadowless point light that tints the walls around a
 * coloured floor or rug the way GI would (warm off wood, red off a carpet).
 * Put it just *under* the surface it bounces off: the floor top faces away and
 * stays clean, while walls and props pick up the tint from below.
 */
export const Bounce: React.FC<{ position: Vec3; color: string; intensity?: number; distance?: number }> = ({
  position,
  color,
  intensity = 2.5,
  distance = 6,
}) => <pointLight position={position} color={color} intensity={intensity} distance={distance} decay={1.6} />;

/** Post stack for the low-poly look: neutral tones, deep soft AO, barely any bloom, no grain. */
export const LOWPOLY_POSTFX = {
  toneMapping: "neutral" as const,
  aoIntensity: 3.4,
  aoRadius: 0.16,
  bloomIntensity: 0.12,
  bloomThreshold: 0.95,
  grain: 0,
  exposure: 1.05,
};

/** CSS grade for the low-poly look: a touch softer and cooler than the toy series. */
export const LOWPOLY_GRADE = "saturate(0.96) contrast(1.02)";
