import React from "react";
import type { Scene, Round2Slot } from "../types";

type Props = {
  scene: Extract<Scene, { type: "round2_announcement" }>;
};

function slotClassName(slot: Round2Slot, isDisplayAll: boolean): string {
  if (isDisplayAll) {
    return "round2-announcement-player player-frame--incoming-animation";
  }
  if (slot.name !== null) {
    return "round2-announcement-player animation-flip-in-x";
  }
  return "round2-announcement-player player-frame--incoming-animation";
}

// round2ura は gridClass が row6、omote は row5
function isUra(gridClass: string): boolean {
  return gridClass.includes("row6");
}

export function Round2AnnouncementScene({ scene }: Props): React.JSX.Element {
  const ura = isUra(scene.gridClass);

  return (
    <div className={scene.gridClass}>
      {scene.slots.map((slot) => {
        const className = slotClassName(slot, scene.displayAllVersion > 0);

        return (
          <div key={`${slot.rank}-v${scene.displayAllVersion}`} className={className} id={`round2-player-${slot.rank}`}>
            <div className="player__rank">{ura ? "-" : slot.rank}</div>
            <div className="player__name">{slot.name ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}
