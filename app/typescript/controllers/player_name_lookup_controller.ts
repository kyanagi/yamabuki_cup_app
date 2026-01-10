import { Controller } from "@hotwired/stimulus";

export default class PlayerNameLookupController extends Controller {
  static targets = ["playerId", "playerName"];

  declare playerIdTarget: HTMLInputElement;
  declare playerNameTarget: HTMLElement;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  lookup() {
    // デバウンス: 300ms待機
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.performLookup(), 300);
  }

  private async performLookup() {
    const playerId = this.playerIdTarget.value;
    if (!playerId) {
      this.playerNameTarget.textContent = "";
      return;
    }

    // 前のリクエストをキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // リクエスト時のIDを保持（レスポンス後の検証用）
    const requestedId = playerId;

    try {
      const response = await fetch(`/admin/round1/players/${playerId}`, {
        credentials: "same-origin",
        signal: this.abortController.signal,
      });

      // レスポンス受信時に入力値が変わっていたら更新しない
      if (this.playerIdTarget.value !== requestedId) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        this.playerNameTarget.textContent = data.name || "（不明）";
      } else {
        this.playerNameTarget.textContent = "（不明）";
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        this.playerNameTarget.textContent = "（エラー）";
      }
    }
  }

  disconnect() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.abortController) this.abortController.abort();
  }
}
