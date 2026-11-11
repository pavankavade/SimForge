// The crypt hall (Ep1); main.js picks the hall.
// Crypt Hall lab: how far can three r187 (WebGPURenderer + TSL) push realism with only
// procedural assets? SSGI bounce light, raymarched godrays through a light well, TRAA, bloom.
import * as THREE from "three/webgpu";
import {
  pass, mrt, output, diffuseColor, normalView, velocity, packNormalToRGB, unpackRGBToNormal,
  sample, vec2, vec3, vec4, color, screenUV, uniform, roughness, pow, clamp,
  instancedBufferAttribute, sin, cos, uv, rand, time, fract, smoothstep, length, mix, float, renderOutput,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";
import { bilateralBlur } from "three/addons/tsl/display/BilateralBlurNode.js";
import { depthAwareBlend } from "three/addons/tsl/display/depthAwareBlend.js";
import { buildHall, L, WELL, WELL_HALF, WELL_TOP } from "./hall.js";
import { createWalker } from "./walk.js";

const params = new URLSearchParams(location.search);
const hud = document.getElementById("hud");
// loading screen (index.html): a progress bar between the heavy start-up steps, and any failure
const loader = document.getElementById("loader");
const progress = async (pct, text) => {
  if (!loader) return;
  loader.querySelector(".bar > i").style.width = `${pct}%`;
  loader.querySelector(".msg").textContent = `${text} ${pct}%`;
  await new Promise((r) => setTimeout(r, 30)); // let it repaint before the next blocking step
};
const fail = (why) => {
  if (!loader) return;
  loader.querySelector(".spin")?.remove();
  loader.querySelector(".err").textContent = `${why} Try Chrome or Edge on a desktop, close other heavy tabs, or reload.`;
};
window.addEventListener("error", (e) => fail(`Something broke while starting: ${e.message}.`));
window.addEventListener("unhandledrejection", (e) => fail(`Something broke while starting: ${e.reason?.message ?? e.reason}.`));
if (params.has("shot") || params.has("cam")) hud.style.display = "none";

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
// ?w=&h= renders at a fixed size (stretched to the window), handy for captures
const SHOT = params.get("shot"); // style test with the episode cast (cast.jsx), portrait by default
const CAM = params.get("cam"); // camera test: the animated beat (anim.js) through one camera rig, stepped by film.mjs
// the traps as a game (game.js): same props, driven by triggers. The hosted build opens on it (?lab=1 for the walk).
const PLAY = !CAM && !SHOT && (params.has("play") || (import.meta.env.PROD && !params.has("lab") && !params.has("s") && !params.has("mode")));
// The game runs light by default when hosted (?quality=high for the full look): no SSGI, SSR or
// godrays, no torch shadows, a 2k sun shadow and at most ~1280 px of render width. The full stack
// compiling at once is enough to hang or crash a modest GPU.
const LOW = PLAY && ((params.get("quality") ?? (import.meta.env.PROD ? "low" : "high")) === "low" || !navigator.gpu);
if (LOW) for (const k of ["gi", "ssr", "rays"]) if (!params.has(k)) params.set(k, "0");
if (LOW) renderer.setPixelRatio(Math.min(1, 1280 / Math.max(1, window.innerWidth)));
const FIXED = params.has("w") ? [Number(params.get("w")), Number(params.get("h") ?? 720)] : SHOT || CAM ? [1080, 1920] : null;
const viewSize = () => FIXED ?? [Math.max(1, window.innerWidth), Math.max(1, window.innerHeight)];
renderer.setSize(...viewSize(), !FIXED);
if (FIXED) Object.assign(renderer.domElement.style, { width: "100vw", height: "100vh" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = Number(params.get("exposure") ?? (CAM ? 1.55 : PLAY ? (LOW ? 1.75 : 1.4) : 1.2)); // light mode has no bounce light: brighter // the film reads on phones: brighter
document.body.appendChild(renderer.domElement);
await progress(5, "Starting the renderer…");
await renderer.init();
renderer.backend.device?.lost?.then((info) => { if (info.reason !== "destroyed") fail(`The graphics device was lost (${info.message || info.reason}).`); });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc6dcff).multiplyScalar(8); // sky seen up the light well

const camera = new THREE.PerspectiveCamera(52, viewSize()[0] / viewSize()[1], 0.05, 90);

await progress(15, "Loading the cast…");
const castMod = SHOT || CAM || PLAY ? await import("./cast.jsx") : null;
const anim = CAM || PLAY ? await import("./anim.js") : null;
await progress(30, "Building the hall…");
const hall = buildHall(scene, { pit: anim ? anim.PIT : castMod ? castMod.PIT : null });
const { torches } = hall;
if (LOW) for (const t of torches) t.light.castShadow = false;
await progress(45, "Setting the traps…");
const { drawHud } = CAM ? await import("./hud.js") : {};
const updateProps = CAM || PLAY ? (await import("./props.js")).buildProps(scene, hall) : null;
const gameMod = PLAY ? await import("./game.js") : null;
const updateTraps = CAM || PLAY ? (await import("./traps.js")).buildTraps(scene, hall, PLAY ? { pendulumS: gameMod.BLADE_S } : {}) : null;
const updateFx = CAM || PLAY ? (await import("./fx.js")).buildFx(scene) : null;
if (SHOT) {
  const c = castMod.SHOTS[SHOT].camera;
  camera.fov = c.fov;
  camera.position.set(c.x, c.y, -c.s);
  camera.rotation.set(c.pitch, c.yaw, 0, "YXZ");
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  await castMod.mountCast({ renderer, scene, camera, shot: SHOT, size: FIXED });
}
const poseCast = CAM ? await castMod.mountFilm({ renderer, scene, camera, cam: CAM, size: FIXED }) : null;
if (PLAY) await progress(60, "Dressing the adventurers…");
const drawCast = PLAY ? await castMod.mountTracks({ renderer, scene, camera, size: viewSize() }) : null;
if (PLAY) gameMod.buildFence(scene);
const game = PLAY ? gameMod.createGame({ camera, canvas: renderer.domElement, classType: params.get("class") ?? "rogue", picker: !params.has("class") }) : null;
if (PLAY) {
  window.__game = game; // for debugging and the play test
  camera.fov = 60;
  camera.updateProjectionMatrix();
}

// Sun through the light well. Its shadow map covers the whole hall so the roof stays dark.
const wellS = (WELL[0] + WELL[1]) / 2;
const sun = new THREE.DirectionalLight(0xfff0d8, Number(params.get("sun") ?? 8));
const sunDir = new THREE.Vector3(0.12, 1, -0.3).normalize();
sun.target.position.set(0, 0, -wellS + 3.6);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 32);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(LOW ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// nothing that casts shadows moves: render every shadow map once
for (const l of [sun, ...torches.map((t) => t.light)]) {
  l.shadow.autoUpdate = false;
  l.shadow.needsUpdate = true;
}

// dust motes drifting in the shaft
{
  const N = 900, down = sunDir.clone().negate();
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p0 = new THREE.Vector3((Math.random() * 2 - 1) * WELL_HALF, WELL_TOP, -(WELL[0] + Math.random() * (WELL[1] - WELL[0])));
    const y = 0.15 + Math.pow(Math.random(), 0.8) * 8.5;
    p0.addScaledVector(down, (WELL_TOP - y) / -down.y);
    pos.set([p0.x, p0.y, p0.z], i * 3);
    seed[i] = Math.random();
  }
  const sd = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seed, 1));
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.positionNode = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3)).add(vec3(
    sin(time.mul(0.21).add(sd.mul(40))).mul(0.14), sin(time.mul(0.15).add(sd.mul(70))).mul(0.2), cos(time.mul(0.18).add(sd.mul(55))).mul(0.14)));
  m.scaleNode = sd.mul(0.005).add(0.004);
  const twinkle = sin(time.mul(sd.mul(2).add(0.5)).add(sd.mul(90))).mul(0.4).add(0.6);
  const disc = clamp(float(1).sub(uv().sub(0.5).length().mul(2)), 0, 1);
  m.colorNode = color(new THREE.Color(0xffe8c8).multiplyScalar(3.5)).mul(twinkle).mul(disc);
  m.opacityNode = disc;
  const motes = new THREE.Sprite(m);
  motes.count = N;
  motes.frustumCulled = false;
  scene.add(motes);
}

scene.add(new THREE.HemisphereLight(0x7f98c8, 0x2e241a, 0.2));

// --- post ------------------------------------------------------------------------------------
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
const sceneRough = sceneNormalTex.a; // roughness rides in the normal buffer alpha (MRT byte budget)

// screen-space GI: bounce light + AO
const gi = ssgi(sceneColor, sceneDepth, sceneNormal, camera);
gi.sliceCount.value = Number(params.get("slices") ?? 1);
gi.resolutionScale = Number(params.get("giScale") ?? 0.5);
gi.stepCount.value = Number(params.get("steps") ?? 8);
gi.radius.value = Number(params.get("giRadius") ?? 2);
gi.giIntensity.value = Number(params.get("gi") ?? 8);
// r187: the node itself is the AO texture; bounce light lives in getGINode()
const giAO = gi.getAONode().r;
const giLight = gi.getGINode().rgb;

// volumetric shaft from the sun
const rays = godrays(sceneDepth, camera, sun);
rays.density.value = 0.55;
rays.maxDensity.value = 0.32;
const raysBlur = bilateralBlur(rays.getTextureNode(), vec2(1), 2, 0.15);
const hazed = depthAwareBlend(sceneColor, raysBlur.getTextureNode(), sceneDepth, camera, {
  blendColor: color(new THREE.Color(0xffdcae).multiplyScalar(3.0)), edgeRadius: 2, edgeStrength: 2,
});

// wet-floor reflections: SSR everywhere, but only glossy pixels keep it (Fresnel-weighted)
const refl = ssr(sceneColor, sceneDepth, sceneNormal, {
  metalnessNode: float(1), roughnessNode: sceneRough, camera, // weight 1 here; Fresnel x gloss applied below
});
refl.maxDistance.value = 10;
refl.thickness.value = 0.06;
refl.quality.value = 0.6;
const nDotV = clamp(sceneNormal.sample(screenUV).z, 0, 1);
const fresnel = float(0.02).add(float(0.98).mul(pow(nDotV.oneMinus(), 5)));
const glossy = pow(clamp(sceneRough.oneMinus(), 0, 1), 6);
// the floor just under a high camera mirrors whatever hangs above the top of the frame as a
// wrong-way ghost (SSR can't see off screen), so reflections fade out over the bottom of the frame
const nearFade = float(1).sub(smoothstep(0.55, 0.8, screenUV.y));
const reflW = params.get("ssr") === "0" ? float(0) : refl.a.mul(fresnel).mul(glossy).mul(nearFade);

const lit0 = params.get("rays") === "0" ? sceneColor : hazed;
const lit = vec4(lit0.rgb.add(refl.rgb.mul(reflW)), 1);
const composite = params.get("gi") === "0" ? vec4(lit.rgb, 1) : vec4(lit.rgb.mul(giAO).add(sceneDiffuse.rgb.mul(giLight)), 1);
const aa = traa(composite, sceneDepth, sceneVelocity, camera);
const glow = bloom(aa, 0.32, 0.45, 1.6);

const aspect = uniform(camera.aspect);
const vig = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(aspect, 1))));
// camera white-balanced for tungsten: torch-lit stone reads near neutral, daylight goes cool
const wb = params.get("wb") === "0" ? vec3(1) : vec3(0.84, 0.97, 1.22);
const graded = aa.rgb.add(glow.rgb).mul(wb).mul(mix(float(0.45), float(1), vig));
const toned = renderOutput(vec4(graded, 1));
const grain = rand(screenUV.add(fract(time.mul(7.13)))).sub(0.5).mul(0.035);
const view = params.get("view");
pipeline.outputNode = view === "gi" ? vec4(giLight, 1) : view === "ao" ? vec4(vec3(giAO), 1)
  : view === "refl" ? vec4(refl.rgb.mul(reflW).mul(4), 1) : view === "ssr" ? vec4(refl.rgb, 1) : view === "rough" ? vec4(vec3(sceneRough), 1) : view === "diffuse" ? vec4(sceneDiffuse.rgb, 1) : view === "normal" ? vec4(sceneNormalTex.rgb, 1)
  : vec4(toned.rgb.add(vec3(grain)), 1);

// --- camera: walk (default), slow dolly (C toggles), or a fixed shot via ?s=&yaw=&pitch=&y= ---
const fixed = params.has("s");
let paused = false;
let mode = PLAY ? "play" : SHOT ? "shot" : fixed ? "fixed" : params.get("mode") ?? "walk";
const walker = PLAY ? null : createWalker(camera, renderer.domElement);
window.__camera = camera; // for debugging from the console
window.addEventListener("keydown", (e) => {
  if (PLAY) return;
  if (e.code === "Space") paused = !paused;
  if (e.code === "KeyC" && !fixed) mode = mode === "walk" ? "dolly" : "walk";
});
window.addEventListener("resize", () => {
  if (FIXED || !window.innerWidth || !window.innerHeight) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect.value = camera.aspect;
});

const timer = new THREE.Timer();
let t = 0, frames = 0, fpsT = 0, fps = 0;
const DOLLY = 70; // seconds one way

function placeCamera(time) {
  let s, yaw, pitch, y;
  if (fixed) {
    s = Number(params.get("s"));
    yaw = Number(params.get("yaw") ?? 0);
    pitch = Number(params.get("pitch") ?? 0.08);
    y = Number(params.get("y") ?? 1.7);
  } else {
    const ph = (time / DOLLY) % 2;
    const k = ph < 1 ? ph : 2 - ph;
    const e = k * k * (3 - 2 * k);
    s = 1.5 + e * (L - 6);
    yaw = Math.sin(time * 0.13) * 0.12;
    pitch = 0.1 + Math.sin(time * 0.09) * 0.05;
    y = 1.7 + Math.sin(time * 1.6) * 0.012;
  }
  camera.position.set(Math.sin(time * 0.21) * 0.15 * (fixed ? 0 : 1), y, -s);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
}

// film mode: no animation loop; film.mjs calls __step(frame) and screenshots. The cast moves, so
// the sun and the torches near the pit re-render their shadow maps every frame.
if (CAM) {
  const near = torches.filter((t) => t.light.position.distanceTo(new THREE.Vector3(0, 1, -anim.PIT.s)) < 7);
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  window.__step = async (f, sub = 3) => {
    poseCast(f);
    const props = anim.propsAt(f);
    updateProps(props);
    updateTraps(props);
    updateFx(f);
    if (!params.has("clean")) drawHud(anim.hudAt(f)); // ?clean=1: no captions/badges (thumbnail plates)
    const c = anim.CAMS[CAM](f);
    camera.fov = c.fov;
    camera.position.set(...c.pos);
    camera.lookAt(...c.look);
    camera.updateProjectionMatrix();
    const now = f / anim.FPS;
    for (const tr of torches) tr.light.intensity = tr.base * (0.82 + 0.1 * Math.sin(now * 11 + tr.seed) + 0.08 * Math.sin(now * 23.7 + tr.seed * 2.3));
    for (const l of [sun, ...near.map((t) => t.light)]) l.shadow.needsUpdate = true;
    for (let i = 0; i < sub; i++) pipeline.render(); // TRAA settles over the sub-frames
    await raf();
    return f;
  };
  window.__frameCount = anim.FRAMES;
  window.__audio = { sfx: anim.SFX, narrationEnd: anim.NARRATION_END, fps: anim.FPS };
}

// the first frame compiles every shader (through the post pipeline's own targets), so draw it
// behind the loader
if (PLAY) {
  await progress(75, "Compiling shaders… (the slow part)");
  const props = game.propState();
  updateProps(props);
  updateTraps(props);
  pipeline.render();
  await progress(95, "Almost there…");
  pipeline.render();
  await progress(100, "Ready");
  loader?.remove();
} else loader?.remove();

if (!CAM) renderer.setAnimationLoop((ms) => {
  timer.update(ms);
  const dt = timer.getDelta();
  if (!paused) t += dt;
  if (mode === "play") {
    game.update(Math.min(dt, 0.1));
    const props = game.propState();
    updateProps(props);
    updateTraps(props);
    updateFx(game.frame, game.bursts);
    drawCast(game.frame, game.tracks());
    // the player, flaps, slab and blade move: re-render the sun's and the nearest torches' shadows
    const pl = new THREE.Vector3(game.player.x, 1, -game.player.s);
    sun.shadow.needsUpdate = true;
    for (const tr of [...torches].sort((a, b) => a.light.position.distanceTo(pl) - b.light.position.distanceTo(pl)).slice(0, 3)) tr.light.shadow.needsUpdate = true;
  } else if (mode === "walk") walker.update(Math.min(dt, 0.1));
  else if (mode !== "shot") placeCamera(t);
  const now = timer.getElapsed();
  for (const tr of torches) {
    tr.light.intensity = tr.base * (0.82 + 0.1 * Math.sin(now * 11 + tr.seed) + 0.08 * Math.sin(now * 23.7 + tr.seed * 2.3));
  }
  pipeline.render();
  window.__frames = (window.__frames ?? 0) + 1;
  frames++; fpsT += dt;
  if (fpsT > 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  const help = mode === "play" ? game.help : mode === "walk"
    ? (walker.locked ? "WASD move · shift run · esc release mouse · C dolly" : "click to look around (or drag) · WASD move · shift run · C dolly")
    : "C walk · space pause";
  hud.textContent = `three r${THREE.REVISION} · ${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2"} · ${fps.toFixed(0)} fps · ${help}`;
});
