# BroadcastChannel サポートチェック削除計画（改訂版2）

## Context

BroadcastChannel はこのアプリの動作に事実上必須であり、サポートブラウザ（Chrome/Chromium系）での利用を要件とする。
`typeof BroadcastChannel` のサポートチェックを削除してコードをシンプルにする。

ブラウザ要件は `docs/agents/buzzer_architecture.md` に既に「ブラウザはChrome（Chromium系）に固定」と明記されている。

## jsdom における BroadcastChannel 未定義問題

現在 `app/typescript/__tests__/setup.ts` には `BroadcastChannel` の stub がない。
`typeof` ガードを削除すると、jsdom テスト環境で `new BroadcastChannel(...)` が呼ばれ、
`BroadcastChannel` を個別に stub していない QuizReaderController テスト群が `ReferenceError` で失敗する。

BroadcastChannel を stub していない（失敗が予想される）QuizReaderController 使用テスト:

- `quiz_reader_controller_focus.test.ts`
- `quiz_reader_controller_lifecycle.test.ts`
- `quiz_reader_controller_volume.test.ts`
- （他の quiz*reader_controller*\*.test.ts も同様の可能性）

## 実装順（TDD: Red → Green → Refactor）

### Red: プロダクションコードから typeof ガードを削除

**`app/typescript/scoreboard_react/hooks/useBuzzerChannel.ts`**

- 行20: `if (typeof BroadcastChannel === "undefined") return;` を削除

**`app/typescript/controllers/match_buzzer_controller.ts`**

- 行23-24: `if (typeof BroadcastChannel === "undefined") return;` を削除し
  `this.#channel = createBuzzerChannel();` を直接書く

**`app/typescript/controllers/quiz_reader_controller.ts`**

- 行203-205: `if (typeof BroadcastChannel !== "undefined") { ... }` ガードを削除し
  `this.#buzzerChannel = createBuzzerChannel();` を直接書く

**`app/typescript/controllers/buzzer_control_controller.ts`**

- 行53-55: `if (typeof BroadcastChannel !== "undefined") { ... }` ガードを削除し
  `this.#channel = createBuzzerChannel();` を直接書く

→ `pnpm run test:run` でテスト失敗を確認する（Red）

### Green: global setup に BroadcastChannel stub を追加

**`app/typescript/__tests__/setup.ts`**

- `MockBroadcastChannel` クラスを定義（最小実装）
- `beforeEach` に `vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)` を追加

```typescript
// setup.ts に追加（最小実装）
class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage(_data: unknown): void {}
  close(): void {}
  constructor(_name: string) {}
}

beforeEach(() => {
  // ... 既存の stub ...
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});
```

個別テストファイル（`match_buzzer_controller.test.ts` など）の `beforeEach` で詳細な
`MockBroadcastChannel` を `vi.stubGlobal` することで、global stub を上書きできる。

→ `pnpm run test:run` で全テストが通ることを確認する（Green）

### Refactor: 非対応環境テストを削除

**`app/typescript/controllers/__tests__/match_buzzer_controller.test.ts`**

- 行137-150: "BroadcastChannel 非対応環境でも connect() がエラーにならない" を削除

**`app/typescript/controllers/__tests__/quiz_reader_controller_commit_buzzer.test.ts`**

- 行128-153: "BroadcastChannel 非対応環境で C キーを押してもエラーにならない" を削除

→ `pnpm run test:run` で全テストが通ることを確認する（Refactor）

## 変更しないもの

- `#channel: BuzzerChannel | null = null` の型定義（Stimulus ライフサイクル上 null は適切）
- `?.close()` や `?.post()` のオプショナルチェーン（ライフサイクル管理上必要）
- 各テストファイルの詳細な `MockBroadcastChannel`（動作検証に必要）
- `docs/agents/buzzer_architecture.md` のブラウザ要件記述（既に明記済み）

## 完了条件

```bash
# 全テストが通ること
pnpm run test:run

# lint/format が通ること
pnpm run fmt
pnpm run lint

# typeof BroadcastChannel ガードが残っていないこと（出力なしを成功条件とする）
rg -n "typeof BroadcastChannel" app/typescript/
```
