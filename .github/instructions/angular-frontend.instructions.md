---
applyTo: "**/*.{ts,html,scss}"
---

# Frontend (Angular) instructions

## Core rules

- Standalone Angular components. Strict TypeScript. RxJS for async/state.
- No `any`. Use DTOs from `C:/aidocs/<project>/API.md`.
- Components: smart/dumb split. Services: stateless except via signals/stores.
- Validate every form input; surface server errors via the global handler in `core/`.
- All API calls go through the core interceptor — never `HttpClient` directly in components.
- i18n: every user-visible string in `assets/i18n/ar.json`; use `{{ '' | translate }}` in templates.
- Reactive forms with typed `FormGroup<T>` — no template-driven forms in new code.
- Unsubscribe via `takeUntilDestroyed()` or `async` pipe — never bare `.subscribe()` in components.

## Consistency checks (run after every change)

1. **Component structure order** — decorators → `@Input`/`@Output` → injected services → lifecycle hooks → public methods → private methods.
2. **Naming** — `*Component`, `*Service`, `*Pipe`, `*Guard`, `*Directive` suffix; kebab-case file names.
3. **State pattern** — if the feature uses `BehaviorSubject`, do not mix in `signal()`; stay consistent within the feature.
4. **Template bindings** — use `@if` / `@for` (Angular 17 control flow) if siblings use it; do not mix `*ngIf` and `@if` in the same module.
5. **Import ordering** — Angular core → Angular modules → third-party → local core → local module → relative.
6. **Barrel exports** — if the feature has an `index.ts`, export new symbols through it.

```
⚠️ Consistency: <file>:<line>
Expected: <pattern from sibling files>
Found:    <what was written>
Fix: <diff-only>
```

## Refactoring suggestions (advisory — never auto-apply)

Scan modified files for:

- Component > 200 lines → suggest smart/dumb split or extract sub-component.
- Service calling ≥2 API endpoints → suggest a domain-specific façade service.
- Template with ≥3 repeated `*ngFor` / `@for` patterns → suggest a shared list component in `shared/`.
- `BehaviorSubject` managed in ≥2 services → suggest a shared state service or signals store.
- Observable chains > 4 operators → suggest naming the intermediate pipe for clarity.

```
💡 Refactor suggestion (advisory — not applied):
File: <path> (lines N–M)  Pattern: <description>
Suggestion: <what>  Effort: Low/Med/High  Impact: <why>
```

## Architecture suggestions (advisory — never auto-apply)

| Signal                                           | Suggestion                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Feature module with 1 component                  | "Standalone component in `shared/` may be lighter than a full feature module." |
| Component calls ≥2 API services directly         | "A façade service in `core/` reduces component coupling."                      |
| Multiple nested `BehaviorSubject` in one service | "Consider signals or NgRx for this state complexity."                          |
| Smart component > 300 lines                      | "Extract data-fetching logic into a dedicated container service."              |
| `shared/` module re-exporting >15 symbols        | "Consider splitting into `shared/ui`, `shared/utils`, `shared/forms`."         |

```
🏗️ Architecture note (advisory — no change made):
Context: <observed>  Concern: <why heavy>
Lighter alternative: <suggestion>  Trade-off: <gain vs cost>
```
