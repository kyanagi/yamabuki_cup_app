import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinalScorelist } from "../components/rules/FinalScorelist";
import { makeScore } from "./helpers";

describe("FinalScorelist", () => {
  it("同じ選手が連続で得点更新されたとき、2問目でもフリップアニメーションを再実行できる", () => {
    const { container, rerender } = render(
      <FinalScorelist
        scores={[makeScore(1, 1, 1, false), makeScore(2, 2, 0, true), makeScore(3, 3, 1, true)]}
        pressedSeat={null}
        scoreOperationId={1}
      />,
    );

    const playerBefore = container.querySelector("#final-player-3");
    expect(playerBefore?.classList.contains("animation-flip-in-x")).toBe(true);

    rerender(
      <FinalScorelist
        scores={[makeScore(1, 1, 2, true), makeScore(2, 2, 0, false), makeScore(3, 3, 2, true)]}
        pressedSeat={null}
        scoreOperationId={2}
      />,
    );

    const playerAfter = container.querySelector("#final-player-3");
    expect(playerAfter).not.toBe(playerBefore);
    expect(playerAfter?.classList.contains("animation-flip-in-x")).toBe(true);
  });

  it("★獲得時はプレートをフリップせず、★の pop アニメーションを実行する", () => {
    const { container, rerender } = render(
      <FinalScorelist
        scores={[
          makeScore(1, 1, 2, false, { stars: 1, status: "set_win" }),
          makeScore(2, 2, 0, false),
          makeScore(3, 3, 0, false),
        ]}
        pressedSeat={null}
        scoreOperationId={10}
      />,
    );

    const playerBefore = container.querySelector("#final-player-1");
    expect(playerBefore?.classList.contains("animation-flip-in-x")).toBe(false);

    rerender(
      <FinalScorelist
        scores={[
          makeScore(1, 1, 2, true, { stars: 2, status: "set_win" }),
          makeScore(2, 2, 0, false),
          makeScore(3, 3, 0, false),
        ]}
        pressedSeat={null}
        scoreOperationId={11}
      />,
    );

    const playerAfter = container.querySelector("#final-player-1");
    expect(playerAfter).toBe(playerBefore);
    expect(playerAfter?.classList.contains("animation-flip-in-x")).toBe(false);
    expect(container.querySelectorAll(".final-player__star--pop")).toHaveLength(1);
  });
});
