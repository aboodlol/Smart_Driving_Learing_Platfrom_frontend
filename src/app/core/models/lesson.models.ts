export interface SubLesson {
  title: string;
  content: string;
}

export interface Chapter {
  _id: string;
  title: string;
  description: string;
  image: string;
  order: number;
  isPublished: boolean;
  lessons: SubLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CompleteSubLessonResponse {
  message: string;
  identifier: string;
  overallProgress: number;
}
