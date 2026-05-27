# 0002 — TypeScript 5.x strict + ESM

Status: accepted
Date: 2026-05-27

## Context

The api service has to be modeled accurately (event shape, port contracts,
query options) and easy to refactor. JavaScript would have been faster to
scaffold, but the cost of refactoring across N files without types — for a
project where AI agents will be doing most of the editing — is much higher
than the cost of adding TypeScript up front.

Two TS-style choices needed pinning:
- Module system: CJS (more compatible with older tooling, especially Jest) vs.
  ESM (modern Node default, what new libraries assume).
- Strictness: partial strict (easier to adopt) vs. all strict flags on.

## Decision

- **TypeScript 5.x**, **strict mode with all strict flags on**
  (`strict: true`, plus `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `exactOptionalPropertyTypes`). Non-negotiable.
- **ESM throughout**: `"type": "module"` in `package.json`, native
  `import`/`export`, `.js` extensions in imports (required by NodeNext
  resolution).
- **No `any`**; lint enforces. Use `unknown` and narrow.
- **No `@ts-ignore` / `@ts-expect-error`** without a tracking comment.
- **Ports are TS interfaces**; fakes use explicit `implements` so a
  port-signature change breaks the fake visibly at compile time.

Build / run:
- Dev: `tsx watch` (no compile step, fast restart).
- Prod: `tsc --build tsconfig.build.json` → `dist/`. Docker copies `dist/`
  and runs Node directly on the compiled JS.

Typecheck enforcement happens **at the TDD-green gate**
(`scripts/tdd green` runs `tsc --noEmit` and refuses to flip state if it
fails), **not** on every save. See [ADR 0004](0004-no-application-unit-tests.md)
for the broader testing discipline.

## Consequences

**What gets easier:**
- Refactoring (renames, signature changes, port additions) is type-safe
  end-to-end.
- AI-driven edits can lean on the compiler as a safety net.
- Port contracts are visible and enforceable.

**What gets harder:**
- `exactOptionalPropertyTypes` means `{ before: undefined }` is *not*
  the same as `{}` — call sites use conditional spread to pass optional
  fields cleanly (`...(opts.before !== undefined ? { before: opts.before } : {})`).
- ESM + Jest + ts-jest has some friction (the
  `--experimental-vm-modules` flag in the test scripts, `extensionsToTreatAsEsm`
  in `jest.config.js`). Documented escape hatch: switch to `swc-jest` if
  ts-jest ESM mode becomes painful. See [ADR 0003](0003-jest-and-ts-jest.md).

**Commits us to:**
- A build step in production (Dockerfile is multi-stage).
- The `.js`-suffixed-import idiom even though the source files are `.ts`.
