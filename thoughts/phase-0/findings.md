# Phase 0 — Findings

## 2026-05-27

- **Stack decision:** Node + Fastify chosen for the API service. Tradeoffs considered: Python/FastAPI (most ergonomic for analytics), Go (best perf), Rust (overkill). Node won on user familiarity.
- **ClickHouse is non-negotiable** per `docs/goals.md` — primary storage engine.
- **Docker Compose is the only supported deploy target** for MVP. No k8s, no managed services.
- **No app code yet.** Just docs and the Claude harness.
- **Claude harness pattern adopted:** `CLAUDE.md` (always-loaded context), `.claude/settings.json` (permissions + SessionStart hook printing pending plan items), `docs/plan.md` (durable roadmap), `thoughts/` (per-phase external memory), `docs/specs/` (per-feature spec dirs), `.claude/agents/` (custom sub-agents).
- **Architecture is hexagonal + CQRS + outside-in TDD — non-negotiable.** Saved as `feedback_architecture` memory. Plan-griller and code-reviewer are explicitly told NOT to flag these as "MVP overkill."
- **`jq --argjson` is strict.** First version of `scripts/audit` used `${2:-{}}` for the default; the inner `{}` collides with shell parameter expansion and yields a trailing `}`. Fixed with explicit `[ -z "$X" ] && X='{}'`.
- **Hook input format:** Claude Code PreToolUse hooks receive `{tool_name, tool_input, ...}` on stdin as JSON. Extract with `jq -r '.tool_input.file_path // empty'`. Exit 2 to deny, with the user-facing reason on stderr.
- **TDD-guard bootstrap:** the hook allows edits to `api/src/**` if the dir doesn't exist or is empty, so initial scaffolding doesn't get blocked before any test framework exists. After the first file lands, the lock engages.
