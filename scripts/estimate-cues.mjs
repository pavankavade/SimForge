/**
 * Writes ESTIMATED narration cues for an episode from the LINES table in
 * scripts/<slug>-audio.py, so the episode compiles and renders before the
 * real voice exists (or while you are still rewriting lines).
 *
 *   node scripts/estimate-cues.mjs <slug>
 *
 * Output: src/episodes/<slug>/data/narrationCues.json + wordTimestamps.json.
 * The real `python scripts/<slug>-audio.py narration` overwrites both with
 * exact word frames; always re-run it before the final review.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FPS = 30;
const LEAD_IN_FRAMES = 20; // ~0.66 s title card
const FRAMES_PER_WORD = 11; // AndrewMultilingual at +6% speaks ~2.8 words/s
const WORD_FRAMES = 9;

export const parseLines = (py) => {
  const block = py.match(/^LINES\s*=\s*\[([\s\S]*?)^\]/m);
  if (!block) throw new Error("Could not find LINES = [ ... ] in the audio script.");
  const re = /\(\s*"([^"]+)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*([\d.]+)\s*\)/g;
  const lines = [];
  let m;
  while ((m = re.exec(block[1]))) {
    lines.push({ id: m[1], text: m[2].replace(/\\(.)/g, "$1"), pause: Number(m[3]) });
  }
  if (!lines.length) throw new Error("LINES is empty.");
  return lines;
};

export const estimateCues = async (slug) => {
  const py = await readFile(path.join(root, "scripts", `${slug}-audio.py`), "utf8");
  const lines = parseLines(py);
  let frame = LEAD_IN_FRAMES;
  const cues = {};
  const segments = [];
  for (const line of lines) {
    const words = line.text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i) => {
        const startFrame = frame + i * FRAMES_PER_WORD;
        return { word, startFrame, endFrame: startFrame + WORD_FRAMES };
      });
    const startFrame = words[0].startFrame;
    const endFrame = words[words.length - 1].endFrame;
    cues[line.id] = { startFrame, endFrame, words };
    segments.push({ startFrame, endFrame, text: line.text, words });
    frame = endFrame + Math.round(line.pause * FPS);
  }
  const dataDir = path.join(root, "src", "episodes", slug, "data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, "narrationCues.json"),
    JSON.stringify({ durationFrames: frame, estimated: true, lines: cues }, null, 2),
    "utf8",
  );
  await writeFile(path.join(dataDir, "wordTimestamps.json"), JSON.stringify(segments, null, 2), "utf8");
  return { lines: lines.length, durationFrames: frame };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/estimate-cues.mjs <slug>");
    process.exit(1);
  }
  const r = await estimateCues(slug);
  console.log(`Estimated cues for ${r.lines} lines, ${r.durationFrames} frames (src/episodes/${slug}/data/).`);
}
