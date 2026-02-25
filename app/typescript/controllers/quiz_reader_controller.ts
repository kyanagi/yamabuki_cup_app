import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";
import { openDB } from "idb";
import { fetchWithRetry } from "../lib/fetch_with_retry";
import {
  createQuestionReadingContext,
  type LoadingStatus,
  loadAudioFromLocalFile,
  type QuestionReadingContext,
  type VoiceStatus,
} from "./quiz_reader/question_reading_context";

// 既存テストと利用箇所の互換性維持のため再エクスポート
export { createQuestionReadingContext, loadAudioFromLocalFile };
export type { LoadingStatus, QuestionReadingContext, VoiceStatus };
// IndexedDB の名前
const IDB_NAME = "yamabuki-cup-quiz-reader";
// localStorage のキー
const VOLUME_STORAGE_KEY = "quiz-reader-volume";
// デフォルト音量
const DEFAULT_VOLUME = 100;

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
    "settingsButton",
    "mainError",
    "nextQuestions",
    "settingsModal",
    "volumeSlider",
    "volumeInput",
    "samplePlayButton",
    "sampleStopButton",
    "nextQuestionBox",
    "next2QuestionBox",
    "nextQuestionContent",
    "next2QuestionContent",
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
  declare settingsButtonTarget: HTMLButtonElement;
  declare mainErrorTarget: HTMLElement;
  declare nextQuestionsTarget: HTMLElement;
  declare settingsModalTarget: HTMLElement;
  declare volumeSliderTarget: HTMLInputElement;
  declare volumeInputTarget: HTMLInputElement;
  declare samplePlayButtonTarget: HTMLButtonElement;
  declare sampleStopButtonTarget: HTMLButtonElement;
  declare nextQuestionBoxTarget: HTMLElement;
  declare next2QuestionBoxTarget: HTMLElement;
  declare nextQuestionContentTarget: HTMLElement;
  declare next2QuestionContentTarget: HTMLElement;
  declare hasNextQuestionBoxTarget: boolean;
  declare hasNext2QuestionBoxTarget: boolean;
  declare hasNextQuestionContentTarget: boolean;
  declare hasNext2QuestionContentTarget: boolean;
  declare questionIdValue: number;
  declare soundIdValue: string;

  private soundDirHandle: FileSystemDirectoryHandle | undefined;
  private gainNode: GainNode | undefined;
  private sampleAudioSource: AudioBufferSourceNode | undefined;
  private sampleAudioBuffer: AudioBuffer | undefined;
  private sampleAudioLoading = false;
  private sampleAudioAbortController: AbortController | undefined;

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
    if (!this.soundDirHandle) {
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
          this.clearMainError();
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      this.setPlayStatusIcon(voiceStatus);
    };
    const onFileNotFound = (filename: string) => {
      this.showMainError(`音声ファイルが見つかりません（${filename}）`);
    };

    this.readingContext?.dispose();
    this.readingContext = createQuestionReadingContext(
      questionId,
      soundId,
      this.audioContext,
      this.soundDirHandle,
      onLoadingStatusChanged,
      onVoiceStatusChanged,
      onFileNotFound,
      this.gainNode,
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

    // GainNodeを作成してdestinationに接続
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // localStorageから音量を復元
    this.restoreVolume();

    document.addEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);
    this.applyOnAirStateToUI();
  }

  disconnect() {
    console.log("QuizReaderController disconnected");
    this.stopSampleAudio();
    this.sampleAudioBuffer = undefined;
    this.readingContext?.dispose();
    this.readingContext = undefined;
    document.removeEventListener("turbo:before-stream-render", this.beforeStreamRenderHandler);

    // GainNodeを切断
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = undefined;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioContext = undefined;
    this.soundDirHandle = undefined;
  }

  /**
   * localStorageから音量を復元する
   */
  private restoreVolume() {
    const storedValue = this.readVolumeFromStorage();

    let volume: number;
    if (storedValue === null) {
      volume = DEFAULT_VOLUME;
    } else {
      const parsed = Number(storedValue);
      if (!Number.isFinite(parsed)) {
        volume = DEFAULT_VOLUME;
      } else {
        // 0-100の範囲にクランプ
        volume = Math.max(0, Math.min(100, parsed));
      }
    }

    // GainNodeに音量を設定
    if (this.gainNode) {
      this.gainNode.gain.value = volume / 100;
    }

    // UIを更新
    this.volumeSliderTarget.value = String(volume);
    this.volumeInputTarget.value = String(volume);
  }

  /**
   * 音量を設定する（スライダーのinputイベントから呼ばれる）
   */
  setVolumeFromSlider(event: Event) {
    const volume = Number((event.target as HTMLInputElement).value);
    this.applyVolume(this.normalizeVolume(volume));
  }

  /**
   * 音量を設定する（数値入力欄のinputイベントから呼ばれる）
   */
  setVolumeFromInput(event: Event) {
    const volume = Number((event.target as HTMLInputElement).value);
    this.applyVolume(this.normalizeVolume(volume));
  }

  /**
   * 音量値を正規化する（0-100の整数に変換）
   */
  private normalizeVolume(value: number): number {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return DEFAULT_VOLUME;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  /**
   * 音量を適用する（UI同期、localStorage保存、GainNode更新）
   */
  private applyVolume(volume: number) {
    // localStorageに保存
    this.saveVolumeToStorage(volume);

    // UIを同期
    this.volumeSliderTarget.value = String(volume);
    this.volumeInputTarget.value = String(volume);

    // gainNodeに音量を反映
    if (this.gainNode) {
      this.gainNode.gain.value = volume / 100;
    }
  }

  /**
   * localStorageから音量を取得する（取得できない場合はnull）
   */
  private readVolumeFromStorage(): string | null {
    try {
      return localStorage.getItem(VOLUME_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * localStorageに音量を保存する（失敗しても無視）
   */
  private saveVolumeToStorage(volume: number): void {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // localStorageが利用できない環境では保存しない
    }
  }

  /**
   * 問い読みスイッチの状態をUIに反映させる
   */
  applyOnAirStateToUI() {
    if (this.isOnAirTarget.checked) {
      this.onAirLabelTarget.textContent = "問い読みON";
    } else {
      this.onAirLabelTarget.textContent = "問い読みOFF";
    }

    const isOffAir = !this.isOnAirTarget.checked;

    // 問題内容の非表示切り替え
    if (this.hasNextQuestionContentTarget) {
      this.nextQuestionContentTarget.classList.toggle("is-hidden", isOffAir);
    }
    if (this.hasNext2QuestionContentTarget) {
      this.next2QuestionContentTarget.classList.toggle("is-hidden", isOffAir);
    }

    // カードのグレーアウト切り替え
    if (this.hasNextQuestionBoxTarget) {
      this.nextQuestionBoxTarget.classList.toggle("quiz-reader-off-air", isOffAir);
    }
    if (this.hasNext2QuestionBoxTarget) {
      this.next2QuestionBoxTarget.classList.toggle("quiz-reader-off-air", isOffAir);
    }
  }

  /**
   * 問題フォロースイッチの状態をUIに反映させる
   */
  applyQuestionFollowStateToUI() {
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

  private showMainError(message: string) {
    this.mainErrorTarget.textContent = message;
    this.mainErrorTarget.classList.remove("is-hidden");
  }

  private clearMainError() {
    this.mainErrorTarget.textContent = "";
    this.mainErrorTarget.classList.add("is-hidden");
  }

  private clearSettingsButtonHighlight() {
    this.settingsButtonTarget.classList.remove("is-warning");
  }

  private enableSampleAudioButtons() {
    this.samplePlayButtonTarget.disabled = false;
    this.sampleStopButtonTarget.disabled = false;
  }

  async selectFolder() {
    try {
      const dirHandle = await window.showDirectoryPicker();

      // 再生中のサンプル音声を停止し、読み込み中の処理もキャンセル
      this.stopSampleAudio();
      this.sampleAudioBuffer = undefined;

      this.soundDirHandle = dirHandle;
      this.clearMainError();
      this.clearSettingsButtonHighlight();
      this.updateFolderStatusText(dirHandle.name, "success");
      this.enableSampleAudioButtons();
      // フォルダ選択後に音声を読み込む
      this.createQuestionReadingContextAndLoad(this.questionIdValue, this.soundIdValue);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // キャンセル時はエラーをクリアするが、folderStatus は既存の選択状態を維持
        this.clearMainError();
        return;
      }
      this.showMainError("フォルダの選択に失敗しました");
    }
  }

  private load() {
    this.readingContext?.load();
  }

  startReading() {
    if (this.isAnyModalOpen()) return;
    if (!this.isOnAirTarget.checked) return;

    // フォルダ未選択チェックを先に行う
    if (!this.soundDirHandle) {
      this.showMainError("再生するには音声フォルダの選択が必要です");
      return;
    }

    if (!this.readingContext) return;
    if (this.readingContext.voiceStatus !== "STANDBY") return;

    this.readingContext.start();
  }

  pauseReading() {
    if (this.isAnyModalOpen()) return;
    if (!this.readingContext) return;
    if (this.readingContext.voiceStatus !== "PLAYING") return;

    this.readingContext.stop();
    this.durationTarget.textContent = this.durationText;
    this.saveQuestionReading();
    this.uploadQuestionReading();
  }

  resetReading() {
    if (this.isAnyModalOpen()) return;
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
    if (this.isAnyModalOpen()) return;
    if (event.repeat) return;
    if (this.readingContext?.voiceStatus !== "PAUSED") return;

    const currentQuestionId = this.readingContext.questionId;

    // 問題フォローがONの場合のみ問題を送出
    if (this.isQuestionFollowOnTarget.checked) {
      await this.broadcastQuestion(currentQuestionId);
    }
    await this.proceedToQuestion("next");
  }

  private csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";
  }

  private jsonHeaders(accept?: string): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CSRF-Token": this.csrfToken(),
    };
    if (accept) {
      return { ...baseHeaders, Accept: accept };
    }
    return baseHeaders;
  }

  private async broadcastQuestion(questionId: number) {
    try {
      const response = await fetch("/admin/question_broadcasts", {
        method: "POST",
        headers: this.jsonHeaders("application/json"),
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
        headers: this.jsonHeaders("text/vnd.turbo-stream.html"),
        body: JSON.stringify({ question_id: questionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      Turbo.renderStreamMessage(html);

      // 問い読みスイッチの状態を新しいDOM要素に反映
      // Turbo StreamがDOMを更新した後、Stimulusがターゲットを再検出するのを待つ
      requestAnimationFrame(() => {
        this.applyOnAirStateToUI();
      });
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
        headers: this.jsonHeaders(),
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

  private isAnyModalOpen(): boolean {
    return this.element.querySelector(".modal.is-active") !== null;
  }

  // 設定モーダル関連メソッド
  openSettingsModal() {
    this.settingsModalTarget.classList.add("is-active");
  }

  closeSettingsModal() {
    this.stopSampleAudio();
    this.settingsModalTarget.classList.remove("is-active");
  }

  async playSampleAudio() {
    if (!this.audioContext) return;
    // 読み込み中は多重再生を防ぐ
    if (this.sampleAudioLoading) return;

    // 音声フォルダが未選択の場合はエラー
    if (!this.soundDirHandle) {
      alert("サンプル音声を再生するには、音声フォルダを選択してください");
      return;
    }

    this.stopSampleAudio();

    // 新しいAbortControllerを作成
    this.sampleAudioAbortController = new AbortController();
    const signal = this.sampleAudioAbortController.signal;

    try {
      // AudioContextがsuspended状態の場合はresumeする
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      if (!this.sampleAudioBuffer) {
        this.sampleAudioLoading = true;
        try {
          const buffer = await loadAudioFromLocalFile("sample.wav", this.soundDirHandle, this.audioContext, signal);
          // 読み込み完了後にキャンセルされていたらバッファをセットしない
          if (signal.aborted) return;
          this.sampleAudioBuffer = buffer;
        } finally {
          this.sampleAudioLoading = false;
        }
      }

      // キャンセルされていたら再生しない
      if (signal.aborted) return;

      this.sampleAudioSource = this.audioContext.createBufferSource();
      this.sampleAudioSource.buffer = this.sampleAudioBuffer;
      // gainNodeがあればそれを経由、なければdestinationに直接接続
      const destination = this.gainNode ?? this.audioContext.destination;
      this.sampleAudioSource.connect(destination);
      this.sampleAudioSource.onended = () => {
        this.sampleAudioSource = undefined;
      };
      this.sampleAudioSource.start();
    } catch (e) {
      // AbortErrorはユーザーの意図的なキャンセルなので無視
      if (e instanceof Error && e.name === "AbortError") return;
      // NotFoundError はファイルが見つからない場合
      if (e instanceof DOMException && e.name === "NotFoundError") {
        alert("sample.wav が見つかりません");
        return;
      }
      console.error("サンプル音声の再生に失敗しました:", e);
      alert("サンプル音声の再生に失敗しました");
    }
  }

  stopSampleAudio() {
    // 読み込み中の場合はキャンセル
    this.sampleAudioAbortController?.abort();
    this.sampleAudioAbortController = undefined;

    if (this.sampleAudioSource) {
      this.sampleAudioSource.onended = null;
      this.sampleAudioSource.stop();
      this.sampleAudioSource.disconnect();
      this.sampleAudioSource = undefined;
    }
  }
}
