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

### Slice 1 — Ingest one event (outside-in) ✓ done

- [x] **Acceptance test (RED):** `api/test/acceptance/ingest.test.ts` — `fastify.inject` `POST /events`, expect **201**, assert via `InMemoryEventWriter` fake (under `api/test/fakes/InMemoryEventWriter.ts`, public `writes` array, `implements EventWriterPort`). Each test constructs its own `buildApp({ eventWriter })`.
- [x] **`scripts/tdd red api/test/acceptance/ingest.test.ts`** — confirmed failure (composition didn't exist), flipped state.
- [x] **Define port:** `api/src/events/application/ports/EventWriterPort.ts` — TS interface only.
- [x] **Define command + handler:** `api/src/events/application/commands/IngestEventCommand.ts`, `api/src/events/application/commands/IngestEventHandler.ts`. Handler depends on `EventWriterPort` via constructor injection. **No application unit test** (per testing-strategy memory).
- [x] **Inbound adapter:** `api/src/events/adapters/inbound/http/events.ts` — Fastify route, builds command, calls handler, returns 201.
- [x] **Composition factory:** `api/src/composition.ts` exports `buildApp({ eventWriter })`. Slice-1-scoped Deps; Slice 2 extends with `eventReader`.
- [x] **Production entry point:** `api/src/server.ts` — reads env config (`CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `PORT`), constructs `ClickHouseEventWriter`, calls `buildApp`, `.listen()`.
- [x] **Outbound adapter:** `api/src/events/adapters/outbound/clickhouse/ClickHouseEventWriter.ts` — `implements EventWriterPort` against `@clickhouse/client` (JSONEachRow insert + `formatDateTime64` helper).
- [x] **Parametrized integration test:** `api/test/integration/EventWriter.contract.test.ts` — same test body runs against `InMemoryEventWriter` and `ClickHouseEventWriter` (real ClickHouse from docker-compose). 4/4 green.
- [x] **Slice closeout via `scripts/tdd green`** — `npm run test:fast` + `npm run typecheck` both pass; state re-locked.
- [x] **Refactor:** moved subtrees into `api/src/events/` aggregate folder (per `feedback-aggregates` memory). Verified by full test re-run + tdd green.

### Slice 2 — Read events back (outside-in) ✓ done

- [x] **Acceptance test (RED):** `api/test/acceptance/read-events.test.ts` — 3 tests via `fastify.inject` `GET /users/:user_id/events` (200 + JSON list; respects `limit`; respects `before` cursor). Hermetic — seeds `InMemoryEventReader` (under `api/test/fakes/InMemoryEventReader.ts`, `implements EventReaderPort`) directly; does not write via the writer.
- [x] **`scripts/tdd red api/test/acceptance/read-events.test.ts`** — confirmed 404s (no route), flipped state.
- [x] **Define port:** `api/src/events/application/ports/EventReaderPort.ts` — TS interface, separate from `EventWriterPort` per CQRS.
- [x] **Define query + handler:** `api/src/events/application/queries/GetUserEventsQuery.ts`, `GetUserEventsHandler.ts`. Handler depends on `EventReaderPort`. No application unit test.
- [x] **Inbound adapter:** extended `api/src/events/adapters/inbound/http/events.ts` — added `GET /users/:user_id/events`. Routes now take a `{ ingest, getUserEvents }` handlers object instead of a single handler.
- [x] **Composition factory update:** `buildApp({ eventWriter, eventReader })` in `api/src/composition.ts` — Deps now requires both ports. Slice 1 acceptance test updated to pass an empty `InMemoryEventReader`.
- [x] **Outbound adapter:** `api/src/events/adapters/outbound/clickhouse/ClickHouseEventReader.ts` — `implements EventReaderPort`. SQL: `SELECT … FROM events WHERE user_id = ? [AND timestamp < ?] ORDER BY timestamp DESC LIMIT ?` with conditional `before` clause; `JSONEachRow` deserialization with row-to-domain mapping.
- [x] **Production wiring:** `api/src/server.ts` constructs `ClickHouseEventReader` and passes both adapters to `buildApp`.
- [x] **Parametrized integration test:** `api/test/integration/EventReader.contract.test.ts` — 4 tests (order, limit, before, unknown user) parametrized over `InMemoryEventReader` and `ClickHouseEventReader`. All 8 pass.
- [x] **Slice closeout via `scripts/tdd green`** — `npm run test:fast` (4 acceptance) + `tsc --noEmit` both pass. State re-locked.
- **Walking Skeleton complete.** Full hex stack proven for both write and read paths through parametrized contract tests. 12/12 integration tests green (4 writer + 8 reader).

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

- [x] **`run` skill** (`.claude/skills/run/SKILL.md`) — `docker compose up -d --wait` + `docker compose logs -f api` + a curl smoke check.
- [x] **`send-event` skill** (`.claude/skills/send-event/SKILL.md`) — fires a synthetic event via `curl`; documents the round-trip read via `GET /users/:id/events`.
- [x] **Hook: format-on-write** — `PostToolUse` on `Edit|Write` runs `scripts/hooks/format-on-write.sh`, which scopes to `api/**/*.{ts,js,json,md,yml}` and runs `npx prettier --write`. Silently no-ops on non-api paths; never blocks the parent tool call.
- [x] **Hook: lint-on-write** — `PostToolUse` on `Edit|Write` runs `scripts/hooks/lint-on-write.sh`, scoped to `api/**/*.ts`, runs `npx eslint --fix`. Same silent no-op + non-blocking behavior.
- [x] **Hook: test-on-commit (scoped)** — `PreToolUse` on `Bash` runs `scripts/hooks/test-on-commit.sh`, which (a) matches `git commit` invocations robustly via regex, (b) checks `git diff --cached --name-only` for any `api/**` entry, (c) runs `npm run test:fast` only if so, (d) exits 2 (blocking) on failure with audit log entry. Docs-only / config-only / `.claude/`-only commits stay fast.
- [x] **Hooks all wired in `.claude/settings.json`** alongside the existing `tdd-guard` and `SessionStart` hooks. Tested with canned stdin input.
- [x] **Append `thoughts/phase-1/findings.md` + `thoughts/phase-1/progress.md`** — captures the harness additions, the activation caveat (hooks may need next-session restart), and a note that `format-on-write` + `lint-on-write` are friction reducers while the TDD-green gate is the enforcement.

## Phase 1.5 — UI workspace + design system + E2E setup

Goal: end-to-end UI loop working — a React app rendering events from the api,
served by nginx, with a Playwright E2E test that exercises the full stack.
End state: full hex stack proven for write + read paths (Phase 1) *plus* a
user-visible UI tier verified by a real browser test.

**Direction decisions** (settled before Block 1 started):
- **UI stack:** React 19 + TypeScript (strict, ESM) + Tailwind (v3 CLI). No Vite — `tsc` for typecheck, `esbuild` for bundling, `@tailwindcss/cli` for CSS. Reuses the api's Jest + ts-jest + ESLint + Prettier patterns.
- **API ↔ UI boundary:** api stays JSON-only. UI is a separate workspace. nginx serves built `ui/dist/` and reverse-proxies `/api/*` → `api:3000` (same origin in dev and prod — no CORS).
- **Testing emphasis:** E2E (Playwright) becomes the primary verification path for UI features. Acceptance (`fastify.inject` + in-memory fakes) stays for API contract reasons. Component tests (Jest + RTL) for non-trivial UI logic.
- **Prototype location:** `ui/src/features/<feature>/<Feature>.preview.tsx` rendered at `/preview/<feature>` — same component evolves stub-data → real-data without a translation gap.

### Block 1 — `ui/` workspace setup

- [x] **`ui/package.json`** with React 19 + TS strict + ESM, esbuild (build), `@tailwindcss/cli`, Jest + ts-jest + RTL + jsdom, ESLint + Prettier. npm scripts: `build`, `build:{js,css,html}`, `dev` (parallel watchers), `typecheck`, `test`, `lint`, `format`.
- [x] **`ui/tsconfig.json`** — same strict + ESM + NodeNext pattern as api. `jsx: "react-jsx"`, `lib: [ES2022, DOM, DOM.Iterable]`.
- [x] **`ui/.eslintrc.json`** — TS + React + React Hooks plugins; ignores `*.config.ts`.
- [x] **`ui/jest.config.js`** — ts-jest ESM preset, jsdom env, CSS imports stubbed, `@testing-library/jest-dom` setup.
- [x] **`ui/tailwind.config.ts`** + `ui/src/index.css` (Tailwind directives).
- [x] **`ui/index.html`** + `ui/src/main.tsx` + `ui/src/App.tsx` (placeholder).
- [x] **`npm install`** — 0 vulnerabilities; build clean; typecheck clean; lint clean.

### Block 2 — First slice: UserEvents component (outside-in)

- [ ] **Playwright E2E test (RED)** — `e2e/test/user-events.spec.ts`: bring up the full stack, seed an event via `POST /api/events`, load `/users/:id/events`, assert the event renders. (Built in Block 4 since Playwright lives there; this drives Block 2's React work.)
- [ ] **Component test (RED)** — `ui/test/UserEvents.test.tsx`: render `<UserEvents>` with sample event data via RTL, assert event names + timestamps appear.
- [ ] **Real component** — `ui/src/features/user-events/UserEvents.tsx` (Tailwind-styled). Pure: takes `events` as a prop.
- [ ] **Preview** — `ui/src/features/user-events/UserEvents.preview.tsx`: renders `<UserEvents>` with stub data. Mounted at `/preview/user-events` for design review.
- [ ] **Data fetching + route** — `ui/src/features/user-events/UserEventsPage.tsx` (or hook) fetches `/api/users/:userId/events` via a small `lib/api.ts` wrapper. Renders `<UserEvents>` with real data + loading + error states.
- [ ] **Router** — `ui/src/routes.tsx` with `react-router-dom`: `/users/:userId/events` → `UserEventsPage`, `/preview/user-events` → `UserEvents.preview`.

### Block 3 — `web/` nginx container + docker-compose update

- [ ] **`web/Dockerfile`** — `nginx:alpine` base; multi-stage with a `ui-build` stage that runs `npm run build` and a runtime that copies `ui/dist/` into `/usr/share/nginx/html`.
- [ ] **`web/nginx.conf`** — serve static assets from `/usr/share/nginx/html`; reverse-proxy `/api/*` to `http://api:3000/...`; SPA fallback (`try_files $uri /index.html`) for client-side routes.
- [ ] **`docker-compose.yml`** — add `web` service exposed on `:8080`, `depends_on: { api: { condition: service_started } }`.
- [ ] **Smoke check** — `docker compose up -d --wait`; browser at `http://localhost:8080` shows the React app; XHR to `/api/users/.../events` proxied correctly.

### Block 4 — `e2e/` Playwright workspace

- [ ] **`e2e/package.json`** — Playwright + TypeScript. `test:e2e` script.
- [ ] **`e2e/playwright.config.ts`** — single chromium project; `baseURL: http://localhost:8080`; `globalSetup` brings up `docker compose up -d --wait`; `globalTeardown` brings it down (or leaves running based on env var).
- [ ] **`e2e/test/user-events.spec.ts`** — first E2E. Seeds via `POST /api/events`, visits `/users/:id/events`, asserts event renders. This is the RED for Block 2 — it should fail until the UserEvents component + routing land.
- [ ] **Closeout** — both component test and E2E test green. Document the run flow in `e2e/README.md`.

### Block 5 — Cascade

- [ ] **Memories** — rewrite `feedback_design_workflow` for React (prototype = `.preview.tsx`, not `.html`). Update `feedback_testing_strategy` to add E2E tier. Update `feedback_typescript` to note ui/ has its own tsconfig + ESLint + jest configs.
- [ ] **ADRs** — `0007-react-tailwind-esbuild.md` (UI stack rationale), `0008-playwright-e2e-primary.md` (E2E as primary for UI features). Update `0003-jest-and-ts-jest.md` and `0004-no-application-unit-tests.md` to reflect cross-workspace + E2E tier.
- [ ] **CLAUDE.md** — Stack: add React + Tailwind + esbuild + Playwright. Layout: add `ui/`, `e2e/`, `web/`. Testing strategy: add E2E tier.
- [ ] **`docs/architecture.md`** — update C4 Container diagram (add `web` + `ui-build`); add a UI-side Component diagram; add sequence diagram for "browser load `/users/:id/events`".
- [ ] **`docs/design-system.md`** — rewrite for React + Tailwind (no more tokens.css; Tailwind config holds the theme).
- [ ] **`docs/specs/<feature>/prototype.html` + `ui-spec.md` skeletons** — replace `prototype.html` with `<Feature>.preview.tsx` references; update `ui-spec.md` to use React-component vocabulary.
- [ ] **Sub-agents** — rewrite `ui-designer` (produces React components + previews), `design-handoff` (reads React component spec + plans data wiring), `design-reviewer` (runs Playwright + screenshot comparison).
- [ ] **Open question carried into Phase 2:** does the TDD-guard hook also cover `ui/src/**`? Currently scoped to `api/src/**`. Defer the decision until after Block 4 lands.
- [ ] **Append `thoughts/phase-1.5/findings.md` + `progress.md`** — captures the React-without-Vite friction (React 19 JSX namespace move, esbuild CSS double-emit), the testing-tier shift, any nginx + reverse-proxy quirks.

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
10. **Documentation pass** — update C4 component diagram in `docs/architecture.md` if components changed, add a Mermaid sequence diagram to the feature's `design.md`, write any ADRs for non-obvious decisions, update glossary if new terms appeared. (Validated against the Walking Skeleton; see `docs/architecture.md` + `docs/adr/`.)
11. Append to `thoughts/phase-2/findings.md`.

Features in priority order (from `goals.md`):

- [x] **Documentation discipline defined** *(validated against the Walking Skeleton, not User Profiles as originally planned)*. C4 diagrams + sequence diagrams in `docs/architecture.md`, 6 ADRs in `docs/adr/`, step 10 added to per-feature loop in `CLAUDE.md` + `docs/specs/README.md` + this plan. Glossary deferred until terms drift. Recorded demos / NotebookLM deferred until first UI feature (Phase 1.5+).
- [ ] **User Profiles** — per-user event log page (now with the documentation step included)
- [ ] **Event Segmentation** — filter/group events by properties over time
- [ ] **Funnels** — ordered step conversion analysis (likely `windowFunnel()` in ClickHouse)

## Phase 3 — Background and scheduled automation

Goal: exercise long-running and scheduled Claude primitives.

- [ ] **Scheduled routine** — daily progress check that diffs `git log` against `docs/plan.md` and reports drift
- [ ] **Background load test** — long-running ingestion stress via `run_in_background`, with `clickhouse-expert` analyzing query perf at volume

---

## Out of scope (from goals.md)
Client/JS SDK, user properties, auth/multi-tenancy, dashboards, alerts, A/B testing.
