import React from "react";
type Props = {
  name: string;
  nameLength: number;
  prefix: string;
};

export function PlayerName({ name, nameLength, prefix }: Props): React.JSX.Element {
  return (
    <div className="player__name">
      <div className={`${prefix}-name--length-${nameLength}`}>{name}</div>
    </div>
  );
}
