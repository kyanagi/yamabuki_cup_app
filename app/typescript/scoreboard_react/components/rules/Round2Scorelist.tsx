import React from "react";
import type { ScoreEntry } from "../../types";
import { buildScoreKey } from "../../utils/scoreKey";
import { PlayerMisses } from "../shared/PlayerMisses";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PreviousResult } from "../shared/PreviousResult";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
  scoreOperationId: number | null;
};

export function Round2Scorelist({ scores, pressedSeat, scoreOperationId }: Props): React.JSX.Element {
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
        const scoreKey = buildScoreKey(score, scoreOperationId);

        return (
          <div
            key={scoreKey}
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
