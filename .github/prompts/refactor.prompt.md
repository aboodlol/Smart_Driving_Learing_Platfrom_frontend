---
description: >
  Structured, safe refactoring of existing code.
  Maps impact first, plans file by file, applies diff-only with per-change approval.
---

## Refactor: ${input:target}

### Reason: ${input:reason}

### Project: ${input:project}

---

### Step 1 — Load skills

```
list_skills
```

Pick: `refactor-plan`, `context-map`, `dotnet-best-practices`, `csharp-async` (as applicable).

---

### Step 2 — Read current state

```
check_git_status
todo_read   → C:/aidocs/${input:project}/TASK_STATE.md
```

---

### Step 3 — Map impact

Identify ALL files affected by the refactor:

- Direct targets (files being changed)
- Callers / importers (files that reference the changed symbols)
- Related tests (`*.spec.ts`, `*Tests.cs`)
- Configuration / DI registrations

> If >10 files are affected, flag as **high risk** and pause for user confirmation before continuing.

---

### Step 4 — Clarifying questions (ask, wait for all answers)

1. **Scope**: Single method? Class? Cross-module pattern?
2. **Breaking changes**: Will any public interfaces, exported types, or API contracts change?
3. **Test coverage today**: Are there passing tests covering this code right now?
4. **Release timing**: Is this in a release branch, or is a temporary break acceptable?
5. **Target pattern**: What should the refactored code look like? (e.g., extract service, rename to convention, pure function, repository pattern)

---

### Step 5 — Refactor plan

Produce a numbered plan:

- Files to change (in order — dependencies first)
- Before → after shape for each file
- Risk score: **low / med / high**
- Rollback: `git stash` or branch revert

Ask: **"Proceed with this plan? (yes / no)"**

---

### Step 6 — Apply (file by file, diff-only)

For each file:

1. Show the diff
2. State a **Logic Check** — trace the change mentally
3. Ask: **"Apply this change? (yes / skip / abort)"**

> **Never apply all changes at once without per-file confirmation when risk is med or high.**

Use the language server rename tool when renaming symbols — never text-replace across files manually.

---

### Step 7 — Verify

```
ng test --watch=false      ← frontend
dotnet test                ← backend
verify_build
```

If any tests fail, fix them before marking the refactor done.

---

### Step 8 — Update TASK_STATE.md

```
todo_update   → C:/aidocs/${input:project}/TASK_STATE.md
```

Record: what was refactored, files changed, risk encountered, tests status.
