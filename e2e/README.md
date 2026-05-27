# e2e — Playwright tests for WTF

End-to-end tests that drive a real browser against the live docker-compose
stack. This is the **primary verification tier for UI features** (per
`docs/adr/0008-playwright-e2e-primary.md` and the testing-strategy memory).

## Setup (one-time)

```bash
cd e2e
npm install
npm run install:browsers
```

`install:browsers` downloads Chromium (~150 MB). Re-run after upgrading
`@playwright/test`.

## Running

The stack must be up. From the repo root:

```bash
docker compose up -d --build --wait
```

Then from `e2e/`:

```bash
npm test              # headless, default
npm run test:headed   # see the browser
npm run test:debug    # step through with Playwright Inspector
```

Override the target URL:

```bash
WTF_BASE_URL=http://staging.local npm test
```

Reports land in `playwright-report/`; traces (`trace.zip`) for failed tests
land in `test-results/`. Both are gitignored.

## Pattern

Tests use Playwright's `request` fixture to seed data via the same nginx
proxy the browser uses — so the test exercises the full request path, not
just the page render. Each test generates a unique `userId` so suites can
run in any order without conflict.

## What this tier owns

- "Does this feature actually work for a user, end to end?" verification.
- Visual regression (`design-reviewer` sub-agent uses Playwright traces /
  screenshots).
- Cross-cutting concerns that span the front and back: CORS, proxy routing,
  cookie/session behavior (when added).

## What this tier does NOT own

- API contract correctness — that's `api/test/acceptance/`.
- Adapter contract parity — that's `api/test/integration/`.
- Component rendering in isolation — that's `ui/test/`.
