import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";
import { openDB } from "idb";
import { fetchWithRetry } from "../lib/fetch_with_retry";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;
// キャッシュの名前
const CACHE_NAME = "yamabuki-cup-quiz-reader";
// IndexedDB の名前
const IDB_NAME = "yamabuki-cup-quiz-reader";

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
  dispose(): void;
  get questionId(): number;
  get fullDuration(): number;
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
  let abortController = new AbortController();

  function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        reject();
      };
      abortController.signal.addEventListener("abort", abortHandler, {
        once: true,
      });
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
          abortController.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
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
      if (this.voiceStatus !== "STANDBY") return;

      try {
        setVoiceStatus("PLAYING");
        await this.load();

        // load() を呼んでいるので audioBuffersPromise が undefined になることはないが、型ガードのため必要
        if (!audioBuffersPromise) {
          setVoiceStatus("STANDBY");
          return;
        }

        const [mondaiAudioBuffer, questionAudioBuffer] = await audioBuffersPromise;

        await playAudioBuffer(mondaiAudioBuffer);

        // 「問題」と問題文の間の空白
        await new Promise<void>((resolve, reject) => {
          const abortHandler = () => reject();
          abortController.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
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
          setVoiceStatus("STANDBY");
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
      abortController = new AbortController();
      startTime = undefined;
      stopTime = undefined;
      setVoiceStatus("STANDBY");
    },

    dispose() {
      this.stop();
      audioBuffersPromise = undefined;
    },

    get questionId() {
      return questionId;
    },
    get fullDuration() {
      return questionDuration ?? 0;
    },
    get readDuration() {
      if (!startTime || !stopTime) return 0;
      const d = stopTime - startTime;
      return d > this.fullDuration ? this.fullDuration : d;
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
    "resultUploadErrorIcon",
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
  declare resultUploadErrorIconTarget: HTMLElement;
  declare questionIdValue: number;
  declare soundIdValue: string;

  private idbPromise = openDB(IDB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("question-readings", {
        keyPath: "id",
        autoIncrement: true,
      });
    },
  });

  readingContext: QuestionReadingContext = createQuestionReadingContext(0, "dummy");

  private createQuestionReadingContextAndLoad(questionId: number, soundId: string) {
    const onLoadingStatusChanged = (loadingStatus: LoadingStatus) => {
      switch (loadingStatus) {
        case "LOADING":
          this.setVoiceLoadingStatusIcon("LOADING");
          break;
        case "LOADED":
          console.log(`load done: duration=${this.readingContext.fullDuration}`);
          this.setVoiceLoadingStatusIcon("LOADED");
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      this.setPlayStatusIcon(voiceStatus);
    };

    this.readingContext.dispose();
    this.readingContext = createQuestionReadingContext(
      questionId,
      soundId,
      onLoadingStatusChanged,
      onVoiceStatusChanged,
    );
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
    this.readingContext.dispose();
    document.removeEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
    caches.delete(CACHE_NAME);

    if (audioContext.state !== "closed") {
      audioContext.close();
    }
  }

  updateOnAirLabel() {
    if (this.isOnAirTarget.checked) {
      this.onAirLabelTarget.textContent = "問い読みON";
    } else {
      this.onAirLabelTarget.textContent = "問い読みOFF";
    }
  }

  private setVoiceLoadingStatusIcon(status: LoadingStatus) {
    for (const icon of this.voiceLoadingStatusIconTargets) {
      icon.classList.add("is-hidden");
    }
    switch (status) {
      case "LOADING":
        this.voiceLoadingIconTarget.classList.remove("is-hidden");
        break;
      case "LOADED":
        this.voiceLoadedIconTarget.classList.remove("is-hidden");
        break;
    }
  }

  private setPlayStatusIcon(status: VoiceStatus) {
    for (const icon of this.playStatusIconTargets) {
      icon.classList.add("is-hidden");
    }
    switch (status) {
      case "STANDBY":
        this.stopIconTarget.classList.remove("is-hidden");
        break;
      case "PLAYING":
        this.playIconTarget.classList.remove("is-hidden");
        break;
      case "PAUSED":
        this.pauseIconTarget.classList.remove("is-hidden");
        break;
    }
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
        this.resultUploadErrorIconTarget.classList.remove("is-hidden");
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
    this.saveQuestionReading();
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

  private async saveQuestionReading() {
    const data = {
      questionId: this.readingContext.questionId,
      readDuration: this.readingContext.readDuration,
      timestamp: new Date().toISOString(),
    };

    try {
      const db = await this.idbPromise;
      await db.add("question-readings", data);
    } catch (e) {
      console.error("問い読みの結果の保存に失敗しました:", e);
      throw e;
    }
  }

  private async uploadQuestionReading() {
    this.setResultUploadingStatusIcon("UPLOADING");
    const data = {
      question_id: this.readingContext.questionId,
      read_duration: this.readingContext.readDuration,
      full_duration: this.readingContext.fullDuration,
    };

    try {
      const response = await fetchWithRetry("/admin/quiz_reader/question_readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
      }

      await response.json();

      this.setResultUploadingStatusIcon("UPLOADED");
    } catch (e) {
      console.error(e);
      this.setResultUploadingStatusIcon("UPLOAD_ERROR");
    }
  }

  private get durationText(): string {
    return `${this.readingContext.readDuration.toFixed(2)} / ${this.readingContext.fullDuration.toFixed(2)}`;
  }
}
