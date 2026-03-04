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
    if (typeof BroadcastChannel === "undefined") return;
    this.#channel = createBuzzerChannel();
    this.#channel.onMessage((signal) => this.#handleSignal(signal));
  }

  disconnect(): void {
    this.#channel?.close();
    this.#channel = null;
  }

  #handleSignal(signal: BuzzerSignal): void {
    if (!this.hasSwitchTarget || !this.switchTarget.checked) return;
    if (signal.type !== "button_pressed") return;
    // 境界防御: 不正な payload は無視する
    if (!isSeatId(signal.seat)) return;
    // 既にモーダルが開いていたら何もしない
    if (this.element.querySelector(".modal.is-active")) return;
    // 対応する seat の行を探してモーダルを開く
    const seat = signal.seat;
    const row = this.element.querySelector<HTMLElement>(`[data-seat="${seat}"]`);
    row?.querySelector(".modal")?.classList.add("is-active");
  }
}
