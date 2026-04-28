# AGENTS.md — VS Code AI Orchestrator

This file is recognized by the GitHub Copilot Coding Agent and other
AGENTS.md-aware tools as the source of repo-level agent guidance. It
mirrors `.github/copilot-instructions.md`; both should be kept in sync.

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for
the full master ruleset.

## Quick reference

- MCP server: `vscode-orchestrator` (configured in `.vscode/mcp.json`)
- Project memory: `C:/aidocs/<project-slug>/`
- Required response trailer: `Task Completion: NN%`
- Before any non-trivial task: call `list_skills`
- Before any library/version recommendation: call `web_search` + `check_versions`
- Before declaring "done": call `verify_build`
- Never run destructive git/db ops without explicit user "yes"
- Debug protocol: always collect 8 items (error, stack, request, steps, expected/actual, environment, when-started, clean-build) before proposing a fix

---

## Available prompts (`.github/prompts/`)

| File                            | Purpose                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `debug.prompt.md`               | 8-question structured debugging — no guessing                                         |
| `code-review.prompt.md`         | OWASP + language-specific code review + consistency/refactor/arch advisory            |
| `security-audit.prompt.md`      | Full OWASP Top 10 audit                                                               |
| `modernize.prompt.md`           | .NET / Angular upgrade workflow                                                       |
| `performance.prompt.md`         | Frontend + backend performance profiling                                              |
| `database-migration.prompt.md`  | Safe EF Core migrations with confirm gates                                            |
| `refactor.prompt.md`            | Impact-mapped, diff-only refactoring                                                  |
| `decompile.prompt.md`           | Reverse-engineering with mandatory legal gate                                         |
| `api-contract.prompt.md`        | Update `API.md` after any backend change                                              |
| `architecture-review.prompt.md` | Full architectural review — layer violations, frontend patterns, advisory-only output |
| `new-feature.prompt.md`         | Scaffold new Angular feature + .NET endpoint end-to-end                               |
| `plan-task.prompt.md`           | Plan any non-trivial task with risk score + rollback before coding                    |
| `verify-build.prompt.md`        | Run `verify_build` and remediate failures until green                                 |

---

## Active instruction files (`.github/instructions/`)

| File                               | `applyTo`                        | Scope                                                  |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `general.instructions.md`          | `**/*`                           | Safety, planning, debug protocol, security — all files |
| `angular-frontend.instructions.md` | `**/*.{ts,html,scss}`            | Angular standalone components, strict TS, RxJS         |
| `dotnet-backend.instructions.md`   | `**/*.cs`                        | Clean Architecture, EF Core, async, Serilog            |
| `testing.instructions.md`          | `**/*.spec.ts`                   | Karma/Jasmine, Angular Testing Library                 |
| `sql-database.instructions.md`     | `**/*.sql,**/Migrations/**/*.cs` | Parameterised queries, EF migrations, naming           |

---

## Modernization workflows

| Task                     | Agent / skill                                     |
| ------------------------ | ------------------------------------------------- |
| Upgrade .NET version     | `modernize-dotnet` agent → `dotnet-upgrade` skill |
| Upgrade Angular packages | `check_versions` → `upgrade_versions` MCP tool    |
| CVE audit                | `npm audit` + `appmod-dotnet-cve-check`           |
| Oracle → PostgreSQL      | `Oracle-to-PostgreSQL Migration Expert` agent     |

---

## Automated tool decision matrix

Detect task type from user intent and **automatically** invoke the mapped tools.

| Task type            | Auto-invoke (in order)                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| Any non-trivial task | `list_skills` → `todo_read`                                                       |
| Planning / design    | `list_skills` → `todo_read` → `compile_prompt` (if input > 500 words)             |
| Bug / debug / error  | `check_git_status` → `read_event_viewer` → `debug.prompt.md`                      |
| Modernize / upgrade  | `list_skills` → `check_versions` → `web_search` → `github_search` → `todo_update` |
| Code review          | `check_git_status` → `list_skills` → `code-review.prompt.md`                      |
| Security audit       | `list_skills` → `security-audit.prompt.md`                                        |
| Performance          | `list_skills` → `performance.prompt.md`                                           |
| DB migration         | `check_git_status` → `list_skills` → `database-migration.prompt.md`               |
| Refactor             | `check_git_status` → `list_skills` → `refactor.prompt.md`                         |
| Architecture review  | `list_skills` → `architecture-review.prompt.md`                                   |
| Decompile            | `decompile.prompt.md` (legal gate first)                                          |
| Backend API change   | `api-contract.prompt.md` after every change                                       |
| Image attached       | `optimize_image` (webp, q=85) immediately                                         |
| Any "done"/"ship"    | `verify_build` before claiming complete                                           |
| Long conversation    | `check_git_status` → if `recommend_new_chat=true` → commit + new chat             |
| Offline              | `online_check` → if offline → `offline_complete` + `qwen2.5-coder:7b`             |
| New lib/version      | `web_search` + `github_search` + `check_versions` — cite ≥2 URLs                  |

## Image-First Token Optimization

- **Images over prose**: request/use screenshots for UI issues, error dialogs, diagrams — one image < 500 words.
- Run `optimize_image` (webp, q=85) on every attached PNG/JPG before referencing it.
- For partial-image context: use `crop_to_query` to extract only the relevant region — enables near-unlimited attachment capacity.
- For architecture: generate a Mermaid diagram instead of prose.
- **MCP tool calls**: shortest valid input only — no prose padding. Use `compile_prompt` for briefs > 500 words.
- Diff-only output: 3 lines context + changed lines — never whole files.

---

## Code quality advisory (apply after every change)

**Consistency** — after every change, check:
1. Naming matches file's patterns (`*Service`, `*Component`, `I*`)
2. Layer placement correct for the stack
3. Error handling matches adjacent code style
4. Barrel files (`index.ts`) updated if used
5. Async pattern consistent within the file (`async pipe` vs `subscribe`)
6. Every new UI string in `assets/i18n/ar.json`
7. State management consistent with feature's chosen pattern

Output: `⚠️ Consistency: <file>:<line> — Expected: <pattern> / Found: <what> / Fix: <diff>`

**Refactoring** — suggest (never auto-apply) when:
- Duplicated logic across ≥2 siblings, method > 30 lines, component > 200 lines
- Service mixes HTTP + state, magic values repeated ≥2×, if/else chain ≥4 branches

Output: `💡 Refactor suggestion (advisory): File / Pattern / Suggestion / Effort / Impact`

**Architecture** — flag (never auto-apply) when scope is lighter than the pattern used:
- Simple CRUD in full CQRS, feature module with 1 component, read-only repo+UoW
- MediatR notification for sync side effect, `IQueryable<T>` leaking from repo
- Component calling ≥2 API services directly, multiple nested `BehaviorSubject`

Output: `🏗️ Architecture note (advisory): Context / Concern / Lighter alternative / Trade-off`
