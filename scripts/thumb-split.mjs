// Before/after split thumbnail: keeps the middle 640 px of two 1280x720 stills
// (compose each subject in the centre) and joins them with a white divider.
//   node scripts/thumb-split.mjs <left.png> <right.png> <out.png>
import { spawnSync } from "node:child_process";

const [left, right, out] = process.argv.slice(2);
if (!left || !right || !out) {
  console.error("usage: node scripts/thumb-split.mjs <left.png> <right.png> <out.png>");
  process.exit(1);
}
const filter = [
  "[0:v]crop=640:720:320:0[l]",
  "[1:v]crop=640:720:320:0[r]",
  "[l][r]hstack=2[s]",
  // Navy-edged white divider down the middle.
  "[s]drawbox=x=628:y=0:w=24:h=720:color=0x18213a:t=fill,drawbox=x=633:y=0:w=14:h=720:color=white:t=fill[out]",
].join(";");
const res = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", left, "-i", right, "-filter_complex", filter, "-map", "[out]", "-frames:v", "1", out], {
  stdio: "inherit",
});
if (res.status !== 0) process.exit(res.status ?? 1);
console.log(`Split thumbnail: ${out}`);
