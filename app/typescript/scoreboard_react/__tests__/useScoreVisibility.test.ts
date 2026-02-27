import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScoreVisibility } from "../hooks/useScoreVisibility";
import type { MatchState, ScoreEntry } from "../types";

function makeScore(matchingId: number, points: number): ScoreEntry {
  return {
    matchingId,
    seat: matchingId,
    playerId: matchingId,
    name: `Player${matchingId}`,
    nameLength: 6,
    status: "playing",
    points,
    misses: 0,
    rank: null,
    stars: 0,
    scoreChanged: false,
    previousResult: null,
    previousSituation: null,
  };
}

function makeBoardState(scores: ScoreEntry[]): MatchState {
  return {
    matchId: 1,
    ruleTemplate: "board",
    gridClass: "match-scorelist-column1",
    footerLabel: "準決勝",
    scoreOperationId: 1,
    scores,
  };
}

function makeHayaoshiState(): MatchState {
  return {
    matchId: 2,
    ruleTemplate: "hayaoshi",
    gridClass: "match-scorelist-column1",
    footerLabel: "準々決勝",
    scoreOperationId: 1,
    scores: [makeScore(1, 3)],
  };
}

describe("useScoreVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("board ルール以外では null を返す", () => {
    const { result } = renderHook(() => useScoreVisibility(makeHayaoshiState(), true));
    expect(result.current).toBeNull();
  });

  it("matchState が null のときは null を返す", () => {
    const { result } = renderHook(() => useScoreVisibility(null, false));
    expect(result.current).toBeNull();
  });

  it("showScores が false のとき null を返す", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { result } = renderHook(() => useScoreVisibility(makeBoardState(scores), false));
    expect(result.current).toBeNull();
  });

  it("showScores が true になると空の Set から開始し段階的に表示される", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { result, rerender } = renderHook(
      ({ showScores }) => useScoreVisibility(makeBoardState(scores), showScores),
      { initialProps: { showScores: false } },
    );

    // showScores が false のうちは null
    expect(result.current).toBeNull();

    // showScores を true にする
    act(() => {
      rerender({ showScores: true });
    });

    // まだタイマーが発火していないので空 Set (null ではない)
    expect(result.current).not.toBeNull();
    expect(result.current?.size).toBe(0);
  });

  it("800ms ごとに1件ずつ matchingId が追加される", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { result } = renderHook(() => useScoreVisibility(makeBoardState(scores), true));

    // 最初は空 Set
    expect(result.current?.size).toBe(0);

    // 800ms 経過後、最初の1件
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current?.has(1)).toBe(true);
    expect(result.current?.has(2)).toBe(false);

    // さらに 800ms 経過後、2件目
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current?.has(1)).toBe(true);
    expect(result.current?.has(2)).toBe(true);
  });

  it("points >= 0 のもののみ対象になる", () => {
    const scores = [makeScore(1, 5), makeScore(2, -1), makeScore(3, 0)];
    const { result } = renderHook(() => useScoreVisibility(makeBoardState(scores), true));

    act(() => {
      vi.advanceTimersByTime(800 * 3);
    });

    // matchingId:2 (points: -1) は含まれない
    expect(result.current?.has(2)).toBe(false);
    expect(result.current?.has(1)).toBe(true);
    expect(result.current?.has(3)).toBe(true);
  });

  it("showScores=true のまま別の board 試合に切り替わると visibleMatchingIds がリセットされる", () => {
    const scores1 = [makeScore(10, 5), makeScore(11, 3)];
    const scores2 = [makeScore(20, 5), makeScore(21, 3)];
    const state1 = { ...makeBoardState(scores1), matchId: 1 };
    const state2 = { ...makeBoardState(scores2), matchId: 2 };

    const { result, rerender } = renderHook(({ matchState }) => useScoreVisibility(matchState, true), {
      initialProps: { matchState: state1 },
    });

    // タイマーを進めて試合1の全員を表示済みにする
    act(() => {
      vi.advanceTimersByTime(800 * 3);
    });
    expect(result.current?.has(10)).toBe(true);
    expect(result.current?.has(11)).toBe(true);

    // showScores=true のまま試合2に切り替え
    act(() => {
      rerender({ matchState: state2 });
    });

    // リセットされて空 Set から再開（前試合の matchingId は含まれない）
    expect(result.current?.size).toBe(0);
    expect(result.current?.has(10)).toBe(false);
    expect(result.current?.has(11)).toBe(false);
  });

  it("得点の高い順に表示される", () => {
    const scores = [makeScore(1, 3), makeScore(2, 5)];
    const revealed: number[] = [];
    const { result } = renderHook(() => useScoreVisibility(makeBoardState(scores), true));

    // 1st reveal
    act(() => {
      vi.advanceTimersByTime(800);
    });
    for (const id of [1, 2]) {
      if (result.current?.has(id)) revealed.push(id);
    }

    // matchingId:2 (points:5) が先に表示される
    expect(revealed[0]).toBe(2);
  });
});
