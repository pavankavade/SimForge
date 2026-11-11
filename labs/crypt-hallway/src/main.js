// Entry router for SimForge Dungeon Arcade & Hallway Labs:
// - Bare URL (no route params): lightweight landing page (nothing heavy loads until user picks a mode).
// - ?hall=explorer: 3D Procedural Dungeon Floor (Paladin free-roam + running mobs).
// - ?hall=boulder: Ep2 Boulder Hallway.
// - ?hall=walls: Ep3 Crushing Walls.
// - ?hall=crypt / ?play=1 / ?cam= / ?shot= / etc.: Ep1 Crypt Hallway.
const params = new URLSearchParams(location.search);
const HALL = params.get("hall");
const hasRoute = ["hall", "play", "cam", "shot", "s", "lab", "mode", "class", "film"].some((key) =>
  params.has(key),
);

if (!hasRoute) {
  const { renderLanding } = await import("./landing.js");
  renderLanding();
} else if (HALL === "explorer") {
  document.title = "SimForge — 3D Dungeon Floor (Paladin)";
  const [{ createElement }, { createRoot }, { DungeonApp }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("../../../src/dungeon-explorer/DungeonApp.tsx"),
  ]);
  let mount = document.getElementById("root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "root";
    document.body.appendChild(mount);
  }
  createRoot(mount).render(createElement(DungeonApp, { backHref: "./" }));
} else if (HALL === "boulder") {
  await import("./boulder/main.js");
} else if (HALL === "walls") {
  await import("./walls/main.js");
} else {
  await import("./crypt.js");
}
