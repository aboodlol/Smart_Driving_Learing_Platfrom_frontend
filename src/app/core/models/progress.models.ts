export interface ChapterProgress {
  chapterId: string;
  title: string;
  description: string;
  totalSubLessons: number;
  completedSubLessons: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
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
