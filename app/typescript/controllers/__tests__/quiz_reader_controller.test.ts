import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import {
  createMockAudioBuffer,
  MockAudioBufferSourceNode,
  MockAudioContext,
  MockGainNode,
} from "../../__tests__/mocks/audio-context";
import type { LoadingStatus, VoiceStatus } from "../quiz_reader_controller";
import QuizReaderController, { createQuestionReadingContext, loadAudioFromLocalFile } from "../quiz_reader_controller";

// FileSystemDirectoryHandle のモック
function createMockDirectoryHandle(files: Record<string, ArrayBuffer>): FileSystemDirectoryHandle {
  return {
    name: "test-folder",
    kind: "directory",
    async getFileHandle(fileName: string) {
      const fileData = files[fileName];
      if (fileData === undefined) {
        throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
      }
      return {
        kind: "file",
        name: fileName,
        async getFile() {
          // jsdom では File.arrayBuffer() がサポートされていないため、
          // モックオブジェクトで arrayBuffer() メソッドを提供
          return {
            name: fileName,
            type: "audio/wav",
            size: fileData.byteLength,
            async arrayBuffer() {
              return fileData;
            },
          } as unknown as File;
        },
      } as FileSystemFileHandle;
    },
  } as FileSystemDirectoryHandle;
}

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

describe("loadAudioFromLocalFile", () => {
  let mockAudioContext: MockAudioContext;
  let abortController: AbortController;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    abortController = new AbortController();
  });

  describe("U1: ファイルが存在する場合", () => {
    it("ローカルファイルからAudioBufferを返す", async () => {
      // Arrange
      const testArrayBuffer = new ArrayBuffer(100);
      const dirHandle = createMockDirectoryHandle({
        "test.wav": testArrayBuffer,
      });

      const expectedBuffer = createMockAudioBuffer(3.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudioFromLocalFile(
        "test.wav",
        dirHandle,
        mockAudioContext as unknown as AudioContext,
        abortController.signal,
      );

      // Assert
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);
    });
  });

  describe("U2: ファイルが存在しない場合", () => {
    it("NotFoundErrorをスローする", async () => {
      // Arrange
      const dirHandle = createMockDirectoryHandle({});

      // Act & Assert
      await expect(
        loadAudioFromLocalFile(
          "notfound.wav",
          dirHandle,
          mockAudioContext as unknown as AudioContext,
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        name: "NotFoundError",
      });
    });
  });

  describe("U3: AbortSignalでキャンセル時", () => {
    it("既にabortされたシグナルで呼び出された場合にAbortErrorをスローする", async () => {
      // Arrange
      const testArrayBuffer = new ArrayBuffer(100);
      const dirHandle = createMockDirectoryHandle({
        "test.wav": testArrayBuffer,
      });

      // 事前にabort
      abortController.abort();

      // Act & Assert
      await expect(
        loadAudioFromLocalFile(
          "test.wav",
          dirHandle,
          mockAudioContext as unknown as AudioContext,
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        name: "AbortError",
      });
    });
  });
});

describe("createQuestionReadingContext", () => {
  let mockAudioContext: MockAudioContext;
  let mockDirHandle: FileSystemDirectoryHandle;
  let voiceStatusHistory: VoiceStatus[];
  let loadingStatusHistory: LoadingStatus[];
  let fileNotFoundHistory: string[];

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    voiceStatusHistory = [];
    loadingStatusHistory = [];
    fileNotFoundHistory = [];

    // ローカルファイルのモック
    mockDirHandle = createMockDirectoryHandle({
      "mondai.wav": new ArrayBuffer(100),
      "question001.wav": new ArrayBuffer(100),
    });

    // decodeAudioDataのモック
    mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(createMockAudioBuffer(5.0));

    // 自動再生完了を有効化
    MockAudioBufferSourceNode.autoComplete = true;
  });

  afterEach(() => {
    MockAudioBufferSourceNode.autoComplete = true;
  });

  function createContext(dirHandle: FileSystemDirectoryHandle = mockDirHandle) {
    return createQuestionReadingContext(
      1,
      "001",
      mockAudioContext as unknown as AudioContext,
      dirHandle,
      (s: LoadingStatus) => loadingStatusHistory.push(s),
      (s: VoiceStatus) => voiceStatusHistory.push(s),
      (filename: string) => fileNotFoundHistory.push(filename),
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
      const promise = context.start();

      // Assert: start()が呼ばれた直後にPLAYINGになる
      expect(context.voiceStatus).toBe("PLAYING");
      expect(voiceStatusHistory).toContain("PLAYING");

      // 完了を待つ
      await promise;
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
      context.start();

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
      context.start();
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

describe("applyOnAirStateToUI", () => {
  beforeEach(() => {
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  it("問い読みON時、問題内容が表示されカードにグレーアウトクラスがない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const next2QuestionContent = document.querySelector('[data-quiz-reader-target~="next2QuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    const next2QuestionBox = document.querySelector('[data-quiz-reader-target~="next2QuestionBox"]');
    const onAirLabel = document.querySelector('[data-quiz-reader-target~="onAirLabel"]');

    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(next2QuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);
    expect(next2QuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);
    expect(onAirLabel?.textContent).toBe("問い読みON");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問い読みOFF時、問題内容が非表示になりカードがグレーアウトする", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: false });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const next2QuestionContent = document.querySelector('[data-quiz-reader-target~="next2QuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    const next2QuestionBox = document.querySelector('[data-quiz-reader-target~="next2QuestionBox"]');
    const onAirLabel = document.querySelector('[data-quiz-reader-target~="onAirLabel"]');

    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(next2QuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);
    expect(next2QuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);
    expect(onAirLabel?.textContent).toBe("問い読みOFF");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問い読みスイッチを切り替えると状態が反映される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");
    const isOnAirCheckbox = document.querySelector('[data-quiz-reader-target~="isOnAir"]') as HTMLInputElement;

    // Act: ON -> OFF
    isOnAirCheckbox.checked = false;
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert: OFF状態
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);

    // Act: OFF -> ON
    isOnAirCheckbox.checked = true;
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert: ON状態
    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);

    // Cleanup
    teardownControllerTest(application);
  });
});

// 注意: 外部連携テスト（Turbo Stream, IndexedDB, アップロード）は
// ローカルファイル読み込みへの変更に伴い、フォルダ選択のモックが必要になりました。
// これらのテストは selectFolder のモックを追加した後に再実装する必要があります。

describe("サンプル音声機能", () => {
  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  describe("openSettingsModal", () => {
    it("モーダルにis-activeクラスを追加する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      (controller as { openSettingsModal: () => void }).openSettingsModal();

      // Assert
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      expect(modal?.classList.contains("is-active")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("closeSettingsModal", () => {
    it("モーダルからis-activeクラスを削除する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開いておく
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // Act
      (controller as { closeSettingsModal: () => void }).closeSettingsModal();

      // Assert
      expect(modal?.classList.contains("is-active")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });

    it("stopSampleAudioを呼び出す", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const stopSpy = vi.spyOn(controller as { stopSampleAudio: () => void }, "stopSampleAudio");

      // Act
      (controller as { closeSettingsModal: () => void }).closeSettingsModal();

      // Assert
      expect(stopSpy).toHaveBeenCalled();

      // Cleanup
      stopSpy.mockRestore();
      teardownControllerTest(application);
    });
  });

  describe("playSampleAudio", () => {
    beforeEach(() => {
      // AudioContextをモック
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("音声フォルダ未選択時にalertを表示する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert
      expect(alertSpy).toHaveBeenCalledWith("サンプル音声を再生するには、音声フォルダを選択してください");

      // Cleanup
      alertSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("音声フォルダからsample.wavを読み込んで再生する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = createMockDirectoryHandle({
        "sample.wav": mockArrayBuffer,
      });

      // soundDirHandle を設定
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: sampleAudioSourceが作成されている（再生された）
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeDefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("2回目以降はキャッシュを使用する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      let getFileHandleCallCount = 0;
      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          getFileHandleCallCount++;
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                async arrayBuffer() {
                  return mockArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 2回再生
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: getFileHandleは1回だけ
      expect(getFileHandleCallCount).toBe(1);

      // Cleanup
      teardownControllerTest(application);
    });

    it("読み込み中に再度呼ばれた場合は多重再生を防ぐ", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      let getFileHandleCallCount = 0;
      let resolveGetFile: (value: unknown) => void;
      const delayedGetFile = new Promise((resolve) => {
        resolveGetFile = resolve;
      });

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          getFileHandleCallCount++;
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            getFile() {
              return delayedGetFile;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 1回目の再生を開始（まだ完了しない）
      const firstPlay = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // 2回目の再生を試みる（読み込み中なのでスキップされるはず）
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: getFileHandleは1回だけ呼ばれている
      expect(getFileHandleCallCount).toBe(1);

      // 1回目を完了させる
      // biome-ignore lint/style/noNonNullAssertion: テスト用にPromise内で必ず初期化される
      resolveGetFile!({
        name: "sample.wav",
        type: "audio/wav",
        size: mockArrayBuffer.byteLength,
        async arrayBuffer() {
          return mockArrayBuffer;
        },
      });
      await firstPlay;

      // Cleanup
      teardownControllerTest(application);
    });

    it("読み込み中にstopSampleAudioが呼ばれると再生がキャンセルされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              // getFile中にabortされたらAbortErrorを投げる
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                async arrayBuffer() {
                  // 少し遅延させてabortを検知できるようにする
                  await new Promise((resolve) => setTimeout(resolve, 10));
                  return mockArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 再生を開始
      const playPromise = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // 読み込み中に停止
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // 再生が完了するのを待つ
      await playPromise;

      // Assert: sampleAudioSourceは作成されない（再生されない）
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioSource).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("sample.wavが存在しない場合にエラーメッセージを表示する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // sample.wavが存在しないモックディレクトリ
      const mockDirHandle = createMockDirectoryHandle({});

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert
      expect(alertSpy).toHaveBeenCalledWith("sample.wav が見つかりません");

      // Cleanup
      alertSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("読み込み中にキャンセルされ、その後読み込みが完了しても古いバッファがセットされない", async () => {
      // Arrange
      // このテストは、フォルダ変更時のシナリオを再現:
      // 1. playSampleAudio() を呼び出す（フォルダA）
      // 2. loadAudioFromLocalFile() が進行中に stopSampleAudio() を呼び出す
      // 3. その後、loadAudioFromLocalFile() が完了する
      // 4. バグがある場合: 古いバッファがセットされてしまう
      // 5. 修正後: signal.aborted をチェックしてバッファをセットしない
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      let resolveArrayBuffer: (value: ArrayBuffer) => void;
      const delayedArrayBuffer = new Promise<ArrayBuffer>((resolve) => {
        resolveArrayBuffer = resolve;
      });

      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                arrayBuffer() {
                  // arrayBuffer() を遅延させることで、読み込み中にキャンセルを可能にする
                  return delayedArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 再生を開始（loadAudioFromLocalFile が進行中の状態）
      const playPromise = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // arrayBuffer() が呼ばれるまで少し待つ
      await new Promise((resolve) => setTimeout(resolve, 5));

      // 読み込み中に停止（フォルダ変更などのシナリオ）
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // その後、arrayBuffer() を完了させる（実際のファイルシステムでは非同期に完了する）
      // biome-ignore lint/style/noNonNullAssertion: テスト用にPromise内で必ず初期化される
      resolveArrayBuffer!(mockArrayBuffer);

      // 再生処理が完了するのを待つ
      await playPromise;

      // Assert: キャンセル後なのでバッファがセットされていないはず
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("stopSampleAudio", () => {
    beforeEach(() => {
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("再生中の音声を停止する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モックのAudioBufferSourceNodeを設定
      const mockSource = {
        onended: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).sampleAudioSource = mockSource;

      // Act
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // Assert
      expect(mockSource.onended).toBeNull();
      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioSource).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("sampleAudioSourceがundefinedの場合は何もしない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act & Assert: エラーが発生しないことを確認
      expect(() => {
        (controller as { stopSampleAudio: () => void }).stopSampleAudio();
      }).not.toThrow();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("selectFolder", () => {
    beforeEach(() => {
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("フォルダ変更時にsampleAudioBufferがクリアされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 既存のsampleAudioBufferを設定
      const mockBuffer = createMockAudioBuffer(1.0);
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).sampleAudioBuffer = mockBuffer;

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: sampleAudioBufferがクリアされている
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("フォルダ変更時に再生中のサンプル音声が停止される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // stopSampleAudioをスパイ
      const stopSpy = vi.spyOn(controller as { stopSampleAudio: () => void }, "stopSampleAudio");

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: stopSampleAudioが呼ばれている
      expect(stopSpy).toHaveBeenCalled();

      // Cleanup
      stopSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("フォルダ選択後にサンプル音声ボタンが有効化される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const playButton = document.querySelector('[data-quiz-reader-target~="samplePlayButton"]') as HTMLButtonElement;
      const stopButton = document.querySelector('[data-quiz-reader-target~="sampleStopButton"]') as HTMLButtonElement;

      // 初期状態ではdisabled
      expect(playButton.disabled).toBe(true);
      expect(stopButton.disabled).toBe(true);

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act: selectFolderメソッドを直接呼び出す
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: ボタンが有効化されている
      expect(playButton.disabled).toBe(false);
      expect(stopButton.disabled).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});

describe("proceedToNextQuestion", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // fetchをモック
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("<turbo-stream></turbo-stream>"),
      json: vi.fn().mockResolvedValue({ success: true, question_id: 1 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // CSRFトークンのメタタグを追加
    const meta = document.createElement("meta");
    meta.setAttribute("name", "csrf-token");
    meta.setAttribute("content", "test-csrf-token");
    document.head.appendChild(meta);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // メタタグを削除
    const meta = document.querySelector('meta[name="csrf-token"]');
    meta?.remove();
  });

  it("PAUSED状態で呼ばれると2つのリクエストを送信する（問題送出→次の問題）", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // readingContextをモックして PAUSED 状態にする
    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
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

    // fetchが完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 2つのリクエストが送信された
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 1番目: 問題送出リクエスト
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall[0]).toBe("/admin/question_broadcasts");
    expect(firstCall[1].method).toBe("POST");
    expect(firstCall[1].headers["Content-Type"]).toBe("application/json");
    expect(firstCall[1].headers.Accept).toBe("application/json");
    expect(JSON.parse(firstCall[1].body)).toEqual({ question_id: 42 });

    // 2番目: 次の問題に進むリクエスト
    const secondCall = fetchSpy.mock.calls[1];
    expect(secondCall[0]).toBe("/admin/quiz_reader/next_question");
    expect(secondCall[1].method).toBe("PUT");

    // Cleanup
    teardownControllerTest(application);
  });

  it("PAUSED以外の状態では何も送信しない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // readingContextをモックして STANDBY 状態にする
    const mockReadingContext = {
      voiceStatus: "STANDBY" as VoiceStatus,
      questionId: 42,
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
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // Assert: リクエストは送信されない
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題送出が失敗しても次の問題への遷移は続行する", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // 1回目（問題送出）は失敗、2回目（次の問題）は成功
    fetchSpy.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("<turbo-stream></turbo-stream>"),
    });

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
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

    // console.errorをモックして出力を抑制
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // fetchが完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 両方のリクエストが試行された
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // エラーがログに出力された
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Turbo.renderStreamMessageが呼ばれた（次の問題への遷移が成功）
    expect(mockRenderStreamMessage).toHaveBeenCalled();

    // Cleanup
    consoleErrorSpy.mockRestore();
    teardownControllerTest(application);
  });

  it("キーリピート時は何も送信しない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
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

    // Act: repeat=trueのイベント
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: true });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // Assert: リクエストは送信されない
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題フォローがONの場合、問題送出と次の問題への遷移が両方実行される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001", isQuestionFollowOn: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 2つのリクエストが送信された（問題送出 + 次の問題）
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toBe("/admin/question_broadcasts");
    expect(fetchSpy.mock.calls[1][0]).toBe("/admin/quiz_reader/next_question");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題フォローがOFFの場合、問題送出はせず次の問題への遷移のみ実行される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001", isQuestionFollowOn: false });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 次の問題への遷移リクエストのみ送信された（問題送出は行われない）
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/admin/quiz_reader/next_question");

    // Cleanup
    teardownControllerTest(application);
  });
});

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
        1,
        "001",
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
