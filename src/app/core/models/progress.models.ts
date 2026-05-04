export interface ChapterProgress {
  chapterId: string;
  title: string;
  titleAR?: string;
  description: string;
  descriptionAR?: string;
  totalSubLessons: number;
  completedSubLessons: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface CompletedLessonProgress {
  chapterId: string;
  subLessonIndex: number;
  completedAt: string;
}

export interface LessonProgressResponse {
  completedLessons: CompletedLessonProgress[];
}

export interface QuizStats {
  totalAttempts: number;
  lastScore: number | null;
  averageScore: number;
}

export interface ProgressSummary {
  overallProgress: number;
  lessons: ChapterProgress[];
  quizStats: QuizStats;
}
