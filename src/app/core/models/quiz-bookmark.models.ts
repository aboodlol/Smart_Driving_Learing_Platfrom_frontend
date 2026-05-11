export interface QuizBookmark {
  _id: string;
  questionId: string;
  chapterKey: string;
  chapterTitle?: string;
  chapterTitleAR?: string;
  createdAt?: string;
}

export interface QuizBookmarkToggleRequest {
  chapterKey: string;
  questionId: string;
}

export interface QuizBookmarkToggleResponse {
  bookmarked: boolean;
  questionId: string;
  bookmark?: QuizBookmark;
}
