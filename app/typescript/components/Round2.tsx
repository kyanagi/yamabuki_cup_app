import "./Round2.css";

type PlayerProfile = {
  paperRank: number;
  familyName: string;
  givenName: string;
};

type Round2PlayerStatus = "playing" | "win" | "lose" | "wait";

type Round2Score = {
  points: number;
  wrong: number;
  status: Round2PlayerStatus;
  winOrder?: number | undefined;
};

type RoundPlayer<T> = PlayerProfile &
  T & {
    displayed: boolean;
  };

export type Round2Player = RoundPlayer<Round2Score>;

function QuestionDisplay(): React.ReactElement {
  return <div className="question-display">QuestionDisplay</div>;
}

function EventName(): React.ReactElement {
  return <div className="event-name">#やまぶき杯</div>;
}

function RoundName(): React.ReactElement {
  return <div className="round-name">RoundName</div>;
}

function PlayerList({ players }: { players: Round2Player[] }): React.ReactElement {
  return (
    <div className="scoreboard-player-list">
      {players.map((player) => (
        <ScoreboardPlayer key={player.paperRank} player={player} />
      ))}
    </div>
  );
}

function ScoreboardPlayer({ player }: { player: Round2Player }): React.ReactElement {
  return (
    <div className="scoreboard-player">
      <div className="player-name">
        {player.familyName}
        {player.givenName}
      </div>
      <div className="points">{player.points}</div>
      <div className="wrong">{player.wrong}</div>
    </div>
  );
}

export function Round2({ players }: { players: Round2Player[] }): React.ReactElement {
  return (
    <div className="round2">
      <QuestionDisplay />
      <PlayerList players={players} />
      <EventName />
      <RoundName />
    </div>
  );
}
