# 計画: Step 1 — question_broadcasts_spec.rb に SSE 通知テスト追加

## Context

`QuestionBroadcastsController` は ActionCable broadcast に加え、SSE 用の
`ActiveSupport::Notifications.instrument` 通知（`scoreboard.question_show` /
`scoreboard.question_clear`）を発火している（実装済み）。
しかし `spec/requests/admin/question_broadcasts_spec.rb` には ActionCable の検証のみで、
SSE 通知発火の検証がない。

本 Step では以下の全ケースを追加する：
- 成功系（HTML・JSON）で通知が発火されること
- 失敗系（不正 question_id・空）で通知が **発火されないこと**

---

## 検証方針

`ActiveSupport::Notifications.subscribed` を使う。
ブロック内でリクエストを実行し、ブロック終了後に自動解除される。

```ruby
received = []
ActiveSupport::Notifications.subscribed(
  ->(_name, _started, _finished, _uid, payload) { received << payload },
  "scoreboard.question_show"
) do
  post "/admin/question_broadcasts", params: { question_id: question.id }
end
expect(received.size).to eq 1
expect(received.first[:payload]).to include(text: question.text, answer: question.answer)
```

---

## 変更ファイル

| ファイル | 変更種別 |
|---|---|
| `spec/requests/admin/question_broadcasts_spec.rb` | テスト追加のみ |

---

## 追加するテストの配置と内容

### POST /admin/question_broadcasts — 既存 `context "正常系"` 内に追加

```ruby
it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, payload) { received << payload },
    "scoreboard.question_show"
  ) do
    post "/admin/question_broadcasts", params: { question_id: question.id }
  end
  expect(received.size).to eq 1
  expect(received.first[:payload]).to include(text: question.text, answer: question.answer)
end
```

### POST /admin/question_broadcasts — JSON 正常系（既存 `context "JSONリクエスト" > context "正常系"` 内に追加）

```ruby
it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, payload) { received << payload },
    "scoreboard.question_show"
  ) do
    post "/admin/question_broadcasts",
         params: { question_id: question.id },
         headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
         as: :json
  end
  expect(received.size).to eq 1
  expect(received.first[:payload]).to include(text: question.text, answer: question.answer)
end
```

### POST /admin/question_broadcasts — 失敗系・不正 question_id（既存 context 内に追加）

```ruby
it "scoreboard.question_show 通知は発火されない" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, payload) { received << payload },
    "scoreboard.question_show"
  ) do
    post "/admin/question_broadcasts", params: { question_id: 999999 }
  end
  expect(received).to be_empty
end
```

### POST /admin/question_broadcasts — 失敗系・空 question_id（既存 context 内に追加）

```ruby
it "scoreboard.question_show 通知は発火されない" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, payload) { received << payload },
    "scoreboard.question_show"
  ) do
    post "/admin/question_broadcasts", params: { question_id: "" }
  end
  expect(received).to be_empty
end
```

### POST /admin/question_broadcasts/sample — 既存 `describe` 内に追加

```ruby
it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, payload) { received << payload },
    "scoreboard.question_show"
  ) do
    post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
  end
  expect(received.size).to eq 1
  expect(received.first[:payload]).to include(text: sample_text, answer: sample_answer)
end
```

### POST /admin/question_broadcasts/clear — 既存 `describe` 内に追加

```ruby
it "scoreboard.question_clear 通知が発火される" do
  received = []
  ActiveSupport::Notifications.subscribed(
    ->(_name, _started, _finished, _uid, _payload) { received << true },
    "scoreboard.question_clear"
  ) do
    post "/admin/question_broadcasts/clear"
  end
  expect(received.size).to eq 1
end
```

---

## 配置場所まとめ

```
describe "機能テスト" do
  describe "POST /admin/question_broadcasts" do
    context "正常系" do          ← question_show 成功系（HTML）追加
    end
    context "異常系" do
      context "存在しない Question ID" do  ← question_show 不発火テスト追加
      end
      context "Question ID が空" do        ← question_show 不発火テスト追加
      end
    end
    context "JSONリクエスト" do
      context "正常系" do        ← question_show 成功系（JSON）追加
      end
    end
  end
  describe "POST /admin/question_broadcasts/sample" do ← question_show 追加
  end
  describe "POST /admin/question_broadcasts/clear" do  ← question_clear 追加
  end
end
```

---

## 検証方法

```bash
bundle exec rspec spec/requests/admin/question_broadcasts_spec.rb
```

追加した 6 テストを含む全テストが PASS することを確認する。
