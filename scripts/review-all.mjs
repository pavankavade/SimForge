#!/usr/bin/env node
/**
 * Regression sheet for the shared kit: a few stills of EVERY episode (all
 * series, campaign segments included) from one studio bundle, plus every
 * episode's audit. Run it before and after touching anything shared (rig,
 * camera, post FX, sets, kit helpers):
 *
 *   npm run review:all -- --out out/review/all-before      # before the change
 *   npm run review:all -- --compare out/review/all-before  # after: before|after pairs
 *
 * Options:
 *   --at 0.15,0.4,0.65,0.9   where to sample each episode (fractions of its length)
 *   --only <regex>           composition ids to include (e.g. "Trap|Boulder")
 *   --scale 0.25             still scale (default 0.25)
 *   --out <dir>              default out/review/all
 *   --compare <dir>          pair each still with the same still from an earlier --out
 *   --concurrency 3          parallel stills (heavy scenes can crash WebGL above ~3)
 *
 * Writes one sheet row per episode: <out>/portrait-N.png (9:16) and
 * <out>/landscape-N.png (16:9), or compare-*.png with --compare.
 */
import { bundle } from "@remotion/bundler";
import { getCompositions, openBrowser, renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { FULL_ENTRY } from "./solo.mjs";
import { labelStill, pairStills, printAudit, tileSheets } from "./sheet.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const at = opt("--at", "0.15,0.4,0.65,0.9").split(",").map(Number);
const only = opt("--only") ? new RegExp(opt("--only")) : null;
const scale = Number(opt("--scale", "0.25"));
const concurrency = Number(opt("--concurrency", "3"));
const outDir = path.resolve(root, opt("--out", path.join("out", "review", "all")));
const compareDir = opt("--compare") ? path.resolve(root, opt("--compare")) : null;
fs.mkdirSync(outDir, { recursive: true });

const bundleDir = path.join(root, "out", "review", ".bundle-all");
console.log("Bundling the full studio...");
const serveUrl = await bundle({ entryPoint: FULL_ENTRY, outDir: bundleDir, rspack: true, enableCaching: false });
const chromiumOptions = { gl: "angle" };
// Episodes are the compositions defineEpisode() made (they carry an audit).
const episodes = (await getCompositions(serveUrl, { chromiumOptions })).filter((c) => c.defaultProps?.audit && (!only || only.test(c.id)));
console.log(`${episodes.length} episodes\n`);

let problems = 0;
for (const c of episodes) problems += printAudit(root, c);

const jobs = [];
for (const c of episodes) {
  for (const t of at) {
    const frame = Math.max(0, Math.min(c.durationInFrames - 1, Math.round(t * (c.durationInFrames - 1))));
    jobs.push({ c, frame, file: path.join(outDir, c.id, `f-${String(frame).padStart(5, "0")}.png`) });
  }
}

const browser = await openBrowser("chrome", { chromiumOptions });
let next = 0;
const t0 = Date.now();
const failed = [];
const worker = async () => {
  while (next < jobs.length) {
    const job = jobs[next++];
    fs.mkdirSync(path.dirname(job.file), { recursive: true });
    try {
      await renderStill({ serveUrl, composition: job.c, frame: job.frame, output: job.file, scale, puppeteerInstance: browser, chromiumOptions, overwrite: true });
      process.stdout.write(".");
    } catch (e) {
      failed.push(`${job.c.id} @ ${job.frame}: ${String(e.message ?? e).split("\n")[0]}`);
      job.file = null;
      process.stdout.write("x");
    }
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
await browser.close({ silent: true });
console.log(`\n${jobs.length - failed.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
failed.forEach((f) => console.log(`  FAILED ${f}`));

// ---------------------------------------------------------------- sheets
const labelDir = path.join(outDir, ".labelled");
fs.rmSync(labelDir, { recursive: true, force: true });
fs.mkdirSync(labelDir, { recursive: true });
const groups = { portrait: [], landscape: [] };
jobs.forEach((job, i) => {
  if (!job.file) return;
  const out = path.join(labelDir, `l-${String(i).padStart(4, "0")}.png`);
  const text = `${job.c.id} ${job.frame}`;
  const before = compareDir ? path.join(compareDir, job.c.id, path.basename(job.file)) : null;
  if (before && fs.existsSync(before)) {
    pairStills(before, job.file, out, Math.round((job.c.height * scale) / 2) * 2, text);
    // Pairs of different aspect cannot share a sheet either.
    (groups[`compare-${job.c.width > job.c.height ? "landscape" : "portrait"}`] ??= []).push(out);
  } else {
    labelStill(job.file, out, text);
    groups[job.c.width > job.c.height ? "landscape" : "portrait"].push(out);
  }
});
const sheets = [];
for (const [name, files] of Object.entries(groups)) {
  if (!files.length) continue;
  const cols = name.startsWith("compare") ? 2 : at.length;
  sheets.push(...tileSheets(files, outDir, { cols, rows: name.startsWith("compare") ? 3 : 6, prefix: name }));
}
console.log("Contact sheets:");
sheets.forEach((s) => console.log("  " + s));
if (problems) console.log(`\n${problems} audit problem(s) across ${episodes.length} episodes (listed above).`);
process.exit(failed.length ? 1 : 0);
