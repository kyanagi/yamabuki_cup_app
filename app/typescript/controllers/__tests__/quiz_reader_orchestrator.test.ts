import { describe, expect, it, vi } from "vitest";
import type { LoadingStatus, QuestionReadingContext, VoiceStatus } from "../quiz_reader/question_reading_context";
import type { QuizReaderApi } from "../quiz_reader/quiz_reader_api";
import {
  createQuizReaderOrchestrator,
  type QuizReaderOrchestratorDeps,
  type QuizReaderOrchestratorStateDeps,
} from "../quiz_reader/quiz_reader_orchestrator";
import type { QuizReaderReadingStore } from "../quiz_reader/quiz_reader_reading_store";
import type { QuizReaderView } from "../quiz_reader/quiz_reader_view";

type FixtureOptions = {
  readingVoiceStatus?: VoiceStatus;
  isAnyModalOpen?: boolean;
  isOnAirEnabled?: boolean;
  isQuestionFollowEnabled?: boolean;
  initialMainErrorText?: string;
};

type BeforeStreamRenderEvent = CustomEvent<{
  render: (streamElement: HTMLElement) => void;
}>;

type Fixture = {
  orchestrator: ReturnType<typeof createQuizReaderOrchestrator>;
  deps: QuizReaderOrchestratorDeps;
  stateDeps: QuizReaderOrchestratorStateDeps;
  state: {
    mainErrorText: string;
    readingContext: QuestionReadingContext | undefined;
    soundDirHandle: FileSystemDirectoryHandle | undefined;
  };
};

function createMockReadingContext(params: {
  questionId?: number;
  fullDuration?: number;
  readDuration?: number;
  voiceStatus?: VoiceStatus;
  load?: () => Promise<void>;
}) {
  const {
    questionId = 1,
    fullDuration = 5,
    readDuration = 1.5,
    voiceStatus = "STANDBY",
    load = async () => {},
  } = params;

  return {
    load: vi.fn(load),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
    get questionId() {
      return questionId;
    },
    get fullDuration() {
      return fullDuration;
    },
    get readDuration() {
      return readDuration;
    },
    get voiceStatus() {
      return voiceStatus;
    },
    set loadingStatus(_s: LoadingStatus) {},
  } satisfies QuestionReadingContext;
}

function createFixture(options: FixtureOptions = {}): Fixture {
  const state = {
    mainErrorText: options.initialMainErrorText ?? "",
    readingContext: undefined as QuestionReadingContext | undefined,
    soundDirHandle: undefined as FileSystemDirectoryHandle | undefined,
  };

  const api = {
    broadcastQuestion: vi.fn().mockResolvedValue(undefined),
    fetchNextQuestionStream: vi.fn().mockResolvedValue("<turbo-stream></turbo-stream>"),
    uploadQuestionReading: vi.fn().mockResolvedValue(undefined),
  } satisfies QuizReaderApi;

  const view = {
    setVoiceLoadingStatusIcon: vi.fn(),
    setPlayStatusIcon: vi.fn(),
    setResultUploadingStatusIcon: vi.fn(),
    showMainError: vi.fn((message: string) => {
      state.mainErrorText = message;
    }),
    clearMainError: vi.fn(() => {
      state.mainErrorText = "";
    }),
  } satisfies QuizReaderView;

  const readingStore = {
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies QuizReaderReadingStore;

  const audioContext = {} as AudioContext;
  const gainNode = {} as GainNode;
  const setSoundDirHandle = vi.fn((dir: FileSystemDirectoryHandle | undefined) => {
    state.soundDirHandle = dir;
  });
  const setReadingContext = vi.fn((ctx: QuestionReadingContext | undefined) => {
    state.readingContext = ctx;
  });

  const stateDeps = {
    getAudioContext: vi.fn(() => audioContext),
    getGainNode: vi.fn(() => gainNode),
    getSoundDirHandle: vi.fn(() => state.soundDirHandle),
    setSoundDirHandle,
    getReadingContext: vi.fn(() => state.readingContext),
    setReadingContext,
    getQuestionSeed: vi.fn(() => ({ questionId: 10, soundId: "001" })),
    isAnyModalOpen: vi.fn(() => options.isAnyModalOpen ?? false),
    isOnAirEnabled: vi.fn(() => options.isOnAirEnabled ?? true),
    isQuestionFollowEnabled: vi.fn(() => options.isQuestionFollowEnabled ?? true),
    getMainErrorText: vi.fn(() => state.mainErrorText),
    setDurationText: vi.fn(),
    clearDurationText: vi.fn(),
    applyOnAirStateToUI: vi.fn(),
    onFolderSelected: vi.fn(),
    resetSampleAudioCache: vi.fn(),
  } satisfies QuizReaderOrchestratorStateDeps;

  const promptFn = vi.fn();
  const alertFn = vi.fn();
  const selectDirectoryFn = vi.fn();
  const renderStreamMessageFn = vi.fn();
  const requestAnimationFrameFn = vi.fn((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  const logger = {
    log: vi.fn(),
    error: vi.fn(),
  };

  const defaultContext = createMockReadingContext({
    voiceStatus: options.readingVoiceStatus ?? "STANDBY",
    questionId: 42,
    fullDuration: 5,
    readDuration: 3,
  });
  state.readingContext = defaultContext;

  const createQuestionReadingContextFn = vi.fn(
    (
      _questionId: number,
      _soundId: string,
      _audioContext: AudioContext,
      _dirHandle: FileSystemDirectoryHandle,
      _onLoadingStatusChanged?: (s: LoadingStatus) => void,
      _onVoiceStatusChanged?: (s: VoiceStatus) => void,
      _onFileNotFound?: (filename: string) => void,
      _outputNode?: AudioNode,
    ) => createMockReadingContext({ questionId: 10, readDuration: 2.34, fullDuration: 4.56, voiceStatus: "STANDBY" }),
  );

  const deps = {
    api,
    view,
    readingStore,
    createQuestionReadingContextFn,
    selectDirectoryFn,
    promptFn,
    alertFn,
    renderStreamMessageFn,
    requestAnimationFrameFn,
    logger,
  } satisfies QuizReaderOrchestratorDeps;

  const orchestrator = createQuizReaderOrchestrator(deps, stateDeps);
  return {
    orchestrator,
    deps,
    stateDeps,
    state,
  };
}

function createBeforeStreamRenderEvent(fallbackRender: (streamElement: HTMLElement) => void): BeforeStreamRenderEvent {
  return new CustomEvent("turbo:before-stream-render", {
    detail: {
      render: fallbackRender,
    },
  }) as BeforeStreamRenderEvent;
}

describe("createQuizReaderOrchestrator", () => {
  it("update-question 以外の stream action は fallback render を呼ぶ", () => {
    // Arrange
    const fixture = createFixture();
    const fallbackRender = vi.fn();
    const event = createBeforeStreamRenderEvent(fallbackRender);
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);
    event.detail.render(stream);

    // Assert
    expect(fallbackRender).toHaveBeenCalledWith(stream);
    expect(fixture.deps.createQuestionReadingContextFn).not.toHaveBeenCalled();
  });

  it("update-question で question-id が欠落している場合は例外を投げる", () => {
    // Arrange
    const fixture = createFixture();
    const event = createBeforeStreamRenderEvent(vi.fn());
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update-question");
    stream.setAttribute("sound-id", "001");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);

    // Assert
    expect(() => event.detail.render(stream)).toThrow("question-id が指定されていません。");
  });

  it("LOADING/LOADED 時の view 反映を行う", () => {
    // Arrange
    const fixture = createFixture();
    const dirHandle = {
      name: "sounds",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    fixture.state.soundDirHandle = dirHandle;
    fixture.deps.createQuestionReadingContextFn = vi.fn(
      (_questionId, _soundId, _audioContext, _dirHandle, onLoadingStatusChanged, onVoiceStatusChanged) =>
        createMockReadingContext({
          load: async () => {
            onLoadingStatusChanged?.("LOADING");
            onLoadingStatusChanged?.("LOADED");
            onVoiceStatusChanged?.("STANDBY");
          },
        }),
    );
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);
    const event = createBeforeStreamRenderEvent(vi.fn());
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update-question");
    stream.setAttribute("question-id", "10");
    stream.setAttribute("sound-id", "001");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);
    event.detail.render(stream);

    // Assert
    expect(fixture.deps.view.setVoiceLoadingStatusIcon).toHaveBeenNthCalledWith(1, "LOADING");
    expect(fixture.deps.view.setVoiceLoadingStatusIcon).toHaveBeenNthCalledWith(2, "LOADED");
    expect(fixture.deps.view.clearMainError).toHaveBeenCalled();
    expect(fixture.deps.view.setPlayStatusIcon).toHaveBeenCalledWith("STANDBY");
  });

  it("NotFound 時は詳細文言を維持し、汎用文言で上書きしない", () => {
    // Arrange
    const fixture = createFixture();
    const dirHandle = {
      name: "sounds",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    fixture.state.soundDirHandle = dirHandle;
    fixture.deps.createQuestionReadingContextFn = vi.fn(
      (
        _questionId,
        _soundId,
        _audioContext,
        _dirHandle,
        onLoadingStatusChanged,
        _onVoiceStatusChanged,
        onFileNotFound,
      ) =>
        createMockReadingContext({
          load: async () => {
            onFileNotFound?.("question001.wav");
            onLoadingStatusChanged?.("NOT_LOADED");
          },
        }),
    );
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);
    const event = createBeforeStreamRenderEvent(vi.fn());
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update-question");
    stream.setAttribute("question-id", "10");
    stream.setAttribute("sound-id", "001");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);
    event.detail.render(stream);

    // Assert
    expect(fixture.deps.view.showMainError).toHaveBeenCalledWith("音声ファイルが見つかりません（question001.wav）");
    expect(fixture.deps.view.showMainError).toHaveBeenCalledTimes(1);
    expect(fixture.deps.view.setVoiceLoadingStatusIcon).toHaveBeenCalledWith("NOT_LOADED");
  });

  it("非NotFound の NOT_LOADED かつ mainError が空の場合は汎用文言を表示する", () => {
    // Arrange
    const fixture = createFixture({
      initialMainErrorText: "",
    });
    const dirHandle = {
      name: "sounds",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    fixture.state.soundDirHandle = dirHandle;
    fixture.deps.createQuestionReadingContextFn = vi.fn(
      (_questionId, _soundId, _audioContext, _dirHandle, onLoadingStatusChanged) =>
        createMockReadingContext({
          load: async () => {
            onLoadingStatusChanged?.("NOT_LOADED");
          },
        }),
    );
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);
    const event = createBeforeStreamRenderEvent(vi.fn());
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update-question");
    stream.setAttribute("question-id", "10");
    stream.setAttribute("sound-id", "001");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);
    event.detail.render(stream);

    // Assert
    expect(fixture.deps.view.showMainError).toHaveBeenCalledWith("音声ファイルの読み込みに失敗しました");
  });

  it("mainError が空白のみのときも汎用文言を表示する", () => {
    // Arrange
    const fixture = createFixture({
      initialMainErrorText: "   ",
    });
    const dirHandle = {
      name: "sounds",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    fixture.state.soundDirHandle = dirHandle;
    fixture.deps.createQuestionReadingContextFn = vi.fn(
      (_questionId, _soundId, _audioContext, _dirHandle, onLoadingStatusChanged) =>
        createMockReadingContext({
          load: async () => {
            onLoadingStatusChanged?.("NOT_LOADED");
          },
        }),
    );
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);
    const event = createBeforeStreamRenderEvent(vi.fn());
    const stream = document.createElement("turbo-stream");
    stream.setAttribute("action", "update-question");
    stream.setAttribute("question-id", "10");
    stream.setAttribute("sound-id", "001");

    // Act
    fixture.orchestrator.handleBeforeStreamRender(event);
    event.detail.render(stream);

    // Assert
    expect(fixture.deps.view.showMainError).toHaveBeenCalledWith("音声ファイルの読み込みに失敗しました");
  });

  it("selectFolder 成功時に状態更新・再読込を行う", async () => {
    // Arrange
    const fixture = createFixture();
    const dirHandle = {
      name: "selected-folder",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    fixture.deps.selectDirectoryFn = vi.fn().mockResolvedValue(dirHandle);
    fixture.deps.createQuestionReadingContextFn = vi.fn(() => createMockReadingContext({}));
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);

    // Act
    await fixture.orchestrator.selectFolder();

    // Assert
    expect(fixture.stateDeps.resetSampleAudioCache).toHaveBeenCalled();
    expect(fixture.stateDeps.setSoundDirHandle).toHaveBeenCalledWith(dirHandle);
    expect(fixture.deps.view.clearMainError).toHaveBeenCalled();
    expect(fixture.stateDeps.onFolderSelected).toHaveBeenCalledWith("selected-folder");
    expect(fixture.deps.createQuestionReadingContextFn).toHaveBeenCalledWith(
      10,
      "001",
      expect.any(Object),
      dirHandle,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("selectFolder の AbortError 時は mainError を表示しない", async () => {
    // Arrange
    const fixture = createFixture();
    fixture.deps.selectDirectoryFn = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);

    // Act
    await fixture.orchestrator.selectFolder();

    // Assert
    expect(fixture.deps.view.clearMainError).toHaveBeenCalled();
    expect(fixture.deps.view.showMainError).not.toHaveBeenCalled();
  });

  it("startReading はガードを満たしたときのみ start を呼ぶ", () => {
    // Arrange
    const fixture = createFixture({
      isAnyModalOpen: false,
      isOnAirEnabled: true,
      readingVoiceStatus: "STANDBY",
    });
    fixture.state.soundDirHandle = {
      name: "sounds",
      kind: "directory",
    } as FileSystemDirectoryHandle;
    const readingContext = createMockReadingContext({
      voiceStatus: "STANDBY",
    });
    fixture.state.readingContext = readingContext;

    // Act
    fixture.orchestrator.startReading();

    // Assert
    expect(readingContext.start).toHaveBeenCalled();
  });

  it("pauseReading は保存・アップロード・表示更新を行う", async () => {
    // Arrange
    const fixture = createFixture({
      readingVoiceStatus: "PLAYING",
    });
    const readingContext = createMockReadingContext({
      voiceStatus: "PLAYING",
      questionId: 99,
      readDuration: 2.2,
      fullDuration: 4.4,
    });
    fixture.state.readingContext = readingContext;

    // Act
    await fixture.orchestrator.pauseReading();

    // Assert
    expect(readingContext.stop).toHaveBeenCalled();
    expect(fixture.stateDeps.setDurationText).toHaveBeenCalledWith("2.20 / 4.40");
    expect(fixture.deps.readingStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: 99,
        readDuration: 2.2,
      }),
    );
    expect(fixture.deps.api.uploadQuestionReading).toHaveBeenCalledWith({
      questionId: 99,
      readDuration: 2.2,
      fullDuration: 4.4,
    });
    expect(fixture.deps.view.setResultUploadingStatusIcon).toHaveBeenNthCalledWith(1, "UPLOADING");
    expect(fixture.deps.view.setResultUploadingStatusIcon).toHaveBeenNthCalledWith(2, "UPLOADED");
  });

  it("proceedToNextQuestion は問題フォローONで送出し、失敗しても next 遷移を続行する", async () => {
    // Arrange
    const fixture = createFixture({
      readingVoiceStatus: "PAUSED",
      isQuestionFollowEnabled: true,
    });
    const readingContext = createMockReadingContext({
      voiceStatus: "PAUSED",
      questionId: 42,
    });
    fixture.state.readingContext = readingContext;
    fixture.deps.api.broadcastQuestion = vi.fn().mockRejectedValue(new Error("broadcast failed"));
    fixture.orchestrator = createQuizReaderOrchestrator(fixture.deps, fixture.stateDeps);
    const event = new KeyboardEvent("keydown", { repeat: false });

    // Act
    await fixture.orchestrator.proceedToNextQuestion(event);

    // Assert
    expect(fixture.deps.api.broadcastQuestion).toHaveBeenCalledWith(42);
    expect(fixture.deps.api.fetchNextQuestionStream).toHaveBeenCalledWith("next");
    expect(fixture.deps.renderStreamMessageFn).toHaveBeenCalledWith("<turbo-stream></turbo-stream>");
    expect(fixture.stateDeps.applyOnAirStateToUI).toHaveBeenCalled();
  });
});
