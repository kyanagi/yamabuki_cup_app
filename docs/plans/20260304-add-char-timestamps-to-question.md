# Question にタイムスタンプカラムを追加

## Context

`generate_timestamps.py` で生成した文字単位タイムスタンプ（音声と問題文テキストのアライメント結果）を `Question` モデルに格納できるようにする。これにより、問読み時に「何文字目まで読んだか」を計算するためのタイムスタンプデータをDBで管理できる。

## 変更方針

### カラム定義

```ruby
add_column :questions, :char_timestamps, :json, default: nil
```

- カラム名: `char_timestamps`（文字単位タイムスタンプという意味を明確に表す）
- 型: `json`（`Setting` モデルと同じ方法。SQLite では TEXT として保存され Rails が自動で parse。MySQL では ネイティブ JSON 型、PostgreSQL では json 型として保存され、いずれも動作する）
- デフォルト: `nil`（タイムスタンプがない問題も存在するため nullable）

### 格納するデータ形式

`generate_timestamps.py` の出力 JSON の `chars` 配列のみを格納する（`text` フィールドは `questions.text` と重複するため省く）:

```json
[
  { "char": "問", "start": 0.0, "end": 0.12 },
  { "char": "題", "start": 0.12, "end": 0.24 }
]
```

## 実装手順

### 1. マイグレーション作成

```ruby
# db/migrate/YYYYMMDD_add_char_timestamps_to_questions.rb
class AddCharTimestampsToQuestions < ActiveRecord::Migration[8.0]
  def change
    add_column :questions, :char_timestamps, :json, default: nil
  end
end
```

### 2. `db:migrate` 実行

`db/schema.rb` に反映される。

### 3. `Question` モデルの変更

追加不要。Rails が `json` カラムを自動で Array/Hash として扱う。

## 変更ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `db/migrate/YYYYMMDD_add_char_timestamps_to_questions.rb` | 新規作成 |
| `db/schema.rb` | `db:migrate` 実行で自動更新 |

## 検証手順

```bash
bundle exec rails db:migrate
bundle exec rails runner "puts Question.column_names.include?('char_timestamps')"
# => true
bundle exec rspec  # 既存テストが壊れていないことを確認
```
