export interface AlphabetEntry {
  letter: string;
  lowercase: string;
  phonetic: string;
  word: string;
  translation: string;
  audio: string;
  category: string;
}

export type GameMode = "practice" | "challenge";

export interface SessionStats {
  correctCount: number;
  totalAttempts: number;
  completedLetters: Set<string>;
}
