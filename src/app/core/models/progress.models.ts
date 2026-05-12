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

export type ProgressRange = '7d' | '30d' | 'all';

export interface ActivityBucket {
  /** YYYY-MM-DD in server-local time. */
  date: string;
  count: number;
}

export interface ActivityResponse {
  range: ProgressRange;
  /** Number of days the window spans, or null for `all`. */
  days: number | null;
  buckets: ActivityBucket[];
  /** Unique active days within the filter window. */
  activeDays: number;
  /** Unique active days across the user's full history (filter-independent). */
  totalActiveDays: number;
  totalEvents: number;
}

export interface ChapterStrength {
  chapterId: string;
  chapterKey: string;
  chapterTitle: string;
  chapterTitleAR: string | null;
  /** Exam answers in this chapter that were marked correct. */
  correct: number;
  /** Exam answers attempted in this chapter (excludes skipped/empty). */
  answered: number;
  /** Rounded `(correct / answered) * 100`, or 0 when `answered === 0`. */
  strength: number;
}

export interface ChapterStrengthResponse {
  range: ProgressRange;
  days: number | null;
  chapters: ChapterStrength[];
  totalAnsweredAcrossChapters: number;
  attemptsConsidered: number;
}
