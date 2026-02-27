import React from "react";
type Props = {
  points: number;
  /** board ルールでは points >= 0 の場合のみ表示し、data-points 属性を付与する */
  boardMode?: boolean;
  /** board ルールで score-visibility-toggler の対象にする */
  scoreVisibilityTarget?: boolean;
  /** 表示するか否か（board の show/hide scores 用） */
  visible?: boolean;
};

const HIDDEN_CLASS = "hidden";

export function PlayerPoints({
  points,
  boardMode = false,
  scoreVisibilityTarget = false,
  visible = true,
}: Props): React.JSX.Element {
  const displayText = String(points).replace("-", "\u2212");

  if (boardMode) {
    if (points >= 0) {
      const targetProps = scoreVisibilityTarget
        ? {
            "data-score-visibility-toggler-target": "points",
            "data-points": String(points),
          }
        : {};
      const hiddenClass = scoreVisibilityTarget && !visible ? HIDDEN_CLASS : "";
      return (
        <div className={`player__points${hiddenClass ? ` ${hiddenClass}` : ""}`} {...targetProps}>
          {displayText}
        </div>
      );
    }
    return <div className="player__points"></div>;
  }

  return <div className="player__points">{displayText}</div>;
}
