/**
 * Where an episode's deliverables live under out/:
 *
 *   out/<series>/<slug>/            final renders (<slug>.mp4, .raw.mp4, previews)
 *   out/<series>/<slug>/thumbnails/ thumbnails, check sheets, upload metadata
 *   out/<series>/<slug>/review/     final-render contact sheets (check-video)
 *   out/<series>/<slug>/logs/       render and audio logs
 *   out/<series>/<slug>/wip/        one-off stills and test frames
 *
 * Tool working folders (out/review/<Id>, out/solo, out/tmp, out/audio-tmp-*,
 * out/sfx-gen) stay at the top of out/. new-episode.mjs adds new slugs to SERIES.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SERIES = {
  dungeon: ["dungeon-trap", "dungeon-trap-v2", "rolling-boulder", "crushing-walls", "dart-trap", "lava-bridge", "mimic-vault", "dungeon-campaign"],
  shelter: ["cave-home", "nuclear-bunker", "lighthouse", "castle-wall", "tornado-shelter"],
  whatif: ["slow-flight", "slow-flight-short", "teleport", "reflexes"],
};

/** Series folder for a slug ("misc" for anything not listed, e.g. tests). */
export const seriesOf = (slug) => Object.keys(SERIES).find((s) => SERIES[s].includes(slug)) ?? "misc";

/** Absolute path of an episode's folder (or a subfolder of it) under out/. */
export const episodeDir = (slug, sub = "") => path.join(root, "out", seriesOf(slug), slug, sub);

/** Source text of this file with `slug` added to `series` (used by new-episode.mjs). */
export const withSlug = (source, series, slug) => {
  const entry = new RegExp(String.raw`^(  ${series}: \[)(.*)(\],)\r?$`, "m");
  if (entry.test(source)) return source.replace(entry, (_, a, list, b) => `${a}${list}, "${slug}"${b}`);
  return source.replace(/^};\r?$/m, `  ${series}: ["${slug}"],\n};`);
};
