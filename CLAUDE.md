# CLAUDE.md — Daleel-WEB

Loaded automatically by Claude Code at startup. Keep in sync with project state.
Mirror rules from `.github/copilot-instructions.md` apply here — this file adds
Claude-specific context on top.

---

## Project Overview

| Key            | Value                                            |
| -------------- | ------------------------------------------------ |
| Stack          | Angular 17+ (this repo) + .NET Core (Daleel-API) |
| Frontend root  | `C:\TFS\Daleel-WEB`                              |
| Backend root   | `C:\TFS\Daleel-API`                              |
| Project memory | `C:\aidocs\daleel\`                              |
| MCP server     | `vscode-orchestrator` (see `.vscode/mcp.json`)   |
| API contract   | `C:\aidocs\daleel\API.md`                        |
| Task state     | `C:\aidocs\daleel\TASK_STATE.md`                 |

---

## Key Commands

```bash
npm install                          # install deps
ng serve                             # dev server → http://localhost:4200
ng build --configuration production  # prod build
ng build --configuration qa          # QA build
ng test --watch=false                # unit tests (Karma/Jasmine)
ng lint                              # ESLint
ng generate component <path>         # scaffold component (ask first)
```

---

## Architecture

```
src/app/
  core/          → singleton services, guards, interceptors, models, enums
  layout/        → shell: navbar, sidebar, toolbar, page-header
  modules/       → feature modules (lazy-loaded via routing)
  shared/        → reusable dumb components, pipes, directives
  primng/        → PrimeNG component wrappers
src/assets/
  i18n/          → translation files (ar.json = default)
  templates/     → document templates
src/environments/  → dev / qa / prod configs
```

**Routing pattern**: `AppRoutingModule` lazy-loads each `modules/*` feature module.  
**i18n**: Arabic (`ar`) is the default language. All UI text goes through `ngx-translate`.  
**HTTP**: All API calls go through the interceptor in `core/`. Never call `HttpClient` directly from components.

---

## Code Conventions

- **Angular**: Standalone components only. No NgModule in new features.
- **TypeScript**: Strict mode. No `any`. DTOs come from `C:\aidocs\daleel\API.md`.
- **State**: RxJS `BehaviorSubject` / Angular Signals. No component-local state for shared data.
- **Forms**: Reactive forms. Validate every field. Surface server errors via the global error handler in `core/`.
- **Styles**: SCSS. BEM naming. Use existing theme variables — no hardcoded hex.
- **Smart/dumb split**: Smart = data-fetching container. Dumb = pure presentational `@Input`/`@Output`.

---

## MCP Tools — Use Proactively

| Tool                           | When                                                  |
| ------------------------------ | ----------------------------------------------------- |
| `web_search` + `github_search` | Before recommending any library/version               |
| `check_versions`               | Never invent a version number                         |
| `list_skills`                  | Before non-trivial tasks — load relevant skills first |
| `verify_build`                 | Before any "done" / "ship" / "finished" claim         |
| `check_git_status`             | At session start; if chat is long                     |
| `guard_destructive_git`        | Before any reset / push / branch delete               |
| `todo_read` / `todo_update`    | Persist plan in `TASK_STATE.md`                       |
| `compile_prompt`               | For long user briefs before reasoning                 |
| `online_check`                 | If offline → fall back to `offline_complete`          |

---

## Interaction & Safety Rules

### ALWAYS ASK THE USER BEFORE:
- `git push` (any branch)
- `git reset --hard`
- Deleting files or directories
- Installing a new npm dependency (state the name + reason)
- Dropping a database column or table
- Running migrations on production
- Publishing / deploying to any environment

### NEVER DO WITHOUT EXPLICIT "yes":
- `git push --force`
- `git clean -fd`
- Any irreversible DB operation

### Debug Protocol — NEVER GUESS
When diagnosing an error, always ask the user for:
1. **Exact error message** (copy-paste, not paraphrase)
2. **Stack trace** (browser console → Console tab or Network tab)
3. **Server logs** (backend terminal output)
4. **Network request** (if API-related) — URL, HTTP status, response body from Network tab
5. **Steps to reproduce** (numbered, from blank state)
6. **Expected vs actual** — what should happen vs what does happen
7. **Environment** (dev / QA / staging / prod? Which browser and version?)
8. **When did it start?** — was it working before? What changed recently?

Only after receiving this context should you propose a root-cause hypothesis.

---

## Response Format

Every non-trivial response must include (in order):
1. **Plan** — numbered steps + risk score (low/med/high) + rollback
2. **Skills invoked** — list
3. **Changes** — diff-only, never paste whole files
4. **Logic Check** — step-by-step mental verification
5. **Possible Errors** — runtime risks + validations needed
6. **Rollback**
7. **Frontend Contract Updates** — if backend changed, update `API.md`
8. `Task Completion: NN%` — literal trailer on every response

---

## Security Checklist (apply to every change)

- [ ] No hardcoded secrets, tokens, or credentials
- [ ] No `any` cast that bypasses auth/validation
- [ ] Route guard present for new pages
- [ ] JWT claims checked before showing sensitive data
- [ ] User input sanitized before display (no `innerHTML` with raw data)
- [ ] Errors surfaced to user without leaking internal details

---

## Modernization Workflows

| Task                     | Agent / Skill                                     |
| ------------------------ | ------------------------------------------------- |
| Upgrade .NET version     | `modernize-dotnet` agent → `dotnet-upgrade` skill |
| Upgrade Angular packages | `check_versions` → `upgrade_versions` MCP tool    |
| React 18 migration       | `react18-commander` agent                         |
| React 19 migration       | `react19-commander` agent                         |
| Oracle → PostgreSQL      | `Oracle-to-PostgreSQL Migration Expert` agent     |
| CVE / dependency scan    | `npm audit` + `appmod-dotnet-cve-check` MCP tool  |

**Before any modernization task:**
1. `list_skills` → load the relevant upgrade skill
2. `check_versions` → confirm target version — never invent it
3. `todo_update` → snapshot current state in TASK_STATE.md
4. Create a git branch — **ask the user for the branch name before creating**
5. All changes go behind a feature flag if the app is live

---

## Decompile / Reverse Engineering

When the user needs to inspect compiled code or third-party assemblies:

| Source                 | Tool                                                      |
| ---------------------- | --------------------------------------------------------- |
| .NET DLL / assembly    | ILSpy, dotPeek, or `dotnet-ildecompiler`                  |
| Minified JavaScript    | Browser DevTools → Pretty Print, or `source-map-explorer` |
| TypeScript source maps | `ng build --source-map` → browser DevTools → Sources      |
| Live API contract      | `/swagger/v1/swagger.json` or Swagger UI                  |
| Existing DB schema     | `dotnet ef dbcontext scaffold` (read-only; ask first)     |

**Rules:**
1. Ask the user for the legal/business reason before decompiling anything
2. Never commit decompiled code — reference only
3. Prefer official docs, NuGet source links, or `go to definition` first
4. `dotnet ef dbcontext scaffold` generates model files — **always ask before running**

---

## Automated Tool Decision Matrix

Detect task type from user intent and **automatically** invoke the mapped tools — do not wait to be asked.

| Detected task type   | Auto-invoke (in order)                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Any non-trivial task | `list_skills` → `todo_read`                                                              |
| Planning / design    | `list_skills` → `todo_read` → `compile_prompt` (if input > 500 words)                    |
| Bug / error / debug  | `check_git_status` → `read_event_viewer` (Windows) → `.github/prompts/debug.prompt.md`   |
| Modernize / upgrade  | `list_skills` → `check_versions` → `web_search` → `github_search` → `todo_update`        |
| Code review          | `check_git_status` → `list_skills` → `.github/prompts/code-review.prompt.md`             |
| Security audit       | `list_skills` → `.github/prompts/security-audit.prompt.md`                               |
| Performance issue    | `list_skills` → `.github/prompts/performance.prompt.md`                                  |
| DB migration         | `check_git_status` → `list_skills` → `.github/prompts/database-migration.prompt.md`      |
| Refactor request     | `check_git_status` → `list_skills` → `.github/prompts/refactor.prompt.md`                |
| Architecture review  | `list_skills` → `.github/prompts/architecture-review.prompt.md`                          |
| Decompile / reverse  | `.github/prompts/decompile.prompt.md` (legal gate first)                                 |
| Backend API change   | `.github/prompts/api-contract.prompt.md` after every change                              |
| Image attached       | `optimize_image` (target: webp, q=85) immediately                                        |
| Any "done" / "ship"  | `verify_build` before claiming complete                                                  |
| Long conversation    | `check_git_status` → if `recommend_new_chat=true` → tell user to commit + start new chat |
| Offline detected     | `online_check` → if offline → `offline_complete` with `qwen2.5-coder:7b`                 |
| New library/version  | `web_search` + `github_search` + `check_versions` — cite ≥2 URLs, never invent           |

---

## Image-First Token Optimization

- **Images over prose**: for UI issues, error dialogs, diagrams, schemas — request/use a screenshot. One image < 500 words of description.
- Run `optimize_image` (webp, q=85) on every attached PNG/JPG before referencing it.
- For partial-image context: use `crop_to_query` to extract only the relevant region — enables near-unlimited attachment capacity (only what matters is loaded into context).
- For architecture, generate a Mermaid diagram — never describe structure in plain prose when a diagram is clearer.
- Store diagrams in `C:/aidocs/daleel/diagrams/`; link from `API.md`.
- **MCP tool calls**: pass the shortest valid input — no prose padding. Use `compile_prompt` for briefs > 500 words.
- Diff-only output: 3 lines context, changed lines only — never whole files.

---

## Code Consistency Enforcement

After **every code change**, verify against existing codebase conventions before closing the task:

1. **Naming** — matches file's casing/prefix/suffix patterns (`*Service`, `*Component`, `I*` in .NET).
2. **Layer placement** — code is in the correct architectural layer for the stack.
3. **Error handling** — matches how adjacent code handles errors (global interceptor, ProblemDetails, etc.).
4. **Import patterns** — barrel files (`index.ts`) updated if used; no deep relative paths that bypass barrels.
5. **Async pattern** — `async pipe` or `subscribe` — stay consistent within the file.
6. **i18n** — every new UI string goes to `assets/i18n/ar.json`; no hardcoded text.
7. **State management** — stay consistent with the feature's chosen pattern (`BehaviorSubject`, signals, NgRx).

Output format for violations:
```
⚠️ Consistency: <file>:<line>
Expected: <pattern>   Found: <what was written>   Fix: <diff>
```

---

## Refactoring & Architecture Suggestions (advisory only — never auto-apply)

### Refactoring — suggest after every task
Scan modified files for:
- Duplicated logic across ≥2 sibling files → extract shared helper.
- Method > 30 lines → split into named private methods.
- Component > 200 lines → smart/dumb split.
- Service mixing HTTP + state → separate concerns.
- Magic values repeated ≥2 times → constant/enum.
- `if/else` chain ≥4 branches on same field → strategy/lookup map.

```
💡 Refactor suggestion (advisory):
File: <path> (lines N–M)  Pattern: <description>
Suggestion: <what>  Effort: Low/Med/High  Impact: <why>
```

### Architecture — suggest if heavy for the scope
| Signal                                                              | Suggestion                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Simple CRUD wrapped in full CQRS (Command+Handler+Validator+Mapper) | "Thin service method may suffice."                                                     |
| Feature module with 1 component                                     | "Standalone component in `shared/` may be lighter."                                    |
| Repository + UoW for read-only projection                           | "Direct DbContext query in a read-service may be simpler."                             |
| MediatR notification for synchronous side effect                    | "Direct service call is clearer; notifications add async indirection without benefit." |
| `IRepository<T>` exposing `IQueryable<T>`                           | "Leaking IQueryable breaks encapsulation — return concrete DTOs."                      |
| Multiple nested `BehaviorSubject` in one service                    | "Consider NgRx or signals-based store."                                                |
| Component calling ≥2 API services directly                          | "A façade service reduces coupling."                                                   |

```
🏗️ Architecture note (advisory):
Context: <observed>  Concern: <why heavy>
Lighter alternative: <suggestion>  Trade-off: <gain vs cost>
```
