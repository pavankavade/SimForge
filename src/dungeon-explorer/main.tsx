import { createRoot } from "react-dom/client";
import { DungeonApp } from "./DungeonApp";
import { mountPaladinLab } from "./paladinLab";

const rootEl = document.getElementById("root");
if (rootEl) {
  // `?lab=paladin` opens the character lab instead of the dungeon floor.
  if (new URLSearchParams(window.location.search).get("lab") === "paladin") mountPaladinLab(rootEl);
  else createRoot(rootEl).render(<DungeonApp />);
}
