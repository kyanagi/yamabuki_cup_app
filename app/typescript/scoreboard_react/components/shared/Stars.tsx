import React from "react";
type Props = {
  stars: number;
};

export function Stars({ stars }: Props): React.JSX.Element {
  return <div className="final-player__stars">{"★".repeat(stars)}</div>;
}
