---
description: Plan a non-trivial task with risk + rollback before coding.
---
You are about to start a non-trivial task. Before writing any code:

1. Call `list_skills` and pick the relevant ones.
2. Read `C:/aidocs/${input:project}/TASK_STATE.md` via `todo_read`.
3. Produce a numbered plan with:
   - Files touched
   - Risk score (low/med/high)
   - Rollback steps
   - Estimated completion %
4. Persist via `todo_update`.
5. End with `Task Completion: NN%`.

Task: ${input:task}
