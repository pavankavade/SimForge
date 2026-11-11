// Play mode for the boulder hallway (?hall=boulder&play=1): the rules live in sim.js; this module
// turns keyboard and mouse into its input, plays its sounds and bursts, and turns its state into
// what the film's props (props.js) and cast (cast.jsx) draw, so a visual fix lands in both.
import { createSim, CLASSES, DEATHS, ZONES, LAYOUT, FPS } from "./sim.js";
import { Z, HW, CEILING_Y, BACK_X, WALL_END_X, CUBE_CENTER, EDGE_X, LEDGE_Y, restPosition, R_STONE } from "./timeline.js";
import { toLab } from "./hall.js";
import { HIP, lieHeight, lying } from "../../../../src/kit/actors";

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

const SFX_URLS = import.meta.glob("../../../../public/episodes/rolling-boulder/sfx/*.wav", { query: "?url", import: "default", eager: true });
function createSound() {
  let ctx = null;
  const bufs = new Map(), urls = {};
  for (const k of Object.keys(SFX_URLS)) urls[k.split("/").pop().replace(".wav", "")] = SFX_URLS[k];
  const unlock = () => { if (!ctx) ctx = new AudioContext(); if (ctx.state === "suspended") ctx.resume(); };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
  const load = (name) => {
    if (!bufs.has(name)) bufs.set(name, fetch(urls[name]).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).catch(() => null));
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

export function createGame({ camera, canvas, classType = "rogue", picker = false }) {
  const play = createSound();
  const sim = createSim({ classType });
  const keys = new Set();
  let camYaw = 0, camPitch = 0.28, dragging = false;
  canvas.addEventListener("click", () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {}); });
  canvas.addEventListener("mousedown", () => { dragging = true; });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== canvas && !dragging) return;
    camYaw += e.movementX * 0.0025;
    camPitch = clamp(camPitch + e.movementY * 0.0025, -0.15, 1.0);
  });
  const pressed = new Set();
  window.addEventListener("keydown", (e) => { if (e.code === "Space") e.preventDefault(); if (!e.repeat) pressed.add(e.code); keys.add(e.code); });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // --- HUD ----------------------------------------------------------------------------------------
  const hud = document.createElement("div");
  Object.assign(hud.style, { position: "fixed", left: "14px", top: "12px", color: "#f3e6cc", font: "600 15px/1.45 system-ui, sans-serif", textShadow: "0 1px 3px #000", pointerEvents: "none", whiteSpace: "pre" });
  const banner = document.createElement("div");
  Object.assign(banner.style, { position: "fixed", left: "0", right: "0", top: "36%", textAlign: "center", color: "#ffd84d", font: "900 clamp(34px, 7vw, 84px)/1.05 system-ui, sans-serif", letterSpacing: "0.04em", textShadow: "0 4px 0 #3a1406, 0 0 24px #000", pointerEvents: "none", opacity: "0" });
  const bannerText = document.createElement("div");
  const sub = document.createElement("div");
  Object.assign(sub.style, { font: "600 clamp(14px, 2.4vw, 22px)/1.4 system-ui, sans-serif", color: "#f3e6cc", marginTop: "10px" });
  banner.append(bannerText, sub);
  document.body.append(hud, banner);
  let bannerUntil = 0;
  const showBanner = (text, detail = "", frames = 1e9) => { bannerText.textContent = text ?? ""; sub.textContent = detail; banner.style.opacity = text ? "1" : "0"; bannerUntil = sim.frame + frames; };

  // --- what the props and the cast see ------------------------------------------------------------
  const bursts = [];
  const history = new Map();
  let runStart = sim.frame;
  const ballNow = () => {
    const b = sim.state.ball;
    if (!b) return null;
    const c = sim.ballPos(b);
    const ride = b.rodeAt && sim.frame - b.rodeAt < 16 ? 1.15 * Math.sin((Math.PI * (sim.frame - b.rodeAt)) / 16) : 0; // up and over the shield
    return { kind: b.kind, r: b.r, position: [c[0], c[1] + ride, Z], angle: (c[2] ?? 0) / b.r };
  };
  function propState() {
    const F = sim.frame, st = sim.state, b = st.ball;
    const z = sim.zones()[st.zone];
    const balls = [];
    const live = ballNow();
    if (live) balls.push(live);
    else if (z) { const [rx, ry] = restPosition(z.r); balls.push({ kind: z.kind, r: z.r, position: [rx, ry, Z], angle: 0 }); } // the next one waits behind the gate
    const wireBall = b?.zone === "wire" ? b : null;
    const wireDone = st.zone > sim.zones().findIndex((q) => q.id === "wire");
    let wob = 0.008 * Math.sin(F * 0.11);
    for (const at of st.cubeHits) if (F - at < 60) wob += 0.08 * Math.sin((F - at) * 0.7) * Math.exp(-(F - at) / 8);
    const pl = sim.player;
    const floating = pl.state === "alive" && F - pl.floatAt < 46;
    return {
      clock: F,
      boulders: balls,
      charge: b?.zone === "magnet" && F >= b.release ? 1 : 0,
      gate: b && F >= b.release - 2 && F - b.release < 40 ? clamp((F - b.release + 2) / 5, 0, 1) : 0,
      wire: { set: true, cutAge: wireBall && F >= wireBall.release ? F - wireBall.release : wireDone ? 300 : -1 },
      spout: 0, pour: 0, slime: 1, magnet: 1,
      coil: b?.zone === "magnet" && F >= b.release ? 1 : 0.15,
      crusherY: LAYOUT.crusherXs.map(() => sim.crusherY()),
      gears: b?.zone === "crushers" ? (F - b.release) * 0.25 : 0,
      pipe: 1, door: 1, doorLamp: F - st.doorAt < 60 ? (Math.floor(F / 5) % 2 ? 0.2 : 1) : 0,
      cube: 1, cubeWobble: wob,
      auras: floating ? [{ position: [pl.x, pl.y + 0.04, pl.z], on: 1 }] : [],
      shards: st.shards && F - st.shards.age0 < 70 ? { age: F - st.shards.age0, position: st.shards.position } : null,
    };
  }

  function playerActor() {
    const p = sim.player, F = sim.frame, cls = sim.state.cls;
    const at = [p.x, p.y, p.z];
    const k = CLASSES[cls];
    switch (p.state) {
      case "alive": {
        const hs = Math.hypot(p.vx, p.vz);
        if (F < p.stunUntil) {
          if (p.slipAt && F - p.slipAt < 18) return { pose: "slip", position: at, yaw: p.yaw, tilt: (Math.PI / 2) * ease(Math.min(1, (F - p.slipAt) / 14)), pivot: HIP, expression: "shock" };
          if (p.y > 0.05) return { pose: "fall", position: at, yaw: p.yaw, expression: "pain" };
          return { ...lying({ classType: cls, x: p.x, z: p.z, frame: F, since: p.stunUntil - 70, facing: Math.sin(p.yaw) >= 0 ? "right" : "left" }), expression: "dazed" };
        }
        if (p.pinned) return { pose: "fall", position: [p.x + 0.03 * Math.sin(F * 2.3), 0, p.z], yaw: p.yaw, speed: 1.6, expression: "scared" };
        if (F < p.rollUntil) {
          const t = 1 - (p.rollUntil - F) / 14;
          return { pose: "cower", position: [p.x, 0, p.z], yaw: Math.atan2(p.rollDir[0], p.rollDir[1]), tilt: -Math.PI * 2 * t, pivot: 0.45, scale: 0.9, expression: "focus" };
        }
        if (cls === "mage" && F - p.floatAt < 46) return { pose: F - p.floatAt < 16 ? "cast" : "float", position: at, yaw: p.yaw, expression: "focus" };
        const wind = F - p.windAt;
        if (cls === "paladin" && wind >= 0 && wind < 10) return { pose: "windup", position: at, yaw: p.yaw, expression: "angry" };
        if (cls === "paladin" && wind >= 10 && wind < 22) return { pose: "smash", position: at, yaw: p.yaw, expression: "yell" };
        if (cls === "paladin" && p.wedgeHeld > 0) return { pose: "shield", position: at, yaw: p.yaw, squash: 0.82, expression: "focus" };
        if (!p.grounded) {
          const flip = F - p.flipAt < 52 ? -Math.PI * 2 * ease(Math.min(1, (F - p.flipAt) / 46)) : 0;
          return { pose: "jump", position: at, yaw: p.yaw, tilt: flip, pivot: HIP, expression: "focus" };
        }
        const danger = !!sim.state.ball;
        if (hs > (k.walk + k.run) / 2) return { pose: "run", position: at, yaw: p.yaw, speed: 2 * (k.run / 4.2), expression: danger ? "scared" : undefined };
        if (hs > 0.4) return { pose: "walk", position: at, yaw: p.yaw, speed: k.walk / 2.7, expression: danger ? "focus" : undefined };
        return { pose: "idle", position: at, yaw: p.yaw, expression: danger ? "focus" : undefined };
      }
      case "launched": {
        const u = clamp((F - p.since) / 40, 0, 1);
        const from = p.flight.from, to = [CUBE_CENTER[0] + 0.6, CUBE_CENTER[1] - HIP, p.z];
        return {
          pose: "launch", position: [lerp(from[0], to[0], u), lerp(from[1], to[1], u) + 4 * 1.6 * u * (1 - u), p.z],
          yaw: p.yaw + u * 1.5, tilt: -u * Math.PI * 3, pivot: HIP, expression: "scared",
        };
      }
      case "won": {
        const turn = ease(clamp((F - p.since) / 8, 0, 1));
        return { pose: F - p.since < 8 ? "idle" : "cheer", position: at, yaw: lerp(p.yaw, -Math.PI / 2, turn), expression: "smug" };
      }
      default:
        return null;
    }
  }
  function corpseActor(c, f) {
    if (c.kind === "pancake") return { ...lying({ classType: c.cls, x: c.x, z: c.z, frame: f, since: c.at }), squash: 0.16, turn: Math.PI / 2, expression: "dead" };
    if (c.kind === "jelly") return { pose: "float", position: [c.x, c.y - HIP + 0.05 * Math.sin(f * 0.07), c.z], yaw: -Math.PI / 2 + 0.6, tilt: 2.2, pivot: HIP, speed: 0.3, expression: "dead" };
    return null;
  }
  function tracks() {
    const out = [];
    const life = sim.state.deaths;
    if (sim.player.state !== "dead") out.push({ id: `player${life}-${sim.state.cls}`, classType: sim.state.cls, track: (f) => history.get(f) ?? history.get(sim.frame) ?? null, weapon: sim.state.cls === "paladin" ? "warhammer" : undefined });
    for (const c of sim.corpses) if (c.kind !== "splat") out.push({ id: c.id, classType: c.cls, track: (f) => corpseActor(c, f), weapon: c.cls === "paladin" ? "warhammer" : undefined });
    return out;
  }
  function extras() {
    const out = [];
    const b = ballNow();
    for (const c of sim.corpses) {
      if (c.kind === "splat" && b && sim.state.ball === c.ball) out.push({ kind: "splat", id: c.id, classType: c.cls, center: b.position, angle: b.angle - (c.angle0 ??= b.angle), faceZ: b.r * 0.72, size: 0.85, flat: 0.55 });
    }
    return out;
  }

  // --- camera: third person behind you, looking up the hall -------------------------------------
  const cam = { p: null, l: null };
  function placeCamera(dt) {
    const p = sim.player;
    let t = [p.x, p.y + 1.25, p.z];
    if (p.state === "launched") { const a = playerActor(); t = [a.position[0], a.position[1] + HIP, a.position[2]]; }
    const f = [Math.cos(camYaw), Math.sin(camYaw)];
    const d = p.state === "won" ? 3.4 : 4.6;
    const want = [t[0] - f[0] * d * Math.cos(camPitch), t[1] + 0.5 + d * Math.sin(camPitch), t[2] - f[1] * d * Math.cos(camPitch)];
    want[0] = clamp(want[0], CUBE_CENTER[0] - 0.4, BACK_X - 0.3); // over the curled floor at most, never in the pipe
    want[1] = clamp(want[1], 0.5, want[0] < CUBE_CENTER[0] + 1.9 ? 2.55 : CEILING_Y - 0.45); // and under the cube
    want[2] = clamp(want[2], Z - HW + 0.2, Z + HW - 0.2);
    const look = [t[0] + f[0] * 1.4, t[1], t[2] + f[1] * 1.4];
    if (!cam.p) { cam.p = want; cam.l = look; }
    const k = 1 - Math.exp(-dt * 7), kl = 1 - Math.exp(-dt * 12);
    cam.p = cam.p.map((v, i) => v + (want[i] - v) * k);
    if (p.state !== "dead") cam.l = cam.l.map((v, i) => v + (look[i] - v) * kl);
    camera.position.set(...toLab(cam.p));
    camera.lookAt(...toLab(cam.l));
  }

  // --- the loop -----------------------------------------------------------------------------------
  let acc = 0, started = !picker, lastZone = -1, lastState = "alive";
  function step() {
    if (pressed.has("KeyR")) { sim.restart(); runStart = sim.frame; history.clear(); }
    for (const [code, c] of [["Digit1", "rogue"], ["Digit2", "mage"], ["Digit3", "paladin"]]) if (pressed.has(code) && c !== sim.state.cls) sim.setClass(c);
    const fwd = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const right = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const f = [Math.cos(camYaw), Math.sin(camYaw)], r = [-Math.sin(camYaw), Math.cos(camYaw)];
    let move = [f[0] * fwd + r[0] * right, f[1] * fwd + r[1] * right];
    const n = Math.hypot(...move);
    if (n > 1) move = move.map((v) => v / n);
    sim.step({ move, run: keys.has("ShiftLeft") || keys.has("ShiftRight"), jump: keys.has("Space"), e: keys.has("KeyE"), q: keys.has("KeyQ") });
    for (const e of sim.drain()) {
      if (e.sfx) play(e.sfx, e.vol);
      if (e.burst) bursts.push({ ...e.burst, pos: toLab(e.burst.pos) });
    }
    for (let i = bursts.length - 1; i >= 0; i--) if (sim.frame - (bursts[i].end ?? bursts[i].at) > 120) bursts.splice(i, 1);
    const p = sim.player;
    history.set(sim.frame, playerActor());
    history.delete(sim.frame - 30);
    if (p.state === "dead" && lastState !== "dead") showBanner(DEATHS[p.reason] ?? "DEAD", `death #${sim.state.deaths} · back to the start of this trap…`);
    if (p.state === "alive" && lastState === "dead") { showBanner(null); history.clear(); }
    if (p.state === "won" && lastState !== "won") showBanner("ESCAPED!", `${sim.state.deaths} death${sim.state.deaths === 1 ? "" : "s"} · ${((sim.frame - runStart) / FPS).toFixed(1)} s · R to run it again`);
    if (sim.state.zone !== lastZone && sim.state.zone > 0 && sim.state.zone <= ZONES.length && p.state === "alive") showBanner("CLEARED", sim.zones()[sim.state.zone]?.name ? `next: ${sim.zones()[sim.state.zone].name}` : "now climb to the ledge", 45);
    if (bannerUntil < sim.frame && p.state === "alive") showBanner(null);
    lastZone = sim.state.zone;
    lastState = p.state;
    pressed.clear();
  }

  const cd = (ready) => (sim.frame >= ready ? "READY" : `${((ready - sim.frame) / FPS).toFixed(1)} s`);
  function abilityLine() {
    const p = sim.player, cls = sim.state.cls;
    if (cls === "rogue") return `E vault: ${cd(p.vaultReady)}  ·  Q tuck-roll: ${cd(p.rollReady)}`;
    if (cls === "mage") return `E levitate: ${cd(p.floatReady)}  ·  Q blink: ${cd(p.blinkReady)}`;
    const left = Math.max(0, 1 - p.wedgeHeld / sim.consts.WEDGE.stamina);
    return `E warhammer: ${cd(p.smashReady)}  ·  hold Q shield wedge ${sim.frame < p.wedgeBroken ? `BROKEN ${cd(p.wedgeBroken)}` : "█".repeat(Math.ceil(left * 10)).padEnd(10, "░")}`;
  }

  if (picker) {
    const menu = document.createElement("div");
    Object.assign(menu.style, { position: "fixed", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", background: "rgba(8,5,3,0.55)", color: "#f3e6cc", font: "600 16px/1.5 system-ui, sans-serif", textAlign: "center", padding: "16px" });
    const h = document.createElement("div");
    h.innerHTML = `<div style="font:900 clamp(28px,6vw,64px)/1.05 system-ui,sans-serif;color:#ffd84d;text-shadow:0 4px 0 #3a1406">EVOLUTION OF A<br>BOULDER HALLWAY</div>
      <div style="margin-top:10px;max-width:640px">The door slams behind you. Five boulder traps between you and the release ledge, and every ball fills the hall. Waiting won't save you: pick an adventurer and time their move.</div>`;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" });
    for (const c of ["rogue", "mage", "paladin"]) {
      const b = document.createElement("button");
      b.innerHTML = `<div style="font:900 22px system-ui,sans-serif">${c.toUpperCase()}</div><div style="font-size:13px;opacity:.85">${CLASSES[c].moves}</div>`;
      Object.assign(b.style, { cursor: "pointer", padding: "14px 20px", minWidth: "190px", borderRadius: "10px", border: "2px solid #ffd84d", background: "#2a1a0e", color: "#f3e6cc" });
      b.addEventListener("click", () => { sim.setClass(c); sim.restart(); runStart = sim.frame; started = true; menu.remove(); canvas.requestPointerLock?.()?.catch?.(() => {}); });
      row.append(b);
    }
    const keysHelp = document.createElement("div");
    keysHelp.style.opacity = "0.8";
    keysHelp.textContent = "WASD move · mouse look · shift run · space jump · E / Q class moves · 1/2/3 switch class · R restart";
    const nav = document.createElement("div");
    Object.assign(nav.style, { display: "flex", gap: "18px", flexWrap: "wrap", justifyContent: "center" });
    const home = document.createElement("a");
    home.href = "./";
    home.textContent = "← All Game Modes";
    home.style.color = "#cbbba2";
    const other = document.createElement("a");
    other.href = "?hall=crypt&play=1";
    other.textContent = "← Hallway 1: the crypt";
    Object.assign(other.style, { color: "#ffd84d" });
    const explorer = document.createElement("a");
    explorer.href = "?hall=explorer";
    explorer.textContent = "3D Dungeon Floor →";
    explorer.style.color = "#6ce88a";
    nav.append(home, other, explorer);
    menu.append(h, row, keysHelp, nav);
    document.body.append(menu);
  }

  const help = "WASD move · mouse look (click to lock) · shift run · space jump · E / Q class moves · 1/2/3 class · R restart";
  return {
    help,
    sim,
    update(dt) {
      acc = Math.min(acc + dt, 0.25);
      while (acc >= 1 / FPS) { if (started) step(); acc -= 1 / FPS; }
      placeCamera(dt);
      const z = sim.zones()[sim.state.zone];
      hud.textContent = `${sim.state.cls.toUpperCase()}  ·  ${abilityLine()}\nDEATHS ${sim.state.deaths}   ·   ${((sim.frame - runStart) / FPS).toFixed(1)} s\n${z ? `trap ${sim.state.zone + 1}/5: ${z.name}` : "climb the ramp to the ledge"}`;
    },
    get frame() { return sim.frame; },
    restart: () => { sim.restart(); runStart = sim.frame; history.clear(); started = true; },
    propState,
    tracks,
    extras,
    bursts,
    playerWorld: () => ({ x: toLab([sim.player.x, 1, sim.player.z])[0], y: 1, z: toLab([sim.player.x, 1, sim.player.z])[2], distanceTo: undefined }),
  };
}
