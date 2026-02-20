# 得点状況の自由編集 要件定義

## 1. 背景
試合運営中に、誤入力修正や運営判断により、現在の得点状況を直接補正したいケースがある。
既存の得点入力UIは問題単位の正誤送信が中心であり、現在値を一括で任意値に変更する機能がないため、新たに自由編集機能を追加する。

## 2. 対象範囲
- 対象画面: 各試合の得点入力画面（`/admin/matches/:id`）
- 対象試合: 2R裏を除く全試合
- 対象ユーザー: `admin` と `staff`
- 非対象:
  - 2R裏（既存の「勝抜け者入力フォーム」を継続利用）
  - 公開向け得点表示画面（`/scoreboard`）の仕様変更

## 3. 目的
- 試合ごとの現在スコア状態を、運営が任意値で直接編集できるようにする。
- 既存の不変履歴（`ScoreOperation`）とアンドゥ機能を維持したまま編集できるようにする。

## 4. 用語
- 自由編集: 本機能で行う、現在の各選手スコア状態の直接編集。
- 自由編集オペレーション: 自由編集保存時に作成される `ScoreOperation` 継承クラスのレコード。

## 5. 機能要件

### 5.1 導線（ボタン設置）
- 各対象試合の得点入力画面に「自由編集」ボタンを表示する。
- ボタン押下で、その試合専用の自由編集フォーム画面へ遷移する。
- 2R裏では「自由編集」ボタンは表示せず、既存の「勝抜け者入力フォーム」導線を維持する。

### 5.2 自由編集フォーム
- 対象試合の参加者全員を一覧表示する。
- 一覧の各行で、その試合ルールにおいて試合状況を表す全項目を編集可能にする。
- 保存時は、入力値を用いて参加者全員分の最新スコアスナップショットを作成する。

### 5.3 ルール別 編集対象項目
- 以下の通り、ルールごとに編集可能項目を固定する。

| 試合ルール | 編集可能項目 |
| --- | --- |
| `MatchRule::Round2Omote` | `points`, `misses`, `rank`, `status` |
| `MatchRule::Round3Hayaoshi71` | `points`, `misses`, `rank`, `status` |
| `MatchRule::Round3Hayaoshi73` | `points`, `misses`, `rank`, `status` |
| `MatchRule::Quarterfinal` | `points`, `misses`, `rank`, `status` |
| `MatchRule::Round3Hayabo` | `points`, `rank`, `status` |
| `MatchRule::Round3Hayabo2` | `points`, `rank`, `status` |
| `MatchRule::Semifinal` | `points`, `rank`, `status` |
| `MatchRule::Playoff` | `points`, `rank`, `status` |
| `MatchRule::Final` | `stars`, `points`, `misses`, `rank`, `status` |

### 5.4 status の選択肢制限
- `status` は完全自由にせず、試合ルールごとに使用値へ制限する。
- ルール別の許可値は以下の通り。

| 試合ルール | 許可する `status` |
| --- | --- |
| `MatchRule::Round2Omote` | `playing`, `waiting`, `win`, `lose` |
| `MatchRule::Round3Hayaoshi71` | `playing`, `waiting`, `win`, `lose` |
| `MatchRule::Round3Hayaoshi73` | `playing`, `waiting`, `win`, `lose` |
| `MatchRule::Quarterfinal` | `playing`, `waiting`, `win` |
| `MatchRule::Round3Hayabo` | `playing`, `waiting`, `win` |
| `MatchRule::Round3Hayabo2` | `playing`, `waiting`, `win` |
| `MatchRule::Semifinal` | `playing`, `win`, `lose` |
| `MatchRule::Playoff` | `playing`, `win`, `lose` |
| `MatchRule::Final` | `playing`, `waiting`, `set_win`, `win` |

### 5.5 バリデーション
- 保存時に検証する内容:
  - 対象試合が 2R裏ではないこと。
  - 編集対象の `matching_id` が全て対象試合に属すること。
  - `status` が当該ルールの許可値に含まれること。
- それ以外の値制約:
  - `points`, `misses`, `stars`, `rank` は完全自由入力（業務上の重複・欠番・整合性制約は設けない）。
  - `rank` は重複可・欠番可・空欄可とする。

### 5.6 保存方式（ScoreOperation）
- 自由編集は `ScoreOperation` 継承クラスとして実装する。
- 保存時の処理:
  - `path` を既存ルールに従って接続し、履歴チェーンを維持する。
  - 参加者全員分の `Score` を新規作成してスナップショット化する（既存 `Score` は更新しない）。
  - `match.last_score_operation` を新しい自由編集オペレーションへ更新する。

### 5.7 アンドゥ
- 自由編集オペレーションは既存の「アンドゥ」対象とする。
- 取り消し時は既存 `ScoreUndo` と同じ挙動で直前状態に復帰する。

### 5.8 再編集
- 自由編集は回数制限なく再実行できる。
- 再編集時も毎回新しい `ScoreOperation` を作成し、最新状態を反映する。

### 5.9 権限制御
- 自由編集フォームの表示・更新は `admin` と `staff` に許可する。
- 未認証ユーザーおよび権限外ユーザーはアクセス不可とする。

## 6. 画面要件
- 試合画面:
  - 「自由編集」ボタンを追加。
- 自由編集フォーム画面:
  - 試合名表示
  - 試合画面への戻る導線
  - 参加者一覧と編集入力欄
  - バリデーションエラー表示
  - 保存完了メッセージ表示

## 7. データ要件
- 追加する編集結果は既存 `scores` テーブルに記録する。
- 既存の監査追跡方針（Immutable Audit Trail）を維持し、過去オペレーションや過去スコアは更新しない。

## 8. 非機能・運用要件
- 入力エラー時は、どの項目が不正かを管理画面上で判別できること。
- 既存の試合進行機能（正誤送信・限定問題終了・勝抜け処理）を阻害しないこと。

## 9. スコープ外
- 2R裏の運用変更（勝抜け者フォームの置換）は行わない。
- 自由編集の承認ワークフローや履歴比較UIは実装しない。
- ルールエンジン側の勝敗判定ロジック自体は変更しない。

## 10. 受け入れ基準
- 2R裏以外の各試合画面で「自由編集」ボタンが表示される。
- 2R裏では「自由編集」ボタンが表示されず、既存の勝抜け者フォーム導線が表示される。
- 自由編集フォームで、対象ルールの編集可能項目を更新して保存できる。
- `status` にルール外の値を指定すると保存できず、エラー表示される。
- `rank` 重複や欠番、`points/misses/stars` の任意値を指定しても保存できる。
- 保存後、`match.last_score_operation` が自由編集オペレーションを指す。
- 操作履歴に自由編集オペレーションが追加される。
- 直後にアンドゥすると自由編集前の状態へ戻る。
- `admin` と `staff` の両方でフォームアクセス・保存が可能である。
