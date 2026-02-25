import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { testQuestionId } from "../../__tests__/helpers/question-id";
import { testSoundId } from "../../__tests__/helpers/sound-id";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { createMockAudioBuffer, MockAudioContext, MockGainNode } from "../../__tests__/mocks/audio-context";
import QuizReaderController, { createQuestionReadingContext } from "../quiz_reader_controller";
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

describe("音量調整機能", () => {
  const VOLUME_STORAGE_KEY = "quiz-reader-volume";
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // localStorageをモック
    mockLocalStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    // AudioContextをモック
    vi.stubGlobal("AudioContext", MockAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("setVolumeFromSlider", () => {
    it("gainNode.gain.valueを正しく設定する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act: スライダー値を50に設定
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      slider.value = "50";
      slider.dispatchEvent(new Event("input"));

      // Assert
      expect(mockGainNode.gain.value).toBe(0.5);

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageに保存する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      slider.value = "75";
      slider.dispatchEvent(new Event("input"));

      // Assert
      expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe("75");

      // Cleanup
      teardownControllerTest(application);
    });

    it("数値入力欄も同期される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      slider.value = "30";
      slider.dispatchEvent(new Event("input"));

      // Assert
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      expect(volumeInput.value).toBe("30");

      // Cleanup
      teardownControllerTest(application);
    });

    it("gainNodeがなくてもlocalStorageと数値入力欄は更新される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをundefinedに設定
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = undefined;

      // Act
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      slider.value = "25";
      slider.dispatchEvent(new Event("input"));

      // Assert: localStorageと数値入力欄は更新される
      expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe("25");
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      expect(volumeInput.value).toBe("25");

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("setVolumeFromInput", () => {
    it("gainNode.gain.valueを正しく設定する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act: 数値入力欄に値を設定
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "50";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      expect(mockGainNode.gain.value).toBe(0.5);

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageに保存する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "75";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe("75");

      // Cleanup
      teardownControllerTest(application);
    });

    it("スライダーも同期される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "30";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      expect(slider.value).toBe("30");

      // Cleanup
      teardownControllerTest(application);
    });

    it("範囲外の値（負の数）は0にクランプされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "-10";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      expect(mockGainNode.gain.value).toBe(0);
      expect(volumeInput.value).toBe("0");
      expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe("0");

      // Cleanup
      teardownControllerTest(application);
    });

    it("範囲外の値（100超）は100にクランプされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "150";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      expect(mockGainNode.gain.value).toBe(1);
      expect(volumeInput.value).toBe("100");
      expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe("100");

      // Cleanup
      teardownControllerTest(application);
    });

    it("小数は整数に丸められる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "50.7";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert
      expect(mockGainNode.gain.value).toBe(0.51);
      expect(volumeInput.value).toBe("51");

      // Cleanup
      teardownControllerTest(application);
    });

    it("非数値（abc）の場合は0になる（input type=numberの仕様により空文字列として扱われる）", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act: 数値でない文字列を入力
      // Note: input type="number"では非数値を設定すると空文字列になる（ブラウザの仕様）
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "abc";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert: input type="number"のvalueは""（空文字列）になり、Number("")は0
      expect(mockGainNode.gain.value).toBe(0);
      expect(volumeInput.value).toBe("0");

      // Cleanup
      teardownControllerTest(application);
    });

    it("空欄の場合は0になる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // gainNodeをモック
      const mockGainNode = new MockGainNode();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).gainNode = mockGainNode;

      // Act: 空欄を入力（Number("")は0になる）
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      volumeInput.value = "";
      volumeInput.dispatchEvent(new Event("input"));

      // Assert: Number("")は0なので0になる
      expect(mockGainNode.gain.value).toBe(0);
      expect(volumeInput.value).toBe("0");

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("localStorage復元", () => {
    it("connect()時にlocalStorageから音量が復元される", async () => {
      // Arrange: 事前にlocalStorageに値を設定
      mockLocalStorage[VOLUME_STORAGE_KEY] = "60";

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert: gainNodeの値が復元される
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      const gainNode = (controller as any).gainNode;
      expect(gainNode.gain.value).toBe(0.6);

      // スライダーの値も復元される
      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      expect(slider.value).toBe("60");

      // 数値入力欄も復元される
      const volumeInput = document.querySelector('[data-quiz-reader-target~="volumeInput"]') as HTMLInputElement;
      expect(volumeInput.value).toBe("60");

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageがnullの場合はデフォルト100になる", async () => {
      // Arrange: localStorageは空（mockLocalStorageにキーがない状態）
      delete mockLocalStorage[VOLUME_STORAGE_KEY];

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert: デフォルト値100が使用される
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      const gainNode = (controller as any).gainNode;
      expect(gainNode.gain.value).toBe(1.0);

      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      expect(slider.value).toBe("100");

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageがNaNの場合はデフォルト100になる", async () => {
      // Arrange: 無効な値を設定
      mockLocalStorage[VOLUME_STORAGE_KEY] = "invalid";

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert: デフォルト値100が使用される
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      const gainNode = (controller as any).gainNode;
      expect(gainNode.gain.value).toBe(1.0);

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageが範囲外（負の値）の場合は0にクランプされる", async () => {
      // Arrange: 範囲外の値を設定
      mockLocalStorage[VOLUME_STORAGE_KEY] = "-10";

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert: 0にクランプされる
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      const gainNode = (controller as any).gainNode;
      expect(gainNode.gain.value).toBe(0.0);

      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      expect(slider.value).toBe("0");

      // Cleanup
      teardownControllerTest(application);
    });

    it("localStorageが範囲外（100超）の場合は100にクランプされる", async () => {
      // Arrange: 範囲外の値を設定
      mockLocalStorage[VOLUME_STORAGE_KEY] = "150";

      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert: 100にクランプされる
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      const gainNode = (controller as any).gainNode;
      expect(gainNode.gain.value).toBe(1.0);

      const slider = document.querySelector('[data-quiz-reader-target~="volumeSlider"]') as HTMLInputElement;
      expect(slider.value).toBe("100");

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("createQuestionReadingContext outputNode接続", () => {
    it("渡されたoutputNodeに接続してもエラーが発生しない", async () => {
      // Arrange
      const mockAudioContext = new MockAudioContext();
      const mockDirHandle = createMockDirectoryHandle({
        "mondai.wav": new ArrayBuffer(100),
        "question001.wav": new ArrayBuffer(100),
      });
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(createMockAudioBuffer(5.0));

      // outputNodeとしてMockGainNodeを使用
      const mockOutputNode = new MockGainNode();

      // Act & Assert: outputNodeを渡してもエラーなくコンテキストが作成できる
      const context = createQuestionReadingContext(
        testQuestionId(1),
        testSoundId("001"),
        mockAudioContext as unknown as AudioContext,
        mockDirHandle,
        undefined,
        undefined,
        undefined,
        mockOutputNode as unknown as AudioNode,
      );

      // コンテキストが正常に作成される
      expect(context).toBeDefined();
      expect(context.voiceStatus).toBe("STANDBY");

      // ロードが正常に完了する
      await context.load();
      expect(context.fullDuration).toBe(5.0);
    });
  });
});
