# Step 9/10: ScoreboardRoot へのレイアウト責務移譲

## Context

現在 `MatchScorelist` が `columns-2` レイアウトと `#question` 列の管理を担っているが、
`MatchScorelist` の本来の責務はルール別スコア一覧の表示であり、レイアウト全体の管理は責務外。
`ScoreboardRoot` がページレイアウトを統括すべきなので、`columns-2` と `Question` の配置を移譲する。

副次効果として `questionState` が `MatchScorelist` を経由しなくなりデータフローが整理される。

## 変更ファイル

| ファイル                                                            | 変更内容                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| `app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx` | 新規作成（テスト）                                    |
| `app/typescript/scoreboard_react/components/MatchScorelist.tsx`     | `columns-2`・`#question`・`questionState` prop を削除 |
| `app/typescript/scoreboard_react/components/ScoreboardRoot.tsx`     | `columns-2` レイアウトと `Question` を追加            |
| `app/typescript/scoreboard_react/App.tsx`                           | 変更なし                                              |

## 実装手順（TDD）

### Step 1: ScoreboardRoot.test.tsx を作成（Red）

```tsx
// app/typescript/scoreboard_react/__tests__/ScoreboardRoot.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreboardRoot } from "../components/ScoreboardRoot";
import { MatchScorelist } from "../components/MatchScorelist";
import type { MatchState, QuestionState } from "../types";

function makeMatchState(): MatchState {
  return {
    matchId: 1,
    ruleTemplate: "board",
    gridClass: "grid-4",
    footerLabel: "第1回戦",
    scoreOperationId: null,
    scores: [],
  };
}

const MOCK_QUESTION: QuestionState = {
  text: "テスト問題文",
  answer: "テスト解答",
};

describe("ScoreboardRoot", () => {
  // ふるまいテスト（主軸）
  it("questionState を Question に渡して表示する", () => {
    render(
      <ScoreboardRoot
        matchState={makeMatchState()}
        pressedSeat={null}
        visibleScores={null}
        questionState={MOCK_QUESTION}
      />,
    );
    expect(screen.getByText("テスト問題文")).toBeTruthy();
  });

  // 以下は責務境界の契約テスト（DOM 構造でレイアウト責務の所在を確認）
  it("columns-2 レイアウトの枠を持つ", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeTruthy();
  });

  it("columns-2 の中に #match-scorelist がある", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#match-scorelist")).toBeTruthy();
  });

  it("columns-2 の中に #question がある", () => {
    const { container } = render(
      <ScoreboardRoot matchState={makeMatchState()} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    const columns2 = container.querySelector(".columns-2");
    expect(columns2?.querySelector("#question")).toBeTruthy();
  });

  it("matchState が null のとき columns-2 も #question もレンダリングしない", () => {
    const { container } = render(
      <ScoreboardRoot matchState={null} pressedSeat={null} visibleScores={null} questionState={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeNull();
    expect(container.querySelector("#question")).toBeNull();
  });
});

describe("MatchScorelist（単体）", () => {
  // 責務境界の契約テスト（columns-2 と #question が ScoreboardRoot に属することを保証）
  it("columns-2 を持たない", () => {
    const { container } = render(
      <MatchScorelist matchState={makeMatchState()} pressedSeat={null} visibleScores={null} />,
    );
    expect(container.querySelector(".columns-2")).toBeNull();
  });

  it("#question を持たない", () => {
    const { container } = render(
      <MatchScorelist matchState={makeMatchState()} pressedSeat={null} visibleScores={null} />,
    );
    expect(container.querySelector("#question")).toBeNull();
  });
});
```

### Step 2: MatchScorelist.tsx と ScoreboardRoot.tsx を同時に変更（Green）

TypeScript 型の整合性上、2ファイルの変更を分離するとコンパイルエラーになるため、
**一つの Green ステップとして同時に変更する**。

#### MatchScorelist.tsx の変更

- `questionState: QuestionState | null` prop を削除
- `import { Question }` を削除
- `import type { ..., QuestionState }` から `QuestionState` を削除
- `columns-2` ラッパー div と `#question` div を削除
- `#match-scorelist` div を直接 return する

```tsx
// 変更後の return
return (
  <div id="match-scorelist" className={gridClass}>
    {scorelistContent}
  </div>
);
```

#### ScoreboardRoot.tsx の変更

- `import { Question } from "./Question"` を追加
- `MatchScorelist` へ `questionState` を渡すのをやめる
- `matchState &&` の条件内で `columns-2` レイアウトを構築し、右列に `Question` を配置する

```tsx
// 変更後の #scoreboard-main 内
{
  matchState && (
    <div className="columns-2">
      <MatchScorelist matchState={matchState} pressedSeat={pressedSeat} visibleScores={visibleScores} />
      <div id="question">
        <Question questionState={questionState} />
      </div>
    </div>
  );
}
```

## 検証

```bash
# フロントエンドテスト
pnpm run test:run

# 全体チェック
bundle exec rake check
```

### 確認ポイント

- 新規 `ScoreboardRoot.test.tsx` が全テストパス
- 既存 `Question.test.tsx`・`BoardScorelist.test.tsx` が引き続きパス
- TypeScript 型エラーなし
