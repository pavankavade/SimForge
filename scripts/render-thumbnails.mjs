import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out", "thumbnails");
const artifactDir = "C:\\Users\\qwert\\.gemini\\antigravity\\brain\\ee2f1715-8fa1-4da3-98af-0253d82885e3";
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundling project...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });

const boulderFrames = [0, 0, 0];

for (let i = 0; i < 3; i++) {
  const inputProps = { variant: i };
  const composition = await selectComposition({
    serveUrl,
    id: "RollingBoulderThumbnail",
    inputProps,
  });
  const output = path.join(outDir, `rolling-boulder-thumb-${i + 1}.png`);
  const frame = boulderFrames[i];
  console.log(`Rendering RollingBoulder variant ${i + 1} at frame ${frame}...`);
  await renderStill({ serveUrl, composition, frame, output, inputProps });
  console.log("Rendered:", output);
  
  if (fs.existsSync(artifactDir)) {
    const artifactOut = path.join(artifactDir, `rolling-boulder-thumb-${i + 1}.png`);
    fs.copyFileSync(output, artifactOut);
    console.log("Copied to artifact dir:", artifactOut);
  }
}

console.log("All boulder thumbnails rendered successfully!");
