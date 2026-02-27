import React from "react";
import type { QuestionState } from "../types";

type Props = {
  questionState: QuestionState | null;
};

export function Question({ questionState }: Props): React.JSX.Element | null {
  if (!questionState) return null;

  return (
    <div className="question" lang="ja">
      <div className="question-text">{questionState.text}</div>
      <div className="question-answer">{questionState.answer}</div>
    </div>
  );
}
