import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  NormalPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction,
} from "postprocessing";

export interface PostFXConfig {
  /** Master switch. */
  enabled?: boolean;
  /** Bloom strength. 0 disables. */
  bloomIntensity?: number;
  /** Luminance above which pixels bloom. */
  bloomThreshold?: number;
  /** Bloom blur radius (mipmap blur). */
  bloomRadius?: number;
  /** Screen-space ambient occlusion strength. 0 disables. */
  aoIntensity?: number;
  /** AO sampling radius, relative to resolution. */
  aoRadius?: number;
  /** Exposure multiplier applied before tone mapping. */
  exposure?: number;
  /** Film grain amount. 0 disables. */
  grain?: number;
}

const DEFAULTS: Required<Omit<PostFXConfig, "enabled">> = {
  bloomIntensity: 0.34,
  bloomThreshold: 0.86,
  bloomRadius: 0.72,
  aoIntensity: 2.2,
  aoRadius: 0.09,
  exposure: 1.02,
  grain: 0.009,
};

/**
 * Cinematic post-processing stack: SSAO -> bloom -> ACES tone mapping -> grain
 * -> SMAA. Rendered through its own composer so it stays deterministic per
 * Remotion frame (fiber runs this at priority 1, taking over the scene render).
 */
export const PostFX: React.FC<PostFXConfig> = (props) => {
  const { gl, scene, camera, size } = useThree();

  const cfg = {
    bloomIntensity: props.bloomIntensity ?? DEFAULTS.bloomIntensity,
    bloomThreshold: props.bloomThreshold ?? DEFAULTS.bloomThreshold,
    bloomRadius: props.bloomRadius ?? DEFAULTS.bloomRadius,
    aoIntensity: props.aoIntensity ?? DEFAULTS.aoIntensity,
    aoRadius: props.aoRadius ?? DEFAULTS.aoRadius,
    exposure: props.exposure ?? DEFAULTS.exposure,
    grain: props.grain ?? DEFAULTS.grain,
  };

  const composer = useMemo(() => {
    const instance = new EffectComposer(gl, {
      frameBufferType: THREE.HalfFloatType,
    });

    // Scene pass.
    instance.addPass(new RenderPass(scene, camera));

    const effects: Array<import("postprocessing").Effect> = [];

    // Ambient occlusion: grounds props and stops the flat "toy" read.
    if (cfg.aoIntensity > 0) {
      const normalPass = new NormalPass(scene, camera, {
        resolutionScale: 0.5,
      });
      // Particles and other non-depth-writing FX would show up as solid
      // squares/quads in the normal buffer and get "occluded" by SSAO, so
      // hide them while the normals are rendered.
      const renderNormals = normalPass.render.bind(normalPass);
      normalPass.render = (...args: Parameters<typeof normalPass.render>) => {
        const hidden: THREE.Object3D[] = [];
        scene.traverse((object) => {
          const material = (object as THREE.Mesh).material as
            | THREE.Material
            | undefined;
          const isFx =
            object instanceof THREE.Points ||
            object instanceof THREE.Sprite ||
            (material !== undefined &&
              !Array.isArray(material) &&
              material.transparent &&
              !material.depthWrite);
          if (isFx && object.visible) {
            object.visible = false;
            hidden.push(object);
          }
        });
        renderNormals(...args);
        for (const object of hidden) object.visible = true;
      };
      instance.addPass(normalPass);

      effects.push(
        new SSAOEffect(camera, normalPass.texture, {
          blendFunction: BlendFunction.MULTIPLY,
          samples: 16,
          rings: 7,
          distanceScaling: true,
          depthAwareUpsampling: true,
          worldDistanceThreshold: 28,
          worldDistanceFalloff: 8,
          worldProximityThreshold: 1.2,
          worldProximityFalloff: 0.2,
          minRadiusScale: 0.12,
          luminanceInfluence: 0.62,
          radius: cfg.aoRadius,
          intensity: cfg.aoIntensity,
          color: new THREE.Color(0x0b0d14),
        })
      );
    }

    // Bloom for emissives (torches, lava, mana, blade gleam).
    if (cfg.bloomIntensity > 0) {
      effects.push(
        new BloomEffect({
          blendFunction: BlendFunction.ADD,
          mipmapBlur: true,
          luminanceThreshold: cfg.bloomThreshold,
          luminanceSmoothing: 0.22,
          intensity: cfg.bloomIntensity,
          radius: cfg.bloomRadius,
        })
      );
    }

    // Filmic response.
    effects.push(
      new ToneMappingEffect({
        mode: ToneMappingMode.ACES_FILMIC,
        resolution: 256,
        whitePoint: 4.0,
        middleGrey: 0.42,
      })
    );

    // Very light grain to kill banding in the dark gradients.
    if (cfg.grain > 0) {
      effects.push(
        new NoiseEffect({
          blendFunction: BlendFunction.OVERLAY,
          premultiply: true,
        })
      );
      (
        effects[effects.length - 1] as NoiseEffect
      ).blendMode.opacity.value = cfg.grain;
    }

    instance.addPass(new EffectPass(camera, ...effects));

    // Clean up stair-stepping introduced by the render targets.
    instance.addPass(new EffectPass(camera, new SMAAEffect()));

    return instance;
  }, [gl, scene, camera, cfg.aoIntensity, cfg.aoRadius, cfg.bloomIntensity, cfg.bloomThreshold, cfg.bloomRadius, cfg.grain]);

  // Exposure is applied on the renderer so it feeds the HDR buffer.
  useEffect(() => {
    gl.toneMapping = THREE.NoToneMapping;
    gl.toneMappingExposure = cfg.exposure;
    composer.setSize(size.width, size.height);
  }, [gl, composer, cfg.exposure, size.width, size.height]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
};
