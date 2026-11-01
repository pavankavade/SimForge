// Thumbnail check sheet: each thumbnail at full, home-feed (360 px) and
// sidebar/search (168 px) widths on YouTube's dark background, plus a
// greyscale copy for the contrast test.
//   node scripts/thumb-sheet.mjs out/whatif/teleport/thumbnails/teleport-thumb-1.png out/whatif/teleport/thumbnails/teleport-thumb-2.png ...
// Writes <first-file-stem>-sheet.png next to the first file (or --out <path>).
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
const files = args;
if (files.length === 0) {
  console.error("usage: node scripts/thumb-sheet.mjs <thumb.png> [...] [--out sheet.png]");
  process.exit(1);
}
const sheet = out ?? path.join(path.dirname(files[0]), `${path.basename(files[0], path.extname(files[0])).replace(/-\d+$/, "")}-sheet.png`);

// One row per thumbnail: 640 | 360 | 168 | 360 greyscale, padded on #0f0f0f.
const rows = files.map((_, i) =>
  [
    `[${i}:v]split=4[a${i}][b${i}][c${i}][d${i}]`,
    `[a${i}]scale=640:-2,pad=iw+24:ih+24:12:12:0x0f0f0f[A${i}]`,
    `[b${i}]scale=360:-2,pad=iw+24:384:12:12:0x0f0f0f[B${i}]`,
    `[c${i}]scale=168:-2,pad=iw+24:384:12:12:0x0f0f0f[C${i}]`,
    `[d${i}]scale=360:-2,format=gray,format=rgb24,pad=iw+24:384:12:12:0x0f0f0f[D${i}]`,
    `[A${i}][B${i}][C${i}][D${i}]hstack=4[r${i}]`,
  ].join(";"),
);
const stack = files.length > 1 ? `;${files.map((_, i) => `[r${i}]`).join("")}vstack=${files.length}[out]` : `;[r0]copy[out]`;
const res = spawnSync(
  "ffmpeg",
  ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex", rows.join(";") + stack, "-map", "[out]", "-frames:v", "1", sheet],
  { stdio: "inherit" },
);
if (res.status !== 0) process.exit(res.status ?? 1);
console.log(`Thumbnail sheet: ${sheet}`);
