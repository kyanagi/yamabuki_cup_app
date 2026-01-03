import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import {
  MockAudioBufferSourceNode,
  MockAudioContext,
  createMockAudioBuffer,
} from "../../__tests__/mocks/audio-context";
import { createQuestionReadingContext, loadAudio } from "../quiz_reader_controller";
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

describe("loadAudio", () => {
  const CACHE_NAME = "yamabuki-cup-quiz-reader";
  let mockAudioContext: MockAudioContext;
  let abortController: AbortController;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    abortController = new AbortController();
  });

  describe("U1: キャッシュヒット時", () => {
    it("fetchを呼ばずにキャッシュからデータを返す", async () => {
      // Arrange: キャッシュにデータを設定
      const testUrl = "/sample/test.wav";
      const cachedArrayBuffer = new ArrayBuffer(100);
      const cachedResponse = new Response(cachedArrayBuffer, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });

      const cache = await caches.open(CACHE_NAME);
      await cache.put(testUrl, cachedResponse);

      // decodeAudioDataのモック設定
      const expectedBuffer = createMockAudioBuffer(3.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // Assert
      expect(fetch).not.toHaveBeenCalled();
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);
    });
  });

  describe("U2: キャッシュミス時", () => {
    it("fetchしてキャッシュに保存し、AudioBufferを返す", async () => {
      // Arrange: キャッシュは空
      const testUrl = "/sample/test.wav";
      const fetchedArrayBuffer = new ArrayBuffer(200);
      const fetchResponse = new Response(fetchedArrayBuffer, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });

      vi.mocked(fetch).mockResolvedValue(fetchResponse);

      const expectedBuffer = createMockAudioBuffer(4.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // Assert
      expect(fetch).toHaveBeenCalledWith(testUrl, {
        signal: abortController.signal,
      });
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);

      // キャッシュに保存されたことを確認
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(testUrl);
      expect(cachedResponse).toBeDefined();
    });
  });

  describe("U3: fetch失敗時（4xx/5xx）", () => {
    it("404エラー時にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/notfound.wav";
      const errorResponse = new Response(null, {
        status: 404,
        statusText: "Not Found",
      });

      vi.mocked(fetch).mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow("Failed to fetch audio: 404 Not Found");

      // キャッシュに保存されていないことを確認
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(testUrl);
      expect(cachedResponse).toBeUndefined();
    });

    it("500エラー時にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/error.wav";
      const errorResponse = new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      });

      vi.mocked(fetch).mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow("Failed to fetch audio: 500 Internal Server Error");
    });
  });

  describe("U4: AbortSignalでキャンセル時", () => {
    it("中断された場合にAbortErrorをスローする", async () => {
      // Arrange
      const testUrl = "/sample/abort.wav";

      // fetchが呼ばれたときにAbortErrorをスローするようモック
      vi.mocked(fetch).mockImplementation(async (_url, options) => {
        if (options?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        // シグナルがabortされるまで待機
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      // Act: fetchが開始された後にabort
      const loadPromise = loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // 即座にabort
      abortController.abort();

      // Assert
      await expect(loadPromise).rejects.toThrow();
      // DOMExceptionの場合、nameでAbortErrorを確認
      await expect(loadPromise).rejects.toMatchObject({
        name: "AbortError",
      });
    });

    it("既にabortされたシグナルで呼び出された場合にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/already-aborted.wav";

      // 事前にabort
      abortController.abort();

      vi.mocked(fetch).mockImplementation(async (_url, options) => {
        if (options?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return new Response(new ArrayBuffer(100), { status: 200 });
      });

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow();
    });
  });
});

describe("createQuestionReadingContext", () => {
  const CACHE_NAME = "yamabuki-cup-quiz-reader";
  let mockAudioContext: MockAudioContext;
  let voiceStatusHistory: VoiceStatus[];
  let loadingStatusHistory: LoadingStatus[];

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    voiceStatusHistory = [];
    loadingStatusHistory = [];

    // 音声ファイルのfetchをモック
    vi.mocked(fetch).mockImplementation(async (url) => {
      return new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });
    });

    // decodeAudioDataのモック
    mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(createMockAudioBuffer(5.0));

    // 自動再生完了を有効化
    MockAudioBufferSourceNode.autoComplete = true;
  });

  afterEach(() => {
    MockAudioBufferSourceNode.autoComplete = true;
  });

  function createContext() {
    return createQuestionReadingContext(
      1,
      "001",
      mockAudioContext as unknown as AudioContext,
      (s) => loadingStatusHistory.push(s),
      (s) => voiceStatusHistory.push(s),
    );
  }

  describe("U6: 初期状態", () => {
    it("voiceStatusがSTANDBYである", () => {
      // Act
      const context = createContext();

      // Assert
      expect(context.voiceStatus).toBe("STANDBY");
      // コールバックも呼ばれる
      expect(voiceStatusHistory).toContain("STANDBY");
    });
  });

  describe("U11: start()呼び出し時", () => {
    it("voiceStatusがPLAYINGに変わる", async () => {
      // Arrange
      const context = createContext();

      // Act
      const startPromise = context.start();

      // Assert: start()が呼ばれた直後にPLAYINGになる
      expect(context.voiceStatus).toBe("PLAYING");
      expect(voiceStatusHistory).toContain("PLAYING");

      // 完了を待つ
      await startPromise;
    });

    it("STANDBY以外の状態では何もしない", async () => {
      // Arrange
      const context = createContext();

      // 一度start()を呼んでPLAYINGにする
      const firstStart = context.start();
      expect(context.voiceStatus).toBe("PLAYING");

      // Act: もう一度start()を呼ぶ
      const secondStart = context.start();

      // Assert: 状態は変わらない
      expect(context.voiceStatus).toBe("PLAYING");

      await firstStart;
      await secondStart;
    });
  });

  describe("U12: stop()呼び出し時", () => {
    it("voiceStatusがPAUSEDに変わる", async () => {
      // Arrange: 再生中の状態にする
      const context = createContext();
      MockAudioBufferSourceNode.autoComplete = false; // 自動完了を無効化

      // start()を呼ぶが、完了を待たない（再生中の状態を維持）
      const startPromise = context.start();

      // load完了まで待つ
      await context.load();

      // Assert: PLAYINGになっている
      expect(context.voiceStatus).toBe("PLAYING");

      // Act: stop()を呼ぶ
      context.stop();

      // Assert: PAUSEDになる
      expect(context.voiceStatus).toBe("PAUSED");
      expect(voiceStatusHistory).toContain("PAUSED");
    });
  });

  describe("状態遷移のフロー", () => {
    it("STANDBY → PLAYING → PAUSED の遷移が正しく動作する", async () => {
      // Arrange
      const context = createContext();
      MockAudioBufferSourceNode.autoComplete = false;

      // Assert: 初期状態
      expect(context.voiceStatus).toBe("STANDBY");

      // Act & Assert: start() で PLAYING
      const startPromise = context.start();
      await context.load();
      expect(context.voiceStatus).toBe("PLAYING");

      // Act & Assert: stop() で PAUSED
      context.stop();
      expect(context.voiceStatus).toBe("PAUSED");

      // 状態遷移の履歴を確認
      expect(voiceStatusHistory).toEqual(["STANDBY", "PLAYING", "PAUSED"]);
    });

    it("reset()でSTANDBYに戻る", async () => {
      // Arrange
      const context = createContext();
      MockAudioBufferSourceNode.autoComplete = false;

      // start() → stop() で PAUSED にする
      context.start();
      await context.load();
      context.stop();
      expect(context.voiceStatus).toBe("PAUSED");

      // Act
      context.reset();

      // Assert
      expect(context.voiceStatus).toBe("STANDBY");
    });
  });
});

describe("QuizReaderController (統合テスト)", () => {
  beforeEach(() => {
    // idbモックを再設定（vi.resetAllMocksでリセットされるため）
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // fetchのモック設定
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });
    });
  });

  describe("I1: connect() ライフサイクル", () => {
    it("AudioContextが作成される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const AudioContextSpy = vi.fn(MockAudioContext);
      vi.stubGlobal("AudioContext", AudioContextSpy);

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      expect(AudioContextSpy).toHaveBeenCalled();

      // Cleanup
      teardownControllerTest(application);
    });

    it("キャッシュが削除される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // 事前にキャッシュを設定
      const cache = await caches.open("yamabuki-cup-quiz-reader");
      await cache.put("/test.wav", new Response(new ArrayBuffer(10)));

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert: 事前にキャッシュしたアイテムが削除されている
      // connect()でcaches.deleteが呼ばれた後、新しい音声がfetchされキャッシュに保存されるが、
      // 古いキャッシュエントリ(/test.wav)は削除されている
      const newCache = await caches.open("yamabuki-cup-quiz-reader");
      const oldCachedResponse = await newCache.match("/test.wav");
      expect(oldCachedResponse).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("I4: startReading() 音声再生", () => {
    it("isOnAir=trueの場合、音声再生が開始される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      MockAudioBufferSourceNode.autoComplete = false;

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Act
      (controller as { startReading: () => void }).startReading();

      // Assert: 再生アイコンが表示される（playIconからis-hiddenが削除される）
      await new Promise((resolve) => setTimeout(resolve, 50));
      const playIcon = document.querySelector('[data-quiz-reader-target~="playIcon"]');
      expect(playIcon?.classList.contains("is-hidden")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });

    it("isOnAir=falseの場合、音声再生されない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: false });

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Act
      (controller as { startReading: () => void }).startReading();

      // Assert: 停止アイコンが表示されたまま（STANDBYのまま）
      await new Promise((resolve) => setTimeout(resolve, 50));
      const stopIcon = document.querySelector('[data-quiz-reader-target~="stopIcon"]');
      expect(stopIcon?.classList.contains("is-hidden")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});

describe("外部連携テスト", () => {
  beforeEach(() => {
    // idbモックを再設定（vi.resetAllMocksでリセットされるため）
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // fetchのモック設定
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });
    });

    // Turboモックのリセット
    mockRenderStreamMessage.mockReset();
  });

  describe("T1: Turbo Stream連携", () => {
    it("proceedToQuestionでrenderStreamMessageが呼ばれる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      MockAudioBufferSourceNode.autoComplete = false;

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // start() を呼んで PLAYING にする
      (controller as { startReading: () => void }).startReading();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // stop() を呼んで PAUSED にする（proceedToQuestionはPAUSED状態でのみ動作）
      (controller as { pauseReading: () => void }).pauseReading();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Turbo Streamレスポンスをモック
      const turboStreamHtml =
        '<turbo-stream action="replace" target="question"><template>新しい問題</template></turbo-stream>';
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(turboStreamHtml, {
          status: 200,
          headers: { "Content-Type": "text/vnd.turbo-stream.html" },
        }),
      );

      // Act: proceedToQuestionを呼ぶ（KeyboardEventをシミュレート）
      const keyEvent = new KeyboardEvent("keydown", { key: "n", repeat: false });
      await (controller as { proceedToNextQuestion: (e: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
        keyEvent,
      );

      // fetchの完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockRenderStreamMessage).toHaveBeenCalledWith(turboStreamHtml);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("D1: IndexedDB保存", () => {
    it("pauseReadingでIndexedDBに問い読み結果が保存される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      MockAudioBufferSourceNode.autoComplete = false;

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // start() を呼んで PLAYING にする
      (controller as { startReading: () => void }).startReading();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act: pause() を呼んで保存をトリガー
      (controller as { pauseReading: () => void }).pauseReading();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert: IndexedDBのaddが呼ばれた
      expect(mockIdbAdd).toHaveBeenCalledWith(
        "question-readings",
        expect.objectContaining({
          questionId: 1,
          readDuration: expect.any(Number),
          timestamp: expect.any(String),
        }),
      );

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("A1: アップロード", () => {
    it("pauseReadingでサーバーにPOSTリクエストが送信される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
      MockAudioBufferSourceNode.autoComplete = false;

      // 音声fetch用とアップロード用のモックを設定
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockImplementation(async (url) => {
        if (typeof url === "string" && url.includes("question_readings")) {
          // アップロード用のレスポンス
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        // 音声fetch用のレスポンス
        return new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { "Content-Type": "audio/wav" },
        });
      });

      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 音声のロードを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // start() を呼んで PLAYING にする
      (controller as { startReading: () => void }).startReading();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act: pause() を呼んでアップロードをトリガー
      (controller as { pauseReading: () => void }).pauseReading();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: POSTリクエストが送信された
      const postCalls = fetchMock.mock.calls.filter((call) => {
        const url = call[0];
        return typeof url === "string" && url.includes("question_readings");
      });

      expect(postCalls.length).toBeGreaterThan(0);

      const [url, options] = postCalls[0];
      expect(url).toBe("/admin/quiz_reader/question_readings");
      expect(options).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-CSRF-Token": "test-csrf-token",
        }),
      });

      // bodyの検証
      const body = JSON.parse(options?.body as string);
      expect(body).toMatchObject({
        question_id: 1,
        read_duration: expect.any(Number),
        full_duration: expect.any(Number),
      });

      // Cleanup
      teardownControllerTest(application);
    });
  });
});
