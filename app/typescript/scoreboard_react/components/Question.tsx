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
