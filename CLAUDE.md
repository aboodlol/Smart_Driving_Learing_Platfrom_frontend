# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at localhost:4200 (with API proxy)
npm run build      # Production build → dist/
npm test           # Unit tests via Vitest
npm run watch      # Dev watch mode
```

The dev server proxies `/api/*` requests to `http://localhost:3000` via [proxy.conf.json](proxy.conf.json).

## Architecture

**Angular 21 standalone SPA** — no NgModules anywhere. All components are standalone with `OnPush` change detection.

### Key files

| File | Role |
|------|------|
| [src/app/app.config.ts](src/app/app.config.ts) | Root providers (HTTP, router, APP_INITIALIZER) |
| [src/app/app.routes.ts](src/app/app.routes.ts) | All routes with guards and lazy `loadComponent()` |
| [src/app/app.ts](src/app/app.ts) | Root component — nav, mobile menu, theme/lang init |
| [src/styles.scss](src/styles.scss) | Global styles, Tailwind imports, CSS theme tokens |

### Feature structure

Features live under [src/app/features/](src/app/features/): `landing`, `auth`, `home`, `lessons`, `quiz`, `progress`, `assistant`, `admin`. Each has its own pages folder with standalone components. All feature routes are lazy-loaded.

### Core layer

[src/app/core/](src/app/core/) contains:
- **Services** — `AuthService` (signals-based auth state), `I18nService`, `ThemeService`, plus `*-api.service.ts` wrappers for every backend endpoint
- **Guards** — `authGuard`, `guestGuard`, `adminGuard` (functional `CanActivateFn`)
- **Interceptors** — `authTokenInterceptor` attaches `Bearer <token>` to every outgoing request
- **Models** — TypeScript interfaces per domain (`auth`, `lesson`, `quiz`, `progress`, `admin`, `assistant`, `exam-attempt`)
- **Pipes** — `TranslatePipe` for i18n, `UserRolePipe`

### State management

No NgRx. Uses **Angular Signals** for reactive state. `AuthService` exposes `currentUser` and `isAuthenticated` computed signals. API services return `Observable<T>` and components subscribe locally with `takeUntilDestroyed()`.

### i18n

Custom lightweight solution — no ngx-translate. `I18nService` loads `public/i18n/en.json` or `public/i18n/ar.json` and exposes a `translate(key)` method. The service is bootstrapped via `APP_INITIALIZER` so translations are ready before first render. Use `TranslatePipe` in templates. Arabic switches `document.dir` to `rtl`. Language preference is stored in `localStorage` under `drivewise.language`.

### Theming

`ThemeService` toggles dark/light mode. Themes are implemented as CSS custom properties (design tokens) in [src/styles.scss](src/styles.scss). Default is dark. Preference stored in `localStorage` under `dw-theme`.

### Adding a new feature

1. Create a folder under `src/app/features/<name>/pages/`
2. Add a standalone component with `OnPush`
3. Add a lazy route in [app.routes.ts](src/app/app.routes.ts) using `loadComponent()`
4. If backend calls are needed, add an `*-api.service.ts` under `src/app/core/services/` following the existing pattern (inject `HttpClient`, use `environment.backendUrl` as base)
5. Add translation keys to both `public/i18n/en.json` and `public/i18n/ar.json`

### Backend / environment

Dev uses an empty `backendUrl` — the proxy handles `/api/*` → `localhost:3000`. For production, set `backendUrl` in the environment file. HTTP error mapping is standardized across all API services; follow the same pattern when adding new ones.

## Styling

Tailwind CSS 4.x via PostCSS alongside per-component SCSS. Use Tailwind utility classes for layout and spacing; use CSS custom properties (`var(--color-primary)`, etc.) for theme-aware colors.
