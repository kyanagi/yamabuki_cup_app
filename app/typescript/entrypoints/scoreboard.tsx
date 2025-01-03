import "the-new-css-reset/css/reset.css";
import "../components/global.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { ScoreboardApp } from "../components/ScoreboardApp";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("scoreboard-root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ScoreboardApp />
      </React.StrictMode>,
    );
  }
});
