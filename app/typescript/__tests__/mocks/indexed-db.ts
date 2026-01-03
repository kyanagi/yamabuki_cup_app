/**
 * IndexedDB (idb ライブラリ) のモック
 */
import { vi } from "vitest";

interface QuestionReading {
  id?: number;
  questionId: number;
  readDuration: number;
  timestamp: string;
}

export class MockIDBObjectStore {
  private data: QuestionReading[] = [];
  private autoIncrement = 1;

  async add(value: QuestionReading): Promise<number> {
    const record = { ...value, id: this.autoIncrement++ };
    this.data.push(record);
    return record.id;
  }

  async getAll(): Promise<QuestionReading[]> {
    return [...this.data];
  }

  // テスト用
  clear(): void {
    this.data = [];
    this.autoIncrement = 1;
  }
}

export class MockIDB {
  private stores = new Map<string, MockIDBObjectStore>();

  async add(storeName: string, value: QuestionReading): Promise<number> {
    const store = this.getOrCreateStore(storeName);
    return store.add(value);
  }

  async getAll(storeName: string): Promise<QuestionReading[]> {
    const store = this.getOrCreateStore(storeName);
    return store.getAll();
  }

  private getOrCreateStore(storeName: string): MockIDBObjectStore {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new MockIDBObjectStore());
    }
    // biome-ignore lint/style/noNonNullAssertion: 上の条件で必ず存在する
    return this.stores.get(storeName)!;
  }

  // テスト用
  clear(): void {
    for (const store of this.stores.values()) {
      store.clear();
    }
    this.stores.clear();
  }
}

// openDB のモック関数を作成
export function createMockOpenDB() {
  const mockDB = new MockIDB();

  const openDB = vi.fn().mockResolvedValue(mockDB);

  return {
    openDB,
    mockDB,
  };
}
