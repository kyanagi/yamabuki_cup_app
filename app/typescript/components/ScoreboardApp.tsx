import type React from "react";
import "./ScoreBoardApp.css";
import { Round2 } from "./Round2";

export const ScoreboardApp: React.FC = () => {
  return (
    <div className="scoreboard-app">
      <Round2 />
    </div>
  );
};
