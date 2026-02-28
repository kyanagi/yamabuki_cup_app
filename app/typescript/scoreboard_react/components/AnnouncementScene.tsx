import React from "react";
import type { Scene } from "../types";
import { useClock } from "../hooks/useClock";

type Props = {
  scene: Extract<Scene, { type: "announcement" }>;
};

export function AnnouncementScene({ scene }: Props): React.JSX.Element {
  const { hours, minutes, colonVisible } = useClock();

  return (
    <div className="announcement-container">
      <div className="announcement-clock">
        {hours}
        <span className={colonVisible ? undefined : "announcement-clock__colon--hidden"}>:</span>
        {minutes}
      </div>
      <div className="announcement-text">
        {scene.text.split("\n").map((line, i, arr) => (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
