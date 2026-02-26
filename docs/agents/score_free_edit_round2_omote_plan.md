# 得点状況の自由編集 実装プラン（Phase 1: 2R表のみ）

## 概要

まずは `MatchRule::Round2Omote`（2R表）のみを対象に「自由編集」を実装し、運用上の使い勝手とアンドゥ連携を確認する。  
2R裏は既存の勝抜け者入力フォームを維持し、本フェーズでは変更しない。

## スコープ

- 対象:
  - 2R表試合画面（`/admin/matches/:id`）への「自由編集」導線追加
  - 2R表用の自由編集フォーム（`points/misses/rank/status`）
  - `ScoreOperation` 継承での保存と既存アンドゥ対応
- 非対象:
  - 2R表以外の全ルール
  - 2R裏（既存仕様維持）
  - 公開得点表示画面の変更

## 公開IF / インタフェース変更

- 追加ルート:
  - `GET /admin/matches/:match_id/score_free_edit/edit`
  - `PATCH /admin/matches/:match_id/score_free_edit`
- パラメータ契約（Phase 1）:
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][status]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][points]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][misses]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][rank]`
- 画面導線:
  - 2R表: 「自由編集」ボタン表示
  - 2R裏: ボタン非表示（既存「勝抜け者入力フォーム」のみ）

## 実装方針

### 1. 先行実装を最小に限定

- 機能有効化は `MatchRule::Round2Omote` のみ。
- `ScoreFreeEditInput` の許可ルール判定を厳密にし、対象外ルールは `422` で拒否する。

### 2. 保存は既存監査方式を踏襲

- `ScoreFreeEditOperation < ScoreOperation` を追加。
- `set_path` により immutable な履歴チェーンを維持。
- 保存時は既存 `Score` を更新せず、全参加者分を新規スナップショット作成。
- `match.last_score_operation` を新オペレーションへ更新。

### 3. 値制約

- `status` は2R表の許可値（`playing`, `waiting`, `win`, `lose`）のみ。
- `points/misses/rank` は完全自由（重複・欠番・整合性制約なし）。

### 4. 将来拡張に備える設計

- ルール別設定を定数マップで実装し、Phase 1では2R表のみ定義。
- Phase 2以降はこのマップへルールを追加して展開できる形にする。

## 実装ステップ

1. `config/routes.rb`

- `admin/matches` 配下に `resource :score_free_edit, only: [:edit, :update]` を追加する。

2. `app/models/score_free_edit_input.rb`（新規）

- `ActiveType::Object` で実装。
- 検証:
  - 対象試合が `MatchRule::Round2Omote` であること。
  - すべての `matching_id` が対象試合に属すること。
  - `status` が許可値内であること。
- 保存時に `ScoreFreeEditOperation` を作成。

3. `app/models/score_free_edit_operation.rb`（新規）

- `ScoreOperation` 継承。
- `before_create :set_path`。
- `after_create` で `scores` を全員分 `insert_all!`。
- `after_create` で `match.last_score_operation` 更新。

4. `app/controllers/admin/score_free_edits_controller.rb`（新規）

- `edit`:
  - 2R表の参加者・現在スコアを表示。
- `update`:
  - フォームオブジェクトで保存。
  - 成功: `edit` にリダイレクト。
  - 失敗: `422` で再描画。

5. `app/views/admin/score_free_edits/edit.html.erb`（新規）

- 2R表向けに `status/points/misses/rank` 入力欄を表示。
- バリデーションエラーと保存成功メッセージを表示。
- 「試合画面に戻る」導線を配置。

6. `app/views/admin/shared/matches/round2/show.html.erb`

- 2R表分岐にのみ「自由編集」ボタンを追加。
- 2R裏分岐には追加しない。

7. `app/models/match_rule/base.rb`

- 操作履歴要約に `ScoreFreeEditOperation`（例: `自由編集`）を追加。

## テスト計画（TDD順）

### A. フォームオブジェクト

1. `spec/models/score_free_edit_input_spec.rb`（新規）

- 2R表で有効な入力は保存できる（Red→Green）。
- 2R裏は無効。
- 2R表以外ルールは無効。
- 試合外 `matching_id` は無効。
- 許可外 `status` は無効。
- `rank` 重複・欠番でも有効。

### B. ScoreOperation

1. `spec/models/score_free_edit_operation_spec.rb`（新規）

- 全参加者分 `Score` 作成。
- `points/misses/rank/status` が指定値で保存。
- `path` 接続。
- `match.last_score_operation` 更新。
- 再編集時に新スナップショットが積まれる。

### C. リクエスト

1. `spec/requests/admin/score_free_edits_spec.rb`（新規）

- `admin` / `staff` で `GET edit` 成功。
- 未ログインはログインへリダイレクト。
- `PATCH update` 成功時に `ScoreFreeEditOperation` が作成。
- 無効入力は `422`。
- 2R裏アクセスは `422`。

2. `spec/requests/admin/matches_spec.rb`（新規）

- 2R表で「自由編集」ボタン表示。
- 2R裏で非表示。

### D. 回帰

1. `spec/models/score_undo_spec.rb` 追記

- 自由編集オペレーションをアンドゥできること。

## 動作確認手順

### 自動テスト

- `bundle exec rspec spec/models/score_free_edit_input_spec.rb`
- `bundle exec rspec spec/models/score_free_edit_operation_spec.rb`
- `bundle exec rspec spec/requests/admin/score_free_edits_spec.rb`
- `bundle exec rspec spec/requests/admin/matches_spec.rb`

### ブラウザ確認（playwright-cli）

- 2R表の試合画面で「自由編集」ボタンが表示される。
- 押下で自由編集フォームへ遷移する。
- 値変更保存後に試合画面へ戻ると反映される。
- アンドゥ実行で直前状態へ戻る。
- 2R裏試合画面で「自由編集」ボタンが表示されない。

## 完了条件

- 2R表のみで自由編集が利用できる。
- `status` 制限以外は自由入力で保存できる。
- 操作履歴に残り、アンドゥで取り消せる。
- 2R裏の既存仕様に影響がない。

## Phase 2 への引き継ぎポイント

- ルール定義マップへ他ルールを追加し、フォーム表示項目と `status` 許可値を段階拡張する。
- 画面導線は各テンプレートへ順次展開する。
