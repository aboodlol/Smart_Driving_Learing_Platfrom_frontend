---
applyTo: "**/*.cs"
---
# Backend (.NET) instructions

- Clean Architecture: Domain / Application / Infrastructure / API.
- EF Core + Repository + Unit of Work. NEVER inline SQL.
- Async everywhere; pass `CancellationToken`.
- Standardized error responses via `ProblemDetails`.
- Structured logging (Serilog/ILogger). No `Console.WriteLine`.
- Verify EF migrations create needed indexes.
- After backend change → update `C:/aidocs/<project>/API.md`.
