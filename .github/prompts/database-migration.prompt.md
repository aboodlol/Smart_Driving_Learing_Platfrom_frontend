---
description: >
  Safely plan and apply an EF Core database migration.
  Asks clarifying questions, previews SQL, requires explicit confirmation
  before running any migration against any environment.
---

## Database Migration — ${input:description}

### Project: ${input:project}

---

### Step 1 — Load skills

```
list_skills
```

Pick: `dotnet-best-practices`, `csharp-async`, `sql-code-review`.

---

### Step 2 — Read task state + git status

```
todo_read   → C:/aidocs/${input:project}/TASK_STATE.md
check_git_status
```

---

### Step 3 — Clarifying questions (ask the user, wait for ALL answers)

1. **Migration type**: Add table? Add column? Drop column? Rename entity? Index only?
2. **Entity affected**: Which domain entity and `DbContext`?
3. **Environment target**: Dev-only for now, or will this reach QA / staging / prod?
4. **Data at risk**: Does the migration alter or drop columns that already hold data?
5. **Backup taken?**: For staging/prod — has a DB backup been confirmed?
6. **Rollback feasible?**: Can this be undone with `dotnet ef migrations remove`, or is a manual Down migration required?

> **Do not add or scaffold anything until all 6 answers are received.**

---

### Step 4 — Plan

Produce:

- EF entity change diff
- Migration command to run
- Preview of generated SQL (Up + Down)
- Risk score: **low / med / high**
- Rollback steps

Show the user the plan and ask: **"Proceed with this plan? (yes / no)"**

---

### Step 5 — Scaffold migration (only after "yes")

```bash
dotnet ef migrations add ${input:description} \
  --project src/Infrastructure \
  --startup-project src/API
```

After generation, **review the migration file** and verify:

- `Up()` is additive and reversible
- `Down()` correctly undoes every change
- `migrationBuilder.CreateIndex` added for every new foreign key column
- No `DropColumn` or `DropTable` without an explicit data backfill (`migrationBuilder.Sql(...)`)
- Column renames use `RenameColumn`, not Drop + Add

---

### Step 6 — Preview SQL before applying

```bash
dotnet ef migrations script --idempotent
```

Show the user the SQL output. Ask: **"Apply to dev DB? (yes / no)"**

> For **staging / prod**: repeat this ask explicitly and require the backup confirmation from Step 3.

---

### Step 7 — Apply to dev DB (only after "yes")

```bash
dotnet ef database update --project src/Infrastructure --startup-project src/API
```

---

### Step 8 — Update schema docs

Append or update entity docs in `C:/aidocs/${input:project}/API.md`:

- New table / column names and types
- Any removed or renamed fields (for frontend awareness)
- Migration name for traceability

---

### Step 9 — Verify

```
dotnet test
verify_build
```
