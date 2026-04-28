---
applyTo: "**/*.sql,**/Migrations/**/*.cs"
---

# SQL & EF Core Migration Instructions

## SQL files

- **Always use parameterised queries** — never build SQL by string concatenation or interpolation.
- Add `WITH (NOLOCK)` hints only when a dirty read is explicitly acceptable; document the reason in a comment.
- Wrap multi-statement scripts in a `BEGIN TRANSACTION … COMMIT` block with a `ROLLBACK ON ERROR` handler.
- Every DDL script must include an idempotency guard:
  ```sql
  IF OBJECT_ID('dbo.MyTable', 'U') IS NULL
  IF COL_LENGTH('dbo.MyTable', 'NewColumn') IS NULL
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_…')
  ```
- Never use `SELECT *` — list columns explicitly.
- Add `SET NOCOUNT ON` at the top of stored procedures.

## EF Core migrations

- **Never remove a migration that has been applied** to any non-local environment.
- **Always implement `Down()`** — an empty `Down()` is a defect.
- Call `migrationBuilder.CreateIndex` for every new foreign key column (EF does not always do this automatically).
- For data migrations: use `migrationBuilder.Sql("...")` with idempotent SQL (not raw C# LINQ) so the script is replayable.
- **`DropColumn` / `DropTable`**: require explicit review and a confirmed backup before applying to staging or prod.
- **Column renames**: always use `migrationBuilder.RenameColumn` — never Drop + Add (loses data).
- Do not run `dotnet ef database update` on staging or prod without a backup — ask the user to confirm the backup first.
- Review the generated migration file before applying — EF may emit destructive operations that weren't intended.

## Naming conventions

| Object         | Convention                           | Example                                        |
| -------------- | ------------------------------------ | ---------------------------------------------- |
| Table names    | PascalCase, plural                   | `SchoolYears`                                  |
| Column names   | PascalCase                           | `CreatedAt`                                    |
| Primary key    | `Id`                                 | `Id`                                           |
| Index          | `IX_[Table]_[Column]`                | `IX_Students_NationalId`                       |
| Unique index   | `UX_[Table]_[Column]`                | `UX_Users_Email`                               |
| Foreign key    | `FK_[Table]_[RelatedTable]_[Column]` | `FK_Students_Schools_SchoolId`                 |
| Migration name | Describe the change                  | `AddCreatedAtToUsers`, not `Migration20240101` |
