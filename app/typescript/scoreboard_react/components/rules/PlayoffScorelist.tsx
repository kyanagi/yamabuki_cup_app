import React from "react";
import type { ScoreEntry } from "../../types";
import { buildScoreKey } from "../../utils/scoreKey";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PreviousResult } from "../shared/PreviousResult";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
  scoreOperationId: number | null;
};

export function PlayoffScorelist({ scores, pressedSeat, scoreOperationId }: Props): React.JSX.Element {
  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const className = [
          "playoff-match-player",
          `player--${score.status}`,
          score.scoreChanged ? "animation-flip-in-x" : "",
          isPressed ? "player--buzzer-pressed" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const scoreKey = buildScoreKey(score, scoreOperationId);

        return (
          <div
            key={scoreKey}
            className={className}
            id={`playoff-match-player-${score.matchingId}`}
            data-seat={score.seat}
          >
            {/* playoff は round2-match-name クラスを共有する */}
            <PlayerName name={score.name} nameLength={score.nameLength} prefix="round2-match" />
            <PlayerPoints points={score.points} />
            <PreviousResult previousResult={score.previousResult} />
          </div>
        );
      })}
    </>
  );
}
