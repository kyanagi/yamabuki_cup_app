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

export type QuestionState = {
  text: string;
  answer: string;
  readText: string;
  unreadText: string;
};

export type PaperSeedSlot = {
  rank: number;
  name: string | null;
  score: number | null;
};

export type Round2Slot = {
  rank: number;
  name: string | null;
};

export type TimerCommand = { type: "set"; remainingTimeMs: number } | { type: "start" } | { type: "stop" };

export type Scene =
  | { type: "match" }
  | { type: "timer"; footerLabel: string }
  | { type: "first_place_init" }
  | { type: "first_place_plate" }
  | { type: "first_place_player"; playerName: string }
  | { type: "paper_seed"; footerLabel: string; slots: PaperSeedSlot[]; isExiting: boolean }
  | {
      type: "round2_announcement";
      footerLabel: string;
      gridClass: string;
      slots: Round2Slot[];
      displayAllVersion: number;
    }
  | { type: "announcement"; text: string }
  | { type: "champion"; name: string; tournamentName: string };

export type SseEvent =
  | { type: "match_init"; data: MatchState }
  | { type: "match_update"; data: MatchState }
  | { type: "show_scores" }
  | { type: "hide_scores" }
  | { type: "heartbeat" }
  | { type: "question_show"; data: QuestionState }
  | { type: "question_clear" }
  | { type: "timer_init"; data: { footerLabel: string } }
  | { type: "timer_set_remaining_time"; data: { remainingTimeMs: number } }
  | { type: "timer_start" }
  | { type: "timer_stop" }
  | { type: "first_place_init" }
  | { type: "first_place_prepare_plate" }
  | { type: "first_place_display_player"; data: { playerName: string } }
  | { type: "paper_seed_init"; data: { footerLabel: string } }
  | { type: "paper_seed_display_player"; data: { rank: number; name: string; score: number } }
  | { type: "paper_seed_exit_all_players" }
  | {
      type: "round2_announcement_init";
      data: { footerLabel: string; gridClass: string; players: Array<{ rank: number }> };
    }
  | { type: "round2_announcement_display_player"; data: { rank: number; name: string } }
  | {
      type: "round2_announcement_display_all_players";
      data: { footerLabel: string; gridClass: string; players: Array<{ rank: number; name: string }> };
    }
  | { type: "announcement"; data: { text: string } }
  | { type: "champion"; data: { name: string; tournamentName: string } };
