import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { dispatchAnimationEnd } from "../../__tests__/helpers/animation";
import { Question } from "../components/Question";
import type { QuestionState } from "../types";

const MOCK_QUESTION: QuestionState = {
  text: "これはテスト問題文です",
  answer: "テスト解答",
  readText: "",
  unreadText: "これはテスト問題文です",
};

const MOCK_QUESTION2: QuestionState = {
  text: "これは別のテスト問題文です",
  answer: "別のテスト解答",
  readText: "",
  unreadText: "これは別のテスト問題文です",
};

const MOCK_QUESTION3: QuestionState = {
  text: "3問目の問題文です",
  answer: "3問目の解答",
  readText: "",
  unreadText: "3問目の問題文です",
};

function fireAnimationEnd(el: HTMLElement, animationName: string) {
  dispatchAnimationEnd(el, { animationName });
}

describe("Question", () => {
  it("questionState が null のとき何も描画しない", () => {
    const { container } = render(<Question questionState={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("questionState が存在するとき問題文を表示する", () => {
    render(<Question questionState={MOCK_QUESTION} />);
    expect(screen.getByText("これはテスト問題文です")).toBeTruthy();
  });

  it("questionState が存在するとき解答を表示する", () => {
    render(<Question questionState={MOCK_QUESTION} />);
    expect(screen.getByText("テスト解答")).toBeTruthy();
  });

  it("questionState が null になると .question--hiding クラスが付く", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={null} />);
    expect(container.firstChild).not.toBeNull();
    expect((container.firstChild as HTMLElement).classList.contains("question--hiding")).toBe(true);
  });

  it("question_clear: animationend 後にアンマウントされる", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={null} />);
    const el = container.firstChild as HTMLElement;
    fireAnimationEnd(el, "hideToTop");
    expect(container.firstChild).toBeNull();
  });

  it("別の問題へ更新すると .question--hiding を経て新問題が表示される", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={MOCK_QUESTION2} />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("question--hiding")).toBe(true);
    expect(el.textContent).toContain("これはテスト問題文です");
    fireAnimationEnd(el, "hideToTop");
    expect(screen.getByText("これは別のテスト問題文です")).toBeTruthy();
    expect((container.firstChild as HTMLElement).classList.contains("question--hiding")).toBe(false);
  });

  it("animationName が hideToTop 以外の animationend では状態遷移しない", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={null} />);
    const el = container.firstChild as HTMLElement;
    fireAnimationEnd(el, "revealFromTop");
    expect(container.firstChild).not.toBeNull();
    expect(el.classList.contains("question--hiding")).toBe(true);
  });

  it("同一内容の問題が再送信されても不要な hiding を起動しない", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={{ ...MOCK_QUESTION }} />);
    expect((container.firstChild as HTMLElement).classList.contains("question--hiding")).toBe(false);
  });

  it("アニメーション中に連続更新したとき最終問題のみ表示される（Q1→Q2→Q3）", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={MOCK_QUESTION2} />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("question--hiding")).toBe(true);
    rerender(<Question questionState={MOCK_QUESTION3} />);
    fireAnimationEnd(el, "hideToTop");
    expect(screen.getByText("3問目の問題文です")).toBeTruthy();
  });

  it("アニメーション中に元の問題へ戻る更新（Q1→Q2→Q1）が来たとき animationend 後に Q1 が表示される", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={MOCK_QUESTION2} />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("question--hiding")).toBe(true);
    rerender(<Question questionState={MOCK_QUESTION} />);
    fireAnimationEnd(el, "hideToTop");
    expect(screen.getByText("これはテスト問題文です")).toBeTruthy();
    expect((container.firstChild as HTMLElement).classList.contains("question--hiding")).toBe(false);
  });

  it("show → clear → show のシーケンスで正しく遷移する", () => {
    const { container, rerender } = render(<Question questionState={MOCK_QUESTION} />);
    rerender(<Question questionState={null} />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("question--hiding")).toBe(true);
    fireAnimationEnd(el, "hideToTop");
    expect(container.firstChild).toBeNull();
    rerender(<Question questionState={MOCK_QUESTION2} />);
    expect(screen.getByText("これは別のテスト問題文です")).toBeTruthy();
    expect((container.firstChild as HTMLElement).classList.contains("question--hiding")).toBe(false);
  });
});
