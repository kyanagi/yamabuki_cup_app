/**
 * 実機なしで早押し機の動作を再現するエミュレータコントローラ。
 *
 * - 画面上のボタン操作を BUZZER_EMULATOR_* カスタムイベントに変換して window へ送出する
 * - ボタン押下・正解・誤答・リセットの各操作に対応する
 * - 最終操作を lastPressed ターゲットに表示する
 */
import { Controller } from "@hotwired/stimulus";
import { createButtonId, type ButtonId } from "../lib/buzzer/button_id";
import {
  BUZZER_EMULATOR_BUTTON_PRESS_EVENT,
  BUZZER_EMULATOR_CORRECT_EVENT,
  BUZZER_EMULATOR_WRONG_EVENT,
  BUZZER_EMULATOR_RESET_EVENT,
} from "../lib/buzzer/events";

export default class extends Controller {
  static targets = ["lastPressed"];

  declare lastPressedTarget: HTMLElement;

  connect(): void {
    window.addEventListener(BUZZER_EMULATOR_BUTTON_PRESS_EVENT, this.#buttonPressHandler as EventListener);
  }

  disconnect(): void {
    window.removeEventListener(BUZZER_EMULATOR_BUTTON_PRESS_EVENT, this.#buttonPressHandler as EventListener);
  }

  pressButton(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const buttonIdText = button?.getAttribute("data-button-id");
    const buttonId = createButtonId(Number.parseInt(buttonIdText || "", 10));
    if (buttonId === null) return;

    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_BUTTON_PRESS_EVENT, { detail: { buttonId } }));
  }

  reset(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_RESET_EVENT));
    this.lastPressedTarget.textContent = "リセット";
  }

  correct(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_CORRECT_EVENT));
    this.lastPressedTarget.textContent = "正解";
  }

  wrong(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_WRONG_EVENT));
    this.lastPressedTarget.textContent = "誤答";
  }

  #buttonPressHandler = (event: CustomEvent<{ buttonId: ButtonId }>): void => {
    this.lastPressedTarget.textContent = String(event.detail.buttonId);
  };
}
