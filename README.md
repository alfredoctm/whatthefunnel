# What The Funnel (WTF)

A self-hostable, open-source product analytics platform for solo developers and
small startups — a lightweight alternative to Amplitude, deployable with Docker
Compose in minutes.

> **Status:** Walking Skeleton complete + UI tier live. The full hex stack
> (HTTP → handler → port → ClickHouse) is proven for both ingest and read paths,
> served by a React + Tailwind UI behind nginx, verified by Playwright E2E.
> Phase 2 (User Profiles / Segmentation / Funnels features) is next. See
> [`docs/plan.md`](docs/plan.md) for live status.

## Why

Amplitude is best-in-class but overkill (and too expensive) for side projects.
WTF aims to cover the core analytics use cases — user profiles, event
segmentation, funnels — backed by ClickHouse, deployable by any developer
comfortable with Docker.

Full scope and success criteria: [`docs/goals.md`](docs/goals.md).

## Stack

- **Language:** TypeScript 5.x (strict, ESM) everywhere — api, ui, e2e
- **API:** Node.js + Fastify (hexagonal + CQRS internals)
- **UI:** React 19 + Tailwind v3 + `react-router-dom`. Bundled with **esbuild** (no Vite). Served by **nginx**.
- **Storage:** ClickHouse 24.8
- **Orchestration:** Docker Compose — one command runs api + clickhouse + web
- **Tests:** Jest + `ts-jest` (api + ui component tests), `fastify.inject()` for API boundary, `@testing-library/react` for UI components, **Playwright** for browser E2E

## Quickstart

```bash
# Bring up the full stack (api + clickhouse + web).
docker compose up -d --build --wait

# Send an event (via nginx → api proxy).
curl -X POST http://localhost:8080/api/events \
  -H 'content-type: application/json' \
  -d '{"eventName":"signup","userId":"u1","timestamp":"2026-05-27T12:00:00.000Z","properties":{"country":"US"}}'

# View the user's events in your browser:
open http://localhost:8080/users/u1/events
```

## Repo layout

```
api/                Fastify service (TypeScript, hexagonal + CQRS)
  src/events/         events aggregate (domain, application, adapters)
  test/{acceptance,integration,unit,fakes,fixtures}/
clickhouse/init/    Schema migrations, auto-loaded on first boot
ui/                 React + Tailwind UI workspace (esbuild, Jest + RTL)
  src/features/<feature>/    Component, .preview.tsx, Page.tsx, types
  src/lib/api.ts             Typed fetch wrappers for /api/*
  src/routes.tsx             react-router-dom config
  test/                      Component tests
web/                nginx (multi-stage build of ui + reverse-proxy)
  Dockerfile, nginx.conf
e2e/                Playwright E2E workspace
  test/                      *.spec.ts against the live stack
docker-compose.yml  api + clickhouse + web
docs/
  goals.md          Product scope, success criteria
  plan.md           Phase-by-phase roadmap, live checkboxes
  architecture.md   C4 + sequence diagrams (Mermaid)
  adr/              Architecture Decision Records (0001–0008)
  design-system.md  Tailwind utility-first conventions
  specs/<feature>/  requirements, ui-spec, design, tasks (per feature)
thoughts/           Per-phase findings + progress logs (RPI external memory)
scripts/            tdd state manager, audit logger, hook scripts
CLAUDE.md           Project context for Claude Code
.claude/
  settings.json     Permissions + hooks (SessionStart, TDD-guard, format/lint/test-on-commit)
  settings.local.json  (gitignored) per-user permission overrides
  agents/           Custom sub-agents
  skills/           Project-local skills (/run, /send-event)
```

## Built with Claude Code

WTF is also a learning project for AI-automated engineering. The repo is set up
to be worked on with [Claude Code](https://claude.com/claude-code) end-to-end:

- **[`CLAUDE.md`](CLAUDE.md)** — always-loaded project context: stack,
  architecture rules (hexagonal + CQRS + outside-in TDD + per-aggregate folders),
  the per-feature loop, the design phase, harness automation.
- **[`docs/plan.md`](docs/plan.md)** — durable, phase-by-phase roadmap with live
  checkbox state. Phase 0 (harness) + Phase 1 (Walking Skeleton) + Phase 1.5 (UI
  tier + design system + E2E) all done. Phase 2 (features) next.
- **[`docs/architecture.md`](docs/architecture.md)** — C4 Context + Container +
  Component diagrams (Mermaid, renders in GitHub) + sequence diagrams for the
  main request flows.
- **[`docs/adr/`](docs/adr/)** — 8 Architecture Decision Records covering the
  load-bearing decisions: hexagonal + CQRS, TS strict + ESM, Jest + ts-jest,
  no application unit tests, parametrized real-vs-fake contract tests,
  per-aggregate folders, React + Tailwind + esbuild (no Vite), Playwright E2E
  as the primary tier for UI features.
- **[`docs/specs/<feature>/`](docs/specs/)** — each MVP feature has
  `requirements.md` / `ui-spec.md` / `design.md` / `tasks.md`. The UI design
  contract is the real React preview component under `ui/src/features/<feature>/`
  rendered at `/preview/<feature>`.
- **[`thoughts/`](thoughts/)** — external memory across Claude sessions:
  per-phase `findings.md` (what we learned) and `progress.md` (what got done).
- **[`.claude/agents/`](.claude/agents/)** — custom sub-agents:
  - `clickhouse-expert` — schema + query specialist (port-contract aware)
  - `plan-griller` — adversarial plan reviewer (pre-implementation)
  - `code-reviewer` — adversarial engineering-diff reviewer (post-implementation)
  - `ui-designer` — AI designer; produces React `<Feature>.tsx` + `<Feature>.preview.tsx` + `ui-spec.md`
  - `design-handoff` — translates the React preview into the implementation wiring plan
  - `design-reviewer` — runs Playwright, compares the real route against `/preview/<feature>`
- **[`.claude/skills/`](.claude/skills/)** — `/run` (start the stack + tail logs),
  `/send-event` (smoke an event through the API).
- **[`.claude/settings.json`](.claude/settings.json)** — permission allowlist
  plus hooks: `SessionStart` (surfaces pending plan items, logs to audit),
  `PreToolUse: Write|Edit` (TDD-guard: blocks edits to `api/src/**` and `ui/src/**`
  unless a failing test is driving), `PreToolUse: Bash` (test-on-commit for `api/**`
  changes), `PostToolUse: Write|Edit` (format-on-write + lint-on-write).
- **[`scripts/`](scripts/)** — `tdd` (RED/GREEN/UNLOCK state manager, real gate
  via `npm run test:fast` + typecheck + lint across all workspaces),
  `audit` (append-only event log), `hooks/*` (the hook scripts referenced by
  `.claude/settings.json`).

If you're working on this repo with Claude Code, start by reading `CLAUDE.md`
and the current phase in `docs/plan.md`.

**Design approach:** UI design is AI-driven and React-component-first —
`ui-designer` generates `ui/src/features/<feature>/<Feature>.preview.tsx`
(rendered at `/preview/<feature>`) as the design contract. The same component
evolves stub-data → real-data without a translation gap. `design-reviewer`
validates the rendered feature against the preview via Playwright. Figma is
optional documentation, not a critical-path tool.

## Out of scope (MVP)

Client/JS SDK, user properties, auth & multi-tenancy, dashboards, alerts,
A/B testing. See [`docs/goals.md`](docs/goals.md).
