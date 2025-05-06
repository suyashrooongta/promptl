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
import nlp from "compromise";

// @ts-ignore
import pennTags from "compromise-penn-tags";

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

export function getGameData(date: Date, variant: String): GameData {
  const dateString = format(date, "yyyy-MM-dd");
  const savedWords = wordSets;

  if (savedWords[dateString]) {
    return { ...savedWords[dateString], gameDate: dateString };
  }
  // Fall back to random selection
  const seed = hashCode(dateString + variant);

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

export function saveGameState(state: GameState, variant: String): void {
  const gameStateKey = `${GAME_STATE_KEY}_${variant}`;
  localStore?.setItem(gameStateKey, JSON.stringify(state));
}

export function loadGameState(variant: String): GameState | null {
  const gameStateKey = `${GAME_STATE_KEY}_${variant}`;
  const savedState = localStore?.getItem(gameStateKey);
  if (!savedState) return null;

  const state = JSON.parse(savedState);
  const today = format(new Date(), "yyyy-MM-dd");

  if (state.gameDate !== today) return null; // Validate using gameDate
  return state;
}

export function clearTimeLeft(variant: String): void {
  const timeLeftKey = `${TIME_LEFT_KEY_CONSTANT}_${variant}`;
  localStore?.removeItem(timeLeftKey);
}

export function calculateScore(
  prompts: string[],
  tabooWordIndices: { [key: string]: number[] },
  matchedWords: { [key: string]: string[] },
  bonusPoints: { [key: string]: number }
): number {
  let score = BASE_SCORE_CONSTANT;

  // Count penalties (no matches or taboo hits)
  const tabooPrompts = prompts.filter(
    (prompt) => tabooWordIndices[prompt]?.length > 0
  );
  score -= tabooPrompts.length * PENALTY_PER_TABOO_HIT_CONSTANT;
  const wastedPrompts = prompts.filter(
    (prompt) =>
      !(tabooWordIndices[prompt]?.length > 0) &&
      (!matchedWords[prompt] || matchedWords[prompt].length === 0)
  );
  score -= wastedPrompts.length * PENALTY_PER_WASTED_PROMPT;

  // Add bonus points
  score += Object.values(bonusPoints).reduce((sum, points) => sum + points, 0);

  return Math.max(0, score);
}

export function getStats(variant: string): PlayerStats {
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
  variant: string // Added variant as a parameter with default value
) {
  const statsKey = `${STATS_KEY}_${variant}`;
  const timeLeftKey = `${TIME_LEFT_KEY_CONSTANT}_${variant}`;
  const stats = localStore?.getItem(statsKey)
    ? JSON.parse(localStore.getItem(statsKey)!)
    : getStats(variant);
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
      tabooWordIndices: result.tabooWordIndices, // Updated to use tabooWordIndices
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
  tabooWordIndices: number[]; // Updated to return all indices
} {
  // Split response into words using a regex to match non-alphanumeric characters
  const words = aiResponse.split(/\W+/).filter(Boolean); // Filter out empty strings
  const matchedWords: string[] = [];
  const matchedWordIndices: number[] = [];
  const targetWordLemmasMap = preprocessTargetWords(targetWords);
  const tabooWordIndices: number[] = []; // Collect all taboo word indices

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
      tabooWordIndices.push(index); // Add index to tabooWordIndices
    }
  }

  return {
    matchedWords,
    matchedWordIndices,
    tabooWordIndices, // Return all taboo word indices
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

const lemmasCache = new Map<string, Set<string>>(); // Cache to store results

export function getLemmas(word: string): Set<string> {
  // Check if the result is already in the cache
  if (lemmasCache.has(word)) {
    return lemmasCache.get(word)!; // Return cached result
  }

  // Calculate lemmas if not cached
  const lemmas = new Set<string>(
    [
      lemmatizer.noun(word),
      lemmatizer.verb(word),
      lemmatizer.adjective(word),
    ].filter(Boolean) // Remove undefined values
  );

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

  // Store the result in the cache
  lemmasCache.set(word, lemmas);

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

export function checkWordInAIResponses(
  inputWord: string,
  targetWordResponses: { [key: string]: string },
  tabooAIResponse: string
): {
  matchedWords: string[];
  tabooHit: boolean;
  matchedIndices: { [key: string]: number[] };
  tabooWordIndices: number[];
  bonusPoints: number;
} {
  if (inputWord.startsWith("echo")) {
    inputWord = inputWord.replace("echo", "").trim();
  }
  const matchedWords: string[] = [];
  const matchedIndices: { [key: string]: number[] } = {};
  const inputWordLemmas = getLemmas(inputWord.toLowerCase());
  const tabooWordIndices: number[] = [];

  // Check for taboo matches
  const tabooWords = tabooAIResponse.split(/\W+/).filter(Boolean); // Split taboo response into words
  tabooWords.forEach((word, index) => {
    if (
      [...getLemmas(word.toLowerCase())].some((lemma) =>
        inputWordLemmas.has(lemma)
      )
    ) {
      tabooWordIndices.push(index);
    }
  });

  if (tabooWordIndices.length > 0) {
    return {
      matchedWords: [],
      tabooHit: true,
      matchedIndices: {},
      tabooWordIndices,
      bonusPoints: 0,
    };
  }

  // Check for matches in target word responses
  Object.entries(targetWordResponses).forEach(([targetWord, response]) => {
    const responseWords = response.split(/\W+/).filter(Boolean); // Split response into words
    responseWords.forEach((word, index) => {
      if (
        [...getLemmas(word.toLowerCase())].some((lemma) =>
          inputWordLemmas.has(lemma)
        )
      ) {
        if (!matchedWords.includes(targetWord)) {
          matchedWords.push(targetWord);
          matchedIndices[targetWord] = []; // Initialize array for this target word
        }
        matchedIndices[targetWord].push(index);
      }
    });
  });

  return {
    matchedWords,
    tabooHit: false,
    matchedIndices,
    tabooWordIndices,
    bonusPoints:
      matchedWords.length > 1
        ? (matchedWords.length - 1) * BONUS_PER_EXTRA_WORD
        : 0,
  };
}

export function getPennPosTag(text: string): string {
  nlp.extend(pennTags);

  const doc = nlp(text);
  doc.compute("penn");

  // Accessing the Penn POS tag of the first term
  const firstTerm = doc.json()[0]?.terms?.[0];
  return firstTerm ? firstTerm.penn : "";
}

export function getMostFrequentLemmas(
  tabooResponse: string,
  targetResponses: { [key: string]: string }
): { [key: string]: string[] } {
  const tabooLemmas = new Set<string>();
  const lemmaFrequency: Map<string, Set<string>> = new Map(); // Map lemma to target words

  // Process taboo response
  tabooResponse
    .split(/\W+/)
    .filter(Boolean)
    .forEach((word) => {
      getLemmas(word.toLowerCase()).forEach((lemma) => tabooLemmas.add(lemma));
    });

  // Process target responses
  Object.entries(targetResponses).forEach(([targetWord, response]) => {
    const responseLemmas = new Set<string>();
    response
      .split(/\W+/)
      .filter(Boolean)
      .forEach((word) => {
        getLemmas(word.toLowerCase()).forEach((lemma) => {
          if (!tabooLemmas.has(lemma) && wordList.includes(lemma)) {
            // Filter lemmas not in word list
            responseLemmas.add(lemma);
          }
        });
      });

    // Update lemma frequency with the target word
    responseLemmas.forEach((lemma) => {
      if (!lemmaFrequency.has(lemma)) {
        lemmaFrequency.set(lemma, new Set());
      }
      lemmaFrequency.get(lemma)!.add(targetWord);
    });
  });

  // Transform the result into the desired format
  return [...lemmaFrequency.entries()]
    .filter(([lemma, targetWords]) => {
      const posTag = getPennPosTag(lemma);
      return (
        targetWords.size >= 2 &&
        lemma.length > 3 &&
        (posTag.startsWith("NN") ||
          posTag.startsWith("JJ") ||
          posTag.startsWith("VB")) &&
        [...targetWords].some((targetWord) => {
          const targetResponseWords =
            targetResponses[targetWord]
              ?.split(/\W+/)
              .map((word) => word.toLowerCase()) || [];
          return targetResponseWords.includes(lemma);
        })
      );
    })
    .sort((a, b) => {
      // Sort by the number of target words (descending), then by lemma length (ascending)
      const targetWordCountDiff = b[1].size - a[1].size;
      if (targetWordCountDiff !== 0) {
        return targetWordCountDiff;
      }
      return a[0].length - b[0].length;
    })
    .slice(0, 10) // Limit to top 5 frequent lemmas
    .reduce((result, [lemma, targetWords]) => {
      result[lemma] = [...targetWords];
      return result;
    }, {} as { [key: string]: string[] });
}
