/**
 * 得点公開アニメーションを管理するフック。
 * board ルールのみ対象で、show_scores 受信時に得点の高い順へ 800ms 間隔で段階的に表示する。
 * hide_scores または試合切り替えで全非表示に戻す。
 */
import { useEffect, useRef, useState } from "react";
import type { MatchState } from "../types";

/**
 * board ルールのみスコア表示切り替えを適用する。
 * show_scores 受信時に、得点の高い順に 800ms ずつ段階的に表示する。
 *
 * @returns visibleMatchingIds - 得点を表示する matching ID のセット（null = 全非表示）
 */
export function useScoreVisibility(matchState: MatchState | null, showScores: boolean): Set<number> | null {
  const [visibleMatchingIds, setVisibleMatchingIds] = useState<Set<number> | null>(null);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    for (const id of timerIdsRef.current) {
      clearTimeout(id);
    }
    timerIdsRef.current = [];
  };

  useEffect(() => {
    // board ルール以外は何もしない
    if (matchState?.ruleTemplate !== "board") return;

    if (!showScores) {
      clearTimers();
      setVisibleMatchingIds(null);
      return;
    }

    // 得点の高い順に matchingId をソート
    const entries = matchState.scores
      .filter((s) => s.points >= 0)
      .map((s) => ({ matchingId: s.matchingId, points: s.points }))
      .sort((a, b) => b.points - a.points);

    clearTimers();
    setVisibleMatchingIds(new Set<number>());

    entries.forEach(({ matchingId }, index) => {
      const id = setTimeout(
        () => {
          setVisibleMatchingIds((prev) => {
            const next = new Set<number>(prev ?? []);
            next.add(matchingId);
            return next;
          });
        },
        (index + 1) * 800,
      );
      timerIdsRef.current.push(id);
    });

    return clearTimers;
    // matchState.scores は deps に含めない（スコア更新のたびにアニメーションをリセットしない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScores, matchState?.ruleTemplate, matchState?.matchId]);

  return visibleMatchingIds;
}
