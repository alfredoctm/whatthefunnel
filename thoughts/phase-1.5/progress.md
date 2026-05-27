# Phase 1.5 — Progress

## 2026-05-27

### Direction reset
- Pivoted from HTMX + Pico/Tailwind + Fastify-served HTML to **React + Tailwind + esbuild + nginx + Playwright**. No Vite (reuse Jest + tsc + ESLint patterns from `api/`). Two new ADRs: 0007 (UI stack), 0008 (E2E primary).

### Block 1 — `ui/` workspace setup
- `ui/package.json`, `tsconfig.json`, `.eslintrc.json` (TS + React + React-Hooks plugins), `jest.config.js` (ts-jest ESM + jsdom), `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.
- `npm install` — 638 packages, 0 vulnerabilities (bumped esbuild to ^0.28 to patch a moderate dev-server advisory we don't use).
- Tooling smoke checks: typecheck clean, lint clean, build produces `dist/{index.html, index.css, main.js}`, jest exits 1 with "no tests found" (bootstrap state).
- Gotchas: React 19's `JSX.Element` annotation broke (`Cannot find namespace 'JSX'`) — switched to `import type { ReactElement } from 'react'`. tailwind.config.ts triggered a type-aware lint error — added `*.config.ts` to `.eslintrc.json` ignorePatterns.

### Block 2 — UserEvents React component (outside-in)
- `ui/test/UserEvents.test.tsx` (RED, then green) — Jest + RTL, asserts event names render + empty-state copy. Use global `expect` (not `@jest/globals`) so jest-dom matchers reach it; import `@testing-library/jest-dom` directly in the test file.
- `ui/src/features/user-events/types.ts` — `UIEvent` wire-format interface (ISO-string timestamps).
- `ui/src/features/user-events/UserEvents.tsx` — pure, Tailwind-styled, takes events as a prop, empty-state branch.
- `ui/src/features/user-events/UserEvents.preview.tsx` — mounts with stub data including populated + empty states.
- `ui/src/features/user-events/UserEventsPage.tsx` — `useParams` + `useState<LoadState>` + `useEffect` with cancel guard, calls `getUserEvents` from `lib/api.ts`, handles loading/error/ok.
- `ui/src/lib/api.ts` — typed `getUserEvents(userId, opts)`, throws `ApiError` on non-OK.
- `ui/src/routes.tsx` — `react-router-dom` v7 `createBrowserRouter`: `/`, `/users/:userId/events`, `/preview/user-events`.
- `ui/src/App.tsx` — delegates to `AppRouter`.

### Block 3 — `web/` nginx container
- `web/Dockerfile` — multi-stage (build ui → nginx serves). Build context = repo root, dockerfile = `web/Dockerfile`, COPY from `ui/`.
- `web/nginx.conf` — `location /api/` + `proxy_pass http://api:3000/` (both trailing slashes) strips the prefix. SPA fallback (`try_files $uri $uri/ /index.html`) routes client-side paths to React.
- `docker-compose.yml` — added `web` service on `:8080`, `depends_on: api: service_started`.
- Smoke: full stack `docker compose up -d --build --wait` healthy in seconds. POST + GET round-trip via the proxy, no CORS.

### Block 4 — `e2e/` Playwright workspace
- `e2e/package.json`, `tsconfig.json`, `.eslintrc.json`, `playwright.config.ts`. Single chromium project, baseURL from `WTF_BASE_URL` env or `http://localhost:8080`.
- `npm install` (138 packages) + `playwright install chromium` (92 MB).
- `e2e/test/user-events.spec.ts` — 2 tests: seed event via `/api/events` proxy, navigate to `/users/:id/events`, assert event visible; and empty-state for unknown user.
- `e2e/README.md` — setup + run docs.
- **First run failed — both tests.** Diagnostic via ad-hoc Playwright script found `React is not defined` console error → traced to esbuild's default `--jsx=transform` not picking up tsconfig's `react-jsx` setting. Added `--jsx=automatic` to both `build:js` and `dev` scripts. Also fixed `index.html` relative paths (`./main.js` → `/main.js`) because at deep routes the relative path resolved into the SPA fallback path. After both fixes, 2/2 tests passed in 1.1s.
- `.gitignore` — added `test-results/`, `playwright-report/`, `playwright/.cache/`.

### Block 5 — Cascade docs / sub-agents / memories
- **Memories:**
  - `feedback_design_workflow` — full rewrite for React (`.preview.tsx` is the design contract, mounted at `/preview/<feature>`).
  - `feedback_testing_strategy` — added UI component test tier + E2E primary tier; updated "Why this works" to credit E2E for catching bundler/asset/render bugs no other tier sees.
  - `feedback_typescript` — restructured around the three TS workspaces (api/ui/e2e); documented the esbuild `--jsx=automatic` footgun.
- **New ADRs:**
  - `0007-react-tailwind-esbuild.md` — UI stack rationale, no-Vite decision, esbuild + Tailwind CLI tradeoffs.
  - `0008-playwright-e2e-primary.md` — E2E as primary for UI features, with the two real bugs from Block 4 as evidence.
  - `0004-no-application-unit-tests.md` — added a small "Extension for the UI tier" section.
- **Docs:**
  - `CLAUDE.md` — Stack section now mentions React/Tailwind/esbuild/Playwright + 3 workspaces; Layout section includes `ui/`, `e2e/`, `web/` trees.
  - `docs/design-system.md` — full rewrite for Tailwind utility-first; removed `tokens.css`/`components.css` framing; documented "compose, don't restyle" discipline.
  - `docs/architecture.md` — C4 Container diagram added `web` (nginx) + reverse-proxy edge to api; new sequence diagram "browser loads /users/:userId/events" through the full stack.
  - `docs/specs/README.md` + each feature's `design.md` — references the React preview component instead of `prototype.html`. Removed legacy `prototype.html` skeleton files (replaced by per-feature `<Feature>.preview.tsx`).
- **Sub-agents** (rewritten end-to-end for React):
  - `ui-designer.md` — produces `<Feature>.tsx` + `<Feature>.preview.tsx` + `ui-spec.md`; registers preview route; Tailwind-only.
  - `design-handoff.md` — reads the preview, returns wiring plan for `<Feature>Page.tsx`, `lib/api.ts` addition, route registration, e2e test.
  - `design-reviewer.md` — Playwright-based, compares real route against `/preview/<feature>`, catches console errors / failed network / blank renders.

### Status

Phase 1.5 complete. UI tier proven end-to-end via Playwright. All cascade work
done. Phase 2 can begin against the now-complete design+engineering workflow.
