# Cキーによる送信ボタン自動クリック機能

## Context

Quiz Reader 画面（問い読み担当者用）において、得点表示操作ウィンドウ（別タブ/ウィンドウで開いた試合画面）の「正解を送る」「誤答を送る」ボタンを、キーボードから操作できるようにする。

現在の仕組み：

- 早押し機ハードウェアが `correct`/`wrong` シグナルを BuzzerChannel（BroadcastChannel "buzzer"）で送信
- 試合画面の `match_buzzer_controller.ts` がシグナルを受信し、該当ボタンを表示
- 表示されたボタンをオペレーターがマウスでクリックして送信

今回追加：Quiz Reader で「C」キーを押すと、BuzzerChannel 経由で `{ type: "commit" }` シグナルを送信 → 試合画面でシグナルを受信し、現在表示中の送信ボタンをクリック。

## シグナル命名の根拠

`commit` を採用。早押し結果（正解/誤答）を**確定送信する**操作を表すため `commit` が意味的に適切。`confirm` は「button_pressed の確認」と混同されやすく、`submit` は既存の `buzzer-submit` 属性と近すぎる。

## 安全設計

1. **BroadcastChannel 非対応環境**: `connect()` で `typeof BroadcastChannel === "undefined"` を確認し、非対応時は `#buzzerChannel = null` のまま。`commitBuzzerResult()` は null ガードにより no-op。
2. **キーリピート多重送信防止**: `commitBuzzerResult(event: KeyboardEvent)` にして `event.repeat === true` なら即リターン。
3. **設定モーダル表示中の誤送信防止**: `isAnyModalOpen()` が true なら no-op（既存キーバインドと同じガード設計）。
4. **連動スイッチOFF時の動作**: `commit` は既存の `#handleSignal()` のスイッチチェック（`if (!this.hasSwitchTarget || !this.switchTarget.checked) return`）を**そのまま尊重する**。他のシグナルと同じスイッチ制御に従い、「スイッチOFFのとき buzzer 関連操作はすべて無効」という一貫した運用ルールを守る。

## 変更ファイル

### 1. `app/typescript/lib/buzzer/signal.ts`

新しいシグナル型を追加：

```typescript
| { type: "commit" }
```

### 2. `app/typescript/controllers/quiz_reader_controller.ts`

- import追加: `createBuzzerChannel`, `BuzzerChannel`
- フィールド追加: `#buzzerChannel: BuzzerChannel | null = null`
- `connect()` 内:
  ```typescript
  if (typeof BroadcastChannel !== "undefined") {
    this.#buzzerChannel = createBuzzerChannel();
  }
  ```
- `disconnect()` 内:
  ```typescript
  this.#buzzerChannel?.close();
  this.#buzzerChannel = null;
  ```
- アクションメソッド追加:
  ```typescript
  commitBuzzerResult(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (this.isAnyModalOpen()) return;
    this.#buzzerChannel?.post({ type: "commit" });
  }
  ```
  （`isAnyModalOpen()` は行443に既存の private メソッド）

### 3. `app/views/admin/quiz_reader/show.html.erb`

- `data-action` 属性に追加:
  ```
  keydown.c@document->quiz-reader#commitBuzzerResult:prevent
  ```
- keyLegend エリアに「C」キーの説明を追加:
  ```html
  <div>
    <span class="kbd">C</span>
    <span class="ml-1">送信</span>
  </div>
  ```

### 4. `app/typescript/controllers/match_buzzer_controller.ts`

- `#handleSignal()` の switch 文に `"commit"` ケースを追加。既存のスイッチチェック（関数冒頭の early return）をそのまま適用（特別扱いなし）:
  ```typescript
  case "commit": {
    const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
    if (!modal) return;
    const visibleButton = modal.querySelector<HTMLElement>("[data-buzzer-result]:not(.is-hidden)");
    visibleButton?.click();
    break;
  }
  ```

## TDD実装順序（Red → Green → Refactor）

### Step 1: `match_buzzer_controller.test.ts` に `commit シグナル` の describe を追加（Red）

1. **モーダル開放中に commit → 表示中の「正解を送信」ボタンがクリックされる**
2. **モーダル開放中に commit → 表示中の「誤答を送信」ボタンがクリックされる**
3. **送信ボタンが両方 is-hidden のとき commit を受けても何もしない**
4. **モーダルが開いていない状態で commit シグナルを受け取っても何もしない**
5. **スイッチOFF のとき commit シグナルを受け取っても何もしない**（スイッチ依存方針の明示テスト）

### Step 2: `match_buzzer_controller.ts` に `"commit"` ケースを実装（Green）

### Step 3: `quiz_reader_controller_commit_buzzer.test.ts` を新規作成（Red）

1. **C キーを押すと BuzzerChannel に `{ type: "commit" }` シグナルが `postMessage` される**（`keydown.c@document` バインドが機能することも含めて確認）
2. **event.repeat=true のとき commit シグナルは送信されない**
3. **モーダルが開いているとき commit シグナルは送信されない**
4. **BroadcastChannel 非対応環境で C キーを押してもエラーにならない**

### Step 4: `quiz_reader_controller.ts` に実装（Green）

### Step 5: `show.html.erb` を更新、手動検証

## 検証手順

1. `pnpm test:run` でフロントエンドテストが通ることを確認
2. `pnpm run lint` / `pnpm run fmt:check` で lint/format チェック通過を確認
3. 開発サーバ起動後、Quiz Reader と試合画面（早押し対応ラウンド）を別タブで開く
4. 試合画面で早押し機連動スイッチをONにし、ボタン押下シミュレーションで「正解を送信」ボタンを表示させる
5. Quiz Reader タブで「C」キーを押し、試合画面でフォームが送信されることを確認
6. キーを押しっぱなし（リピート）にしても二重送信されないことを確認
7. Quiz Reader の設定モーダルを開いた状態で「C」キーを押しても送信されないことを確認
8. 試合画面で連動スイッチをOFFにした状態で「C」キーを押しても送信されないことを確認
