# Plan: BuzzerService から Worker を廃止して BuzzerDecoder をメインスレッドで直接使用

## Context

`buzzer_worker.ts` は `BuzzerDecoder` のラッパーとして動作する Web Worker だが、
処理内容（TextDecode + 改行分割 + 簡易パース）は極めて軽量で、
9600 bps のシリアル通信という入力規模ではメインスレッドをブロックする恐れが皆無。

Worker 化によるコスト（専用 tsconfig、postMessage 往復オーバーヘッド、
vi.stubGlobal によるテスト複雑化）の方が高く、廃止が妥当。

## 変更対象ファイル

### 削除

- `app/typescript/lib/buzzer/buzzer_worker.ts`
- `tsconfig.worker.json`

### 書き換え

#### `app/typescript/lib/buzzer/buzzer_service.ts`

- Worker を廃止し `BuzzerDecoder` をインライン保持
- `BuzzerServiceError` 型を削除
- `BuzzerService` インターフェースから `onError` を削除
- `createBuzzerService()` の `workerFactory` 引数を削除
- `processChunk` / `flush` は `BuzzerDecoder` を直接呼び出してシグナルを同期ディスパッチ

```typescript
export type BuzzerService = {
  processChunk(chunk: Uint8Array): void;
  flush(): void;
  onSignal(handler: (signal: SerialProtocolSignal) => void): () => void;
  terminate(): void;
};

export function createBuzzerService(): BuzzerService {
  const decoder = new BuzzerDecoder();
  let terminated = false;
  const handlers = new Set<...>();
  ...
}
```

#### `app/typescript/lib/buzzer/__tests__/buzzer_service.test.ts`

- `FakeWorker` クラスを削除
- `vi.stubGlobal("Worker", ...)` テストを削除
- `workerFactory` 注入テストを削除
- `onError` 関連テストを削除
- `processChunk` / `flush` が `BuzzerDecoder` に正しく委譲されることを直接検証

### 更新

#### `app/typescript/controllers/buzzer_serial_controller.ts`

- `#cleanupError: (() => void) | null` フィールドを削除
- `#nextState: ConnectionState | null` フィールドを削除
- `#connectToPort()` 内の `service.onError(...)` 呼び出しと関連ロジックを削除
- `#cleanupService()` から `#cleanupError` 参照を削除
- `#startReadLoop()` 内の `#nextState ??` フォールバックを削除（直接 `"disconnected"` / `"error"` を使用）

#### `app/typescript/controllers/__tests__/buzzer_serial_controller.test.ts`

- `MockService` から `onError` を削除
- `capturedOnError` / `mockOnError` 相当の変数を削除
- Worker エラー関連テストケースを削除

#### `app/typescript/controllers/__tests__/buzzer_serial_controller_integration.test.ts`

- `vi.mock("../lib/buzzer/buzzer_service")` を削除
- `FakeWorker` クラスを削除（BuzzerDecoder を直接内包していた）
- `createBuzzerService` のモックを取り除き、**実装をそのまま使用**
  - Worker がなくなることで結合テストが本物のパイプラインを検証できる
- `workerFactory` 注入テストを削除

## 変更しないファイル

- `app/typescript/lib/buzzer/buzzer_decoder.ts` — 変更不要
- `app/typescript/lib/buzzer/__tests__/buzzer_decoder.test.ts` — 変更不要
- `app/typescript/lib/buzzer/channel.ts` — 変更不要
- `app/typescript/controllers/buzzer_control_controller.ts` — 変更不要
- `app/typescript/controllers/buzzer_scoreboard_controller.ts` — 変更不要

## 実装順序（TDD）

1. `buzzer_service.test.ts` を新しい仕様に書き換える（Worker なし・BuzzerDecoder 直接委譲）
2. `buzzer_service.ts` を実装して上記テストを通す
3. `buzzer_worker.ts` を削除
4. `tsconfig.worker.json` を削除
5. `buzzer_serial_controller.ts` から `onError` / `#nextState` / `#cleanupError` を除去
6. `buzzer_serial_controller.test.ts` を更新（MockService から onError 除去）
7. `buzzer_serial_controller_integration.test.ts` を更新（FakeWorker / vi.mock 撤廃）

## 検証

```bash
pnpm run test:run   # Vitest 全テストがグリーン
pnpm run fmt        # oxfmt フォーマット
pnpm run lint       # oxlint
pnpm exec tsc --noEmit  # TypeScript 型チェック
```
