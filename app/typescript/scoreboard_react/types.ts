export type MatchState = {
  matchId: number;
  ruleTemplate: "board" | "round2" | "playoff" | "hayaoshi" | "hayabo" | "final";
  gridClass: string;
  footerLabel: string;
  scoreOperationId: number | null;
  scores: ScoreEntry[];
};

export type ScoreEntry = {
  matchingId: number;
  seat: number;
  playerId: number;
  name: string;
  nameLength: number;
  status: "playing" | "waiting" | "win" | "lose" | "set_win";
  points: number;
  misses: number;
  rank: number | null;
  stars: number;
  scoreChanged: boolean;
  previousResult: "correct" | "wrong" | null;
  previousSituation: "pushed" | "unpushed" | null;
};

export type SseEvent =
  | { type: "match_init"; data: MatchState }
  | { type: "match_update"; data: MatchState }
  | { type: "show_scores" }
  | { type: "hide_scores" }
  | { type: "heartbeat" };
