# DriveReady - Frontend Codebase Guide

> A complete, in-depth guide to the Angular 21 frontend of **DriveReady** — The Smart Driving Learning Platform.  
> This document explains every layer: the business logic, the architecture, the code patterns, the AI integration, the routing, and the relationships between all parts.

---

## Table of Contents

1. [What is DriveReady? (The Business)](#1-what-is-driveready-the-business)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure (File Tree)](#3-project-structure-file-tree)
4. [Architecture Overview](#4-architecture-overview)
5. [How the Application Boots](#5-how-the-application-boots)
6. [The Root Component (`App`)](#6-the-root-component-app)
7. [Routing — Every Route Explained](#7-routing--every-route-explained)
8. [Core Layer — The Engine Room](#8-core-layer--the-engine-room)
   - 8.1 [Data Models](#81-data-models)
   - 8.2 [Route Guards](#82-route-guards)
   - 8.3 [HTTP Interceptor](#83-http-interceptor)
   - 8.4 [Services](#84-services)
   - 8.5 [Validators](#85-validators)
   - 8.6 [Pipes](#86-pipes)
9. [Feature Modules — Page by Page](#9-feature-modules--page-by-page)
   - 9.1 [Landing Page](#91-landing-page)
   - 9.2 [Authentication (Login & Register)](#92-authentication-login--register)
   - 9.3 [Home Dashboard](#93-home-dashboard)
   - 9.4 [Lessons](#94-lessons)
   - 9.5 [Quiz System](#95-quiz-system)
   - 9.6 [Progress Tracking](#96-progress-tracking)
   - 9.7 [AI Assistant](#97-ai-assistant--the-role-of-ai)
   - 9.8 [Admin Panel](#98-admin-panel)
10. [The Role of AI — Detailed Explanation](#10-the-role-of-ai--detailed-explanation)
11. [State Management — How Data Flows](#11-state-management--how-data-flows)
12. [Theming & Design System](#12-theming--design-system)
13. [Backend API Contract](#13-backend-api-contract)
14. [Architectural Patterns & Conventions](#14-architectural-patterns--conventions)
15. [Relationship Diagram — How Everything Connects](#15-relationship-diagram--how-everything-connects)

---

## 1. What is DriveReady? (The Business)

**DriveReady** is an online educational platform that helps people prepare for their **driving license exam**. Think of it as an e-learning app specifically for driving education.

### The Problem It Solves

Students preparing for driving exams need:
- Structured lessons covering traffic rules, signs, safety, etc.
- Practice quizzes to test their knowledge before the real exam
- A way to track what they've studied and how they're performing
- An intelligent assistant that can answer driving-related questions 24/7
- Admins need to manage content, users, and monitor platform usage

### Business Features

| Feature | Who Uses It | What It Does |
|---------|-------------|--------------|
| **Structured Lessons** | Students | Browse chapters (e.g., "Traffic Signs", "Right of Way"), read sub-lessons, mark them complete |
| **Quiz System** | Students | Take chapter-specific quizzes OR a full exam simulation with mixed questions |
| **Progress Dashboard** | Students | See overall completion %, per-chapter progress, and quiz performance stats |
| **AI Assistant** | Students | Chat with an AI (Google Gemini) that answers driving-related questions |
| **Admin Dashboard** | Admins | View platform stats (users, chapters, documents), manage users, upload documents |
| **User Management** | Admins | Edit user roles, delete accounts, search users |
| **Document Management** | Admins | Upload/view/delete study materials (PDFs, docs, etc.) |

### User Roles

- **Student** (`role: 'student'`): Can access lessons, quizzes, progress, and the AI assistant
- **Admin** (`role: 'admin'`): Can access everything students can + the admin panel

---

## 2. Technology Stack

| Layer | Technology | Why It's Used |
|-------|-----------|---------------|
| **Framework** | Angular 21 | Latest Angular with standalone components, signals, and new control flow |
| **Language** | TypeScript 5.9 (strict mode) | Type safety, better IDE support, catches bugs at compile time |
| **UI Library** | Angular Material 21 | Pre-built Material Design components (toolbar, buttons, spinners, forms, snackbar) |
| **CSS Framework** | Bootstrap 5.3 | Grid system and utility classes for responsive layout |
| **Styling** | SCSS | Variables, nesting, partials — more powerful than plain CSS |
| **State** | Angular Signals | Built-in reactive primitives — no external state library needed |
| **HTTP** | Angular HttpClient + RxJS | Standard way to make API calls with observable streams |
| **Build Tool** | esbuild (via Angular CLI) | Ultra-fast builds compared to webpack |
| **Testing** | Vitest 4.0 | Fast unit testing framework compatible with Angular |
| **Font** | Montserrat (Google Fonts) | Clean, modern typeface for the UI |
| **Icons** | Material Icons | Consistent icon set matching Material Design |
| **Backend** | Node.js + Express + MongoDB (separate repo) | REST API with Google Gemini for AI features |

---

## 3. Project Structure (File Tree)

```
src/
├── main.ts                              ← Entry point, bootstraps the app
├── index.html                           ← Single HTML page (SPA shell)
├── styles.scss                          ← Global styles + CSS custom properties
├── styles/
│   └── theme.scss                       ← Angular Material theme configuration
├── environments/
│   ├── environment.ts                   ← Production config
│   └── environment.development.ts       ← Development config
└── app/
    ├── app.ts                           ← Root component (shell with header/footer)
    ├── app.html                         ← Root template (nav + router-outlet)
    ├── app.scss                         ← Root styles (layout, header, nav)
    ├── app.routes.ts                    ← All route definitions
    ├── app.config.ts                    ← Provider configuration (DI setup)
    ├── app.spec.ts                      ← Root component tests
    │
    ├── core/                            ← Shared singleton services, models, guards
    │   ├── guards/
    │   │   ├── auth.guard.ts            ← Blocks unauthenticated users
    │   │   ├── guest.guard.ts           ← Blocks authenticated users (from login/register)
    │   │   └── admin.guard.ts           ← Blocks non-admin users
    │   ├── interceptors/
    │   │   └── auth-token.interceptor.ts ← Attaches JWT token to every HTTP request
    │   ├── models/
    │   │   ├── auth.models.ts           ← User, login, register types
    │   │   ├── lesson.models.ts         ← Chapter, SubLesson types
    │   │   ├── quiz.models.ts           ← Question, answer, result types
    │   │   ├── progress.models.ts       ← Progress summary types
    │   │   ├── assistant.models.ts      ← Chat message types
    │   │   └── admin.models.ts          ← Admin dashboard types
    │   ├── services/
    │   │   ├── auth.service.ts          ← Session manager (login/logout/restore)
    │   │   ├── auth-api.service.ts      ← HTTP calls to /api/auth/*
    │   │   ├── lesson-api.service.ts    ← HTTP calls to /api/lessons/*
    │   │   ├── quiz-api.service.ts      ← HTTP calls to /api/quizzes/*
    │   │   ├── progress-api.service.ts  ← HTTP calls to /api/progress/*
    │   │   ├── assistant-api.service.ts ← HTTP calls to /api/assistant/*
    │   │   ├── admin-api.service.ts     ← HTTP calls to /api/admin/*
    │   │   └── toast.service.ts         ← Snackbar notification wrapper
    │   ├── validators/
    │   │   └── match.validator.ts       ← Password confirmation validator
    │   └── pipes/
    │       └── user-role.pipe.ts        ← Transforms role strings for display
    │
    └── features/                        ← Feature-based pages (each lazy-loaded)
        ├── landing/pages/               ← Public marketing page
        ├── auth/                        ← Login + Register pages
        │   ├── pages/
        │   └── styles/                  ← Shared auth SCSS partial
        ├── home/pages/                  ← Authenticated dashboard
        ├── lessons/pages/               ← Chapter list + chapter detail
        ├── quiz/pages/                  ← Quiz selection + quiz session
        ├── progress/pages/              ← Progress overview
        ├── assistant/pages/             ← AI chat interface
        └── admin/pages/                 ← Dashboard + users + documents
```

### Why This Structure?

The project follows a **feature-based folder structure**:
- `core/` contains things used **everywhere** (services, models, guards) — these are singletons
- `features/` contains self-contained **page components** — each feature only knows about `core/`, not about other features
- This means `lessons/` never imports from `quiz/`, and `quiz/` never imports from `admin/` — they're independent

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    index.html                             │    │
│  │                   <app-root></app-root>                   │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │              App (Root Component)                          │    │
│  │         ┌──────────────────────────┐                      │    │
│  │         │     <router-outlet>      │                      │    │
│  │         │  (loads feature pages)   │                      │    │
│  │         └──────────┬───────────────┘                      │    │
│  └────────────────────┼─────────────────────────────────────┘    │
│                       │                                           │
│  ┌────────────────────▼─────────────────────────────────────┐    │
│  │              Angular Router                               │    │
│  │    ┌─────────┬──────────┬───────────┬──────────────┐     │    │
│  │    │ Landing │ Auth     │ Home      │ Admin        │     │    │
│  │    │         │ Login    │ Lessons   │ Dashboard    │     │    │
│  │    │         │ Register │ Quiz      │ Users        │     │    │
│  │    │         │          │ Progress  │ Documents    │     │    │
│  │    │         │          │ Assistant │              │     │    │
│  │    └─────────┴──────────┴───────────┴──────────────┘     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                       │                                           │
│  ┌────────────────────▼─────────────────────────────────────┐    │
│  │              Core Layer (Singleton Services)              │    │
│  │  AuthService │ LessonApiService │ QuizApiService │ ...   │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │ HTTP (with auth token interceptor)        │
│  ─────────────────────┼─────────────────────────────────────────  │
│                       │ /api/*  (proxied in dev)                  │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│             Backend (Node.js + Express)             │
│                                                     │
│  /api/auth/*       → User authentication            │
│  /api/lessons/*    → Chapter/lesson CRUD            │
│  /api/quizzes/*    → Quiz questions + grading       │
│  /api/progress/*   → Student progress tracking      │
│  /api/assistant/*  → AI chat (Google Gemini proxy)  │
│  /api/admin/*      → Admin operations               │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │    MongoDB      │                     │
│              │  (data store)   │                     │
│              └────────┬────────┘                     │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │  Google Gemini  │                     │
│              │   (AI API)     │                     │
│              └─────────────────┘                     │
└───────────────────────────────────────────────────┘
```

### Key Architecture Decisions

1. **The frontend NEVER talks to Google Gemini directly** — it always goes through the backend as a proxy (`/api/assistant/chat`). This keeps the API key safe on the server.
2. **Every page is lazy-loaded** — the browser only downloads the code for a page when the user navigates to it.
3. **No global state library (no NgRx, no Akita)** — Angular Signals + Services handle all state.
4. **JWT-based authentication** — the token is stored in localStorage and attached to every HTTP request via an interceptor.

---

## 5. How the Application Boots

Here's exactly what happens when a user opens DriveReady:

### Step 1: `main.ts`
```typescript
bootstrapApplication(App, appConfig);
```
This is the entry point. It tells Angular: "Create the `App` component and use this configuration."

### Step 2: `app.config.ts` — Configuration
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),  // Catches unhandled errors
    provideRouter(routes),                  // Registers all routes
    provideAnimationsAsync(),               // Enables Material animations
    provideHttpClient(                      // Sets up HTTP with interceptors
      withInterceptors([authTokenInterceptor])
    ),
  ],
};
```

**What each provider does:**
- `provideBrowserGlobalErrorListeners()` — Angular 21 feature that sets up global error/rejection handlers
- `provideRouter(routes)` — Makes the router available and registers the 17 route definitions
- `provideAnimationsAsync()` — Loads Angular animations lazily (needed for Material components)
- `provideHttpClient(withInterceptors([authTokenInterceptor]))` — Every HTTP request passes through the `authTokenInterceptor` which attaches the JWT token

### Step 3: `App` component renders
The root component renders the shell: header (with navigation), `<router-outlet>` (where pages load), and footer. The router looks at the URL and loads the matching page component.

### Step 4: Session restoration
When `AuthService` is first injected (which happens immediately because `App` uses it), it calls `restoreSession()`:
```typescript
private readonly authUserState = signal<AuthUser | null>(this.restoreSession());
```
This reads from `localStorage` to check if the user was previously logged in, validating the stored data has the required fields (`_id`, `email`, `token`).

---

## 6. The Root Component (`App`)

**File:** `src/app/app.ts`

The root component is the **shell** that wraps every page. It provides:

### The Header
```
┌──────────────────────────────────────────────────────┐
│ 🚗 DriveReady    Home  Lessons  Quiz  ...   [User]   │
└──────────────────────────────────────────────────────┘
```

Two different headers based on auth state:

- **Logged in:** Shows nav links (Home, Lessons, Quiz, Progress, Assistant) + Admin link if admin + user chip + Logout
- **Not logged in:** Shows logo + "Sign In" + "Get Started Free" button

### Auto-Hiding Header on Scroll

The header hides when you scroll down and reappears when you scroll up. Here's how:

```typescript
protected onWindowScroll(): void {
  const currentScrollY = Math.max(window.scrollY || 0, 0);

  // Always show header when near the top
  if (currentScrollY <= 12) {
    this.headerHidden.set(false);
    this.lastScrollY = currentScrollY;
    return;
  }

  // Never hide when mobile menu is open
  if (this.mobileMenuOpen()) {
    this.headerHidden.set(false);
    this.lastScrollY = currentScrollY;
    return;
  }

  const delta = currentScrollY - this.lastScrollY;

  // Scroll down > 6px → hide; Scroll up > 6px → show
  if (delta > 6) {
    this.headerHidden.set(true);
  } else if (delta < -6) {
    this.headerHidden.set(false);
  }

  this.lastScrollY = currentScrollY;
}
```

The SCSS makes this smooth with `transform: translateY(-100%)` and `transition`.

### Mobile Responsive Navigation

At screen widths below 768px:
- The horizontal nav links collapse into a hamburger menu icon
- Clicking the hamburger opens a vertical slide-down menu
- All nav links stack vertically
- Clicking any link or the close button closes the menu

### The Router Outlet

```html
<main class="app-content">
  <router-outlet></router-outlet>
</main>
```

This is where every page component renders. When the user navigates to `/lessons`, the `LessonsPageComponent` loads here.

### The Footer

A simple footer with the copyright. Always sticks to the bottom thanks to the CSS grid layout:
```scss
:host {
  display: grid;
  grid-template-rows: auto 1fr auto;  // header, content (expands), footer
  min-height: 100vh;
}
```

---

## 7. Routing — Every Route Explained

**File:** `src/app/app.routes.ts`

The app has **17 routes** organized into 4 access levels:

### Public Routes (anyone can access)
| Path | Page | Purpose |
|------|------|---------|
| `/` | redirect → `/landing` | Default entry point |
| `/landing` | Landing Page | Marketing page to attract new users |
| `**` | redirect → `/landing` | Catch-all for unknown URLs |

### Guest-Only Routes (only when NOT logged in)
| Path | Page | Guard | Purpose |
|------|------|-------|---------|
| `/login` | Login Page | `guestGuard` | Email + password login form |
| `/register` | Register Page | `guestGuard` | Name + email + password signup form |

If a logged-in user tries to visit `/login`, the `guestGuard` redirects them to `/home`.

### Authenticated Routes (must be logged in)
| Path | Page | Guard | Purpose |
|------|------|-------|---------|
| `/home` | Home Dashboard | `authGuard` | Welcome screen + quick links + progress summary |
| `/lessons` | Lessons List | `authGuard` | Browse all chapters |
| `/lessons/:id` | Lesson Detail | `authGuard` | Read sub-lessons, mark complete |
| `/quiz` | Quiz Selection | `authGuard` | Choose chapter quiz or exam simulation |
| `/quiz/exam` | Exam Simulation | `authGuard` | Mixed questions from all chapters |
| `/quiz/chapter/:chapterTitle` | Chapter Quiz | `authGuard` | Questions from one specific chapter |
| `/progress` | Progress Dashboard | `authGuard` | View completion %, quiz stats |
| `/assistant` | AI Assistant | `authGuard` | Chat with AI about driving topics |

If a non-logged-in user tries to visit any of these, the `authGuard` redirects them to `/login`.

### Admin-Only Routes (must be admin)
| Path | Page | Guard | Purpose |
|------|------|-------|---------|
| `/admin` | Admin Dashboard | `adminGuard` | Platform stats, charts, activity feed |
| `/admin/users` | User Management | `adminGuard` | Search, edit, delete users |
| `/admin/documents` | Document Management | `adminGuard` | Upload, view, delete study materials |

The `adminGuard` has a two-layer check: not logged in → `/login`; logged in but not admin → `/home`.

### How Lazy Loading Works

Every route uses `loadComponent()` which tells Angular: "Don't include this component's code in the main bundle — download it only when the user navigates here."

```typescript
{
  path: 'lessons',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/lessons/pages/lessons-page.component').then(
      (m) => m.LessonsPageComponent,
    ),
},
```

**What this means in practice:**
- The initial page load is fast (small bundle)
- When the user clicks "Lessons" for the first time, Angular downloads that page's code in the background
- Subsequent visits are instant (the code is cached)

---

## 8. Core Layer — The Engine Room

The `core/` directory is the **backbone** of the application. Everything here is shared, singleton, and used by multiple features.

---

### 8.1 Data Models

Models are TypeScript interfaces that define the **shape of data** flowing through the app. They are purely structural — no logic, no methods.

#### Auth Models (`auth.models.ts`)

```typescript
export type UserRole = 'student' | 'admin';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {   // What the backend returns
  message: string;
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;                  // JWT token
}

export interface AuthUser {       // What the frontend stores
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}
```

**Key insight:** `AuthResponse` has a `message` field from the backend, but `AuthUser` strips it — the frontend only keeps what it needs for the session.

#### Lesson Models (`lesson.models.ts`)

```typescript
export interface SubLesson {
  title: string;
  content: string;                // The actual text content
}

export interface Chapter {
  _id: string;
  title: string;                  // e.g., "Traffic Signs"
  description: string;
  image: string;
  order: number;                  // Determines display order
  isPublished: boolean;
  lessons: SubLesson[];           // Array of sub-lessons within the chapter
  createdAt: string;
  updatedAt: string;
}
```

**Relationship:** A `Chapter` **contains** multiple `SubLesson`s. For example:
- Chapter: "Traffic Signs" contains sub-lessons like "Warning Signs", "Regulatory Signs", "Guide Signs"
- Chapter: "Right of Way" contains sub-lessons like "At Intersections", "Roundabouts", "Emergency Vehicles"

#### Quiz Models (`quiz.models.ts`)

```typescript
export interface QuizQuestion {
  _id: string;
  question: string;               // "What does a red octagon sign mean?"
  options: string[];               // ["Stop", "Yield", "Slow down", "Go"]
  correctAnswer?: string;          // Only present after submission
  chapterTitle: string;            // Links question to a chapter
  explanation?: string;            // "A red octagon is a stop sign..."
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface QuizSubmission {
  answers: QuizAnswer[];           // All answers sent at once
}

export interface QuizResult {
  score: number;                   // Percentage (0-100)
  totalQuestions: number;
  correct: number;
  results: QuizQuestionResult[];   // Per-question breakdown
}
```

**Important:** `correctAnswer` is **optional** on `QuizQuestion` — the backend doesn't send it when fetching questions (to prevent cheating). It only appears in `QuizQuestionResult` after submission.

#### Progress Models (`progress.models.ts`)

```typescript
export interface ChapterProgress {
  chapterId: string;
  title: string;
  description: string;
  totalSubLessons: number;
  completedSubLessons: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface ProgressSummary {
  overallProgress: number;         // 0-100 percentage
  lessons: ChapterProgress[];      // Per-chapter progress
  quizStats: QuizStats;            // Global quiz performance
}
```

#### Assistant Models (`assistant.models.ts`)

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];  // Previous messages for context
}

export interface ChatResponse {
  reply: string;
}
```

**Key:** The `conversationHistory` is sent with every message so the AI has context of the full conversation. This is how the AI "remembers" what you asked before.

#### Admin Models (`admin.models.ts`)

```typescript
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
  completionRate: number;            // 0-100, used for bar charts
}

export interface RecentActivity {
  _id: string;
  type: 'lesson_completion' | 'quiz_attempt' | 'registration';
  description: string;
  user: { _id: string; name: string };
  createdAt: string;
}
```

---

### 8.2 Route Guards

Guards are **gatekeepers** that decide whether a user can navigate to a route. All three guards are **functional** (not class-based — the modern Angular pattern).

#### `authGuard` — Protects authenticated routes

```typescript
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? true                               // Let them through
    : router.createUrlTree(['/login']);   // Redirect to login
};
```

**Used on:** `/home`, `/lessons`, `/lessons/:id`, `/quiz`, `/quiz/exam`, `/quiz/chapter/:chapterTitle`, `/progress`, `/assistant`

#### `guestGuard` — Protects guest-only routes

```typescript
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? router.createUrlTree(['/home'])    // Already logged in → go to dashboard
    : true;                              // Not logged in → show login/register
};
```

**Used on:** `/login`, `/register`

**Why this exists:** If a logged-in user bookmarked `/login` and opens it, they shouldn't see the login form — they should go straight to their dashboard.

#### `adminGuard` — Protects admin routes

```typescript
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);    // Not logged in → login
  }

  return authService.currentUser()?.role === 'admin'
    ? true                                      // Is admin → allow
    : router.createUrlTree(['/home']);           // Not admin → home
};
```

**Used on:** `/admin`, `/admin/users`, `/admin/documents`

### Guard Flow Diagram

```
User navigates to /admin/users
        │
        ▼
  Is authenticated?
   │           │
   No          Yes
   │           │
   ▼           ▼
→ /login    Is admin?
              │       │
              No      Yes
              │       │
              ▼       ▼
         → /home   ✅ Allow access
```

---

### 8.3 HTTP Interceptor

**File:** `src/app/core/interceptors/auth-token.interceptor.ts`

```typescript
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).currentUser()?.token;

  if (!token) {
    return next(request);                 // No token → send request as-is
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,  // Add JWT to every request
      },
    }),
  );
};
```

### How It Works

Every HTTP request in the app passes through this interceptor:

```
Component → Service → HttpClient → [INTERCEPTOR] → Backend
                                        │
                              Adds "Authorization: Bearer xyz..."
                              to the request headers
```

**Why `request.clone()`?** HTTP requests in Angular are **immutable**. You can't modify them — you create a copy with the changes.

**Why functional (not class-based)?** Angular's modern pattern. Instead of a class implementing `HttpInterceptor`, it's just a function. Simpler, less boilerplate.

---

### 8.4 Services

Services are **singleton classes** that handle business logic and API communication. They're `providedIn: 'root'`, meaning one instance exists for the entire app.

#### `AuthService` — The Session Manager

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // THE core state: who is logged in?
  private readonly authUserState = signal<AuthUser | null>(this.restoreSession());

  // Public computed properties (read-only views of the state)
  readonly currentUser = computed(() => this.authUserState());
  readonly isAuthenticated = computed(() => this.authUserState() !== null);
```

**The session lifecycle:**

```
1. User opens app
   → restoreSession() reads from localStorage
   → If valid data found → authUserState = user (logged in)
   → If no data → authUserState = null (guest)

2. User logs in
   → API call to /api/auth/login
   → Response stored in signal + localStorage
   → authUserState = user (logged in)
   → Toast: "Login successful. Welcome back!"

3. User logs out
   → authUserState = null
   → localStorage cleared
   → Navigate to /landing
   → Toast: "Logged out successfully."
```

**Session restoration (on page refresh):**
```typescript
private restoreSession(): AuthUser | null {
  const rawUser = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as AuthUser;
    // Validate that the essential fields exist
    if (!parsed._id || !parsed.email || !parsed.token) {
      return null;   // Corrupted data → treat as logged out
    }
    return parsed;
  } catch {
    return null;     // Invalid JSON → treat as logged out
  }
}
```

#### `AuthApiService` — Raw HTTP Calls for Auth

Separated from `AuthService` to keep concerns clean:
- `AuthService` = business logic (session management, toasts, navigation)
- `AuthApiService` = pure HTTP calls (POST login, POST register)

#### API Service Pattern (used by ALL services)

Every API service follows the exact same pattern:

```typescript
@Injectable({ providedIn: 'root' })
export class SomeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl || ''}/api/something`;

  getSomething(): Observable<Something[]> {
    return this.http
      .get<Something[]>(this.baseUrl)
      .pipe(catchError((error: HttpErrorResponse) => this.mapApiError(error)));
  }

  // Shared error handler
  private mapApiError(error: HttpErrorResponse): Observable<never> {
    // 1. Try to extract server error message
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      return throwError(() => new Error(String((error.error as { message: unknown }).message)));
    }
    // 2. Network error (server unreachable)
    if (error.status === 0) {
      return throwError(() => new Error('Cannot connect to backend.'));
    }
    // 3. Generic fallback
    return throwError(() => new Error('Request failed. Please try again.'));
  }
}
```

**Why `mapApiError()`?** The backend returns errors as `{ message: "Email already exists" }`. This method extracts that human-readable message so the UI can show it as a toast.

#### `ToastService` — Notification System

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void { this.open(message, ['toast-success']); }
  error(message: string): void   { this.open(message, ['toast-error']); }
  info(message: string): void    { this.open(message, ['toast-info']); }

  private open(message: string, panelClass: string[]): void {
    this.snackBar.open(message, 'Close', {
      duration: 3200,              // Auto-dismiss after 3.2 seconds
      horizontalPosition: 'end',   // Right side
      verticalPosition: 'top',     // Top of screen
      panelClass,                  // Custom CSS class for color
    });
  }
}
```

Used throughout the app for feedback:
- Green toast: "Login successful. Welcome back!"
- Red toast: "Email already exists."
- Blue toast: "Logged out successfully."

---

### 8.5 Validators

#### `matchValidator` — Password Confirmation

```typescript
export function matchValidator(controlName: string, matchingControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl) return null;

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ ...matchingControl.errors, mismatch: true });
      return { mismatch: true };
    }

    // Clear the mismatch error if values now match
    if (matchingControl.errors?.['mismatch']) {
      const { mismatch, ...remainingErrors } = matchingControl.errors;
      matchingControl.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    }

    return null;
  };
}
```

**Used in:** Register page — ensures `password` and `confirmPassword` fields match.

**How it works:**
1. It's a **group-level validator** (applied to the FormGroup, not individual controls)
2. Compares two fields by name
3. Sets a `mismatch` error on the confirmation field if values differ
4. Cleans up the error when they match again (without removing other errors like `required`)

---

### 8.6 Pipes

#### `UserRolePipe` — Display-Friendly Role Names

```typescript
@Pipe({ name: 'userRole', standalone: true })
export class UserRolePipe implements PipeTransform {
  transform(role: string | null | undefined): string {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'student': return 'Student';
      default: return 'Guest';
    }
  }
}
```

Used in templates like: `{{ user.role | userRole }}` → Shows "Administrator" instead of "admin".

---

## 9. Feature Modules — Page by Page

---

### 9.1 Landing Page

**Files:** `features/landing/pages/landing-page.component.*`

The public marketing page that visitors see before signing up.

**Sections:**
1. **Animated background** — Decorative colored squares sliding horizontally (CSS keyframes)
2. **Hero section** — Trust badge, headline ("Master Your Driving Skills"), subtitle, two CTA buttons, stats row
3. **Features grid** — 4 cards (Structured Lessons, Practice Quizzes, AI Assistant, Track Progress) that animate in on scroll
4. **How It Works** — 3-step flow with connected animation lines
5. **Bottom CTA** — Gradient section encouraging signup

**Code highlight — Scroll reveal animations:**
```typescript
private setupScrollAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);   // Only animate once
        }
      });
    },
    { threshold: 0.15 },                      // Trigger when 15% visible
  );

  // Observe all elements with the .scroll-reveal class
  this.ngZone.runOutsideAngular(() => {
    // Running outside Angular → no unnecessary change detection
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
  });
}
```

**Why `runOutsideAngular()`?** The IntersectionObserver fires frequently as the user scrolls. Running it outside Angular's zone means these callbacks don't trigger change detection — better performance.

---

### 9.2 Authentication (Login & Register)

**Files:** `features/auth/pages/login-page.component.*`, `register-page.component.*`, `styles/_auth-shared.scss`

Both pages use a **split-screen layout:**

```
┌──────────────────┬──────────────────┐
│                  │                  │
│   Gradient       │   Form           │
│   Branding       │   Fields         │
│   + Features     │   + Actions      │
│                  │                  │
│  (hidden on      │                  │
│   mobile)        │                  │
└──────────────────┴──────────────────┘
```

#### Login Page

**Form setup:**
```typescript
protected readonly loginForm = inject(FormBuilder).nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required]],
});
```

**Submit flow:**
```typescript
protected onSubmit(): void {
  if (this.loginForm.invalid || this.loading()) return;

  this.loading.set(true);
  const { email, password } = this.loginForm.getRawValue();

  this.authService
    .login({ email, password })
    .pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: () => void this.router.navigateByUrl('/home'),
      error: () => { /* toast handled by AuthService */ },
    });
}
```

**Demo accounts info box** — Shows two test accounts:
- `student@driving.com` / `password123` (Student)
- `admin@driving.com` / `password123` (Admin)

#### Register Page

Same layout pattern but with additional fields:
- **Name**: 2-50 characters (`Validators.minLength(2)`, `Validators.maxLength(50)`)
- **Email**: Valid email format
- **Password**: Minimum 6 characters
- **Confirm Password**: Must match password (uses `matchValidator`)

```typescript
protected readonly registerForm = inject(FormBuilder).nonNullable.group(
  {
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  },
  { validators: matchValidator('password', 'confirmPassword') },
);
```

---

### 9.3 Home Dashboard

**Files:** `features/home/pages/home-page.component.*`

The first page users see after logging in. A personal dashboard showing:

```
┌──────────────────────────────────────────────┐
│ Welcome Card (gradient)                       │
│ "Welcome back, [Name]!"                       │
└──────────────────────────────────────────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Start    │ │ Take a   │ │ View     │
│ Learning │ │ Quiz     │ │ Progress │
│ [link]   │ │ [link]   │ │ [link]   │
└──────────┘ └──────────┘ └──────────┘
┌─────────────────────┐ ┌────────────────────┐
│ Quick Progress      │ │ Quiz Performance   │
│ [overall bar]       │ │ Last Score: 85%    │
│ [chapter bars...]   │ │ Attempts: 12       │
│                     │ │ Average: 78%       │
└─────────────────────┘ └────────────────────┘
┌──────────────────────────────────────────────┐
│ Quick Links: AI Assistant | Exam Simulation   │
└──────────────────────────────────────────────┘
```

**Data loading:**
```typescript
constructor() {
  this.progressApi
    .getProgressSummary()
    .pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((summary) => this.summary.set(summary));
}
```

---

### 9.4 Lessons

#### Lessons List Page (`lessons-page.component.*`)

Shows a card grid of all chapters. Uses `forkJoin` to load chapters AND progress simultaneously:

```typescript
forkJoin({
  chapters: this.lessonApi.getLessons(),
  progress: this.progressApi.getProgressSummary(),
})
```

This fires both API calls in parallel (not sequentially!), then combines the results. Each chapter card shows:
- Title, description
- Number of sub-lessons
- Status badge: "Completed" (green), "In Progress" (amber), "Not Started" (gray)

A `Map<string, ChapterProgress>` is built for fast O(1) lookup of each chapter's progress.

#### Lesson Detail Page (`lesson-detail-page.component.*`)

When you click a chapter, this page shows:
- Chapter title and description
- Numbered list of sub-lessons
- Content display for each sub-lesson
- "Mark as Complete" button

**Completing a sub-lesson:**
```typescript
protected markComplete(subLessonTitle: string): void {
  const ch = this.chapter();
  if (!ch || this.completing()) return;    // Prevent double-clicks

  this.completing.set(subLessonTitle);     // Show loading on this specific button

  this.lessonApi
    .completeSubLesson(ch._id, subLessonTitle)
    .pipe(
      finalize(() => this.completing.set(null)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: () => {
        this.completedSet.update((set) => {
          const newSet = new Set(set);
          newSet.add(subLessonTitle);
          return newSet;
        });
        this.toast.success(`"${subLessonTitle}" marked as complete!`);
      },
      error: (err: Error) => this.toast.error(err.message),
    });
}
```

**Why a `Set<string>`?** To efficiently check if a sub-lesson is completed: `this.completedSet().has(title)` — O(1) lookup instead of searching an array.

---

### 9.5 Quiz System

The quiz system has two pages:

#### Quiz Selection Page (`quiz-page.component.*`)

```
┌──────────────────────────────────────────────┐
│ 🎯 Exam Simulation (hero card)               │
│ "Test your knowledge with a full mock exam"   │
│ [Start Exam]                                 │
└──────────────────────────────────────────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Traffic  │ │ Right of │ │ Road     │
│ Signs    │ │ Way      │ │ Safety   │
│ [Start]  │ │ [Start]  │ │ [Start]  │
└──────────┘ └──────────┘ └──────────┘
```

Two quiz modes:
- **Exam Simulation** → navigates to `/quiz/exam` → fetches mixed questions from all chapters
- **Chapter Quiz** → navigates to `/quiz/chapter/Traffic%20Signs` → fetches questions from one chapter

#### Quiz Session Page (`quiz-session-page.component.*`)

The actual quiz-taking experience. **One question at a time**, not all at once.

**State management (all signals):**
```typescript
protected readonly loading = signal(true);
protected readonly submitting = signal(false);
protected readonly questions = signal<QuizQuestion[]>([]);
protected readonly currentIndex = signal(0);
protected readonly answers = signal<Map<string, string>>(new Map());
protected readonly result = signal<QuizResult | null>(null);
protected readonly mode = signal<QuizMode>('chapter');
```

**How mode detection works (in constructor):**
```typescript
const chapterTitle = snapshot.paramMap.get('chapterTitle');

if (chapterTitle) {
  // URL: /quiz/chapter/Traffic%20Signs → chapter mode
  this.mode.set('chapter');
  this.quizApi.getQuizzesByChapter(chapterTitle)...
} else {
  // URL: /quiz/exam → exam mode
  this.mode.set('exam');
  this.quizApi.getExamQuestions()...
}
```

**The same component handles both modes** — the URL parameter determines which API to call.

**Answer selection:**
```typescript
protected selectAnswer(questionId: string, answer: string): void {
  this.answers.update((map) => {
    const newMap = new Map(map);
    newMap.set(questionId, answer);
    return newMap;
  });
}
```

**Why `new Map(map)` instead of mutating?** Because signals only trigger updates when the reference changes. If you mutate the existing Map, the signal won't know anything changed.

**Score display:**
- 70%+: Green (good)
- 50-69%: Amber (okay)
- Below 50%: Red (poor)

**After submission:** Shows per-question breakdown with correct/incorrect indicators and explanations.

---

### 9.6 Progress Tracking

**Files:** `features/progress/pages/progress-page.component.*`

```
┌──────────────────────────────────────────────┐
│        ┌─────────┐                            │
│        │  72%    │   Your Learning            │
│        │ ●●●●●○○│   Progress                 │
│        └─────────┘                            │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Last: 85%│ │ Total: 12│ │ Avg: 78% │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                               │
│  Traffic Signs     ██████████░░  8/10         │
│  Right of Way      ████░░░░░░░░  3/10         │
│  Road Safety       ░░░░░░░░░░░░  0/8          │
│                                               │
│  ⚠️ Reset Progress                            │
└──────────────────────────────────────────────┘
```

**Data source:** A single API call — `GET /api/progress/summary` — returns everything:
```typescript
{
  overallProgress: 72,
  lessons: [
    { title: "Traffic Signs", totalSubLessons: 10, completedSubLessons: 8, status: "In Progress" },
    ...
  ],
  quizStats: { totalAttempts: 12, lastScore: 85, averageScore: 78 }
}
```

**Reset feature:** Calls `DELETE /api/progress/reset` after a native `confirm()` dialog. Resets all lesson completions and quiz stats.

---

### 9.7 AI Assistant — The Role of AI

**Files:** `features/assistant/pages/assistant-page.component.*`

This is the AI-powered chat interface. A full chat experience:

```
┌──────────────────────────────────────────────┐
│  DriveReady AI Assistant                      │
│──────────────────────────────────────────────│
│                                               │
│                        ┌─────────────────┐   │
│                        │ What does a red  │   │
│                        │ triangle sign    │   │
│                        │ mean?            │   │
│                        └─────────────────┘   │
│  ┌─────────────────┐                         │
│  │ A red triangle   │                         │
│  │ is a warning     │                         │
│  │ sign that alerts │                         │
│  │ drivers to...    │                         │
│  └─────────────────┘                         │
│                                               │
│──────────────────────────────────────────────│
│ [Type your message...              ] [Send]   │
└──────────────────────────────────────────────┘
```

**The complete flow of a message:**

```typescript
protected sendMessage(): void {
  const text = this.inputText().trim();
  if (!text || this.loading()) return;

  // 1. Add user message to the chat immediately
  const userMessage: ChatMessage = { role: 'user', content: text };
  this.messages.update((msgs) => [...msgs, userMessage]);
  this.inputText.set('');
  this.loading.set(true);

  // 2. Build conversation history (for AI context)
  const conversationHistory = this.messages()
    .filter((m) => m !== userMessage)
    .map(({ role, content }) => ({ role, content }));

  // 3. Send to backend → backend sends to Google Gemini → returns response
  this.assistantApi
    .sendMessage({ message: text, conversationHistory })
    .pipe(
      finalize(() => {
        this.loading.set(false);
        this.scrollToBottom();
      }),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: (response) => {
        // 4. Add AI response to the chat
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: response.reply }
        ]);
      },
      error: () => {
        // 5. Show error message in the chat itself
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: "I'm sorry, something went wrong." }
        ]);
      },
    });
}
```

**Keyboard shortcut:** Enter sends the message, Shift+Enter does NOT (prevents accidental sends when you want a newline).

**Auto-scroll:** After every message (sent or received), the chat scrolls to the bottom:
```typescript
private scrollToBottom(): void {
  setTimeout(() => {
    const container = this.chatContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}
```
The `setTimeout` is needed because Angular hasn't rendered the new message yet when this runs. Wrapping it in setTimeout pushes it to the next tick, after the DOM update.

---

### 9.8 Admin Panel

The admin panel has 3 pages — only accessible to users with `role: 'admin'`.

#### Admin Dashboard (`admin-dashboard-page.component.*`)

The main admin overview. Loads all data in parallel:

```typescript
forkJoin({
  stats: this.adminApi.getDashboardStats(),
  chapters: this.adminApi.getChapterReports(),
  activity: this.adminApi.getRecentActivity(),
}).pipe(...)
```

**Sections:**
- **Stats cards:** Total Users, Chapters, Sub-Lessons, Documents
- **Chapter completion chart:** Horizontal bar chart built with pure CSS (no chart library!)
  ```html
  <div class="bar-fill" [style.width.%]="chapter.completionRate"></div>
  ```
  Color-coded: 70%+ green, 40-69% amber, below 40% red
- **Content table:** Per-chapter metrics (sub-lessons, quizzes, completion bar)
- **Activity feed:** Recent events (lesson completions, quiz attempts, registrations)

#### User Management (`admin-users-page.component.*`)

A searchable, editable table of all users.

**Search:** Filters clients by name, email, or role:
```typescript
protected readonly filteredUsers = computed(() => {
  const term = this.searchTerm().toLowerCase();
  return this.users().filter(
    (u) =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term),
  );
});
```

**Inline editing:** Click "Edit" → the table row transforms into input fields → "Save" or "Cancel"

#### Document Management (`admin-documents-page.component.*`)

Upload, view, and delete study materials.

**Upload flow:**
```typescript
protected onFileSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  this.uploading.set(true);
  this.adminApi
    .uploadDocument(file)          // Sends as FormData
    .pipe(finalize(() => this.uploading.set(false)))
    .subscribe({
      next: (doc) => {
        this.documents.update((docs) => [doc, ...docs]);  // Prepend new doc
        this.toast.success('Document uploaded successfully!');
      },
    });
}
```

**File size formatting:**
```typescript
protected formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
```

---

## 10. The Role of AI — Detailed Explanation

### What the AI Does

The AI in DriveReady is a **driving education chatbot** powered by **Google Gemini** (Google's large language model). Its role:

1. **Answers driving-related questions** — "What's the speed limit in a school zone?", "Explain the right-of-way rules at a 4-way stop"
2. **Explains concepts** — Students can ask about road signs, traffic laws, driving techniques
3. **Maintains conversation context** — It remembers what you asked earlier in the chat session
4. **Available 24/7** — Unlike a human instructor, the AI is always available

### How AI Integration Works (Frontend → Backend → Gemini)

```
┌──────────┐         ┌──────────┐         ┌──────────────┐
│ Frontend │  POST   │ Backend  │  API    │ Google       │
│ Angular  │────────→│ Express  │────────→│ Gemini       │
│          │         │          │         │              │
│          │  JSON   │          │  JSON   │  Generates   │
│          │←────────│          │←────────│  response    │
└──────────┘         └──────────┘         └──────────────┘
```

**Step by step:**

1. **User types a question** in the chat interface
2. **Frontend sends** `POST /api/assistant/chat`:
   ```json
   {
     "message": "What does a yield sign look like?",
     "conversationHistory": [
       { "role": "user", "content": "What are the basic traffic signs?" },
       { "role": "assistant", "content": "The basic traffic signs include..." }
     ]
   }
   ```
3. **Backend receives** the request, formats it for Google Gemini's API, and sends it
4. **Google Gemini** processes the prompt (with driving context set by the backend) and generates a response
5. **Backend returns** `{ "reply": "A yield sign is a downward-pointing red and white triangle..." }`
6. **Frontend displays** the response as a chat bubble

### Why the Frontend Doesn't Call Gemini Directly

- **Security:** The Gemini API key must stay on the server, never exposed to the browser
- **Control:** The backend can add system prompts (like "You are a driving instructor") that the user can't override
- **Rate limiting:** The backend can throttle requests to prevent abuse

### Conversation History — How Context Works

The frontend sends ALL previous messages with each request. This is how the AI "remembers" the conversation:

```
Turn 1: User: "What are speed limits?"
         → sent with conversationHistory: []

Turn 2: User: "What about in school zones?"
         → sent with conversationHistory: [
             { role: "user", content: "What are speed limits?" },
             { role: "assistant", content: "Speed limits are..." }
           ]
```

The AI sees the full conversation history and understands that "in school zones" refers to speed limits.

**Important:** The conversation is stored in a `signal<ChatMessage[]>()` on the frontend. It is **NOT persisted** — if the user refreshes the page, the chat is gone. This is a design choice, not a bug.

---

## 11. State Management — How Data Flows

DriveReady uses **Angular Signals** instead of NgRx or other state libraries.

### What Are Signals?

Signals are Angular's built-in reactive primitives:

```typescript
// Create a signal (writable)
const count = signal(0);

// Read its value
console.log(count());  // 0

// Update it
count.set(5);
count.update(v => v + 1);  // 6

// Computed signal (derived, read-only)
const doubled = computed(() => count() * 2);  // 12
```

### State Architecture in DriveReady

```
┌─────────────────────────────────────────────────┐
│                    AuthService                    │
│  ┌─────────────────────────────────────────┐     │
│  │ authUserState = signal<AuthUser | null>  │    │
│  └─────────────────────┬───────────────────┘     │
│          │              │                         │
│   ┌──────▼─────┐  ┌────▼────────────┐           │
│   │ currentUser│  │isAuthenticated  │           │
│   │ (computed) │  │(computed)       │           │
│   └──────┬─────┘  └────┬───────────┘           │
│          │              │                         │
└──────────┼──────────────┼─────────────────────────┘
           │              │
    ┌──────▼──────┐  ┌────▼────────────┐
    │ App (header)│  │ Guards          │
    │ Admin Pages │  │ Interceptor     │
    └─────────────┘  └─────────────────┘
```

### How Components Manage Their Own State

Every component uses the same pattern:

```typescript
// 1. Source state: data loaded from API
protected readonly data = signal<SomeType | null>(null);

// 2. UI state: loading indicators
protected readonly loading = signal(true);

// 3. Derived state: computed from source
protected readonly isEmpty = computed(() => this.data()?.length === 0);

// 4. Load data in constructor
constructor() {
  this.someApi.getData()
    .pipe(
      finalize(() => this.loading.set(false)),      // Always stop loading
      takeUntilDestroyed(this.destroyRef),           // Auto-unsubscribe
    )
    .subscribe((data) => this.data.set(data));
}
```

**Three consistent patterns across ALL components:**

| Pattern | What It Does | Why |
|---------|-------------|-----|
| `finalize(() => this.loading.set(false))` | Stops the loading spinner regardless of success/error | Prevents infinite spinners on errors |
| `takeUntilDestroyed(this.destroyRef)` | Automatically unsubscribes when component is destroyed | Prevents memory leaks |
| `signal.update(fn)` with `new Map/Set/Array` | Creates new references when updating collections | Signals only react to reference changes |

---

## 12. Theming & Design System

### CSS Custom Properties (Design Tokens)

Defined in `src/styles.scss`:

```scss
:root {
  --dr-primary: #4338ca;        // Indigo 700 — main brand color
  --dr-primary-dark: #3730a3;   // Indigo 800 — hover states
  --dr-primary-light: #6366f1;  // Indigo 500 — lighter accents
  --dr-accent-green: #059669;   // Emerald 600 — success, completion
  --dr-accent-green-dark: #047857;
  --dr-bg-light: #f8f9fc;       // Page background
  --dr-text: #1e293b;           // Main text color
  --dr-text-muted: #64748b;     // Secondary text
  --dr-surface: #ffffff;        // Card backgrounds
  --dr-border: #e5e7eb;         // Borders
}
```

**Color meaning:**
- **Indigo** = Primary brand, navigation, buttons, links
- **Green/Emerald** = Success, completion, positive outcomes
- **Amber/Yellow** = In progress, warnings, medium scores
- **Red** = Errors, poor scores, delete actions
- **Gray** = Not started, muted text, borders

### Angular Material Theme (`styles/theme.scss`)

```scss
$dr-primary: mat.m2-define-palette(
  (50: #eef2ff, 100: #e0e7ff, ..., 700: #4338ca, ...),
  700, 500, 900
);

$dr-accent: mat.m2-define-palette(
  (50: #f0fdfa, ..., 500: #14b8a6, ...),
  500, 300, 700
);

$dr-theme: mat.m2-define-light-theme((
  color: (primary: $dr-primary, accent: $dr-accent, warn: $dr-warn),
  typography: mat.m2-define-typography-config($font-family: 'Montserrat, sans-serif'),
));
```

### Toast Notification Colors

```scss
.toast-success { background: #1f7a40; }  // Deep green
.toast-error   { background: #b4232f; }  // Deep red
.toast-info    { background: #1f3b64; }  // Deep blue
```

### Global Scrollbar Hidden

```scss
html { scrollbar-width: none; }           // Firefox
html::-webkit-scrollbar { display: none; } // Chrome/Safari
```

This creates a clean, app-like feel without visible scrollbars.

---

## 13. Backend API Contract

Every API endpoint the frontend calls, organized by service:

### Authentication (`/api/auth`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| POST | `/api/auth/login` | `{ email, password }` | `AuthResponse` (user + token) | Log in |
| POST | `/api/auth/register` | `{ name, email, password }` | `AuthResponse` (user + token) | Sign up |

### Lessons (`/api/lessons`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| GET | `/api/lessons` | — | `Chapter[]` | List all chapters |
| GET | `/api/lessons/:id` | — | `Chapter` | Get one chapter with sub-lessons |
| POST | `/api/lessons/:id/complete` | `{ subLessonTitle }` | `CompleteSubLessonResponse` | Mark a sub-lesson done |

### Quizzes (`/api/quizzes`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| GET | `/api/quizzes/chapter/:title` | — | `QuizQuestion[]` | Get chapter questions |
| GET | `/api/quizzes/exam` | — | `QuizQuestion[]` | Get mixed exam questions |
| POST | `/api/quizzes/submit` | `QuizSubmission` | `QuizResult` | Submit answers, get score |

### Progress (`/api/progress`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| GET | `/api/progress/summary` | — | `ProgressSummary` | Get all progress data |
| DELETE | `/api/progress/reset` | — | `{ message }` | Reset all progress |

### AI Assistant (`/api/assistant`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| POST | `/api/assistant/chat` | `ChatRequest` | `ChatResponse` | Send message to AI |

### Admin (`/api/admin`)
| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| GET | `/api/admin/users` | — | `AdminUser[]` | List all users |
| PUT | `/api/admin/users/:id` | `UpdateUserPayload` | `AdminUser` | Edit a user |
| DELETE | `/api/admin/users/:id` | — | `{ message }` | Delete a user |
| GET | `/api/admin/documents` | — | `AdminDocument[]` | List documents |
| POST | `/api/admin/documents` | `FormData` (file) | `AdminDocument` | Upload document |
| DELETE | `/api/admin/documents/:id` | — | `{ message }` | Delete document |
| GET | `/api/admin/dashboard/stats` | — | `DashboardStats` | Platform stats |
| GET | `/api/admin/dashboard/chapters` | — | `ChapterReport[]` | Chapter metrics |
| GET | `/api/admin/dashboard/activity` | — | `RecentActivity[]` | Recent events |

---

## 14. Architectural Patterns & Conventions

### Pattern 1: 100% Standalone Components
Every component in the project is standalone — no `NgModule` anywhere. Angular's modern direction.

```typescript
@Component({
  selector: 'app-some-page',
  imports: [RouterLink, MatProgressSpinnerModule],  // Imports directly on component
  templateUrl: './some-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SomePageComponent { }
```

### Pattern 2: `inject()` Instead of Constructor Injection
Old way:
```typescript
constructor(private http: HttpClient, private router: Router) { }
```

DriveReady's way (modern):
```typescript
private readonly http = inject(HttpClient);
private readonly router = inject(Router);
```

**Why?** Works with standalone components, less verbose, type-safe without decorators.

### Pattern 3: OnPush Change Detection Everywhere
Every component uses `ChangeDetectionStrategy.OnPush`. This means Angular only checks for changes when:
- A signal value changes
- An `@Input` reference changes
- An event (click, keypress) fires inside the component
- An async pipe emits

**Why?** Better performance — Angular checks only when it needs to, not on every mouse move or timer tick.

### Pattern 4: Modern Template Syntax (`@if`, `@for`)
Old way:
```html
<div *ngIf="loading">Loading...</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

DriveReady's way:
```html
@if (loading()) {
  <div>Loading...</div>
} @else {
  @for (item of items(); track item._id) {
    <div>{{ item.name }}</div>
  }
}
```

**Why?** Built into the template compiler, better type checking, more readable, better performance (especially `@for` with `track`).

### Pattern 5: Consistent Error Handling
Every API service has the same `mapApiError()` method that:
1. Extracts the server's error message (e.g., "Email already exists")
2. Handles network errors (server unreachable)
3. Falls back to a generic message

### Pattern 6: `finalize` + `takeUntilDestroyed`
Every subscription uses both:
```typescript
this.api.getData()
  .pipe(
    finalize(() => this.loading.set(false)),     // Run on complete OR error
    takeUntilDestroyed(this.destroyRef),          // Unsubscribe on destroy
  )
  .subscribe(...)
```

This guarantees:
- Loading spinners always stop (even on error)
- No memory leaks from forgotten subscriptions

---

## 15. Relationship Diagram — How Everything Connects

### Data Entity Relationships

```
              ┌─────────────┐
              │    User      │
              │ (student/    │
              │  admin)      │
              └──────┬───────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
    ┌─────▼──┐  ┌───▼────┐  ┌─▼──────────┐
    │Progress│  │Quiz    │  │Chat        │
    │Summary │  │Results │  │Messages    │
    └────┬───┘  └───┬────┘  └────────────┘
         │          │
    ┌────▼──────────▼────┐
    │     Chapters        │
    │  ┌───────────────┐  │
    │  │  SubLesson 1  │  │
    │  │  SubLesson 2  │  │
    │  │  SubLesson 3  │  │
    │  └───────────────┘  │
    │                     │
    │  ┌───────────────┐  │
    │  │ Quiz Questions │  │
    │  │  (linked by    │  │
    │  │  chapterTitle) │  │
    │  └───────────────┘  │
    └─────────────────────┘
```

### Service Dependency Graph

```
App Component
  └── AuthService
        ├── AuthApiService → HttpClient
        ├── ToastService → MatSnackBar
        └── Router

HomePageComponent
  └── ProgressApiService → HttpClient

LessonsPageComponent
  ├── LessonApiService → HttpClient
  └── ProgressApiService → HttpClient

LessonDetailPageComponent
  ├── LessonApiService → HttpClient
  ├── ProgressApiService → HttpClient
  └── ToastService

QuizSessionPageComponent
  ├── QuizApiService → HttpClient
  └── ToastService

ProgressPageComponent
  ├── ProgressApiService → HttpClient
  └── ToastService

AssistantPageComponent
  └── AssistantApiService → HttpClient

AdminDashboardPageComponent
  └── AdminApiService → HttpClient

AdminUsersPageComponent
  ├── AdminApiService → HttpClient
  └── ToastService

AdminDocumentsPageComponent
  ├── AdminApiService → HttpClient
  └── ToastService
```

### User Journey Flows

**Student Flow:**
```
Landing → Register → Home → Lessons → Read Sub-Lessons → Mark Complete
                        │                                      │
                        ├─→ Quiz → Select Chapter/Exam → Answer Questions → View Results
                        │                                      │
                        ├─→ Progress → See Overall % ←─────────┘
                        │
                        └─→ Assistant → Ask AI Questions → Get Answers
```

**Admin Flow:**
```
Login → Home → Admin Dashboard → See Stats & Charts
                   │
                   ├─→ User Management → Search/Edit/Delete Users
                   │
                   └─→ Document Management → Upload/View/Delete Files
```

---

## Summary

DriveReady is a well-structured Angular 21 application with:
- **8 feature areas** (Landing, Auth, Home, Lessons, Quiz, Progress, Assistant, Admin)
- **14 page components** — all standalone, all OnPush, all lazy-loaded
- **8 singleton services** — handling auth, API calls, and notifications
- **3 route guards** — controlling access based on authentication and role
- **1 HTTP interceptor** — automatically attaching JWT tokens
- **Angular Signals** for all state management — no external library
- **Modern patterns** — functional guards, `inject()`, `@if`/`@for`, `signal()`/`computed()`

The AI assistant integrates Google Gemini through the backend as a proxy, maintaining conversation context by sending the full chat history with each message.
