// Pictures of the items that are not part of the paladin's kit (his pieces are rendered off his own
// body). Valuables and trophies are rendered from their Patch models on a small off-screen
// renderer; coins, the draught, the bandage, the gems, the jewellery and the soft hats are drawn.
import * as THREE from "three";
import { JEWEL_GEM, JEWEL_IDS } from "./items";
import { PROC_ICONS } from "./monsters/icons3d";
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

/** A gem: a bright core fading to `color`, a dark rim and a highlight. */
function gem(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.beginPath();
  g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.15, -0.6, 0, Math.PI * 2);
  g.fill();
}

/** Jewellery: one drawing for every ring and every necklace, the stone in its own colour. */
function drawJewel(g: CanvasRenderingContext2D, kind: "necklace" | "ring", color: string): void {
  const gold = g.createLinearGradient(20, 20, 108, 108);
  gold.addColorStop(0, "#fff0b0");
  gold.addColorStop(0.5, "#d0a040");
  gold.addColorStop(1, "#6a4810");
  if (kind === "ring") {
    g.strokeStyle = gold;
    g.lineWidth = 13;
    g.beginPath();
    g.ellipse(64, 74, 34, 30, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(44, 46);
    g.lineTo(84, 46);
    g.lineTo(74, 30);
    g.lineTo(54, 30);
    g.closePath();
    g.fill();
    gem(g, 64, 32, 17, color);
  } else {
    g.strokeStyle = gold;
    g.lineWidth = 4;
    g.setLineDash([5, 3]);
    g.beginPath();
    g.moveTo(18, 14);
    g.quadraticCurveTo(28, 74, 64, 78);
    g.quadraticCurveTo(100, 74, 110, 14);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(64, 70);
    g.lineTo(86, 92);
    g.lineTo(64, 120);
    g.lineTo(42, 92);
    g.closePath();
    g.fill();
    gem(g, 64, 94, 16, color);
  }
}

/** Hats and hoods (nothing shows on him): a plain silhouette in the cloth's colour. */
function drawHat(g: CanvasRenderingContext2D, id: string): void {
  const shade = (top: string, bottom: string) => {
    const grad = g.createLinearGradient(0, 16, 0, 116);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    return grad;
  };
  if (id === "wizard_hat") {
    g.fillStyle = shade("#4a62c8", "#1a2460");
    g.beginPath();
    g.moveTo(70, 10);
    g.quadraticCurveTo(84, 40, 90, 92);
    g.lineTo(40, 92);
    g.quadraticCurveTo(52, 50, 70, 10);
    g.fill();
    g.beginPath();
    g.ellipse(64, 96, 54, 14, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e0c060";
    g.fillRect(42, 82, 46, 8);
    g.fillStyle = "#fff3a0";
    g.beginPath();
    g.arc(66, 52, 5, 0, Math.PI * 2);
    g.fill();
  } else {
    // A hood (the ranger's, green-brown leather) or a chaperon (red wool with its tail).
    const hood = id === "ranger_hood";
    g.fillStyle = hood ? shade("#6a5a36", "#2e2614") : shade("#c0403a", "#5a1412");
    g.beginPath();
    g.moveTo(64, 14);
    g.bezierCurveTo(104, 14, 112, 70, 104, 108);
    g.lineTo(24, 108);
    g.bezierCurveTo(16, 70, 24, 14, 64, 14);
    g.fill();
    if (!hood) {
      g.beginPath();
      g.moveTo(96, 40);
      g.bezierCurveTo(120, 60, 122, 96, 112, 120);
      g.lineTo(100, 116);
      g.bezierCurveTo(108, 90, 100, 66, 90, 52);
      g.fill();
    }
    g.fillStyle = "rgba(10,8,6,0.9)";
    g.beginPath();
    g.ellipse(64, 72, 24, 30, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function drawn(id: string): string | null {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;
  if (JEWEL_GEM[id]) drawJewel(g, JEWEL_GEM[id].slot, JEWEL_GEM[id].gem);
  else if (id === "wizard_hat" || id === "ranger_hood" || id === "chaperon") drawHat(g, id);
  else if (id === "coins") {
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
  } else if (id === "bandage") {
    // A roll of linen with its loose end trailing, a strip of red cloth tie.
    g.fillStyle = "#e9e2d0";
    g.fillRect(38, 66, 70, 22);
    g.fillStyle = "#d6ccb4";
    for (let x = 42; x < 106; x += 9) g.fillRect(x, 66, 2, 22);
    const roll = g.createRadialGradient(46, 60, 4, 54, 64, 34);
    roll.addColorStop(0, "#fffaf0");
    roll.addColorStop(0.7, "#e2d8c2");
    roll.addColorStop(1, "#a8987a");
    g.fillStyle = roll;
    g.beginPath();
    g.ellipse(52, 62, 30, 32, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(120,100,70,0.55)";
    g.lineWidth = 2;
    for (const r of [8, 15, 22]) {
      g.beginPath();
      g.ellipse(52, 62, r, r * 1.07, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "#b8282a";
    g.fillRect(48, 28, 8, 68);
  } else if (id === "grave_dust") {
    // A small leather pouch tied at the neck, grey ash spilling from it.
    g.fillStyle = "#8d8a84";
    g.beginPath();
    g.ellipse(84, 100, 30, 9, 0, 0, Math.PI * 2);
    g.fill();
    const grad = g.createRadialGradient(52, 64, 6, 58, 76, 40);
    grad.addColorStop(0, "#a07a52");
    grad.addColorStop(1, "#4a3420");
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(58, 78, 30, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#5a3e26";
    g.fillRect(48, 36, 20, 18);
    g.strokeStyle = "#2a1c10";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(44, 54);
    g.lineTo(72, 52);
    g.stroke();
  } else if (id === "spell_page") {
    // A scorched page with lines of script and a burnt corner.
    g.save();
    g.translate(64, 64);
    g.rotate(-0.12);
    g.fillStyle = "#d9c79c";
    g.fillRect(-36, -46, 72, 92);
    g.fillStyle = "rgba(60,30,10,0.85)";
    for (let y = -36; y < 36; y += 9) g.fillRect(-28, y, 40 + ((y * 7) % 16), 2.5);
    g.fillStyle = "#7a5ad8";
    g.beginPath();
    g.arc(18, 22, 9, 0, Math.PI * 2);
    g.fill();
    const burn = g.createRadialGradient(36, 46, 2, 36, 46, 34);
    burn.addColorStop(0, "rgba(10,6,2,1)");
    burn.addColorStop(0.5, "rgba(60,30,8,0.9)");
    burn.addColorStop(1, "rgba(60,30,8,0)");
    g.fillStyle = burn;
    g.fillRect(-36, -46, 72, 92);
    g.restore();
  } else if (id === "candle") {
    g.fillStyle = "#1c1814";
    g.fillRect(50, 52, 28, 58);
    g.fillStyle = "#2e2822";
    g.fillRect(50, 52, 8, 58);
    g.fillStyle = "#111";
    g.fillRect(62, 40, 3, 12);
    const fl = g.createRadialGradient(63, 30, 1, 63, 30, 14);
    fl.addColorStop(0, "rgba(255,240,190,1)");
    fl.addColorStop(1, "rgba(255,150,40,0)");
    g.fillStyle = fl;
    g.beginPath();
    g.ellipse(63, 30, 7, 13, 0, 0, Math.PI * 2);
    g.fill();
  } else if (id === "rusty_sword") {
    // Diagonal, point up-right: a pitted brown blade, a plain cross and grip.
    g.save();
    g.translate(64, 64);
    g.rotate(-Math.PI / 4);
    const blade = g.createLinearGradient(-6, 0, 6, 0);
    blade.addColorStop(0, "#5a4430");
    blade.addColorStop(0.5, "#9a7a58");
    blade.addColorStop(1, "#4a3424");
    g.fillStyle = blade;
    g.beginPath();
    g.moveTo(-6, 22);
    g.lineTo(-6, -48);
    g.lineTo(0, -58);
    g.lineTo(6, -48);
    g.lineTo(6, 22);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(120,50,20,0.6)";
    for (let i = 0; i < 9; i++) g.fillRect(-5 + ((i * 5) % 9), -40 + i * 7, 3, 3);
    g.fillStyle = "#3a3028";
    g.fillRect(-20, 22, 40, 6);
    g.fillStyle = "#4a3020";
    g.fillRect(-4, 28, 8, 22);
    g.fillStyle = "#3a3028";
    g.beginPath();
    g.arc(0, 54, 6, 0, Math.PI * 2);
    g.fill();
    g.restore();
  } else return null;
  return c.toDataURL("image/png");
}

let made: Promise<Record<string, string>> | null = null;

/**
 * Icons for every non-kit item, made once (data URLs keyed by item id). `onProgress` gets what is
 * ready so far as it comes: the drawn ones at once, then each model's as it renders, so a slow
 * phone shows the belt's draught and bandage straight away instead of after every model loads.
 */
export function itemIcons(onProgress?: (sofar: Record<string, string>) => void): Promise<Record<string, string>> {
  if (made) return made;
  made = (async () => {
    const out: Record<string, string> = {};
    for (const id of ["coins", "potion", "bandage", "ruby", "sapphire", "grave_dust", "spell_page", "candle", "rusty_sword", "wizard_hat", "ranger_hood", "chaperon"].concat(JEWEL_IDS)) {
      const u = drawn(id);
      if (u) out[id] = u;
    }
    onProgress?.({ ...out });
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
        onProgress?.({ ...out });
      } catch {
        // Its name stands in.
      }
    }
    // The monsters' drops, from their code-built models.
    for (const id of Object.keys(PROC_ICONS)) {
      try {
        const o = PROC_ICONS[id]();
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
