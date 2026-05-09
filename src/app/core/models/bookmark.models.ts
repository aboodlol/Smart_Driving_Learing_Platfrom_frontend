export interface LessonBookmark {
  _id: string;
  userId: string;
  chapterId: string;
  chapterKey?: string;
  subLessonIndex: number;
  title: string;
  titleAR?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkPayload {
  chapterId: string;
  subLessonIndex: number;
}
