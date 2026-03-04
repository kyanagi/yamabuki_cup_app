import { useEffect, useRef, useState } from "react";
import type { QuestionState } from "../types";

function isSameQuestion(a: QuestionState | null, b: QuestionState | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.text === b.text && a.answer === b.answer;
}

function isSameReadPosition(a: QuestionState | null, b: QuestionState | null): boolean {
  return a?.readText === b?.readText;
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
    if (isSameQuestion(questionState, displayedQuestion)) {
      // 同一問題でも読了位置が変わった場合はアニメーションなしで即座に更新
      if (!isSameReadPosition(questionState, displayedQuestion)) {
        setDisplayedQuestion(questionState);
      }
      return;
    }
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
      <div className="question-text">
        <span className="question-text-read">{displayedQuestion.readText}</span>
        <span className="question-text-unread">{displayedQuestion.unreadText}</span>
      </div>
      <div className="question-answer">{displayedQuestion.answer}</div>
    </div>
  );
}
