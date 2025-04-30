export interface GameState {
  targetWords: string[];
  tabooWord: string;
  solvedWords: string[];
  prompts: string[];
  isGameOver: boolean;
  isEasyMode: boolean;
  isPaused: boolean;
  score: number;
  aiResponses: { [key: string]: string };
  matchedWords: { [key: string]: string[] };
  matchedWordIndices: { [key: string]: number[] };
  bonusPoints: { [key: string]: number };
  tabooWordIndices: { [key: string]: number[] };
  targetWordResponses?: { [key: string]: string }; // Optional property for target word responses as strings
  tabooWordResponse?: string; // Optional property for taboo word response as a string
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  totalTimeUsed: number;
  totalPromptsUsed: number;
}

export interface GameData {
  targetWords: string[];
  tabooWord: string;
  gameDate: string;
}

export interface AIResponse {
  response: string;
  matchedWords: string[];
  tabooWordIndices: number[]; // Changed from tabooWordIndex to tabooWordIndices
  bonusPoints: number;
  matchedWordIndices: number[];
}
