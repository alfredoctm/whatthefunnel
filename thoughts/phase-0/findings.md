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
- **Design phase is AI-driven, prototype-first — NOT Figma-first.** Saved as `feedback_design_workflow` memory. The reasoning matters: "Figma is source of truth" + "user is not a designer" don't compose (Figma has no good programmatic write API, so the user would end up doing Figma work). Generating prototypes directly in the project's CSS framework eliminates the Figma-to-CSS translation gap and keeps the user off the design hook. Figma is optional documentation, never on the critical path.
- **Per-feature loop is now 8 steps (ordering B — two grills).** Grill 1 attacks requirements (problem framing); Grill 2 attacks combined design (engineering + ui-spec + prototype). Catches misframed problems before any design work; catches design/engineering mismatches before any implementation work.
- **Phase 1.5 (Design System) is a real deliverable**, not just docs. Picks CSS framework + HTMX, builds tokens.css and components.css, renders the first HTML page reusing Phase 1 Slice 2's query handler. Proves the UI wiring end-to-end before any feature's prototype matters.
