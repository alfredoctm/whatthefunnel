# 0004 — No application-layer unit tests

Status: accepted
Date: 2026-05-27

## Context

A naive testing strategy for a hexagonal codebase produces three layers of
tests:
1. Domain unit tests (pure functions, value objects).
2. **Application-layer unit tests** (handler X, with port Y mocked, asserts Z).
3. Acceptance / integration tests (real HTTP boundary, real or fake adapters).

Layer 2 is the convention in many TS projects. It also turns out to be the
layer that's most often pure ceremony: the test inflates the visible code
("look, I tested it!") without catching any bug that the acceptance test
wouldn't already catch — because the handler is thin orchestration over
the port.

Worse, application unit tests usually rely on **module-level mocks**
(`jest.mock`, sinon stubs of imported functions) which are exactly the
kind of test double that lies — they pass when the production code
doesn't actually wire the dependency through.

## Decision

**Don't unit-test the application layer.** Handlers (command + query) are
covered transitively by acceptance tests that compose the real handler
against in-memory port fakes via `buildApp`. The fakes are real classes
implementing the port interface — not module mocks.

Specifically:
- **Acceptance tests** (`api/test/acceptance/`): drive the HTTP boundary
  via `fastify.inject()`. Cover the application layer transitively.
- **Domain unit tests** (`api/test/unit/domain/`): only the `domain/`
  layer, where pure-function tests are fast and high-signal.
- **Adapter integration tests** (`api/test/integration/`): parametrized
  over real adapter + in-memory fake — see [ADR 0005](0005-parametrized-contract-tests.md).

Banned: `jest.mock`, module mocking, spies on collaborators. Test doubles
are limited to the in-memory port fakes under `api/test/fakes/`.

## Consequences

**What gets easier:**
- Test count stays small and focused. Every test catches a real bug class.
- Designing handlers becomes cleaner — there's no temptation to add
  ceremony just to "make them testable in isolation."
- No double-test maintenance burden when a port signature changes.

**What gets harder:**
- A reviewer used to "every public method should have a unit test" may
  worry about coverage. Counter-argument: acceptance + domain unit +
  parametrized contract tests give better real-world coverage than
  mock-heavy unit tests of thin handlers ever did.
- If a handler ever becomes non-trivial (significant orchestration logic),
  the right move is to extract that logic into a domain function that's
  unit-tested — not to start unit-testing the handler.

**Commits us to:**
- `code-reviewer` and `plan-griller` sub-agents flag any application-layer
  unit test or `jest.mock` usage as a blocker.
- Handlers stay thin (delegate to domain + ports). Anything beyond
  orchestration belongs in `domain/`.
