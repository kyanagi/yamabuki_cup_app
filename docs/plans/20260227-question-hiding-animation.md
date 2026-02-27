# Plan: Step 7/8 — Question コンポーネントの消去アニメーション（最終版）

## Context

現在の `Question.tsx` は `questionState` が null になると即座にアンマウントするため、
CSS に定義済みの `hideToTop` アニメーション（`.question--hiding`）が一切再生されない。
`question_clear` や問題切り替え時にフェードアウトアニメーションを挟む必要がある。

---

## 既存リソース

| リソース                       | 場所                                              | 状態                               |
| ------------------------------ | ------------------------------------------------- | ---------------------------------- |
| `.question--hiding` CSS クラス | `app/assets/stylesheets/scoreboard.css:604〜`     | 定義済み（`hideToTop 0.3s`）       |
| `animationend` パターン        | `app/typescript/lib/scoreboard/stream_actions.ts` | Turbo Stream 側で実績あり          |
| `QuestionState` 型             | `app/typescript/scoreboard_react/types.ts`        | `{ text: string; answer: string }` |

---

## 実装ファイル

| 操作 | ファイル                                                      |
| ---- | ------------------------------------------------------------- |
| 変更 | `app/typescript/scoreboard_react/components/Question.tsx`     |
| 変更 | `app/typescript/scoreboard_react/__tests__/Question.test.tsx` |

---

## 設計の要点

### コンテンツ比較（参照同一性NG）

`question_show` は `JSON.parse` 経由で毎回新規オブジェクトを生成するため、
`questionState === displayedQuestion` の参照比較では同内容でも不要な hiding が発火する。

```typescript
// モジュールレベルに定義（純粋関数）
function isSameQuestion(a: QuestionState | null, b: QuestionState | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.text === b.text && a.answer === b.answer;
}
```

### 内部状態

```
displayedQuestion  - 現在スクリーンに表示中の問題（アニメーション中も維持）
isHiding           - hideToTop アニメーション再生中フラグ
nextRef            - アニメーション完了後に表示する次の問題（useRef）
```

### useEffect ロジック（依存: `[questionState, displayedQuestion, isHiding]`）

```
isHiding = true のとき
  → nextRef を常に questionState で上書き（逆戻し更新も含め最新を保持）
  → return（アニメーション完了まで displayedQuestion は触らない）

isHiding = false のとき
  isSameQuestion(questionState, displayedQuestion) → return
  displayedQuestion が null → setDisplayedQuestion(questionState)（即表示）
  displayedQuestion が存在 → nextRef = { value: questionState }, setIsHiding(true)
```

**ポイント**: `isHiding=true` 中は「`displayedQuestion` との比較」ではなく「常に nextRef を更新」とすることで、
Q1→Q2（hiding開始）→Q1（逆戻し）のケースでも `animationend` 後に正しく Q1 が表示される。

### handleAnimationEnd

```typescript
function handleAnimationEnd(e: React.AnimationEvent) {
  if (e.animationName !== "hideToTop") return; // revealFromTop は無視
  const next = nextRef.current?.value ?? null;
  nextRef.current = undefined;
  setDisplayedQuestion(next);
  setIsHiding(false);
}
```

---

## Step A: テスト先行（Red）

### 既存3ケース（変更なし）

- null → 何も描画しない
- questionState 存在 → 問題文を表示
- questionState 存在 → 解答を表示

### 新規テスト一覧

```typescript
// ① null になると .question--hiding が付く
it("questionState が null になると .question--hiding クラスが付く", ...)

// ② question_clear: animationend 後にアンマウント
it("question_clear: animationend 後にアンマウントされる", () => {
  // fireEvent.animationEnd(el, { animationName: "hideToTop" })
  // → container.firstChild が null
})

// ③ 問題切り替え → 新問題へ遷移
it("別の問題へ更新すると .question--hiding を経て新問題が表示される", ...)

// ④ revealFromTop は無視
it("animationName が hideToTop 以外の animationend では状態遷移しない", () => {
  // fireEvent.animationEnd(el, { animationName: "revealFromTop" })
  // → 問題は消えていない、.question--hiding なし
})

// ⑤ 同一内容の再送信は hiding しない
it("同一内容の問題が再送信されても不要な hiding を起動しない", () => {
  // rerender(<Question questionState={{ ...MOCK_QUESTION }} />) ← 別参照・同内容
  // → .question--hiding なし
})

// ⑥ 連続更新: Q1→Q2→Q3、最終のみ表示
it("アニメーション中に連続更新したとき最終問題のみ表示される（Q1→Q2→Q3）", ...)

// ⑦ 逆戻し更新: Q1→Q2→Q1、animationend 後に Q1 が表示される
it("アニメーション中に元の問題へ戻る更新（Q1→Q2→Q1）が来たとき animationend 後に Q1 が表示される", ...)

// ⑧ SSE シーケンス統合テスト: show→clear→show
it("show → clear → show のシーケンスで正しく遷移する", ...)
```

---

## Step B: 実装（Green）

`Question.tsx` の最終形:

```tsx
import { useEffect, useRef, useState } from "react";
import type { QuestionState } from "../types";

function isSameQuestion(a: QuestionState | null, b: QuestionState | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.text === b.text && a.answer === b.answer;
}

type Props = { questionState: QuestionState | null };

export function Question({ questionState }: Props): React.JSX.Element | null {
  const [displayedQuestion, setDisplayedQuestion] = useState<QuestionState | null>(questionState);
  const [isHiding, setIsHiding] = useState(false);
  const nextRef = useRef<{ value: QuestionState | null } | undefined>(undefined);

  useEffect(() => {
    if (isHiding) {
      // アニメーション中は常に nextRef を最新の questionState で更新する
      // （逆戻し更新 Q1→Q2→Q1 も含め、animationend 後に最新を表示）
      nextRef.current = { value: questionState };
      return;
    }
    if (isSameQuestion(questionState, displayedQuestion)) return;
    if (!displayedQuestion) {
      setDisplayedQuestion(questionState);
      return;
    }
    nextRef.current = { value: questionState };
    setIsHiding(true);
  }, [questionState, displayedQuestion, isHiding]);

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (e.animationName !== "hideToTop") return;
    const next = nextRef.current?.value ?? null;
    nextRef.current = undefined;
    setDisplayedQuestion(next);
    setIsHiding(false);
  }

  if (!displayedQuestion) return null;

  return (
    <div className={isHiding ? "question question--hiding" : "question"} lang="ja" onAnimationEnd={handleAnimationEnd}>
      <div className="question-text">{displayedQuestion.text}</div>
      <div className="question-answer">{displayedQuestion.answer}</div>
    </div>
  );
}
```

---

## 状態遷移表（完全版）

| 入力シーケンス                   | animationend 後の表示           |
| -------------------------------- | ------------------------------- |
| null → Q1                        | Q1（即表示、revealFromTop）     |
| Q1 → null                        | null（アンマウント）            |
| Q1 → Q2                          | Q2                              |
| Q1 → Q2 → Q3（アニメ中）         | Q3（nextRef 上書き）            |
| Q1 → Q2 → Q1（逆戻し）           | Q1                              |
| Q1 → Q1 再送信（別参照・同内容） | アニメなし、Q1 表示維持         |
| revealFromTop animationend       | 何も変化しない                  |
| show(Q1) → clear → show(Q2)      | Q1表示 → アニメ → null → Q2表示 |

---

## 完了条件（DoD）

- テスト ⑦ 逆戻し更新ケースを含む全8テストがパスすること
- `pnpm run test:run` 全体で regression なし
- `bundle exec rake check` 全パス

---

## 検証コマンド

```bash
# 1. Red 確認（テスト追加後、実装前）
pnpm run test:run -- --reporter=verbose --testNamePattern="Question"

# 2. Green 確認（実装後）
pnpm run test:run -- --reporter=verbose --testNamePattern="Question"

# 3. 全チェック
bundle exec rake check
```
