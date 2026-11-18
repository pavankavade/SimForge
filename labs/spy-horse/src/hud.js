// The shelter-series HUD (title card, level badges, word-by-word captions, end stamp) as plain DOM
// over the canvas, as in the crypt and igloo labs, plus this short's overlays: the enemy's
// binocular view (with red map marks), the slit in the neck, the artist's pencil sketch drawing
// itself, the red "Don't" cross and a VHS-style rewind.
import { SKETCH_PATHS } from "./set.js";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";
const ALL_STAGES = 6;
const BADGE_FRAMES = 80;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const back = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

const root = document.createElement("div");
Object.assign(root.style, { position: "fixed", inset: "0", pointerEvents: "none", fontFamily: FONT, overflow: "hidden" });
document.body.appendChild(root);

export function drawHud({ title, titleFrame, stage, caption, end, noX, mask, mark, sketch, rewind }) {
  let html = "";
  if (mask === "binoc") html += binoculars(mark);
  if (mask === "slit") html += slitView();
  if (sketch) html += sketchCard(sketch);
  if (title) {
    const f = titleFrame;
    const top = back(clamp01(f / 10), 1.8), main = back(clamp01((f - 5) / 11), 1.6);
    const out = 1 - clamp01((f - 66) / 14);
    html += `<div style="position:absolute;top:250px;left:0;right:0;text-align:center;opacity:${out};transform:translateY(${(1 - out) * -40}px)">
      <div style="font-size:50px;color:#fff;letter-spacing:4px;text-shadow:${STROKE};transform:scale(${top})">HOW A DEAD HORSE BECOMES A</div>
      <div style="font-size:140px;line-height:1.05;color:#ffd84d;letter-spacing:2px;text-shadow:${STROKE};transform:scale(${main}) rotate(-2deg)">SPY POST</div>
      <div style="font-size:44px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};margin-top:6px;opacity:${clamp01((f - 14) / 8)}">WORLD WAR ONE</div></div>`;
  }
  if (stage && stage.pop < BADGE_FRAMES) {
    const age = stage.pop;
    const enter = back(clamp01(age / 9));
    const exit = 1 - clamp01((age - (BADGE_FRAMES - 12)) / 12);
    const fill = clamp01((age - 8) / 8);
    const gems = Array.from({ length: ALL_STAGES }, (_, i) => {
      const isNew = i === stage.n - 1;
      const lit = i < stage.n - 1 ? 1 : isNew ? fill : 0;
      return `<div style="width:34px;height:34px;border-radius:8px;transform:rotate(45deg);border:4px solid #000;
        background:${lit > 0 ? stage.color : "rgba(255,255,255,0.18)"};opacity:${lit > 0 ? 0.35 + lit * 0.65 : 1};
        ${isNew && lit > 0 ? `box-shadow:0 0 22px ${stage.color};` : ""}"></div>`;
    }).join("");
    html += `<div style="position:absolute;top:190px;left:0;right:0;display:flex;flex-direction:column;align-items:center;opacity:${exit};
      transform:translateY(${(1 - enter) * -60}px) scale(${0.7 + enter * 0.3})">
      <div style="display:flex;gap:14px;margin-bottom:14px">${gems}</div>
      <div style="font-size:40px;color:#fff;letter-spacing:5px;text-shadow:${STROKE}">LEVEL ${stage.n}</div>
      <div style="font-size:62px;color:${stage.color};text-shadow:${STROKE};line-height:1.1;text-align:center;padding:0 40px">${stage.name}</div></div>`;
  }
  if (caption) {
    const words = caption.map((x) => `<span style="color:${x.on ? "#ffd84d" : "#fff"}">${x.word}</span>`).join(" ");
    html += `<div style="position:absolute;bottom:370px;left:60px;right:60px;text-align:center;font-size:68px;line-height:1.15;
      -webkit-text-stroke:7px rgba(0,0,0,0.96);paint-order:stroke fill;text-shadow:0 6px 18px rgba(0,0,0,0.5)">${words}</div>`;
  }
  if (noX != null) {
    const s = 1 + 1.2 * Math.pow(1 - clamp01(noX / 5), 3), o = 1 - clamp01((noX - 20) / 8);
    html += `<div style="position:absolute;top:620px;left:0;right:0;text-align:center;font-size:420px;line-height:1;color:#ff3b30;opacity:${o};
      -webkit-text-stroke:14px #000;paint-order:stroke fill;transform:scale(${s}) rotate(-4deg)">✕</div>`;
  }
  if (rewind != null) {
    const o = Math.sin(Math.PI * clamp01(rewind / 12));
    html += `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.08) 0 6px,rgba(0,0,0,0.12) 6px 14px);opacity:${o}"></div>
      <div style="position:absolute;top:760px;left:0;right:0;text-align:center;font-size:120px;color:#fff;opacity:${o};text-shadow:${STROKE}">◀◀</div>`;
  }
  if (end) html += endCard(end);
  root.innerHTML = html;
}

// The enemy officer's binoculars: two overlapping circles, dark outside, a faint lens tint, and
// (mark) red grease-pencil rings round what he spots in the middle of the view.
function binoculars(mark) {
  const W = 1080, H = 1920, cy = 900, r = 430;
  let rings = "";
  if (mark) {
    const k = clamp01(mark.age / 10);
    const at = mark.n === 2 ? [[440, 930], [640, 905]] : [[540, 930]];
    rings = at.map(([x, y], i) => {
      const len = 760, dash = len * clamp01((mark.age - i * 8) / 10);
      return `<ellipse cx="${x}" cy="${y}" rx="${mark.n === 2 ? 120 : 190}" ry="${mark.n === 2 ? 85 : 120}" fill="none" stroke="#e8261c" stroke-width="12"
        stroke-dasharray="${dash} ${len}" transform="rotate(-8 ${x} ${y})" opacity="${k}"/>`;
    }).join("");
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">
    <defs><mask id="bm"><rect width="${W}" height="${H}" fill="white"/>
      <circle cx="${W / 2 - 230}" cy="${cy}" r="${r}" fill="black"/><circle cx="${W / 2 + 230}" cy="${cy}" r="${r}" fill="black"/></mask>
      <radialGradient id="bv" cx="50%" cy="50%" r="50%"><stop offset="70%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.7"/></radialGradient></defs>
    <circle cx="${W / 2 - 230}" cy="${cy}" r="${r}" fill="url(#bv)"/><circle cx="${W / 2 + 230}" cy="${cy}" r="${r}" fill="url(#bv)"/>
    <rect width="${W}" height="${H}" fill="#050505" mask="url(#bm)"/>
    <line x1="${W / 2 - 60}" y1="${cy}" x2="${W / 2 + 60}" y2="${cy}" stroke="rgba(0,0,0,0.5)" stroke-width="3"/>
    <line x1="${W / 2}" y1="${cy - 60}" x2="${W / 2}" y2="${cy + 60}" stroke="rgba(0,0,0,0.5)" stroke-width="3"/>
    ${rings}</svg>`;
}

// Looking out through the slit in the neck: a narrow, ragged letterbox of daylight.
function slitView() {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0">
    <defs><mask id="sm"><rect width="1080" height="1920" fill="white"/>
      <path d="M90 860 C 300 800, 780 800, 990 860 C 780 990, 300 990, 90 860 Z" fill="black"/></mask>
      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d14"/><stop offset="1" stop-color="#130d09"/></linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#sg)" mask="url(#sm)"/>
    <path d="M90 860 C 300 800, 780 800, 990 860 C 780 990, 300 990, 90 860 Z" fill="none" stroke="#000" stroke-width="18" opacity="0.6"/></svg>`;
}

// The artist's sketchbook page: the pencil lines draw themselves over the night shot.
function sketchCard({ t, age }) {
  const pop = back(clamp01(age / 10), 1.4);
  const n = SKETCH_PATHS.length;
  const paths = SKETCH_PATHS.map((d, i) => {
    const k = clamp01(t * n * 1.15 - i);
    return `<path d="${d}" fill="none" stroke="#2c2a28" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="${k} 1"/>`;
  }).join("");
  return `<div style="position:absolute;top:150px;left:90px;width:900px;height:520px;transform:scale(${pop}) rotate(-3deg);
      background:#ece4cf;border:8px solid #000;border-radius:10px;box-shadow:0 18px 40px rgba(0,0,0,0.6)">
    <svg viewBox="0 0 840 440" width="884" height="504" style="position:absolute;left:0;top:0">${paths}
      <text x="40" y="420" font-family="Georgia" font-weight="bold" font-size="30" fill="#3a3632" opacity="${clamp01(t * 3 - 2)}">Bay, 14 hands. Left eye up.</text></svg></div>`;
}

function endCard({ age }) {
  const slam = 1 + 1.4 * Math.pow(1 - clamp01(age / 6), 3);
  const label = back(clamp01((age - 2) / 8));
  return `<div style="position:absolute;top:190px;left:0;right:0;text-align:center">
    <div style="font-size:52px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};transform:scale(${label})">SNIPER STATUS</div>
    <div style="position:relative;height:170px;margin-top:34px;transform:scale(${slam}) rotate(-6deg);display:flex;align-items:center;justify-content:center">
      <div style="font-size:112px;color:#ff4a3a;border:10px solid #ff4a3a;border-radius:14px;padding:4px 28px;letter-spacing:6px;
        text-shadow:0 4px 0 #5a0b0b;background:rgba(255,255,255,0.12);box-shadow:0 0 0 4px #000, inset 0 0 0 4px #000">FOOLED</div></div></div>`;
}
