# AGENTS.md

このプロジェクトは、クイズ大会「やまぶき杯」を運営する上で必要となるシステムを構築するものです。

あなたはプロフェッショナルな開発者として、可読性・保守性・安全性・パフォーマンスに優れたコードを書いてください。

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

### バックエンド（Rails）
- `sig/`: 型定義ファイル

### フロントエンド（React + TypeScript + Stimulus）
- フロントエンドの設定ファイル：
  - tsconfig.json
  - vite.config.ts
  - biome.json
- Stimulus のコントローラは `app/typescript/controllers` ディレクトリにある。

## 仕様書

`docs/spec` ディレクトリに、本プロジェクトに関する仕様書が格納されている。

- `docs/spec/yontaku_result_csv_format.md`: 四択クイズ採点結果CSVフォーマット仕様

## 開発用のコマンド

```bash
# 開発用サーバの起動
# Vite によるフロントエンドと Rails によるバックエンドサーバを起動する
./bin/dev
```

```bash
# RuboCop, RSpec, Brakeman によるチェックを全て実行する
bundle exec rake check
```

```bash
bundle exec rspec                    # Run RSpec tests
bundle exec rspec spec/path/to/file_spec.rb  # Run specific test file
bundle exec rspec spec/path/to/file_spec.rb:42  # Run specific test line
bundle exec steep check              # Static type checking with Steep
bin/rubocop                         # Ruby linting
bin/brakeman --no-prism             # Security analysis
npx biome format --write .          # Format TypeScript/JavaScript code
npx biome check --write .           # Lint and format frontend code
```

**Database Management**
```bash
rails db:create db:migrate db:seed   # Initial database setup
bundle exec rake sample_data:create  # Generate sample tournament data
```

**RBS Type System**
```bash
bundle exec rake rbs:setup          # Generate RBS type definitions
bundle exec rake rbs:update         # Update existing RBS files
```

## コーディング規約

Railsの標準的な命名規約に従ってください。

サービスクラスは使用せず、ActiveModelを使ったフォームオブジェクトで実装してください。
`include ActiveModel::Model`を使用し、バリデーションやエラーハンドリングをActiveModelの仕組みで行います。

可能な限り、生のSQLでなくActiveRecordのメソッドを活用してください。

Rubyの例外は、例外的な場合のみに使用してください。単にプログラムの流れを制御するためだけに例外を用いないでください。

## 開発プロセス

開発は、t-wadaが推奨するテスト駆動開発(TDD)の手法により行ってください。

ソースコードを編集・追加・削除した場合、必ず以下のことを確認してください。

- テストが全て通ること
- RuboCop、Biome、Steepによるチェックが全て通ること

リファクタリングを行う際は、Martin Fowlerが推奨する方法で行ってください。

## セキュリティ

XSS、CSRF、SQLインジェクションといった脆弱性に対する適切な対策を行ってください。

## Critical Patterns

**Immutable Audit Trail:**
All match operations are recorded as `ScoreOperation` records forming an immutable chain via the `path` field. Never modify existing operations; always create new ones.

**Rule-Based Gameplay:**
Each round type has a specific `MatchRule` class (Final, Hayabo, Hayaoshi, etc.) that handles scoring logic, match progression, and format-specific rules.

**Real-time Updates:**
Uses ActionCable (`ScoreboardChannel`) to broadcast live score updates to connected browsers during matches.

**Form Objects:**
Complex forms use ActiveType::Object (like `Registration` and `PlayerProfileEdit`) rather than plain Rails forms for better encapsulation. Form objects should initialize with current data as defaults when editing existing records.
