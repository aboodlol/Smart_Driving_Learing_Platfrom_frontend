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
  mimetype: string;
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
  totalSubLessons: number;
  completionRate: number;
  quizStats?: ChapterQuizStats;
}

export interface RecentQuizAttempt {
  id?: string;
  score?: number;
  createdAt?: string;
  user?: {
    id?: string;
    name?: string;
  };
}

export interface RecentActivityDto {
  recentQuizAttempts: RecentQuizAttempt[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt?: string;
  }[];
}
