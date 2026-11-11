// Pin React, R3F, and Three (including addons/examples) to web/node_modules so shared code imported
// from ../src and ../labs/crypt-hallway never mixes multiple React/Three runtimes.
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  publicDir: here("../public/dungeon-explorer"),
  resolve: {
    alias: [
      { find: /^three$/, replacement: here("./node_modules/three/build/three.module.js") },
      { find: /^three\/examples\/jsm\/(.*)$/, replacement: here("./node_modules/three/examples/jsm/") + "$1" },
      { find: /^react$/, replacement: here("./node_modules/react") },
      { find: /^react\/(.*)$/, replacement: here("./node_modules/react/$1") },
      { find: /^react-dom$/, replacement: here("./node_modules/react-dom") },
      { find: /^react-dom\/(.*)$/, replacement: here("./node_modules/react-dom/$1") },
      { find: /^@react-three\/fiber$/, replacement: here("./node_modules/@react-three/fiber") },
    ],
    dedupe: ["three", "react", "react-dom", "@react-three/fiber"],
  },
  server: { fs: { allow: [".."] } },
});
