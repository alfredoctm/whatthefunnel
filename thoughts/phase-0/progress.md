# Phase 0 — Progress

## 2026-05-27

- Picked Node + Fastify as API stack.
- Wrote `docs/plan.md` (4-phase roadmap, Phase 0 complete).
- Wrote `CLAUDE.md` (stack, layout, run commands, conventions, Claude-first workflow notes).
- Wrote `.claude/settings.json` with permissions allowlist (docker compose, npm, npx, node, curl, jq, read-only git) and a SessionStart hook printing pending plan items.
- Adopted RPI workflow: created `thoughts/` for external memory.
- Adopted spec-driven feature dev: created `docs/specs/` skeletons.
- Wrote custom sub-agents: `clickhouse-expert`, `plan-griller`.
- Locked in architectural preferences (hexagonal + CQRS + outside-in TDD); cascaded into `CLAUDE.md`, `docs/plan.md` Phase 1 (now slice-based + acceptance-test-first), all `docs/specs/*/design.md` templates, and both sub-agents.
- Cribbed three patterns from nWave: TDD-enforcement hook (`scripts/hooks/tdd-guard.sh` + `scripts/tdd` state manager), audit log (`scripts/audit` → `.claude/audit.jsonl`), and a `code-reviewer` sub-agent (post-implementation counterpart to plan-griller).
- Wrote `.gitignore` (was missing the Claude-harness exclusions).
- Deferred format-on-write hook to Phase 1 (no `npm install` yet).
