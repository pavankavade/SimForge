import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out");
mkdirSync(outDir, { recursive: true });

const compId = process.argv[2];
const slug = process.argv[3] || compId?.toLowerCase();

if (!compId || !slug) {
  console.error("Usage: node scripts/render-safe.mjs <CompositionId> [slug]");
  process.exit(1);
}

function getNonOverwritingPath(baseName, ext) {
  let candidate = path.join(outDir, `${baseName}${ext}`);
  if (!existsSync(candidate)) return candidate;

  let version = 2;
  while (true) {
    candidate = path.join(outDir, `${baseName}_v${version}${ext}`);
    if (!existsSync(candidate)) return candidate;
    version++;
  }
}

const rawPath = path.join(outDir, `${slug}.raw.mp4`);
const finalPath = getNonOverwritingPath(slug, ".mp4");

console.log(`[Safe Render] Target composition: ${compId}`);
console.log(`[Safe Render] Non-overwriting output destination: ${finalPath}`);

// 1. Remotion Render
console.log(`\n=== Step 1: Remotion Rendering ===`);
const remotionArgs = [
  "remotion", "render", compId, rawPath,
  "--concurrency=8",
  "--crf=18",
  "--audio-bitrate=192k"
];

const remotionRes = spawnSync("npx", remotionArgs, { cwd: root, stdio: "inherit", shell: true });
if (remotionRes.status !== 0) {
  console.error("[Safe Render] Remotion render failed with code:", remotionRes.status);
  process.exit(remotionRes.status || 1);
}

// 2. FFmpeg Loudness Normalization
console.log(`\n=== Step 2: FFmpeg Audio Mastering & Muxing ===`);
const ffmpegArgs = [
  "-y",
  "-hide_banner",
  "-loglevel", "error",
  "-i", rawPath,
  "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
  "-ar", "48000",
  "-c:a", "aac",
  "-b:a", "192k",
  finalPath
];

const ffmpegRes = spawnSync("ffmpeg", ffmpegArgs, { cwd: root, stdio: "inherit", shell: true });
if (ffmpegRes.status !== 0) {
  console.error("[Safe Render] FFmpeg loudnorm failed with code:", ffmpegRes.status);
  process.exit(ffmpegRes.status || 1);
}

console.log(`\n[Safe Render] Successfully created: ${finalPath}`);

// 3. Automated check
console.log(`\n=== Step 3: Video Quality & Loudness Check ===`);
spawnSync("node", ["scripts/check-video.mjs", finalPath], { cwd: root, stdio: "inherit", shell: true });
