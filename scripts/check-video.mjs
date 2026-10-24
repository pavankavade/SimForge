/**
 * Final-render check: contact sheet + integrated loudness.
 *
 *   npm run check:video -- <slug>          # reads out/<slug>.mp4
 *   npm run check:video -- out/file.mp4
 *
 * Writes out/review/<slug>-video-sheet-N.png (every 40th frame, 10x6 tiles,
 * frame numbers burned in) and prints integrated loudness (target -14 LUFS,
 * accept -15..-13) and true peak (must be <= -1 dBTP).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npm run check:video -- <slug | path/to/video.mp4>");
  process.exit(1);
}

const video = arg.endsWith(".mp4") ? path.resolve(root, arg) : path.join(root, "out", `${arg}.mp4`);
if (!existsSync(video)) {
  console.error(`Not found: ${video}. Run npm run render:<slug> first.`);
  process.exit(1);
}

const name = path.basename(video, ".mp4");
const outDir = path.join(root, "out", "review");
mkdirSync(outDir, { recursive: true });

const ffmpeg = (args) => spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const STEP = 40;
const font = process.platform === "win32" ? "fontfile='C\\:/Windows/Fonts/arial.ttf':" : "";
const label = `drawtext=${font}text='%{eif\\:n*${STEP}\\:d}':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`;
const sheetPattern = path.join(outDir, `${name}-video-sheet-%d.png`);

const sheet = ffmpeg([
  "-i", video,
  "-vf", `select='not(mod(n\\,${STEP}))',scale=180:320,setpts=N/TB,${label},tile=10x6`,
  "-vsync", "vfr",
  sheetPattern,
]);
if (sheet.status !== 0) {
  console.error(sheet.stderr.split("\n").slice(-15).join("\n"));
  process.exit(1);
}
console.log(`Contact sheets: ${sheetPattern.replace("%d", "N")} (frame number in each tile)`);

const loud = ffmpeg(["-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"]);
const summary = loud.stderr.slice(loud.stderr.lastIndexOf("Summary:"));
const integrated = Number((summary.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]);
const peak = Number((summary.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]);
console.log(`Integrated loudness: ${integrated} LUFS (target -14)`);
console.log(`True peak: ${peak} dBTP (must be <= -1)`);

const ok = Math.abs(integrated + 14) <= 1 && !(peak > -1);
console.log(ok ? "Loudness OK." : "Loudness OUT OF RANGE - check the render script's loudnorm step and the stem levels.");
process.exit(ok ? 0 : 2);
