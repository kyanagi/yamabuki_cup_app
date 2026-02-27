import React from "react";
import { ScoreboardRoot } from "./components/ScoreboardRoot";
import { useScoreboardSSE } from "./hooks/useScoreboardSSE";
import { useBuzzerChannel } from "./hooks/useBuzzerChannel";
import { useScoreVisibility } from "./hooks/useScoreVisibility";

export function App(): React.JSX.Element {
  const { matchState, showScores } = useScoreboardSSE();
  const pressedSeat = useBuzzerChannel(matchState);
  const visibleScores = useScoreVisibility(matchState, showScores);

  return <ScoreboardRoot matchState={matchState} pressedSeat={pressedSeat} visibleScores={visibleScores} />;
}
