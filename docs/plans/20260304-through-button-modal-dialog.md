# スルーボタンをモーダルダイアログに変更

## Context

得点操作画面の「スルー」ボタンは現在 `turbo_confirm` を使ったブラウザネイティブダイアログで確認を取っている。氏名ボタン（「正解」「誤答」ダイアログ）と同様に Bulma モーダルを使った確認ダイアログに変更する。

## 現状の実装

以下の4ファイルに同じパターンで「スルー」ボタンが存在する：

- `app/views/admin/shared/matches/final/show.html.erb` (L28-33)
- `app/views/admin/shared/matches/hayaoshi/show.html.erb` (L27-32)
- `app/views/admin/shared/matches/playoff/show.html.erb` (L28-33)
- `app/views/admin/shared/matches/round2/show.html.erb` (L69-74)

現在のパターン：

```erb
<%= form_with url: "/admin/matches/#{@match.id}/question_closings",
             method: :post,
             style: 'display: inline-block;',
             data: { turbo_confirm: "この問題をスルーにします。" } do |f| %>
  <%= f.submit 'スルー', class: 'button is-warning' %>
<% end %>
```

## 既存パターンの参照

- `app/typescript/controllers/modal_controller.ts` - open/close を担う既存 Stimulus コントローラ（変更不要）
- `app/views/admin/shared/matches/board/_score.html.erb` - form と submit ボタンを分離するパターン
- `app/views/admin/shared/matches/final/_score.html.erb` - `data-controller="modal"` + Bulma modal の基本パターン

## 実装方針

### 1. 共通パーシャルを作成

DRY 原則に従い、4ファイルで共通のパーシャルを作成する。

**新規作成:** `app/views/admin/shared/matches/_through_button.html.erb`

```erb
<%# locals: (match:) %>
<div data-controller="modal" style="display: inline-block;">
  <%= button_tag 'スルー', class: 'button is-warning', data: { action: "click->modal#open" } %>
  <div class="modal" data-modal-target="modal">
    <div class="modal-background" data-action="click->modal#close"></div>
    <div class="modal-content">
      <div class="box">
        <p class="is-size-2">スルー</p>
        <div class="is-flex is-justify-content-flex-end buttons are-large">
          <%= form_with url: "/admin/matches/#{match.id}/question_closings", method: :post, style: 'display: inline-block;' do |f| %>
            <%= f.submit 'スルー', class: 'button is-warning' %>
          <% end %>
        </div>
      </div>
    </div>
    <button class="modal-close is-large" aria-label="close" data-action="click->modal#close"></button>
  </div>
</div>
```

### 2. 各 show.html.erb を修正

4ファイルの既存のスルーフォームを以下に置き換える：

```erb
<%= render "admin/shared/matches/through_button", match: @match %>
```

## 変更ファイル一覧

| ファイル                                                  | 変更内容                                  |
| --------------------------------------------------------- | ----------------------------------------- |
| `app/views/admin/shared/matches/_through_button.html.erb` | **新規作成** - スルーモーダルのパーシャル |
| `app/views/admin/shared/matches/final/show.html.erb`      | スルーフォームをパーシャル呼び出しに置換  |
| `app/views/admin/shared/matches/hayaoshi/show.html.erb`   | スルーフォームをパーシャル呼び出しに置換  |
| `app/views/admin/shared/matches/playoff/show.html.erb`    | スルーフォームをパーシャル呼び出しに置換  |
| `app/views/admin/shared/matches/round2/show.html.erb`     | スルーフォームをパーシャル呼び出しに置換  |

変更不要：

- `app/typescript/controllers/modal_controller.ts` - 既存コントローラで対応可能

## 備考

- `question_closings_controller.rb` は `question_player_results_attributes` がない場合に `[]` を返す（スルー扱い）。フォームパラメータは不要。
- hayabo/show.html.erb にはスルーボタンがないため対象外。

## 検証方法

1. `./bin/dev` でサーバ起動
2. 管理画面の Final / Hayaoshi / Playoff / Round2 の試合操作画面にアクセス
3. 「スルー」ボタンをクリック → Bulma モーダルが表示されること
4. モーダルの背景クリック / × ボタン → モーダルが閉じること
5. モーダル内の「スルー」ボタンをクリック → スルーが送信されてページが更新されること
6. `bundle exec rake check` を実行してエラーがないことを確認
