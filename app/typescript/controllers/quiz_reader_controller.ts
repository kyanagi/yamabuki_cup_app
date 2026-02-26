import { Controller } from "@hotwired/stimulus";
import { createQuestionId, type QuestionId } from "../lib/quiz_reader/question_id";
import { createSoundId, type SoundId } from "../lib/quiz_reader/sound_id";
import {
  createQuestionReadingContext,
  type LoadingStatus,
  loadAudioFromLocalFile,
  type QuestionReadingContext,
  type VoiceStatus,
} from "./quiz_reader/question_reading_context";
import { createQuizReaderApi } from "./quiz_reader/quiz_reader_api";
import { createQuizReaderOrchestrator } from "./quiz_reader/quiz_reader_orchestrator";
import { createQuizReaderReadingStore } from "./quiz_reader/quiz_reader_reading_store";
import { createQuizReaderView } from "./quiz_reader/quiz_reader_view";

// localStorage のキー
const VOLUME_STORAGE_KEY = "quiz-reader-volume";
// デフォルト音量
const DEFAULT_VOLUME = 100;

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
    "voiceLoadErrorIcon",
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
  declare voiceLoadErrorIconTarget: HTMLElement;
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
  declare hasQuestionIdValue: boolean;
  declare hasSoundIdValue: boolean;
  declare questionIdValue: number;
  declare soundIdValue: string;

  private soundDirHandle: FileSystemDirectoryHandle | undefined;
  private gainNode: GainNode | undefined;
  private sampleAudioSource: AudioBufferSourceNode | undefined;
  private sampleAudioBuffer: AudioBuffer | undefined;
  private sampleAudioLoading = false;
  private sampleAudioAbortController: AbortController | undefined;
  private readonly quizReaderApi = createQuizReaderApi({
    csrfTokenProvider: () => this.csrfToken(),
  });
  private readonly quizReaderView = createQuizReaderView({
    getVoiceLoadingStatusIcons: () =>
      Array.from(this.element.querySelectorAll<HTMLElement>('[data-quiz-reader-target~="voiceLoadingStatusIcon"]')),
    getVoiceLoadingIcon: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="voiceLoadingIcon"]'),
    getVoiceLoadedIcon: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="voiceLoadedIcon"]'),
    getVoiceLoadErrorIcon: () =>
      this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="voiceLoadErrorIcon"]'),
    getPlayStatusIcons: () =>
      Array.from(this.element.querySelectorAll<HTMLElement>('[data-quiz-reader-target~="playStatusIcon"]')),
    getStopIcon: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="stopIcon"]'),
    getPlayIcon: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="playIcon"]'),
    getPauseIcon: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="pauseIcon"]'),
    getResultUploadingStatusIcons: () =>
      Array.from(this.element.querySelectorAll<HTMLElement>('[data-quiz-reader-target~="resultUploadingStatusIcon"]')),
    getResultUploadingIcon: () =>
      this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="resultUploadingIcon"]'),
    getResultUploadedIcon: () =>
      this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="resultUploadedIcon"]'),
    getResultUploadErrorIcon: () =>
      this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="resultUploadErrorIcon"]'),
    getMainError: () => this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="mainError"]'),
  });
  private readonly quizReaderReadingStore = createQuizReaderReadingStore();

  private audioContext: AudioContext | undefined;
  private readingContext: QuestionReadingContext | undefined;
  private initialQuestionId: QuestionId | undefined;
  private initialSoundId: SoundId | undefined;
  private readonly quizReaderOrchestrator = createQuizReaderOrchestrator(
    {
      api: this.quizReaderApi,
      view: this.quizReaderView,
      readingStore: this.quizReaderReadingStore,
    },
    {
      getAudioContext: () => this.audioContext,
      getGainNode: () => this.gainNode,
      getSoundDirHandle: () => this.soundDirHandle,
      setSoundDirHandle: (dir) => {
        this.soundDirHandle = dir;
      },
      getReadingContext: () => this.readingContext,
      setReadingContext: (readingContext) => {
        this.readingContext = readingContext;
      },
      getQuestionSeed: () => ({
        questionId: this.requireInitialQuestionId(),
        soundId: this.requireInitialSoundId(),
      }),
      isAnyModalOpen: () => this.isAnyModalOpen(),
      isOnAirEnabled: () => this.isOnAirTarget.checked,
      isQuestionFollowEnabled: () => this.isQuestionFollowOnTarget.checked,
      getMainErrorText: () => this.mainErrorText,
      setDurationText: (text) => {
        this.durationTarget.textContent = text;
      },
      clearDurationText: () => {
        this.durationTarget.textContent = "";
      },
      applyOnAirStateToUI: () => this.applyOnAirStateToUI(),
      onFolderSelected: (dirName: string) => {
        this.clearSettingsButtonHighlight();
        this.updateFolderStatusText(dirName, "success");
        this.enableSampleAudioButtons();
      },
      resetSampleAudioCache: () => {
        this.stopSampleAudio();
        this.sampleAudioBuffer = undefined;
      },
    },
  );

  private beforeStreamRenderHandler = (e: Event) => {
    this.quizReaderOrchestrator.handleBeforeStreamRender(
      e as CustomEvent<{
        render: (streamElement: HTMLElement) => void;
      }>,
    );
  };

  connect() {
    this.initialQuestionId = this.resolveInitialQuestionId();
    this.initialSoundId = this.resolveInitialSoundId();
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
    this.quizReaderOrchestrator.dispose();
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
    this.initialQuestionId = undefined;
    this.initialSoundId = undefined;
    this.soundDirHandle = undefined;
  }

  private requireInitialQuestionId(): QuestionId {
    if (this.initialQuestionId === undefined) {
      throw new Error("question-id-value の初期化に失敗しました。");
    }
    return this.initialQuestionId;
  }

  private requireInitialSoundId(): SoundId {
    if (this.initialSoundId === undefined) {
      throw new Error("sound-id-value の初期化に失敗しました。");
    }
    return this.initialSoundId;
  }

  private resolveInitialQuestionId(): QuestionId {
    if (!this.hasQuestionIdValue) {
      throw new Error("data-quiz-reader-question-id-value が指定されていません。");
    }
    const questionId = createQuestionId(this.questionIdValue);
    if (questionId === null) {
      throw new Error("data-quiz-reader-question-id-value は1以上の整数で指定してください。");
    }
    return questionId;
  }

  private resolveInitialSoundId(): SoundId {
    if (!this.hasSoundIdValue) {
      throw new Error("data-quiz-reader-sound-id-value が指定されていません。");
    }
    const soundId = createSoundId(this.soundIdValue);
    if (soundId === null) {
      throw new Error("data-quiz-reader-sound-id-value は空文字以外で指定してください。");
    }
    return soundId;
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
   * 音量を設定する（スライダー・数値入力欄どちらのinputイベントからも呼ばれる）
   */
  setVolume(event: Event) {
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

  private updateFolderStatusText(text: string, state: "default" | "success") {
    this.folderStatusTarget.classList.remove("has-text-grey", "has-text-success");
    this.folderStatusTarget.classList.add(state === "success" ? "has-text-success" : "has-text-grey");
    this.folderStatusTarget.textContent = text;
  }

  private clearSettingsButtonHighlight() {
    this.settingsButtonTarget.classList.remove("is-warning");
  }

  private enableSampleAudioButtons() {
    this.samplePlayButtonTarget.disabled = false;
    this.sampleStopButtonTarget.disabled = false;
  }

  async selectFolder() {
    await this.quizReaderOrchestrator.selectFolder();
  }

  startReading() {
    this.quizReaderOrchestrator.startReading();
  }

  pauseReading() {
    void this.quizReaderOrchestrator.pauseReading();
  }

  resetReading() {
    this.quizReaderOrchestrator.resetReading();
  }

  async switchToQuestion() {
    await this.quizReaderOrchestrator.switchToQuestion();
  }

  async proceedToNextQuestion(event: KeyboardEvent) {
    await this.quizReaderOrchestrator.proceedToNextQuestion(event);
  }

  private csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";
  }

  private get mainErrorText(): string {
    const mainError = this.element.querySelector<HTMLElement>('[data-quiz-reader-target~="mainError"]');
    return mainError?.textContent ?? "";
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
