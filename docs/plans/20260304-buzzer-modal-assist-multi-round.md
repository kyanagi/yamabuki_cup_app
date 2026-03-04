# 早押し機連動による得点入力補助機能

## Context

早押しクイズの得点操作画面では、審判がプレイヤー名ボタンを手動でクリックしてモーダルを開き、正解・誤答を入力している。
早押し機のボタン押下を検知して自動的に対象プレイヤーのモーダルを開くことで、操作の手間と誤操作を削減する。
まず hayaoshi ラウンド（`ADMIN_VIEW_TEMPLATE = "hayaoshi"`）のみを対象とする。

## 現状の仕組み

- 早押し機ボタン押下 → `BuzzerControlController` が BroadcastChannel に `{ type: "button_pressed", seat: SeatId }` を送信
- `SeatId`（0-11）は `Matching#seat` カラムと一致
- モーダルは各 `<tr data-controller="modal">` に `is-active` クラスを付与することで表示（`modal_controller.ts`）
- `question_closings#create` が Turbo Frame `match` を再描画するため、**スイッチは Turbo Frame 外に配置する必要がある**
- 管理画面の Stimulus コントローラ登録先は `app/typescript/controllers/admin_index.ts`（`index.ts` ではない）

## 実装方針（TDD: Red → Green → Refactor）

### 変更ファイル一覧

| ファイル                                                        | 種別                               |
| --------------------------------------------------------------- | ---------------------------------- |
| `app/typescript/controllers/hayaoshi_buzzer_controller.ts`      | 新規                               |
| `app/typescript/controllers/hayaoshi_buzzer_controller.test.ts` | 新規                               |
| `app/typescript/controllers/admin_index.ts`                     | 変更（登録追加）                   |
| `app/views/admin/shared/matches/hayaoshi/_score.html.erb`       | 変更（`data-seat` 追加）           |
| `app/views/admin/shared/matches/hayaoshi/show.html.erb`         | 変更（コントローラ＋スイッチ追加） |

### Step 1: Red（失敗するテストを先に書く）

`hayaoshi_buzzer_controller.test.ts` に以下のテストを作成する：

- BroadcastChannel 非対応環境でも `connect()` がエラーにならない
- スイッチがOFFのとき、`button_pressed` シグナルを受け取っても `.modal.is-active` が追加されない
- スイッチがONで、対応する `[data-seat]` の行が存在するとき、その `.modal` に `is-active` が追加される
- スイッチがONでも既に `.modal.is-active` が存在するときは何もしない
- スイッチがONで `seat` が不正値（`isSeatId` が false）のときは無視する
- `button_pressed` 以外のシグナル（`correct` / `wrong` / `reset`）は無視する
- 対応する `[data-seat]` がない seat でも例外が発生しない

BroadcastChannel のモックは `vi.stubGlobal("BroadcastChannel", ...)` を使用（正規関数で定義すること。アロー関数は `new` できないため使用不可）。

### Step 2: Green（最小実装）

**新規: `app/typescript/controllers/hayaoshi_buzzer_controller.ts`**

```typescript
import { Controller } from "@hotwired/stimulus";
import { createBuzzerChannel } from "../lib/buzzer/channel";
import type { BuzzerChannel } from "../lib/buzzer/channel";
import { isSeatId } from "../lib/buzzer/seat_id";
import type { BuzzerSignal } from "../lib/buzzer/signal";

export default class extends Controller {
  static targets = ["switch"];
  declare switchTarget: HTMLInputElement;

  #channel: BuzzerChannel | null = null;

  connect(): void {
    if (typeof BroadcastChannel === "undefined") return;
    this.#channel = createBuzzerChannel();
    this.#channel.onMessage((signal) => this.#handleSignal(signal));
  }

  disconnect(): void {
    this.#channel?.close();
    this.#channel = null;
  }

  #handleSignal(signal: BuzzerSignal): void {
    if (!this.switchTarget.checked) return;
    if (signal.type !== "button_pressed") return;
    // 境界防御: 不正な payload は無視する
    if (!isSeatId(signal.seat)) return;
    // 既にモーダルが開いていたら何もしない
    if (this.element.querySelector(".modal.is-active")) return;
    // 対応する seat の行を探す（セレクタに直接埋め込まず、数値検証後に使用）
    const seat = signal.seat;
    const row = this.element.querySelector<HTMLElement>(`[data-seat="${seat}"]`);
    const modal = row?.querySelector(".modal");
    modal?.classList.add("is-active");
  }
}
```

**変更: `app/typescript/controllers/admin_index.ts`**

```typescript
import HayaoshiBuzzerController from "./hayaoshi_buzzer_controller";
// ...
application.register("hayaoshi-buzzer", HayaoshiBuzzerController);
```

**変更: `app/views/admin/shared/matches/hayaoshi/_score.html.erb`**

```erb
<tr data-controller="modal" data-seat="<%= score.matching.seat %>">
```

**変更: `app/views/admin/shared/matches/hayaoshi/show.html.erb`**

`<div class="container">` にコントローラを設定し、`turbo_frame_tag` の外にスイッチを配置する：

```erb
<div class="container" data-controller="hayaoshi-buzzer">
  <div class="mb-3">
    <label class="checkbox">
      <input type="checkbox" data-hayaoshi-buzzer-target="switch">
      早押し機連動（操作補助）
    </label>
  </div>
  <%= turbo_frame_tag 'match' do %>
    <section class="section">
      ...既存の内容...
    </section>
  <% end %>
</div>
```

### Step 3: Refactor

- コントローラのコードを読み返し、責務が明確か確認する
- テストで十分にカバーできているか確認する

## 検証手順

1. `pnpm run test:run` でフロントエンドテストが全て通ること
2. `bundle exec rake check` で全チェックが通ること
3. `./bin/dev` でサーバ起動
4. hayaoshi ラウンドの試合操作画面を開く
5. 早押し機エミュレータ（別タブまたは同じページに表示）でプレイヤーのボタンを押す
6. 「早押し機連動（操作補助）」スイッチがOFFのとき：モーダルが開かないこと
7. スイッチをONにしてボタンを押す：対応するプレイヤーの正解/誤答モーダルが開くこと
8. モーダルが開いている状態で別のプレイヤーのボタンを押す：何も起きないこと
9. 正解・誤答を入力して再描画が走った後も：スイッチのON状態が保持されること（Turbo Frame 外にあるため）
