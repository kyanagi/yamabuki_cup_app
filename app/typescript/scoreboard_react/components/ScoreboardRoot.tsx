import React from "react";
import type { MatchState } from "../types";
import type { SeatId } from "../../lib/buzzer/seat_id";
import { MatchScorelist } from "./MatchScorelist";

type Props = {
  matchState: MatchState | null;
  pressedSeat: SeatId | null;
  visibleScores: Set<number> | null;
};

const TODAY = new Date().toLocaleDateString("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function ScoreboardRoot({ matchState, pressedSeat, visibleScores }: Props): React.JSX.Element {
  return (
    <div id="scoreboard-root">
      <div id="scoreboard-main">
        {matchState && (
          <MatchScorelist matchState={matchState} pressedSeat={pressedSeat} visibleScores={visibleScores} />
        )}
      </div>
      <div id="scoreboard-footer">
        <div id="scoreboard-footer-left" className="scoreboard-footer-left">
          {matchState?.footerLabel ?? ""}
        </div>
        <div id="scoreboard-footer-right" className="scoreboard-footer-right">
          {TODAY} 第2回 #やまぶき杯
        </div>
      </div>
    </div>
  );
}
