# SSE Last-Event-ID 対応

## Context

スコアボードのSSEは、ネットワーク断後に再接続すると切断中のイベントが失われる。
ブラウザの `EventSource` は SSE 仕様に基づき再接続時に `Last-Event-ID` ヘッダを自動送信するが、
サーバー側がこれを無視しているため、欠損補完が機能していない。

本対応で「サーバーがイベントにIDを付与 → ブラウザが Last-Event-ID を保持 → 再接続時に欠損イベントを再送」
というSSE仕様通りの動作を実現する。

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `app/models/scoreboard/event_log.rb` | **新規作成** |
| `app/models/scoreboard/sse_writer.rb` | 変更 |
| `app/models/scoreboard/sse_subscriptions.rb` | 変更 |
| `app/controllers/scoreboard/sse_controller.rb` | 変更 |
| `spec/models/scoreboard/event_log_spec.rb` | **新規作成** |
| `spec/models/scoreboard/sse_writer_spec.rb` | テスト追加 |
| `spec/models/scoreboard/sse_subscriptions_spec.rb` | テスト変更 |
| `spec/controllers/scoreboard/sse_controller_spec.rb` | テスト変更 |

**フロントエンド変更なし** — ブラウザの `EventSource` が `Last-Event-ID` を自動送信するため不要。

---

## 実装計画（TDD、4ステップ）

### Step 1: `EventLog` クラスを新規作成

**責務:** イベントに連番IDを採番し、直近100件をメモリに保持する。スレッドセーフ。

```ruby
# app/models/scoreboard/event_log.rb
module Scoreboard
  class EventLog
    SseEntry = Data.define(:id, :event, :data)
    MAX_ENTRIES = 100

    def self.instance = @instance ||= new
    def self.reset!   = @instance = nil  # テスト用

    def initialize
      @mutex = Mutex.new
      @entries = []
      @next_id = 1
    end

    # イベントを記録し採番済みエントリを返す
    def record(event, data)
      @mutex.synchronize do
        entry = SseEntry.new(id: @next_id, event: event, data: data)
        @next_id += 1
        @entries << entry
        @entries.shift if @entries.size > MAX_ENTRIES
        entry
      end
    end

    # last_id より後のエントリを返す
    def events_after(last_id)
      @mutex.synchronize { @entries.select { |e| e.id > last_id } }
    end

    # 現時点の最大IDを返す（0 = 記録なし）
    def current_max_id
      @mutex.synchronize { @next_id - 1 }
    end
  end
end
```

**テストケース** (`spec/models/scoreboard/event_log_spec.rb`):
- `record` → IDが1から始まり連番になる
- `record` → 101件目で id:1 が削除される（MAX_ENTRIES=100）
- `events_after(0)` → 全件返す
- `events_after(n)` → n+1以降のみ返す
- `current_max_id` → 記録前は0、3件後は3
- `.instance` → 同じインスタンスを返す
- `.reset!` → 新しいインスタンスが返る
- スレッドセーフ: 10スレッド並行 `record` → IDが重複しない

---

### Step 2: `SseWriter` に `id:` キーワード引数を追加

```ruby
# app/models/scoreboard/sse_writer.rb
def self.write(stream, event, data, id: nil)
  stream.write("id: #{id}\n") if id
  stream.write("event: #{event}\n")
  stream.write("data: #{data.to_json}\n\n")
end
```

**追加テストケース:**
- `id: 42` を指定 → 出力の先頭が `"id: 42\n"` になる
- `id:` 省略（nil） → `"id:"` 行が出力されない（heartbeat 想定）
- 出力行順序: `id:` → `event:` → `data:` → 空行

---

### Step 3: `SseSubscriptions` に `event_log:` を注入

```ruby
# app/models/scoreboard/sse_subscriptions.rb
def initialize(queue, event_log: Scoreboard::EventLog.instance)
  @queue = queue
  @event_log = event_log
  @subscribers = []
end

# subscribe ハンドラ内（WITH_PAYLOAD）
entry = @event_log.record(event_name, payload[:payload])
@queue.push({ id: entry.id, event: entry.event, data: entry.data })

# subscribe ハンドラ内（WITHOUT_PAYLOAD）
entry = @event_log.record(event_name, {})
@queue.push({ id: entry.id, event: entry.event, data: entry.data })
```

**キュー形式の変更:** `{ event:, data: }` → `{ id:, event:, data: }`
**heartbeat はそのまま** `{ event: "heartbeat", data: {} }` — `id:` キーなし。

**テスト変更点:**
- `Scoreboard::SseSubscriptions.new(queue)` → `new(queue, event_log: EventLog.new)` に変更
- テーブル駆動テストに `expect(msg[:id]).to be_a(Integer)` を追加
- 連番テスト: 2イベント連続発火 → `msg2[:id] == msg1[:id] + 1`

---

### Step 4: `SseController` で Last-Event-ID を処理

```ruby
# app/controllers/scoreboard/sse_controller.rb
def stream
  response.headers["Content-Type"] = "text/event-stream"
  response.headers["Cache-Control"] = "no-cache"
  response.headers["X-Accel-Buffering"] = "no"

  queue = Thread::Queue.new
  event_log = Scoreboard::EventLog.instance

  subscriptions = Scoreboard::SseSubscriptions.new(queue, event_log: event_log)
  subscriptions.subscribe_all  # ← 先に購読登録（新イベントはキューへ）

  snapshot_id = event_log.current_max_id  # ← subscribe後にスナップショット取得

  # Last-Event-ID より後かつ snapshot 以前のイベントを再送
  last_id = request.headers["Last-Event-ID"]&.to_i
  if last_id&.positive?
    event_log.events_after(last_id).each do |entry|
      next if entry.id > snapshot_id  # キューに積まれた分はスキップ
      Scoreboard::SseWriter.write(response.stream, entry.event, entry.data, id: entry.id)
    end
  end

  heartbeat = start_heartbeat(queue)

  loop do
    msg = queue.pop
    Scoreboard::SseWriter.write(response.stream, msg[:event], msg[:data], id: msg[:id])
  end
rescue ActionController::Live::ClientDisconnected, IOError
ensure
  heartbeat&.kill
  subscriptions&.unsubscribe_all
  response.stream.close
end
```

**ordering の意図:**
```
subscribe_all → snapshot_id → replay(last_id..snapshot_id) → loop(queue)
```
- `subscribe_all` 後の新イベント → キューに積まれる
- `snapshot_id` より大きいIDはreplayに含めない → キューとの重複なし
- `subscribe_all` と `snapshot_id` の間に起きた微小な競合は許容（React state更新が冪等なため）

**テスト変更点:**
- `Last-Event-ID: 3` ヘッダあり → `event_log.events_after(3)` が呼ばれること
- ヘッダなし → `events_after` が呼ばれないこと
- replayイベントが response.body に含まれること（`id: 4\n`, `event: show_scores\n`）
- `Scoreboard::SseSubscriptions.new(queue, event_log: event_log)` で生成されること

---

## 競合状態の考慮

`subscribe_all` と `snapshot_id` 取得の間に発火したイベント（可能性は極めて低い）は
`id > snapshot_id` となりreplayに含まれないが、キューに積まれているのでループで届く。
理論上の重複が起きても、React の state 更新は冪等（`paper_seed_display_player` は rank でdedup済み）
なため視覚的な問題は生じない。

---

## 検証方法

1. `bundle exec rspec spec/models/scoreboard/event_log_spec.rb` — 新規テスト全通過
2. `bundle exec rspec spec/models/scoreboard/sse_writer_spec.rb` — 既存 + 追加テスト全通過
3. `bundle exec rspec spec/models/scoreboard/sse_subscriptions_spec.rb` — 変更後全通過
4. `bundle exec rspec spec/controllers/scoreboard/sse_controller_spec.rb` — 変更後全通過
5. `bundle exec rake check` — RuboCop / Brakeman / 全テスト通過
6. 手動確認: ブラウザで `/scoreboard/react` を開き、管理画面から操作 → ネットワーク切断・再接続後も正確な状態が復元されることを確認
