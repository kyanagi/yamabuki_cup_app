import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderApi, type QuizReaderUploadPayload } from "../quiz_reader/quiz_reader_api";

type MockFetchFn = ReturnType<typeof vi.fn>;

function createResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: vi.fn().mockResolvedValue(""),
    json: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as Response;
}

function extractRequestOptions(
  mockFn: MockFetchFn,
  index = 0,
): RequestInit & { headers: Record<string, string>; body?: string } {
  const options = mockFn.mock.calls[index]?.[1];
  return options as RequestInit & { headers: Record<string, string>; body?: string };
}

describe("createQuizReaderApi", () => {
  let fetchFn: MockFetchFn;
  let fetchWithRetryFn: MockFetchFn;

  beforeEach(() => {
    fetchFn = vi.fn();
    fetchWithRetryFn = vi.fn();
  });

  it("broadcastQuestion が正しいリクエストを送信する", async () => {
    // Arrange
    fetchFn.mockResolvedValue(createResponse());
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act
    await api.broadcastQuestion(42);

    // Assert
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/admin/question_broadcasts");
    const options = extractRequestOptions(fetchFn);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-CSRF-Token"]).toBe("test-csrf-token");
    expect(options.headers.Accept).toBe("application/json");
    expect(JSON.parse(options.body ?? "{}")).toEqual({ question_id: 42 });
  });

  it("broadcastQuestion はHTTPエラー時に例外を投げる", async () => {
    // Arrange
    fetchFn.mockResolvedValue(
      createResponse({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act & Assert
    await expect(api.broadcastQuestion(42)).rejects.toThrow("HTTPエラー 500 Internal Server Error");
  });

  it("fetchNextQuestionStream がturbo-stream文字列を返す", async () => {
    // Arrange
    const streamHtml = "<turbo-stream></turbo-stream>";
    fetchFn.mockResolvedValue(
      createResponse({
        text: vi.fn().mockResolvedValue(streamHtml),
      }),
    );
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act
    const result = await api.fetchNextQuestionStream("next");

    // Assert
    expect(result).toBe(streamHtml);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/admin/quiz_reader/next_question");
    const options = extractRequestOptions(fetchFn);
    expect(options.method).toBe("PUT");
    expect(options.headers.Accept).toBe("text/vnd.turbo-stream.html");
    expect(JSON.parse(options.body ?? "{}")).toEqual({ question_id: "next" });
  });

  it("fetchNextQuestionStream はHTTPエラー時に例外を投げる", async () => {
    // Arrange
    fetchFn.mockResolvedValue(
      createResponse({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
      }),
    );
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act & Assert
    await expect(api.fetchNextQuestionStream("next")).rejects.toThrow("HTTPエラー 422 Unprocessable Entity");
  });

  it("uploadQuestionReading がfetchWithRetryを使ってsnake_caseで送信する", async () => {
    // Arrange
    fetchWithRetryFn.mockResolvedValue(createResponse());
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });
    const payload: QuizReaderUploadPayload = {
      questionId: 7,
      readDuration: 1.23,
      fullDuration: 4.56,
    };

    // Act
    await api.uploadQuestionReading(payload);

    // Assert
    expect(fetchWithRetryFn).toHaveBeenCalledTimes(1);
    expect(fetchWithRetryFn.mock.calls[0]?.[0]).toBe("/admin/quiz_reader/question_readings");
    const options = extractRequestOptions(fetchWithRetryFn);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-CSRF-Token"]).toBe("test-csrf-token");
    expect(options.headers.Accept).toBeUndefined();
    expect(JSON.parse(options.body ?? "{}")).toEqual({
      question_id: 7,
      read_duration: 1.23,
      full_duration: 4.56,
    });
  });

  it("uploadQuestionReading はHTTPエラー時に例外を投げる", async () => {
    // Arrange
    fetchWithRetryFn.mockResolvedValue(
      createResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      }),
    );
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act & Assert
    await expect(
      api.uploadQuestionReading({
        questionId: 1,
        readDuration: 2.5,
        fullDuration: 5.0,
      }),
    ).rejects.toThrow("HTTPエラー 400 Bad Request");
  });

  it("すべての通信にX-CSRF-Tokenヘッダを付与する", async () => {
    // Arrange
    fetchFn.mockResolvedValue(createResponse());
    fetchWithRetryFn.mockResolvedValue(createResponse());
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act
    await api.broadcastQuestion(1);
    await api.fetchNextQuestionStream("next");
    await api.uploadQuestionReading({ questionId: 1, readDuration: 1.0, fullDuration: 2.0 });

    // Assert
    const broadcastOptions = extractRequestOptions(fetchFn, 0);
    const nextQuestionOptions = extractRequestOptions(fetchFn, 1);
    const uploadOptions = extractRequestOptions(fetchWithRetryFn, 0);
    expect(broadcastOptions.headers["X-CSRF-Token"]).toBe("test-csrf-token");
    expect(nextQuestionOptions.headers["X-CSRF-Token"]).toBe("test-csrf-token");
    expect(uploadOptions.headers["X-CSRF-Token"]).toBe("test-csrf-token");
  });

  it("Acceptヘッダをエンドポイントごとに設定する", async () => {
    // Arrange
    fetchFn.mockResolvedValue(createResponse());
    fetchWithRetryFn.mockResolvedValue(createResponse());
    const api = createQuizReaderApi({
      csrfTokenProvider: () => "test-csrf-token",
      fetchFn: fetchFn as unknown as typeof fetch,
      fetchWithRetryFn: fetchWithRetryFn as never,
    });

    // Act
    await api.broadcastQuestion(1);
    await api.fetchNextQuestionStream("next");
    await api.uploadQuestionReading({ questionId: 1, readDuration: 1.0, fullDuration: 2.0 });

    // Assert
    const broadcastOptions = extractRequestOptions(fetchFn, 0);
    const nextQuestionOptions = extractRequestOptions(fetchFn, 1);
    const uploadOptions = extractRequestOptions(fetchWithRetryFn, 0);
    expect(broadcastOptions.headers.Accept).toBe("application/json");
    expect(nextQuestionOptions.headers.Accept).toBe("text/vnd.turbo-stream.html");
    expect(uploadOptions.headers.Accept).toBeUndefined();
  });
});
