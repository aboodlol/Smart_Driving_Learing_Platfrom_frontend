---
description: Run verify_build and remediate any failures.
---
1. Call `verify_build` for the current workspace.
2. If it fails, append the failures to `TASK_STATE.md` via `todo_update` and fix them.
3. Re-run until green.
4. Update `ERRORS.md` if new error categories appeared.
5. End with `Task Completion: NN%`.
