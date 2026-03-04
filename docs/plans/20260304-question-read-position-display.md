# 問題文の読了位置表示機能

## Context

スコアボードの問題文表示において、早押しが押された時点で「どこまで読まれたか」を視覚的に示したい。
読了位置の計算はバックエンドで行い、`read_text`（読まれた部分）と `unread_text`（未読部分）を SSE で送る。
フロントエンドは受け取った2つの文字列をそれぞれ異なる色で表示するだけにとどめる。

**フロー:**

1. quiz_readerで音声停止後、`broadcastQuestion(questionId, readDuration)` を呼ぶ
2. `QuestionBroadcastsController#create` が `char_timestamps` + `read_duration` から `read_text`/`unread_text` を計算
3. `question_show` SSE イベントで `{text, answer, read_text, unread_text}` をブロードキャスト
4. スコアボードが受信して色分け表示

`read_duration` が渡されない場合（または0の場合）は `read_text = ""`, `unread_text = text`（全文未読）として扱う。

## 実装ステップ

### 1. バックエンド: `QuestionBroadcastsController` の `broadcast_question_board` 拡張

**ファイル:** `app/controllers/admin/question_broadcasts_controller.rb`

- `params[:read_duration]` を受け取る（任意パラメーター）
- `broadcast_question_board(question, read_duration:)` メソッドを拡張
- `char_timestamps` と `read_duration` から読了文字数を計算し `read_text`/`unread_text` を生成

**読了位置の計算ロジック:**

```ruby
def calculate_read_split(question, read_duration)
  timestamps = question.char_timestamps.presence || []
  read_count = timestamps.count { |ct| ct["start"] <= read_duration }
  {
    read_text: question.text[0, read_count].to_s,
    unread_text: question.text[read_count..].to_s
  }
end
```

`read_duration` が nil / 0 の場合は `{ read_text: "", unread_text: question.text }` とする。

**SSE ペイロード変更:**

```ruby
ActiveSupport::Notifications.instrument(
  "scoreboard.question_show",
  payload: {
    text: question.text,
    answer: question.answer,
    read_text: split[:read_text],
    unread_text: split[:read_text].present? ? split[:unread_text] : question.text
  }
)
```

### 2. フロントエンド (quiz_reader): `broadcastQuestion` に `readDuration` を追加

**ファイル:** `app/typescript/controllers/quiz_reader/quiz_reader_api.ts`

`broadcastQuestion` のペイロードに `read_duration` を追加:

```typescript
async broadcastQuestion(payload: { questionId: QuestionId; readDuration?: number }): Promise<void> {
  // 既存のリクエストに read_duration を追加
  body: JSON.stringify({
    question_id: payload.questionId,
    read_duration: payload.readDuration ?? null,
  })
}
```

### 3. フロントエンド (quiz_reader): 問題送り時に `readDuration` を渡す

`broadcastQuestion` の呼び出しタイミングは現在と変わらない（問題送りボタンを押したとき）。
呼び出し時に、現在の `readingContext` から `readDuration` を取得して渡す。

**ファイル:** `app/typescript/controllers/quiz_reader/quiz_reader_orchestrator.ts`（または同等のファイル）

```typescript
// 既存の broadcastQuestion 呼び出しに readDuration を追加
const readDuration = stateDeps.getReadingContext()?.readDuration;
await deps.api.broadcastQuestion({ questionId, readDuration });
```

`readingContext` がない場合や再生前の場合は `readDuration = undefined` → バックエンドで全文未読扱いになる。

### 4. フロントエンド (scoreboard React): `types.ts` の型変更

**ファイル:** `app/typescript/scoreboard_react/types.ts`

`QuestionState` を変更:

```typescript
export type QuestionState = {
  text: string;
  answer: string;
  readText: string;
  unreadText: string;
};
```

### 5. フロントエンド (scoreboard React): `Question.tsx` で色分け表示

**ファイル:** `app/typescript/scoreboard_react/components/Question.tsx`

```tsx
// readText と unreadText を色分けして表示
<p className="question-text">
  <span className="question-text-read">{questionState.readText}</span>
  <span className="question-text-unread">{questionState.unreadText}</span>
</p>
```

`isSameQuestion()` の比較対象に `readText` を含め、読了位置が変わったらアニメーションなしで更新する（同一問題の読了位置更新なのでフェードアウト不要）。

### 6. CSS スタイル追加

スコアボード用 CSS ファイルに追加:

```css
.question-text-read {
  /* 読まれた部分: デフォルト表示 */
}

.question-text-unread {
  opacity: 0.4;
}
```

## 影響範囲

| ファイル                                                             | 変更内容                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `app/controllers/admin/question_broadcasts_controller.rb`            | `read_duration` パラメーター追加・`read_text`/`unread_text` 計算 |
| `app/typescript/controllers/quiz_reader/quiz_reader_api.ts`          | `broadcastQuestion` に `readDuration` 追加                       |
| `app/typescript/controllers/quiz_reader/quiz_reader_orchestrator.ts` | 音声停止後に `read_duration` 付きで `broadcastQuestion` を呼ぶ   |
| `app/typescript/scoreboard_react/types.ts`                           | `QuestionState` に `readText`/`unreadText` 追加                  |
| `app/typescript/scoreboard_react/components/Question.tsx`            | 色分け表示実装                                                   |
| スコアボード用 CSS                                                   | `.question-text-read` / `.question-text-unread` スタイル追加     |

## 検証方法

1. **バックエンドテスト (RSpec)**
   - `read_duration` が渡されたとき、`char_timestamps` と照合して正しく `read_text`/`unread_text` が計算されること
   - `read_duration` が nil のとき `read_text = ""`, `unread_text = text` となること
   - `question_show` SSEペイロードに `read_text`/`unread_text` が含まれること

2. **フロントエンドテスト (Vitest)**
   - `Question.tsx`: `readText`/`unreadText` が正しく色分け表示されること
   - `isSameQuestion()` が読了位置変化を検知すること

3. **E2E での動作確認**
   - 問題送出（`read_duration` なし）→ スコアボードに全文未読色で問題文表示
   - quiz_reader で音声再生 → 早押し → 停止 → `broadcastQuestion(readDuration)` 呼び出し → スコアボードで読了部分が明るく、未読部分が薄く表示
