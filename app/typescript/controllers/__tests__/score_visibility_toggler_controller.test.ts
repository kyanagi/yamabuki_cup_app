import { afterEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import ScoreVisibilityTogglerController from "../score_visibility_toggler_controller";

// score_visibility_toggler_controller が import "@hotwired/turbo-rails" しているためモックが必要
vi.mock("@hotwired/turbo-rails", () => ({}));

function createHTML(): string {
  return `
    <div
      data-controller="score-visibility-toggler"
      data-score-visibility-toggler-hidden-scorelist-class="match-scorelist--hidden-scores"
      data-score-visibility-toggler-score-hidden-class="hidden"
      data-score-visibility-toggler-animation-class="animation-flip-in-x"
      data-score-visibility-toggler-target="scorelist"
      class="match-scorelist--hidden-scores"
    >
      <div class="board-player">
        <div class="player__points" data-score-visibility-toggler-target="points" data-points="200">200</div>
      </div>
      <div class="board-player">
        <div class="player__points" data-score-visibility-toggler-target="points" data-points="100">100</div>
      </div>
    </div>
  `;
}

function triggerStreamAction(action: string): void {
  const streamElement = document.createElement("div");
  streamElement.setAttribute("action", action);

  const event = new CustomEvent("turbo:before-stream-render", {
    bubbles: true,
    detail: {
      render: (_el: HTMLElement) => {},
    },
  });

  document.dispatchEvent(event);
  (event.detail as { render: (el: HTMLElement) => void }).render(streamElement);
}

describe("ScoreVisibilityTogglerController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("hide-scores", () => {
    it("show-scores 後に hide-scores を押すと未実行のタイマーがキャンセルされる", async () => {
      const { application } = await setupControllerTest(
        ScoreVisibilityTogglerController,
        createHTML(),
        "score-visibility-toggler",
      );

      vi.useFakeTimers();
      triggerStreamAction("show-scores");

      const scorelist = document.querySelector('[data-score-visibility-toggler-target="scorelist"]');
      if (!scorelist) throw new Error("scorelist not found");
      const points200 = document.querySelector('[data-points="200"]');
      const points100 = document.querySelector('[data-points="100"]');
      if (!points200 || !points100) throw new Error("points elements not found");

      // show-scores 直後: hidden が付いてタイマー待機中
      expect(points200.classList.contains("hidden")).toBe(true);

      // タイマー実行前に hide-scores
      triggerStreamAction("hide-scores");

      // 全タイマーを実行してもコールバックが走らない
      vi.runAllTimers();

      // hidden クラスは残ったまま（タイマーがキャンセルされた証拠）
      expect(points200.classList.contains("hidden")).toBe(true);
      expect(points100.classList.contains("hidden")).toBe(true);
      // animationClass も付与されていない
      expect(points200.parentElement?.classList.contains("animation-flip-in-x")).toBe(false);
      expect(points100.parentElement?.classList.contains("animation-flip-in-x")).toBe(false);

      teardownControllerTest(application);
    });
  });

  describe("show-scores", () => {
    it("得点要素が降順で順次表示される", async () => {
      const { application } = await setupControllerTest(
        ScoreVisibilityTogglerController,
        createHTML(),
        "score-visibility-toggler",
      );

      vi.useFakeTimers();
      triggerStreamAction("show-scores");

      const scorelist = document.querySelector('[data-score-visibility-toggler-target="scorelist"]');
      if (!scorelist) throw new Error("scorelist not found");
      const points200 = document.querySelector('[data-points="200"]');
      const points100 = document.querySelector('[data-points="100"]');
      if (!points200 || !points100) throw new Error("points elements not found");

      // 直後: スコアリストは表示されるが各得点は hidden
      expect(scorelist.classList.contains("match-scorelist--hidden-scores")).toBe(false);
      expect(points200.classList.contains("hidden")).toBe(true);
      expect(points100.classList.contains("hidden")).toBe(true);

      // 800ms 後: 1番目（200点・高い方）が表示される
      vi.advanceTimersByTime(800);
      expect(points200.classList.contains("hidden")).toBe(false);
      expect(points200.parentElement?.classList.contains("animation-flip-in-x")).toBe(true);
      expect(points100.classList.contains("hidden")).toBe(true);

      // 1600ms 後: 2番目（100点）も表示される
      vi.advanceTimersByTime(800);
      expect(points100.classList.contains("hidden")).toBe(false);
      expect(points100.parentElement?.classList.contains("animation-flip-in-x")).toBe(true);

      teardownControllerTest(application);
    });

    it("disconnect後はタイマーのコールバックが実行されない", async () => {
      const { application, controller } = await setupControllerTest(
        ScoreVisibilityTogglerController,
        createHTML(),
        "score-visibility-toggler",
      );

      vi.useFakeTimers();
      triggerStreamAction("show-scores");

      // タイマー実行前に disconnect
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateメソッドにアクセス
      (controller as any).disconnect();

      // 全タイマーを実行（クリア済みなのでコールバックが動かないはず）
      vi.runAllTimers();

      const points200 = document.querySelector('[data-points="200"]');
      const points100 = document.querySelector('[data-points="100"]');
      if (!points200 || !points100) throw new Error("points elements not found");
      expect(points200.classList.contains("hidden")).toBe(true);
      expect(points100.classList.contains("hidden")).toBe(true);

      teardownControllerTest(application);
    });
  });
});
