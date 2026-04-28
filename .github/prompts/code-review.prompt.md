---
description: >
  Review changed files for quality, security (OWASP Top 10), and project conventions.
  Outputs rated findings with diff-only fixes.
---

## Code Review — ${input:scope}

---

### Step 1 — Get diff

```
check_git_status
```

List the files changed. If the user specified a scope, limit review to those files.
Otherwise review all staged/unstaged changes.

---

### Step 2 — Load skills

```
list_skills
```

Pick: `dotnet-best-practices`, `csharp-async`, `sql-code-review`, `angular-frontend` (as applicable).

---

### Step 3 — Review checklist

#### Security (OWASP Top 10)

- [ ] **A1 Broken Access Control** — every new route has a `canActivate` guard; every API endpoint checks JWT claims
- [ ] **A2 Crypto failures** — no hardcoded secrets, passwords, or API keys; no MD5/SHA1 for passwords
- [ ] **A3 Injection** — no raw SQL (EF Core only); no `innerHTML` with unsanitized user data; no `bypassSecurityTrustHtml` without review
- [ ] **A5 Misconfiguration** — no CORS `*` wildcard on sensitive endpoints; no debug flags reaching production
- [ ] **A7 Auth failures** — JWT expiry enforced; refresh token rotation in place; no client-side auth bypass

#### TypeScript / Angular

- [ ] No `any` type usage
- [ ] No direct `HttpClient` calls from components (use service layer)
- [ ] All `Observable` subscriptions unsubscribed (`takeUntilDestroyed` or `async` pipe)
- [ ] Reactive form validators present for every user input
- [ ] Server errors surface through the global error handler — no silent `catchError(() => of([]))`
- [ ] No logic in templates beyond simple conditionals
- [ ] i18n: no hardcoded UI strings — all text via `translate` pipe

#### .NET / C#

- [ ] `async`/`await` all the way — no `.Result` or `.Wait()`
- [ ] `CancellationToken` passed through to all async calls
- [ ] No inline SQL — EF Core or stored procedure only
- [ ] `ProblemDetails` used for all error responses
- [ ] Structured logging (`ILogger`) — no `Console.WriteLine`
- [ ] N+1 queries checked — eager-load with `.Include()` where needed
- [ ] No sensitive data (passwords, tokens) logged

#### General

- [ ] No TODO/FIXME comments left in production code
- [ ] No commented-out code blocks
- [ ] Tests added/updated for changed logic

---

### Step 4 — Output findings

For each finding use this format:

```
🔴 [Critical] / 🟡 [Warning] / 🔵 [Info]
File: path/to/file.ts (line N)
Issue: <one-sentence description>
Fix:
  - <diff-only change>
```

---

### Step 5 — Consistency check

For every changed file, verify against existing codebase conventions:

1. **Naming** — matches file's prefix/suffix patterns (`*Service`, `*Component`, `I*` in .NET)
2. **Layer placement** — code is in the correct architectural layer
3. **Error handling** — matches adjacent code (global interceptor, `ProblemDetails`, etc.)
4. **Import patterns** — barrel files (`index.ts`) updated if used; no deep relative paths
5. **Async pattern** — `async pipe` or `subscribe` — consistent within each file
6. **i18n** — all new UI strings in `assets/i18n/ar.json`; none hardcoded
7. **State management** — consistent with the feature's existing pattern

For each violation output:

```
⚠️ Consistency: <file>:<line>
Expected: <pattern>   Found: <what was written>   Fix: <diff>
```

---

### Step 6 — Refactoring suggestions (advisory)

Scan modified files for these patterns — output as suggestions only, never apply:

- Duplicated logic across ≥2 sibling files → extract shared helper
- Method > 30 lines → split into named private methods
- Component > 200 lines → smart/dumb split
- Service mixing HTTP + state → separate concerns
- Magic values repeated ≥2 times → constant/enum
- `if/else` chain ≥4 branches on same field → strategy/lookup map

```
💡 Refactor suggestion (advisory):
File: <path> (lines N–M)  Pattern: <description>
Suggestion: <what>  Effort: Low/Med/High  Impact: <why>
```

---

### Step 7 — Architecture suggestions (advisory)

Flag if the change introduces patterns that are heavier than the scope requires:

| Signal                                             | Advisory                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| Simple CRUD wrapped in full CQRS                   | "Thin service method may suffice."                                |
| Angular feature module with 1 component            | "Standalone component in `shared/` may be lighter."               |
| Repository + UoW for a read-only projection        | "Direct DbContext query in a read-service may be simpler."        |
| MediatR notification for a synchronous side effect | "Direct service call is clearer here."                            |
| `IRepository<T>` exposing `IQueryable<T>`          | "Return concrete DTOs — leaking IQueryable breaks encapsulation." |
| Component calling ≥2 API services directly         | "A façade service reduces coupling."                              |

```
🏗️ Architecture note (advisory — no change made):
Context: <what was observed>  Concern: <why heavy>
Lighter alternative: <suggestion>  Trade-off: <gain vs cost>
```

---

### Step 8 — Apply fixes

For 🔴 Critical issues: apply fixes immediately (diff-only).  
For 🟡 Warning: ask user — "Apply this fix? (yes/no/skip)".  
For 🔵 Info: list only, do not modify.  
For ⚠️ Consistency violations: apply immediately alongside critical fixes.  
For 💡 Refactor / 🏗️ Architecture: list only, never auto-apply.

---

### Step 9 — Verify

```
verify_build
```
