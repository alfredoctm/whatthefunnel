# 0008 — Playwright E2E is the primary test tier for UI features

Status: accepted
Date: 2026-05-27

## Context

[ADR 0004](0004-no-application-unit-tests.md) commits to a layered testing
strategy that leans hard on acceptance tests (via `fastify.inject`) for API
features. That worked: each API slice had a fast, deterministic test that
caught wiring + behavior bugs at the HTTP boundary.

UI features broke that model. An acceptance test against the api proves the
JSON endpoint works. A Jest component test proves the React component renders
with given props. **Neither** proves:

- That the React bundle loads in a real browser (asset paths, MIME types,
  module resolution).
- That the JSX runtime is wired correctly (a real bug — see [ADR 0007](0007-react-tailwind-esbuild.md)
  "Commits us to").
- That the nginx proxy strips `/api/` correctly so client-side `fetch` calls
  reach the api.
- That CSS actually renders (Tailwind built, classes applied, no PurgeCSS
  over-cull).
- That react-router-dom routes resolve and the route's data-fetching hook
  actually fires.

Phase 1.5 Block 4 demonstrated this concretely: **two real bugs shipped to
the docker-compose stack** with green component tests + green acceptance
tests. Both were caught only by the first Playwright E2E test in under a
minute.

1. `index.html` used relative asset paths (`./main.js`). At `/users/foo/events`
   the browser resolved to `/users/foo/main.js`, nginx fell back to
   `index.html`, the browser tried to parse HTML as JS, React never mounted.
   Page was blank.
2. esbuild defaulted to `--jsx=transform` (the classic runtime), emitting
   `React.createElement(...)` without an import for `React`. Runtime error:
   `React is not defined`. Page was blank.

Both bugs were class-of-bug that no Jest test would ever catch.

## Decision

For UI features, **Playwright E2E against the live docker-compose stack is
the primary verification tier.** Specifically:

- Each UI feature ships with at least one E2E test in `e2e/test/<feature>.spec.ts`.
- The E2E test seeds data via the same `/api/*` proxy the browser uses (not
  a back-channel) — so it exercises the full request path.
- The E2E test asserts the user-visible outcome (text on screen, element
  visible, expected state).
- Run via `npm test` in `e2e/`. Requires `docker compose up -d --build --wait`
  first. Documented in `e2e/README.md`.

Component tests (Jest + RTL) remain useful for **non-trivial UI logic in
isolation** — complex conditionals, derived state, edge cases that would
require many E2E permutations. They're not the *primary* tier, they're a
supplement.

Acceptance + parametrized contract tests (api side, per [ADR 0004](0004-no-application-unit-tests.md)
and [0005](0005-parametrized-contract-tests.md)) continue unchanged. They cover the API
contract; E2E covers the user-visible behavior.

## Consequences

**What gets easier:**
- Real bugs in real bundlers, real proxies, real CSS rendering get caught
  before merge.
- Refactoring the UI plumbing (router, build config, nginx config) is safer
  — E2E flags break.
- `design-reviewer` sub-agent can use Playwright traces / screenshots to
  validate that what the user picked the prototype to look like is what
  shipped.

**What gets harder:**
- E2E is slower than Jest (seconds, not milliseconds). Not part of the
  `scripts/tdd green` gate — runs on demand / in CI.
- E2E needs the docker stack up. Adds a "are containers running?" prereq
  that the gate doesn't.
- Playwright downloads ~150 MB of browsers on `playwright install`. One-time
  cost per machine.
- Flakiness risk grows with E2E count. Mitigate by:
  - Generating unique `userId` per test (no cross-test data pollution)
  - Using Playwright's auto-waiting (`expect(locator).toBeVisible()`)
  - Avoiding hard-coded `sleep`/`waitForTimeout`

**Commits us to:**
- `e2e/` workspace exists and has at least one passing test per UI feature.
- `design-reviewer` is rewritten to run Playwright rather than compare static
  HTML.
- The "no application-layer unit tests" rule ([ADR 0004](0004-no-application-unit-tests.md)) extends to "no
  component tests for trivial wrappers either — let the E2E test cover them."
  Component tests stay for non-trivial logic only.
