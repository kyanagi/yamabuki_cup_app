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
  get totalDuration(): number;
  get readDuration(): number;
};

function createQuestionReadingContext(soundId: string): QuestionReadingContext {
  let currentSource: AudioBufferSourceNode | undefined;
  let startTime: number | undefined;
  let stopTime: number | undefined;
  let questionDuration: number | undefined;
  const abortController = new AbortController();

  function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        reject();
      };
      abortController.signal.addEventListener("abort", abortHandler);
      currentSource = audioContext.createBufferSource();
      currentSource.buffer = audioBuffer;
      currentSource.connect(audioContext.destination);
      // note: onended は stop() が呼ばれたときも呼ばれるが、
      // stop() の呼び出し元の処理が終わってからでないと onended は呼ばれない。
      currentSource.onended = () => {
        abortController.signal.removeEventListener("abort", abortHandler);
        if (stopTime === undefined) {
          stopTime = audioContext.currentTime;
        }
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
      questionDuration = audioBuffer.duration;

      try {
        await playAudioBuffer(mondaiAudioBuffer);
        await new Promise<void>((resolve, reject) => {
          const abortHandler = () => reject();
          abortController.signal.addEventListener("abort", abortHandler);
          setTimeout(() => {
            abortController.signal.removeEventListener("abort", abortHandler);
            resolve();
          }, INTERVAL_AFTER_MONDAI_MS);
        });
        startTime = audioContext.currentTime;
        stopTime = undefined;
        await playAudioBuffer(audioBuffer);
      } catch (e) {
        if (e instanceof Error) {
          console.error(e);
        }
      }
    },
    stop() {
      if (currentSource) {
        if (stopTime === undefined) {
          stopTime = audioContext.currentTime;
        }
        currentSource.stop();
        currentSource.disconnect();
        currentSource = undefined;
      }
      abortController.abort();
    },
    get totalDuration() {
      return questionDuration ?? 0;
    },
    get readDuration() {
      if (!startTime || !stopTime) return 0;
      const d = stopTime - startTime;
      return d > this.totalDuration ? this.totalDuration : d;
    },
  };
}

async function proceedToQuestion(questionId: string) {
  try {
    const response = await fetch("/admin/quiz_reader/next_question", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        Accept: "text/vnd.turbo-stream.html",
      },
      body: JSON.stringify({ question_id: questionId }),
    });

    if (!response.ok) {
      throw new Error("エラーが発生しました。");
    }

    const html = await response.text();
    Turbo.renderStreamMessage(html);
  } catch (e) {
    if (e instanceof Error) {
      alert(`エラーが発生しました: ${e.message}`);
    }
  }
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

  disconnect() {
    this.readingContext.stop();
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
    console.log(`${this.readingContext.readDuration} / ${this.readingContext.totalDuration}`);
  }

  async switchToQuestion() {
    const questionId = prompt("問題番号を入力してください");
    if (!questionId) return;

    proceedToQuestion(questionId);
  }

  async proceedToNextQuestion(event: KeyboardEvent) {
    if (event.repeat) return;

    proceedToQuestion("next");
  }
}
