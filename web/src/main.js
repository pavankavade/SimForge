// Canonical SimForge web portal router:
// - Bare `/` (no mode/route query params): renders the lightweight landing selector (loads zero 3D code).
// - `?mode=explorer` (or legacy `?hall=explorer`): 3D Dungeon Floor (Paladin roam + running mobs).
// - `?mode=crypt` / `?play=1` / `?cam=` / `?shot=` (or legacy `?hall=crypt`): Episode 1 Crypt Hallway.
// - `?mode=boulder` (or `?hall=boulder`): Episode 2 Boulder Hallway.
// - `?mode=walls` (or `?hall=walls`): Episode 3 Crushing Walls.
const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? params.get("hall");
const hasRoute =
  Boolean(mode) ||
  ["play", "cam", "shot", "s", "lab", "class", "film"].some((key) => params.has(key));

if (!hasRoute) {
  const { renderLanding } = await import("./landing.js");
  renderLanding();
} else if (mode === "explorer") {
  document.title = "SimForge — 3D Dungeon Floor (Paladin)";
  const [{ createElement }, { createRoot }, { DungeonApp }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("../../src/dungeon-explorer/DungeonApp.tsx"),
  ]);
  let mount = document.getElementById("root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "root";
    document.body.appendChild(mount);
  }
  createRoot(mount).render(createElement(DungeonApp, { backHref: "./" }));
} else if (mode === "boulder") {
  window.__SIMFORGE_PORTAL__ = true;
  await import("../../labs/crypt-hallway/src/boulder/main.js");
} else if (mode === "walls") {
  window.__SIMFORGE_PORTAL__ = true;
  await import("../../labs/crypt-hallway/src/walls/main.js");
} else {
  window.__SIMFORGE_PORTAL__ = true;
  await import("../../labs/crypt-hallway/src/crypt.js");
}
