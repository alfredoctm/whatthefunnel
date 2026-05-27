# 0007 — React + Tailwind + esbuild for the UI (no Vite)

Status: accepted
Date: 2026-05-27

## Context

Phase 1.5 needed a UI. The MVP success criteria requires a browser-renderable
view of user event logs (with segmentation and funnels coming in Phase 2).

The original Phase 1.5 plan was **HTMX served by Fastify** (server-rendered
HTML + a sprinkle of interactivity). That direction was reversed mid-Phase-1.5
in favor of a real frontend app, with three explicit decisions:

1. **Tailwind for styling.** Settled vs. Pico / Shoelace / plain CSS.
2. **Separate API handlers from HTML handlers.** Implies the UI is a separate
   workspace with its own deploy artifact, not content-negotiation on the
   existing Fastify routes.
3. **React** as the UI framework.
4. **No Vite.** "Reuse tooling" — stick with the Jest + tsc + npm patterns
   already established in the api workspace, don't add Vite's config / plugin
   ecosystem.

The fourth constraint was the awkward one. Vite is the obvious tool for
React+TS in 2026. Going without it left two real options:

| Path | New deps | DX |
|---|---|---|
| **tsc only**, no bundler. Browser uses native ESM + import maps. React via copied node_modules. | None | Rough — manual import maps, no HMR, need to pin the production React build to dodge `process.env.NODE_ENV` references |
| **tsc + esbuild**. esbuild as a single binary used via one npm script. | `esbuild` (~9MB) | Clean — bundling resolves React's quirks; very fast (sub-second). |

Option 2 was chosen.

## Decision

The `ui/` workspace uses:

- **React 19** + `react-dom` + `react-router-dom` v7 (`createBrowserRouter`).
- **TypeScript 5.x strict + ESM**, same pattern as `api/`.
- **Tailwind v3** with the standalone CLI (`tailwindcss -i src/index.css -o dist/index.css`). No PostCSS dance, no Tailwind v4 (which is still maturing). Config in `tailwind.config.ts`; theme tokens extend Tailwind defaults rather than being managed as separate `tokens.css`.
- **esbuild** for bundling: `esbuild src/main.tsx --bundle --format=esm --outdir=dist --minify --target=es2022 --sourcemap --jsx=automatic`. Single command, no config file.
- **Jest + ts-jest + jsdom + @testing-library/react** for component tests. Same Jest pattern as the api workspace.
- **No Vite, no Webpack, no Parcel, no Bun.**

Build pipeline: three sequential npm scripts (`build:js`, `build:css`,
`build:html`) chained as `build`. Dev mode runs them concurrently in watch
mode via shell `&`. No `concurrently` dep needed.

The built output (`ui/dist/`) is served by the nginx `web` container in
both dev and prod. The browser sees a single origin (port 8080) and
reverse-proxied API calls — no CORS.

## Consequences

**What gets easier:**
- Same Jest / tsc / ESLint / Prettier configs as api — one mental model.
- No bundler-specific config language to learn. esbuild's CLI flags are visible in `package.json`.
- React 19's auto-imports + Tailwind utility classes mean no manual `import React`, no boilerplate CSS.
- `npm run build` is sub-second.

**What gets harder:**
- **No HMR.** Save → tsc + esbuild rebuild → manual browser refresh. Accepted as the cost of toolchain minimalism. Mitigated by Playwright as the primary verification path (where HMR doesn't help anyway).
- **esbuild does NOT read tsconfig.** It has its own JSX setting (defaults to the classic transform). Must pass `--jsx=automatic` explicitly. This is a footgun that already bit us in Block 4 (`React is not defined` runtime error caught only by Playwright). See [[0008]] for why E2E is now primary.
- **No tree-shaking / code splitting in prod.** Acceptable for MVP / internal tool. Add later if bundle size becomes an issue (esbuild supports both).
- **`react-router-dom` browser router** needs absolute paths in `index.html` for static assets (`/main.js`, not `./main.js`) so deep client routes don't resolve assets relative to the route. Already burned us once.

**Commits us to:**
- Building the React bundle as part of the docker image (`web/Dockerfile` multi-stage).
- Keeping the JSX runtime in sync between tsc and esbuild — if React's JSX transform ever changes, both flags need updating.
- Same-origin deployment (or a reverse proxy that fakes it). CORS isn't currently set up; we'd need to add it if the UI ever needs to talk to a different-origin API.
