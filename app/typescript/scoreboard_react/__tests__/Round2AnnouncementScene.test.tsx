import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Round2AnnouncementScene } from "../components/Round2AnnouncementScene";
import type { Scene } from "../types";

function makeOmoteScene(
  overrides?: Partial<Extract<Scene, { type: "round2_announcement" }>>,
): Extract<Scene, { type: "round2_announcement" }> {
  return {
    type: "round2_announcement",
    footerLabel: "2R 3◯2×クイズ A卓",
    gridClass: "match-scorelist-column2-row5",
    slots: [
      { rank: 1, name: null },
      { rank: 2, name: null },
      { rank: 3, name: null },
      { rank: 4, name: null },
      { rank: 5, name: null },
    ],
    displayAllVersion: 0,
    ...overrides,
  };
}

function makeUraScene(): Extract<Scene, { type: "round2_announcement" }> {
  return {
    type: "round2_announcement",
    footerLabel: "2R 3◯2×クイズ A卓（裏）",
    gridClass: "match-scorelist-column2-row6",
    slots: [
      { rank: 8, name: null },
      { rank: 9, name: null },
    ],
    displayAllVersion: 0,
  };
}

describe("Round2AnnouncementScene", () => {
  it("gridClass が適用されたコンテナを持つ", () => {
    const { container } = render(<Round2AnnouncementScene scene={makeOmoteScene()} />);
    expect(container.querySelector(".match-scorelist-column2-row5")).toBeTruthy();
  });

  it("スロット数分の要素を描画する", () => {
    const { container } = render(<Round2AnnouncementScene scene={makeOmoteScene()} />);
    const slots = container.querySelectorAll(".round2-announcement-player");
    expect(slots).toHaveLength(5);
  });

  it("omote のとき rank 番号が表示される", () => {
    render(<Round2AnnouncementScene scene={makeOmoteScene()} />);
    expect(screen.getAllByText("1")).toBeTruthy();
  });

  it("ura のとき '-' が表示される（rank 番号は非表示）", () => {
    const { container } = render(<Round2AnnouncementScene scene={makeUraScene()} />);
    const rankElements = container.querySelectorAll(".player__rank");
    rankElements.forEach((el) => {
      expect(el.textContent).toBe("-");
    });
  });

  it("名前が未設定のスロットは player-frame--incoming-animation クラスを持つ", () => {
    const { container } = render(<Round2AnnouncementScene scene={makeOmoteScene()} />);
    const slots = container.querySelectorAll(".round2-announcement-player");
    slots.forEach((slot) => {
      expect(slot.className).toContain("player-frame--incoming-animation");
    });
  });

  it("名前が設定されたスロットは animation-flip-in-x クラスを持つ（displayAllVersion=0）", () => {
    const scene = makeOmoteScene({
      slots: [
        { rank: 1, name: "テスト選手" },
        { rank: 2, name: null },
        { rank: 3, name: null },
        { rank: 4, name: null },
        { rank: 5, name: null },
      ],
    });
    const { container } = render(<Round2AnnouncementScene scene={scene} />);
    const slot1 = container.querySelector("#round2-player-1");
    expect(slot1?.className).toContain("animation-flip-in-x");
  });

  it("displayAllVersion > 0 のとき全スロットが player-frame--incoming-animation クラスを持つ", () => {
    const scene = makeOmoteScene({
      slots: [
        { rank: 1, name: "選手A" },
        { rank: 2, name: "選手B" },
        { rank: 3, name: "選手C" },
        { rank: 4, name: "選手D" },
        { rank: 5, name: "選手E" },
      ],
      displayAllVersion: 1,
    });
    const { container } = render(<Round2AnnouncementScene scene={scene} />);
    const slots = container.querySelectorAll(".round2-announcement-player");
    slots.forEach((slot) => {
      expect(slot.className).toContain("player-frame--incoming-animation");
    });
  });

  it("選手名が表示される", () => {
    const scene = makeOmoteScene({
      slots: [
        { rank: 1, name: "テスト選手" },
        { rank: 2, name: null },
        { rank: 3, name: null },
        { rank: 4, name: null },
        { rank: 5, name: null },
      ],
    });
    render(<Round2AnnouncementScene scene={scene} />);
    expect(screen.getByText("テスト選手")).toBeTruthy();
  });

  it("各スロットに正しい id が設定される", () => {
    const { container } = render(<Round2AnnouncementScene scene={makeOmoteScene()} />);
    expect(container.querySelector("#round2-player-1")).toBeTruthy();
    expect(container.querySelector("#round2-player-5")).toBeTruthy();
  });
});
