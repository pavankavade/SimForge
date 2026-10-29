/**
 * Non-overwriting render: like `node scripts/render.mjs <Id> [slug]`, but the
 * final file goes to out/<slug>_v2.mp4, _v3, ... if out/<slug>.mp4 exists.
 *
 *   node scripts/render-safe.mjs <CompositionId> [slug]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [compId, ...rest] = process.argv.slice(2);
if (!compId) {
  console.error("Usage: node scripts/render-safe.mjs <CompositionId> [slug]");
  process.exit(1);
}
const res = spawnSync(process.execPath, ["scripts/render.mjs", compId, ...rest, "--keep"], { cwd: root, stdio: "inherit" });
process.exit(res.status ?? 1);
