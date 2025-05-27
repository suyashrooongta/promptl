import React, { useState, useEffect, useRef } from "react";
import { Stats } from "../components/Stats";
import { HowToPlay } from "../components/HowToPlayV2";
import { AIResponse } from "../components/AIResponseV2";
import { GameState } from "../types";
import { Timer } from "../components/Timer";
import { differenceInSeconds, startOfTomorrow } from "date-fns";

import {
  getGameData,
  calculateScore,
  getStats,
  updateStats,
  MAX_PROMPTS_CONSTANT,
  isValidWord,
  isDerivative,
  fetchAIResponse,
  loadGameState,
  saveGameState,
  BASE_SCORE_CONSTANT,
  clearTimeLeft,
  PENALTY_PER_TABOO_HIT_CONSTANT,
  checkWordInAIResponses,
  getMostFrequentLemmas,
} from "../utils";
import { HelpCircle, BarChart2, Send, LoaderCircle } from "lucide-react";

enum GameStatus {
  GAME_NOT_STARTED = "GAME_NOT_STARTED",
  GAME_IN_PROGRESS = "GAME_IN_PROGRESS",
  GAME_OVER = "GAME_OVER",
}

const GAME_VARIANT = "v2";

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const data = getGameData(new Date(), GAME_VARIANT);
    return {
      ...data,
      solvedWords: [],
      prompts: [],
      isGameOver: false,
      isEasyMode: true,
      isPaused: false,
      score: BASE_SCORE_CONSTANT,
      aiResponses: {},
      matchedWords: {},
      matchedWordIndices: {},
      bonusPoints: {},
      tabooWordIndices: {},
    };
  });

  const [prompt, setPrompt] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true); // New state for start screen
  const [gameStatus, setGameStatus] = useState<GameStatus>(
    GameStatus.GAME_NOT_STARTED
  );
  const [timeUntilNextGame, setTimeUntilNextGame] = useState<number | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false); // Track client-side rendering

  useEffect(() => {
    setIsClient(true); // Set to true on client-side
  }, []);

  useEffect(() => {
    if (!isClient) {
      return; // Skip if not client-side
    }
    const savedState = loadGameState(GAME_VARIANT);
    let gameOver = false;
    if (savedState) {
      setGameState(savedState);
      if (savedState.isGameOver) {
        gameOver = true;
        setShowStats(true);
        setGameStatus(GameStatus.GAME_OVER);
      } else {
        setGameStatus(GameStatus.GAME_IN_PROGRESS);
      }
    } else {
      clearTimeLeft(GAME_VARIANT);
    }

    // Fetch AI responses for target and taboo terms
    const fetchAIResponses = async () => {
      const retryFetch = async (
        fetchFn: () => Promise<any>,
        retries = 3
      ): Promise<any> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await fetchFn();
          } catch (err) {
            if (attempt === retries) throw err;
          }
        }
      };

      try {
        const targetResponses = await Promise.all(
          gameState.targetWords.map((word) =>
            retryFetch(() => fetchAIResponse(word))
          )
        );
        const tabooResponse = await retryFetch(() =>
          fetchAIResponse(gameState.tabooWord)
        );
        const targetWordResponses = Object.fromEntries(
          gameState.targetWords.map((word, i) => [word, targetResponses[i]])
        );
        const frequentLemmas = getMostFrequentLemmas(
          tabooResponse || "",
          targetWordResponses
        );

        // After current day's responses, preload next day's responses (not saved)
        const nextDayData = getGameData(startOfTomorrow(), GAME_VARIANT);
        Promise.all([
          ...nextDayData.targetWords.map((word) => fetchAIResponse(word)),
          fetchAIResponse(nextDayData.tabooWord),
        ]).catch((err) => {
          // Ignore errors for preloading
          console.warn("Failed to preload next day's AI responses:", err);
        });

        setGameState((prev) => ({
          ...prev,
          targetWordResponses,
          tabooWordResponse: tabooResponse,
          frequentLemmas,
        }));
      } catch (err) {
        console.error(
          "Failed to fetch AI responses for target/taboo words after retries:",
          err
        );
        setError("Failed to fetch AI responses. Please refresh and try again.");
      }
    };

    if (!savedState?.targetWordResponses || !savedState?.tabooWordResponse) {
      console.log("Fetching AI responses for target and taboo words...");
      fetchAIResponses();
    }
    setShowStartScreen(true); // Always show the start screen
  }, [isClient]);

  useEffect(() => {
    const activeGameScreen = !(
      gameState.isGameOver ||
      showAIResponse ||
      showStats ||
      showHowTo
    );
    if (inputRef.current && activeGameScreen) {
      inputRef.current.focus();
    }
    setGameState((prev) => ({
      ...prev,
      isPaused:
        gameState.isGameOver || showAIResponse || showStats || showHowTo,
    }));
  }, [gameState.isGameOver, showAIResponse, showStats, showHowTo]);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isClient) return; // Only save on client-side
    saveGameState(gameState, GAME_VARIANT); // Update timeLeft when saving
  }, [gameState]);

  useEffect(() => {
    const updateTimeUntilNextGame = () => {
      const now = new Date();
      const nextGameTime = startOfTomorrow();
      const secondsUntilNextGame = differenceInSeconds(nextGameTime, now);
      setTimeUntilNextGame(secondsUntilNextGame);
    };

    updateTimeUntilNextGame();
    const interval = setInterval(updateTimeUntilNextGame, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prompt.trim() || gameState.prompts.length >= MAX_PROMPTS_CONSTANT) {
      return;
    }

    const word = prompt.trim().toLowerCase();

    // Check if the word has already been tried
    if (gameState.prompts.includes(word)) {
      setError("This prompt has already been tried");
      return;
    }

    // Validate word
    if (!isValidWord(word)) {
      setError("Please enter a valid English word");
      return;
    }

    // Check for derivatives
    if (isDerivative(word, gameState.targetWords)) {
      setError("Word cannot be a derivative of target terms");
      return;
    }

    setIsLoading(true);
    setGameState((prev) => ({
      ...prev,
      isPaused: true, // Pause the game when a prompt is submitted
    }));
    try {
      const result = checkWordInAIResponses(
        word,
        Object.fromEntries(
          Object.entries(gameState.targetWordResponses || {}).filter(
            ([key]) => !gameState.solvedWords.includes(key)
          )
        ),
        gameState.tabooWordResponse || ""
      );

      const newSolvedWords = [
        ...new Set([...gameState.solvedWords, ...result.matchedWords]),
      ];
      const isGameWon = newSolvedWords.length === gameState.targetWords.length;
      const isGameLost =
        !isGameWon && gameState.prompts.length + 1 >= MAX_PROMPTS_CONSTANT;

      setGameState((prev) => {
        const newScore = isGameLost
          ? 0
          : calculateScore(
              [...prev.prompts, word],
              { ...prev.tabooWordIndices, [word]: result.tabooWordIndices },
              { ...prev.matchedWords, [word]: result.matchedWords },
              { ...prev.bonusPoints, [word]: result.bonusPoints }
            );

        if (isGameWon || isGameLost) {
          updateStats(
            isGameWon,
            newScore,
            prev.prompts.length + 1,
            GAME_VARIANT
          );
        }

        return {
          ...prev,
          prompts: [...prev.prompts, word],
          solvedWords: newSolvedWords,
          isGameOver: isGameWon || isGameLost,
          score: newScore,
          matchedWords: { ...prev.matchedWords, [word]: result.matchedWords },
          bonusPoints: { ...prev.bonusPoints, [word]: result.bonusPoints },
          tabooWordIndices: {
            ...prev.tabooWordIndices,
            [word]: result.tabooWordIndices,
          },
          matchedIndices: {
            ...prev.matchedIndices,
            [word]: result.matchedIndices,
          },
        };
      });

      setSelectedPrompt(word);
      setShowStats(isGameLost || isGameWon);
      setShowAIResponse(!(isGameLost || isGameWon));
      setPrompt("");
    } catch (err) {
      setError("Failed to get response. Please try again." + err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    setShowAIResponse(true);
  };

  const handleTermClick = (term: string) => {
    setSelectedTerm(term);
    const prompt = Object.keys(gameState.matchedWords).find((key) =>
      gameState.matchedWords[key]?.includes(term)
    );
    setSelectedPrompt(prompt || null);
    setShowAIResponse(true);
  };

  const promptsRemaining = MAX_PROMPTS_CONSTANT - gameState.prompts.length;

  return (
    <>
      {showStartScreen ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
              Promptl
            </h1>
            {isClient && (
              <button
                onClick={() => setShowStartScreen(false)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-md mb-4"
              >
                {gameStatus === GameStatus.GAME_NOT_STARTED
                  ? "Start Game"
                  : gameStatus === GameStatus.GAME_IN_PROGRESS
                  ? "Resume Game"
                  : "View result"}
              </button>
            )}
            {gameStatus !== GameStatus.GAME_OVER && (
              <button
                onClick={() => setShowHowTo(true)}
                className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 text-indigo-700 rounded-xl hover:from-indigo-100 hover:to-purple-100 transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-5 h-5" />
                How to Play
              </button>
            )}
            {isClient &&
              gameStatus === GameStatus.GAME_OVER &&
              timeUntilNextGame !== null && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">
                    Next game available in:{" "}
                    <span className="text-indigo-600">
                      {formatTime(timeUntilNextGame)}
                    </span>
                  </p>
                </div>
              )}
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 py-8 px-4">
          <div className="max-w-2xl mx-auto mb-8">
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

            {gameState.isGameOver && (
              <div className="flex justify-center mb-6 h-10">
                <button
                  onClick={() => setShowStats(true)}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-700 text-white hover:bg-gray-800 transition-all"
                >
                  Show Result
                </button>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex justify-between items-center mb-8 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">
                    {promptsRemaining} prompts left | Score: {gameState.score}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hardMode"
                      checked={!gameState.isEasyMode}
                      disabled={gameState.isGameOver || isLoading}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          isEasyMode: !e.target.checked,
                        }))
                      }
                      className="rounded border-white/20"
                    />
                    <label htmlFor="hardMode" className="text-sm">
                      Hard Mode
                    </label>
                  </div>
                </div>
                {isClient && (
                  <Timer
                    isPaused={gameState.isPaused}
                    onTimeUp={() => {
                      if (!gameState.isGameOver) {
                        setGameState((prev) => ({
                          ...prev,
                          isGameOver: true,
                          score: 0,
                        }));
                        updateStats(
                          false,
                          0,
                          gameState.prompts.length,
                          GAME_VARIANT
                        );
                        setShowStats(true);
                      }
                    }}
                    variant={GAME_VARIANT}
                  />
                )}
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-800">
                  Target Terms
                </h2>
                <div className="flex flex-wrap gap-3">
                  {gameState.targetWords.map((word) => (
                    <button
                      key={word}
                      onClick={() =>
                        gameState.solvedWords.includes(word) &&
                        handleTermClick(word)
                      }
                      className={`px-4 py-2 rounded-xl font-medium transition-all transform ${
                        gameState.solvedWords.includes(word)
                          ? "hover:scale-105 bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md"
                          : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow cursor-default"
                      }`}
                      disabled={!gameState.solvedWords.includes(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-800">
                  Taboo Term
                </h2>
                <span className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md">
                  {gameState.tabooWord}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mb-8">
                <div className="space-y-3">
                  <div className="flex gap-2 sm:gap-2 mt-6">
                    <input
                      ref={inputRef}
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="guess word"
                      className="flex-1 px-4 py-3 border-2 border-indigo-100 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 transition-all"
                      disabled={gameState.isGameOver || isLoading}
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-md"
                      disabled={
                        !prompt.trim() ||
                        gameState.isGameOver ||
                        isLoading ||
                        !gameState.targetWordResponses ||
                        !gameState.tabooWordResponse
                      }
                    >
                      {isLoading ? (
                        <LoaderCircle className="animate-spin w-4 h-4" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                </div>
              </form>

              <div className="flex flex-wrap gap-3">
                {gameState.prompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(p)}
                    className={`px-4 py-2 rounded-xl transition-all hover:scale-105 ${
                      gameState.matchedWords[p]?.length > 0
                        ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                        : gameState.tabooWordIndices[p]?.length > 0
                        ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800"
                        : "bg-black-200 text-gray-800"
                    }`}
                  >
                    {p}
                    {gameState.bonusPoints[p] > 0 && (
                      <span className="ml-2 text-xs font-bold text-indigo-600">
                        +{gameState.bonusPoints[p]}
                      </span>
                    )}
                    {gameState.tabooWordIndices[p]?.length > 0 && (
                      <span className="ml-2 text-xs font-bold text-red-600">
                        -{PENALTY_PER_TABOO_HIT_CONSTANT}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <footer className="text-center py-4 bg-white/80 backdrop-blur-sm rounded-t-2xl shadow-lg">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Suyash Roongta. All rights
                reserved.
              </p>
            </footer>
          </div>
          {showStats && (
            <Stats
              stats={getStats(GAME_VARIANT)}
              onClose={() => {
                setShowStats(false);
              }}
              gameState={gameState}
              variant={GAME_VARIANT}
            />
          )}
          {!showStats && showAIResponse && selectedPrompt && (
            <AIResponse
              input={selectedPrompt}
              matchedWords={gameState.matchedWords[selectedPrompt]}
              tabooWord={gameState.tabooWord}
              tabooWordIndices={gameState.tabooWordIndices[selectedPrompt]}
              bonusPoints={gameState.bonusPoints[selectedPrompt] || 0}
              tabooWordResponse={gameState.tabooWordResponse || ""}
              targetWordResponses={gameState.targetWordResponses || {}}
              matchedIndices={gameState.matchedIndices?.[selectedPrompt] || {}}
              onClose={() => {
                setShowAIResponse(false);
                setSelectedPrompt(null);
                setSelectedTerm(null);
              }}
              selectedTerm={selectedTerm}
              // previousDayAIResponses={gameState.previousDayAIResponses}
            />
          )}
        </div>
      )}

      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </>
  );
}
