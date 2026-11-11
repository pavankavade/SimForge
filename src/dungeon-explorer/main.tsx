import { createRoot } from "react-dom/client";
import { DungeonApp } from "./DungeonApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<DungeonApp />);
}
