import type { Round2Player } from "./Round2";
import { Round2 } from "./Round2";
import "./ScoreBoardApp.css";
import { createConsumer } from "@rails/actioncable";
import { useEffect, useState } from "react";
const cable = createConsumer();

export function ScoreboardApp(): React.ReactElement {
  const [players, setPlayers] = useState<Round2Player[]>([]);

  useEffect(() => {
    const subscription = cable.subscriptions.create(
      { channel: "ScoreboardChannel" },
      {
        connected: () => {
          console.log("connected");
        },
        received: (data) => {
          console.log("received");
          console.dir(data);
          if (data.players) {
            setPlayers(data.players);
          }
        },
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="scoreboard-app">
      <Round2 players={players} />
    </div>
  );
}
