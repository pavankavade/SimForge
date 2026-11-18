// Canonical SimForge web portal router:
// - Bare `/` (no mode/route query params): renders the lightweight landing selector (loads zero 3D code).
// - `?mode=vardhan` (or `/vardhan`): Vardhan's Stumble Guys Sandbox.
// - `?mode=explorer` (or legacy `?hall=explorer`): the Dungeon Crawler (starts in the tavern).
// - `?mode=crypt` / `?play=1` / `?cam=` / `?shot=` (or legacy `?hall=crypt`): Episode 1 Crypt Hallway.
// - `?mode=boulder` (or `?hall=boulder`): Episode 2 Boulder Hallway.
// - `?mode=walls` (or `?hall=walls`): Episode 3 Crushing Walls.
const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? params.get("hall");
const isVardhan = mode === "vardhan" || location.pathname.includes("/vardhan");
const hasRoute =
  isVardhan ||
  Boolean(mode) ||
  ["play", "cam", "shot", "s", "lab", "class", "film"].some((key) => params.has(key));

if (!hasRoute) {
  const { renderLanding } = await import("./landing.js");
  renderLanding();
} else if (isVardhan) {
  document.title = "SimForge — Vardhan's Stumble Sandbox";
  const [{ createElement }, { createRoot }, { VardhanStumbleApp }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("../../src/vardhan-game/VardhanStumbleApp.tsx"),
  ]);
  let mount = document.getElementById("root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "root";
    document.body.appendChild(mount);
  }
  createRoot(mount).render(createElement(VardhanStumbleApp));
} else if (mode === "explorer") {
  document.title = "SimForge — Dungeon Crawler";
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
