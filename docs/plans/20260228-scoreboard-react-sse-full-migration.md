# スコアボード React+SSE 完全移行ロードマップ

## Context

現在の React+SSE 版スコアボード (`/scoreboard/react`) はスコア表示と問題表示のみ実装済み。
タイマー・1位発表・ペーパーシード発表・Round2 発表・アナウンス・チャンピオン表示を React+SSE 版に追加し、旧 ActionCable 版と並行稼働させながら移行する。

---

## アーキテクチャ方針

### シーン概念の導入

スコアボードのメイン表示は「シーン」で管理する。各シーンは試合スコアを完全に置き換える。

```typescript
// types.ts に追加
export type Scene =
  | { type: "match" }
  | { type: "timer"; footerLabel: string }
  | { type: "first_place_init" }
  | { type: "first_place_plate" }
  | { type: "first_place_player"; playerName: string }
  | { type: "paper_seed"; footerLabel: string; slots: PaperSeedSlot[] }
  | { type: "round2_announcement"; footerLabel: string; gridClass: string; slots: Round2Slot[] }
  | { type: "announcement"; text: string }
  | { type: "champion"; name: string; tournamentName: string };
```

### 既存 props との互換性

`ScoreboardRoot` の既存 props (`matchState`, `questionState` 等) は維持。`scene: Scene | null` を追加し、シーンに応じてメインコンテンツを切り替える。`useScoreboardSSE` の戻り値にも `scene` を追加する。

---

## 実装順序

| フェーズ | 機能                   | 理由                                |
| -------- | ---------------------- | ----------------------------------- |
| 0        | **シーン管理共通基盤** | 全機能の前提                        |
| 1        | **アナウンス**         | 最もシンプル（テキスト + 時計）     |
| 2        | **チャンピオン**       | アナウンスと同構造                  |
| 3        | **タイマー**           | 内部ロジックが独立しテストしやすい  |
| 4        | **1位発表**            | 3段階の状態遷移                     |
| 5        | **ペーパーシード発表** | 7枠の個別更新 + exit アニメーション |
| 6        | **Round2 発表**        | シード発表と同構造 + staggered      |

---

## フェーズ 0: シーン管理共通基盤

### 変更ファイル

- `app/typescript/scoreboard_react/types.ts` — `Scene` 型と後続フェーズ分の `SseEvent` union を追加
- `app/typescript/scoreboard_react/hooks/useScoreboardSSE.ts` — 戻り値に `scene: Scene | null` を追加（既存イベントで `match_init` 時に `setScene({ type: "match" })`）
- `app/typescript/scoreboard_react/__tests__/useScoreboardSSE.test.ts` — `match_init` で `scene` が `{ type: "match" }` になることを検証追加
- `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx` — `scene` prop を受け取り、シーンに応じてメインコンテンツを切り替える（`null` / `"match"` 以外は後続フェーズで追加）
- `app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx` — 既存テストに `scene` prop を追加（`matchState` を渡すテストは `scene={{ type: "match" }}` も渡す）
- `app/typescript/scoreboard_react/App.tsx` — `useScoreboardSSE` から `scene` を受け取り `ScoreboardRoot` に渡す

### ScoreboardRoot のシーン切り替えロジック（概念）

```tsx
// #scoreboard-main 内
{scene?.type === "match" && matchState && (
  <div className="columns-2">
    <MatchScorelist ... />
    <div id="question"><Question ... /></div>
  </div>
)}
{scene?.type === "announcement" && <AnnouncementScene scene={scene} />}
// 以降フェーズごとに追加
```

フッター左ラベル: `scene?.type === "match"` → `matchState?.footerLabel`、それ以外は `scene` から取得。

---

## フェーズ 1〜6 共通パターン（各機能の実装手順）

各機能は以下の TDD サイクルで実装する：

### バックエンド（Red → Green）

1. `spec/models/scoreboard/sse_subscriptions_spec.rb` にテスト追加
2. `app/models/scoreboard/sse_subscriptions.rb` に購読追加
3. `app/controllers/admin/scoreboard_manipulations_controller.rb` の対応 `when` に `ActiveSupport::Notifications.instrument` 追加（既存 ActionCable broadcast は削除しない）

### フロントエンド（Red → Green）

1. `useScoreboardSSE.test.ts` — 新 SSE イベントで `scene` が適切に更新されることを検証
2. `useScoreboardSSE.ts` — 新イベントリスナー追加
3. `[ComponentName].test.tsx` — コンポーネントの描画を検証
4. `[ComponentName].tsx` — コンポーネント実装（既存 CSS クラスを再利用）
5. `ScoreboardRoot.test.tsx` — 該当シーンでのレンダリングを検証
6. `ScoreboardRoot.tsx` — 新シーンのケースを追加

---

## SSE ペイロード一覧

| SSE event                                 | Rails notification                                   | payload                                                                 |
| ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `timer_init`                              | `scoreboard.timer_init`                              | `{ footerLabel: string }`                                               |
| `timer_set_remaining_time`                | `scoreboard.timer_set_remaining_time`                | `{ remainingTimeMs: number }`                                           |
| `timer_start`                             | `scoreboard.timer_start`                             | `{}`                                                                    |
| `timer_stop`                              | `scoreboard.timer_stop`                              | `{}`                                                                    |
| `first_place_init`                        | `scoreboard.first_place_init`                        | `{}`                                                                    |
| `first_place_prepare_plate`               | `scoreboard.first_place_prepare_plate`               | `{}`                                                                    |
| `first_place_display_player`              | `scoreboard.first_place_display_player`              | `{ playerName: string }`                                                |
| `paper_seed_init`                         | `scoreboard.paper_seed_init`                         | `{ footerLabel: string }`                                               |
| `paper_seed_display_player`               | `scoreboard.paper_seed_display_player`               | `{ rank: number, name: string, score: number }`                         |
| `paper_seed_exit_all_players`             | `scoreboard.paper_seed_exit_all_players`             | `{}`                                                                    |
| `round2_announcement_init`                | `scoreboard.round2_announcement_init`                | `{ footerLabel: string, gridClass: string, players: [{ rank }] }`       |
| `round2_announcement_display_player`      | `scoreboard.round2_announcement_display_player`      | `{ rank: number, name: string }`                                        |
| `round2_announcement_display_all_players` | `scoreboard.round2_announcement_display_all_players` | `{ footerLabel: string, gridClass: string, players: [{ rank, name }] }` |
| `announcement`                            | `scoreboard.announcement`                            | `{ text: string }`                                                      |
| `champion`                                | `scoreboard.champion`                                | `{ name: string, tournamentName: string }`                              |

### 補足

#### タイマーのデータフロー

SSE イベント → `useScoreboardSSE` → `TimerScene` → `useTimer` フックのパイプラインで管理する。

```
SSE event
  ↓
useScoreboardSSE が timerCommand state を更新
  timerCommand: { type: "set"; remainingTimeMs: number }
             | { type: "start" }
             | { type: "stop" }
             | null
  ↓
TimerScene コンポーネントが timerCommand を受け取り useTimer フックに渡す
  ↓
useTimer フックが timerCommand を useEffect で監視し内部状態を制御
  - "set": remainingTimeMs を設定（停止状態へ）
  - "start": setInterval を開始
  - "stop": clearInterval、経過分を remainingTimeMs から差し引く
  ↓
remainingMs を MM:SS フォーマットで表示
```

- `timer_init` 受信: `scene` を `{ type: "timer"; footerLabel }` に変更し、`timerCommand` は `null` のまま（`"--:--"` 表示）
- `timer_set_remaining_time` 受信: `timerCommand = { type: "set"; remainingTimeMs }` に更新
- `timer_start` / `timer_stop` 受信: `timerCommand = { type: "start" | "stop" }` に更新
- `useTimer(timerCommand)` は `timerCommand` の変化を `useEffect` で検知して動作を切り替える
- 参考: `app/typescript/controllers/round1_timer_controller.ts` の `setRemainingTime` / `start` / `stop` ロジック

#### アナウンスシーンの時計表示

`useClock` カスタムフック（新規）が `{ hours, minutes, colonVisible }` を返し、`AnnouncementScene` が JSX で描画する。

```typescript
// hooks/useClock.ts
// 戻り値: { hours: string, minutes: string, colonVisible: boolean }
// setInterval(1000) で毎秒更新
// colonVisible: 偶数秒 → true, 奇数秒 → false（参考: clock_controller.ts）
```

```tsx
// AnnouncementScene.tsx 内
const { hours, minutes, colonVisible } = useClock();
// <div className="announcement-clock">
//   {hours}
//   <span className={colonVisible ? undefined : "announcement-clock__colon--hidden"}>:</span>
//   {minutes}
// </div>
```

コロン点滅は CSS クラスで実現（`dangerouslySetInnerHTML` は使わない）:

```css
/* scoreboard.css に追加 */
.announcement-clock__colon--hidden {
  opacity: 0;
}
```

テスト: `vi.useFakeTimers()` で時刻を制御し、偶数秒/奇数秒でコロンのクラスが切り替わることを検証する。

#### 1位発表の文字サイズ制御

`.first-place-player__name--length-N` クラスを `playerName.length` に応じて付与する（N = 5, 6, 7 の場合に適用、4文字以下はクラスなし）。

```tsx
// FirstPlaceScene.tsx 内
const nameLengthClass =
  playerName.length >= 5 ? `first-place-player__name--length-${Math.min(playerName.length, 7)}` : "";
// <div className={`first-place-player__name-text ${nameLengthClass}`}>{playerName}</div>
```

既存 CSS: `.first-place-player__name--length-5` = `scale(4/5)`, 6 = `scale(4/6)`, 7 = `scale(4/7)`。

#### その他の補足

- **タイマー残り時間**: バックエンドは残り時間を DB 管理していないため、`timer_init` のペイロードには `footerLabel` のみ含める。React 側は `timer_set_remaining_time` を受け取るまで `"--:--"` を表示する。
- **staggered animation**: `round2_announcement_display_all_players` は一度に全プレイヤーを設定し、`player-frame--incoming-animation` CSS クラスの `animation-delay` で時間差表示（既存クラス再利用）。
- **paper_seed_exit**: `Question.tsx` の `hideToTop` パターンと同様に `onAnimationEnd` で状態を更新する。
- **round2 grid class**: `MatchRule::Round2Ura` → `match-scorelist-column2-row6`、それ以外 → `match-scorelist-column2-row5`。
- **champion の大会名**: `final/_champion.html.erb` と同様に Rails 側でハードコード（`"第2回やまぶき杯"`）。

---

## 主要ファイル

| ファイル                                                                 | 役割                           |
| ------------------------------------------------------------------------ | ------------------------------ |
| `app/controllers/admin/scoreboard_manipulations_controller.rb`           | 各 when に instrument 追加     |
| `app/models/scoreboard/sse_subscriptions.rb`                             | 購読を 6 → 最大 21 に拡張      |
| `spec/models/scoreboard/sse_subscriptions_spec.rb`                       | 購読テスト追加                 |
| `app/typescript/scoreboard_react/types.ts`                               | Scene 型・SseEvent 型を追加    |
| `app/typescript/scoreboard_react/hooks/useScoreboardSSE.ts`              | scene state 管理を追加         |
| `app/typescript/scoreboard_react/hooks/useTimer.ts`                      | タイマーロジック（新規）       |
| `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx`          | シーン切り替えロジック         |
| `app/typescript/scoreboard_react/components/AnnouncementScene.tsx`       | アナウンス（新規）             |
| `app/typescript/scoreboard_react/components/ChampionScene.tsx`           | チャンピオン（新規）           |
| `app/typescript/scoreboard_react/components/TimerScene.tsx`              | タイマー（新規）               |
| `app/typescript/scoreboard_react/components/FirstPlaceScene.tsx`         | 1位発表（新規）                |
| `app/typescript/scoreboard_react/components/PaperSeedScene.tsx`          | シード発表（新規）             |
| `app/typescript/scoreboard_react/components/Round2AnnouncementScene.tsx` | Round2 発表（新規）            |
| `app/assets/stylesheets/scoreboard.css`                                  | 変更なし（既存クラスを再利用） |

---

## 検証

```bash
# 各フェーズ完了後
pnpm run test:run
bundle exec rspec spec/models/scoreboard/sse_subscriptions_spec.rb
bundle exec rake check
```
