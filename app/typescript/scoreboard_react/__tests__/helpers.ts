import type { ScoreEntry } from "../types";

type MakeScoreOptions = {
  stars?: number;
  status?: ScoreEntry["status"];
};

export function makeScore(
  matchingId: number,
  seat: number,
  points: number,
  scoreChanged: boolean,
  options: MakeScoreOptions = {},
): ScoreEntry {
  return {
    matchingId,
    seat,
    playerId: matchingId,
    name: `選手${matchingId}`,
    nameLength: 2,
    status: options.status ?? "playing",
    points,
    misses: 0,
    rank: null,
    stars: options.stars ?? 0,
    scoreChanged,
    previousResult: null,
    previousSituation: null,
  };
}
