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

type UpdateQuestionStreamAttributes = {
  questionId: number;
  soundId: string;
};

export type SwitchToQuestionInputParseResult =
  | { kind: "cancelled" }
  | { kind: "invalid" }
  | { kind: "valid"; questionId: string };

type CreateQuestionReadingContextAndLoad = (questionId: number, soundId: string) => void;

const INVALID_QUESTION_ID_MESSAGE = "問題番号は数字で入力してください";

// テストのためだけの export
export function parseUpdateQuestionStreamAttributes(streamElement: HTMLElement): UpdateQuestionStreamAttributes | null {
  if (streamElement.getAttribute("action") !== "update-question") {
    return null;
  }

  const questionId = streamElement.getAttribute("question-id");
  if (!questionId) {
    throw new Error("question-id が指定されていません。");
  }
  const soundId = streamElement.getAttribute("sound-id");
  if (!soundId) {
    throw new Error("sound-id が指定されていません。");
  }

  return {
    questionId: Number(questionId),
    soundId,
  };
}

// テストのためだけの export
export function parseSwitchToQuestionInput(questionIdRaw: string | null): SwitchToQuestionInputParseResult {
  if (questionIdRaw == null) {
    return { kind: "cancelled" };
  }

  const questionId = questionIdRaw.trim();
  if (!/^\d+$/.test(questionId)) {
    return { kind: "invalid" };
  }

  return {
    kind: "valid",
    questionId,
  };
}

// テストのためだけの export
export function formatDurationText(readingContext: QuestionReadingContext): string {
  return `${readingContext.readDuration.toFixed(2)} / ${readingContext.fullDuration.toFixed(2)}`;
}

type ContextLoaderDeps = {
  view: Pick<QuizReaderView, "setVoiceLoadingStatusIcon" | "clearMainError" | "showMainError" | "setPlayStatusIcon">;
  createQuestionReadingContextFn: typeof createQuestionReadingContext;
  logger: Pick<Console, "log" | "error">;
};

type ContextLoaderStateDeps = Pick<
  QuizReaderOrchestratorStateDeps,
  | "getAudioContext"
  | "getSoundDirHandle"
  | "getReadingContext"
  | "setReadingContext"
  | "getGainNode"
  | "getMainErrorText"
>;

function buildCreateQuestionReadingContextAndLoad(
  deps: ContextLoaderDeps,
  stateDeps: ContextLoaderStateDeps,
): CreateQuestionReadingContextAndLoad {
  return (questionId: number, soundId: string) => {
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
          deps.view.setVoiceLoadingStatusIcon("LOADING");
          break;
        case "LOADED":
          deps.logger.log(`load done: duration=${stateDeps.getReadingContext()?.fullDuration}`);
          deps.view.setVoiceLoadingStatusIcon("LOADED");
          deps.view.clearMainError();
          break;
        case "NOT_LOADED":
          deps.view.setVoiceLoadingStatusIcon("NOT_LOADED");
          if (stateDeps.getMainErrorText().trim() === "") {
            deps.view.showMainError("音声ファイルの読み込みに失敗しました");
          }
          break;
      }
    };
    const onVoiceStatusChanged = (voiceStatus: VoiceStatus) => {
      deps.view.setPlayStatusIcon(voiceStatus);
    };
    const onFileNotFound = (filename: string) => {
      deps.view.showMainError(`音声ファイルが見つかりません（${filename}）`);
    };

    stateDeps.getReadingContext()?.dispose();
    const readingContext = deps.createQuestionReadingContextFn(
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
}

type StreamActionDeps = {
  createQuestionReadingContextAndLoad: CreateQuestionReadingContextAndLoad;
};

function createStreamActions(deps: StreamActionDeps): Pick<QuizReaderOrchestrator, "handleBeforeStreamRender"> {
  return {
    handleBeforeStreamRender(e: CustomEvent<{ render: (streamElement: HTMLElement) => void }>) {
      const fallbackToDefaultActions = e.detail.render;
      e.detail.render = (streamElement: HTMLElement) => {
        const parsedAttributes = parseUpdateQuestionStreamAttributes(streamElement);
        if (!parsedAttributes) {
          fallbackToDefaultActions(streamElement);
          return;
        }

        deps.createQuestionReadingContextAndLoad(parsedAttributes.questionId, parsedAttributes.soundId);
      };
    },
  };
}

type ReadingActionDeps = {
  view: Pick<QuizReaderView, "showMainError" | "setResultUploadingStatusIcon" | "clearMainError">;
  readingStore: Pick<QuizReaderReadingStore, "save">;
  api: Pick<QuizReaderApi, "uploadQuestionReading">;
  logger: Pick<Console, "log" | "error">;
  selectDirectoryFn: () => Promise<FileSystemDirectoryHandle>;
  createQuestionReadingContextAndLoad: CreateQuestionReadingContextAndLoad;
};

type ReadingActionStateDeps = Pick<
  QuizReaderOrchestratorStateDeps,
  | "isAnyModalOpen"
  | "isOnAirEnabled"
  | "getSoundDirHandle"
  | "getReadingContext"
  | "setDurationText"
  | "clearDurationText"
  | "resetSampleAudioCache"
  | "setSoundDirHandle"
  | "onFolderSelected"
  | "getQuestionSeed"
  | "setReadingContext"
>;

function createReadingActions(
  deps: ReadingActionDeps,
  stateDeps: ReadingActionStateDeps,
): Pick<QuizReaderOrchestrator, "selectFolder" | "startReading" | "pauseReading" | "resetReading" | "dispose"> {
  return {
    async selectFolder(): Promise<void> {
      try {
        const dirHandle = await deps.selectDirectoryFn();

        stateDeps.resetSampleAudioCache();
        stateDeps.setSoundDirHandle(dirHandle);
        deps.view.clearMainError();
        stateDeps.onFolderSelected(dirHandle.name);

        const { questionId, soundId } = stateDeps.getQuestionSeed();
        deps.createQuestionReadingContextAndLoad(questionId, soundId);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          deps.view.clearMainError();
          return;
        }
        deps.view.showMainError("フォルダの選択に失敗しました");
      }
    },

    startReading(): void {
      if (stateDeps.isAnyModalOpen()) return;
      if (!stateDeps.isOnAirEnabled()) return;

      if (!stateDeps.getSoundDirHandle()) {
        deps.view.showMainError("再生するには音声フォルダの選択が必要です");
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
      stateDeps.setDurationText(formatDurationText(readingContext));
      void deps.readingStore.save({
        questionId: readingContext.questionId,
        readDuration: readingContext.readDuration,
        timestamp: new Date().toISOString(),
      });

      deps.view.setResultUploadingStatusIcon("UPLOADING");
      try {
        await deps.api.uploadQuestionReading({
          questionId: readingContext.questionId,
          readDuration: readingContext.readDuration,
          fullDuration: readingContext.fullDuration,
        });
        deps.view.setResultUploadingStatusIcon("UPLOADED");
      } catch (e) {
        deps.logger.error(e);
        deps.view.setResultUploadingStatusIcon("UPLOAD_ERROR");
      }
    },

    resetReading(): void {
      if (stateDeps.isAnyModalOpen()) return;
      const readingContext = stateDeps.getReadingContext();
      if (!readingContext) return;
      if (readingContext.voiceStatus !== "PAUSED") return;

      deps.logger.log("resetReading");
      readingContext.reset();
      stateDeps.clearDurationText();
      deps.view.setResultUploadingStatusIcon("NOT_UPLOADING");
    },

    dispose(): void {
      stateDeps.getReadingContext()?.dispose();
      stateDeps.setReadingContext(undefined);
    },
  };
}

type QuestionNavigationDeps = {
  api: Pick<QuizReaderApi, "broadcastQuestion" | "fetchNextQuestionStream">;
  promptFn: (message: string) => string | null;
  alertFn: (message: string) => void;
  renderStreamMessageFn: (html: string) => void;
  requestAnimationFrameFn: (cb: FrameRequestCallback) => number;
  logger: Pick<Console, "error">;
};

type QuestionNavigationStateDeps = Pick<
  QuizReaderOrchestratorStateDeps,
  "applyOnAirStateToUI" | "isAnyModalOpen" | "getReadingContext" | "isQuestionFollowEnabled"
>;

function createQuestionNavigationActions(
  deps: QuestionNavigationDeps,
  stateDeps: QuestionNavigationStateDeps,
): Pick<QuizReaderOrchestrator, "switchToQuestion" | "proceedToNextQuestion"> {
  const broadcastQuestion = async (questionId: number) => {
    try {
      await deps.api.broadcastQuestion(questionId);
    } catch (e) {
      deps.logger.error("問題の送出に失敗しました:", e);
      // 問題送出の失敗はアラートを出さない（次の問題への遷移は続行）
    }
  };

  const proceedToQuestion = async (questionId: string) => {
    try {
      const html = await deps.api.fetchNextQuestionStream(questionId);
      deps.renderStreamMessageFn(html);
      deps.requestAnimationFrameFn(() => {
        stateDeps.applyOnAirStateToUI();
      });
    } catch (e) {
      deps.logger.error(e);
      if (e instanceof Error) {
        deps.alertFn(`エラーが発生しました: ${e.message}`);
      } else {
        deps.alertFn("予期せぬエラーが発生しました");
      }
    }
  };

  return {
    async switchToQuestion(): Promise<void> {
      const parsedInput = parseSwitchToQuestionInput(deps.promptFn("問題番号を入力してください"));
      if (parsedInput.kind === "cancelled") return;
      if (parsedInput.kind === "invalid") {
        deps.alertFn(INVALID_QUESTION_ID_MESSAGE);
        return;
      }

      await proceedToQuestion(parsedInput.questionId);
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
  };
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

  const createQuestionReadingContextAndLoad = buildCreateQuestionReadingContextAndLoad(
    {
      view,
      createQuestionReadingContextFn,
      logger,
    },
    stateDeps,
  );

  return {
    ...createStreamActions({
      createQuestionReadingContextAndLoad,
    }),
    ...createReadingActions(
      {
        view,
        readingStore,
        api,
        logger,
        selectDirectoryFn,
        createQuestionReadingContextAndLoad,
      },
      stateDeps,
    ),
    ...createQuestionNavigationActions(
      {
        api,
        promptFn,
        alertFn,
        renderStreamMessageFn,
        requestAnimationFrameFn,
        logger,
      },
      stateDeps,
    ),
  };
}
