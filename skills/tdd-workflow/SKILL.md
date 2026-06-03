---
name: tdd-workflow
description: Use this skill whenever you write a new feature, fix a bug, or refactor code in re-forge. It enforces strict test-driven development — tests BEFORE code, a verified RED→GREEN→REFACTOR cycle, and 80%+ coverage across unit, integration, and E2E tests. Activate it on any phrase like "write a feature", "fix this bug", "add an endpoint", "refactor", or "make the tests pass".
---

# Test-Driven Development Workflow

Enforce TDD for all production code in re-forge. Tests are not optional; they are the safety net that enables confident refactoring and reliable shipping.

## When to activate
- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints or new components

## Core principles
1. **Tests BEFORE code.** Always write the failing test first, then implement to make it pass.
2. **Coverage:** minimum 80% (branches, functions, lines, statements). Cover edge cases, error paths, and boundary conditions — not just the happy path.
3. **Test types:** unit (pure functions, component logic), integration (endpoints, DB, services, external APIs), and E2E (critical user flows via Playwright).

## What to do
1. **Write user journeys.** For each behavior, state: "As a [role], I want [action], so that [benefit]."
2. **Generate test cases** for each journey, including the happy path, empty/invalid input, fallback behavior, and ordering/edge conditions.
3. **Run the tests and confirm RED.** This is the mandatory RED gate. A valid RED means the relevant target compiles, the new/changed test actually executes, and it fails *for the intended reason* (the missing implementation or bug) — not because of unrelated syntax errors, broken setup, or missing deps. A test that was written but never executed does NOT count as RED. Do not touch production code until RED is confirmed.
4. **Implement minimal code** to make the failing test pass. No extra scope.
5. **Run the tests again and confirm GREEN.** Re-run the same target and verify the previously failing test now passes. Only then may you refactor.
6. **Refactor** while keeping tests green: remove duplication, improve naming, optimize, improve readability.
7. **Verify coverage** with your coverage runner and confirm the 80%+ threshold is met.

## Git checkpoints
If the repo is under Git, checkpoint each stage on the current active branch:
- `test: add reproducer for <feature or bug>` (RED validated)
- `fix: <feature or bug>` (GREEN validated)
- `refactor: clean up after <feature or bug>` (optional, tests still green)

Verify each checkpoint commit is reachable from `HEAD` on the active branch and belongs to this task. Do not count commits from other branches or unrelated work. Do not squash or rewrite checkpoints until the cycle is complete.

## Testing patterns
- **Unit:** Arrange-Act-Assert, one behavior per test, mock external dependencies (DB, cache, model/embedding clients) so units stay isolated and fast (< 50ms each).
- **Integration:** drive real route handlers / service functions; assert status codes, response shape, and graceful error handling.
- **E2E:** script real user flows; use semantic selectors (`role`, visible text, `data-testid`) — never brittle CSS classes.

## Hard rules
- Never edit production code before a valid RED state is confirmed.
- Test user-visible behavior, not internal implementation details.
- Keep tests independent — each test sets up its own data; no cross-test dependencies.
- Test error paths and edge cases (null, undefined, empty, large), not just success.
- No skipped or disabled tests in a completed cycle.
- Commit lock files; run CI with a clean, reproducible install.
