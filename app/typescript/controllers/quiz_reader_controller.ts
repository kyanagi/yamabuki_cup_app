import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";

type VoiceStatus = "STANDBY" | "PLAYING" | "PAUSED";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;
const audioContext = new AudioContext();
const audioCache = new Map<string, AudioBuffer>();

async function loadAudio(url: string): Promise<AudioBuffer> {
  // await new Promise((resolve) => setTimeout(resolve, 1000)); // DEBUG
  console.log(`loadAudio: ${url}`);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

type QuestionReadingContext = {
  load(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  get totalDuration(): number;
  get readDuration(): number;
  get voiceStatus(): VoiceStatus;
};

function createQuestionReadingContext(soundId: string): QuestionReadingContext {
  let voiceStatus: VoiceStatus = "STANDBY";
  let currentSource: AudioBufferSourceNode | undefined;
  let startTime: number | undefined;
  let stopTime: number | undefined;
  let questionDuration: number | undefined;
  let audioBuffersPromise: Promise<[AudioBuffer, AudioBuffer]> | undefined;
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
    async load() {
      if (audioBuffersPromise) return;

      const createAudioBufferPromise = (url: string, cacheKey: string) => {
        return new Promise<AudioBuffer>((resolve) => {
          const buf = audioCache.get(cacheKey);
          if (buf) {
            console.log(`Use cached audio: ${cacheKey}`);
            resolve(buf);
          } else {
            loadAudio(url).then((buffer) => {
              audioCache.set(cacheKey, buffer);
              resolve(buffer);
            });
          }
        });
      };

      const mondaiAudioBufferPromise = createAudioBufferPromise("/sample/mondai.wav", "mondai");
      const questionAudioBufferPromise = createAudioBufferPromise(`/sample/question${soundId}.wav`, soundId);

      audioBuffersPromise = Promise.all([mondaiAudioBufferPromise, questionAudioBufferPromise]);
    },

    async start() {
      voiceStatus = "PLAYING";
      this.load();
      if (!audioBuffersPromise) return;
      const [mondaiAudioBuffer, questionAudioBuffer] = await audioBuffersPromise;

      questionDuration = questionAudioBuffer.duration;

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
        await playAudioBuffer(questionAudioBuffer);
      } catch (e) {
        if (e instanceof Error) {
          console.error(e);
        }
      }
    },

    stop() {
      voiceStatus = "PAUSED";
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
    get voiceStatus() {
      return voiceStatus;
    },
  };
}

export default class extends Controller {
  static targets = ["isOnAir", "onAirLabel", "duration"];
  static values = {
    soundId: String,
  };

  declare isOnAirTarget: HTMLInputElement;
  declare onAirLabelTarget: HTMLElement;
  declare durationTarget: HTMLElement;
  declare soundIdValue: string;

  readingContext: QuestionReadingContext = createQuestionReadingContext("dummy");

  private beforeStreamRenderHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    const fallbackToDefaultActions = customEvent.detail.render;
    customEvent.detail.render = (streamElement: HTMLElement) => {
      if (streamElement.getAttribute("action") === "update-sound-id") {
        const soundId = streamElement.getAttribute("sound-id");
        console.log(soundId);
        if (!soundId) {
          throw new Error("sound-id が指定されていません。");
        }
        this.readingContext = createQuestionReadingContext(soundId);
        this.readingContext.load();
      } else {
        fallbackToDefaultActions(streamElement);
      }
    };
  };

  connect() {
    console.log("QuizReaderController connected");
    document.addEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
    this.readingContext = createQuestionReadingContext(this.soundIdValue);
    this.readingContext.load();
  }

  disconnect() {
    this.readingContext.stop();
    document.removeEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
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
    if (this.readingContext.voiceStatus !== "STANDBY") return;

    console.log("startReading");
    this.readingContext.start();
  }

  pauseReading() {
    if (this.readingContext.voiceStatus !== "PLAYING") return;

    console.log("pauseReading");

    this.readingContext.stop();
    this.durationTarget.textContent = this.durationText;
  }

  async switchToQuestion() {
    const questionId = prompt("問題番号を入力してください");
    if (!questionId) return;

    this.proceedToQuestion(questionId);
  }

  async proceedToNextQuestion(event: KeyboardEvent) {
    if (event.repeat) return;
    if (this.readingContext.voiceStatus === "PAUSED") {
      this.proceedToQuestion("next");
    }
  }

  async proceedToQuestion(questionId: string) {
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

  private get durationText(): string {
    return `${this.readingContext.readDuration.toFixed(2)} / ${this.readingContext.totalDuration.toFixed(2)}`;
  }
}
