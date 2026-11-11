// The boulder hallway as a game: the rules, with no DOM and no three, so a test can run them
// headless (test-game.mjs) and game.js only adds input, camera, sound and the HUD. Fixed 30 Hz
// steps, in Ep2's frame (timeline.js): you start inside the sealed blast door and climb to the
// release ledge. Five traps on the way, one ball each, released from the ledge when you trip them:
//   door      the first ball comes on its own; the half-pipe behind you throws whatever reaches it
//             (balls and people) into the gelatinous cube, which also eats anything floating near it
//   crushers  three ceiling crushers slam while their ball rolls: anything airborne under them is swatted
//   wire      a tripwire; a plain stone ball
//   slime     the hall-wide drum; jump off the slime and you slip (the paladin's boots don't)
//   magnet    the spiked iron ball; its electromagnet drags armour in and yanks a bracing paladin onto it
// Every ball fills the hall (no standing aside) and runs to the far end (no outrunning it). Each
// class has a move that beats each trap, and each move only works when timed:
//   rogue    E vault (a 3.5 m flip over any ball) · Q tuck-roll (slips past a round stone ball in a corner)
//   mage     E levitate (floats over any ball) · Q blink 3.4 m (through a ball, if it's close enough)
//   paladin  E warhammer (shatters stone or the drum at arm's length; spikes kill) · hold Q shield wedge
//            (the ball rides over you; not inside the magnet's reach)
import {
  Z, HW, EDGE_X, LEDGE_Y, FOOT_X, PIPE_CENTER, PIPE_R, CUBE_CENTER, CUBE_SIZE, R_STONE, R_DRUM, R_SPIKED,
  pathPoint, totalRamp, restPosition,
} from "./timeline.js";

export const FPS = 30;
const DT = 1 / FPS, G = 9.8;
const H = { rogue: 1.64 * 1.12, mage: 1.64 * 1.12, paladin: 1.64 * 1.12 * 1.06 };
const BODY_R = 0.28, ROLL_R = 0.22, ROLL_TOP = 0.4;
const LANE = HW - 0.3;                     // how far off the centre line a body can stand
export const LAYOUT = {                    // the game hall's traps (props.js and hall.js take these)
  wireX: 0.0, slime: [1.2, 3.2], spoutX: 2.2, magnetX: 4.6, crusherXs: [-4.4, -3.2, -2.0],
};
const CRUSHER_HALF = 0.55 + 0.15, CRUSHER_SLAM = 3.0, CRUSHER_REST = 4.85;
const MAGNET_REACH = 2.2;
const CUBE_LO = [CUBE_CENTER[0] - CUBE_SIZE[0] / 2, CUBE_CENTER[1] - CUBE_SIZE[1] / 2];
const PIPE_X = PIPE_CENTER[0] + 0.6;       // in front of the curl: a ball arriving here throws you into the cube
export const START_X = -5.6;
export const GOAL_X = EDGE_X - 0.15;
const T1 = 34;                             // frames down the ramp; ~9 m/s along the floor

export const ZONES = [
  { id: "door", name: "BLAST DOOR + HALF-PIPE", start: START_X, auto: 40, kind: "stone", r: R_STONE },
  { id: "crushers", name: "CEILING CRUSHERS", start: -5.4, trigger: -4.7, kind: "stone", r: R_STONE },
  { id: "wire", name: "TRIPWIRE BOULDER", start: -0.9, trigger: LAYOUT.wireX, kind: "stone", r: R_STONE },
  { id: "slime", name: "HALL-WIDE DRUM + SLIME", start: 0.4, trigger: LAYOUT.slime[0] + 0.1, kind: "drum", r: R_DRUM },
  { id: "magnet", name: "SPIKED IRON + ELECTROMAGNET", start: 3.2, trigger: LAYOUT.magnetX - 0.7, kind: "spiked", r: R_SPIKED },
];
export const CLASSES = {
  rogue: { walk: 2.7, run: 4.6, jump: 4.8, moves: "E vault · Q tuck-roll (corners, stone only)" },
  mage: { walk: 2.6, run: 4.2, jump: 4.4, moves: "E levitate · Q blink 3.4 m" },
  paladin: { walk: 2.4, run: 3.6, jump: 3.8, moves: "E warhammer (stone/drum) · hold Q shield wedge" },
};
const VAULT = { vy: 8.3, cooldown: 60 };    // a 3.5 m flip: clears the spiked ball, barely
const ROLL = { frames: 14, speed: 4.2, cooldown: 50 };
const LEVITATE = { rise: 18, hold: 10, fall: 18, y: 3.3, cooldown: 100 };
const BLINK = { dist: 3.4, iframes: 3, cooldown: 90 };
const SMASH = { windup: 10, active: 4, reach: [0.15, 1.8], cooldown: 40 };
const WEDGE = { ready: 8, stamina: 34, recharge: 60 };
export const DEATHS = {
  stone: "FLATTENED", drum: "STEAMROLLED", spiked: "SKEWERED", cube: "LAUNCHED INTO THE CUBE",
  digested: "DIGESTED", magnet: "MAGNETISED… AND SKEWERED", swatted: "SWATTED… AND FLATTENED", slip: "SLIPPED… AND FLATTENED",
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

export function createSim({ classType = "rogue", only = null, zone = 0 } = {}) {
  let F = 1000;                    // starts high so ActorView's look-back never goes negative
  const ev = [];                   // { sfx | burst } for game.js, drained every step
  const sfx = (name, vol = 0.5) => ev.push({ sfx: name, vol });
  const burst = (b) => ev.push({ burst: { ...b, at: b.at ?? F } });
  const p = {};
  const corpses = [];
  const st = { cls: classType, zone, deaths: 0, won: false, ball: null, armedAt: F, shards: null, cubeHits: [], doorAt: F };
  const zoneList = () => (only ? ZONES.filter((z) => only.includes(z.id)) : ZONES);

  function spawn(atZone = st.zone) {
    st.zone = atZone;
    const z = zoneList()[atZone];
    Object.assign(p, {
      x: z ? z.start : START_X, y: 0, z: Z, vx: 0, vz: 0, vy: 0, yaw: Math.PI / 2, grounded: true,
      state: "alive", since: F, reason: null, vaultReady: F, rollUntil: -1, rollReady: F, floatAt: -1e9, floatReady: F,
      blinkReady: F, iUntil: -1, windAt: -1e9, smashReady: F, wedgeHeld: 0, wedgeBroken: -1, flipAt: -1e9,
      pinned: false, stunUntil: -1, flight: null,
    });
    st.ball = null;
    st.armedAt = F;
    st.shards = null;
    sfx("pop", 0.3);
  }

  // --- balls -------------------------------------------------------------------------------------
  const ballPos = (b, f = F) => {
    const t = f - b.release;
    if (t <= 0) return restPosition(b.r);
    const l1 = totalRamp(b.r);
    const s = t < T1 ? l1 * (t / T1) ** 2 : l1 + ((2 * l1) / T1) * (t - T1);
    return [...pathPoint(s, b.r, "pipe"), s];
  };
  function release(z) {
    st.ball = { kind: z.kind, r: z.r, release: F + 2, zone: z.id, ride: 0 };
    sfx("gate", 0.35);
    setTimeout_(2 + Math.round(T1), () => { sfx("thud", 0.45); burst({ kind: "dust", pos: [FOOT_X - 0.4, 0.05, Z], box: [0.1, 0, HW * 0.8], n: 30 }); });
    if (z.id === "crushers") sfx("gears", 0.3);
    if (z.id === "magnet") sfx("zap", 0.4);
    sfx("roll", 0.3);
  }
  const timers = [];
  const setTimeout_ = (n, fn) => timers.push({ at: F + n, fn });

  // distance from the ball's surface to the player's body (negative = touching)
  function gap(b, c, body) {
    const [cx, cy] = c;
    const y0 = p.y + 0.05, y1 = p.y + body.top;
    const yy = clamp(cy, y0, y1);
    const dz = b.kind === "drum" ? 0 : p.z - Z;
    const reach = b.kind === "spiked" ? b.r + 0.2 : b.r; // spike tips sweep a wider ball
    return Math.hypot(p.x - cx, yy - cy, dz) - reach - body.r;
  }

  function die(reason, corpse) {
    if (p.state === "dead") return;
    p.state = "dead";
    p.since = F;
    p.reason = reason;
    st.deaths++;
    if (corpse) corpses.push({ id: `c${st.deaths}`, cls: st.cls, at: F, ...corpse });
    if (corpses.length > 8) corpses.shift();
    sfx(reason === "spiked" || reason === "magnet" ? "skewer" : reason === "cube" || reason === "digested" ? "jelly" : "squash", 0.55);
  }

  // --- one step ----------------------------------------------------------------------------------
  // input: { move: [dx, dz] (world, length <= 1), run, jump, e, q } (held states; edges are found here)
  let prev = {};
  function step(input = {}) {
    F++;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= F) timers.splice(i, 1)[0].fn();
    const pressE = input.e && !prev.e, pressQ = input.q && !prev.q, pressJ = input.jump && !prev.jump;
    prev = { ...input };
    const zones = zoneList();
    const z = zones[st.zone];
    const k = CLASSES[st.cls];
    const ball = st.ball;
    const c = ball ? ballPos(ball) : null;

    if (p.state === "alive") {
      // trigger the current zone
      if (z && !ball && ((z.auto && F - st.armedAt >= z.auto) || (z.trigger != null && p.x > z.trigger))) release(z);
      const onSlime = p.grounded && p.x > LAYOUT.slime[0] && p.x < LAYOUT.slime[1] && zones.some((q) => q.id === "slime");
      const stunned = F < p.stunUntil;
      const rolling = F < p.rollUntil;
      const floating = F - p.floatAt < LEVITATE.rise + LEVITATE.hold + LEVITATE.fall;
      const magnetOn = ball?.zone === "magnet" && F >= ball.release;
      const inMagnet = st.cls === "paladin" && magnetOn && Math.hypot(p.x - LAYOUT.magnetX, p.z - Z) < MAGNET_REACH;
      // paladin: the shield wedge (hold Q) and the warhammer (E: wind up, then the strike)
      const wedgeOk = st.cls === "paladin" && input.q && p.grounded && F >= p.wedgeBroken && !p.pinned;
      p.wedgeHeld = wedgeOk ? p.wedgeHeld + 1 : 0;
      if (p.wedgeHeld > WEDGE.stamina) { p.wedgeBroken = F + WEDGE.recharge; p.wedgeHeld = 0; sfx("crack", 0.35); }
      const wedge = p.wedgeHeld >= WEDGE.ready;
      if (st.cls === "paladin" && pressE && F >= p.smashReady && p.grounded && !p.pinned) { p.windAt = F; p.smashReady = F + SMASH.windup + SMASH.cooldown; sfx("whoosh", 0.3); }
      const wind = F - p.windAt;
      const smashing = wind >= SMASH.windup && wind < SMASH.windup + SMASH.active;
      if (inMagnet && !p.pinned && (p.wedgeHeld > 0 || (wind >= 0 && wind < SMASH.windup + SMASH.active))) { // bracing on the magnet: yanked onto it
        p.pinned = true;
        sfx("zap", 0.5); sfx("clang", 0.35);
        burst({ kind: "sparks", pos: [LAYOUT.magnetX, 0.4, Z], n: 40, tint: "arc" });
      }
      // movement
      const busy = stunned || p.pinned || wind >= 0 && wind < SMASH.windup + SMASH.active || wedge;
      let speed = input.run ? k.run : k.walk;
      if (floating) speed = 1.2;
      let [mx, mz] = busy ? [0, 0] : input.move ?? [0, 0];
      const grip = onSlime && st.cls !== "paladin" ? 3 : p.grounded ? 14 : 2.5;
      if (rolling) { p.vx = p.rollDir[0] * ROLL.speed; p.vz = p.rollDir[1] * ROLL.speed; }
      else {
        p.vx += (mx * speed - p.vx) * Math.min(1, grip * DT);
        p.vz += (mz * speed - p.vz) * Math.min(1, grip * DT);
      }
      if (inMagnet && !p.pinned) { // the magnet drags armour in
        const dx = LAYOUT.magnetX - p.x, dz = Z - p.z, n = Math.hypot(dx, dz) || 1;
        p.x += (dx / n) * 1.6 * DT; p.z += (dz / n) * 1.6 * DT;
      }
      if (p.pinned) { p.x += (LAYOUT.magnetX - p.x) * 0.4; p.z += (Z - p.z) * 0.4; p.vx = p.vz = 0; }
      p.x += p.vx * DT;
      p.z = clamp(p.z + p.vz * DT, Z - LANE - (rolling ? 0.08 : 0), Z + LANE + (rolling ? 0.08 : 0));
      p.x = Math.max(PIPE_CENTER[0] + 0.3, Math.min(p.x, EDGE_X + 2.5));
      if (Math.hypot(p.vx, p.vz) > 0.3 && !rolling) p.yaw = Math.atan2(p.vx, p.vz);
      const floorY = p.x > EDGE_X ? LEDGE_Y : p.x > FOOT_X ? p.x - FOOT_X : 0; // up the ramp
      // moves
      if (!busy && p.grounded && !floating) {
        if (pressJ || (st.cls === "rogue" && pressE && F >= p.vaultReady)) {
          if (onSlime && st.cls !== "paladin") { // feet go out from under you
            p.stunUntil = F + 70; p.slipAt = F; p.vy = 3; p.grounded = false;
            sfx("slip", 0.5);
            burst({ kind: "dust", pos: [p.x, 0.05, p.z], n: 20, tint: "slime" });
          } else if (pressE && st.cls === "rogue") {
            p.vy = VAULT.vy; p.grounded = false; p.vaultReady = F + VAULT.cooldown; p.flipAt = F;
            sfx("whoosh", 0.4);
            burst({ kind: "dust", pos: [p.x, floorY + 0.02, p.z], n: 12, size: 0.7 });
          } else { p.vy = k.jump; p.grounded = false; sfx("whoosh", 0.18); }
        }
        if (st.cls === "rogue" && pressQ && F >= p.rollReady) {
          const n = Math.hypot(mx, mz);
          p.rollDir = n > 0.1 ? [mx / n, mz / n] : [Math.sin(p.yaw), Math.cos(p.yaw)];
          p.rollUntil = F + ROLL.frames; p.rollReady = F + ROLL.cooldown;
          sfx("whoosh", 0.3);
        }
        if (st.cls === "mage" && pressE && F >= p.floatReady) { p.floatAt = F; p.floatBase = floorY; p.floatReady = F + LEVITATE.cooldown; sfx("levitate", 0.45); }
      }
      if (st.cls === "mage" && pressQ && F >= p.blinkReady && !stunned) { // blink along the way you face (or move)
        const n = Math.hypot(mx, mz);
        const d = n > 0.1 ? [mx / n, mz / n] : [Math.sin(p.yaw), Math.cos(p.yaw)];
        burst({ kind: "glints", end: F + 10, pos: [p.x, p.y + 1, p.z], box: [0.3, 0.7, 0.3], n: 18, tint: "ice" });
        p.x = Math.min(p.x + d[0] * BLINK.dist, EDGE_X + 2.5); p.z = clamp(p.z + d[1] * BLINK.dist, Z - LANE, Z + LANE);
        p.iUntil = F + BLINK.iframes; p.blinkReady = F + BLINK.cooldown;
        sfx("zap", 0.45);
        burst({ kind: "glints", end: F + 12, pos: [p.x, p.y + 1, p.z], box: [0.3, 0.7, 0.3], n: 18, tint: "ice" });
      }
      // vertical
      if (F - p.floatAt < LEVITATE.rise + LEVITATE.hold + LEVITATE.fall) {
        const d = F - p.floatAt;
        const u = d < LEVITATE.rise ? ease(d / LEVITATE.rise) : d < LEVITATE.rise + LEVITATE.hold ? 1 : 1 - ease((d - LEVITATE.rise - LEVITATE.hold) / LEVITATE.fall);
        p.y = Math.max(floorY, p.floatBase + u * LEVITATE.y + 0.05 * Math.sin(d * 0.3) * u);
        p.vy = 0;
        p.grounded = false;
        if (u <= 0 && d > LEVITATE.rise) { p.grounded = true; p.floatAt = -1e9; }
      } else {
        p.vy -= G * DT;
        p.y += p.vy * DT;
        if (p.y <= floorY) {
          if (!p.grounded && p.vy < -3) { sfx("thud", 0.2); burst({ kind: "dust", pos: [p.x, floorY + 0.02, p.z], n: 12, size: 0.6 }); }
          p.y = floorY; p.vy = 0; p.grounded = true;
        } else if (p.y > floorY + 0.02) p.grounded = false;
      }
      p.wasMoving = Math.hypot(p.vx, p.vz);

      // --- hazards --------------------------------------------------------------------------------
      const head = p.y + H[st.cls];
      // the cube eats anything floating up into it
      if (p.x < CUBE_LO[0] + CUBE_SIZE[0] && head > CUBE_LO[1] + 0.2) {
        st.cubeHits.push(F);
        burst({ kind: "dust", pos: [p.x, CUBE_LO[1] + 0.3, p.z], n: 20, tint: "slime" });
        return die("digested", { kind: "jelly", x: p.x, y: CUBE_LO[1] + 0.9, z: p.z });
      }
      // crushers slam while their ball rolls
      if (crusherDown() && head > CRUSHER_SLAM && head < CRUSHER_SLAM + 2.5 && LAYOUT.crusherXs.some((x) => Math.abs(p.x - x) < CRUSHER_HALF)) {
        p.floatAt = -1e9; p.vy = -6; p.stunUntil = F + 80; p.flipAt = -1e9; p.swatted = true;
        sfx("slam", 0.55); sfx("clang", 0.35);
        burst({ kind: "sparks", pos: [p.x, CRUSHER_SLAM, p.z], n: 40 });
      }
      if (ball && c && F >= ball.release) {
        const body = rolling ? { r: ROLL_R, top: ROLL_TOP } : wedge ? { r: BODY_R, top: 1.1 } : { r: BODY_R, top: H[st.cls] - 0.05 };
        const g = gap(ball, c, body);
        // the warhammer: a ball within reach at the strike
        if (smashing && !ball.dead && c[0] - p.x > ball.r + SMASH.reach[0] - 0.3 && c[0] - p.x < ball.r + SMASH.reach[1] && Math.abs(c[1] - ball.r - (floorY)) < 0.6) {
          if (ball.kind === "spiked") return die("spiked", { kind: "splat", ball });
          ball.dead = true;
          st.shards = { age0: F, position: [c[0], c[1], Z] };
          sfx("crack", 0.55); sfx("boom", 0.35);
          burst({ kind: "sparks", pos: [c[0] - ball.r, c[1], Z], box: [HW * 0.6, 0.4, 0.1], n: 80 });
          burst({ kind: "dust", pos: [c[0] - 0.4, 0.4, Z], box: [HW * 0.8, 0.6, 0.6], n: 70, size: 1.4 });
          st.ball = null;
          return clearZone();
        }
        if (g < 0 && F >= p.iUntil && !ball.dead) {
          if (wedge && !p.pinned) { // rides up the shield and over
            ball.ride = F;
            p.wedgeHeld = Math.min(p.wedgeHeld, WEDGE.stamina - 2);
            if (!ball.rodeAt) { ball.rodeAt = F; sfx("clang", 0.5); burst({ kind: "sparks", pos: [p.x + 0.3, 1.0, p.z], n: 40 }); }
          } else {
            const why = p.pinned ? "magnet" : p.swatted ? "swatted" : p.slipAt && F - p.slipAt < 90 ? "slip" : ball.kind;
            burst({ kind: "dust", pos: [p.x, 0.2, p.z], box: [HW * 0.8, 0, 0.12], n: 40, size: 1.1 });
            return die(why, ball.kind === "spiked" ? { kind: "splat", ball } : { kind: "pancake", x: p.x, z: p.z });
          }
        }
      }
    } else if (p.state === "launched") {
      const u = (F - p.since) / 40;
      if (u >= 1) die("cube", { kind: "jelly", x: CUBE_CENTER[0] + 0.6, y: CUBE_CENTER[1], z: p.z });
    } else if (p.state === "dead" && F - p.since > 55) {
      spawn(st.zone);
    }

    // the ball: through the hall and into the half-pipe, which throws it (and you) into the cube
    if (ball && c) {
      if (c[0] <= PIPE_X && p.state === "alive" && p.x < PIPE_X + 0.4 && !ball.threw) { // you're in front of it as it climbs
        ball.threw = true;
        p.state = "launched"; p.since = F; p.flight = { from: [p.x, p.y, p.z] };
        sfx("launch", 0.5); sfx("whoosh_big", 0.35);
      }
      if (c[1] > PIPE_CENTER[1] + 0.2 && c[0] < PIPE_CENTER[0]) { // up the curl and into the jelly
        st.cubeHits.push(F);
        sfx("jelly", 0.45);
        burst({ kind: "dust", pos: [PIPE_CENTER[0] - 1, CUBE_LO[1] + 0.4, Z], n: 26, tint: "slime" });
        if (p.state === "alive" && !ball.passed) clearZone();
        st.ball = null;
      } else if (p.state === "alive" && c[0] < p.x - ball.r - 1.5 && !ball.passed) {
        ball.passed = true; // behind you: this trap is beaten (the ball still goes on to the cube)
        clearZone();
      }
    }
    if (p.state === "alive" && p.x >= GOAL_X && p.y > LEDGE_Y - 0.3 && !st.won) {
      st.won = true; p.state = "won"; p.since = F;
      sfx("stamp", 0.6); sfx("boom", 0.3);
    }
  }

  function clearZone() {
    st.zone++;
    st.armedAt = F;
    sfx("ding", 0.4);
    if (st.zone >= zoneList().length) st.allClear = true;
  }

  function crusherDown(f = F) {
    const b = st.ball;
    if (!b || b.zone !== "crushers" || f < b.release + T1 - 6) return false;
    return (f - b.release) % 20 < 6;
  }
  const crusherY = (f = F) => {
    const b = st.ball;
    if (!b || b.zone !== "crushers" || f < b.release + T1 - 6) return CRUSHER_REST;
    const d = (f - b.release) % 20;
    return d < 2 ? CRUSHER_REST - (CRUSHER_REST - CRUSHER_SLAM) * (d + 1) / 2 : d < 6 ? CRUSHER_SLAM : CRUSHER_REST - (CRUSHER_REST - CRUSHER_SLAM) * Math.max(0, 1 - (d - 6) / 10);
  };

  spawn(zone);
  return {
    step,
    get frame() { return F; },
    get player() { return p; },
    get state() { return st; },
    get corpses() { return corpses; },
    drain: () => ev.splice(0),
    ballPos,
    crusherY,
    zones: zoneList,
    setClass: (c) => { st.cls = c; spawn(st.zone); },
    restart: () => { st.deaths = 0; st.won = false; corpses.length = 0; spawn(0); },
    respawnAt: (i) => spawn(i),
    consts: { H, LEVITATE, SMASH, WEDGE, BLINK, ROLL, VAULT, T1, CRUSHER_REST },
  };
}
