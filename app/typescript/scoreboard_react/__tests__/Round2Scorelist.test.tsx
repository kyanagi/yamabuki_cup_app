import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Round2Scorelist } from "../components/rules/Round2Scorelist";
import { makeScore } from "./helpers";

describe("Round2Scorelist", () => {
  it("同じ選手が連続で得点更新されたとき、2問目でもフリップアニメーションを再実行できる", () => {
    const { container, rerender } = render(
      <Round2Scorelist
        scores={[makeScore(1, 1, 4, false), makeScore(2, 2, 3, true), makeScore(3, 3, 2, true)]}
        pressedSeat={null}
        scoreOperationId={1}
      />,
    );

    const playerBefore = container.querySelector("#round2-match-player-3");
    expect(playerBefore?.classList.contains("animation-flip-in-x")).toBe(true);

    rerender(
      <Round2Scorelist
        scores={[makeScore(1, 1, 4, false), makeScore(2, 2, 4, true), makeScore(3, 3, 3, true)]}
        pressedSeat={null}
        scoreOperationId={2}
      />,
    );

    const playerAfter = container.querySelector("#round2-match-player-3");
    expect(playerAfter).not.toBe(playerBefore);
    expect(playerAfter?.classList.contains("animation-flip-in-x")).toBe(true);
  });
});
