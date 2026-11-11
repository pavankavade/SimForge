// The episode HUD (src/kit/TrapHUD.tsx + the subtitle track) redrawn as plain DOM over the canvas,
// so film.mjs's screenshots carry the title card, level badges and word-by-word captions.
const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', Arial, sans-serif";
const STROKE = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)";
const ALL_STAGES = 5; // the full episode has five levels; the film shows the first ones
const BADGE_FRAMES = 80;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const back = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

const root = document.createElement("div");
Object.assign(root.style, { position: "fixed", inset: "0", pointerEvents: "none", fontFamily: FONT });
document.body.appendChild(root);

// kicker/titleText/status default to Ep1's; the boulder hallway passes its own
export function drawHud({ title, titleFrame, stage, caption, end, kicker = "EVOLUTION OF A", titleText = "DUNGEON TRAP", status = "DUNGEON STATUS" }) {
  let html = "";
  if (title) {
    const f = titleFrame;
    const top = back(clamp01(f / 10), 1.8), main = back(clamp01((f - 5) / 11), 1.6);
    const out = 1 - clamp01((f - 66) / 14);
    html += `<div style="position:absolute;top:250px;left:0;right:0;text-align:center;opacity:${out};transform:translateY(${(1 - out) * -40}px)">
      <div style="font-size:56px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};transform:scale(${top})">${kicker}</div>
      <div style="font-size:104px;line-height:1.05;color:#ffd84d;letter-spacing:2px;text-shadow:${STROKE};transform:scale(${main}) rotate(-2deg)">${titleText}</div></div>`;
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
  if (end) html += endCard(end, status);
  root.innerHTML = html;
}

// The end card (kit TrapHUD's end + challenge): "DUNGEON STATUS" and the UNBEATABLE stamp slam in,
// the stamp cracks on "unless", splits and falls on "prove", and the dare slams in.
const SPLIT = "polygon(0 0, 52% 0, 47% 28%, 54% 52%, 46% 76%, 51% 100%, 0 100%)";
const SPLIT_R = "polygon(52% 0, 100% 0, 100% 100%, 51% 100%, 46% 76%, 54% 52%, 47% 28%)";
function endCard({ age, crack, dare, play = -1 }, status) {
  let html = "";
  const slam = 1 + 1.4 * Math.pow(1 - clamp01(age / 6), 3);
  const label = back(clamp01((age - 2) / 8));
  const falling = dare >= 4 ? dare - 4 : -1;
  if (falling < 14) {
    const gap = crack >= 0 ? Math.min(16, 2 * crack) : 0;
    const jitter = crack >= 0 && dare < 0 ? Math.sin(crack * 2.3) * 2 : 0;
    const drop = falling >= 0 ? falling * falling * 6 : 0;
    const piece = (clip, dx, rot) => `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      clip-path:${clip};transform:translate(${dx}px,${drop}px) rotate(${rot}deg)">
      <div style="font-size:104px;color:#e8322a;border:10px solid #e8322a;border-radius:14px;padding:4px 28px;letter-spacing:4px;
        text-shadow:0 4px 0 #5a0d08;background:rgba(255,255,255,0.08);box-shadow:0 0 0 4px #000, inset 0 0 0 4px #000">UNBEATABLE</div></div>`;
    const stamp = crack >= 0
      ? piece(SPLIT, -gap / 2 + jitter, falling >= 0 ? -falling * 2 : -1) + piece(SPLIT_R, gap / 2 - jitter, falling >= 0 ? falling * 2.5 : 1)
      : piece("none", 0, 0);
    html += `<div style="position:absolute;top:190px;left:0;right:0;text-align:center">
      <div style="font-size:52px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};transform:scale(${label});opacity:${falling >= 0 ? 1 - falling / 14 : 1}">${status}</div>
      <div style="position:relative;height:170px;margin-top:34px;transform:scale(${slam}) rotate(-6deg)">${stamp}</div></div>`;
  }
  if (play >= 0) { // the boulder hallway's last card: the game link (it replaces the dare)
    const s = 1 + 1.2 * Math.pow(1 - clamp01(play / 6), 3);
    const sub = back(clamp01((play - 6) / 9));
    return html + `<div style="position:absolute;top:230px;left:0;right:0;text-align:center">
      <div style="font-size:84px;color:#7dff5a;letter-spacing:2px;text-shadow:${STROKE};transform:scale(${s}) rotate(-3deg)">PLAY IT YOURSELF</div>
      <div style="font-size:48px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};margin-top:8px;transform:scale(${sub})">LINK IN THE COMMENTS</div></div>`;
  }
  if (dare >= 0) {
    const s = 1 + 1.2 * Math.pow(1 - clamp01(dare / 6), 3);
    const sub = back(clamp01((dare - 6) / 9));
    html += `<div style="position:absolute;top:230px;left:0;right:0;text-align:center">
      <div style="font-size:88px;color:#ffd84d;letter-spacing:2px;text-shadow:${STROKE};transform:scale(${s}) rotate(-3deg)">PROVE US WRONG</div>
      <div style="font-size:48px;color:#fff;letter-spacing:6px;text-shadow:${STROKE};margin-top:8px;transform:scale(${sub})">IN THE COMMENTS</div></div>`;
  }
  return html;
}
