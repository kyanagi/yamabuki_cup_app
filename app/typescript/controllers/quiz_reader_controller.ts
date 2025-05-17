import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";

type VoiceStatus = "STANDBY" | "PLAYING" | "PAUSED";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;
const audioContext = new AudioContext();
const audioCache = new Map<string, AudioBuffer>();

async function loadAudio(url: string): Promise<AudioBuffer> {
  //await new Promise((resolve) => setTimeout(resolve, 1000)); // DEBUG
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

type QuestionReadingContext = {
  start(): void;
  stop(): void;
};

function createQuestionReadingContext(soundId: string): QuestionReadingContext {
  let currentSource: AudioBufferSourceNode | undefined;
  const abortController = new AbortController();

  function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      abortController.signal.addEventListener("abort", reject);
      currentSource = audioContext.createBufferSource();
      currentSource.buffer = audioBuffer;
      currentSource.connect(audioContext.destination);
      // note: onended は stop() が呼ばれたときも呼ばれる
      currentSource.onended = () => {
        resolve();
      };
      currentSource.start();
    });
  }

  return {
    async start() {
      let mondaiAudioBuffer = audioCache.get("mondai");
      if (!mondaiAudioBuffer) {
        const audioUrl = "/sample/mondai.wav";
        mondaiAudioBuffer = await loadAudio(audioUrl);
        audioCache.set("mondai", mondaiAudioBuffer);
      }

      let audioBuffer = audioCache.get(soundId);
      if (!audioBuffer) {
        const audioUrl = "/sample/question.wav"; // TODO
        audioBuffer = await loadAudio(audioUrl);
        audioCache.set(soundId, audioBuffer);
      }

      try {
        await playAudioBuffer(mondaiAudioBuffer);
        await new Promise((resolve, reject) => {
          abortController.signal.addEventListener("abort", reject);
          setTimeout(resolve, INTERVAL_AFTER_MONDAI_MS);
        });
        await playAudioBuffer(audioBuffer);
      } catch (e) {
        if (e instanceof Error) {
          console.error(e);
        }
      }
    },
    stop() {
      if (currentSource) {
        currentSource.stop();
        currentSource = undefined;
      }
      abortController.abort();
    },
  };
}

export default class extends Controller {
  static targets = ["isOnAir", "onAirLabel"];

  declare isOnAirTarget: HTMLInputElement;
  declare onAirLabelTarget: HTMLElement;

  voiceStatus: VoiceStatus = "STANDBY";
  readingContext: QuestionReadingContext = createQuestionReadingContext("");

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
    if (this.voiceStatus !== "STANDBY") return;

    console.log("startReading");
    this.voiceStatus = "PLAYING";
    this.readingContext.start();
    console.log("startReading done");
  }

  pauseReading() {
    if (this.voiceStatus !== "PLAYING") return;

    console.log("pauseReading");
    this.voiceStatus = "PAUSED";

    this.readingContext.stop();
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
