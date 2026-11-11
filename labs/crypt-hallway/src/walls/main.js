// Crushing room (?hall=walls): Ep3 re-made for the lab on three r187 WebGPU, with the lab's post
// stack (post.js) and the episode cast through the kit's ActorView (cast.jsx). Film only.
//   ?cam=threeq      film mode: film.mjs steps window.__step(frame) and screenshots each frame
//   (no cam)         the film playing in real time; space pauses, ←/→ seek, ?f=N starts there
import * as THREE from "three/webgpu";
import { buildPost } from "../post.js";
import { buildHall } from "./hall.js";
import { buildProps } from "./props.js";
import { buildFx } from "../fx.js";
import { DOOR_Z } from "./timeline.js";

const params = new URLSearchParams(location.search);
const hud = document.getElementById("hud");
document.getElementById("loader")?.remove();
const CAM = params.get("cam");
if (CAM) hud.style.display = "none";

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
const FIXED = params.has("w") ? [Number(params.get("w")), Number(params.get("h") ?? 720)] : [1080, 1920];
renderer.setSize(...FIXED, false);
Object.assign(renderer.domElement.style, { width: CAM ? "100vw" : "auto", height: "100vh", aspectRatio: `${FIXED[0]} / ${FIXED[1]}`, margin: "0 auto" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = Number(params.get("exposure") ?? 1.7);
document.body.appendChild(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe2ff).multiplyScalar(3); // daylight beyond the doorway
const camera = new THREE.PerspectiveCamera(46, FIXED[0] / FIXED[1], 0.05, 140);

const anim = await import("./anim.js");
const castMod = await import("./cast.jsx");
const root = new THREE.Group();
scene.add(root);
const hall = buildHall(root);
const props = buildProps(root, hall);
const torches = props.torches;
const updateFx = buildFx(scene);
const { drawHud } = CAM ? await import("../hud.js") : {};

// a low sun beyond the doorway, shining straight down the hallway into the room
const sun = new THREE.DirectionalLight(0xfff0d8, Number(params.get("sun") ?? 1.6));
const sunDir = new THREE.Vector3(-0.18, 0.36, 1).normalize();
sun.target.position.set(0, 0, DOOR_Z - 6);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 40);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(4096);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x3a2e22, 0.45));
scene.updateMatrixWorld(true);
for (const l of [sun, ...torches.map((t) => t.light)]) { l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; }

const { pipeline } = buildPost({ renderer, scene, camera, params, sun, rays: { density: 0.5, maxDensity: 0.22, strength: 1.2 } });
window.__camera = camera;

const wp = new THREE.Vector3();
const flicker = (now) => {
  for (const tr of torches) tr.light.intensity = tr.base * (0.82 + 0.1 * Math.sin(now * 11 + tr.seed) + 0.08 * Math.sin(now * 23.7 + tr.seed * 2.3));
};
// the cast, the walls and the room move: re-render the sun's shadow and the torches nearest the subject
const shadowsNear = (p) => {
  sun.shadow.needsUpdate = true;
  const order = torches.map((t) => [t.light.getWorldPosition(wp).distanceTo(p), t]).sort((a, b) => a[0] - b[0]);
  for (const [, t] of order.slice(0, 3)) t.light.shadow.needsUpdate = true;
};

const drawCast = await castMod.mountCast({ renderer, scene, camera, size: FIXED });
const look = new THREE.Vector3();
const setFrame = (f) => {
  const s = anim.storyFrame(f);
  drawCast(s, anim.TRACKS, anim.extrasAt(s));
  props.update(anim.propsAt(s));
  updateFx(s, anim.BURSTS);
  if (drawHud && !params.has("clean")) drawHud(anim.hudAt(f));
  const c = anim.CAMS.threeq(s);
  camera.fov = c.fov;
  camera.position.set(...c.pos);
  camera.lookAt(...c.look);
  camera.updateProjectionMatrix();
  flicker(s / anim.FPS);
  scene.updateMatrixWorld(true);
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
  window.__audio = { sfx: anim.SFX, narrationEnd: anim.NARRATION_END, fps: anim.FPS, episode: "crushing-walls", narration: "../../../out/audio-tmp-crushing-room/narration.wav", score: "score_v2.mp3" };
} else {
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
    hud.textContent = `frame ${f} (story ${anim.storyFrame(f)}) · space pause · ←/→ 1 s`;
  });
}
