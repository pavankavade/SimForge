import { createRoot } from "react-dom/client";
import { VardhanStumbleApp } from "./VardhanStumbleApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<VardhanStumbleApp />);
}
