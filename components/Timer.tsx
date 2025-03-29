import React, { useEffect, useState, useRef } from 'react';
import { GAME_DURATION_CONSTANT } from '../utils';

interface TimerProps {
  elapsedTime: number;
  onTimeUpdate: (time: number) => void;
  onTimeUp: () => void;
  isPaused: boolean;
}

export function Timer({ elapsedTime, onTimeUpdate, onTimeUp, isPaused }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_CONSTANT - elapsedTime);
  const lastTickRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (isPaused) {
      lastTickRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      const newElapsedTime = elapsedTime + delta;
      onTimeUpdate(newElapsedTime);
      
      const remaining = Math.max(0, GAME_DURATION_CONSTANT - newElapsedTime);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        onTimeUp();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [elapsedTime, onTimeUp, isPaused, onTimeUpdate]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="text-2xl font-mono font-bold">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}