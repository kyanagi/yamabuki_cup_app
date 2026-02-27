import React from "react";
import type { MatchState, QuestionState } from "../types";
import type { SeatId } from "../../lib/buzzer/seat_id";
import { BoardScorelist } from "./rules/BoardScorelist";
import { Round2Scorelist } from "./rules/Round2Scorelist";
import { PlayoffScorelist } from "./rules/PlayoffScorelist";
import { HayaoshiScorelist } from "./rules/HayaoshiScorelist";
import { HayaboScorelist } from "./rules/HayaboScorelist";
import { FinalScorelist } from "./rules/FinalScorelist";
import { Question } from "./Question";

type Props = {
  matchState: MatchState;
  pressedSeat: SeatId | null;
  visibleScores: Set<number> | null;
  questionState: QuestionState | null;
};

export function MatchScorelist({ matchState, pressedSeat, visibleScores, questionState }: Props): React.JSX.Element {
  const { ruleTemplate, gridClass, scores } = matchState;

  const scorelistContent = (() => {
    switch (ruleTemplate) {
      case "board":
        return <BoardScorelist scores={scores} pressedSeat={pressedSeat} visibleScores={visibleScores} />;
      case "round2":
        return <Round2Scorelist scores={scores} pressedSeat={pressedSeat} />;
      case "playoff":
        return <PlayoffScorelist scores={scores} pressedSeat={pressedSeat} />;
      case "hayaoshi":
        return <HayaoshiScorelist scores={scores} pressedSeat={pressedSeat} />;
      case "hayabo":
        return <HayaboScorelist scores={scores} pressedSeat={pressedSeat} />;
      case "final":
        return <FinalScorelist scores={scores} pressedSeat={pressedSeat} />;
    }
  })();

  return (
    <div className="columns-2">
      <div id="match-scorelist" className={gridClass}>
        {scorelistContent}
      </div>
      <div id="question">
        <Question questionState={questionState} />
      </div>
    </div>
  );
}
