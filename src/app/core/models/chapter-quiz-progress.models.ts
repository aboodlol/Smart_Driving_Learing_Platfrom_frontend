export interface ChapterQuizAnswer {
  questionId: string;
  selectedAnswer: string;
  selectedAnswerAR: string;
  selectedIndex: number;
  currentQuestionIndex: number;
}

export interface ChapterQuizProgress {
  chapterTitle?: string;
  currentQuestionIndex?: number;
  answers?: ChapterQuizAnswer[];
}
