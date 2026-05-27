# Phase 1.5 — Findings

## 2026-05-27 — Direction reset (HTMX → React)

- The original Phase 1.5 plan was Pico/Tailwind + HTMX on Fastify — single process, server-rendered, content-negotiated routes. User reversed it mid-phase: **Tailwind + React + nginx + separate api/UI workspaces, with Playwright E2E as the primary verification tier.** Captured in ADR 0007 (UI stack) and ADR 0008 (E2E primary).
- "Reuse tooling" meant **no Vite**. tsc + esbuild + Jest. The friction-vs-tooling-minimalism tradeoff was discussed; option (2) — `tsc + esbuild` — was picked over option (1) — `tsc only, no bundler`. Documented in ADR 0007.

## 2026-05-27 — UI tooling gotchas

### React 19 moved `JSX` namespace from global to `React.JSX`
- `function App(): JSX.Element` no longer compiles with `"jsx": "react-jsx"`.
- Fix: `import type { ReactElement } from 'react'; function App(): ReactElement`. Use `ReactElement` everywhere as the return type.

### esbuild does NOT read tsconfig's `"jsx"` setting
- tsconfig has `"jsx": "react-jsx"` (automatic runtime, no React import needed).
- esbuild defaults to `--jsx=transform` (classic runtime, needs `React` in scope).
- Without the `--jsx=automatic` flag, esbuild emits `React.createElement(...)` but no React import → runtime error `React is not defined` → blank page.
- **Caught by Playwright E2E, not by Jest tests or typecheck.** This is the bug that vindicates ADR 0008.
- Fix: add `--jsx=automatic` to esbuild commands in both `build:js` and `dev` scripts.

### esbuild emits CSS for imports
- `main.tsx` originally had `import './index.css';`. esbuild bundled the CSS to `dist/main.css`, but the HTML loaded `/index.css` (the Tailwind output). Two CSS files in dist; one unused, the other wrong-name-mapped.
- Fix: don't import CSS from main.tsx. Tailwind writes `dist/index.css`; the HTML links to it directly.

### Relative paths break SPAs at deep routes
- `index.html` originally used `<script src="./main.js">` and `<link href="./index.css">`.
- At `/users/foo/events`, browser resolves `./main.js` to `/users/foo/main.js`. Nginx's SPA fallback returns `index.html`. Browser tries to parse HTML as JS. React never mounts. **Blank page.**
- **Also caught by Playwright E2E.** Same lesson as the JSX gotcha.
- Fix: absolute paths in `index.html` — `/main.js`, `/index.css`.

### `@testing-library/jest-dom` matchers don't reach `@jest/globals`'s typed `expect`
- jest-dom augments the global `jest.Matchers` namespace. The typed `expect` imported from `@jest/globals` is a *separate* type that the augmentation doesn't touch.
- Test fails at runtime AND tsc errors with "Property 'toBeInTheDocument' does not exist".
- Fix: use the **global** `expect` (Jest 29 still injects it even when you use `@jest/globals` for `describe`/`it`). Don't import `expect`.

### `setupFilesAfterEach` in jest.config.js doesn't seem to fire in ts-jest ESM
- Configured `setupFilesAfterEach: ['<rootDir>/test/setup.ts']` with `import '@testing-library/jest-dom';` inside. Didn't actually augment the matchers.
- Suspected to be a ts-jest ESM module-load-timing issue. Didn't deep-debug.
- Fix: import `@testing-library/jest-dom` directly in each test file. Removed the unused config.

## 2026-05-27 — nginx + docker-compose

### Reverse-proxy strip-prefix idiom
- nginx strips the `/api/` prefix iff BOTH `location /api/` AND `proxy_pass http://api:3000/` have trailing slashes. Drop either trailing slash and you get `/api/users/...` hitting the upstream — which the api doesn't have a route for.

### Multi-stage Dockerfile with cross-directory build context
- `web/Dockerfile` needs to COPY from `ui/`. Build context = repo root (`context: .`), `dockerfile: web/Dockerfile`. Standard pattern; worth documenting because the first time you hit "can't COPY ../ui from web/" it's confusing.

### `docker compose up --wait` healthcheck behavior
- Compose marks containers without an explicit healthcheck as "healthy" after they start. So `wtf-web Healthy` in the log doesn't mean nginx is actually serving — just that the container is up.
- For nginx the gap is small (process starts fast). Worth adding a real healthcheck (`wget --spider /` or similar) when this matters.

## Open questions carried forward

- **Does the TDD-guard hook also cover `ui/src/**`?** Currently scoped to `api/src/**`. The same outside-in TDD discipline applies to UI features (E2E test → component test → component code), so logically yes. Action: extend `scripts/hooks/tdd-guard.sh` to also gate `ui/src/**` before the first Phase 2 UI feature. Add to a Phase 2 prep checklist.
- **Should `scripts/tdd green` also run the ui workspace's tests/typecheck/lint?** Currently runs api/ only. The bug-class that escaped commit `3368e2b` (lint errors in tests) could happen in ui/ too. Likely yes — extend the gate to iterate over all workspaces. Defer until first noticeable miss.
- **Phase 1.5 didn't add a healthcheck to the api service.** docker-compose uses `depends_on: api: service_started` for web. If we want stricter ordering, add a healthcheck (`/health` endpoint or `/users/anything/events` returning 200). Low priority.
