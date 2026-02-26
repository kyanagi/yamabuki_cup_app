/**
 * Quiz Reader の問い読み結果を IndexedDB に保存するストアモジュール。
 *
 * 保存先ストアの初期化と save 操作のみを担当し、
 * Controller やオーケストレータから永続化詳細を隠蔽する。
 */
import { openDB } from "idb";
import type { QuestionId } from "../../lib/quiz_reader/question_id";

const IDB_NAME = "yamabuki-cup-quiz-reader";
const IDB_VERSION = 1;
const QUESTION_READINGS_STORE_NAME = "question-readings";

export type QuizReaderReadingRecord = {
  questionId: QuestionId;
  readDuration: number;
  timestamp: string;
};

export type QuizReaderReadingStore = {
  save: (record: QuizReaderReadingRecord) => Promise<void>;
};

export type QuizReaderReadingStoreDeps = {
  openDBFn?: typeof openDB;
  logger?: Pick<Console, "error">;
};

export function createQuizReaderReadingStore(deps: QuizReaderReadingStoreDeps = {}): QuizReaderReadingStore {
  const { openDBFn = openDB, logger = console } = deps;
  const idbPromise = openDBFn(IDB_NAME, IDB_VERSION, {
    upgrade(db) {
      db.createObjectStore(QUESTION_READINGS_STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    },
  });

  return {
    async save(record: QuizReaderReadingRecord): Promise<void> {
      try {
        const db = await idbPromise;
        await db.add(QUESTION_READINGS_STORE_NAME, record);
      } catch (e) {
        logger.error("問い読みの結果の保存に失敗しました:", e);
        throw e;
      }
    },
  };
}
