export interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: string;
}

export interface ConversationSummary {
  _id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: ChatMessage[];
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export interface ConversationMessageRequest {
  message?: string;
  image?: File | null;
  file?: File | null;
  imageUrl?: string | null;
}

export interface QuizQuestionContext {
  questionText: string;
  questionTextAR: string;
  selectedAnswer: string;
  selectedAnswerAR: string;
  correctAnswer: string;
  correctAnswerAR: string;
  explanation: string;
  explanationAR: string;
  chapterTitle: string;
  chapterTitleAR: string;
  chapterKey: string;
  isCorrect: boolean;
  image?: string;
}

export const QUIZ_CONTEXT_NAV_KEY = 'quizQuestionContext';
