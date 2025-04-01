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
  const savedWords = manualWordSets();

  console.log("Saved words:", savedWords);

  if (savedWords[dateString]) {
    return savedWords[dateString];
  }
  console.log("No saved words for this date, generating new ones.");
  // Fall back to random selection
  const seed = hashCode(dateString);

  const targetWords = [];
  const used = new Set<number>();

  for (let i = 0; i < 6; i++) {
    let index;
    do {
      index = hash(seed, i) % allTargetWords.length;
      // Ensure the index is unique
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

function manualWordSets(): { [date: string]: GameData } {
  const wordSets = {
    "2025-04-01": {
      targetWords: ["nation", "document", "cricket", "law", "choice"],
      tabooWord: "round",
    },
    "2025-04-02": {
      targetWords: ["library", "code", "mouse", "direction", "king"],
      tabooWord: "baby",
    },
    "2025-04-03": {
      targetWords: ["door", "planet", "finger", "moon", "desert"],
      tabooWord: "church",
    },
    "2025-04-04": {
      targetWords: ["wall", "music", "phone", "fear", "child"],
      tabooWord: "disease",
    },
    "2025-04-05": {
      targetWords: ["plant", "value", "morning", "diamond", "partner"],
      tabooWord: "fire",
    },
    "2025-04-06": {
      targetWords: ["baby", "piano", "feeling", "town", "metal"],
      tabooWord: "head",
    },
    "2025-04-07": {
      targetWords: ["church", "venus", "hair", "artist", "past"],
      tabooWord: "fall",
    },
    "2025-04-08": {
      targetWords: ["brother", "luck", "second", "holiday", "part"],
      tabooWord: "root",
    },
    "2025-04-09": {
      targetWords: ["novel", "bomb", "light", "river", "science"],
      tabooWord: "space",
    },
    "2025-04-10": {
      targetWords: ["relative", "country", "ship", "hour", "blue"],
      tabooWord: "princess",
    },
    "2025-04-11": {
      targetWords: ["palm", "breakfast", "question", "future", "winter"],
      tabooWord: "smell",
    },
    "2025-04-12": {
      targetWords: ["cap", "ghost", "writer", "novel", "bitter"],
      tabooWord: "red",
    },
    "2025-04-13": {
      targetWords: ["gold", "air", "book", "teacher", "luck"],
      tabooWord: "oval",
    },
    "2025-04-14": {
      targetWords: ["number", "sweet", "lion", "weather", "scientist"],
      tabooWord: "education",
    },
    "2025-04-15": {
      targetWords: ["team", "lunch", "server", "home", "student"],
      tabooWord: "winter",
    },
    "2025-04-16": {
      targetWords: ["writer", "shoe", "house", "profit", "cold"],
      tabooWord: "sun",
    },
    "2025-04-17": {
      targetWords: ["industry", "teacher", "rain", "computer", "holiday"],
      tabooWord: "second",
    },
    "2025-04-18": {
      targetWords: [
        "communication",
        "history",
        "battery",
        "business",
        "rectangle",
      ],
      tabooWord: "day",
    },
    "2025-04-19": {
      targetWords: ["hospital", "bitter", "result", "saturn", "africa"],
      tabooWord: "cat",
    },
    "2025-04-20": {
      targetWords: ["diamond", "asia", "jupiter", "cat", "goal"],
      tabooWord: "toe",
    },
    "2025-04-21": {
      targetWords: ["china", "metal", "day", "instrument", "business"],
      tabooWord: "apple",
    },
    "2025-04-22": {
      targetWords: ["hair", "artist", "past", "fall", "time"],
      tabooWord: "venus",
    },
    "2025-04-23": {
      targetWords: ["knight", "child", "train", "grass", "antarctica"],
      tabooWord: "parent",
    },
    "2025-04-24": {
      targetWords: ["fire", "value", "diamond", "sour", "fabric"],
      tabooWord: "morning",
    },
    "2025-04-25": {
      targetWords: ["baby", "feeling", "town", "government", "day"],
      tabooWord: "piano",
    },
    "2025-04-26": {
      targetWords: ["stomach", "finger", "church", "moon", "artist"],
      tabooWord: "desert",
    },
    "2025-04-27": {
      targetWords: ["music", "disease", "spring", "child", "mercury"],
      tabooWord: "fear",
    },
    "2025-04-28": {
      targetWords: ["basketball", "law", "choice", "value", "guitar"],
      tabooWord: "document",
    },
    "2025-04-29": {
      targetWords: ["code", "mouse", "direction", "baby", "king"],
      tabooWord: "change",
    },
    "2025-04-30": {
      targetWords: ["morning", "partner", "tennis", "relative", "world"],
      tabooWord: "park",
    },
  };

  return wordSets;
}

function yesterday(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return format(date, "yyyy-MM-dd");
}

function hashCode(str: string): number {
  let hash = 2166136261; // FNV-1a hash starting value
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash ^= char;
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return Math.abs(hash);
}

function hash(seed: number, i: number): number {
  return Math.abs(((seed + i) * 2654435761) % 2 ** 32); // Knuth's multiplicative hash
}

export const MAX_PROMPTS_CONSTANT = MAX_PROMPTS;
export const GAME_DURATION_CONSTANT = GAME_DURATION;
