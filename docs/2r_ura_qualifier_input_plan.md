# 2R裏 勝抜け者入力 実装プラン（改訂）

## 概要
2R裏の全試合で得点入力を廃止し、試合参加者から勝抜け4名と順位1〜4を一括入力・再編集できるようにする。  
`points` は全員 `0` で保存し、`勝1〜勝4` は `rank` を正として扱うため、プレーオフ組分けのみ最小変更で `rank` 参照に切り替える。  
`scoreboard/round2_ura/_init.html.erb` と `scoreboard/round2_ura/_show.html.erb` は作成しない。

## 公開IF / インタフェース変更
- 追加ルート: `GET /admin/matches/:match_id/round2_ura_qualifier/edit`
- 追加ルート: `PATCH /admin/matches/:match_id/round2_ura_qualifier`
- 追加パラメータ契約: `round2_ura_qualifier_input[rank_by_matching_id][<matching_id>] = "" | "1" | "2" | "3" | "4"`
- 挙動変更: `POST /admin/matches/:match_id/question_closings` は 2R裏で `422`
- 挙動変更: `POST /admin/matches/:match_id/match_closings` は 2R裏で `422`
- 挙動変更: `POST /admin/scoreboard_manipulations` の `action_name=match_display` は 2R裏で `422`（2R裏を得点表示画面に切り替えさせない）

## 実装ステップ
1. `/Users/ani/c/yamabuki_cup_app/app/models/round2_ura_qualifier_input.rb` を新規作成する。`ActiveType::Object` で入力バリデーションと保存起点を持たせる。検証条件は「対象が2R裏」「同一試合参加者のみ」「rank指定はちょうど4名」「rankは1,2,3,4を重複なしで全て使用」。
2. `/Users/ani/c/yamabuki_cup_app/app/models/round2_ura_qualifier_update.rb` を新規作成する。`ScoreOperation` 継承で不変履歴を維持し、毎回新しい `Score` スナップショットを作成する。保存値は勝抜け者 `status=win, rank=1..4, points=0, misses=0`、非勝抜け者 `status=lose, rank=nil, points=0, misses=0`。
3. `/Users/ani/c/yamabuki_cup_app/config/routes.rb` に `resource :round2_ura_qualifier, only: [:edit, :update]` を `admin/matches` 配下へ追加する。
4. `/Users/ani/c/yamabuki_cup_app/app/controllers/admin/round2_ura_qualifiers_controller.rb` を新規作成する。`edit` で参加者一覧と既存rankを表示、`update` で一括保存、失敗時422再描画。`admin`/`staff` とも利用可。
5. `/Users/ani/c/yamabuki_cup_app/app/views/admin/round2_ura_qualifiers/edit.html.erb` を新規作成する。行ごとに参加者と順位セレクトを出し、4名分まとめて更新するUIにする。
6. `/Users/ani/c/yamabuki_cup_app/app/views/admin/shared/matches/round2/show.html.erb` を条件分岐対応する。2R裏では得点入力表と「スルー/限定問題終了」を表示せず、「勝抜け者入力フォーム」リンクと現在の勝抜け順位表示のみ出す。2R表は現状維持。
7. `/Users/ani/c/yamabuki_cup_app/app/controllers/admin/question_closings_controller.rb` と `/Users/ani/c/yamabuki_cup_app/app/controllers/admin/match_closings_controller.rb` に2R裏ガードを追加する。
8. `/Users/ani/c/yamabuki_cup_app/app/controllers/admin/scoreboard_manipulations_controller.rb` の `match_display` に2R裏ガードを追加する。これで2R裏の得点表示切替を禁止する。
9. `/Users/ani/c/yamabuki_cup_app/app/models/matchmaking/playoff.rb` を最小変更する。2R裏勝者の抽出順を `rank` 昇順に変更し、`勝1〜勝4` が `rank1〜4` と一致するようにする。必要なら `rank` 欠落/重複時のバリデーションエラーを追加する。
10. `/Users/ani/c/yamabuki_cup_app/app/models/match_rule/round2_ura.rb` の履歴表示文言に `Round2UraQualifierUpdate` を加える。

## テスト計画（TDD順）
1. `/Users/ani/c/yamabuki_cup_app/spec/models/round2_ura_qualifier_input_spec.rb` を追加し、入力バリデーションと保存可否を先に失敗させる。
2. `/Users/ani/c/yamabuki_cup_app/spec/models/round2_ura_qualifier_update_spec.rb` を追加し、`ScoreOperation` チェーン更新・`points=0`・`rank保存`・再編集時上書きを検証する。
3. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/round2_ura_qualifiers_spec.rb` を追加し、`admin`/`staff` のアクセス、成功、422、エラーメッセージを検証する。
4. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/matches_spec.rb` を追加し、2R裏画面で得点UIが消え、フォームリンクが表示されることを検証する。
5. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/round2_score_operations_guard_spec.rb` を追加し、2R裏への `question_closings`/`match_closings` が422になることを検証する。
6. `/Users/ani/c/yamabuki_cup_app/spec/requests/admin/scoreboard_manipulations_spec.rb` を追加し、2R裏 `match_display` の拒否を検証する。
7. `/Users/ani/c/yamabuki_cup_app/spec/models/matchmaking/playoff_spec.rb` を更新し、2R裏勝者の並びが `rank` 基準で割り当てられることを検証する。
8. 既存回帰として `bundle exec rspec` の関連対象を実行し、最終的に `bundle exec rake check` を通す計画で完了判定とする。

## 受け入れ基準
- 2R裏の試合管理画面で得点入力UIが表示されない。
- 2R裏で勝抜け者入力フォームへのリンクが表示される。
- 参加者から4名を選び、順位1〜4を一意に指定して保存できる。
- 同順位、4名未満/超過、対象外参加者指定は保存できない。
- 再編集時は最新内容に上書きされる。
- 保存された2R裏の `Score` は全員 `points=0`。
- `勝1〜勝4` はプレーオフ組分けで `rank1〜4` と一致する。
- 2R裏は得点表示画面へ切り替えできない。

## 前提・採用デフォルト
- 「試合後入力」は運用前提とし、システム上は「4名一括入力必須」で担保する。試合状態フラグの追加は行わない。
- 既存2R裏データは事前削除済み前提で、データ移行は行わない。
- 変更履歴機能は新設しない（内部の `ScoreOperation` 履歴は既存仕組みとして残る）。

