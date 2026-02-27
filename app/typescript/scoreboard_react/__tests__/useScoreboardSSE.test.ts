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
});
