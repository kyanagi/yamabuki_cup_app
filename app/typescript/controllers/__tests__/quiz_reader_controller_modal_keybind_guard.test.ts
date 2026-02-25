import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { MockAudioContext } from "../../__tests__/mocks/audio-context";
import type { LoadingStatus, VoiceStatus } from "../quiz_reader_controller";
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

describe("モーダル表示時のキーバインド無効化", () => {
  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // AudioContextをモック
    vi.stubGlobal("AudioContext", MockAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("設定モーダルが開いているとき", () => {
    it("startReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開く
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // フォルダエラーを監視（startReadingが実行されるとエラーが表示される）
      const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');

      // Act
      (controller as { startReading: () => void }).startReading();

      // Assert: 何も実行されない（フォルダエラーが表示されない）
      expect(mainError?.classList.contains("is-hidden")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });

    it("pauseReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開く
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // readingContextをモック（PLAYING状態）
      const mockReadingContext = {
        voiceStatus: "PLAYING" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      (controller as { pauseReading: () => void }).pauseReading();

      // Assert: stopは呼ばれない
      expect(mockReadingContext.stop).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("proceedToNextQuestionは何も実行しない", async () => {
      // Arrange
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開く
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // readingContextをモック（PAUSED状態）
      const mockReadingContext = {
        voiceStatus: "PAUSED" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 3.0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
      await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
        event,
      );

      // Assert: fetchは呼ばれない
      expect(fetchSpy).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("resetReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開く
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // readingContextをモック（PAUSED状態）
      const mockReadingContext = {
        voiceStatus: "PAUSED" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 3.0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      (controller as { resetReading: () => void }).resetReading();

      // Assert: resetは呼ばれない
      expect(mockReadingContext.reset).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("モーダルが閉じているとき", () => {
    it("startReadingは通常通り実行される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルは閉じたまま（is-activeなし）
      const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');

      // Act: フォルダ未選択なのでエラーが表示されるはず
      (controller as { startReading: () => void }).startReading();

      // Assert: エラーが表示される（= startReadingが実行された）
      expect(mainError?.classList.contains("is-hidden")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("任意のモーダル（問題詳細モーダルなど）が開いているとき", () => {
    /**
     * quiz-readerコントローラー要素内に問題詳細モーダルをシミュレートするHTMLを追加
     */
    function addQuestionDetailModalToController(isActive: boolean): HTMLElement {
      const controllerElement = document.querySelector('[data-controller="quiz-reader"]');
      const modalDiv = document.createElement("div");
      modalDiv.className = isActive ? "modal is-active" : "modal";
      modalDiv.setAttribute("data-modal-target", "modal");
      modalDiv.innerHTML = `
        <div class="modal-background"></div>
        <div class="modal-content">
          <div class="box">
            <h2>問題詳細</h2>
          </div>
        </div>
      `;
      controllerElement?.appendChild(modalDiv);
      return modalDiv;
    }

    it("startReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 問題詳細モーダルを追加して開く
      addQuestionDetailModalToController(true);

      // フォルダエラーを監視
      const mainError = document.querySelector('[data-quiz-reader-target~="mainError"]');

      // Act
      (controller as { startReading: () => void }).startReading();

      // Assert: 何も実行されない（フォルダエラーが表示されない）
      expect(mainError?.classList.contains("is-hidden")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });

    it("pauseReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 問題詳細モーダルを追加して開く
      addQuestionDetailModalToController(true);

      // readingContextをモック（PLAYING状態）
      const mockReadingContext = {
        voiceStatus: "PLAYING" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      (controller as { pauseReading: () => void }).pauseReading();

      // Assert: stopは呼ばれない
      expect(mockReadingContext.stop).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("proceedToNextQuestionは何も実行しない", async () => {
      // Arrange
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 問題詳細モーダルを追加して開く
      addQuestionDetailModalToController(true);

      // readingContextをモック（PAUSED状態）
      const mockReadingContext = {
        voiceStatus: "PAUSED" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 3.0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
      await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
        event,
      );

      // Assert: fetchは呼ばれない
      expect(fetchSpy).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("resetReadingは何も実行しない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 問題詳細モーダルを追加して開く
      addQuestionDetailModalToController(true);

      // readingContextをモック（PAUSED状態）
      const mockReadingContext = {
        voiceStatus: "PAUSED" as VoiceStatus,
        questionId: 1,
        fullDuration: 5.0,
        readDuration: 3.0,
        load: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
        loadingStatus: "LOADED" as LoadingStatus,
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).readingContext = mockReadingContext;

      // Act
      (controller as { resetReading: () => void }).resetReading();

      // Assert: resetは呼ばれない
      expect(mockReadingContext.reset).not.toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });
  });
});
