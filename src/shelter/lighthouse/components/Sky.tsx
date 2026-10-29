import type React from "react";
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as THREE from "three";
import { GlowSprite } from "../../../artifacts/dungeon/Fx";
import { fogAmount } from "../timeline";

const DUSK = { top: "#14204a", mid: "#3b4f8e", horizon: "#f2a36e" };
const FOG = { top: "#5d6878", mid: "#8592a3", horizon: "#a9b3bf" };
export const FOG_COLOR = "#8e99a8";

const mix = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);

/**
 * Blue-hour sky over the sea: deep blue overhead, a warm band on the horizon,
 * a moon and stars. Moonlight from the front-left keeps the cast readable; the
 * scene fog thickens for the fog beat.
 */
export const Sky: React.FC<{ frame: number }> = ({ frame }) => {
  const fog = fogAmount(frame);
  const { scene } = useThree();

  useLayoutEffect(() => {
    scene.environmentIntensity = 0.32;
    scene.fog = fog > 0.01 ? new THREE.Fog(FOG_COLOR, lerpN(120, 6, fog), lerpN(400, 48, fog)) : null;
  }, [scene, fog]);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vPos;
          void main(){ float h = vPos.y;
            vec3 c = h > 0.0 ? mix(mix(horizon, mid, smoothstep(0.0, 0.12, h)), top, smoothstep(0.12, 0.6, h)) : horizon * 0.8;
            gl_FragColor = vec4(c, 1.0); }`,
      }),
    [],
  );
  skyMat.uniforms.top.value.copy(mix(DUSK.top, FOG.top, fog));
  skyMat.uniforms.mid.value.copy(mix(DUSK.mid, FOG.mid, fog));
  skyMat.uniforms.horizon.value.copy(mix(DUSK.horizon, FOG.horizon, fog));

  const stars = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => {
        const a = (random(`ls-a-${i}`) - 0.5) * Math.PI * 1.4;
        const e = 0.22 + random(`ls-e-${i}`) * 0.9;
        return [Math.sin(a) * 140 * Math.cos(e), 140 * Math.sin(e), -Math.cos(a) * 140 * Math.cos(e), random(`ls-o-${i}`)] as const;
      }),
    [],
  );

  return (
    <>
      <mesh material={skyMat} scale={160} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {stars.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]}>
          <sphereGeometry args={[0.28, 6, 4]} />
          <meshBasicMaterial color="#fff6d8" transparent opacity={(1 - fog) * (0.35 + p[3] * 0.65) * (0.8 + 0.2 * Math.sin(frame * 0.1 + i))} fog={false} />
        </mesh>
      ))}
      {/* Moon up and to the left */}
      <mesh position={[-38, 52, -110]}>
        <sphereGeometry args={[5, 24, 16]} />
        <meshBasicMaterial color="#fff4d6" transparent opacity={1 - 0.8 * fog} fog={false} />
      </mesh>
      <GlowSprite position={[-38, 52, -108]} size={40} color="#cfd9ff" opacity={0.35 * (1 - fog)} />

      {/* Moonlight from the front-left, a cool sky fill, a warm horizon kicker from behind. */}
      <directionalLight
        position={[-10, 16, 14]}
        intensity={1.9}
        color="#dfe6ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={["#9fb4ff", "#3a2e40", 1.05]} />
      <directionalLight position={[8, 3, -20]} intensity={0.8} color="#ffb27a" />
    </>
  );
};

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
