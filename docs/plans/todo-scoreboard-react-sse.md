# TODO: スコアボード React+SSE 化 残タスク

計画ファイル: `docs/plans/20260227-scoreboard-react-question-display-sse.md`

---

## バックエンド

### [x] Step 1: question_broadcasts_spec.rb に SSE通知テスト追加

**ファイル:** `spec/requests/admin/question_broadcasts_spec.rb`

- `POST /admin/question_broadcasts` で `scoreboard.question_show` の通知が発火されることを検証
- `POST /admin/question_broadcasts/sample` でも同様に検証
- `POST /admin/question_broadcasts/clear` で `scoreboard.question_clear` の通知が発火されることを検証

※ Step 2（実装）は完了済み。テストのみ追加。

---

### [x] Step 3/4: SseSubscriptions クラス分離

**新規ファイル:**

- `app/models/scoreboard/sse_subscriptions.rb`
- `spec/models/scoreboard/sse_subscriptions_spec.rb`

**変更ファイル:**

- `app/controllers/scoreboard/sse_controller.rb`（購読ロジックを SseSubscriptions に移譲）

spec の検証内容:

- `scoreboard.match_init` → `queue` に `event: "match_init"` が入る
- `scoreboard.update` → `event: "match_update"`
- `scoreboard.show_scores` / `scoreboard.hide_scores`
- `scoreboard.question_show` / `scoreboard.question_clear`

---

## フロントエンド

### [x] Step 7/8: Question コンポーネントの消去アニメーション

**ファイル:**

- `app/typescript/scoreboard_react/__tests__/Question.test.tsx`（テスト追加）
- `app/typescript/scoreboard_react/components/Question.tsx`（実装）

追加するテスト:

- `question_clear` 相当（props を null）で `.question--hiding` が付き、`animationend` 後に消える
- 表示中に別問題へ更新した場合、いったん `.question--hiding` を経て新問題へ置換される

実装方針:

- 内部状態で「現在表示中の問題」「次に表示する問題」「hiding中」を管理
- `questionState` が null になったとき即アンマウントせず `.question--hiding` を付与
- `animationend` イベントで最終的にアンマウント
- 既存スタイル `.question`, `.question-text`, `.question-answer`, `.question--hiding` を利用

---

### [x] Step 9/10: ScoreboardRoot へのレイアウト責務移譲

**新規ファイル:**

- `app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx`

**変更ファイル:**

- `app/typescript/scoreboard_react/components/MatchScorelist.tsx`
- `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx`
- `app/typescript/scoreboard_react/App.tsx`

テスト内容:

- `ScoreboardRoot` が `columns-2` レイアウトの枠を持ち、左に `MatchScorelist`、右に `Question` を配置する
- `MatchScorelist` 単体は `columns-2` や `#question` を持たない

実装内容:

- `MatchScorelist` から `columns-2` と `#question` を除去
- `ScoreboardRoot` に `Question` を組み込み、`columns-2` レイアウトを管理
- `questionState` は `ScoreboardRoot` が直接受け取り `Question` へ渡す

---

### [x] Step 11: sse_spec.rb コメント整備

**ファイル:** `spec/requests/scoreboard/sse_spec.rb`

- 「通知配線検証」は `sse_subscriptions_spec.rb` に責務分離したことをコメントで明記

---

## 検証コマンド

```bash
# バックエンド
bundle exec rspec spec/requests/admin/question_broadcasts_spec.rb spec/models/scoreboard/sse_subscriptions_spec.rb spec/requests/scoreboard/sse_spec.rb

# フロントエンド
pnpm run test:run

# 全体
bundle exec rake check
```
