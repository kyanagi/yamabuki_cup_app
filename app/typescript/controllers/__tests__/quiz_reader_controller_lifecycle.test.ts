import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { MockAudioContext } from "../../__tests__/mocks/audio-context";
import QuizReaderController from "../quiz_reader_controller";

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

describe("QuizReaderController (統合テスト)", () => {
  beforeEach(() => {
    // idbモックを再設定（vi.resetAllMocksでリセットされるため）
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  describe("I1: connect() ライフサイクル", () => {
    it("AudioContextが作成される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const AudioContextSpy = vi.fn(function AudioContextSpy() {
        return new MockAudioContext();
      });
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(AudioContextSpy).toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("questionIdValue が 0 の場合は接続時に fail-fast し、副作用を発生させない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 0, soundId: "001" });
      const AudioContextSpy = vi.fn(function AudioContextSpy() {
        return new MockAudioContext();
      });
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some(
            (arg) =>
              arg instanceof Error &&
              arg.message === "data-quiz-reader-question-id-value は1以上の整数で指定してください。",
          ),
        ),
      ).toBe(true);
      expect(AudioContextSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.some(([eventName]) => eventName === "turbo:before-stream-render")).toBe(
        false,
      );

      // Cleanup
      teardownControllerTest(application);
      consoleErrorSpy.mockRestore();
      addEventListenerSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("questionIdValue 属性が欠落している場合は接続時に fail-fast し、副作用を発生させない", async () => {
      // Arrange
      const html = createQuizReaderHTML({
        soundId: "001",
        omitQuestionIdValue: true,
      });
      const AudioContextSpy = vi.fn(function AudioContextSpy() {
        return new MockAudioContext();
      });
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some(
            (arg) =>
              arg instanceof Error && arg.message === "data-quiz-reader-question-id-value が指定されていません。",
          ),
        ),
      ).toBe(true);
      expect(AudioContextSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.some(([eventName]) => eventName === "turbo:before-stream-render")).toBe(
        false,
      );

      // Cleanup
      teardownControllerTest(application);
      consoleErrorSpy.mockRestore();
      addEventListenerSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("soundIdValue が空文字の場合は接続時に fail-fast し、副作用を発生させない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "" });
      const AudioContextSpy = vi.fn(function AudioContextSpy() {
        return new MockAudioContext();
      });
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some(
            (arg) =>
              arg instanceof Error &&
              arg.message === "data-quiz-reader-sound-id-value は空文字以外で指定してください。",
          ),
        ),
      ).toBe(true);
      expect(AudioContextSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.some(([eventName]) => eventName === "turbo:before-stream-render")).toBe(
        false,
      );

      // Cleanup
      teardownControllerTest(application);
      consoleErrorSpy.mockRestore();
      addEventListenerSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("soundIdValue 属性が欠落している場合は接続時に fail-fast し、副作用を発生させない", async () => {
      // Arrange
      const html = createQuizReaderHTML({
        questionId: 1,
        omitSoundIdValue: true,
      });
      const AudioContextSpy = vi.fn(function AudioContextSpy() {
        return new MockAudioContext();
      });
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some(
            (arg) => arg instanceof Error && arg.message === "data-quiz-reader-sound-id-value が指定されていません。",
          ),
        ),
      ).toBe(true);
      expect(AudioContextSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.some(([eventName]) => eventName === "turbo:before-stream-render")).toBe(
        false,
      );

      // Cleanup
      teardownControllerTest(application);
      consoleErrorSpy.mockRestore();
      addEventListenerSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe("I4: startReading() フォルダ未選択時", () => {
    it("フォルダ未選択時はエラーが表示される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act: フォルダ未選択のまま startReading を呼ぶ
      (controller as { startReading: () => void }).startReading();

      // Assert: エラーメッセージが表示される
      await new Promise((resolve) => setTimeout(resolve, 50));
      const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');
      expect(mainError?.textContent).toBe("再生するには音声フォルダの選択が必要です");
      expect(mainError?.classList.contains("is-hidden")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });

    it("isOnAir=falseの場合、音声再生されない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: false });

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      (controller as { startReading: () => void }).startReading();

      // Assert: 何も変わらない（フォルダエラーも表示されない）
      await new Promise((resolve) => setTimeout(resolve, 50));
      const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');
      // isOnAir=false なので、フォルダ未選択エラーも表示されない
      expect(mainError?.textContent).toBe("");
      expect(mainError?.classList.contains("is-hidden")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});
