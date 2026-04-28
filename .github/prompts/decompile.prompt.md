---
description: >
  Reverse-engineering / decompile workflow for when source code is unavailable.
  Always asks for legal justification first. Never commits decompiled output.
---

## Decompile / Reverse Engineering — ${input:target}

### Project: ${input:project}

---

> **STOP — Required confirmation before proceeding.**
>
> Ask the user:
>
> 1. "What is the **legal and business reason** for decompiling this artifact?"
> 2. "Do you have the rights to inspect it? (Your own compiled output / licence permits inspection / debugging your own production build?)"
>
> **Only proceed after the user provides a clear, legitimate reason.**
> Decompiled code is for **reference only** — never copy it into the workspace or commit it.

---

### Step 1 — Prefer non-decompile options first

Check all of these before decompiling:

| Option                                     | How                                |
| ------------------------------------------ | ---------------------------------- |
| Source on GitHub / internal repo           | Search repo, ask team              |
| Official documentation                     | Docs site, NuGet readme            |
| Swagger / OpenAPI spec                     | `/swagger/v1/swagger.json`         |
| VS Code "Go to Definition" via Source Link | Right-click → Go to Definition     |
| NuGet source link                          | Open package on nuget.org → source |

> If **any** option above resolves the need, use it instead. Stop here.

---

### Step 2 — Tool selection

| Source                               | Recommended tool                                    |
| ------------------------------------ | --------------------------------------------------- |
| .NET DLL / assembly                  | `ilspycmd` (CLI), ILSpy (GUI), or dotPeek           |
| Minified JavaScript                  | Browser DevTools → Sources → Pretty Print           |
| TypeScript bundle (no source maps)   | `source-map-explorer`                               |
| TypeScript bundle (with source maps) | `ng build --source-map` → DevTools Sources          |
| Live API contract                    | `/swagger/v1/swagger.json` or Swagger UI            |
| DB schema from live DB               | `dotnet ef dbcontext scaffold` (Step 5 — ask first) |
| NuGet package source                 | NuGet.org → Source Link or SourceBrowser            |

---

### Step 3 — .NET assembly via ilspycmd

```bash
# Verify ilspycmd is installed
where ilspycmd

# Decompile to a TEMP folder — never inside the workspace
ilspycmd "path\to\assembly.dll" -p -o "C:\Temp\decompiled-${input:target}"
```

Review output in `C:\Temp\decompiled-${input:target}`.
**Do not copy files into the workspace.**

---

### Step 4 — JavaScript / TypeScript bundle analysis

```bash
# Build with source maps
ng build --configuration production --source-map

# Visualise bundle (opens an HTML report)
npx source-map-explorer "dist/**/*.js" --html "C:\Temp\bundle-report.html"
start "C:\Temp\bundle-report.html"
```

---

### Step 5 — EF Core scaffold from live DB (ask first)

> Ask the user: **"This will generate model files from a live database connection. Confirm the connection string is safe to use here. Proceed? (yes / no)"**

```bash
dotnet ef dbcontext scaffold \
  "${input:connectionString}" \
  Microsoft.EntityFrameworkCore.SqlServer \
  --output-dir "C:\Temp\ScaffoldedModels-${input:project}" \
  --no-build
```

Review output in `C:\Temp\ScaffoldedModels-${input:project}`.
**Do not commit scaffolded files.**

---

### Step 6 — Document findings

Write a summary to `C:\Temp\decompile-notes-${input:target}.md` (or a scratch file outside the workspace):

```markdown
## Decompile Notes — ${input:target}

Date: [today]
Reason: [user's stated reason]

### Findings

- [What was discovered]
- [Discrepancies vs current implementation]

### References

- [Source links — no raw decompiled code]
```

If the findings affect the frontend contract, update `C:/aidocs/${input:project}/API.md` with **reference notes only**.
