// First-person walking: click to capture the mouse (or drag to look), WASD / arrows to move,
// Shift to run. Collision keeps you in the nave, aisles and the back chamber and out of columns.
import { L, BAY, WALL_X, AISLE_X } from "./hall.js";

const EYE = 1.68;
const BODY = 0.3;                 // collision radius
const COL_R = 0.33 + BODY;        // column plinth half-width plus body
const DOOR_HALF = 1.0 - BODY;     // far doorway
const CHAMBER = [L + 0.45, L + 4.5, 2.2]; // back chamber s range and half width

// Is (x, s) somewhere a body can stand?
export function walkable(x, s) {
  if (s < 0.35) return false;
  if (s > L - BODY) {
    // through the doorway into the back chamber only
    if (s < CHAMBER[0] + BODY) return Math.abs(x) < DOOR_HALF;
    return s < CHAMBER[1] - BODY && Math.abs(x) < CHAMBER[2] - BODY;
  }
  if (Math.abs(x) > AISLE_X - BODY) return false;
  // arcade end piers run to the floor
  if (Math.abs(Math.abs(x) - WALL_X) < 0.25 + BODY && (s < 0.3 + BODY || s > L - 0.3 - BODY)) return false;
  // columns
  const k = Math.round(s / BAY);
  if (k >= 1 && k < L / BAY) {
    for (const cx of [-WALL_X, WALL_X]) {
      if (Math.abs(x - cx) < COL_R && Math.abs(s - k * BAY) < COL_R) return false;
    }
  }
  return true;
}

export function createWalker(camera, canvas, start = { s: 2, yaw: 0, pitch: 0.05 }) {
  const pos = { x: 0, s: start.s };
  let yaw = start.yaw, pitch = start.pitch, bob = 0;
  const keys = new Set();
  let dragging = false;

  const look = (dx, dy) => {
    yaw -= dx * 0.0022;
    pitch = Math.max(-1.3, Math.min(1.3, pitch - dy * 0.0022));
  };
  canvas.addEventListener("click", () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {}); });
  canvas.addEventListener("mousedown", () => { dragging = true; });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas || dragging) look(e.movementX, e.movementY);
  });
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  function update(dt) {
    const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 3.6 : 1.5;
    let mx = 0, ms = 0;
    if (f || r) {
      const n = Math.hypot(f, r);
      // camera looks down -z (= +s) at yaw 0; yaw turns left
      const fx = -Math.sin(yaw), fs = Math.cos(yaw);
      const rx = Math.cos(yaw), rs = Math.sin(yaw);
      mx = ((fx * f + rx * r) / n) * speed * dt;
      ms = ((fs * f + rs * r) / n) * speed * dt;
      bob += dt * speed * 5.2;
    }
    // slide along obstacles: try each axis on its own
    if (walkable(pos.x + mx, pos.s)) pos.x += mx;
    if (walkable(pos.x, pos.s + ms)) pos.s += ms;
    const y = EYE + (f || r ? Math.sin(bob) * 0.025 * (speed / 1.5) : 0);
    camera.position.set(pos.x, y, -pos.s);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  return { update, get locked() { return document.pointerLockElement === canvas; } };
}
