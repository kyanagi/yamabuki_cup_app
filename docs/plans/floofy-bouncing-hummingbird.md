# モーダル開放中の早押し機正誤ボタン連動機能

## Context

得点操作画面で「早押し機連動」をオンにすると、解答者がボタンを押したとき対応するモーダルダイアログが自動的に開く。
現在は、モーダルが開いた後は早押し機の「正解」「誤答」ボタンが押されても何も起きない。
この機能拡張により、モーダル開放中に早押し機の正解/誤答ボタンが押されたとき、モーダル内に「正解を送信」/「誤答を送信」ボタンを表示し、それを押すことで正解・誤答情報を送信できるようにする。

## 要件整理

- モーダル **開放中のみ** 対象（モーダルが閉じている状態では無視）
- **スイッチ ON のときのみ** 対象（`button_pressed` と同じ条件）
- 早押し機「正解」→「正解を送信」ボタン表示（「誤答を送信」は非表示）
- 早押し機「誤答」→「誤答を送信」ボタン表示（「正解を送信」は非表示）
- 正解→誤答 / 誤答→正解の順で押された場合、最後のボタンだけ表示
- 「送信」ボタンを押すと、既存の「正解」/「誤答」フォームと同一データを送信
- モーダルを開くとき（手動・早押し機問わず）「送信」ボタンをリセット
- モーダルを閉じたとき「送信」ボタンをリセット

## アーキテクチャ確認（既存コードの重要な発見）

- `BuzzerSignal` 型は既に `{ type: "correct" }` / `{ type: "wrong" }` を含む（`signal.ts`）
- `BuzzerControlController` はシリアル・エミュレータ両経路の `correct`/`wrong` を BroadcastChannel 経由でブロードキャストしている（`buzzer_control_controller.ts` 行 152-165）
- `match_buzzer_controller.ts` は既に BroadcastChannel から `BuzzerSignal` を受信しており、`#handleSignal` を拡張するだけでよい
- `window` イベントを直接購読する必要はない（別タブ運用でも正しく動作する）

## 対象ファイル

### TypeScript（テストファースト）

- `app/typescript/controllers/__tests__/match_buzzer_controller.test.ts` ← テストを先に追加
- `app/typescript/controllers/match_buzzer_controller.ts`

### ERBテンプレート（モーダルを持つマッチタイプ）

- `app/views/admin/shared/matches/hayaoshi/_score.html.erb`
- `app/views/admin/shared/matches/playoff/_score.html.erb`
- `app/views/admin/shared/matches/round2/_score.html.erb`
- `app/views/admin/shared/matches/final/_score.html.erb`
- `app/views/admin/shared/matches/_buzzer_send_buttons.html.erb` ← 新規共通パーシャル

※ `board` / `hayabo` は match-buzzer コントローラ未使用のため対象外

## 実装計画（TDD：Red→Green→Refactor）

### Step 1: テストを先に書く（Red）

`match_buzzer_controller.test.ts` に以下のテストケースを追加：

**既存テスト修正:**

```
"button_pressed 以外のシグナル（correct / wrong / reset）は無視する"
→ reset のみ無視に変更（correct/wrong は機能するようになるため）
```

**新規テストケース:**

```typescript
// HTML ヘルパー（送信ボタン付き）
function createHTMLWithSendButtons(activeSeat?: number): string;
// 送信ボタン群（正解を送信 / 誤答を送信）を含む HTML を生成

// correct シグナルの動作
("モーダル開放中に correct シグナル → 正解を送信が表示され、誤答を送信は非表示");
("モーダル開放中に wrong シグナル → 誤答を送信が表示され、正解を送信は非表示");
("correct → wrong の順 → 誤答を送信のみ表示");
("wrong → correct の順 → 正解を送信のみ表示");
("モーダル未開放中の correct シグナルは無視");
("スイッチ OFF のとき correct シグナルは無視");

// resetBuzzerButtons
("button_pressed でモーダルを開くとき送信ボタンがリセットされる");
("resetBuzzerButtons() は両送信ボタンを is-hidden にする");

// submitBuzzerResult
("正解を送信ボタンをクリックすると対応する submit ボタンをクリックする");
("誤答を送信ボタンをクリックすると対応する submit ボタンをクリックする");
```

### Step 2: `match_buzzer_controller.ts` の実装（Green）

`#handleSignal` を拡張（switch 文へ変換）：

```typescript
#handleSignal(signal: BuzzerSignal): void {
  if (!this.hasSwitchTarget || !this.switchTarget.checked) return;

  switch (signal.type) {
    case "button_pressed": {
      if (!isSeatId(signal.seat)) return;
      if (this.element.querySelector(".modal.is-active")) return;
      this.#resetBuzzerButtons();  // 開く前にリセット
      const row = this.element.querySelector<HTMLElement>(`[data-seat="${signal.seat}"]`);
      row?.querySelector(".modal")?.classList.add("is-active");
      break;
    }
    case "correct": {
      const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
      if (!modal) return;
      modal.querySelector<HTMLElement>("[data-buzzer-result='correct']")?.classList.remove("is-hidden");
      modal.querySelector<HTMLElement>("[data-buzzer-result='wrong']")?.classList.add("is-hidden");
      break;
    }
    case "wrong": {
      const modal = this.element.querySelector<HTMLElement>(".modal.is-active");
      if (!modal) return;
      modal.querySelector<HTMLElement>("[data-buzzer-result='wrong']")?.classList.remove("is-hidden");
      modal.querySelector<HTMLElement>("[data-buzzer-result='correct']")?.classList.add("is-hidden");
      break;
    }
    // reset はハードウェアリセットを意味し、判定取り消しではないため無視する
    default:
      break;
  }
}

// ERBの data-action から呼ばれる（モーダル手動開閉時）
resetBuzzerButtons(): void {
  this.#resetBuzzerButtons();
}

// 「送信」ボタンクリック時：対応する既存フォームの submit ボタンをクリック
submitBuzzerResult(event: Event): void {
  const button = event.currentTarget as HTMLElement;
  const result = button.dataset.buzzerResult; // "correct" or "wrong"
  const modal = button.closest<HTMLElement>(".modal");
  modal?.querySelector<HTMLButtonElement>(`[data-buzzer-submit='${result}']`)?.click();
}

#resetBuzzerButtons(): void {
  this.element.querySelectorAll<HTMLElement>("[data-buzzer-result]").forEach((btn) => {
    btn.classList.add("is-hidden");
  });
}
```

### Step 3: 共通パーシャルの作成

`app/views/admin/shared/matches/_buzzer_send_buttons.html.erb`:

```erb
<%# locals: () %>
<%# 早押し機正誤連動の「送信」ボタン群。match_buzzer_controller から制御される %>
<%# reset シグナルは「判定確定前のリセット」ではなく「早押し機ハードウェアのリセット」を意味するため、このUIでは無視する %>
<div class="buttons mt-3">
  <button type="button"
          class="button is-info is-fullwidth is-hidden"
          data-buzzer-result="correct"
          data-action="click->match-buzzer#submitBuzzerResult">
    正解を送信
  </button>
  <button type="button"
          class="button is-danger is-fullwidth is-hidden"
          data-buzzer-result="wrong"
          data-action="click->match-buzzer#submitBuzzerResult">
    誤答を送信
  </button>
</div>
```

### Step 4: 各 `_score.html.erb` の変更（4ファイル共通）

**a. プレイヤーボタン（手動モーダル開放時にリセット）**

```erb
data: { action: "click->modal#open click->match-buzzer#resetBuzzerButtons" }
```

**b. 既存 submit ボタンに識別属性を追加**

```erb
<%= f.submit '正解', class: '...', data: { buzzer_submit: "correct" }, disabled: ... %>
<%= f.submit '誤答', class: '...', data: { buzzer_submit: "wrong" }, disabled: ... %>
```

**c. モーダル閉じるトリガーにリセットを追加**

```erb
<%# モーダル背景 %>
data-action="click->modal#close click->match-buzzer#resetBuzzerButtons"

<%# ×ボタン %>
data-action="click->modal#close click->match-buzzer#resetBuzzerButtons"
```

**d. モーダル内に「送信」ボタンパーシャルを追加**

```erb
<div class="box">
  <%# 既存の 正解/誤答 フォーム %>
  <div class="is-flex is-justify-content-space-between buttons are-large">
    ...
  </div>
  <%# 早押し機連動の送信ボタン群 %>
  <%= render "admin/shared/matches/buzzer_send_buttons" %>
</div>
```

## 動作フロー

```
[別タブ: BuzzerControlController]
  シリアル/エミュレータ → BroadcastChannel.post({ type: "correct" })

[試合画面: match_buzzer_controller]
  BroadcastChannel.onMessage() → #handleSignal({ type: "correct" })
    → スイッチ ON かつ modal.is-active あり？
      → "正解を送信" 表示 / "誤答を送信" 非表示

[手動でモーダルを開く]
  プレイヤーボタン click
    → modal#open（is-active 付与）
    → match-buzzer#resetBuzzerButtons（送信ボタン非表示）

[「正解を送信」クリック]
  submitBuzzerResult()
    → modal 内の [data-buzzer-submit='correct'] をクリック
    → form POST /admin/matches/:id/question_closings (result: correct)

[モーダルを閉じる]
  背景/×ボタン click
    → modal#close（is-active 除去）
    → match-buzzer#resetBuzzerButtons（送信ボタン非表示リセット）
```

## 検証方法

### 自動テスト

1. `pnpm run test:run` でフロントエンドユニットテストが全通することを確認
2. `bundle exec rake check` で全チェック（RuboCop / RSpec / Brakeman / Stylelint / TypeScript）が通ることを確認

### 手動検証

1. `./bin/dev` で開発サーバ起動
2. 早押し機連動スイッチ ON の状態で試合画面を開く
3. **早押し機エミュレータ** でボタンを押してモーダルが開くことを確認
4. モーダル開放中に早押し機「正解」→「正解を送信」ボタンが表示されることを確認（「誤答を送信」は非表示）
5. 続けて「誤答」→「誤答を送信」ボタンに切り替わることを確認（逆順も同様）
6. 「正解を送信」または「誤答を送信」を押して正解/誤答が正しく記録されることを確認
7. モーダルを閉じて再度開いたとき、「送信」ボタンが非表示にリセットされていることを確認
8. **スイッチ OFF** の状態で早押し機「正解」を押しても「正解を送信」が表示されないことを確認
9. モーダルが開いていない状態で「正解」を押しても何も起きないことを確認
