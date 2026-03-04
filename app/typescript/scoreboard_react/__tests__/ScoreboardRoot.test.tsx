import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreboardRoot } from "../components/ScoreboardRoot";
import { MatchScorelist } from "../components/MatchScorelist";
import type { MatchState, QuestionState, Scene } from "../types";

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
  readText: "",
  unreadText: "テスト問題文",
};

const MATCH_SCENE: Scene = { type: "match" };

describe("ScoreboardRoot", () => {
  // ふるまいテスト（主軸）
  it("questionState を Question に渡して表示する", () => {
    render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={MOCK_QUESTION}
        scene={MATCH_SCENE}
        timerCommand={null}
      />,
    );
    expect(screen.getByText("テスト問題文")).toBeTruthy();
  });

  // 以下は責務境界の契約テスト（DOM 構造でレイアウト責務の所在を確認）
  it("columns-2 レイアウトの枠を持つ", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={MATCH_SCENE}
        timerCommand={null}
      />,
    );
    expect(container.querySelector(".columns-2")).toBeTruthy();
  });

  it("columns-2 の中に #match-scorelist がある", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={MATCH_SCENE}
        timerCommand={null}
      />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#match-scorelist")).toBeTruthy();
  });

  it("columns-2 の中に #question がある", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={MATCH_SCENE}
        timerCommand={null}
      />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#question")).toBeTruthy();
  });

  it("matchState が null のとき columns-2 も #question もレンダリングしない", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={null}
        timerCommand={null}
      />,
    );
    expect(container.querySelector(".columns-2")).toBeNull();
    expect(container.querySelector("#question")).toBeNull();
  });

  it("scene が null のとき scoreboard-main は空になる", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={null}
        timerCommand={null}
      />,
    );
    expect(container.querySelector("#scoreboard-main")?.textContent).toBe("");
  });

  it("announcement シーンのときアナウンステキストが表示される", () => {
    render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "announcement", text: "テストアナウンス" }}
        timerCommand={null}
      />,
    );
    expect(screen.getByText("テストアナウンス")).toBeTruthy();
  });

  it("champion シーンのときチャンピオン名が表示される", () => {
    render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "champion", name: "テスト選手", tournamentName: "第2回やまぶき杯" }}
        timerCommand={null}
      />,
    );
    expect(screen.getByText("テスト選手")).toBeTruthy();
  });

  it("timer シーンのとき #timer が表示される", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "timer", footerLabel: "1R 1時間クイズ" }}
        timerCommand={null}
      />,
    );
    expect(container.querySelector("#timer")).toBeTruthy();
  });

  it("first_place_init シーンのとき .first-place-container は表示されない", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "first_place_init" }}
        timerCommand={null}
      />,
    );
    expect(container.querySelector(".first-place-container")).toBeNull();
  });

  it("first_place_plate シーンのとき .first-place-container が表示される", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "first_place_plate" }}
        timerCommand={null}
      />,
    );
    expect(container.querySelector(".first-place-container")).toBeTruthy();
  });

  it("first_place_player シーンのとき選手名が表示される", () => {
    render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "first_place_player", playerName: "テスト選手" }}
        timerCommand={null}
      />,
    );
    expect(screen.getByText("テスト選手")).toBeTruthy();
  });

  it("フッターラベル: match シーンのとき matchState.footerLabel を表示する", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={MATCH_SCENE}
        timerCommand={null}
      />,
    );
    expect(container.querySelector("#scoreboard-footer-left")?.textContent).toBe("第1回戦");
  });

  it("フッターラベル: announcement シーンのとき空文字", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "announcement", text: "テスト" }}
        timerCommand={null}
      />,
    );
    expect(container.querySelector("#scoreboard-footer-left")?.textContent).toBe("");
  });

  it("フッターラベル: first_place_plate シーンのとき '1位発表' を表示する", () => {
    const { container } = render(
      <ScoreboardRoot
        matchState={null}
        pressedSeat={null}
        visibleScores={null}
        questionState={null}
        scene={{ type: "first_place_plate" }}
        timerCommand={null}
      />,
    );
    expect(container.querySelector("#scoreboard-footer-left")?.textContent).toBe("1位発表");
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
