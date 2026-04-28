---
applyTo: "**/*.cs"
---

# Backend (.NET) instructions

## Core rules

- Clean Architecture: Domain / Application / Infrastructure / API.
- EF Core + Repository + Unit of Work. NEVER inline SQL.
- Async everywhere; pass `CancellationToken` through all async calls.
- Standardized error responses via `ProblemDetails` — no custom error shapes.
- Structured logging (`ILogger<T>` / Serilog). No `Console.WriteLine` in any layer.
- Verify EF migrations create indexes for all FK columns and filtered queries.
- After any backend change → update `C:/aidocs/<project>/API.md`.

## Layer dependency rules (enforce strictly)

- **Domain** — no references to any other project. Pure C#: entities, value objects, domain events, interfaces.
- **Application** — references Domain only. Commands, queries, handlers, validators, DTOs, service interfaces.
- **Infrastructure** — references Application + Domain. EF Core, external services, repository implementations.
- **API** — references Application only. Controllers, middleware, filters, DI wiring.
- **Violation pattern**: if a controller references a repository directly, or a domain entity imports EF Core → flag immediately.

## Consistency checks (run after every change)

1. **Naming** — `I*` interface prefix; `*Repository`, `*Service`, `*Handler`, `*Command`, `*Query`, `*Dto` suffix.
2. **Handler pattern** — every CQRS handler follows: validate → fetch → mutate → persist → return. Do not skip steps.
3. **Repository pattern** — all DB access through `IRepository<T>` or dedicated read-service; no raw `DbContext` in Application.
4. **Async all the way** — no `.Result`, `.Wait()`, or `Task.Run()` wrapping sync code.
5. **CancellationToken** — passed as last parameter to every async method signature.
6. **Error handling** — domain errors use `Result<T>` or domain exceptions; infrastructure errors are caught at the API boundary via global middleware.

```
⚠️ Consistency: <file>:<line>
Expected: <pattern from sibling files>
Found:    <what was written>
Fix: <diff-only>
```

## Refactoring suggestions (advisory — never auto-apply)

Scan modified files for:

- Service class > 300 lines handling ≥2 unrelated responsibilities → suggest splitting by bounded context.
- Method > 30 lines → suggest decomposing into named private methods.
- Repeated `try/catch` blocks in ≥2 handlers → suggest a shared pipeline behaviour (MediatR `IPipelineBehavior`).
- Entity with only getters/setters and all logic in a service → anemic domain model warning.
- Controller action > 15 lines → suggest moving logic to a command/query handler.

```
💡 Refactor suggestion (advisory — not applied):
File: <path> (lines N–M)  Pattern: <description>
Suggestion: <what>  Effort: Low/Med/High  Impact: <why>
```

## Architecture suggestions (advisory — never auto-apply)

| Signal                                                        | Suggestion                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Simple CRUD wrapped in Command + Handler + Validator + Mapper | "A thin service method may suffice; full CQRS adds overhead for simple CRUD."        |
| `IRepository<T>` exposing `IQueryable<T>` to Application      | "Leaking IQueryable breaks encapsulation — return typed DTOs from the repository."   |
| MediatR notification for a synchronous in-process side effect | "Direct service call is clearer; events add async indirection without benefit here." |
| DbContext referenced directly inside a Domain entity          | "Domain must not know EF Core — move persistence logic to Infrastructure."           |
| God service with >5 injected dependencies                     | "This service may have too many responsibilities — consider splitting by concern."   |

```
🏗️ Architecture note (advisory — no change made):
Context: <observed>  Concern: <why heavy>
Lighter alternative: <suggestion>  Trade-off: <gain vs cost>
```
