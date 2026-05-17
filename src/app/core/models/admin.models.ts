export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'student' | 'admin';
}

export interface AdminDocument {
  _id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface DashboardStats {
  users: { total: number; students: number; admins: number };
  content: { totalChapters: number; totalSubLessons: number; totalQuizQuestions: number };
  documents: { totalDocuments: number; totalSize: number };
  progress: {
    averageProgress: number;
    completionRate: number;
    progressDistribution: {
      '0-25': number;
      '26-50': number;
      '51-75': number;
      '76-100': number;
    };
  };
  quizzes: { totalAttempts: number; averageScore: number; passRate: number };
}

export interface ChapterQuizStats {
  totalQuestions: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}

export interface ChapterReport {
  chapterTitle: string;
  chapterTitleAr?: string;
  totalSubLessons: number;
  completionRate: number;
  completedEntries?: number;
  studentsCompleted?: number;
  activeUsers?: number;
  quizStats?: ChapterQuizStats;
}

export interface RecentQuizAttempt {
  id: string;
  chapterTitle?: string;
  chapterTitleAr?: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface RecentDocumentUpload {
  id: string;
  name: string;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface RecentUserSignup {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface RecentActivityDto {
  recentQuizAttempts: RecentQuizAttempt[];
  recentUsers: RecentUserSignup[];
  recentDocuments?: RecentDocumentUpload[];
}
