# Plan: Step 3/4 — SseSubscriptions クラス分離

## Context

`Scoreboard::SseController#stream` に、`ActiveSupport::Notifications` の購読ロジック（6イベント）が直接書かれている。
これをモデル層の `Scoreboard::SseSubscriptions` クラスに分離し、
単体テスト可能な形にする（Martin Fowler 式 Extract Class リファクタリング）。

`app/models/scoreboard/` には既に `SseWriter`, `MatchSerializer` のようなインフラ寄りのサポートクラスが置かれており、`SseSubscriptions` も同じ層に配置する。

---

## テスト戦略の全体像

| 何を守りたいか                                                | テストファイル                                       |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| 通知イベント → Queue への配線（テーブル駆動6イベント）        | `spec/models/scoreboard/sse_subscriptions_spec.rb`   |
| 多重購読ガード / unsubscribe_all 後不達                       | 同上                                                 |
| 通知 → Queue → SseWriter.write のパイプライン（ふるまい回帰） | 同上（パイプラインケース1本）                        |
| SseController が SseSubscriptions に委譲している（委譲契約）  | `spec/controllers/scoreboard/sse_controller_spec.rb` |

**DoD（完了条件）**:

1. 6イベントすべての event 名と data 形状を契約として固定し、リファクタ前後で一致していること。
2. 変更前の既存SSE関連テストをあらかじめ実行してパス確認し、変更後に同セットを再実行して全て通ること。

---

## 実装ファイル

| 操作     | ファイル                                             |
| -------- | ---------------------------------------------------- |
| 新規作成 | `app/models/scoreboard/sse_subscriptions.rb`         |
| 新規作成 | `spec/models/scoreboard/sse_subscriptions_spec.rb`   |
| 新規作成 | `spec/controllers/scoreboard/sse_controller_spec.rb` |
| 変更     | `app/controllers/scoreboard/sse_controller.rb`       |

---

## 実装方針（TDD: Red → Green → Refactor）

### 事前確認（変更前ベースライン記録）

```bash
# 変更前にSSE関連テストをパスさせて記録
bundle exec rspec spec/requests/scoreboard/sse_spec.rb
```

### Step A: テスト先行（Red）

#### A-1: `spec/models/scoreboard/sse_subscriptions_spec.rb`

**テーブル駆動で6イベント + ガード + パイプラインを網羅する。**

```ruby
RSpec.describe Scoreboard::SseSubscriptions do
  # イベント契約テーブル: [通知名, instrument引数, 期待event名, 期待data]
  EVENT_TABLE = [
    ["scoreboard.match_init",    { payload: { matchId: 1 } },              "match_init",    { matchId: 1 }            ],
    ["scoreboard.update",        { payload: { matchId: 2 } },              "match_update",  { matchId: 2 }            ],
    ["scoreboard.show_scores",   {},                                        "show_scores",   {}                        ],
    ["scoreboard.hide_scores",   {},                                        "hide_scores",   {}                        ],
    ["scoreboard.question_show", { payload: { text: "Q", answer: "A" } },  "question_show", { text: "Q", answer: "A" }],
    ["scoreboard.question_clear",{},                                        "question_clear",{}                        ],
  ].freeze

  describe "通知→Queue の配線（テーブル駆動）" do
    EVENT_TABLE.each do |notification, params, expected_event, expected_data|
      it "#{notification} 通知が event: #{expected_event}, data: #{expected_data} を queue に入れる" do
        queue = Thread::Queue.new
        subs = described_class.new(queue)
        subs.subscribe_all
        ActiveSupport::Notifications.instrument(notification, params)
        msg = queue.pop(true)
        expect(msg[:event]).to eq(expected_event)
        expect(msg[:data]).to eq(expected_data)   # eq で厳密に検証（空 {} も明示的に確認）
      ensure
        subs.unsubscribe_all
      end
    end
  end

  describe "多重購読ガード" do
    it "subscribe_all を2回呼んでも queue に1個しか入らない" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.subscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      queue.pop(true)
      expect(queue).to be_empty
    ensure
      subs.unsubscribe_all
    end
  end

  describe "unsubscribe_all" do
    it "unsubscribe_all 後は通知が queue に入らない" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.unsubscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      expect(queue).to be_empty
    end
  end

  describe "SseSubscriptions + SseWriter パイプライン（ふるまい回帰）" do
    it "scoreboard.update 通知が SseWriter.write に match_update として到達する" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      msg = queue.pop(true)
      io = StringIO.new
      Scoreboard::SseWriter.write(io, msg[:event], msg[:data])
      expect(io.string).to include("event: match_update\n")
      expect(io.string).to include('"matchId":1')
    ensure
      subs.unsubscribe_all
    end
  end
end
```

#### A-2: `spec/controllers/scoreboard/sse_controller_spec.rb`

目的: SseController が SseSubscriptions に正しく委譲している「委譲契約」を検証する。

**heartbeat は `start_heartbeat` プライベートメソッドに切り出し、`allow(controller).to receive(...)` で対象インスタンス限定のスタブにする（`allow_any_instance_of` を避ける）。**

```ruby
RSpec.describe Scoreboard::SseController, type: :controller do
  describe "#stream" do
    it "SseSubscriptions を生成し、subscribe_all/unsubscribe_all を委譲する" do
      queue = Thread::Queue.new
      allow(Thread::Queue).to receive(:new).and_return(queue)

      # 対象インスタンス限定のスタブで heartbeat を抑制
      allow(controller).to receive(:start_heartbeat).with(queue).and_return(double(kill: nil))

      subs = instance_double(Scoreboard::SseSubscriptions, subscribe_all: nil, unsubscribe_all: nil)
      expect(Scoreboard::SseSubscriptions).to receive(:new).with(queue).and_return(subs)
      expect(subs).to receive(:subscribe_all)
      expect(subs).to receive(:unsubscribe_all)   # ensure で呼ばれること

      allow(queue).to receive(:pop).and_raise(IOError)

      get :stream
    end
  end
end
```

### Step B: SseSubscriptions 実装（Green）

`app/models/scoreboard/sse_subscriptions.rb`:

```ruby
module Scoreboard
  class SseSubscriptions
    # @rbs queue: Thread::Queue
    def initialize(queue)
      @queue = queue
      @subscribers = []
    end

    # 6イベントを購読する。多重購読ガード付き（2回目以降は何もしない）。
    def subscribe_all
      return if @subscribers.any?

      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.update") do |*, payload|
        @queue.push({ event: "match_update", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.match_init") do |*, payload|
        @queue.push({ event: "match_init", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.show_scores") do |*|
        @queue.push({ event: "show_scores", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.hide_scores") do |*|
        @queue.push({ event: "hide_scores", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.question_show") do |*, payload|
        @queue.push({ event: "question_show", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.question_clear") do |*|
        @queue.push({ event: "question_clear", data: {} })
      end
    end

    def unsubscribe_all
      @subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @subscribers.clear
    end
  end
end
```

### Step C: SseController リファクタリング（Refactor）

heartbeat 起動を `start_heartbeat` プライベートメソッドに切り出す。

`app/controllers/scoreboard/sse_controller.rb`:

```ruby
def stream
  response.headers["Content-Type"] = "text/event-stream"
  response.headers["Cache-Control"] = "no-cache"
  response.headers["X-Accel-Buffering"] = "no"

  queue = Thread::Queue.new
  subscriptions = nil      # ensure で安全に参照するため先に nil 初期化
  heartbeat = nil

  subscriptions = Scoreboard::SseSubscriptions.new(queue)
  subscriptions.subscribe_all
  heartbeat = start_heartbeat(queue)

  loop do
    msg = queue.pop
    Scoreboard::SseWriter.write(response.stream, msg[:event], msg[:data])
  end
rescue ActionController::Live::ClientDisconnected, IOError
  # クライアント切断
ensure
  heartbeat&.kill
  subscriptions&.unsubscribe_all    # nil ガードで連鎖失敗を防止
  response.stream.close
end

private

def start_heartbeat(queue)
  Thread.new do
    loop do
      sleep(15)
      queue.push({ event: "heartbeat", data: {} })
    end
  end
end
```

---

## 検証コマンド

```bash
# 0. 変更前のベースライン確認（既存テスト全パス）
bundle exec rspec spec/requests/scoreboard/sse_spec.rb

# 1. SseSubscriptions 単体 + パイプラインテスト（Red → Green 確認）
bundle exec rspec spec/models/scoreboard/sse_subscriptions_spec.rb

# 2. SseController 委譲契約テスト
bundle exec rspec spec/controllers/scoreboard/sse_controller_spec.rb

# 3. SSE 関連テスト全体（変更後リグレッション確認）
bundle exec rspec spec/requests/scoreboard/sse_spec.rb \
  spec/models/scoreboard/sse_subscriptions_spec.rb \
  spec/controllers/scoreboard/sse_controller_spec.rb

# 4. 全チェック
bundle exec rake check
```
