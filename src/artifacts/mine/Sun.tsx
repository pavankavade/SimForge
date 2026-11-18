import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { V3 } from "./common";

/**
 * A directional light aimed at `target` (its target object lives in the scene with it, so the
 * places far from the origin are lit correctly), with a shadow box of half-size `extent`.
 */
export const Sun: React.FC<{ position: V3; target: V3; color: string; intensity: number; extent?: number; shadows?: boolean }> = ({
  position,
  target,
  color,
  intensity,
  extent = 12,
  shadows = true,
}) => {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight();
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    return l;
  }, []);
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(position[0], position[1], position[2]);
  light.target.position.set(target[0], target[1], target[2]);
  light.castShadow = shadows;
  const cam = light.shadow.camera;
  if (cam.right !== extent) {
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.near = 0.5;
    cam.far = 120;
    cam.updateProjectionMatrix();
  }
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};
