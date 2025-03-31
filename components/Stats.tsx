import React from "react";
import { PlayerStats, GameState } from "../types";
import { X, Trophy, XCircle } from "lucide-react";

interface StatsProps {
  stats: PlayerStats;
  onClose: () => void;
  gameState?: GameState;
}

export function Stats({ stats, onClose, gameState }: StatsProps) {
  const averagePromptsUsed =
    stats.gamesPlayed > 0
      ? Math.round(stats.totalPromptsUsed / stats.gamesPlayed)
      : 0;
  const averageTimeUsed =
    stats.gamesPlayed > 0
      ? Math.floor(stats.totalTimeUsed / stats.gamesPlayed)
      : 0; // Time in seconds
  const averageScore =
    stats.gamesWon > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {gameState?.isGameOver ? "Game Over" : "Statistics"}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {gameState?.isGameOver && (
            <div className="mb-6 text-center">
              {gameState.solvedWords.length === gameState.targetWords.length ? (
                <div className="flex flex-col items-center gap-2">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                  <p className="text-xl font-bold text-gray-800">You Won!</p>
                  <div className="space-y-1">
                    <p className="text-md text-gray-600">
                      Score: {gameState.score}
                    </p>
                    <p className="text-sm text-gray-500">
                      Prompts used: {gameState.prompts.length}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <XCircle className="w-12 h-12 text-red-400" />
                  <p className="text-xl font-bold text-gray-800">Game Over</p>
                  <div className="space-y-1">
                    <p className="text-md text-gray-600">
                      Found {gameState.solvedWords.length} out of{" "}
                      {gameState.targetWords.length} words
                    </p>
                    <p className="text-sm text-gray-500">
                      Final Score: {gameState.score}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Streak Stats */}
          <div className="mb-4 p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="flex items-center justify-center gap-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.currentStreak}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Current Streak
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.maxStreak}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Max Streak
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="mb-4 p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
            <div className="flex items-center justify-center gap-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {stats.gamesPlayed}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Games Played
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {stats.gamesWon}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Games Won
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {Math.round((stats.gamesWon / stats.gamesPlayed) * 100) || 0}%
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Win Rate
                </div>
              </div>
            </div>
          </div>

          {/* Average Stats */}
          <div className="mb-4 p-3 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
            <div className="text-center mb-2 text-sm font-semibold text-gray-800">
              Average Stats
            </div>
            <div className="flex items-center justify-center gap-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {averageScore}
                </div>
                <div className="text-xs text-gray-600 font-medium">Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {averagePromptsUsed}
                </div>
                <div className="text-xs text-gray-600 font-medium">Prompts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {formatTime(Math.floor(averageTimeUsed / 1000))}
                </div>
                <div className="text-xs text-gray-600 font-medium">Time</div>
              </div>
            </div>
          </div>

          {!gameState?.isGameOver && (
            <button
              onClick={onClose}
              className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 font-medium text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
