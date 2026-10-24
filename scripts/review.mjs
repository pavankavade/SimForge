#!/usr/bin/env node
/**
 * Render review stills for a composition and tile them into a labelled
 * contact sheet. One bundle, one browser, stills rendered in parallel.
 *
 *   node scripts/review.mjs <CompositionId> [frames...] [options]
 *
 * Frames:
 *   120 245 300          explicit frames
 *   100:400:20           range a:b:step
 *   --beats              every beat in the composition's defaultProps.beats
 *                        (plus beat-6 / beat+12 with --around)
 *   --every N            every N frames over the whole composition
 *   --pages              CharacterLab pages (frame page*30+15)
 *
 * Options:
 *   --scale 0.4          still scale (default 0.4)
 *   --cols 5             contact sheet columns (default 5)
 *   --out <dir>          output dir (default out/review/<CompositionId>)
 *   --reuse              reuse the previous bundle (skip re-bundling)
 *   --concurrency 4      parallel stills (default 4)
 *
 * Prints the sheet path(s). Look at every sheet before calling a change done.
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
if (!args.length || args[0].startsWith("-")) {
  console.error("usage: node scripts/review.mjs <CompositionId> [frames...] [--beats|--every N|--pages] [--scale s] [--cols n] [--reuse]");
  process.exit(1);
}
const id = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(name);
const scale = Number(opt("--scale", "0.4"));
const cols = Number(opt("--cols", "5"));
const concurrency = Number(opt("--concurrency", "4"));
const outDir = path.resolve(root, opt("--out", path.join("out", "review", id)));
const bundleDir = path.join(root, "out", "review", ".bundle");
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- bundle
let serveUrl = bundleDir;
if (!flag("--reuse") || !fs.existsSync(path.join(bundleDir, "index.html"))) {
  console.log("Bundling...");
  // No bundler cache: a cached bundle can lag one edit behind and show stale stills.
  serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), outDir: bundleDir, rspack: true, enableCaching: false });
}

const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
const last = composition.durationInFrames - 1;

// ---------------------------------------------------------------- frames
/** @type {{frame:number,label:string}[]} */
let shots = [];
const valueArgs = new Set(["--scale", "--cols", "--out", "--every", "--concurrency"]);
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (valueArgs.has(a)) {
    i++;
    continue;
  }
  if (a.startsWith("--")) continue;
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
  const beats = composition.defaultProps?.beats;
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
const browser = await openBrowser("chrome", { chromiumOptions });
const files = new Array(shots.length);
let next = 0;
const t0 = Date.now();
const worker = async () => {
  while (next < shots.length) {
    const i = next++;
    const { frame } = shots[i];
    const output = path.join(outDir, `f-${String(frame).padStart(5, "0")}.png`);
    await renderStill({ serveUrl, composition, frame, output, scale, puppeteerInstance: browser, chromiumOptions, overwrite: true });
    files[i] = output;
    process.stdout.write(".");
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, shots.length) }, worker));
await browser.close({ silent: true });
console.log(`\n${shots.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---------------------------------------------------------------- contact sheet
const fontCandidates = ["C:/Windows/Fonts/arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"];
const font = fontCandidates.find((f) => fs.existsSync(f));
const fontArg = font ? `fontfile='${font.replace(/:/g, "\\:")}':` : "";
const labelDir = path.join(outDir, ".labelled");
fs.rmSync(labelDir, { recursive: true, force: true });
fs.mkdirSync(labelDir, { recursive: true });
const perSheet = cols * Math.max(1, Math.ceil(Math.min(shots.length, cols * 4) / cols));
const sheets = [];
shots.forEach((s, i) => {
  const text = s.label.replace(/[:'\\]/g, " ");
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", files[i],
    "-vf", `drawtext=${fontArg}text='${text}':x=12:y=12:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6`,
    path.join(labelDir, `l-${String(i).padStart(4, "0")}.png`),
  ]);
});
for (let start = 0; start < shots.length; start += perSheet) {
  const count = Math.min(perSheet, shots.length - start);
  const rows = Math.ceil(count / cols);
  const sheet = path.join(outDir, `sheet-${sheets.length + 1}.png`);
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-start_number", String(start),
    "-i", path.join(labelDir, "l-%04d.png"),
    "-frames:v", "1",
    "-vf", `tile=${cols}x${rows}:padding=6:color=0x111111`,
    sheet,
  ]);
  sheets.push(sheet);
}
console.log("Contact sheets:");
sheets.forEach((s) => console.log("  " + s));
