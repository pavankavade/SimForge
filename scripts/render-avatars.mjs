import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "media", "branding", "characters");
const brainDir = "C:\\Users\\qwert\\.gemini\\antigravity\\brain\\50cdf078-87f3-4790-baaf-5a79f2ad948b";
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundling project for avatars...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });

const classes = ["paladin", "goblin", "rogue", "mage"];

for (const classType of classes) {
  const inputProps = { classType };
  const composition = await selectComposition({
    serveUrl,
    id: "ProfileAvatar",
    inputProps,
  });
  const output = path.join(outDir, `avatar-${classType}.png`);
  console.log(`Rendering avatar for ${classType}...`);
  await renderStill({ serveUrl, composition, frame: 15, output, inputProps });
  console.log("Rendered:", output);

  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(output, path.join(brainDir, `avatar-${classType}.png`));
  }
}
console.log("All avatars rendered successfully!");
