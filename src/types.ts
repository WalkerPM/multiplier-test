export interface Choice {
  value: string;
  correct: boolean;
}

export interface Question {
  title: string;
  type: string;
  choices: Choice[];
}

export type QuizLevel = 'A' | 'B' | 'C';

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  level: QuizLevel;
  answers: {
    questionTitle: string;
    correctAnswer: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
  }[];
  timeSpentSeconds: number;
}
