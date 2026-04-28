import { QuizQuestion } from './quiz.models';

export interface ExamAttemptHistoryItem {
  _id: string;
  id?: string;
  status?: 'active' | 'submitted' | 'expired' | string;
  score?: number;
  totalQuestions?: number;
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExamAttemptAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface ExamAttempt {
  _id: string;
  id?: string;
  questions: QuizQuestion[];
  answers?: ExamAttemptAnswer[] | Record<string, string>;
  expiresAt: string;
  status?: 'active' | 'submitted' | 'expired';
  createdAt?: string;
  updatedAt?: string;
  score?: number;
  totalQuestions?: number;
  submittedAt?: string | null;
  results?: unknown;
}
