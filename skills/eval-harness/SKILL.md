---
name: eval-harness
description: Use this skill to set up eval-driven development (EDD) for re-forge — treating evals as the "unit tests of AI development." Activate when defining pass/fail criteria for an agent task, measuring reliability with pass@k metrics, building regression suites for prompt or agent changes, or benchmarking behavior across model versions. Triggers include "define evals", "is this reliable", "pass@3", "regression suite", or "grade this output".
---

# Eval Harness

A formal evaluation framework implementing eval-driven development (EDD): define expected behavior BEFORE implementation, run evals continuously, track regressions on every change, and measure reliability with pass@k.

## When to activate
- Setting up EDD for an AI-assisted workflow
- Defining pass/fail criteria for task completion
- Measuring agent reliability or benchmarking across models
- Creating regression suites for prompt/agent changes

## Eval types
- **Capability evals** — test if the agent can do something new. Specify the task, explicit success criteria (checklist), and expected output.
- **Regression evals** — ensure changes don't break existing behavior. Pin a baseline (SHA/checkpoint) and re-run the established checks.

## Grader types
1. **Code-based (deterministic)** — preferred. Shell/test assertions, e.g. grep for an expected symbol, run the test suite for a path, confirm the build succeeds. Emit PASS/FAIL.
2. **Rule-based** — regex/schema constraints on the output.
3. **Model-based (LLM-as-judge)** — for open-ended output. Provide a rubric (solves the problem? well-structured? edge cases? error handling?) and score 1–5 with reasoning.
4. **Human grader** — flag for manual review on ambiguous or security-sensitive output; tag risk LOW/MEDIUM/HIGH.

## Metrics
- **pass@1** — first-attempt success rate (direct reliability).
- **pass@k** — at least one success in k attempts (practical reliability under retries). Typical target `pass@3 ≥ 0.90`.
- **pass^k** — all k trials succeed (stability). Use `pass^3 = 1.00` for release-critical paths.

## What to do
1. **Define (before coding).** Write capability evals and regression evals with explicit criteria and target metrics.
2. **Implement.** Write code to pass the defined evals.
3. **Evaluate.** Run each capability eval (record PASS/FAIL across k attempts) and the regression checks.
4. **Report.** Produce a summary: per-eval results, overall pass counts, computed pass@1 / pass@3 / pass^3, and a status verdict (READY FOR REVIEW / NOT READY).

## Eval storage
Store evals as first-class artifacts inside the project, versioned with the code:
- `.claude/evals/<feature>.md` — eval definition
- `.claude/evals/<feature>.log` — run history
- `.claude/evals/baseline.json` — regression baselines
- `docs/releases/<version>/eval-summary.md` — release snapshot (when relevant)

## Hard rules
- Define evals BEFORE coding — it forces clear success criteria.
- Prefer deterministic (code) graders; use model graders sparingly and never as a release gate alone.
- Always keep human review in the loop for security-sensitive changes.
- Keep evals fast — slow evals don't get run.

## Anti-patterns to avoid
- Overfitting prompts to known eval examples.
- Measuring only happy-path outputs.
- Ignoring cost and latency drift while chasing pass rates.
- Allowing flaky graders into release gates.
