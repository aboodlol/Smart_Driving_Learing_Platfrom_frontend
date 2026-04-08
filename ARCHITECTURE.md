# Smart Driving Learning - Simple Angular Architecture

This project is intentionally simple for academic learning while still using modern Angular standards.

## Main Stack

- Angular 21 standalone components
- Angular Material for components and toast notifications
- Bootstrap grid/utilities for responsive layout
- Reactive Forms for login/register
- Signals for application state

## Folder Design

- `src/app/core`: singleton services and framework-level logic
- `src/app/features`: page-level features (`auth`, `home`)
- `src/app/core/models`: shared interfaces (DTO and UI models)
- `src/styles`: theme-level SCSS

## Design Patterns Used

1. Facade Pattern
- `AuthService` is the app-facing facade for auth state and session behavior.
- Components do not talk directly to API implementation details.

2. Repository/Gateway Style (Mock API)
- `AuthApiService` simulates backend endpoints (`register`, `login`) with delayed Observables.
- Real HTTP calls can replace this service later without changing UI components.

3. Route Guard Pattern
- `authGuard` protects private pages.
- `guestGuard` prevents logged-in users from revisiting the auth page.

4. Interceptor Pattern
- `authTokenInterceptor` adds `Authorization: Bearer <token>` automatically for future APIs.

5. Presentation + State Separation
- Feature components handle UI and reactive forms.
- Core services handle business logic and side effects.

## Current Mocked Endpoints (Frontend Simulation)

- POST /api/auth/register (real backend call)
- POST /api/auth/login (real backend call)
- logout (frontend session clear)
- home overview data (still mocked service)

## How To Extend

1. Replace `AuthApiService` logic with `HttpClient` calls to your backend URLs.
2. Keep `AuthService` as facade so pages remain unchanged.
3. Add new feature folders under `src/app/features` and protect routes with guards as needed.
