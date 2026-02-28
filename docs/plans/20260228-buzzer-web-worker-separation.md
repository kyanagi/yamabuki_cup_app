# Web Worker によるブザーシステム責務分離

## Context

`redesign_proposal.md` §7「ハードウェア統合: WebSerial APIの抽象化」の実装。

現在の `buzzer_serial_controller.ts`（272行）は、シリアル通信・テキストデコード・プロトコルパース・UI更新（CustomEvent 送出）が1ファイルに混在している。これを以下のように分離する：

```
現在:
  buzzer_serial_controller.ts
    └── ポート接続 + reader.read() ループ + TextDecoder + parseSerialProtocolLine + CustomEvent 送出

目標:
  BuzzerDecoder（lib）       # TextDecoder + バッファリング + パース（DOM不要、テスト容易）
  buzzer_worker.ts（Worker） # BuzzerDecoder を使い、Uint8Array → SerialProtocolSignal を変換
  BuzzerService（lib）       # Worker の生成・通信管理 + flush 完了保証 + エラー通知
  BuzzerSerialController     # ポート接続のみ担当。BuzzerService に chunk を渡す
```

## Web Serial API と Worker の制約

- `requestPort()` はユーザーアクション起点のため **メインスレッド必須**
- `ReadableStream` の Worker への Transfer は環境依存のため採用しない
- 方針: メインスレッドで `reader.read()` し、生チャンク（`Uint8Array`）を Worker に `postMessage`

---

## ファイル構成

### 新規作成

| ファイル                                      | 役割                                                            |
| --------------------------------------------- | --------------------------------------------------------------- |
| `app/typescript/lib/buzzer/buzzer_decoder.ts` | TextDecoder + 行バッファリング + `parseSerialProtocolLine`      |
| `app/typescript/lib/buzzer/buzzer_worker.ts`  | Web Worker 本体。BuzzerDecoder を使い結果を `postMessage`       |
| `app/typescript/lib/buzzer/buzzer_service.ts` | Worker の生成・ライフサイクル管理 + flush 完了保証 + エラー通知 |
| `tsconfig.worker.json`                        | Worker ファイル専用 tsconfig（`lib: ["webworker", "ESNext"]`）  |

### テスト（新規）

| ファイル                                                                            | 内容                                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `app/typescript/lib/buzzer/__tests__/buzzer_decoder.test.ts`                        | BuzzerDecoder 単体テスト（DOM不要）                             |
| `app/typescript/lib/buzzer/__tests__/buzzer_service.test.ts`                        | BuzzerService テスト（Worker モック）                           |
| `app/typescript/controllers/__tests__/buzzer_serial_controller_integration.test.ts` | 実経路・競合系の結合テスト（`vi.mock` 不使用、FakeWorker 注入） |

### 修正

| ファイル                                                                | 変更内容                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `app/typescript/controllers/buzzer_serial_controller.ts`                | BuzzerService を使うように変更                                             |
| `app/typescript/controllers/__tests__/buzzer_serial_controller.test.ts` | BuzzerService のモックで既存5テストを維持 + 購読解除・エラー遷移テスト追加 |

---

## Service ライフサイクル: 「1接続 = 1Service」

**接続ごとに Service を新規作成し、切断時に terminate する。**

```
connect()      → createBuzzerService(workerFactory)  Service + Worker 起動
disconnect()   → service.flush().then(cleanupService)  バッファ信号を取り出してから終了
error（Worker）→ cleanupService()  → setState("error")
```

`createBuzzerService` の第一引数 `workerFactory` は省略可能。
デフォルト実装は `new Worker(new URL("../lib/buzzer/buzzer_worker.ts", import.meta.url), { type: "module" })` を返す。
**テストでは `vi.stubGlobal("Worker", FakeWorker)` を正式手段とする**（Controller のコードを変更しない）。

---

## メッセージ契約（確定版）

### メインスレッド → Worker

```typescript
// buzzer_worker.ts に export（BuzzerService が import して使用）
export type WorkerIncomingMessage = { type: "chunk"; data: Uint8Array } | { type: "flush" };
```

### Worker → メインスレッド

```typescript
export type WorkerOutgoingMessage = SerialProtocolSignal;
```

---

## flush の仕様

`flush(): void`（同期）。切断時の残留バッファ信号の取りこぼしは許容する。
Worker にバッファ内容の処理を依頼するが、ACK を待たずに即座に `cleanupService()` へ進む。

---

## エラー通知型

```typescript
// buzzer_service.ts に定義
export type BuzzerServiceError =
  | { kind: "worker_error"; event: ErrorEvent }
  | { kind: "message_error"; event: MessageEvent };
```

---

## BuzzerService API（確定版）

```typescript
export type BuzzerService = {
  processChunk(chunk: Uint8Array): void;
  flush(): void; // 同期（残留バッファの取りこぼしは許容）
  onSignal(handler: (signal: SerialProtocolSignal) => void): () => void;
  onError(handler: (error: BuzzerServiceError) => void): () => void;
  terminate(): void; // 即時終了 + 以降のハンドラ呼び出し抑制
};

export function createBuzzerService(workerFactory?: () => Worker): BuzzerService;
```

---

## BuzzerSerialController の変更

### フィールドの変更

削除: `#buffer`, `TextDecoder` の初期化
追加:

```typescript
#service: BuzzerService | null = null;
#cleanupSignal: (() => void) | null = null;
#cleanupError: (() => void) | null = null;
```

### `#cleanupService()` メソッドを追加

切断・エラー・Stimulus `disconnect()` の全経路でこれを呼ぶ:

```typescript
#cleanupService(): void {
  this.#cleanupSignal?.();
  this.#cleanupError?.();
  this.#cleanupSignal = null;
  this.#cleanupError = null;
  this.#service?.terminate();
  this.#service = null;
}
```

### 読み取りループ終了時

```typescript
this.#service?.flush(); // 残バッファを送出（取りこぼし許容）
this.#cleanupService();
await this.#cleanupPort();
```

---

## 結合テストの注入経路（確定版）

**`vi.stubGlobal("Worker", FakeWorker)` を正式手段とする。**
Controller のコードは変更しない（デフォルト Worker 生成をそのまま使う）。

### FakeWorker の実装方針

```typescript
class FakeWorker implements EventTarget {
  onmessage: ((event: MessageEvent<WorkerOutgoingMessage>) => void) | null = null;
  private readonly decoder = new BuzzerDecoder(); // バッファを FakeWorker インスタンスに紐付け

  postMessage(msg: WorkerIncomingMessage): void {
    if (msg.type === "chunk") {
      for (const signal of this.decoder.processChunk(msg.data)) {
        this.onmessage?.(new MessageEvent("message", { data: signal }));
      }
    } else if (msg.type === "flush") {
      for (const signal of this.decoder.flush()) {
        this.onmessage?.(new MessageEvent("message", { data: signal }));
      }
      // flush_ack は送出しない（取りこぼし許容）
    }
  }

  terminate(): void {}
  // EventTarget インターフェイスの最小実装
}
```

---

## 3層テスト（完了条件）

### Layer 1: BuzzerDecoder

- 改行区切りで `SerialProtocolSignal[]` が返る
- `\r\n` 分割受信でバッファリングが正しく動作する
- `flush()` で残バッファが処理される
- `"2"` のみ（改行なし終端）を processChunk 後に flush すると `button_pressed` シグナルが返る

### Layer 2: BuzzerService

`Worker` グローバルを `vi.stubGlobal` でモック:

- `processChunk` が Worker に `{ type: "chunk", data }` を postMessage する
- Worker からのシグナルメッセージが `onSignal` ハンドラに渡る
- `flush()` が Worker に `{ type: "flush" }` を postMessage する（同期、ACK なし）
- `terminate()` が `worker.terminate()` を呼ぶ
- terminate 後のメッセージで `onSignal` が呼ばれない
- `worker.onerror` が `{ kind: "worker_error", event }` として `onError` に渡る
- `worker.onmessageerror` が `{ kind: "message_error", event }` として `onError` に渡る
- `onSignal` のクリーンアップ関数を呼ぶと購読が解除される

### Layer 3a: BuzzerSerialController（モック）

`buzzer_serial_controller.test.ts` — `vi.mock` で BuzzerService 全モック。既存5テスト + 追加テスト:

- 切断時に `cleanupSignal` / `cleanupError` が呼ばれる（旧購読が残らない）
- Worker エラー時にコントローラが `"error"` 状態に遷移しポートがクリーンアップされる
- 再接続時に新しい `onSignal` / `onError` が登録される

### Layer 3b: 結合テスト（`buzzer_serial_controller_integration.test.ts`）

`vi.mock` なし。`vi.stubGlobal("Worker", FakeWorker)` で注入:

- `"2\r\n99\r\n"` を chunk で送ると `buzzer:emulator:button-press` と `buzzer:emulator:reset` の両 CustomEvent が発火する（実経路）
- `"2"` のみ（改行なし）の chunk を送り接続終了（`reader.done = true`）すると `buzzer:emulator:button-press` が発火する（flush 動作の確認。ただし残留メッセージの取りこぼしは許容）
- **[競合系]** `connect → disconnect → reconnect` シナリオで、旧 Service の残留メッセージが到達しても CustomEvent が二重発火しない

---

## TDD 実装順序

1. **`tsconfig.worker.json` 作成**
2. **BuzzerDecoder 実装**（取りこぼし防止 Red テスト → 実装）
3. **`buzzer_worker.ts` 実装**（BuzzerDecoder のラッパー + `flush_ack` 送出）
4. **BuzzerService 実装**（flush 完了保証・terminate 後抑制・エラー正規化）
5. **BuzzerSerialController 更新**（テスト先行）
   - `buzzer_serial_controller.test.ts` 更新 → 実装変更
   - `buzzer_serial_controller_integration.test.ts` 追加

---

## 検証方法

```bash
pnpm run test:run                                   # 全フロントエンドテスト
pnpm exec tsc --noEmit -p tsconfig.worker.json      # Worker 専用型チェック
pnpm exec tsc --noEmit                              # 通常型チェック
pnpm run lint && pnpm run fmt:check
```

手動確認:

1. `./bin/dev` で起動
2. 制御画面でシリアル接続 → ボタン押下 → スコアボードに反映
3. DevTools「ソース > ワーカー」で Worker が起動していることを確認
4. 切断 → 再接続後に二重発火しないことを確認
5. Worker で意図的エラーを起こして「接続エラー」状態に遷移することを確認
