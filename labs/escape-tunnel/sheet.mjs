// Contact sheet of picked frames: node sheet.mjs <out-dir> <f1,f2,...> [cols]
// Renders them with film.mjs (PICK) and tiles them, frame numbers burnt in.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const [out, list, cols = "6"] = process.argv.slice(2);
const frames = list.split(",").map(Number);
const r = process.env.SKIP ? { status: 0 } : spawnSync("node", ["film.mjs", out, "main"], { stdio: "inherit", env: { ...process.env, PICK: list } });
if (r.status) process.exit(r.status);
const c = Number(cols), w = Number(process.env.TILE ?? 300), h = Math.round((w * 16) / 9); // TILE=540 for close review
const inputs = frames.flatMap((f) => ["-i", resolve(out, "main", `${String(f).padStart(4, "0")}.jpg`)]); // absolute: ffmpeg runs in the fonts folder
const lab = frames.map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=fontfile=arialbd.ttf:text='${f}':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=5[v${i}]`).join(";");
const layout = frames.map((_, i) => `${(i % c) * w}_${Math.floor(i / c) * h}`).join("|");
const fill = frames.length < 2 ? `[v0]copy[o]` : `${frames.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${frames.length}:layout=${layout}:fill=black[o]`;
spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${lab};${fill}`, "-map", "[o]", "-q:v", "3", resolve(out, "sheet.jpg")], { stdio: "inherit", cwd: "C:/Windows/Fonts" });
console.log(resolve(out, "sheet.jpg"));
