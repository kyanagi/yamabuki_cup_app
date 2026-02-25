import { openDB } from "idb";

const IDB_NAME = "yamabuki-cup-quiz-reader";
const IDB_VERSION = 1;
const QUESTION_READINGS_STORE_NAME = "question-readings";

export type QuizReaderReadingRecord = {
  questionId: number;
  readDuration: number;
  timestamp: string;
};

export type QuizReaderReadingStore = {
  save(record: QuizReaderReadingRecord): Promise<void>;
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
