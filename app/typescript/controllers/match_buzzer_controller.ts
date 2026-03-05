/**
 * 試合画面で早押し機の入力を受け取り、正誤入力モーダルを開くコントローラ。
 *
 * - BuzzerChannel（BroadcastChannel）を通じて他タブからの button_pressed / correct / wrong シグナルを受信する
 * - 早押し機連動スイッチが ON のときのみ反応する
 * - button_pressed: 対応する座席の行のモーダルを開く（既にモーダルが開いている場合は無視）
 * - correct / wrong: 開放中のモーダルに「正解を送信」/「誤答を送信」ボタンを表示する
 * - reset: ハードウェアリセットを意味し、判定取り消しではないため無視する
 */
import { Controller } from "@hotwired/stimulus";
import type { BuzzerChannel } from "../lib/buzzer/channel";
import { createBuzzerChannel } from "../lib/buzzer/channel";
import { isSeatId } from "../lib/buzzer/seat_id";
import type { BuzzerSignal } from "../lib/buzzer/signal";

export default class extends Controller {
  static targets = ["switch"];
  declare switchTarget: HTMLInputElement;
  declare readonly hasSwitchTarget: boolean;

  #channel: BuzzerChannel | null = null;

  connect(): void {
    this.#channel = createBuzzerChannel();
    this.#channel.onMessage((signal) => this.#handleSignal(signal));
  }

  disconnect(): void {
    this.#channel?.close();
    this.#channel = null;
  }

  /** ERBの data-action から呼ばれる（モーダルの手動開閉時に送信ボタンをリセット） */
  resetBuzzerButtons(): void {
    this.#resetBuzzerButtons();
  }

  /** 「正解を送信」/「誤答を送信」ボタンのクリック時、対応するフォームの submit ボタンをクリックする */
  submitBuzzerResult(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const result = button.dataset["buzzerResult"];
    const modal = button.closest<HTMLElement>(".modal");
    modal?.querySelector<HTMLButtonElement>(`[data-buzzer-submit='${result}']`)?.click();
  }

  #handleSignal(signal: BuzzerSignal): void {
    if (!this.hasSwitchTarget || !this.switchTarget.checked) return;

    switch (signal.type) {
      case "button_pressed": {
        // 境界防御: 不正な payload は無視する
        if (!isSeatId(signal.seat)) return;
        // 既にモーダルが開いていたら何もしない
        if (this.element.querySelector(".modal.is-active")) return;
        // 新しいモーダルを開く前に送信ボタンをリセット
        this.#resetBuzzerButtons();
        const row = this.element.querySelector<HTMLElement>(`[data-seat="${signal.seat}"]`);
        row?.querySelector(".modal")?.classList.add("is-active");
        break;
      }
      case "correct": {
        const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
        if (!modal) return;
        modal.querySelector<HTMLElement>("[data-buzzer-result='correct']")?.classList.remove("is-hidden");
        modal.querySelector<HTMLElement>("[data-buzzer-result='wrong']")?.classList.add("is-hidden");
        break;
      }
      case "wrong": {
        const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
        if (!modal) return;
        modal.querySelector<HTMLElement>("[data-buzzer-result='wrong']")?.classList.remove("is-hidden");
        modal.querySelector<HTMLElement>("[data-buzzer-result='correct']")?.classList.add("is-hidden");
        break;
      }
      case "commit": {
        const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
        if (!modal) return;
        const visibleButton = modal.querySelector<HTMLElement>("[data-buzzer-result]:not(.is-hidden)");
        visibleButton?.click();
        break;
      }
      // reset はハードウェアリセットを意味し、判定取り消しではないため無視する
      default:
        break;
    }
  }

  #resetBuzzerButtons(): void {
    this.element.querySelectorAll<HTMLElement>("[data-buzzer-result]").forEach((btn) => {
      btn.classList.add("is-hidden");
    });
  }
}
