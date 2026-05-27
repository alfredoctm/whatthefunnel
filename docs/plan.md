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

Goal: an event flows from `curl` → Fastify → command handler → ClickHouse,
then `curl` GET → query handler → ClickHouse → JSON back. Thinnest possible
end-to-end path through the **full hexagonal stack** (so the architecture is
proven, not just sketched). No features beyond ingest + read-back.

Built **outside-in**: every code step is preceded by a failing acceptance test.

### Tooling decisions (do first)

- [ ] **Pick test framework + mocking style** — recommend `vitest` + `fastify.inject()` + hand-rolled in-memory port fakes. Lock in `package.json`.
- [ ] **Grill the Phase 1 plan** — run `plan-griller` against this section before writing any code

### Infrastructure

- [ ] **`docker-compose.yml`** — `clickhouse` + `api` services, one shared network
- [ ] **`clickhouse/init/01_events.sql`** — `events` table (invoke `clickhouse-expert`; ask it for the writer-port and reader-port contracts in the same response)
- [ ] **`api/package.json` + `api/Dockerfile`** + minimal `api/src/server.js` that boots Fastify

### Slice 1 — Ingest one event (outside-in)

- [ ] **Acceptance test:** `api/test/acceptance/ingest.test.js` — `fastify.inject` `POST /events` with a valid body, expect 202 and assert via an in-memory `EventWriterPort` fake that the event was written.
- [ ] **Define port:** `api/src/application/ports/EventWriterPort.js` (interface only)
- [ ] **Define command + handler:** `IngestEventCommand`, `IngestEventHandler` — handler depends on `EventWriterPort`. Unit-test the handler with the fake.
- [ ] **Inbound adapter:** `api/src/adapters/inbound/http/events.js` — Fastify route that builds the command and calls the handler.
- [ ] **Outbound adapter:** `api/src/adapters/outbound/clickhouse/ClickHouseEventWriter.js` — implements `EventWriterPort`.
- [ ] **Composition:** `api/src/composition.js` wires the real adapter into the handler. Acceptance test now green against a fake; a separate integration test green against the real ClickHouse from docker-compose.

### Slice 2 — Read events back (outside-in)

- [ ] **Acceptance test:** `GET /users/:user_id/events` returns the events written in Slice 1 (assert via an in-memory `EventReaderPort` fake).
- [ ] **Define port:** `EventReaderPort` (separate from writer per CQRS).
- [ ] **Define query + handler:** `GetUserEventsQuery`, `GetUserEventsHandler`.
- [ ] **Inbound adapter:** Fastify route for the GET.
- [ ] **Outbound adapter:** `ClickHouseEventReader` implements `EventReaderPort`.
- [ ] **Wire in `composition.js`.** Walking Skeleton ends green here.

### Claude harness expansion

- [ ] **`run` skill** (`.claude/skills/run/`) — start the stack and tail API logs
- [ ] **`send-event` skill** (`.claude/skills/send-event/`) — fire a synthetic event
- [ ] **Hook: format-on-write** — `PostToolUse` on Edit/Write of `api/**/*.js` → `prettier --write`
- [ ] **Hook: lint-on-write** — same matcher, runs `eslint --fix`
- [ ] **Hook: test-on-commit** — `PreToolUse` matching `git commit` runs `npm test` (unit + acceptance, not the docker integration tier)
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
