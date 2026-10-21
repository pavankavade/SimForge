import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { EnvironmentConfig } from "./types";

interface EnvironmentSceneProps {
  preset: EnvironmentConfig;
}

export const EnvironmentScene: React.FC<EnvironmentSceneProps> = ({ preset }) => {
  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          topColor: { value: new THREE.Color(preset.sky.top) },
          midColor: { value: new THREE.Color(preset.sky.mid) },
          bottomColor: { value: new THREE.Color(preset.sky.bottom) },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            vec3 color = h > 0.0
              ? mix(midColor, topColor, pow(clamp(h, 0.0, 1.0), 0.72))
              : mix(midColor, bottomColor, clamp(-h * 4.0, 0.0, 1.0));
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    [preset.sky]
  );

  const groundTexture = useMemo(() => {
    const texture = preset.ground.texture;
    if (typeof document === "undefined" || !texture) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = texture.base;
    ctx.fillRect(0, 0, 1024, 1024);

    const patchCount = texture.patches ?? 320;
    for (let i = 0; i < patchCount; i++) {
      const x = random(`ground-patch-x-${i}`) * 1024;
      const y = random(`ground-patch-y-${i}`) * 1024;
      const r = 20 + random(`ground-patch-r-${i}`) * 60;
      ctx.fillStyle =
        random(`ground-patch-tone-${i}`) > 0.5
          ? texture.patchA
          : texture.patchB;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const crackCount = texture.cracks ?? 45;
    ctx.strokeStyle = texture.crack;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < crackCount; i++) {
      let cx = random(`ground-crack-x-${i}`) * 1024;
      let cy = random(`ground-crack-y-${i}`) * 1024;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (random(`ground-crack-dx-${i}-${s}`) - 0.5) * 80;
        cy += (random(`ground-crack-dy-${i}-${s}`) - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(texture.repeat[0], texture.repeat[1]);
    tex.anisotropy = 4;
    return tex;
  }, [preset.ground.texture]);

  const shadows = preset.lights.shadows !== false;

  return (
    <group>
      <directionalLight
        position={preset.lights.key.position}
        intensity={preset.lights.key.intensity}
        color={preset.lights.key.color}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-near={1}
        shadow-camera-far={100}
      />

      <directionalLight
        position={preset.lights.fill.position}
        intensity={preset.lights.fill.intensity}
        color={preset.lights.fill.color}
      />

      <directionalLight
        position={preset.lights.rim.position}
        intensity={preset.lights.rim.intensity}
        color={preset.lights.rim.color}
      />

      <ambientLight
        intensity={preset.lights.ambient.intensity}
        color={preset.lights.ambient.color}
      />

      <mesh renderOrder={-10}>
        <sphereGeometry args={[130, 32, 16]} />
        <primitive object={skyMaterial} attach="material" />
      </mesh>

      {preset.clouds.map((cloud, index) => (
        <group key={`cloud-${index}`} position={cloud.position}>
          <mesh scale={[cloud.size * 2.1, cloud.size * 0.62, cloud.size * 1.05]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial
              color="#f7fbff"
              transparent
              opacity={cloud.opacity}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[cloud.size * 0.86, -cloud.size * 0.1, cloud.size * 0.12]}
            scale={[cloud.size * 1.18, cloud.size * 0.44, cloud.size * 0.74]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial
              color="#f7fbff"
              transparent
              opacity={cloud.opacity * 0.94}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[-cloud.size * 0.9, cloud.size * 0.04, -cloud.size * 0.08]}
            scale={[cloud.size * 1.32, cloud.size * 0.5, cloud.size * 0.82]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial
              color="#f7fbff"
              transparent
              opacity={cloud.opacity * 0.9}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {!preset.ground.hidden && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          receiveShadow
        >
          <planeGeometry args={[220, 220]} />
          <meshStandardMaterial
            map={groundTexture ?? undefined}
            color={preset.ground.color}
            roughness={0.9}
          />
        </mesh>
      )}

      {preset.hills.map((hill, index) => (
        <mesh
          key={`hill-${index}`}
          position={hill.position}
          scale={hill.scale}
          rotation={[0, (index * Math.PI) / 3, 0]}
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={hill.color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
};
