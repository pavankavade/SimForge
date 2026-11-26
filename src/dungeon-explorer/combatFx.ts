// Combat read-outs drawn over the 3D view (plain DOM, positioned each frame like the nameplates):
//  - numbers: what each of his blows, arrows and spells took off a monster rises off it and fades
//    (white, a headshot gold, the killing blow red, poison green, "Blocked" grey);
//  - arrows: a red wedge around the middle of the screen points to whoever just hurt him, turning
//    as he turns, so a blow from behind tells him which way to face.
import * as THREE from "three";

export type NumberKind = "hit" | "head" | "kill" | "poison" | "blocked";

export interface CombatFx {
  /** A number (or "Blocked") rising from world point (x, y, z), metres. */
  number: (x: number, y: number, z: number, amount: number, kind: NumberKind) => void;
  /** He was hurt from world point (x, z). */
  hurtFrom: (x: number, z: number) => void;
  /** Place and fade everything (call each frame); `at` is where he stands (metres). */
  update: (dt: number, camera: THREE.Camera, view: { width: number; height: number }, at: { x: number; z: number }) => void;
  /** Hide everything at once (a new floor, the town). */
  clear: () => void;
  dispose: () => void;
}

const NUMBER_POOL = 28;
const NUMBER_S = 0.95;
const RISE_M = 0.85;
const ARROW_POOL = 4;
const ARROW_S = 1.1;
/** How far from the middle of the screen the wedges sit (px). */
const ARROW_RING = 118;

const STYLE: Record<NumberKind, { color: string; size: number }> = {
  hit: { color: "#f4efe4", size: 19 },
  head: { color: "#ffc93c", size: 24 },
  kill: { color: "#ff5a3c", size: 25 },
  poison: { color: "#8fe36b", size: 15 },
  blocked: { color: "#a8adb3", size: 15 },
};

const _v = new THREE.Vector3();
const _d = new THREE.Vector3();

/** Draws into `parent` (a full-screen HUD layer the app hides with the rest of the HUD). */
export function createCombatFx(parent: HTMLElement): CombatFx {
  const layer = document.createElement("div");
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
  parent.appendChild(layer);

  const nums = Array.from({ length: NUMBER_POOL }, () => {
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;left:0;top:0;display:none;font-weight:800;font-family:Georgia,'Times New Roman',serif;" +
      "text-shadow:0 1px 2px #000,0 0 5px #000,0 0 1px #000;white-space:nowrap;will-change:transform,opacity";
    layer.appendChild(el);
    return { el, t: 0, life: 0, x: 0, y: 0, z: 0, drift: 0, pop: 1 };
  });
  let nextNum = 0;

  const arrows = Array.from({ length: ARROW_POOL }, () => {
    const el = document.createElement("div");
    // A curved wedge: the top edge of a ring, glowing red, pointing outward from the middle.
    el.style.cssText =
      "position:absolute;left:50%;top:50%;width:120px;height:46px;margin:-23px 0 0 -60px;display:none;" +
      "border-top:6px solid rgba(235,40,28,0.95);border-radius:50% 50% 0 0 / 100% 100% 0 0;" +
      "filter:drop-shadow(0 0 6px rgba(255,30,10,0.9));will-change:transform,opacity";
    layer.appendChild(el);
    return { el, t: 0, x: 0, z: 0 };
  });
  let nextArrow = 0;

  return {
    number(x, y, z, amount, kind) {
      if (kind !== "blocked" && !(amount > 0)) return;
      const n = nums[nextNum];
      nextNum = (nextNum + 1) % NUMBER_POOL;
      const s = STYLE[kind];
      n.el.textContent = kind === "blocked" ? "Blocked" : String(Math.max(1, Math.round(amount)));
      n.el.style.color = s.color;
      n.el.style.fontSize = `${s.size}px`;
      n.t = 0;
      n.life = kind === "kill" || kind === "head" ? NUMBER_S * 1.2 : NUMBER_S;
      n.x = x;
      n.z = z;
      // Blows in quick succession on one monster start a little higher than the one still rising.
      let stack = 0;
      for (const o of nums) if (o !== n && o.life > 0 && o.t < 0.45 && Math.hypot(o.x - x, o.z - z) < 0.6) stack++;
      n.y = y + Math.min(3, stack) * 0.28;
      // Spread so a flurry of blows does not stack in one place.
      n.drift = ((nextNum * 37) % 11) / 10 - 0.5;
      n.pop = kind === "kill" || kind === "head" ? 1.45 : 1.2;
    },
    hurtFrom(x, z) {
      const a = arrows[nextArrow];
      nextArrow = (nextArrow + 1) % ARROW_POOL;
      a.t = ARROW_S;
      a.x = x;
      a.z = z;
    },
    update(dt, camera, view, at) {
      for (const n of nums) {
        if (n.life <= 0) continue;
        n.t += dt;
        const u = n.t / n.life;
        if (u >= 1) {
          n.life = 0;
          n.el.style.display = "none";
          continue;
        }
        _v.set(n.x, n.y + RISE_M * (1 - (1 - u) * (1 - u)), n.z).project(camera);
        if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) {
          n.el.style.display = "none";
          continue;
        }
        const sx = ((_v.x + 1) / 2) * view.width + n.drift * 46 * u;
        const sy = ((1 - _v.y) / 2) * view.height;
        // A quick pop to full size, then a fade over the last half.
        const scale = u < 0.12 ? n.pop - (n.pop - 1) * (u / 0.12) : 1;
        n.el.style.display = "block";
        n.el.style.opacity = String(u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5);
        n.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%) scale(${scale})`;
      }
      // The way the camera looks, flat on the floor (first or third person alike).
      camera.getWorldDirection(_d);
      const yaw = Math.atan2(_d.x, _d.z);
      for (const a of arrows) {
        if (a.t <= 0) continue;
        a.t -= dt;
        if (a.t <= 0) {
          a.el.style.display = "none";
          continue;
        }
        // The blow's bearing against the way he looks: 0 straight ahead (the top of the screen),
        // a quarter turn to his right shows on the right.
        const rel = Math.atan2(a.x - at.x, a.z - at.z) - yaw;
        const deg = (-rel * 180) / Math.PI;
        a.el.style.display = "block";
        a.el.style.opacity = String(Math.min(1, a.t / (ARROW_S * 0.6)));
        a.el.style.transform = `rotate(${deg}deg) translateY(-${ARROW_RING}px)`;
      }
    },
    clear() {
      for (const n of nums) {
        n.life = 0;
        n.el.style.display = "none";
      }
      for (const a of arrows) {
        a.t = 0;
        a.el.style.display = "none";
      }
    },
    dispose() {
      layer.remove();
    },
  };
}
