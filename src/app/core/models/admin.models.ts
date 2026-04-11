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
  totalUsers: number;
  totalChapters: number;
  totalSubLessons: number;
  totalQuizQuestions: number;
  totalDocuments: number;
}

export interface ChapterReport {
  _id: string;
  title: string;
  subLessonCount: number;
  quizCount: number;
  completionRate: number;
}

export interface RecentActivity {
  _id: string;
  type: 'lesson_completion' | 'quiz_attempt' | 'registration';
  description: string;
  user: {
    _id: string;
    name: string;
  };
  createdAt: string;
}
