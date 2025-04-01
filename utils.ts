import { GameData, PlayerStats, AIResponse, GameState } from "./types";
import { allTargetWords } from "./data/words";
// @ts-ignore
import wordList from "word-list-json";
// @ts-ignore
import stemmer from "stemmer";
import { format } from "date-fns";
import axios from "axios";

export const IS_SERVER = typeof window === "undefined";
export const localStore = IS_SERVER ? undefined : localStorage;

const STATS_KEY = "promptl_stats";
const WORDS_KEY = "promptl_words";
const GAME_STATE_KEY = "promptl_game_state";
const MAX_PROMPTS = 10;
const GAME_DURATION = 10 * 60 * 1000; // 20 minutes in milliseconds
const BASE_SCORE = 200;
const PENALTY_PER_WASTED_PROMPT = 10;
const PENALTY_PER_TABOO_HIT = 20;
const BONUS_PER_EXTRA_WORD = 10;
const TIME_LEFT_KEY = "promptl_time_left";

interface DailyWords {
  [date: string]: GameData;
}

export function getGameData(date: Date): GameData {
  const dateString = format(date, "yyyy-MM-dd");
  const savedWords: DailyWords = JSON.parse(
    localStore?.getItem(WORDS_KEY) || "{}"
  );

  if (savedWords[dateString]) {
    return savedWords[dateString];
  }

  // Fall back to random selection
  const seed = hashCode(dateString);

  const targetWords = [];
  const used = new Set<number>();

  for (let i = 0; i < 6; i++) {
    let index;
    do {
      index = hash(seed, i) % allTargetWords.length;
    } while (used.has(index));
    used.add(index);
    targetWords.push(allTargetWords[index]);
  }

  // Use one of the selected words as the taboo word
  const tabooIndex = Math.abs(seed % targetWords.length);
  const tabooWord = targetWords.splice(tabooIndex, 1)[0];

  return {
    targetWords,
    tabooWord,
  };
}

export function setGameData(date: Date, data: GameData): void {
  const dateString = format(date, "yyyy-MM-dd");
  const savedWords: DailyWords = JSON.parse(
    localStore?.getItem(WORDS_KEY) || "{}"
  );
  savedWords[dateString] = data;
  localStore?.setItem(WORDS_KEY, JSON.stringify(savedWords));
}

export function saveGameState(state: GameState): void {
  localStore?.setItem(
    GAME_STATE_KEY,
    JSON.stringify({
      ...state,
      lastUpdated: Date.now(),
    })
  );
}

export function loadGameState(): GameState | null {
  const savedState = localStore?.getItem(GAME_STATE_KEY);
  if (!savedState) return null;

  const state = JSON.parse(savedState);
  const today = format(new Date(), "yyyy-MM-dd");
  const savedDate = format(new Date(state.lastUpdated), "yyyy-MM-dd");

  if (savedDate !== today) return null;
  return state;
}

export function calculateScore(
  prompts: string[],
  tabooHit: { [key: string]: boolean },
  matchedWords: { [key: string]: string[] },
  bonusPoints: { [key: string]: number }
): number {
  let score = BASE_SCORE;

  // Count penalties (no matches or taboo hits)
  const tabooPrompts = prompts.filter((prompt) => tabooHit[prompt]);
  score -= tabooPrompts.length * PENALTY_PER_TABOO_HIT;
  const wastedPrompts = prompts.filter(
    (prompt) =>
      !tabooHit[prompt] &&
      (!matchedWords[prompt] || matchedWords[prompt].length === 0)
  );
  score -= wastedPrompts.length * PENALTY_PER_WASTED_PROMPT;

  // Add bonus points
  score += Object.values(bonusPoints).reduce((sum, points) => sum + points, 0);

  return Math.max(0, score);
}

export function getStats(): PlayerStats {
  const defaultStats: PlayerStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: "",
    totalTimeUsed: 0,
    totalPromptsUsed: 0,
  };

  const stats = localStore?.getItem(STATS_KEY);
  return stats ? JSON.parse(stats) : defaultStats;
}

export function updateStats(won: boolean, score: number, promptsUsed: number) {
  const stats = getStats();
  const today = format(new Date(), "yyyy-MM-dd");

  // Read timeLeft from localStorage and calculate timeUsed
  const timeLeft = parseInt(localStorage.getItem(TIME_LEFT_KEY) || "0", 10);
  const timeUsed = GAME_DURATION_CONSTANT - timeLeft;

  stats.gamesPlayed++;
  stats.totalPromptsUsed += promptsUsed;
  stats.totalTimeUsed += timeUsed; // Add time used to total time

  if (won) {
    stats.gamesWon++;
    stats.totalScore += score;

    if (stats.lastPlayedDate === yesterday(today)) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  stats.lastPlayedDate = today;
  localStore?.setItem(STATS_KEY, JSON.stringify(stats));
}

export function isValidWord(word: string): boolean {
  if (word.includes("echo")) {
    return true;
  }
  return wordList.includes(word.toLowerCase());
}

export function isDerivative(word: string, targetWords: string[]): boolean {
  const wordStem = stemmer(word.toLowerCase());
  return targetWords.some((target) => {
    const targetStem = stemmer(target.toLowerCase());
    return wordStem === targetStem;
  });
}

export function checkWordMatch(
  word: string,
  target: string,
  isEasyMode: boolean
): boolean {
  const cleanWord = word.toLowerCase().replace(/[.,:\*!?]/g, "");
  if (cleanWord.includes("ham")) {
    console.log(cleanWord);
  }
  const cleanTarget = target.toLowerCase();

  if (isEasyMode) {
    return stemmer(cleanWord) === stemmer(cleanTarget);
  }
  return cleanWord === cleanTarget;
}

export function findMatchedWords(
  text: string,
  targetWords: string[],
  solvedWords: string[],
  isEasyMode: boolean
): string[] {
  const words = text.split(/\s+/);
  return targetWords.filter(
    (target) =>
      !solvedWords.includes(target) &&
      words.some((word) => checkWordMatch(word, target, isEasyMode))
  );
}

export async function checkAIResponse(
  prompt: string,
  targetWords: string[],
  tabooWord: string,
  solvedWords: string[],
  isEasyMode: boolean
): Promise<AIResponse> {
  try {
    let aiResponse = "";
    if (prompt.startsWith("echo")) {
      aiResponse = prompt.replace("echo", "").trim();
    } else {
      aiResponse = await axios
        .get("/api/airesponse", {
          params: { prompt },
        })
        .then((res) => res.data.response as string);
    }

    // Check for taboo word using case-insensitive match
    if (
      aiResponse
        .toLowerCase()
        .split(/\s+/)
        .some(
          (word) =>
            word.replace(/[.,\*!?]/g, "").toLowerCase() ===
            tabooWord.toLowerCase()
        )
    ) {
      return {
        response: aiResponse,
        matchedWords: [],
        tabooHit: true,
        bonusPoints: 0,
      };
    }

    // Find matched words that haven't been solved yet
    const matchedWords = findMatchedWords(
      aiResponse,
      targetWords,
      solvedWords,
      isEasyMode
    );

    // Calculate bonus points
    const bonusPoints =
      matchedWords.length > 1
        ? (matchedWords.length - 1) * BONUS_PER_EXTRA_WORD
        : 0;

    return {
      response: aiResponse,
      matchedWords,
      tabooHit: false,
      bonusPoints,
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return {
      response: "Error: Failed to get AI response",
      matchedWords: [],
      tabooHit: false,
      bonusPoints: 0,
    };
  }
}

// Initialize word sets for multiple days
export function initializeWordSets() {
  const wordSets = {
    "2024-03-15": {
      targetWords: ["ocean", "mountain", "forest", "desert", "valley"],
      tabooWord: "landscape",
    },
    "2024-03-16": {
      targetWords: ["piano", "guitar", "violin", "drums", "flute"],
      tabooWord: "instrument",
    },
    "2024-03-17": {
      targetWords: ["pizza", "pasta", "bread", "cheese", "sauce"],
      tabooWord: "food",
    },
  };

  const savedWords = JSON.parse(localStorage.getItem(WORDS_KEY) || "{}");
  const updatedWords = { ...savedWords, ...wordSets };
  localStorage.setItem(WORDS_KEY, JSON.stringify(updatedWords));
}

function yesterday(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return format(date, "yyyy-MM-dd");
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function hash(seed: number, i: number): number {
  return Math.abs(((seed + i) * 2654435761) % 2 ** 32); // Knuth's multiplicative hash
}

export const MAX_PROMPTS_CONSTANT = MAX_PROMPTS;
export const GAME_DURATION_CONSTANT = GAME_DURATION;
