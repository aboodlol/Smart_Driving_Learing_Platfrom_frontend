# DriveWise — Frontend Architecture Documentation

> **Version:** 1.0 · April 2026
> **Framework:** Angular 21 (standalone components) · TypeScript 5.x
> **Styling:** Bootstrap 5 + Angular Material + Custom SCSS (CSS custom properties)

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Patterns](#4-architecture-patterns)
5. [Routing & Navigation](#5-routing--navigation)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Core Models](#7-core-models)
8. [API Services](#8-api-services)
9. [Feature Modules](#9-feature-modules)
10. [AI Assistant Integration](#10-ai-assistant-integration)
11. [Admin Panel](#11-admin-panel)
12. [Theming & Design System](#12-theming--design-system)
13. [State Management](#13-state-management)
14. [Build & Deployment](#14-build--deployment)

---

## 1. Business Overview

**DriveWise** (originally "The Smart Driving Learning Platform") is a web-based educational platform that helps students prepare for their driving license exam. It provides:

- **Structured Lessons** — 5 chapters covering traffic laws, road signs, vehicle safety, and defensive driving, each with multiple sub-lessons.
- **Practice Quizzes** — 100+ multiple-choice questions. Students can take chapter-specific quizzes or a full exam simulation.
- **AI-Powered Assistant** — A Google Gemini-backed chatbot that understands the student's progress and any uploaded documents to give personalised answers.
- **Progress Tracking** — Real-time per-chapter completion rates, quiz statistics (attempts, average score, last score), and overall readiness percentage.
- **Admin Panel** — Role-based dashboard for administrators to manage users, upload knowledge-base documents, and view platform analytics.

### User Roles

| Role    | Access                                                                 |
|---------|------------------------------------------------------------------------|
| Student | Landing, Login, Register, Home, Lessons, Quiz, Progress, Assistant     |
| Admin   | Everything a student can access + Admin Dashboard, User Mgmt, Doc Mgmt |

---

## 2. Technology Stack

| Layer      | Technology                                                   |
|------------|--------------------------------------------------------------|
| Framework  | Angular 21 (standalone components, signals, new control flow)|
| Language   | TypeScript 5.x (strict mode)                                 |
| Styling    | SCSS + Bootstrap 5 + Angular Material                        |
| State      | Angular Signals (`signal`, `computed`)                        |
| HTTP       | `@angular/common/http` with functional `HttpInterceptorFn`   |
| Routing    | `@angular/router` with functional guards                     |
| Fonts      | Montserrat (Google Fonts)                                    |
| Backend    | Node.js / Express / MongoDB (separate repository)            |
| AI         | Google Gemini API (via backend proxy)                         |

---

## 3. Project Structure

```
src/
├── app/
│   ├── app.ts                        # Root component (shell, nav, footer)
│   ├── app.html                      # Root template — dual nav (public/auth)
│   ├── app.scss                      # Root styles
│   ├── app.routes.ts                 # All route definitions
│   ├── app.config.ts                 # Application providers
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts         # Requires authentication
│   │   │   ├── guest.guard.ts        # Requires NOT authenticated
│   │   │   └── admin.guard.ts        # Requires admin role
│   │   ├── interceptors/
│   │   │   └── auth-token.interceptor.ts  # Attaches Bearer token
│   │   ├── models/
│   │   │   ├── auth.models.ts        # UserRole, AuthUser, LoginRequest, etc.
│   │   │   ├── lesson.models.ts      # SubLesson, Chapter
│   │   │   ├── quiz.models.ts        # QuizQuestion, QuizResult, etc.
│   │   │   ├── progress.models.ts    # ProgressSummary, ChapterProgress
│   │   │   ├── assistant.models.ts   # ChatMessage, ChatRequest, ChatResponse
│   │   │   └── admin.models.ts       # AdminUser, AdminDocument, DashboardStats
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Session management (signals)
│   │   │   ├── auth-api.service.ts   # Login/Register HTTP calls
│   │   │   ├── lesson-api.service.ts # Lesson CRUD
│   │   │   ├── quiz-api.service.ts   # Quiz fetch/submit
│   │   │   ├── progress-api.service.ts # Progress summary/reset
│   │   │   ├── assistant-api.service.ts # Chat with AI
│   │   │   ├── admin-api.service.ts  # All admin endpoints
│   │   │   └── toast.service.ts      # Snackbar notifications
│   │   └── validators/
│   │       └── match.validator.ts    # Password confirmation validator
│   └── features/
│       ├── landing/                  # Public landing page
│       ├── auth/                     # Login + Register (split-screen)
│       ├── home/                     # Authenticated dashboard
│       ├── lessons/                  # Lessons list + detail
│       ├── quiz/                     # Quiz selection + session
│       ├── progress/                 # Progress dashboard
│       ├── assistant/                # AI chat interface
│       └── admin/                    # Admin dashboard, users, documents
├── environments/
│   ├── environment.ts                # Production env (backendUrl)
│   └── environment.development.ts    # Dev env (localhost:5000)
├── styles/
│   └── theme.scss                    # Angular Material theme
├── styles.scss                       # Global styles + CSS custom properties
└── index.html                        # Entry HTML (fonts, title)
```

---

## 4. Architecture Patterns

### Standalone Components

Every component uses `standalone: true` — no `NgModule` wrappers. Dependencies are listed in each component's `imports` array.

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [RouterLink, MatProgressBarModule],
  templateUrl: './example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent { }
```

### OnPush Change Detection

All components use `ChangeDetectionStrategy.OnPush` to minimise unnecessary renders. This is paired with Angular Signals for reactive state.

### Dependency Injection

All services use `inject()` function instead of constructor injection:

```typescript
private readonly http = inject(HttpClient);
private readonly destroyRef = inject(DestroyRef);
```

### RxJS Cleanup

Subscriptions are automatically cleaned up using `takeUntilDestroyed(this.destroyRef)`:

```typescript
this.api.getData()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({ next: ..., error: ... });
```

### Modern Template Syntax

Templates use Angular's built-in control flow (`@if`, `@for`, `@else`) instead of `*ngIf`/`*ngFor` directives.

---

## 5. Routing & Navigation

All routes are defined in `app.routes.ts` using lazy loading via `loadComponent()`.

| Path                        | Component                   | Guard       | Description            |
|-----------------------------|-----------------------------|-------------|------------------------|
| `/`                         | redirect → `/landing`       | —           |                        |
| `/landing`                  | `LandingPageComponent`      | —           | Public hero page       |
| `/login`                    | `LoginPageComponent`        | guestGuard  | Sign-in form           |
| `/register`                 | `RegisterPageComponent`     | guestGuard  | Registration form      |
| `/home`                     | `HomePageComponent`         | authGuard   | User dashboard         |
| `/lessons`                  | `LessonsPageComponent`      | authGuard   | Chapter listing        |
| `/lessons/:id`              | `LessonDetailPageComponent` | authGuard   | Chapter detail         |
| `/quiz`                     | `QuizPageComponent`         | authGuard   | Quiz selection         |
| `/quiz/exam`                | `QuizSessionPageComponent`  | authGuard   | Full exam mode         |
| `/quiz/chapter/:chapterTitle` | `QuizSessionPageComponent`| authGuard   | Chapter quiz mode      |
| `/progress`                 | `ProgressPageComponent`     | authGuard   | Progress dashboard     |
| `/assistant`                | `AssistantPageComponent`    | authGuard   | AI chat                |
| `/admin`                    | `AdminDashboardPageComponent`| adminGuard | Admin analytics        |
| `/admin/users`              | `AdminUsersPageComponent`   | adminGuard  | User management        |
| `/admin/documents`          | `AdminDocumentsPageComponent`| adminGuard | Document management    |
| `**`                        | redirect → `/landing`       | —           | Catch-all              |

### Guards

| Guard        | Logic                                                    |
|--------------|----------------------------------------------------------|
| `authGuard`  | Authenticated → pass; else → redirect `/login`           |
| `guestGuard` | Not authenticated → pass; else → redirect `/home`        |
| `adminGuard` | Authenticated + role=admin → pass; else → redirect `/home` or `/login` |

### Navigation UX

The app shell (`app.html`) renders two different headers:

- **Public header** (unauthenticated): Logo + "Sign In" link + "Get Started Free" button
- **Authenticated header**: Logo + nav links (Home, Lessons, Quiz, Progress, Assistant, [Admin]) + user chip + Logout button

The "Admin" nav link only appears when `currentUser().role === 'admin'`, styled in green to distinguish it.

---

## 6. Authentication & Authorization

### Flow

1. User submits login/register form
2. `AuthApiService` sends POST to `/api/auth/login` or `/api/auth/register`
3. Backend returns `{ _id, name, email, role, token }`
4. `AuthService.persistSession()` stores the user in:
   - A `signal<AuthUser | null>` for reactive UI updates
   - `localStorage` under key `'drivewise-auth-user'` for session persistence
5. `authTokenInterceptor` attaches `Authorization: Bearer <token>` to all API requests

### Token Handling

```typescript
// auth-token.interceptor.ts (functional interceptor)
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).currentUser()?.token;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

### Session Restore

On application start, `AuthService.restoreSession()` reads `localStorage`, validates the stored object shape (`_id`, `email`, `token` must exist), and restores the signal.

---

## 7. Core Models

### Auth

```typescript
type UserRole = 'student' | 'admin';

interface AuthUser {
  _id: string; name: string; email: string; role: UserRole; token: string;
}
```

### Lessons

```typescript
interface SubLesson { title: string; content: string; }
interface Chapter {
  _id: string; title: string; description: string;
  image: string; order: number; isPublished: boolean;
  lessons: SubLesson[];
}
```

### Quiz

```typescript
interface QuizQuestion {
  _id: string; question: string; options: string[];
  correctAnswer?: string; chapterTitle: string;
  explanation?: string; difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizResult {
  score: number; totalQuestions: number; correct: number;
  results: QuizQuestionResult[];
}
```

### Progress

```typescript
interface ProgressSummary {
  overallProgress: number;
  lessons: ChapterProgress[];  // per-chapter completion
  quizStats: QuizStats;        // totalAttempts, lastScore, averageScore
}
```

### Admin

```typescript
interface DashboardStats {
  totalUsers: number; totalChapters: number;
  totalSubLessons: number; totalQuizQuestions: number; totalDocuments: number;
}

interface ChapterReport {
  _id: string; title: string; subLessonCount: number;
  quizCount: number; completionRate: number;
}
```

---

## 8. API Services

All API services follow the same pattern:

1. `@Injectable({ providedIn: 'root' })`
2. `inject(HttpClient)` for HTTP calls
3. `environment.backendUrl` as base URL
4. `catchError(this.mapApiError)` on every call
5. `mapApiError()` extracts backend error messages or returns generic fallbacks

| Service             | Base URL              | Methods                                    |
|---------------------|-----------------------|--------------------------------------------|
| `AuthApiService`    | `/api/auth`           | `login()`, `register()`                    |
| `LessonApiService`  | `/api/lessons`        | `getLessons()`, `getLesson()`, `completeSubLesson()` |
| `QuizApiService`    | `/api/quizzes`        | `getQuizzesByChapter()`, `getExamQuestions()`, `submitQuiz()` |
| `ProgressApiService`| `/api/progress`       | `getProgressSummary()`, `resetProgress()`  |
| `AssistantApiService`| `/api/assistant`     | `sendMessage()`                            |
| `AdminApiService`   | `/api/admin`          | Users: `getUsers()`, `updateUser()`, `deleteUser()`; Docs: `getDocuments()`, `uploadDocument()`, `deleteDocument()`; Dashboard: `getDashboardStats()`, `getChapterReports()`, `getRecentActivity()` |

---

## 9. Feature Modules

### Landing Page (`/landing`)

Public marketing page with:
- Animated hero section with floating/growing decorative squares
- Trust badge, headline, subtitle, two CTAs
- Platform stats row (chapters, lessons, quiz questions, AI)
- Features grid (4 cards) with scroll-reveal animations
- "How It Works" 3-step flow with animated connectors
- Indigo gradient CTA section at bottom

Uses `IntersectionObserver` (running outside Angular zone) to trigger `.scroll-reveal` → `.visible` CSS transitions.

### Auth Pages (`/login`, `/register`)

Split-screen design:
- **Login**: Left panel has blue/indigo gradient with car emoji and feature bullets. Right panel has form with email/password + demo accounts info box.
- **Register**: Left panel has green gradient with graduation cap. Right panel has form with name/email/password/confirm password using `matchValidator`.

### Home Dashboard (`/home`)

Authenticated landing page showing:
- Welcome message with user's name
- 3 action cards (Continue Lessons, Take a Quiz, View Progress) with live data from `ProgressApiService`
- Quick links to AI Assistant and Exam

### Lessons (`/lessons`, `/lessons/:id`)

- **List view**: Grid of chapter cards with status badges (Not Started / In Progress / Completed), sub-lesson counts. Data from `LessonApiService.getLessons()` + `ProgressApiService.getProgressSummary()` via `forkJoin`.
- **Detail view**: Sub-lesson cards with content display and "Mark as Complete" button that calls `LessonApiService.completeSubLesson()`.

### Quiz (`/quiz`, `/quiz/exam`, `/quiz/chapter/:chapterTitle`)

- **Selection view**: Exam simulation hero card (indigo gradient) + chapter-specific quiz cards.
- **Session view**: One question at a time with radio options, progress bar, navigation. On submit, shows results with score circle (color-coded green/amber/red), per-question review with explanations.

### Progress (`/progress`)

- Overall progress circle with gradient fill
- Per-chapter progress bars with status
- Quiz stats grid (3 columns: Attempts, Last Score, Average)
- Reset progress button with confirmation dialog

### Assistant (`/assistant`)

Chat interface with:
- Message bubbles (indigo for user, gray for assistant)
- Conversation history maintained in component signals
- Typing indicator with animated dots during API call
- Auto-scroll to latest message
- Enter-to-send keyboard shortcut

---

## 10. AI Assistant Integration

### How It Works

1. User sends a message via the chat UI
2. Frontend sends `{ message, conversationHistory }` to `POST /api/assistant/chat`
3. Backend builds a context-rich prompt that includes:
   - The student's current progress (completed lessons, quiz scores)
   - Text extracted from any uploaded documents (`pdf-parse` / `mammoth`)
   - A system prompt establishing the AI as a driving instructor
4. Backend forwards to **Google Gemini API** and returns the response
5. Frontend appends the response to the conversation view

### Key Design Decisions

- Conversation history is client-side (signals), sent with each request so the AI has full context
- The AI is scoped to driving-related topics only (backend system prompt)
- Document content enriches responses — admins upload materials that all users benefit from

---

## 11. Admin Panel

### Access Control

Protected by `adminGuard` which checks both authentication and `role === 'admin'`. Non-admin users are redirected to `/home`.

### Admin Dashboard (`/admin`)

- **Stats cards**: Total Users, Chapters, Sub-Lessons, Documents
- **Chapter completion chart**: Horizontal bar chart with color coding (green ≥70%, amber ≥40%, red <40%)
- **Content table**: Per-chapter sub-lesson and quiz question counts with `mat-progress-bar`
- **Recent activity feed**: Lesson completions, quiz attempts, registrations with timestamps
- **Quick links**: Navigate to Users and Documents management

### User Management (`/admin/users`)

- Searchable user table (name, email, role)
- Inline editing: click Edit → row transforms to input fields → Save/Cancel
- Role switching (student ↔ admin) via dropdown
- Delete with confirmation dialog

### Document Management (`/admin/documents`)

- Card grid showing uploaded documents with file icon, name, size, uploader, date
- Upload button triggers hidden file input (`accept=".pdf,.doc,.docx,.txt"`)
- Upload sends `FormData` with `document` field
- Delete with confirmation dialog
- Empty state with instructions when no documents exist

---

## 12. Theming & Design System

### CSS Custom Properties

All colors are defined as CSS custom properties in `styles.scss`:

```scss
:root {
  --dr-primary: #4338ca;       // Indigo 700
  --dr-primary-dark: #3730a3;  // Indigo 800
  --dr-primary-light: #6366f1; // Indigo 500
  --dr-accent-green: #059669;  // Emerald 600
  --dr-accent-green-dark: #047857;
  --dr-accent-green-light: #0d9488;
  --dr-bg-light: #f8f9fc;
  --dr-text: #1e293b;          // Slate 800
  --dr-text-muted: #64748b;    // Slate 500
  --dr-surface: #ffffff;
  --dr-border: #e5e7eb;        // Gray 200
}
```

### Typography

- **Font**: Montserrat (400, 500, 600, 700 weights via Google Fonts)
- **Fallback**: Segoe UI, sans-serif

### Component Styling

Each component has its own `.scss` file using:
- `:host { display: block; }` pattern
- `var(--dr-*)` for all colors
- BEM-like class naming
- Media queries at `768px` breakpoint for mobile

### Angular Material Theme

Customised in `styles/theme.scss` with primary palette shifted to indigo 700 for deeper brand color.

---

## 13. State Management

DriveWise uses **Angular Signals** for all component-level state:

```typescript
// Component state
protected readonly loading = signal(true);
protected readonly error = signal('');
protected readonly data = signal<Data | null>(null);

// Auth state (service-level)
private readonly authUserState = signal<AuthUser | null>(this.restoreSession());
readonly currentUser = computed(() => this.authUserState());
readonly isAuthenticated = computed(() => this.authUserState() !== null);
```

**No global state library** (NgRx, Akita) is used. This is intentional — the app's state needs are simple enough that signals + services suffice.

---

## 14. Build & Deployment

### Development

```bash
ng serve                  # Starts dev server on port 4200
```

Connects to backend at `http://localhost:5000` (configured in `environment.development.ts`).

### Production Build

```bash
ng build                  # Outputs to dist/the-smart-driving-learning-platformn/
```

### Environment Configuration

| File                          | `backendUrl`              |
|-------------------------------|---------------------------|
| `environment.development.ts`  | `http://localhost:5000`   |
| `environment.ts` (production) | `''` (same-origin proxy)  |

### Budget Warnings

The build produces budget warnings for:
- Initial bundle (~740 kB) — Bootstrap + Angular Material
- Quiz session SCSS (~4.4 kB) — rich quiz result UI

These are non-blocking warnings, not errors.

---

## Appendix: Backend API Endpoints

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| POST   | `/api/auth/register`                  | Create account                 |
| POST   | `/api/auth/login`                     | Authenticate                   |
| GET    | `/api/lessons`                        | List all chapters              |
| GET    | `/api/lessons/:id`                    | Single chapter detail          |
| POST   | `/api/lessons/:id/complete`           | Mark sub-lesson complete       |
| GET    | `/api/quizzes/chapter/:title`         | Quiz questions by chapter      |
| GET    | `/api/quizzes/exam`                   | Random exam questions          |
| POST   | `/api/quizzes/submit`                 | Submit quiz answers            |
| GET    | `/api/progress/summary`               | User's progress summary        |
| DELETE | `/api/progress/reset`                 | Reset user's progress          |
| POST   | `/api/assistant/chat`                 | Chat with AI assistant         |
| GET    | `/api/admin/users`                    | List all users (admin)         |
| PUT    | `/api/admin/users/:id`                | Update user (admin)            |
| DELETE | `/api/admin/users/:id`                | Delete user (admin)            |
| POST   | `/api/admin/documents`                | Upload document (admin)        |
| GET    | `/api/admin/documents`                | List documents (admin)         |
| DELETE | `/api/admin/documents/:id`            | Delete document (admin)        |
| GET    | `/api/admin/dashboard/stats`          | Platform statistics (admin)    |
| GET    | `/api/admin/dashboard/chapters`       | Chapter reports (admin)        |
| GET    | `/api/admin/dashboard/activity`       | Recent activity feed (admin)   |
