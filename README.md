# What The Funnel (WTF)

A self-hostable, open-source product analytics platform for solo developers and
small startups — a lightweight alternative to Amplitude, deployable with Docker
Compose in minutes.

> **Status:** pre-MVP. No working code yet. The harness, plan, and specs are in
> place; implementation starts in Phase 1. See [`docs/plan.md`](docs/plan.md) for
> live status.

## Why

Amplitude is best-in-class but overkill (and too expensive) for side projects.
WTF aims to cover the core analytics use cases — user profiles, event
segmentation, funnels — backed by ClickHouse, deployable by any developer
comfortable with Docker.

Full scope and success criteria: [`docs/goals.md`](docs/goals.md).

## Stack

- **API:** Node.js + Fastify
- **Storage:** ClickHouse
- **Orchestration:** Docker Compose

## Quickstart

> Not runnable yet — coming in Phase 1 of the [plan](docs/plan.md).

Once the Walking Skeleton lands:

```bash
docker compose up -d
curl -X POST http://localhost:3000/events \
  -H 'content-type: application/json' \
  -d '{"user_id":"u1","event":"signup","timestamp":"2026-05-27T12:00:00Z"}'
```

## Repo layout

```
api/                Fastify service                        (Phase 1)
clickhouse/init/    Schema migrations                      (Phase 1)
docker-compose.yml  Stack definition                       (Phase 1)
docs/
  goals.md          Product scope, success criteria
  plan.md           Phase-by-phase roadmap
  specs/            Per-feature requirements / design / tasks
thoughts/           Per-phase findings + progress log
CLAUDE.md           Project context for Claude Code
.claude/
  settings.json     Permissions + SessionStart hook
  agents/           Custom sub-agents (clickhouse-expert, plan-griller)
```

## Built with Claude Code

WTF is also a learning project for AI-automated engineering. The repo is set up
to be worked on with [Claude Code](https://claude.com/claude-code) end-to-end:

- **[`CLAUDE.md`](CLAUDE.md)** — always-loaded project context: stack,
  conventions, and the working discipline (phase = fresh context, RPI loop,
  spec-driven features, grill-me before kickoff).
- **[`docs/plan.md`](docs/plan.md)** — durable, phase-by-phase roadmap. Phase 0
  built the harness; Phase 1 is the Walking Skeleton; Phase 2 ships features as
  vertical slices in worktrees; Phase 3 adds background and scheduled
  automation.
- **[`docs/specs/`](docs/specs/)** — each MVP feature has its own
  `requirements.md` / `design.md` / `tasks.md`, filled out *before*
  implementation.
- **[`thoughts/`](thoughts/)** — external memory across Claude sessions:
  per-phase `findings.md` (what we learned) and `progress.md` (what got done).
- **[`.claude/agents/`](.claude/agents/)** — custom sub-agents:
  - `clickhouse-expert` — schema and query specialist
  - `plan-griller` — adversarial plan reviewer
- **[`.claude/settings.json`](.claude/settings.json)** — permission allowlist
  for the project's tools and a `SessionStart` hook that surfaces pending plan
  items at the start of every session.

If you're working on this repo with Claude Code, start by reading `CLAUDE.md`
and the current phase in `docs/plan.md`.

## Out of scope (MVP)

Client/JS SDK, user properties, auth & multi-tenancy, dashboards, alerts,
A/B testing. See [`docs/goals.md`](docs/goals.md).
