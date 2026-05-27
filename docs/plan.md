# Plan — What The Funnel MVP

The dual goal: build the MVP **and** master Claude Code automation. Each phase
introduces new Claude primitives (skills, hooks, sub-agents, schedules) so the
engineering harness grows alongside the app.

See [goals.md](goals.md) for product scope. See [`CLAUDE.md`](../CLAUDE.md) for
how to work the phases (RPI, `/clear` boundaries, spec-driven features, grill-me).

## Working rules

- **Phase = fresh context.** `/clear` between phases. Re-anchor via `CLAUDE.md` + `thoughts/phase-N/`.
- **Micro-steps ≤ 3 hours.** If a step is bigger, split it before starting.
- **Vertical slices over horizontal layers.** Ship the thinnest end-to-end thing first.
- **Grill before kicking off.** Spawn `plan-griller` against any phase or feature plan before implementation.
- **Append to `thoughts/`** as you learn. Don't lose findings to context rot.

---

## Phase 0 — Set up the Claude harness

Before any app code, set up the automation surface.

- [x] **Pick a stack** — Node + Fastify for the API service (chosen 2026-05-27)
- [x] **Write `CLAUDE.md`** — always-loaded project context: stack, conventions, workflow
- [x] **Configure `.claude/settings.json`** — permissions allowlist + SessionStart hook surfacing pending plan items
- [x] **Scaffold `thoughts/`** — RPI external memory
- [x] **Scaffold `docs/specs/`** — per-feature spec skeletons (user-profiles, segmentation, funnels)
- [x] **Write `clickhouse-expert` sub-agent** — for schema and query design
- [x] **Write `plan-griller` sub-agent** — adversarial plan reviewer

## Phase 1 — Walking Skeleton

Goal: an event flows from `curl` → Fastify → ClickHouse → `SELECT` returns it.
Thinnest possible end-to-end path. No features beyond ingest + read-back.
Capture every repeated developer action as a reusable skill or hook.

- [ ] **Grill the Phase 1 plan** — run `plan-griller` against this section before starting
- [ ] **`docker-compose.yml`** — `clickhouse` + `api` services, one shared network
- [ ] **`clickhouse/init/01_events.sql`** — `events` table (invoke `clickhouse-expert` for schema)
- [ ] **`api/` skeleton** — `package.json`, `Dockerfile`, `src/server.js` with Fastify boot
- [ ] **`POST /events`** — single-event ingest, writes to ClickHouse
- [ ] **Smoke test** — `curl` an event, `SELECT` it back. End of Walking Skeleton.
- [ ] **`run` skill** (`.claude/skills/run/`) — start the stack and tail API logs
- [ ] **`send-event` skill** (`.claude/skills/send-event/`) — fire a synthetic event
- [ ] **Hook: format-on-write** — `PostToolUse` on Edit/Write of `api/**/*.js` → `prettier --write`
- [ ] **Hook: lint-on-write** — same matcher, runs `eslint --fix`
- [ ] **Hook: test-on-commit** — `PreToolUse` matching `git commit` runs `npm test`
- [ ] **Append `thoughts/phase-1/findings.md`** with anything surprising

## Phase 2 — Features (vertical slices in worktrees)

Goal: practice spec-driven, sub-agent-assisted feature delivery. Each feature
follows the same loop. Each feature happens in its own worktree
(`EnterWorktree`) so the main branch stays clean.

For each feature in this phase:

1. `/clear` and re-anchor on `CLAUDE.md` + `docs/specs/<feature>/` + `thoughts/phase-2/`.
2. Fill `requirements.md` (pair with user on ambiguity).
3. Fill `design.md`, invoking `clickhouse-expert` for storage/query parts.
4. Run `plan-griller` against `design.md`. Address blockers and risks.
5. Fill `tasks.md` — vertical slices, 1–3h each.
6. `EnterWorktree`, implement, validate via the `send-event` skill or real curl, exit worktree.
7. Append to `thoughts/phase-2/findings.md`.

Features in priority order (from `goals.md`):

- [ ] **User Profiles** — per-user event log page
- [ ] **Event Segmentation** — filter/group events by properties over time
- [ ] **Funnels** — ordered step conversion analysis (likely `windowFunnel()` in ClickHouse)

## Phase 3 — Background and scheduled automation

Goal: exercise long-running and scheduled Claude primitives.

- [ ] **Scheduled routine** — daily progress check that diffs `git log` against `docs/plan.md` and reports drift
- [ ] **Background load test** — long-running ingestion stress via `run_in_background`, with `clickhouse-expert` analyzing query perf at volume

---

## Out of scope (from goals.md)
Client/JS SDK, user properties, auth/multi-tenancy, dashboards, alerts, A/B testing.
