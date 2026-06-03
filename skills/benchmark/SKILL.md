---
name: benchmark
description: Use this skill to measure performance baselines and detect regressions in re-forge — before/after a PR, when users report "it feels slow", or before a launch when you must meet performance targets. It covers page (Core Web Vitals), API (latency percentiles), and build performance, plus before/after comparison. Activate on phrases like "benchmark this", "measure performance", "is this slower", or "set a perf baseline".
---

# Benchmark — Performance Baseline & Regression Detection

Measure performance objectively, save baselines, and catch regressions before they ship.

## When to use
- Before and after a PR to measure performance impact
- Setting up performance baselines for a project
- When users report it feels slow
- Before a launch — verify you meet performance targets
- Comparing your stack against alternatives

## Modes

### Mode 1: Page performance
Measure real browser metrics (via a browser automation tool):
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms, FCP < 1.8s, TTFB < 800ms
- Resource sizes: total page weight < 1MB, JS bundle < 200KB gzipped, plus CSS/image/third-party weight
- Network request count and render-blocking resources

### Mode 2: API performance
- Hit each endpoint ~100 times; measure p50 / p95 / p99 latency
- Track response size and status codes
- Test under load (e.g. 10 concurrent requests)
- Compare against SLA targets

### Mode 3: Build performance
- Cold build time, hot-reload (HMR) time
- Test-suite duration, type-check time, lint time, container build time

### Mode 4: Before/after comparison
1. Capture a baseline before the change.
2. Make the change.
3. Re-measure and compare against the baseline.

Report deltas with a verdict:
```
| Metric | Before | After | Delta  | Verdict |
|--------|--------|-------|--------|---------|
| LCP    | 1.2s   | 1.4s  | +200ms | WARN    |
| Bundle | 180KB  | 175KB | -5KB   | BETTER  |
| Build  | 12s    | 14s   | +2s    | WARN    |
```

## What to do
1. Pick the relevant mode(s) for what changed.
2. Capture a baseline (commit it so the team shares it).
3. Make/measure the change and compute deltas against the baseline.
4. Flag any regression beyond noise and report with the verdict table.

## Output
Store baselines as JSON in `.reforge/benchmarks/`, git-tracked so the team shares them.

## Hard rules
- Always measure a baseline before optimizing — no baseline, no verdict.
- Run enough samples to distinguish a real delta from noise (percentiles for APIs, repeated runs for builds).
- In CI, run the before/after comparison on every PR and fail on regressions beyond threshold.
- Pair with the `benchmark-optimization-loop` skill when the goal is to actively make something faster.
