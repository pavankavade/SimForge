// The lab's post stack (the crypt's, in crypt.js, as a function for other halls): SSGI bounce + AO,
// raymarched godrays from the sun, SSR on glossy pixels (Fresnel x gloss, faded towards the bottom
// of the frame), TRAA, bloom, tungsten white balance, vignette and grain.
import * as THREE from "three/webgpu";
import {
  pass, mrt, output, diffuseColor, normalView, velocity, packNormalToRGB, unpackRGBToNormal,
  sample, vec2, vec3, vec4, color, screenUV, uniform, roughness, pow, clamp, rand, time, fract, smoothstep, length, mix, float, renderOutput,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";
import { bilateralBlur } from "three/addons/tsl/display/BilateralBlurNode.js";
import { depthAwareBlend } from "three/addons/tsl/display/depthAwareBlend.js";

// returns { pipeline, aspect } (aspect: a uniform to update on resize)
export function buildPost({ renderer, scene, camera, params, sun, rays: raysOpts = {} }) {
  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputColorTransform = false;

  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, diffuseColor, normal: vec4(packNormalToRGB(normalView), roughness), velocity }));
  const sceneColor = scenePass.getTextureNode("output");
  const sceneDiffuse = scenePass.getTextureNode("diffuseColor");
  const sceneDepth = scenePass.getTextureNode("depth");
  const sceneNormalTex = scenePass.getTextureNode("normal");
  const sceneVelocity = scenePass.getTextureNode("velocity");
  scenePass.getTexture("diffuseColor").type = THREE.UnsignedByteType;
  scenePass.getTexture("normal").type = THREE.UnsignedByteType;
  const sceneNormal = sample((uv) => unpackRGBToNormal(sceneNormalTex.sample(uv).rgb));
  const sceneRough = sceneNormalTex.a;

  const gi = ssgi(sceneColor, sceneDepth, sceneNormal, camera);
  gi.sliceCount.value = Number(params.get("slices") ?? 1);
  gi.resolutionScale = Number(params.get("giScale") ?? 0.5);
  gi.stepCount.value = Number(params.get("steps") ?? 8);
  gi.radius.value = Number(params.get("giRadius") ?? 2);
  gi.giIntensity.value = Number(params.get("gi") ?? 8);
  const giAO = gi.getAONode().r;
  const giLight = gi.getGINode().rgb;

  const rays = godrays(sceneDepth, camera, sun);
  rays.density.value = raysOpts.density ?? 0.55;
  rays.maxDensity.value = raysOpts.maxDensity ?? 0.32;
  const raysBlur = bilateralBlur(rays.getTextureNode(), vec2(1), 2, 0.15);
  const hazed = depthAwareBlend(sceneColor, raysBlur.getTextureNode(), sceneDepth, camera, {
    blendColor: color(new THREE.Color(raysOpts.color ?? 0xffdcae).multiplyScalar(raysOpts.strength ?? 3.0)), edgeRadius: 2, edgeStrength: 2,
  });

  const refl = ssr(sceneColor, sceneDepth, sceneNormal, { metalnessNode: float(1), roughnessNode: sceneRough, camera });
  refl.maxDistance.value = 10;
  refl.thickness.value = 0.06;
  refl.quality.value = 0.6;
  const nDotV = clamp(sceneNormal.sample(screenUV).z, 0, 1);
  const fresnel = float(0.02).add(float(0.98).mul(pow(nDotV.oneMinus(), 5)));
  const glossy = pow(clamp(sceneRough.oneMinus(), 0, 1), 6);
  const nearFade = float(1).sub(smoothstep(0.55, 0.8, screenUV.y)); // SSR can't see off screen
  const reflW = params.get("ssr") === "0" ? float(0) : refl.a.mul(fresnel).mul(glossy).mul(nearFade);

  const lit0 = params.get("rays") === "0" ? sceneColor : hazed;
  const lit = vec4(lit0.rgb.add(refl.rgb.mul(reflW)), 1);
  const composite = params.get("gi") === "0" ? vec4(lit.rgb, 1) : vec4(lit.rgb.mul(giAO).add(sceneDiffuse.rgb.mul(giLight)), 1);
  const aa = traa(composite, sceneDepth, sceneVelocity, camera);
  const glow = bloom(aa, 0.32, 0.45, 1.6);

  const aspect = uniform(camera.aspect);
  const vig = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(aspect, 1))));
  const wb = params.get("wb") === "0" ? vec3(1) : vec3(0.84, 0.97, 1.22);
  const graded = aa.rgb.add(glow.rgb).mul(wb).mul(mix(float(0.45), float(1), vig));
  const toned = renderOutput(vec4(graded, 1));
  const grain = rand(screenUV.add(fract(time.mul(7.13)))).sub(0.5).mul(0.035);
  const view = params.get("view");
  pipeline.outputNode = view === "gi" ? vec4(giLight, 1) : view === "ao" ? vec4(vec3(giAO), 1)
    : view === "refl" ? vec4(refl.rgb.mul(reflW).mul(4), 1) : view === "diffuse" ? vec4(sceneDiffuse.rgb, 1)
    : vec4(toned.rgb.add(vec3(grain)), 1);
  return { pipeline, aspect };
}
