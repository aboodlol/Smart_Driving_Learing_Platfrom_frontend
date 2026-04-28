---
description: >
  Profile and fix a performance issue. Collects measurements from the user
  before forming any hypothesis — never guess without data.
---

## Performance Audit: ${input:area}

> **Do not suggest fixes yet.** Collect baseline measurements first.

---

### Step 1 — Load skills

```
list_skills
```

Pick: `sql-optimization`, `dotnet-best-practices`, `power-bi-performance-troubleshooting` (if BI).

---

### Step 2 — Collect baseline measurements (ask the user, wait for answers)

1. **What is slow?** — exact feature, page, query, or endpoint (URL / route name)
2. **How slow?** — measured time (e.g. "page load: 12 s", "query: 8 s", "bundle: 4 MB")
3. **When does it get slow?** — always? only with N+ records? specific filters? concurrent users?
4. **Environment** — dev / QA / prod? Server specs? DB engine + version?
5. **Browser DevTools** — Lighthouse score? Network waterfall (can you paste a screenshot)?
6. **Server metrics** — CPU %, memory %, response time from logs / Application Insights?
7. **SQL?** — paste the slow query or EF-generated SQL (enable via `EnableSensitiveDataLogging`)
8. **Frontend bundle?** — run `npx source-map-explorer dist/**/*.js` and paste the top 10 lines

> Wait for all answers before proceeding.

---

### Step 3 — Diagnose

After context is collected, check:

**Frontend:**

- Uncompressed assets? Missing lazy-loading of heavy modules?
- N+1 API calls on component init?
- Angular change detection running too often? (`ChangeDetectionStrategy.OnPush` missing)
- Bundle bloat — check `source-map-explorer` output

**Backend:**

- Missing DB index? (check query execution plan — `EXPLAIN ANALYZE` / SQL Server Execution Plan)
- N+1 queries — EF eager-loading missing (`.Include(...)`)
- Full table scan on a filtered column
- Missing pagination — loading entire dataset into memory

State: **Root cause (1 sentence)** + 2 alternative causes + confidence: High / Medium / Low.

---

### Step 4 — Optimisation plan

Prioritise by impact / effort:

| Priority     | Change                | Expected improvement |
| ------------ | --------------------- | -------------------- |
| 🔴 High/Easy | e.g. add DB index     | -80% query time      |
| 🟡 High/Med  | e.g. lazy-load module | -60% initial bundle  |
| 🔵 Low       | e.g. compress image   | marginal             |

Ask: **"Shall I apply these optimisations? (yes / no / review each)"**

Wait for user reply.

---

### Step 5 — Apply (diff-only)

For each change:

- Show the diff
- State expected improvement
- Include Logic Check — verify the fix does not break existing behaviour

---

### Step 6 — Measure after

Ask the user to re-run the scenario and report the new timing.

If improvement < 20% of target, return to Step 3 with updated data.

---

### Step 7 — Verify

```
verify_build
ng test --watch=false
```

`Task Completion: 100%` only when measurements confirm improvement AND tests pass.
