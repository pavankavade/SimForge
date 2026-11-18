// Spy Horse lab: "How a Dead Horse Becomes a WW1 Spy Post" in the crypt lab's realistic look
// (three r187 WebGPURenderer + TSL): churned mud and puddles under an overcast sky, SSGI bounce + AO,
// SSR on the wet hollows, TRAA, bloom. Film mode only: film.mjs loads ?cam=main and steps
// __step(frame). ?f=<frame> (with ?cam) shows one frame live for framing checks.
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
import {
  buildTerrain, buildPuddles, buildStatic, sackSet, PARAPETS, buildHorse, buildFrame, horseMaterials, buildProps,
  buildRope, buildWire, buildWorkshop, CARCASSES, heightAt,
} from "./set.js";

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
const terrain = buildTerrain();
scene.add(terrain.mesh);
scene.add(buildPuddles());
scene.add(buildStatic());
const parapets = sackSet(PARAPETS.length);
parapets.update(PARAPETS);
scene.add(parapets.mesh);
const ring = sackSet(40);
scene.add(ring.mesh);

const mats = horseMaterials();
const real = buildHorse(mats.real);
scene.add(real.group);
const others = CARCASSES.map((c, i) => {
  const h = buildHorse(mats.others[i]);
  h.group.position.set(c.pos[0], heightAt(c.pos[0], c.pos[2]) - 0.05, c.pos[2]);
  h.group.rotation.y = c.yaw;
  scene.add(h.group);
  return h;
});
// the copy lives in a clipping group: the cutaway plane (z) and the workshop's reveal plane (x)
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5);   // keeps z < constant
const revealPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e5); // keeps x < constant
const copyClip = new THREE.ClippingGroup();
copyClip.clippingPlanes = [cutPlane, revealPlane];
scene.add(copyClip);
const copy = buildHorse(mats.copy, { copy: true, points: mats.copyPoints });
copyClip.add(copy.group);
// the wooden frame: clipped by the cutaway only (in the workshop it shows before the skin)
const frameClip = new THREE.ClippingGroup();
frameClip.clippingPlanes = [cutPlane];
scene.add(frameClip);
const frame = buildFrame();
frameClip.add(frame.group);
const workshop = buildWorkshop();
scene.add(workshop);
const props = buildProps();
scene.add(props.group);
const rope = buildRope();
scene.add(rope.mesh);
const rope2 = buildRope();
scene.add(rope2.mesh);
const wire = buildWire();
scene.add(wire.mesh);

// --- light -------------------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff0e0, 3);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(4096);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun, sun.target);
const sky = new THREE.HemisphereLight(0xb8c0c8, 0x4a3a2a, 0.9);
scene.add(sky);
const blasts = [0, 1].map(() => { const l = new THREE.PointLight(0xffa050, 0, 26, 1.4); scene.add(l); return l; });
const lantern = new THREE.PointLight(0xffb060, 0, 14, 1.3);
lantern.castShadow = true;
lantern.shadow.mapSize.setScalar(1024);
scene.add(lantern);
const fill = new THREE.PointLight(0xa8c4ff, 0, 7, 1.0);
scene.add(fill);
// night: a star shell (Very light) hanging over the enemy side, drifting down on its parachute;
// it gives the moonlit blue a warm accent and rim-lights the horses
const flare = new THREE.PointLight(0xffd9a0, 0, 90, 1.1);
const flareBall = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(30), fog: false }));
scene.add(flare, flareBall);

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
const place = (g, t) => {
  g.visible = !!t;
  if (!t) return;
  g.position.set(...t.pos);
  g.rotation.set(...(t.rot ?? [0, 0, 0]));
};
function apply(f) {
  const s = anim.propsAt(f);
  U.night.value = s.night;
  U.dawn.value = s.dawn;
  U.flash.value = s.flash;
  U.paint.value = s.paint;
  fogNear.value = s.fog[0];
  fogFar.value = s.fog[1];
  const sd = U.sunDir.value.set(...s.sunDir).normalize();
  sun.position.copy(tmp.copy(s.sunTarget ? new THREE.Vector3(...s.sunTarget) : new THREE.Vector3()).addScaledVector(sd, 60));
  sun.target.position.set(...(s.sunTarget ?? [0, 0, 0]));
  sun.intensity = s.sunI;
  sun.color.set(s.sunColor);
  sky.intensity = s.skyI;
  sky.color.set(s.skyColor);
  sky.groundColor.set(s.groundColor);
  terrain.set(s.dig);
  ring.update(s.ring);
  place(real.group, s.real);
  place(copy.group, s.copy);
  place(frame.group, s.frame);
  if (s.frame) {
    frame.hoops.forEach((h, i) => { h.visible = i < s.frameN; });
    frame.laths.forEach((l, i) => { l.visible = i < s.frameN - 7; });
  }
  copy.slit.scale.set(1, 1, Math.max(0.001, s.slit));
  copy.slit.visible = s.slit > 0;
  cutPlane.constant = s.cut ? 0 : 1e5;
  revealPlane.constant = s.reveal ?? 1e5;
  workshop.visible = !!s.workshop;
  for (const [k, o] of Object.entries({ rifle: props.rifle, phone: props.phone, spade: props.spade, book: props.book })) place(o, s.props[k]);
  rope.set(...(s.rope ?? [null]));
  rope2.set(...(s.rope2 ?? [null]));
  wire.reveal(s.wire);
  others.forEach((o) => { o.group.visible = s.others; });
  s.blasts.forEach((b, i) => { blasts[i].intensity = b ? b.i : 0; if (b) blasts[i].position.set(...b.pos); });
  lantern.intensity = s.lantern * (0.92 + 0.08 * Math.sin(f * 0.7));
  lantern.position.set(...s.lanternPos);
  fill.intensity = s.fill;
  gi.giIntensity.value = Number(params.get("gi") ?? 3) * (1 - 0.55 * s.night); // less GI noise in the dark grade
  const fc = (f % 300) / 300;
  const lk = anim.CAMS[CAM](f).look;
  flare.position.set(lk[0] + 7 - fc * 3, 15 - fc * 8, lk[2] - 12);
  flareBall.position.copy(flare.position);
  flare.intensity = s.flare * 160 * (0.85 + 0.15 * Math.sin(f * 1.7)) * Math.min(1, (1 - fc) * 6, fc * 12);
  flareBall.visible = s.flare > 0.3;
  const look = anim.CAMS[CAM](f).look;
  fill.position.set(look[0], look[1] + 1.2, look[2] + 1.6);
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
