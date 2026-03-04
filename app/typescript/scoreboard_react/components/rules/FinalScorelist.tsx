import React, { useEffect, useRef } from "react";
import type { ScoreEntry } from "../../types";
import { buildScoreKey } from "../../utils/scoreKey";
import { PlayerMisses } from "../shared/PlayerMisses";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PlayerRank } from "../shared/PlayerRank";
import { PreviousResult } from "../shared/PreviousResult";
import { Stars } from "../shared/Stars";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
  scoreOperationId: number | null;
};

type FinalPlayerPlateProps = {
  score: ScoreEntry;
  isPressed: boolean;
  shouldFlip: boolean;
};

function FinalPlayerPlate({ score, isPressed, shouldFlip }: FinalPlayerPlateProps): React.JSX.Element {
  const className = [
    "final-player",
    `player--${score.status}`,
    shouldFlip ? "animation-flip-in-x" : "",
    isPressed ? "player--buzzer-pressed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} id={`final-player-${score.matchingId}`} data-seat={score.seat}>
      <PlayerRank rank={score.rank} />
      <PlayerName name={score.name} nameLength={score.nameLength} prefix="final-player" />
      <PlayerPoints points={score.points} />
      <PlayerMisses misses={score.misses} />
      <PreviousResult previousResult={score.previousResult} />
    </div>
  );
}

export function FinalScorelist({ scores, pressedSeat, scoreOperationId }: Props): React.JSX.Element {
  const previousStarsByMatchingIdRef = useRef(new Map<number, number>());

  useEffect(() => {
    previousStarsByMatchingIdRef.current = new Map(scores.map((score) => [score.matchingId, score.stars]));
  }, [scores]);

  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const previousStars = previousStarsByMatchingIdRef.current.get(score.matchingId) ?? score.stars;
        const starsIncreased = score.stars > previousStars;
        const shouldFlip = score.scoreChanged && !starsIncreased;
        const scoreKey = shouldFlip ? buildScoreKey(score, scoreOperationId) : `${score.matchingId}`;

        return (
          // Stars は player div の外側に配置する。★増加時は plate をフリップさせない。
          <React.Fragment key={score.matchingId}>
            <FinalPlayerPlate key={scoreKey} score={score} isPressed={isPressed} shouldFlip={shouldFlip} />
            <Stars stars={score.stars} />
          </React.Fragment>
        );
      })}
    </>
  );
}
