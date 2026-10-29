import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

/**
 * Time-of-day sky for the "What if" sets: gradient dome with a sun (or moon)
 * glow, matching key/fill/ambient lights and fog. `tod` 0 = afternoon,
 * 1 = sunset, ~1.6 = dusk, 2 = night. Replaces the episode environment preset.
 */

type Palette = {
  top: string;
  mid: string;
  bottom: string;
  fog: string;
  sun: string;
  sunI: number;
  amb: string;
  ambI: number;
  fill: string;
  fillI: number;
  /** Sun elevation (radians) and azimuth (radians about y, 0 = -z). */
  elev: number;
  glow: string;
};

const KEYS: Palette[] = [
  { top: "#4f93d6", mid: "#a5d2f0", bottom: "#f1e4c6", fog: "#c9dceb", sun: "#fff0d4", sunI: 2.7, amb: "#eef3ff", ambI: 0.95, fill: "#bcd6ff", fillI: 0.8, elev: 0.75, glow: "#fff6dc" },
  { top: "#3b4a8c", mid: "#f0a070", bottom: "#ffd39a", fog: "#efb58e", sun: "#ffb070", sunI: 2.0, amb: "#ffd8c0", ambI: 0.75, fill: "#8fa0e0", fillI: 0.6, elev: 0.06, glow: "#ffcf7a" },
  { top: "#1d2350", mid: "#6b4f8a", bottom: "#e88a6a", fog: "#6d6290", sun: "#ff9a6a", sunI: 0.6, amb: "#a8b0e0", ambI: 0.55, fill: "#6070c0", fillI: 0.5, elev: -0.08, glow: "#ff8a5a" },
  { top: "#070b26", mid: "#141c46", bottom: "#2c3366", fog: "#141c46", sun: "#b8c8ff", sunI: 0.45, amb: "#7a88c8", ambI: 0.4, fill: "#3a4890", fillI: 0.35, elev: 0.6, glow: "#dfe6ff" },
];

const mix = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

export const paletteAt = (tod: number): Palette => {
  const x = Math.max(0, Math.min(2, tod));
  const seg = x < 1 ? 0 : x < 1.6 ? 1 : 2;
  const t = seg === 0 ? x : seg === 1 ? (x - 1) / 0.6 : (x - 1.6) / 0.4;
  const a = KEYS[seg];
  const b = KEYS[seg + 1];
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    bottom: mix(a.bottom, b.bottom, t),
    fog: mix(a.fog, b.fog, t),
    sun: mix(a.sun, b.sun, t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    amb: mix(a.amb, b.amb, t),
    ambI: a.ambI + (b.ambI - a.ambI) * t,
    fill: mix(a.fill, b.fill, t),
    fillI: a.fillI + (b.fillI - a.fillI) * t,
    elev: a.elev + (b.elev - a.elev) * t,
    glow: mix(a.glow, b.glow, t),
  };
};

const skyMat = () =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
      glow: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      stars: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 glow;
      uniform vec3 sunDir; uniform float stars;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        float h = vDir.y;
        vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h, 0.0, 1.0), 0.6)) : mix(mid, bottom, clamp(-h * 5.0, 0.0, 1.0));
        float d = max(0.0, dot(vDir, normalize(sunDir)));
        c += glow * (pow(d, 600.0) * 1.6 + pow(d, 12.0) * 0.35);
        if (stars > 0.0 && h > 0.05) {
          vec3 cell = floor(vDir * 260.0);
          float s = step(0.9975, hash(cell));
          c += vec3(s) * stars * smoothstep(0.05, 0.4, h);
        }
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });

/** Sky dome + lights + fog. `azimuth` turns the sun around the set (0 = behind, -z). */
export const SkyRig: React.FC<{ tod: number; azimuth?: number; fogNear?: number; fogFar?: number; target?: Vec3 }> = ({
  tod,
  azimuth = -0.5,
  fogNear = 90,
  fogFar = 700,
  target = [0, 0, 0],
}) => {
  const mat = useMemo(skyMat, []);
  const p = paletteAt(tod);
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(p.elev), Math.sin(p.elev), -Math.cos(azimuth) * Math.cos(p.elev));
  mat.uniforms.top.value.set(p.top);
  mat.uniforms.mid.value.set(p.mid);
  mat.uniforms.bottom.value.set(p.bottom);
  mat.uniforms.glow.value.set(p.glow);
  mat.uniforms.sunDir.value.copy(dir);
  mat.uniforms.stars.value = Math.max(0, tod - 1.5) * 2;
  // The key light comes from the sun side but stays above the horizon so faces stay lit.
  const keyDir = new THREE.Vector3(dir.x, Math.max(0.35, dir.y), dir.z).normalize().multiplyScalar(40);
  return (
    <>
      <fog attach="fog" args={[p.fog, fogNear, fogFar]} />
      <mesh material={mat} renderOrder={-10}>
        <sphereGeometry args={[1400, 48, 24]} />
      </mesh>
      <directionalLight
        position={[target[0] + keyDir.x, target[1] + keyDir.y, target[2] + keyDir.z + 18]}
        target-position={target}
        intensity={p.sunI}
        color={p.sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <directionalLight position={[target[0] - 20, target[1] + 14, target[2] + 22]} intensity={p.fillI} color={p.fill} />
      <ambientLight intensity={p.ambI} color={p.amb} />
    </>
  );
};

/**
 * Wind made visible: thin white streaks drifting along +x (or -x for negative
 * speed) in a box around `center`. `speed` in world units per frame.
 */
export const WindStreaks: React.FC<{
  frame: number;
  center: Vec3;
  speed: number;
  count?: number;
  size?: Vec3;
  opacity?: number;
  seed?: number;
}> = ({ frame, center, speed, count = 40, size = [24, 10, 8], opacity = 0.55, seed = 1 }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, fog: false }), []);
  mat.opacity = opacity * Math.min(1, Math.abs(speed) / 0.15);
  if (mat.opacity < 0.02) return null;
  const len = 0.6 + Math.abs(speed) * 6;
  return (
    <group position={center}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: string) => random(`streak-${seed}-${i}-${k}`);
        const x = ((r("x") * size[0] + frame * speed * (0.8 + r("v") * 0.4)) % size[0] + size[0]) % size[0] - size[0] / 2;
        return (
          <mesh key={i} material={mat} position={[x, (r("y") - 0.5) * size[1], (r("z") - 0.5) * size[2]]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, len, 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Moon disc for the night shot. */
export const Moon: React.FC<{ position: Vec3; size?: number }> = ({ position, size = 6 }) => (
  <mesh position={position}>
    <circleGeometry args={[size, 32]} />
    <meshBasicMaterial color="#f4f1e0" fog={false} toneMapped={false} />
  </mesh>
);
