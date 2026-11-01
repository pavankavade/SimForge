#!/usr/bin/env node
/**
 * Two-pass loudness mastering for a rendered video (video stream copied).
 *
 *   node scripts/master-audio.mjs <in.mp4> <out.mp4> [--lufs -14] [--tp -1.5]
 *
 * Pass 1 measures the mix (EBU R128). Pass 2 applies ONE fixed gain that lands
 * it on the target loudness, and a transparent peak limiter only if that gain
 * would push the true peak over `tp`. Unlike single-pass `loudnorm` (dynamic
 * mode, which rides the gain up and down and pumps the score and SFX against
 * the voice), the mix keeps the balance the audio script built, and the result
 * lands within ~0.2 LU of the target every time.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ff = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Integrated loudness (LUFS), true peak (dBTP) and loudness range of a file's audio. */
export const measure = (file) => {
  const res = ff(["-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const text = res.stderr;
  const json = text.slice(text.lastIndexOf("{"), text.lastIndexOf("}") + 1);
  if (res.status !== 0 || !json) throw new Error(`could not measure ${file}:\n${text.split("\n").slice(-8).join("\n")}`);
  const m = JSON.parse(json);
  return { i: Number(m.input_i), tp: Number(m.input_tp), lra: Number(m.input_lra) };
};

export const master = (input, output, { lufs = -14, tp = -1.5 } = {}) => {
  const before = measure(input);
  if (!Number.isFinite(before.i) || before.i < -70) throw new Error(`${input} is silent (${before.i} LUFS)`);
  const gain = lufs - before.i;
  // The limiter works on samples; keep 0.5 dB of room for inter-sample and AAC overshoot.
  const limited = before.tp + gain > tp;
  const ceiling = Math.pow(10, (tp - 0.5) / 20);
  const filter = [`volume=${gain.toFixed(2)}dB`, ...(limited ? [`alimiter=limit=${ceiling.toFixed(4)}:attack=1:release=60:level=false`] : []), "aresample=48000"].join(",");
  // 256k, not 192k: at 192k ffmpeg's native AAC coder sometimes invents loud bursts in quiet
  // passages (Reflexes: a ±0.1 signal came out at +2.6 dBFS) that fail the true-peak check.
  const res = ff(["-y", "-i", input, "-c:v", "copy", "-af", filter, "-c:a", "aac", "-b:a", "256k", output]);
  if (res.status !== 0) throw new Error(`ffmpeg failed:\n${res.stderr.split("\n").slice(-12).join("\n")}`);
  const after = measure(output);
  return { before, after, gain, limited };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? Number(args[i + 1]) : fallback;
  };
  const [input, output] = args.filter((a, i) => !a.startsWith("--") && !String(args[i - 1]).startsWith("--"));
  if (!input || !output) {
    console.error("usage: node scripts/master-audio.mjs <in.mp4> <out.mp4> [--lufs -14] [--tp -1.5]");
    process.exit(1);
  }
  const r = master(input, output, { lufs: opt("--lufs", -14), tp: opt("--tp", -1.5) });
  console.log(
    `Mastered ${output}: ${r.before.i} LUFS / ${r.before.tp} dBTP -> ${r.after.i} LUFS / ${r.after.tp} dBTP ` +
      `(gain ${r.gain >= 0 ? "+" : ""}${r.gain.toFixed(2)} dB${r.limited ? ", peaks limited" : ""})`
  );
}
