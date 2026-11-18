// Escape Tunnel lab: "How a Prison Bed Becomes an Escape Tunnel" in the crypt lab's realistic look
// (three r187 WebGPURenderer + TSL, SSGI bounce + AO, SSR, TRAA, bloom). Film mode only: film.mjs
// loads ?cam=main and steps __step(frame). ?f=<frame> (with ?cam) shows one frame live.
import * as THREE from "three/webgpu";
import {
  pass, mrt, output, diffuseColor, normalView, velocity, packNormalToRGB, unpackRGBToNormal, sample, vec2, vec3, vec4,
  screenUV, uniform, roughness, pow, clamp, rand, fract, smoothstep, length, mix, float, renderOutput, fog,
  rangeFogFactor, time,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { U, skyNode, fogColor } from "./materials.js";
import { buildSet } from "./set.js";

const params = new URLSearchParams(location.search);
const CAM = params.get("cam") ?? "main";

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setPixelRatio(1);
const SIZE = [Number(params.get("w") ?? 1080), Number(params.get("h") ?? 1920)];
renderer.setSize(...SIZE, false);
Object.assign(renderer.domElement.style, { width: "100vw", height: "100vh", objectFit: "contain" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(params.get("exposure") ?? 1.35);
document.body.appendChild(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.backgroundNode = skyNode();
const fogNear = uniform(90), fogFar = uniform(700);
scene.fogNode = fog(fogColor(), rangeFogFactor(fogNear, fogFar));

const camera = new THREE.PerspectiveCamera(40, SIZE[0] / SIZE[1], 0.05, 900);
const anim = await import("./anim.js");

// --- the world ---------------------------------------------------------------------------------
const set = buildSet();
scene.add(set.group);

// --- light -------------------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff0e0, 3);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun, sun.target);
const sky = new THREE.HemisphereLight(0xb8c0c8, 0x4a3a2a, 0.9);
scene.add(sky);
// underground: fat lamps along the gallery, and a soft fill that follows the camera's look point
const lamps = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffb060, 0, 9, 1.4); scene.add(l); return l; });
const fill = new THREE.PointLight(0xfff0dc, 0, 12, 1.0);
scene.add(fill);
const search = new THREE.SpotLight(0xfff4d8, 0, 60, 0.22, 0.5, 1.0);
scene.add(search, search.target);

// --- the cast and the bursts -------------------------------------------------------------------
const { mountFilm } = await import("./cast.jsx");
const poseCast = await mountFilm({ renderer, scene, camera, size: SIZE });
const updateFx = (await import("./fx.js")).buildFx(scene);
const { drawHud } = await import("./hud.js");

// --- post --------------------------------------------------------------------------------------
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
const sceneNormal = sample((u) => unpackRGBToNormal(sceneNormalTex.sample(u).rgb));
const sceneRough = sceneNormalTex.a;

const gi = ssgi(sceneColor, sceneDepth, sceneNormal, camera);
gi.sliceCount.value = 1;
gi.resolutionScale = 0.5;
gi.stepCount.value = 8;
gi.radius.value = Number(params.get("giRadius") ?? 2.5);
gi.giIntensity.value = Number(params.get("gi") ?? 3);
const giAO = gi.getAONode().r;
const giLight = gi.getGINode().rgb;

const refl = ssr(sceneColor, sceneDepth, sceneNormal, { metalnessNode: float(1), roughnessNode: sceneRough, camera });
refl.maxDistance.value = 8;
refl.thickness.value = 0.06;
refl.quality.value = 0.6;
const nDotV = clamp(sceneNormal.sample(screenUV).z, 0, 1);
const fresnel = float(0.02).add(float(0.98).mul(pow(nDotV.oneMinus(), 5)));
const glossy = pow(clamp(sceneRough.oneMinus(), 0, 1), 6);
const reflW = params.get("ssr") === "0" ? float(0) : refl.a.mul(fresnel).mul(glossy);

const lit = vec4(sceneColor.rgb.add(refl.rgb.mul(reflW)), 1);
const aoMix = mix(float(1), giAO, float(Number(params.get("ao") ?? 0.85)));
const composite = params.get("gi") === "0" ? lit : vec4(lit.rgb.mul(aoMix).add(sceneDiffuse.rgb.mul(giLight)), 1);
const aa = traa(composite, sceneDepth, sceneVelocity, camera);
const glow = bloom(aa, 0.25, 0.4, 2.0);
const aspect = uniform(camera.aspect);
const vig = smoothstep(1.1, 0.3, length(screenUV.sub(0.5).mul(vec2(aspect, 1))));
// a vivid game-capture grade: a little extra saturation and contrast, a light vignette
const graded0 = aa.rgb.add(glow.rgb).mul(mix(float(0.85), float(1), vig));
const luma = graded0.dot(vec3(0.299, 0.587, 0.114));
const graded = mix(vec3(luma), graded0, float(Number(params.get("sat") ?? 1.12)));
// day-for-night: moonlit blue with the warm lights (flare, lantern, gun flashes) kept warm
const nl = pow(luma, float(1.35)).mul(1.15); // more contrast: deep shadows, bright moonlit edges
const nightGrade = mix(vec3(nl).mul(vec3(0.36, 0.62, 1.45)), graded.mul(vec3(0.85, 0.85, 1.0)).mul(nl.div(luma.max(0.001))), float(0.22)).mul(mix(float(0.7), float(1), vig));
const graded2 = mix(graded, nightGrade, U.night.mul(0.9));
const toned = renderOutput(vec4(graded2, 1));
const grain = rand(screenUV.add(fract(time.mul(7.13)))).sub(0.5).mul(0.035);
pipeline.outputNode = vec4(toned.rgb.add(vec3(grain)), 1);

// --- per-frame state ---------------------------------------------------------------------------
const tmp = new THREE.Vector3();
function apply(f) {
  const s = anim.propsAt(f);
  U.night.value = s.night;
  U.dawn.value = s.dawn;
  U.flash.value = 0;
  fogNear.value = s.fog[0];
  fogFar.value = s.fog[1];
  const look = anim.CAMS[CAM](f).look;
  const sd = U.sunDir.value.set(...s.sunDir).normalize();
  sun.target.position.set(look[0], 0, 0);
  sun.position.copy(tmp.copy(sun.target.position).addScaledVector(sd, 70));
  sun.intensity = s.sunI;
  sun.color.set(s.sunColor);
  sky.intensity = s.skyI;
  sky.color.set(s.skyColor);
  sky.groundColor.set(s.groundColor);
  set.update(s);
  lamps.forEach((l, i) => { const p = s.lamps[i]; l.intensity = p ? 8 * s.air * (0.9 + 0.1 * Math.sin(f * 0.6 + i)) : 0; if (p) l.position.set(...p); });
  fill.intensity = s.fill;
  fill.position.set(look[0], look[1] + 0.3, 2.5);
  search.intensity = s.search ? s.search.i : 0;
  if (s.search) { search.position.set(...s.search.from); search.target.position.set(...s.search.to); }
  gi.giIntensity.value = Number(params.get("gi") ?? 3) * (1 - 0.55 * s.night);
}

const raf = () => new Promise((r) => requestAnimationFrame(r));
window.__step = async (f, sub = 3) => {
  apply(f);
  poseCast(f);
  updateFx(f);
  if (!params.has("clean")) drawHud(anim.hudAt(f));
  const c = anim.CAMS[CAM](f);
  camera.fov = c.fov;
  camera.position.set(...c.pos);
  camera.lookAt(...c.look);
  if (c.roll) camera.rotateZ(c.roll);
  camera.updateProjectionMatrix();
  aspect.value = camera.aspect;
  sun.shadow.needsUpdate = true;
  for (let i = 0; i < sub; i++) pipeline.render();
  await raf();
  return f;
};
window.__frameCount = anim.FRAMES;
window.__audio = { sfx: anim.SFX, narrationEnd: anim.NARRATION_END, fps: anim.FPS };
window.__beats = anim.B;

if (params.has("f")) await window.__step(Number(params.get("f")), 24);
