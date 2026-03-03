# SSE Last-Event-ID 対応 レビュー指摘修正

## Context

前回実装したSSE Last-Event-ID 対応に対するレビューで、以下の2点が指摘された。

**[P1] EventLog記録が接続単位になっている問題**
`SseSubscriptions` が `ActiveSupport::Notifications.subscribe` のコールバック内で
`EventLog#record` を呼んでいるため、N接続あると同一イベントが N回記録される（別ID）。
また接続が0件の間はイベントが記録されないため Last-Event-ID で復元できない。

**[P2] 未来IDを再同期扱いできない問題**
`EventLog#events_after` の欠損判定が `last_id < oldest - 1` のみで、
`last_id > current_max_id`（再起動後の旧ID等）を見逃す。
この場合 `events_after` が空配列を返し `resync_required` が発火しない。

---

## 変更ファイル一覧

| ファイル                                              | 変更種別 |
| ----------------------------------------------------- | -------- |
| `app/models/scoreboard/event_broadcaster.rb`          | 新規作成 |
| `config/initializers/scoreboard_event_broadcaster.rb` | 新規作成 |
| `app/models/scoreboard/sse_subscriptions.rb`          | 大幅変更 |
| `app/models/scoreboard/event_log.rb`                  | 変更     |
| `app/controllers/scoreboard/sse_controller.rb`        | 変更     |
| `spec/models/scoreboard/event_broadcaster_spec.rb`    | 新規作成 |
| `spec/models/scoreboard/sse_subscriptions_spec.rb`    | 大幅変更 |
| `spec/models/scoreboard/event_log_spec.rb`            | 変更     |
| `spec/controllers/scoreboard/sse_controller_spec.rb`  | 変更     |

---

## 実装計画（TDD、3ステップ）

### Step 1: `EventBroadcaster` を新規作成（P1 対応）

**責務:** スコアボード通知をグローバルに購読し、EventLogへ1回だけ記録・
全接続キューへ配信する。接続が0件でも記録は継続する。

```ruby
# app/models/scoreboard/event_broadcaster.rb
module Scoreboard
  class EventBroadcaster
    INSTANCE_MUTEX = Mutex.new
    private_constant :INSTANCE_MUTEX

    def self.instance
      @instance || INSTANCE_MUTEX.synchronize { @instance ||= new }
    end

    def self.reset!
      INSTANCE_MUTEX.synchronize do
        @instance&.shutdown
        @instance = nil
      end
    end

    def initialize(event_log: Scoreboard::EventLog.instance)
      @mutex = Mutex.new
      @queues = []
      @event_log = event_log
      @notification_subscribers = []
      subscribe_to_notifications
    end

    def register(queue)
      @mutex.synchronize { @queues << queue }
    end

    def unregister(queue)
      @mutex.synchronize { @queues.delete(queue) }
    end

    # テスト用: 通知購読を解除する
    def shutdown
      @notification_subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @notification_subscribers.clear
    end

    private

    # 通知名→SSEイベント名テーブル（payload あり）
    WITH_PAYLOAD = {
      "scoreboard.update" => "match_update",
      # ... 全13イベント ...
    }.freeze

    # 通知名→SSEイベント名テーブル（payload なし）
    WITHOUT_PAYLOAD = {
      "scoreboard.show_scores" => "show_scores",
      # ... 全8イベント ...
    }.freeze

    def subscribe_to_notifications
      WITH_PAYLOAD.each do |notification_name, event_name|
        @notification_subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*, payload|
          broadcast(event_name, payload[:payload])
        end
      end

      WITHOUT_PAYLOAD.each do |notification_name, event_name|
        @notification_subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*|
          broadcast(event_name, {})
        end
      end
    end

    def broadcast(event_name, data)
      entry = @event_log.record(event_name, data)
      queues = @mutex.synchronize { @queues.dup }
      queues.each { |q| q.push({ id: entry.id, event: entry.event, data: entry.data }) }
    end
  end
end
```

**イニシャライザ（テスト環境以外で起動）:**

```ruby
# config/initializers/scoreboard_event_broadcaster.rb
unless Rails.env.test?
  Rails.application.config.after_initialize do
    Scoreboard::EventBroadcaster.instance
  end
end
```

**テストケース** (`spec/models/scoreboard/event_broadcaster_spec.rb`):

- 登録されたキューが通知を受け取る
- 登録解除後はキューに入らない
- 2キュー登録 → 両方が同一IDで受け取る（EventLogへの記録は1回）
- キュー0件でもEventLogに記録される
- `shutdown` 後は通知が届かない
- テーブル駆動: 全22イベントのnotification→SSEイベント名マッピング（現`SSE_EVENT_TABLE`を移植）
- 連番: 2イベント連続発火 → `msg2[:id] == msg1[:id] + 1`
- パイプライン統合: `scoreboard.update` 通知 → `SseWriter.write` に match_update として到達

各テストは `described_class.new(event_log: Scoreboard::EventLog.new)` を使い、
`ensure` で `broadcaster.shutdown` を呼んで通知購読をクリーンアップする。

---

### Step 2: `SseSubscriptions` を簡略化

`EventBroadcaster` へキュー登録を委譲するシンラッパーに変更。
`WITH_PAYLOAD` / `WITHOUT_PAYLOAD` 定数は `EventBroadcaster` へ移動（`SseSubscriptions`から削除）。

```ruby
# app/models/scoreboard/sse_subscriptions.rb
module Scoreboard
  class SseSubscriptions
    def initialize(queue)
      @queue = queue
      @registered = false
    end

    # 多重登録ガード付き
    def subscribe_all
      return if @registered
      Scoreboard::EventBroadcaster.instance.register(@queue)
      @registered = true
    end

    def unsubscribe_all
      return unless @registered
      Scoreboard::EventBroadcaster.instance.unregister(@queue)
      @registered = false
    end
  end
end
```

**SseController も変更（`event_log:` 引数を削除）:**

```ruby
subscriptions = Scoreboard::SseSubscriptions.new(queue)
```

**テスト変更** (`spec/models/scoreboard/sse_subscriptions_spec.rb`):

- テーブル駆動テスト・連番テスト・パイプライン統合テストは `event_broadcaster_spec.rb` へ移動済み
- `EventBroadcaster.instance` を `instance_double` でモックして委譲のみ検証:
  - `subscribe_all` → `broadcaster.register(queue)` が呼ばれる
  - `unsubscribe_all` → `broadcaster.unregister(queue)` が呼ばれる
  - `subscribe_all` 2回 → `register` は1回だけ
  - `unsubscribe_all` 後の再 `subscribe_all` → 再登録される

---

### Step 3: `EventLog#events_after` に未来ID判定を追加（P2 対応）

```ruby
def events_after(last_id)
  @mutex.synchronize do
    current_max = @next_id - 1
    oldest = @entries.first&.id

    if last_id > 0
      return nil if last_id > current_max            # 未来ID（再起動後の旧IDなど）
      return nil if oldest.nil? || last_id < oldest - 1  # 欠損あり
    end

    @entries.select { |e| e.id > last_id }
  end
end
```

**テスト変更** (`spec/models/scoreboard/event_log_spec.rb`):

- 既存「last_id が最新IDより大きい場合は空配列を返す」→ **nil を返す** に変更
- 新規: `last_id == current_max_id` → 空配列を返す（境界値：ちょうど最新ID）

**`sse_controller_spec.rb` の変更:**

- `run_stream` ヘルパー: `.with(queue, event_log: event_log)` → `.with(queue)`
- ライフサイクルテスト: `.with(anything, event_log: event_log)` → `.with(anything)`
- `欠損超過 → 再同期` テスト: `oldest - 2` の代わりに `current_max_id + 1` で
  未来IDケースもカバーするテストを追加（既存テストは維持）

---

## 検証方法

1. `bundle exec rspec spec/models/scoreboard/event_broadcaster_spec.rb` — 新規テスト全通過
2. `bundle exec rspec spec/models/scoreboard/sse_subscriptions_spec.rb` — 変更後全通過
3. `bundle exec rspec spec/models/scoreboard/event_log_spec.rb` — P2テスト含め全通過
4. `bundle exec rspec spec/controllers/scoreboard/sse_controller_spec.rb` — 引数変更後全通過
5. `bundle exec rake check` — 全通過
