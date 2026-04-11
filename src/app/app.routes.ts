import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'landing',
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/pages/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register-page.component').then(
        (m) => m.RegisterPageComponent,
      ),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/pages/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'lessons',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lessons/pages/lessons-page.component').then(
        (m) => m.LessonsPageComponent,
      ),
  },
  {
    path: 'lessons/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lessons/pages/lesson-detail-page.component').then(
        (m) => m.LessonDetailPageComponent,
      ),
  },
  {
    path: 'quiz',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/quiz/pages/quiz-page.component').then(
        (m) => m.QuizPageComponent,
      ),
  },
  {
    path: 'quiz/exam',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/quiz/pages/quiz-session-page.component').then(
        (m) => m.QuizSessionPageComponent,
      ),
  },
  {
    path: 'quiz/chapter/:chapterTitle',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/quiz/pages/quiz-session-page.component').then(
        (m) => m.QuizSessionPageComponent,
      ),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/progress/pages/progress-page.component').then(
        (m) => m.ProgressPageComponent,
      ),
  },
  {
    path: 'assistant',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/assistant/pages/assistant-page.component').then(
        (m) => m.AssistantPageComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-dashboard-page.component').then(
        (m) => m.AdminDashboardPageComponent,
      ),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-users-page.component').then(
        (m) => m.AdminUsersPageComponent,
      ),
  },
  {
    path: 'admin/documents',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-documents-page.component').then(
        (m) => m.AdminDocumentsPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
