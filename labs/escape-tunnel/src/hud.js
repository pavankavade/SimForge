// The shelter-series HUD as plain DOM over the canvas, as in the crypt, igloo and spy-horse labs:
// level badges and word-by-word captions. This short has no title card and no end stamp: the
// hook is spoken from frame 0 and the last picture loops back into it.

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";
const ALL_STAGES = 5;
const BADGE_FRAMES = 80;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const back = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

const root = document.createElement("div");
Object.assign(root.style, { position: "fixed", inset: "0", pointerEvents: "none", fontFamily: FONT, overflow: "hidden" });
document.body.appendChild(root);

export function drawHud({ stage, caption, fade, depth, clock }) {
  let html = "";
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
  if (depth != null) {
    html += `<div style="position:absolute;top:300px;right:64px;text-align:right;text-shadow:${STROKE};color:#fff">
      <div style="font-size:170px;line-height:1;color:#ffd84d">${depth}</div>
      <div style="font-size:54px;letter-spacing:6px">FEET DOWN</div></div>`;
  }
  if (clock) {
    // a clock that runs from nine at night to six in the morning while you crawl
    const hours = 21 + 9 * clock.t, hh = ((Math.floor(hours) + 11) % 12) + 1, pm = hours % 24 >= 12;
    const pop = back(clamp01(clock.age / 9));
    const hand = (deg, len, wid) => `<line x1="150" y1="150" x2="${150 + len * Math.sin((deg * Math.PI) / 180)}" y2="${150 - len * Math.cos((deg * Math.PI) / 180)}" stroke="#111" stroke-width="${wid}" stroke-linecap="round"/>`;
    html += `<div style="position:absolute;top:250px;left:0;right:0;display:flex;flex-direction:column;align-items:center;transform:scale(${pop})">
      <svg width="300" height="300" viewBox="0 0 300 300"><circle cx="150" cy="150" r="138" fill="#f4ecd8" stroke="#000" stroke-width="12"/>
        ${Array.from({ length: 12 }, (_, i) => `<line x1="150" y1="28" x2="150" y2="48" stroke="#111" stroke-width="8" transform="rotate(${i * 30} 150 150)"/>`).join("")}
        ${hand(hours * 30, 70, 14)}${hand((hours % 1) * 360, 105, 9)}<circle cx="150" cy="150" r="10" fill="#111"/></svg>
      <div style="font-size:76px;color:#ffd84d;text-shadow:${STROKE};margin-top:8px">${hh} ${pm ? "PM" : "AM"}</div></div>`;
  }
  if (caption) {
    const words = caption.map((x) => `<span style="color:${x.on ? "#ffd84d" : "#fff"}">${x.word}</span>`).join(" ");
    html += `<div style="position:absolute;bottom:370px;left:60px;right:60px;text-align:center;font-size:68px;line-height:1.15;
      -webkit-text-stroke:7px rgba(0,0,0,0.96);paint-order:stroke fill;text-shadow:0 6px 18px rgba(0,0,0,0.5)">${words}</div>`;
  }
  if (fade) html += `<div style="position:absolute;inset:0;background:#000;opacity:${fade}"></div>`;
  root.innerHTML = html;
}
