export interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  chapterTitle: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface QuizSubmission {
  answers: QuizAnswer[];
}

export interface QuizQuestionResult {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correct: number;
  results: QuizQuestionResult[];
}

export type QuizMode = 'chapter' | 'exam';
