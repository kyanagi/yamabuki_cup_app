import { useEffect, useState } from "react";
import type { MatchState } from "../types";

export type UseScoreboardSSEResult = {
  matchState: MatchState | null;
  showScores: boolean;
};

export function useScoreboardSSE(): UseScoreboardSSEResult {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const source = new EventSource("/scoreboard/sse");

    source.addEventListener("match_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as MatchState;
      setMatchState(data);
      setShowScores(false);
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

    return () => {
      source.close();
    };
  }, []);

  return { matchState, showScores };
}
