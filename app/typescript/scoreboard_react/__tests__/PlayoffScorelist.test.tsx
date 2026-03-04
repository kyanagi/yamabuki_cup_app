import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayoffScorelist } from "../components/rules/PlayoffScorelist";
import { makeScore } from "./helpers";

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
