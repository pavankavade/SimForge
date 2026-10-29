#!/usr/bin/env node
/**
 * Renders, masters and checks one video: the whole "render:<slug>" pipeline.
 *
 *   node scripts/render.mjs <CompositionId> [slug] [--keep] [--concurrency 8] [--crf 18]
 *                           [--lufs -14] [--tp -1.5] [-- extra remotion render args]
 *
 *  1. scripts/solo.mjs render -> out/<slug>.raw.mp4 (only this episode is bundled)
 *  2. scripts/master-audio.mjs two-pass loudness -> out/<slug>.mp4
 *     (--keep writes out/<slug>_v2.mp4, _v3, ... instead of overwriting)
 *  3. scripts/check-video.mjs: contact sheet + loudness check
 *
 * `slug` defaults to the kebab-case composition id (CrushingWalls -> crushing-walls).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { master } from "./master-audio.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const dash = argv.indexOf("--");
const extra = dash >= 0 ? argv.slice(dash + 1) : [];
const args = dash >= 0 ? argv.slice(0, dash) : argv;
const valueArgs = new Set(["--concurrency", "--crf", "--lufs", "--tp"]);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !valueArgs.has(args[i - 1]));
const [id, slugArg] = positional;
if (!id) {
  console.error("usage: node scripts/render.mjs <CompositionId> [slug] [--keep] [--concurrency 8] [--crf 18] [--lufs -14] [--tp -1.5] [-- remotion args]");
  process.exit(1);
}
const slug = slugArg ?? id.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const outDir = path.join(root, "out");
mkdirSync(outDir, { recursive: true });

const raw = path.join(outDir, `${slug}.raw.mp4`);
let final = path.join(outDir, `${slug}.mp4`);
if (args.includes("--keep")) {
  for (let v = 2; existsSync(final); v++) final = path.join(outDir, `${slug}_v${v}.mp4`);
}
const rel = (p) => path.relative(root, p);

console.log(`\n=== 1/3 Render ${id} -> ${rel(raw)}`);
const render = spawnSync(
  process.execPath,
  ["scripts/solo.mjs", "render", id, raw, `--concurrency=${opt("--concurrency", "8")}`, `--crf=${opt("--crf", "18")}`, "--audio-bitrate=192k", ...extra],
  { cwd: root, stdio: "inherit" }
);
if (render.status !== 0) {
  console.error(`Render failed (exit ${render.status}).`);
  process.exit(render.status ?? 1);
}

console.log(`\n=== 2/3 Master audio -> ${rel(final)}`);
const r = master(raw, final, { lufs: Number(opt("--lufs", "-14")), tp: Number(opt("--tp", "-1.5")) });
console.log(`${r.before.i} LUFS / ${r.before.tp} dBTP -> ${r.after.i} LUFS / ${r.after.tp} dBTP (gain ${r.gain.toFixed(2)} dB${r.limited ? ", peaks limited" : ""})`);

console.log(`\n=== 3/3 Check`);
const check = spawnSync(process.execPath, ["scripts/check-video.mjs", final], { cwd: root, stdio: "inherit" });
process.exit(check.status ?? 1);
