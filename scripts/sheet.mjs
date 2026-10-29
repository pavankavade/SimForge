/**
 * Contact-sheet helpers shared by review.mjs and review-all.mjs (ffmpeg on PATH).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const fontCandidates = ["C:/Windows/Fonts/arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"];
const font = fontCandidates.find((f) => fs.existsSync(f));
const fontArg = font ? `fontfile='${font.replace(/:/g, "\\:")}':` : "";
const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
const clean = (text) => String(text).replace(/[:'\\%]/g, " ");
const drawText = (text, size = 28) =>
  `drawtext=${fontArg}text='${clean(text)}':x=12:y=12:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6`;

/** Copies `input` to `output` with `text` burned into the top-left corner. */
export const labelStill = (input, output, text) => ffmpeg(["-i", input, "-vf", drawText(text), output]);

/** `before` | `after` side by side at `height` px, each labelled, into `output`. */
export const pairStills = (before, after, output, height, text) =>
  ffmpeg([
    "-i", before,
    "-i", after,
    "-filter_complex",
    `[0:v]scale=-2:${height},${drawText(`${text} before`)}[a];[1:v]scale=-2:${height},${drawText(`${text} after`)}[b];[a][b]hstack=2`,
    output,
  ]);

/**
 * Tiles same-sized images into sheets of `cols` x up to `rows` tiles and returns
 * the sheet paths (`<outDir>/<prefix>-N.png`).
 */
export const tileSheets = (files, outDir, { cols = 5, rows = 4, prefix = "sheet" } = {}) => {
  const seq = path.join(outDir, `.${prefix}-seq`);
  fs.rmSync(seq, { recursive: true, force: true });
  fs.mkdirSync(seq, { recursive: true });
  files.forEach((f, i) => fs.copyFileSync(f, path.join(seq, `t-${String(i).padStart(4, "0")}.png`)));
  const perSheet = cols * rows;
  const sheets = [];
  for (let start = 0; start < files.length; start += perSheet) {
    const count = Math.min(perSheet, files.length - start);
    const sheet = path.join(outDir, `${prefix}-${sheets.length + 1}.png`);
    ffmpeg([
      "-start_number", String(start),
      "-i", path.join(seq, "t-%04d.png"),
      "-frames:v", "1",
      "-vf", `tile=${Math.min(cols, count)}x${Math.ceil(count / cols)}:padding=6:color=0x111111`,
      sheet,
    ]);
    sheets.push(sheet);
  }
  fs.rmSync(seq, { recursive: true, force: true });
  return sheets;
};

/** Duration in seconds of a media file (null if ffprobe cannot read it). */
export const mediaSeconds = (file) => {
  const res = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const s = Number(res.stdout.trim());
  return res.status === 0 && Number.isFinite(s) ? s : null;
};

/**
 * Prints an episode's audit (defaultProps.audit from engine/audit.ts) plus the
 * checks only Node can do: every played file exists under public/, and the
 * narration is not longer than the video. Returns the number of problems.
 */
export const printAudit = (root, composition) => {
  const audit = composition.defaultProps?.audit;
  if (!audit) return 0;
  const problems = [...audit.warnings];
  for (const src of audit.assets) {
    if (!fs.existsSync(path.join(root, "public", src))) problems.push(`missing file public/${src}`);
  }
  const narration = audit.narration;
  if (narration && fs.existsSync(path.join(root, "public", narration))) {
    const secs = mediaSeconds(path.join(root, "public", narration));
    const video = composition.durationInFrames / composition.fps;
    if (secs !== null && secs > video + 0.05) {
      problems.push(`narration ${narration} is ${secs.toFixed(2)}s but the video is ${video.toFixed(2)}s: the end is cut off (re-run the audio script / update DURATION)`);
    }
  }
  if (problems.length) {
    console.log(`\n${composition.id}: ${problems.length} audit problem(s)`);
    problems.forEach((p) => console.log(`  - ${p}`));
  } else {
    console.log(`${composition.id}: audit clean (${audit.assets.length} files checked)`);
  }
  return problems.length;
};
