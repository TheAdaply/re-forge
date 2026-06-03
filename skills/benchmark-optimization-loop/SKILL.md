---
name: benchmark-optimization-loop
description: Use this skill when the user asks to make something faster, try many variants, run recursive optimization, benchmark latency/throughput/cost, or choose the best implementation by repeated measured tests. It converts ambitious targets like "make it 20x faster" or "try 50 optimizations" into a bounded, measured loop with a correctness gate and a promotion rule. Triggers include "optimize this", "make it faster", "try variants", or "tune these parameters".
---

# Benchmark Optimization Loop

Turn "make it faster" into a bounded, measured search that actually improves the system without breaking correctness.

## Required baseline
Do not optimize until ALL of these exist:
- the operation being optimized;
- the correctness gate that must stay green (tests/assertions);
- the metric: wall time, p95 latency, rows/sec, cost/run, memory, or error rate;
- the current baseline measurement;
- the search budget: max variants, max time, max spend, max data impact.

If the user asks for an unrealistic target, keep the ambition but make the loop bounded and measurable.

## The loop
1. Measure the baseline.
2. Identify bottlenecks from evidence (profiling/measurement), not guesses.
3. Generate variants, each testing one hypothesis.
4. Run variants with the same input shape.
5. Reject any variant that fails correctness, safety, or reproducibility.
6. Promote the fastest safe variant.
7. Codify the winning path in a script, command, test, config, or doc.
8. Re-run the baseline and the winner to confirm the delta is real.

## Variant table
Track every variant:
```text
Variant     | Hypothesis        | Command                       | Time | Correct? | Notes
baseline    | current path      | npm run job                   | 120s | yes      | stable
batch-500   | fewer round trips | npm run job -- --batch 500    | 42s  | yes      | winner
parallel-8  | more workers      | npm run job -- --workers 8    | 31s  | no       | rate limited
```

## Recursive / hyperparameter search
- Persist every run to a ledger.
- Compare against the prior accepted winner, not just the previous run.
- Keep a holdout or replay check to avoid overfitting the search.
- Stop when improvement is within noise, correctness fails, cost exceeds budget, or the search starts changing more variables than it can explain.
- Say "best measured safe variant", not "global optimum", unless the space was truly exhaustive.

## Promotion gate
A variant cannot become the new default until:
- correctness tests pass;
- the performance delta is repeated or explained;
- rollback is obvious;
- the change is encoded in source control or a durable runbook;
- the final summary includes exact commands and measurements.

## Hard rules
- Never promote a faster-but-wrong variant — correctness gate is absolute.
- One hypothesis per variant, same input shape, so results are comparable.
- Always re-confirm the final delta by re-running baseline and winner back-to-back.
