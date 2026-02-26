## 早押し機連携 V1 実装プラン（段階実装 / 実機シリアル未実装）

### 全体方針

- `docs/buzzer_architecture.md` に準拠し、制御ウィンドウとスコアボードウィンドウの責務を分離する。
- 実機シリアル通信は V1 では未実装とし、制御ウィンドウ上のエミュレータで運用成立させる。
- V1 の実装対象シグナルは `button_pressed` と `reset`（`correct`/`wrong` は型予約のみ）。
- 制御画面のアクセス権限は `admin` と `staff` の両方を許可する（管理者認証は必須）。
- フェーズごとにリリース可能な粒度で進める。

---

## フェーズ計画

### Phase 1: エミュレータ

#### 実装範囲

- `GET /admin/buzzer_controls` を追加し、制御画面を新設する。
- `BuzzerControlsController#show` を追加する（`require_admin_role` は付けない）。
- 管理メニューに「早押し機連携」導線を追加する。
- エミュレータ UI を実装する。
  - ボタン `1..24`
  - `reset` ボタン
  - 接続状態インジケータ（`未接続（実機未実装）`）
- Stimulus でボタン押下/`reset` 操作の UI 反応を実装する。

#### 非範囲

- 席割り当て（学習モード、永続化）
- `button_pressed` の BroadcastChannel 送信
- スコアボード画面への表示反映

#### 主な変更対象

- [config/routes.rb](/Users/ani/c/yamabuki_cup_app/config/routes.rb)
- [app/controllers/admin/buzzer_controls_controller.rb](/Users/ani/c/yamabuki_cup_app/app/controllers/admin/buzzer_controls_controller.rb)
- [app/views/admin/buzzer_controls/show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/admin/buzzer_controls/show.html.erb)
- [app/views/layouts/admin.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/layouts/admin.html.erb)
- [app/typescript/controllers/buzzer_control_controller.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/controllers/buzzer_control_controller.ts)
- [app/typescript/controllers/admin_index.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/controllers/admin_index.ts)

#### テスト（TDD）

- request spec
  - admin: 200
  - staff: 200
  - 未ログイン: ログイン画面へリダイレクト
- stimulus unit
  - エミュレータボタン押下時の UI 反応
  - `reset` 操作時の UI 反応

#### 完了条件

- `/admin/buzzer_controls` にアクセスでき、エミュレータ UI が操作可能である。

---

### Phase 2: ボタン割り当て

#### 実装範囲

- 学習モードを追加する（席0..11 の割り当て UI）。
- 「設定」ボタンで待受席を1つだけ有効化する。
- 待受中に押されたボタンを席へ割り当てる。
- `localStorage["buzzerMapping"]` へ保存・復元を実装する。
- 重複解決を実装する（1ボタン1席 / 1席1ボタン）。
- `BroadcastChannel("buzzer")` への送信を実装する。
  - `{ type: "button_pressed", seat }`
  - `{ type: "reset" }`

#### 非範囲

- スコアボード側の点灯クラス付与・消去ロジック

#### 主な変更対象

- [app/typescript/lib/buzzer/signal.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/lib/buzzer/signal.ts)
- [app/typescript/lib/buzzer/channel.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/lib/buzzer/channel.ts)
- [app/typescript/lib/buzzer/mapping_store.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/lib/buzzer/mapping_store.ts)
- [app/typescript/controllers/buzzer_control_controller.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/controllers/buzzer_control_controller.ts)
- [app/views/admin/buzzer_controls/show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/admin/buzzer_controls/show.html.erb)

#### テスト（TDD）

- stimulus unit
  - 待受中は Broadcast しない
  - 通常時は seat 解決できた場合のみ `button_pressed` 送信
  - 未割り当てボタンは無送信
  - `reset` 送信
  - 全消去
  - 重複解決（同席再割り当て・同ボタン再割り当て）
  - localStorage 保存/復元

#### 完了条件

- 割り当て済みボタン押下で `button_pressed` が送信され、`reset` 送信も確認できる。

---

### Phase 3: 得点表示連携

#### 実装範囲

- 試合表示用パーシャルのプレート要素に `data-seat="<%= score.matching.seat %>"` を付与する。
- スコアボード側 Stimulus を追加し、`button_pressed/reset` を受信する。
- 表示仕様を実装する。
  - 押下プレートを点灯維持
  - `reset` で全解除
  - `match-scorelist` 更新時に自動クリア
- 試合表示 `*_init.html.erb` のみで受信コントローラを有効化する。
- 点灯用 CSS クラスを追加する（`player--buzzer-pressed`）。

#### 非範囲

- announcement/timer など試合得点表示以外の画面対応
- `correct`/`wrong` の演出実装

#### 主な変更対象

- [app/typescript/controllers/buzzer_scoreboard_controller.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/controllers/buzzer_scoreboard_controller.ts)
- [app/typescript/entrypoints/scoreboard.ts](/Users/ani/c/yamabuki_cup_app/app/typescript/entrypoints/scoreboard.ts)
- [app/views/scoreboard/hayaoshi/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/hayaoshi/_init.html.erb)
- [app/views/scoreboard/hayabo/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/hayabo/_init.html.erb)
- [app/views/scoreboard/round2/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/round2/_init.html.erb)
- [app/views/scoreboard/playoff/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/playoff/_init.html.erb)
- [app/views/scoreboard/final/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/final/_init.html.erb)
- [app/views/scoreboard/board/\_init.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/board/_init.html.erb)
- [app/views/scoreboard/hayaoshi/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/hayaoshi/_show.html.erb)
- [app/views/scoreboard/hayabo/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/hayabo/_show.html.erb)
- [app/views/scoreboard/round2/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/round2/_show.html.erb)
- [app/views/scoreboard/playoff/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/playoff/_show.html.erb)
- [app/views/scoreboard/final/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/final/_show.html.erb)
- [app/views/scoreboard/board/\_show.html.erb](/Users/ani/c/yamabuki_cup_app/app/views/scoreboard/board/_show.html.erb)
- [app/assets/stylesheets/scoreboard.css](/Users/ani/c/yamabuki_cup_app/app/assets/stylesheets/scoreboard.css)

#### テスト（TDD）

- stimulus unit
  - `button_pressed` で該当 seat のみ点灯
  - 別 seat 押下で点灯移動
  - `reset` で全解除
  - seat 不一致を無視
  - `match-scorelist` 更新イベントで内部状態クリア
- 既存 scoreboard 系テスト回帰
  - `app/typescript/lib/scoreboard/stream_actions.test.ts`

#### 完了条件

- 試合得点表示画面でのみ押下プレート点灯が機能し、`reset` と得点更新で消去される。

---

## 公開インターフェース変更（段階別）

### Phase 1

1. Route: `GET /admin/buzzer_controls`

### Phase 2

1. BroadcastChannel 名: `"buzzer"`
2. Signal type:
   - `{ type: "button_pressed", seat }`
   - `{ type: "reset" }`
   - `correct` / `wrong` は型予約のみ（V1 実装外）
3. Storage: `localStorage["buzzerMapping"]`

### Phase 3

1. DOM 契約: 試合表示プレートに `data-seat` を付与
2. スコアボード受信契約: `button_pressed/reset` 受信で点灯状態を更新

---

## テスト計画（フェーズ別 TDD）

### 実行順（固定）

1. Phase 1 完了時
   - `bundle exec rspec spec/requests/admin/buzzer_controls_spec.rb`
   - `npm run test:run -- app/typescript/controllers/__tests__/buzzer_control_controller.test.ts`
2. Phase 2 完了時
   - Phase 1 のテストを再実行
   - `buzzer_control_controller.test.ts` に割り当てケースを追加して再実行
3. Phase 3 完了時
   - `npm run test:run -- app/typescript/controllers/__tests__/buzzer_scoreboard_controller.test.ts app/typescript/lib/scoreboard/stream_actions.test.ts`
   - `bundle exec rake check`

### TDD 運用ルール

- 各フェーズで Red → Green → Refactor を完結させる。
- 次フェーズへ進む前に、当該フェーズの完了条件とテスト通過を確認する。

---

## 受け入れ基準（フェーズ別 + 最終）

### Phase 1

1. `/admin/buzzer_controls` に admin/staff がアクセスできる。
2. エミュレータ `1..24/reset` の操作と接続状態表示（未実装表示）が機能する。

### Phase 2

1. 席割り当て UI と学習モードが機能する。
2. 割り当てが localStorage に保存・復元される。
3. 割り当て済み押下で `button_pressed`、`reset` ボタンで `reset` が送信される。

### Phase 3

1. 試合得点表示画面でのみ押下プレートが点灯維持される。
2. `reset` で点灯が解除される。
3. `match-scorelist` 更新（得点更新）で点灯が自動クリアされる。

### 最終

1. 実機未接続でもエミュレータのみで一連の運用が成立する。
2. 既存の scoreboard 機能に回帰がない。

---

## 前提・既定値

1. 実機シリアル通信は V1 では未実装。
2. 制御画面は staff を許可（admin 認証は必須）。
3. V1 実装シグナルは `button_pressed` と `reset`。
4. 点灯解除は `reset` または得点更新時自動クリア。
5. `correct` / `wrong` は V1 実装外（型予約のみ）。
