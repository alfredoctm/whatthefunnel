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

- **Language:** TypeScript 5.x (strict, ESM)
- **API:** Node.js + Fastify
- **Storage:** ClickHouse
- **Orchestration:** Docker Compose
- **Tests:** Jest + `ts-jest` + `fastify.inject()`

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
  design-system.md  Tokens, base components, CSS framework choice
  specs/            Per-feature requirements / prototype / ui-spec / design / tasks
thoughts/           Per-phase findings + progress log
scripts/            tdd state manager, audit logger, hook scripts
CLAUDE.md           Project context for Claude Code
.claude/
  settings.json     Permissions + hooks (SessionStart, TDD-guard)
  agents/           Custom sub-agents (clickhouse-expert, plan-griller, code-reviewer)
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
  - `clickhouse-expert` — schema and query specialist (port-contract aware)
  - `plan-griller` — adversarial plan reviewer (pre-implementation)
  - `code-reviewer` — adversarial engineering-diff reviewer (post-implementation)
  - `ui-designer` — AI designer; produces `prototype.html` + `ui-spec.md` per feature
  - `design-handoff` — translates a feature's prototype into the implementation wiring plan
  - `design-reviewer` — compares the rendered feature against the canonical prototype
- **[`.claude/settings.json`](.claude/settings.json)** — permission allowlist
  plus two hooks: `SessionStart` (surfaces pending plan items, logs to audit) and
  `PreToolUse` (TDD-guard — blocks edits to `api/src/**` unless a failing test is
  driving).
- **[`scripts/`](scripts/)** — `tdd` (RED/GREEN/UNLOCK state manager),
  `audit` (append-only event log helper), `hooks/tdd-guard.sh` (the
  PreToolUse hook script). Together they enforce outside-in TDD via the
  harness rather than discipline alone, and record every transition in
  `.claude/audit.jsonl`.

If you're working on this repo with Claude Code, start by reading `CLAUDE.md`
and the current phase in `docs/plan.md`.

**Design approach:** UI design is AI-driven and prototype-first — `ui-designer`
generates `docs/specs/<feature>/prototype.html` (rendered with the project's
CSS framework) as the source of truth. Engineering reads the prototype during
implementation; `design-reviewer` validates the rendered feature against it
post-build. Figma is optional documentation, not a critical-path tool.

## Out of scope (MVP)

Client/JS SDK, user properties, auth & multi-tenancy, dashboards, alerts,
A/B testing. See [`docs/goals.md`](docs/goals.md).
