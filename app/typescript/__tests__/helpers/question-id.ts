import { createQuestionId, type QuestionId } from "../../lib/quiz_reader/question_id";

export function testQuestionId(value: number): QuestionId {
  const questionId = createQuestionId(value);
  if (questionId === null) {
    throw new Error(`テスト用 QuestionId の生成に失敗しました: ${value}`);
  }
  return questionId;
}
