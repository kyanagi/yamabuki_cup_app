import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;
// キャッシュの名前
const CACHE_NAME = "yamabuki-cup-quiz-reader";

type VoiceStatus = "STANDBY" | "PLAYING" | "PAUSED";
type LoadingStatus = "NOT_LOADED" | "LOADING" | "LOADED";

const audioContext = new AudioContext();

async function loadAudio(url: string): Promise<AudioBuffer> {
  // await new Promise((resolve) => setTimeout(resolve, 1000)); // DEBUG

  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(url);

  if (response) {
    console.log(`Use cached audio: ${url}`);
  } else {
    response = await fetch(url);
    console.log(`fetch: ${url}`);
    await cache.put(url, response.clone());
  }

  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

type QuestionReadingContext = {
  load(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  reset(): void;
  get questionId(): number;
  get totalDuration(): number;
  get readDuration(): number;
  get voiceStatus(): VoiceStatus;
  set loadingStatus(s: LoadingStatus);
};

function createQuestionReadingContext(
  questionId: number,
  soundId: string,
  onLoadingStatusChanged?: (s: LoadingStatus) => void,
  onVoiceStatusChanged?: (s: VoiceStatus) => void,
): QuestionReadingContext {
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
      abortController.signal.addEventListener("abort", abortHandler, { once: true });
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

  function setVoiceStatus(s: VoiceStatus) {
    voiceStatus = s;
    onVoiceStatusChanged?.(s);
  }

  setVoiceStatus(voiceStatus);

  return {
    async load() {
      if (audioBuffersPromise) return;

      this.loadingStatus = "LOADING";

      const createAudioBufferPromise = (url: string) => {
        return new Promise<AudioBuffer>((resolve, reject) => {
          const abortHandler = () => reject();
          abortController.signal.addEventListener("abort", abortHandler, { once: true });
          loadAudio(url).then((buffer) => {
            abortController.signal.removeEventListener("abort", abortHandler);
            resolve(buffer);
          });
        });
      };

      try {
        const mondaiAudioBufferPromise = createAudioBufferPromise("/sample/mondai.wav");
        const questionAudioBufferPromise = createAudioBufferPromise(`/sample/question${soundId}.wav`);
        audioBuffersPromise = Promise.all([mondaiAudioBufferPromise, questionAudioBufferPromise]);
        questionDuration = (await audioBuffersPromise)[1].duration;
        this.loadingStatus = "LOADED";
      } catch (e) {
        if (e instanceof Error) {
          console.error(e);
        }
        this.loadingStatus = "NOT_LOADED";
      }
    },

    async start() {
      try {
        setVoiceStatus("PLAYING");
        this.load();

        // load() を呼んでいるので audioBuffersPromise が undefined になることはないが、型ガードのため必要
        if (!audioBuffersPromise) return;

        const [mondaiAudioBuffer, questionAudioBuffer] = await audioBuffersPromise;

        await playAudioBuffer(mondaiAudioBuffer);

        // 「問題」と問題文の間の空白
        await new Promise<void>((resolve, reject) => {
          const abortHandler = () => reject();
          abortController.signal.addEventListener("abort", abortHandler, { once: true });
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
      setVoiceStatus("PAUSED");
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

    reset() {
      this.stop();
      startTime = undefined;
      stopTime = undefined;
      setVoiceStatus("STANDBY");
    },

    get questionId() {
      return questionId;
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
    set loadingStatus(s: LoadingStatus) {
      onLoadingStatusChanged?.(s);
    },
  };
}

type ResultUploadingStatus = "NOT_UPLOADING" | "UPLOADING" | "UPLOADED" | "UPLOAD_ERROR";

export default class extends Controller {
  static targets = [
    "isOnAir",
    "onAirLabel",
    "duration",
    "voiceLoadingStatusIcon",
    "playStatusIcon",
    "voiceLoadingIcon",
    "voiceLoadedIcon",
    "stopIcon",
    "playIcon",
    "pauseIcon",
    "resultUploadingStatusIcon",
    "resultUploadingIcon",
    "resultUploadedIcon",
  ];
  static values = {
    questionId: Number,
    soundId: String,
  };

  declare isOnAirTarget: HTMLInputElement;
  declare onAirLabelTarget: HTMLElement;
  declare durationTarget: HTMLElement;
  declare voiceLoadingStatusIconTargets: HTMLElement[];
  declare playStatusIconTargets: HTMLElement[];
  declare voiceLoadingIconTarget: HTMLElement;
  declare voiceLoadedIconTarget: HTMLElement;
  declare stopIconTarget: HTMLElement;
  declare playIconTarget: HTMLElement;
  declare pauseIconTarget: HTMLElement;
  declare resultUploadingStatusIconTargets: HTMLElement[];
  declare resultUploadingIconTarget: HTMLElement;
  declare resultUploadedIconTarget: HTMLElement;
  declare questionIdValue: number;
  declare soundIdValue: string;

  readingContext: QuestionReadingContext = createQuestionReadingContext(0, "dummy");

  private createQuestionReadingContextAndLoad(questionId: number, soundId: string) {
    const onLoaddingStatusChanged = (loadingStatus: LoadingStatus) => {
      switch (loadingStatus) {
        case "LOADING":
          this.setVoiceLoadingStatusIcon(this.voiceLoadingIconTarget);
          break;
        case "LOADED":
          console.log(`load done: duration=${this.readingContext.totalDuration}`);
          this.setVoiceLoadingStatusIcon(this.voiceLoadedIconTarget);
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      switch (voiceStatus) {
        case "STANDBY":
          this.setPlayStatusIcon(this.stopIconTarget);
          break;
        case "PLAYING":
          this.setPlayStatusIcon(this.playIconTarget);
          break;
        case "PAUSED":
          this.setPlayStatusIcon(this.pauseIconTarget);
          break;
      }
    };
    this.readingContext = createQuestionReadingContext(questionId, soundId, onLoaddingStatusChanged, onVoiceStatusChanged);
    this.load();
  }

  private beforeStreamRenderHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    const fallbackToDefaultActions = customEvent.detail.render;
    customEvent.detail.render = (streamElement: HTMLElement) => {
      if (streamElement.getAttribute("action") === "update-question") {
        const questionId = streamElement.getAttribute("question-id");
        const soundId = streamElement.getAttribute("sound-id");
        if (!questionId) {
          throw new Error("question-id が指定されていません。");
        }
        if (!soundId) {
          throw new Error("sound-id が指定されていません。");
        }
        this.createQuestionReadingContextAndLoad(Number(questionId), soundId);
      } else {
        fallbackToDefaultActions(streamElement);
      }
    };
  };

  connect() {
    console.log("QuizReaderController connected");
    caches.delete(CACHE_NAME);
    document.addEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
    this.createQuestionReadingContextAndLoad(this.questionIdValue, this.soundIdValue);
  }

  disconnect() {
    console.log("QuizReaderController disconnected");
    this.readingContext.stop();
    document.removeEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
    caches.delete(CACHE_NAME);
  }

  updateOnAirLabel() {
    if (this.isOnAirTarget.checked) {
      this.onAirLabelTarget.textContent = "問い読みON";
    } else {
      this.onAirLabelTarget.textContent = "問い読みOFF";
    }
  }

  private setVoiceLoadingStatusIcon(selectedIcon: HTMLElement) {
    for (const icon of this.voiceLoadingStatusIconTargets) {
      icon.classList.add("is-hidden");
    }
    selectedIcon.classList.remove("is-hidden");
  }

  private setPlayStatusIcon(selectedIcon: HTMLElement) {
    for (const icon of this.playStatusIconTargets) {
      icon.classList.add("is-hidden");
    }
    selectedIcon.classList.remove("is-hidden");
  }

  private setResultUploadingStatusIcon(status: ResultUploadingStatus) {
    for (const icon of this.resultUploadingStatusIconTargets) {
      icon.classList.add("is-hidden");
    }
    switch (status) {
      case "NOT_UPLOADING":
        break;
      case "UPLOADING":
        this.resultUploadingIconTarget.classList.remove("is-hidden");
        break;
      case "UPLOADED":
        this.resultUploadedIconTarget.classList.remove("is-hidden");
        break;
      case "UPLOAD_ERROR":
        break;
    }
  }

  private load() {
    this.readingContext.load();
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
    this.uploadQuestionReading();
  }

  resetReading() {
    if (this.readingContext.voiceStatus !== "PAUSED") return;

    console.log("resetReading");
    this.readingContext.reset();
    this.durationTarget.textContent = "";
    this.setResultUploadingStatusIcon("NOT_UPLOADING");
  }

  async switchToQuestion() {
    const questionIdRaw = prompt("問題番号を入力してください");
    if (questionIdRaw == null) return;

    const questionId = questionIdRaw.trim();

    if (!/^\d+$/.test(questionId)) {
      alert("問題番号は数字で入力してください");
      return;
    }

    this.proceedToQuestion(questionId);
  }

  async proceedToNextQuestion(event: KeyboardEvent) {
    if (event.repeat) return;
    if (this.readingContext.voiceStatus === "PAUSED") {
      this.proceedToQuestion("next");
    }
  }

  private async proceedToQuestion(questionId: string) {
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
        throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      Turbo.renderStreamMessage(html);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        alert(`エラーが発生しました: ${e.message}`);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  }

  private async uploadQuestionReading() {
    this.setResultUploadingStatusIcon("UPLOADING");

    try {
      // TODO: エラー時のリトライ
      const response = await fetch("/admin/quiz_reader/question_readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({ question_id: this.readingContext.questionId, duration: this.readingContext.readDuration }),
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
      }

      await response.json();

      this.setResultUploadingStatusIcon("UPLOADED");
    } catch (e) {
      console.error(e);
    }
  }

  private get durationText(): string {
    return `${this.readingContext.readDuration.toFixed(2)} / ${this.readingContext.totalDuration.toFixed(2)}`;
  }
}
