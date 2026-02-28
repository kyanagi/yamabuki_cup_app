import React, { useState } from "react";
import type { Scene, PaperSeedSlot } from "../types";

type Props = {
  scene: Extract<Scene, { type: "paper_seed" }>;
};

function slotClassName(slot: PaperSeedSlot, isExiting: boolean, isExited: boolean): string {
  if (isExiting) {
    return isExited ? "paper-seed-player paper-seed-player--exited" : "paper-seed-player paper-seed-player--exiting";
  }
  if (slot.name !== null) {
    return "paper-seed-player animation-flip-in-x";
  }
  return "paper-seed-player player-frame--incoming-animation";
}

export function PaperSeedScene({ scene }: Props): React.JSX.Element {
  const [exitedRanks, setExitedRanks] = useState<Set<number>>(new Set());

  function handleAnimationEnd(rank: number) {
    if (!scene.isExiting) return;
    setExitedRanks((prev) => new Set([...prev, rank]));
  }

  return (
    <div className="columns-2">
      <div className="match-scorelist-column1">
        {scene.slots.map((slot) => {
          const isExited = exitedRanks.has(slot.rank);
          const className = slotClassName(slot, scene.isExiting, isExited);

          return (
            <div
              key={slot.rank}
              className={className}
              id={`paper-seed-player-${slot.rank}`}
              onAnimationEnd={scene.isExiting ? () => handleAnimationEnd(slot.rank) : undefined}
            >
              <div className="player__rank">{slot.rank}</div>
              <div className="player__name">
                {slot.name !== null && (
                  <div className={`paper-seed-player__name--length-${slot.name.length}`}>{slot.name}</div>
                )}
              </div>
              <div className="paper-seed-player__score">{slot.score ?? ""}</div>
            </div>
          );
        })}
      </div>
      <div id="question"></div>
    </div>
  );
}
