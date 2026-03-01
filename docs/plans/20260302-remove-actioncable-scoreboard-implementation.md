# スコアボード ActionCable 実装の削除

## Context

React+SSE版スコアボード（`/scoreboard/react`）が完全実装済みのため、旧Turbo Stream+ActionCable版スコアボード（`/scoreboard`）の実装を削除する。

ActionCableはスコアボード機能専用に使われており、他の機能（ブザー、エントリー管理等）では使用していないため、完全に除去する。

**事前確認済み事項:**

- `render_to_string` は ActionCable broadcast 側にのみ使われており、SSE 側の `Notifications.instrument` payload には渡されていない → 安全に削除可能
- `db/cable_schema.rb` が存在し、`solid_cable_messages` テーブルが定義されている → 削除が必要
- カスタム Turbo Stream アクションは `config/initializers/turbo_stream.rb` に集約されている → 削除が必要
- SSE 側（`sse_controller.rb` / `sse_subscriptions.rb`）はビューテンプレートを一切参照していない

---

## 削除対象ファイル

### Rails チャンネル

- `app/channels/scoreboard_channel.rb`
- `app/channels/application_cable/connection.rb`
- `app/channels/application_cable/channel.rb`

### コントローラ・レイアウト

- `app/controllers/scoreboard_controller.rb`
- `app/views/layouts/scoreboard.html.erb`

### スコアボードビュー（`app/views/scoreboard/` 配下の `react/` 以外全て）

- `show.html.erb`, `timer.html.erb`
- `announcement/`, `paper_seed/`, `first_place/`
- `round2omote_announcement/`, `round2ura_announcement/`
- `final/`, `question/`
- `hayaoshi/`, `hayabo/`, `round2/`, `playoff/`, `board/`

### 設定ファイル

- `config/cable.yml`（ActionCable 完全除去につき不要）
- `config/initializers/turbo_stream.rb`（`timer_start` / `timer_stop` / `timer_set_remaining_time` カスタムアクション定義、ActionCable 専用）
- `db/cable_schema.rb`（solid_cable 用スキーマ）

### TypeScript（削除確定）

- `app/typescript/entrypoints/scoreboard.ts`
- `app/typescript/lib/scoreboard/stream_actions.ts`
- `app/typescript/controllers/buzzer_scoreboard_controller.ts`
- `app/typescript/controllers/__tests__/buzzer_scoreboard_controller.test.ts`
- `app/typescript/controllers/score_visibility_toggler_controller.ts`
- `app/typescript/controllers/__tests__/score_visibility_toggler_controller.test.ts`

### TypeScript（実装前に他エントリポイントでの使用を確認してから削除）

- `app/typescript/controllers/round1_timer_controller.ts`（`scoreboard.ts` のみで登録確認済み）
- `app/typescript/controllers/clock_controller.ts`（`scoreboard.ts` のみで登録か確認する）

---

## 変更が必要なファイル

### 1. `config/routes.rb`

削除する行:

```ruby
mount ActionCable.server => "/cable"
get "/scoreboard", to: "scoreboard#show"
```

### 2. `app/controllers/admin/scoreboard_manipulations_controller.rb`

全ての `ActionCable.server.broadcast(...)` 呼び出し行を削除（25行以上）。
※ `Notifications.instrument` 側の payload には `render_to_string` は使われていないため、SSE 動作に影響なし。

### 3. `Gemfile`

削除する行:

```ruby
gem "solid_cable"
```

削除後 `bundle install` を実行。

### 4. `config/database.yml`

本番環境の `cable:` エントリを削除:

```yaml
# 削除する
cable:
  <<: *default
  database: storage/production_cable.sqlite3
  migrations_paths: db/cable_migrate
```

### 5. `package.json`

削除するパッケージ:

- `"@rails/actioncable": "8.1.200"`
- `"@types/rails__actioncable": "8.0.3"`

削除後 `pnpm install` を実行。

---

## 保持するファイル

- `app/assets/stylesheets/scoreboard.css`（React版レイアウト `scoreboard_react.html.erb` が `stylesheet_link_tag "scoreboard"` で参照）
- `app/views/scoreboard/react/show.html.erb`
- `app/views/layouts/scoreboard_react.html.erb`
- `app/controllers/scoreboard/react_controller.rb`
- `app/controllers/scoreboard/sse_controller.rb`
- `app/models/scoreboard/sse_subscriptions.rb`
- `app/models/scoreboard/sse_writer.rb`
- `app/models/scoreboard/match_serializer.rb`
- `app/typescript/scoreboard_react/` 全体

---

## 実装順序

1. `app/controllers/admin/scoreboard_manipulations_controller.rb` の `ActionCable.server.broadcast` 行を全て削除
2. `config/routes.rb` から旧スコアボードルートと ActionCable マウントを削除
3. 旧スコアボードビュー群を削除（`app/views/scoreboard/react/` は除く）
4. 旧スコアボードコントローラ・レイアウトを削除
5. チャンネルファイルを削除（`app/channels/` 配下全て）
6. 設定ファイルを削除・変更（`config/cable.yml`, `config/initializers/turbo_stream.rb`, `db/cable_schema.rb`, `config/database.yml` の cable エントリ）
7. TypeScript ファイルを削除（エントリポイント、lib、Stimulusコントローラ）
8. `clock_controller.ts` が `scoreboard.ts` 以外のエントリポイントで使われていないか確認し、専用なら削除
9. `Gemfile` から `solid_cable` を削除し `bundle install`
10. `package.json` から ActionCable 関連パッケージを削除し `pnpm install`

---

## 検証

```bash
bundle exec rspec                # テストが全て通ること
pnpm run test:run                # フロントエンドテストが全て通ること
bundle exec rake check           # RuboCop/oxfmt/oxlint/Stylelint/Brakeman が全て通ること
```

加えて、ブラウザで `/scoreboard/react` にアクセスし、SSE接続・シーン切り替えが正常に動作することを確認する。
