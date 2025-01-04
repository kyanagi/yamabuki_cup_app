import type React from "react";
import "./ScoreBoardApp.css";
import { Round2 } from "./Round2";
import { createConsumer } from "@rails/actioncable";
import { useEffect } from "react";
const cable = createConsumer();

export function ScoreboardApp(): React.ReactElement {
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
        },
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="scoreboard-app">
      <Round2 />
    </div>
  );
}
