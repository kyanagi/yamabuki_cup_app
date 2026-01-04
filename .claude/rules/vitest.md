---
paths: "app/typescript/**/*.ts"
---

# Vitest テスト実装の注意点

### vi.mock のホイスティング問題

`vi.mock()` はファイルの先頭にホイストされるため、同じファイル内で定義した変数を参照できない。

```typescript
// ❌ 動かない: mockFn は vi.mock 実行時に未定義
const mockFn = vi.fn();
vi.mock("some-module", () => ({ fn: mockFn }));

// ✅ 正しい: vi.hoisted() でホイスト対応の変数を作成
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));
vi.mock("some-module", () => ({ fn: mockFn }));
```

### vi.resetAllMocks() によるモック設定のリセット

`setup.ts` の `afterEach` で `vi.resetAllMocks()` を呼ぶと、`mockResolvedValue` などの設定もリセットされる。各テストスイートの `beforeEach` でモックを再設定する必要がある。

```typescript
beforeEach(() => {
  // vi.resetAllMocks() 後に再設定が必要
  mockOpenDB.mockResolvedValue({ add: mockAdd, getAll: mockGetAll });
  mockAdd.mockResolvedValue(1);
});
```

### idb モジュールのモック

`idb` ライブラリは内部で `indexedDB` を使用するが、jsdom には存在しない。ファイルのトップレベルで `vi.mock("idb", ...)` を設定し、実際のモジュールがロードされる前にモックを差し込む必要がある。
