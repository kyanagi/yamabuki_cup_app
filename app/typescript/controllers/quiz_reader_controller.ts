import { Controller } from "@hotwired/stimulus";

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
}
