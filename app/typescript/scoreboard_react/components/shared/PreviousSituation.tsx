import React from "react";
type Props = {
  previousSituation: "pushed" | "unpushed" | null;
};

export function PreviousSituation({ previousSituation }: Props): React.JSX.Element {
  const className = previousSituation
    ? `hayabo-player__previous-situation hayabo-player__previous-situation--${previousSituation}`
    : "hayabo-player__previous-situation";
  return <div className={className}></div>;
}
