import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import React, { useState, useEffect, useRef } from 'react';
import { Stats } from '../components/Stats';
import { HowToPlay } from '../components/HowToPlay';
import { AIResponse } from '../components/AIResponse';
import { GameState } from '../types';
import { 
  getGameData, 
  calculateScore, 
  getStats, 
  updateStats,
  MAX_PROMPTS_CONSTANT,
  isValidWord,
  isDerivative,
  checkAIResponse
} from '../utils';
import { HelpCircle, BarChart2, Send } from 'lucide-react';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const data = getGameData(new Date());
    return {
      ...data,
      solvedWords: [],
      prompts: [],
      startTime: Date.now(),
      isGameOver: false,
      isEasyMode: true,
      isPaused: false,
      score: 200,
      aiResponses: {},
      matchedWords: {},
      bonusPoints: {},
      tabooHit: {},
    };
  });

  const [prompt, setPrompt] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && !gameState.isGameOver && !showAIResponse && !showStats && !showHowTo) {
      inputRef.current.focus();
    }
  }, [gameState.isGameOver, showAIResponse, showStats, showHowTo]);

  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: showAIResponse || showStats || showHowTo
    }));
  }, [showAIResponse, showStats, showHowTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!prompt.trim() || gameState.prompts.length >= MAX_PROMPTS_CONSTANT) {
      return;
    }

    const word = prompt.trim().toLowerCase();

    // Validate word
    if (!isValidWord(word)) {
      setError('Please enter a valid English word');
      return;
    }

    // Check for derivatives
    if (isDerivative(word, gameState.targetWords)) {
      setError('Word cannot be a derivative of target words');
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkAIResponse(word, gameState.targetWords, gameState.tabooWord, gameState.solvedWords, gameState.isEasyMode);
      
      const newSolvedWords = [...new Set([...gameState.solvedWords, ...result.matchedWords])];
      const isGameWon = newSolvedWords.length === gameState.targetWords.length;
      const isGameLost = gameState.prompts.length + 1 >= MAX_PROMPTS_CONSTANT;
      
      setGameState(prev => {

        const newScore = calculateScore(
          [...prev.prompts, word],
          { ...prev.tabooHit, [word]: result.tabooHit },
          { ...prev.matchedWords, [word]: result.matchedWords },
          { ...prev.bonusPoints, [word]: result.bonusPoints }
        );

        if (isGameWon || isGameLost) {
          updateStats(isGameWon, newScore, prev.prompts.length + 1);
        }

        return {
          ...prev,
          prompts: [...prev.prompts, word],
          solvedWords: newSolvedWords,
          isGameOver: isGameWon || isGameLost,
          score: newScore,
          aiResponses: { ...prev.aiResponses, [word]: result.response },
          matchedWords: { ...prev.matchedWords, [word]: result.matchedWords },
          bonusPoints: { ...prev.bonusPoints, [word]: result.bonusPoints },
          tabooHit: { ...prev.tabooHit, [word]: result.tabooHit }
        };
      });

      setSelectedPrompt(word);
      setShowStats(isGameLost || isGameWon);
      setShowAIResponse(!(isGameLost || isGameWon));
      setPrompt('');
    } catch (err) {
      setError('Failed to check response. Please try again.' + err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    setShowAIResponse(true);
  };

  const promptsRemaining = MAX_PROMPTS_CONSTANT - gameState.prompts.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Promptl
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowHowTo(true)}
              className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-6 h-6 text-indigo-600" />
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
              aria-label="Statistics"
            >
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </button>
          </div>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-8 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                {promptsRemaining} prompts remaining | Max Score: {gameState.score}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="easyMode"
                  checked={gameState.isEasyMode}
                  onChange={(e) => setGameState(prev => ({ ...prev, isEasyMode: e.target.checked }))}
                  className="rounded border-white/20"
                />
                <label htmlFor="easyMode" className="text-sm">Easy Mode</label>
              </div>
            </div>
            {/* <Timer 
              startTime={gameState.startTime}
              isPaused={gameState.isPaused}
              onTimeUp={() => {
                if (!gameState.isGameOver) {
                  const timeUsed = Date.now() - gameState.startTime;
                  setGameState(prev => ({ ...prev, isGameOver: true }));
                  updateStats(false, gameState.score, gameState.prompts.length, timeUsed);
                  setShowStats(true);
                }
              }}
            /> */}
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Target Words:</h2>
            <div className="flex flex-wrap gap-3">
              {gameState.targetWords.map(word => (
                <span
                  key={word}
                  className={`px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 ${
                    gameState.solvedWords.includes(word)
                      ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Taboo Word:</h2>
            <span className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md">
              {gameState.tabooWord}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="space-y-3">
              <div className="text-gray-1200 font-large">
                Describe
              </div>
              <div className="flex gap-2 sm:gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="prompt word"
                  className="flex-1 px-4 py-3 border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 transition-all"
                  disabled={gameState.isGameOver || isLoading}
                />
                <button
                  type="submit"
                  className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-md"
                  disabled={!prompt.trim() || gameState.isGameOver || isLoading}
                >
                  <span>{isLoading ? 'Checking...' : ''}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            {gameState.prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePromptClick(p)}
                className={`px-4 py-2 rounded-xl transition-all hover:scale-105 ${
                  gameState.matchedWords[p]?.length > 0
                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                    : gameState.tabooHit[p] ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                    : 'bg-black-200 text-gray-800'
                }`}
              >
                {p}
                {gameState.bonusPoints[p] > 0 && (
                  <span className="ml-2 text-xs font-bold text-indigo-600">
                    +{gameState.bonusPoints[p]}
                  </span>
                )}
                {gameState.tabooHit[p] && (
                  <span className="ml-2 text-xs font-bold text-red-600">
                    -20
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(showStats) && (
        <Stats 
          stats={getStats()} 
          onClose={() => {
            setShowStats(false);
          }}
          gameState={gameState}
          finalScore={gameState.score}
        />
      )}
      
      {showHowTo && (
        <HowToPlay onClose={() => setShowHowTo(false)} />
      )}

      {!showStats && showAIResponse && selectedPrompt && (
        <AIResponse
          prompt={selectedPrompt}
          response={gameState.aiResponses[selectedPrompt]}
          matchedWords={gameState.matchedWords[selectedPrompt]}
          tabooWord={gameState.tabooWord}
          tabooHit={gameState.tabooHit[selectedPrompt]}
          bonusPoints={gameState.bonusPoints[selectedPrompt] || 0}
          isEasyMode={gameState.isEasyMode}
          onClose={() => {
            setShowAIResponse(false);
            setSelectedPrompt(null);
          }}
        />
      )}
    </div>
  );
}