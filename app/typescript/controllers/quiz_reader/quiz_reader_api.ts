/**
 * Quiz Reader のHTTP通信専用モジュール。
 *
 * Controller から通信処理の詳細（エンドポイント、ヘッダ生成、HTTPステータス判定）を分離し、
 * UI更新（Turbo描画・アラート・アイコン制御）は呼び出し側で扱う。
 */
import { fetchWithRetry } from "../../lib/fetch_with_retry";
import type { QuestionId, QuestionTarget } from "../../lib/quiz_reader/question_id";

export type QuizReaderUploadPayload = {
  questionId: QuestionId;
  readDuration: number;
  fullDuration: number;
};

export type QuizReaderApi = {
  broadcastQuestion(questionId: QuestionId): Promise<void>;
  fetchNextQuestionStream(questionTarget: QuestionTarget): Promise<string>;
  uploadQuestionReading(payload: QuizReaderUploadPayload): Promise<void>;
};

export type QuizReaderApiDeps = {
  csrfTokenProvider: () => string;
  fetchFn?: typeof fetch;
  fetchWithRetryFn?: typeof fetchWithRetry;
};

function assertOk(response: Response): void {
  if (!response.ok) {
    throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
  }
}

export function createQuizReaderApi(deps: QuizReaderApiDeps): QuizReaderApi {
  const { csrfTokenProvider, fetchFn = fetch, fetchWithRetryFn = fetchWithRetry } = deps;

  const jsonHeaders = (accept?: string): Record<string, string> => ({
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfTokenProvider(),
    ...(accept ? { Accept: accept } : {}),
  });

  return {
    async broadcastQuestion(questionId: QuestionId): Promise<void> {
      const response = await fetchFn("/admin/question_broadcasts", {
        method: "POST",
        headers: jsonHeaders("application/json"),
        body: JSON.stringify({ question_id: questionId }),
      });
      assertOk(response);
    },

    async fetchNextQuestionStream(questionTarget: QuestionTarget): Promise<string> {
      const response = await fetchFn("/admin/quiz_reader/next_question", {
        method: "PUT",
        headers: jsonHeaders("text/vnd.turbo-stream.html"),
        body: JSON.stringify({ question_id: questionTarget }),
      });
      assertOk(response);
      return await response.text();
    },

    async uploadQuestionReading(payload: QuizReaderUploadPayload): Promise<void> {
      const response = await fetchWithRetryFn("/admin/quiz_reader/question_readings", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          question_id: payload.questionId,
          read_duration: payload.readDuration,
          full_duration: payload.fullDuration,
        }),
      });
      assertOk(response);
      await response.json();
    },
  };
}
