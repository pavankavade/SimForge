// The shelter-series HUD (title card, level badges, word-by-word captions, end stamp) redrawn as
// plain DOM over the canvas, as in the crypt lab, plus the outside/inside thermometers for l6a.
const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";
const ALL_STAGES = 6;
const BADGE_FRAMES = 80;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const back = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

const root = document.createElement("div");
Object.assign(root.style, { position: "fixed", inset: "0", pointerEvents: "none", fontFamily: FONT });
document.body.appendChild(root);

export function drawHud({ title, titleFrame, stage, caption, end, thermo, noX }) {
  let html = "";
  if (title) {
    const f = titleFrame;
    const top = back(clamp01(f / 10), 1.8), main = back(clamp01((f - 5) / 11), 1.6);
    const out = 1 - clamp01((f - 66) / 14);
    html += `<div style="position:absolute;top:250px;left:0;right:0;text-align:center;opacity:${out};transform:translateY(${(1 - out) * -40}px)">
      <div style="font-size:50px;color:#fff;letter-spacing:4px;text-shadow:${STROKE};transform:scale(${top})">HOW A SNOW PILE BECOMES AN</div>
      <div style="font-size:150px;line-height:1.05;color:#ffd84d;letter-spacing:2px;text-shadow:${STROKE};transform:scale(${main}) rotate(-2deg)">IGLOO</div></div>`;
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
  if (thermo) html += thermometers(thermo);
  if (noX != null) { // "Don't.": a big red cross slams over the campfire
    const s = 1 + 1.2 * Math.pow(1 - clamp01(noX / 5), 3), o = 1 - clamp01((noX - 22) / 8);
    html += `<div style="position:absolute;top:640px;left:0;right:0;text-align:center;font-size:420px;line-height:1;color:#ff3b30;opacity:${o};
      -webkit-text-stroke:14px #000;paint-order:stroke fill;transform:scale(${s}) rotate(-4deg)">✕</div>`;
  }
  if (end) html += endCard(end);
  root.innerHTML = html;
}

// Two thermometers for l6a: the outside one drops to -40, the inside one holds just above freezing.
function thermometers({ age, out, inside }) {
  const pop = (d) => back(clamp01((age - d) / 9));
  const gauge = (label, deg, col, x, d) => {
    const fill = clamp01((deg + 45) / 60); // -45..+15 C
    return `<div style="position:absolute;top:520px;${x};display:flex;flex-direction:column;align-items:center;transform:scale(${pop(d)})">
      <div style="font-size:40px;color:#fff;letter-spacing:3px;text-shadow:${STROKE}">${label}</div>
      <div style="position:relative;width:46px;height:300px;margin:14px 0;border:6px solid #000;border-radius:26px;background:rgba(255,255,255,0.85);overflow:hidden">
        <div style="position:absolute;left:0;right:0;bottom:0;height:${fill * 100}%;background:${col}"></div></div>
      <div style="font-size:84px;color:${col};text-shadow:${STROKE}">${deg > 0 ? "+" : ""}${Math.round(deg)}°</div></div>`;
  };
  return gauge("OUTSIDE", out, "#6fb4ff", "left:90px", 0) + gauge("INSIDE", inside, "#ffb04a", "right:90px", 12);
}

// The end stamp: "BLIZZARD STATUS" and the -40 PROOF stamp slam in.
function endCard({ age }) {
  const slam = 1 + 1.4 * Math.pow(1 - clamp01(age / 6), 3);
  const label = back(clamp01((age - 2) / 8));
  return `<div style="position:absolute;top:190px;left:0;right:0;text-align:center">
    <div style="font-size:52px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};transform:scale(${label})">BLIZZARD STATUS</div>
    <div style="position:relative;height:170px;margin-top:34px;transform:scale(${slam}) rotate(-6deg);display:flex;align-items:center;justify-content:center">
      <div style="font-size:104px;color:#3fb6ff;border:10px solid #3fb6ff;border-radius:14px;padding:4px 28px;letter-spacing:4px;
        text-shadow:0 4px 0 #0b3a5a;background:rgba(255,255,255,0.12);box-shadow:0 0 0 4px #000, inset 0 0 0 4px #000">-40 PROOF</div></div></div>`;
}
