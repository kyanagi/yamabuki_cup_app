import { describe, expect, it, vi } from "vitest";
import { createQuizReaderReadingStore, type QuizReaderReadingRecord } from "../quiz_reader/quiz_reader_reading_store";

type OpenDBFn = ReturnType<typeof vi.fn>;
type AddFn = ReturnType<typeof vi.fn>;

function extractOpenDBOptions(openDBFn: OpenDBFn): { upgrade?: (db: unknown) => void } {
  const options = openDBFn.mock.calls[0]?.[2];
  return (options ?? {}) as { upgrade?: (db: unknown) => void };
}

describe("createQuizReaderReadingStore", () => {
  it("save が question-readings ストアへ保存する", async () => {
    // Arrange
    const addFn: AddFn = vi.fn().mockResolvedValue(1);
    const openDBFn: OpenDBFn = vi.fn().mockResolvedValue({ add: addFn });
    const store = createQuizReaderReadingStore({
      openDBFn: openDBFn as never,
      logger: { error: vi.fn() },
    });
    const record: QuizReaderReadingRecord = {
      questionId: 12,
      readDuration: 2.34,
      timestamp: "2026-02-25T12:34:56.000Z",
    };

    // Act
    await store.save(record);

    // Assert
    expect(openDBFn).toHaveBeenCalledTimes(1);
    expect(addFn).toHaveBeenCalledWith("question-readings", record);
  });

  it("初期化時に question-readings ストアを作成する", () => {
    // Arrange
    const openDBFn: OpenDBFn = vi.fn().mockResolvedValue({ add: vi.fn() });
    createQuizReaderReadingStore({
      openDBFn: openDBFn as never,
      logger: { error: vi.fn() },
    });
    const upgrade = extractOpenDBOptions(openDBFn).upgrade;
    const createObjectStore = vi.fn();

    // Act
    upgrade?.({
      createObjectStore,
    });

    // Assert
    expect(openDBFn).toHaveBeenCalledWith(
      "yamabuki-cup-quiz-reader",
      1,
      expect.objectContaining({
        upgrade: expect.any(Function),
      }),
    );
    expect(createObjectStore).toHaveBeenCalledWith("question-readings", {
      keyPath: "id",
      autoIncrement: true,
    });
  });

  it("save 失敗時はログ出力して例外を再送出する", async () => {
    // Arrange
    const expectedError = new Error("save failed");
    const addFn: AddFn = vi.fn().mockRejectedValue(expectedError);
    const openDBFn: OpenDBFn = vi.fn().mockResolvedValue({ add: addFn });
    const logger = {
      error: vi.fn(),
    };
    const store = createQuizReaderReadingStore({
      openDBFn: openDBFn as never,
      logger,
    });

    // Act & Assert
    await expect(
      store.save({
        questionId: 1,
        readDuration: 1.23,
        timestamp: "2026-02-25T00:00:00.000Z",
      }),
    ).rejects.toThrow("save failed");
    expect(logger.error).toHaveBeenCalledWith("問い読みの結果の保存に失敗しました:", expectedError);
  });
});
