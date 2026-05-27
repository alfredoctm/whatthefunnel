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
- Designed the design phase: initially Figma-as-source-of-truth, then revised to **AI-driven prototype-first** after the user clarified they're not a designer. Wrote three new sub-agents (`ui-designer`, `design-handoff`, `design-reviewer`), added `docs/design-system.md`, and added per-feature `prototype.html` + `ui-spec.md` skeletons.
- Switched per-feature loop to **ordering B (two grills)**: grill requirements first (problem framing), then grill combined design + ui-spec + engineering. Updated `CLAUDE.md` and `docs/specs/README.md`.
- Added **Phase 1.5 — Design System** between Walking Skeleton and Phase 2 Features. Phase 1.5 picks the CSS framework + HTMX, builds `tokens.css`/`components.css`, and renders the first HTML page (the user-event-list from Phase 1 Slice 2) using the system — proving UI wiring end-to-end before any Phase 2 prototype exists.
- Deferred format-on-write hook to Phase 1 (no `npm install` yet).
