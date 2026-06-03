---
name: ai-regression-testing
description: Use this skill for regression testing in AI-assisted development, where the same model writes AND reviews code and so carries identical blind spots into both steps. It covers sandbox/mock-mode API testing without a database, an automated bug-check workflow, and the specific AI-introduced regression patterns to test for. Activate after an agent modifies API routes or backend logic, after fixing a bug, or when running a bug-check.
---

# AI Regression Testing

Testing patterns for AI-assisted development. When the same model writes code and then reviews its own work, it carries the same assumptions into both steps — only automated tests catch the resulting blind spots.

## When to activate
- An agent (re-forge, Claude Code, Cursor, Codex) modified API routes or backend logic
- A bug was found and fixed — prevent its re-introduction
- The project has a sandbox/mock mode usable for DB-free testing
- Running a `/bug-check` style review after changes
- Multiple code paths exist (sandbox vs production, feature flags)

## The core problem
The failure loop: `AI writes fix → AI reviews fix → AI says "looks correct" → bug still exists`. The most common AI-introduced regression is **sandbox/production path inconsistency** — a field added to one path but not the other, repeated across multiple "fixes" because self-review shares the blind spot. A test catches it on the first run.

## Sandbox-mode API testing
Most AI-friendly projects have a sandbox/mock mode — the key to fast, DB-free API tests.
- **Force sandbox mode in test setup**: set the sandbox env flag and blank out real DB/service URLs so no database is needed.
- **Use a request helper** to construct route requests (method, body, headers, a sandbox user id header) and a response parser returning `{ status, json }`.
- **Assert the response contract**: define a `REQUIRED_FIELDS` list and assert every field is present, and assert specific previously-buggy fields are not `undefined`.
- **Test sandbox/production parity**: assert the sandbox path returns the same shape as production for the same endpoint.

## What to do
1. **Run automated checks first (mandatory).** Run the test suite and the build/type-check before any AI review. A failing test or type error is the highest-priority bug — found mechanically, no AI judgment needed.
2. **Then do focused AI review**, with known blind spots in mind: sandbox/production consistency, response shape matching frontend expectations, SELECT/query completeness, error handling with rollback, optimistic-update races.
3. **For each bug fixed, write a regression test** named after the bug (e.g. "BUG-R1 regression"). Write tests for bugs that were found — not for code that already works.

## Common AI regression patterns
| Pattern | Test strategy | Priority |
|---|---|---|
| Sandbox/production mismatch | Assert same response shape in sandbox mode | High |
| SELECT/query column omission | Assert all required fields present in response | High |
| Error state leakage (stale data) | Assert related state is cleared on error | Medium |
| Missing rollback on optimistic update | Assert state restored on API failure | Medium |
| Type cast masking null/undefined | Assert field is not `undefined` | Medium |

## Strategy: test where bugs were found
Don't chase 100% coverage. Test the exact endpoints/areas where bugs appeared. AI tends to make the same category of mistake repeatedly and bugs cluster in complex areas (auth, multi-path logic, state). Once tested, that exact regression cannot recur, and the test suite grows organically with fixes.

## DO / DON'T
**DO:** write the test immediately when a bug is found (ideally before fixing); test response shape, not implementation; run tests as step 1 of every bug-check; keep tests fast (< 1s with sandbox mode); name tests after the bug they prevent.

**DON'T:** write tests for code that never had a bug; trust AI self-review as a substitute for automated tests; skip the sandbox path because "it's just mock data"; reach for integration tests when a unit test suffices; chase a coverage percentage instead of regression prevention.
