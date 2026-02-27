import React from "react";
import type { ScoreEntry } from "../../types";
import { PlayerName } from "../shared/PlayerName";
import { PlayerPoints } from "../shared/PlayerPoints";
import { PlayerRank } from "../shared/PlayerRank";

type Props = {
  scores: ScoreEntry[];
  pressedSeat: number | null;
  /** board ルールのスコア表示/非表示管理: null = 全非表示, Set = 表示する matchingId の集合 */
  visibleScores: Set<number> | null;
};

export function BoardScorelist({ scores, pressedSeat, visibleScores }: Props): React.JSX.Element {
  return (
    <>
      {scores.map((score) => {
        const isPressed = pressedSeat === score.seat;
        const visible = visibleScores === null ? false : visibleScores.has(score.matchingId);
        const className = [
          "board-player",
          `player--${score.status}`,
          isPressed ? "player--buzzer-pressed" : "",
          visible ? "animation-flip-in-x" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={score.matchingId}
            className={className}
            id={`board-player-${score.matchingId}`}
            data-seat={score.seat}
          >
            <PlayerRank rank={score.rank} />
            <PlayerName name={score.name} nameLength={score.nameLength} prefix="board-player" />
            <PlayerPoints
              points={score.points}
              boardMode
              scoreVisibilityTarget={visibleScores !== undefined}
              visible={visible}
            />
          </div>
        );
      })}
    </>
  );
}
