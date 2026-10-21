import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

interface SceneEnvironmentProps {
  /** Strength of image-based lighting on PBR materials. */
  intensity?: number;
  /** Blur applied to the environment when prefiltering. */
  blur?: number;
}

/**
 * Prefilters a neutral studio environment into a cubemap so metals, gold and
 * polished steel pick up believable reflections instead of flat colour.
 */
export const SceneEnvironment: React.FC<SceneEnvironmentProps> = ({
  intensity = 0.55,
  blur = 0.04,
}) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, blur);

    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material?.dispose?.();
        }
      });
    };
  }, [gl, scene, intensity, blur]);

  return null;
};
