# 早押し機エミュレータに「正解」「誤答」ボタンを追加

## Context

早押し機エミュレータは現在、ボタン1〜24の押下とリセットのみ対応している。
シリアルプロトコルには `51`（正解）と `52`（不正解）シグナルが定義されており、
実機から受信した場合は `buzzer:serial:correct` / `buzzer:serial:wrong` イベントとして扱われる。
しかしエミュレータからこれらを送出する手段がないため、
実機なしでの正誤判定のテスト・動作確認ができない。
「正解」「誤答」ボタンを追加することで、実機なしの完全なエミュレートを可能にする。

---

## 実装方針

既存イベント `BUZZER_SERIAL_CORRECT_EVENT` / `BUZZER_SERIAL_WRONG_EVENT` を
エミュレータコントローラから発火するだけでよい。
`buzzer_assignment_controller.ts` はすでにこれらのイベントをリッスンして BroadcastChannel に broadcast する実装済みである。

---

## 変更ファイル

### 1. `app/typescript/controllers/buzzer_emulator_controller.ts`

- `events.ts` から `BUZZER_SERIAL_CORRECT_EVENT`, `BUZZER_SERIAL_WRONG_EVENT` を追加インポート
- `correct()` メソッドを追加: `window.dispatchEvent(new CustomEvent(BUZZER_SERIAL_CORRECT_EVENT))`
- `wrong()` メソッドを追加: `window.dispatchEvent(new CustomEvent(BUZZER_SERIAL_WRONG_EVENT))`

### 2. `app/views/admin/buzzer_controls/show.html.erb`

エミュレータセクション（`data-controller="buzzer-emulator"` の box）の reset ボタンの隣に追加:

```html
<button type="button" class="button is-success" data-action="click->buzzer-emulator#correct">正解</button>
<button type="button" class="button is-warning" data-action="click->buzzer-emulator#wrong">誤答</button>
```

### 3. `app/typescript/controllers/__tests__/buzzer_emulator_controller.test.ts`

以下の2テストケースを追加:

- 「正解ボタンで `buzzer:serial:correct` イベントを送出する」
- 「誤答ボタンで `buzzer:serial:wrong` イベントを送出する」

`createHTML()` に正解・誤答ボタンの HTML も追加。

---

## 実装手順（TDD）

1. テストを先に追加（RED）
2. コントローラに `correct()` / `wrong()` メソッドを追加（GREEN）
3. ERB ビューにボタンを追加
4. `pnpm test:run` でテスト通過確認
5. `bundle exec rake check` で全チェック通過確認

---

## 検証方法

- `pnpm run test:run` — Vitest でエミュレータコントローラのテストが通ること
- ブラウザで `/admin/buzzer_control` を開き、正解・誤答ボタンを押下したときに
  `buzzer_assignment_controller` が BroadcastChannel で broadcast することを確認
  （DevTools のコンソールや、早押し機連携画面の動作で確認）
