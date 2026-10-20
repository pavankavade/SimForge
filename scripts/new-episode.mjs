import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawSlug = process.argv[2];

if (!rawSlug) {
  console.error("Usage: npm run new:episode -- <slug> [Title]");
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

const title =
  process.argv.slice(3).join(" ") ||
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const pascal = slug
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("");

const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
const compositionId = pascal;
const episodeDir = path.join(root, "src", "episodes", slug);
const templateDir = path.join(root, "templates", "episode");
const publicDir = path.join(root, "public", "episodes", slug);

const exists = await access(episodeDir)
  .then(() => true)
  .catch(() => false);

if (exists) {
  console.error(`Episode already exists: src/episodes/${slug}`);
  process.exit(1);
}

await cp(templateDir, episodeDir, { recursive: true });

const replacements = [
  ["__CAMEL__", camel],
  ["__COMPOSITION_ID__", compositionId],
  ["__TITLE__", title],
];

for (const file of ["index.ts", "config.ts", "Scene.tsx"]) {
  const filePath = path.join(episodeDir, file);
  let content = await readFile(filePath, "utf8");
  for (const [token, value] of replacements) {
    content = content.replaceAll(token, value);
  }
  await writeFile(filePath, content, "utf8");
}

await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, ".gitkeep"), "", "utf8");

const registryPath = path.join(root, "src", "episodes", "registry.ts");
const registry = await readFile(registryPath, "utf8");
const isCrlf = registry.includes("\r\n");
const newline = isCrlf ? "\r\n" : "\n";
const lines = registry.replace(/\r\n/g, "\n").split("\n");
const importLine = `import { ${camel}Episode } from "./${slug}";`;
const exportIndex = lines.findIndex((line) =>
  line.startsWith("export const EPISODES")
);

if (exportIndex === -1) {
  console.error(`Could not update src/episodes/registry.ts.`);
  process.exit(1);
}

if (!lines.includes(importLine)) {
  lines.splice(exportIndex, 0, importLine, "");
  const arrayIndex = lines.findIndex((line) =>
    line.startsWith("export const EPISODES = [")
  );
  lines.splice(arrayIndex + 1, 0, `  ${camel}Episode,`);
  await writeFile(registryPath, lines.join(newline), "utf8");
}

console.log(`Created src/episodes/${slug} (composition: ${compositionId})`);
console.log(`Created public/episodes/${slug}`);
console.log("Next:");
console.log(`  1. Edit src/episodes/${slug}/config.ts`);
console.log(`  2. Edit src/episodes/${slug}/Scene.tsx`);
console.log(`  3. Add audio to public/episodes/${slug}/ and set config.audio`);
console.log("  4. Run npm run dev");
