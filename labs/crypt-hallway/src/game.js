// Play mode (?play=1): walk the finished dungeon yourself. The film's props, traps and bursts are
// reused as they are: this module only turns keyboard input and trap triggers into the same plain
// state object anim.js propsAt(f) builds from the narration, so a visual fix lands in both.
// Simulation runs at a fixed 30 Hz (the film's frame rate), so ActorView's look-back easing and the
// frame-keyed bursts behave exactly as in the film.
//   catapult  1.2 s on the slab under the light well and it throws you into the Mimic: sprint
//   plate     the hidden pressure plate on the trapdoor drops both flaps into the spike pit (and so
//             does lingering on the false floor)
//   burners   stepping up to a rim arms the oil tank; both rims burst into flame
//   pendulums two gear-driven blades swipe across the trapdoor nonstop, a quarter swing apart: one
//             narrow gap per swing (about 11 frames in a usable lane) to get through both
//   mimic     it lunges at anything that walks past: sprint by
// Every trap can be beaten by every class, with timing or with the class's own move:
//   rogue    E dash (a short burst with i-frames, 2.5 s cooldown), the best jump
//   mage     E freeze the trapdoor (fire melts it), Q blink 2.4 m (3 s cooldown)
//   paladin  hold E shield: fireproof, pins you to the catapult, blocks one blade or bite (and
//            breaks), 3 s of stamina
import { PIT, PLATE_S, ICE_Y, FLAP_OPEN, PENDULUM, SLAB, MIMIC, TANK, MIMIC_MOUTH } from "./anim.js";
import * as THREE from "three/webgpu";
import { walkable } from "./walk.js";
import { WALL_X, BAY } from "./hall.js";
import { ironMaterial } from "./materials.js";
import { CHAR_SCALE_VALUE, FACE_RIGHT } from "./castConsts.js";

const FPS = 30, DT = 1 / FPS, G = 9.8;
const START_S = 24.5, GOAL_S = 8.2;
const NEAR_S = PIT.s - PIT.hl, FAR_S = PIT.s + PIT.hl;
const RIMS = [NEAR_S - 0.14, FAR_S + 0.14]; // burner pipes (traps.js)
const LANE = [9, 21], LANE_X = 1.95;        // the trap run is fenced to the nave (buildFence)
const SPIKES_Y = -0.62;                      // where a body comes to rest on the spike tips
const HIP = 0.95 * CHAR_SCALE_VALUE;
const BLADE_R = PENDULUM.len - 0.45 + 0.95;  // pivot to the blade's lowest edge
const PERIOD = 72;                           // pendulum: frames per full swing
const SWING = PENDULUM.amp;                  // swing amplitude, across the nave (as in the film)
// Two blades, 0.9 m apart (no safe strip between them), hung from opposite sides, the second a
// quarter swing behind. Tuned by brute force over lanes, speeds and start frames: the widest gap is
// 12 frames, twice per cycle, near the middle lane; elsewhere it's narrower or shut.
const BLADES = [{ s: PENDULUM.s, side: -1, lag: 0 }, { s: PENDULUM.s - 0.9, side: 1, lag: PERIOD / 4 }];
export const BLADE_S = BLADES.map((b) => b.s); // where traps.js hangs them
const BLADE_HW = 1.1, BLADE_DEPTH = 0.45;    // hit box: blade half-width (0.85) + body, and along the hall
const MIMIC_R = 0.95;                        // touching distance (chest half-width + body)
const SLAB_FUSE = 36;                        // frames on the catapult slab before it fires
const DASH = { frames: 7, speed: 7.5, cooldown: 75 };   // rogue: ~1.75 m, invulnerable while dashing
const BLINK = { dist: 2.4, cooldown: 90 };              // mage
const SHIELD = { stamina: 90, recharge: 120 };          // paladin: frames held / frames to recover a break
const LUNGE = { range: 2.6, tell: 12, lock: 4, hop: 8, reach: 1.6, sit: 30, back: 16, bite: 1.25 }; // the Mimic

const CLASS_SCALE = { rogue: 1, mage: 1, paladin: 1.06 };
const CLASSES = {
  rogue: { walk: 2.7, run: 4.6, jump: 5.4, ability: "E dash (dodges everything) · best jump" },
  mage: { walk: 2.7, run: 4.2, jump: 4.4, ability: "E freeze the trapdoor · Q blink 2.4 m" },
  paladin: { walk: 2.5, run: 3.8, jump: 4.0, ability: "hold E shield: fireproof, anchors, blocks one hit" },
};
const DEATHS = {
  spikes: "SKEWERED", fire: "FLAMBÉED", blade: "SLICED", mimic: "EATEN", launch: "LAUNCHED… AND EATEN",
};

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const prog = (f, a, b) => clamp01((f - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIn = (t) => t * t;
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const overPit = (x, s) => Math.abs(x) < PIT.hw && Math.abs(s - PIT.s) < PIT.hl;
const lieHeight = (cls) => 0.2 * CHAR_SCALE_VALUE * CLASS_SCALE[cls];

// Ep1's procedural SFX, served by Vite from the repo's public folder
const SFX_URLS = import.meta.glob("../../../public/episodes/dungeon-trap-v2/sfx/*.wav", { query: "?url", import: "default", eager: true });
function createSound() {
  let ctx = null;
  const bufs = new Map();
  const urls = {};
  for (const k of Object.keys(SFX_URLS)) urls[k.split("/").pop().replace(".wav", "")] = SFX_URLS[k];
  const unlock = () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
  };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
  const load = (name) => {
    if (!bufs.has(name)) {
      bufs.set(name, fetch(urls[name]).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).catch(() => null));
    }
    return bufs.get(name);
  };
  return (name, vol = 0.5) => {
    if (!ctx || !urls[name]) return;
    load(name).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.value = Math.min(1, vol);
      src.connect(gain).connect(ctx.destination);
      src.start();
    });
  };
}

// Iron grilles between the nave columns along the trap run, so there's no way round through the
// aisles (blocked() enforces it): bars hang from a top rail, so they also stand over the open pit
export function buildFence(scene) {
  const iron = ironMaterial();
  const bars = [];
  for (const sx of [-1, 1]) for (let s0 = LANE[0]; s0 < LANE[1] - 0.1; s0 += BAY) {
    for (let s = s0 + 0.42; s < s0 + BAY - 0.4; s += 0.2) {
      if (BLADES.every((b) => Math.abs(s - b.s) > 0.3)) bars.push([sx * WALL_X, s]); // slots for the blades to swing through
    }
  }
  const H = 2.3;
  const barMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, H, 6).translate(0, H / 2, 0), iron, bars.length);
  const m = new THREE.Matrix4();
  bars.forEach(([x, s], i) => barMesh.setMatrixAt(i, m.makeTranslation(x, 0.02, -s)));
  barMesh.castShadow = barMesh.receiveShadow = true;
  scene.add(barMesh);
  for (const sx of [-1, 1]) for (const y of [0.06, 1.15, H]) {
    const len = LANE[1] - LANE[0];
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), iron);
    rail.position.set(sx * WALL_X, y, -(LANE[0] + len / 2));
    rail.castShadow = true;
    scene.add(rail);
  }
}

export function createGame({ camera, canvas, classType = "rogue", picker = false }) {
  const play = createSound();
  const keys = new Set();
  let camYaw = Math.PI, camPitch = 0.3, dragging = false;
  canvas.addEventListener("click", () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {}); });
  canvas.addEventListener("mousedown", () => { dragging = true; });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== canvas && !dragging) return;
    camYaw -= e.movementX * 0.0025;
    camPitch = Math.max(-0.1, Math.min(1.1, camPitch + e.movementY * 0.0025));
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());
  const pressed = new Set(); // key-downs since the last step

  // --- HUD --------------------------------------------------------------------------------------
  const hud = document.createElement("div");
  Object.assign(hud.style, {
    position: "fixed", left: "14px", top: "12px", color: "#f3e6cc", font: "600 15px/1.45 system-ui, sans-serif",
    textShadow: "0 1px 3px #000", pointerEvents: "none", whiteSpace: "pre",
  });
  const banner = document.createElement("div");
  Object.assign(banner.style, {
    position: "fixed", left: "0", right: "0", top: "36%", textAlign: "center", color: "#ffd84d",
    font: "900 clamp(34px, 7vw, 84px)/1.05 system-ui, sans-serif", letterSpacing: "0.04em",
    textShadow: "0 4px 0 #3a1406, 0 0 24px #000", pointerEvents: "none", opacity: "0", transition: "none",
  });
  const sub = document.createElement("div");
  Object.assign(sub.style, { font: "600 clamp(14px, 2.4vw, 22px)/1.4 system-ui, sans-serif", color: "#f3e6cc", letterSpacing: "0.02em", marginTop: "10px" });
  const bannerText = document.createElement("div");
  banner.append(bannerText, sub);
  document.body.append(hud, banner);

  // --- state ------------------------------------------------------------------------------------
  let F = 1000; // game frame (starts high so ActorView's look-back never goes negative)
  let acc = 0;
  let deaths = 0, life = 0, runStart = F;
  const history = new Map(); // frame -> the player's Actor (ActorView eases from it)
  const corpses = [];
  const bursts = [];
  const trap = {
    plateAt: -1e9, plateHeld: false,
    fireAt: -1e9,
    iceAt: -1e9, melt: 0, iceGone: true,
    still: 0, launchAt: -1e9,
    onFlaps: 0, // frames stood on the false floor
    lidOpenAt: -1e9, chompAt: -1e9, burpAt: -1e9, ate: false,
    // the Mimic's lunge: where it sits and hops (it starts at home)
    mx: MIMIC.x, ms: MIMIC.s, my: 0, lunge: null,
  };
  const disabled = new Set(); // tests switch single traps off (__game.disable(["blades", ...]))
  const p = {}; // the player
  let cls = classType;

  function spawn() {
    life++;
    Object.assign(p, {
      x: 0, s: START_S, y: 0, vx: 0, vs: 0, vy: 0, yaw: Math.PI, grounded: true,
      state: "alive", since: F, reason: null, castAt: -1e9, flight: null,
      dashUntil: -1e9, dashReady: F, blinkReady: F, iUntil: -1e9, // abilities
      shieldHeld: 0, shieldBrokenUntil: -1e9, dashDir: [0, -1], staggerUntil: -1e9,
    });
    camYaw = Math.PI;
    history.clear();
    trap.still = 0;
    showBanner(null);
    play("pop", 0.3);
  }
  function restart() {
    deaths = 0;
    runStart = F;
    corpses.length = 0;
    spawn();
  }

  let bannerUntil = 0;
  function showBanner(text, detail = "", frames = 1e9) {
    bannerText.textContent = text ?? "";
    sub.textContent = detail;
    banner.style.opacity = text ? "1" : "0";
    bannerUntil = F + frames;
  }

  const burst = (b) => bursts.push({ ...b, at: b.at ?? F });
  const near = (x, s, vol, range = 18) => vol * clamp01(1 - Math.hypot(x - p.x, s - p.s) / range) ** 0.7;

  // --- trap clocks (all pure functions of F and the trigger frames) -------------------------------
  const FLAP_HOLD = 45;
  function flapAngle(f = F) {
    const d = f - trap.plateAt;
    if (d < 0 || d >= FLAP_HOLD + 14) return 0;
    const o = -FLAP_OPEN * easeOutBack(prog(d, 0, 7), 1.2);
    return d < FLAP_HOLD ? o : lerp(o, 0, easeInOut(prog(d, FLAP_HOLD, FLAP_HOLD + 14)));
  }
  const floorOpen = () => flapAngle() < -0.25;
  const iceLevel = () => (trap.iceGone ? 0 : easeInOut(prog(F, trap.iceAt + 4, trap.iceAt + 30)));
  const frozen = () => iceLevel() > 0.98 && trap.melt < 0.6;

  const FUSE = 22, BURN = 45, COOL = 70;
  const LINGER = 90; // frames on the false floor before it drops you (outlasts one burn)
  function fireLevel() {
    const d = F - trap.fireAt - FUSE;
    if (d < 0 || d > BURN + 8) return 0;
    return Math.min(1, d / 5) * (d > BURN ? 1 - (d - BURN) / 8 : 1);
  }
  // the blades never stop: each swings from its own side, the second a quarter swing behind
  const pendulumAngle = (i, f = F) => SWING * Math.cos((2 * Math.PI * (f - BLADES[i].lag)) / PERIOD);
  const bladeAt = (i, f = F) => { // blade i's lowest edge, swinging across x at BLADES[i].s
    const a = pendulumAngle(i, f);
    return { x: BLADES[i].side * BLADE_R * Math.sin(a), y: PENDULUM.y - BLADE_R * Math.cos(a) };
  };
  function slabAngle() {
    const d = F - trap.launchAt;
    if (d < 0) return 0;
    if (d < 50) return 0.95 * easeOutCubic(prog(d, 0, 7));
    return 0.95 * (1 - easeInOut(prog(d, 50, 74)));
  }
  function counterweight() {
    const d = F - trap.launchAt;
    if (d < 74) return d < -2 ? 4.4 : lerp(4.4, 1.1, easeIn(prog(d, -2, 3)));
    return lerp(1.1, 4.4, easeInOut(prog(d, 74, 120))); // winched back up
  }
  function mimicLid() {
    const near2 = Math.hypot(p.x - trap.mx, p.s - trap.ms);
    if (F >= trap.burpAt && F < trap.burpAt + 12) return 0.5 * Math.sin(Math.PI * prog(F, trap.burpAt, trap.burpAt + 12));
    if (F >= trap.lidOpenAt && F < trap.chompAt) return 1.75 * easeOutBack(prog(F, trap.lidOpenAt, trap.lidOpenAt + 6));
    if (F >= trap.chompAt && F < trap.chompAt + 3) return 1.75 * (1 - prog(F, trap.chompAt, trap.chompAt + 3));
    if (F >= trap.chompAt && F < trap.chompAt + 90) return 0.12 * Math.max(0, Math.sin((F - trap.chompAt - 3) * 0.5)) * Math.exp(-(F - trap.chompAt) / 40);
    // licks its lips when you come close
    return p.state === "alive" && near2 < 3.2 ? 0.18 * (1 - near2 / 3.2) * (0.6 + 0.4 * Math.sin(F * 0.35)) : 0;
  }

  // --- triggers ---------------------------------------------------------------------------------
  function pressPlate() {
    if (frozen()) { // the plate clicks... and the ice holds the flaps shut
      play("click", 0.4);
      burst({ kind: "glints", end: F + 16, pos: [0, 0.15, -PLATE_S], box: [0.4, 0.05, 0.4], n: 10, tint: "ice" });
      trap.plateAt = -1e9;
      trap.iceClick = F;
      return;
    }
    if (F - trap.plateAt < FLAP_HOLD + 14) return;
    trap.plateAt = F + 6; // click, a beat, then the floor goes
    play("click", 0.55);
    setTimeoutFrames(6, () => {
      play("trap_open", 0.5);
      burst({ kind: "dust", pos: [0, 0, -PIT.s], box: [PIT.hw * 0.85, 0, 0.06], n: 40 });
    });
    setTimeoutFrames(6 + FLAP_HOLD, () => play("ratchet", 0.3));
    setTimeoutFrames(6 + FLAP_HOLD + 14, () => {
      play("trap_close", 0.4);
      burst({ kind: "dust", pos: [0, 0.03, -PIT.s], box: [PIT.hw * 0.85, 0, 0.06], n: 40 });
    });
  }
  function armBurners() {
    if (F - trap.fireAt < FUSE + BURN + COOL) return;
    trap.fireAt = F;
    play("hydraulic", 0.3);
    setTimeoutFrames(FUSE, () => {
      play("ignite", 0.55);
      play("fire_loop", 0.35);
      for (const s of RIMS) burst({ kind: "glints", end: F + BURN, pos: [0, 0.9, -s], box: [2.2, 0.6, 0.15], n: 40, tint: "fire" });
    });
  }
  const timers = [];
  const setTimeoutFrames = (n, fn) => timers.push({ at: F + n, fn });

  function die(reason, corpse) {
    if (p.state === "dead") return;
    p.state = "dead";
    p.since = F;
    p.reason = reason;
    deaths++;
    if (corpse) {
      corpses.push({ id: `c${life}`, cls, ...corpse, settle: F });
      if (corpses.length > 10) corpses.shift();
    }
    showBanner(DEATHS[reason], `death #${deaths} · respawning…`);
  }

  // --- the player's step --------------------------------------------------------------------------
  function floorAt(x, s) {
    if (overPit(x, s)) {
      if (frozen()) return ICE_Y;
      return floorOpen() ? -Infinity : 0;
    }
    return 0;
  }
  function blocked(x, s) {
    if (!walkable(x, s)) return true;
    if (s > LANE[0] && s < LANE[1] && Math.abs(x) > LANE_X) return true;
    if (Math.hypot(x - TANK[0], s - TANK[1]) < 0.8) return true;
    return false;
  }

  function stepAlive() {
    const k = CLASSES[cls];
    const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    // paladin: the shield holds for SHIELD.stamina frames, then breaks; a break takes a while to mend
    const wantShield = cls === "paladin" && keys.has("KeyE") && p.grounded && F >= p.shieldBrokenUntil;
    p.shieldHeld = wantShield ? p.shieldHeld + 1 : Math.max(0, p.shieldHeld - 2);
    if (p.shieldHeld > SHIELD.stamina) breakShield();
    const shielding = wantShield && F >= p.shieldBrokenUntil;
    const dashing = F < p.dashUntil;
    const invulnerable = dashing || F < p.iUntil;
    const running = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && !shielding;
    const speed = shielding ? 1.6 : running ? k.run : k.walk;
    let tx = 0, ts = 0;
    if ((f || r) && F >= p.staggerUntil) { // a blocked hit staggers you: no control for a moment
      const n = Math.hypot(f, r);
      const fx = -Math.sin(camYaw), fs = Math.cos(camYaw), rx = Math.cos(camYaw), rs = Math.sin(camYaw);
      tx = ((fx * f + rx * r) / n) * speed;
      ts = ((fs * f + rs * r) / n) * speed;
    }
    const grip = p.grounded ? 14 : 2.5;
    if (tx || ts) { const n = Math.hypot(tx, ts); p.dashDir = [tx / n, ts / n]; }
    if (dashing) { // the rogue's burst: fixed speed along the dash direction
      p.vx = p.dashDir[0] * DASH.speed; p.vs = p.dashDir[1] * DASH.speed;
    } else {
      p.vx += (tx - p.vx) * Math.min(1, grip * DT);
      p.vs += (ts - p.vs) * Math.min(1, grip * DT);
    }
    // slide along obstacles: each axis on its own
    if (!blocked(p.x + p.vx * DT, p.s)) p.x += p.vx * DT; else p.vx = 0;
    if (!blocked(p.x, p.s + p.vs * DT)) p.s += p.vs * DT; else p.vs = 0;
    const hs = Math.hypot(p.vx, p.vs);
    if (hs > 0.3) {
      const want = Math.atan2(p.vx, -p.vs); // world dz = -ds
      const d = wrap(want - p.yaw);
      p.yaw = wrap(p.yaw + Math.sign(d) * Math.min(Math.abs(d), 12 * DT));
    }

    if (pressed.has("Space") && p.grounded) {
      p.vy = k.jump;
      p.grounded = false;
      play("whoosh", 0.18);
      burst({ kind: "dust", pos: [p.x, 0.02, -p.s], n: 10, size: 0.6 });
    }
    if (cls === "rogue" && pressed.has("KeyE") && F >= p.dashReady) {
      p.dashUntil = F + DASH.frames; p.dashReady = F + DASH.cooldown;
      play("whoosh", 0.35);
      burst({ kind: "dust", pos: [p.x, 0.05, -p.s], n: 14, size: 0.7 });
    }
    if (cls === "mage" && pressed.has("KeyQ") && F >= p.blinkReady) {
      const [dx, ds] = p.dashDir;
      const to = [p.x + dx * BLINK.dist, p.s + ds * BLINK.dist];
      if (!blocked(to[0], to[1])) {
        burst({ kind: "glints", end: F + 10, pos: [p.x, 1.0, -p.s], box: [0.3, 0.7, 0.3], n: 18, tint: "ice" });
        p.x = to[0]; p.s = to[1]; p.iUntil = F + 3; p.blinkReady = F + BLINK.cooldown;
        play("zap", 0.45);
        burst({ kind: "glints", end: F + 12, pos: [p.x, 1.0, -p.s], box: [0.3, 0.7, 0.3], n: 18, tint: "ice" });
      } else play("sparkle", 0.2);
    }
    if (cls === "mage" && pressed.has("KeyE") && F - p.castAt > 40) {
      p.castAt = F;
      const toPit = Math.abs(p.s - PIT.s);
      if (toPit < PIT.hl + 3.5 && (trap.iceGone || trap.melt > 0)) {
        trap.iceAt = F; trap.iceGone = false; trap.melt = 0;
        play("ice", 0.5);
        const staff = [p.x + 0.35 * Math.cos(p.yaw), 1.5, -p.s - 0.35 * Math.sin(p.yaw)];
        burst({ kind: "stream", end: F + 26, pos: staff, to: [0, 0.1, -PIT.s], n: 70 });
        setTimeoutFrames(30, () => {
          play("crack", 0.4);
          burst({ kind: "shards", pos: [0, 0.08, -PIT.s], box: [PIT.hw * 0.7, 0, PIT.hl * 0.8], n: 70 });
        });
      } else play("sparkle", 0.25); // nothing to freeze here
    }

    // vertical
    const floor = floorAt(p.x, p.s);
    p.vy -= G * DT;
    p.y += p.vy * DT;
    if (Number.isFinite(floor) && p.y <= floor) {
      if (!p.grounded && p.vy < -3) {
        play("thud", 0.2);
        burst({ kind: "dust", pos: [p.x, floor + 0.02, -p.s], n: 14, size: 0.7 });
      }
      p.y = floor; p.vy = 0; p.grounded = true;
    } else if (!Number.isFinite(floor) && p.grounded && p.vy <= 0) {
      p.grounded = false; // the floor went
    } else if (p.y > floor + 0.02) p.grounded = false;
    if (p.y < -0.15 && overPit(p.x, p.s)) { p.state = "falling"; p.since = F; return; }

    // --- traps --------------------------------------------------------------------------------
    const onFeet = p.grounded;
    // pressure plate
    const onPlate = onFeet && !dashing && !disabled.has("plate") && Math.abs(p.x) < 0.45 && Math.abs(p.s - PLATE_S) < 0.45;
    if (onPlate && !trap.plateHeld) pressPlate();
    trap.plateHeld = onPlate;
    // the false floor won't hold you for long: linger on the flaps and they creak, sag and give way
    const onFlaps = onFeet && !disabled.has("linger") && overPit(p.x, p.s) && !frozen() && flapAngle() === 0;
    trap.onFlaps = onFlaps ? trap.onFlaps + 1 : 0;
    if (trap.onFlaps === LINGER - 36) play("ratchet", 0.3);
    if (trap.onFlaps === LINGER - 14) play("crack", 0.3);
    if (trap.onFlaps >= LINGER) { trap.onFlaps = 0; trap.plateAt = -1e9; pressPlate(); }
    // burners arm as soon as you're on the trapdoor or its rims
    if (!disabled.has("fire") && RIMS.some((r) => Math.abs(p.s - r) < 0.6)) armBurners(); // stepping up to either rim
    const fire = fireLevel();
    if (fire > 0.4 && !shielding && !invulnerable && p.y < 0.9 * fire && RIMS.some((s) => Math.abs(p.s - s) < 0.38)) {
      play("sizzle", 0.5);
      burst({ kind: "sparks", pos: [p.x, 0.8, -p.s], n: 30, tint: "fire" });
      die("fire", { x: p.x, s: p.s, y: 0, yaw: FACE_RIGHT, tilt: Math.PI / 2, onFlap: overPit(p.x, p.s) });
      return;
    }
    // the pendulums: timing, a dash, a blink, or one hit on the shield
    const hitBy = disabled.has("blades") || invulnerable ? -1 : BLADES.findIndex((bl, k) => {
      const b = bladeAt(k);
      return Math.abs(p.s - bl.s) < BLADE_DEPTH && Math.abs(p.x - b.x) < BLADE_HW && b.y < p.y + 1.75 && b.y + 0.7 > p.y;
    });
    if (hitBy >= 0 && shielding) { // the shield takes it: you're thrown back the way you came and it breaks
      play("clang", 0.6);
      play("helmet", 0.4);
      burst({ kind: "sparks", pos: [p.x, p.y + 1.1, -p.s], n: 60 });
      breakShield();
      p.vs = 6; p.vx = 0; p.vy = 2.2; p.grounded = false; p.iUntil = F + 20; p.staggerUntil = F + 14;
    } else if (hitBy >= 0) {
      const b = bladeAt(hitBy);
      const dir = Math.sign(bladeAt(hitBy, F + 1).x - b.x) || 1;
      play("clang", 0.6);
      burst({ kind: "sparks", pos: [p.x, p.y + 1.1, -p.s], n: 60 });
      p.state = "knocked"; p.since = F;
      p.vx = dir * 5.5; p.vs = (p.s >= BLADES[hitBy].s ? 1 : -1) * 0.6; p.vy = 3.6; p.grounded = false; // swatted sideways
      p.reason = "blade";
      return;
    }
    // catapult slab: it counts the frames you're on it (feet down, not dashing); a shield pins you
    const onSlab = !disabled.has("catapult") && Math.abs(p.x) < SLAB.hw && p.s > SLAB.s0 && p.s < SLAB.s1;
    if (!onSlab || F - trap.launchAt < 120) trap.still = 0;
    else if (onFeet && !dashing && !shielding) trap.still++;
    if (trap.still === 12) play("rumble", 0.35);
    if (trap.still >= SLAB_FUSE) launch();
    // the Mimic: lunges at you (see stepMimic); touching it is the end too
    if (stepMimic(shielding, invulnerable)) return;
    // touching it while it sits still is the end; mid-lunge only the bite counts (and a shield stops it)
    if (!disabled.has("mimic") && !invulnerable && !shielding && !trap.lunge && Math.hypot(p.x - trap.mx, p.s - trap.ms) < MIMIC_R + 0.3) {
      trap.lidOpenAt = F - 2; trap.chompAt = F + 4; trap.ate = true;
      play("growl", 0.4);
      p.state = "grabbed"; p.since = F;
      return;
    }
    if (p.s < GOAL_S) {
      p.state = "won"; p.since = F;
      play("stamp", 0.6);
      play("boom", 0.3);
      showBanner("ESCAPED!", `${deaths} death${deaths === 1 ? "" : "s"} · ${((F - runStart) / FPS).toFixed(1)} s · R to run it again`);
    }
  }

  function breakShield() {
    p.shieldBrokenUntil = F + SHIELD.recharge;
    p.shieldHeld = 0;
    play("crack", 0.35);
  }

  // The Mimic notices anything within LUNGE.range, opens up (the tell), locks onto where you are
  // LUNGE.lock frames before it hops, hops up to LUNGE.reach toward that spot and bites. Walking past
  // gets you eaten; sprinting, a dash, a blink or a shield gets you by. Returns true if it bit.
  function stepMimic(shielding, invulnerable) {
    if (disabled.has("mimic")) return false;
    const L = trap.lunge;
    const home = [MIMIC.x, MIMIC.s];
    if (!L) {
      if (Math.hypot(p.x - trap.mx, p.s - trap.ms) < LUNGE.range) {
        trap.lunge = { at: F, from: [trap.mx, trap.ms] };
        trap.lidOpenAt = F; trap.chompAt = F + LUNGE.tell + LUNGE.hop; trap.ate = false;
        play("growl", 0.4);
      }
      return false;
    }
    const d = F - L.at;
    if (d === LUNGE.tell - LUNGE.lock) { // locks on
      const dx = p.x - L.from[0], ds = p.s - L.from[1], n = Math.hypot(dx, ds) || 1, k = Math.min(1, LUNGE.reach / n);
      L.to = [L.from[0] + dx * k, L.from[1] + ds * k];
    }
    if (L.to && d >= LUNGE.tell && d < LUNGE.tell + LUNGE.hop) { // the hop
      const u = (d - LUNGE.tell + 1) / LUNGE.hop;
      trap.mx = lerp(L.from[0], L.to[0], u); trap.ms = lerp(L.from[1], L.to[1], u); trap.my = 0.6 * Math.sin(Math.PI * u);
    }
    if (d === LUNGE.tell + LUNGE.hop - 1) { // the bite
      trap.my = 0;
      play("thud", 0.4);
      burst({ kind: "dust", pos: [trap.mx, 0.03, -trap.ms], n: 20 });
      if (Math.hypot(p.x - trap.mx, p.s - trap.ms) < LUNGE.bite && !invulnerable) {
        if (shielding) { // teeth on steel: it recoils, you're shoved back, the shield breaks
          play("clang", 0.6);
          burst({ kind: "sparks", pos: [p.x, 1.0, -p.s], n: 40 });
          breakShield();
          p.vx = 0; p.vs = (p.s >= trap.ms ? 1 : -1) * 4; p.vy = 2; p.grounded = false; // shoved back along the hall
          p.iUntil = F + 20; p.staggerUntil = F + 10;
          L.stunned = true;
        } else {
          trap.ate = true;
          p.state = "grabbed"; p.since = F;
          return true;
        }
      }
    }
    const back0 = LUNGE.tell + LUNGE.hop + LUNGE.sit + (L.stunned ? 30 : 0);
    if (d >= back0) { // waddles home
      const u = prog(d, back0, back0 + LUNGE.back);
      if (!L.back) L.back = [trap.mx, trap.ms];
      trap.mx = lerp(L.back[0], home[0], u); trap.ms = lerp(L.back[1], home[1], u); trap.my = 0.25 * Math.abs(Math.sin(Math.PI * u * 3));
      if (u >= 1) { trap.lunge = null; trap.my = 0; }
    }
    return false;
  }

  function launch() {
    trap.launchAt = F;
    trap.still = 0;
    play("launch", 0.6);
    burst({ kind: "dust", pos: [0, 0.1, -17.5], box: [SLAB.hw, 0, 1.6], n: 60 });
    const start = [p.x, p.y, p.s];
    const dur = 34;
    p.state = "launched"; p.since = F;
    p.flight = { start, dur };
    trap.lidOpenAt = F + dur - 10;
    trap.chompAt = F + 3 + dur + 2; trap.ate = true;
    setTimeoutFrames(4, () => play("whoosh_big", 0.45));
    setTimeoutFrames(dur - 10, () => play("growl", 0.3));
  }

  function step() {
    F++;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= F) { const t = timers.splice(i, 1)[0]; t.fn(); }
    if (pressed.has("KeyR")) { restart(); pressed.clear(); }
    for (const [code, c] of [["Digit1", "rogue"], ["Digit2", "mage"], ["Digit3", "paladin"]]) {
      if (pressed.has(code) && c !== cls) { cls = c; spawn(); }
    }

    if (p.state === "alive") stepAlive();
    else if (p.state === "falling" || p.state === "knocked") {
      p.vy -= G * DT;
      p.y += p.vy * DT;
      p.x += p.vx * DT;
      p.s += p.vs * DT;
      if (p.state === "falling" || overPit(p.x, p.s)) { // inside the pit the liner walls hold you
        p.x = Math.max(-PIT.hw + 0.3, Math.min(PIT.hw - 0.3, p.x));
        p.s = Math.max(NEAR_S + 0.3, Math.min(FAR_S - 0.3, p.s));
      }
      if (blocked(p.x, p.s) && !overPit(p.x, p.s)) { p.vx = 0; p.vs = 0; }
      if (p.s > LANE[0] && p.s < LANE[1] && Math.abs(p.x) > LANE_X) { p.x = Math.sign(p.x) * LANE_X; p.vx = 0; } // the grilles stop you
      const floor = floorAt(p.x, p.s);
      if (p.state === "falling" && p.y <= SPIKES_Y) {
        play("spike", 0.55);
        play("thud", 0.35);
        burst({ kind: "sparks", pos: [p.x, -0.5, -p.s], n: 34 });
        burst({ kind: "dust", pos: [p.x, -0.55, -p.s], n: 18 });
        die(p.reason ?? "spikes", { x: p.x, s: p.s, y: SPIKES_Y, yaw: FACE_RIGHT, tilt: Math.PI / 2, onFlap: false });
      } else if (p.state === "knocked" && Number.isFinite(floor) && p.y <= floor && p.vy < 0) {
        play("thud", 0.4);
        play("helmet", 0.3);
        burst({ kind: "dust", pos: [p.x, floor + 0.02, -p.s], n: 18 });
        die("blade", { x: p.x, s: p.s, y: floor, yaw: FACE_RIGHT, tilt: -Math.PI / 2, onFlap: overPit(p.x, p.s) });
      } else if (p.state === "knocked" && !Number.isFinite(floor) && p.y < -0.15) {
        p.state = "falling";
      }
    } else if (p.state === "launched") {
      const { start, dur } = p.flight;
      const u = prog(F, p.since + 3, p.since + 3 + dur);
      if (F < p.since + 3) p.y = Math.sin(slabAngle()) * (start[2] - SLAB.s0);
      if (u >= 1) {
        play("thud", 0.3);
        burst({ kind: "dust", pos: [MIMIC.x, 1.3, -MIMIC.s], n: 12, size: 0.6 });
        die("launch", null);
      }
    } else if (p.state === "grabbed" && F >= trap.chompAt) {
      die("mimic", null);
    } else if (p.state === "dead" && F - p.since > 55) spawn();
    // the Mimic's meal
    if (F === trap.chompAt) {
      play("chomp", 0.6);
      burst({ kind: "sparks", pos: [trap.mx, 1.0, -(trap.ms - 0.3)], n: 30, tint: "splinter" });
      if (trap.ate) setTimeoutFrames(8, () => play("chew", 0.4));
      if (trap.ate) trap.burpAt = F + 60;
      if (trap.ate) setTimeoutFrames(60, () => {
        play("burp", 0.5);
        burst({ kind: "glints", end: F + 24, pos: [trap.mx, 1.4, -(trap.ms - 0.2)], box: [0.4, 0.3, 0.3], n: 16, tint: "burp" });
      });
    }
    if (trap.launchAt === F - 2) play("thud", 0.45); // counterweight bottoms out

    // fire melts the ice; once it's slush the floor goes (the frying pan)
    if (!trap.iceGone) {
      const fire = fireLevel();
      if (fire > 0.3) {
        if (trap.melt === 0) play("sizzle", 0.4);
        trap.melt = Math.min(1, trap.melt + DT / 1.6);
        if (trap.melt >= 1) {
          trap.iceGone = true; trap.melt = 0;
          play("crack", 0.35);
          burst({ kind: "shards", pos: [0, 0.05, -PIT.s], box: [PIT.hw * 0.6, 0, PIT.hl * 0.7], n: 60 });
          trap.plateAt = -1e9;
          pressPlate();
        }
      } else if (F - trap.iceAt > 20 * FPS) { trap.iceGone = true; trap.melt = 0; } // thaws on its own
    }
    // pendulum whoosh on each pass, when you're close enough to hear it
    for (const [k, bl] of BLADES.entries()) {
      if (Math.sign(pendulumAngle(k, F - 1)) !== Math.sign(pendulumAngle(k, F))) play("whoosh_big", near(0, bl.s, 0.25, 12));
    }
    // corpses on the trapdoor drop in when it opens
    for (const c of corpses) {
      if (c.onFlap && floorOpen()) { c.onFlap = false; c.dropAt = F; c.y0 = c.y; }
    }

    // the player's Actor this frame
    history.set(F, playerActor());
    history.delete(F - 30);
    pressed.clear();
    for (let i = bursts.length - 1; i >= 0; i--) if (F - (bursts[i].end ?? bursts[i].at) > 120) bursts.splice(i, 1);
    if (bannerUntil < F) showBanner(null);
  }

  function playerActor() {
    const at = [p.x, p.y, -p.s];
    const k = CLASSES[cls];
    switch (p.state) {
      case "alive": {
        const hs = Math.hypot(p.vx, p.vs);
        if (cls === "mage" && F - p.castAt < 22) return { pose: "cast", position: at, yaw: p.yaw, expression: "focus" };
        if (!p.grounded) return { pose: "jump", position: at, yaw: p.yaw, expression: "focus" };
        const shield = cls === "paladin" && keys.has("KeyE") && F >= p.shieldBrokenUntil;
        if (F < p.dashUntil) return { pose: "run", position: at, yaw: p.yaw, speed: 3, expression: "focus" };
        const danger = fireLevel() > 0 || Math.abs(p.s - PIT.s) < PIT.hl + 0.5;
        const expression = trap.still > 12 ? "shock" : danger ? "focus" : undefined;
        if (shield) return { pose: hs > 0.4 ? "shieldWalk" : "shield", position: at, yaw: p.yaw, speed: hs > 0.4 ? 0.7 : 1, expression: "focus" };
        if (hs > (k.walk + k.run) / 2) return { pose: "run", position: at, yaw: p.yaw, speed: 2 * (k.run / 4.2), expression };
        if (hs > 0.4) return { pose: "walk", position: at, yaw: p.yaw, speed: k.walk / 2.7, expression };
        return { pose: "idle", position: at, yaw: p.yaw, expression };
      }
      case "falling":
        return { pose: "fall", position: at, yaw: p.yaw, expression: "scared" };
      case "knocked":
        return { pose: "fall", position: at, yaw: p.yaw, tilt: -Math.PI * 1.5 * prog(F, p.since, p.since + 22), pivot: HIP, expression: "pain" };
      case "grabbed":
        return { pose: "cower", position: at, yaw: Math.atan2(trap.mx - p.x, p.s - trap.ms), expression: "scared" };
      case "launched": {
        const { start, dur } = p.flight;
        const t0 = p.since + 3;
        if (F < t0) return { pose: "launch", position: [start[0], p.y, -start[2]], yaw: p.yaw, expression: "shock" };
        const u = prog(F, t0, t0 + dur);
        const lift = 3.8 - MIMIC_MOUTH[1] / 2;
        return {
          pose: "launch",
          position: [lerp(start[0], MIMIC_MOUTH[0], u), lerp(start[1], MIMIC_MOUTH[1], u) + 4 * lift * u * (1 - u) - HIP, lerp(-start[2], MIMIC_MOUTH[2], u)],
          yaw: p.yaw + u * 1.5, tilt: -u * Math.PI * 3.2, pivot: HIP, scale: u < 0.85 ? 1 : 1 - (u - 0.85) * 5, expression: "scared",
        };
      }
      case "won": {
        const turn = easeInOut(prog(F, p.since, p.since + 8));
        return { pose: F - p.since < 8 ? "idle" : "cheer", position: at, yaw: lerp(p.yaw, wrap(Math.atan2(camera.position.x - p.x, camera.position.z + p.s)), turn), expression: "smug" };
      }
      default:
        return null; // dead (the corpse takes over) or swallowed
    }
  }

  function corpseActor(c, f) {
    let y = c.y;
    if (c.dropAt != null) { const t = (f - c.dropAt) / FPS; y = Math.max(SPIKES_Y, c.y0 - 4.9 * t * t); }
    const since = c.dropAt ?? c.settle;
    const settle = 0.1 * Math.sin(Math.PI * clamp01((f - since) / 7));
    return { pose: "sprawl", position: [c.x, y + lieHeight(c.cls) - HIP + settle, -c.s], yaw: c.yaw, tilt: c.tilt, pivot: HIP, expression: "dead" };
  }

  // --- what the film's props and the cast see -------------------------------------------------
  function propState() {
    const creak = trap.onFlaps > LINGER - 36 ? -0.03 * Math.abs(Math.sin(F * 0.9)) * prog(trap.onFlaps, LINGER - 36, LINGER) : 0;
    const fa = flapAngle() + creak;
    const fire = fireLevel();
    const castAge = F - p.castAt;
    const ice = iceLevel();
    return {
      clock: F,
      pipes: 1, tank: 0,
      gauge: F - trap.fireAt < FUSE + BURN ? prog(F, trap.fireAt, trap.fireAt + FUSE) : 0,
      fire, melt: trap.melt,
      pendulumIn: 1, pendulumAngle: pendulumAngle(0), pendulumAngles: BLADES.map((_, k) => pendulumAngle(k)),
      slabReveal: clamp01(trap.still / 40), slab: slabAngle(), counterweight: counterweight(),
      mimicY: trap.my, mimicX: trap.mx, mimicS: trap.ms, mimicLid: mimicLid(),
      spikesY: 0, flapsY: 0, flapA: fa, flapB: fa,
      chestY: null, chestSwing: 0, chestGlow: 0,
      plateGlow: fa < -0.05 ? 1 : trap.iceClick != null && F - trap.iceClick < 20 ? 0.6 : 0,
      plateDown: trap.plateHeld ? 1 : 0,
      ice, castGlow: cls === "mage" && castAge < 30 ? Math.min(1, castAge / 4) * (castAge > 22 ? 1 - (castAge - 22) / 8 : 1) : 0,
      castPos: [p.x + 0.35 * Math.cos(p.yaw), p.y + 1.5, -p.s - 0.35 * Math.sin(p.yaw)],
    };
  }

  function tracks() {
    const out = [];
    if (p.state !== "dead") out.push({ id: `player${life}`, classType: cls, track: (f) => history.get(f) ?? history.get(F) ?? null });
    for (const c of corpses) out.push({ id: c.id, classType: c.cls, track: (f) => corpseActor(c, f) });
    return out;
  }

  // --- camera: third person, mouse orbits ---------------------------------------------------
  const cam = { x: 0, y: 3, z: -(START_S + 4), lx: 0, ly: 1.2, lz: -START_S };
  function placeCamera(dt) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw); // forward in world xz
    let tx = p.x, ty = p.y + 1.25, tz = -p.s;
    if (p.state === "launched") { const a = playerActor(); tx = a.position[0]; ty = a.position[1] + HIP; tz = a.position[2]; }
    if (p.state === "dead" || p.state === "grabbed") { tx = cam.lx; ty = cam.ly; tz = cam.lz; }
    const dist = p.state === "won" ? 3.4 : 4.4;
    const want = [tx - fx * dist * Math.cos(camPitch), ty + 0.6 + dist * Math.sin(camPitch), tz - fz * dist * Math.cos(camPitch)];
    want[1] = Math.max(0.4, want[1]);
    // pull in along the boom rather than end up inside a column, a wall or the counterweight
    const cwY = counterweight(), cwS = SLAB.s1 + 0.9;
    const solid = (x, y, z) => !walkable(x, -z) || y > 6.2
      || (Math.abs(x) < 0.95 && Math.abs(-z - cwS) < 0.8 && y > cwY - 0.3);
    for (let i = 1; i <= 24; i++) {
      const u = i / 24, q = [tx + (want[0] - tx) * u, ty + (want[1] - ty) * u, tz + (want[2] - tz) * u];
      if (solid(...q)) {
        const b = Math.max(0, (i - 2) / 24);
        for (let k2 = 0; k2 < 3; k2++) want[k2] = [tx, ty, tz][k2] + (want[k2] - [tx, ty, tz][k2]) * b;
        break;
      }
    }
    const k = 1 - Math.exp(-dt * 7);
    cam.x += (want[0] - cam.x) * k; cam.y += (want[1] - cam.y) * k; cam.z += (want[2] - cam.z) * k;
    const kl = 1 - Math.exp(-dt * 12);
    cam.lx += (tx + fx * 1.2 - cam.lx) * kl; cam.ly += (ty - cam.ly) * kl; cam.lz += (tz + fz * 1.2 - cam.lz) * kl;
    if (p.state === "dead" || p.state === "grabbed") { cam.lx = tx; cam.ly = ty; cam.lz = tz; }
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
  }

  // the HUD's ability line: keys, and what's ready
  const cd = (ready) => (F >= ready ? "READY" : `${((ready - F) / FPS).toFixed(1)} s`);
  function abilityLine() {
    if (cls === "rogue") return `E dash (i-frames): ${cd(p.dashReady)}  ·  shift+space long jump`;
    if (cls === "mage") return `E freeze trapdoor: ${cd(p.castAt + 40)}  ·  Q blink 2.4 m: ${cd(p.blinkReady)}`;
    const left = Math.max(0, 1 - p.shieldHeld / SHIELD.stamina);
    const bar = F < p.shieldBrokenUntil ? `BROKEN ${cd(p.shieldBrokenUntil)}` : "█".repeat(Math.ceil(left * 10)).padEnd(10, "░");
    return `hold E shield ${bar}  (fireproof · anchors · blocks one hit)`;
  }

  spawn();
  // start screen: pick a class (the hosted build opens here; ?class= skips it)
  let started = !picker;
  if (picker) {
    const menu = document.createElement("div");
    Object.assign(menu.style, {
      position: "fixed", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "18px", background: "rgba(8,5,3,0.55)", color: "#f3e6cc", font: "600 16px/1.5 system-ui, sans-serif", textAlign: "center", padding: "16px",
    });
    const h = document.createElement("div");
    h.innerHTML = `<div style="font:900 clamp(28px,6vw,64px)/1.05 system-ui,sans-serif;color:#ffd84d;text-shadow:0 4px 0 #3a1406">EVOLUTION OF A<br>DUNGEON TRAP</div>
      <div style="margin-top:10px">Five traps stand between you and the far end of the hall. Pick your adventurer.</div>`;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" });
    for (const c of ["rogue", "mage", "paladin"]) {
      const b = document.createElement("button");
      b.innerHTML = `<div style="font:900 22px system-ui,sans-serif">${c.toUpperCase()}</div><div style="font-size:13px;opacity:.85">${CLASSES[c].ability}</div>`;
      Object.assign(b.style, {
        cursor: "pointer", padding: "14px 20px", minWidth: "170px", borderRadius: "10px", border: "2px solid #ffd84d",
        background: "#2a1a0e", color: "#f3e6cc",
      });
      b.addEventListener("click", () => {
        cls = c;
        restart();
        started = true;
        menu.remove();
        canvas.requestPointerLock?.()?.catch?.(() => {});
      });
      row.append(b);
    }
    const keysHelp = document.createElement("div");
    keysHelp.style.opacity = "0.8";
    keysHelp.textContent = "WASD move · mouse look · shift run · space jump · E / Q class ability · 1/2/3 switch class · R restart";
    const gpu = document.createElement("div");
    gpu.style.color = "#ff9a6a";
    if (!navigator.gpu) gpu.textContent = "No WebGPU in this browser: running the slower fallback. Chrome or Edge on desktop plays best.";
    const nav = document.createElement("div");
    Object.assign(nav.style, { display: "flex", gap: "18px", flexWrap: "wrap", justifyContent: "center" });
    const home = document.createElement("a");
    home.href = "./";
    home.textContent = "← All Game Modes";
    home.style.color = "#cbbba2";
    const explorer = document.createElement("a");
    explorer.href = "?hall=explorer";
    explorer.textContent = "3D Dungeon Floor (Paladin)";
    explorer.style.color = "#6ce88a";
    const next = document.createElement("a"); // the second hallway (src/boulder)
    next.href = "?hall=boulder&play=1";
    next.textContent = "Hallway 2: the boulder hall →";
    next.style.color = "#ffd84d";
    nav.append(home, explorer, next);
    menu.append(h, row, keysHelp, nav, gpu);
    document.body.append(menu);
  }
  const help = "WASD move · mouse look (click to lock) · shift run · space jump · E / Q class ability · 1/2/3 class · R restart";
  return {
    help,
    // advance the fixed-step simulation by real time dt; returns how many steps ran
    update(dt) {
      acc = Math.min(acc + dt, 0.25);
      let n = 0;
      while (acc >= DT) { if (started) step(); acc -= DT; n++; }
      placeCamera(dt);
      hud.textContent = `${cls.toUpperCase()}  ·  ${abilityLine()}\nDEATHS ${deaths}   ·   ${((F - runStart) / FPS).toFixed(1)} s\nreach the far end of the hall (past the Mimic)`;
      return n;
    },
    get frame() { return F; },
    at: (frame, fn) => timers.push({ at: frame, fn }), // run fn at the start of that game frame (tests)
    disable: (names) => { disabled.clear(); for (const n of names) disabled.add(n); }, // tests: isolate one trap
    reset: () => Object.assign(trap, { plateAt: -1e9, fireAt: -1e9, iceGone: true, melt: 0, still: 0, onFlaps: 0, launchAt: -1e9, lunge: null, mx: MIMIC.x, ms: MIMIC.s, my: 0 }),
    get trap() { return trap; },
    get player() { return p; },
    propState,
    tracks,
    bursts,
  };
}

