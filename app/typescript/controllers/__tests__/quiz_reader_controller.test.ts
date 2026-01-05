import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import {
  MockAudioBufferSourceNode,
  MockAudioContext,
  createMockAudioBuffer,
} from "../../__tests__/mocks/audio-context";
import { createQuestionReadingContext, loadAudioFromLocalFile } from "../quiz_reader_controller";
import type { LoadingStatus, VoiceStatus } from "../quiz_reader_controller";
import QuizReaderController from "../quiz_reader_controller";

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
      const AudioContextSpy = vi.fn(MockAudioContext);
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
      const folderError = document.querySelector('[data-quiz-reader-target~="folderError"]');
      expect(folderError?.textContent).toBe("再生するには音声フォルダの選択が必要です");
      expect(folderError?.classList.contains("is-hidden")).toBe(false);

      // folderStatus が「選択してください」に変わる
      const folderStatus = document.querySelector('[data-quiz-reader-target~="folderStatus"]');
      expect(folderStatus?.textContent).toBe("選択してください");

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
      const folderError = document.querySelector('[data-quiz-reader-target~="folderError"]');
      // isOnAir=false なので、フォルダ未選択エラーも表示されない
      expect(folderError?.textContent).toBe("");
      expect(folderError?.classList.contains("is-hidden")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});

// 注意: 外部連携テスト（Turbo Stream, IndexedDB, アップロード）は
// ローカルファイル読み込みへの変更に伴い、フォルダ選択のモックが必要になりました。
// これらのテストは selectFolder のモックを追加した後に再実装する必要があります。
