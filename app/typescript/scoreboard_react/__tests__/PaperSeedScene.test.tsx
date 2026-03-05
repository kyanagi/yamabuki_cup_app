import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { dispatchAnimationEnd } from "../../__tests__/helpers/animation";
import { PaperSeedScene } from "../components/PaperSeedScene";
import type { Scene } from "../types";

function makeScene(
  overrides?: Partial<Extract<Scene, { type: "paper_seed" }>>,
): Extract<Scene, { type: "paper_seed" }> {
  return {
    type: "paper_seed",
    footerLabel: "1R 1時間クイズ",
    slots: Array.from({ length: 7 }, (_, i) => ({
      rank: i + 1,
      name: null,
      score: null,
    })),
    isExiting: false,
    ...overrides,
  };
}

describe("PaperSeedScene", () => {
  it("7つのスロットを描画する", () => {
    const { container } = render(<PaperSeedScene scene={makeScene()} />);
    const slots = container.querySelectorAll(".paper-seed-player");
    expect(slots).toHaveLength(7);
  });

  it("各スロットに rank が表示される", () => {
    render(<PaperSeedScene scene={makeScene()} />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getAllByText(i.toString())).toBeTruthy();
    }
  });

  it("初期状態でスロットに player-frame--incoming-animation クラスがつく", () => {
    const { container } = render(<PaperSeedScene scene={makeScene()} />);
    const slots = container.querySelectorAll(".paper-seed-player");
    slots.forEach((slot) => {
      expect(slot.className).toContain("player-frame--incoming-animation");
    });
  });

  it("名前が設定されたスロットに animation-flip-in-x クラスがつく", () => {
    const scene = makeScene({
      slots: [
        { rank: 1, name: "テスト選手", score: 80 },
        ...Array.from({ length: 6 }, (_, i) => ({ rank: i + 2, name: null, score: null })),
      ],
    });
    const { container } = render(<PaperSeedScene scene={scene} />);
    const firstSlot = container.querySelector("#paper-seed-player-1");
    expect(firstSlot?.className).toContain("animation-flip-in-x");
  });

  it("名前と得点がスロットに表示される", () => {
    const scene = makeScene({
      slots: [
        { rank: 1, name: "テスト選手", score: 85 },
        ...Array.from({ length: 6 }, (_, i) => ({ rank: i + 2, name: null, score: null })),
      ],
    });
    render(<PaperSeedScene scene={scene} />);
    expect(screen.getByText("テスト選手")).toBeTruthy();
    expect(screen.getByText("85")).toBeTruthy();
  });

  it("isExiting=true のとき paper-seed-player--exiting クラスがつく", () => {
    const { container } = render(<PaperSeedScene scene={makeScene({ isExiting: true })} />);
    const exitingSlots = container.querySelectorAll(".paper-seed-player--exiting");
    expect(exitingSlots.length).toBeGreaterThan(0);
  });

  it("アニメーション終了後に paper-seed-player--exited クラスに変わる", () => {
    const { container } = render(<PaperSeedScene scene={makeScene({ isExiting: true })} />);
    const firstSlot = container.querySelector<HTMLElement>("#paper-seed-player-1");
    if (!firstSlot) {
      throw new Error("#paper-seed-player-1 が見つかりません");
    }

    dispatchAnimationEnd(firstSlot);

    expect(firstSlot?.className).toContain("paper-seed-player--exited");
  });

  it(".columns-2 レイアウトを持つ", () => {
    const { container } = render(<PaperSeedScene scene={makeScene()} />);
    expect(container.querySelector(".columns-2")).toBeTruthy();
  });

  it(".match-scorelist-column1 クラスのコンテナを持つ", () => {
    const { container } = render(<PaperSeedScene scene={makeScene()} />);
    expect(container.querySelector(".match-scorelist-column1")).toBeTruthy();
  });
});
