import React from "react";
type Props = {
  previousResult: "correct" | "wrong" | null;
};

export function PreviousResult({ previousResult }: Props): React.JSX.Element {
  const className = previousResult
    ? `player__previous-result player__previous-result--${previousResult}`
    : "player__previous-result";
  return <div className={className}></div>;
}
