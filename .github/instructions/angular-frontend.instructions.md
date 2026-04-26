---
applyTo: "**/*.{ts,html,scss}"
---
# Frontend (Angular) instructions

- Standalone Angular components. Strict TypeScript. RxJS for async/state.
- No `any`. Use DTOs from `C:/aidocs/<project>/API.md`.
- Components: smart/dumb split. Services: stateless except via signals/stores.
- Validate every form input; surface server errors via the global handler.
