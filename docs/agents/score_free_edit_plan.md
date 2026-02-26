# 得点状況の自由編集 実装プラン

## 概要

2R裏を除く全試合の得点入力画面に「自由編集」導線を追加し、各試合の現在スコア状態を任意値で一括更新できるようにする。  
更新は `ScoreOperation` 継承クラスで実行し、既存の immutable audit trail とアンドゥ機能を維持する。

## 公開IF / インタフェース変更

- 追加ルート: `GET /admin/matches/:match_id/score_free_edit/edit`
- 追加ルート: `PATCH /admin/matches/:match_id/score_free_edit`
- 追加パラメータ契約:
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][status]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][points]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][misses]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][stars]`
  - `score_free_edit_input[scores_by_matching_id][<matching_id>][rank]`
- 挙動変更:
  - 対象試合（2R裏以外）の `admin/matches/:id` に「自由編集」ボタンを表示
  - 2R裏では「自由編集」ボタンを表示しない（既存「勝抜け者入力フォーム」のみ）
  - 2R裏の `score_free_edit` 直アクセスは `422` で拒否

## 実装方針

### 1. ルール別編集定義の一元化

- `ScoreFreeEditInput` に「編集対象項目」と「許可 status 値」のマッピングを定義する。
- フォーム描画・強いパラメータ・バリデーションで同じ定義を参照し、定義の二重管理を避ける。

想定マッピング:

- `MatchRule::Round2Omote`: fields=`points/misses/rank/status`, statuses=`playing/waiting/win/lose`
- `MatchRule::Round3Hayaoshi71`: fields=`points/misses/rank/status`, statuses=`playing/waiting/win/lose`
- `MatchRule::Round3Hayaoshi73`: fields=`points/misses/rank/status`, statuses=`playing/waiting/win/lose`
- `MatchRule::Quarterfinal`: fields=`points/misses/rank/status`, statuses=`playing/waiting/win`
- `MatchRule::Round3Hayabo`: fields=`points/rank/status`, statuses=`playing/waiting/win`
- `MatchRule::Round3Hayabo2`: fields=`points/rank/status`, statuses=`playing/waiting/win`
- `MatchRule::Semifinal`: fields=`points/rank/status`, statuses=`playing/win/lose`
- `MatchRule::Playoff`: fields=`points/rank/status`, statuses=`playing/win/lose`
- `MatchRule::Final`: fields=`stars/points/misses/rank/status`, statuses=`playing/waiting/set_win/win`

### 2. 保存ロジック（ScoreOperation）

- `ScoreFreeEditOperation < ScoreOperation` を新規作成する。
- `before_create :set_path` で履歴チェーンを接続する。
- `after_create` で参加者全員分の `Score` を `insert_all!` で作成する。
- `after_create` で `match.last_score_operation` を自身に更新する。
- 既存 `Score` は更新せず、常に新規スナップショットを作成する。

### 3. フォームオブジェクト（ActiveType）

- `ScoreFreeEditInput < ActiveType::Object` を新規作成する。
- 主責務:
  - 対象試合が2R裏以外であることの検証
  - `matching_id` が対象試合の参加者に属することの検証
  - `status` がルール許可値に含まれることの検証
  - 検証通過後に `ScoreFreeEditOperation` を生成
- `rank/points/misses/stars` は完全自由（重複・欠番・整合性制約なし）として扱う。

### 4. コントローラ/ビュー

- `Admin::ScoreFreeEditsController` を追加し、`edit/update` を実装する。
- `edit`:
  - 参加者一覧、現在値、ルール別表示項目、status選択肢をセット
- `update`:
  - ルール別許可項目だけを受け取り保存
  - 成功時は `edit` へリダイレクト + フラッシュ
  - 失敗時は `422` で再描画
- `app/views/admin/score_free_edits/edit.html.erb` を追加する。

### 5. 導線追加

- 「自由編集」ボタンを各対象テンプレートへ追加する。
  - `app/views/admin/shared/matches/round2/show.html.erb`（2R裏分岐では非表示）
  - `app/views/admin/shared/matches/hayaoshi/show.html.erb`
  - `app/views/admin/shared/matches/hayabo/show.html.erb`
  - `app/views/admin/shared/matches/board/show.html.erb`
  - `app/views/admin/shared/matches/final/show.html.erb`
  - `app/views/admin/shared/matches/playoff/show.html.erb`
- 追加箇所が多いため、ボタンは部分テンプレート化して重複を抑える。

### 6. 操作履歴表示の可読性

- `MatchRule::Base#summarize_score_operation` に `ScoreFreeEditOperation` の要約（例: `自由編集`）を追加する。
- 既存履歴UIで新オペレーションが判読しやすい状態にする。

## 実装ステップ

1. `/Users/ani/c/yamabuki_cup_app/config/routes.rb` に `resource :score_free_edit, only: [:edit, :update]` を `admin/matches` 配下へ追加する。
2. `/Users/ani/c/yamabuki_cup_app/app/models/score_free_edit_input.rb` を新規作成する（ルール別定義、バリデーション、保存起点）。
3. `/Users/ani/c/yamabuki_cup_app/app/models/score_free_edit_operation.rb` を新規作成する（`ScoreOperation` 継承、スナップショット保存、`last_score_operation` 更新）。
4. `/Users/ani/c/yamabuki_cup_app/app/controllers/admin/score_free_edits_controller.rb` を新規作成する。
5. `/Users/ani/c/yamabuki_cup_app/app/views/admin/score_free_edits/edit.html.erb` を新規作成する。
6. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/_score_free_edit_button.html.erb` を新規作成し、各試合テンプレートに組み込む。
7. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/round2/show.html.erb` で 2R裏時は非表示、2R表時は表示にする。
8. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/hayaoshi/show.html.erb` を更新する。
9. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/hayabo/show.html.erb` を更新する。
10. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/board/show.html.erb` を更新する。
11. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/final/show.html.erb` を更新する。
12. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/playoff/show.html.erb` を更新する。
13. `/Users/ani/c/yamabuki_cup_app/app/models/match_rule/base.rb` に履歴要約の分岐を追加する。

## テスト計画（TDD順）

### フェーズA: モデル最小核（Red→Green→Refactor）

1. `/Users/ani/c/yamabuki_cup_app/spec/models/score_free_edit_input_spec.rb` を追加し、以下を先に失敗させる。
   - 2R裏は無効
   - 試合外 `matching_id` は無効
   - ルール外 `status` は無効
   - `rank` 重複/欠番でも有効
2. `ScoreFreeEditInput` を最小実装して Green 化し、エラーメッセージと定義テーブルを整理する。

### フェーズB: ScoreOperation保存（Red→Green→Refactor）

1. `/Users/ani/c/yamabuki_cup_app/spec/models/score_free_edit_operation_spec.rb` を追加し、以下を先に失敗させる。
   - 全参加者分 `Score` が作成される
   - 指定値（points/misses/stars/rank/status）がそのまま保存される
   - `path` が接続される
   - `match.last_score_operation` が更新される
   - 再編集で新しいスナップショットが積まれる
2. `ScoreFreeEditOperation` を実装して Green 化する。

### フェーズC: リクエスト/画面導線（Red→Green→Refactor）

1. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/score_free_edits_spec.rb` を追加する。
   - `admin`/`staff` の `GET edit` が成功
   - 未ログイン時はログイン画面へ遷移
   - `PATCH update` 成功時に `ScoreFreeEditOperation` が作成
   - 失敗時 `422` + エラー表示
   - 2R裏へのアクセスは `422`
2. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/matches_spec.rb`（新規）を追加する。
   - 2R裏以外で「自由編集」ボタン表示
   - 2R裏で非表示

### フェーズD: 履歴表示と回帰

1. `/Users/ani/c/yamabuki_cup_app/spec/models/match_rule/base_spec.rb`（必要なら新規）で `ScoreFreeEditOperation` の履歴文言を検証する。
2. `/Users/ani/c/yamabuki_cup_app/spec/models/score_undo_spec.rb` に自由編集オペレーションをアンドゥできるケースを追加する。

### 実行コマンド

- 途中確認:
  - `bundle exec rspec spec/models/score_free_edit_input_spec.rb`
  - `bundle exec rspec spec/models/score_free_edit_operation_spec.rb`
  - `bundle exec rspec spec/requests/admin/score_free_edits_spec.rb`
- 最終確認:
  - `bundle exec rspec`
  - `bundle exec rake check`

## 受け入れ基準

- 2R裏以外の各試合画面で「自由編集」ボタンが表示される。
- 2R裏では「自由編集」ボタンが表示されず、既存勝抜け者フォーム導線が維持される。
- ルール別の編集対象項目が正しく表示・保存される。
- `status` はルール許可値のみ保存できる。
- `rank` 重複や欠番を含む任意値を保存できる。
- 保存結果は `ScoreOperation` チェーンに積まれ、アンドゥ可能である。
- 既存の正誤送信・試合終了・得点表示切替機能に回帰がない。

## 前提・採用デフォルト

- 本機能は「運営による補正用途」であり、値の業務整合性は運用責任とする（`status` 制限のみシステム担保）。
- 既存のDBスキーマ変更は不要（`scores` / `score_operations` を再利用）。
- `admin` と `staff` の権限範囲は既存の管理画面認証に従う。
