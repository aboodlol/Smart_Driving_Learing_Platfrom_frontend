export interface SubLesson {
  title: string;
  titleAR?: string;
  content: string;
  contentAR?: string;
  image?: string;
}

export interface Chapter {
  _id: string;
  chapterKey: string;
  title: string;
  titleAR?: string;
  description: string;
  descriptionAR?: string;
  image: string;
  order: number;
  isPublished: boolean;
  lessons: SubLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CompleteSubLessonResponse {
  message: string;
  completedLesson: {
    chapterId: string;
    subLessonIndex: number;
    completedAt: string;
  };
  completedLessons: {
    chapterId: string;
    subLessonIndex: number;
    completedAt: string;
  }[];
  overallProgress: number;
}
