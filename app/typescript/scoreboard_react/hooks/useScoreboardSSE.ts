import { useEffect, useState } from "react";
import type { MatchState, QuestionState } from "../types";

export type UseScoreboardSSEResult = {
  matchState: MatchState | null;
  showScores: boolean;
  questionState: QuestionState | null;
};

export function useScoreboardSSE(): UseScoreboardSSEResult {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [showScores, setShowScores] = useState(false);
  const [questionState, setQuestionState] = useState<QuestionState | null>(null);

  useEffect(() => {
    const source = new EventSource("/scoreboard/sse");

    source.addEventListener("match_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as MatchState;
      setMatchState(data);
      setShowScores(false);
      setQuestionState(null);
    });

    source.addEventListener("match_update", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as MatchState;
      setMatchState(data);
    });

    source.addEventListener("show_scores", () => {
      setShowScores(true);
    });

    source.addEventListener("hide_scores", () => {
      setShowScores(false);
    });

    source.addEventListener("question_show", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as QuestionState;
      setQuestionState(data);
    });

    source.addEventListener("question_clear", () => {
      setQuestionState(null);
    });

    return () => {
      source.close();
    };
  }, []);

  return { matchState, showScores, questionState };
}
