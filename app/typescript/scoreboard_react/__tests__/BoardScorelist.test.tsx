import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BoardScorelist } from "../components/rules/BoardScorelist";
import type { ScoreEntry } from "../types";

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

describe("BoardScorelist", () => {
  it("visibleScores が null のとき animation-flip-in-x クラスが付かない", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { container } = render(<BoardScorelist scores={scores} pressedSeat={null} visibleScores={null} />);

    for (const el of container.querySelectorAll(".board-player")) {
      expect(el.classList.contains("animation-flip-in-x")).toBe(false);
    }
  });

  it("visibleScores が空 Set のとき animation-flip-in-x クラスが付かない", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { container } = render(<BoardScorelist scores={scores} pressedSeat={null} visibleScores={new Set()} />);

    for (const el of container.querySelectorAll(".board-player")) {
      expect(el.classList.contains("animation-flip-in-x")).toBe(false);
    }
  });

  it("visibleScores に含まれる matchingId の player div に animation-flip-in-x クラスが付く", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { container } = render(<BoardScorelist scores={scores} pressedSeat={null} visibleScores={new Set([1])} />);

    const player1 = container.querySelector("#board-player-1");
    const player2 = container.querySelector("#board-player-2");
    expect(player1?.classList.contains("animation-flip-in-x")).toBe(true);
    expect(player2?.classList.contains("animation-flip-in-x")).toBe(false);
  });

  it("visibleScores に全員含まれるとき全 player div に animation-flip-in-x クラスが付く", () => {
    const scores = [makeScore(1, 5), makeScore(2, 3)];
    const { container } = render(<BoardScorelist scores={scores} pressedSeat={null} visibleScores={new Set([1, 2])} />);

    for (const el of container.querySelectorAll(".board-player")) {
      expect(el.classList.contains("animation-flip-in-x")).toBe(true);
    }
  });
});
