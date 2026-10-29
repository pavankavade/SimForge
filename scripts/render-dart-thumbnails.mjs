/**
 * Renders every Dart Trap shorts thumbnail variant to out/thumbnails/.
 * Each variant's frame comes from the composition's calculateMetadata
 * (derived from BEATS), so re-voicing the episode never stales a thumbnail.
 *
 *   npm run thumb:dart-trap
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out", "thumbnails");
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundling...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });

const first = await selectComposition({ serveUrl, id: "DartTrapThumbnail", inputProps: { variant: 0 } });
const count = first.props.count ?? 1;
for (let i = 0; i < count; i++) {
  const inputProps = { variant: i };
  const composition = i === 0 ? first : await selectComposition({ serveUrl, id: "DartTrapThumbnail", inputProps });
  const output = path.join(outDir, `dart-trap-thumb-${i + 1}.png`);
  await renderStill({ serveUrl, composition, frame: composition.props.frame, output, inputProps });
  console.log(`variant ${i + 1} (frame ${composition.props.frame}) -> ${output}`);
}
