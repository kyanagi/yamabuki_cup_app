import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";
import { openDB } from "idb";
import { fetchWithRetry } from "../lib/fetch_with_retry";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;
// IndexedDB の名前
const IDB_NAME = "yamabuki-cup-quiz-reader";

// ファイルが見つからない場合のカスタムエラー
class FileNotFoundError extends Error {
  constructor(public filename: string) {
    super(`File not found: ${filename}`);
    this.name = "FileNotFoundError";
  }
}

// テスト用にexport
export type VoiceStatus = "STANDBY" | "PLAYING" | "PAUSED";
export type LoadingStatus = "NOT_LOADED" | "LOADING" | "LOADED";

// テスト用にexport
export async function loadAudioFromLocalFile(
  filename: string,
  dirHandle: FileSystemDirectoryHandle,
  audioContext: AudioContext,
  signal: AbortSignal,
): Promise<AudioBuffer> {
  // AbortSignal をチェック
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  console.log(`Loaded local audio: ${filename}`);
  return await audioContext.decodeAudioData(arrayBuffer);
}

// テスト用にexport
export type QuestionReadingContext = {
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

// テスト用にexport
export function createQuestionReadingContext(
  questionId: number,
  soundId: string,
  audioContext: AudioContext,
  dirHandle: FileSystemDirectoryHandle,
  onLoadingStatusChanged?: (s: LoadingStatus) => void,
  onVoiceStatusChanged?: (s: VoiceStatus) => void,
  onFileNotFound?: (filename: string) => void,
): QuestionReadingContext {
  let voiceStatus: VoiceStatus = "STANDBY";
  let currentSource: AudioBufferSourceNode | undefined;
  let startTime: number | undefined;
  let stopTime: number | undefined;
  let questionDuration: number | undefined;
  let audioBuffersPromise: Promise<[AudioBuffer, AudioBuffer]> | undefined;
  let abortController = new AbortController();
  let loadFailed = false;

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

      const createAudioBufferPromise = (filename: string) => {
        return new Promise<AudioBuffer>((resolve, reject) => {
          const abortHandler = () => reject(new DOMException("Aborted", "AbortError"));
          abortController.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
          loadAudioFromLocalFile(filename, dirHandle, audioContext, abortController.signal)
            .then((buffer) => {
              resolve(buffer);
            })
            .catch((error) => {
              // NotFoundError をファイル名付きのカスタムエラーに変換
              if (error instanceof DOMException && error.name === "NotFoundError") {
                reject(new FileNotFoundError(filename));
              } else {
                reject(error);
              }
            })
            .finally(() => {
              abortController.signal.removeEventListener("abort", abortHandler);
            });
        });
      };

      const mondaiFilename = "mondai.wav";
      const questionFilename = `question${soundId}.wav`;

      try {
        const mondaiAudioBufferPromise = createAudioBufferPromise(mondaiFilename);
        const questionAudioBufferPromise = createAudioBufferPromise(questionFilename);
        audioBuffersPromise = Promise.all([mondaiAudioBufferPromise, questionAudioBufferPromise]);
        questionDuration = (await audioBuffersPromise)[1].duration;
        this.loadingStatus = "LOADED";
      } catch (e) {
        audioBuffersPromise = undefined;
        loadFailed = true;
        if (e instanceof FileNotFoundError) {
          onFileNotFound?.(e.filename);
        } else if (e instanceof Error) {
          console.error(e);
        }
        this.loadingStatus = "NOT_LOADED";
      }
    },

    async start() {
      if (this.voiceStatus !== "STANDBY") return;
      if (loadFailed) return;

      try {
        setVoiceStatus("PLAYING");
        await this.load();

        // load() でエラーが発生した場合、audioBuffersPromise は undefined のまま
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
      loadFailed = false;
      setVoiceStatus("STANDBY");
    },

    dispose() {
      this.stop();
      audioBuffersPromise = undefined;
      loadFailed = false;
    },

    get questionId() {
      return questionId;
    },
    get fullDuration() {
      return questionDuration ?? 0;
    },
    get readDuration() {
      if (startTime === undefined || stopTime === undefined) return 0;
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
    "isQuestionFollowOn",
    "questionFollowLabel",
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
    "folderStatus",
    "folderError",
  ];
  static values = {
    questionId: Number,
    soundId: String,
  };

  declare isOnAirTarget: HTMLInputElement;
  declare onAirLabelTarget: HTMLElement;
  declare isQuestionFollowOnTarget: HTMLInputElement;
  declare questionFollowLabelTarget: HTMLElement;
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
  declare folderStatusTarget: HTMLElement;
  declare folderErrorTarget: HTMLElement;
  declare questionIdValue: number;
  declare soundIdValue: string;

  private dirHandle: FileSystemDirectoryHandle | undefined;

  private idbPromise = openDB(IDB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("question-readings", {
        keyPath: "id",
        autoIncrement: true,
      });
    },
  });

  private audioContext: AudioContext | undefined;
  private readingContext: QuestionReadingContext | undefined;

  private createQuestionReadingContextAndLoad(questionId: number, soundId: string) {
    if (!this.audioContext) {
      throw new Error("AudioContext が初期化されていません");
    }
    if (!this.dirHandle) {
      // フォルダ未選択時は readingContext を作成しない
      return;
    }

    const onLoadingStatusChanged = (loadingStatus: LoadingStatus) => {
      switch (loadingStatus) {
        case "LOADING":
          this.setVoiceLoadingStatusIcon("LOADING");
          break;
        case "LOADED":
          console.log(`load done: duration=${this.readingContext?.fullDuration}`);
          this.setVoiceLoadingStatusIcon("LOADED");
          this.clearFolderError();
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      this.setPlayStatusIcon(voiceStatus);
    };
    const onFileNotFound = (filename: string) => {
      this.showFolderError(`音声ファイルが見つかりません（${filename}）`);
    };

    this.readingContext?.dispose();
    this.readingContext = createQuestionReadingContext(
      questionId,
      soundId,
      this.audioContext,
      this.dirHandle,
      onLoadingStatusChanged,
      onVoiceStatusChanged,
      onFileNotFound,
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
    this.audioContext = new AudioContext();
    document.addEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
  }

  disconnect() {
    console.log("QuizReaderController disconnected");
    this.readingContext?.dispose();
    this.readingContext = undefined;
    document.removeEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioContext = undefined;
    this.dirHandle = undefined;
  }

  updateOnAirLabel() {
    if (this.isOnAirTarget.checked) {
      this.onAirLabelTarget.textContent = "問い読みON";
    } else {
      this.onAirLabelTarget.textContent = "問い読みOFF";
    }
  }

  updateQuestionFollowLabel() {
    if (this.isQuestionFollowOnTarget.checked) {
      this.questionFollowLabelTarget.textContent = "問題フォローON";
    } else {
      this.questionFollowLabelTarget.textContent = "問題フォローOFF";
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

  private updateFolderStatusText(text: string, state: "default" | "success") {
    this.folderStatusTarget.classList.remove("has-text-grey", "has-text-success");
    this.folderStatusTarget.classList.add(state === "success" ? "has-text-success" : "has-text-grey");
    this.folderStatusTarget.textContent = text;
  }

  private showFolderError(message: string) {
    this.folderErrorTarget.textContent = message;
    this.folderErrorTarget.classList.remove("is-hidden");
  }

  private clearFolderError() {
    this.folderErrorTarget.textContent = "";
    this.folderErrorTarget.classList.add("is-hidden");
  }

  async selectFolder() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      this.dirHandle = dirHandle;
      this.clearFolderError();
      this.updateFolderStatusText(dirHandle.name, "success");
      // フォルダ選択後に音声を読み込む
      this.createQuestionReadingContextAndLoad(this.questionIdValue, this.soundIdValue);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // キャンセル時はエラーをクリアするが、folderStatus は既存の選択状態を維持
        this.clearFolderError();
        return;
      }
      this.showFolderError("フォルダの選択に失敗しました");
    }
  }

  private load() {
    this.readingContext?.load();
  }

  startReading() {
    if (!this.isOnAirTarget.checked) return;

    // フォルダ未選択チェックを先に行う
    if (!this.dirHandle) {
      this.updateFolderStatusText("選択してください", "default");
      this.showFolderError("再生するには音声フォルダの選択が必要です");
      return;
    }

    if (!this.readingContext) return;
    if (this.readingContext.voiceStatus !== "STANDBY") return;

    console.log("startReading");
    this.readingContext.start();
  }

  pauseReading() {
    if (!this.readingContext) return;
    if (this.readingContext.voiceStatus !== "PLAYING") return;

    console.log("pauseReading");
    this.readingContext.stop();
    this.durationTarget.textContent = this.durationText;
    this.saveQuestionReading();
    this.uploadQuestionReading();
  }

  resetReading() {
    if (!this.readingContext) return;
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
    if (this.readingContext?.voiceStatus === "PAUSED") {
      // 現在の問題IDを保持してから次の問題に進む
      const currentQuestionId = this.readingContext.questionId;

      // 問題フォローがONの場合のみ問題を送出
      if (this.isQuestionFollowOnTarget.checked) {
        await this.broadcastQuestion(currentQuestionId);
      }
      await this.proceedToQuestion("next");
    }
  }

  private async broadcastQuestion(questionId: number) {
    try {
      const response = await fetch("/admin/question_broadcasts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({ question_id: questionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.error("問題の送出に失敗しました:", e);
      // 問題送出の失敗はアラートを出さない（次の問題への遷移は続行）
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
    if (!this.readingContext) return;

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
    if (!this.readingContext) return;

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
    if (!this.readingContext) return "";
    return `${this.readingContext.readDuration.toFixed(2)} / ${this.readingContext.fullDuration.toFixed(2)}`;
  }
}
