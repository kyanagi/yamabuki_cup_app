/**
 * Cache API のモック
 */

export class MockCache {
  private store = new Map<string, Response>();

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const url = typeof request === "string" ? request : request.toString();
    const response = this.store.get(url);
    return response?.clone();
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const url = typeof request === "string" ? request : request.toString();
    this.store.set(url, response.clone());
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    const url = typeof request === "string" ? request : request.toString();
    return this.store.delete(url);
  }

  // テスト用
  clear(): void {
    this.store.clear();
  }

  // テスト用: キャッシュにエントリが存在するか確認
  has(url: string): boolean {
    return this.store.has(url);
  }
}

export class MockCacheStorage {
  private caches = new Map<string, MockCache>();

  async open(cacheName: string): Promise<MockCache> {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new MockCache());
    }
    // biome-ignore lint/style/noNonNullAssertion: 上の条件で必ず存在する
    return this.caches.get(cacheName)!;
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.caches.delete(cacheName);
  }

  async has(cacheName: string): Promise<boolean> {
    return this.caches.has(cacheName);
  }

  // テスト用
  clear(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    this.caches.clear();
  }
}
