import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayoffScorelist } from "../components/rules/PlayoffScorelist";
import type { ScoreEntry } from "../types";

function makeScore(matchingId: number, seat: number, points: number, scoreChanged: boolean): ScoreEntry {
  return {
    matchingId,
    seat,
    playerId: matchingId,
    name: `選手${matchingId}`,
    nameLength: 2,
    status: "playing",
    points,
    misses: 0,
    rank: null,
    stars: 0,
    scoreChanged,
    previousResult: null,
    previousSituation: null,
  };
}

describe("PlayoffScorelist", () => {
  it("同じ選手が連続で減点されたとき、2問目でもフリップアニメーションを再実行できる", () => {
    const { container, rerender } = render(
      <PlayoffScorelist
        scores={[makeScore(1, 1, 10, false), makeScore(2, 2, 9, true), makeScore(3, 3, 9, true)]}
        pressedSeat={null}
        scoreOperationId={1}
      />,
    );

    const playerBefore = container.querySelector("#playoff-match-player-3");
    expect(playerBefore?.classList.contains("animation-flip-in-x")).toBe(true);

    rerender(
      <PlayoffScorelist
        scores={[makeScore(1, 1, 9, true), makeScore(2, 2, 9, false), makeScore(3, 3, 8, true)]}
        pressedSeat={null}
        scoreOperationId={2}
      />,
    );

    const playerAfter = container.querySelector("#playoff-match-player-3");
    expect(playerAfter).not.toBe(playerBefore);
    expect(playerAfter?.classList.contains("animation-flip-in-x")).toBe(true);
  });
});
