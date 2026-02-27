import React from "react";
type Props = {
  rank: number | null;
};

export function PlayerRank({ rank }: Props): React.JSX.Element {
  return <div className="player__rank">{rank}</div>;
}
