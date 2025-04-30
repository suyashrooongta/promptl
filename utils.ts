import { GameData, PlayerStats, AIResponse, GameState } from "./types";
import { allTargetWords } from "./data/words";
// @ts-ignore
import wordList from "word-list-json";
// @ts-ignore
import stemmer from "stemmer";
// @ts-ignore
import lemmatizer from "wink-lemmatizer";
// @ts-ignore
import { lemmatizer as baseLemmatizer } from "lemmatizer";

import { format } from "date-fns";
import axios from "axios";
import { wordSets } from "./data/wordSets";

export const IS_SERVER = typeof window === "undefined";
export const localStore = IS_SERVER ? undefined : localStorage;

const STATS_KEY = "promptl_stats";
const GAME_STATE_KEY = "promptl_game_state";
export const MAX_PROMPTS_CONSTANT = 10;
export const GAME_DURATION_CONSTANT = 10 * 60 * 1000; // 20 minutes in milliseconds
export const BASE_SCORE_CONSTANT = 100;
const PENALTY_PER_WASTED_PROMPT = 5;
export const PENALTY_PER_TABOO_HIT_CONSTANT = 10;
const BONUS_PER_EXTRA_WORD = 5;
export const TIME_LEFT_KEY_CONSTANT = "promptl_time_left";

interface DailyWords {
  [date: string]: GameData;
}

export function getGameData(date: Date): GameData {
  const dateString = format(date, "yyyy-MM-dd");
  const savedWords = wordSets;

  if (savedWords[dateString]) {
    return { ...savedWords[dateString], gameDate: dateString };
  }
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
    gameDate: dateString, // Include gameDate
  };
}

export function saveGameState(state: GameState, variant: String = "v1"): void {
  const gameStateKey = `${GAME_STATE_KEY}_${variant}`;
  localStore?.setItem(gameStateKey, JSON.stringify(state));
}

export function loadGameState(variant: String = "v1"): GameState | null {
  const gameStateKey = `${GAME_STATE_KEY}_${variant}`;
  const savedState = localStore?.getItem(gameStateKey);
  if (!savedState) return null;

  const state = JSON.parse(savedState);
  const today = format(new Date(), "yyyy-MM-dd");

  if (state.gameDate !== today) return null; // Validate using gameDate
  return state;
}

export function clearTimeLeft(variant: String = "v1"): void {
  const timeLeftKey = `${TIME_LEFT_KEY_CONSTANT}_${variant}`;
  localStore?.removeItem(timeLeftKey);
}

export function calculateScore(
  prompts: string[],
  tabooWordIndex: { [key: string]: number },
  matchedWords: { [key: string]: string[] },
  bonusPoints: { [key: string]: number }
): number {
  let score = BASE_SCORE_CONSTANT;

  // Count penalties (no matches or taboo hits)
  const tabooPrompts = prompts.filter(
    (prompt) => tabooWordIndex[prompt] !== -1
  );
  score -= tabooPrompts.length * PENALTY_PER_TABOO_HIT_CONSTANT;
  const wastedPrompts = prompts.filter(
    (prompt) =>
      tabooWordIndex[prompt] === -1 &&
      (!matchedWords[prompt] || matchedWords[prompt].length === 0)
  );
  score -= wastedPrompts.length * PENALTY_PER_WASTED_PROMPT;

  // Add bonus points
  score += Object.values(bonusPoints).reduce((sum, points) => sum + points, 0);

  return Math.max(0, score);
}

export function getStats(variant: string = "v1"): PlayerStats {
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

  const statsKey = `${STATS_KEY}_${variant}`;
  const stats = localStore?.getItem(statsKey);
  return stats ? JSON.parse(stats) : defaultStats;
}

export function updateStats(
  won: boolean,
  score: number,
  promptsUsed: number,
  variant: string = "v1" // Added variant as a parameter with default value
) {
  const statsKey = `${STATS_KEY}_${variant}`;
  const timeLeftKey = `${TIME_LEFT_KEY_CONSTANT}_${variant}`;
  const stats = localStore?.getItem(statsKey)
    ? JSON.parse(localStore.getItem(statsKey)!)
    : getStats();
  const today = format(new Date(), "yyyy-MM-dd");

  // Read timeLeft from localStorage and calculate timeUsed
  const timeLeft = parseInt(localStorage.getItem(timeLeftKey) || "0", 10);
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
  localStore?.setItem(statsKey, JSON.stringify(stats));
}

export function isValidWord(word: string): boolean {
  if (word.includes("echo")) {
    return true;
  }
  return wordList.includes(word.toLowerCase());
}

export function isDerivative(word: string, targetWords: string[]): boolean {
  const wordLemmas = getLemmas(word.toLowerCase());
  const targetWordLemmasMap = preprocessTargetWords(targetWords);

  return targetWords.some((target) => {
    const targetLemmas = targetWordLemmasMap.get(target) || new Set();
    return [...wordLemmas].some((lemma) => targetLemmas.has(lemma));
  });
}

export async function fetchAIResponse(prompt: string): Promise<string> {
  if (prompt.startsWith("echo")) {
    return prompt.replace("echo", "").trim();
  }
  return await axios
    .get("/api/airesponse", {
      params: { prompt },
    })
    .then((res) => res.data.response as string);
}

export async function checkAIResponse(
  prompt: string,
  targetWords: string[],
  tabooWord: string,
  solvedWords: string[],
  isEasyMode: boolean
): Promise<AIResponse> {
  try {
    const aiResponse = await fetchAIResponse(prompt);

    // Call processAIResponse directly
    const result = processAIResponse(
      aiResponse,
      targetWords.filter((word) => !solvedWords.includes(word)),
      tabooWord,
      isEasyMode
    );

    // Calculate bonus points
    const bonusPoints =
      result.matchedWords.length > 1
        ? (result.matchedWords.length - 1) * BONUS_PER_EXTRA_WORD
        : 0;

    return {
      response: aiResponse,
      matchedWords: result.matchedWords,
      tabooWordIndex: result.tabooWordIndex,
      bonusPoints,
      matchedWordIndices: result.matchedWordIndices,
    };
  } catch (error) {
    console.error("Error calling OpenAI or processing AI response:", error);
    throw new Error("Failed to fetch AI response");
  }
}

export function processAIResponse(
  aiResponse: string,
  targetWords: string[],
  tabooWord: string,
  easyMode: boolean
): {
  matchedWords: string[];
  matchedWordIndices: number[];
  tabooWordIndex: number;
} {
  // Split response into words using a regex to match non-alphanumeric characters
  const words = aiResponse.split(/\W+/).filter(Boolean); // Filter out empty strings
  const matchedWords: string[] = [];
  const matchedWordIndices: number[] = [];
  const targetWordLemmasMap = preprocessTargetWords(targetWords);

  for (let index = 0; index < words.length; index++) {
    const cleanWord = words[index].toLowerCase();
    const wordLemmas = getLemmas(cleanWord);

    if (
      processWord(
        cleanWord,
        tabooWord,
        wordLemmas,
        targetWords,
        targetWordLemmasMap,
        easyMode,
        matchedWords,
        matchedWordIndices,
        index
      )
    ) {
      return {
        matchedWords: [],
        matchedWordIndices: [],
        tabooWordIndex: index,
      };
    }
  }

  return {
    matchedWords,
    matchedWordIndices,
    tabooWordIndex: -1,
  };
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

export function getLemmas(word: string): Set<string> {
  const lemmas = new Set<string>(
    [
      lemmatizer.noun(word),
      lemmatizer.verb(word),
      lemmatizer.adjective(word),
    ].filter(Boolean)
  ); // Remove undefined values

  lemmas.add(stemmer(word)); // Add stemmed form
  lemmas.add(word); // Add original word
  lemmas.add(baseLemmatizer(word)); // Add base lemmatizer form

  // Handle common adverb patterns (e.g., stripping '-ly')
  if (word.endsWith("ly")) {
    const baseForm = word.slice(0, -2); // Remove 'ly' suffix
    if (wordList.includes(baseForm)) {
      lemmas.add(baseForm);
    }

    // Handle cases where base form ends in 'i'
    if (baseForm.endsWith("i")) {
      const replacedWithY = baseForm.slice(0, -1) + "y";
      const replacedWithE = baseForm.slice(0, -1) + "e";

      if (wordList.includes(replacedWithY)) {
        lemmas.add(replacedWithY);
      }
      if (wordList.includes(replacedWithE)) {
        lemmas.add(replacedWithE);
      }
    }
  }

  return lemmas;
}

export function preprocessTargetWords(
  targetWords: string[]
): Map<string, Set<string>> {
  // Updated to use Set<string>
  const targetWordLemmasMap = new Map<string, Set<string>>();
  targetWords.forEach((target) => {
    const cleanTarget = target.toLowerCase();
    targetWordLemmasMap.set(target, getLemmas(cleanTarget));
  });
  return targetWordLemmasMap;
}

export function processWord(
  cleanWord: string,
  tabooWord: string,
  wordLemmas: Set<string>, // Updated to use Set<string>
  targetWords: string[],
  targetWordLemmasMap: Map<string, Set<string>>, // Updated to use Set<string>
  easyMode: boolean,
  matchedWords: string[],
  matchedWordIndices: number[],
  index: number
): boolean {
  if (
    cleanWord === tabooWord.toLowerCase() ||
    stemmer(cleanWord) === stemmer(tabooWord.toLowerCase())
  ) {
    return true; // Taboo word found
  }

  targetWords.forEach((target) => {
    const cleanTarget = target.toLowerCase();
    if (!easyMode) {
      if (cleanWord === cleanTarget) {
        addMatch(matchedWords, target, matchedWordIndices, index);
      }
      return;
    }
    // if (cleanWord.slice(0, 5) === cleanTarget.slice(0, 5)) {
    //   addMatch(matchedWords, target, matchedWordIndices, index);
    //   return;
    // }
    const targetLemmas = targetWordLemmasMap.get(target) || new Set();
    if ([...wordLemmas].some((lemma) => targetLemmas.has(lemma))) {
      // Updated to check Set intersection
      addMatch(matchedWords, target, matchedWordIndices, index);
    }
  });

  return false;
}

export function addMatch(
  matchedWords: string[],
  target: string,
  matchedWordIndices: number[],
  index: number
) {
  if (!matchedWords.includes(target)) {
    matchedWords.push(target);
  }
  matchedWordIndices.push(index);
}
