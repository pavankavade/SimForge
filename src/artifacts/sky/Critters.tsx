import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, vinyl } from "../characters/hero";

/** Tumbleweed: a loose ball of dry twigs that rolls (rotation follows the distance travelled). */
export const Tumbleweed: React.FC<{ position: Vec3; radius?: number; rolled?: number }> = ({ position, radius = 0.45, rolled = 0 }) => {
  const twigs = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        rot: [random(`tw-a${i}`) * Math.PI * 2, random(`tw-b${i}`) * Math.PI * 2, random(`tw-c${i}`) * Math.PI] as Vec3,
        r: radius * (0.55 + random(`tw-r${i}`) * 0.45),
      })),
    [radius]
  );
  const mat = vinyl("#b48a52", "wood");
  const matDark = vinyl("#8a6638", "wood");
  // A tiny hop as it bounces along.
  const hop = Math.abs(Math.sin(rolled * 1.6)) * radius * 0.35;
  return (
    <group position={[position[0], position[1] + radius + hop, position[2]]} rotation={[0, 0, -rolled / radius]}>
      {twigs.map((t, i) => (
        <mesh key={i} geometry={G.torus(t.r, 0.012, Math.PI * 1.3)} material={i % 3 ? mat : matDark} rotation={t.rot} castShadow />
      ))}
    </group>
  );
};

/**
 * Red-tailed hawk gliding with flat, slightly raised wings (it soars, it does
 * not flap). Faces +z; bank tilts it into a turn.
 */
export const Hawk: React.FC<{ position: Vec3; heading: number; bank?: number; scale?: number }> = ({ position, heading, bank = 0.35, scale = 1 }) => {
  const body = vinyl("#8a5a36", "cloth");
  const belly = vinyl("#efe2c8", "cloth");
  const tail = vinyl("#c4572e", "cloth");
  const wingGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.12);
    s.quadraticCurveTo(0.6, 0.22, 1.25, 0.05);
    s.lineTo(1.15, -0.1);
    s.quadraticCurveTo(0.6, -0.12, 0, -0.18);
    s.lineTo(0, 0.12);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  return (
    <group position={position} rotation={[0, heading, 0]} scale={scale}>
      <group rotation={[0, 0, bank]}>
        <Part geo={G.capsule(0.13, 0.62)} mat={body} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
        <Part geo={G.sphere(0.12)} mat={belly} position={[0, -0.03, 0.08]} scale={[0.9, 0.8, 1.6]} ink={false} />
        <Part geo={G.sphere(0.1)} mat={body} position={[0, 0.04, 0.33]} ink={INK_THIN} />
        <Part geo={G.cone(0.035, 0.08, 8)} mat={vinyl("#f2c14e", "gloss")} position={[0, 0.02, 0.44]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
        <Part geo={G.box(0.24, 0.025, 0.26, 0.01)} mat={tail} position={[0, 0, -0.38]} ink={INK_THIN} />
        {([-1, 1] as const).map((s) => (
          <mesh key={s} geometry={wingGeo} material={s < 0 ? body : body} position={[s * 0.08, 0.02, 0.06]} rotation={[0, s < 0 ? Math.PI : 0, s * 0.12]} castShadow />
        ))}
      </group>
    </group>
  );
};

/** A thermal made visible: a faint, shimmering column of rising warm air. */
export const ThermalColumn: React.FC<{ position: Vec3; height?: number; radius?: number; frame: number; opacity?: number }> = ({
  position,
  height = 120,
  radius = 6,
  frame,
  opacity = 0.16,
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { t: { value: 0 }, op: { value: opacity } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float t; uniform float op; varying vec2 vUv;
          void main(){
            float band = 0.5 + 0.5 * sin(vUv.y * 60.0 - t * 0.25 + sin(vUv.x * 18.0) * 1.5);
            float edge = sin(vUv.x * 3.14159 * 2.0) * 0.5 + 0.5;
            float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
            gl_FragColor = vec4(1.0, 0.95, 0.85, op * band * fade * (0.6 + 0.4 * edge));
          }`,
      }),
    [opacity]
  );
  mat.uniforms.t.value = frame;
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} material={mat}>
      <cylinderGeometry args={[radius * 0.8, radius, height, 32, 1, true]} />
    </mesh>
  );
};
