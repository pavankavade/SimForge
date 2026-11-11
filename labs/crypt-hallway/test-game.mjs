// Play-tests the boulder game: every class against every trap (src/boulder/playtest.js).
//   node test-game.mjs --node    the sim in node (fast, while tuning)
//   node test-game.mjs           in headless Chrome on the dev server's page (npm run dev): the matrix
//                                on the sim the page loaded, then the live game driven by real key events
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync, mkdirSync } from "node:fs";

const ZONES = ["door", "crushers", "wire", "slime", "magnet"];
const slash = (p) => resolve(p).replace(/\\/g, "/");

if (process.argv.includes("--node")) {
  const dir = resolve("node_modules/.cache");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "playtest-entry.mjs"), `import { createSim } from "${slash("src/boulder/sim.js")}";
import { runMatrix, report } from "${slash("src/boulder/playtest.js")}";
const r = report(runMatrix(createSim, ${JSON.stringify(ZONES)}));
console.log(r.text);
console.log(r.ok ? "ALL PASS" : "SOME FAIL");
process.exitCode = r.ok ? 0 : 1;
`);
  const out = join(dir, "playtest-node.mjs");
  const b = spawnSync(`"${resolve("../../node_modules/.bin/esbuild")}"`, [`"${join(dir, "playtest-entry.mjs")}"`, "--bundle", "--platform=node", "--format=esm", `"--outfile=${out}"`, "--log-level=error"], { stdio: "inherit", shell: true });
  if (b.status) process.exit(1);
  process.exit(spawnSync("node", [out], { stdio: "inherit" }).status);
}

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9335;
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "crypt-lab-test")}`,
  "--enable-unsafe-webgpu", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=1280,720",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") console.log("  exception:", m.params.exceptionDetails.exception?.description?.slice(0, 300));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate failed");
  return r.result?.result?.value;
};
await send("Runtime.enable");
let failed = false;
try {
  await send("Page.navigate", { url: "http://localhost:5190/?hall=boulder&play=1&class=rogue" });
  const t0 = Date.now();
  while (!(await evaluate("!!window.__game"))) {
    if (Date.now() - t0 > 180000) throw new Error("the game never started");
    await sleep(500);
  }
  console.log(`page up in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${await evaluate("navigator.userAgent.includes('Headless') ? 'headless Chrome' : 'Chrome'")}, ${await evaluate("navigator.gpu ? 'WebGPU' : 'WebGL2'")}`);
  // 1. the full matrix, on the sim module the page itself runs
  const r = await evaluate(`(async () => {
    const { createSim } = await import("/src/boulder/sim.js");
    const { runMatrix, report } = await import("/src/boulder/playtest.js");
    return report(runMatrix(createSim, ${JSON.stringify(ZONES)}));
  })()`);
  console.log(r.text);
  console.log(r.ok ? "matrix: ALL PASS" : "matrix: SOME FAIL");
  failed ||= !r.ok;
  // 2. the live game, through real key events: a rogue vaults the first ball (and, idle, dies to it)
  const live = await evaluate(`(async () => {
    const g = window.__game, key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const until = (fn, ms = 20000) => new Promise((res) => { const t0 = performance.now(); const t = setInterval(() => { if (fn() || performance.now() - t0 > ms) { clearInterval(t); res(fn()); } }, 8); });
    const out = {};
    g.restart();
    await until(() => g.sim.state.ball);
    await until(() => g.sim.player.state !== "alive" || g.sim.state.zone > 0);
    out.idle = { state: g.sim.player.state, reason: g.sim.player.reason };
    g.restart();
    await until(() => g.sim.state.ball);
    await until(() => g.sim.ballPos(g.sim.state.ball)[0] - g.sim.player.x < 6.0);
    key("keydown", "KeyE"); await new Promise((r) => setTimeout(r, 90)); key("keyup", "KeyE");
    await until(() => g.sim.state.zone > 0 || g.sim.player.state !== "alive");
    out.vault = { state: g.sim.player.state, reason: g.sim.player.reason, zone: g.sim.state.zone };
    return out;
  })()`);
  console.log("live game, rogue at the door, real key events:", JSON.stringify(live));
  if (live.idle.state === "alive" || live.vault.zone !== 1) { console.log("live game: FAIL"); failed = true; } else console.log("live game: PASS");
} catch (e) { console.log("ERROR", e.message); failed = true; }
ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
