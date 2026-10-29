import type React from "react";
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as THREE from "three";
import { nightAmount } from "../timeline";

const DAY = { top: "#4f8fd8", mid: "#8fc0ee", bottom: "#d8ecf8" };
const NIGHT = { top: "#0b1430", mid: "#1c2c58", bottom: "#33467a" };

const mix = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);

/**
 * Sky dome, sun, fill and clouds. Everything dims to night with
 * `nightAmount(frame)` for the fallout-decay beat; stars fade in.
 */
export const Sky: React.FC<{ frame: number }> = ({ frame }) => {
  const n = nightAmount(frame);
  const { scene } = useThree();

  useLayoutEffect(() => {
    scene.environmentIntensity = THREE.MathUtils.lerp(0.4, 0.22, n);
  }, [scene, n]);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color() },
          mid: { value: new THREE.Color() },
          bottom: { value: new THREE.Color() },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos;
          void main(){ float h = vPos.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bottom, smoothstep(0.0, -0.2, h));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    [],
  );
  skyMat.uniforms.top.value.copy(mix(DAY.top, NIGHT.top, n));
  skyMat.uniforms.mid.value.copy(mix(DAY.mid, NIGHT.mid, n));
  skyMat.uniforms.bottom.value.copy(mix(DAY.bottom, NIGHT.bottom, n));

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const a = random(`star-a-${i}`) * Math.PI - Math.PI / 2;
        const e = 0.12 + random(`star-e-${i}`) * 0.9;
        return [Math.sin(a) * 140 * Math.cos(e), 140 * Math.sin(e), -Math.cos(a) * 140 * Math.cos(e)] as const;
      }),
    [],
  );

  return (
    <>
      <mesh material={skyMat} scale={160} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {n > 0.05
        ? stars.map((p, i) => (
            <mesh key={i} position={[p[0], p[1], p[2]]}>
              <sphereGeometry args={[0.35, 6, 4]} />
              <meshBasicMaterial color="#fff6d8" transparent opacity={n * (0.5 + random(`star-o-${i}`) * 0.5)} />
            </mesh>
          ))
        : null}

      {/* Sun from the front-left so the cut face is lit, soft sky fill, warm bounce. */}
      <directionalLight
        position={[-8, 14, 12]}
        intensity={THREE.MathUtils.lerp(2.3, 0.75, n)}
        color={mix("#fff1d6", "#8fa6ff", n)}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={[mix("#cfe6ff", "#24305a", n), mix("#6b4a30", "#0b0d18", n), THREE.MathUtils.lerp(0.75, 0.5, n)]} />
      <directionalLight position={[10, 4, 8]} intensity={THREE.MathUtils.lerp(0.45, 0.08, n)} color="#ffd9b0" />

      {/* Puffy clouds well behind the yard */}
      {[
        [-14, 15, -55, 5],
        [-2, 18, -70, 6],
        [12, 16, -60, 4.5],
        [24, 19, -80, 6.5],
      ].map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} scale={s}>
          {[
            [0, 0, 0, 1],
            [0.9, -0.15, 0.1, 0.75],
            [-0.9, -0.2, 0, 0.7],
            [0.35, 0.45, -0.1, 0.65],
          ].map(([cx, cy, cz, r], j) => (
            <mesh key={j} position={[cx, cy, cz]} scale={[1, 0.62, 0.6]}>
              <sphereGeometry args={[r, 20, 14]} />
              <meshStandardMaterial color={mix("#ffffff", "#2b3550", n)} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};
