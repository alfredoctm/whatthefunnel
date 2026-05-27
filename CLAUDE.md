# What The Funnel (WTF)

Self-hostable, open-source product analytics for solo devs and small startups.
A lightweight alternative to Amplitude, deployable via Docker Compose.

See [docs/goals.md](docs/goals.md) for product scope and [docs/plan.md](docs/plan.md)
for the build sequence.

## Stack

- **API service:** Node.js + Fastify
- **Storage:** ClickHouse (primary, non-negotiable per goals)
- **Orchestration:** Docker Compose — one command runs the whole stack
- **Package manager:** npm

## Layout

Target structure as the project grows. The `api/` tree follows hexagonal
(ports & adapters) — see **Architecture** below.

```
api/
  src/
    domain/                  Pure value objects (Event, UserId, …). No I/O.
    application/
      commands/              Command + handler pairs (writes)
      queries/               Query + handler pairs (reads)
      ports/                 Interfaces (EventWriterPort, EventReaderPort, …)
    adapters/
      inbound/http/          Fastify routes calling handlers
      outbound/clickhouse/   ClickHouse implementations of ports
    composition.js           Wires adapters into handlers
    server.js                Boots Fastify
  test/
    acceptance/              Outside-in entry points (fastify.inject)
    unit/                    Narrower tests as outside-in flow demands them
  package.json
  Dockerfile
clickhouse/init/             Schema migrations, auto-loaded on first boot
docker-compose.yml           Stack definition: api + clickhouse
docs/
  goals.md                   Product scope, success criteria
  plan.md                    Durable phase-by-phase roadmap
  specs/                     Per-feature requirements.md / design.md / tasks.md
thoughts/                    Per-phase findings.md + progress.md (external memory)
scripts/
  audit                      Append a JSON event to .claude/audit.jsonl
  tdd                        Manage TDD phase state (RED/GREEN/UNLOCK)
  hooks/tdd-guard.sh         PreToolUse hook enforcing outside-in TDD
.claude/
  settings.json              Permissions, hooks
  agents/                    Custom sub-agents (clickhouse-expert, plan-griller, code-reviewer)
  skills/                    Project-local skills (Phase 1+)
  tdd-state                  (gitignored) current TDD phase: RED|GREEN|UNLOCK
  audit.jsonl                (gitignored) append-only event log
```

## How to run

```bash
docker compose up -d        # start clickhouse + api
docker compose logs -f api  # tail api logs
docker compose down         # stop
```

Once a `run` skill exists (Phase 1), prefer invoking it over raw docker commands.

## Architecture

These are non-negotiable. Do not propose dropping them as "premature complexity for an MVP" — they are stated requirements.

### Hexagonal (ports & adapters)

- **Pure core, dirty edges.** `domain/` and `application/` have no I/O and no framework imports. All I/O crosses an explicit port (interface) implemented by an adapter under `adapters/`.
- **Direction of dependency points inward.** Adapters import from the core; the core never imports from adapters.
- **Wiring lives in `composition.js`.** It is the only place that knows the concrete adapter classes. Handlers receive ports via constructor injection.

### CQRS — commands and queries are separate

- **Writes go through commands.** `commands/IngestEventCommand` → `commands/IngestEventHandler` → writes via `EventWriterPort`.
- **Reads go through queries.** `queries/GetUserEventsQuery` → `queries/GetUserEventsHandler` → reads via `EventReaderPort`.
- **Reader and writer ports are separate interfaces** even when the same ClickHouse adapter implements both — this preserves the option of read replicas, materialized views, or projection stores later.
- **A handler is either a command or a query, never both.**

### Outside-in TDD

- **Each vertical slice starts with a failing acceptance test** at the outermost boundary (HTTP for API features, via `fastify.inject()`).
- **Discover collaborators by what the test demands.** Mock at port boundaries, drop down to the next level only when the failing test requires the next layer to exist.
- **Do not write a handler before the test that demands it.** Do not write an adapter before the handler demands it.
- **First commit of a slice is the failing acceptance test.**

This is enforced by the **TDD-guard hook** — see "Harness automation" below.

## Conventions

- **No premature abstraction outside the hexagonal split.** The hexagonal layout is required; everything *inside* a layer follows "three similar lines beats an early helper."
- **No comments unless the WHY is non-obvious.** Naming carries the WHAT.
- **No backwards-compat shims.** Pre-1.0 — change code directly.
- **Skills over memorized commands.** If you'd run the same command 3+ times, make it a skill in `.claude/skills/`.
- **Hooks over reminders.** Automate repeated checks (format, lint, test) via `.claude/settings.json` hooks rather than asking Claude to remember them.

## Claude-first workflow

This project's secondary goal is mastery of Claude Code automation. Favor:

- **Plan mode** before non-trivial features
- **Sub-agents** for research and parallel work — see `.claude/agents/`
- **Skills** for repeated developer actions
- **Hooks** for behavioral automation tied to events (PreToolUse, Stop, etc.)
- **Scheduled routines** for periodic checks (progress vs. goals, etc.)
- **Worktrees** for isolated feature development (Phase 2 onward)

### Phase = fresh context

Each phase in `docs/plan.md` should start with `/clear`. The SessionStart hook
will surface pending plan items, `CLAUDE.md` re-anchors stack/conventions, and
the current phase's `thoughts/phase-N/findings.md` carries forward what we
learned. Don't drag stale context across phase boundaries — context rot is real
and a fresh window is free.

### RPI loop with `thoughts/`

Inside a phase, follow Research → Plan → Implement → Validate → Iterate. State
that survives `/clear` lives in:

- `thoughts/phase-N/findings.md` — what we learned (quirks, decisions, dead-ends)
- `thoughts/phase-N/progress.md` — chronological log of completed steps

Append as you go. Before `/clear`-ing, make sure both files reflect the session.

### Spec-driven features

Phase 2 features get their own dir under `docs/specs/<feature>/`:

1. Fill `requirements.md` (user-facing behavior, success criteria) *before* any design.
2. Fill `design.md` (data model, queries, endpoints) *before* any implementation. Invoke `clickhouse-expert` sub-agent for the storage/query parts.
3. Run **grill-me**: invoke the `plan-griller` sub-agent against the design before writing `tasks.md`. Address blockers and risks.
4. Fill `tasks.md` with 1–3 hour vertical slices.
5. Implement in a worktree (`EnterWorktree`) — keep feature work isolated.

### Grill-me discipline

Before kicking off a phase or implementing a feature, spawn `plan-griller` to
attack the plan. It returns a Blocker / Risk / Smell / Nit punch list and a
GO / GO WITH CHANGES / REWORK verdict. Cheaper than discovering the issue
mid-implementation.

After implementing a slice and getting tests green, spawn `code-reviewer` —
plan-griller's post-implementation counterpart. It attacks the *diff* against
the spec, the architecture rules, and the audit log (did you actually do
outside-in TDD?). Same Blocker/Risk/Smell/Nit format, verdict SHIP / SHIP WITH
FIXES / DO NOT SHIP.

## Harness automation

Two pieces of automation enforce the workflow, not just document it.

### TDD-guard hook (`scripts/hooks/tdd-guard.sh`)

A `PreToolUse` hook on `Write|Edit`. Behavior:

- If the target path is not under `api/src/**` → allow.
- If `api/src/` doesn't exist or is empty (bootstrap) → allow.
- If `.claude/tdd-state` contains `RED` or `UNLOCK` → allow.
- Otherwise → **deny** (exit 2). Stderr surfaces to Claude with the workflow.

Transition state with `scripts/tdd`:

```bash
scripts/tdd red <test-path>     # after writing a failing test
scripts/tdd green               # after the test passes (re-locks api/src/**)
scripts/tdd unlock "<reason>"   # explicit override (audited)
scripts/tdd status              # print current state
```

The guard's job is to make outside-in TDD physically harder to skip than to
follow. If you find yourself unlocking constantly, the rule isn't working —
revisit before disabling.

### Audit log (`.claude/audit.jsonl`)

Append-only JSON-lines log of harness events: session starts, hook blocks, TDD
state transitions. Every entry is `{ts, event, details}`.

Written via:

```bash
scripts/audit <event> '<details-as-json>'
```

Both `.claude/tdd-state` and `.claude/audit.jsonl` are gitignored — they're
per-working-tree state, not shared truth. Use the log to diagnose discipline
drift ("how often did we unlock last week?") or to feed the `code-reviewer`
agent when reviewing a slice.

## Out of scope (per goals.md)

Client/JS SDK, user properties, auth/multi-tenancy, dashboards, alerts, A/B testing.
