import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChampionScene } from "../components/ChampionScene";

describe("ChampionScene", () => {
  it("チャンピオン名を表示する", () => {
    render(<ChampionScene scene={{ type: "champion", name: "テスト選手", tournamentName: "第2回やまぶき杯" }} />);
    expect(screen.getByText("テスト選手")).toBeTruthy();
  });

  it("大会名を表示する", () => {
    render(<ChampionScene scene={{ type: "champion", name: "テスト選手", tournamentName: "第2回やまぶき杯" }} />);
    expect(screen.getByText("第2回やまぶき杯")).toBeTruthy();
  });

  it("'CHAMPION' テキストを表示する", () => {
    render(<ChampionScene scene={{ type: "champion", name: "テスト選手", tournamentName: "第2回やまぶき杯" }} />);
    expect(screen.getByText("CHAMPION")).toBeTruthy();
  });

  it(".final-champion クラスを持つ", () => {
    const { container } = render(
      <ChampionScene scene={{ type: "champion", name: "テスト選手", tournamentName: "第2回やまぶき杯" }} />,
    );
    expect(container.querySelector(".final-champion")).toBeTruthy();
  });
});
