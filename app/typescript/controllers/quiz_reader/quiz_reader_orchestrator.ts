/**
 * Quiz Reader の本線ユースケースを統括するオーケストレータ。
 *
 * Controller からイベント分岐と副作用の手順を移し、
 * 「イベント仲介 + 依存呼び出し」の流れをここで組み立てる。
 * UI更新は view、HTTP通信は api、永続化は readingStore に委譲する。
 */
import { Turbo } from "@hotwired/turbo-rails";
import {
  createQuestionReadingContext,
  type LoadingStatus,
  type QuestionReadingContext,
  type VoiceStatus,
} from "./question_reading_context";
import type { QuizReaderApi } from "./quiz_reader_api";
import type { QuizReaderReadingStore } from "./quiz_reader_reading_store";
import type { QuizReaderView } from "./quiz_reader_view";

export type QuizReaderOrchestratorDeps = {
  api: QuizReaderApi;
  view: QuizReaderView;
  readingStore: QuizReaderReadingStore;
  createQuestionReadingContextFn?: typeof createQuestionReadingContext;
  selectDirectoryFn?: () => Promise<FileSystemDirectoryHandle>;
  promptFn?: (message: string) => string | null;
  alertFn?: (message: string) => void;
  renderStreamMessageFn?: (html: string) => void;
  requestAnimationFrameFn?: (cb: FrameRequestCallback) => number;
  logger?: Pick<Console, "log" | "error">;
};

export type QuizReaderOrchestratorStateDeps = {
  getAudioContext: () => AudioContext | undefined;
  getGainNode: () => GainNode | undefined;
  getSoundDirHandle: () => FileSystemDirectoryHandle | undefined;
  setSoundDirHandle: (dir: FileSystemDirectoryHandle | undefined) => void;
  getReadingContext: () => QuestionReadingContext | undefined;
  setReadingContext: (ctx: QuestionReadingContext | undefined) => void;
  getQuestionSeed: () => { questionId: number; soundId: string };
  isAnyModalOpen: () => boolean;
  isOnAirEnabled: () => boolean;
  isQuestionFollowEnabled: () => boolean;
  getMainErrorText: () => string;
  setDurationText: (text: string) => void;
  clearDurationText: () => void;
  applyOnAirStateToUI: () => void;
  onFolderSelected: (dirName: string) => void;
  resetSampleAudioCache: () => void;
};

export type QuizReaderOrchestrator = {
  handleBeforeStreamRender(e: CustomEvent<{ render: (streamElement: HTMLElement) => void }>): void;
  selectFolder(): Promise<void>;
  startReading(): void;
  pauseReading(): Promise<void>;
  resetReading(): void;
  switchToQuestion(): Promise<void>;
  proceedToNextQuestion(event: KeyboardEvent): Promise<void>;
  dispose(): void;
};

function durationText(readingContext: QuestionReadingContext): string {
  return `${readingContext.readDuration.toFixed(2)} / ${readingContext.fullDuration.toFixed(2)}`;
}

export function createQuizReaderOrchestrator(
  deps: QuizReaderOrchestratorDeps,
  stateDeps: QuizReaderOrchestratorStateDeps,
): QuizReaderOrchestrator {
  const {
    api,
    view,
    readingStore,
    createQuestionReadingContextFn = createQuestionReadingContext,
    selectDirectoryFn = () => window.showDirectoryPicker(),
    promptFn = (message: string) => window.prompt(message),
    alertFn = (message: string) => window.alert(message),
    renderStreamMessageFn = (html: string) => Turbo.renderStreamMessage(html),
    requestAnimationFrameFn = (cb: FrameRequestCallback) => requestAnimationFrame(cb),
    logger = console,
  } = deps;

  const createQuestionReadingContextAndLoad = (questionId: number, soundId: string) => {
    const audioContext = stateDeps.getAudioContext();
    if (!audioContext) {
      throw new Error("AudioContext が初期化されていません");
    }
    const soundDirHandle = stateDeps.getSoundDirHandle();
    if (!soundDirHandle) {
      // フォルダ未選択時は readingContext を作成しない
      return;
    }

    const onLoadingStatusChanged = (loadingStatus: LoadingStatus) => {
      switch (loadingStatus) {
        case "LOADING":
          view.setVoiceLoadingStatusIcon("LOADING");
          break;
        case "LOADED":
          logger.log(`load done: duration=${stateDeps.getReadingContext()?.fullDuration}`);
          view.setVoiceLoadingStatusIcon("LOADED");
          view.clearMainError();
          break;
        case "NOT_LOADED":
          view.setVoiceLoadingStatusIcon("NOT_LOADED");
          if (stateDeps.getMainErrorText().trim() === "") {
            view.showMainError("音声ファイルの読み込みに失敗しました");
          }
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      view.setPlayStatusIcon(voiceStatus);
    };
    const onFileNotFound = (filename: string) => {
      view.showMainError(`音声ファイルが見つかりません（${filename}）`);
    };

    stateDeps.getReadingContext()?.dispose();
    const readingContext = createQuestionReadingContextFn(
      questionId,
      soundId,
      audioContext,
      soundDirHandle,
      onLoadingStatusChanged,
      onVoiceStatusChanged,
      onFileNotFound,
      stateDeps.getGainNode(),
    );
    stateDeps.setReadingContext(readingContext);
    void readingContext.load();
  };

  const broadcastQuestion = async (questionId: number) => {
    try {
      await api.broadcastQuestion(questionId);
    } catch (e) {
      logger.error("問題の送出に失敗しました:", e);
      // 問題送出の失敗はアラートを出さない（次の問題への遷移は続行）
    }
  };

  const proceedToQuestion = async (questionId: string) => {
    try {
      const html = await api.fetchNextQuestionStream(questionId);
      renderStreamMessageFn(html);
      requestAnimationFrameFn(() => {
        stateDeps.applyOnAirStateToUI();
      });
    } catch (e) {
      logger.error(e);
      if (e instanceof Error) {
        alertFn(`エラーが発生しました: ${e.message}`);
      } else {
        alertFn("予期せぬエラーが発生しました");
      }
    }
  };

  return {
    handleBeforeStreamRender(e: CustomEvent<{ render: (streamElement: HTMLElement) => void }>) {
      const fallbackToDefaultActions = e.detail.render;
      e.detail.render = (streamElement: HTMLElement) => {
        if (streamElement.getAttribute("action") === "update-question") {
          const questionId = streamElement.getAttribute("question-id");
          const soundId = streamElement.getAttribute("sound-id");
          if (!questionId) {
            throw new Error("question-id が指定されていません。");
          }
          if (!soundId) {
            throw new Error("sound-id が指定されていません。");
          }
          createQuestionReadingContextAndLoad(Number(questionId), soundId);
        } else {
          fallbackToDefaultActions(streamElement);
        }
      };
    },

    async selectFolder(): Promise<void> {
      try {
        const dirHandle = await selectDirectoryFn();

        stateDeps.resetSampleAudioCache();
        stateDeps.setSoundDirHandle(dirHandle);
        view.clearMainError();
        stateDeps.onFolderSelected(dirHandle.name);

        const { questionId, soundId } = stateDeps.getQuestionSeed();
        createQuestionReadingContextAndLoad(questionId, soundId);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          view.clearMainError();
          return;
        }
        view.showMainError("フォルダの選択に失敗しました");
      }
    },

    startReading(): void {
      if (stateDeps.isAnyModalOpen()) return;
      if (!stateDeps.isOnAirEnabled()) return;

      if (!stateDeps.getSoundDirHandle()) {
        view.showMainError("再生するには音声フォルダの選択が必要です");
        return;
      }

      const readingContext = stateDeps.getReadingContext();
      if (!readingContext) return;
      if (readingContext.voiceStatus !== "STANDBY") return;

      void readingContext.start();
    },

    async pauseReading(): Promise<void> {
      if (stateDeps.isAnyModalOpen()) return;
      const readingContext = stateDeps.getReadingContext();
      if (!readingContext) return;
      if (readingContext.voiceStatus !== "PLAYING") return;

      readingContext.stop();
      stateDeps.setDurationText(durationText(readingContext));
      void readingStore.save({
        questionId: readingContext.questionId,
        readDuration: readingContext.readDuration,
        timestamp: new Date().toISOString(),
      });

      view.setResultUploadingStatusIcon("UPLOADING");
      try {
        await api.uploadQuestionReading({
          questionId: readingContext.questionId,
          readDuration: readingContext.readDuration,
          fullDuration: readingContext.fullDuration,
        });
        view.setResultUploadingStatusIcon("UPLOADED");
      } catch (e) {
        logger.error(e);
        view.setResultUploadingStatusIcon("UPLOAD_ERROR");
      }
    },

    resetReading(): void {
      if (stateDeps.isAnyModalOpen()) return;
      const readingContext = stateDeps.getReadingContext();
      if (!readingContext) return;
      if (readingContext.voiceStatus !== "PAUSED") return;

      logger.log("resetReading");
      readingContext.reset();
      stateDeps.clearDurationText();
      view.setResultUploadingStatusIcon("NOT_UPLOADING");
    },

    async switchToQuestion(): Promise<void> {
      const questionIdRaw = promptFn("問題番号を入力してください");
      if (questionIdRaw == null) return;

      const questionId = questionIdRaw.trim();
      if (!/^\d+$/.test(questionId)) {
        alertFn("問題番号は数字で入力してください");
        return;
      }

      await proceedToQuestion(questionId);
    },

    async proceedToNextQuestion(event: KeyboardEvent): Promise<void> {
      if (stateDeps.isAnyModalOpen()) return;
      if (event.repeat) return;
      const readingContext = stateDeps.getReadingContext();
      if (readingContext?.voiceStatus !== "PAUSED") return;

      const currentQuestionId = readingContext.questionId;
      if (stateDeps.isQuestionFollowEnabled()) {
        await broadcastQuestion(currentQuestionId);
      }
      await proceedToQuestion("next");
    },

    dispose(): void {
      stateDeps.getReadingContext()?.dispose();
      stateDeps.setReadingContext(undefined);
    },
  };
}
