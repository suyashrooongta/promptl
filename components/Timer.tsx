import React, { useEffect, useState } from "react";
import { GAME_DURATION_CONSTANT, loadGameState } from "../utils";

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
    let intervalId: number;

    if (!isPaused) {
      intervalId = window.setInterval(() => {
        setTimeLeft((prev) => {
          const remaining = prev - 1000;

          if (remaining <= 0) {
            clearInterval(intervalId);
            onTimeUp();
          }

          const updatedTime = Math.max(0, remaining);
          localStorage.setItem(TIME_LEFT_KEY, updatedTime.toString());
          return updatedTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPaused, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="text-2xl font-mono font-bold">
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
