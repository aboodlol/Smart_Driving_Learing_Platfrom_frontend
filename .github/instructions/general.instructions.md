---
applyTo: "**/*"
---

# General Engineering Instructions — All Languages & Fields

These rules apply universally to every file, language, and domain in this workspace.
Language-specific instructions (Angular, .NET, SQL) add to these; they do not replace them.

---

## Safety & user confirmation

Always ask the user **before** any of the following — never proceed silently:

- Running any destructive command (`delete`, `drop`, `truncate`, `reset`, `rm`, `rd /s`)
- Installing, upgrading, or removing a dependency (any package manager)
- Deploying or publishing to any environment (dev, QA, staging, prod)
- Pushing to a shared git branch (`git push`, `git push --force`)
- Running DB migrations on staging or prod
- Creating, renaming, or deleting files outside the workspace

If a command has an **irreversible side-effect**, state that clearly and wait for **"yes"** before executing.

---

## Use available tooling first (any AI agent — VS Code Copilot, Cursor, CLI)

**Before writing custom code or automation**, check whether an existing tool already handles the task:

| Layer                  | What to look for                                                                  |
| ---------------------- | --------------------------------------------------------------------------------- |
| **MCP servers**        | `.vscode/mcp.json` (VS Code) · `~/.cursor/mcp.json` (Cursor) · CLI MCP config     |
| **VS Code extensions** | `.vscode/extensions.json` · Extensions panel · `@recommended` filter              |
| **Cursor extensions**  | `.cursorrules` in workspace root · Cursor extension marketplace                   |
| **Skills / agents**    | Agent plugin library → call `list_skills` before every non-trivial task           |
| **Prompt files**       | `.github/prompts/*.prompt.md` — load the relevant prompt before building anything |
| **Instruction files**  | `.github/instructions/*.instructions.md` — auto-applied via `applyTo` pattern     |

- **Rule**: if a tool, extension, skill, agent, or prompt already solves the task — **use it**. Do not build from scratch.
- Always call `list_skills` early — before web-searching or writing new automation.
- When a relevant VS Code or Cursor extension would help, suggest it to the user before writing code.
- For Cursor: always check `.cursorrules` and `~/.cursor/mcp.json`; honour both.

---

## Planning workflow (any non-trivial task)

1. `list_skills` — load domain-specific skills before writing a single line of code.
2. `todo_read` → `C:/aidocs/<project>/TASK_STATE.md` — understand prior context.
3. Produce a **numbered plan** + **risk score** (low / med / high) + **rollback steps** before implementing.
4. Get explicit user confirmation: **"Proceed with this plan? (yes / no)"**
5. `verify_build` + run tests before claiming "done".

---

## Debug protocol (any language, any error)

**Never guess.** Collect all of the following first:

1. **Exact error message** — full text, not paraphrased
2. **Stack trace or log output** — from terminal, browser console, or server logs
3. **Failing command / request** — with all inputs / payloads
4. **Steps to reproduce** — numbered, from a blank state
5. **Expected vs actual** — what should happen vs what does happen
6. **Environment** — OS, runtime version, framework version, build config
7. **When it started** — was it working before? What changed recently?
8. **Clean build attempted?** — e.g. `ng build`, `dotnet clean`, `mvn clean`, `cargo clean`, `npm ci`, fresh install

Only after receiving all answers should you propose a root-cause hypothesis.

---

## Code quality (any language)

- Match existing **naming conventions, style, and patterns** in the file being edited.
- Output **diff-only changes** — never paste entire files.
- After logic changes, include a **Logic Check** — trace the change step by step.
- No hardcoded credentials, secrets, tokens, or environment-specific values.
- No `TODO` / `FIXME` left in committed code without a linked issue number.
- No commented-out code blocks — delete them or open an issue.

---

## Version & dependency management

- Never invent version numbers — call `check_versions` or `web_search` to confirm.
- Never silently upgrade a dependency — state the name, current version, target version, and reason.
- Before adding any new package, run `npm audit` / check CVE databases.
- Prefer well-maintained, widely adopted packages with recent release activity.

---

## Security (OWASP top concerns — all stacks)

- **A01 Broken Access Control**: authorisation is enforced server-side; never trust client-side role checks alone.
- **A02 Cryptographic Failures**: no plain-text secrets, tokens, or passwords in code or logs.
- **A03 Injection**: all user inputs parameterised or escaped at the boundary.
- **A05 Security Misconfiguration**: no debug endpoints, stack traces, or default credentials in any environment.
- **A06 Vulnerable Components**: check dependencies before adding; re-check with the stack's audit tool (`npm audit`, `pip audit`, `cargo audit`, `dotnet list package --vulnerable`, etc.).
- **A07 Auth Failures**: JWT validated on every request; session tokens invalidated on logout.
- Sensitive data never logged (PII, tokens, passwords).
- HTTPS / TLS required on all network communication.

---

## Version control discipline

- `git push` / `git push --force` / `git reset --hard` — always ask before running.
- `git clean` — always ask; it is irreversible.
- One logical change per commit; write meaningful commit messages.
- Do not commit generated files (dist, coverage, \*.map, node_modules, bin, obj, **pycache**, target/, .gradle/).

---

## Automated tool decision matrix

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

## Token & image optimization

### Minimize MCP tool tokens

- Pass the **shortest valid input** to MCP tools — no prose padding, no re-explanation.
- Use variable substitution in prompts (`${input:var}`) — never hard-code ephemeral values.
- Call `compile_prompt` for any user brief > 500 words before further reasoning.
- Diff-only output: never paste whole files — only changed lines with 3-line context.

### Image-first communication

- **Prefer images over verbose text** for any visual or structural content: UI screenshots, error dialogs, architecture diagrams, network traces, database schemas.
- When asked to explain a UI issue or layout problem, request a screenshot first — a single image conveys more than 500 words.
- Run `optimize_image` (webp, q=85) on every attached PNG/JPG before referencing it — smaller file = fewer tokens in multimodal context.
- For architecture diagrams, generate a Mermaid diagram and render it — do not describe the architecture in plain prose when a diagram is clearer.
- Store frequently referenced diagrams in `C:/aidocs/<project>/diagrams/` and link from `API.md`.

---

## Code consistency enforcement

After **every code change**, verify the modified area against the existing codebase conventions. Do not skip this even for small edits.

### What to check automatically

1. **Naming** — matches the file's existing casing and prefix/suffix patterns (e.g. `*Service`/`*Component` in Angular; `I*` interface prefix in .NET; `use_` prefix in Python; `PascalCase` types in Go — follow what the project already uses).
2. **Layer placement** — new code sits in the correct architectural layer (e.g. Domain / Application / Infrastructure / API in .NET; core / modules / shared in Angular; pkg / internal / cmd in Go — match the project's existing structure).
3. **Error handling style** — matches how adjacent code handles errors (global interceptor vs try/catch, ProblemDetails vs custom, etc.).
4. **Import/export patterns** — barrel files (`index.ts`) updated if the module uses them; no deep relative paths that skip barrel files.
5. **Observable/async pattern** — stay consistent with the file's chosen async style (async/await, Observables, Promises, coroutines, goroutines, etc.); do not mix styles within the same module.
6. **i18n** — if the project uses a translation layer (`ngx-translate`, `i18next`, `gettext`, etc.), every new user-facing string goes through it; no hardcoded display text.
7. **State management** — if the feature uses a state pattern (`BehaviorSubject`, signals, NgRx, Redux, Zustand, MobX, etc.), new state follows the same pattern; do not mix styles inconsistently.

### Output format when inconsistency found

```
⚠️ Consistency: <file>:<line>
Expected: <what the codebase pattern is>
Found:    <what was written>
Fix: <diff-only>
```

---

## Refactoring suggestions (suggest only — never auto-apply)

After completing any task, scan the **modified files and their direct dependencies** for refactoring opportunities. List them as advisory output — never apply without explicit user confirmation.

### When to suggest

- Duplicated logic across ≥2 sibling files → extract shared helper/service.
- Method > 30 lines → consider splitting into named private methods.
- Module / component / class > 200–300 lines → consider splitting into smaller focused units.
- Service does both HTTP and state management → suggest separating concerns.
- Magic strings / magic numbers repeated ≥2 times → suggest constant / enum extraction.
- `if/else` chains ≥4 branches on the same field → suggest strategy pattern or lookup map.
- Identical error-handling blocks in ≥2 places → suggest shared interceptor or decorator.

### Output format

```
💡 Refactor suggestion (advisory — not applied):
File: <path> (lines N–M)
Pattern found: <description>
Suggestion: <what to do>
Effort: Low / Medium / High
Impact: <why this matters>
```

---

## Architecture suggestions (suggest only — never redesign without user direction)

After reviewing new or changed code, evaluate whether the architecture fits the scope. Output advisory notes only — the user decides whether to act.

### Trigger conditions

| Signal                                                                                             | Advisory                                                                                           |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Simple CRUD wrapped in full ceremony (Command + Handler + Validator + Mapper or equivalent)        | Suggest: "A thin service method likely suffices — full pipeline adds indirection without benefit." |
| Module / package containing a single class, route, or component                                    | Suggest: "An inline or shared utility may be lighter than a full dedicated module."                |
| Read-only data projection behind full Repository + Unit of Work                                    | Suggest: "A direct query in a lean read-service may be simpler here."                              |
| Async event / message bus used for a synchronous side effect                                       | Suggest: "A direct service call is clearer; async events add indirection for no gain here."        |
| Data-access layer leaking an open query interface (`IQueryable`, raw session, query builder, etc.) | Suggest: "Return concrete DTOs from the data layer — open query interfaces break encapsulation."   |
| Multiple nested mutable state objects in a single service                                          | Suggest: "Consider a dedicated state store or state-management library for this complexity."       |
| UI component / view directly calling ≥2 data services                                              | Suggest: "A façade or mediator service reduces coupling and simplifies the component."             |

### Output format

```
🏗️ Architecture note (advisory — no change made):
Context: <what was observed>
Concern: <why this may be heavy or over-engineered>
Lighter alternative: <concrete suggestion>
Trade-off: <what you gain vs what you give up>
```
