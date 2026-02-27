# 計画: スコアボード問題表示の React+SSE 化（改訂版）

## Context

現在の React+SSE 版スコアボード（`/scoreboard/react`）はスコア情報のみを表示しており、問題表示機能が未実装。
非 React 版（ActionCable + Turbo Stream）では `Admin::QuestionBroadcastsController` が `replace_question` を送信し、問題表示の差し替えと消去アニメーション（`.question--hiding`）を提供している。

本タスクでは、React 版にも以下を実装する。

- SSE 経由の問題表示更新（`question_show` / `question_clear`）
- 非 React 版同等の消去アニメーション再現
- 将来の 1R タイマー等（`columns-2` 以外）に備えたレイアウト責務整理

## 設計方針

1. **レイアウト責務は `ScoreboardRoot` に集約**
   `MatchScorelist` はスコア表示専用コンポーネントにする。`columns-2` と右ペイン（問題表示）は `ScoreboardRoot` が管理する。

2. **SSE 配線は「通知名→イベント名」をテスト可能な形で分離**
   `ActionController::Live` 依存の `stream` 本体ではなく、通知購読処理を別オブジェクトに切り出してユニットテスト可能にする。

3. **Question の挙動は状態遷移で再現**
   `question_clear` 受信時は即アンマウントせず `.question--hiding` を付与し、`animationend` で消去する。
   `question_show` の上書き時も同じ遷移で切り替える。

---

## 実装ステップ（TDD）

### Step 1: バックエンド — QuestionBroadcasts 通知テスト追加（RED）

**対象ファイル:** `spec/requests/admin/question_broadcasts_spec.rb`

追加するテスト:

- `POST /admin/question_broadcasts` で `ActiveSupport::Notifications.instrument("scoreboard.question_show", payload: { text:, answer: })` が呼ばれる
- `POST /admin/question_broadcasts/sample` でも同様に呼ばれる
- `POST /admin/question_broadcasts/clear` で `ActiveSupport::Notifications.instrument("scoreboard.question_clear")` が呼ばれる

ActionCable broadcast テストは既存を維持し、**ActionCable と SSE 通知の両方**を検証する。

### Step 2: バックエンド — QuestionBroadcasts へ SSE 通知追加（GREEN）

**対象ファイル:** `app/controllers/admin/question_broadcasts_controller.rb`

- `broadcast_question_board` に `scoreboard.question_show` の instrument を追加
- `clear_question_board` に `scoreboard.question_clear` の instrument を追加

### Step 3: バックエンド — SSE 配線テスト追加（RED）

**新規ファイル:** `spec/models/scoreboard/sse_subscriptions_spec.rb`

通知購読ロジックを切り出したクラス（Step 4 で追加）に対し、以下を検証:

- `scoreboard.match_init` → `queue` に `event: "match_init"` が入る
- `scoreboard.update` → `event: "match_update"`
- `scoreboard.show_scores` / `scoreboard.hide_scores`
- `scoreboard.question_show` / `scoreboard.question_clear`

※ `SseWriter` 直接呼び出しだけではなく、**通知名の配線誤りを検知できるテスト**にする。

### Step 4: バックエンド — SSE 購読ロジック分離（GREEN）

**新規ファイル:** `app/models/scoreboard/sse_subscriptions.rb`  
**対象ファイル:** `app/controllers/scoreboard/sse_controller.rb`

- `Scoreboard::SseSubscriptions.subscribe(queue)` を追加
- 戻り値として subscriber 配列を返し、`ensure` で unsubscribe する
- `SseController#stream` はこの購読クラスを使うように変更

### Step 5: フロントエンド — 型と SSE フックのテスト追加（RED）

**対象ファイル:** `app/typescript/scoreboard_react/types.ts`  
**対象ファイル:** `app/typescript/scoreboard_react/__tests__/useScoreboardSSE.test.ts`

追加内容:

- `QuestionState` 型
- `useScoreboardSSE` の戻り値に `questionState: QuestionState | null`
- テストケース
  - 初期状態で `questionState` は `null`
  - `question_show` で更新
  - `question_clear` で `null`
  - `match_init` で `questionState` がリセット

### Step 6: フロントエンド — SSE フック拡張（GREEN）

**対象ファイル:** `app/typescript/scoreboard_react/hooks/useScoreboardSSE.ts`

- `question_show` / `question_clear` のイベントリスナーを追加
- `match_init` で `questionState` をクリア

### Step 7: フロントエンド — Question の挙動テスト追加（RED）

**新規ファイル:** `app/typescript/scoreboard_react/__tests__/Question.test.tsx`

テストケース:

- `questionState = null` かつ表示中データなしなら何も描画しない
- `question_show` 相当の props で問題文・解答を表示
- `question_clear` 相当（props を `null`）で `.question--hiding` が付き、`animationend` 後に消える
- 表示中に別問題へ更新した場合、いったん `.question--hiding` を経て新問題へ置換される

### Step 8: フロントエンド — Question コンポーネント実装（GREEN）

**新規ファイル:** `app/typescript/scoreboard_react/components/Question.tsx`

実装方針:

- 内部状態で「現在表示中の問題」「次に表示する問題」「hiding中」を管理
- `questionState` 変更時に状態遷移を行う
- `animationend` で最終的な表示内容へ反映
- DOM/CSS クラスは既存スタイル（`.question`, `.question-text`, `.question-answer`, `.question--hiding`）を利用

### Step 9: フロントエンド — レイアウト責務移譲のテスト追加（RED）

**新規ファイル:** `app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx`

テストケース:

- `ScoreboardRoot` が `columns-2` レイアウトの枠を持ち、左に `MatchScorelist`、右に `Question` を配置する
- `MatchScorelist` 単体は `columns-2` や `#question` を持たない（スコア表示専用）

### Step 10: フロントエンド — レイアウト責務移譲（GREEN）

**対象ファイル:** `app/typescript/scoreboard_react/components/MatchScorelist.tsx`  
**対象ファイル:** `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx`  
**対象ファイル:** `app/typescript/scoreboard_react/App.tsx`

実装内容:

- `MatchScorelist` から `columns-2` と `#question` を除去
- `ScoreboardRoot` に `Question` を組み込み、`columns-2` レイアウトを管理
- `ScoreboardRoot` の props に `questionState` を追加
- `App.tsx` から `questionState` を渡す

将来拡張のため、`ScoreboardRoot` 内のメインレイアウト判定は関数化し、`columns-2` 以外への切替ポイントを明示する（現時点では実際の切替は行わない）。

### Step 11: 既存 SSE writer テスト整備（REFACTOR）

**対象ファイル:** `spec/requests/scoreboard/sse_spec.rb`

- 既存の `SseWriter` フォーマット検証は維持
- 「通知配線検証」は Step 3 の購読ロジック spec に役割分離したことをコメントで明記

---

## 重要ファイル

| ファイル                                                             | 変更種別               |
| -------------------------------------------------------------------- | ---------------------- |
| `spec/requests/admin/question_broadcasts_spec.rb`                    | テスト追加             |
| `app/controllers/admin/question_broadcasts_controller.rb`            | SSE通知追加            |
| `app/models/scoreboard/sse_subscriptions.rb`                         | 新規作成               |
| `spec/models/scoreboard/sse_subscriptions_spec.rb`                   | 新規作成               |
| `app/controllers/scoreboard/sse_controller.rb`                       | 購読ロジック利用へ更新 |
| `app/typescript/scoreboard_react/types.ts`                           | 型追加                 |
| `app/typescript/scoreboard_react/hooks/useScoreboardSSE.ts`          | フック拡張             |
| `app/typescript/scoreboard_react/__tests__/useScoreboardSSE.test.ts` | テスト追加             |
| `app/typescript/scoreboard_react/components/Question.tsx`            | 新規作成               |
| `app/typescript/scoreboard_react/__tests__/Question.test.tsx`        | 新規作成               |
| `app/typescript/scoreboard_react/components/MatchScorelist.tsx`      | 責務整理               |
| `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx`      | レイアウト責務集約     |
| `app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx`  | 新規作成               |
| `app/typescript/scoreboard_react/App.tsx`                            | props受け渡し更新      |
| `spec/requests/scoreboard/sse_spec.rb`                               | コメントと責務整理     |

`scoreboard.css` は既存スタイルを利用するため原則変更しない。

---

## 検証方法

1. **バックエンド関連**
   `bundle exec rspec spec/requests/admin/question_broadcasts_spec.rb spec/models/scoreboard/sse_subscriptions_spec.rb spec/requests/scoreboard/sse_spec.rb`

2. **フロントエンド関連**
   `pnpm run test:run`

3. **全体チェック**
   `bundle exec rake check`

4. **動作確認（手動）**
   `./bin/dev` 起動後に `/scoreboard/react` を開き、管理画面から

- 問題送出で右ペインに表示される
- クリアで上方向の hide アニメーション後に消える
- 連続送出でも最新問題へ正しく切り替わる
  を確認する。
