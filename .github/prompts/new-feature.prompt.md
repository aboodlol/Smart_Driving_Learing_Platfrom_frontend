---
description: >
  Scaffold a new Angular feature + .NET endpoint end-to-end.
  Asks the user clarifying questions before generating any code.
---

## New Feature: ${input:feature}

### Project: ${input:project}

---

### Step 1 — Load skills

```
list_skills
```

Pick relevant skills: `angular-frontend`, `dotnet-backend`, `csharp-async`, `aspnet-minimal-api-openapi`.

---

### Step 2 — Read task state

```
todo_read   → C:/aidocs/${input:project}/TASK_STATE.md
```

---

### Step 3 — Clarifying questions (ask the user, wait for answers)

Before writing a single line of code, ask:

1. **Feature type**: CRUD (list/create/edit/delete)? Custom workflow? Read-only report?
2. **User roles**: Which roles can access this? (affects route guard + JWT claim check)
3. **API**: New endpoint(s) needed, or reuse existing?
4. **Data**: New DB table/entity, or extend existing?
5. **UI entry point**: New route? Modal? Tab inside an existing page?
6. **i18n**: Any new translation keys needed? (provide Arabic + English values)
7. **Validation rules**: Required fields, formats, business rules?
8. **Error handling**: What should happen on API failure?

> Wait for the user to answer ALL questions before proceeding.

---

### Step 4 — Plan

Produce a numbered plan with:

- Files to create (backend + frontend)
- Files to modify
- Risk score: low / med / high
- Rollback steps

Get user confirmation: **"Shall I proceed with this plan? (yes/no)"**

---

### Step 5 — Backend scaffold (if new endpoint needed)

1. Domain entity in `Domain/Entities/`
2. Repository interface in `Application/Interfaces/`
3. EF Core repository in `Infrastructure/Repositories/`
4. Application service / CQRS command+handler in `Application/`
5. API controller in `API/Controllers/`
6. EF migration — **ask user before running `dotnet ef migrations add`**

---

### Step 6 — Frontend scaffold

1. Feature service in `modules/<feature>/services/`
2. DTOs matching the API response (TypeScript interfaces, no `any`)
3. Smart container component (data-fetching, routing)
4. Dumb presentational components (pure `@Input`/`@Output`)
5. Route added to the feature routing module
6. i18n keys added to `assets/i18n/ar.json` (and `en.json` if present)

---

### Step 7 — Update API contract

Update `C:/aidocs/${input:project}/API.md` with:

- New endpoint(s) + method + auth claims
- Request + Response DTOs with examples
- All error codes + HTTP status codes
- Copy-pasteable curl + Angular service snippet

---

### Step 8 — Verify

```
verify_build
```

Do not mark task complete until build passes.

```
todo_update  → mark task complete in TASK_STATE.md
```

`Task Completion: 100%`
