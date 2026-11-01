// Capture stills of the lab with headless Chrome over CDP (no extra deps; Node 22+ WebSocket).
// node shoot.mjs <out-dir> "<query>" [more queries...]   e.g. "s=3&pitch=0.12"
// Needs the dev server running (npm run dev). Each query renders at 1280x720 unless it sets w/h.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const [outDir, ...queries] = process.argv.slice(2);
if (!outDir || !queries.length) { console.error("usage: node shoot.mjs <out-dir> <query>..."); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "crypt-lab-chrome")}`,
  "--enable-unsafe-webgpu", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=1280,720",
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
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

let n = 0;
for (const q of queries) {
  const query = q.includes("w=") ? q : `w=1280&h=720&${q}`;
  const qp = new URLSearchParams(query);
  await send("Emulation.setDeviceMetricsOverride", { width: Number(qp.get("w")), height: Number(qp.get("h")), deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:5190/?${query}` });
  const settle = Number(process.env.SETTLE ?? 90); // frames after the first one (TRAA/SSGI accumulate)
  const t0 = Date.now();
  let f = 0;
  while (Date.now() - t0 < 180000) {
    await sleep(500);
    f = (await evaluate("window.__frames ?? 0")) ?? 0;
    if (f >= settle) break;
  }
  const hud = await evaluate("document.getElementById('hud').textContent");
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const file = resolve(outDir, `${String(++n).padStart(2, "0")}.png`);
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`${file}  [${q}]  frames=${f}  ${((Date.now() - t0) / 1000).toFixed(1)}s  ${hud}`);
}
ws.close();
chrome.kill();
