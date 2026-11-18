// Pictures of the items that are not part of the paladin's kit (his pieces are rendered off his own
// body). Valuables and trophies are rendered from their Patch models on a small off-screen
// renderer; coins, the draught and the gems are drawn.
import * as THREE from "three";
import { loadModel } from "./props3d";

const MODEL_ICONS: Record<string, { path: string; tilt?: number; turn?: number }> = {
  goblet: { path: "market/brass_goblets", turn: 0.4 },
  ewer: { path: "market/brass_vase_01" },
  vase: { path: "market/ceramic_vase_01" },
  urn: { path: "market/antique_ceramic_vase_01" },
  bust: { path: "rooms/marble_bust_01", turn: 0.3 },
  trencher: { path: "rooms/carved_wooden_plate", tilt: 0.9 },
  apple: { path: "rooms/food_apple_01", turn: 0.5 },
  estoc: { path: "market/antique_estoc" },
  mace: { path: "market/ornate_medieval_mace" },
  warhammer: { path: "market/ornate_war_hammer" },
  saber: { path: "market/wooden_handle_saber", turn: 1.4 },
};

function drawn(id: string): string | null {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;
  if (id === "coins") {
    for (const [x, y, r] of [
      [50, 78, 30],
      [80, 70, 28],
      [64, 50, 30],
    ]) {
      const grad = g.createRadialGradient(x - 8, y - 8, 4, x, y, r);
      grad.addColorStop(0, "#fff3b8");
      grad.addColorStop(0.55, "#e0aa36");
      grad.addColorStop(1, "#7a4d0c");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(90,55,10,0.8)";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, r - 6, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (id === "potion") {
    g.fillStyle = "#6b4a2a";
    g.fillRect(54, 14, 20, 14);
    g.fillStyle = "rgba(200,230,240,0.35)";
    g.fillRect(56, 26, 16, 22);
    const grad = g.createRadialGradient(56, 70, 6, 64, 80, 40);
    grad.addColorStop(0, "#ff8a7a");
    grad.addColorStop(0.6, "#c41f22");
    grad.addColorStop(1, "#5a0608");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(64, 82, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.beginPath();
    g.ellipse(50, 70, 7, 12, -0.5, 0, Math.PI * 2);
    g.fill();
  } else if (id === "ruby" || id === "sapphire") {
    const [light, mid, dark] = id === "ruby" ? ["#ffb0b8", "#e0203a", "#5a0414"] : ["#cfe4ff", "#2f6fe0", "#0a1c55"];
    const pts: Array<[number, number]> = [
      [64, 18],
      [104, 48],
      [92, 100],
      [36, 100],
      [24, 48],
    ];
    const grad = g.createLinearGradient(30, 20, 100, 110);
    grad.addColorStop(0, light);
    grad.addColorStop(0.45, mid);
    grad.addColorStop(1, dark);
    g.fillStyle = grad;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(24, 48);
    g.lineTo(104, 48);
    g.moveTo(44, 48);
    g.lineTo(64, 100);
    g.lineTo(84, 48);
    g.stroke();
  } else return null;
  return c.toDataURL("image/png");
}

let made: Promise<Record<string, string>> | null = null;

/** Icons for every non-kit item, made once (data URLs keyed by item id). */
export function itemIcons(): Promise<Record<string, string>> {
  if (made) return made;
  made = (async () => {
    const out: Record<string, string> = {};
    for (const id of ["coins", "potion", "ruby", "sapphire"]) {
      const u = drawn(id);
      if (u) out[id] = u;
    }
    const canvas = document.createElement("canvas");
    const size = 128;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    } catch {
      return out;
    }
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff2dc, 0x302820, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.5, 2.5, 3);
    scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    for (const id of Object.keys(MODEL_ICONS)) {
      const spec = MODEL_ICONS[id];
      try {
        const o = (await loadModel(spec.path)).clone(true);
        o.rotation.set(spec.tilt ?? 0, spec.turn ?? 0, 0);
        scene.add(o);
        o.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(o);
        const c = box.getCenter(new THREE.Vector3());
        const s = box.getSize(new THREE.Vector3());
        const r = Math.max(s.x, s.y, s.z) * 0.62;
        cam.position.set(c.x, c.y + r * 0.15, c.z + r / Math.tan((cam.fov * Math.PI) / 360));
        cam.lookAt(c);
        renderer.setClearColor(0x000000, 0);
        renderer.render(scene, cam);
        out[id] = canvas.toDataURL("image/png");
        scene.remove(o);
      } catch {
        // Its name stands in.
      }
    }
    renderer.dispose();
    renderer.forceContextLoss();
    return out;
  })();
  return made;
}
