import { createRoot } from "react-dom/client";
import { DungeonApp } from "./DungeonApp";
import { mountPaladinLab } from "./paladinLab";

const rootEl = document.getElementById("root");
if (rootEl) {
  // `?lab=paladin` opens the character lab instead of the dungeon floor.
  if (new URLSearchParams(window.location.search).get("lab") === "paladin") {
    mountPaladinLab(rootEl).catch((err: unknown) => {
      console.error(err);
      const w = window as unknown as { __labErrors?: string[] };
      (w.__labErrors = w.__labErrors || []).push(String(err));
      rootEl.insertAdjacentHTML("beforeend", `<pre style="color:#f88;padding:16px">${String(err)}</pre>`);
    });
  }
  else createRoot(rootEl).render(<DungeonApp />);
}
