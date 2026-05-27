# What The Funnel (WTF)

Self-hostable, open-source product analytics for solo devs and small startups.
A lightweight alternative to Amplitude, deployable via Docker Compose.

See [docs/goals.md](docs/goals.md) for product scope and [docs/plan.md](docs/plan.md)
for the build sequence.

## Stack

- **Language:** TypeScript 5.x, strict mode, ESM
- **API service:** Node.js + Fastify
- **Storage:** ClickHouse (primary, non-negotiable per goals)
- **Orchestration:** Docker Compose — one command runs the whole stack
- **Package manager:** npm
- **Tests:** Jest + `ts-jest` (ESM) + `fastify.inject()`
- **Dev runner:** `tsx watch`; **prod:** `tsc --build` → `dist/`, Node runs JS directly

See the `feedback-typescript` memory for the full TS setup + the TDD-green gate that
enforces `tsc --noEmit` at slice closeout. See `feedback-testing-strategy` for the
layered testing rules.

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
      ports/                 TS interfaces (EventWriterPort, EventReaderPort, …)
    adapters/
      inbound/http/          Fastify routes calling handlers
      outbound/clickhouse/   ClickHouse implementations of ports
    composition.ts           buildApp({ eventWriter, eventReader }) factory
    server.ts                Boots Fastify (reads env, constructs real adapters, calls buildApp)
  test/
    acceptance/              Outside-in entry points (fastify.inject + in-memory fakes)
    unit/domain/             Domain unit tests only (no application-layer units)
    integration/             Parametrized contract tests: real adapter vs. in-memory fake
    fakes/                   In-memory port implementations shared by acceptance + integration
  tsconfig.json
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

Phase 2 features get their own dir under `docs/specs/<feature>/`. The per-feature loop has eight steps; it mirrors a real product-team flow (PRD review → design + eng in parallel → joint review → build → review):

1. Fill `requirements.md` (user-facing behavior, success criteria, out of scope).
2. **Grill 1 — requirements.** Invoke `plan-griller` against `requirements.md` alone. Catches problem-framing issues before any detailed work. Address blockers.
3. **Design.** Invoke `ui-designer` sub-agent — produces `prototype.html` (rendered with the project CSS framework + design-system tokens) and `ui-spec.md` (rationale, states, interactions). This is the canonical design artifact. (See **Design phase** below.)
4. Fill `design.md` — engineering: data model, queries, endpoints, ports impacted, command/query shapes, acceptance test entry point. Reference `prototype.html` in the Visual Design section. Invoke `clickhouse-expert` for storage/query parts.
5. **Grill 2 — combined design.** Invoke `plan-griller` against `design.md` (which links to `prototype.html` and `ui-spec.md`). Attacks engineering correctness *and* whether the engineering supports the prototype (missing states, edge cases, perf concerns).
6. Fill `tasks.md` with 1–3 hour vertical slices. **First task is always the failing acceptance test.**
7. Implement in a worktree (`EnterWorktree`). The `design-handoff` sub-agent reads `prototype.html` + `ui-spec.md` and translates them into the real feature implementation (HTMX wiring, real data binding, real handlers).
8. After tests green: run `code-reviewer` (attacks the engineering diff) and `design-reviewer` (screenshots the rendered feature, compares against `prototype.html`). Address before merging.

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

## Design phase (AI-driven, prototype-first)

UI design for WTF is **AI-driven**. A `ui-designer` sub-agent plays the
designer role. The design artifact is **an HTML/CSS prototype rendered with
the project's CSS framework**, not a Figma frame. See
[`docs/design-system.md`](docs/design-system.md) for the design system + token
structure.

**Why prototype-first (not Figma):** the user wanted a real designer→engineer
team handoff but is not a designer. Generating prototypes directly in the
project's CSS framework means what the design specifies is exactly what ships
(no Figma→CSS translation gap), keeps the user off the hook for design tool
work, and still gives a clean designer→engineer artifact handoff — just both
sides are AI-driven and the artifact is `prototype.html` + `ui-spec.md`. See
the `feedback-design-workflow` memory.

**Per-feature design artifacts** (live in `docs/specs/<feature>/`):

- `prototype.html` — rendered design, opens in a browser, uses the project CSS framework + design-system tokens.
- `ui-spec.md` — rationale, states (empty / loading / error / many / few), interactions, decisions made, open design questions.

**Flow:**

1. **Design system first.** Tokens (colors, type scale, spacing) and base components live in the design-system CSS (Phase 1.5). All feature prototypes draw from them.
2. **Per-feature prototype.** After requirements are grilled, `ui-designer` produces `prototype.html` + `ui-spec.md` for the feature.
3. **Engineering reads the prototype.** During implementation, `design-handoff` reads `prototype.html` + `ui-spec.md` and translates them into the real feature implementation: HTMX wiring, real data binding, real handlers — preserving the structure and tokens of the prototype.
4. **Design review after implementation.** `design-reviewer` takes a screenshot of the rendered feature (via the `run` skill) and compares it against `prototype.html`. Reports visual deltas in Blocker / Risk / Smell / Nit format, parallel to `code-reviewer`.

**Figma is optional.** It can be populated later for stakeholder communication
or screenshot sharing, but it's never on the critical path. If introduced, the
prototype remains authoritative and Figma frames are derived from it.

**Do not:** ask the user to design in Figma, or treat Figma as a hard dependency.

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

`scripts/tdd green` is also a real gate (not just a state flip): it runs
`npm run test:fast` and `npm run typecheck` (i.e., `tsc --noEmit`) and refuses
to flip state if either fails. See the `feedback-typescript` memory for the
gating design.

### TDD-guard rhythm per slice

State transitions inside a single outside-in slice:

1. State is `GREEN` (or absent — bootstrap). `api/src/**` is locked.
2. Write the failing acceptance test under `api/test/acceptance/` — TDD-guard
   doesn't block this; tests live outside `api/src/`.
3. Run the test, confirm it fails for the right reason.
4. `scripts/tdd red <test-path>` — flips state to `RED`. `api/src/**` unlocks.
5. Write the smallest production code (port → handler → adapters →
   composition wiring) to make the test pass. Multiple `Write`/`Edit` calls
   happen during this phase; the guard allows them all while state is `RED`.
6. Once tests pass: `scripts/tdd green` — verifies `npm run test:fast` +
   `npm run typecheck` actually pass, then flips state to `GREEN`. Refuses
   to flip if either fails.
7. Next slice starts from `GREEN`. Loop.

**If you see a `TDD guard blocked` error mid-slice,** that's the harness
working correctly — you tried to touch `api/src/**` while state wasn't `RED`.
Either you forgot `scripts/tdd red` (most common), or you genuinely need to
override (rare; use `scripts/tdd unlock "<reason>"`, audited).

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
