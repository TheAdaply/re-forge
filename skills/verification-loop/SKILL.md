---
name: verification-loop
description: Use this skill to run a comprehensive quality gate after completing a feature, before opening a PR, or after refactoring in re-forge. It walks build → types → lint → tests → security scan → diff review and emits a single READY / NOT READY verification report. Activate on phrases like "verify", "is this ready to ship", "pre-PR check", or "run the quality gates".
---

# Verification Loop

A comprehensive verification system for re-forge work sessions. Run it before declaring work done.

## When to use
- After completing a feature or significant change
- Before creating a PR
- After refactoring
- Whenever you want to confirm quality gates pass

## What to do
Run each phase in order. If a hard gate fails, STOP and fix before continuing.

1. **Build verification.** Run the project build (`npm run build` / `pnpm build` / language equivalent). If the build fails, stop and fix first — nothing else matters until it builds.
2. **Type check.** Run the type checker (`npx tsc --noEmit` for TypeScript, `pyright .` for Python, etc.). Report all errors; fix critical ones before continuing.
3. **Lint check.** Run the linter (`npm run lint`, `ruff check .`, etc.). Report warnings and fix the meaningful ones.
4. **Test suite.** Run tests with coverage. Report total / passed / failed and coverage %. Target ≥ 80% coverage.
5. **Security scan.** Grep the diff and source for leaked secrets (`sk-`, `api_key`, tokens, passwords) and stray debug output (`console.log`, `print`, debugger statements). Flag anything found. For a deeper config audit, hand off to the `security-scan` skill.
6. **Diff review.** Inspect `git diff --stat` and the changed files for: unintended changes, missing error handling, and unhandled edge cases.

## Output format
After all phases, produce a single report:

```
VERIFICATION REPORT
==================
Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to fix:
1. ...
2. ...
```

## Continuous mode
For long sessions, set mental checkpoints — after each function, after finishing a component, before moving to the next task — and re-run the loop after major changes rather than only at the very end.

## Hard rules
- A failing build is a hard stop; do not proceed to later phases on a broken build.
- Never report "ready" if any hard gate (build, types, tests) is failing.
- This skill complements, but does not replace, real PostToolUse hooks: hooks catch issues immediately; this loop provides the comprehensive pre-ship review.
- After fixing issues surfaced here, re-run the affected phases — do not assume the fix is clean.
