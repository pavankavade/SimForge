import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { openBrowser } from "@remotion/renderer";

const ROOT = process.cwd();
const PORT = 5411;
const OUT_DIR = "C:/Users/qwert/.gemini/antigravity/brain/7fea45a5-b2df-4a25-9ed6-027fdd111a43";

const targetFile = process.argv[2] || "scratch_smplx_male.obj";
const outName = process.argv[3] || "preview_smplx.png";
const isObj = targetFile.endsWith(".obj");

const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #16181f; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "/node_modules/three/build/three.module.js",
      "three/addons/": "/node_modules/three/examples/jsm/"
    }
  }
  </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d24);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.45, 1.8);
camera.lookAt(0, 1.35, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xfff5ea, 0x223344, 1.2);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 2.0);
dir.position.set(2, 4, 3);
scene.add(dir);
const rim = new THREE.DirectionalLight(0x88bbff, 1.5);
rim.position.set(-2, 2, -2);
scene.add(rim);

function onLoaded(model) {
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('Loaded model, bounds:', box.min, box.max, 'size:', size);

  // Position camera to frame head and torso
  const headY = box.max.y - size.y * 0.12;
  camera.position.set(0, headY, size.y * 0.45);
  camera.lookAt(0, headY, 0);

  renderer.render(scene, camera);
  window.__READY = true;
  window.__SET_VIEW = (type) => {
    if (type === 'full') {
      camera.position.set(0, center.y, size.y * 1.6);
      camera.lookAt(0, center.y, 0);
    } else if (type === 'torso') {
      camera.position.set(0, center.y + 0.2, size.y * 0.8);
      camera.lookAt(0, center.y + 0.2, 0);
    } else {
      camera.position.set(0, headY, size.y * 0.4);
      camera.lookAt(0, headY, 0);
    }
    renderer.render(scene, camera);
  };
}

const isObj = ${isObj};
if (isObj) {
  const loader = new OBJLoader();
  loader.load('/model.file', (obj) => {
    // Apply realistic skin shader
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd6a88e,
      roughness: 0.65,
      metalness: 0.05,
    });
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = skinMat;
        child.geometry.computeVertexNormals();
      }
    });
    onLoaded(obj);
  }, undefined, (err) => {
    console.error(err);
    window.__ERROR = String(err);
  });
} else {
  const loader = new GLTFLoader();
  loader.load('/model.file', (gltf) => {
    onLoaded(gltf.scene);
  }, undefined, (err) => {
    console.error(err);
    window.__ERROR = String(err);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
    return;
  }
  if (url === "/model.file") {
    const filePath = path.resolve(ROOT, targetFile);
    res.writeHead(200, { "Content-Type": isObj ? "text/plain" : "model/gltf-binary" });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  if (url.startsWith("/node_modules/")) {
    const rel = url.replace(/^\//, "");
    const filePath = path.resolve(ROOT, rel);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  res.writeHead(404);
  res.end("Not found");
});

await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
console.log(`Server on http://127.0.0.1:${PORT}`);

try {
  const browser = await openBrowser("chrome");
  const page = await browser.newPage({ context: null, indent: false, logLevel: "verbose" });
  await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
  await page.goto({ url: `http://127.0.0.1:${PORT}/`, timeout: 30000 });

  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if (window.__READY) { clearInterval(t); resolve(true); }
        if (window.__ERROR) { clearInterval(t); reject(new Error(window.__ERROR)); }
      }, 50);
    });
  });

  await new Promise((r) => setTimeout(r, 300));
  const res = await page._client().send("Page.captureScreenshot", { format: "png" });
  const b64 = res?.value?.data ?? res?.data;
  const outPath = path.join(OUT_DIR, outName);
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`Saved screenshot to ${outPath}`);

  // Full view
  await page.evaluate(() => window.__SET_VIEW && window.__SET_VIEW('full'));
  await new Promise((r) => setTimeout(r, 200));
  const resFull = await page._client().send("Page.captureScreenshot", { format: "png" });
  const b64Full = resFull?.value?.data ?? resFull?.data;
  const outPathFull = path.join(OUT_DIR, outName.replace(".png", "_full.png"));
  fs.writeFileSync(outPathFull, Buffer.from(b64Full, "base64"));
  console.log(`Saved full screenshot to ${outPathFull}`);

  // Torso view
  await page.evaluate(() => window.__SET_VIEW && window.__SET_VIEW('torso'));
  await new Promise((r) => setTimeout(r, 200));
  const resTorso = await page._client().send("Page.captureScreenshot", { format: "png" });
  const b64Torso = resTorso?.value?.data ?? resTorso?.data;
  const outPathTorso = path.join(OUT_DIR, outName.replace(".png", "_torso.png"));
  fs.writeFileSync(outPathTorso, Buffer.from(b64Torso, "base64"));
  console.log(`Saved torso screenshot to ${outPathTorso}`);

  await browser.close({ silent: true });
} finally {
  server.close();
}
