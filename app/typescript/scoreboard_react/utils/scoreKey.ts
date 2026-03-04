import type { ScoreEntry } from "../types";

/**
 * アニメーション再実行のための React key を生成する。
 * scoreChanged が true かつ scoreOperationId がある場合は操作IDを含めることで、
 * 同一選手への連続した得点操作でも DOM が再マウントされ、アニメーションが再実行される。
 */
export function buildScoreKey(score: ScoreEntry, scoreOperationId: number | null): string {
  return score.scoreChanged && scoreOperationId !== null
    ? `${score.matchingId}-${scoreOperationId}`
    : `${score.matchingId}`;
}
