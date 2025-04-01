import React, { useEffect, useState } from "react";
import { GAME_DURATION_CONSTANT, loadGameState } from "../utils";
import { on } from "events";

const TIME_LEFT_KEY = "promptl_time_left";

interface TimerProps {
  isPaused: boolean;
  onTimeUp: () => void;
}

export function Timer({ isPaused, onTimeUp }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedState = loadGameState();
    if (savedState) {
      const savedTimeLeft = localStorage.getItem(TIME_LEFT_KEY);
      return savedTimeLeft
        ? parseInt(savedTimeLeft, 10)
        : GAME_DURATION_CONSTANT;
    }
    return GAME_DURATION_CONSTANT;
  });

  useEffect(() => {
    if (!isPaused && timeLeft > 0) {
      const intervalId = setInterval(() => {
        setTimeLeft((prevSeconds) => prevSeconds - 1000); // Decrement by 1000 ms
        localStorage.setItem(TIME_LEFT_KEY, String(timeLeft - 1000));
        if (timeLeft <= 1000) {
          clearInterval(intervalId);
          onTimeUp(); // Call the onTimeUp function when time is up
        }
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup on unmount
    }
  }, [isPaused, timeLeft]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="text-2xl font-mono font-bold">
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
