export interface QuizQuestion {
  _id: string;
  question: string;
  questionAR?: string;
  options: string[];
  optionsAR?: string[];
  correctAnswer?: string;
  correctAnswerAR?: string;
  chapterTitle: string;
  chapterTitleAR?: string;
  explanation?: string;
  explanationAR?: string;
  image?: string | null;
  video?: string | null;
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
  questionAR?: string;
  selectedAnswer: string;
  selectedAnswerAR?: string;
  correctAnswer: string;
  correctAnswerAR?: string;
  isCorrect: boolean;
  explanation: string;
  explanationAR?: string;
  image?: string | null;
  video?: string | null;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correct: number;
  results: QuizQuestionResult[];
}

export type QuizMode = 'chapter' | 'exam';
