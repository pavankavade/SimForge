import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { VardhanStumbleApp } from "../../src/vardhan-game/VardhanStumbleApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(createElement(VardhanStumbleApp));
}
