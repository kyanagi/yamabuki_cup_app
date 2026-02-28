/**
 * スコアボード用 SSE 接続を管理するフック。
 * /scoreboard/sse に接続し、受信したイベントを matchState・scene・timerCommand などの
 * React state に変換して返す。scene はメイン表示の切り替えを表し、
 * 試合画面への遷移は match_init イベント（管理画面の「画面をこの試合に切り替える」操作）によって行われる。
 */
import { useEffect, useState } from "react";
import type { MatchState, QuestionState, Scene, TimerCommand, PaperSeedSlot, Round2Slot } from "../types";

export type UseScoreboardSSEResult = {
  matchState: MatchState | null;
  showScores: boolean;
  questionState: QuestionState | null;
  scene: Scene | null;
  timerCommand: TimerCommand | null;
};

const PAPER_SEED_INITIAL_SLOTS: PaperSeedSlot[] = Array.from({ length: 7 }, (_, i) => ({
  rank: i + 1,
  name: null,
  score: null,
}));

export function useScoreboardSSE(): UseScoreboardSSEResult {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [showScores, setShowScores] = useState(false);
  const [questionState, setQuestionState] = useState<QuestionState | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [timerCommand, setTimerCommand] = useState<TimerCommand | null>(null);

  useEffect(() => {
    const source = new EventSource("/scoreboard/sse");

    source.addEventListener("match_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as MatchState;
      setMatchState(data);
      setShowScores(false);
      setQuestionState(null);
      setScene({ type: "match" });
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

    // タイマー
    source.addEventListener("timer_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { footerLabel: string };
      setScene({ type: "timer", footerLabel: data.footerLabel });
      setTimerCommand(null);
    });

    source.addEventListener("timer_set_remaining_time", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { remainingTimeMs: number };
      setTimerCommand({ type: "set", remainingTimeMs: data.remainingTimeMs });
    });

    source.addEventListener("timer_start", () => {
      setTimerCommand({ type: "start" });
    });

    source.addEventListener("timer_stop", () => {
      setTimerCommand({ type: "stop" });
    });

    // 1位発表
    source.addEventListener("first_place_init", () => {
      setScene({ type: "first_place_init" });
    });

    source.addEventListener("first_place_prepare_plate", () => {
      setScene({ type: "first_place_plate" });
    });

    source.addEventListener("first_place_display_player", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { playerName: string };
      setScene({ type: "first_place_player", playerName: data.playerName });
    });

    // シード発表
    source.addEventListener("paper_seed_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { footerLabel: string };
      setScene({
        type: "paper_seed",
        footerLabel: data.footerLabel,
        slots: PAPER_SEED_INITIAL_SLOTS.map((s) => ({ ...s })),
        isExiting: false,
      });
    });

    source.addEventListener("paper_seed_display_player", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { rank: number; name: string; score: number };
      setScene((prev) => {
        if (prev?.type !== "paper_seed") return prev;
        return {
          ...prev,
          slots: prev.slots.map((slot) =>
            slot.rank === data.rank ? { ...slot, name: data.name, score: data.score } : slot,
          ),
        };
      });
    });

    source.addEventListener("paper_seed_exit_all_players", () => {
      setScene((prev) => {
        if (prev?.type !== "paper_seed") return prev;
        return { ...prev, isExiting: true };
      });
    });

    // 2R発表
    source.addEventListener("round2_announcement_init", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        footerLabel: string;
        gridClass: string;
        players: Array<{ rank: number }>;
      };
      const slots: Round2Slot[] = data.players.map((p) => ({ rank: p.rank, name: null }));
      setScene({
        type: "round2_announcement",
        footerLabel: data.footerLabel,
        gridClass: data.gridClass,
        slots,
        displayAllVersion: 0,
      });
    });

    source.addEventListener("round2_announcement_display_player", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { rank: number; name: string };
      setScene((prev) => {
        if (prev?.type !== "round2_announcement") return prev;
        return {
          ...prev,
          slots: prev.slots.map((slot) => (slot.rank === data.rank ? { ...slot, name: data.name } : slot)),
        };
      });
    });

    source.addEventListener("round2_announcement_display_all_players", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        footerLabel: string;
        gridClass: string;
        players: Array<{ rank: number; name: string }>;
      };
      const slots: Round2Slot[] = data.players.map((p) => ({ rank: p.rank, name: p.name }));
      setScene((prev) => ({
        type: "round2_announcement",
        footerLabel: data.footerLabel,
        gridClass: data.gridClass,
        slots,
        displayAllVersion: prev?.type === "round2_announcement" ? prev.displayAllVersion + 1 : 1,
      }));
    });

    // アナウンス
    source.addEventListener("announcement", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { text: string };
      setScene({ type: "announcement", text: data.text });
    });

    // チャンピオン
    source.addEventListener("champion", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { name: string; tournamentName: string };
      setScene({ type: "champion", name: data.name, tournamentName: data.tournamentName });
    });

    return () => {
      source.close();
    };
  }, []);

  return { matchState, showScores, questionState, scene, timerCommand };
}
