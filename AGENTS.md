# AGENTS.md — VS Code AI Orchestrator

This file is recognized by the GitHub Copilot Coding Agent and other
AGENTS.md-aware tools as the source of repo-level agent guidance. It
mirrors `.github/copilot-instructions.md`; both should be kept in sync.

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for
the full master ruleset.

## Quick reference

- MCP server: `vscode-orchestrator` (configured in `.vscode/mcp.json`)
- Project memory: `C:/aidocs/<project-slug>/`
- Required response trailer: `Task Completion: NN%`
- Before any non-trivial task: call `list_skills`
- Before any library/version recommendation: call `web_search` + `check_versions`
- Before declaring "done": call `verify_build`
- Never run destructive git/db ops without explicit user "yes"
