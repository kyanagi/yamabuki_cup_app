import { Controller } from "@hotwired/stimulus";
import "@hotwired/turbo-rails";

/**
 * スコアボードの得点表示/非表示を制御するコントローラ
 *
 * 管理画面から送信されるTurboストリームアクションを受け取り、
 * スコアリストの表示/非表示を切り替える
 *
 * - show-scores: 得点を表示する
 * - hide-scores: 得点を隠す
 */
export default class extends Controller {
  static targets = ["scorelist", "points"];
  static classes = ["hiddenScorelist", "animation", "scoreHidden"];

  declare scorelistTarget: HTMLElement;
  declare pointsTargets: HTMLElement[];
  declare hiddenScorelistClass: string;
  declare animationClass: string;
  declare scoreHiddenClass: string;

  connect() {
    document.addEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
  }

  disconnect() {
    document.removeEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
  }

  #beforeStreamRenderHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    const fallbackToDefaultActions = customEvent.detail.render;
    customEvent.detail.render = (streamElement: HTMLElement) => {
      switch (streamElement.getAttribute("action")) {
        case "show-scores":
          this.#showScores();
          break;
        case "hide-scores":
          this.#hideScores();
          break;
        default:
          fallbackToDefaultActions(streamElement);
      }
    };
  };

  #hideScores() {
    this.scorelistTarget.classList.add(this.hiddenScorelistClass);
    for (const element of this.pointsTargets) {
      element.parentElement?.classList.remove(this.animationClass);
    }
  }

  #showScores() {
    const pointsElements = this.pointsTargets
      .map((element) => {
        const points = Number.parseInt(element.getAttribute("data-points") || "-10000", 10);
        return { element, points };
      })
      .filter(({ points }) => points >= 0);

    pointsElements.sort((a, b) => b.points - a.points);

    for (const { element } of pointsElements) {
      element.classList.add(this.scoreHiddenClass);
    }

    this.scorelistTarget.classList.remove(this.hiddenScorelistClass);

    for (const [index, { element }] of pointsElements.entries()) {
      setTimeout(() => {
        element.classList.remove(this.scoreHiddenClass);
        element.parentElement?.classList.add(this.animationClass);
      }, index * 800);
    }
  }
}
