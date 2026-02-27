import React from "react";
import type { ScoreEntry } from "../../types";
import { PlayerMisses } from "../shared/PlayerMisses";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PlayerRank } from "../shared/PlayerRank";
import { PreviousResult } from "../shared/PreviousResult";
import { PreviousSituation } from "../shared/PreviousSituation";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
};

export function HayaboScorelist({ scores, pressedSeat }: Props): React.JSX.Element {
  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const className = [
          "hayabo-player",
          `player--${score.status}`,
          score.scoreChanged ? "animation-flip-in-x" : "",
          isPressed ? "player--buzzer-pressed" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={score.matchingId}
            className={className}
            id={`hayabo-player-${score.matchingId}`}
            data-seat={score.seat}
          >
            <PlayerRank rank={score.rank} />
            <PlayerName name={score.name} nameLength={score.nameLength} prefix="hayabo-player" />
            <PlayerPoints points={score.points} />
            <PlayerMisses misses={score.misses} />
            <PreviousSituation previousSituation={score.previousSituation} />
            <PreviousResult previousResult={score.previousResult} />
          </div>
        );
      })}
    </>
  );
}
