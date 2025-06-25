import { Controller } from "@hotwired/stimulus";

// 現在時刻を表示するコントローラー
export default class extends Controller {
  static targets = ["clock"];
  declare clockTarget: HTMLElement;

  #timerId: number | undefined;

  connect() {
    console.log("ClockController connected");
    this.updateDisplay();
    this.start();
  }

  disconnect() {
    console.log("ClockController disconnected");
    this.stop();
  }

  private start() {
    if (this.#timerId !== undefined) {
      return;
    }

    // 1秒ごとに現在時刻を更新
    this.#timerId = window.setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  private stop() {
    if (this.#timerId === undefined) {
      return;
    }

    window.clearInterval(this.#timerId);
    this.#timerId = undefined;
  }

  private updateDisplay() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    this.clockTarget.textContent = `${hours}:${minutes}:${seconds}`;
  }
}
