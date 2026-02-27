import { createRoot } from "react-dom/client";
import { App } from "../scoreboard_react/App";

const container = document.getElementById("react-root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
