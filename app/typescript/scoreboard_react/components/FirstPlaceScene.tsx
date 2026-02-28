import React from "react";
import type { Scene } from "../types";

type FirstPlaceSceneProps = Extract<Scene, { type: "first_place_init" | "first_place_plate" | "first_place_player" }>;

type Props = {
  scene: FirstPlaceSceneProps;
};

function nameLengthClass(name: string): string {
  const len = name.length;
  if (len >= 5) {
    return `first-place-player__name--length-${Math.min(len, 7)}`;
  }
  return "";
}

export function FirstPlaceScene({ scene }: Props): React.JSX.Element | null {
  if (scene.type === "first_place_init") {
    return null;
  }

  return (
    <div className="first-place-container">
      {scene.type === "first_place_plate" && (
        <div className="first-place-player first-place-plate--drop-in-animation" id="first-place-player">
          <div className="first-place-player__rank">1st</div>
          <div className="first-place-player__name"></div>
        </div>
      )}
      {scene.type === "first_place_player" && (
        <div className="first-place-player animation-flip-in-x" id="first-place-player">
          <div className="first-place-player__rank">1st</div>
          <div className="first-place-player__name">
            <div className={`first-place-player__name-text ${nameLengthClass(scene.playerName)}`}>
              {scene.playerName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
