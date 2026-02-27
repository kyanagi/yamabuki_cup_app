import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Question } from "../components/Question";
import type { QuestionState } from "../types";

const MOCK_QUESTION: QuestionState = {
  text: "これはテスト問題文です",
  answer: "テスト解答",
};

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
});
