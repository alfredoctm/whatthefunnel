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

Target structure as the project grows:

```
api/                 Fastify service (POST /events, query endpoints)
  src/
  package.json
  Dockerfile
clickhouse/          Init SQL, schema migrations
  init/              Auto-loaded by clickhouse-server on first boot
docker-compose.yml   Stack definition: api + clickhouse
docs/
  goals.md           Product scope, success criteria
  plan.md            Durable phase-by-phase roadmap
  specs/             Per-feature requirements.md / design.md / tasks.md
thoughts/            Per-phase findings.md + progress.md (external memory)
.claude/
  settings.json      Permissions, hooks
  agents/            Custom sub-agents (clickhouse-expert, plan-griller)
  skills/            Project-local skills (Phase 1+)
```

## How to run

```bash
docker compose up -d        # start clickhouse + api
docker compose logs -f api  # tail api logs
docker compose down         # stop
```

Once a `run` skill exists (Phase 1), prefer invoking it over raw docker commands.

## Conventions

- **No premature abstraction.** MVP scope is tight — three similar lines beats an early helper.
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

## Out of scope (per goals.md)

Client/JS SDK, user properties, auth/multi-tenancy, dashboards, alerts, A/B testing.
