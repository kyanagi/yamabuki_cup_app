import React from "react";
import type { MatchState, QuestionState, Scene, TimerCommand } from "../types";
import type { SeatId } from "../../lib/buzzer/seat_id";
import { MatchScorelist } from "./MatchScorelist";
import { Question } from "./Question";
import { AnnouncementScene } from "./AnnouncementScene";
import { ChampionScene } from "./ChampionScene";
import { TimerScene } from "./TimerScene";
import { FirstPlaceScene } from "./FirstPlaceScene";
import { PaperSeedScene } from "./PaperSeedScene";
import { Round2AnnouncementScene } from "./Round2AnnouncementScene";

type Props = {
  matchState: MatchState | null;
  pressedSeat: SeatId | null;
  visibleScores: Set<number> | null;
  questionState: QuestionState | null;
  scene: Scene | null;
  timerCommand: TimerCommand | null;
};

const TODAY = new Date().toLocaleDateString("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getFooterLabel(scene: Scene | null, matchState: MatchState | null): string {
  if (!scene) return "";
  switch (scene.type) {
    case "match":
      return matchState?.footerLabel ?? "";
    case "timer":
      return scene.footerLabel;
    case "paper_seed":
      return scene.footerLabel;
    case "round2_announcement":
      return scene.footerLabel;
    case "first_place_init":
    case "first_place_plate":
    case "first_place_player":
      return "1位発表";
    case "announcement":
    case "champion":
      return "";
  }
}

export function ScoreboardRoot({
  matchState,
  pressedSeat,
  visibleScores,
  questionState,
  scene,
  timerCommand,
}: Props): React.JSX.Element {
  const footerLabel = getFooterLabel(scene, matchState);

  return (
    <div id="scoreboard-root">
      <div id="scoreboard-main">
        {scene?.type === "match" && matchState && (
          <div className="columns-2">
            <MatchScorelist matchState={matchState} pressedSeat={pressedSeat} visibleScores={visibleScores} />
            <div id="question">
              <Question questionState={questionState} />
            </div>
          </div>
        )}
        {(scene?.type === "first_place_init" ||
          scene?.type === "first_place_plate" ||
          scene?.type === "first_place_player") && <FirstPlaceScene scene={scene} />}
        {scene?.type === "timer" && <TimerScene timerCommand={timerCommand} />}
        {scene?.type === "paper_seed" && <PaperSeedScene scene={scene} />}
        {scene?.type === "round2_announcement" && <Round2AnnouncementScene scene={scene} />}
        {scene?.type === "announcement" && <AnnouncementScene scene={scene} />}
        {scene?.type === "champion" && <ChampionScene scene={scene} />}
      </div>
      <div id="scoreboard-footer">
        <div id="scoreboard-footer-left" className="scoreboard-footer-left">
          {footerLabel}
        </div>
        <div id="scoreboard-footer-right" className="scoreboard-footer-right">
          {TODAY} 第2回 #やまぶき杯
        </div>
      </div>
    </div>
  );
}
