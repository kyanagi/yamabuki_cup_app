# Quiz Reader フォーカス状態の凡例ハイライト

## Context

Quiz Reader の凡例（「Space 再生 → 次の問題 R 再生状態のリセット」）はウィンドウにフォーカスが当たっているときのみキー操作が有効になる。現状は見た目に違いがなくフォーカス状態が不明確。フォーカス中に凡例エリアへ背景色を付けることで一目でわかるようにする。Bulma の `notification` + `has-background-info` クラスを使うことで admin.css の変更は不要。

## 実装手順（TDD: Red → Green → Refactor）

### Phase 1: Red（失敗テストを先に書く）

#### フロントエンドテスト（新規）

`app/typescript/controllers/__tests__/quiz_reader_controller_focus.test.ts`

テストケース（計7件）:

**ユニット系（メソッド直呼び）:**

1. `connect()` + `document.hasFocus() = true` → `keyLegend` に `has-background-info` が付く
2. `connect()` + `document.hasFocus() = false` → `keyLegend` に `has-background-info` が付かない
3. `connect()` + 初期DOMに `has-background-info` あり + `document.hasFocus() = false` → 除去される（Turboキャッシュ復帰対策）
4. `onWindowFocus()` 呼び出し → `has-background-info` が付く
5. `onWindowBlur()` 呼び出し → `has-background-info` が除去される

**統合系（window イベント dispatch で配線確認）:** 6. `data-action` に `focus@window` を含んだHTML + `window.dispatchEvent(new Event("focus"))` → `keyLegend` に `has-background-info` が付く7. 同HTML + `window.dispatchEvent(new Event("blur"))` → `has-background-info` が除去される

※ 統合系（6,7）では `createQuizReaderHTML` に `data-action` で `focus@window`/`blur@window` を含めた HTML を使う（`dom-factory.ts` のデフォルトに追加する）。

`document.hasFocus()` は `vi.spyOn(document, "hasFocus")` でモック。

#### RSpec（既存ファイルに追加）

`spec/requests/admin/quiz_reader_spec.rb` の「初期表示」 describe 内に追加:

- `response.parsed_body` を使い、`data-quiz-reader-target` が `keyLegend` を含む要素が存在する
- コントローラ要素の `data-action` に `focus@window->quiz-reader#onWindowFocus` が含まれる
- コントローラ要素の `data-action` に `blur@window->quiz-reader#onWindowBlur` が含まれる

### Phase 2: Green（最小変更で通す）

**`app/typescript/__tests__/helpers/dom-factory.ts`**
`createQuizReaderHTML` の HTML の `data-controller` 要素に `data-action` 追加 + `keyLegend` ターゲット追加:

```html
<div
  data-controller="quiz-reader"
  data-action="focus@window->quiz-reader#onWindowFocus blur@window->quiz-reader#onWindowBlur"
  ...
>
  ...
  <div class="field notification" data-quiz-reader-target="keyLegend"></div>
  ...
</div>
```

初期状態では `has-background-info` を付けない。状態は JS が一元管理。

**`app/typescript/controllers/quiz_reader_controller.ts`**

- `static targets` に `"keyLegend"` を追加
- `declare keyLegendTarget: HTMLElement` を追加
- `connect()` に初期状態反映を追加（`toggle` で「既にクラスが付いている場合の除去」も担保）:
  ```typescript
  this.keyLegendTarget.classList.toggle("has-background-info", document.hasFocus());
  ```
- メソッドを追加:
  ```typescript
  onWindowFocus() {
    this.keyLegendTarget.classList.add("has-background-info");
  }
  onWindowBlur() {
    this.keyLegendTarget.classList.remove("has-background-info");
  }
  ```

**`app/views/admin/quiz_reader/show.html.erb`**

- `data-action` に `focus@window->quiz-reader#onWindowFocus` と `blur@window->quiz-reader#onWindowBlur` を追加
- 凡例の `<div class="field">` を以下に変更（初期状態から `has-background-info` は付けない）:
  ```html
  <div class="field notification" data-quiz-reader-target="keyLegend"></div>
  ```

### Phase 3: Refactor

`has-background-info` の付け外しを共通化:

```typescript
private setKeyLegendHighlight(focused: boolean) {
  this.keyLegendTarget.classList.toggle("has-background-info", focused);
}
```

`onWindowFocus`・`onWindowBlur`・`connect()` 内でこのメソッドを使う。

## 変更ファイル一覧

| ファイル                                                                    | 変更内容                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `app/typescript/controllers/__tests__/quiz_reader_controller_focus.test.ts` | 新規作成（テスト7件）                                         |
| `app/typescript/__tests__/helpers/dom-factory.ts`                           | `keyLegend` ターゲット要素 + `data-action` に focus/blur 追加 |
| `app/typescript/controllers/quiz_reader_controller.ts`                      | targets/メソッド追加、connect初期化                           |
| `app/views/admin/quiz_reader/show.html.erb`                                 | focus/blur アクション追加、凡例 div 変更                      |
| `spec/requests/admin/quiz_reader_spec.rb`                                   | ERB配線確認の request spec を追加                             |

`app/assets/stylesheets/admin.css` は変更不要。

## 完了条件

1. 新規フロントエンドテスト7件がすべて Green
2. 追加 RSpec が Green
3. 既存テスト（`pnpm run test:run` および `bundle exec rspec`）が全て非回帰
4. `pnpm run fmt:check`、`pnpm run lint`（oxlint --type-check）、`bin/rubocop` が通ること
5. ブラウザ手動確認:
   - 初期表示: フォーカス状態に応じてハイライトあり/なし
   - 別ウィンドウに切り替え → ハイライト消える
   - 戻ってきた → ハイライト復活
