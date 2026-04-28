---
description: >
  Debug an issue interactively. Collects full error context from the user
  before forming any hypothesis — never guess without data.
---

## Debug Session — ${input:issue}

> **Do not diagnose yet.** First collect all context below.

### Step 1 — Ask the user for these (all are required)

Please provide:

1. **Exact error message** — copy-paste the full text (not a paraphrase)
2. **Stack trace** — browser Console tab, or server terminal output
3. **Network request** (if API-related) — paste the failing request URL + status code + response body from the Network tab
4. **Steps to reproduce** — numbered, from a blank state
5. **Expected behavior** — what should happen?
6. **Actual behavior** — what happens instead?
7. **Environment** — `dev` / `QA` / `staging` / `prod`? Which browser and version?
8. **When did it start?** — was it working before? What changed recently?

> If any of the above is genuinely not available, say so explicitly.
> Never skip this step and jump straight to code changes.

---

### Step 2 — Correlate with recent changes

Once the user replies, run:

```
check_git_status
```

Look for recent commits that touched files related to the error path.

---

### Step 3 — Root cause hypothesis

Only after context is collected:

- State the **most likely root cause** in one sentence
- State **2 alternative causes** in case the primary is wrong
- Assign a confidence level: High / Medium / Low

---

### Step 4 — Fix

- Output **diff-only** changes (never paste full files)
- Include a **Logic Check** — mentally trace the fix step-by-step
- Include a **Rollback** — how to revert if the fix makes things worse

---

### Step 5 — Verify

```
verify_build
```

Do not claim the issue is fixed until `verify_build` passes and the user confirms the behaviour is resolved.
