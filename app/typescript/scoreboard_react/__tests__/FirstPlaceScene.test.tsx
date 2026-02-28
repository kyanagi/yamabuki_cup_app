import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FirstPlaceScene } from "../components/FirstPlaceScene";

describe("FirstPlaceScene", () => {
  describe("first_place_init シーン", () => {
    it("何も描画しない", () => {
      const { container } = render(<FirstPlaceScene scene={{ type: "first_place_init" }} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("first_place_plate シーン", () => {
    it(".first-place-container を描画する", () => {
      const { container } = render(<FirstPlaceScene scene={{ type: "first_place_plate" }} />);
      expect(container.querySelector(".first-place-container")).toBeTruthy();
    });

    it(".first-place-plate--drop-in-animation クラスを持つプレートを描画する", () => {
      const { container } = render(<FirstPlaceScene scene={{ type: "first_place_plate" }} />);
      expect(container.querySelector(".first-place-plate--drop-in-animation")).toBeTruthy();
    });

    it("プレートに '1st' を表示する", () => {
      render(<FirstPlaceScene scene={{ type: "first_place_plate" }} />);
      expect(screen.getByText("1st")).toBeTruthy();
    });

    it("選手名エリアは空", () => {
      const { container } = render(<FirstPlaceScene scene={{ type: "first_place_plate" }} />);
      expect(container.querySelector(".first-place-player__name")?.textContent).toBe("");
    });
  });

  describe("first_place_player シーン", () => {
    it(".first-place-container を描画する", () => {
      const { container } = render(
        <FirstPlaceScene scene={{ type: "first_place_player", playerName: "テスト選手" }} />,
      );
      expect(container.querySelector(".first-place-container")).toBeTruthy();
    });

    it("選手名を表示する", () => {
      render(<FirstPlaceScene scene={{ type: "first_place_player", playerName: "テスト選手" }} />);
      expect(screen.getByText("テスト選手")).toBeTruthy();
    });

    it(".animation-flip-in-x クラスを持つ", () => {
      const { container } = render(
        <FirstPlaceScene scene={{ type: "first_place_player", playerName: "テスト選手" }} />,
      );
      expect(container.querySelector(".animation-flip-in-x")).toBeTruthy();
    });

    it("4文字以下の名前には length クラスがつかない", () => {
      const { container } = render(<FirstPlaceScene scene={{ type: "first_place_player", playerName: "四文" }} />);
      const nameText = container.querySelector(".first-place-player__name-text");
      expect(nameText?.className).not.toContain("first-place-player__name--length-");
    });

    it("5文字の名前には length-5 クラスがつく", () => {
      const { container } = render(
        <FirstPlaceScene scene={{ type: "first_place_player", playerName: "五文字テスト" }} />,
      );
      // 「五文字テスト」は6文字
      const nameText = container.querySelector(".first-place-player__name-text");
      expect(nameText?.className).toContain("first-place-player__name--length-6");
    });

    it("7文字以上の名前には length-7 クラスがつく（上限7）", () => {
      const { container } = render(
        <FirstPlaceScene
          scene={{ type: "first_place_player", playerName: "一二三四五六七八" }} // 8文字
        />,
      );
      const nameText = container.querySelector(".first-place-player__name-text");
      expect(nameText?.className).toContain("first-place-player__name--length-7");
    });
  });
});
