import React from 'react';
import { PlayerStats, GameState } from '../types';
import { X, Trophy, XCircle } from 'lucide-react';

interface StatsProps {
  stats: PlayerStats;
  onClose: () => void;
  gameState?: GameState;
  finalScore?: number;
}

export function Stats({ stats, onClose, gameState, finalScore }: StatsProps) {
  const averageScore = stats.gamesWon > 0 
    ? Math.round(stats.totalScore / stats.gamesWon) 
    : 0;

  // const formatTime = (ms: number) => {
  //   const minutes = Math.floor(ms / 60000);
  //   const seconds = Math.floor((ms % 60000) / 1000);
  //   return `${minutes}m ${seconds}s`;
  // };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {gameState?.isGameOver ? 'Game Over' : 'Statistics'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {gameState?.isGameOver && (
            <div className="mb-8 text-center">
              {gameState.solvedWords.length === gameState.targetWords.length ? (
                <div className="flex flex-col items-center gap-3">
                  <Trophy className="w-16 h-16 text-yellow-400" />
                  <p className="text-2xl font-bold text-gray-800">You Won!</p>
                  <div className="space-y-2">
                    <p className="text-lg text-gray-600">Score: {finalScore}</p>
                    <p className="text-sm text-gray-500">
                      Prompts used: {gameState.prompts.length}
                    </p>
                    {/* <p className="text-sm text-gray-500">
                      Time: {formatTime(Date.now() - gameState.startTime)}
                    </p> */}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <XCircle className="w-16 h-16 text-red-400" />
                  <p className="text-2xl font-bold text-gray-800">Game Over</p>
                  <div className="space-y-2">
                    <p className="text-lg text-gray-600">
                      Found {gameState.solvedWords.length} out of {gameState.targetWords.length} words
                    </p>
                    <p className="text-sm text-gray-500">
                      Final Score: {finalScore}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">{stats.gamesPlayed}</div>
              <div className="text-sm text-gray-600 font-medium">Games Played</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">{stats.gamesWon}</div>
              <div className="text-sm text-gray-600 font-medium">Games Won</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">
                {Math.round((stats.gamesWon / stats.gamesPlayed) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600 font-medium">Win Rate</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">{stats.currentStreak}</div>
              <div className="text-sm text-gray-600 font-medium">Current Streak</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">{stats.maxStreak}</div>
              <div className="text-sm text-gray-600 font-medium">Max Streak</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">{averageScore}</div>
              <div className="text-sm text-gray-600 font-medium">Average Score</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">
                {Math.round(stats.averagePromptsUsed)}
              </div>
              <div className="text-sm text-gray-600 font-medium">Avg Prompts</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-indigo-600 mb-1">
                {Math.round(stats.averageTimeUsed / 60000)}m
              </div>
              <div className="text-sm text-gray-600 font-medium">Avg Time</div>
            </div>
          </div>
          
          {!gameState?.isGameOver && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}