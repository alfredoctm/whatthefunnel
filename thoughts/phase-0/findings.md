# Phase 0 — Findings

## 2026-05-27

- **Stack decision:** Node + Fastify chosen for the API service. Tradeoffs considered: Python/FastAPI (most ergonomic for analytics), Go (best perf), Rust (overkill). Node won on user familiarity.
- **ClickHouse is non-negotiable** per `docs/goals.md` — primary storage engine.
- **Docker Compose is the only supported deploy target** for MVP. No k8s, no managed services.
- **No app code yet.** Just docs and the Claude harness.
- **Claude harness pattern adopted:** `CLAUDE.md` (always-loaded context), `.claude/settings.json` (permissions + SessionStart hook printing pending plan items), `docs/plan.md` (durable roadmap), `thoughts/` (per-phase external memory), `docs/specs/` (per-feature spec dirs), `.claude/agents/` (custom sub-agents).
