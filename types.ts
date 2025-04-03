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
  bonusPoints: { [key: string]: number };
  tabooHit: { [key: string]: boolean };
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
  tabooHit: boolean;
  bonusPoints: number;
}
