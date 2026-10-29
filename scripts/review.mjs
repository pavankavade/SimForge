#!/usr/bin/env node
/**
 * Render review stills for a composition and tile them into a labelled
 * contact sheet. One bundle, one browser, stills rendered in parallel.
 *
 *   node scripts/review.mjs <CompositionId> [frames...] [options]
 *
 * Frames:
 *   120 245 300          explicit frames
 *   100:400:20           range a:b:step (a:b:1 = every frame, for checking motion)
 *   --beats              every beat in the composition's defaultProps.beats
 *                        (plus beat-6 / beat+12 with --around)
 *   --every N            every N frames over the whole composition
 *   --pages              CharacterLab pages (frame page*30+15)
 *
 * Options:
 *   --audit              print the audit and the beat table (name, frame) and stop
 *   --compare <dir>      pair every still with the same frame in <dir> (an earlier
 *                        --out) as before|after; e.g. render --out out/review/x-before,
 *                        change the code, then --compare out/review/x-before
 *   --scale 0.4          still scale (default 0.4)
 *   --cols 5             contact sheet columns (default 5, 3 with --compare)
 *   --out <dir>          output dir (default out/review/<CompositionId>)
 *   --reuse              reuse the previous bundle (skip re-bundling)
 *   --concurrency 4      parallel stills (default 4)
 *   --full               bundle the whole studio (src/index.ts) instead of the
 *                        episode on its own (scripts/solo.mjs; the default for
 *                        episodes, so a half-built episode elsewhere cannot break it)
 *   --entry <file>       bundle this entry instead
 *
 * Every run first prints the episode audit (engine/audit.ts: NaN cameras,
 * waypoints out of order, cues or beats outside the video, missing files,
 * narration longer than the video). Fix those first.
 *
 * Prints the sheet path(s). Look at every sheet before calling a change done.
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { FULL_ENTRY, entryFor } from "./solo.mjs";
import { labelStill, pairStills, printAudit, tileSheets } from "./sheet.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const valueArgs = new Set(["--scale", "--cols", "--out", "--every", "--concurrency", "--entry", "--compare"]);
const id = args.find((a, i) => !a.startsWith("-") && !valueArgs.has(args[i - 1]) && !/^[\d:]+$/.test(a));
if (!id) {
  console.error("usage: node scripts/review.mjs <CompositionId> [frames...] [--beats|--every N|--pages] [--audit] [--compare dir] [--scale s] [--cols n] [--reuse]");
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(name);
const compareDir = opt("--compare") ? path.resolve(root, opt("--compare")) : null;
const scale = Number(opt("--scale", "0.4"));
const cols = Number(opt("--cols", compareDir ? "3" : "5"));
const concurrency = Number(opt("--concurrency", "4"));
const outDir = path.resolve(root, opt("--out", path.join("out", "review", id)));
// One bundle dir per composition, so reviews of different episodes can run at the same time.
const bundleDir = path.join(root, "out", "review", `.bundle-${id}`);
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- bundle
let serveUrl = bundleDir;
if (!flag("--reuse") || !fs.existsSync(path.join(bundleDir, "index.html"))) {
  // No bundler cache: a cached bundle can lag one edit behind and show stale stills.
  const entryPoint = opt("--entry") ? path.resolve(root, opt("--entry")) : flag("--full") ? FULL_ENTRY : entryFor(id);
  console.log(`Bundling ${path.relative(root, entryPoint)}...`);
  serveUrl = await bundle({ entryPoint, outDir: bundleDir, rspack: true, enableCaching: false });
}

const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
const last = composition.durationInFrames - 1;

// ---------------------------------------------------------------- audit
printAudit(root, composition);
const beats = composition.defaultProps?.beats;
if (flag("--audit")) {
  if (beats) {
    const rows = [];
    for (const name of Object.keys(beats)) {
      const v = beats[name];
      (Array.isArray(v) ? v : [v]).forEach((f, j, list) => rows.push([list.length > 1 ? `${name}[${j}]` : name, Math.round(f)]));
    }
    rows.sort((a, b) => a[1] - b[1]);
    console.log(`\nBeats (${rows.length}, ${composition.durationInFrames} frames @ ${composition.fps} fps):`);
    rows.forEach(([name, f]) => console.log(`  ${String(f).padStart(5)}  ${(f / composition.fps).toFixed(2).padStart(6)}s  ${name}`));
  }
  process.exit(0);
}

// ---------------------------------------------------------------- frames
/** @type {{frame:number,label:string}[]} */
let shots = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (valueArgs.has(a)) {
    i++;
    continue;
  }
  if (a.startsWith("--") || a === id) continue;
  const range = a.split(":").map(Number);
  if (range.length === 3) {
    for (let f = range[0]; f <= range[1]; f += range[2]) shots.push({ frame: f, label: `${f}` });
  } else if (Number.isFinite(range[0])) {
    shots.push({ frame: range[0], label: `${range[0]}` });
  }
}
if (flag("--every")) {
  const n = Number(opt("--every", "60"));
  for (let f = 0; f <= last; f += n) shots.push({ frame: f, label: `${f}` });
}
if (flag("--pages")) {
  for (let f = 15; f <= last; f += 30) shots.push({ frame: f, label: `page ${(f - 15) / 30}` });
}
if (flag("--beats")) {
  if (!beats) {
    console.error(`${id} exposes no defaultProps.beats (see defineEpisode({ beats })).`);
    process.exit(1);
  }
  const around = flag("--around");
  for (const [name, v] of Object.entries(beats)) {
    const list = Array.isArray(v) ? v : [v];
    list.forEach((f, j) => {
      if (typeof f !== "number") return;
      const tag = list.length > 1 ? `${name}[${j}]` : name;
      if (around) shots.push({ frame: Math.round(f) - 6, label: `${tag}-6` });
      shots.push({ frame: Math.round(f), label: tag });
      if (around) shots.push({ frame: Math.round(f) + 12, label: `${tag}+12` });
    });
  }
}
if (!shots.length) shots = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ frame: Math.round(t * last), label: `${Math.round(t * last)}` }));
shots = shots
  .map((s) => ({ ...s, frame: Math.max(0, Math.min(last, s.frame)) }))
  .sort((a, b) => a.frame - b.frame);

// ---------------------------------------------------------------- render
const still = (dir, frame) => path.join(dir, `f-${String(frame).padStart(5, "0")}.png`);
const browser = await openBrowser("chrome", { chromiumOptions });
const files = new Array(shots.length);
let next = 0;
const t0 = Date.now();
const worker = async () => {
  while (next < shots.length) {
    const i = next++;
    const { frame } = shots[i];
    const output = still(outDir, frame);
    await renderStill({ serveUrl, composition, frame, output, scale, puppeteerInstance: browser, chromiumOptions, overwrite: true });
    files[i] = output;
    process.stdout.write(".");
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, shots.length) }, worker));
await browser.close({ silent: true });
console.log(`\n${shots.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---------------------------------------------------------------- contact sheet
const labelDir = path.join(outDir, ".labelled");
fs.rmSync(labelDir, { recursive: true, force: true });
fs.mkdirSync(labelDir, { recursive: true });
const height = Math.round((composition.height * scale) / 2) * 2;
// Before|after pairs are twice as wide as single stills, so they tile into their own sheets.
const paired = [];
const single = [];
shots.forEach((s, i) => {
  const out = path.join(labelDir, `l-${String(i).padStart(4, "0")}.png`);
  const before = compareDir ? still(compareDir, s.frame) : null;
  if (before && fs.existsSync(before)) {
    pairStills(before, files[i], out, height, s.label);
    paired.push(out);
  } else {
    labelStill(files[i], out, s.label);
    single.push(out);
  }
});
if (compareDir && single.length) console.log(`${single.length} frame(s) have no counterpart in ${path.relative(root, compareDir)} (sheet-N, alone)`);
const sheets = [
  ...(paired.length ? tileSheets(paired, outDir, { cols, prefix: "compare" }) : []),
  ...(single.length ? tileSheets(single, outDir, { cols: compareDir ? 5 : cols }) : []),
];
console.log("Contact sheets:");
sheets.forEach((s) => console.log("  " + s));
