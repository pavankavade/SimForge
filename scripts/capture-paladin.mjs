import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";
import { openBrowser } from "@remotion/renderer";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public", "dungeon-explorer");
const ENTRY = path.join(ROOT, "src", "dungeon-explorer", "main.tsx");
const PORT = 5399;
const OUT_DIR = "C:/Users/qwert/.gemini/antigravity/brain/7fea45a5-b2df-4a25-9ed6-027fdd111a43";

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Paladin Capture</title>
  <style>html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0b0c0f; } canvas { display: block; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>`;

console.log("Building esbuild context...");
const ctx = await esbuild.context({
  entryPoints: [ENTRY],
  bundle: true,
  format: "esm",
  jsx: "automatic",
  target: ["es2020"],
  sourcemap: "inline",
  write: false,
  outdir: "out/explorer",
  define: {
    "process.env.NODE_ENV": '"development"',
  },
});

async function buildBundle() {
  const res = await ctx.rebuild();
  const jsFile = res.outputFiles.find((f) => f.path.endsWith("main.js"));
  return jsFile ? jsFile.contents : Buffer.from("");
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === "/" || pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(INDEX_HTML);
      return;
    }

    if (pathname === "/bundle.js") {
      const buf = await buildBundle();
      res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
      res.end(buf);
      return;
    }

    const rel = pathname.replace(/^\/+/, "");
    const candidate = path.resolve(PUBLIC_DIR, rel);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      fs.createReadStream(candidate).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
});

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
console.log(`Server listening on http://127.0.0.1:${PORT}`);

try {
  console.log("Opening Chrome browser...");
  const browser = await openBrowser("chrome");
  const page = await browser.newPage({ context: null, indent: false, logLevel: "verbose" });
  page.sourceMapGetter = () => null;

  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
  console.log("Navigating to Paladin Lab...");
  await page.goto({ url: `http://127.0.0.1:${PORT}/?lab=paladin&paused=1`, timeout: 30000 });

  // Wait for __paladinLab
  console.log("Waiting for __paladinLab...");
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const check = () => {
        if (window.__paladinLab) resolve(true);
        else setTimeout(check, 50);
      };
      check();
    });
  });

  // Helper to capture a screenshot via CDP
  async function snap(filename) {
    // Step a couple frames to ensure render is fresh
    await page.evaluate(() => {
      window.__paladinLab.step(3);
    });
    // Brief sleep
    await new Promise((r) => setTimeout(r, 100));
    const res = await page._client().send("Page.captureScreenshot", { format: "png" });
    const b64 = res?.value?.data ?? res?.data;
    const buf = Buffer.from(b64, "base64");
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buf);
    console.log(`Saved screenshot: ${outPath} (${buf.length} bytes)`);
    return outPath;
  }

  // 1. Full Plate Armor (three-quarter view)
  console.log("Capturing 1: Full Plate Armor...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(true);
    window.__paladinLab.view("three");
  });
  await snap("paladin_full_plate.png");

  // 2. Helmet De-equipped: Face and hair revealed while wearing plate armor!
  console.log("Capturing 2: Helm Unequipped (Face Revealed)...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(true);
    window.__paladinLab.equip("helm", false);
    window.__paladinLab.view("close");
  });
  await snap("paladin_face_revealed.png");

  // 3. Half Plate (no helm, no cuirass, no pauldrons, showing chainmail underlayer)
  console.log("Capturing 3: Half Plate (Mail underlayer)...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(true);
    window.__paladinLab.equip("helm", false);
    window.__paladinLab.equip("cuirass", false);
    window.__paladinLab.equip("pauldrons", false);
    window.__paladinLab.equip("cape", false);
    window.__paladinLab.equip("tabard", false);
    window.__paladinLab.view("three");
  });
  await snap("paladin_mail_underlayer.png");

  // 4. Arming Doublet (Gambeson & Hose)
  console.log("Capturing 4: Medieval Arming Doublet (Gambeson)...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(false);
    window.__paladinLab.equip("doublet", true);
    window.__paladinLab.equip("sword", false);
    window.__paladinLab.equip("shield", false);
    window.__paladinLab.view("front");
  });
  await snap("paladin_unarmored_person.png");

  // 5. Bare Physique Close-Up (Face, hair, athletic chest, skin)
  console.log("Capturing 5: Bare Physique Close-Up...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(false);
    window.__paladinLab.equip("doublet", false);
    window.__paladinLab.equip("sword", false);
    window.__paladinLab.equip("shield", false);
    window.__paladinLab.view("close");
  });
  await snap("paladin_unarmored_close.png");

  // 6. Action pose (Attack windup / strike)
  console.log("Capturing 6: Combat Stance / Swing...");
  await page.evaluate(() => {
    window.__paladinLab.setAllArmor(true);
    window.__paladinLab.equip("sword", true);
    window.__paladinLab.equip("shield", true);
    window.__paladinLab.equip("helm", false);
    window.__paladinLab.attack();
    window.__paladinLab.step(8); // step into the live cut
    window.__paladinLab.view("three");
  });
  await snap("paladin_combat_swing.png");

  await browser.close({ silent: true });
} finally {
  server.close();
  await ctx.dispose();
  console.log("Capture completed.");
}
