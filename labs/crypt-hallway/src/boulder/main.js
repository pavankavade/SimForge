// Boulder hallway (?hall=boulder): Ep2 re-staged in a realistic corridor on three r187 WebGPU, with
// the lab's post stack (post.js) and the episode cast through the kit's ActorView (cast.jsx).
//   ?cam=threeq      film mode: film.mjs steps window.__step(frame) and screenshots each frame
//   ?play=1          the traps as a game (game.js)
//   (neither)        the film playing in real time, space pauses, ?f=N starts there
import * as THREE from "three/webgpu";
import { buildPost } from "../post.js";
import { buildHall, ROOT } from "./hall.js";
import { buildProps } from "./props.js";
import { buildFx } from "../fx.js";
import { fitPortraitFov } from "../touch.js";
import { WALL_END_X } from "./timeline.js";

const params = new URLSearchParams(location.search);
const hud = document.getElementById("hud");
const loader = document.getElementById("loader");
const progress = async (pct, text) => {
  if (!loader) return;
  loader.querySelector(".bar > i").style.width = `${pct}%`;
  loader.querySelector(".msg").textContent = `${text} ${pct}%`;
  await new Promise((r) => setTimeout(r, 30));
};
const fail = (why) => {
  if (!loader) return;
  loader.querySelector(".spin")?.remove();
  loader.querySelector(".err").textContent = `${why} Try Chrome or Edge on a desktop, close other heavy tabs, or reload.`;
};
window.addEventListener("error", (e) => fail(`Something broke while starting: ${e.message}.`));
window.addEventListener("unhandledrejection", (e) => fail(`Something broke while starting: ${e.reason?.message ?? e.reason}.`));
if (loader) loader.querySelector("h1").innerHTML = "EVOLUTION OF A<br>BOULDER HALLWAY";

const CAM = params.get("cam");
const PLAY = !CAM && (params.has("play") || (import.meta.env.PROD && !params.has("film")));
const LOW = PLAY && ((params.get("quality") ?? (import.meta.env.PROD ? "low" : "high")) === "low" || !navigator.gpu);
if (CAM) hud.style.display = "none";
if (LOW) for (const k of ["gi", "ssr", "rays"]) if (!params.has(k)) params.set(k, "0");

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setPixelRatio(LOW ? Math.min(1, 1280 / Math.max(1, window.innerWidth)) : Math.min(window.devicePixelRatio, 1.5));
const FIXED = params.has("w") ? [Number(params.get("w")), Number(params.get("h") ?? 720)] : CAM || !PLAY ? [1080, 1920] : null;
const viewSize = () => FIXED ?? [Math.max(1, window.innerWidth), Math.max(1, window.innerHeight)];
renderer.setSize(...viewSize(), !FIXED);
if (FIXED) Object.assign(renderer.domElement.style, { width: CAM ? "100vw" : "auto", height: "100vh", aspectRatio: `${FIXED[0]} / ${FIXED[1]}`, margin: "0 auto" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = Number(params.get("exposure") ?? (PLAY ? (LOW ? 1.6 : 1.3) : 1.4));
document.body.appendChild(renderer.domElement);
await progress(5, "Starting the renderer…");
await renderer.init();
renderer.backend.device?.lost?.then((info) => { if (info.reason !== "destroyed") fail(`The graphics device was lost (${info.message || info.reason}).`); });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe2ff).multiplyScalar(3); // daylight beyond the doorway
const camera = new THREE.PerspectiveCamera(50, viewSize()[0] / viewSize()[1], 0.05, 120);

await progress(15, "Loading the cast…");
const anim = await import("./anim.js");
const castMod = await import("./cast.jsx");
await progress(30, "Building the hall…");
const root = new THREE.Group();
root.position.set(...ROOT.position);
root.rotation.y = ROOT.rotationY;
scene.add(root);
const LAYOUT = PLAY ? (await import("./sim.js")).LAYOUT : undefined; // the game hall has its own trap layout
const hall = buildHall(root, LAYOUT);
const { torches } = hall;
if (LOW) for (const t of torches) t.light.castShadow = false;
await progress(45, "Setting the traps…");
const updateProps = buildProps(root, hall, LAYOUT);
const updateFx = buildFx(scene);
const { drawHud } = CAM ? await import("../hud.js") : {};

// low sun in the courtyard, straight down the hall through the doorway (lab z = Ep2 x)
const sun = new THREE.DirectionalLight(0xfff0d8, Number(params.get("sun") ?? 1.6));
const sunDir = new THREE.Vector3(0.22, 0.4, -1).normalize();
sun.target.position.set(0, 0, WALL_END_X + 6);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 40);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(LOW ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x8fa8d8, 0x2e241a, 0.22));
scene.updateMatrixWorld(true);
for (const l of [sun, ...torches.map((t) => t.light)]) { l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; }
const torchPos = torches.map((t) => t.light.getWorldPosition(new THREE.Vector3()));

const { pipeline, aspect } = buildPost({ renderer, scene, camera, params, sun, rays: { density: 0.45, maxDensity: 0.2, strength: 1.1 } });
window.__camera = camera;

const flicker = (now) => {
  for (const tr of torches) tr.light.intensity = tr.base * (0.82 + 0.1 * Math.sin(now * 11 + tr.seed) + 0.08 * Math.sin(now * 23.7 + tr.seed * 2.3));
};
// the cast and the balls move: re-render the sun's shadow and the torches nearest the camera's subject
const shadowsNear = (p) => {
  sun.shadow.needsUpdate = true;
  const order = torches.map((t, i) => [torchPos[i].distanceTo(p), t]).sort((a, b) => a[0] - b[0]);
  for (const [, t] of order.slice(0, 3)) t.light.shadow.needsUpdate = true;
};

if (!PLAY) {
  const drawCast = await castMod.mountBoulderCast({ renderer, scene, camera, size: viewSize() });
  const look = new THREE.Vector3();
  const setFrame = (f) => {
    drawCast(f, anim.TRACKS, anim.extrasAt(f));
    updateProps(anim.propsAt(f));
    updateFx(f, anim.BURSTS);
    if (drawHud && !params.has("clean")) drawHud(anim.hudAt(f));
    const c = anim.CAMS.threeq(f);
    camera.fov = c.fov;
    camera.position.set(...c.pos);
    camera.lookAt(...c.look);
    camera.updateProjectionMatrix();
    flicker(f / anim.FPS);
    shadowsNear(look.set(...c.look));
  };
  if (CAM) {
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    window.__step = async (f, sub = 3) => {
      setFrame(f);
      for (let i = 0; i < sub; i++) pipeline.render(); // TRAA settles over the sub-frames
      await raf();
      return f;
    };
    window.__frameCount = anim.FRAMES;
    window.__audio = { sfx: anim.SFX, narrationEnd: anim.NARRATION_END, fps: anim.FPS, episode: "rolling-boulder", narration: "../../../out/audio-tmp-boulder-hallway/narration_ext.wav", score: "score_v3.mp3" }; // voice-extra.py
    loader?.remove();
  } else {
    // real-time preview of the film
    loader?.remove();
    let f = Number(params.get("f") ?? 0), paused = false, acc = 0;
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") paused = !paused;
      if (e.code === "ArrowRight") f += 30;
      if (e.code === "ArrowLeft") f = Math.max(0, f - 30);
    });
    const timer = new THREE.Timer();
    renderer.setAnimationLoop((ms) => {
      timer.update(ms);
      if (!paused) acc += timer.getDelta();
      while (acc >= 1 / 30) { f = (f + 1) % anim.FRAMES; acc -= 1 / 30; }
      setFrame(f);
      pipeline.render();
      hud.textContent = `frame ${f} · space pause · ←/→ 1 s`;
    });
  }
} else {
  const gameMod = await import("./game.js");
  await progress(60, "Dressing the adventurers…");
  const drawCast = await castMod.mountBoulderCast({ renderer, scene, camera, size: viewSize() });
  const game = gameMod.createGame({ camera, canvas: renderer.domElement, root, classType: params.get("class") ?? "rogue", picker: !params.has("class") });
  window.__game = game;
  camera.fov = fitPortraitFov(60, viewSize()[0], viewSize()[1]);
  camera.updateProjectionMatrix();
  const syncSize = () => {
    if (!window.innerWidth || !window.innerHeight) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = fitPortraitFov(60, window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    aspect.value = camera.aspect;
  };
  window.addEventListener("resize", syncSize);
  window.addEventListener("orientationchange", () => setTimeout(syncSize, 120));
  await progress(75, "Compiling shaders… (the slow part)");
  updateProps(game.propState());
  pipeline.render();
  await progress(100, "Ready");
  loader?.remove();
  const timer = new THREE.Timer();
  let frames = 0, fpsT = 0, fps = 0;
  renderer.setAnimationLoop((ms) => {
    timer.update(ms);
    const dt = timer.getDelta();
    game.update(Math.min(dt, 0.1));
    updateProps(game.propState());
    updateFx(game.frame, game.bursts);
    drawCast(game.frame, game.tracks(), game.extras());
    shadowsNear(game.playerWorld());
    flicker(timer.getElapsed());
    pipeline.render();
    window.__frames = (window.__frames ?? 0) + 1;
    frames++; fpsT += dt;
    if (fpsT > 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
    hud.textContent = `three r${THREE.REVISION} · ${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2"} · ${fps.toFixed(0)} fps · ${game.help}`;
  });
}
