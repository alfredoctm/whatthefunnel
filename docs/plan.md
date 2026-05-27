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
- [x] **Write `code-reviewer` sub-agent** — post-implementation counterpart to grill-me
- [x] **TDD-guard hook** — `PreToolUse` on `Write|Edit` enforces outside-in TDD on `api/src/**` via `.claude/tdd-state`
- [x] **`scripts/tdd` + `scripts/audit`** — TDD state manager + append-only event log (`.claude/audit.jsonl`)
- [x] **`.gitignore`** — exclude per-machine state (`tdd-state`, `audit.jsonl`)
- [x] **Write `ui-designer` sub-agent** — AI designer producing `prototype.html` + `ui-spec.md` per feature
- [x] **Write `design-handoff` sub-agent** — reads prototype, drives implementation, surfaces ambiguities
- [x] **Write `design-reviewer` sub-agent** — screenshots rendered feature, compares against prototype

## Phase 1 — Walking Skeleton

Goal: an event flows from `curl` → Fastify → command handler → ClickHouse,
then `curl` GET → query handler → ClickHouse → JSON back. Thinnest possible
end-to-end path through the **full hexagonal stack** — proven (not sketched)
by parametrized contract tests showing the real ClickHouse adapter and the
in-memory fake satisfy the same port interface. No features beyond ingest +
read-back.

Built **outside-in**: every production-code step is preceded by a failing
acceptance test; every slice closes through `scripts/tdd green` (which
verifies tests + typecheck before flipping state).

### Tooling decisions (do first)

- [x] **Grill the Phase 1 plan** — `plan-griller` run; findings applied in this section.
- [ ] **TypeScript setup** (see `feedback-typescript` memory):
  - TypeScript 5.x, **strict mode all flags on**, **ESM** (`"type": "module"` in `api/package.json`).
  - `api/tsconfig.json` with `strict: true`, `module: "ESNext"`, `target: "ES2022"`, `moduleResolution: "Bundler"`, `noEmit: true` for dev, separate `tsconfig.build.json` for prod `tsc --build` → `dist/`.
  - Dev runner: `tsx watch`. Prod: `tsc --build`, Docker copies `dist/` and runs Node on JS.
  - All `.ts` files. Ports are TS interfaces. Fakes use explicit `implements`.
  - npm scripts in `api/package.json`: `"dev": "tsx watch src/server.ts"`, `"build": "tsc --build tsconfig.build.json"`, `"typecheck": "tsc --noEmit"`.
- [ ] **Test framework + strategy** (see `feedback-testing-strategy` memory):
  - **Framework:** Jest + `ts-jest` preset (ESM mode) + `fastify.inject()`. Lock in `api/package.json`. If ts-jest ESM friction surfaces, fall back to `swc-jest` (record in `thoughts/phase-1/findings.md`).
  - npm scripts: `"test:fast": "jest --testPathPattern='test/(unit|acceptance)'"`, `"test:integration": "jest --testPathPattern='test/integration'"`, `"test": "npm run test:fast && npm run test:integration"`.
  - **Layered strategy:**
    - **Acceptance** (`api/test/acceptance/`) — HTTP boundary via `fastify.inject`, app composed with in-memory port fakes. Transitively covers the application layer.
    - **Domain unit** (`api/test/unit/domain/`) — only the `domain/` layer. Pure, no mocks.
    - **NO application-layer unit tests.** Handlers / commands / queries are covered by acceptance tests; unit-testing them is forbidden.
    - **Adapter integration** (`api/test/integration/`) — parametrized: same test body runs against real adapter AND in-memory fake. Proves contract parity.
    - **Mocks** = only the in-memory port fakes (under `api/test/fakes/`). No `jest.mock`, no module mocking, no spies on collaborators.
    - Fixtures OK where they reduce repetition without hiding intent.
- [ ] **Pick linter + formatter configs** — `eslint:recommended` + `@typescript-eslint/recommended` (TS-aware lint) + Prettier defaults. Add `api/.eslintrc.json` + `.prettierrc.json` (repo root). Required before the format-on-write / lint-on-write hooks land in the Claude harness expansion below.
- [ ] **Wire `scripts/tdd green` into npm scripts.** Already calls `npm run test:fast` + `npm run typecheck`. Once these exist, `scripts/tdd green` becomes a real gate (it's a bootstrap no-op until then).

### Infrastructure

- [ ] **`.nvmrc`** + `"engines": { "node": ">=20.x" }` in `package.json` — pin Node version for reproducibility (Docker + local dev).
- [ ] **`docker-compose.yml`** — `clickhouse` + `api` services, one shared network. `clickhouse` service has a **healthcheck** (HTTP `GET /ping` returning 200) so `api` doesn't start against a not-yet-ready store; `api` `depends_on: { clickhouse: { condition: service_healthy } }`.
- [ ] **`clickhouse/init/01_events.sql`** — `events` table schema. Invoke `clickhouse-expert` for schema only (ORDER BY, PARTITION BY, codecs, engine choice). Port contracts are application-layer and get defined when the handler that needs them is written (Slice 1 / Slice 2) — do NOT ask clickhouse-expert to design ports.
- [ ] **`api/package.json` + `api/Dockerfile` + `api/tsconfig.json` + `api/tsconfig.build.json`** — package metadata, dependencies (`fastify`, `@clickhouse/client`, `typescript`, `tsx`, `@types/node`, `jest`, `ts-jest`, `@types/jest`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`). Multi-stage Dockerfile: build stage runs `tsc --build`, runtime stage copies `dist/` + `node_modules` (prod only). **No `server.ts` yet** — that's production code and lives inside Slice 1, where the acceptance test demands it.
- [ ] **`.env.example`** — declare config surface: `CLICKHOUSE_URL`, `PORT`, `LOG_LEVEL`. Document defaults. Real `.env` is gitignored.

### Slice 1 — Ingest one event (outside-in)

- [ ] **Acceptance test (RED):** write `api/test/acceptance/ingest.test.ts` — `fastify.inject` `POST /events` with a valid body, expect **201**, assert via an `InMemoryEventWriter` fake (under `api/test/fakes/InMemoryEventWriter.ts`, with a public `writes` array for observation, `implements EventWriterPort`) that the event was written. Each test constructs its own `buildApp({ eventWriter, eventReader })` — no shared module state.
- [ ] **Confirm test fails for the right reason** (no route, no handler, no port yet). Then: `scripts/tdd red api/test/acceptance/ingest.test.ts` — flips TDD-guard so the next bullets can touch `api/src/**`.
- [ ] **Define port:** `api/src/application/ports/EventWriterPort.ts` — TS interface only (the contract the handler depends on).
- [ ] **Define command + handler:** `api/src/application/commands/IngestEventCommand.ts`, `api/src/application/commands/IngestEventHandler.ts`. Handler depends on `EventWriterPort` via constructor injection (typed). **No unit test for the handler** — acceptance test covers it (per testing-strategy memory).
- [ ] **Inbound adapter:** `api/src/adapters/inbound/http/events.ts` — Fastify route, builds the command, calls the handler, returns 201. Content-type agnostic where possible — keep JSON serialization in a thin presenter so Phase 1.5 can add HTML without rewriting the route.
- [ ] **Composition factory:** `api/src/composition.ts` exports `buildApp({ eventWriter, eventReader }: Deps): FastifyInstance`. Only place that knows concrete adapter classes. Tests call `buildApp` with fakes; prod calls it with real adapters.
- [ ] **Production entry point:** `api/src/server.ts` — reads env config, constructs real adapters (initially: `ClickHouseEventWriter`), calls `buildApp(...)`, `.listen()`. First production file outside ports/commands; exists because the acceptance test (via `fastify.inject` against `buildApp`) demands it.
- [ ] **Outbound adapter:** `api/src/adapters/outbound/clickhouse/ClickHouseEventWriter.ts` — `implements EventWriterPort` against `@clickhouse/client`.
- [ ] **Parametrized integration test:** `api/test/integration/EventWriter.contract.test.ts` — same test body runs against `InMemoryEventWriter` and `ClickHouseEventWriter` (real ClickHouse from docker-compose). Proves contract parity. **Only place the real ClickHouse is exercised in tests.**
- [ ] **Slice closeout:** acceptance test green via `buildApp` + in-memory fake. Then: `scripts/tdd green` — verifies `npm run test:fast` + `npm run typecheck` pass before flipping state. Audit log records `tdd_green {tests: passed, typecheck: passed}`. Re-locks `api/src/**` until Slice 2 starts.

### Slice 2 — Read events back (outside-in)

- [ ] **Acceptance test (RED):** write `api/test/acceptance/read-events.test.ts` — `fastify.inject` `GET /users/:user_id/events`, expect 200 + JSON list. **Hermetic** — the test seeds an `InMemoryEventReader` fake (under `api/test/fakes/InMemoryEventReader.ts`, `implements EventReaderPort`) with the events it wants to read back. Does NOT depend on Slice 1's writer; the CQRS boundary stays clean.
- [ ] **Confirm test fails for the right reason.** Then: `scripts/tdd red api/test/acceptance/read-events.test.ts`.
- [ ] **Define port:** `api/src/application/ports/EventReaderPort.ts` — TS interface, **separate from `EventWriterPort`** per CQRS. Reader and writer never share an interface.
- [ ] **Define query + handler:** `api/src/application/queries/GetUserEventsQuery.ts`, `api/src/application/queries/GetUserEventsHandler.ts`. Handler depends on `EventReaderPort`. No application unit test.
- [ ] **Inbound adapter:** `api/src/adapters/inbound/http/users.ts` (or extend existing route file) — Fastify route for `GET /users/:user_id/events`. Same content-negotiation-aware presenter pattern as Slice 1, returning JSON now; HTML adapter is added in Phase 1.5 against the same handler.
- [ ] **Composition factory update:** extend `buildApp({ eventWriter, eventReader })` in `api/src/composition.ts` to wire the reader into the route. **Atomic step** — composition wiring isn't a tail clause on the adapter bullet.
- [ ] **Outbound adapter:** `api/src/adapters/outbound/clickhouse/ClickHouseEventReader.ts` — `implements EventReaderPort` against `@clickhouse/client`.
- [ ] **Production wiring:** `api/src/server.ts` constructs `ClickHouseEventReader` and passes both adapters to `buildApp`.
- [ ] **Parametrized integration test:** `api/test/integration/EventReader.contract.test.ts` — same test body against `InMemoryEventReader` and `ClickHouseEventReader`. Proves contract parity.
- [ ] **Slice closeout:** `scripts/tdd green` verifies and flips state. **Walking Skeleton ends green here** — full hex stack proven for both write and read paths.

### Integration tier — invariants

The two slices above each add a parametrized integration test for their port.
This block defines the tier they share, so neither slice has to re-invent it.

- **Location:** `api/test/integration/<PortName>.contract.test.ts`.
- **Shape:** export a single `describe` block parametrized over implementations. The same test body runs against the real adapter (e.g., `ClickHouseEventWriter`) and the in-memory fake (`InMemoryEventWriter`). Use `describe.each([...impls])` or equivalent.
- **What they assert:** the port contract — what every implementation must do. Not the internals of either implementation. If only one implementation passes, that implementation is wrong (or the fake is lying about the contract).
- **What they don't assert:** HTTP routing, handler orchestration, end-to-end user-visible behavior. Those belong in acceptance tests.
- **Real-ClickHouse readiness:** test setup waits for the `clickhouse` service to be healthy (`docker compose up -d --wait`, or a per-suite `beforeAll` that polls `GET /ping` until 200). The docker-compose healthcheck (from the Infrastructure block) is what makes `--wait` reliable.
- **When they run:**
  - **Locally (developer/AI):** on demand via `npm run test:integration`. Requires `docker compose up -d` first (or the test runner brings the stack up itself).
  - **`scripts/tdd green` does NOT run integration tests** — only `test:fast` (unit + acceptance). Integration is too heavy to gate every slice.
  - **CI:** integration runs on every PR (full `npm test`). This is where contract drift gets caught for real.
- **Fixtures:** the real adapter's test uses a per-suite table reset (DROP / CREATE the relevant table in a test schema, or truncate). No shared state across runs.

## Phase 1 — Harness expansion (post-skeleton)

> Runs **after** the Walking Skeleton is green. Depends on `api/package.json`
> existing with `prettier`, `eslint`, `typescript`, and `jest` installed
> (Tooling block above). Wiring these hooks earlier would fire them against
> non-existent tools.

- [ ] **`run` skill** (`.claude/skills/run/`) — start the stack and tail API logs (`docker compose up -d && docker compose logs -f api`).
- [ ] **`send-event` skill** (`.claude/skills/send-event/`) — fire a synthetic event via `curl`. Depends on `run` (stack must be up).
- [ ] **Hook: format-on-write** — `PostToolUse` on `Edit|Write` of `api/**/*.{ts,js,json}` → `npx prettier --write`. Lives in `.claude/settings.json`.
- [ ] **Hook: lint-on-write** — same matcher (scoped to `api/**/*.ts`) → `npx eslint --fix`.
- [ ] **Hook: test-on-commit (scoped)** — `PreToolUse` matching `git commit` runs `npm run test:fast` **only if `api/**` files are staged**. Skips full suite for docs-only / config-only / `.claude/`-only commits. Implementation: a small `scripts/hooks/test-on-commit.sh` that checks `git diff --cached --name-only` against `api/**` and exits 0 if no match. Integration tier runs in CI, not on commit.
- [ ] **Append `thoughts/phase-1/findings.md` AND `thoughts/phase-1/progress.md`** — both files, per Phase 0 pattern. Capture: any TS+Jest+ESM friction (and the swc-jest fallback decision if used), any TDD-guard unlocks and why, any healthcheck quirks.

## Phase 1.5 — Design System

Goal: build the design system before any Phase 2 feature so prototypes draw
from a real token set. End state: a single rendered HTML page (the first
user-profile view from Slice 2 of Phase 1) styled with the design system
tokens — proves the UI wiring + design-system + CSS-framework choice
end-to-end.

- [ ] **Pick CSS framework** — recommend Pico (semantic, no-build, plays well with HTMX) or Tailwind+DaisyUI (more flexibility, needs a build step). Lock in `package.json`.
- [ ] **Pick interaction layer** — recommend HTMX (no build, server-rendered, matches single-Fastify-process). Add as a static asset under `api/src/adapters/inbound/http/static/`.
- [ ] **`api/src/adapters/inbound/http/styles/tokens.css`** — design-system tokens: colors, type scale, spacing, radius. Source of truth for all prototypes and the real UI.
- [ ] **`api/src/adapters/inbound/http/styles/components.css`** (or framework equivalent) — base components: button, table row, card, chart container.
- [ ] **First rendered page** — render the user-event-list view (from Phase 1 Slice 2) as HTML using the tokens. Adds an inbound HTTP adapter for HTML responses (in addition to the existing JSON adapter). Same query handler, second presentation.
- [ ] **Acceptance test for the HTML response** — outside-in: `GET /users/:id/events` with `Accept: text/html` returns a page with the expected events visible.
- [ ] **Update `docs/design-system.md`** with the chosen framework, token list, and how `ui-designer` should reference them.
- [ ] **Append `thoughts/phase-1.5/findings.md`** with the framework choice rationale and any quirks.

## Phase 2 — Features (vertical slices in worktrees)

Goal: practice spec-driven, sub-agent-assisted, prototype-first feature
delivery. Each feature follows the same eight-step loop in its own worktree
(`EnterWorktree`) so the main branch stays clean.

For each feature in this phase:

1. `/clear` and re-anchor on `CLAUDE.md` + `docs/specs/<feature>/` + `thoughts/phase-2/`.
2. Fill `requirements.md` (pair with user on ambiguity).
3. **Grill 1 — requirements.** `plan-griller` against `requirements.md`. Address blockers.
4. **Design.** Invoke `ui-designer` → produces `prototype.html` + `ui-spec.md` for the feature.
5. Fill `design.md` (engineering), invoking `clickhouse-expert` for storage/query parts. Reference `prototype.html` in the Visual Design section.
6. **Grill 2 — combined design.** `plan-griller` against `design.md` (which references the prototype + ui-spec). Address blockers and risks.
7. Fill `tasks.md` — vertical slices, 1–3h each, first task is always the failing acceptance test.
8. `EnterWorktree`, implement (invoke `design-handoff` to translate the prototype into the real feature), validate via the `send-event` skill or real curl.
9. After tests green: run `code-reviewer` + `design-reviewer`. Address findings. Exit worktree.
10. Append to `thoughts/phase-2/findings.md`.

Features in priority order (from `goals.md`):

- [ ] **User Profiles** — per-user event log page
- [ ] **Documentation pass — define the per-feature doc step** *(once User Profiles ships)*. Validate options against the real feature (C4 in Mermaid, ADRs, sequence diagrams, glossary, recorded demo, NotebookLM overview, dep graph via madge). Pick keepers, encode as step 11 in the per-feature loop in `CLAUDE.md` + `docs/specs/README.md`. Backfill docs for User Profiles as the first instance.
- [ ] **Event Segmentation** — filter/group events by properties over time *(now with the documentation step included)*
- [ ] **Funnels** — ordered step conversion analysis (likely `windowFunnel()` in ClickHouse)

## Phase 3 — Background and scheduled automation

Goal: exercise long-running and scheduled Claude primitives.

- [ ] **Scheduled routine** — daily progress check that diffs `git log` against `docs/plan.md` and reports drift
- [ ] **Background load test** — long-running ingestion stress via `run_in_background`, with `clickhouse-expert` analyzing query perf at volume

---

## Out of scope (from goals.md)
Client/JS SDK, user properties, auth/multi-tenancy, dashboards, alerts, A/B testing.
