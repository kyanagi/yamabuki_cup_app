# データベース設計: エントリー定員・抽選・キャンセル待ち機能

仕様: `./spec/entry.md`

## 背景

現在のシステムでは、`Setting.registerable` の on/off でエントリー受付を制御しているのみで、定員管理・抽選・キャンセル待ちの仕組みがない。Player モデルがエントリーそのものとして機能しており、エントリー状態を管理する仕組みが存在しない。

## 目的

大会の定員を設け、エントリーを2段階（一次・二次）で受け付ける。

- **一次エントリー**: エントリーを受け付け、締め切り後にアプリ外で抽選を行う。管理者が抽選結果（優先順位）をアプリに入力し、定員以内の人を参加確定、それ以外をキャンセル待ちとする。
- **二次エントリー**: 先着順で参加権を得る。定員に空きがあれば即座に参加確定、空きがなければキャンセル待ちとなる。優先順位は `priority` に保存し、一次エントリーの最終順位からの通し番号で採番する。
- **キャンセル・繰り上がり**: キャンセルがあった場合、キャンセル待ちの人から順位順に繰り上がる。

## データベース設計

### 1. 新規テーブル: `entries`

Player とは別に、エントリーの状態管理を担う独立したテーブルを作成する。

```
entries
├── id              (integer, PK)
├── player_id       (integer, FK → players, NOT NULL, UNIQUE)
├── entry_phase     (integer, NOT NULL)               ※ enum: primary(0) / secondary(1)
├── status          (integer, NOT NULL, DEFAULT: 0)   ※ enum
├── priority        (integer, NULL)                    ※ 優先順位。一次は管理者入力、二次は自動採番
├── created_at      (datetime)
└── updated_at      (datetime)
```

#### entry_phase enum

| 値  | 名前        | 説明                       |
| --- | ----------- | -------------------------- |
| 0   | `primary`   | 一次エントリー期間中に登録 |
| 1   | `secondary` | 二次エントリー期間中に登録 |

#### status enum

| 値  | 名前         | 説明                                                 |
| --- | ------------ | ---------------------------------------------------- |
| 0   | `pending`    | エントリー済み・抽選結果未確定（一次エントリーのみ） |
| 1   | `accepted`   | 参加確定                                             |
| 2   | `waitlisted` | キャンセル待ち                                       |
| 3   | `cancelled`  | キャンセル済み                                       |

#### priority

- 優先順位を表す整数（小さい値が優先）。
- 一次エントリーでは、管理者がアプリ外抽選の結果を入力する。
- 二次エントリーでは、登録時に自動採番する。
- 二次エントリーの採番は、一次エントリーで確定済みの最大 `priority` の次番号から開始する（通し番号）。
- キャンセル待ちの繰り上がり順は、一次・二次を区別せず `priority` 昇順で決定する。

#### インデックス

- `player_id` — UNIQUE（1プレイヤーにつき1エントリー）
- `status` — ステータスでの検索用
- `priority` — UNIQUE（`NULL` を除く）かつ順位での並び替え・検索用

#### 制約

- `player_id` に外部キー制約（`players` テーブル）
- `player_id` に一意制約
- `priority` は `NULL` または 1 以上
- `priority` が `NULL` でないレコード同士で一意

### 2. Setting への追加

既存の Setting モデルの ATTRIBUTES に以下を追加する。

```ruby
ATTRIBUTES = [
  [:registerable, true],
  [:round3_course_preference_editable, true],
  [:capacity, 0],         # 定員（必須。0以上の整数）
  [:entry_phase, nil],    # 現在のエントリーフェーズ。nil / "primary" / "secondary"
]
```

- `capacity`: integer（必須）。0以上の整数。
- `entry_phase`: string（nilable）。エントリー登録時にどのフェーズのエントリーかを判定するために使用。

## モデル設計

### Entry モデル

```ruby
class Entry < ApplicationRecord
  belongs_to :player

  enum :entry_phase, { primary: 0, secondary: 1 }
  enum :status, { pending: 0, accepted: 1, waitlisted: 2, cancelled: 3 }
end
```

### Player モデルへの関連追加

```ruby
class Player < ApplicationRecord
  has_one :entry, dependent: :destroy
  # ... 既存の関連
end
```

## エントリーのライフサイクル

### 一次エントリーの状態遷移

```
                 ┌─────────┐
  一次エントリー   │ pending │
                 └────┬────┘
    管理者が結果入力│       │取り消し
          ┌─────────┴─────┐   │
          ▼               ▼   ▼
    ┌──────────┐   ┌────────────┐ ┌───────────┐
    │ accepted │   │ waitlisted │ │ cancelled │
    └─────┬────┘   └──────┬──┬──┘ └───────────┘
          │ キャンセル      │  │辞退       ▲
          │                │  └───────────┘
          ▼                │
    ┌───────────┐          │ 繰り上がり
    │ cancelled │──────────┘
    └───────────┘
```

### 二次エントリーの状態遷移

```
                        ┌──────────┐
  二次エントリー（空きあり） │ accepted │
                        └─────┬────┘
                              │ キャンセル
                              ▼
                        ┌───────────┐     繰り上がり
                        │ cancelled │──────────────→ (次のキャンセル待ちを accepted に)
                        └───────────┘

                          ┌────────────┐
  二次エントリー（空きなし）  │ waitlisted │
                          └──────┬──┬──┘
                        繰り上がり│  │辞退
                                ▼  ▼
                     ┌──────────┐ ┌───────────┐
                     │ accepted │ │ cancelled │
                     └──────────┘ └───────────┘
```

二次エントリーでは `pending` 状態を経由しない（即座に `accepted` or `waitlisted`）。

### 遷移ルール

**一次エントリー:**

- `pending` → `accepted` / `waitlisted`（管理者が外部抽選結果を入力した時）
- `pending` → `cancelled`（抽選前にエントリーを取り消す場合。参加者自身・管理者どちらも可）

**共通:**

- `accepted` → `cancelled`（参加確定後のキャンセル。繰り上がりが発生する）
- `waitlisted` → `accepted`（繰り上がり時）
- `waitlisted` → `cancelled`（キャンセル待ちの人が辞退する場合。参加者自身・管理者どちらも可）

## Registration フォームオブジェクトへの影響

`Registration#create_player_data` 内で Entry レコードも作成する。エントリーフェーズに応じて初期ステータスが変わる。

```ruby
def create_player_data
  ActiveRecord::Base.transaction do
    @player = Player.create!

    entry_phase = Setting.entry_phase
    case entry_phase
    when "primary"
      Entry.create!(player: @player, entry_phase: :primary, status: :pending)
    when "secondary"
      # 同時登録での定員超過・priority重複を防ぐため排他ロックを取る
      Entry.lock.load

      next_priority = Entry.maximum(:priority).to_i + 1
      status = Entry.where(status: :accepted).count < Setting.capacity ? :accepted : :waitlisted

      Entry.create!(
        player: @player,
        entry_phase: :secondary,
        status: status,
        priority: next_priority
      )
    else
      errors.add(:base, "エントリー受付期間外です")
      raise ActiveRecord::Rollback
    end

    # ... 既存の処理（PlayerEmailCredential, PlayerProfile, Round3CoursePreference）
  end
end
```

## 管理者による抽選結果の入力

アプリ外で行った抽選の結果を管理者がアプリに入力する。

1. 一次エントリーの `pending` 状態のエントリー一覧を表示
2. 各エントリーに `priority`（優先順位）を入力
3. `priority <= capacity` のエントリーを `accepted` に更新
4. `priority > capacity` のエントリーを `waitlisted` に更新
5. 一次エントリーの `priority` 入力完了後に二次エントリー受付を開始する（通し番号採番の起点を確定させる）

## キャンセル・繰り上がりロジック

1. `accepted` または `waitlisted` のエントリーがキャンセルされると `cancelled` に変更
2. `accepted` のキャンセルの場合、キャンセル待ちから次の繰り上がり対象を `accepted` に変更
3. `waitlisted` のキャンセルの場合、繰り上がりは発生しない

### 繰り上がり対象の決定順

キャンセル待ちの繰り上がり順位は以下の優先度で決定する:

1. **一次・二次を通した `priority` の昇順**（小さい番号が優先）
2. 同一 `priority` は発生しない前提（DB制約で保証）

```sql
-- 繰り上がり対象の取得
SELECT * FROM entries
WHERE status = 2  -- waitlisted
ORDER BY
  priority ASC,
  id ASC
LIMIT 1;
```

## マイグレーション

```ruby
class CreateEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :entries do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }
      t.integer :entry_phase, null: false
      t.integer :status, null: false, default: 0
      t.integer :priority

      t.timestamps
    end

    add_index :entries, :status
    add_index :entries, :priority, unique: true, where: "priority IS NOT NULL"
    add_check_constraint :entries, "priority IS NULL OR priority > 0", name: "chk_entries_priority_positive"
  end
end
```

## 運用フロー

1. 管理者: `entry_phase` を `"primary"` に設定、`registerable` を `true` に設定、`capacity` を設定
2. 参加者: エントリー登録 → Entry(entry_phase: primary, status: pending) が作成される
3. 管理者: `registerable` を `false` に設定（一次エントリー締め切り）
4. 管理者: アプリ外で抽選を実施
5. 管理者: 抽選結果（priority）をアプリに入力 → accepted / waitlisted に振り分け
6. 管理者: `entry_phase` を `"secondary"` に設定、`registerable` を `true` に設定
7. 参加者: エントリー登録 → `priority = (現在の最大priority + 1)` を付与。定員に空きがあれば即座に accepted、なければ waitlisted
8. 管理者: `registerable` を `false` に設定（二次エントリー締め切り）
9. 以降: キャンセルがあれば繰り上がりが発生
