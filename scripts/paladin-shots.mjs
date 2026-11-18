// Contact sheets of the playable paladin from the Paladin Lab, for before/after checks.
//
//   node scripts/paladin-shots.mjs <tag> [--url http://127.0.0.1:5395] [--char aldric] [--only a,b] [--query head=classic] [--size 1280x720]
//
// Needs the explorer server running (`npm run explorer`). Writes
// out/misc/paladin/wip/<tag>/sheet-<n>.png: labelled tiles of every view in SHOTS.
import fs from "node:fs";
import path from "node:path";
import { openBrowser } from "@remotion/renderer";

const args = process.argv.slice(2);
const tag = args[0] && !args[0].startsWith("--") ? args[0] : "shots";
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt("url", "http://127.0.0.1:5395");
const CHAR = opt("char", "");
const ONLY = opt("only", "");
const QUERY = opt("query", "");
// Page size; tiles are half of it. 1280x720 frames first person the way the game does (16:9).
const [W, H] = opt("size", "600x750").split("x").map(Number);
const OUT = path.join(process.cwd(), "out", "misc", "paladin", "wip", tag);
fs.mkdirSync(OUT, { recursive: true });

// Each shot runs in the page with `L` = window.__paladinLab and the helpers below.
const SHOTS = [
  ["bare front", `bare(); L.view("front");`],
  ["bare back", `bare(); L.view("back");`],
  ["bare side", `bare(); L.view("left");`],
  ["bare three", `bare(); L.view("three");`],
  ["doublet", `L.setAllArmor(false); L.equip("doublet", true); L.view("three");`],
  ["full plate", `L.setAllArmor(true); L.view("three");`],
  ["plate back", `L.setAllArmor(true); L.view("back");`],
  ["helm off", `L.setAllArmor(true); L.equip("helm", false); L.view("close");`],
  ["face bare", `bare(); L.view("close");`],
  ["face side", `bare(); closeAt([0.55, 1.62, 0.2], [0, 1.6, 0]);`],
  ["mail only", `L.setAllArmor(true); ["helm","gorget","cuirass","pauldrons","arms","gauntlets","waist","cuisses","greaves","sabatons","cape","tabard"].forEach(s => L.equip(s, false)); L.view("three");`],
  ["swing 1", `L.setAllArmor(true); L.equip("helm", false); swing(0); L.view("three");`],
  ["swing 2", `L.setAllArmor(true); L.equip("helm", false); swing(1); L.view("three");`],
  ["swing 3", `L.setAllArmor(true); L.equip("helm", false); swing(2); L.view("three");`],
  ["bare swing", `bare(); L.equip("sword", true); L.equip("shield", true); swing(0); L.view("three");`],
  ["block", `L.setAllArmor(true); L.state.block = true; L.step(40); L.view("three");`],
  ["walk", `bare(); L.state.moveZ = 2.2; L.step(47); L.view("left");`],
  ["run", `L.setAllArmor(true); L.equip("helm", false); L.state.moveZ = 4; L.step(53); L.view("left");`],
  ["jump", `L.setAllArmor(true); L.equip("helm", false); jump(); L.view("three");`],
  ["fp guard", `L.setAllArmor(true); L.state.firstPerson = true; L.step(30);`],
  ["fp swing", `L.setAllArmor(true); L.state.firstPerson = true; L.step(20); swing(0);`],
  ["fp block", `L.setAllArmor(true); L.state.firstPerson = true; L.state.block = true; L.step(40);`],
  ["sword hand", `bare(); L.equip("sword", true); L.step(20); handCam("handR", [-0.32, 0.12, 0.22]);`],
  ["shield hand", `bare(); L.equip("shield", true); L.equip("sword", true); L.step(20); handCam("handL", [0.05, 0.1, -0.35]);`],
  ["bare hands", `bare(); L.step(20); handCam("handR", [-0.2, 0.05, 0.3]);`],
  ["sword flat", `bare(); L.equip("sword", true); L.step(20); swordCam(0.42, 1.25, [1, 0, 0]);`],
  ["hilt flat", `bare(); L.equip("sword", true); L.step(20); swordCam(0.0, 0.42, [1, 0, 0]);`],
  ["hilt edge", `bare(); L.equip("sword", true); L.step(20); swordCam(0.0, 0.42, [0, 1, 0]);`],
];

const HELPERS = `
  const L = window.__paladinLab;
  L.controls.enableDamping = false;
  const reset = () => {
    L.state.moveX = 0; L.state.moveZ = 0; L.state.block = false; L.state.firstPerson = false; L.state.pitch = 0;
    L.setAllArmor(true); L.equip("sword", true); L.equip("shield", true); L.equip("doublet", false);
    L.step(90);
  };
  const bare = () => { L.setAllArmor(false); L.equip("doublet", false); L.equip("sword", false); L.equip("shield", false); };
  const swing = (n) => {
    for (let i = 0; i < n; i++) { L.attack(); for (let k = 0; k < 400 && !(L.paladin.animator.state === "recover"); k++) L.step(1); L.step(6); }
    L.attack();
    for (let k = 0; k < 400; k++) {
      L.step(1);
      const a = L.paladin.animator;
      if (a.state === "strike" && a.strikeU > 0.5) break;
    }
  };
  const jump = () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Jump").click(); L.step(14); };
  const closeAt = (pos, target) => {
    L.camera.position.set(pos[0], pos[1], pos[2]);
    L.controls.target.set(target[0], target[1], target[2]);
    L.controls.update();
  };
  const handCam = (bone, off) => {
    const p = L.paladin.rig.bone(bone).getWorldPosition(new L.paladin.group.position.constructor());
    p.y -= 0.06;
    closeAt([p.x + off[0], p.y + off[1], p.z + off[2]], [p.x, p.y, p.z]);
  };
  // Look at the sword itself: \`along\` metres up the blade from the grip, from \`dist\` away along a
  // sword-space axis (x = a flat, y = an edge).
  const swordCam = (along, dist, axis) => {
    const V = L.paladin.group.position.constructor;
    const sw = L.paladin.sword;
    sw.updateMatrixWorld(true);
    const c = new V(0, 0, along).applyMatrix4(sw.matrixWorld);
    const d = new V(axis[0], axis[1], axis[2]).transformDirection(sw.matrixWorld);
    closeAt([c.x + d.x * dist, c.y + d.y * dist, c.z + d.z * dist], [c.x, c.y, c.z]);
  };
`;

const browser = await openBrowser("chrome");
try {
  const page = await browser.newPage({ context: null, indent: false, logLevel: "info" });
  page.sourceMapGetter = () => null;
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const q = new URLSearchParams({ lab: "paladin", paused: "1" });
  if (CHAR) q.set("char", CHAR);
  for (const [k, v] of new URLSearchParams(QUERY)) q.set(k, v);
  await page.goto({ url: `${BASE}/?${q}`, timeout: 60000 });
  await page.evaluate(`new Promise((resolve, reject) => {
    const t0 = Date.now();
    const check = () => window.__paladinLab ? resolve(true) : Date.now() - t0 > 60000 ? reject(new Error("lab did not load")) : setTimeout(check, 100);
    check();
  })`);
  const errors = await page.evaluate(`(window.__labErrors || []).join("\\n")`);
  if (errors) console.log("page errors:\n" + errors);

  const shots = ONLY ? SHOTS.filter(([name]) => ONLY.split(",").some((o) => name.includes(o))) : SHOTS;
  const PER = 12;
  for (let s = 0; s * PER < shots.length; s++) {
    const batch = shots.slice(s * PER, (s + 1) * PER);
    const sheet = await page.evaluate(`(async () => {
      ${HELPERS}
      const cols = 4, tw = ${W / 2}, th = ${H / 2};
      const rows = Math.ceil(${batch.length} / cols);
      const out = document.createElement("canvas");
      out.width = cols * tw; out.height = rows * th;
      const g = out.getContext("2d");
      g.fillStyle = "#000"; g.fillRect(0, 0, out.width, out.height);
      const batch = ${JSON.stringify(batch)};
      for (let i = 0; i < batch.length; i++) {
        reset();
        new Function("L", "bare", "swing", "jump", "closeAt", "handCam", "swordCam", batch[i][1])(L, bare, swing, jump, closeAt, handCam, swordCam);
        L.step(1);
        await new Promise((r) => setTimeout(r, 60));
        L.step(0);
        const c = document.querySelector("canvas");
        g.drawImage(c, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
        g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect((i % cols) * tw, Math.floor(i / cols) * th, tw, 22);
        g.fillStyle = "#ffd84d"; g.font = "14px sans-serif";
        g.fillText(batch[i][0], (i % cols) * tw + 6, Math.floor(i / cols) * th + 16);
      }
      return out.toDataURL("image/png");
    })()`);
    const file = path.join(OUT, `sheet-${s + 1}.png`);
    fs.writeFileSync(file, Buffer.from(String(sheet).split(",")[1], "base64"));
    console.log(file);
  }
} finally {
  await browser.close({ silent: true });
}
