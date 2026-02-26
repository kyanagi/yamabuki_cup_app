# AGENTS.md

このプロジェクトは、クイズ大会「やまぶき杯」を運営する上で必要となるシステムを構築するものです。

あなたはプロフェッショナルな開発者として、可読性・保守性・安全性・パフォーマンスに優れたコードを書いてください。

## 自己改善のループ

- ユーザからの訂正があった場合は、`docs/lessons.md` を更新すること。
- このファイルにはあなたが同じ間違いを繰り返すのを防ぐルールを書くこと。
- セッションを開始する際には `docs/lessons.md` を読み、作業が適切に行えるようにすること。

## 主要な機能

- エントリーフォーム
- 出題機能（問題文の読み上げ）
- 得点管理
- 得点表示
- 組分けの管理

## 技術スタック

- バックエンド: Ruby on Rails 8 with Hotwire (Turbo + Stimulus)
- フロントエンド: TypeScript with Vite bundling, Hotwired Turbo for real-time updates
- データベース: SQLite
- ActionCable によるリアルタイム更新
- Bulma CSS フレームワーク
- 得点表示画面においては、Bulmaを使わずCSSを直接使っている

## ディレクトリ構成

標準的なRailsのディレクトリ構成に従う。

### フロントエンド（React + TypeScript + Stimulus）

- Stimulus のコントローラは `app/typescript/controllers` ディレクトリにある。

## 仕様書

`docs/spec` ディレクトリに、本プロジェクトに関する仕様書が格納されている。

- `docs/spec/entry.md`: エントリー仕様
- `docs/spec/tournament_rule.md`: 大会ルール
- `docs/spec/yontaku_result_csv_format.md`: 四択クイズ採点結果CSVフォーマット仕様

## 開発用のコマンド

```bash
# 開発用サーバの起動
# Vite によるフロントエンドと Rails によるバックエンドサーバを起動する
# ポート3100番
./bin/dev
```

```bash
# RuboCop, RSpec, Brakeman, Stylelint, oxfmt, oxlintによるチェックを全て実行する
bundle exec rake check
```

```bash
bundle exec rspec                    # Run RSpec tests
bundle exec rspec spec/path/to/file_spec.rb  # Run specific test file
bundle exec rspec spec/path/to/file_spec.rb:42  # Run specific test line
bin/rubocop                         # Ruby linting (*.rb files only)
bin/brakeman --no-prism             # Security analysis
pnpm run fmt:check                  # oxfmtによるフォーマットのチェック
pnpm run fmt                        # oxfmtによる自動フォーマット
pnpm run fmt                        # oxlintによるlintチェック
pnpm run lint:css                   # Lint CSS code with Stylelint
pnpm test                           # Run Vitest (frontend unit tests)
pnpm run test:run                   # Run Vitest once without watch mode
```

**注意:** RuboCopはRubyファイル（`*.rb`）のみをチェックします。ERBファイル（`*.html.erb`）を個別にRuboCopでチェックしないでください（ERBはRuby構文ではないためパースエラーになります）。

**Database Management**

```bash
rails db:create db:migrate db:seed   # Initial database setup
bundle exec rake sample_data:create  # Generate sample tournament data
```

## コーディング規約

Railsの標準的な命名規約に従ってください。

サービスクラスは使用せず、ActiveModelを使ったフォームオブジェクトで実装してください。
`include ActiveModel::Model`を使用し、バリデーションやエラーハンドリングをActiveModelの仕組みで行います。

可能な限り、生のSQLでなくActiveRecordのメソッドを活用してください。

Rubyの例外は、例外的な場合のみに使用してください。単にプログラムの流れを制御するためだけに例外を用いないでください。

パーシャルテンプレート（`_*.html.erb`）を追加・変更する際は、先頭に使用するローカル変数を明示する `locals` コメント（例: `<%# locals: (match:) %>`）を必ず記述してください。

## 開発プロセス

開発は、t-wadaが推奨するテスト駆動開発(TDD)の手法により行ってください。

ソースコードを編集・追加・削除した場合、必ず以下のことを確認してください。

- テストが全て通ること
- RuboCop、oxfmt、oxlint、Stylelint、TypeScript型チェックによるチェックが全て通ること

リファクタリングを行う際は、Martin Fowlerが推奨する方法で行ってください。

## セキュリティ

XSS、CSRF、SQLインジェクションといった脆弱性に対する適切な対策を行ってください。

## 管理者認証

管理画面（`/admin/*`）へのアクセスには管理者認証が必要。

**モデル構成:**

- `AdminUser`: 管理者ユーザー（username + password_digest + role）
- `AdminSession`: セッション管理

**権限レベル（role）:**

- `admin`: 全ての管理画面にアクセス可能
- `staff`: Quiz Reader と問題送出以外の管理画面にアクセス可能

**認証・認可の仕組み:**

- `AdminAuthentication` concern が認証と認可を担当
- Cookie（`admin_session_id`）でセッションを識別
- `Current.admin_session` でリクエストスコープのセッション管理
- admin role のみアクセス可能にするには、コントローラで `require_admin_role` を呼び出す

**管理者ユーザーの管理:**

```bash
rake admin:create_user[username,password]        # 管理者を作成（デフォルト: admin権限）
rake admin:create_user[username,password,staff]  # スタッフを作成
rake admin:change_role[username,admin]           # 権限を変更
rake admin:change_password[username,new_password]  # パスワード変更
rake admin:list  # 管理者一覧を表示（権限も表示）
```

## Critical Patterns

**Immutable Audit Trail:**
All match operations are recorded as `ScoreOperation` records forming an immutable chain via the `path` field. Never modify existing operations; always create new ones.

**Rule-Based Gameplay:**
Each round type has a specific `MatchRule` class (Final, Hayabo, Hayaoshi, etc.) that handles scoring logic, match progression, and format-specific rules.

**Real-time Updates:**
Uses ActionCable (`ScoreboardChannel`) to broadcast live score updates to connected browsers during matches.

**Form Objects:**
Complex forms use ActiveType::Object (like `Registration` and `PlayerProfileEdit`) rather than plain Rails forms for better encapsulation. Form objects should initialize with current data as defaults when editing existing records.
