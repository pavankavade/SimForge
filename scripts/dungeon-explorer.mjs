import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public", "dungeon-explorer");
const ENTRY = path.join(ROOT, "src", "dungeon-explorer", "main.tsx");

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.PORT) || 5395;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>SimForge — 3D Dungeon Floor Explorer</title>
  <link rel="icon" href="data:," />
  <style>html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; background: #050608; } canvas { display: block; touch-action: none; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>
`;

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

// Initial warm build to verify zero compile errors on startup.
await buildBundle();

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
    if (!candidate.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      fs.createReadStream(candidate).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(String(err));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SimForge 3D Dungeon Explorer running at http://127.0.0.1:${PORT}`);
});

const shutdown = async () => {
  await ctx.dispose();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
