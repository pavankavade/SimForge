/**
 * Scaffolds a new "Evolution of a ..." episode from templates/episode.
 *
 *   npm run new:episode -- <slug> "<Trap Title>" [--theme dungeon] [--no-audio]
 *
 * Creates:
 *   src/episodes/<slug>/            timeline.ts, Scene.tsx, config.ts, TrapHUD.tsx, index.ts, data/
 *   scripts/<slug>-audio.py         narration / score / sfx pipeline (edit LINES here)
 *   public/episodes/<slug>/         audio stems (built by the audio script)
 *   package.json                    render:<slug> + still:<slug>
 *   src/episodes/registry.ts        registration
 *
 * Then it builds the audio. If edge-tts is unavailable it still builds the
 * score + sfx, writes a silent placeholder narration and ESTIMATED cues, so
 * the episode renders immediately. Re-run the audio script once TTS works.
 */
import { spawnSync } from "node:child_process";
import { access, copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { estimateCues } from "./estimate-cues.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

const theme = (flag("--theme") || "dungeon").toLowerCase();
const skipAudio = has("--no-audio");
const rawSlug = args[0];

if (!rawSlug) {
  console.error('Usage: npm run new:episode -- <slug> "<Trap Title>" [--theme dungeon] [--no-audio]');
  process.exit(1);
}

const slug = rawSlug
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

if (!slug) {
  console.error("Slug must contain letters or numbers.");
  process.exit(1);
}

const titleCase = (s) =>
  s
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const title = args.slice(1).join(" ") || titleCase(slug);
const pascal = titleCase(slug).replace(/\s+/g, "");
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
const compositionId = pascal;

const episodeDir = path.join(root, "src", "episodes", slug);
const templateDir = path.join(root, "templates", "episode");
const publicDir = path.join(root, "public", "episodes", slug);
const audioScript = path.join(root, "scripts", `${slug}-audio.py`);

const exists = (p) =>
  access(p)
    .then(() => true)
    .catch(() => false);

if (await exists(episodeDir)) {
  console.error(`Episode already exists: src/episodes/${slug}`);
  process.exit(1);
}

const replacements = [
  ["__SLUG__", slug],
  ["__CAMEL__", camel],
  ["__COMPOSITION_ID__", compositionId],
  ["__TITLE_UPPER__", title.toUpperCase()],
  ["__TITLE__", title],
  ["__THEME_UPPER__", theme.toUpperCase()],
  ["__THEME__", theme],
];

const fill = async (filePath) => {
  let content = await readFile(filePath, "utf8");
  for (const [token, value] of replacements) content = content.replaceAll(token, value);
  await writeFile(filePath, content, "utf8");
};

const walk = async (dir) => {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
};

// 1. Episode source + audio script ------------------------------------------
await cp(templateDir, episodeDir, { recursive: true });
for (const file of await walk(episodeDir)) await fill(file);

if (!(await exists(audioScript))) {
  await copyFile(path.join(root, "templates", "audio.py"), audioScript);
  await fill(audioScript);
}

await mkdir(path.join(publicDir, "sfx"), { recursive: true });
const est = await estimateCues(slug);

// 2. Registry ----------------------------------------------------------------
const registryPath = path.join(root, "src", "episodes", "registry.ts");
const registry = await readFile(registryPath, "utf8");
const newline = registry.includes("\r\n") ? "\r\n" : "\n";
const lines = registry.replace(/\r\n/g, "\n").split("\n");
const importLine = `import { ${camel}Episode } from "./${slug}";`;
const exportIndex = lines.findIndex((line) => line.startsWith("export const EPISODES"));

if (exportIndex === -1) {
  console.error("Could not update src/episodes/registry.ts.");
  process.exit(1);
}

if (!lines.includes(importLine)) {
  lines.splice(exportIndex, 0, importLine, "");
  const arrayIndex = lines.findIndex((line) => line.startsWith("export const EPISODES = ["));
  lines.splice(arrayIndex + 1, 0, `  ${camel}Episode,`);
  await writeFile(registryPath, lines.join(newline), "utf8");
}

// 3. package.json scripts -----------------------------------------------------
const pkgPath = path.join(root, "package.json");
const pkgText = await readFile(pkgPath, "utf8");
const pkg = JSON.parse(pkgText);
const pkgEol = pkgText.includes("\r\n") ? "\r\n" : "\n";
pkg.scripts[`render:${slug}`] =
  `remotion render ${compositionId} out/${slug}.raw.mp4 --concurrency=8 --crf=18 --audio-bitrate=192k && ` +
  `ffmpeg -y -hide_banner -loglevel error -i out/${slug}.raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k out/${slug}.mp4`;
pkg.scripts[`still:${slug}`] = `remotion still ${compositionId} out/${slug}-still.png --frame=${Math.round(est.durationFrames / 2)}`;
await writeFile(pkgPath, (JSON.stringify(pkg, null, 2) + "\n").replace(/\n/g, pkgEol), "utf8");

console.log(`Created src/episodes/${slug} (composition: ${compositionId})`);
console.log(`Created scripts/${slug}-audio.py`);
console.log(`Added render:${slug} and still:${slug} to package.json`);
console.log(`Estimated cues: ${est.lines} lines, ${est.durationFrames} frames`);

// 4. Audio -------------------------------------------------------------------
const run = (cmd, cmdArgs) => spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", shell: false }).status === 0;
const python = process.platform === "win32" ? "python" : "python3";

const silentNarration = () => {
  const secs = ((est.durationFrames + 10) / 30).toFixed(2);
  return run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", secs,
    "-c:a", "libmp3lame", "-b:a", "64k",
    path.join(publicDir, "narration_v1.mp3"),
  ]);
};

if (skipAudio) {
  silentNarration();
  console.log("Skipped audio (--no-audio). Silent narration placeholder written; run the audio script later.");
} else if (run(python, [audioScript])) {
  console.log("Audio built: narration, score, sfx, exact cues.");
} else {
  console.warn("Full audio build failed (edge-tts offline?). Building score + sfx and a silent narration placeholder.");
  run(python, [audioScript, "sfx", "score"]);
  await estimateCues(slug);
  silentNarration();
}

console.log("");
console.log("Next (see AGENTS.md > New episode workflow):");
console.log(`  1. Write the 5-level script in scripts/${slug}-audio.py (LINES), then: python scripts/${slug}-audio.py narration`);
console.log(`  2. Build levels in src/episodes/${slug}/timeline.ts -> Scene.tsx -> config.ts (beats only via w())`);
console.log("  3. npm run lint");
console.log(`  4. node scripts/review.mjs ${compositionId} --beats   (look at every sheet)`);
console.log(`  5. npm run render:${slug} && npm run check:video -- ${slug}`);
