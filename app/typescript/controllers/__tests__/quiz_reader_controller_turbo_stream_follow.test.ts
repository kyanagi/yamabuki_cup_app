import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { waitForCondition } from "../../__tests__/helpers/wait_for_condition";
import type { MockAudioContext } from "../../__tests__/mocks/audio-context";
import QuizReaderController from "../quiz_reader_controller";
import { createMockDirectoryHandle } from "./quiz_reader_controller_test_helpers";

// vi.hoisted() でモック関数を事前に定義（vi.mockのホイスティングに対応）
const { mockIdbAdd, mockIdbGetAll, mockRenderStreamMessage, mockOpenDB } = vi.hoisted(() => {
  const add = vi.fn().mockResolvedValue(1);
  const getAll = vi.fn().mockResolvedValue([]);
  const openDB = vi.fn().mockResolvedValue({ add, getAll });
  const renderStreamMessage = vi.fn();
  return {
    mockIdbAdd: add,
    mockIdbGetAll: getAll,
    mockOpenDB: openDB,
    mockRenderStreamMessage: renderStreamMessage,
  };
});

// idb モジュールをトップレベルでモック
vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

// Turbo モジュールをトップレベルでモック
vi.mock("@hotwired/turbo-rails", () => ({
  Turbo: {
    renderStreamMessage: mockRenderStreamMessage,
  },
}));

describe("Turbo差し替え後のUI追従", () => {
  type BeforeStreamRenderEvent = CustomEvent<{
    render: (streamElement: HTMLElement) => void;
  }>;
  type ControllerInternals = {
    soundDirHandle?: FileSystemDirectoryHandle;
    audioContext?: MockAudioContext;
  };
  let application: Parameters<typeof teardownControllerTest>[0] | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
    if (application) {
      teardownControllerTest(application);
      application = undefined;
    }
    for (const streamElement of document.querySelectorAll("turbo-stream")) {
      streamElement.remove();
    }
  });

  function dispatchBeforeStreamRender(
    streamElement: HTMLElement,
    fallbackRender: (streamElement: HTMLElement) => void,
  ): BeforeStreamRenderEvent {
    const event = new CustomEvent("turbo:before-stream-render", {
      bubbles: true,
      detail: {
        render: fallbackRender,
      },
    }) as BeforeStreamRenderEvent;
    streamElement.dispatchEvent(event);
    return event;
  }

  function replacedNextQuestionsHtml() {
    return `
      <div class="box" data-quiz-reader-target="nextQuestionBox">
        <div data-quiz-reader-target="nextQuestionContent"></div>
        <p>
          <span id="new-loading-icon" data-quiz-reader-target="voiceLoadingStatusIcon voiceLoadingIcon" class="is-hidden"></span>
          <span id="new-loaded-icon" data-quiz-reader-target="voiceLoadingStatusIcon voiceLoadedIcon" class="is-hidden"></span>
          <span id="new-load-error-icon" data-quiz-reader-target="voiceLoadingStatusIcon voiceLoadErrorIcon" class="is-hidden"></span>
          <span id="new-stop-icon" data-quiz-reader-target="playStatusIcon stopIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="playStatusIcon playIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="playStatusIcon pauseIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadingIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadedIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadErrorIcon" class="is-hidden"></span>
          <span data-quiz-reader-target="duration"></span>
        </p>
      </div>
      <div class="box" data-quiz-reader-target="next2QuestionBox">
        <div data-quiz-reader-target="next2QuestionContent"></div>
      </div>
    `;
  }

  function isVisible(elementId: string): boolean {
    const element = document.getElementById(elementId);
    return element?.classList.contains("is-hidden") === false;
  }

  async function performTurboUpdateSequence(
    questionId: string,
    soundId: string,
    waitCondition: () => boolean,
  ): Promise<void> {
    const nextQuestions = document.querySelector('[data-quiz-reader-target~="nextQuestions"]') as HTMLElement;

    const updateStream = document.createElement("turbo-stream");
    updateStream.setAttribute("action", "update");
    updateStream.setAttribute("target", "next_questions");
    document.body.appendChild(updateStream);

    const updateEvent = dispatchBeforeStreamRender(updateStream, () => {
      nextQuestions.innerHTML = replacedNextQuestionsHtml();
    });
    updateEvent.detail.render(updateStream);

    const updateQuestionStream = document.createElement("turbo-stream");
    updateQuestionStream.setAttribute("action", "update-question");
    updateQuestionStream.setAttribute("question-id", questionId);
    updateQuestionStream.setAttribute("sound-id", soundId);
    document.body.appendChild(updateQuestionStream);

    const updateQuestionFallback = vi.fn();
    const updateQuestionEvent = dispatchBeforeStreamRender(updateQuestionStream, updateQuestionFallback);
    updateQuestionEvent.detail.render(updateQuestionStream);
    expect(updateQuestionFallback).not.toHaveBeenCalled();

    await waitForCondition(waitCondition);
  }

  it("update → update-question の順序で新DOMのアイコンへ状態反映される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
    const context = await setupControllerTest(QuizReaderController, html, "quiz-reader");
    application = context.application;
    const { controller } = context;

    const oldLoadedIcon = document.querySelector('[data-quiz-reader-target~="voiceLoadedIcon"]');
    const dirHandle = createMockDirectoryHandle({
      "mondai.wav": new ArrayBuffer(100),
      "question001.wav": new ArrayBuffer(100),
    });
    (controller as unknown as ControllerInternals).soundDirHandle = dirHandle;

    // Act
    await performTurboUpdateSequence("1", "001", () => isVisible("new-loaded-icon") && isVisible("new-stop-icon"));

    // Assert
    expect(oldLoadedIcon).not.toBeNull();
    expect(document.contains(oldLoadedIcon as Node)).toBe(false);
    const newLoadedIcon = document.getElementById("new-loaded-icon");
    const newStopIcon = document.getElementById("new-stop-icon");
    expect(newLoadedIcon?.classList.contains("is-hidden")).toBe(false);
    expect(newStopIcon?.classList.contains("is-hidden")).toBe(false);
  });

  it("NotFound時はNOT_LOADEDでエラーアイコン表示し、既存の詳細文言を維持する", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
    const context = await setupControllerTest(QuizReaderController, html, "quiz-reader");
    application = context.application;
    const { controller } = context;
    const dirHandle = createMockDirectoryHandle({
      "mondai.wav": new ArrayBuffer(100),
      // question001.wav は欠落させる
    });
    (controller as unknown as ControllerInternals).soundDirHandle = dirHandle;

    // Act
    await performTurboUpdateSequence(
      "1",
      "001",
      () =>
        isVisible("new-load-error-icon") &&
        document.querySelector('[data-quiz-reader-target~="mainError"]')?.textContent ===
          "音声ファイルが見つかりません（question001.wav）",
    );

    // Assert
    const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');
    const newLoadErrorIcon = document.getElementById("new-load-error-icon");
    expect(newLoadErrorIcon?.classList.contains("is-hidden")).toBe(false);
    expect(mainError?.textContent).toBe("音声ファイルが見つかりません（question001.wav）");
  });

  it("NotFound以外のNOT_LOADED時は汎用文言を表示する", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
    const context = await setupControllerTest(QuizReaderController, html, "quiz-reader");
    application = context.application;
    const { controller } = context;
    const dirHandle = createMockDirectoryHandle({
      "mondai.wav": new ArrayBuffer(100),
      "question001.wav": new ArrayBuffer(100),
    });
    const internals = controller as unknown as ControllerInternals;
    internals.soundDirHandle = dirHandle;
    if (!internals.audioContext) {
      throw new Error("AudioContext の取得に失敗しました");
    }
    internals.audioContext.decodeAudioData = vi.fn().mockRejectedValue(new Error("decode failed"));
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await performTurboUpdateSequence(
      "1",
      "001",
      () =>
        isVisible("new-load-error-icon") &&
        document.querySelector('[data-quiz-reader-target~="mainError"]')?.textContent ===
          "音声ファイルの読み込みに失敗しました",
    );

    // Assert
    const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');
    const newLoadErrorIcon = document.getElementById("new-load-error-icon");
    expect(newLoadErrorIcon?.classList.contains("is-hidden")).toBe(false);
    expect(mainError?.textContent).toBe("音声ファイルの読み込みに失敗しました");
  });
});
