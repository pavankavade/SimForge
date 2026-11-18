// Igloo lab: "How a Snow Pile Becomes an Igloo" in the crypt lab's realistic look (three r187
// WebGPURenderer + TSL): a low golden sun over a procedural snowfield, SSGI bounce + AO, SSR on the
// glazed ice, TRAA, bloom. Film mode only: film.mjs loads ?cam=main and steps __step(frame).
// ?f=<frame> (with ?cam) shows one frame live for framing checks.
import * as THREE from "three/webgpu";
import {
  pass, mrt, output, diffuseColor, normalView, velocity, packNormalToRGB, unpackRGBToNormal, sample, vec2, vec3, vec4,
  screenUV, uniform, roughness, pow, clamp, instancedBufferAttribute, sin, cos, uv, rand, fract, smoothstep, length,
  mix, float, renderOutput, fog, rangeFogFactor, time, mod,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { U, skyNode, fogColor, cuttable, snowMaterial } from "./materials.js";
import { buildTerrain, buildCap, buildRidges, buildProps, blockSet, caveGeometry, SPIRAL, RINGS } from "./set.js";

const params = new URLSearchParams(location.search);
const CAM = params.get("cam") ?? "main";

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setPixelRatio(1);
const SIZE = [Number(params.get("w") ?? 1080), Number(params.get("h") ?? 1920)];
renderer.setSize(...SIZE, false);
Object.assign(renderer.domElement.style, { width: "100vw", height: "100vh", objectFit: "contain" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = params.get("tone") === "agx" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping; // ACES keeps the low sun warm on snow
renderer.toneMappingExposure = Number(params.get("exposure") ?? 0.9);
document.body.appendChild(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.backgroundNode = skyNode();
const fogNear = uniform(60), fogFar = uniform(420);
scene.fogNode = fog(fogColor(), rangeFogFactor(fogNear, fogFar));

const camera = new THREE.PerspectiveCamera(40, SIZE[0] / SIZE[1], 0.05, 900);

const anim = await import("./anim.js");

// --- the world: cut-able things live in a ClippingGroup with one plane at z = CUT_Z -----------
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5); // keeps z < constant
const cutGroup = new THREE.ClippingGroup();
cutGroup.clippingPlanes = [cutPlane];
scene.add(cutGroup);

const terrain = buildTerrain();
cutGroup.add(terrain.mesh);
const cap = buildCap();
scene.add(cap.mesh);
scene.add(buildRidges());

const spiral = blockSet(SPIRAL.length + 4);
const rings = blockSet(RINGS.length + 4);
const arch = blockSet(40, 0.5, 0.36, 0.24);
const key = blockSet(1, 0.92, 0.9, 0.3);
for (const b of [spiral, rings, arch, key]) cutGroup.add(b.mesh);

const caveMat = cuttable(snowMaterial(), { dense: 0.15 });
const cave = new THREE.Mesh(new THREE.BufferGeometry(), caveMat);
cave.castShadow = cave.receiveShadow = true;
cutGroup.add(cave);
let caveKey = "";

const props = buildProps();
cutGroup.add(props.group);

// --- light -------------------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffd2a0, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const sky = new THREE.HemisphereLight(0x9fb8e0, 0xf2f4f8, 0.9);
scene.add(sky);
// the lamp, the campfire, and a soft interior fill so the cutaway never goes black
const lampLight = new THREE.PointLight(0xffa850, 0, 9, 1.6);
lampLight.castShadow = true;
lampLight.shadow.mapSize.setScalar(1024);
const fireLight = new THREE.PointLight(0xff7a2a, 0, 10, 1.6);
const fill = new THREE.PointLight(0xdbe6ff, 0, 7, 1.2);
scene.add(lampLight, fireLight, fill);

// --- snowfall: flakes blown along +x through a box round the igloo (pure function of time) -----
const tSec = uniform(0), blizzard = uniform(0.3);
{
  const N = 14000;
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seed[i] = Math.random();
  const sd = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seed, 4));
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false });
  const BOX = vec3(46, 16, 40);
  const speed = mix(float(0.6), float(9), blizzard);
  const p = vec3(
    mod(sd.x.mul(BOX.x).add(tSec.mul(speed).mul(sd.w.mul(0.5).add(0.75))), BOX.x).sub(BOX.x.mul(0.5)),
    mod(sd.y.mul(BOX.y).sub(tSec.mul(mix(float(0.8), float(1.6), blizzard))), BOX.y).sub(1),
    sd.z.mul(BOX.z).sub(BOX.z.mul(0.65)),
  );
  m.positionNode = p.add(vec3(sin(tSec.mul(1.3).add(sd.w.mul(40))).mul(0.25), 0, cos(tSec.mul(1.1).add(sd.x.mul(50))).mul(0.25)));
  m.scaleNode = sd.w.mul(0.018).add(0.012);
  const disc = clamp(float(1).sub(uv().sub(0.5).length().mul(2)), 0, 1);
  m.colorNode = vec3(1);
  // only the share of flakes the blizzard asks for shows
  m.opacityNode = disc.mul(smoothstep(sd.z, sd.z.add(0.02), blizzard.mul(1.05))).mul(0.9);
  const flakes = new THREE.Sprite(m);
  flakes.count = N;
  flakes.frustumCulled = false;
  scene.add(flakes);
}

// --- the cast and the bursts ------------------------------------------------------------------
const { mountFilm } = await import("./cast.jsx");
const poseCast = await mountFilm({ renderer, scene, camera, size: SIZE });
const updateFx = (await import("./fx.js")).buildFx(scene);
const { drawHud } = await import("./hud.js");

// --- post ----------------------------------------------------------------------------------------
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
gi.giIntensity.value = Number(params.get("gi") ?? 4);
const giAO = gi.getAONode().r;
const giLight = gi.getGINode().rgb;

const refl = ssr(sceneColor, sceneDepth, sceneNormal, { metalnessNode: float(1), roughnessNode: sceneRough, camera });
refl.maxDistance.value = 6;
refl.thickness.value = 0.05;
refl.quality.value = 0.6;
const nDotV = clamp(sceneNormal.sample(screenUV).z, 0, 1);
const fresnel = float(0.02).add(float(0.98).mul(pow(nDotV.oneMinus(), 5)));
const glossy = pow(clamp(sceneRough.oneMinus(), 0, 1), 6);
const reflW = params.get("ssr") === "0" ? float(0) : refl.a.mul(fresnel).mul(glossy);

const lit = vec4(sceneColor.rgb.add(refl.rgb.mul(reflW)), 1);
const aoMix = mix(float(1), giAO, float(Number(params.get("ao") ?? 0.85)));
const composite = params.get("gi") === "0" ? lit : vec4(lit.rgb.mul(aoMix).add(sceneDiffuse.rgb.mul(giLight)), 1);
const aa = traa(composite, sceneDepth, sceneVelocity, camera);
const glow = bloom(aa, 0.22, 0.4, 2.2);
const aspect = uniform(camera.aspect);
const vig = smoothstep(1.1, 0.3, length(screenUV.sub(0.5).mul(vec2(aspect, 1))));
const graded = aa.rgb.add(glow.rgb).mul(mix(float(0.6), float(1), vig));
const toned = renderOutput(vec4(graded, 1));
const grain = rand(screenUV.add(fract(time.mul(7.13)))).sub(0.5).mul(0.025);
pipeline.outputNode = vec4(toned.rgb.add(vec3(grain)), 1);

// --- per-frame state --------------------------------------------------------------------------
const tmp = new THREE.Vector3();
function apply(f) {
  const s = anim.propsAt(f);
  // world look
  U.night.value = s.night;
  U.whiteout.value = s.whiteout;
  U.glaze.value = s.glaze;
  U.glow.value = s.glow;
  blizzard.value = s.blizzard;
  tSec.value = f / anim.FPS;
  fogNear.value = mix1(60, 6, s.whiteout);
  fogFar.value = mix1(420, 70, s.whiteout);
  const sd = U.sunDir.value.set(...s.sunDir).normalize();
  sun.position.copy(tmp.set(0, 0, 0).addScaledVector(sd, 60));
  sun.intensity = s.sunI * SUN_K;
  sun.color.set(s.sunColor);
  sky.intensity = s.skyI * SKY_K;
  sky.color.set(s.skyColor);
  // the cut
  cutPlane.constant = s.cut ? s.cutZ ?? 0 : 1e5;
  cap.mesh.visible = !!s.cut;
  terrain.set(s.dig);
  cap.set(s.dig);
  // blocks
  spiral.update(s.spiral);
  rings.update(s.rings);
  arch.update(s.arch);
  key.update(s.key ? [s.key] : []);
  // the snow cave
  const ck = s.cave ? s.cave.map((v) => v.toFixed(3)).join() : "";
  if (ck !== caveKey) {
    caveKey = ck;
    cave.visible = !!s.cave;
    if (s.cave) { cave.geometry.dispose(); cave.geometry = caveGeometry(...s.cave); }
  }
  // props
  props.plat.visible = s.platform > 0;
  props.plat.scale.y = Math.max(0.001, s.platform);
  props.plat.position.y = s.platform / 2 - 0.02;
  props.fire.visible = s.fire > 0;
  props.fire.position.set(...s.firePos);
  props.lamp.visible = s.lamp > 0;
  props.lamp.position.set(...s.lampPos);
  props.furs.visible = s.furs > 0;
  props.furs.position.y = s.platformTop + 0.03 + (1 - s.furs) * 1.2;
  props.shovel.visible = !!s.shovel;
  if (s.shovel) { props.shovel.position.set(...s.shovel.pos); props.shovel.rotation.set(...s.shovel.rot); }
  lampLight.intensity = s.lamp * 4.5 * (0.92 + 0.08 * Math.sin(f * 0.9));
  lampLight.position.set(s.lampPos[0], s.lampPos[1] + 0.25, s.lampPos[2]);
  fireLight.intensity = s.fire * 6 * (0.8 + 0.2 * Math.sin(f * 1.7) * Math.sin(f * 0.63));
  fireLight.position.set(s.firePos[0], 0.45, s.firePos[2] + 0.1);
  fill.intensity = s.fill;
  const look = anim.CAMS[CAM](f).look; // the fill rides with the shot, a little in front of what it frames
  fill.position.set(look[0], look[1] + 1.0, 1.4);
  U.center.value.set(0, 0.9, 0);
}
const mix1 = (a, b, t) => a + (b - a) * t;
const SUN_K = Number(params.get("sunK") ?? 1), SKY_K = Number(params.get("skyK") ?? 1);

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
  camera.updateProjectionMatrix();
  aspect.value = camera.aspect;
  sun.shadow.needsUpdate = true;
  for (let i = 0; i < sub; i++) pipeline.render(); // TRAA settles over the sub-frames
  await raf();
  return f;
};
window.__frameCount = anim.FRAMES;
window.__audio = { sfx: anim.SFX, narrationEnd: anim.NARRATION_END, fps: anim.FPS };
window.__beats = anim.B;

// ?f=N: show that frame (for a quick look in a browser); otherwise wait for film.mjs
if (params.has("f")) await window.__step(Number(params.get("f")), 24);
