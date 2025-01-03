import "./Round2.css";

function QuestionDisplay(): React.ReactElement {
  return <div className="question-display">QuestionDisplay</div>;
}

function EventName(): React.ReactElement {
  return <div className="event-name">#やまぶき杯</div>;
}

function RoundName(): React.ReactElement {
  return <div className="round-name">RoundName</div>;
}

function ScoreAreas(): React.ReactElement {
  return (
    <div className="score-areas">
      {Array.from({ length: 10 }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <ScoreboardPlayer key={index} />
      ))}
    </div>
  );
}

function ScoreboardPlayer(): React.ReactElement {
  return (
    <div className="scoreboard-player">
      <div className="player-name">山吹太郎</div>
      <div className="score">0</div>
      <div className="wrong">0</div>
    </div>
  );
}

export function Round2(): React.ReactElement {
  return (
    <div className="round2">
      <QuestionDisplay />
      <ScoreAreas />
      <EventName />
      <RoundName />
    </div>
  );
}
