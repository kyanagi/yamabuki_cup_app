import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreboardRoot } from "../components/ScoreboardRoot";
import { MatchScorelist } from "../components/MatchScorelist";
import type { MatchState, QuestionState } from "../types";

function makeMatchState(): MatchState {
  return {
    matchId: 1,
    ruleTemplate: "board",
    gridClass: "grid-4",
    footerLabel: "第1回戦",
    scoreOperationId: null,
    scores: [],
  };
}

const MOCK_QUESTION: QuestionState = {
  text: "テスト問題文",
  answer: "テスト解答",
};

describe("ScoreboardRoot", () => {
  // ふるまいテスト（主軸）
  it("questionState を Question に渡して表示する", () => {
    render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={MOCK_QUESTION}
      />,
    );
    expect(screen.getByText("テスト問題文")).toBeTruthy();
  });

  // 以下は責務境界の契約テスト（DOM 構造でレイアウト責務の所在を確認）
  it("columns-2 レイアウトの枠を持つ", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeTruthy();
  });

  it("columns-2 の中に #match-scorelist がある", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#match-scorelist")).toBeTruthy();
  });

  it("columns-2 の中に #question がある", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#question")).toBeTruthy();
  });

  it("matchState が null のとき columns-2 も #question もレンダリングしない", () => {
    const { container } = render(
      <ScoreboardRoot matchState={null} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeNull();
    expect(container.querySelector("#question")).toBeNull();
  });
});

describe("MatchScorelist（単体）", () => {
  // 責務境界の契約テスト（columns-2 と #question が ScoreboardRoot に属することを保証）
  it("columns-2 を持たない", () => {
    const { container } = render(
      <MatchScorelist matchState={makeMatchState()} pressedSeat={null} visibleScores={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeNull();
  });

  it("#question を持たない", () => {
    const { container } = render(
      <MatchScorelist matchState={makeMatchState()} pressedSeat={null} visibleScores={null} />,
    );
    expect(container.querySelector("#question")).toBeNull();
  });
});
