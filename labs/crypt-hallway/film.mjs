// Film the animated camera test (src/anim.js) frame by frame with headless Chrome, then encode.
// node film.mjs <out-dir> side front threeq top   -> <out-dir>/<cam>.mp4 and compare.mp4
// Needs the dev server running (npm run dev) and ffmpeg on PATH. FRAMES=n limits the length;
// PICK=0,60,120 renders just those frames (no video) to check framing.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const [outDir, ...cams] = process.argv.slice(2);
if (!outDir || !cams.length) { console.error("usage: node film.mjs <out-dir> <cam>..."); process.exit(1); }
const W = 1080, H = 1920;

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9334;
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "crypt-lab-film")}`,
  "--enable-unsafe-webgpu", "--enable-gpu", "--ignore-gpu-blocklist", `--window-size=${W},${H}`,
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") console.log("  console:", m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  if (m.method === "Runtime.exceptionThrown") console.log("  exception:", m.params.exceptionDetails.exception?.description?.slice(0, 300));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (r.status) throw new Error("ffmpeg failed");
};

for (const cam of cams) {
  const dir = resolve(outDir, cam);
  mkdirSync(dir, { recursive: true });
  await send("Page.navigate", { url: `http://localhost:5190/?cam=${cam}${process.env.Q ? "&" + process.env.Q : ""}` });
  const t0 = Date.now();
  while (!(await evaluate("typeof window.__step === 'function'"))) {
    if (Date.now() - t0 > 180000) throw new Error("page never got ready");
    await sleep(300);
  }
  const n = Math.min(Number(process.env.FRAMES ?? 1e9), await evaluate("window.__frameCount"));
  await evaluate("window.__step(0, 60)"); // warm up TRAA/SSGI history
  const pick = process.env.PICK?.split(",").map(Number);
  for (const f of pick ?? Array.from({ length: n }, (_, i) => i)) {
    await evaluate(`window.__step(${f}, ${pick ? 30 : 3})`);
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 93 });
    writeFileSync(join(dir, `${String(f).padStart(4, "0")}.jpg`), Buffer.from(shot.result.data, "base64"));
    if (f % 30 === 0) console.log(`${cam} ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (pick) continue;
  // sound: narration + score + the beat-keyed SFX list the page exposes, mixed by mix.py
  const audio = { ...(await evaluate("window.__audio")), frames: n };
  writeFileSync(resolve(outDir, "audio.json"), JSON.stringify(audio, null, 1));
  const wav = resolve(outDir, "mix.wav");
  const py = spawnSync("python", [resolve("mix.py"), resolve(outDir, "audio.json"), wav], { stdio: "inherit" });
  if (py.status) throw new Error("mix.py failed");
  ffmpeg(["-framerate", "30", "-i", join(dir, "%04d.jpg"), "-i", wav, "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", resolve(outDir, `${cam}.mp4`)]);
  // the repo's two-pass loudness master (-14 LUFS), as for an episode render
  const m = spawnSync("node", [resolve("../../scripts/master-audio.mjs"), resolve(outDir, `${cam}.mp4`), resolve(outDir, `${cam}-final.mp4`)], { stdio: "inherit" });
  if (m.status) throw new Error("master-audio failed");
  console.log(`${cam}-final.mp4  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ws.close();
chrome.kill();

// all rigs side by side, labelled
if (cams.length > 1 && !process.env.PICK) {
  const inputs = cams.flatMap((c) => ["-i", resolve(outDir, `${c}.mp4`)]);
  const lab = cams.map((c, i) => `[${i}:v]scale=540:960,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='${c}':x=20:y=20:fontsize=40:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=8[v${i}]`).join(";");
  const stack = `${cams.map((_, i) => `[v${i}]`).join("")}hstack=inputs=${cams.length}[out]`;
  ffmpeg([...inputs, "-filter_complex", `${lab};${stack}`, "-map", "[out]", "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", resolve(outDir, "compare.mp4")]);
  console.log("compare.mp4");
}
writeFileSync(resolve(outDir, "cams.txt"), cams.join("\n"));
