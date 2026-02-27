import React from "react";
import type { ScoreEntry } from "../../types";
import { PlayerMisses } from "../shared/PlayerMisses";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PlayerRank } from "../shared/PlayerRank";
import { PreviousResult } from "../shared/PreviousResult";
import { Stars } from "../shared/Stars";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
};

export function FinalScorelist({ scores, pressedSeat }: Props): React.JSX.Element {
  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const className = [
          "final-player",
          `player--${score.status}`,
          score.scoreChanged ? "animation-flip-in-x" : "",
          isPressed ? "player--buzzer-pressed" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          // Stars は player div の外側に配置する
          <React.Fragment key={score.matchingId}>
            <div className={className} id={`final-player-${score.matchingId}`} data-seat={score.seat}>
              <PlayerRank rank={score.rank} />
              <PlayerName name={score.name} nameLength={score.nameLength} prefix="final-player" />
              <PlayerPoints points={score.points} />
              <PlayerMisses misses={score.misses} />
              <PreviousResult previousResult={score.previousResult} />
            </div>
            <Stars stars={score.stars} />
          </React.Fragment>
        );
      })}
    </>
  );
}
