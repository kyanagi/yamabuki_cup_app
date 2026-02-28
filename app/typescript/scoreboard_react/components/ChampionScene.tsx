import React from "react";
import type { Scene } from "../types";

type Props = {
  scene: Extract<Scene, { type: "champion" }>;
};

export function ChampionScene({ scene }: Props): React.JSX.Element {
  return (
    <div className="final-champion">
      <p className="final-champion__tournament">{scene.tournamentName}</p>
      <p className="final-champion__title">CHAMPION</p>
      <p className="final-champion__name">{scene.name}</p>
    </div>
  );
}
