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
  static targets = ["scorelist"];
  static classes = ["hidden"];

  declare scorelistTarget: HTMLElement;
  declare hiddenClass: string;

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

  #showScores() {
    this.scorelistTarget.classList.remove(this.hiddenClass);
  }

  #hideScores() {
    this.scorelistTarget.classList.add(this.hiddenClass);
  }
}
