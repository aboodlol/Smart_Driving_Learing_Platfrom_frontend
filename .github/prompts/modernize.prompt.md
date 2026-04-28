---
description: >
  Upgrade or modernize a framework, package set, or architecture layer.
  Branches first, snapshots state, and asks user before each breaking change.
---

## Modernize: ${input:target}

### Project: ${input:project}

> **Do not upgrade yet.** Follow these steps in order.

---

### Step 1 — Load skills

```
list_skills
```

Pick based on target:

- `.NET upgrade` → `dotnet-upgrade` skill + invoke `modernize-dotnet` agent
- `React 18` → `react18-commander` agent
- `React 19` → `react19-commander` agent
- `Oracle → Postgres` → `Oracle-to-PostgreSQL Migration Expert` agent
- `Angular packages` → `check_versions` + `upgrade_versions`
- `CVE fix` → `appmod-dotnet-cve-check` + `npm audit`

---

### Step 2 — Read current state

```
todo_read   → C:/aidocs/${input:project}/TASK_STATE.md
check_git_status
```

---

### Step 3 — Dependency audit

```
npm audit                      (frontend)
check_versions                 (all direct deps)
```

Produce a table: `Package | Current | Target | Breaking changes | CVEs`.

---

### Step 4 — Clarifying questions (ask the user, wait for answers)

1. **Target version** of `${input:target}`?
2. **Scope**: upgrade all at once, or incremental one-by-one?
3. **Downtime allowed?** Does the app need to stay live during migration?
4. **Locked packages?** Internal mirrors, pinned transitive deps, or enterprise constraints?
5. **Test coverage?** Do we have unit/e2e tests to protect against regressions?

> Wait for answers before proceeding.

---

### Step 5 — Create a branch

Ask: **"Branch name for this upgrade? (e.g. `upgrade/angular-18`)"**

Wait for user reply, then:

```
git checkout -b <branch-name>
```

---

### Step 6 — Snapshot state

```
todo_update → record "Starting upgrade of ${input:target} — <date>"
```

---

### Step 7 — Incremental upgrade (follow skill steps)

At each **breaking change**:

- Show the diff
- State the risk: low / med / high
- Ask: **"Apply this change? (yes / no / skip)"**

Wait for user reply before applying.

---

### Step 8 — Test after each change

```
ng test --watch=false          (if frontend changed)
dotnet test                    (if backend changed)
verify_build
```

**Do not proceed to the next change if tests fail.**

---

### Step 9 — Update documentation

- Update version pins and comments in `package.json` / `.csproj`
- Update `C:/aidocs/${input:project}/API.md` if contracts changed
- Append a summary row to `TASK_STATE.md`

---

### Step 10 — Done gate

```
verify_build
```

`Task Completion: 100%` only when all tests pass on the upgraded version.
