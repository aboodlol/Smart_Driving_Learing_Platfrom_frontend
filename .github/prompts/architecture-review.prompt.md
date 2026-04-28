---
description: >
  Review the architecture of the current codebase for layer violations, over-engineering,
  and structural anti-patterns. Outputs advisory findings only — no code is modified.
---

## Architecture Review — ${input:scope}

---

### Step 1 — Load skills

```
list_skills
```

Pick: `context-map`, `refactor-plan` (from `context-engineering`).

---

### Step 2 — Get current state

```
check_git_status
todo_read → C:/aidocs/<project>/TASK_STATE.md
```

Understand recent changes and prior architectural decisions before scanning.

---

### Step 3 — Request diagrams / screenshots

If the user has architecture diagrams, screenshots, or Swagger UI available:

- Ask them to attach images. Run `optimize_image` (webp, q=85) on any PNG/JPG.
- If no diagram exists, generate a Mermaid diagram of the key layers and components found during the scan.
- Store generated diagrams in `C:/aidocs/<project>/diagrams/`.

---

### Step 4 — Scan backend layer boundaries (.NET)

Check for violations of Clean Architecture dependency rules:

| Violation               | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| Domain → Infrastructure | Domain entity imports EF Core types, DbContext, or any ORM attribute              |
| Domain → Application    | Domain references Application DTOs or service interfaces defined in Application   |
| Application → API       | Application layer references controller types, HttpContext, or ASP.NET middleware |
| Infrastructure → API    | Infrastructure registers its own routes or middleware                             |
| Controller → Repository | Controller directly injects `IRepository<T>` or `DbContext`                       |
| God service             | Single service class with >5 injected dependencies or >3 unrelated concerns       |
| Anemic domain           | Entity classes with only properties and no domain methods — all logic in services |

For each violation, output:

```
🏗️ Architecture note (advisory — no change made):
Context: <file path and line where violation occurs>
Concern: <why this violates Clean Architecture>
Lighter alternative: <concrete suggestion>
Trade-off: <what you gain vs what you give up>
```

---

### Step 5 — Scan frontend architecture (Angular)

Check for violations of the Angular architecture conventions:

| Violation                               | Description                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Smart/dumb boundary broken              | Dumb component injects a service directly (should receive data via `@Input`) |
| Component calls ≥2 API services         | Should go through a façade service in `core/`                                |
| Feature module with 1 component         | Standalone component in `shared/` would be lighter                           |
| Multiple BehaviorSubject in one service | Signals or NgRx store would manage this better                               |
| `shared/` module exporting >15 symbols  | Consider splitting into `shared/ui`, `shared/utils`, `shared/forms`          |
| State in dumb component                 | Dumb components must be stateless — state belongs in smart/container         |
| Deep relative import bypassing barrel   | `../../core/services/foo` instead of using `core` barrel `index.ts`          |

For each violation, output the same `🏗️ Architecture note` format above.

---

### Step 6 — Classify findings

Categorize all findings:

| Category         | Criteria                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| 🔴 Critical      | Layer boundary violation that will cause a runtime bug or prevent testability |
| 🟡 Advisory      | Over-engineering or pattern mismatch that increases maintenance cost          |
| 🔵 Informational | Minor structural improvement with low urgency                                 |

---

### Step 7 — Output report

Produce a structured report:

```
## Architecture Review Report — <scope>
Generated: <date>

### Critical (🔴)
<findings>

### Advisory (🟡)
<findings>

### Informational (🔵)
<findings>

### Summary
- Total findings: N (🔴 X critical, 🟡 Y advisory, 🔵 Z informational)
- Top priority: <one sentence on the most impactful issue>
```

**IMPORTANT**: This prompt is advisory only. Do NOT apply any code changes.
All fixes require explicit user confirmation before implementation.
