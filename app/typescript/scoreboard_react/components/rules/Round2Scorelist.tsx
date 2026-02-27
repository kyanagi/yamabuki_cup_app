import React from "react";
import type { ScoreEntry } from "../../types";
import { PlayerMisses } from "../shared/PlayerMisses";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PreviousResult } from "../shared/PreviousResult";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
};

export function Round2Scorelist({ scores, pressedSeat }: Props): React.JSX.Element {
  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const className = [
          "round2-match-player",
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
            id={`round2-match-player-${score.matchingId}`}
            data-seat={score.seat}
          >
            <div className="player__rank round2-match-player__rank">{score.rank}</div>
            <PlayerName name={score.name} nameLength={score.nameLength} prefix="round2-match" />
            <PlayerPoints points={score.points} />
            <PlayerMisses misses={score.misses} round2Mode />
            <PreviousResult previousResult={score.previousResult} />
          </div>
        );
      })}
    </>
  );
}
