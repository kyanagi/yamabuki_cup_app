import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScoreboardSSE } from "../hooks/useScoreboardSSE";
import type { MatchState, QuestionState } from "../types";

const MOCK_QUESTION_STATE: QuestionState = {
  text: "テスト問題文",
  answer: "テスト答え",
};

const MOCK_MATCH_STATE: MatchState = {
  matchId: 1,
  ruleTemplate: "board",
  gridClass: "match-scorelist-column1",
  footerLabel: "準決勝 A卓",
  scoreOperationId: 10,
  scores: [],
};

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, listener]);
  }

  dispatchEvent(type: string, data: unknown): void {
    const handlers = this.listeners.get(type) ?? [];
    const event = { data: JSON.stringify(data) } as MessageEvent<string>;
    handlers.forEach((h) => h(event));
  }

  close(): void {}
}

describe("useScoreboardSSE", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("初期状態では matchState は null", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    expect(result.current.matchState).toBeNull();
  });

  it("match_init イベントで matchState が更新される", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("match_init", MOCK_MATCH_STATE);
    });

    expect(result.current.matchState).toEqual(MOCK_MATCH_STATE);
  });

  it("match_update イベントで matchState が更新される", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("match_update", MOCK_MATCH_STATE);
    });

    expect(result.current.matchState).toEqual(MOCK_MATCH_STATE);
  });

  it("show_scores イベントで showScores が true になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("show_scores", {});
    });

    expect(result.current.showScores).toBe(true);
  });

  it("hide_scores イベントで showScores が false になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("show_scores", {});
    });

    act(() => {
      source?.dispatchEvent("hide_scores", {});
    });

    expect(result.current.showScores).toBe(false);
  });

  it("match_init イベントで showScores がリセットされる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    // まず show_scores で true にする
    act(() => {
      source?.dispatchEvent("show_scores", {});
    });
    expect(result.current.showScores).toBe(true);

    // match_init を受信すると false にリセットされる
    act(() => {
      source?.dispatchEvent("match_init", MOCK_MATCH_STATE);
    });

    expect(result.current.showScores).toBe(false);
  });

  it("初期状態では questionState は null", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    expect(result.current.questionState).toBeNull();
  });

  it("question_show イベントで questionState が更新される", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("question_show", MOCK_QUESTION_STATE);
    });

    expect(result.current.questionState).toEqual(MOCK_QUESTION_STATE);
  });

  it("question_clear イベントで questionState が null になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("question_show", MOCK_QUESTION_STATE);
    });
    expect(result.current.questionState).toEqual(MOCK_QUESTION_STATE);

    act(() => {
      source?.dispatchEvent("question_clear", {});
    });

    expect(result.current.questionState).toBeNull();
  });

  it("match_init イベントで questionState がリセットされる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("question_show", MOCK_QUESTION_STATE);
    });
    expect(result.current.questionState).toEqual(MOCK_QUESTION_STATE);

    act(() => {
      source?.dispatchEvent("match_init", MOCK_MATCH_STATE);
    });

    expect(result.current.questionState).toBeNull();
  });

  // --- scene state ---

  it("初期状態では scene は null", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    expect(result.current.scene).toBeNull();
  });

  it("match_init イベントで scene が { type: 'match' } になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("match_init", MOCK_MATCH_STATE);
    });

    expect(result.current.scene).toEqual({ type: "match" });
  });

  it("timer_init イベントで scene が timer になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("timer_init", { footerLabel: "1R 1時間クイズ" });
    });

    expect(result.current.scene).toEqual({ type: "timer", footerLabel: "1R 1時間クイズ" });
  });

  it("timer_init 受信時は timerCommand が null になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("timer_set_remaining_time", { remainingTimeMs: 60000 });
    });

    act(() => {
      source?.dispatchEvent("timer_init", { footerLabel: "1R 1時間クイズ" });
    });

    expect(result.current.timerCommand).toBeNull();
  });

  it("timer_set_remaining_time で timerCommand が set になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("timer_set_remaining_time", { remainingTimeMs: 60000 });
    });

    expect(result.current.timerCommand).toEqual({ type: "set", remainingTimeMs: 60000 });
  });

  it("timer_start で timerCommand が start になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("timer_start", {});
    });

    expect(result.current.timerCommand).toEqual({ type: "start" });
  });

  it("timer_stop で timerCommand が stop になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("timer_stop", {});
    });

    expect(result.current.timerCommand).toEqual({ type: "stop" });
  });

  it("first_place_init で scene が first_place_init になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("first_place_init", {});
    });

    expect(result.current.scene).toEqual({ type: "first_place_init" });
  });

  it("first_place_prepare_plate で scene が first_place_plate になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("first_place_prepare_plate", {});
    });

    expect(result.current.scene).toEqual({ type: "first_place_plate" });
  });

  it("first_place_display_player で scene が first_place_player になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("first_place_display_player", { playerName: "テスト選手" });
    });

    expect(result.current.scene).toEqual({ type: "first_place_player", playerName: "テスト選手" });
  });

  it("paper_seed_init で scene が paper_seed になる（7スロット空）", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("paper_seed_init", { footerLabel: "1R 1時間クイズ" });
    });

    expect(result.current.scene?.type).toBe("paper_seed");
    if (result.current.scene?.type === "paper_seed") {
      expect(result.current.scene.footerLabel).toBe("1R 1時間クイズ");
      expect(result.current.scene.slots).toHaveLength(7);
      expect(result.current.scene.slots[0]).toEqual({ rank: 1, name: null, score: null });
      expect(result.current.scene.isExiting).toBe(false);
    }
  });

  it("paper_seed_display_player で該当スロットが更新される", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("paper_seed_init", { footerLabel: "1R 1時間クイズ" });
    });

    act(() => {
      source?.dispatchEvent("paper_seed_display_player", { rank: 3, name: "テスト選手", score: 80 });
    });

    if (result.current.scene?.type === "paper_seed") {
      const slot3 = result.current.scene.slots.find((s) => s.rank === 3);
      expect(slot3).toEqual({ rank: 3, name: "テスト選手", score: 80 });
      // 他のスロットは変更されない
      const slot1 = result.current.scene.slots.find((s) => s.rank === 1);
      expect(slot1?.name).toBeNull();
    }
  });

  it("paper_seed_exit_all_players で isExiting が true になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("paper_seed_init", { footerLabel: "1R 1時間クイズ" });
    });

    act(() => {
      source?.dispatchEvent("paper_seed_exit_all_players", {});
    });

    if (result.current.scene?.type === "paper_seed") {
      expect(result.current.scene.isExiting).toBe(true);
    }
  });

  it("round2_announcement_init で scene が round2_announcement になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("round2_announcement_init", {
        footerLabel: "2R A卓",
        gridClass: "match-scorelist-column2-row5",
        players: [{ rank: 1 }, { rank: 2 }],
      });
    });

    expect(result.current.scene?.type).toBe("round2_announcement");
    if (result.current.scene?.type === "round2_announcement") {
      expect(result.current.scene.footerLabel).toBe("2R A卓");
      expect(result.current.scene.gridClass).toBe("match-scorelist-column2-row5");
      expect(result.current.scene.slots).toHaveLength(2);
      expect(result.current.scene.slots[0]).toEqual({ rank: 1, name: null });
      expect(result.current.scene.displayAllVersion).toBe(0);
    }
  });

  it("round2_announcement_display_player で該当スロットに名前が入る", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("round2_announcement_init", {
        footerLabel: "2R A卓",
        gridClass: "match-scorelist-column2-row5",
        players: [{ rank: 1 }, { rank: 2 }],
      });
    });

    act(() => {
      source?.dispatchEvent("round2_announcement_display_player", { rank: 1, name: "テスト選手" });
    });

    if (result.current.scene?.type === "round2_announcement") {
      expect(result.current.scene.slots[0]).toEqual({ rank: 1, name: "テスト選手" });
      expect(result.current.scene.slots[1]).toEqual({ rank: 2, name: null });
    }
  });

  it("round2_announcement_display_all_players で全スロットが更新され displayAllVersion が増える", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("round2_announcement_init", {
        footerLabel: "2R A卓",
        gridClass: "match-scorelist-column2-row5",
        players: [{ rank: 1 }, { rank: 2 }],
      });
    });

    act(() => {
      source?.dispatchEvent("round2_announcement_display_all_players", {
        footerLabel: "2R A卓",
        gridClass: "match-scorelist-column2-row5",
        players: [
          { rank: 1, name: "選手A" },
          { rank: 2, name: "選手B" },
        ],
      });
    });

    if (result.current.scene?.type === "round2_announcement") {
      expect(result.current.scene.slots[0]).toEqual({ rank: 1, name: "選手A" });
      expect(result.current.scene.slots[1]).toEqual({ rank: 2, name: "選手B" });
      expect(result.current.scene.displayAllVersion).toBe(1);
    }
  });

  it("announcement で scene が announcement になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("announcement", { text: "テストアナウンス" });
    });

    expect(result.current.scene).toEqual({ type: "announcement", text: "テストアナウンス" });
  });

  it("champion で scene が champion になる", () => {
    const { result } = renderHook(() => useScoreboardSSE());
    const source = MockEventSource.instances[0];

    act(() => {
      source?.dispatchEvent("champion", { name: "テスト選手", tournamentName: "第2回やまぶき杯" });
    });

    expect(result.current.scene).toEqual({
      type: "champion",
      name: "テスト選手",
      tournamentName: "第2回やまぶき杯",
    });
  });
});
