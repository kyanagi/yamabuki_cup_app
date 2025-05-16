import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";

type VoiceStatus = "STOP" | "PLAYING";

export default class extends Controller {
  static targets = ["isOnAir", "onAirLabel"];

  declare isOnAirTarget: HTMLInputElement;
  declare onAirLabelTarget: HTMLElement;

  voiceStatus: VoiceStatus = "STOP";

  connect() {
    console.log("QuizReaderController connected");
  }

  updateOnAirLabel() {
    if (this.isOnAirTarget.checked) {
      this.onAirLabelTarget.textContent = "問い読みON";
    } else {
      this.onAirLabelTarget.textContent = "問い読みOFF";
    }
  }

  startReading() {
    if (!this.isOnAirTarget.checked) return;
    if (this.voiceStatus !== "STOP") return;

    console.log("startReading");
    this.voiceStatus = "PLAYING";
  }

  stopReading() {
    if (this.voiceStatus !== "PLAYING") return;

    console.log("stopReading");
    this.voiceStatus = "STOP";
  }

  async switchToQuestion() {
    const questionId = prompt("問題番号を入力してください");
    if (!questionId) return;

    try {
      const response = await fetch("/admin/quiz_reader/next_question", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({ question_id: questionId }),
      });

      if (!response.ok) {
        throw new Error("更新に失敗しました");
      }

      Turbo.visit("/admin/quiz_reader");
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
    }
  }
}
